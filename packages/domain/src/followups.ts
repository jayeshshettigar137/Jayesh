import {
  LEAD_INTAKE_AGENT, LEAD_INTAKE_SYSTEM, LeadAnalysis, LlmUnavailableError, checkDraft, leadIntakeUserPrompt,
  type DraftFlag,
} from "@relayos/agents";
import { recordAudit, type Tx } from "@relayos/db";
import { DomainError, NotFoundError, newId, type ActionContext, type Actor } from "@relayos/shared";
import { decideApproval, getApproval, type ToolResult } from "@relayos/tools";
import { addLeadEvent, getLead } from "./leads";
import type { RelayServices } from "./services";
import { createTask, transitionTask, type TaskRow } from "./tasks";

const AGENT: Actor = { type: "agent", id: LEAD_INTAKE_AGENT };

export interface PrepareResult {
  status: "prepared" | "already_prepared" | "skipped";
  messageId?: string;
  approvalId?: string;
  flags?: DraftFlag[];
}

async function leadTask(tx: Tx, leadId: string): Promise<TaskRow | null> {
  return tx.maybeOne<TaskRow>(
    "SELECT * FROM tasks WHERE task_type = 'lead.prepare' AND inputs->>'lead_id' = $1 ORDER BY created_at DESC LIMIT 1",
    [leadId]);
}

function expect(result: ToolResult, what: string): asserts result is Extract<ToolResult, { status: "succeeded" }> {
  if (result.status !== "succeeded") {
    throw new Error(`${what} ${result.status}: ${"reason" in result ? result.reason : "error" in result ? result.error : ""}`);
  }
}

/**
 * The lead-intake agent run. Deterministic orchestration around one judgment call:
 * load lead -> model analysis (schema-checked) -> deterministic guards -> store summary ->
 * create draft -> request send approval. Every step goes through the tool gateway as the agent,
 * so the agent's permissions, not this code, bound what can happen. Safe to retry.
 */
export async function prepareLead(
  svc: RelayServices, workspaceId: string, leadId: string, correlationId: string,
): Promise<PrepareResult> {
  const ctx: ActionContext = { workspaceId, actor: AGENT, correlationId };

  const setup = await svc.db.withWorkspace(workspaceId, async (tx) => {
    const lead = await getLead(tx, leadId);
    const ws = await tx.one<{ name: string; niche: string; business_profile: string; approved_facts: string[] }>(
      "SELECT name, niche, business_profile, approved_facts FROM workspaces");
    const existing = await tx.maybeOne<{ id: string; approval_id: string | null }>(
      "SELECT id, approval_id FROM outbound_messages WHERE lead_id = $1 AND status <> 'cancelled' LIMIT 1", [leadId]);
    if (lead.summary && (existing || !lead.email || lead.unsubscribed_at)) return { done: true as const, existing };

    let task = await leadTask(tx, leadId);
    if (!task) {
      task = await createTask(tx, ctx, LEAD_INTAKE_AGENT, {
        task_type: "lead.prepare",
        objective: "Summarize the lead, build the quote checklist, and draft a first response for approval",
        business_line: "relayflow",
        risk_level: "medium",
        inputs: { lead_id: leadId },
        expected_output_schema: { lead_analysis: "LeadAnalysis", message_id: "uuid", approval_id: "uuid" },
        success_metric: "draft approved and sent within 1 hour of intake",
        deadline: new Date(Date.now() + 3600_000).toISOString(),
        requires_approval: true,
        max_cost_usd: 0.5,
      });
      for (const s of ["validated", "planned", "queued"] as const) task = await transitionTask(tx, ctx, task.id, s);
    } else if (task.status === "retry" || task.status === "escalated") {
      task = await transitionTask(tx, ctx, task.id, "queued");
    }
    if (task.status === "queued") task = await transitionTask(tx, ctx, task.id, "running");

    const runId = newId();
    const user = leadIntakeUserPrompt({ ...ws, approved_facts: ws.approved_facts ?? [] }, lead);
    await tx.exec(
      `INSERT INTO agent_runs (id, workspace_id, task_id, agent, provider, model, input, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [runId, workspaceId, task.id, LEAD_INTAKE_AGENT, svc.provider.name, svc.provider.model,
       JSON.stringify({ lead_id: leadId }), correlationId]);
    await tx.exec(
      "INSERT INTO agent_messages (workspace_id, agent_run_id, role, content) VALUES ($1, $2, 'system', $3), ($1, $2, 'user', $4)",
      [workspaceId, runId, LEAD_INTAKE_SYSTEM, user]);
    return { done: false as const, lead, ws, task, runId, user };
  });

  if (setup.done) {
    return { status: "already_prepared", messageId: setup.existing?.id, approvalId: setup.existing?.approval_id ?? undefined };
  }
  const { lead, ws, task, runId, user } = setup;

  let analysis: LeadAnalysis;
  try {
    const res = await svc.provider.complete({ system: LEAD_INTAKE_SYSTEM, user, schema: LeadAnalysis });
    analysis = res.data;
    await svc.db.withWorkspace(workspaceId, async (tx) => {
      await tx.exec(
        `UPDATE agent_runs SET status = 'succeeded', output = $2, input_tokens = $3, output_tokens = $4, cost_usd = $5,
           model = $6, finished_at = now() WHERE id = $1`,
        [runId, JSON.stringify(res.data), res.inputTokens, res.outputTokens, res.costUsd, res.model]);
      await tx.exec("INSERT INTO agent_messages (workspace_id, agent_run_id, role, content) VALUES ($1, $2, 'assistant', $3)",
        [workspaceId, runId, res.rawText]);
      await recordAudit(tx, {
        actorType: "agent", actorId: LEAD_INTAKE_AGENT, action: "agent_run.succeeded", entityType: "agent_run",
        entityId: runId, correlationId, data: { provider: res.provider, model: res.model, cost_usd: res.costUsd },
      });
    });
  } catch (err) {
    const retryable = err instanceof LlmUnavailableError ? err.retryable : false;
    await svc.db.withWorkspace(workspaceId, async (tx) => {
      await tx.exec("UPDATE agent_runs SET status = 'failed', error = $2, finished_at = now() WHERE id = $1",
        [runId, (err as Error).message.slice(0, 1000)]);
      await recordAudit(tx, {
        actorType: "agent", actorId: LEAD_INTAKE_AGENT, action: "agent_run.failed", entityType: "agent_run",
        entityId: runId, correlationId, data: { error: (err as Error).message, retryable },
      });
      await transitionTask(tx, ctx, task.id, retryable ? "retry" : "escalated", { error: (err as Error).message });
    });
    throw err;
  }

  // Deterministic guards: facts in the draft must come from the lead, profile, or approved facts.
  const leadText = [lead.name, lead.email, lead.phone, lead.address, lead.service, lead.message].join("\n");
  const flags = checkDraft({
    subject: analysis.email_subject,
    body: analysis.email_body,
    allowedSources: [ws.name, ws.business_profile, ...(ws.approved_facts ?? []), leadText],
    leadText,
  });
  if (analysis.suspicious_instructions && !flags.includes("suspicious_input")) flags.push("suspicious_input");

  const call = (tool: string, input: unknown, key: string) =>
    svc.gateway.call({ workspaceId, actor: AGENT, tool, input, correlationId, idempotencyKey: key });

  expect(await call("write_crm_draft", {
    lead_id: leadId, summary: analysis.summary, checklist: analysis.checklist, category: analysis.category,
    urgency: analysis.urgency,
  }, `summary:${leadId}:${runId}`), "write_crm_draft");

  if (!lead.email || lead.unsubscribed_at) {
    await svc.db.withWorkspace(workspaceId, (tx) =>
      transitionTask(tx, ctx, task.id, "review", { output: { analysis, message_id: null } }));
    return { status: "skipped", flags };
  }

  const draft = await call("draft_email", {
    lead_id: leadId, subject: analysis.email_subject, body: analysis.email_body, flags, agent_run_id: runId,
  }, `draft:${leadId}`);
  expect(draft, "draft_email");
  const { message_id: messageId, to } = draft.output as { message_id: string; to: string };

  const send = await call("send_email", { message_id: messageId, to, subject: analysis.email_subject,
    body: analysis.email_body }, `request-send:${messageId}`);
  if (send.status !== "pending_approval") throw new Error(`send_email should need approval, got ${send.status}`);

  await svc.db.withWorkspace(workspaceId, async (tx) => {
    await tx.exec("UPDATE outbound_messages SET status = 'pending_approval', approval_id = $2, updated_at = now() WHERE id = $1",
      [messageId, send.approvalId]);
    await transitionTask(tx, ctx, task.id, "review", {
      approvalId: send.approvalId, output: { message_id: messageId, approval_id: send.approvalId, flags },
    });
  });
  return { status: "prepared", messageId, approvalId: send.approvalId, flags };
}

// --- Human review ---------------------------------------------------------------------------

export interface QueueItem {
  approval_id: string;
  tool: string;
  status: string;
  reason: string;
  created_at: Date;
  requested_by_id: string;
  message_id: string | null;
  lead_id: string | null;
  lead_name: string | null;
  to_addr: string | null;
  subject: string | null;
  body: string | null;
  flags: DraftFlag[];
  payload: Record<string, unknown>;
}

/** Approval queue: pending requests plus approved-but-unsent ones (e.g. a send that failed). */
export async function approvalQueue(tx: Tx): Promise<QueueItem[]> {
  await tx.exec("UPDATE approvals SET status = 'expired' WHERE status IN ('pending', 'approved') AND expires_at < now()");
  return tx.rows<QueueItem>(
    `SELECT a.id AS approval_id, a.tool, a.status, a.reason, a.created_at, a.requested_by_id, a.payload,
       m.id AS message_id, m.lead_id, l.name AS lead_name, m.to_addr, m.subject, m.body, COALESCE(m.flags, '[]') AS flags
     FROM approvals a
     LEFT JOIN outbound_messages m ON a.tool = 'send_email' AND m.id::text = a.subject_id
     LEFT JOIN leads l ON l.id = m.lead_id
     WHERE a.status IN ('pending', 'approved') ORDER BY a.created_at`);
}

async function messageForApproval(tx: Tx, approvalId: string) {
  const approval = await getApproval(tx, approvalId);
  if (approval.tool !== "send_email") throw new DomainError("not a message approval", "invalid_input");
  const msg = await tx.maybeOne<{ id: string; lead_id: string; flags: DraftFlag[]; status: string }>(
    "SELECT id, lead_id, flags, status FROM outbound_messages WHERE id = $1", [approval.subject_id]);
  if (!msg) throw new NotFoundError("message");
  return { approval, msg };
}

/**
 * A person approves a drafted message and it is sent through the gateway. Flagged drafts need
 * explicit acknowledgement. Retrying after a delivery failure reuses the still-valid approval.
 */
export async function approveAndSend(
  svc: RelayServices, ctx: ActionContext, approvalId: string, opts: { acknowledgeFlags?: boolean } = {},
): Promise<ToolResult> {
  const { approval, msg } = await svc.db.withWorkspace(ctx.workspaceId, async (tx) => {
    const found = await messageForApproval(tx, approvalId);
    if (found.msg.flags.length && !opts.acknowledgeFlags) {
      throw new DomainError(`this draft is flagged (${found.msg.flags.join(", ")}); review and confirm to send`,
        "flags_unacknowledged");
    }
    if (found.approval.status === "pending") {
      return { ...found, approval: await decideApproval(tx, ctx, approvalId, "approve",
        found.msg.flags.length ? `flags acknowledged: ${found.msg.flags.join(", ")}` : "") };
    }
    return found;
  });
  if (approval.status !== "approved") throw new DomainError(`approval is ${approval.status}`, "invalid_state");

  const result = await svc.gateway.call({
    workspaceId: ctx.workspaceId, actor: ctx.actor, tool: "send_email", input: approval.payload,
    correlationId: approval.correlation_id, approvalId, idempotencyKey: `send:${msg.id}`,
  });
  await svc.db.withWorkspace(ctx.workspaceId, async (tx) => {
    if (result.status === "failed") {
      await tx.exec("UPDATE outbound_messages SET error = $2, updated_at = now() WHERE id = $1", [msg.id, result.error]);
      return;
    }
    if (result.status !== "succeeded") return;
    const task = await leadTask(tx, msg.lead_id);
    if (task?.status === "review") {
      const chain = { ...ctx, correlationId: approval.correlation_id };
      await transitionTask(tx, chain, task.id, "approved", { approvalId });
      await transitionTask(tx, chain, task.id, "executed");
    }
  });
  return result;
}

export async function rejectDraft(svc: RelayServices, ctx: ActionContext, approvalId: string, note = ""): Promise<void> {
  await svc.db.withWorkspace(ctx.workspaceId, async (tx) => {
    const { msg } = await messageForApproval(tx, approvalId);
    await decideApproval(tx, ctx, approvalId, "reject", note);
    await tx.exec("UPDATE outbound_messages SET status = 'rejected', updated_at = now() WHERE id = $1", [msg.id]);
    await addLeadEvent(tx, ctx, msg.lead_id, "draft.rejected", { message_id: msg.id, note });
    const task = await leadTask(tx, msg.lead_id);
    if (task?.status === "review") await transitionTask(tx, ctx, task.id, "rejected");
  });
}

/**
 * A person edits a draft. The old approval request is withdrawn and a new one is opened for the
 * edited content, so what gets sent is exactly what was last reviewed.
 */
export async function editDraft(
  svc: RelayServices, ctx: ActionContext, approvalId: string, subject: string, body: string,
): Promise<{ approvalId: string; flags: DraftFlag[] }> {
  subject = subject.trim();
  body = body.trim();
  if (!subject || !body) throw new DomainError("subject and body are required", "invalid_input");
  const { msg, to, flags } = await svc.db.withWorkspace(ctx.workspaceId, async (tx) => {
    const { approval, msg } = await messageForApproval(tx, approvalId);
    if (approval.status !== "pending") throw new DomainError(`approval is ${approval.status}`, "invalid_state");
    const lead = await getLead(tx, msg.lead_id);
    const ws = await tx.one<{ name: string; business_profile: string; approved_facts: string[] }>(
      "SELECT name, business_profile, approved_facts FROM workspaces");
    const leadText = [lead.name, lead.email, lead.phone, lead.address, lead.service, lead.message].join("\n");
    const flags = checkDraft({ subject, body, leadText,
      allowedSources: [ws.name, ws.business_profile, ...(ws.approved_facts ?? []), leadText] });
    await tx.exec(
      "UPDATE approvals SET status = 'expired', decision_note = 'superseded by edit', decided_by = $2, decided_at = now() WHERE id = $1",
      [approvalId, ctx.actor.id]);
    await tx.exec("UPDATE outbound_messages SET subject = $2, body = $3, flags = $4, updated_at = now() WHERE id = $1",
      [msg.id, subject, body, JSON.stringify(flags)]);
    await addLeadEvent(tx, ctx, msg.lead_id, "draft.edited", { message_id: msg.id, flags });
    await recordAudit(tx, {
      actorType: ctx.actor.type, actorId: ctx.actor.id, action: "message.edited", entityType: "outbound_message",
      entityId: msg.id, approvalId, correlationId: ctx.correlationId, data: { flags },
    });
    return { msg, to: lead.email, flags };
  });
  const send = await svc.gateway.call({
    workspaceId: ctx.workspaceId, actor: ctx.actor, tool: "send_email", correlationId: ctx.correlationId,
    input: { message_id: msg.id, to, subject, body },
  });
  if (send.status !== "pending_approval") throw new DomainError(`could not request approval: ${send.status}`, "invalid_state");
  await svc.db.withWorkspace(ctx.workspaceId, async (tx) => {
    await tx.exec("UPDATE outbound_messages SET approval_id = $2 WHERE id = $1", [msg.id, send.approvalId]);
    const task = await leadTask(tx, msg.lead_id);
    if (task) await tx.exec("UPDATE tasks SET approval_id = $2, updated_at = now() WHERE id = $1", [task.id, send.approvalId]);
  });
  return { approvalId: send.approvalId, flags };
}

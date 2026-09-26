import { recordAudit, type Tx } from "@relayos/db";
import {
  DomainError, NotFoundError, newCorrelationId, newId, signToken, verifyToken, type ActionContext, type ActorType,
} from "@relayos/shared";
import { LEAD_STATUSES, LeadInput, type LeadStatus } from "./contracts";
import type { RelayServices } from "./services";

export interface LeadRow {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  service: string;
  message: string;
  source: string;
  status: LeadStatus;
  category: string;
  urgency: string;
  summary: string;
  checklist: string[];
  unsubscribed_at: Date | null;
  first_response_at: Date | null;
  booked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Leads accepted per workspace per hour through public channels (form/webhook). */
export const PUBLIC_INTAKE_LIMIT_PER_HOUR = 200;

export async function addLeadEvent(tx: Tx, ctx: ActionContext, leadId: string, type: string, data: object = {}) {
  await tx.exec(
    `INSERT INTO lead_events (workspace_id, lead_id, type, data, actor_type, actor_id, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ctx.workspaceId, leadId, type, JSON.stringify(data), ctx.actor.type, ctx.actor.id, ctx.correlationId]);
}

/**
 * Accept an inbound lead and queue the agent to prepare it. The request returns immediately;
 * preparation happens in the worker (durable, retried, escalated on failure).
 */
export async function intakeLead(
  svc: RelayServices, workspaceId: string, raw: unknown, source: { type: ActorType; id: string },
): Promise<{ leadId: string; correlationId: string }> {
  const parsed = LeadInput.safeParse(raw ?? {});
  if (!parsed.success) throw new DomainError(parsed.error.issues[0]!.message, "invalid_lead");
  const input = { ...parsed.data, source: parsed.data.source || source.id };
  const leadId = newId();
  const ctx: ActionContext = { workspaceId, actor: source, correlationId: newCorrelationId() };

  await svc.db.withWorkspace(workspaceId, async (tx) => {
    if (source.type === "webhook" || source.type === "public") {
      const recent = await tx.one<{ n: number }>(
        "SELECT count(*)::int AS n FROM leads WHERE created_at > now() - interval '1 hour'");
      if (recent.n >= PUBLIC_INTAKE_LIMIT_PER_HOUR) throw new DomainError("intake rate limit reached", "rate_limited");
    }
    await tx.exec(
      `INSERT INTO leads (id, workspace_id, name, email, phone, address, service, message, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [leadId, workspaceId, input.name, input.email, input.phone, input.address, input.service, input.message,
       input.source]);
    await addLeadEvent(tx, ctx, leadId, "created", { source: input.source });
    await recordAudit(tx, {
      actorType: ctx.actor.type, actorId: ctx.actor.id, action: "lead.created", entityType: "lead", entityId: leadId,
      correlationId: ctx.correlationId, data: { source: input.source },
    });
  });
  await svc.queue.enqueue("lead.prepare", { workspaceId, leadId }, {
    idempotencyKey: `lead.prepare:${leadId}`, correlationId: ctx.correlationId,
  });
  return { leadId, correlationId: ctx.correlationId };
}

export async function getLead(tx: Tx, leadId: string): Promise<LeadRow> {
  const row = await tx.maybeOne<LeadRow>("SELECT * FROM leads WHERE id = $1", [leadId]);
  if (!row) throw new NotFoundError("lead");
  return row;
}

export interface LeadListItem extends LeadRow {
  next_action: string;
  pending_approval_id: string | null;
}

export async function listLeads(tx: Tx, status?: LeadStatus): Promise<LeadListItem[]> {
  const rows = await tx.rows<LeadRow & { pending_approval_id: string | null; failed: boolean }>(
    `SELECT l.*,
       (SELECT m.approval_id FROM outbound_messages m WHERE m.lead_id = l.id AND m.status = 'pending_approval'
          ORDER BY m.created_at DESC LIMIT 1) AS pending_approval_id,
       EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = l.id AND e.type = 'agent.escalated') AS failed
     FROM leads l WHERE ($1::text IS NULL OR l.status = $1) ORDER BY l.created_at DESC LIMIT 500`,
    [status ?? null]);
  return rows.map(({ failed, ...lead }) => ({ ...lead, next_action: nextAction(lead, failed) }));
}

export function nextAction(lead: LeadRow & { pending_approval_id: string | null }, escalated = false): string {
  if (lead.status === "booked" || lead.status === "lost") return "Closed";
  if (lead.unsubscribed_at) return "Unsubscribed - call if needed";
  if (lead.pending_approval_id) return "Review and approve the follow-up";
  if (escalated && !lead.summary) return "Agent failed - review manually";
  if (!lead.summary) return "Agent is preparing a summary";
  if (!lead.email) return "Call the customer (no email)";
  if (lead.status === "new") return "Send the first response";
  if (lead.status === "quoted") return "Confirm booking or mark lost";
  return "Waiting for the customer";
}

export async function setLeadStatus(tx: Tx, ctx: ActionContext, leadId: string, status: LeadStatus): Promise<void> {
  if (!LEAD_STATUSES.includes(status)) throw new DomainError(`unknown status ${status}`, "invalid_input");
  const lead = await getLead(tx, leadId);
  if (lead.status === status) return;
  await tx.exec(
    `UPDATE leads SET status = $2, updated_at = now(),
       booked_at = CASE WHEN $2 = 'booked' THEN now() WHEN $2 = 'lost' THEN NULL ELSE booked_at END WHERE id = $1`,
    [leadId, status]);
  await addLeadEvent(tx, ctx, leadId, `status.${status}`, { from: lead.status });
  await recordAudit(tx, {
    actorType: ctx.actor.type, actorId: ctx.actor.id, action: "lead.status_changed", entityType: "lead",
    entityId: leadId, correlationId: ctx.correlationId, data: { from: lead.status, to: status },
  });
  if (status === "booked" || status === "lost") await cancelPendingMessages(tx, ctx, leadId, `lead ${status}`);
}

/** Withdraw unsent drafts and their approval requests (e.g. lead booked, lost, or unsubscribed). */
export async function cancelPendingMessages(tx: Tx, ctx: ActionContext, leadId: string, reason: string) {
  const msgs = await tx.rows<{ id: string; approval_id: string | null }>(
    "SELECT id, approval_id FROM outbound_messages WHERE lead_id = $1 AND status IN ('draft', 'pending_approval')",
    [leadId]);
  for (const m of msgs) {
    await tx.exec("UPDATE outbound_messages SET status = 'cancelled', updated_at = now() WHERE id = $1", [m.id]);
    if (m.approval_id) {
      await tx.exec(
        "UPDATE approvals SET status = 'expired', decision_note = $2 WHERE id = $1 AND status IN ('pending', 'approved')",
        [m.approval_id, `withdrawn: ${reason}`]);
    }
    await recordAudit(tx, {
      actorType: ctx.actor.type, actorId: ctx.actor.id, action: "message.cancelled", entityType: "outbound_message",
      entityId: m.id, approvalId: m.approval_id, correlationId: ctx.correlationId, data: { reason },
    });
  }
}

// --- Unsubscribe (TRD §9: correct unsubscribe handling) -------------------------------------------

export function unsubscribeToken(secret: string, workspaceId: string, leadId: string): string {
  return signToken(secret, { k: "unsub", w: workspaceId, l: leadId });
}

export function unsubscribeUrl(baseUrl: string, secret: string, workspaceId: string, leadId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/u/${unsubscribeToken(secret, workspaceId, leadId)}`;
}

/** Honor an unsubscribe link. Idempotent; blocks all future sends to this lead. */
export async function unsubscribeLead(svc: RelayServices, token: string): Promise<boolean> {
  const data = verifyToken<{ k: string; w: string; l: string }>(svc.secret, token);
  if (!data || data.k !== "unsub") return false;
  const ctx: ActionContext = { workspaceId: data.w, actor: { type: "public", id: "unsubscribe-link" },
    correlationId: newCorrelationId() };
  return svc.db.withWorkspace(data.w, async (tx) => {
    const updated = await tx.exec(
      "UPDATE leads SET unsubscribed_at = COALESCE(unsubscribed_at, now()), updated_at = now() WHERE id = $1", [data.l]);
    if (!updated) return false;
    await addLeadEvent(tx, ctx, data.l, "unsubscribed");
    await recordAudit(tx, {
      actorType: "public", actorId: "unsubscribe-link", action: "lead.unsubscribed", entityType: "lead",
      entityId: data.l, correlationId: ctx.correlationId,
    });
    await cancelPendingMessages(tx, ctx, data.l, "recipient unsubscribed");
    return true;
  });
}

// --- Public entry points (before a workspace is known) --------------------------------------------

export async function resolveIntakeToken(svc: RelayServices, token: string): Promise<{ id: string; name: string } | null> {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  return svc.db.system((tx) => tx.maybeOne<{ id: string; name: string }>(
    "SELECT id, name FROM resolve_intake_token($1)", [token]));
}

export async function resolveWorkspaceSlug(
  svc: RelayServices, slug: string,
): Promise<{ id: string; name: string; niche: string } | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  return svc.db.system((tx) => tx.maybeOne<{ id: string; name: string; niche: string }>(
    "SELECT id, name, niche FROM resolve_workspace_slug($1)", [slug]));
}

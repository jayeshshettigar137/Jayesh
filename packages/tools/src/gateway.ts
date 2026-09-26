import { recordAudit, type Db, type Tx } from "@relayos/db";
import {
  APPROVAL_TTL_HOURS, authorize, profileFor, type MemberRole, type ToolPolicy,
} from "@relayos/policy";
import { hashPayload, logger, newId, type Actor } from "@relayos/shared";
import type { Adapters } from "./adapters";
import type { ToolCallRequest, ToolDefinition, ToolRegistry, ToolResult } from "./types";

export interface GatewayOptions {
  /** Daily agent spend cap per workspace (tool estimates + recorded model cost). */
  dailySpendLimitUsd: number;
}

type Decision =
  | { kind: "result"; result: ToolResult }
  | { kind: "execute"; toolCallId: string; input: unknown; approvalId: string | null; def: ToolDefinition };

/**
 * The single path from agents (and people) to side effects (TRD §7). For each call it enforces,
 * in order: blocked tools, allow list, data classification, input schema, preconditions, rate limit,
 * spend limit, idempotency, dry-run, and approval. It records a tool_calls row and an audit event
 * either way.
 */
export class ToolGateway {
  private readonly log = logger.child({ component: "tool-gateway" });

  constructor(
    private readonly db: Db,
    private readonly registry: ToolRegistry,
    private readonly adapters: Adapters,
    private readonly opts: GatewayOptions,
  ) {}

  get tools(): ToolRegistry {
    return this.registry;
  }

  async call(req: ToolCallRequest): Promise<ToolResult> {
    const decision = await this.db.withWorkspace(req.workspaceId, (tx) => this.decide(tx, req));
    if (decision.kind === "result") return decision.result;

    const { def, toolCallId, input, approvalId } = decision;
    try {
      const { output, costUsd = 0 } = await def.execute(
        { db: this.db, workspaceId: req.workspaceId, actor: req.actor, correlationId: req.correlationId, toolCallId,
          approvalId, adapters: this.adapters },
        input,
      );
      await this.db.withWorkspace(req.workspaceId, async (tx) => {
        await tx.exec(
          `UPDATE tool_calls SET status = 'succeeded', output = $2, cost_usd = cost_usd + $3, finished_at = now()
           WHERE id = $1`,
          [toolCallId, JSON.stringify(output ?? null), costUsd],
        );
        await this.audit(tx, req, "tool.succeeded", toolCallId, approvalId, { tool: req.tool });
      });
      return { status: "succeeded", toolCallId, output, replayed: false };
    } catch (err) {
      const error = (err as Error).message || String(err);
      this.log.warn("tool execution failed", { tool: req.tool, toolCallId, correlationId: req.correlationId, error });
      await this.db.withWorkspace(req.workspaceId, async (tx) => {
        await tx.exec("UPDATE tool_calls SET status = 'failed', error = $2, finished_at = now() WHERE id = $1", [
          toolCallId, error.slice(0, 2000),
        ]);
        // The side effect did not happen, so the human's consent is still valid for a retry.
        if (approvalId) {
          await tx.exec(
            "UPDATE approvals SET status = 'approved', consumed_at = NULL WHERE id = $1 AND status = 'consumed'",
            [approvalId]);
        }
        await this.audit(tx, req, "tool.failed", toolCallId, approvalId, { tool: req.tool, error });
      });
      return { status: "failed", toolCallId, error };
    }
  }

  private async decide(tx: Tx, req: ToolCallRequest): Promise<Decision> {
    const def = this.registry.get(req.tool);
    const role = await memberRole(tx, req.actor);
    if (req.actor.type === "user" && !role) return this.deny(tx, req, undefined, "user is not a member of this workspace");

    const auth = authorize(def?.policy, req.tool, profileFor(req.actor, role));
    if (!auth.allowed || !def) return this.deny(tx, req, def?.policy, auth.reason);

    const parsed = def.input.safeParse(req.input);
    if (!parsed.success) {
      return this.deny(tx, req, def.policy, `invalid input: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    const input = parsed.data;
    const inputHash = hashPayload({ tool: req.tool, input });

    // Idempotent replay comes before limits and approvals: a retry of a finished call is free.
    if (req.idempotencyKey && !req.dryRun) {
      const prior = await tx.maybeOne<{ id: string; status: string; output: unknown }>(
        `SELECT id, status, output FROM tool_calls WHERE tool = $1 AND idempotency_key = $2
           AND status IN ('running', 'succeeded') ORDER BY created_at DESC LIMIT 1`,
        [req.tool, req.idempotencyKey]);
      if (prior?.status === "succeeded") {
        await this.audit(tx, req, "tool.replayed", prior.id, null, { tool: req.tool });
        return { kind: "result", result: { status: "succeeded", toolCallId: prior.id, output: prior.output, replayed: true } };
      }
      if (prior?.status === "running") return this.deny(tx, req, def.policy, "an identical call is already in progress");
    }

    // Preconditions (e.g. recipient unsubscribed) are re-checked at execution time, after approval.
    if (def.precheck) {
      const reason = await def.precheck(tx, input);
      if (reason) return this.deny(tx, req, def.policy, reason, inputHash, input);
    }

    const rate = await tx.one<{ n: number }>(
      `SELECT count(*)::int AS n FROM tool_calls WHERE tool = $1 AND status IN ('running', 'succeeded')
         AND created_at > now() - make_interval(secs => $2)`,
      [req.tool, def.policy.rateLimit.windowSeconds]);
    if (rate.n >= def.policy.rateLimit.max) {
      return this.deny(tx, req, def.policy, `rate limit: ${def.policy.rateLimit.max} per ${def.policy.rateLimit.windowSeconds}s`);
    }

    if (req.actor.type === "agent" && def.policy.estimatedCostUsd > 0) {
      const spent = await spentTodayUsd(tx);
      if (spent + def.policy.estimatedCostUsd > this.opts.dailySpendLimitUsd) {
        return this.deny(tx, req, def.policy,
          `spend limit: $${spent.toFixed(2)} of $${this.opts.dailySpendLimitUsd} used today`);
      }
    }

    if (req.dryRun) {
      const id = await this.insertCall(tx, req, def.policy, input, inputHash, "dry_run", auth.reason);
      const preview = def.preview ? def.preview(input) : { tool: req.tool, input };
      await this.audit(tx, req, "tool.dry_run", id, null, { tool: req.tool, requires_approval: auth.requiresApproval });
      return { kind: "result", result: { status: "dry_run", toolCallId: id, preview, wouldRequireApproval: auth.requiresApproval } };
    }

    let approvalId: string | null = null;
    if (auth.requiresApproval) {
      if (!req.approvalId) return this.requestApproval(tx, req, def, input, inputHash, auth.reason);
      const approval = await tx.maybeOne<{ tool: string; payload_hash: string; status: string; expired: boolean }>(
        "SELECT tool, payload_hash, status, expires_at < now() AS expired FROM approvals WHERE id = $1",
        [req.approvalId]);
      const problem = !approval ? "approval not found"
        : approval.tool !== req.tool ? "approval is for a different tool"
        : approval.payload_hash !== inputHash ? "payload changed after approval"
        : approval.status !== "approved" ? `approval is ${approval.status}`
        : approval.expired ? "approval expired"
        : null;
      if (problem) return this.deny(tx, req, def.policy, problem, inputHash, input);
      // Single use: consume atomically so two concurrent calls can't both use it.
      const consumed = await tx.exec(
        "UPDATE approvals SET status = 'consumed', consumed_at = now() WHERE id = $1 AND status = 'approved'",
        [req.approvalId]);
      if (!consumed) return this.deny(tx, req, def.policy, "approval already used", inputHash, input);
      approvalId = req.approvalId;
    }

    const id = newId();
    const inserted = await tx.maybeOne<{ id: string }>(
      `INSERT INTO tool_calls (id, workspace_id, tool, actor_type, actor_id, input, input_hash, status, reason,
         idempotency_key, approval_id, correlation_id, cost_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'running', $8, $9, $10, $11, $12)
       ON CONFLICT (workspace_id, tool, idempotency_key)
         WHERE idempotency_key IS NOT NULL AND status IN ('running', 'succeeded') DO NOTHING
       RETURNING id`,
      [id, req.workspaceId, req.tool, req.actor.type, req.actor.id, JSON.stringify(input), inputHash, auth.reason,
       req.idempotencyKey ?? null, approvalId, req.correlationId, def.policy.estimatedCostUsd]);
    if (!inserted) throw new Error("concurrent call with the same idempotency key"); // rolls back the consume
    await this.audit(tx, req, "tool.started", id, approvalId, {
      tool: req.tool, subject: def.subject?.(input) ?? null,
    });
    return { kind: "execute", toolCallId: id, input, approvalId, def };
  }

  private async requestApproval(
    tx: Tx, req: ToolCallRequest, def: ToolDefinition, input: unknown, inputHash: string, reason: string,
  ): Promise<Decision> {
    const subject = def.subject?.(input) ?? { type: "", id: "" };
    // Re-requesting the same action returns the open approval instead of piling up duplicates.
    const open = await tx.maybeOne<{ id: string }>(
      `SELECT id FROM approvals WHERE tool = $1 AND payload_hash = $2 AND status IN ('pending', 'approved')
         AND expires_at > now() ORDER BY created_at DESC LIMIT 1`,
      [req.tool, inputHash]);
    const approvalId = open?.id ?? newId();
    if (!open) {
      await tx.exec(
        `INSERT INTO approvals (id, workspace_id, tool, category, payload, payload_hash, risk_level, reason,
           requested_by_type, requested_by_id, subject_type, subject_id, correlation_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now() + make_interval(hours => $14))`,
        [approvalId, req.workspaceId, req.tool, def.policy.category, JSON.stringify(input), inputHash,
         def.policy.risk, reason, req.actor.type, req.actor.id, subject.type, subject.id, req.correlationId,
         APPROVAL_TTL_HOURS]);
      await this.audit(tx, req, "approval.requested", approvalId, approvalId, {
        tool: req.tool, subject_type: subject.type, subject_id: subject.id,
      }, "approval");
    }
    const id = await this.insertCall(tx, req, def.policy, input, inputHash, "pending_approval", reason, approvalId);
    return { kind: "result", result: { status: "pending_approval", toolCallId: id, approvalId } };
  }

  private async deny(
    tx: Tx, req: ToolCallRequest, policy: ToolPolicy | undefined, reason: string, inputHash?: string, input?: unknown,
  ): Promise<Decision> {
    const id = await this.insertCall(tx, req, policy, input ?? req.input, inputHash ?? hashPayload(req.input), "denied", reason);
    await this.audit(tx, req, "tool.denied", id, req.approvalId ?? null, { tool: req.tool, reason });
    this.log.info("tool call denied", { tool: req.tool, actor: req.actor, reason, correlationId: req.correlationId });
    return { kind: "result", result: { status: "denied", toolCallId: id, reason } };
  }

  private async insertCall(
    tx: Tx, req: ToolCallRequest, _policy: ToolPolicy | undefined, input: unknown, inputHash: string,
    status: "denied" | "dry_run" | "pending_approval", reason: string, approvalId: string | null = null,
  ): Promise<string> {
    const id = newId();
    await tx.exec(
      `INSERT INTO tool_calls (id, workspace_id, tool, actor_type, actor_id, input, input_hash, dry_run, status,
         reason, idempotency_key, approval_id, correlation_id, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())`,
      [id, req.workspaceId, req.tool, req.actor.type, req.actor.id, JSON.stringify(input ?? null), inputHash,
       status === "dry_run", status, reason.slice(0, 1000), req.idempotencyKey ?? null, approvalId, req.correlationId]);
    return id;
  }

  private audit(
    tx: Tx, req: ToolCallRequest, action: string, entityId: string, approvalId: string | null,
    data: Record<string, unknown>, entityType = "tool_call",
  ) {
    return recordAudit(tx, {
      actorType: req.actor.type, actorId: req.actor.id, action, entityType, entityId, approvalId,
      correlationId: req.correlationId, data,
    });
  }
}

export async function memberRole(tx: Tx, actor: Actor): Promise<MemberRole | undefined> {
  if (actor.type !== "user" || !/^[0-9a-f-]{36}$/i.test(actor.id)) return undefined;
  const row = await tx.maybeOne<{ role: MemberRole }>("SELECT role FROM memberships WHERE user_id = $1", [actor.id]);
  return row?.role;
}

/** Today's agent spend in this workspace: tool estimates plus recorded model cost. */
export async function spentTodayUsd(tx: Tx): Promise<number> {
  const row = await tx.one<{ usd: string }>(
    `SELECT (COALESCE((SELECT sum(cost_usd) FROM tool_calls WHERE actor_type = 'agent'
               AND created_at > date_trunc('day', now())), 0)
           + COALESCE((SELECT sum(cost_usd) FROM agent_runs WHERE started_at > date_trunc('day', now())), 0))::text AS usd`);
  return Number(row.usd);
}

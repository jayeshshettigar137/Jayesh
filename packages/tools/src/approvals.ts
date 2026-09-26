import { recordAudit, type Tx } from "@relayos/db";
import { canApprove, type ToolCategory } from "@relayos/policy";
import { DomainError, NotFoundError, type ActionContext } from "@relayos/shared";
import { memberRole } from "./gateway";

export interface ApprovalRow {
  id: string;
  workspace_id: string;
  tool: string;
  category: ToolCategory;
  payload: Record<string, unknown>;
  payload_hash: string;
  risk_level: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "consumed" | "expired";
  requested_by_type: string;
  requested_by_id: string;
  decided_by: string | null;
  decided_at: Date | null;
  decision_note: string;
  subject_type: string;
  subject_id: string;
  correlation_id: string;
  expires_at: Date;
  created_at: Date;
}

export async function getApproval(tx: Tx, id: string): Promise<ApprovalRow> {
  const row = await tx.maybeOne<ApprovalRow>("SELECT * FROM approvals WHERE id = $1", [id]);
  if (!row) throw new NotFoundError("approval");
  return row;
}

export async function listApprovals(tx: Tx, statuses: ApprovalRow["status"][] = ["pending"]): Promise<ApprovalRow[]> {
  await tx.exec("UPDATE approvals SET status = 'expired' WHERE status IN ('pending', 'approved') AND expires_at < now()");
  return tx.rows<ApprovalRow>("SELECT * FROM approvals WHERE status = ANY($1) ORDER BY created_at DESC", [statuses]);
}

/**
 * Record a human decision. Only signed-in members may decide, and money/production approvals
 * need an owner or admin. Agents can never approve.
 */
export async function decideApproval(
  tx: Tx, ctx: ActionContext, approvalId: string, decision: "approve" | "reject", note = "",
): Promise<ApprovalRow> {
  const approval = await tx.maybeOne<ApprovalRow>("SELECT * FROM approvals WHERE id = $1 FOR UPDATE", [approvalId]);
  if (!approval) throw new NotFoundError("approval");
  const role = await memberRole(tx, ctx.actor);
  if (!canApprove(ctx.actor, role, approval.category)) {
    await recordAudit(tx, {
      actorType: ctx.actor.type, actorId: ctx.actor.id, action: "approval.decision_refused", entityType: "approval",
      entityId: approvalId, approvalId, correlationId: ctx.correlationId, data: { category: approval.category, role },
    });
    throw new DomainError("you are not allowed to decide this approval", "forbidden");
  }
  if (approval.status !== "pending") throw new DomainError(`approval is already ${approval.status}`, "invalid_state");
  if (approval.expires_at < new Date()) {
    await tx.exec("UPDATE approvals SET status = 'expired' WHERE id = $1", [approvalId]);
    throw new DomainError("approval request expired", "expired");
  }
  const status = decision === "approve" ? "approved" : "rejected";
  const updated = await tx.one<ApprovalRow>(
    `UPDATE approvals SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4 WHERE id = $1
     RETURNING *`,
    [approvalId, status, ctx.actor.id, note.slice(0, 1000)]);
  await recordAudit(tx, {
    actorType: ctx.actor.type, actorId: ctx.actor.id, action: `approval.${status}`, entityType: "approval",
    // Logged on the request's correlation id so the whole chain (request -> decision -> execution)
    // can be replayed from one id; the reviewer's own request id is kept alongside.
    entityId: approvalId, approvalId, correlationId: approval.correlation_id,
    data: { tool: approval.tool, subject_type: approval.subject_type, subject_id: approval.subject_id,
      decided_in: ctx.correlationId },
  });
  return updated;
}

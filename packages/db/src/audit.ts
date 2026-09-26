import type { Tx } from "./client";

export type ActorType = "user" | "agent" | "system" | "webhook" | "public";

export interface AuditEvent {
  actorType: ActorType;
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  approvalId?: string | null;
  correlationId: string;
  data?: Record<string, unknown>;
}

/** Append one audit event in the current workspace transaction. The table is insert-only. */
export async function recordAudit(tx: Tx, event: AuditEvent): Promise<void> {
  if (!tx.workspaceId) throw new Error("audit events must be recorded inside a workspace transaction");
  await tx.exec(
    `INSERT INTO audit_events (workspace_id, actor_type, actor_id, action, entity_type, entity_id, approval_id,
       correlation_id, data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      tx.workspaceId,
      event.actorType,
      event.actorId,
      event.action,
      event.entityType ?? "",
      event.entityId ?? "",
      event.approvalId ?? null,
      event.correlationId,
      JSON.stringify(event.data ?? {}),
    ],
  );
}

export interface AuditRow {
  id: string;
  actor_type: ActorType;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  approval_id: string | null;
  correlation_id: string;
  data: Record<string, unknown>;
  created_at: Date;
}

export async function listAudit(
  tx: Tx,
  opts: { limit?: number; entity?: { type: string; id: string }; correlationId?: string } = {},
): Promise<AuditRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.entity) {
    params.push(opts.entity.type, opts.entity.id);
    where.push(`entity_type = $${params.length - 1} AND entity_id = $${params.length}`);
  }
  if (opts.correlationId) {
    params.push(opts.correlationId);
    where.push(`correlation_id = $${params.length}`);
  }
  params.push(opts.limit ?? 200);
  return tx.rows<AuditRow>(
    `SELECT * FROM audit_events ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY id DESC LIMIT $${params.length}`,
    params,
  );
}

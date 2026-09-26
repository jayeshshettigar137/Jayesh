import { recordAudit, type Tx } from "@relayos/db";
import { DomainError, NotFoundError, newId, type ActionContext } from "@relayos/shared";
import { TASK_TRANSITIONS, TaskSpec, type TaskStatus } from "./contracts";

export interface TaskRow {
  id: string;
  workspace_id: string;
  task_type: string;
  objective: string;
  business_line: string;
  risk_level: string;
  inputs: Record<string, unknown>;
  expected_output_schema: Record<string, unknown>;
  success_metric: string;
  deadline: Date;
  requires_approval: boolean;
  max_cost_usd: string;
  owner: string;
  status: TaskStatus;
  output: unknown;
  cost_usd: string;
  attempts: number;
  last_error: string;
  approval_id: string | null;
  correlation_id: string;
}

export async function createTask(tx: Tx, ctx: ActionContext, owner: string, spec: TaskSpec): Promise<TaskRow> {
  const parsed = TaskSpec.safeParse(spec);
  if (!parsed.success) throw new DomainError(`invalid task: ${parsed.error.issues[0]?.message}`, "invalid_task");
  const s = parsed.data;
  // High-risk work always needs a human, whatever the requester asked for.
  const requiresApproval = s.requires_approval || s.risk_level === "high";
  const row = await tx.one<TaskRow>(
    `INSERT INTO tasks (id, workspace_id, task_type, objective, business_line, risk_level, inputs,
       expected_output_schema, success_metric, deadline, requires_approval, max_cost_usd, owner, correlation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [newId(), ctx.workspaceId, s.task_type, s.objective, s.business_line, s.risk_level, JSON.stringify(s.inputs),
     JSON.stringify(s.expected_output_schema), s.success_metric, s.deadline, requiresApproval, s.max_cost_usd,
     owner, ctx.correlationId],
  );
  await recordAudit(tx, {
    actorType: ctx.actor.type, actorId: ctx.actor.id, action: "task.created", entityType: "task",
    entityId: row.id, correlationId: ctx.correlationId,
    data: { task_type: s.task_type, risk_level: s.risk_level, requires_approval: requiresApproval, owner },
  });
  return row;
}

export async function getTask(tx: Tx, id: string): Promise<TaskRow> {
  const row = await tx.maybeOne<TaskRow>("SELECT * FROM tasks WHERE id = $1", [id]);
  if (!row) throw new NotFoundError("task");
  return row;
}

export interface TransitionOptions {
  approvalId?: string;
  output?: unknown;
  error?: string;
  costUsd?: number;
}

/** Move a task through its lifecycle, enforcing legal transitions, approval, and cost cap. */
export async function transitionTask(
  tx: Tx, ctx: ActionContext, taskId: string, to: TaskStatus, opts: TransitionOptions = {},
): Promise<TaskRow> {
  const task = await tx.maybeOne<TaskRow>("SELECT * FROM tasks WHERE id = $1 FOR UPDATE", [taskId]);
  if (!task) throw new NotFoundError("task");
  if (!TASK_TRANSITIONS[task.status].includes(to)) {
    throw new DomainError(`illegal task transition ${task.status} -> ${to}`, "illegal_transition");
  }
  if (to === "approved" && task.requires_approval) {
    if (!opts.approvalId) throw new DomainError("this task requires a human approval", "approval_required");
    const approval = await tx.maybeOne<{ status: string; subject_id: string }>(
      "SELECT status, subject_id FROM approvals WHERE id = $1", [opts.approvalId]);
    if (!approval || approval.status !== "approved" || approval.subject_id !== task.id) {
      throw new DomainError("approval is missing, not granted, or for a different task", "approval_required");
    }
  }
  const cost = Number(task.cost_usd) + (opts.costUsd ?? 0);
  if (cost > Number(task.max_cost_usd)) {
    await recordAudit(tx, {
      actorType: ctx.actor.type, actorId: ctx.actor.id, action: "task.cost_cap_exceeded", entityType: "task",
      entityId: taskId, correlationId: ctx.correlationId, data: { cost, max: task.max_cost_usd },
    });
    to = "escalated";
  }
  const updated = await tx.one<TaskRow>(
    `UPDATE tasks SET status = $2, output = COALESCE($3, output), last_error = COALESCE($4, last_error),
       cost_usd = $5, approval_id = COALESCE($6, approval_id),
       attempts = attempts + CASE WHEN $2 = 'running' THEN 1 ELSE 0 END, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [taskId, to, opts.output === undefined ? null : JSON.stringify(opts.output), opts.error ?? null, cost,
     opts.approvalId ?? null],
  );
  await recordAudit(tx, {
    actorType: ctx.actor.type, actorId: ctx.actor.id, action: `task.${to}`, entityType: "task", entityId: taskId,
    approvalId: opts.approvalId ?? null, correlationId: ctx.correlationId,
    data: { from: task.status, to, ...(opts.error ? { error: opts.error } : {}) },
  });
  return updated;
}

import { LlmUnavailableError } from "@relayos/agents";
import { recordAudit } from "@relayos/db";
import { addLeadEvent, prepareLead, transitionTask, type RelayServices } from "@relayos/domain";
import { logger, type Job } from "@relayos/shared";

const log = logger.child({ component: "worker" });

interface LeadJob {
  workspaceId: string;
  leadId: string;
}

type Handler = (svc: RelayServices, job: Job) => Promise<void>;

export const HANDLERS: Record<string, Handler> = {
  "lead.prepare": async (svc, job) => {
    const { workspaceId, leadId } = job.payload as LeadJob;
    const result = await prepareLead(svc, workspaceId, leadId, job.correlationId);
    log.info("lead prepared", { leadId, status: result.status, flags: result.flags, correlationId: job.correlationId });
  },
};

/** Called when a job has exhausted its retries: make the failure visible to a human. */
async function escalate(svc: RelayServices, job: Job, error: string): Promise<void> {
  if (job.type !== "lead.prepare") return;
  const { workspaceId, leadId } = job.payload as LeadJob;
  const ctx = { workspaceId, actor: { type: "system" as const, id: "worker" }, correlationId: job.correlationId };
  await svc.db.withWorkspace(workspaceId, async (tx) => {
    await addLeadEvent(tx, ctx, leadId, "agent.escalated", { error, attempts: job.attempts });
    await recordAudit(tx, {
      actorType: "system", actorId: "worker", action: "job.escalated", entityType: "lead", entityId: leadId,
      correlationId: job.correlationId, data: { job_type: job.type, error, attempts: job.attempts },
    });
    const task = await tx.maybeOne<{ id: string; status: string }>(
      "SELECT id, status FROM tasks WHERE task_type = 'lead.prepare' AND inputs->>'lead_id' = $1 ORDER BY created_at DESC LIMIT 1",
      [leadId]);
    if (task && ["retry", "running", "queued"].includes(task.status)) {
      await transitionTask(tx, ctx, task.id, "escalated", { error });
    }
  });
}

export interface RunResult {
  processed: number;
  failed: number;
  escalated: number;
}

/** Process due jobs until the queue is empty or `max` jobs have run. */
export async function runOnce(svc: RelayServices, max = 50): Promise<RunResult> {
  const result: RunResult = { processed: 0, failed: 0, escalated: 0 };
  for (let i = 0; i < max; i++) {
    const job = await svc.queue.claim(Object.keys(HANDLERS));
    if (!job) break;
    const handler = HANDLERS[job.type]!;
    try {
      await handler(svc, job);
      await svc.queue.complete(job.id);
      result.processed++;
    } catch (err) {
      const message = (err as Error).message;
      // Non-retryable failures (e.g. a model refusal) go straight to a human.
      const permanent = err instanceof LlmUnavailableError && !err.retryable;
      const outcome = await svc.queue.fail(job.id, message, permanent);
      result.failed++;
      log.warn("job failed", { jobId: job.id, type: job.type, attempts: job.attempts, outcome, error: message });
      if (outcome === "dead") {
        await escalate(svc, job, message);
        result.escalated++;
      }
    }
  }
  return result;
}

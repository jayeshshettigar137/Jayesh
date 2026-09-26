import { backoffMs, newCorrelationId, newId, type EnqueueOptions, type Job, type JobQueue } from "@relayos/shared";
import type { Db } from "./client";

/** Durable job queue on Postgres. Claims use FOR UPDATE SKIP LOCKED so workers never collide. */
export class PgQueue implements JobQueue {
  /** A job locked longer than this is assumed to belong to a crashed worker and is reclaimed. */
  static readonly LOCK_TIMEOUT_MS = 10 * 60_000;

  constructor(private readonly db: Db) {}

  async enqueue<T>(type: string, payload: T, opts: EnqueueOptions = {}): Promise<string> {
    const id = newId();
    return this.db.system(async (tx) => {
      const row = await tx.maybeOne<{ id: string }>(
        `INSERT INTO jobs (id, type, payload, max_attempts, run_at, idempotency_key, correlation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
        [id, type, JSON.stringify(payload), opts.maxAttempts ?? 5, opts.runAt ?? new Date(),
         opts.idempotencyKey ?? null, opts.correlationId ?? newCorrelationId()],
      );
      if (row) return row.id;
      const existing = await tx.one<{ id: string }>("SELECT id FROM jobs WHERE idempotency_key = $1", [
        opts.idempotencyKey,
      ]);
      return existing.id;
    });
  }

  async claim(types?: string[]): Promise<Job | null> {
    return this.db.system(async (tx) => {
      const row = await tx.maybeOne<{
        id: string; type: string; payload: unknown; attempts: number; max_attempts: number; correlation_id: string;
      }>(
        `UPDATE jobs SET status = 'running', attempts = attempts + 1, locked_at = now(), updated_at = now()
         WHERE id = (
           SELECT id FROM jobs
           WHERE ((status = 'queued' AND run_at <= now())
                  OR (status = 'running' AND locked_at < now() - make_interval(secs => $2)))
             AND ($1::text[] IS NULL OR type = ANY($1))
           ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 1)
         RETURNING id, type, payload, attempts, max_attempts, correlation_id`,
        [types ?? null, PgQueue.LOCK_TIMEOUT_MS / 1000],
      );
      if (!row) return null;
      return {
        id: row.id, type: row.type, payload: row.payload, attempts: row.attempts,
        maxAttempts: row.max_attempts, correlationId: row.correlation_id,
      };
    });
  }

  async complete(jobId: string): Promise<void> {
    await this.db.system((tx) =>
      tx.exec("UPDATE jobs SET status = 'done', locked_at = NULL, updated_at = now() WHERE id = $1", [jobId]),
    );
  }

  async fail(jobId: string, error: string, permanent = false): Promise<"retry" | "dead"> {
    return this.db.system(async (tx) => {
      const job = await tx.maybeOne<{ attempts: number; max_attempts: number }>(
        "SELECT attempts, max_attempts FROM jobs WHERE id = $1 FOR UPDATE", [jobId]);
      if (!job) return "dead";
      const dead = permanent || job.attempts >= job.max_attempts;
      await tx.exec(
        `UPDATE jobs SET status = $2, last_error = $3, locked_at = NULL, updated_at = now(),
           run_at = now() + make_interval(secs => $4) WHERE id = $1`,
        [jobId, dead ? "dead" : "queued", error.slice(0, 2000), dead ? 0 : backoffMs(job.attempts) / 1000],
      );
      return dead ? "dead" : "retry";
    });
  }
}

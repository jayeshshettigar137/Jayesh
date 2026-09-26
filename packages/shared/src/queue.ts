/** Durable job queue abstraction. Production uses the Postgres adapter in @relayos/db. */
export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  correlationId: string;
}

export interface EnqueueOptions {
  /** Jobs with the same key are enqueued once (idempotent producers). */
  idempotencyKey?: string;
  maxAttempts?: number;
  runAt?: Date;
  correlationId?: string;
}

export interface JobQueue {
  enqueue<T>(type: string, payload: T, opts?: EnqueueOptions): Promise<string>;
  /** Claim the next due job, or null. The claim is exclusive until complete/fail. */
  claim(types?: string[]): Promise<Job | null>;
  complete(jobId: string): Promise<void>;
  /**
   * Record a failure. Retries with backoff until maxAttempts, then marks the job dead.
   * `permanent` failures (retrying can't help) go straight to dead.
   */
  fail(jobId: string, error: string, permanent?: boolean): Promise<"retry" | "dead">;
}

export const backoffMs = (attempt: number): number => Math.min(60_000 * 2 ** (attempt - 1), 30 * 60_000);

/** In-memory adapter for unit tests. Same semantics as the Postgres queue. */
export class InMemoryQueue implements JobQueue {
  readonly jobs = new Map<
    string,
    Job & { status: "queued" | "running" | "done" | "dead"; runAt: number; lastError?: string; key?: string }
  >();
  private seq = 0;
  constructor(private readonly now: () => number = Date.now) {}

  async enqueue<T>(type: string, payload: T, opts: EnqueueOptions = {}): Promise<string> {
    if (opts.idempotencyKey) {
      for (const job of this.jobs.values()) if (job.key === opts.idempotencyKey) return job.id;
    }
    const id = `job_${++this.seq}`;
    this.jobs.set(id, {
      id,
      type,
      payload,
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 5,
      correlationId: opts.correlationId ?? id,
      status: "queued",
      runAt: opts.runAt?.getTime() ?? this.now(),
      key: opts.idempotencyKey,
    });
    return id;
  }

  async claim(types?: string[]): Promise<Job | null> {
    const due = [...this.jobs.values()]
      .filter((j) => j.status === "queued" && j.runAt <= this.now() && (!types || types.includes(j.type)))
      .sort((a, b) => a.runAt - b.runAt)[0];
    if (!due) return null;
    due.status = "running";
    due.attempts += 1;
    return { ...due };
  }

  async complete(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) job.status = "done";
  }

  async fail(jobId: string, error: string, permanent = false): Promise<"retry" | "dead"> {
    const job = this.jobs.get(jobId);
    if (!job) return "dead";
    job.lastError = error;
    if (permanent || job.attempts >= job.maxAttempts) {
      job.status = "dead";
      return "dead";
    }
    job.status = "queued";
    job.runAt = this.now() + backoffMs(job.attempts);
    return "retry";
  }
}

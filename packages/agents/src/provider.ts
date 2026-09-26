import type { z } from "zod";

export interface LlmRequest<T> {
  /** Stable system prompt (the agent contract). */
  system: string;
  /** Per-call user content. */
  user: string;
  /** Output contract. Responses that don't validate are rejected, never passed through. */
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export interface LlmResponse<T> {
  data: T;
  rawText: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete<T>(req: LlmRequest<T>): Promise<LlmResponse<T>>;
}

/** The provider was unreachable, refused, or returned output that failed the contract. */
export class LlmUnavailableError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

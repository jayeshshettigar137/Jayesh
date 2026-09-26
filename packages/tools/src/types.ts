import type { Db, Tx } from "@relayos/db";
import type { ToolPolicy } from "@relayos/policy";
import type { Actor } from "@relayos/shared";
import type { z } from "zod";
import type { Adapters } from "./adapters";

export interface ToolExecContext {
  db: Db;
  workspaceId: string;
  actor: Actor;
  correlationId: string;
  toolCallId: string;
  approvalId: string | null;
  adapters: Adapters;
}

export interface ToolDefinition<I = any, O = any> {
  policy: ToolPolicy;
  description: string;
  input: z.ZodType<I>;
  /** What the call would do, returned by dry runs. Must not cause side effects. */
  preview?: (input: I) => unknown;
  /** Workspace-scoped preconditions (e.g. recipient unsubscribed). Return a denial reason or null. */
  precheck?: (tx: Tx, input: I) => Promise<string | null>;
  /** The entity this call acts on, recorded on approvals and audit events. */
  subject?: (input: I) => { type: string; id: string };
  execute: (ctx: ToolExecContext, input: I) => Promise<{ output: O; costUsd?: number }>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register<I, O>(def: ToolDefinition<I, O>): this {
    if (this.tools.has(def.policy.name)) throw new Error(`tool ${def.policy.name} already registered`);
    this.tools.set(def.policy.name, def as ToolDefinition);
    return this;
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }
}

export interface ToolCallRequest {
  workspaceId: string;
  actor: Actor;
  tool: string;
  input: unknown;
  correlationId: string;
  /** Retries with the same key never execute twice. */
  idempotencyKey?: string;
  /** Validate and preview only. No side effects, no approval request. */
  dryRun?: boolean;
  /** A granted approval for exactly this tool and payload. */
  approvalId?: string;
}

export type ToolResult =
  | { status: "succeeded"; toolCallId: string; output: unknown; replayed: boolean }
  | { status: "dry_run"; toolCallId: string; preview: unknown; wouldRequireApproval: boolean }
  | { status: "pending_approval"; toolCallId: string; approvalId: string }
  | { status: "denied"; toolCallId: string | null; reason: string }
  | { status: "failed"; toolCallId: string; error: string };

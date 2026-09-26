/**
 * Approval and permission rules (TRD §5, §7; PRD §6). Pure functions, no I/O, so every rule is
 * unit-testable. The tool gateway (@relayos/tools) is the only caller that enforces them.
 */
import type { Actor, RiskLevel } from "@relayos/shared";

export type ToolCategory =
  | "read"
  | "internal_write"
  | "draft"
  | "external_message"
  | "payment"
  | "refund"
  | "publishing"
  | "deploy_staging"
  | "deploy_production"
  | "test";

export type DataClass = "public" | "internal" | "customer_pii" | "financial";
const DATA_RANK: Record<DataClass, number> = { public: 0, internal: 1, customer_pii: 2, financial: 3 };

export interface ToolPolicy {
  name: string;
  category: ToolCategory;
  risk: RiskLevel;
  dataClass: DataClass;
  /** Max successful or in-flight calls per workspace in the window. */
  rateLimit: { max: number; windowSeconds: number };
  /** Estimated cost charged against the workspace's daily agent spend limit. */
  estimatedCostUsd: number;
}

/** Categories whose effects leave the building. Every one needs a human approval in this stage. */
export const APPROVAL_REQUIRED_CATEGORIES: ReadonlySet<ToolCategory> = new Set([
  "external_message", "payment", "refund", "publishing", "deploy_production",
]);

/** Blocked by default for every actor (TRD §7). There is no approval path for these. */
export const BLOCKED_TOOLS: ReadonlyMap<string, string> = new Map([
  ["shell_exec", "arbitrary shell commands are blocked"],
  ["execute_trade", "real-money trading is blocked"],
  ["scrape_web", "bulk scraping is blocked"],
  ["publish_content", "unreviewed public publishing is blocked; use publish_content_after_approval"],
  ["bulk_email", "unbounded email is blocked; send_email sends one approved message to one recipient"],
  ["social_post", "social publishing automation is out of scope"],
]);

export interface ActorProfile {
  /** Tools this actor may call at all. */
  allowedTools: ReadonlySet<string>;
  /** Highest data class this actor may touch. */
  clearance: DataClass;
  /** Only humans can approve. */
  canApprove: boolean;
}

const set = (...t: string[]) => new Set(t);

/** Agent permission profiles (TRD §5). Anything not listed is denied. */
export const AGENT_PROFILES: Readonly<Record<string, ActorProfile>> = {
  ceo_master: { allowedTools: set("query_analytics", "create_task"), clearance: "financial", canApprove: false },
  engineering_master: {
    allowedTools: set("run_tests", "deploy_staging", "deploy_production", "create_task", "query_analytics"),
    clearance: "internal",
    canApprove: false,
  },
  growth_master: {
    allowedTools: set("draft_content", "publish_content_after_approval", "create_task", "query_analytics"),
    clearance: "internal",
    canApprove: false,
  },
  sales_master: {
    allowedTools: set("read_crm", "write_crm_draft", "draft_email", "send_email", "create_task", "query_analytics"),
    clearance: "customer_pii",
    canApprove: false,
  },
  finance_risk_master: {
    allowedTools: set("query_analytics", "create_payment_link", "create_task"),
    clearance: "financial",
    canApprove: false,
  },
  research_agent: { allowedTools: set("read_crm", "query_analytics"), clearance: "customer_pii", canApprove: false },
  builder_or_ops_agent: {
    allowedTools: set("read_crm", "write_crm_draft", "draft_email", "create_task", "run_tests"),
    clearance: "customer_pii",
    canApprove: false,
  },
  growth_agent: { allowedTools: set("draft_content", "query_analytics"), clearance: "internal", canApprove: false },
  support_agent: {
    allowedTools: set("read_crm", "write_crm_draft", "draft_email", "send_email"),
    clearance: "customer_pii",
    canApprove: false,
  },
  analytics_agent: { allowedTools: set("query_analytics"), clearance: "internal", canApprove: false },
};

export type MemberRole = "owner" | "admin" | "member";

/** Categories only owners/admins may approve (money and production). */
const ELEVATED_CATEGORIES: ReadonlySet<ToolCategory> = new Set(["payment", "refund", "deploy_production"]);

/** Agent ids look like "relayflow.support_agent" or "ceo_master". */
export function agentRole(agentId: string): string {
  return agentId.includes(".") ? agentId.slice(agentId.indexOf(".") + 1) : agentId;
}

export function profileFor(actor: Actor, role?: MemberRole): ActorProfile | null {
  if (actor.type === "agent") return AGENT_PROFILES[agentRole(actor.id)] ?? null;
  if (actor.type === "user" && role) {
    // Humans may call any non-blocked tool; approval rules still apply to them.
    return { allowedTools: new Set(["*"]), clearance: "financial", canApprove: true };
  }
  // system/webhook/public actors never call tools directly.
  return null;
}

export type PolicyDecision =
  | { allowed: false; reason: string }
  | { allowed: true; requiresApproval: boolean; reason: string };

/** Static authorization decision for one call (rate/spend/idempotency are checked by the gateway). */
export function authorize(tool: ToolPolicy | undefined, toolName: string, profile: ActorProfile | null): PolicyDecision {
  const blocked = BLOCKED_TOOLS.get(toolName);
  if (blocked) return { allowed: false, reason: blocked };
  if (!tool) return { allowed: false, reason: `unknown tool ${toolName}` };
  if (!profile) return { allowed: false, reason: "actor has no tool permissions" };
  if (!profile.allowedTools.has("*") && !profile.allowedTools.has(tool.name)) {
    return { allowed: false, reason: `tool ${tool.name} is not in this actor's allowed list` };
  }
  if (DATA_RANK[tool.dataClass] > DATA_RANK[profile.clearance]) {
    return { allowed: false, reason: `data classification ${tool.dataClass} exceeds clearance ${profile.clearance}` };
  }
  const requiresApproval = APPROVAL_REQUIRED_CATEGORIES.has(tool.category) || tool.risk === "high";
  return {
    allowed: true,
    requiresApproval,
    reason: requiresApproval ? `${tool.category} actions require human approval` : "allowed",
  };
}

/** Can this person approve an action of this category? */
export function canApprove(actor: Actor, role: MemberRole | undefined, category: ToolCategory): boolean {
  if (actor.type !== "user" || !role) return false;
  if (ELEVATED_CATEGORIES.has(category)) return role === "owner" || role === "admin";
  return true;
}

/** Approvals expire so stale consent can't be replayed later. */
export const APPROVAL_TTL_HOURS = 72;

import { describe, expect, it } from "vitest";
import {
  AGENT_PROFILES, APPROVAL_REQUIRED_CATEGORIES, BLOCKED_TOOLS, authorize, canApprove, profileFor,
  type ToolCategory, type ToolPolicy,
} from "../src/index";

const tool = (name: string, category: ToolCategory, over: Partial<ToolPolicy> = {}): ToolPolicy => ({
  name, category, risk: "low", dataClass: "internal", rateLimit: { max: 10, windowSeconds: 60 }, estimatedCostUsd: 0,
  ...over,
});
const agent = (id: string) => profileFor({ type: "agent", id });
const owner = profileFor({ type: "user", id: "u" }, "owner");

describe("authorize", () => {
  it.each(["external_message", "payment", "refund", "publishing", "deploy_production"] as ToolCategory[])(
    "%s always requires approval, even for humans", (category) => {
      const d = authorize(tool("t", category), "t", owner);
      expect(d).toMatchObject({ allowed: true, requiresApproval: true });
    });

  it("high-risk tools require approval regardless of category", () => {
    expect(authorize(tool("t", "internal_write", { risk: "high" }), "t", owner)).toMatchObject({ requiresApproval: true });
  });

  it("low-risk internal work runs without approval", () => {
    expect(authorize(tool("draft_email", "draft", { dataClass: "customer_pii" }), "draft_email", agent("relayflow.support_agent")))
      .toEqual({ allowed: true, requiresApproval: false, reason: "allowed" });
  });

  it("blocked tools are denied for every actor with no approval path", () => {
    for (const name of BLOCKED_TOOLS.keys()) {
      expect(authorize(tool(name, "internal_write"), name, owner).allowed).toBe(false);
    }
  });

  it("enforces agent allow lists (TRD §5)", () => {
    const send = tool("send_email", "external_message", { dataClass: "customer_pii" });
    expect(authorize(send, "send_email", agent("ceo_master")).allowed).toBe(false);
    expect(authorize(tool("deploy_production", "deploy_production"), "deploy_production", agent("growth_master")).allowed).toBe(false);
    expect(authorize(tool("create_payment_link", "payment", { dataClass: "financial" }), "create_payment_link",
      agent("sales_master")).allowed).toBe(false);
  });

  it("enforces data classification", () => {
    const pii = tool("read_crm", "read", { dataClass: "customer_pii" });
    const eng = { ...AGENT_PROFILES.engineering_master!, allowedTools: new Set(["read_crm"]) };
    expect(authorize(pii, "read_crm", eng)).toMatchObject({ allowed: false, reason: expect.stringMatching(/classification/) });
  });

  it("denies unknown tools and actors without profiles", () => {
    expect(authorize(undefined, "mystery", owner).allowed).toBe(false);
    expect(authorize(tool("read_crm", "read"), "read_crm", profileFor({ type: "webhook", id: "x" })).allowed).toBe(false);
    expect(authorize(tool("read_crm", "read"), "read_crm", agent("rogue_agent")).allowed).toBe(false);
  });

  it("no agent profile may approve", () => {
    for (const p of Object.values(AGENT_PROFILES)) expect(p.canApprove).toBe(false);
    expect(APPROVAL_REQUIRED_CATEGORIES.size).toBe(5);
  });
});

describe("canApprove", () => {
  it("only humans approve; money and production need owner or admin", () => {
    expect(canApprove({ type: "agent", id: "ceo_master" }, "owner", "external_message")).toBe(false);
    expect(canApprove({ type: "user", id: "u" }, "member", "external_message")).toBe(true);
    expect(canApprove({ type: "user", id: "u" }, "member", "payment")).toBe(false);
    expect(canApprove({ type: "user", id: "u" }, "admin", "deploy_production")).toBe(true);
    expect(canApprove({ type: "user", id: "u" }, undefined, "draft")).toBe(false);
  });
});

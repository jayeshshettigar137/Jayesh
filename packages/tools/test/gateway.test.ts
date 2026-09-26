import type { ToolCategory } from "@relayos/policy";
import { newCorrelationId, type Actor } from "@relayos/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { testDb } from "../../../tests/setup/db";
import { ctxFor, rawMember, rawWorkspace } from "../../../tests/setup/fixtures";
import {
  ToolGateway, ToolRegistry, decideApproval, mockAdapters, type ToolCallRequest, type ToolDefinition,
} from "../src/index";

const executions: string[] = [];
let failNext = false;

function sideEffectTool(name: string, category: ToolCategory): ToolDefinition<{ ref: string }, { done: string }> {
  return {
    policy: { name, category, risk: "medium", dataClass: "internal", rateLimit: { max: 100, windowSeconds: 60 },
      estimatedCostUsd: 0 },
    description: name,
    input: z.object({ ref: z.string() }),
    subject: (i) => ({ type: "test", id: i.ref }),
    async execute(_ctx, input) {
      if (failNext) {
        failNext = false;
        throw new Error("provider unavailable");
      }
      executions.push(`${name}:${input.ref}`);
      return { output: { done: input.ref } };
    },
  };
}

const registry = new ToolRegistry()
  .register(sideEffectTool("send_email", "external_message"))
  .register(sideEffectTool("create_payment_link", "payment"))
  .register(sideEffectTool("publish_content_after_approval", "publishing"))
  .register(sideEffectTool("deploy_production", "deploy_production"))
  .register({ ...sideEffectTool("draft_email", "draft"), policy: {
    name: "draft_email", category: "draft", risk: "low", dataClass: "internal",
    rateLimit: { max: 2, windowSeconds: 3600 }, estimatedCostUsd: 0.4 } })
  .register({ ...sideEffectTool("deploy_staging", "deploy_staging") });

const gateway = new ToolGateway(testDb(), registry, mockAdapters(), { dailySpendLimitUsd: 1 });

const agent = (id: string): Actor => ({ type: "agent", id });
let ws: string;
let owner: string;
const req = (over: Partial<ToolCallRequest>): ToolCallRequest => ({
  workspaceId: ws, actor: agent("relayflow.support_agent"), tool: "send_email", input: { ref: "m1" },
  correlationId: newCorrelationId(), ...over,
});
const approve = (approvalId: string, userId = owner) =>
  testDb().withWorkspace(ws, (tx) => decideApproval(tx, ctxFor(ws, { type: "user", id: userId }), approvalId, "approve"));

beforeEach(async () => {
  executions.length = 0;
  ws = await rawWorkspace();
  owner = await rawMember(ws, "owner");
});

describe("side effects require approval", () => {
  it.each([
    ["send_email", "relayflow.support_agent"],
    ["create_payment_link", "finance_risk_master"],
    ["publish_content_after_approval", "growth_master"],
    ["deploy_production", "engineering_master"],
  ])("%s cannot run without a human approval", async (tool, agentId) => {
    const actor = agent(agentId);
    const first = await gateway.call(req({ tool, actor }));
    expect(first.status).toBe("pending_approval");
    expect(executions).toEqual([]);

    const approvalId = (first as { approvalId: string }).approvalId;
    const stillPending = await gateway.call(req({ tool, actor, approvalId }));
    expect(stillPending).toMatchObject({ status: "denied", reason: "approval is pending" });
    expect(executions).toEqual([]);

    await approve(approvalId);
    const ran = await gateway.call(req({ tool, actor, approvalId }));
    expect(ran).toMatchObject({ status: "succeeded" });
    expect(executions).toEqual([`${tool}:m1`]);

    const reused = await gateway.call(req({ tool, actor, approvalId }));
    expect(reused).toMatchObject({ status: "denied", reason: "approval is consumed" });
    expect(executions).toHaveLength(1);
  });

  it("humans also go through approval for external messages", async () => {
    const r = await gateway.call(req({ actor: { type: "user", id: owner } }));
    expect(r.status).toBe("pending_approval");
  });

  it("re-requesting the same action reuses the open approval", async () => {
    const a = await gateway.call(req({}));
    const b = await gateway.call(req({}));
    expect((a as { approvalId: string }).approvalId).toBe((b as { approvalId: string }).approvalId);
  });

  it("an approval cannot be reused for a changed payload", async () => {
    const r = await gateway.call(req({}));
    const approvalId = (r as { approvalId: string }).approvalId;
    await approve(approvalId);
    const tampered = await gateway.call(req({ input: { ref: "someone-else" }, approvalId }));
    expect(tampered).toMatchObject({ status: "denied", reason: "payload changed after approval" });
    expect(executions).toEqual([]);
  });

  it("an approval from another workspace is not visible", async () => {
    const r = await gateway.call(req({}));
    const approvalId = (r as { approvalId: string }).approvalId;
    await approve(approvalId);
    const otherWs = ws;
    ws = await rawWorkspace();
    const cross = await gateway.call(req({ approvalId }));
    expect(cross).toMatchObject({ status: "denied", reason: "approval not found" });
    ws = otherWs;
  });

  it("agents cannot approve and members cannot approve payments", async () => {
    const r = await gateway.call(req({ tool: "create_payment_link", actor: agent("finance_risk_master") }));
    const approvalId = (r as { approvalId: string }).approvalId;
    await expect(testDb().withWorkspace(ws, (tx) =>
      decideApproval(tx, ctxFor(ws, agent("ceo_master")), approvalId, "approve"))).rejects.toThrow(/not allowed/);
    const member = await rawMember(ws, "member");
    await expect(approve(approvalId, member)).rejects.toThrow(/not allowed/);
    const outsider = await rawMember(await rawWorkspace(), "owner");
    await expect(approve(approvalId, outsider)).rejects.toThrow(/not allowed/);
    await approve(approvalId, owner);
  });

  it("rejected approvals never execute", async () => {
    const r = await gateway.call(req({}));
    const approvalId = (r as { approvalId: string }).approvalId;
    await testDb().withWorkspace(ws, (tx) =>
      decideApproval(tx, ctxFor(ws, { type: "user", id: owner }), approvalId, "reject"));
    expect(await gateway.call(req({ approvalId }))).toMatchObject({ status: "denied", reason: "approval is rejected" });
    expect(executions).toEqual([]);
  });
});

describe("gateway controls", () => {
  it("dry runs have no side effects and create no approvals", async () => {
    const r = await gateway.call(req({ dryRun: true }));
    expect(r).toMatchObject({ status: "dry_run", wouldRequireApproval: true });
    expect(executions).toEqual([]);
    const approvals = await testDb().withWorkspace(ws, (tx) => tx.rows("SELECT * FROM approvals"));
    expect(approvals).toEqual([]);
  });

  it("blocked tools are denied and logged", async () => {
    const r = await gateway.call(req({ tool: "shell_exec", input: { cmd: "rm -rf /" } }));
    expect(r).toMatchObject({ status: "denied", reason: "arbitrary shell commands are blocked" });
    const audit = await testDb().withWorkspace(ws, (tx) =>
      tx.rows<{ action: string }>("SELECT action FROM audit_events WHERE action = 'tool.denied'"));
    expect(audit).toHaveLength(1);
  });

  it("enforces allow lists, input schemas, and membership", async () => {
    expect(await gateway.call(req({ tool: "deploy_staging", actor: agent("support_agent") })))
      .toMatchObject({ status: "denied", reason: expect.stringMatching(/allowed list/) });
    expect(await gateway.call(req({ tool: "deploy_staging", actor: agent("engineering_master"), input: { ref: 5 } })))
      .toMatchObject({ status: "denied", reason: expect.stringMatching(/invalid input/) });
    const outsider = await rawMember(await rawWorkspace(), "owner");
    expect(await gateway.call(req({ actor: { type: "user", id: outsider } })))
      .toMatchObject({ status: "denied", reason: expect.stringMatching(/not a member/) });
  });

  it("idempotency keys make retries safe", async () => {
    const call = () => gateway.call(req({ tool: "deploy_staging", actor: agent("engineering_master"), idempotencyKey: "k1" }));
    const a = await call();
    const b = await call();
    expect(a).toMatchObject({ status: "succeeded", replayed: false });
    expect(b).toMatchObject({ status: "succeeded", replayed: true, toolCallId: (a as { toolCallId: string }).toolCallId });
    expect(executions).toEqual(["deploy_staging:m1"]);
  });

  it("a failed execution keeps the approval valid for a retry, and only one send happens", async () => {
    const r = await gateway.call(req({}));
    const approvalId = (r as { approvalId: string }).approvalId;
    await approve(approvalId);
    failNext = true;
    expect(await gateway.call(req({ approvalId, idempotencyKey: "send-m1" })))
      .toMatchObject({ status: "failed", error: "provider unavailable" });
    expect(await gateway.call(req({ approvalId, idempotencyKey: "send-m1" }))).toMatchObject({ status: "succeeded" });
    expect(await gateway.call(req({ approvalId, idempotencyKey: "send-m1" }))).toMatchObject({ replayed: true });
    expect(executions).toEqual(["send_email:m1"]);
  });

  it("enforces rate limits and daily agent spend limits", async () => {
    const draft = () => gateway.call(req({ tool: "draft_email", input: { ref: String(Math.random()) } }));
    expect((await draft()).status).toBe("succeeded");
    expect((await draft()).status).toBe("succeeded"); // $0.80 of $1
    const third = await draft();
    expect(third.status).toBe("denied");
    expect((third as { reason: string }).reason).toMatch(/rate limit|spend limit/);
  });

  it("spend limit blocks agents before the rate limit when the budget is gone", async () => {
    await testDb().withWorkspace(ws, (tx) =>
      tx.exec(`INSERT INTO agent_runs (id, workspace_id, agent, provider, model, correlation_id, cost_usd)
               VALUES (gen_random_uuid(), $1, 'x', 'mock', 'mock', 'c', 0.9)`, [ws]));
    const r = await gateway.call(req({ tool: "draft_email" }));
    expect(r).toMatchObject({ status: "denied", reason: expect.stringMatching(/spend limit/) });
  });

  it("every external side effect is logged with actor, approval, and correlation id", async () => {
    const correlationId = newCorrelationId();
    const r = await gateway.call(req({ correlationId }));
    const approvalId = (r as { approvalId: string }).approvalId;
    await approve(approvalId);
    await gateway.call(req({ correlationId, approvalId }));
    const events = await testDb().withWorkspace(ws, (tx) =>
      tx.rows<{ action: string; actor_type: string; actor_id: string; approval_id: string | null }>(
        "SELECT action, actor_type, actor_id, approval_id FROM audit_events WHERE correlation_id = $1 ORDER BY id",
        [correlationId]));
    expect(events.map((e) => e.action)).toEqual(["approval.requested", "tool.started", "tool.succeeded"]);
    expect(events.at(-1)).toMatchObject({ actor_type: "agent", actor_id: "relayflow.support_agent", approval_id: approvalId });
    const calls = await testDb().withWorkspace(ws, (tx) =>
      tx.rows<{ status: string }>("SELECT status FROM tool_calls WHERE correlation_id = $1 ORDER BY created_at", [correlationId]));
    expect(calls.map((c) => c.status)).toEqual(["pending_approval", "succeeded"]);
  });
});

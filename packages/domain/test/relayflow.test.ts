import { LlmUnavailableError } from "@relayos/agents";
import { listAudit } from "@relayos/db";
import { weeklyMetrics } from "@relayos/analytics";
import { beforeEach, describe, expect, it } from "vitest";
import { runOnce } from "../../../apps/worker/src/worker";
import { SYNTHETIC_LEAD, onboard, testServices, type TestServices } from "../../../tests/setup/services";
import {
  approvalQueue, approveAndSend, createWorkspace, editDraft, getLead, intakeLead, listLeads, rejectDraft,
  setLeadStatus, unsubscribeLead, unsubscribeToken, updateWorkspaceSettings,
} from "../src/index";

let svc: TestServices;
beforeEach(() => {
  svc = testServices();
});

const webhook = { type: "webhook" as const, id: "webhook" };

async function intakeAndPrepare(ws: string, lead: object = SYNTHETIC_LEAD) {
  const { leadId, correlationId } = await intakeLead(svc, ws, lead, webhook);
  await runOnce(svc);
  return { leadId, correlationId };
}

describe("onboarding and auth", () => {
  it("creates a workspace with an owner who can log in", async () => {
    const { workspaceId, email } = await onboard(svc);
    const login = await svc.auth.login(email, "correct horse battery");
    expect(login?.session).toMatchObject({ workspaceId, role: "owner", workspaceName: "Cool Air HVAC" });
    expect(await svc.auth.login(email, "wrong password!!")).toBeNull();
    expect(await svc.auth.resolve(login!.token)).toMatchObject({ workspaceId });
    await svc.auth.logout(login!.token);
    expect(await svc.auth.resolve(login!.token)).toBeNull();
  });

  it("validates input and rejects duplicate emails", async () => {
    const { email } = await onboard(svc);
    await expect(createWorkspace(svc.db, { businessName: "X Co", ownerEmail: email, password: "correct horse battery" }))
      .rejects.toThrow(/already exists/);
    await expect(createWorkspace(svc.db, { businessName: "X Co", ownerEmail: "a@b.co", password: "short" }))
      .rejects.toThrow(/10 characters/);
  });
});

describe("RelayFlow acceptance criteria", () => {
  it("lead -> structured summary + draft -> approval queue -> send fails without approval -> approved send -> audited", async () => {
    const { workspaceId, userCtx } = await onboard(svc);
    const { leadId, correlationId } = await intakeAndPrepare(workspaceId);

    const lead = await svc.db.withWorkspace(workspaceId, (tx) => getLead(tx, leadId));
    expect(lead).toMatchObject({ category: "hvac", status: "new" });
    expect(lead.summary).toContain("Dana Diaz");
    expect(lead.checklist.length).toBeGreaterThan(2);

    const queue = await svc.db.withWorkspace(workspaceId, approvalQueue);
    expect(queue).toHaveLength(1);
    const item = queue[0]!;
    expect(item).toMatchObject({ tool: "send_email", status: "pending", to_addr: SYNTHETIC_LEAD.email, flags: [] });
    expect(item.body).toContain("Hi Dana");

    // The send tool fails safely without approval: nothing is delivered.
    const unapproved = await svc.gateway.call({
      workspaceId, actor: { type: "agent", id: "relayflow.support_agent" }, tool: "send_email", input: item.payload,
      correlationId, approvalId: item.approval_id,
    });
    expect(unapproved).toMatchObject({ status: "denied", reason: "approval is pending" });
    expect(svc.adapters.email.outbox).toHaveLength(0);

    const sent = await approveAndSend(svc, userCtx(), item.approval_id);
    expect(sent.status).toBe("succeeded");
    expect(svc.adapters.email.outbox).toHaveLength(1);
    expect(svc.adapters.email.outbox[0]!.body).toMatch(/Unsubscribe: http:\/\/localhost:3000\/u\//);

    const after = await svc.db.withWorkspace(workspaceId, (tx) => getLead(tx, leadId));
    expect(after.status).toBe("contacted");
    expect(after.first_response_at).not.toBeNull();

    const audit = await svc.db.withWorkspace(workspaceId, (tx) => listAudit(tx, { correlationId, limit: 100 }));
    const actions = audit.map((a) => a.action).reverse();
    for (const a of ["lead.created", "task.created", "task.running", "agent_run.succeeded", "tool.succeeded",
      "approval.requested", "tool.denied", "approval.approved", "task.executed"]) {
      expect(actions).toContain(a);
    }
    const task = await svc.db.withWorkspace(workspaceId, (tx) =>
      tx.one<{ status: string }>("SELECT status FROM tasks WHERE inputs->>'lead_id' = $1", [leadId]));
    expect(task.status).toBe("executed");

    const [thisWeek] = await svc.db.withWorkspace(workspaceId, (tx) => weeklyMetrics(tx, 2));
    expect(thisWeek).toMatchObject({ leads: 1, responded: 1, messages_sent: 1, agent_runs: 1, agent_runs_succeeded: 1 });
  });

  it("the prepare job is idempotent", async () => {
    const { workspaceId } = await onboard(svc);
    const { leadId } = await intakeAndPrepare(workspaceId);
    await svc.queue.enqueue("lead.prepare", { workspaceId, leadId });
    await runOnce(svc);
    const queue = await svc.db.withWorkspace(workspaceId, approvalQueue);
    expect(queue).toHaveLength(1);
    expect(svc.provider.calls).toHaveLength(1);
  });

  it("flagged drafts need explicit acknowledgement", async () => {
    const { workspaceId, userCtx } = await onboard(svc);
    svc.provider.nextResponses.push({
      category: "hvac", urgency: "soon", summary: "AC out", checklist: ["Photos"],
      email_subject: "Re: AC", email_body: "We can fix it today for $89. Call 800-555-0000.",
      suspicious_instructions: false,
    });
    await intakeAndPrepare(workspaceId);
    const [item] = await svc.db.withWorkspace(workspaceId, approvalQueue);
    expect(item!.flags).toEqual(["price_commitment", "schedule_commitment", "unsupported_contact_detail"]);
    await expect(approveAndSend(svc, userCtx(), item!.approval_id)).rejects.toThrow(/flagged/);
    expect(svc.adapters.email.outbox).toHaveLength(0);
    expect((await approveAndSend(svc, userCtx(), item!.approval_id, { acknowledgeFlags: true })).status).toBe("succeeded");
  });

  it("editing a draft supersedes the old approval; the edited text is what gets sent", async () => {
    const { workspaceId, userCtx } = await onboard(svc);
    await intakeAndPrepare(workspaceId);
    const [item] = await svc.db.withWorkspace(workspaceId, approvalQueue);
    const { approvalId } = await editDraft(svc, userCtx(), item!.approval_id, "Your AC request", "Hi Dana, edited body.");
    await expect(approveAndSend(svc, userCtx(), item!.approval_id)).rejects.toThrow(/expired/);
    expect((await approveAndSend(svc, userCtx(), approvalId)).status).toBe("succeeded");
    expect(svc.adapters.email.outbox[0]!.body).toMatch(/^Hi Dana, edited body\./);
    expect(svc.adapters.email.outbox[0]!.subject).toBe("Your AC request");
  });

  it("rejecting a draft sends nothing and closes the task", async () => {
    const { workspaceId, userCtx } = await onboard(svc);
    const { leadId } = await intakeAndPrepare(workspaceId);
    const [item] = await svc.db.withWorkspace(workspaceId, approvalQueue);
    await rejectDraft(svc, userCtx(), item!.approval_id, "wrong tone");
    expect(await svc.db.withWorkspace(workspaceId, approvalQueue)).toEqual([]);
    const task = await svc.db.withWorkspace(workspaceId, (tx) =>
      tx.one<{ status: string }>("SELECT status FROM tasks WHERE inputs->>'lead_id' = $1", [leadId]));
    expect(task.status).toBe("rejected");
    expect(svc.adapters.email.outbox).toHaveLength(0);
  });

  it("booking a lead withdraws its pending follow-up", async () => {
    const { workspaceId, userCtx } = await onboard(svc);
    const { leadId } = await intakeAndPrepare(workspaceId);
    const [item] = await svc.db.withWorkspace(workspaceId, approvalQueue);
    await svc.db.withWorkspace(workspaceId, (tx) => setLeadStatus(tx, userCtx(), leadId, "booked"));
    expect(await svc.db.withWorkspace(workspaceId, approvalQueue)).toEqual([]);
    await expect(approveAndSend(svc, userCtx(), item!.approval_id)).rejects.toThrow(/expired/);
  });

  it("uses workspace memory: approved facts may be stated, others are flagged", async () => {
    const { workspaceId, userId } = await onboard(svc);
    await updateWorkspaceSettings(svc.db, workspaceId, userId, {
      business_profile: "Family-owned, serving Austin.", approved_facts: ["Licensed and insured"], reply_to: "",
    });
    svc.provider.nextResponses.push({
      category: "hvac", urgency: "soon", summary: "AC out", checklist: ["Photos"], email_subject: "Re: AC",
      email_body: "Hi Dana, we're licensed and insured. Could you send photos?", suspicious_instructions: false,
    });
    await intakeAndPrepare(workspaceId);
    const [item] = await svc.db.withWorkspace(workspaceId, approvalQueue);
    expect(item!.flags).toEqual([]);
    expect(svc.provider.calls[0]!.user).toContain("Licensed and insured");
  });

  it("leads without email get a summary and a call-first next action", async () => {
    const { workspaceId } = await onboard(svc);
    await intakeAndPrepare(workspaceId, { name: "Phone Only", phone: "512-555-0199", service: "Furnace noise" });
    const [lead] = await svc.db.withWorkspace(workspaceId, (tx) => listLeads(tx));
    expect(lead!.summary).not.toBe("");
    expect(lead!.next_action).toBe("Call the customer (no email)");
    expect(await svc.db.withWorkspace(workspaceId, approvalQueue)).toEqual([]);
  });

  it("rejects invalid intake payloads", async () => {
    const { workspaceId } = await onboard(svc);
    await expect(intakeLead(svc, workspaceId, { name: "No contact" }, webhook)).rejects.toThrow(/email or a phone/);
    await expect(intakeLead(svc, workspaceId, { email: "not-an-email" }, webhook)).rejects.toThrow(/invalid email/);
  });
});

describe("unsubscribe handling", () => {
  it("unsubscribing withdraws pending drafts and blocks future sends", async () => {
    const { workspaceId, userCtx } = await onboard(svc);
    const { leadId } = await intakeAndPrepare(workspaceId);
    const [item] = await svc.db.withWorkspace(workspaceId, approvalQueue);
    expect(await unsubscribeLead(svc, unsubscribeToken(svc.secret, workspaceId, leadId))).toBe(true);
    expect(await unsubscribeLead(svc, unsubscribeToken(svc.secret, workspaceId, leadId))).toBe(true); // idempotent
    expect(await svc.db.withWorkspace(workspaceId, approvalQueue)).toEqual([]);
    await expect(approveAndSend(svc, userCtx(), item!.approval_id)).rejects.toThrow();
    expect(svc.adapters.email.outbox).toHaveLength(0);
    const direct = await svc.gateway.call({
      workspaceId, actor: userCtx().actor, tool: "draft_email", correlationId: "c",
      input: { lead_id: leadId, subject: "s", body: "b" },
    });
    expect(direct).toMatchObject({ status: "denied", reason: "lead unsubscribed" });
  });

  it("rejects forged or cross-workspace tokens", async () => {
    const { workspaceId } = await onboard(svc);
    const { leadId } = await intakeAndPrepare(workspaceId);
    expect(await unsubscribeLead(svc, unsubscribeToken("some-other-secret-xxxxxxxxxxxxxxxxxxxx", workspaceId, leadId))).toBe(false);
    const other = await onboard(svc, "Other Co");
    expect(await unsubscribeLead(svc, unsubscribeToken(svc.secret, other.workspaceId, leadId))).toBe(false);
  });
});

describe("worker reliability", () => {
  it("retries transient model failures, then escalates to a human", async () => {
    const { workspaceId } = await onboard(svc);
    svc.provider.failWith = new LlmUnavailableError("overloaded", true);
    const { leadId } = await intakeLead(svc, workspaceId, SYNTHETIC_LEAD, webhook);
    const job = [...svc.queue.jobs.values()].find((j) => (j.payload as { leadId: string }).leadId === leadId)!;
    job.maxAttempts = 2;
    expect(await runOnce(svc)).toMatchObject({ failed: 1, escalated: 0 });
    job.runAt = 0;
    expect(await runOnce(svc)).toMatchObject({ failed: 1, escalated: 1 });

    const [lead] = await svc.db.withWorkspace(workspaceId, (tx) => listLeads(tx));
    expect(lead!.next_action).toBe("Agent failed - review manually");
    const task = await svc.db.withWorkspace(workspaceId, (tx) =>
      tx.one<{ status: string }>("SELECT status FROM tasks WHERE inputs->>'lead_id' = $1", [leadId]));
    expect(task.status).toBe("escalated");
    expect(svc.adapters.email.outbox).toHaveLength(0);

    // Once the provider recovers, a re-queued job completes the same task.
    svc.provider.failWith = null;
    await svc.queue.enqueue("lead.prepare", { workspaceId, leadId });
    await runOnce(svc);
    expect(await svc.db.withWorkspace(workspaceId, approvalQueue)).toHaveLength(1);
  });

  it("escalates non-retryable failures immediately", async () => {
    const { workspaceId } = await onboard(svc);
    svc.provider.failWith = new LlmUnavailableError("model declined the request", false);
    await intakeLead(svc, workspaceId, SYNTHETIC_LEAD, webhook);
    expect(await runOnce(svc)).toMatchObject({ failed: 1, escalated: 1 });
  });
});

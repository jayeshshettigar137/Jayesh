import { describe, expect, it } from "vitest";
import { testDb } from "../../../tests/setup/db";
import { ctxFor, rawWorkspace } from "../../../tests/setup/fixtures";
import { createTask, transitionTask, type TaskSpec } from "../src/index";

const spec = (over: Partial<TaskSpec> = {}): TaskSpec => ({
  task_type: "lead.prepare",
  objective: "Summarize lead and draft follow-up",
  business_line: "relayflow",
  risk_level: "low",
  inputs: { lead_id: "x" },
  expected_output_schema: { type: "object" },
  success_metric: "draft approved without edits",
  deadline: new Date(Date.now() + 3600_000).toISOString(),
  requires_approval: false,
  max_cost_usd: 0.5,
  ...over,
});

describe("task lifecycle", () => {
  it("validates the TRD task contract", async () => {
    const ws = await rawWorkspace();
    await expect(
      testDb().withWorkspace(ws, (tx) => createTask(tx, ctxFor(ws), "agent", spec({ deadline: "tomorrow" }))),
    ).rejects.toThrow(/invalid task/);
    await expect(
      testDb().withWorkspace(ws, (tx) =>
        createTask(tx, ctxFor(ws), "agent", { ...spec(), business_line: "crypto" as never })),
    ).rejects.toThrow(/invalid task/);
  });

  it("walks the happy path and records every transition in the audit log", async () => {
    const ws = await rawWorkspace();
    const ctx = ctxFor(ws);
    const final = await testDb().withWorkspace(ws, async (tx) => {
      const t = await createTask(tx, ctx, "relayflow.support_agent", spec());
      for (const s of ["validated", "planned", "queued", "running", "review", "approved", "executed", "measured"] as const) {
        await transitionTask(tx, ctx, t.id, s);
      }
      return transitionTask(tx, ctx, t.id, "improved", { output: { ok: true } });
    });
    expect(final.status).toBe("improved");
    expect(final.attempts).toBe(1);
    const actions = await testDb().withWorkspace(ws, (tx) =>
      tx.rows<{ action: string }>("SELECT action FROM audit_events WHERE entity_id = $1 ORDER BY id", [final.id]));
    expect(actions.map((a) => a.action)).toEqual([
      "task.created", "task.validated", "task.planned", "task.queued", "task.running", "task.review",
      "task.approved", "task.executed", "task.measured", "task.improved",
    ]);
  });

  it("rejects illegal transitions", async () => {
    const ws = await rawWorkspace();
    await expect(
      testDb().withWorkspace(ws, async (tx) => {
        const t = await createTask(tx, ctxFor(ws), "agent", spec());
        await transitionTask(tx, ctxFor(ws), t.id, "executed");
      }),
    ).rejects.toThrow(/illegal task transition idea -> executed/);
  });

  it("high-risk tasks always require a granted approval for the same task", async () => {
    const ws = await rawWorkspace();
    const ctx = ctxFor(ws);
    await expect(
      testDb().withWorkspace(ws, async (tx) => {
        const t = await createTask(tx, ctx, "agent", spec({ risk_level: "high", requires_approval: false }));
        expect(t.requires_approval).toBe(true);
        for (const s of ["validated", "planned", "queued", "running", "review"] as const) {
          await transitionTask(tx, ctx, t.id, s);
        }
        await transitionTask(tx, ctx, t.id, "approved");
      }),
    ).rejects.toThrow(/requires a human approval/);
  });

  it("escalates when the cost cap is exceeded", async () => {
    const ws = await rawWorkspace();
    const ctx = ctxFor(ws);
    const t = await testDb().withWorkspace(ws, async (tx) => {
      const task = await createTask(tx, ctx, "agent", spec({ max_cost_usd: 0.1 }));
      for (const s of ["validated", "planned", "queued", "running"] as const) await transitionTask(tx, ctx, task.id, s);
      return transitionTask(tx, ctx, task.id, "review", { costUsd: 0.25 });
    });
    expect(t.status).toBe("escalated");
  });
});

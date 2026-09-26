import { MockProvider } from "@relayos/agents";
import { approvalQueue, createServices, listLeads } from "@relayos/domain";
import { InMemoryQueue, loadEnv } from "@relayos/shared";
import { mockAdapters } from "@relayos/tools";
import { describe, expect, it } from "vitest";
import { testDb } from "../../../tests/setup/db";
import { DEMO_LEADS, seedDemo } from "../src/demo";

describe("demo seed", () => {
  it("creates a synthetic workspace covering every pipeline state, and resets cleanly", async () => {
    const svc = createServices(loadEnv(), {
      db: testDb(), queue: new InMemoryQueue(), provider: new MockProvider(), adapters: mockAdapters(),
    });
    const first = await seedDemo(loadEnv(), { svc, reset: true });
    await expect(seedDemo(loadEnv(), { svc })).rejects.toThrow(/already exists/);
    const again = await seedDemo(loadEnv(), { svc, reset: true });
    expect(again.workspaceId).not.toBe(first.workspaceId);

    const leads = await svc.db.withWorkspace(again.workspaceId, (tx) => listLeads(tx));
    expect(leads).toHaveLength(DEMO_LEADS.length);
    expect(new Set(leads.map((l) => l.status))).toEqual(new Set(["new", "contacted", "booked", "lost"]));
    // Every contact detail is fictional.
    for (const l of leads) {
      if (l.email) expect(l.email).toMatch(/@example\.com$/);
      if (l.phone) expect(l.phone).toMatch(/-555-/);
    }
    const queue = await svc.db.withWorkspace(again.workspaceId, approvalQueue);
    expect(queue).toHaveLength(3);
    const injected = queue.find((q) => q.lead_name === "Test Prompt");
    expect(injected?.flags).toContain("suspicious_input");
    expect(injected?.to_addr).toBe("jordan.webb@example.com"); // never redirected to the injected address
  });
});

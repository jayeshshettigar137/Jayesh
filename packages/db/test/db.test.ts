import { newCorrelationId, newId } from "@relayos/shared";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { recreateDatabase } from "../../../tests/setup/global-setup";
import { adminUrlFor } from "../../../tests/setup/constants";
import { testDb } from "../../../tests/setup/db";
import { listAudit, recordAudit } from "../src/audit";
import { loadMigrations, migrateDown, migrateUp } from "../src/migrate";
import { PgQueue } from "../src/pgQueue";

async function makeWorkspace(name: string): Promise<string> {
  const id = newId();
  await testDb().withWorkspace(id, (tx) =>
    tx.exec("INSERT INTO workspaces (id, name, slug, intake_token) VALUES ($1, $2, $3, $4)", [
      id, name, `${name.toLowerCase()}-${id.slice(0, 8)}`, `tok_${id}`,
    ]),
  );
  return id;
}

async function addLead(ws: string, email: string) {
  await testDb().withWorkspace(ws, (tx) =>
    tx.exec("INSERT INTO leads (id, workspace_id, email) VALUES ($1, $2, $3)", [newId(), ws, email]),
  );
}

describe("migrations", () => {
  it("every migration has a down file and round-trips up -> down -> up", async () => {
    const db = "relayos_test_migrations";
    await recreateDatabase(db);
    const url = adminUrlFor(db);
    const all = (await loadMigrations()).map((m) => m.version);
    expect(await migrateUp(url)).toEqual(all);
    expect(await migrateUp(url)).toEqual([]);
    expect(await migrateDown(url, all.length)).toEqual([...all].reverse());
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'",
    );
    await client.end();
    expect(rows[0].n).toBe(0);
    expect(await migrateUp(url)).toEqual(all);
  });
});

describe("row-level workspace isolation", () => {
  it("a query without a WHERE clause only sees the current workspace", async () => {
    const a = await makeWorkspace("Alpha");
    const b = await makeWorkspace("Beta");
    await addLead(a, "a@example.com");
    await addLead(b, "b@example.com");
    const seen = await testDb().withWorkspace(a, (tx) => tx.rows<{ email: string }>("SELECT email FROM leads"));
    expect(seen.map((r) => r.email)).toEqual(["a@example.com"]);
    const workspaces = await testDb().withWorkspace(a, (tx) => tx.rows("SELECT id FROM workspaces"));
    expect(workspaces).toHaveLength(1);
  });

  it("cannot write rows into another workspace", async () => {
    const a = await makeWorkspace("Gamma");
    const b = await makeWorkspace("Delta");
    await expect(
      testDb().withWorkspace(a, (tx) =>
        tx.exec("INSERT INTO leads (id, workspace_id, email) VALUES ($1, $2, 'x@example.com')", [newId(), b]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("system transactions see no workspace data", async () => {
    const a = await makeWorkspace("Epsilon");
    await addLead(a, "e@example.com");
    expect(await testDb().system((tx) => tx.rows("SELECT * FROM leads"))).toEqual([]);
    const resolved = await testDb().system((tx) =>
      tx.rows("SELECT * FROM resolve_intake_token($1)", [`tok_${a}`]),
    );
    expect(resolved).toHaveLength(1);
  });

  it("rejects malformed workspace ids", async () => {
    await expect(testDb().withWorkspace("1' OR '1'='1", async () => 1)).rejects.toThrow(/invalid workspace/);
  });
});

describe("audit log", () => {
  it("is append-only for the app role", async () => {
    const ws = await makeWorkspace("Audit");
    const correlationId = newCorrelationId();
    await testDb().withWorkspace(ws, (tx) =>
      recordAudit(tx, { actorType: "system", actorId: "test", action: "test.event", correlationId }),
    );
    const rows = await testDb().withWorkspace(ws, (tx) => listAudit(tx, { correlationId }));
    expect(rows.map((r) => r.action)).toEqual(["test.event"]);
    await expect(testDb().withWorkspace(ws, (tx) => tx.exec("UPDATE audit_events SET action = 'x'"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(testDb().withWorkspace(ws, (tx) => tx.exec("DELETE FROM audit_events"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("refuses to record outside a workspace transaction", async () => {
    await expect(
      testDb().system((tx) =>
        recordAudit(tx, { actorType: "system", actorId: "t", action: "x", correlationId: "c" }),
      ),
    ).rejects.toThrow();
  });
});

describe("PgQueue", () => {
  it("enqueues idempotently, claims exclusively, retries with backoff, then dies", async () => {
    const q = new PgQueue(testDb());
    const type = `test.${newId()}`;
    const key = `k-${newId()}`;
    const id = await q.enqueue(type, { n: 1 }, { idempotencyKey: key, maxAttempts: 2 });
    expect(await q.enqueue(type, { n: 2 }, { idempotencyKey: key })).toBe(id);

    const [first, second] = await Promise.all([q.claim([type]), q.claim([type])]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    const job = (first ?? second)!;
    expect(job.payload).toEqual({ n: 1 });
    expect(await q.fail(job.id, "boom")).toBe("retry");
    expect(await q.claim([type])).toBeNull(); // backoff: not due yet

    await testDb().system((tx) => tx.exec("UPDATE jobs SET run_at = now() WHERE id = $1", [id]));
    const again = await q.claim([type]);
    expect(again?.attempts).toBe(2);
    expect(await q.fail(id, "boom again")).toBe("dead");
    expect(await q.claim([type])).toBeNull();
  });

  it("completes jobs", async () => {
    const q = new PgQueue(testDb());
    const type = `test.${newId()}`;
    await q.enqueue(type, {});
    const job = await q.claim([type]);
    await q.complete(job!.id);
    expect(await q.claim([type])).toBeNull();
  });
});

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

interface Migration {
  version: string;
  up: string;
  down: string;
}

export async function loadMigrations(dir = MIGRATIONS_DIR): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".up.sql")).sort();
  return Promise.all(
    files.map(async (f) => {
      const version = f.replace(/\.up\.sql$/, "");
      const down = path.join(dir, `${version}.down.sql`);
      return {
        version,
        up: await readFile(path.join(dir, f), "utf8"),
        // Every migration must be reversible (TRD §10); a missing down file is an error.
        down: await readFile(down, "utf8"),
      };
    }),
  );
}

async function withClient<T>(adminUrl: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query("SET client_min_messages = warning");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function applied(c: pg.Client): Promise<string[]> {
  const res = await c.query("SELECT version FROM schema_migrations ORDER BY version");
  return res.rows.map((r) => r.version as string);
}

/** Apply all pending migrations, each in its own transaction. Returns applied versions. */
export async function migrateUp(adminUrl: string): Promise<string[]> {
  const migrations = await loadMigrations();
  return withClient(adminUrl, async (c) => {
    const done = new Set(await applied(c));
    const ran: string[] = [];
    for (const m of migrations) {
      if (done.has(m.version)) continue;
      await c.query("BEGIN");
      try {
        await c.query(m.up);
        await c.query("INSERT INTO schema_migrations (version) VALUES ($1)", [m.version]);
        await c.query("COMMIT");
      } catch (err) {
        await c.query("ROLLBACK");
        throw new Error(`migration ${m.version} failed: ${(err as Error).message}`);
      }
      ran.push(m.version);
    }
    return ran;
  });
}

/** Roll back the most recent `steps` migrations. Returns rolled-back versions. */
export async function migrateDown(adminUrl: string, steps = 1): Promise<string[]> {
  const migrations = new Map((await loadMigrations()).map((m) => [m.version, m]));
  return withClient(adminUrl, async (c) => {
    const done = (await applied(c)).reverse().slice(0, steps);
    for (const version of done) {
      const m = migrations.get(version);
      if (!m) throw new Error(`no migration files for applied version ${version}`);
      await c.query("BEGIN");
      try {
        await c.query(m.down);
        await c.query("DELETE FROM schema_migrations WHERE version = $1", [version]);
        await c.query("COMMIT");
      } catch (err) {
        await c.query("ROLLBACK");
        throw new Error(`rollback ${version} failed: ${(err as Error).message}`);
      }
    }
    return done;
  });
}

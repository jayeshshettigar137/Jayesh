import pg from "pg";
import { migrateUp } from "../../packages/db/src/migrate";
import { ADMIN_SERVER_URL, ADMIN_URL, TEST_DB } from "./constants";

export async function recreateDatabase(name: string): Promise<void> {
  const client = new pg.Client({ connectionString: ADMIN_SERVER_URL });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Cannot reach Postgres for tests (${(err as Error).message}). ` +
        "Start it with `docker compose -f infra/docker-compose.yml up -d` or see README.",
    );
  }
  try {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${name}`);
  } finally {
    await client.end();
  }
}

export default async function setup() {
  await recreateDatabase(TEST_DB);
  await migrateUp(ADMIN_URL);
}

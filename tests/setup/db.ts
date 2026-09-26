import { Db } from "../../packages/db/src/client";
import { APP_URL } from "./constants";

/** Shared app-role connection for integration tests (RLS applies, like production). */
let db: Db | undefined;
export function testDb(): Db {
  db ??= Db.connect(APP_URL, 5);
  return db;
}

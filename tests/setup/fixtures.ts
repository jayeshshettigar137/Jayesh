import { newCorrelationId, newId, type ActionContext } from "@relayos/shared";
import { testDb } from "./db";

/** Minimal workspace row for low-level tests (domain onboarding is tested separately). */
export async function rawWorkspace(name = "Test Co"): Promise<string> {
  const id = newId();
  await testDb().withWorkspace(id, (tx) =>
    tx.exec("INSERT INTO workspaces (id, name, slug, intake_token) VALUES ($1, $2, $3, $4)", [
      id, name, `test-${id.slice(0, 8)}`, `tok_${id}`,
    ]),
  );
  return id;
}

export function ctxFor(workspaceId: string, actor: ActionContext["actor"] = { type: "system", id: "test" }): ActionContext {
  return { workspaceId, actor, correlationId: newCorrelationId() };
}

/** Insert a user with a membership in the workspace. Returns the user id. */
export async function rawMember(workspaceId: string, role: "owner" | "admin" | "member" = "owner"): Promise<string> {
  const id = newId();
  await testDb().system((tx) =>
    tx.exec("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'x')", [id, `${id}@example.test`]));
  await testDb().withWorkspace(workspaceId, (tx) =>
    tx.exec("INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, $3)", [workspaceId, id, role]));
  return id;
}

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

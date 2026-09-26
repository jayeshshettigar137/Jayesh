import { MockProvider } from "@relayos/agents";
import { createServices, createWorkspace, type RelayServices } from "@relayos/domain";
import { InMemoryQueue, loadEnv, newCorrelationId, newId, type ActionContext } from "@relayos/shared";
import { mockAdapters } from "@relayos/tools";
import { testDb } from "./db";

export type TestServices = RelayServices & {
  provider: MockProvider;
  queue: InMemoryQueue;
  adapters: ReturnType<typeof mockAdapters>;
};

export function testServices(): TestServices {
  return createServices(loadEnv(), {
    db: testDb(), queue: new InMemoryQueue(), provider: new MockProvider(), adapters: mockAdapters(),
  }) as TestServices;
}

export async function onboard(svc: RelayServices, name = "Cool Air HVAC") {
  const email = `owner-${newId()}@example.test`;
  const { workspaceId, userId } = await createWorkspace(svc.db, {
    businessName: name, ownerEmail: email, ownerName: "Olive Owner", password: "correct horse battery", niche: "hvac",
  });
  const userCtx = (): ActionContext => ({ workspaceId, actor: { type: "user", id: userId }, correlationId: newCorrelationId() });
  return { workspaceId, userId, email, userCtx };
}

export const SYNTHETIC_LEAD = {
  name: "Dana Diaz",
  email: "dana.diaz@example.com",
  phone: "512-555-0142",
  service: "AC not cooling",
  message: "Our upstairs AC stopped blowing cold air yesterday. House is 2 stories, unit is maybe 12 years old.",
  source: "website form",
};

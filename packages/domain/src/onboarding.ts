import { recordAudit, type Db } from "@relayos/db";
import { DomainError, newCorrelationId, newId, randomToken } from "@relayos/shared";
import { z } from "zod";
import { hashPassword } from "./auth";
import { LeadCategory } from "./contracts";

export const OnboardingInput = z.object({
  businessName: z.string().trim().min(2, "business name is required").max(120),
  niche: LeadCategory.exclude(["other"]).default("hvac"),
  ownerName: z.string().trim().max(120).default(""),
  ownerEmail: z.email("a valid email is required").transform((e) => e.toLowerCase()),
  password: z.string().min(10, "password must be at least 10 characters").max(200),
});
export type OnboardingInput = z.input<typeof OnboardingInput>;

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "workspace";
}

/** Create a workspace, its owner, and the owner's membership. A person signs up; no agent can. */
export async function createWorkspace(db: Db, raw: OnboardingInput): Promise<{ workspaceId: string; userId: string }> {
  const parsed = OnboardingInput.safeParse(raw);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0]!.message, "invalid_input");
  const input = parsed.data;
  const workspaceId = newId();
  const userId = newId();
  const correlationId = newCorrelationId();
  const passwordHash = await hashPassword(input.password);

  let slug = slugify(input.businessName);
  await db.system(async (tx) => {
    if (await tx.maybeOne("SELECT 1 FROM users WHERE email = $1", [input.ownerEmail])) {
      throw new DomainError("an account with that email already exists", "conflict");
    }
    while ((await tx.one<{ taken: boolean }>("SELECT slug_taken($1) AS taken", [slug])).taken) {
      slug = `${slugify(input.businessName).slice(0, 34)}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
    }
    await tx.exec("INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)", [
      userId, input.ownerEmail, input.ownerName, passwordHash]);
  });
  try {
    await db.withWorkspace(workspaceId, async (tx) => {
      await tx.exec(
        "INSERT INTO workspaces (id, name, slug, niche, reply_to, intake_token) VALUES ($1, $2, $3, $4, $5, $6)",
        [workspaceId, input.businessName, slug, input.niche, input.ownerEmail, randomToken(24)]);
      await tx.exec("INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner')", [workspaceId, userId]);
      await recordAudit(tx, {
        actorType: "user", actorId: userId, action: "workspace.created", entityType: "workspace", entityId: workspaceId,
        correlationId, data: { name: input.businessName, slug, niche: input.niche },
      });
    });
  } catch (err) {
    await db.system((tx) => tx.exec("DELETE FROM users WHERE id = $1", [userId]));
    throw err;
  }
  return { workspaceId, userId };
}

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  niche: string;
  business_profile: string;
  approved_facts: string[];
  reply_to: string;
  intake_token: string;
  subscription_status: string;
}

export async function getWorkspace(db: Db, workspaceId: string): Promise<WorkspaceRow> {
  return db.withWorkspace(workspaceId, (tx) => tx.one<WorkspaceRow>("SELECT * FROM workspaces"));
}

export const WorkspaceSettings = z.object({
  business_profile: z.string().trim().max(4000),
  approved_facts: z.array(z.string().trim().min(1).max(300)).max(30),
  reply_to: z.union([z.literal(""), z.email()]),
});

/** Workspace memory (TRD §8): profile and approved facts the agent may state to customers. */
export async function updateWorkspaceSettings(
  db: Db, workspaceId: string, userId: string, raw: z.input<typeof WorkspaceSettings>,
): Promise<void> {
  const parsed = WorkspaceSettings.safeParse(raw);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0]!.message, "invalid_input");
  await db.withWorkspace(workspaceId, async (tx) => {
    await tx.exec("UPDATE workspaces SET business_profile = $1, approved_facts = $2, reply_to = $3", [
      parsed.data.business_profile, JSON.stringify(parsed.data.approved_facts), parsed.data.reply_to]);
    await recordAudit(tx, {
      actorType: "user", actorId: userId, action: "workspace.settings_updated", entityType: "workspace",
      entityId: workspaceId, correlationId: newCorrelationId(), data: { facts: parsed.data.approved_facts.length },
    });
  });
}

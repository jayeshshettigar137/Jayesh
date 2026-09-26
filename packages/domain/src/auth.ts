import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Db } from "@relayos/db";
import type { MemberRole } from "@relayos/policy";
import { randomToken, sha256 } from "@relayos/shared";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, Buffer.from(salt, "hex"), 32);
  const expected = Buffer.from(hash, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export interface SessionInfo {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  role: MemberRole;
}

/**
 * Auth provider seam. The local adapter below is for development and the pilot; production should
 * swap in a managed provider (TRD §2) behind this same interface.
 */
export interface AuthProvider {
  login(email: string, password: string): Promise<{ token: string; session: SessionInfo } | null>;
  resolve(token: string | undefined): Promise<SessionInfo | null>;
  logout(token: string | undefined): Promise<void>;
  createSession(userId: string, workspaceId: string): Promise<string>;
}

export class LocalAuthProvider implements AuthProvider {
  constructor(private readonly db: Db) {}

  async createSession(userId: string, workspaceId: string): Promise<string> {
    const token = randomToken(32);
    await this.db.system((tx) =>
      tx.exec(
        "INSERT INTO sessions (token_hash, user_id, workspace_id, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))",
        [sha256(token), userId, workspaceId, SESSION_DAYS]));
    return token;
  }

  async login(email: string, password: string) {
    const user = await this.db.system((tx) =>
      tx.maybeOne<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = $1", [
        email.trim().toLowerCase(),
      ]));
    // Always run a hash so response time doesn't reveal whether the email exists.
    const ok = await verifyPassword(password, user?.password_hash ?? "scrypt$00$00");
    if (!user || !ok) return null;
    const membership = await this.db.system((tx) =>
      tx.maybeOne<{ workspace_id: string }>("SELECT workspace_id FROM user_memberships($1) LIMIT 1", [user.id]));
    if (!membership) return null;
    const token = await this.createSession(user.id, membership.workspace_id);
    const session = await this.resolve(token);
    return session ? { token, session } : null;
  }

  async resolve(token: string | undefined): Promise<SessionInfo | null> {
    if (!token) return null;
    return this.db.system(async (tx) => {
      const row = await tx.maybeOne<{ user_id: string; email: string; name: string; workspace_id: string }>(
        `SELECT s.user_id, u.email, u.name, s.workspace_id FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sha256(token)]);
      if (!row) return null;
      const m = await tx.maybeOne<{ role: MemberRole; workspace_name: string }>(
        "SELECT role, workspace_name FROM user_memberships($1) WHERE workspace_id = $2", [row.user_id, row.workspace_id]);
      if (!m) return null; // membership revoked
      return { userId: row.user_id, email: row.email, name: row.name, workspaceId: row.workspace_id,
        workspaceName: m.workspace_name, role: m.role };
    });
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.db.system((tx) => tx.exec("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]));
  }
}

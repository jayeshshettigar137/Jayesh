import type { SessionInfo } from "@relayos/domain";
import { newCorrelationId, type ActionContext } from "@relayos/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { services } from "./services";

export const SESSION_COOKIE = "rf_session";

export async function currentSession(): Promise<SessionInfo | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return services().auth.resolve(token);
}

/** Every page and server action under /app calls this; there is no unauthenticated path. */
export async function requireSession(): Promise<SessionInfo> {
  const session = await currentSession();
  if (!session) redirect("/login");
  return session;
}

export function userCtx(session: SessionInfo): ActionContext {
  return { workspaceId: session.workspaceId, actor: { type: "user", id: session.userId }, correlationId: newCorrelationId() };
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.APP_BASE_URL?.startsWith("https://") ?? false,
    path: "/", maxAge: 14 * 86400,
  });
}

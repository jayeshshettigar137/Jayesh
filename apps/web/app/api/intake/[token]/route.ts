import { intakeLead, resolveIntakeToken } from "@relayos/domain";
import { DomainError, logger } from "@relayos/shared";
import { services } from "@/lib/services";

const MAX_BODY = 64 * 1024;

/** Lead webhook: POST JSON (or form fields). The token in the URL identifies the workspace. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const svc = services();
  const ws = await resolveIntakeToken(svc, token);
  if (!ws) return Response.json({ error: "unknown intake endpoint" }, { status: 404 });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "payload too large" }, { status: 413 });
  let data: unknown;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      data = JSON.parse(raw || "{}");
    } catch {
      return Response.json({ error: "body is not valid JSON" }, { status: 400 });
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return Response.json({ error: "body must be a JSON object" }, { status: 400 });
    }
  } else {
    data = Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    const { leadId } = await intakeLead(svc, ws.id, data, { type: "webhook", id: "intake-webhook" });
    return Response.json({ ok: true, lead_id: leadId }, { status: 201 });
  } catch (err) {
    if (err instanceof DomainError) {
      return Response.json({ error: err.message }, { status: err.code === "rate_limited" ? 429 : 422 });
    }
    logger.error("intake failed", { error: (err as Error).message });
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}

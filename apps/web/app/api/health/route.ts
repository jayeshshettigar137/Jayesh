import { logger } from "@relayos/shared";
import { services } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await services().db.system((tx) => tx.one("SELECT 1 AS ok"));
    return Response.json({ ok: true });
  } catch (err) {
    logger.error("health check failed", { error: (err as Error).message });
    return Response.json({ ok: false }, { status: 503 });
  }
}

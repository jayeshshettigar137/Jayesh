import { handleStripeWebhook, stripeEnabled } from "@relayos/domain";
import { DomainError, logger } from "@relayos/shared";
import { services } from "@/lib/services";

export async function POST(req: Request) {
  const svc = services();
  if (!stripeEnabled(svc.env)) return Response.json({ error: "payments disabled" }, { status: 404 });
  const payload = await req.text();
  try {
    const type = await handleStripeWebhook(svc, svc.env, payload, req.headers.get("stripe-signature") ?? "");
    return Response.json({ received: type });
  } catch (err) {
    if (err instanceof DomainError) return Response.json({ error: err.message }, { status: 400 });
    logger.error("stripe webhook failed", { error: (err as Error).message });
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}

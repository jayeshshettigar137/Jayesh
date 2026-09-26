import { DomainError, logger, newId, type Env } from "@relayos/shared";
import Stripe from "stripe";
import { PRODUCTS, type ProductKey } from "./catalog";
import type { RelayServices } from "./services";

const log = logger.child({ component: "billing" });

/** Products sold through public checkout pages, with their Stripe price env var. */
export const CHECKOUT_PRODUCTS: Partial<Record<ProductKey, keyof Env>> = {
  followup_kit: "STRIPE_PRICE_FOLLOWUP_KIT",
  relayops_setup: "STRIPE_PRICE_RELAYOPS_SETUP",
};

export function stripeEnabled(env: Env): boolean {
  return env.FEATURE_STRIPE && Boolean(env.STRIPE_SECRET_KEY);
}

export function stripeClient(env: Env): Stripe {
  if (!stripeEnabled(env)) throw new DomainError("payments are not enabled yet", "feature_disabled");
  return new Stripe(env.STRIPE_SECRET_KEY!);
}

export function priceIdsFromEnv(env: Env): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(CHECKOUT_PRODUCTS).map(([product, key]) => [product, env[key as keyof Env] as string | undefined]));
}

/**
 * Start a Stripe Checkout for a catalog product. The buyer initiates it; the price comes from
 * Stripe (configured by a human), never from request input.
 */
export async function createCheckout(env: Env, product: ProductKey, stripe = stripeClient(env)): Promise<string> {
  const priceKey = CHECKOUT_PRODUCTS[product];
  const price = priceKey ? (env[priceKey] as string | undefined) : undefined;
  if (!price) throw new DomainError(`${PRODUCTS[product].name} is not available for purchase yet`, "feature_disabled");
  const base = env.APP_BASE_URL.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    metadata: { product },
    success_url: `${base}/kit?purchase=success`,
    cancel_url: `${base}/kit?purchase=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Verify and record a Stripe webhook. Returns the event type; throws on a bad signature. */
export async function handleStripeWebhook(
  svc: RelayServices, env: Env, payload: string, signature: string, stripe = stripeClient(env),
): Promise<string> {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new DomainError("STRIPE_WEBHOOK_SECRET is not configured", "feature_disabled");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new DomainError("invalid Stripe signature", "invalid_signature");
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    const product = s.metadata?.product ?? "unknown";
    // Upsert by session id: Stripe retries webhooks, and both events can arrive for one session.
    await svc.db.system((tx) => tx.exec(
      `INSERT INTO orders (id, product, stripe_session_id, customer_email, amount_cents, currency, status, livemode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (stripe_session_id) DO UPDATE SET status = EXCLUDED.status`,
      [newId(), product, s.id, s.customer_details?.email ?? "", s.amount_total ?? 0, s.currency ?? "usd",
       s.payment_status, event.livemode]));
    log.info("order recorded", { product, session: s.id, status: s.payment_status, livemode: event.livemode });
  }
  return event.type;
}

/** Collected revenue from recorded orders (PRD north star: cash collected, not promised). */
export async function collectedRevenue(svc: RelayServices): Promise<{ product: string; orders: number; cents: number }[]> {
  return svc.db.system((tx) => tx.rows(
    `SELECT product, count(*)::int AS orders, sum(amount_cents)::int AS cents FROM orders
     WHERE status = 'paid' AND livemode GROUP BY product ORDER BY product`));
}

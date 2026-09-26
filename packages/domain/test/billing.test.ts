import { loadEnv } from "@relayos/shared";
import { StripePaymentsAdapter } from "@relayos/tools";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { testDb } from "../../../tests/setup/db";
import { testServices } from "../../../tests/setup/services";
import { createCheckout, handleStripeWebhook, stripeEnabled } from "../src/index";

const secret = "whsec_test_secret";
const stripeEnv = () => loadEnv({
  ...process.env, FEATURE_STRIPE: "true", STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: secret,
  STRIPE_PRICE_FOLLOWUP_KIT: "price_test_kit",
});
const stripe = new Stripe("sk_test_dummy");

function signed(event: object) {
  const payload = JSON.stringify(event);
  return { payload, header: stripe.webhooks.generateTestHeaderString({ payload, secret }) };
}

describe("billing behind a feature flag", () => {
  it("is off by default and refuses checkout", async () => {
    const env = loadEnv();
    expect(stripeEnabled(env)).toBe(false);
    await expect(createCheckout(env, "followup_kit")).rejects.toThrow(/not enabled/);
  });

  it("refuses products with no configured price", async () => {
    await expect(createCheckout(stripeEnv(), "automation_pack", stripe)).rejects.toThrow(/not available/);
  });

  it("creates checkout sessions from the configured price, never from input", async () => {
    let params: Stripe.Checkout.SessionCreateParams | undefined;
    const fake = { checkout: { sessions: { create: async (p: Stripe.Checkout.SessionCreateParams) => {
      params = p;
      return { url: "https://checkout.stripe.test/s/1" };
    } } } } as unknown as Stripe;
    expect(await createCheckout(stripeEnv(), "followup_kit", fake)).toBe("https://checkout.stripe.test/s/1");
    expect(params?.line_items).toEqual([{ price: "price_test_kit", quantity: 1 }]);
    expect(params?.mode).toBe("payment");
  });

  it("verifies webhook signatures and records orders idempotently", async () => {
    const svc = testServices();
    const sessionId = `cs_test_${Date.now()}`;
    const event = {
      id: "evt_1", object: "event", type: "checkout.session.completed", livemode: false, created: 1, api_version: null,
      data: { object: { id: sessionId, object: "checkout.session", amount_total: 4900, currency: "usd",
        payment_status: "paid", metadata: { product: "followup_kit" }, customer_details: { email: "buyer@example.com" } } },
    };
    const { payload, header } = signed(event);
    await expect(handleStripeWebhook(svc, stripeEnv(), payload, "t=1,v1=forged", stripe)).rejects.toThrow(/signature/);
    await expect(handleStripeWebhook(svc, stripeEnv(), payload.replace("4900", "1"), header, stripe)).rejects.toThrow(/signature/);
    expect(await handleStripeWebhook(svc, stripeEnv(), payload, header, stripe)).toBe("checkout.session.completed");
    await handleStripeWebhook(svc, stripeEnv(), payload, header, stripe); // Stripe retries
    const orders = await testDb().system((tx) =>
      tx.rows<{ amount_cents: number; livemode: boolean }>("SELECT * FROM orders WHERE stripe_session_id = $1", [sessionId]));
    expect(orders).toEqual([expect.objectContaining({ amount_cents: 4900, livemode: false, product: "followup_kit" })]);
  });

  it("payment links use the catalog price id and an idempotency key", async () => {
    const calls: unknown[] = [];
    const fake = { paymentLinks: { create: async (p: unknown, o: unknown) => {
      calls.push([p, o]);
      return { id: "plink_1", url: "https://buy.stripe.test/1", livemode: false };
    } } } as unknown as Stripe;
    const adapter = new StripePaymentsAdapter(fake, { followup_kit: "price_test_kit" });
    await adapter.createPaymentLink({ product: "followup_kit", amountCents: 4900, description: "Kit", idempotencyKey: "tc_1" });
    expect(calls[0]).toEqual([
      { line_items: [{ price: "price_test_kit", quantity: 1 }], metadata: { product: "followup_kit" } },
      { idempotencyKey: "tc_1" },
    ]);
    await expect(adapter.createPaymentLink({ product: "relayops_setup", amountCents: 1, description: "x", idempotencyKey: "k" }))
      .rejects.toThrow(/no Stripe price/);
  });
});

import type Stripe from "stripe";
import type { PaymentLinkRequest, PaymentsAdapter } from "./adapters";

/**
 * Stripe Payment Links. Only constructed when FEATURE_STRIPE=true; env validation refuses live keys
 * unless ALLOW_LIVE_PAYMENTS=true. Prices are Stripe Price IDs configured per catalog product.
 */
export class StripePaymentsAdapter implements PaymentsAdapter {
  readonly name = "stripe";

  constructor(
    private readonly stripe: Stripe,
    private readonly priceIds: Record<string, string | undefined>,
  ) {}

  async createPaymentLink(req: PaymentLinkRequest) {
    const price = req.priceId ?? this.priceIds[req.product];
    if (!price) throw new Error(`no Stripe price configured for ${req.product}`);
    const link = await this.stripe.paymentLinks.create(
      { line_items: [{ price, quantity: 1 }], metadata: { product: req.product } },
      { idempotencyKey: req.idempotencyKey },
    );
    return { id: link.id, url: link.url, livemode: link.livemode };
  }
}

/**
 * Prices live in code and Stripe, never in agent output. Changing them is a pricing-logic change
 * and needs human review (PRD §6).
 */
export const PRODUCTS = {
  followup_kit: { name: "Home-Service Follow-Up Kit", amountCents: 4900, line: "relaylab" },
  automation_pack: { name: "AI Office Automation Pack", amountCents: 9900, line: "relaylab" },
  relayops_setup: { name: "RelayOps Lead Follow-Up Setup", amountCents: 150000, line: "relayops" },
  relayflow_monthly: { name: "RelayFlow (monthly)", amountCents: 9900, line: "relayflow" },
} as const;
export type ProductKey = keyof typeof PRODUCTS;
export const PRODUCT_KEYS = Object.keys(PRODUCTS) as [ProductKey, ...ProductKey[]];

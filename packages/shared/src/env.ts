import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["local", "staging", "pilot", "production"]).default("local"),
    APP_BASE_URL: z.url().default("http://localhost:3000"),
    APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
    DATABASE_URL: z.string().startsWith("postgres"),
    DATABASE_ADMIN_URL: z.string().startsWith("postgres").optional(),
    LLM_PROVIDER: z.enum(["mock", "anthropic"]).default("mock"),
    LLM_MODEL: z.string().default("claude-opus-5-5"),
    ANTHROPIC_API_KEY: z.string().optional(),
    EMAIL_PROVIDER: z.enum(["mock"]).default("mock"),
    EMAIL_FROM: z.string().default("RelayFlow <no-reply@example.test>"),
    FEATURE_STRIPE: bool,
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_FOLLOWUP_KIT: z.string().optional(),
    STRIPE_PRICE_RELAYOPS_SETUP: z.string().optional(),
    ALLOW_LIVE_PAYMENTS: bool,
    /** Slug of RelayOS's own workspace; the landing page's audit form posts leads there. */
    SALES_FORM_SLUG: z.string().regex(/^[a-z0-9-]+$/).optional(),
    AGENT_DAILY_SPEND_LIMIT_USD: z.coerce.number().nonnegative().default(5),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "required when LLM_PROVIDER=anthropic" });
    }
    if (env.FEATURE_STRIPE) {
      if (!env.STRIPE_SECRET_KEY) {
        ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "required when FEATURE_STRIPE=true" });
      } else if (env.STRIPE_SECRET_KEY.startsWith("sk_live_") && !env.ALLOW_LIVE_PAYMENTS) {
        ctx.addIssue({
          code: "custom",
          path: ["STRIPE_SECRET_KEY"],
          message: "live Stripe key refused: set ALLOW_LIVE_PAYMENTS=true only after human sign-off",
        });
      }
    }
    if (env.APP_ENV === "production" && env.APP_SECRET.startsWith("dev-only")) {
      ctx.addIssue({ code: "custom", path: ["APP_SECRET"], message: "placeholder secret used in production" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** Validate the environment. Error messages name variables but never echo their values. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const cleaned = Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v === "" ? undefined : v]));
  const result = EnvSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".") || "(env)"}: ${i.message}`);
    throw new Error(`Invalid environment:\n  ${problems.join("\n  ")}`);
  }
  return result.data;
}

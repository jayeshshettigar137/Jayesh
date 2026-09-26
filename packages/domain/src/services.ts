import { AnthropicProvider, MockProvider, type LlmProvider } from "@relayos/agents";
import { Db, PgQueue } from "@relayos/db";
import { type Env, type JobQueue } from "@relayos/shared";
import { StripePaymentsAdapter, ToolGateway, mockAdapters, type Adapters } from "@relayos/tools";
import { LocalAuthProvider, type AuthProvider } from "./auth";
import { priceIdsFromEnv, stripeClient, stripeEnabled } from "./billing";
import { buildToolRegistry } from "./registry";

/** Everything a request handler or worker needs, wired once per process. */
export interface RelayServices {
  db: Db;
  queue: JobQueue;
  gateway: ToolGateway;
  provider: LlmProvider;
  adapters: Adapters;
  auth: AuthProvider;
  env: Env;
  /** Signs unsubscribe links and other capability tokens. */
  secret: string;
  baseUrl: string;
}

export interface ServiceOverrides {
  db?: Db;
  queue?: JobQueue;
  provider?: LlmProvider;
  adapters?: Adapters;
}

export function createServices(env: Env, overrides: ServiceOverrides = {}): RelayServices {
  const db = overrides.db ?? Db.connect(env.DATABASE_URL);
  const adapters = overrides.adapters ?? mockAdapters();
  // Real payment links only behind the feature flag (test keys unless live payments were signed off).
  if (!overrides.adapters && stripeEnabled(env)) {
    adapters.payments = new StripePaymentsAdapter(stripeClient(env), priceIdsFromEnv(env));
  }
  const provider = overrides.provider
    ?? (env.LLM_PROVIDER === "anthropic" ? new AnthropicProvider(env.LLM_MODEL) : new MockProvider());
  const secret = env.APP_SECRET;
  const baseUrl = env.APP_BASE_URL;
  const gateway = new ToolGateway(db, buildToolRegistry({ secret, baseUrl }), adapters, {
    dailySpendLimitUsd: env.AGENT_DAILY_SPEND_LIMIT_USD,
  });
  return {
    db, adapters, provider, gateway, secret, baseUrl, env,
    queue: overrides.queue ?? new PgQueue(db),
    auth: new LocalAuthProvider(db),
  };
}

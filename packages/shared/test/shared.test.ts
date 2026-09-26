import { describe, expect, it } from "vitest";
import {
  InMemoryQueue, hashPayload, loadEnv, signToken, stableStringify, verifyToken,
} from "../src/index";

const base = { APP_SECRET: "x".repeat(32), DATABASE_URL: "postgres://u:p@h/db" };

describe("env validation", () => {
  it("accepts safe defaults", () => {
    const env = loadEnv(base);
    expect(env.LLM_PROVIDER).toBe("mock");
    expect(env.FEATURE_STRIPE).toBe(false);
    expect(env.LLM_MODEL).toBe("claude-opus-5-5");
  });

  it("requires an Anthropic key only when the anthropic provider is selected", () => {
    expect(() => loadEnv({ ...base, LLM_PROVIDER: "anthropic" })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("refuses live Stripe keys without explicit sign-off and never echoes secrets", () => {
    const secret = "sk_live_supersecretvalue";
    let message = "";
    try {
      loadEnv({ ...base, FEATURE_STRIPE: "true", STRIPE_SECRET_KEY: secret });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/live Stripe key refused/);
    expect(message).not.toContain(secret);
    expect(loadEnv({ ...base, FEATURE_STRIPE: "true", STRIPE_SECRET_KEY: "sk_test_x" }).FEATURE_STRIPE).toBe(true);
  });

  it("rejects placeholder secrets in production", () => {
    expect(() => loadEnv({ ...base, APP_ENV: "production", APP_SECRET: "dev-only-" + "x".repeat(30) })).toThrow(
      /placeholder/,
    );
  });
});

describe("crypto helpers", () => {
  it("hashes payloads independent of key order", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });

  it("signs and verifies tokens, rejecting tampering", () => {
    const token = signToken("s".repeat(32), { lead: "L1", ws: "W1" });
    expect(verifyToken("s".repeat(32), token)).toEqual({ lead: "L1", ws: "W1" });
    expect(verifyToken("t".repeat(32), token)).toBeNull();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ lead: "L2", ws: "W1" })).toString("base64url");
    expect(verifyToken("s".repeat(32), `${forged}.${sig}`)).toBeNull();
    expect(body).toBeTruthy();
  });
});

describe("InMemoryQueue", () => {
  it("mirrors the durable queue semantics", async () => {
    let now = 1_000_000;
    const q = new InMemoryQueue(() => now);
    const id = await q.enqueue("t", { x: 1 }, { idempotencyKey: "k", maxAttempts: 2 });
    expect(await q.enqueue("t", { x: 2 }, { idempotencyKey: "k" })).toBe(id);
    const job = await q.claim();
    expect(await q.claim()).toBeNull();
    expect(await q.fail(job!.id, "e")).toBe("retry");
    expect(await q.claim()).toBeNull();
    now += 10 * 60_000;
    const retry = await q.claim();
    expect(retry?.attempts).toBe(2);
    expect(await q.fail(retry!.id, "e")).toBe("dead");
  });
});

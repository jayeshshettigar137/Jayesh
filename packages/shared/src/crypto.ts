import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export const newId = (): string => randomUUID();
export const newCorrelationId = (): string => `corr_${randomUUID()}`;
export const randomToken = (bytes = 24): string => randomBytes(bytes).toString("base64url");

/** Deterministic JSON: object keys sorted recursively, so equal payloads hash equally. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
export const hashPayload = (payload: unknown): string => sha256(stableStringify(payload));

export function hmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Signed, tamper-evident token: base64url(json).signature */
export function signToken(secret: string, data: Record<string, unknown>): string {
  const body = Buffer.from(stableStringify(data)).toString("base64url");
  return `${body}.${hmac(secret, body)}`;
}

export function verifyToken<T = Record<string, unknown>>(secret: string, token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(secret, body))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

import { LEAD_INTAKE_SYSTEM, type LeadAnalysis } from "./leadIntake";
import { LlmUnavailableError, type LlmProvider, type LlmRequest, type LlmResponse } from "./provider";

type Responder = (req: LlmRequest<unknown>) => unknown;

/**
 * Deterministic, free provider for local development and tests (deployment stage 1).
 * It exercises the real prompts and output contracts; tests can script failures or
 * adversarial outputs via `nextResponse` / `failWith`.
 */
export class MockProvider implements LlmProvider {
  readonly name = "mock";
  readonly model = "mock-lead-intake-v1";
  readonly calls: LlmRequest<unknown>[] = [];
  /** Queue raw outputs to return instead of the built-in responder (to simulate a misbehaving model). */
  readonly nextResponses: unknown[] = [];
  failWith: LlmUnavailableError | null = null;

  private readonly responders = new Map<string, Responder>([[LEAD_INTAKE_SYSTEM, respondLeadIntake]]);

  async complete<T>(req: LlmRequest<T>): Promise<LlmResponse<T>> {
    this.calls.push(req as LlmRequest<unknown>);
    if (this.failWith) throw this.failWith;
    const raw = this.nextResponses.length ? this.nextResponses.shift() : this.responders.get(req.system)?.(req as LlmRequest<unknown>);
    if (raw === undefined) throw new LlmUnavailableError("mock provider has no responder for this prompt", false);
    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) throw new LlmUnavailableError("response failed the output contract", true);
    const rawText = JSON.stringify(raw);
    return {
      data: parsed.data, rawText, provider: this.name, model: this.model,
      inputTokens: Math.ceil((req.system.length + req.user.length) / 4), outputTokens: Math.ceil(rawText.length / 4),
      costUsd: 0,
    };
  }
}

function leadField(user: string, key: string): string {
  const block = user.slice(user.indexOf("<lead>"), user.indexOf("</lead>"));
  const line = block.split("\n").find((l) => l.startsWith(`${key}: `));
  const value = line ? line.slice(key.length + 2).trim() : "";
  return value === "(not provided)" ? "" : value;
}

const CHECKLISTS: Record<string, string[]> = {
  hvac: ["System type (furnace, AC, heat pump) and approximate age", "Make and model if visible",
    "When the problem started and what it's doing now", "Photos of the unit and thermostat"],
  plumbing: ["Where the problem is (fixture, room, floor)", "Is there active leaking or water damage?",
    "Photos of the affected area", "Do you know where the main water shutoff is?"],
  roofing: ["Roof material and approximate age", "Any leaks or stains inside?", "Photos from the ground",
    "Number of stories"],
  electrical: ["What isn't working (outlets, breaker, panel, fixture)?", "Panel brand and size if known",
    "Photos of the panel", "Any burning smell or sparking? If so, call 911 first"],
  cleaning: ["Square footage and number of rooms", "One-time or recurring", "Pets or special surfaces",
    "Preferred day of the week"],
  remodeling: ["Rooms and scope of work", "Budget range you have in mind", "Desired start window",
    "Photos or inspiration images"],
  other: ["Service address", "Description of the job", "Photos of the area", "Preferred visit windows"],
};

const CATEGORY_WORDS: [LeadAnalysis["category"], RegExp][] = [
  ["hvac", /\b(hvac|a\/?c|air condition\w*|furnace|heat pump|thermostat|no heat|cooling|heating)\b/i],
  ["plumbing", /\b(plumb\w*|leak\w*|pipe|drain|toilet|faucet|water heater|clog\w*|sewer)\b/i],
  ["roofing", /\b(roof\w*|shingle\w*|gutter\w*)\b/i],
  ["electrical", /\b(electric\w*|outlets?|breakers?|panels?|wiring|circuits?)\b/i],
  ["cleaning", /\b(clean\w*|maid|janitor\w*)\b/i],
  ["remodeling", /\b(remodel\w*|renovat\w*|kitchen|bathroom)\b/i],
];
const EMERGENCY = /\b(emergency|urgent|asap|flood\w*|burst|no heat|no (ac|air)|sparking|smoke|gas smell)\b/i;
const INJECTION = /\b(ignore (all |any )?(previous|prior|above)|system prompt|disregard|send (this|it) to|discount)\b/i;

function respondLeadIntake(req: LlmRequest<unknown>): LeadAnalysis {
  const name = leadField(req.user, "name");
  const service = leadField(req.user, "service");
  const message = leadField(req.user, "message");
  const business = /name: (.*)/.exec(req.user.slice(req.user.indexOf("<business>")))?.[1]?.trim() ?? "our team";
  const text = `${service} ${message}`;
  const category = CATEGORY_WORDS.find(([, re]) => re.test(text))?.[0] ?? "other";
  const urgency = EMERGENCY.test(text) ? "emergency" : "unknown";
  const checklist = [...(CHECKLISTS[category] ?? CHECKLISTS.other!)];
  if (!leadField(req.user, "address")) checklist.unshift("Service address");
  const first = name.split(/\s+/)[0] || "there";
  const job = service || "your request";
  const snippet = message.length > 160 ? `${message.slice(0, 160)}…` : message;
  return {
    category,
    urgency,
    summary: `${name || "A new lead"} asked about ${job}.${snippet ? ` They wrote: "${snippet}"` : ""}` +
      (urgency === "emergency" ? " Possible emergency - review first." : ""),
    checklist: checklist.slice(0, 7),
    email_subject: `We received your ${service || "service"} request`,
    email_body:
      `Hi ${first},\n\nThanks for contacting ${business} about ${job}. We received your request and ` +
      `someone on our team is reviewing it.\n\nTo prepare an accurate quote, could you reply with:\n` +
      checklist.slice(0, 3).map((c) => `- ${c}`).join("\n") +
      `\n\nPlease also share a few times that work for a visit or call.\n\nThank you,\n${business}`,
    suspicious_instructions: INJECTION.test(text),
  };
}

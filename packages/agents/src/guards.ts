/**
 * Deterministic checks on agent drafts. Flags block approval until a human explicitly
 * acknowledges them, so a model mistake or an injected instruction can't slip through silently.
 */
export type DraftFlag =
  | "price_commitment"
  | "schedule_commitment"
  | "unsupported_contact_detail"
  | "unsupported_link"
  | "unsupported_claim"
  | "suspicious_input";

const PRICE = /\$\s?\d|\b\d+\s?(dollars|usd)\b|\b\d+\s?%\s?off\b|\bfree (of charge|estimate|quote|inspection|service)\b|\bdiscount/i;
const SCHEDULE = /\b(today|tonight|tomorrow|within \d+ (minutes?|hours?|days?)|guarantee[ds]?|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const URL = /\bhttps?:\/\/[^\s)]+|\bwww\.[^\s)]+/gi;
const CLAIMS = /\b(licensed|insured|bonded|certified|warrant(y|ies)|award[- ]winning|\d+\+? years|five[- ]star|5[- ]star|#1|best in)\b/gi;
const INJECTION = /\b(ignore (all |any )?(previous|prior|above) (instructions|rules)|system prompt|you are now|disregard .{0,20}instructions|send (this|it|the email) to|bcc|forward (this|to))\b/i;

const digits = (s: string) => s.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

export interface DraftCheckInput {
  subject: string;
  body: string;
  /** Text the draft may legitimately draw facts from: the lead, business profile, approved facts. */
  allowedSources: string[];
  leadText: string;
}

export function checkDraft(input: DraftCheckInput): DraftFlag[] {
  const text = `${input.subject}\n${input.body}`;
  const sources = input.allowedSources.join("\n");
  const sourceLower = sources.toLowerCase();
  const sourceDigits = new Set((sources.match(PHONE) ?? []).map(digits));
  const flags = new Set<DraftFlag>();

  if (PRICE.test(text)) flags.add("price_commitment");
  if (SCHEDULE.test(text)) flags.add("schedule_commitment");
  for (const phone of text.match(PHONE) ?? []) if (!sourceDigits.has(digits(phone))) flags.add("unsupported_contact_detail");
  for (const email of text.match(EMAIL) ?? []) if (!sourceLower.includes(email.toLowerCase())) flags.add("unsupported_contact_detail");
  // Links are never copied from the lead (it is untrusted); they must come from business facts.
  const businessOnly = input.allowedSources.filter((s) => s !== input.leadText).join("\n").toLowerCase();
  for (const url of text.match(URL) ?? []) if (!businessOnly.includes(url.toLowerCase())) flags.add("unsupported_link");
  for (const claim of text.match(CLAIMS) ?? []) if (!sourceLower.includes(claim.toLowerCase())) flags.add("unsupported_claim");
  if (INJECTION.test(input.leadText)) flags.add("suspicious_input");
  return [...flags].sort();
}

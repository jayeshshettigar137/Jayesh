import { BusinessLine, RiskLevel } from "@relayos/shared";
import { z } from "zod";

/** TRD §6 task contract. Every task has an owner, input, output schema, deadline, and audit record. */
export const TaskSpec = z.object({
  task_type: z.string().min(1).max(100),
  objective: z.string().min(1).max(2000),
  business_line: BusinessLine,
  risk_level: RiskLevel,
  inputs: z.record(z.string(), z.unknown()),
  expected_output_schema: z.record(z.string(), z.unknown()),
  success_metric: z.string().min(1).max(500),
  deadline: z.iso.datetime({ offset: true }),
  requires_approval: z.boolean(),
  max_cost_usd: z.number().nonnegative().max(1000),
});
export type TaskSpec = z.infer<typeof TaskSpec>;

export const TASK_STATUSES = [
  "idea", "validated", "planned", "queued", "running", "review", "approved", "executed", "measured", "improved",
  "rejected", "retry", "escalated",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Allowed lifecycle transitions (TRD §6). */
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  idea: ["validated", "rejected"],
  validated: ["planned", "rejected"],
  planned: ["queued", "rejected"],
  queued: ["running", "escalated"],
  running: ["review", "retry", "escalated"],
  review: ["approved", "rejected", "retry"],
  approved: ["executed", "escalated"],
  executed: ["measured"],
  measured: ["improved"],
  improved: [],
  rejected: [],
  retry: ["queued", "escalated"],
  escalated: ["queued", "rejected"],
};

export const LEAD_STATUSES = ["new", "contacted", "quoted", "booked", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const text = (max: number) => z.string().trim().max(max).default("");

/** Inbound lead payload (web form, webhook, manual entry, CSV). */
export const LeadInput = z
  .object({
    name: text(200),
    email: z.string().trim().toLowerCase().max(320).default("")
      .refine((v) => v === "" || z.email().safeParse(v).success, "invalid email"),
    phone: text(50),
    address: text(500),
    service: text(200),
    message: text(5000),
    source: text(100),
  })
  .refine((l) => l.email !== "" || l.phone !== "", { message: "a lead needs an email or a phone number" });
export type LeadInput = z.infer<typeof LeadInput>;

export const LeadCategory = z.enum(["hvac", "plumbing", "roofing", "electrical", "cleaning", "remodeling", "other"]);
export const Urgency = z.enum(["emergency", "soon", "flexible", "unknown"]);

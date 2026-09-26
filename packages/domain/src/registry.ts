import { weeklyMetrics } from "@relayos/analytics";
import { recordAudit, type Tx } from "@relayos/db";
import type { ToolPolicy } from "@relayos/policy";
import { ToolRegistry, type ToolExecContext } from "@relayos/tools";
import { z } from "zod";
import { PRODUCTS, PRODUCT_KEYS } from "./catalog";
import { TaskSpec } from "./contracts";
import { addLeadEvent, unsubscribeUrl } from "./leads";
import { createTask } from "./tasks";

const policy = (p: Omit<ToolPolicy, "rateLimit" | "estimatedCostUsd"> & Partial<ToolPolicy>): ToolPolicy => ({
  rateLimit: { max: 500, windowSeconds: 3600 }, estimatedCostUsd: 0, ...p,
});

const uuid = z.uuid();

/** Run a tool body inside the caller's workspace (RLS-scoped). */
const inWs = <T>(ctx: ToolExecContext, fn: (tx: Tx) => Promise<T>) => ctx.db.withWorkspace(ctx.workspaceId, fn);

export const unsubscribeFooter = (url: string) =>
  `\n\n--\nDon't want more emails about this request? Unsubscribe: ${url}`;

/** The concrete RelayOS tools (TRD §7 initial set, plus send_email and deploy_production). */
export function buildToolRegistry(opts: { secret: string; baseUrl: string }): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    policy: policy({ name: "read_crm", category: "read", risk: "low", dataClass: "customer_pii" }),
    description: "Read leads in this workspace.",
    input: z.object({ lead_id: uuid.optional(), limit: z.number().int().min(1).max(100).default(20) }),
    execute: (ctx, i) => inWs(ctx, async (tx) => ({
      output: await tx.rows(
        `SELECT id, name, email, phone, service, message, status, summary, created_at FROM leads
         WHERE ($1::uuid IS NULL OR id = $1) ORDER BY created_at DESC LIMIT $2`, [i.lead_id ?? null, i.limit]),
    })),
  });

  registry.register({
    policy: policy({ name: "write_crm_draft", category: "internal_write", risk: "low", dataClass: "customer_pii" }),
    description: "Store the agent's lead summary, classification, and quote checklist.",
    input: z.object({
      lead_id: uuid, summary: z.string().min(1).max(600), checklist: z.array(z.string().max(200)).max(8),
      category: z.string().max(40), urgency: z.string().max(20),
    }),
    subject: (i) => ({ type: "lead", id: i.lead_id }),
    execute: (ctx, i) => inWs(ctx, async (tx) => {
      const n = await tx.exec(
        `UPDATE leads SET summary = $2, checklist = $3, category = $4, urgency = $5, updated_at = now() WHERE id = $1`,
        [i.lead_id, i.summary, JSON.stringify(i.checklist), i.category, i.urgency]);
      if (!n) throw new Error("lead not found");
      await addLeadEvent(tx, ctx, i.lead_id, "agent.summarized", { category: i.category, urgency: i.urgency });
      return { output: { lead_id: i.lead_id } };
    }),
  });

  registry.register({
    policy: policy({ name: "draft_email", category: "draft", risk: "low", dataClass: "customer_pii" }),
    description: "Create an email draft to a lead. The recipient is always the lead's own address.",
    input: z.object({
      lead_id: uuid, subject: z.string().min(1).max(200), body: z.string().min(1).max(5000),
      flags: z.array(z.string()).default([]), agent_run_id: uuid.optional(),
    }),
    subject: (i) => ({ type: "lead", id: i.lead_id }),
    precheck: async (tx, i) => {
      const lead = await tx.maybeOne<{ email: string; unsubscribed_at: Date | null; status: string }>(
        "SELECT email, unsubscribed_at, status FROM leads WHERE id = $1", [i.lead_id]);
      if (!lead) return "lead not found";
      if (!lead.email) return "lead has no email address";
      if (lead.unsubscribed_at) return "lead unsubscribed";
      if (lead.status === "booked" || lead.status === "lost") return `lead is ${lead.status}`;
      return null;
    },
    execute: (ctx, i) => inWs(ctx, async (tx) => {
      const lead = await tx.one<{ email: string }>("SELECT email FROM leads WHERE id = $1", [i.lead_id]);
      const row = await tx.one<{ id: string }>(
        `INSERT INTO outbound_messages (id, workspace_id, lead_id, to_addr, subject, body, flags, created_by_type,
           created_by_id, agent_run_id, correlation_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [ctx.workspaceId, i.lead_id, lead.email, i.subject, i.body, JSON.stringify(i.flags), ctx.actor.type,
         ctx.actor.id, i.agent_run_id ?? null, ctx.correlationId]);
      await addLeadEvent(tx, ctx, i.lead_id, "draft.created", { message_id: row.id, flags: i.flags });
      return { output: { message_id: row.id, to: lead.email } };
    }),
  });

  registry.register({
    policy: policy({
      name: "send_email", category: "external_message", risk: "medium", dataClass: "customer_pii",
      rateLimit: { max: 50, windowSeconds: 3600 },
    }),
    description: "Send one approved email to one lead.",
    input: z.object({ message_id: uuid, to: z.email(), subject: z.string().min(1), body: z.string().min(1) }),
    subject: (i) => ({ type: "outbound_message", id: i.message_id }),
    preview: (i) => ({ to: i.to, subject: i.subject, body: i.body, note: "an unsubscribe footer is appended" }),
    precheck: async (tx, i) => {
      const m = await tx.maybeOne<{ to_addr: string; subject: string; body: string; status: string; email: string;
        unsubscribed_at: Date | null; lead_status: string }>(
        `SELECT m.to_addr, m.subject, m.body, m.status, l.email, l.unsubscribed_at, l.status AS lead_status
         FROM outbound_messages m JOIN leads l ON l.id = m.lead_id WHERE m.id = $1`, [i.message_id]);
      if (!m) return "message not found";
      if (m.status === "sent") return "message already sent";
      if (!["draft", "pending_approval"].includes(m.status)) return `message is ${m.status}`;
      // The recipient and content are pinned to the stored draft, so nothing (including injected
      // instructions) can redirect or alter what the approver saw.
      if (i.to !== m.to_addr || i.to !== m.email) return "recipient does not match the lead";
      if (i.subject !== m.subject || i.body !== m.body) return "content does not match the stored draft";
      if (m.unsubscribed_at) return "recipient unsubscribed";
      if (m.lead_status === "booked" || m.lead_status === "lost") return `lead is ${m.lead_status}`;
      return null;
    },
    execute: async (ctx, i) => {
      const lead = await inWs(ctx, (tx) => tx.one<{ id: string; reply_to: string }>(
        `SELECT l.id, w.reply_to FROM outbound_messages m JOIN leads l ON l.id = m.lead_id
         JOIN workspaces w ON w.id = m.workspace_id WHERE m.id = $1`, [i.message_id]));
      const { providerMessageId } = await ctx.adapters.email.send({
        to: i.to, subject: i.subject, replyTo: lead.reply_to || undefined, idempotencyKey: i.message_id,
        body: i.body + unsubscribeFooter(unsubscribeUrl(opts.baseUrl, opts.secret, ctx.workspaceId, lead.id)),
      });
      await inWs(ctx, async (tx) => {
        await tx.exec(
          `UPDATE outbound_messages SET status = 'sent', sent_at = now(), provider_message_id = $2, approval_id = $3,
             error = '', updated_at = now() WHERE id = $1`, [i.message_id, providerMessageId, ctx.approvalId]);
        await tx.exec(
          `UPDATE leads SET first_response_at = COALESCE(first_response_at, now()),
             status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END, updated_at = now() WHERE id = $1`,
          [lead.id]);
        await addLeadEvent(tx, ctx, lead.id, "email.sent", { message_id: i.message_id, approval_id: ctx.approvalId });
      });
      return { output: { provider_message_id: providerMessageId } };
    },
  });

  registry.register({
    policy: policy({ name: "create_task", category: "internal_write", risk: "low", dataClass: "internal" }),
    description: "Create a task following the TRD task contract.",
    input: TaskSpec,
    execute: (ctx, spec) => inWs(ctx, async (tx) => {
      const task = await createTask(tx, ctx, ctx.actor.id, spec);
      return { output: { task_id: task.id, requires_approval: task.requires_approval } };
    }),
  });

  registry.register({
    policy: policy({ name: "query_analytics", category: "read", risk: "low", dataClass: "internal" }),
    description: "Weekly workspace scorecard.",
    input: z.object({ weeks: z.number().int().min(1).max(26).default(8) }),
    execute: (ctx, i) => inWs(ctx, async (tx) => ({ output: await weeklyMetrics(tx, i.weeks) })),
  });

  const Source = z.object({ url: z.url(), retrieved_at: z.iso.datetime({ offset: true }), claim: z.string().max(300) });
  registry.register({
    policy: policy({ name: "draft_content", category: "draft", risk: "low", dataClass: "internal" }),
    description: "Draft original content. Researched claims must carry source URLs and timestamps.",
    input: z.object({
      title: z.string().min(1).max(200), body: z.string().min(1).max(20000), channel: z.string().min(1).max(40),
      cta: z.string().max(300).default(""), sources: z.array(Source).max(50).default([]),
      business_line: z.enum(["relayflow", "relayops", "relaylab"]).default("relaylab"),
    }),
    execute: (ctx, i) => inWs(ctx, async (tx) => {
      const row = await tx.one<{ id: string }>(
        `INSERT INTO content_items (id, workspace_id, business_line, channel, title, body, cta, sources,
           created_by_type, created_by_id, correlation_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [ctx.workspaceId, i.business_line, i.channel, i.title, i.body, i.cta, JSON.stringify(i.sources),
         ctx.actor.type, ctx.actor.id, ctx.correlationId]);
      return { output: { content_id: row.id } };
    }),
  });

  registry.register({
    policy: policy({ name: "publish_content_after_approval", category: "publishing", risk: "medium", dataClass: "public",
      rateLimit: { max: 20, windowSeconds: 86400 } }),
    description: "Publish an approved, source-checked content item.",
    input: z.object({ content_id: uuid, title: z.string(), body: z.string(), channel: z.string() }),
    subject: (i) => ({ type: "content_item", id: i.content_id }),
    precheck: async (tx, i) => {
      const c = await tx.maybeOne<{ title: string; body: string; channel: string; status: string; cta: string;
        originality_confirmed: boolean }>("SELECT * FROM content_items WHERE id = $1", [i.content_id]);
      if (!c) return "content not found";
      if (c.status !== "draft") return `content is ${c.status}`;
      if (c.title !== i.title || c.body !== i.body || c.channel !== i.channel) return "content changed since the request";
      if (!c.cta) return "every item needs a CTA (PRD §8)";
      if (!c.originality_confirmed) return "originality and rights review not confirmed (PRD §8)";
      return null;
    },
    execute: async (ctx, i) => {
      const { url } = await ctx.adapters.publish.publish({ id: i.content_id, channel: i.channel, title: i.title, body: i.body });
      await inWs(ctx, (tx) => tx.exec(
        "UPDATE content_items SET status = 'published', published_url = $2, published_at = now() WHERE id = $1",
        [i.content_id, url]));
      return { output: { url } };
    },
  });

  registry.register({
    policy: policy({ name: "run_tests", category: "test", risk: "low", dataClass: "internal" }),
    description: "Run a test suite.",
    input: z.object({ suite: z.string().min(1).max(100) }),
    execute: async (ctx, i) => ({ output: await ctx.adapters.tests.run(i.suite) }),
  });

  registry.register({
    policy: policy({ name: "deploy_staging", category: "deploy_staging", risk: "low", dataClass: "internal",
      rateLimit: { max: 20, windowSeconds: 3600 } }),
    description: "Deploy a git ref to staging.",
    input: z.object({ ref: z.string().regex(/^[\w./-]{1,100}$/) }),
    execute: async (ctx, i) => ({ output: await ctx.adapters.deploy.deploy("staging", i.ref) }),
  });

  registry.register({
    policy: policy({ name: "deploy_production", category: "deploy_production", risk: "high", dataClass: "internal",
      rateLimit: { max: 5, windowSeconds: 3600 } }),
    description: "Deploy a git ref to production.",
    input: z.object({ ref: z.string().regex(/^[\w./-]{1,100}$/) }),
    subject: (i) => ({ type: "deploy", id: i.ref }),
    execute: async (ctx, i) => ({ output: await ctx.adapters.deploy.deploy("production", i.ref) }),
  });

  registry.register({
    policy: policy({ name: "create_payment_link", category: "payment", risk: "medium", dataClass: "financial",
      rateLimit: { max: 20, windowSeconds: 86400 } }),
    description: "Create a payment link for a catalog product. Prices come from the catalog, never from input.",
    input: z.object({ product: z.enum(PRODUCT_KEYS), note: z.string().max(200).default("") }),
    subject: (i) => ({ type: "product", id: i.product }),
    execute: async (ctx, i) => {
      const product = PRODUCTS[i.product];
      const link = await ctx.adapters.payments.createPaymentLink({
        product: i.product, amountCents: product.amountCents, description: product.name, idempotencyKey: ctx.toolCallId,
      });
      await inWs(ctx, (tx) => recordAudit(tx, {
        actorType: ctx.actor.type, actorId: ctx.actor.id, action: "payment_link.created", entityType: "product",
        entityId: i.product, approvalId: ctx.approvalId, correlationId: ctx.correlationId,
        data: { link_id: link.id, livemode: link.livemode, amount_cents: product.amountCents },
      }));
      return { output: link };
    },
  });

  return registry;
}

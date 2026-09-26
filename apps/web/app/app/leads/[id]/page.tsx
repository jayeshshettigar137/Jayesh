import { LEAD_STATUSES, getLead } from "@relayos/domain";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Flash, Pill, btnSecondaryCls, flashFrom, inputCls, type SearchParams } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { services } from "@/lib/services";
import { requireSession } from "@/lib/session";
import { statusAction } from "../../actions";

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const flash = await flashFrom(searchParams);
  const data = await services().db.withWorkspace(session.workspaceId, async (tx) => {
    const lead = await getLead(tx, id).catch(() => null);
    if (!lead) return null;
    const events = await tx.rows<{ id: string; type: string; actor_type: string; actor_id: string; data: object; created_at: Date }>(
      "SELECT * FROM lead_events WHERE lead_id = $1 ORDER BY id DESC", [id]);
    const messages = await tx.rows<{ id: string; subject: string; status: string; sent_at: Date | null; created_at: Date; flags: string[] }>(
      "SELECT id, subject, status, sent_at, created_at, flags FROM outbound_messages WHERE lead_id = $1 ORDER BY created_at DESC", [id]);
    return { lead, events, messages };
  });
  if (!data) notFound();
  const { lead, events, messages } = data;

  return (
    <>
      <Flash {...flash} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{lead.name || lead.email || lead.phone}</h1>
        <Pill tone={lead.status}>{lead.status}</Pill>
        {lead.urgency === "emergency" && <Pill tone="flag">emergency</Pill>}
        {lead.unsubscribed_at && <Pill>unsubscribed</Pill>}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Contact">
          <dl className="space-y-1 text-sm">
            <div>{lead.email || <span className="text-stone-400">no email</span>}</div>
            <div>{lead.phone || <span className="text-stone-400">no phone</span>}</div>
            <div>{lead.address}</div>
            <div className="pt-2 text-stone-500">Source: {lead.source || "–"}</div>
            <div className="text-stone-500">Received {fmtDate(lead.created_at)}</div>
            {lead.first_response_at && <div className="text-stone-500">First response {fmtDate(lead.first_response_at)}</div>}
          </dl>
        </Card>
        <Card title="Request" className="md:col-span-2">
          <p className="font-medium">{lead.service}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{lead.message}</p>
        </Card>
        <Card title="Agent summary" className="md:col-span-2">
          {lead.summary ? (
            <>
              <p className="text-sm">{lead.summary}</p>
              <h3 className="mt-4 text-sm font-semibold">Quote-request checklist</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">{lead.checklist.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="mt-3 text-xs text-stone-500">Category: {lead.category} · Urgency: {lead.urgency}</p>
            </>
          ) : <p className="text-sm text-stone-500">The agent hasn&apos;t prepared this lead yet.</p>}
        </Card>
        <Card title="Status">
          <form action={statusAction} className="flex gap-2">
            <input type="hidden" name="lead_id" value={lead.id} />
            <select name="status" defaultValue={lead.status} className={inputCls}>
              {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className={btnSecondaryCls}>Update</button>
          </form>
          <p className="mt-2 text-xs text-stone-500">Booked or lost withdraws any unsent follow-up.</p>
        </Card>
        <Card title="Messages" className="md:col-span-3">
          {messages.length === 0 ? <p className="text-sm text-stone-500">No messages.</p> : (
            <ul className="divide-y divide-stone-100 text-sm">
              {messages.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-medium">{m.subject}</span>
                  <Pill tone={m.status === "pending_approval" ? "pending" : m.status}>{m.status.replace("_", " ")}</Pill>
                  {m.flags.map((f) => <Pill key={f} tone="flag">{f.replaceAll("_", " ")}</Pill>)}
                  <span className="ml-auto text-stone-500">{fmtDate(m.sent_at ?? m.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/approvals" className="mt-2 inline-block text-sm text-brand-700 underline">Open approval queue</Link>
        </Card>
        <Card title="History" className="md:col-span-3">
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-2">
                <span className="w-48 shrink-0 text-stone-500">{fmtDate(e.created_at)}</span>
                <span className="font-medium">{e.type}</span>
                <span className="text-stone-500">by {e.actor_type}:{e.actor_id}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

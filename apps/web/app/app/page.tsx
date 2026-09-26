import { pipelineCounts } from "@relayos/analytics";
import { listLeads } from "@relayos/domain";
import Link from "next/link";
import { Card, Flash, Pill, Stat, btnCls, flashFrom, inputCls, labelCls, type SearchParams } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { services } from "@/lib/services";
import { requireSession } from "@/lib/session";
import { addLeadAction } from "./actions";

export const metadata = { title: "Leads" };

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const flash = await flashFrom(searchParams);
  const { counts, leads } = await services().db.withWorkspace(session.workspaceId, async (tx) => ({
    counts: await pipelineCounts(tx),
    leads: await listLeads(tx),
  }));
  return (
    <>
      <Flash {...flash} />
      <h1 className="mb-4 text-xl font-semibold">Leads</h1>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total leads" value={counts.total} />
        <Stat label="Awaiting first response" value={counts.awaiting_first_response} />
        <Stat label={<Link className="underline" href="/app/approvals">Awaiting your approval</Link>} value={counts.approvals_pending} />
        <Stat label="Booked jobs" value={counts.by_status.booked ?? 0} />
      </div>
      <Card className="mb-6">
        {leads.length === 0 ? (
          <p className="text-sm text-stone-500">
            No leads yet. Share your quote form or connect the webhook from <Link className="underline" href="/app/settings">Settings</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
                <tr><th className="py-2 pr-3">Lead</th><th className="pr-3">Service</th><th className="pr-3">Status</th><th className="pr-3">Next action</th><th>Received</th></tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100 align-top">
                    <td className="py-2 pr-3">
                      <Link href={`/app/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">{l.name || l.email || l.phone}</Link>
                      {l.urgency === "emergency" && <span className="ml-2"><Pill tone="flag">emergency</Pill></span>}
                    </td>
                    <td className="pr-3">{l.service}</td>
                    <td className="pr-3"><Pill tone={l.status}>{l.status}</Pill></td>
                    <td className="pr-3">
                      {l.pending_approval_id ? <Link className="text-amber-700 underline" href="/app/approvals">{l.next_action}</Link> : l.next_action}
                    </td>
                    <td className="whitespace-nowrap text-stone-500">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <details className="rounded-xl border border-stone-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-medium">Add a lead manually (phone call, walk-in)</summary>
        <form action={addLeadAction} className="grid gap-x-4 md:grid-cols-2">
          {(["name", "email", "phone", "address", "service"] as const).map((f) => (
            <label key={f}><span className={labelCls}>{f}</span><input name={f} className={inputCls} /></label>
          ))}
          <label><span className={labelCls}>source</span><input name="source" defaultValue="phone" className={inputCls} /></label>
          <label className="md:col-span-2"><span className={labelCls}>notes</span><textarea name="message" rows={3} className={inputCls} /></label>
          <div className="mt-4"><button className={btnCls}>Add lead</button></div>
        </form>
      </details>
    </>
  );
}

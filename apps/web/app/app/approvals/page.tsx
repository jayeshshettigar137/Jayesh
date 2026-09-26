import { approvalQueue } from "@relayos/domain";
import Link from "next/link";
import { Card, Flash, Pill, btnCls, btnDangerCls, btnSecondaryCls, flashFrom, inputCls, labelCls, type SearchParams } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { services } from "@/lib/services";
import { requireSession } from "@/lib/session";
import { approveAction, editAction, rejectAction, runAgentAction } from "../actions";

export const metadata = { title: "Approvals" };

const FLAG_HELP: Record<string, string> = {
  price_commitment: "mentions a price, discount, or free offer",
  schedule_commitment: "promises a time or makes a guarantee",
  unsupported_contact_detail: "contains a phone or email not in your profile or the lead",
  unsupported_link: "contains a link not in your business facts",
  unsupported_claim: "claims credentials or reviews not in your approved facts",
  suspicious_input: "the lead's message looks like it contains instructions to the AI",
};

export default async function Approvals({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const flash = await flashFrom(searchParams);
  const items = await services().db.withWorkspace(session.workspaceId, approvalQueue);
  return (
    <>
      <Flash {...flash} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Approval queue</h1>
        <form action={runAgentAction}><button className={btnSecondaryCls}>Run agent now</button></form>
      </div>
      <p className="mb-4 text-sm text-stone-600">Nothing reaches a customer until someone on your team approves it here.</p>
      {items.length === 0 && <Card><p className="text-sm text-stone-500">Nothing waiting for approval.</p></Card>}
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.approval_id}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              {item.lead_id ? <Link className="font-medium text-brand-700 underline" href={`/app/leads/${item.lead_id}`}>{item.lead_name || "Lead"}</Link>
                : <span className="font-medium">{item.tool}</span>}
              {item.to_addr && <span className="text-stone-500">to {item.to_addr}</span>}
              <Pill tone={item.status === "pending" ? "pending" : "approved"}>{item.status === "approved" ? "approved - not yet sent" : "pending"}</Pill>
              {item.flags.map((f) => <Pill key={f} tone="flag">{f.replaceAll("_", " ")}</Pill>)}
              <span className="ml-auto text-stone-500">requested by {item.requested_by_id} · {fmtDate(item.created_at)}</span>
            </div>
            {item.message_id ? (
              <>
                {item.status === "pending" ? (
                  <form action={editAction}>
                    <input type="hidden" name="approval_id" value={item.approval_id} />
                    <label><span className={labelCls}>Subject</span><input name="subject" defaultValue={item.subject ?? ""} className={inputCls} /></label>
                    <label><span className={labelCls}>Message</span><textarea name="body" rows={9} defaultValue={item.body ?? ""} className={inputCls} /></label>
                    <p className="mt-1 text-xs text-stone-500">An unsubscribe link is added at the bottom when sent.</p>
                    <button className={`${btnSecondaryCls} mt-2`}>Save edits</button>
                  </form>
                ) : (
                  <div className="rounded-md bg-stone-50 p-3 text-sm"><p className="font-medium">{item.subject}</p><p className="mt-2 whitespace-pre-wrap">{item.body}</p></div>
                )}
                {item.flags.length > 0 && (
                  <ul className="mt-3 list-disc pl-5 text-sm text-red-700">
                    {item.flags.map((f) => <li key={f}>{FLAG_HELP[f] ?? f}</li>)}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <form action={approveAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="approval_id" value={item.approval_id} />
                    {item.flags.length > 0 && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="ack" value="1" required /> I reviewed the flagged content and it&apos;s OK to send
                      </label>
                    )}
                    <button className={btnCls}>{item.status === "approved" ? "Retry send" : "Approve & send"}</button>
                  </form>
                  {item.status === "pending" && (
                    <form action={rejectAction}>
                      <input type="hidden" name="approval_id" value={item.approval_id} />
                      <button className={btnDangerCls}>Reject</button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <pre className="overflow-x-auto rounded bg-stone-50 p-3 text-xs">{JSON.stringify(item.payload, null, 2)}</pre>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

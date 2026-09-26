import { listAudit } from "@relayos/db";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { services } from "@/lib/services";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Audit log" };

export default async function Audit() {
  const session = await requireSession();
  const rows = await services().db.withWorkspace(session.workspaceId, (tx) => listAudit(tx, { limit: 300 }));
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Audit log</h1>
      <p className="mb-4 text-sm text-stone-600">Every agent, user, webhook, and system action in this workspace (latest 300). Entries can&apos;t be edited or deleted.</p>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left uppercase tracking-wide text-stone-500">
              <tr><th className="py-2 pr-3">When</th><th className="pr-3">Actor</th><th className="pr-3">Action</th><th className="pr-3">Entity</th><th className="pr-3">Correlation</th><th>Details</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-stone-500">{fmtDate(r.created_at)}</td>
                  <td className="pr-3 whitespace-nowrap">{r.actor_type}:{r.actor_id.slice(0, 24)}</td>
                  <td className="pr-3 font-medium whitespace-nowrap">{r.action}</td>
                  <td className="pr-3 whitespace-nowrap">{r.entity_type}{r.entity_id ? ` ${r.entity_id.slice(0, 8)}` : ""}</td>
                  <td className="pr-3 font-mono text-stone-500">{r.correlation_id.slice(5, 13)}</td>
                  <td className="font-mono break-all text-stone-600">{JSON.stringify(r.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

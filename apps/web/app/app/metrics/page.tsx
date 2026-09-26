import { weeklyMetrics } from "@relayos/analytics";
import { Card } from "@/components/ui";
import { fmtMinutes, fmtUsd } from "@/lib/format";
import { services } from "@/lib/services";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Weekly metrics" };

export default async function Metrics() {
  const session = await requireSession();
  const weeks = await services().db.withWorkspace(session.workspaceId, (tx) => weeklyMetrics(tx, 8));
  const cols: [string, (w: (typeof weeks)[number]) => React.ReactNode][] = [
    ["Leads", (w) => w.leads],
    ["Responded", (w) => w.responded],
    ["Median first response", (w) => fmtMinutes(w.median_first_response_minutes)],
    ["Booked", (w) => w.booked],
    ["Lost", (w) => w.lost],
    ["Emails sent", (w) => w.messages_sent],
    ["Agent runs (ok / total)", (w) => `${w.agent_runs_succeeded} / ${w.agent_runs}`],
    ["Agent cost", (w) => fmtUsd(w.agent_cost_usd)],
    ["Cost per successful run", (w) => fmtUsd(w.cost_per_successful_run_usd)],
  ];
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Weekly metrics</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="py-2 pr-4">Week of</th>{cols.map(([h]) => <th key={h} className="pr-4">{h}</th>)}</tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week_start} className="border-t border-stone-100">
                  <td className="py-2 pr-4 whitespace-nowrap">{w.week_start}</td>
                  {cols.map(([h, f]) => <td key={h} className="pr-4">{f(w)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone-500">Weeks start Monday (UTC). Booked counts jobs marked booked that week.</p>
      </Card>
    </>
  );
}

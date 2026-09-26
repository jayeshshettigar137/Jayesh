import type { Tx } from "@relayos/db";

export interface WeekMetrics {
  week_start: string;
  leads: number;
  responded: number;
  median_first_response_minutes: number | null;
  booked: number;
  lost: number;
  messages_sent: number;
  approvals_pending: number;
  agent_runs: number;
  agent_runs_succeeded: number;
  agent_cost_usd: number;
  cost_per_successful_run_usd: number | null;
}

/**
 * Weekly scorecard for one workspace (PRD §5), newest week first. Runs inside a workspace
 * transaction, so RLS scopes every subquery.
 */
export async function weeklyMetrics(tx: Tx, weeks = 8): Promise<WeekMetrics[]> {
  const rows = await tx.rows<Record<string, string | number | null>>(
    `WITH w AS (
       SELECT generate_series(date_trunc('week', now()) - make_interval(weeks => $1 - 1),
                              date_trunc('week', now()), interval '1 week') AS week_start
     )
     SELECT to_char(w.week_start, 'YYYY-MM-DD') AS week_start,
       (SELECT count(*) FROM leads l WHERE date_trunc('week', l.created_at) = w.week_start)::int AS leads,
       (SELECT count(*) FROM leads l WHERE date_trunc('week', l.created_at) = w.week_start
          AND l.first_response_at IS NOT NULL)::int AS responded,
       (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM l.first_response_at - l.created_at) / 60)
          FROM leads l WHERE date_trunc('week', l.created_at) = w.week_start
          AND l.first_response_at IS NOT NULL) AS median_first_response_minutes,
       (SELECT count(*) FROM leads l WHERE date_trunc('week', l.booked_at) = w.week_start)::int AS booked,
       (SELECT count(*) FROM lead_events e WHERE e.type = 'status.lost'
          AND date_trunc('week', e.created_at) = w.week_start)::int AS lost,
       (SELECT count(*) FROM outbound_messages m WHERE m.status = 'sent'
          AND date_trunc('week', m.sent_at) = w.week_start)::int AS messages_sent,
       (SELECT count(*) FROM approvals a WHERE a.status = 'pending'
          AND date_trunc('week', a.created_at) = w.week_start)::int AS approvals_pending,
       (SELECT count(*) FROM agent_runs r WHERE date_trunc('week', r.started_at) = w.week_start)::int AS agent_runs,
       (SELECT count(*) FROM agent_runs r WHERE r.status = 'succeeded'
          AND date_trunc('week', r.started_at) = w.week_start)::int AS agent_runs_succeeded,
       (SELECT COALESCE(sum(r.cost_usd), 0) FROM agent_runs r
          WHERE date_trunc('week', r.started_at) = w.week_start)::float8 AS agent_cost_usd
     FROM w ORDER BY w.week_start DESC`,
    [weeks],
  );
  return rows.map((r) => {
    const succeeded = Number(r.agent_runs_succeeded);
    const cost = Number(r.agent_cost_usd);
    return {
      week_start: String(r.week_start),
      leads: Number(r.leads),
      responded: Number(r.responded),
      median_first_response_minutes: r.median_first_response_minutes === null ? null : Number(r.median_first_response_minutes),
      booked: Number(r.booked),
      lost: Number(r.lost),
      messages_sent: Number(r.messages_sent),
      approvals_pending: Number(r.approvals_pending),
      agent_runs: Number(r.agent_runs),
      agent_runs_succeeded: succeeded,
      agent_cost_usd: cost,
      cost_per_successful_run_usd: succeeded ? cost / succeeded : null,
    };
  });
}

export interface PipelineCounts {
  total: number;
  by_status: Record<string, number>;
  awaiting_first_response: number;
  approvals_pending: number;
}

export async function pipelineCounts(tx: Tx): Promise<PipelineCounts> {
  const statuses = await tx.rows<{ status: string; n: number }>(
    "SELECT status, count(*)::int AS n FROM leads GROUP BY status");
  const by_status: Record<string, number> = { new: 0, contacted: 0, quoted: 0, booked: 0, lost: 0 };
  for (const s of statuses) by_status[s.status] = s.n;
  const extra = await tx.one<{ awaiting: number; pending: number }>(
    `SELECT (SELECT count(*) FROM leads WHERE first_response_at IS NULL AND status IN ('new', 'contacted', 'quoted'))::int AS awaiting,
            (SELECT count(*) FROM approvals WHERE status = 'pending' AND expires_at > now())::int AS pending`);
  return {
    total: statuses.reduce((a, s) => a + s.n, 0),
    by_status,
    awaiting_first_response: extra.awaiting,
    approvals_pending: extra.pending,
  };
}

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "–";

export const fmtMinutes = (m: number | null) =>
  m === null ? "–" : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`;

export const fmtUsd = (n: number | null) => (n === null ? "–" : `$${n.toFixed(n < 1 ? 4 : 2)}`);

/** Build a redirect target with a flash message. */
export const withFlash = (path: string, kind: "ok" | "err", msg: string) =>
  `${path}?${new URLSearchParams({ [kind]: msg }).toString()}`;

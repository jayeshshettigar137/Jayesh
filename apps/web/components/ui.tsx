import type { ReactNode } from "react";

export function Card({ title, children, className = "" }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

const PILL: Record<string, string> = {
  new: "border-brand-600 text-brand-700",
  contacted: "border-sky-500 text-sky-700",
  quoted: "border-violet-500 text-violet-700",
  booked: "border-emerald-600 text-emerald-700",
  lost: "border-stone-400 text-stone-500",
  pending: "border-amber-500 text-amber-700",
  approved: "border-sky-500 text-sky-700",
  sent: "border-emerald-600 text-emerald-700",
  flag: "border-red-500 text-red-700",
};

export function Pill({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${PILL[tone ?? ""] ?? "border-stone-300 text-stone-600"}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-stone-500">{label}</div>
    </div>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div role="status" className={`mb-4 rounded-lg border px-4 py-2 text-sm ${err ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>
      {err ?? ok}
    </div>
  );
}

export const inputCls = "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none";
export const labelCls = "mb-1 mt-3 block text-sm text-stone-600";
export const btnCls = "inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
export const btnSecondaryCls = "inline-flex items-center rounded-md border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50";
export const btnDangerCls = "inline-flex items-center rounded-md border border-red-400 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function flashFrom(searchParams: SearchParams): Promise<{ ok?: string; err?: string }> {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return { ok: one(sp.ok), err: one(sp.err) };
}

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logoutAction } from "./actions";

const NAV = [
  ["/app", "Leads"],
  ["/app/approvals", "Approvals"],
  ["/app/metrics", "Weekly metrics"],
  ["/app/audit", "Audit log"],
  ["/app/settings", "Settings"],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/app" className="font-semibold text-brand-700">RelayFlow</Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="text-stone-700 hover:text-brand-700">{label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-stone-500">
            <span>{session.workspaceName} · {session.role}</span>
            <form action={logoutAction}><button className="underline hover:text-stone-800">Log out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

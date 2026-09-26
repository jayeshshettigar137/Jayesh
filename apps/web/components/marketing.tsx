import Link from "next/link";
import type { ReactNode } from "react";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-brand-700">RelayFlow</Link>
          <nav className="flex gap-5 text-sm text-stone-700">
            <Link href="/#how" className="hover:text-brand-700">How it works</Link>
            <Link href="/#pricing" className="hover:text-brand-700">Pricing</Link>
            <Link href="/kit" className="hover:text-brand-700">Follow-Up Kit</Link>
          </nav>
          <div className="ml-auto flex gap-3 text-sm">
            <Link href="/login" className="px-2 py-2 text-stone-700 hover:text-brand-700">Log in</Link>
            <Link href="/signup" className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Start a workspace</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        RelayFlow by RelayOS · Built for owner-operated home-service businesses
      </footer>
    </div>
  );
}

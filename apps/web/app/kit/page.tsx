import { PRODUCTS, createCheckout, stripeEnabled } from "@relayos/domain";
import { DomainError, logger } from "@relayos/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingShell } from "@/components/marketing";
import type { SearchParams } from "@/components/ui";
import { services } from "@/lib/services";

export const metadata = {
  title: "Home-Service Follow-Up Kit",
  description: "Email templates, a lead pipeline, SOPs, and a dashboard template for following up on every home-service lead.",
};

const CONTENTS = [
  ["12 follow-up email templates", "First response, missing-details request, quote sent, no-reply nudges at day 2 and day 5, and a polite close-out."],
  ["Lead pipeline sheet", "New → contacted → quoted → booked/lost, with the next action for each lead so nothing sits untouched."],
  ["Quote checklists by trade", "What to ask before quoting HVAC, plumbing, roofing, electrical, and cleaning jobs."],
  ["Office SOPs", "A one-page routine for who checks leads, when, and how fast to respond, plus a missed-call playbook."],
  ["Weekly dashboard template", "Response time, booked jobs, and win rate in a sheet you update in ten minutes."],
] as const;

async function buy() {
  "use server";
  const env = services().env;
  let target = "/kit?purchase=unavailable";
  try {
    target = await createCheckout(env, "followup_kit");
  } catch (err) {
    if (!(err instanceof DomainError)) logger.error("checkout failed", { error: (err as Error).message });
  }
  redirect(target);
}

export default async function KitPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const env = services().env;
  const canBuy = stripeEnabled(env) && Boolean(env.STRIPE_PRICE_FOLLOWUP_KIT);
  const price = PRODUCTS.followup_kit.amountCents / 100;
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">RelayLab</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Home-Service Follow-Up Kit</h1>
        <p className="mt-4 max-w-2xl text-lg text-stone-600">
          Templates and routines for following up on every lead, for owners and office managers who want a system
          before they want software. Original material, written for home-service businesses.
        </p>
        {sp.purchase === "success" && <p className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">Thanks for your purchase! We&apos;ll email your download link within one business day.</p>}
        {sp.purchase === "cancelled" && <p className="mt-6 rounded-lg border border-stone-300 bg-stone-50 p-4">Checkout cancelled. You haven&apos;t been charged.</p>}
        {sp.purchase === "unavailable" && <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">Checkout isn&apos;t available right now. Please try again later.</p>}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <span className="text-3xl font-semibold">${price}</span>
          {canBuy ? (
            <form action={buy}><button className="rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700">Buy the kit</button></form>
          ) : (
            <span className="rounded-md border border-stone-300 px-5 py-3 text-stone-500">Available soon</span>
          )}
          <span className="text-sm text-stone-500">One-time purchase · delivered by email</span>
        </div>
      </section>
      <section className="bg-stone-50 py-14">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-semibold">What&apos;s inside</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {CONTENTS.map(([title, body]) => (
              <li key={title} className="rounded-lg border border-stone-200 bg-white p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-stone-600">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-xl font-semibold">Want it running automatically?</h2>
        <p className="mt-2 text-stone-600">RelayFlow drafts these follow-ups for every new lead and waits for your approval before sending.</p>
        <Link href="/" className="mt-4 inline-block text-brand-700 underline">See how RelayFlow works</Link>
      </section>
    </MarketingShell>
  );
}

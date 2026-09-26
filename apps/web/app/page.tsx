import Link from "next/link";
import { MarketingShell } from "@/components/marketing";

export const metadata = {
  title: "Lead follow-up for HVAC companies",
  description: "RelayFlow drafts a fast, accurate reply to every HVAC lead. You approve each message before it goes out.",
};

const STEPS = [
  ["A lead comes in", "From your website form, a lead webhook, or a call you log. It lands in one list, not scattered across inboxes."],
  ["RelayFlow prepares it", "A short summary for you, the questions you still need answered to quote the job, and a reply written in your company's name."],
  ["You approve, it sends", "Edit or approve in one click. Nothing goes to a customer until someone on your team says so."],
] as const;

const GUARDRAILS = [
  "Never quotes prices or promises arrival times. Drafts that mention either are flagged before you approve.",
  "Only states facts you've approved: licensing, service area, hours. Anything else gets flagged.",
  "Treats what customers type as information, not instructions, and flags messages that look like attempts to manipulate it.",
  "Keeps a full audit log of every draft, approval, and send, and honors unsubscribe links automatically.",
];

export default function Landing() {
  // Audit requests go through RelayOS's own RelayFlow quote form (we use the product to sell the product).
  const slug = process.env.SALES_FORM_SLUG ?? "";
  const salesForm = /^[a-z0-9-]+$/.test(slug) ? slug : null;
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-4 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">For HVAC companies with 2–30 people</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Answer every heating and cooling lead fast, with you approving every message.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-stone-600">
          When the office is busy, web leads wait for hours and quotes stall on missing details. RelayFlow drafts the
          first reply and the quote checklist for each lead within minutes, so your team only has to review and click send.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700">Start a workspace</Link>
          <Link href="#setup" className="rounded-md border border-brand-600 px-5 py-3 font-medium text-brand-700 hover:bg-brand-50">Have us set it up</Link>
        </div>
      </section>

      <section id="how" className="bg-stone-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="rounded-xl border border-stone-200 bg-white p-6">
                <div className="text-sm font-semibold text-brand-600">Step {i + 1}</div>
                <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-stone-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-semibold">What it won&apos;t do</h2>
        <p className="mt-2 max-w-2xl text-stone-600">An assistant that writes to your customers needs firm limits. These are built in, not settings.</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {GUARDRAILS.map((g) => (
            <li key={g} className="rounded-lg border border-stone-200 p-4 text-stone-700">{g}</li>
          ))}
        </ul>
      </section>

      <section id="pricing" className="bg-stone-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h3 className="text-lg font-semibold">RelayFlow</h3>
              <p className="mt-1 text-3xl font-semibold">$99<span className="text-base font-normal text-stone-500">/month</span></p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-stone-700">
                <li>Web form and lead webhook</li>
                <li>Lead summaries and quote checklists</li>
                <li>Drafted replies with one-click approval</li>
                <li>Weekly response-time and booking metrics</li>
              </ul>
              <Link href="/signup" className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Start a workspace</Link>
            </div>
            <div id="setup" className="rounded-xl border border-stone-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Done-for-you setup</h3>
              <p className="mt-1 text-3xl font-semibold">$1,500<span className="text-base font-normal text-stone-500"> one time</span></p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-stone-700">
                <li>We connect your website forms and lead sources</li>
                <li>We write your business profile, approved facts, and reply style with you</li>
                <li>One measurable follow-up workflow live within 7 days of getting access</li>
                <li>Optional monitoring and tuning: $500/month</li>
              </ul>
              <p className="mt-6 text-sm text-stone-500">Setup starts with a free 30-minute workflow audit.</p>
              {salesForm && (
                <Link href={`/r/${salesForm}`} className="mt-3 inline-block rounded-md border border-brand-600 px-4 py-2 font-medium text-brand-700 hover:bg-brand-50">Request a workflow audit</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold">Not ready for software?</h2>
        <p className="mt-2 text-stone-600">The Home-Service Follow-Up Kit has the same templates and checklists as a do-it-yourself pack.</p>
        <Link href="/kit" className="mt-6 inline-block rounded-md border border-brand-600 px-5 py-3 font-medium text-brand-700 hover:bg-brand-50">See the Follow-Up Kit</Link>
      </section>
    </MarketingShell>
  );
}

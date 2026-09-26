import { intakeLead, resolveWorkspaceSlug } from "@relayos/domain";
import { DomainError } from "@relayos/shared";
import { notFound, redirect } from "next/navigation";
import { btnCls, inputCls, labelCls, type SearchParams } from "@/components/ui";
import { services } from "@/lib/services";

export const metadata = { title: "Request a quote" };

async function submit(slug: string, fd: FormData) {
  "use server";
  const svc = services();
  const ws = await resolveWorkspaceSlug(svc, slug);
  if (!ws) notFound();
  // Honeypot: people never fill this hidden field. Pretend success so bots learn nothing.
  if (fd.get("website")) redirect(`/r/${slug}?done=1`);
  let target = `/r/${slug}?done=1`;
  try {
    const fields = ["name", "email", "phone", "address", "service", "message"];
    await intakeLead(svc, ws.id, { ...Object.fromEntries(fields.map((k) => [k, String(fd.get(k) ?? "")])), source: "web form" },
      { type: "public", id: "quote-form" });
  } catch (err) {
    target = `/r/${slug}?${new URLSearchParams({ err: err instanceof DomainError ? err.message : "Please try again." })}`;
  }
  redirect(target);
}

export default async function QuoteForm({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ws = await resolveWorkspaceSlug(services(), slug);
  if (!ws) notFound();
  if (sp.done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">Thanks, we got your request.</h1>
        <p className="mt-3 text-stone-700">{ws.name} has your quote request, and someone on the team will review it and get back to you.
          If this is an emergency involving gas, fire, or electrical danger, call 911.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Request a quote from {ws.name}</h1>
      {sp.err && <p className="mt-3 text-sm text-red-700">{String(sp.err)}</p>}
      <form action={submit.bind(null, slug)} className="mt-4">
        <label><span className={labelCls}>Name</span><input name="name" required className={inputCls} /></label>
        <label><span className={labelCls}>Email</span><input name="email" type="email" className={inputCls} /></label>
        <label><span className={labelCls}>Phone</span><input name="phone" type="tel" className={inputCls} /></label>
        <label><span className={labelCls}>Service address</span><input name="address" className={inputCls} /></label>
        <label><span className={labelCls}>What do you need help with?</span><input name="service" placeholder="e.g. AC not cooling" className={inputCls} /></label>
        <label><span className={labelCls}>Details</span><textarea name="message" rows={4} className={inputCls} /></label>
        <div aria-hidden="true" className="absolute -left-[9999px]"><input name="website" tabIndex={-1} autoComplete="off" /></div>
        <button className={`${btnCls} mt-5`}>Send request</button>
        <p className="mt-3 text-xs text-stone-500">We only use your details to respond to this request. Please include an email or phone number.</p>
      </form>
    </main>
  );
}

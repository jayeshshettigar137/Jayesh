import { getWorkspace } from "@relayos/domain";
import { Card, Flash, btnCls, flashFrom, inputCls, labelCls, type SearchParams } from "@/components/ui";
import { services } from "@/lib/services";
import { requireSession } from "@/lib/session";
import { settingsAction } from "../actions";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const flash = await flashFrom(searchParams);
  const svc = services();
  const ws = await getWorkspace(svc.db, session.workspaceId);
  const base = svc.baseUrl.replace(/\/$/, "");
  return (
    <>
      <Flash {...flash} />
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <div className="grid gap-4">
        <Card title="Lead intake">
          <p className="text-sm">Public quote form: <a className="break-all text-brand-700 underline" href={`/r/${ws.slug}`}>{base}/r/{ws.slug}</a></p>
          <p className="mt-3 text-sm">Webhook (POST JSON with <code>name, email, phone, address, service, message, source</code>):</p>
          <code className="mt-1 block break-all rounded bg-stone-100 p-2 text-xs">{base}/api/intake/{ws.intake_token}</code>
          <p className="mt-1 text-xs text-stone-500">Treat this URL like a password. Anyone with it can submit leads.</p>
        </Card>
        <Card title="What the agent may say (workspace memory)">
          <form action={settingsAction}>
            <label><span className={labelCls}>Business profile: services, area, hours</span>
              <textarea name="business_profile" rows={5} defaultValue={ws.business_profile} className={inputCls} /></label>
            <label><span className={labelCls}>Approved facts, one per line (e.g. &quot;Licensed and insured in Texas&quot;). Claims not listed here are flagged in drafts.</span>
              <textarea name="approved_facts" rows={5} defaultValue={ws.approved_facts.join("\n")} className={inputCls} /></label>
            <label><span className={labelCls}>Reply-to address for follow-ups</span>
              <input name="reply_to" type="email" defaultValue={ws.reply_to} className={inputCls} /></label>
            <p className="mt-2 text-xs text-stone-500">Don&apos;t put prices here. Drafts never quote prices.</p>
            <button className={`${btnCls} mt-4`}>Save</button>
          </form>
        </Card>
      </div>
    </>
  );
}

import { createWorkspace } from "@relayos/domain";
import { DomainError } from "@relayos/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Flash, btnCls, flashFrom, inputCls, labelCls, type SearchParams } from "@/components/ui";
import { withFlash } from "@/lib/format";
import { services } from "@/lib/services";
import { setSessionCookie } from "@/lib/session";

export const metadata = { title: "Create workspace" };

const NICHES = ["hvac", "plumbing", "roofing", "electrical", "cleaning", "remodeling"] as const;

async function signup(fd: FormData) {
  "use server";
  const svc = services();
  let target = "/app/settings?ok=Workspace+created.+Add+your+business+facts+so+drafts+can+use+them.";
  try {
    const { workspaceId, userId } = await createWorkspace(svc.db, {
      businessName: String(fd.get("business") ?? ""),
      niche: String(fd.get("niche") ?? "hvac") as (typeof NICHES)[number],
      ownerName: String(fd.get("name") ?? ""),
      ownerEmail: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });
    await setSessionCookie(await svc.auth.createSession(userId, workspaceId));
  } catch (err) {
    target = withFlash("/signup", "err", err instanceof DomainError ? err.message : "Could not create the workspace.");
  }
  redirect(target);
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const flash = await flashFrom(searchParams);
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Create your RelayFlow workspace</h1>
      <Flash {...flash} />
      <form action={signup}>
        <label><span className={labelCls}>Business name</span><input name="business" required className={inputCls} /></label>
        <label><span className={labelCls}>Trade</span>
          <select name="niche" className={inputCls} defaultValue="hvac">{NICHES.map((n) => <option key={n}>{n}</option>)}</select></label>
        <label><span className={labelCls}>Your name</span><input name="name" className={inputCls} /></label>
        <label><span className={labelCls}>Email</span><input name="email" type="email" required className={inputCls} /></label>
        <label><span className={labelCls}>Password (10+ characters)</span><input name="password" type="password" minLength={10} required className={inputCls} /></label>
        <button className={`${btnCls} mt-5 w-full justify-center`}>Create workspace</button>
      </form>
      <p className="mt-4 text-sm text-stone-500">Already have an account? <Link className="underline" href="/login">Log in</Link></p>
    </main>
  );
}

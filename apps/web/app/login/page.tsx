import Link from "next/link";
import { redirect } from "next/navigation";
import { Flash, btnCls, flashFrom, inputCls, labelCls, type SearchParams } from "@/components/ui";
import { withFlash } from "@/lib/format";
import { services } from "@/lib/services";
import { setSessionCookie } from "@/lib/session";

export const metadata = { title: "Log in" };

async function login(fd: FormData) {
  "use server";
  const result = await services().auth.login(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
  if (!result) redirect(withFlash("/login", "err", "Wrong email or password."));
  await setSessionCookie(result.token);
  redirect("/app");
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const flash = await flashFrom(searchParams);
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Log in to RelayFlow</h1>
      <Flash {...flash} />
      <form action={login}>
        <label><span className={labelCls}>Email</span><input name="email" type="email" required className={inputCls} /></label>
        <label><span className={labelCls}>Password</span><input name="password" type="password" required className={inputCls} /></label>
        <button className={`${btnCls} mt-5 w-full justify-center`}>Log in</button>
      </form>
      <p className="mt-4 text-sm text-stone-500">New here? <Link className="underline" href="/signup">Create a workspace</Link></p>
    </main>
  );
}

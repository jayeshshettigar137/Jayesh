import { unsubscribeLead } from "@relayos/domain";
import { redirect } from "next/navigation";
import { btnCls, type SearchParams } from "@/components/ui";
import { services } from "@/lib/services";

export const metadata = { title: "Unsubscribe", robots: { index: false } };

async function confirm(token: string) {
  "use server";
  const ok = await unsubscribeLead(services(), token);
  redirect(`/u/${encodeURIComponent(token)}?${ok ? "done=1" : "invalid=1"}`);
}

/** A confirm button (POST), so link scanners that prefetch emails can't unsubscribe people by accident. */
export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: SearchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      {sp.done ? <h1 className="text-xl font-semibold">You&apos;re unsubscribed. You won&apos;t get more emails about this request.</h1>
        : sp.invalid ? <h1 className="text-xl font-semibold">This unsubscribe link isn&apos;t valid.</h1>
        : (
          <>
            <h1 className="text-xl font-semibold">Stop emails about this request?</h1>
            <form action={confirm.bind(null, decodeURIComponent(token))} className="mt-6"><button className={btnCls}>Unsubscribe</button></form>
          </>
        )}
    </main>
  );
}

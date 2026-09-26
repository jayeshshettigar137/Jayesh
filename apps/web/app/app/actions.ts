"use server";

import {
  approveAndSend, editDraft, intakeLead, rejectDraft, setLeadStatus, updateWorkspaceSettings, type LeadStatus,
} from "@relayos/domain";
import { DomainError, logger } from "@relayos/shared";
import { redirect } from "next/navigation";
import { runOnce } from "@relayos/worker";
import { withFlash } from "@/lib/format";
import { services } from "@/lib/services";
import { SESSION_COOKIE, requireSession, userCtx } from "@/lib/session";
import { cookies } from "next/headers";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Run a mutation; turn domain errors into a flash message, log anything unexpected. */
async function attempt(path: string, ok: string, fn: () => Promise<string | void>): Promise<never> {
  let target: string;
  try {
    target = withFlash(path, "ok", (await fn()) || ok);
  } catch (err) {
    if (!(err instanceof DomainError)) logger.error("action failed", { path, error: (err as Error).message });
    target = withFlash(path, "err", err instanceof DomainError ? err.message : "Something went wrong. Nothing was sent.");
  }
  redirect(target);
}

export async function approveAction(fd: FormData) {
  const s = await requireSession();
  await attempt("/app/approvals", "Approved and sent.", async () => {
    const r = await approveAndSend(services(), userCtx(s), str(fd, "approval_id"), { acknowledgeFlags: fd.get("ack") === "1" });
    if (r.status === "failed") throw new DomainError(`Delivery failed (${r.error}). The approval is kept; retry when ready.`);
    if (r.status !== "succeeded") throw new DomainError(`Not sent: ${"reason" in r ? r.reason : r.status}`);
  });
}

export async function rejectAction(fd: FormData) {
  const s = await requireSession();
  await attempt("/app/approvals", "Draft rejected. Nothing was sent.", () =>
    rejectDraft(services(), userCtx(s), str(fd, "approval_id"), str(fd, "note")));
}

export async function editAction(fd: FormData) {
  const s = await requireSession();
  await attempt("/app/approvals", "Draft updated. Review it once more, then approve.", async () => {
    await editDraft(services(), userCtx(s), str(fd, "approval_id"), str(fd, "subject"), str(fd, "body"));
  });
}

export async function statusAction(fd: FormData) {
  const s = await requireSession();
  const leadId = str(fd, "lead_id");
  await attempt(`/app/leads/${leadId}`, "Status updated.", () =>
    services().db.withWorkspace(s.workspaceId, (tx) => setLeadStatus(tx, userCtx(s), leadId, str(fd, "status") as LeadStatus)));
}

export async function addLeadAction(fd: FormData) {
  const s = await requireSession();
  await attempt("/app", "Lead added. The agent will prepare a summary and draft.", async () => {
    const fields = ["name", "email", "phone", "address", "service", "message", "source"];
    await intakeLead(services(), s.workspaceId, Object.fromEntries(fields.map((k) => [k, str(fd, k)])),
      { type: "user", id: s.userId });
  });
}

export async function settingsAction(fd: FormData) {
  const s = await requireSession();
  await attempt("/app/settings", "Settings saved.", () =>
    updateWorkspaceSettings(services().db, s.workspaceId, s.userId, {
      business_profile: str(fd, "business_profile"),
      approved_facts: str(fd, "approved_facts").split("\n").map((l) => l.trim()).filter(Boolean),
      reply_to: str(fd, "reply_to").trim(),
    }));
}

/** Process queued agent jobs now (the background worker does this continuously in production). */
export async function runAgentAction() {
  await requireSession();
  await attempt("/app/approvals", "Agent run finished.", async () => {
    const r = await runOnce(services(), 20);
    return `Agent run: ${r.processed} prepared, ${r.failed} failed, ${r.escalated} escalated.`;
  });
}

export async function logoutAction() {
  const jar = await cookies();
  await services().auth.logout(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

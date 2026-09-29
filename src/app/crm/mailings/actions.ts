"use server";

/**
 * Mailings: start one, add who it goes to, start or pause the daily sends.
 * Every action re-reads the session. Nothing here sends: the weekday cron
 * does, and only through the gates in src/lib/email/mailings.ts.
 */
import { requireSession } from "@/lib/crm/session";
import { addRecipients, createMailing, listMailings, readiness, setMailingStatus } from "@/lib/email/mailings";
import { approval } from "@/lib/signoff/state";
import { customerWindowEnds, parseRecipientLine, templateById, BASIS_LABEL, type Basis } from "@/lib/email/mailing-rules";
import { done, failed, writeFailed, type ActionState } from "../action-state";

export async function startMailing(_prev: ActionState, form: FormData): Promise<ActionState> {
  const s = requireSession();
  const template = String(form.get("template") ?? "");
  if (!templateById(template)) return failed("That is not one of the mailing emails.");
  try {
    await createMailing(template, s.email);
  } catch (err) {
    return writeFailed("The mailing", err);
  }
  return done("Mailing set up. Add who it goes to next.");
}

export async function importRecipients(_prev: ActionState, form: FormData): Promise<ActionState> {
  const s = requireSession();
  const mailingId = String(form.get("mailing") ?? "");
  const template = templateById(String(form.get("template") ?? ""));
  const basis = String(form.get("basis") ?? "") as Basis;
  const source = String(form.get("source") ?? "").trim().slice(0, 120);
  if (!mailingId || !template) return failed("That mailing could not be found.");
  if (basis !== "customer" && basis !== "consent") return failed("Say on what basis these people can be emailed.");
  if (!template.bases.includes(basis)) {
    return failed(`This email can only go to people who ${BASIS_LABEL.consent}.`);
  }

  const lines = String(form.get("lines") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return failed("Paste at least one line: email, first name, date of last purchase.");
  if (lines.length > 5000) return failed("That is more than 5,000 lines. Add them in smaller groups.");

  const good: { email: string; firstName: string | null; purchased: string | null }[] = [];
  const problems: string[] = [];
  for (const line of lines) {
    const r = parseRecipientLine(line);
    if ("error" in r) problems.push(r.error);
    else if (basis === "customer" && !r.purchased) problems.push(`${r.email} has no purchase date, which this basis needs.`);
    else good.push(r);
  }
  if (!good.length) return failed(`Nothing added. ${problems.slice(0, 3).join(" ")}`);

  try {
    const { added, already } = await addRecipients(mailingId, good, basis, source, s.email);
    /* Added anyway, because the rule is applied on the day each email goes;
       said now, so nobody expects them to receive it. */
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const lapsed = basis === "customer" ? good.filter((g) => g.purchased && customerWindowEnds(g.purchased) < today).length : 0;
    const extra = [
      already ? `${already} already on it.` : "",
      lapsed ? `${lapsed} bought more than 12 months ago and will be skipped.` : "",
      problems.length ? `${problems.length} line${problems.length === 1 ? "" : "s"} not added, for example: ${problems[0]}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return done(`${added} added. ${extra}`.trim());
  } catch (err) {
    return writeFailed("The list", err);
  }
}

export async function changeSending(_prev: ActionState, form: FormData): Promise<ActionState> {
  requireSession();
  const id = String(form.get("mailing") ?? "");
  const to = String(form.get("to") ?? "");
  if (!id || (to !== "sending" && to !== "paused")) return failed("That did not make sense to the CRM.");
  if (to === "sending") {
    /* The weekday send checks all of this again; refusing here as well means
       the page never says "Sending" about a mailing that cannot send. */
    const problems = readiness();
    if (problems.length) return failed(`Not started: ${problems[0]}`);
    const mailing = (await listMailings().catch(() => [])).find((m) => m.id === id);
    const template = mailing ? templateById(mailing.template) : null;
    if (!mailing || !template) return failed("That mailing could not be found.");
    const ok = await approval(template.itemId);
    if (!ok.approved) return failed(`Not started: ${ok.reason}`);
    if (!mailing.counts.queued) return failed("Not started: add people to it first.");
  }
  try {
    await setMailingStatus(id, to);
  } catch (err) {
    return writeFailed("The change", err);
  }
  return done(to === "sending" ? "Sending, fifty a day on weekday mornings." : "Paused.");
}

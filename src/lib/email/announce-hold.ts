/**
 * What the SmartSpace Networks and SmartGuardian announcement waits for.
 *
 * Nigel, 15 October 2026: the announcement "should be combined and after SCL
 * revamp and SSN page update". Combined it already was (PR #81). The timing
 * is enforced here rather than remembered, because the email sends customers
 * to both sites, and a customer who arrives at the old SmartCare Living
 * pages or at network pages Nigel has not approved meets something he
 * already said was not ready.
 *
 * Both are read live on every batch, so the hold lifts by itself on the
 * first weekday after the second one happens, and nobody has to remember to
 * lift it:
 *
 * - SmartSpace Networks pages: Nigel's sign-off of "network:pages" in
 *   /crm/signoff. He asked for changes on 15 October (sample reports for
 *   monitoring and broadband evidence, added the same day), so it is not
 *   approved until he looks again.
 * - The SmartCare Living redesign: css/site.css exists only on the redesign
 *   (branch redesign/clean-scl); on 15 October smartcareliving.ie answered
 *   404 for it. When the redesign is merged and deployed it answers 200.
 *   The two pages the email links to, /assessment and /book-consultation,
 *   exist on both.
 */
import { approval } from "@/lib/signoff/state";

export const ANNOUNCE_TEMPLATE = "network-diagnosis-a";
const SCL_REDESIGN_MARKER = "https://www.smartcareliving.ie/css/site.css";

/** Sentences saying what the template still waits for. Empty means it may send. */
export async function announcementHolds(templateId: string): Promise<string[]> {
  if (templateId !== ANNOUNCE_TEMPLATE) return [];
  const holds: string[] = [];

  const pages = await approval("network:pages");
  if (!pages.approved) holds.push("Waiting for Nigel to approve the SmartSpace Networks pages in Sign-off.");

  let relaunched = false;
  try {
    const res = await fetch(SCL_REDESIGN_MARKER, { method: "HEAD", redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(8000) });
    relaunched = res.ok;
  } catch {
    relaunched = false; // Could not ask, so it is not known to be live: hold.
  }
  if (!relaunched) holds.push("Waiting for the new SmartCare Living website to go live.");

  return holds;
}

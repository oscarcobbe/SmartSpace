"use server";

/**
 * Marking an order cancelled or done.
 *
 * The session is re-read here and the site comes from it, never from the form.
 * A server action is a public endpoint with a generated name, so the order
 * reference in the request is attacker-controlled: scoping every write by the
 * session's site means a forged reference can only ever write a row nobody
 * will read.
 */
import { requireSession } from "@/lib/crm/session";
import { markOrder, type MarkState } from "@/lib/crm/order-marks";
import { done, failed, writeFailed, type ActionState } from "../action-state";

export async function setOrderMark(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { site, email } = requireSession();
  const ref = String(formData.get("ref") ?? "").trim();
  if (!ref || ref.length > 200) return failed("This order could not be identified, so nothing was changed.");

  const raw = String(formData.get("state") ?? "");
  const state: MarkState | null = raw === "cancelled" || raw === "done" ? raw : null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  try {
    await markOrder(site, ref, state, note, email);
  } catch (err) {
    return writeFailed("That", err);
  }
  /* No revalidatePath: it forces the orders feed cold for the page that
     re-renders, and nothing written here is cached. The form refreshes. */
  return done(state === "cancelled" ? "Marked cancelled. It is out of the diary." : "Put back in the diary.");
}

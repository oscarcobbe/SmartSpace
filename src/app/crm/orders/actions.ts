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
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/crm/session";
import { markOrder, type MarkState } from "@/lib/crm/order-marks";

export async function setOrderMark(formData: FormData): Promise<void> {
  const { site, email } = requireSession();
  const ref = String(formData.get("ref") ?? "").trim();
  if (!ref || ref.length > 200) return;

  const raw = String(formData.get("state") ?? "");
  const state: MarkState | null = raw === "cancelled" || raw === "done" ? raw : null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  await markOrder(site, ref, state, note, email);
  revalidatePath("/crm/orders");
  revalidatePath("/crm/week");
  revalidatePath("/crm");
}

"use client";

/**
 * Send this customer a payment link, from the record already on screen.
 *
 * ── WHY A CLIENT COMPONENT ───────────────────────────────────────
 *
 * Because the answer matters and the wait is real. Making the link is two
 * Stripe calls and sending it is a third; a plain form post would blank the
 * page for three seconds and come back with no way to say "that one is traced
 * back to their ad click", which is the only sentence on this form worth
 * reading.
 *
 * ── WHY NOT useActionState ───────────────────────────────────────
 *
 * This app is React 18 and Next 14. useActionState is React 19, and importing
 * it here compiled clean, typechecked clean, and printed one line of warning
 * in the middle of a successful build: "not exported from react". It would
 * have thrown the moment Nigel opened a customer. The server action is called
 * directly instead, which is supported here and needs no hook at all.
 */
import { useState } from "react";
import { Euro, Send } from "lucide-react";
import { sendPaymentLink } from "./actions";
import { parseMoney } from "@/lib/crm/money-input";

type Result = { status: "idle" | "ok" | "error"; message: string };

export default function PaymentLinkForm({
  contactId, email, name, gclid,
}: { contactId: string; email: string; name: string; gclid: string | null }) {
  const [state, setState] = useState<Result>({ status: "idle", message: "" });
  /*
   * A plain flag, not useTransition's pending.
   *
   * On React 18 startTransition does not keep a transition open across an
   * await: it calls the scope function, and the moment that function hits its
   * first await the transition is already finished, so `pending` went false
   * while the Stripe calls and the email were still in flight. The button
   * re-enabled itself about a hundred milliseconds in. Pressing it twice sends
   * two live payment links for the same job to the same customer, and Stripe
   * links stay payable.
   */
  const [sending, setSending] = useState(false);
  /* Echoed back under the field as it is typed. A comma typed as a decimal
     point used to multiply the amount by a hundred with nothing on screen
     disagreeing, and the send confirmation named only the email address. */
  const [typed, setTyped] = useState("");
  const reading = typed.trim() ? parseMoney(typed) : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const data = new FormData(e.currentTarget);
    setState({ status: "idle", message: "" });
    setSending(true);
    void (async () => {
      try {
        setState(await sendPaymentLink(null, data));
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "That did not go through.",
        });
      } finally {
        /* In the finally, so a thrown action cannot leave the button dead. */
        setSending(false);
      }
    })();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2.5 px-4 py-4">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="name" value={name} />
      {/* Off their own record rather than pasted. The click id that produced
          this customer is the one the payment has to be credited to, and
          remembering it by hand is how it stops happening. */}
      <input type="hidden" name="gclid" value={gclid ?? ""} />

      <label className="block text-xs font-medium text-slate-600" htmlFor="pl-amount">Amount</label>
      <div className="relative">
        <Euro className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="pl-amount" name="amount" inputMode="decimal" required placeholder="479.00"
          value={typed} onChange={(e) => setTyped(e.target.value)}
          className="min-h-[38px] w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm tabular-nums text-slate-900 focus:border-slate-900 focus:outline-none"
        />
      </div>

      <p className={`min-h-[1.1rem] text-[11.5px] ${reading && !reading.ok ? "text-red-700" : "text-slate-500"}`}>
        {reading ? (reading.ok ? `Charges ${reading.formatted}` : reading.reason) : ""}
      </p>

      <label className="block text-xs font-medium text-slate-600" htmlFor="pl-what">What it is for</label>
      <input
        id="pl-what" name="description" required maxLength={120} placeholder="Ring doorbell fitted, 2 cameras"
        className="min-h-[38px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
      />

      <button
        type="submit"
        disabled={sending || !reading?.ok}
        className="inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {sending
          ? "Making the link…"
          : reading?.ok
            ? `Send ${reading.formatted}${gclid ? ", traced to their ad" : ""}`
            : gclid ? "Send it, traced to their ad" : "Send it"}
      </button>

      {state.status !== "idle" && (
        <p className={`text-xs leading-relaxed ${state.status === "ok" ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        {gclid
          ? "This customer came from a Google ad, so a link sent from here can be credited back to it. One made by hand in Stripe cannot."
          : "No ad click on this record, so this payment will not be credited to the advertising whichever way the link is made."}
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import type { Site } from "@/lib/crm/db";

export default function LoginForm({ site }: { site: Site }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    /* The endpoint answers the same way whether or not the address is on the
       list, so there is nothing to branch on here and nothing to report but
       "it has been sent if it was going to be". */
    await fetch("/api/crm/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, site }),
    }).catch(() => {});
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div role="status" className="mt-5 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-sm text-slate-700">
          If that address can sign in, the link is on its way. It works once and runs out after fifteen minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div>
        <label htmlFor="crm-email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email address
        </label>
        <input
          id="crm-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          placeholder="you@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-[44px] w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {state === "sending" ? "Sending" : "Email me a link"}
      </button>
    </form>
  );
}

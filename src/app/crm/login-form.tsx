"use client";

import { useState } from "react";
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
      <p role="status" className="mt-6 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        If that address can sign in, the link is on its way. It works once and runs out after fifteen minutes.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label htmlFor="crm-email" className="block text-sm font-medium text-slate-700">
        Email address
      </label>
      <input
        id="crm-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {state === "sending" ? "Sending" : "Email me a link"}
      </button>
    </form>
  );
}

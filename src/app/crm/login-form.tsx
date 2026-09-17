"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        /* refresh() rather than push(), because the layout decides what to
           render from the cookie the server just set, and only a server round
           trip sees it. */
        router.replace("/crm");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "That did not work.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div>
        <label htmlFor="crm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="crm-password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="min-h-[44px] w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? "Checking" : "Sign in"}
      </button>
    </form>
  );
}

"use client";

/**
 * The forms that make a key, and the one place the key is ever shown.
 *
 * The key appears once, with the exact command to run on the Mac, and is gone
 * when the page is left. It is not stored anywhere but the Pi.
 */
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { addPi, replaceKey, switchOff, type KeyState } from "./actions";

const input = "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm";
const primary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60";
const plain = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60";

function Go({ children, pending: label, tone = "primary" }: { children: React.ReactNode; pending: string; tone?: "primary" | "plain" | "danger" }) {
  const { pending } = useFormStatus();
  const cls = tone === "primary" ? primary : tone === "danger" ? `${plain} text-rose-700` : plain;
  return <button type="submit" disabled={pending} className={cls}>{pending ? label : children}</button>;
}

function KeyShown({ state }: { state: KeyState }) {
  const [copied, setCopied] = useState(false);
  if (state.status === "error") return <p role="alert" className="text-sm font-medium text-rose-700">{state.message}</p>;
  if (state.status !== "ok") return null;
  if (!state.key) return <p role="status" className="text-sm text-emerald-700">{state.message}</p>;
  const host = `${state.name}.local`;
  return (
    <div role="status" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">{state.message} This key is shown once. Install it now.</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 break-all rounded bg-white px-2 py-1.5 font-mono text-[13px] text-slate-900">{state.key}</code>
        <button type="button" className={plain} onClick={() => { void navigator.clipboard.writeText(state.key!); setCopied(true); }}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p>On the Mac, on the same network as the Pi, from the SmartSpace folder:</p>
      <code className="block break-all rounded bg-white px-2 py-1.5 font-mono text-[13px] text-slate-900">scripts/network-pi/install.sh {host} {state.role}</code>
      <p>It asks for the key: paste it there. It is never typed on the command line.</p>
    </div>
  );
}

/* Redraw the page around the form once a key is made, so the new Pi appears
   in the list above. The key stays on screen: it is this form's own state. */
function useRefreshOnSuccess(state: KeyState) {
  const router = useRouter();
  useEffect(() => { if (state.status === "ok") router.refresh(); }, [state, router]);
}

export function AddPiForm() {
  const [state, action] = useFormState<KeyState, FormData>(addPi, { status: "idle", message: "" });
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="space-y-4 px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pi-name" className="mb-1.5 block text-sm font-medium text-slate-700">Hostname</label>
          <input id="pi-name" name="name" placeholder="smartspace-node1" autoCapitalize="none" className={input} />
        </div>
        <div>
          <label htmlFor="pi-role" className="mb-1.5 block text-sm font-medium text-slate-700">Where it sits</label>
          <select id="pi-role" name="role" defaultValue="node" className={input}>
            <option value="node">On the trial floor (node)</option>
            <option value="server">At the router (server)</option>
          </select>
        </div>
      </div>
      <Go pending="Adding">Add the Pi and make its key</Go>
      <KeyShown state={state} />
    </form>
  );
}

export function PiKeyForms({ id, name }: { id: string; name: string }) {
  const [state, replace] = useFormState<KeyState, FormData>(replaceKey, { status: "idle", message: "" });
  const [offState, off] = useFormState<KeyState, FormData>(switchOff, { status: "idle", message: "" });
  useRefreshOnSuccess(state);
  useRefreshOnSuccess(offState);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={replace}>
          <input type="hidden" name="id" value={id} />
          <Go pending="Making a key" tone="plain">Replace the key</Go>
        </form>
        <form action={off} onSubmit={(e) => { if (!confirm(`Switch ${name} off? Its key stops working at once.`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={id} />
          <Go pending="Switching off" tone="danger">Switch off</Go>
        </form>
      </div>
      <KeyShown state={state} />
      <KeyShown state={offState} />
    </div>
  );
}

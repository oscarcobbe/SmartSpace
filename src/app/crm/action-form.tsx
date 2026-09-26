"use client";

/**
 * A form that says what happened.
 *
 * Every write on a customer's page used to be a bare server action: press
 * Save and the page quietly re-rendered, or, if the database refused, the
 * whole screen was replaced by an error. Nothing said "saved", nothing said
 * "that did not save", and a button pressed twice on a slow connection wrote
 * twice. This keeps the form where it is, disables the button while the write
 * is in flight, and puts one short sentence beside it afterwards.
 */
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "./action-state";

export function SubmitButton({
  children, pendingLabel, className, ariaLabel,
}: { children: ReactNode; pendingLabel?: string; className?: string; ariaLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label={ariaLabel} aria-disabled={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function ActionForm({
  action, children, className, resetOnSuccess = false, quiet = false,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Clear the fields after a successful write, for "add another" forms. */
  resetOnSuccess?: boolean;
  /** No "Saved" line on success, for one-tap controls whose result is visible anyway. */
  quiet?: boolean;
}) {
  const [state, formAction] = useFormState(action, { status: "idle", message: "" });
  const ref = useRef<HTMLFormElement>(null);
  const [shown, setShown] = useState<ActionState | null>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const [, startRefresh] = useTransition();

  useEffect(() => {
    if (state.status === "idle") return;
    if (state.status === "ok" && resetOnSuccess) ref.current?.reset();
    /* The write is done; redraw the page from the server so every panel shows
       it. A transition, so what is on screen stays until the new tree is in. */
    if (state.status === "ok") startRefresh(() => router.refresh());
    setShown(state);
    setVisible(true);
    /* A success fades after a few seconds; a failure stays until the next try,
       because it is the one that needs reading. */
    if (state.status === "ok") {
      const t = setTimeout(() => setVisible(false), 3500);
      return () => clearTimeout(t);
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {quiet ? (
        shown?.status === "error" && (
          <p role="alert" className="basis-full text-xs font-medium text-rose-700">{shown.message}</p>
        )
      ) : (
        /* The line is always there, so a message arriving does not push the
           page down; only its opacity changes. */
        <p
          role={shown?.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={[
            "min-h-[1.25rem] basis-full text-xs leading-5 transition-opacity duration-200 motion-reduce:transition-none",
            visible ? "opacity-100" : "opacity-0",
            shown?.status === "error" ? "font-medium text-rose-700" : "text-emerald-700",
          ].join(" ")}
        >
          {shown?.message ?? ""}
        </p>
      )}
    </form>
  );
}

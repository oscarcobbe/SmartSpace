"use client";

/**
 * Said only when a wait has gone on long enough to need explaining.
 *
 * SmartCare Living's enquiry sheet takes up to a minute to answer the first
 * time each day. A skeleton that sits there for a minute with no word reads as
 * a broken page, and a warning shown from the first millisecond reads as a
 * fault on every normal load. So nothing for the first few seconds, then one
 * plain sentence, faded in.
 */
import { useEffect, useState, type ReactNode } from "react";

export function SlowNote({ children, after = 3500 }: { children: ReactNode; after?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), after);
    return () => clearTimeout(t);
  }, [after]);
  return (
    /* Space is held from the start so the sentence arriving moves nothing. */
    <p
      aria-live="polite"
      className={`mb-4 min-h-[2.5rem] text-sm leading-relaxed text-slate-600 transition-opacity duration-300 motion-reduce:transition-none ${show ? "opacity-100" : "opacity-0"}`}
    >
      {show ? children : ""}
    </p>
  );
}

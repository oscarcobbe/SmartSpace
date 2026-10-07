"use client";

import { useFormState, useFormStatus } from "react-dom";
import { bookAssessment, type NewAssessmentState } from "../actions";
import { Panel, Note } from "../../../ui";

const input = "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="min-h-[44px] w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto">
      {pending ? "Booking" : "Book the assessment"}
    </button>
  );
}

function Field({ name, label, type = "text", placeholder, required, hint }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-slate-400">required</span>}
      </label>
      <input id={name} name={name} type={type} placeholder={placeholder} required={required}
        inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined} className={input} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function BookForm() {
  const [state, action] = useFormState<NewAssessmentState, FormData>(bookAssessment, {});
  return (
    <form action={action} className="space-y-6">
      {state.error && <Note tone="warn">{state.error}</Note>}
      <Panel title="The customer">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <Field name="name" label="Name" required placeholder="Mary Fitzgerald" />
          <Field name="phone" label="Phone" type="tel" placeholder="087 123 4567" />
          <Field name="email" label="Email" type="email" placeholder="mary@example.ie" />
          <Field name="address" label="Address" placeholder="12 Wellington Road, Dublin 4" />
          <Field name="eircode" label="Eircode" placeholder="D04 X1X1" />
          <Field name="paid_ref" label="Paid, Stripe reference" hint="The €395 is paid before the visit is booked." />
        </div>
      </Panel>
      <Panel title="The visits">
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <Field name="visit_at" label="Visit date and time" type="datetime-local" hint="Two hours. Someone over eighteen in for the whole slot." />
          <Field name="collection_at" label="Collection date agreed" type="datetime-local" hint="Three days later." />
        </div>
      </Panel>
      <Save />
    </form>
  );
}

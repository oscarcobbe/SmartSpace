"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addCustomer, type NewCustomerState } from "../new-actions";
import { Panel, Note } from "../../ui";

const initial: NewCustomerState = {};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? "Saving" : "Save customer"}
    </button>
  );
}

function Field({ name, label, type = "text", placeholder, required, autoFocus }: {
  name: string; label: string; type?: string; placeholder?: string; required?: boolean; autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-slate-400">required</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        /* inputMode so a phone keyboard opens on the number, which is where
           this form is most likely to be filled in: in a van, one handed. */
        inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined}
        className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}

export default function NewCustomerForm() {
  const [state, action] = useFormState(addCustomer, initial);

  return (
    <form action={action} className="space-y-6">
      {state.error && <Note tone="warn">{state.error}</Note>}

      <Panel title="Who">
        <div className="space-y-4 px-4 py-4">
          <Field name="name" label="Name" required autoFocus placeholder="Aoife Byrne" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="phone" label="Phone" type="tel" placeholder="087 123 4567" />
            <Field name="email" label="Email" type="email" placeholder="aoife@example.ie" />
          </div>
          <p className="text-xs text-slate-500">
            One of the two is enough. A person you cannot contact is not a contact.
          </p>
        </div>
      </Panel>

      <Panel title="Where">
        <div className="space-y-4 px-4 py-4">
          <Field name="address" label="Address" placeholder="4 The Grove" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="city" label="Town" placeholder="Rathgar" />
            <Field name="county" label="County" placeholder="Dublin" />
            <Field name="eircode" label="Eircode" placeholder="D06 X291" />
          </div>
        </div>
      </Panel>

      <Panel title="What they want">
        <div className="space-y-4 px-4 py-4">
          <div>
            <label htmlFor="source" className="mb-1.5 block text-sm font-medium text-slate-700">How they got in touch</label>
            <select id="source" name="source" defaultValue="phone"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="phone">Rang in</option>
              <option value="in_person">Met on an installation</option>
              <option value="referral">Recommended by somebody</option>
              <option value="walk_in">Walk in</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div>
            <label htmlFor="wanted" className="mb-1.5 block text-sm font-medium text-slate-700">What they said</label>
            <textarea
              id="wanted" name="wanted" rows={4}
              placeholder="Wants a doorbell fitted, has the box already, no existing chime."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>
      </Panel>

      <Save />
    </form>
  );
}

"use client";

/**
 * "How did you find us?" One optional select, the same on every form that
 * has it: no asterisk, no help text, never required. See src/lib/found-us.ts
 * for what the answer is and where it goes.
 *
 * Each form passes its own classes so the field looks like its neighbours.
 * On a phone the select needs text-base (16px, or iOS Safari zooms the page
 * when it is focused) and min-h-11 (the 44px touch floor);
 * scripts/check-found-us.mjs fails the build without them.
 *
 * Uncontrolled forms read it as form.elements.namedItem("found_us"); forms
 * that keep their fields in state pass value and onChange.
 */
import { FOUND_US_OPTIONS } from "@/lib/found-us";

interface FoundUsFieldProps {
  id: string;
  labelClassName: string;
  selectClassName: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export default function FoundUsField({
  id,
  labelClassName,
  selectClassName,
  className,
  value,
  onChange,
  disabled,
}: FoundUsFieldProps) {
  const controlled =
    value === undefined ? { defaultValue: "" } : { value, onChange: (e: { target: { value: string } }) => onChange?.(e.target.value) };
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        How did you find us?
      </label>
      <select id={id} name="found_us" disabled={disabled} className={selectClassName} {...controlled}>
        <option value="">Choose one (optional)</option>
        {FOUND_US_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

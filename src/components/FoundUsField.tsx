"use client";

/**
 * "How did you hear about us?" One required select, the same on every form
 * that has it (required since 1 Oct 2026, Oscar's call; optional before),
 * and under it an optional box for the visitor's own words, always visible.
 * No asterisk: this site marks no required field with one. The servers still
 * take a lead without an answer, so a cached page never loses one. The box's
 * hint names none of the answers, so it leads nobody towards one. See
 * src/lib/found-us.ts for what the answers are and where they go.
 *
 * Each form passes its own classes so the field looks like its neighbours.
 * On a phone the select needs text-base (16px, or iOS Safari zooms the page
 * when it is focused) and min-h-11 (the 44px touch floor);
 * scripts/check-found-us.mjs fails the build without them.
 *
 * Uncontrolled forms read them as form.elements.namedItem("found_us") and
 * "found_us_detail"; forms that keep their fields in state pass value,
 * onChange, detail and onDetailChange.
 */
import { FOUND_US_DETAIL_MAX, FOUND_US_OPTIONS } from "@/lib/found-us";

interface FoundUsFieldProps {
  id: string;
  labelClassName: string;
  selectClassName: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  detail?: string;
  onDetailChange?: (value: string) => void;
  disabled?: boolean;
}

export default function FoundUsField({
  id,
  labelClassName,
  selectClassName,
  className,
  value,
  onChange,
  detail,
  onDetailChange,
  disabled,
}: FoundUsFieldProps) {
  const controlled =
    value === undefined ? { defaultValue: "" } : { value, onChange: (e: { target: { value: string } }) => onChange?.(e.target.value) };
  const detailControlled =
    detail === undefined
      ? { defaultValue: "" }
      : { value: detail, onChange: (e: { target: { value: string } }) => onDetailChange?.(e.target.value) };
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        How did you hear about us?
      </label>
      <select id={id} name="found_us" required aria-required="true" disabled={disabled} className={`${selectClassName} truncate`} {...controlled}>
        <option value="">Choose one</option>
        {FOUND_US_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}_detail`} className={`${labelClassName} mt-3`}>
        Tell us more (optional)
      </label>
      <input
        id={`${id}_detail`}
        name="found_us_detail"
        type="text"
        maxLength={FOUND_US_DETAIL_MAX}
        autoComplete="off"
        placeholder="In your own words"
        disabled={disabled}
        className={selectClassName}
        {...detailControlled}
      />
    </div>
  );
}

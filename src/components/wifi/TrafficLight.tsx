import type { Light } from "@/lib/wifi-check/grade";

/**
 * The traffic light, drawn as one: a dark housing with red at the top, amber in
 * the middle and green at the bottom, one lamp lit. Position carries the
 * meaning as well as colour, which is what makes a traffic light readable to
 * somebody who cannot tell red from green.
 *
 * Amber is a yellow amber rather than the brand orange, so a lit amber lamp is
 * never mistaken for the Smart Space accent around it.
 */

export const LIGHT_HEX: Record<Light, string> = {
  red: "#DC2626",
  amber: "#F5B400",
  green: "#16A34A",
};

/** Text colours dark enough to read on white. */
export const LIGHT_TEXT: Record<Light, string> = {
  red: "text-red-700",
  amber: "text-amber-700",
  green: "text-green-700",
};

export const LIGHT_WORD: Record<Light, string> = { red: "Red", amber: "Amber", green: "Green" };

const ORDER: Light[] = ["red", "amber", "green"];

export default function TrafficLight({
  light,
  size = "lg",
  horizontal = false,
}: {
  light: Light | null;
  size?: "sm" | "lg";
  horizontal?: boolean;
}) {
  const lamp = size === "lg" ? "w-11 h-11 sm:w-14 sm:h-14" : "w-4 h-4";
  const pad = size === "lg" ? "p-2.5 sm:p-3 gap-2.5 sm:gap-3 rounded-[1.4rem]" : "p-1 gap-1 rounded-lg";
  return (
    <div
      role="img"
      aria-label={light ? `Traffic light showing ${LIGHT_WORD[light].toLowerCase()}` : "Traffic light, not graded"}
      className={`inline-flex ${horizontal ? "flex-row" : "flex-col"} ${pad} bg-[#1C1A18] shadow-premium-lg`}
    >
      {ORDER.map((l) => {
        const on = l === light;
        return (
          <span
            key={l}
            className={`${lamp} rounded-full block`}
            style={{
              background: LIGHT_HEX[l],
              opacity: on ? 1 : 0.18,
              boxShadow: on && size === "lg" ? `0 0 28px 4px ${LIGHT_HEX[l]}99, inset 0 -4px 8px rgba(0,0,0,0.18)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

/** A small coloured dot for a single check line. Grey when not graded. */
export function LightDot({ light }: { light: Light | null }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-3 h-3 rounded-full flex-shrink-0 ring-4"
      style={{
        background: light ? LIGHT_HEX[light] : "#C9C3BA",
        ["--tw-ring-color" as string]: light ? `${LIGHT_HEX[light]}26` : "#EDEAE3",
      }}
    />
  );
}

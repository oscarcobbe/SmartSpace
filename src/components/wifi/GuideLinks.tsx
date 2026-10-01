import Link from "next/link";

/** The home network guides, for a quiet "More in our guides" line. */
export const NETWORK_GUIDES = [
  { href: "/blog/broadband-speed-test-ireland-line-or-wifi", label: "Is it the line or the Wi-Fi?" },
  { href: "/blog/how-to-test-wifi-speed-room-by-room", label: "Testing room by room" },
  { href: "/blog/wifi-extender-mesh-or-powerline-ireland", label: "Extender, mesh or powerline" },
  { href: "/blog/mesh-wifi-explained", label: "Mesh explained" },
  { href: "/blog/powerline-adapters-ireland", label: "Powerline in Irish houses" },
];

/* No underline until hover or focus, the way Oscar asked for links to the
   service on 30 September 2026; semibold keeps them from relying on colour. */
export default function GuideLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-ink-soft ${className}`}>
      More in our guides:{" "}
      {NETWORK_GUIDES.map((g, i) => (
        <span key={g.href}>
          {i > 0 && " · "}
          <Link
            href={g.href}
            className="font-semibold text-brand-700 hover:text-brand-800 no-underline hover:underline focus-visible:underline underline-offset-4"
          >
            {g.label}
          </Link>
        </span>
      ))}
    </p>
  );
}

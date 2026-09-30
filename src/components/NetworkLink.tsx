import Link from "next/link";

/**
 * A quiet reference to the home network service, for the site's calls to
 * action: one line of text, the link in the brand colour and semibold, with
 * no underline until hover or keyboard focus, so it is not told apart by
 * colour alone. Oscar, 30 September 2026: wire the service into the calls to
 * action, "not messily obvious and no underlines".
 */
export default function NetworkLink({
  tone = "light",
  lead = "Wi-Fi not reaching every room?",
  label = "Try the free Wi-Fi speed test",
  href = "/wifi-check",
  className = "",
}: {
  tone?: "light" | "dark";
  lead?: string;
  label?: string;
  href?: string;
  className?: string;
}) {
  const text = tone === "dark" ? "text-white/65" : "text-ink-soft";
  const link = tone === "dark" ? "text-brand-400 hover:text-brand-300" : "text-brand-700 hover:text-brand-800";
  return (
    <p className={`text-sm ${text} ${className}`}>
      {lead}{" "}
      <Link href={href} className={`font-semibold no-underline hover:underline focus-visible:underline underline-offset-4 ${link}`}>
        {label}
      </Link>
    </p>
  );
}

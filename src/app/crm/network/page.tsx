import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { allApprovals } from "@/lib/signoff/state";
import { SAMPLE_CHECKS, itemById } from "@/lib/signoff/items";
import { grade } from "@/lib/wifi-check/grade";
import { reportPath } from "@/lib/wifi-check/codec";
import { WIFI_PACKAGES, priceLabel } from "@/data/wifiPackages";
import { PageHeader, Panel, Note, Pill } from "../ui";
import { SIGNOFF_BADGE } from "../signoff/badges";

export const dynamic = "force-dynamic";

/**
 * The home network diagnosis pages and the free Wi-Fi check, reachable from
 * the CRM while they are hidden from the public, so they can be tested on the
 * live site before anyone else sees them.
 *
 * Hidden by src/middleware.ts: without NEXT_PUBLIC_NETWORK_PAGES_LIVE=1 the
 * pages answer 404 to anyone not signed in to the CRM. Their enquiry form
 * sends nothing until the same switch is on (src/app/api/wifi-check/route.ts),
 * because before then every enquiry is somebody testing, and a real send would
 * put a test lead in front of Nigel.
 */

const COLOURS = [
  { key: "red", label: "Red", dot: "bg-red-600" },
  { key: "amber", label: "Amber", dot: "bg-amber-500" },
  { key: "green", label: "Green", dot: "bg-green-600" },
] as const;

function PageLink({ href, title, detail }: { href: string; title: string; detail?: string }) {
  return (
    <li className="px-4 py-3.5">
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
      >
        {title}
        <ExternalLink className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      </a>
      {detail && <p className="mt-0.5 text-sm text-slate-600">{detail}</p>}
    </li>
  );
}

export default async function NetworkPages() {
  requireSession();
  const isPublic = process.env.NEXT_PUBLIC_NETWORK_PAGES_LIVE === "1";
  const { states } = await allApprovals();
  const signoff = ["network:traffic-light", "network:pages"].map((id) => ({
    id,
    title: itemById(id)?.title ?? id,
    badge: SIGNOFF_BADGE[states.get(id)?.state ?? "unknown"],
  }));

  return (
    <>
      <PageHeader
        title="Home network pages"
        sub={
          isPublic
            ? "The network diagnosis pages and the free Wi-Fi check. They are live on the public site."
            : "The network diagnosis pages and the free Wi-Fi check. They are hidden from the public until they are approved in Sign-off and switched on. You can open them because you are signed in to the CRM."
        }
        aside={
          <Pill className={isPublic ? SIGNOFF_BADGE.approved.className : SIGNOFF_BADGE.waiting.className}>
            {isPublic ? "Public" : "Hidden from the public"}
          </Pill>
        }
      />

      <div className="space-y-6">
        {!isPublic && (
          <Note>
            Test mode: the enquiry forms on these pages answer as they would for a customer, but send nothing. Nigel,
            the enquiry sheet and the CRM get nothing from them until the pages are public.
          </Note>
        )}
        <Note>
          The speed test is Measurement Lab&apos;s, the same one Google uses. Measurement Lab publishes every result,
          with the internet address it came from.
        </Note>

        <Panel title="The pages">
          <ul className="divide-y divide-slate-200">
            <PageLink href="/services/wifi" title="Home Network Diagnosis" detail="The main page." />
            {WIFI_PACKAGES.map((p) => (
              <PageLink key={p.slug} href={`/services/wifi/${p.slug}`} title={p.name} detail={priceLabel(p)} />
            ))}
            <PageLink href="/wifi-check" title="The free Wi-Fi check" detail="Runs the speed test and gives a green, amber or red report." />
          </ul>
        </Panel>

        <Panel title="Sample reports">
          <ul className="divide-y divide-slate-200">
            {COLOURS.map((c) => {
              const check = SAMPLE_CHECKS[c.key];
              return (
                <li key={c.key} className="flex items-start gap-3 px-4 py-3.5">
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${c.dot}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <a
                      href={reportPath(check)}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
                    >
                      A {c.label.toLowerCase()} report
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    </a>
                    <p className="mt-0.5 text-sm text-slate-600">{grade(check.readings, check.answers).headline}.</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Sign-off">
          <ul className="divide-y divide-slate-200">
            {signoff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <Link href={`/crm/signoff#${s.id}`} className="text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">
                  {s.title}
                </Link>
                <Pill className={s.badge.className}>{s.badge.label}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

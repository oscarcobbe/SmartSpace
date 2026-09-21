import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import { fetchInsights, EVENT_LABEL } from "@/lib/crm/ga4";
import { fetchScans, scanLabel } from "@/lib/crm/scans";
import { PageHeader, Panel, Stat, StatRow, Note, Empty } from "../ui";
import { BarChart, Legend } from "../chart";

export const dynamic = "force-dynamic";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

const mmss = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

/** A path, shortened for a column, with the homepage named rather than "/". */
const prettyPath = (p: string) => (p === "/" || p === "" ? "Homepage" : p.replace(/\?.*$/, ""));

function Bars({ rows, total }: { rows: { label: string; value: number; note?: string }[]; total: number }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.label} className="px-4 py-2.5">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate text-slate-800" title={r.label}>{r.label}</span>
            <span className="shrink-0 tabular-nums text-slate-900">
              {int(r.value)}
              <span className="ml-2 text-xs text-slate-500">{pct(r.value, total)}</span>
            </span>
          </div>
          {/* The bar is the comparison. The number is the detail. */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${total ? Math.max(2, (r.value / total) * 100) : 0}%` }}
            />
          </div>
          {r.note && <p className="mt-1 text-xs text-slate-500">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: { days?: string } }) {
  const { site } = requireSession();
  const days = [7, 28, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 28;
  const [result, scans] = await Promise.all([fetchInsights(site, days), fetchScans(site, 90)]);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Visitors" />
        <Note tone="warn">Analytics could not be loaded. {result.reason}</Note>
      </>
    );
  }

  const g = result.data;
  const { users, sessions, views, engaged, avgSeconds } = g.totals;

  /* Weekly rather than daily: twenty eight bars at this width are three pixels
     each and say nothing. Weeks are what a person compares anyway. */
  const weeks = new Map<string, number>();
  for (const d of g.daily) {
    const monday = new Date(d.date);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + d.sessions);
  }
  const bars = Array.from(weeks.entries()).map(([key, value]) => ({
    label: new Date(key).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short" }),
    value,
    title: `Week of ${key}: ${int(value)} visits`,
    detail: [
      { label: "Week beginning", value: key },
      { label: "Visits", value: int(value) },
    ],
  }));

  const named = g.events.filter((e) => EVENT_LABEL[e.name]);
  const unnamed = g.events.filter((e) => !EVENT_LABEL[e.name]);

  const Range = () => (
    <div className="flex gap-1">
      {[7, 28, 90].map((d) => (
        <a
          key={d}
          href={`/crm/insights?days=${d}`}
          className={[
            "flex min-h-[32px] items-center rounded-lg px-3 text-sm font-medium",
            d === days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          {d} days
        </a>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Visitors"
        sub={`Where people came from and what they did on ${SITE_LABEL[site]}, over the last ${days} days.`}
        aside={<Range />}
      />

      <StatRow>
        <Stat label="People" value={int(users)} note={`${int(sessions)} visits`} explain="people" />
        <Stat label="Pages read" value={int(views)} note={sessions ? `${(views / sessions).toFixed(1)} a visit` : undefined} />
        <Stat
          label="Stayed to read"
          value={pct(engaged, sessions)}
          note={`${int(engaged)} of ${int(sessions)} visits`}
          tone={sessions && engaged / sessions >= 0.5 ? "good" : "warn"}
        />
        <Stat label="Average visit" value={mmss(avgSeconds)} />
        <Stat
          label="From search ads"
          value={int(g.sources.find((s) => /paid/i.test(s.label))?.sessions ?? 0)}
          note="Visits you paid for"
        />
      </StatRow>

      <div className="space-y-6">
        <Panel title="Visits, week by week">
          {bars.length === 0 ? (
            <Empty title="No visits recorded in this window" />
          ) : (
            <>
              <div className="px-4 pt-4">
                <BarChart bars={bars} units="count" ariaLabel={`Visits per week over the last ${days} days`} />
              </div>
              <Legend items={[{ color: "#f48222", label: "Visits" }]} />
            </>
          )}
        </Panel>

        {/* Printed codes, kept out of Orders. A scan is somebody pointing a
            phone at a van at a traffic light, not an enquiry, and putting the
            two in one list makes both numbers useless. */}
        {scans && scans.total > 0 && (
          <Panel
            title="Printed codes scanned"
            aside={<span className="text-xs text-slate-500">last 90 days</span>}
          >
            <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 sm:grid-cols-3">
              <Stat label="Scans" value={int(scans.total)} explain="scans" />
              <Stat label="Last seven days" value={int(scans.last7)} tone={scans.last7 ? "good" : "plain"} />
              <Stat
                label="Most scanned"
                value={scans.byCode[0] ? scanLabel(scans.byCode[0].code) : "–"}
                note={scans.byCode[0] ? `${int(scans.byCode[0].count)} scans` : undefined}
              />
            </div>
            <Bars
              total={scans.total}
              rows={scans.byCode.map((c) => ({ label: scanLabel(c.code), value: c.count }))}
            />
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Where they came from">
            {g.sources.length === 0 ? <Empty title="Nothing recorded" /> : (
              <Bars
                total={sessions}
                rows={g.sources.map((s) => ({
                  label: s.label,
                  value: s.sessions,
                  note: `${pct(s.engaged, s.sessions)} of them stayed to read`,
                }))}
              />
            )}
          </Panel>

          <Panel title="What they landed on">
            {g.landing.length === 0 ? <Empty title="Nothing recorded" /> : (
              <Bars
                total={sessions}
                rows={g.landing.map((l) => ({
                  label: prettyPath(l.path),
                  value: l.sessions,
                  note: `${pct(l.engaged, l.sessions)} stayed to read`,
                }))}
              />
            )}
          </Panel>

          <Panel title="What they did">
            {named.length === 0 ? (
              <Empty title="No events recorded" detail="The tracking sends these; if this is empty it is not arriving." />
            ) : (
              <Bars
                total={named[0]?.count ?? 0}
                rows={named.map((e) => ({ label: EVENT_LABEL[e.name], value: e.count }))}
              />
            )}
            {unnamed.length > 0 && (
              <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                Also recorded, without a plain name yet: {unnamed.slice(0, 8).map((e) => e.name).join(", ")}
              </p>
            )}
          </Panel>

          <Panel title="On what, and from where">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="border-b border-slate-200 sm:border-b-0 sm:border-r">
                <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Device</p>
                <Bars total={sessions} rows={g.devices.map((d) => ({
                  label: d.label === "desktop" ? "Computer" : d.label === "mobile" ? "Phone" : "Tablet",
                  value: d.sessions,
                  note: `${pct(d.engaged, d.sessions)} stayed to read`,
                }))} />
              </div>
              <div>
                <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">County</p>
                <Bars total={sessions} rows={g.counties.map((c) => ({ label: c.label, value: c.sessions }))} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

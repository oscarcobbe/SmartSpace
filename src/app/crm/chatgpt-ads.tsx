/**
 * ChatGPT ads, on their own, wherever the CRM shows Google's.
 *
 * Their spend is OpenAI's (src/lib/crm/openai-ads.ts); what came back is the
 * Stripe money from customers a ChatGPT ad reached (chatgptBack in
 * src/lib/crm/roas-months.ts). Neither is ever added to Google's figures, and
 * Google's are never added to these: one channel's sales set against the
 * other's spend would make one of them look better than it is.
 *
 * No grey estimate here. Google's is drawn from the share of traced customers
 * who came through a Google ad, and nothing like it exists for ChatGPT yet, so
 * this counts only what is traced and says so.
 *
 * Kept to a row of figures and a table rather than a second series on the
 * headline chart: that chart is one sentence about Google, and every edge
 * drawn on it before made it mean nothing to the person it is for.
 */
import { Note, Panel, Stat, StatRow } from "./ui";
import { money, moneyExact } from "@/lib/crm/leads";
import type { Site } from "@/lib/crm/db";
import { dublinDate, fetchOpenAiPeriods, NOT_CONNECTED, type OpenAiPeriodsResult } from "@/lib/crm/openai-ads";
import { monthLabel } from "@/lib/crm/period-buckets";
import { fetchRoasLive, type RoasLiveResult } from "@/lib/crm/roas-live";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
/* "14 July 2026" from OpenAI's yyyy-mm-dd, read as the Dublin date it is. */
const longDate = (d: string) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${d}T12:00:00Z`));
const ratio = (back: number, spend: number) => (spend > 0 ? `${(back / spend).toFixed(2)}x` : "No spend");

/** What the panel says when there is no ChatGPT spend to show, and why. */
function NotShown({ result }: { result: Extract<OpenAiPeriodsResult, { ok: false }> }) {
  return result.connected ? (
    <Note tone="warn">ChatGPT ads could not be read just now. {result.reason}</Note>
  ) : (
    <Note>{result.reason}</Note>
  );
}

/** The ChatGPT ads panel on Marketing: twelve months of spend, and what came back. */
export async function ChatGptAdsSection({ site }: { site: Site }) {
  const [spend, live]: [OpenAiPeriodsResult, RoasLiveResult] = await Promise.all([
    fetchOpenAiPeriods(site),
    fetchRoasLive(site),
  ]);
  /* Money back is read only for Smart Space, as on Google's chart. */
  const measured = site === "smart-space";

  if (!spend.ok) {
    return (
      <Panel title="ChatGPT ads">
        <div className="px-4 py-4"><NotShown result={spend} /></div>
      </Panel>
    );
  }

  const months = spend.data.month.slice(-12);
  const backBy = new Map<string, number>();
  const salesBy = new Map<string, number>();
  if (live.ok) {
    for (const m of live.data.months) {
      backBy.set(m.key, m.chatgptBack ?? 0);
      salesBy.set(m.key, m.chatgptSales ?? 0);
    }
  }
  const total = months.reduce(
    (t, m) => ({
      cost: t.cost + m.cost, clicks: t.clicks + m.clicks, conversions: t.conversions + m.conversions,
      back: t.back + (backBy.get(m.key) ?? 0), sales: t.sales + (salesBy.get(m.key) ?? 0),
    }),
    { cost: 0, clicks: 0, conversions: 0, back: 0, sales: 0 },
  );
  const backRead = measured && live.ok;
  /* What the money column says when it has no figure. Unread is not the same
     as unmeasured: Smart Space's is measured, and was not read this time. */
  const noBack = !measured ? "Not measured" : "Not read";

  return (
    <Panel title="ChatGPT ads">
      <p className="px-4 pt-3 text-xs text-slate-500">
        Live from OpenAI Ads, {longDate(spend.data.from)} to {longDate(spend.data.to)}. Today&apos;s figures arrive
        tomorrow. None of this is in the Google figures above, and none of Google&apos;s is in it.
      </p>
      <div className="px-4 pt-3">
        <StatRow>
          <Stat label="ChatGPT spend" value={money(total.cost)} note="Last twelve months" tone="cost" />
          <Stat label="ChatGPT clicks" value={int(total.clicks)} note={total.clicks ? `${moneyExact(total.cost / total.clicks)} each` : undefined} />
          <Stat label="ChatGPT enquiries" value={total.conversions.toFixed(0)}
                note={total.conversions ? `${moneyExact(total.cost / total.conversions)} each, as OpenAI counts them` : "As OpenAI counts them"} />
          <Stat label="Back from ChatGPT ads"
                value={backRead ? money(total.back) : noBack}
                tone={backRead ? "plain" : "muted"}
                note={!measured ? "Sales are not traced to ads for this business" : !live.ok ? "Could not be read, see below"
                  : `${total.sales} payment${total.sales === 1 ? "" : "s"} traced to a ChatGPT ad, nothing estimated`} />
          <Stat label="ChatGPT back per €1"
                value={backRead ? ratio(total.back, total.cost) : noBack}
                tone={backRead ? "plain" : "muted"}
                note={backRead && total.cost > 0 ? `${money(total.back)} on ${money(total.cost)}` : undefined} />
        </StatRow>
        {/* The money is read on the same pass as Google's return chart, so
            when that cannot be read neither can this, and the reason (often
            Google's) is said here rather than squeezed into a tile. */}
        {measured && !live.ok && (
          <div className="mb-4">
            <Note tone="warn">What came back from ChatGPT ads is read with the return chart above, which could not be read. {live.reason}</Note>
          </div>
        )}
      </div>

      {months.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-4 py-2 font-semibold">Month</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">ChatGPT spend</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Clicks</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Enquiries</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Back, traced</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Back per €1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.slice().reverse().map((m) => {
                const back = backBy.get(m.key) ?? 0;
                return (
                  <tr key={m.key}>
                    <td className="px-4 py-2 text-slate-900">{m.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{moneyExact(m.cost)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{int(m.clicks)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{m.conversions.toFixed(0)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                      {backRead ? moneyExact(back) : <span className="text-slate-400">{noBack}</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                      {backRead ? ratio(back, m.cost) : <span className="text-slate-400">{noBack}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 pb-4"><Note>OpenAI has no ChatGPT ads spend for this account in the last twelve months.</Note></div>
      )}
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Back is Stripe money from customers a ChatGPT ad reached: the click was on the payment, or on the
        customer&apos;s own enquiry. A customer that a Google ad and a ChatGPT ad both reached is counted as Google&apos;s.
      </p>
    </Panel>
  );
}

/** This month's ChatGPT spend, for the Overview's Advertising panel, in one line. */
export async function chatGptThisMonthLine(site: Site): Promise<string> {
  const r = await fetchOpenAiPeriods(site);
  if (!r.ok) return r.connected ? `ChatGPT ads could not be read: ${r.reason}` : `${NOT_CONNECTED}.`;
  /* The month yesterday was in: OpenAI's figures stop at yesterday, so on the
     first of the month this is the month just gone, and says so. */
  const month = dublinDate(new Date(), 1).slice(0, 7);
  const m = r.data.month.find((b) => b.key === month);
  if (!m || m.cost === 0) return `ChatGPT ads: nothing spent in ${monthLabel(month)} up to yesterday.`;
  return `ChatGPT ads, kept apart from the above: ${money(m.cost)} spent in ${m.label} up to yesterday, ${int(m.clicks)} click${m.clicks === 1 ? "" : "s"}.`;
}

/**
 * ChatGPT ads on the Overview, in one line.
 *
 * On Marketing they are a row of the channel table and part of the headline
 * chart's spend and money back (marketing/page.tsx), each channel's money its
 * own. The separate ChatGPT panel that sat at the foot of that page is gone:
 * Nigel asked for ChatGPT beside Google, not under it.
 */
import { money } from "@/lib/crm/leads";
import type { Site } from "@/lib/crm/db";
import { dublinDate, fetchOpenAiPeriods, NOT_CONNECTED } from "@/lib/crm/openai-ads";
import { monthLabel } from "@/lib/crm/period-buckets";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);

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

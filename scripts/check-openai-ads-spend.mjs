#!/usr/bin/env node
/**
 * ChatGPT ads spend in the CRM: what src/lib/crm/openai-ads.ts asks OpenAI
 * for, and what it does with the answer.
 *
 * Compiled and run against a stub fetch, a stub environment and a stub
 * clock. No key, no network.
 *
 * What has to hold:
 *
 *   - No key for the business: "ChatGPT ads not connected", and nothing is
 *     asked of anybody. The Conversions API key (OPENAI_ADS_API_KEY) is never
 *     taken for an Advertiser key, and one business's key is never used for
 *     the other.
 *   - The key's account is checked first, and a key for another account, or
 *     an account in another currency or timezone, reads no spend at all.
 *   - The request is the one OpenAI documents: daily, by campaign, the six
 *     fields, a date_range of Dublin dates ending yesterday and 365 days long.
 *   - Pages are followed with after=last_id while has_more, and a cursor that
 *     repeats or never ends is an error, not a loop.
 *   - Spend is a decimal in euro, summed across campaigns, never micros.
 *   - Days fall into the same weeks and months as Google's.
 *   - A failure is a reason that never carries the key, and is never cached.
 *
 *   node scripts/check-openai-ads-spend.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SS = "adacct_6abd50f5d8688195949131d623f78b90";
const SCL = "adacct_6abc732cf0f0819b9b1b7bb89e80e774";
const SS_KEY = "check-advertiser-key-smart-space";
const SCL_KEY = "check-advertiser-key-scl";

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };
const check = (cond, good, wrong) => (cond ? ok(good) : fail(wrong));

/* ── Compiling the module ───────────────────────────────────────── */

const dir = mkdtempSync(join(tmpdir(), "openai-ads-spend-"));
const transpile = (rel) =>
  ts.transpileModule(readFileSync(join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
    .replace(/from\s+"\.\/period-buckets"/g, 'from "./period-buckets.mjs"')
    .replace(/from\s+"next\/cache"/g, 'from "./next-cache-stub.mjs"');
writeFileSync(join(dir, "period-buckets.mjs"), transpile("src/lib/crm/period-buckets.ts"));
/* Next's data cache keeps what the function resolves with and never what it
   throws. This one does the same, so a failure returned rather than thrown
   would be kept and served again, which is the bug it is here to catch. */
writeFileSync(join(dir, "next-cache-stub.mjs"), `
const kept = new Map();
export const cacheCalls = [];
export function unstable_cache(fn, keyParts, opts) {
  return async () => {
    const k = JSON.stringify(keyParts);
    cacheCalls.push({ keyParts, opts });
    if (kept.has(k)) return kept.get(k);
    const v = await fn();
    kept.set(k, v);
    return v;
  };
}
export function forget() { kept.clear(); }
`);
writeFileSync(join(dir, "openai-ads.mjs"), transpile("src/lib/crm/openai-ads.ts"));
const mod = await import(pathToFileURL(join(dir, "openai-ads.mjs")).href);
const buckets = await import(pathToFileURL(join(dir, "period-buckets.mjs")).href);
const cacheStub = await import(pathToFileURL(join(dir, "next-cache-stub.mjs")).href);

/* ── A stub OpenAI ──────────────────────────────────────────────── */

function openai({ account = { id: SS, currency_code: "EUR", timezone: "Europe/Dublin" }, pages = [], status = 200, error = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers ?? {} });
    const u = new URL(String(url));
    const reply = (code, body) => ({
      ok: code >= 200 && code < 300, status: code,
      json: async () => body, text: async () => JSON.stringify(body),
    });
    if (error && u.pathname.endsWith(error.path)) return reply(error.status, error.body);
    if (u.pathname === "/v1/ad_account") return reply(status, account);
    if (u.pathname === "/v1/ad_account/insights") {
      const after = u.searchParams.get("after");
      const i = after === null ? 0 : pages.findIndex((p) => p.after === after);
      const page = pages[i] ?? { data: [], has_more: false };
      return reply(200, { object: "list", data: page.data, has_more: page.has_more ?? false, last_id: page.last_id ?? null });
    }
    return reply(404, { error: { message: "no such path" } });
  };
  return { calls, fetchImpl };
}

const row = (date, campaign, spend, clicks = 0, impressions = 0, conversions = 0) =>
  ({ id: `start:${date}:${campaign}`, readable_time: date, campaign_id: campaign, campaign_name: `C ${campaign}`, spend, clicks, impressions, conversions });

/* 23:30 UTC on 1 October 2026 is half past midnight on 2 October in Dublin. */
const NOW = new Date(Date.UTC(2026, 9, 1, 23, 30));
const read = (site, env, stub, now = NOW) => mod.readOpenAiPeriods(site, { env, fetchImpl: stub.fetchImpl, now });

try {
  /* 1. Not connected. */
  for (const [what, env] of [
    ["no key at all", {}],
    ["only the Conversions API key (OPENAI_ADS_API_KEY)", { OPENAI_ADS_API_KEY: "check-conversions-key" }],
    ["only SmartCare Living's key", { OPENAI_ADS_ADVERTISER_KEY_SCL: SCL_KEY }],
    ["a blank key", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: "   " }],
  ]) {
    const stub = openai();
    const r = await read("smart-space", env, stub);
    check(!r.ok && r.connected === false && r.reason.startsWith("ChatGPT ads not connected") && r.reason.includes("OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE") && stub.calls.length === 0,
      `Smart Space with ${what}: "ChatGPT ads not connected", naming its variable, and no request`,
      `Smart Space with ${what}: ${JSON.stringify(r)}, ${stub.calls.length} request(s)`);
  }
  {
    const stub = openai({ account: { id: SCL, currency_code: "EUR", timezone: "Europe/Dublin" } });
    const r = await read("smartcareliving", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: SS_KEY, OPENAI_ADS_ADVERTISER_KEY_SCL: SCL_KEY }, stub);
    check(r.ok && stub.calls.length >= 2 && stub.calls.every((c) => c.headers.Authorization === `Bearer ${SCL_KEY}`),
      "SmartCare Living reads with OPENAI_ADS_ADVERTISER_KEY_SCL and nothing else",
      `SmartCare Living: ${JSON.stringify(r).slice(0, 200)}, auth ${JSON.stringify(stub.calls.map((c) => c.headers.Authorization))}`);
  }

  /* 2. The account, before anything else. */
  {
    const stub = openai({ account: { id: SCL, currency_code: "EUR", timezone: "Europe/Dublin" }, pages: [{ data: [row("2026-09-30", "c1", 50)] }] });
    const r = await read("smart-space", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: SCL_KEY }, stub);
    check(!r.ok && r.connected === true && r.reason.includes(SCL) && r.reason.includes(SS) &&
        !stub.calls.some((c) => c.url.includes("/insights")),
      "SmartCare Living's key in Smart Space's variable: refused, both accounts named, and no spend asked for",
      `account mismatch: ${JSON.stringify(r)}, requests ${stub.calls.map((c) => c.url).join(" ")}`);
  }
  for (const [what, account] of [
    ["an account in USD", { id: SS, currency_code: "USD", timezone: "Europe/Dublin" }],
    ["an account on New York's days", { id: SS, currency_code: "EUR", timezone: "America/New_York" }],
  ]) {
    const stub = openai({ account, pages: [{ data: [row("2026-09-30", "c1", 50)] }] });
    const r = await read("smart-space", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: SS_KEY }, stub);
    check(!r.ok && r.connected && !stub.calls.some((c) => c.url.includes("/insights")),
      `${what}: refused before any spend is read`, `${what}: ${JSON.stringify(r)}`);
  }

  /* 3. The request, 4. paging, 5. decimal spend, 6. buckets. */
  {
    const stub = openai({
      pages: [
        { data: [row("2026-09-27", "c1", "18.42", 30, 1000, 1), row("2026-09-27", "c2", 14.86, 20, 800, 0)], has_more: true, last_id: "cursor-1" },
        { after: "cursor-1", data: [row("2026-09-28", "c1", "40", 10, 500, 2), row("2026-10-01", "c1", 5.5, 4, 90, 0)], has_more: false, last_id: "cursor-2" },
      ],
    });
    const r = await read("smart-space", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: SS_KEY }, stub);
    const [acct, first, second] = stub.calls;
    const q = first && new URL(first.url).searchParams;
    check(acct?.url === "https://api.ads.openai.com/v1/ad_account" && acct.headers.Authorization === `Bearer ${SS_KEY}` && acct.headers.Accept === "application/json",
      "GET /v1/ad_account first, with the key as a bearer token", `first request: ${JSON.stringify(acct)}`);
    const range = q && JSON.parse(q.getAll("time_ranges[]")[0] ?? "null");
    const days = range && (Date.parse(range.until) - Date.parse(range.since)) / 86_400_000 + 1;
    check(first && new URL(first.url).pathname === "/v1/ad_account/insights" && q.get("time_granularity") === "daily" && q.get("aggregation_level") === "campaign" &&
        q.get("limit") === "2000" && JSON.stringify(q.getAll("fields[]")) === JSON.stringify(["metadata.readable_time", "campaign.id", "campaign.name", "campaign.impressions", "campaign.clicks", "campaign.spend", "campaign.conversions"]) &&
        q.getAll("time_ranges[]").length === 1 && range.type === "date_range" && range.until === "2026-10-01" && days === 365 && !q.has("after"),
      `insights: daily, by campaign, six fields, one date_range ${range?.since} to ${range?.until} (Dublin's yesterday, ${days} days)`,
      `insights request: ${first?.url}`);
    check(second && new URL(second.url).searchParams.get("after") === "cursor-1" && stub.calls.length === 3,
      "the second page is asked for with after=last_id, and paging stops when has_more is false",
      `paging: ${stub.calls.map((c) => c.url).join(" | ")}`);
    const day = (k) => r.ok && r.data.day.find((b) => b.key === k);
    check(r.ok && Math.abs(day("2026-09-27").cost - 33.28) < 1e-9 && day("2026-09-28").cost === 40 && day("2026-09-27").clicks === 50 && day("2026-09-27").conversions === 1,
      "spend is a decimal in euro, as a string or a number, summed across campaigns: €18.42 and €14.86 make €33.28, \"40\" is €40",
      `days: ${JSON.stringify(r.ok && r.data.day.map((b) => [b.key, b.cost]))}`);
    const weeks = r.ok ? r.data.week.map((b) => [b.key, +b.cost.toFixed(2)]) : [];
    const months = r.ok ? r.data.month.map((b) => [b.key, +b.cost.toFixed(2)]) : [];
    check(JSON.stringify(weeks) === JSON.stringify([["2026-09-21", 33.28], ["2026-09-28", 45.5]]) &&
        JSON.stringify(months) === JSON.stringify([["2026-09", 73.28], ["2026-10", 5.5]]) &&
        r.data.week[1].label === `Week of ${buckets.dayLabel("2026-09-28")}` && r.data.month[1].label === buckets.monthLabel("2026-10"),
      "Sunday 27 Sept closes one week and Monday 28 opens the next; 1 October is October's: Google's buckets, labels and all",
      `weeks ${JSON.stringify(weeks)}, months ${JSON.stringify(months)}, labels ${r.ok && r.data.week.map((b) => b.label)}`);
    check(r.ok && [...r.data.day, ...r.data.week, ...r.data.month].every((b) => b.roas === null && b.value === 0),
      "no value is read from OpenAI, so no bucket claims a return", "a ChatGPT bucket carries a return figure");
  }
  {
    const winter = mod.dublinDate(new Date(Date.UTC(2026, 11, 1, 0, 30)), 1);
    const summer = mod.dublinDate(NOW, 1);
    check(winter === "2026-11-30" && summer === "2026-10-01",
      "yesterday is Dublin's: 00:30 on 1 December is still 1 December, 23:30 UTC on 1 October is already 2 October",
      `dublinDate: winter ${winter}, summer ${summer}`);
  }
  for (const [what, pages] of [
    ["has_more with the same cursor again", [{ data: [], has_more: true, last_id: "c1" }, { after: "c1", data: [], has_more: true, last_id: "c1" }]],
    ["has_more with no cursor", [{ data: [], has_more: true }]],
    ["a cursor that never ends", Array.from({ length: 40 }, (_, i) => ({ after: i ? `c${i}` : undefined, data: [], has_more: true, last_id: `c${i + 1}` }))],
  ]) {
    const stub = openai({ pages });
    const r = await read("smart-space", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: SS_KEY }, stub);
    const asked = stub.calls.filter((c) => c.url.includes("/insights")).length;
    check(!r.ok && r.connected && asked <= 25, `${what}: an error after ${asked} page(s), not a loop`, `${what}: ${JSON.stringify(r)}, ${asked} pages`);
  }

  /* 7. Failures. */
  {
    const stub = openai({ error: { path: "/insights", status: 401, body: { error: { message: `Invalid key ${SS_KEY}` } } } });
    const r = await read("smart-space", { OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE: SS_KEY }, stub);
    check(!r.ok && r.connected && r.reason.includes("401") && r.reason.includes("Invalid key") && !r.reason.includes(SS_KEY),
      "OpenAI's own refusal is the reason, with its status, and the key is scrubbed out of it", `refusal: ${JSON.stringify(r)}`);
  }
  {
    /* The cached wrapper, with the environment and fetch it really reads. */
    const env = { ...process.env };
    process.env.OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE = SS_KEY;
    let insightsStatus = 500;
    globalThis.fetch = async (url) => {
      const u = new URL(String(url));
      const reply = (code, body) => new Response(JSON.stringify(body), { status: code });
      if (u.pathname === "/v1/ad_account") return reply(200, { id: SS, currency_code: "EUR", timezone: "Europe/Dublin" });
      return insightsStatus === 200 ? reply(200, { data: [row("2026-09-30", "c1", 12)], has_more: false }) : reply(500, { error: { message: "busy" } });
    };
    cacheStub.forget();
    const first = await mod.fetchOpenAiPeriods("smart-space");
    insightsStatus = 200;
    const second = await mod.fetchOpenAiPeriods("smart-space");
    const third = await mod.fetchOpenAiPeriods("smart-space");
    const tagged = cacheStub.cacheCalls.at(-1)?.opts;
    check(!first.ok && first.connected && second.ok && third.ok && tagged?.revalidate === 60 && tagged.tags?.includes("crm-openai-ads-periods"),
      "a failed read is not what the cache keeps: the next load reads again and succeeds (sixty seconds, tagged for Refresh)",
      `cache: first ${JSON.stringify(first)}, second ${JSON.stringify(second).slice(0, 120)}, opts ${JSON.stringify(tagged)}`);
    delete process.env.OPENAI_ADS_ADVERTISER_KEY_SMARTSPACE;
    let asked = 0;
    globalThis.fetch = async () => { asked++; return new Response("{}", { status: 200 }); };
    const none = await mod.fetchOpenAiPeriods("smart-space");
    check(!none.ok && none.connected === false && asked === 0, "the page's own read with no key: not connected, nothing fetched",
      `no key: ${JSON.stringify(none)}, ${asked} request(s)`);
    Object.assign(process.env, env);
  }

  /* 8. The pieces that have to agree with this. */
  {
    const refresh = readFileSync(join(ROOT, "src/app/crm/refresh-action.ts"), "utf8");
    check(/revalidateTag\(OPENAI_PERIODS_TAG\)/.test(refresh), "Refresh clears ChatGPT's spend too", "src/app/crm/refresh-action.ts does not revalidate OPENAI_PERIODS_TAG");
    const src = readFileSync(join(ROOT, "src/lib/crm/openai-ads.ts"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    check(!/OPENAI_ADS_API_KEY/.test(src), "openai-ads.ts never reads OPENAI_ADS_API_KEY, the Conversions API key",
      "openai-ads.ts mentions OPENAI_ADS_API_KEY outside a comment");
    const google = readFileSync(join(ROOT, "src/lib/crm/ads-periods.ts"), "utf8");
    check(/import \{ periodsOf[^}]*\} from "\.\/period-buckets"/.test(google) && /periodsOf\(Array\.from\(byDate\.values\(\)\)/.test(google) && !/function roll\(/.test(google),
      "Google's periods are bucketed by the same periodsOf, so a week is the same week for both",
      "src/lib/crm/ads-periods.ts no longer buckets through period-buckets.ts periodsOf");
    const marketing = readFileSync(join(ROOT, "src/app/crm/marketing/page.tsx"), "utf8");
    const overview = readFileSync(join(ROOT, "src/app/crm/overview-panels.tsx"), "utf8");
    /* On Marketing, ChatGPT is a row of the channel table and part of the
       headline chart's spend, read from the same fetchOpenAiPeriods. */
    check(/fetchOpenAiPeriods\(site\)/.test(marketing) && /label: "ChatGPT ads"/.test(marketing)
        && /chatgptSpend: chatByMonth/.test(marketing) && /chatGptThisMonthLine\(site\)/.test(overview),
      "Marketing and the Overview both show ChatGPT ads", "the ChatGPT row, the chart's ChatGPT spend or the Overview line is not wired in");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (bad) {
  console.error(`\n${bad} problem${bad === 1 ? "" : "s"} with ChatGPT ads spend in the CRM.\n`);
  process.exit(1);
}
console.log("\nChatGPT ads spend is read from the right account, in euro, by Dublin's days, and says so when it is not connected.\n");

#!/usr/bin/env node
/**
 * Where Google's own tag sends this site's events, read from Google.
 *
 * ── THIS GATES NOTHING ───────────────────────────────────────────
 *
 * It is a manual, live check: it fetches Google's published tag scripts and
 * the live homepage, so it is not in `npm run build`, in CI or in any other
 * gate, and must not be put there while it is expected to fail. On 4 October
 * 2026 it fails, naming G-JR2WXNSLEL, and it will keep failing until the
 * Google Ads tag's destination is removed in the Google tag settings, which
 * is an account change, not a code change, and was deliberately left for
 * now. Once that is done and this passes, it could be scheduled.
 *
 *   npm run check:tag-destinations            # GA4 id read from the live page
 *   node scripts/check-google-tag-destinations.mjs --ga4 G-XXXXXXXXXX
 *
 * ── THE FAULT ────────────────────────────────────────────────────
 *
 * The page configures one GA4 stream, G-N8886QEJ70. The Google Ads tag
 * AW-17978501655 (Google tag GT-WB2RD8DJ) also lists G-JR2WXNSLEL, the
 * property's original stream, as a destination, so gtag forwards every event
 * there too: each page view, lead and sale is counted once per stream, and
 * any report on the whole property doubles. The page cannot stop it; only
 * the tag settings can. G-JR2WXNSLEL's own gtag/js answers 404, which is why
 * it must never be configured on the page either.
 *
 * ── WHAT THIS DOES ───────────────────────────────────────────────
 *
 *  1. The GA4 id the live homepage configures (or --ga4): exactly one.
 *  2. gtag/js?id=AW-17978501655 must answer 200 and name no G- measurement
 *     id at all: the Ads tag should forward to no GA4 stream.
 *  3. gtag/js?id=<that GA4 id> must answer 200 and name no other G- id.
 */
const ADS = "AW-17978501655";
const SITE = "https://smart-space.ie/";
const GA4_RE = /\bG-[A-Z0-9]{6,}\b/g;

const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };

async function tag(id) {
  const r = await fetch(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`, { headers: { "cache-control": "no-cache" } });
  const text = await r.text();
  return { status: r.status, bytes: text.length, ids: [...new Set(text.match(GA4_RE) ?? [])] };
}

/* 1. The GA4 id the site configures. */
let ga4 = arg("--ga4");
if (!ga4) {
  const r = await fetch(SITE, { headers: { "user-agent": "smart-space check-google-tag-destinations" } });
  const html = await r.text();
  const configured = [...new Set([...html.matchAll(/gtag\('config',\s*"(G-[A-Z0-9]+)"/g)].map((m) => m[1]))];
  if (r.status !== 200 || configured.length !== 1) {
    fail(`${SITE} answered ${r.status} and configures ${configured.length} GA4 id(s) ${JSON.stringify(configured)}; expected exactly one`);
  } else {
    ga4 = configured[0];
    ok(`${SITE} configures one GA4 id, ${ga4}`);
  }
  const env = (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "").trim();
  if (ga4 && env && env !== ga4) fail(`NEXT_PUBLIC_GA4_MEASUREMENT_ID here is ${env}, the live page configures ${ga4}`);
}

/* 2. The Google Ads tag forwards to no GA4 stream. */
{
  const t = await tag(ADS);
  if (t.status !== 200) fail(`gtag/js?id=${ADS} answered ${t.status}`);
  else if (t.ids.length) {
    fail(`gtag/js?id=${ADS} (${t.bytes} bytes) forwards to ${t.ids.join(", ")}: every event the page sends is also counted there.` +
      ` Removing it from the destinations of Google tag GT-WB2RD8DJ, in the tag's settings, is the fix; the page cannot.`);
  } else ok(`gtag/js?id=${ADS} answers 200 and names no GA4 stream`);
}

/* 3. The configured GA4 stream's own tag loads. */
if (ga4) {
  const t = await tag(ga4);
  const others = t.ids.filter((id) => id !== ga4);
  if (t.status !== 200) fail(`gtag/js?id=${ga4} answered ${t.status}: the page loads gtag.js with this id, so nothing would load`);
  else if (others.length) fail(`gtag/js?id=${ga4} also forwards to ${others.join(", ")}`);
  else ok(`gtag/js?id=${ga4} answers 200 (${t.bytes} bytes) and forwards to no other stream`);
}

if (bad) {
  console.error(`\n${bad} problem${bad === 1 ? "" : "s"}. This check gates nothing; see the header.\n`);
  process.exit(1);
}
console.log("\nOne GA4 stream receives this site's events.\n");

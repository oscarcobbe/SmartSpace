#!/usr/bin/env node
/**
 * Tell Bing (and the other IndexNow engines) which pages are new or changed.
 *
 * ChatGPT's search draws on Bing's index, so a page Bing hasn't crawled yet
 * can't be cited. IndexNow asks Bing to fetch the listed URLs now instead of
 * whenever it next passes. The key file at the site root proves we own the host.
 *
 *   node scripts/indexnow.mjs /home-care-costs-ireland /llms.txt   # specific paths
 *   node scripts/indexnow.mjs --all                                # every URL in sitemap.xml
 *
 * Run it after the deploy is live, never before: Bing fetches straight away.
 */
const HOST = "smart-space.ie";
const KEY = "ea31022f111145bbfdce56eaf390ecfa";
const args = process.argv.slice(2);
let urls;
if (args.includes("--all")) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
} else {
  urls = args.map((p) => `https://${HOST}${p.startsWith("/") ? p : "/" + p}`);
}
if (!urls.length) { console.error("Give paths, or --all."); process.exit(2); }
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${r.status} for ${urls.length} URL(s)`);
process.exit(r.status === 200 || r.status === 202 ? 0 : 1);

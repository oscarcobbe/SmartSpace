/**
 * Exercises the real /api/crm/inbound against a stubbed PostgREST.
 *
 * Run it with the dev server up and scripts/crm-postgrest-stub.mjs listening on
 * 3999, with SMARTCRM_URL pointed at the stub:
 *
 *   node scripts/crm-postgrest-stub.mjs /tmp/crm-stub-log.json &
 *   SMARTCRM_URL=http://localhost:3999 SMARTCRM_SERVICE_KEY=stub-key \
 *     CRM_HMAC_SECRET=stub-hmac-secret npm run dev
 *   node scripts/check-crm-inbound.mjs
 *
 * It was written because SmartCare Living sends brand "smartcare-living" and
 * the route compared against "smartcareliving", so every SmartCare Living lead
 * was filed under Smart Space and returned 200 while doing it. Reintroducing
 * that comparison turns two of these red; that has been checked, not assumed.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3300";
const LOG = process.argv[2] ?? "/tmp/crm-stub-log.json";
const SECRET = "stub-hmac-secret";

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; } else { fail++; console.log("FAIL:", name, extra); }
};

const reset = () => fetch("http://localhost:3999/__reset").then((r) => r.text());
const log = () => JSON.parse(readFileSync(LOG, "utf8"));

async function post(payload, { badSig = false } = {}) {
  const body = JSON.stringify(payload);
  const sig = "sha256=" + createHmac("sha256", badSig ? "wrong" : SECRET).update(body).digest("hex");
  const res = await fetch(`${BASE}/api/crm/inbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CRM-Signature": sig },
    body,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

// 1. A bad signature is refused and nothing reaches the database.
await reset();
let r = await post({ brand: "smart-space", source: "contact_form", email: "a@b.ie" }, { badSig: true });
check("bad signature is refused", r.status === 401, r.status);
check("bad signature writes nothing", log().length === 0, JSON.stringify(log()));

// 2. No signature at all.
await reset();
const noSig = await fetch(`${BASE}/api/crm/inbound`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ brand: "smart-space" }),
});
check("missing signature is refused", noSig.status === 401, noSig.status);

// 3. Smart Space lead lands as smart-space.
await reset();
r = await post({ brand: "smart-space", source: "contact_form", email: "ss@example.ie", name: "SS Person" });
check("smart space accepted", r.status === 200, JSON.stringify(r));
let writes = log().filter((e) => e.method === "POST");
let lead = writes.find((e) => e.url.startsWith("/rest/v1/crm_leads"));
check("smart space lead filed under smart-space", lead?.body?.site === "smart-space", lead?.body?.site);

// 4. SmartCare Living sends "smartcare-living", which is NOT the enum value.
//    This is the bug this test exists for.
await reset();
r = await post({ brand: "smartcare-living", source: "quiz", email: "scl@example.ie", name: "SCL Person" });
check("smartcare living accepted", r.status === 200, JSON.stringify(r));
writes = log().filter((e) => e.method === "POST");
lead = writes.find((e) => e.url.startsWith("/rest/v1/crm_leads"));
const contact = writes.find((e) => e.url.startsWith("/rest/v1/crm_contacts"));
check("scl lead filed under smartcareliving", lead?.body?.site === "smartcareliving", lead?.body?.site);
check("scl contact filed under smartcareliving", contact?.body?.site === "smartcareliving", contact?.body?.site);

// 5. An unknown brand is rejected rather than silently becoming Smart Space.
await reset();
r = await post({ brand: "some-other-company", source: "contact_form", email: "x@y.ie" });
check("unknown brand is rejected", r.status === 400, r.status);
check("unknown brand writes nothing", log().length === 0, JSON.stringify(log()));

// 6. A paid order carries the Stripe id, is marked won, and stamps paid_at.
await reset();
r = await post({
  brand: "smart-space", source: "stripe", email: "paid@example.ie",
  stripe_session_id: "cs_test_123", value_cents: 13900, gclid: "abc123",
  utm_campaign: "Installer April 2026",
});
writes = log().filter((e) => e.method === "POST");
lead = writes.find((e) => e.url.startsWith("/rest/v1/crm_leads"));
check("paid order marked won", lead?.body?.status === "won", lead?.body?.status);
check("paid order keeps the stripe id", lead?.body?.stripe_session_id === "cs_test_123", lead?.body?.stripe_session_id);
check("paid order stamps paid_at", Boolean(lead?.body?.paid_at));
check("value carried through", lead?.body?.value_cents === 13900, lead?.body?.value_cents);
check("gclid carried through", lead?.body?.gclid === "abc123", lead?.body?.gclid);
check("campaign carried through", lead?.body?.utm_campaign === "Installer April 2026", lead?.body?.utm_campaign);

// 7. The dedupe lookup happens before the insert.
const order = log().map((e) => `${e.method} ${e.url.split("?")[0]}`);
const dedupeAt = order.findIndex((o) => o.startsWith("GET /rest/v1/crm_leads"));
const insertAt = order.findIndex((o) => o === "POST /rest/v1/crm_leads");
check("stripe id is looked up before inserting", dedupeAt > -1 && dedupeAt < insertAt, order.join(" | "));

// 8. An enquiry with no contact detail at all must not create an empty person.
await reset();
r = await post({ brand: "smart-space", source: "contact_form", message: "no way to reach me" });
writes = log().filter((e) => e.method === "POST");
const madeContact = writes.find((e) => e.url.startsWith("/rest/v1/crm_contacts"));
check("no contact row without an email or phone", !madeContact, JSON.stringify(madeContact?.body));

// 9. Activity is recorded alongside the lead.
await reset();
await post({ brand: "smart-space", source: "booking", email: "act@example.ie" });
check("activity written", log().some((e) => e.method === "POST" && e.url.startsWith("/rest/v1/crm_activity")));

// 10. The service key is sent, and never the anon key by accident.
check("service key used on every call", log().every((e) => e.apikey === "stub-key"));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

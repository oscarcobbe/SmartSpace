/**
 * The tokens hung on hand-made payment links, and the click each belongs to.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * /api/admin/send-payment-link tags a link with an opaque token and records
 * the token against the click id in crm_payment_link_refs. Exactly one thing
 * read that table: src/lib/crm/snapshot.ts, which draws OUR revenue chart. The
 * offline conversion feed in the portal, which is the only thing that uploads
 * to Google, never read it at all.
 *
 * So a link tagged by the dashboard was credited in our own chart and was
 * invisible to the ad account. The tagging did half its job, and the half it
 * did was the half nobody was asking about.
 *
 * The feed lives in a different deployment with a different database, so it
 * reads this the same way it already reads the enquiry click ids: over HTTP,
 * with the admin key. Tokens and click ids only. No names, no emails, no
 * amounts.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { crm } from "@/lib/crm/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export async function GET(request: Request) {
  const adminKey = process.env.ADMIN_KEY?.trim();
  if (!adminKey) {
    return NextResponse.json({ error: "ADMIN_KEY is not set on this deployment." }, { status: 500 });
  }

  /* Header only. A key in a query string is a key in every access log, in the
     address bar and in browser history, which is why the leads route's ?key=
     fallback was removed. */
  const auth = request.headers.get("authorization") ?? "";
  const offered = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!offered || !safeEqual(offered, adminKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    /* Newest first and capped, because the feed only ever looks at payments
       from the last few months and a token older than Google's ninety day
       window cannot help anybody. */
    const rows = await crm<{ token: string; gclid: string; site: string; created_at: string }[]>(
      "crm_payment_link_refs?select=token,gclid,site,created_at&order=created_at.desc&limit=5000",
    );
    const refs = (rows ?? [])
      .filter((r) => r.token && r.gclid)
      .map((r) => ({ token: r.token, gclid: r.gclid, site: r.site, at: r.created_at }));
    return NextResponse.json({ refs, count: refs.length });
  } catch (err) {
    /* The feed treats a failure here as "no tagged links", which costs
       attribution on the payment-link half and leaves every other row intact.
       Saying so is better than a 200 with an empty list, which reads as "there
       are none" and is a different fact. */
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not read the references" },
      { status: 502 },
    );
  }
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GBP & Search Console Setup — Internal",
  description: "Internal hand-off guide for Google Business Profile and Search Console setup.",
  robots: { index: false, follow: false },
};

export default function GbpSetupPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-ss">
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-900">
          <strong>Internal hand-off page.</strong> Not indexed by search engines. For Smart Space team use only.
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Google Business Profile &amp; Search Console Setup
        </h1>
        <p className="text-gray-500 mb-10">
          Two of the highest-impact tasks for local SEO. Do GBP first — it&apos;s what
          shows up in Google Maps and in the local pack when someone searches
          &quot;Ring installer Dublin&quot;. Then do Search Console so we can see what
          people are actually finding us for.
        </p>

        <h2 id="gbp">1. Google Business Profile — step-by-step</h2>

        <h3>Create / claim the profile</h3>
        <ol>
          <li>Go to <a href="https://business.google.com" target="_blank" rel="noopener noreferrer">business.google.com</a> and sign in with the Google account that should own the listing.</li>
          <li>Search for &quot;Smart Space&quot;. If a profile already exists (likely — Google auto-creates these), claim it. If not, create a new one.</li>
          <li>For business name, enter exactly: <strong>Smart Space</strong></li>
          <li>For category, choose: <strong>Security system installer</strong> (primary).</li>
          <li>Add secondary category: <strong>Electrical installation service</strong>.</li>
        </ol>

        <h3>Service area setup</h3>
        <p>
          Critical: we&apos;re a <strong>service-area business</strong>, not a storefront.
          Customers don&apos;t come to us, we go to them.
        </p>
        <ol>
          <li>When asked &quot;do customers visit your location?&quot; — select <strong>No</strong>.</li>
          <li>For service areas, add all 12 counties: Dublin, Wicklow, Kildare, Meath, Louth, Wexford, Carlow, Kilkenny, Laois, Offaly, Westmeath, Longford.</li>
          <li>Do NOT list a specific street address publicly. Google will ask for one for verification — it&apos;ll be hidden on the public profile.</li>
        </ol>

        <h3>Business details to fill in</h3>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Name</td><td>Smart Space</td></tr>
            <tr><td>Phone</td><td>01 513 0424</td></tr>
            <tr><td>Website</td><td>https://smart-space.ie</td></tr>
            <tr><td>Primary category</td><td>Security system installer</td></tr>
            <tr><td>Secondary category</td><td>Electrical installation service</td></tr>
            <tr><td>Hours</td><td>Leave blank unless you want to commit to specific opening hours</td></tr>
            <tr><td>Appointment link</td><td>https://smart-space.ie/services/free-consultation</td></tr>
            <tr><td>Service area</td><td>All 12 Leinster counties (see above)</td></tr>
          </tbody>
        </table>

        <h3>Description (paste this)</h3>
        <blockquote>
          Smart Space is Dublin&apos;s #1 Ring installer, serving all 12 counties of
          Leinster. We professionally install Ring Video Doorbells, Floodlight Cams, smart
          locks and home security cameras. Over 5,000 installations completed. Three Ireland
          SME Business Winner 2025. Free consultations, honest written quotes, and a clean,
          professional install — usually in under three hours. Book online at smart-space.ie
          or call 01 513 0424.
        </blockquote>

        <h3>Services to list</h3>
        <p>Add each of these as a separate service under the Services tab:</p>
        <ul>
          <li>Ring Video Doorbell installation — from €299</li>
          <li>Ring Floodlight Cam installation — from €299</li>
          <li>Ring Driveway Bundle — from €658</li>
          <li>Ring Whole Home Bundle — from €987</li>
          <li>Ring Eldercare Bundle — from €509</li>
          <li>Installation-only (Ring, Eufy, Nest, Tapo) — from €139</li>
          <li>Free home security consultation — complimentary</li>
        </ul>

        <h3>Photo strategy</h3>
        <p>Upload at least 10 high-quality photos. Target mix:</p>
        <ul>
          <li>Logo (required) — use /Logo1.png at 1200×1200</li>
          <li>Cover photo (required) — use /og-default.png (already 1200×630)</li>
          <li>3–5 in-progress install shots (installer on ladder, mounting doorbell, cable routing)</li>
          <li>3–5 finished-install shots (doorbell mounted, camera on wall, phone app screen)</li>
          <li>1–2 team photos</li>
          <li>1 van/branded vehicle photo</li>
        </ul>
        <p>
          Avoid stock photos — Google can detect them and they damage credibility. Shoot on a
          phone if needed, just make sure they&apos;re well-lit and in focus.
        </p>

        <h3>Verification</h3>
        <p>
          Google will ask to verify the listing — usually by postcard to your business
          address, sometimes by phone call or video. Expect 5–14 days for postcard. Until
          verification is complete, the listing won&apos;t appear in Maps.
        </p>

        <h3>Review-request email template</h3>
        <p>
          After verification, start soliciting reviews from past happy customers. Send this
          to every customer 3–7 days after their install:
        </p>
        <blockquote>
          Subject: Quick favour — a minute to leave us a review?
          <br /><br />
          Hi [first name],
          <br /><br />
          Hope everything&apos;s working perfectly with your new Ring setup. If we did a good
          job, would you mind leaving a quick Google review? It takes 60 seconds and it
          genuinely makes a big difference for a small business like ours.
          <br /><br />
          Direct link (skips the search): [your GBP short review URL — found in your GBP
          dashboard under &quot;Ask for reviews&quot;]
          <br /><br />
          If something wasn&apos;t right, please tell me directly first so we can fix it —
          I&apos;d much rather know.
          <br /><br />
          Thanks a million,
          <br />
          Nigel — Smart Space
        </blockquote>

        <h2 id="search-console">2. Google Search Console — step-by-step</h2>

        <h3>Add the property</h3>
        <ol>
          <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">search.google.com/search-console</a> and sign in.</li>
          <li>Click &quot;Add property&quot; → choose <strong>Domain</strong> (not URL prefix).</li>
          <li>Enter <strong>smart-space.ie</strong> (no http, no www — just the domain).</li>
          <li>Google will give you a DNS TXT record to add.</li>
        </ol>

        <h3>Add the TXT record</h3>
        <p>
          Log in to your DNS provider (probably wherever your domain is registered — check
          Namecheap, GoDaddy, Cloudflare, etc.). Add a TXT record:
        </p>
        <ul>
          <li><strong>Host / Name:</strong> @ (or leave blank)</li>
          <li><strong>Type:</strong> TXT</li>
          <li><strong>Value:</strong> The string Google gave you (starts with <code>google-site-verification=</code>)</li>
          <li><strong>TTL:</strong> Automatic / 3600 / default</li>
        </ul>
        <p>
          Wait 5–60 minutes for DNS to propagate, then click &quot;Verify&quot; back in Search
          Console.
        </p>

        <h3>What to do once verified</h3>
        <ol>
          <li>
            Submit the sitemap: Sitemaps → enter <code>sitemap.xml</code> → Submit. The
            sitemap lives at <a href="https://smart-space.ie/sitemap.xml">smart-space.ie/sitemap.xml</a>.
          </li>
          <li>
            Request indexing for the homepage and 5 top pages: URL Inspection → paste URL
            → &quot;Request indexing&quot;. Do this once per important page; don&apos;t
            spam it.
          </li>
          <li>
            Check the Core Web Vitals tab after 28 days — it&apos;ll show real-user data for
            page speed.
          </li>
          <li>
            Check the Coverage report weekly for first month. Fix any pages marked
            &quot;Excluded&quot; or &quot;Error&quot;.
          </li>
          <li>
            After 28 days, the Performance tab will show the actual queries driving traffic.
            This is the most useful data in Search Console.
          </li>
        </ol>

        <h3>If you need the meta-tag verification method instead of DNS</h3>
        <p>
          Send me the <code>&lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt;</code>{" "}
          tag Google gives you, and I&apos;ll drop it into the root <code>layout.tsx</code>.
          DNS verification is preferred because it verifies the entire domain including
          subdomains, but meta-tag works too.
        </p>

        <h2 id="next">What&apos;s next after GBP + Search Console</h2>
        <ul>
          <li>Bing Webmaster Tools — same process as Search Console, less important but free.</li>
          <li>Apple Business Connect — claim the listing that shows up in Apple Maps.</li>
          <li>Review responses — reply to every Google review within 48 hours. Boosts GBP signal.</li>
          <li>GBP posts — weekly photo post (an install, a tip, a seasonal reminder). Boosts local visibility.</li>
          <li>Review acquisition — target 10+ new Google reviews per month for the first 3 months.</li>
        </ul>
      </div>
    </div>
  );
}

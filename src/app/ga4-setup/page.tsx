import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GA4 Setup — Internal",
  description: "Internal hand-off: step-by-step to set up Google Analytics 4 for Smart Space.",
  robots: { index: false, follow: false },
};

export default function Ga4SetupPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-ss">
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-900">
          <strong>Internal hand-off page.</strong> Not indexed by search engines. For Smart Space team use only.
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Google Analytics 4 — setup guide
        </h1>
        <p className="text-gray-500 mb-10">
          ~10 minutes. All you need to do is create the GA4 property and copy
          the Measurement ID into Vercel. The website code is already wired to
          pick it up automatically — no further code changes needed.
        </p>

        <h2 id="step-1">Step 1 — Create the GA4 property</h2>
        <ol>
          <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">analytics.google.com</a> and sign in with the Google account that owns Smart Space.</li>
          <li>Click the gear icon (bottom-left) → <strong>Admin</strong>.</li>
          <li>In the <strong>Account</strong> column, select an existing account or click <strong>Create Account</strong> and name it <code>Smart Space</code>.</li>
          <li>In the <strong>Property</strong> column, click <strong>Create Property</strong>.</li>
        </ol>

        <h3>Property details</h3>
        <table>
          <thead>
            <tr><th>Field</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Property name</td><td>Smart Space Website</td></tr>
            <tr><td>Reporting time zone</td><td>(GMT+00:00) Dublin</td></tr>
            <tr><td>Currency</td><td>Euro (€)</td></tr>
          </tbody>
        </table>

        <h3>Business details</h3>
        <table>
          <thead>
            <tr><th>Field</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Industry category</td><td>Jobs & Education &gt; Other — OR — Real Estate / Home Services</td></tr>
            <tr><td>Business size</td><td>Small (1–10 employees)</td></tr>
          </tbody>
        </table>

        <h3>Business objectives</h3>
        <p>Tick:</p>
        <ul>
          <li>✅ Generate leads</li>
          <li>✅ Drive online sales</li>
          <li>✅ Examine user behaviour</li>
        </ul>

        <h2 id="step-2">Step 2 — Create the Web data stream</h2>
        <ol>
          <li>When prompted, choose <strong>Web</strong> as the platform.</li>
          <li>Website URL: <code>https://smart-space.ie</code></li>
          <li>Stream name: <code>Smart Space Website</code></li>
          <li>Enable <strong>Enhanced Measurement</strong> (the blue toggle — on by default, leave it on). This auto-tracks scroll depth, outbound clicks, site search, and file downloads.</li>
          <li>Click <strong>Create stream</strong>.</li>
        </ol>

        <h3>Copy the Measurement ID</h3>
        <p>
          On the stream details page, you&apos;ll see your <strong>Measurement ID</strong>{" "}
          — starts with <code>G-</code> followed by 10 uppercase letters/digits
          (e.g. <code>G-XYZ1234567</code>). Copy it.
        </p>

        <h2 id="step-3">Step 3 — Add the Measurement ID to Vercel</h2>
        <ol>
          <li>Go to <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a> → your <strong>smart-space</strong> project.</li>
          <li><strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
          <li>Click <strong>Add</strong>.
            <ul>
              <li><strong>Key:</strong> <code>NEXT_PUBLIC_GA4_MEASUREMENT_ID</code></li>
              <li><strong>Value:</strong> paste your <code>G-XXXXXXXXXX</code></li>
              <li><strong>Environments:</strong> tick <strong>Production</strong>, <strong>Preview</strong>, <strong>Development</strong></li>
            </ul>
          </li>
          <li>Save.</li>
          <li><strong>Deployments</strong> tab → three-dot menu on the latest deployment → <strong>Redeploy</strong> (to pick up the new env var).</li>
        </ol>

        <h2 id="step-4">Step 4 — Verify it&apos;s working</h2>
        <ol>
          <li>Wait for the Vercel redeploy to finish (~1 minute).</li>
          <li>Open <a href="https://smart-space.ie" target="_blank" rel="noopener noreferrer">smart-space.ie</a> in a private browser window.</li>
          <li>Back in GA4 → <strong>Reports</strong> → <strong>Realtime</strong>. You should see yourself as one active user within 30 seconds.</li>
          <li>Click around the site — the pageviews should appear in the Realtime report.</li>
        </ol>
        <p>
          If nothing shows up after 2 minutes: disable any ad blocker and
          refresh; check the Measurement ID in Vercel is spelled
          exactly right (no typos, starts with <code>G-</code>).
        </p>

        <h2 id="step-5">Step 5 — Link GA4 to Google Ads (important for bidding)</h2>
        <p>
          Google Ads needs this link so it can see site behaviour data for
          smart bidding. Without it, GA4 runs fine but Ads can&apos;t use its
          signals.
        </p>
        <ol>
          <li>In GA4 → <strong>Admin</strong> → <strong>Property settings</strong> → <strong>Product links</strong> → <strong>Google Ads links</strong>.</li>
          <li>Click <strong>Link</strong>. Follow the prompts to connect your <code>AW-17978501655</code> Google Ads account.</li>
          <li>Enable <strong>Personalised advertising</strong> and <strong>Auto-tagging</strong>.</li>
          <li>Save.</li>
        </ol>

        <h2 id="step-6">Step 6 — Mark key conversions in GA4</h2>
        <p>
          GA4 automatically tracks some events, but you&apos;ll want to mark the
          ones that matter for your business as <strong>Key events</strong>
          (previously called &quot;Conversions&quot;):
        </p>
        <ol>
          <li>GA4 → <strong>Admin</strong> → <strong>Events</strong>. Wait 24 hours after initial install for events to start populating.</li>
          <li>For each event you care about (e.g. <code>form_submit</code>, <code>generate_lead</code>, <code>page_view</code> on <code>/smartspace-payment-success</code>), click the three-dot menu → <strong>Mark as key event</strong>.</li>
          <li>These will then appear in reports as trackable conversion actions.</li>
        </ol>

        <h2 id="what-you-get">What you&apos;ll see after 24–48 hours</h2>
        <ul>
          <li><strong>Reports → Realtime</strong>: live view of who&apos;s on the site and what they&apos;re looking at.</li>
          <li><strong>Reports → Acquisition → User acquisition</strong>: where traffic comes from (Google Ads, organic, direct, referrals).</li>
          <li><strong>Reports → Engagement → Pages and screens</strong>: which pages get visits, average engagement time, bounce rate.</li>
          <li><strong>Explore → Funnel exploration</strong>: build a funnel like &quot;landed on /services/doorbell → scrolled 50% → clicked Add to Cart → reached /smartspace-payment-success&quot;.</li>
          <li><strong>Explore → Path exploration</strong>: see the actual click paths users take through the site.</li>
        </ul>

        <h2 id="bonus">Bonus — Search Console integration</h2>
        <p>
          In GA4 → Admin → Product links → Search Console links → Link. Connects
          your Search Console property (smart-space.ie) so GA4 reports include
          organic search queries — shows you which keywords drive traffic AND
          which of those visitors convert.
        </p>

        <h2 id="when-done">When you&apos;re done</h2>
        <p>
          Send me the measurement ID (or just redeploy and refresh, the
          code picks it up automatically via the env var). From that point the
          site will feed GA4 for every visitor, and the Google Sheet will
          continue to log just the actual leads (with UTM / landing page /
          referrer attached now).
        </p>
      </div>
    </div>
  );
}

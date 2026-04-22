import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backlink Outreach Kit — Internal",
  description: "Internal backlink outreach kit for Smart Space.",
  robots: { index: false, follow: false },
};

export default function BacklinkOutreachPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose-ss">
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-900">
          <strong>Internal hand-off page.</strong> Not indexed by search engines. For Smart Space team use only.
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Backlink Outreach Kit</h1>
        <p className="text-gray-500 mb-10">
          A prioritised target list, three email templates, and a tracking schema for earning quality Irish backlinks to smart-space.ie. Work top-down — Tier 1 targets first.
        </p>

        <h2 id="targets">Target list (Ireland)</h2>

        <h3>Tier 1 — Direct partners &amp; distributor-level</h3>
        <ul>
          <li><strong>Ring (Amazon UK &amp; Ireland)</strong> — pitch for &quot;certified installer&quot; directory inclusion. Contact: Ring partner team, through official channels.</li>
          <li><strong>Amazon Ring Installation Partner program</strong> — apply for local listing.</li>
          <li><strong>Currys Ireland</strong> — if they stock Ring, offer in-store referral partnership.</li>
          <li><strong>Harvey Norman Ireland</strong> — similar retail referral opportunity.</li>
          <li><strong>B&amp;Q Ireland</strong> — smart home department, possible in-store leaflet partnership.</li>
        </ul>

        <h3>Tier 2 — Home security &amp; trade directories</h3>
        <ul>
          <li><strong>Boards.ie — Home &amp; Garden / Construction &amp; Planning</strong> — join as a contributing professional.</li>
          <li><strong>MyHome.ie / Daft.ie blogs</strong> — pitch a guest article on home security before moving in.</li>
          <li><strong>Construction Industry Register Ireland (CIRI)</strong> — check eligibility for listing.</li>
          <li><strong>Guaranteed Irish</strong> — membership-based, offers backlink in directory.</li>
          <li><strong>Dublin Chamber of Commerce</strong> — member directory listing.</li>
          <li><strong>Golden Pages Ireland</strong> — free basic listing.</li>
          <li><strong>Yelp Ireland</strong> — claim listing, complete profile.</li>
        </ul>

        <h3>Tier 3 — Irish media &amp; property publications</h3>
        <ul>
          <li><strong>Dublin Live (Reach plc)</strong> — pitch local-interest angle: &quot;Dublin&apos;s only 5-star Ring installer&quot;.</li>
          <li><strong>Irish Examiner home &amp; property section</strong> — pitch expert commentary on home security trends.</li>
          <li><strong>Irish Times property section</strong> — seasonal pitch (&quot;Best home security upgrades for autumn&quot;).</li>
          <li><strong>RTÉ Home of the Year</strong> — supplier credit if one of our installs is featured.</li>
          <li><strong>Newstalk Henry McKean / Home show</strong> — radio interview pitch around insurance and home security.</li>
          <li><strong>Hot Press home supplement</strong> — unlikely but worth a Dublin-angle pitch.</li>
        </ul>

        <h3>Tier 4 — Insurance and alarm-company cross-referrals</h3>
        <ul>
          <li><strong>AXA Home Insurance Ireland</strong> — discount-partner pitch. Supply install specification template.</li>
          <li><strong>Allianz Ireland</strong> — same pitch. Ask about their approved-installer list.</li>
          <li><strong>Aviva Ireland</strong> — same.</li>
          <li><strong>FBD Insurance</strong> — rural homeowner focus; good fit for Wicklow/Kildare/Meath.</li>
          <li><strong>Local alarm companies</strong> — offer Ring install as a complementary service referral (you do alarms, we do smart cameras).</li>
          <li><strong>Estate agents in Dublin &amp; commuter belt</strong> — offer new-home install referral discount.</li>
        </ul>

        <h2 id="templates">Email templates</h2>

        <h3>Template 1 — Partnership pitch (Tier 1 / Tier 4)</h3>
        <blockquote>
          Subject: Smart Space Ring-install referral partnership — [company name]
          <br /><br />
          Hi [name],
          <br /><br />
          I run Smart Space, the only 5-star Ring installer in Dublin. We&apos;ve completed
          over 5,000 Ring installs across Leinster and were named Three Ireland SME Business
          Winner 2025.
          <br /><br />
          I&apos;m reaching out because I think [company name] customers could benefit from a
          professional Ring install when they buy or upgrade. Two options I&apos;d love to discuss:
          <br /><br />
          1. A listing on your [directory / approved-installer] page — we&apos;re happy to
          supply a formal install specification that meets insurance requirements.
          <br />
          2. A referral arrangement where we offer your customers a small discount, and
          you get priority booking access.
          <br /><br />
          Happy to jump on a 15-minute call if it&apos;s useful. Link to our site: smart-space.ie
          <br /><br />
          Best,
          <br />
          Nigel — Smart Space
          <br />
          01 513 0424 · info@smart-space.ie
        </blockquote>

        <h3>Template 2 — Guest article pitch (Tier 2 / Tier 3)</h3>
        <blockquote>
          Subject: Guest article pitch — Irish home security in 2026
          <br /><br />
          Hi [editor name],
          <br /><br />
          I enjoyed your recent piece on [specific article title]. I&apos;m Nigel, owner of
          Smart Space — Dublin&apos;s #1 Ring installer — and I thought your readers might
          enjoy a practical piece on home security in Ireland.
          <br /><br />
          Three angles I could write about:
          <br />
          1. &quot;What Irish homeowners get wrong about Ring doorbells&quot; — a field-report
          style piece from 5,000+ installs.
          <br />
          2. &quot;Smart doorbells vs traditional intercoms in older Irish homes&quot; — a
          technical comparison with cost breakdowns.
          <br />
          3. &quot;How home security affects Irish home insurance premiums&quot; — a
          practical guide.
          <br /><br />
          Happy to write exclusively for [publication], 1,200–1,500 words, with original
          photography from Irish installations. No affiliate links. Just good, useful
          content for your readers.
          <br /><br />
          Let me know which angle, if any, appeals.
          <br /><br />
          Best,
          <br />
          Nigel
          <br />
          smart-space.ie · 01 513 0424
        </blockquote>

        <h3>Template 3 — Media expert-commentary pitch (Tier 3)</h3>
        <blockquote>
          Subject: Expert comment available — home security / Ring doorbell trends in Ireland
          <br /><br />
          Hi [journalist name],
          <br /><br />
          Following your coverage of [topic], I wanted to offer myself as a commentary
          source for future pieces on home security in Ireland.
          <br /><br />
          I&apos;m Nigel, owner of Smart Space — Dublin&apos;s only 5-star Ring installer —
          with 5,000+ installations across Leinster. I can speak to:
          <br /><br />
          — Trends in Irish home security (what&apos;s being installed in 2026)
          <br />
          — Garda-recommended home security setups
          <br />
          — Insurance premium reductions for properly-installed home security
          <br />
          — The rise of smart doorbells replacing older wired intercoms
          <br />
          — Eldercare technology: keeping older family members safe at home
          <br /><br />
          Happy to be quoted on background or on the record, in print, radio, or video.
          Short-notice availability for breaking stories.
          <br /><br />
          Best,
          <br />
          Nigel — Smart Space · 01 513 0424 · info@smart-space.ie
        </blockquote>

        <h2 id="cadence">Outreach cadence</h2>
        <ol>
          <li><strong>Week 1:</strong> Send 10 Tier 1 &amp; Tier 2 pitches (5 per week to avoid spam flags). Track opens if your email tool supports it.</li>
          <li><strong>Week 2:</strong> Follow up anyone who opened but didn&apos;t reply after 7 days (one short nudge — no more).</li>
          <li><strong>Week 3:</strong> 10 Tier 3 pitches. Customise per publication — generic pitches get binned.</li>
          <li><strong>Week 4:</strong> 10 Tier 4 pitches.</li>
          <li><strong>Month 2+:</strong> Repeat for the next batch. Aim for ~40 outreaches/month, convert ~5–10%.</li>
        </ol>

        <h2 id="tracking">Tracking spreadsheet columns</h2>
        <p>
          Create a Google Sheet called &quot;Smart Space Backlink Outreach&quot; with these columns:
        </p>
        <ul>
          <li>Target (organisation name)</li>
          <li>Tier (1–4)</li>
          <li>Contact name</li>
          <li>Contact email</li>
          <li>Contact role</li>
          <li>Pitch type (Partnership / Guest Article / Media / Directory)</li>
          <li>Date first sent</li>
          <li>Opened? (if trackable)</li>
          <li>Replied? (Y/N)</li>
          <li>Reply date</li>
          <li>Outcome (Link earned / In progress / Rejected / No response)</li>
          <li>Backlink URL (if earned)</li>
          <li>Backlink DR (Domain Rating — check with Ahrefs free checker)</li>
          <li>Notes</li>
        </ul>

        <h2 id="notes">Notes</h2>
        <ul>
          <li>Avoid spammy backlink-buying services. Google is very effective at spotting these and will penalise you.</li>
          <li>Prioritise .ie domains over .com where possible — they help local SEO signal.</li>
          <li>Any backlink from a major Irish news site (Tier 3) is worth 10–20 Tier 2 directory links.</li>
          <li>Guaranteed Irish and Dublin Chamber memberships have annual fees but tend to produce durable backlinks.</li>
          <li>Update the target list quarterly — editors change, directories get deprecated.</li>
        </ul>
      </div>
    </div>
  );
}

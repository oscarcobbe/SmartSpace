import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("what-broadband-speed-do-i-need-ireland")!;

/*
 * Written for the search "what broadband speed do I need", in an Irish home.
 * The short answer first (less than the gigabit plans suggest), a table of what
 * each use actually takes, how to add a household up, the upload point, what is
 * available in Ireland, and the catch that decides it: the plan is not what
 * reaches the room. Questions at the end double as FAQPage data.
 *
 * Every figure is a company's own or ComReg's, read 1 October 2026:
 *   - Netflix Help Center, "Internet connection speed recommendations":
 *     3 Mbps for HD (720p), 5 Mbps for Full HD (1080p), 15 Mbps for Ultra HD
 *     (4K), each per stream.
 *   - Microsoft Learn, "Prepare your organization's network for Teams":
 *     2,500 kbps up and 4,000 down for a meeting, 1,500 each way for a
 *     one-to-one call. Zoom, "Zoom system requirements": 3.8 up and 3.0 down
 *     for a 1080p HD group call.
 *   - ComReg, "Get the most out of your broadband & home phone": 1 Mbps each
 *     way for video calling and 0.25 down with 0.5 up for real-time gaming
 *     (its own illustrative estimates), speeds slower at peak times, more
 *     devices at once meaning more strain. ComReg, "All About Broadband" and
 *     the Broadband Checker (comreg.ie/broadbandchecker): full fibre typically
 *     up to 2 Gbps, cable up to 1 Gbps, part-fibre depending on the distance to
 *     the street cabinet. ComReg, "Your contract must include your broadband
 *     speed": minimum, normally available, maximum and advertised, upload
 *     included; and Best Tariff Advice at the end of a contract.
 *   - Ring, "Understanding wifi recommendations": 2 Mbps of upload per 1080p
 *     camera, added together.
 * It recommends no provider and no product. The assessment is described from
 * /services/wifi, and mentioned once.
 */

export const metadata: Metadata = {
  title: `${post.title} | Smart Space`,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${post.title} | Smart Space`,
    description: post.description,
    url: `${SITE}/blog/${post.slug}`,
    type: "article",
    publishedTime: post.datePublished,
    modifiedTime: post.dateModified,
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: post.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${post.title} | Smart Space`,
    description: post.description,
    images: ["/og-default.png"],
  },
};

const toc = [
  { id: "what-uses-what", label: "What each thing actually uses" },
  { id: "add-it-up", label: "Adding up a whole household" },
  { id: "upload", label: "Why upload matters more than people think" },
  { id: "what-ireland-offers", label: "What you can get in Ireland" },
  { id: "the-catch", label: "The catch: the plan is not what reaches the room" },
  { id: "how-much", label: "So how much should you pay for?" },
  { id: "faq", label: "Frequently asked questions" },
];

/* What each use needs per stream or per person, from the companies' own pages
   and ComReg, as listed in the comment at the top. */
const NEEDS = [
  { use: "Netflix, HD (720p)", down: "3 Mbps", up: "Very little" },
  { use: "Netflix, Full HD (1080p)", down: "5 Mbps", up: "Very little" },
  { use: "Netflix, 4K (Ultra HD)", down: "15 Mbps", up: "Very little" },
  { use: "Teams video meeting", down: "4 Mbps", up: "2.5 Mbps" },
  { use: "Zoom 1080p group call", down: "3 Mbps", up: "3.8 Mbps" },
  { use: "Online gaming", down: "0.25 Mbps", up: "0.5 Mbps" },
  { use: "Ring camera, 1080p", down: "Very little", up: "2 Mbps each" },
  { use: "Browsing and email", down: "A few Mbps", up: "Very little" },
];

const CELL = { paddingLeft: "0.5rem", paddingRight: "0.5rem" };

const FAQ = [
  {
    q: "Is 100 Mbps enough for a family in Ireland?",
    a: "For most families, yes. Even two 4K streams, a video call and a game at the same time add up to well under 100 Mbps of download. When a 100 Mbps plan feels slow, the cause is usually the Wi-Fi failing to carry it to the far rooms, or too little upload, rather than the size of the plan.",
  },
  {
    q: "Do I really need gigabit broadband?",
    a: "Rarely. Gigabit earns its keep if you regularly move very large files, or have several heavy users going at once, and only if your Wi-Fi and in-house wiring can actually carry that speed to where you sit. For most homes the money does more good spent getting the existing speed to every room.",
  },
  {
    q: "How much upload speed do I need?",
    a: "Enough for everything that uploads at the same time. Microsoft suggests about 2.5 Mbps for a Teams meeting, Ring asks for 2 Mbps for each 1080p camera, and cloud photo backups add more. Many Irish homes feel the upload running short before the download.",
  },
  {
    q: "Why is my broadband slow when I pay for a fast plan?",
    a: "Usually it is the Wi-Fi, not the plan. Plug a laptop into the router by cable and run a speed test: if the cabled result is fast and a room is slow, the plan is fine and the Wi-Fi is losing it on the way. If the cabled result itself is slow, that is the line, and your provider's to fix.",
  },
  {
    q: "What broadband speed do I need to work from home?",
    a: "Not a large one. A video call needs only a few megabits each way, but it needs them steadily and with enough upload, which a busy house or weak Wi-Fi can take away. Our working-from-home guide goes through what Teams and Zoom actually need.",
  },
];

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.description,
  image: `${SITE}/og-default.png`,
  datePublished: post.datePublished,
  dateModified: post.dateModified,
  author: { "@type": "Organization", name: "Smart Space", url: SITE },
  publisher: { "@id": `${SITE}/#organization` },
  mainEntityOfPage: `${SITE}/blog/${post.slug}`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc} cta={NETWORK_GUIDE_CTA}>
        <p>
          <strong>The short answer:</strong> less than the gigabit plans suggest. The things an ordinary Irish household
          does at once, streaming, a video call, a game, a couple of cameras, add up to a few tens of megabits per second,
          not hundreds. A 100 to 500 Mbps plan covers almost everyone. What usually decides whether broadband feels fast
          is not the number on the plan but two things the plan does not fix: how much upload you have, and whether the
          Wi-Fi in your house actually carries the speed to the room you are in.
        </p>

        <h2 id="what-uses-what">What each thing actually uses</h2>
        <p>Here is what the companies themselves publish for each use, per stream or per person:</p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {["Use", "Download", "Upload"].map((h) => (
                  <th key={h} style={CELL}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NEEDS.map((r) => (
                <tr key={r.use}>
                  <td style={CELL}>{r.use}</td>
                  <td style={CELL}>{r.down}</td>
                  <td style={CELL}>{r.up}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Streaming figures are Netflix&apos;s, per stream; Teams is Microsoft&apos;s recommended level for a meeting,
          Zoom&apos;s its 1080p group call, gaming is ComReg&apos;s own estimate, and the camera figure is Ring&apos;s for
          a 1080p camera, which it says to add together. The striking thing is how small they are. A single 4K film, the
          heaviest thing on the list, wants 15 Mbps.
        </p>

        <h2 id="add-it-up">Adding up a whole household</h2>
        <p>
          The way to size a plan is to add up what the house does at its busiest, which for most homes is a weekday
          evening. Take a full one:
        </p>
        <ul>
          <li>One TV on Netflix in 4K: 15 Mbps down.</li>
          <li>A second TV on Full HD: 5 Mbps down.</li>
          <li>Someone finishing a Teams meeting: 4 Mbps down and 2.5 Mbps up.</li>
          <li>A teenager gaming: very little bandwidth, but it wants low delay.</li>
          <li>Two 1080p cameras: 2 Mbps of upload each, so 4 Mbps up.</li>
          <li>Phones backing up photos in the background.</li>
        </ul>
        <p>
          That is roughly 25 Mbps of download and 6.5 Mbps of upload before the backups. A 100 Mbps plan has plenty of
          download headroom for it. ComReg makes the related point that the more devices are active at once, the more the
          line is asked to carry, and that speeds can be noticeably slower at peak times, so it is worth leaving room
          rather than sizing a plan to the exact total.
        </p>

        <h2 id="upload">Why upload matters more than people think</h2>
        <p>
          Plans are sold on the download number, the big one on the poster. But video calls, every clip a camera or
          doorbell sends, cloud backups and sending large files all use <em>upload</em>, and on many connections the
          upload is a fraction of the download. Full fibre tends to give generous upload; part-fibre and cable give much
          less. ComReg requires your contract to state the upload speeds as well as the download, so you can check before
          you sign.
        </p>
        <p>
          A home with a few cameras and someone on calls can run its upload close to full while the download sits almost
          idle, and when the upload fills, everything else queues behind it and calls start to stutter. If that is your
          house, a plan with more upload helps where a bigger download number would not.
        </p>

        <h2 id="what-ireland-offers">What you can get in Ireland</h2>
        <p>
          Before choosing a number, find out what your address can actually get. ComReg&apos;s Broadband Checker at{" "}
          <a href="https://www.comreg.ie/broadbandchecker" rel="noopener">comreg.ie/broadbandchecker</a> lists the
          connections available by address or Eircode. ComReg describes full fibre as typically delivering up to 2 Gbps
          and cable up to 1 Gbps, while part-fibre speeds depend on how far you are from the street cabinet. In practice
          most plans are sold around 100, 500 and 1,000 Mbps.
        </p>
        <p>
          Whatever you pick, the contract has to state the minimum, normally available, maximum and advertised speeds.
          The minimum and normally available figures, not the advertised one, are what to hold a cabled test against once
          you are connected.
        </p>

        <h2 id="the-catch">The catch: the plan is not what reaches the room</h2>
        <p>
          This is where most of the disappointment comes from. The speed on the plan is measured at the router. What you
          actually get in the back bedroom, the home office or the kitchen at the end of an extension is whatever the
          Wi-Fi carries there, and that can be a small fraction of it. A 1,000 Mbps plan that puts 40 Mbps into the far
          room is not a plan problem; it is a Wi-Fi problem, and upgrading the plan will not touch it.
        </p>
        <p>
          The way to see the difference is to test twice: once by cable at the router, once on Wi-Fi in the room. Our
          guides to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> and to{" "}
          <Link href="/blog/how-to-test-wifi-speed-room-by-room">testing room by room</Link> show how, and{" "}
          <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why the signal fades</Link> on the way through an Irish
          house. The <Link href="/wifi-check">free Wi-Fi check</Link> runs both tests and tells you the gap.
        </p>

        <h2 id="how-much">So how much should you pay for?</h2>
        <p>In order of what actually changes how fast broadband feels:</p>
        <ul>
          <li>
            <strong>Enough upload</strong> for the calls, cameras and backups that run at once. This is the one most
            households feel first.
          </li>
          <li>
            <strong>A line that delivers its contract.</strong> Test it by cable; if it is well below the minimum in your
            contract, that is worth a call to the provider before paying for a bigger plan.
          </li>
          <li>
            <strong>Wi-Fi that reaches every room.</strong> For most homes this does far more than extra megabits, because
            the far rooms are where the speed is being lost.
          </li>
          <li>
            <strong>Then the download number.</strong> 100 to 500 Mbps suits almost everyone. Gigabit is worth it only if
            you regularly move very large files or have many heavy users at once, and only if your Wi-Fi and wiring can
            carry it to where you sit.
          </li>
        </ul>
        <p>
          At the end of a contract you are entitled to Best Tariff Advice from your provider, which tells you whether a
          cheaper plan would suit the way you actually use it.
        </p>
        <p>
          If a room never gets near what you pay for, that is the part we measure. Our{" "}
          <Link href="/services/wifi">home network assessment</Link> tests the broadband at the router by cable, measures
          every floor, and leaves a working powerline and access point trial on the floor that struggles for three days,
          with the figures in a written report. It is €395, credited in full against any work, in Dublin and the rest of
          Leinster.
        </p>

        <h2 id="faq">Frequently asked questions</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </BlogLayout>
    </>
  );
}

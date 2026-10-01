import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("working-from-home-wifi-ireland")!;

/*
 * Written for the question people put to ChatGPT and the other assistants:
 * why do my Teams or Zoom calls keep dropping when I work from home, and how
 * do I fix my Wi-Fi for it in Ireland. The short answer comes first, the
 * headings are questions, one table says what each activity needs, and the
 * questions at the end are also FAQPage data.
 *
 * Every figure is from a page read on 30 September 2026:
 *   - Microsoft Learn, "Prepare your organization's network for Teams"
 *     (updated 14 July 2026): recommended 1,500/1,500 kbps (up/down) for
 *     one-to-one video, 2,500 up and 4,000 down for meetings, 58/58 for
 *     audio; Teams putting audio before video when bandwidth is short; jitter
 *     and packet loss behind calls that cut out and robotic voices; 5 GHz
 *     better suited to real-time media than 2.4 GHz; QoS or WMM for media
 *     traffic; Teams traffic bypassing the VPN.
 *   - Microsoft Learn, "Microsoft 365 network connectivity test tool": a
 *     Teams connection passes with packet loss under 1%, latency under 100
 *     ms and jitter under 30 ms.
 *   - Zoom, "Zoom system requirements: Windows, macOS, Linux": 2.6/1.8 Mbps
 *     (up/down) for a 720p HD group call, 3.8/3.0 for 1080p HD; no latency
 *     target. Zoom, "Joining a Zoom test meeting" (zoom.us/test); Microsoft
 *     Support, Teams device settings, for the test call.
 *   - ComReg, "Get the most out of your broadband & home phone" (modified 8
 *     May 2026): 1 Mbps each way for video calling, 0.25 down and 0.5 up for
 *     real-time gaming (its own illustrative estimates), wired always more
 *     reliable, a central router, many devices active at once, slower at peak
 *     times, the Broadband Checker, Best Tariff Advice. ComReg, "Your contract
 *     must include your broadband speed" (21 November 2025).
 *   - Virgin Media Ireland, "How can I improve my Wi-Fi signal": the Hub in
 *     the open, walls and baby monitors, 2.4 GHz against 5 GHz, a cable for
 *     any device that can take one, large downloads late at night, and a
 *     restart letting the Hub pick the best channel.
 *   - Netflix Help Center: 15 Mbps for 4K. Ring, "Understanding wifi
 *     recommendations": 2 Mbps upload per 1080p device, added together.
 *   - TP-Link FAQ 1104 (QoS, updated 14 May 2026) and FAQ 1794 (Deco Ethernet
 *     backhaul, updated 17 April 2026: lower latency, no bandwidth lost to a
 *     wireless hop). Microsoft Support, "Change the OneDrive sync app upload
 *     or download rate".
 *
 * The assessment is described from /services/wifi and src/data/wifiPackages.ts,
 * and mentioned once in the body.
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
  { id: "why-calls-drop", label: "Why do calls drop when the speed test looks fine?" },
  { id: "what-calls-need", label: "What do Teams and Zoom actually need?" },
  { id: "busy-house", label: "Why does a busy house break calls up?" },
  { id: "fixes", label: "How do I fix the Wi-Fi at my desk?" },
  { id: "the-line", label: "What if the problem is the broadband line?" },
  { id: "before-a-call", label: "What should I check before an important call?" },
  { id: "measured", label: "When is it worth getting the home office measured?" },
  { id: "questions", label: "What else do people ask?" },
];

/* What each activity needs, per person or per device. The figures are the
   companies' own and ComReg's, as listed in the comment at the top. */
const NEEDS = [
  { use: "Teams video call, one to one", up: "1.5 Mbps", down: "1.5 Mbps", latency: "Under 100 ms*" },
  { use: "Teams video meeting", up: "2.5 Mbps", down: "4 Mbps", latency: "Under 100 ms*" },
  { use: "Teams, voice only", up: "58 kbps", down: "58 kbps", latency: "Under 100 ms*" },
  { use: "Zoom group call, 720p HD", up: "2.6 Mbps", down: "1.8 Mbps", latency: "None published" },
  { use: "Zoom group call, 1080p HD", up: "3.8 Mbps", down: "3.0 Mbps", latency: "None published" },
  { use: "Netflix in 4K", up: "Very little", down: "15 Mbps a stream", latency: "Not sensitive: it buffers" },
  { use: "Online gaming", up: "0.5 Mbps", down: "0.25 Mbps", latency: "Sensitive: it is live" },
  { use: "Ring camera, 1080p", up: "2 Mbps each", down: "-", latency: "-" },
];

/* Narrower side padding than the other guides' tables, so four columns fit a
   phone without the page scrolling sideways. */
const CELL = { paddingLeft: "0.5rem", paddingRight: "0.5rem" };

/* Shown at the end of the guide and sent as FAQPage data, so the two match. */
const FAQ = [
  {
    q: "How much upload speed do I need for Teams or Zoom calls?",
    a: "Microsoft recommends 1.5 Mbps each way for a one-to-one Teams video call and 2.5 Mbps up for a meeting; Zoom, 2.6 Mbps up for a 720p HD group call. Add whatever else in the house uploads at the same time.",
  },
  {
    q: "Is 2.4 GHz or 5 GHz better for video calls?",
    a: "5 GHz, where it reaches. Microsoft says it suits real-time media better, and that 2.4 GHz is often affected by other household devices. If 5 GHz will not reach the desk, bring the Wi-Fi closer.",
  },
  {
    q: "Will a faster broadband package stop my calls dropping?",
    a: "Only if the line is the problem. If a cabled test at the router is fine and the desk is not, it is the Wi-Fi. If the house fills its upload, a plan with more upload will help.",
  },
  {
    q: "Should I turn off my camera if the connection is poor?",
    a: "If the picture is breaking up, yes. Microsoft recommends 58 kbps for Teams audio against 1.5 Mbps for one-to-one video, and Teams protects audio first when bandwidth runs short.",
  },
  {
    q: "Can a work VPN make Teams calls worse?",
    a: "It can. Microsoft recommends that Teams traffic bypass the VPN, as VPNs are not usually designed for real-time media and can add delay. Ask your employer's IT team rather than switching it off yourself.",
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
          A video call that freezes or cuts out is rarely about the download number on your broadband bill. A call cannot
          buffer ahead the way Netflix does, so it is the first thing to suffer when the Wi-Fi or the line gets busy.
        </p>
        <p>
          <strong>The short answer:</strong> Teams and Zoom need only a few megabits per second each way, but steadily,
          with little delay. Calls drop when the upload is shared with the rest of the house, when the laptop is on a weak
          Wi-Fi signal, or when the connection slows as someone else streams. The fixes: a cable to the desk, the 5 GHz
          band, a better router position, priority for your laptop, and mesh linked by cable. If a cabled test at the
          router is poor too, it is the line, and your provider&apos;s to fix.
        </p>

        <h2 id="why-calls-drop">Why do calls drop when the speed test looks fine?</h2>
        <p>
          A speed test gives three numbers: download, how fast data reaches you; upload, how fast it leaves; and ping, or
          latency, how long a round trip takes. A call uses all three at once, sending your camera and microphone out
          live.
        </p>
        <p>
          On many packages the upload is a fraction of the download. And a connection that answers quickly when idle can slow badly while something else downloads, which a call notices at once.
          Microsoft links calls that cut out, and voices that sound like robots, to jitter and packet loss: data arriving
          unevenly, or not at all.
        </p>

        <h2 id="what-calls-need">What do Teams and Zoom actually need?</h2>
        <p>What Microsoft and Zoom publish for each person on a call, beside what else a house does at the same time:</p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {["Activity", "Upload", "Download", "Latency"].map((h) => (
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
                  <td style={CELL}>{r.up}</td>
                  <td style={CELL}>{r.down}</td>
                  <td style={CELL}>{r.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Teams figures are Microsoft&apos;s recommended level, Zoom&apos;s its recommended bandwidth, and gaming is
          ComReg&apos;s estimate. *Microsoft&apos;s connectivity test passes a Teams connection with latency under 100 ms,
          jitter under 30 ms and packet loss under 1 per cent.
        </p>
        <p>
          None of this is large: ComReg puts the minimum for video calling at 1 Mbps each way. The problem is rarely the
          size of the connection, but what else is using it and how well the Wi-Fi carries it to the desk.
        </p>

        <h2 id="busy-house">Why does a busy house break calls up?</h2>
        <p>
          The house shares one broadband line and one Wi-Fi network. ComReg makes the point too: the more devices active
          at once, the more the line struggles, especially with video. Add up an ordinary weekday afternoon:
        </p>
        <ul>
          <li>You, in a Teams meeting: 2.5 Mbps up and 4 Mbps down.</li>
          <li>Two 1080p Ring cameras: 2 Mbps of upload each, which Ring says to add together.</li>
          <li>Netflix in 4K in the next room: 15 Mbps down.</li>
          <li>A phone backing up photos to the cloud, and a console downloading an update.</li>
        </ul>
        <p>
          That is 6.5 Mbps of upload before the backup starts. Once the upload is full, everything queues, the delay
          climbs, and the call notices first. Virgin Media&apos;s advice is to leave large downloads until late at night, and our
          guide to{" "}<Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices on the Wi-Fi</Link>{" "}
          covers what a full network does to everything sharing it.
        </p>

        <h2 id="fixes">How do I fix the Wi-Fi at my desk?</h2>

        <h3>Can you run a cable to the desk?</h3>
        <p>
          A network cable from the router to the laptop takes the Wi-Fi out of the call. ComReg says a wired connection
          will always be more reliable, and Virgin Media recommends a cable for any device that can take one. Laptops
          without a network socket take a USB adapter.
        </p>

        <h3>Is the laptop on the 5 GHz band?</h3>
        <p>
          Virgin Media describes 2.4 GHz as reaching further but slower, and 5 GHz as faster but working well only closer
          to the router. Microsoft says 5 GHz is better suited to real-time media, and that 2.4 GHz is often affected by
          other household devices. If the bands show as separate network names, join 5 GHz at the desk; if it will not reach,
          the desk is too far from the router.
        </p>

        <h3>Where is the router?</h3>
        <p>
          Routers sit wherever the line came in: the hall, behind the TV, a press under the stairs. Virgin Media advises
          against tucking one behind a TV or in a cabinet, and says walls weaken the signal while baby monitors interfere
          with it. ComReg suggests a central spot: in the open, and closer to where you work if you can.
        </p>

        <h3>Can the router put your laptop first?</h3>
        <p>
          QoS (Quality of Service) lets a router put some traffic first. TP-Link describes it as prioritising specific
          devices when you need them most, and Microsoft recommends it, or its Wi-Fi form WMM, for call traffic. Not every
          router has it: look in the settings for QoS or device priority, and pick your work laptop.
        </p>

        <h3>Would mesh with a wired link help?</h3>
        <p>
          For a desk upstairs, at the back of an extension or in a garden office, a mesh unit nearby helps, but only as
          much as its link to the router allows. TP-Link says a cable between units gives lower latency and loses
          no bandwidth to a wireless hop. Where a cable cannot be run, powerline can carry that link. See our guides to{" "}
          <Link href="/blog/mesh-wifi-explained">mesh Wi-Fi</Link> and to{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">extenders, mesh and powerline</Link>.
        </p>

        <h2 id="the-line">What if the problem is the broadband line?</h2>
        <p>
          Before buying anything, plug a laptop into the router by cable and run a speed test when your calls usually break
          up; ComReg notes speeds can be noticeably slower at peak times. Then test at the desk. Our guides to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> and to{" "}
          <Link href="/blog/how-to-test-wifi-speed-room-by-room">testing room by room</Link> go through both. The{" "}
          <Link href="/wifi-check">free Wi-Fi check</Link> also measures how quickly the connection answers while busy,
          which is what calls feel.
        </p>
        <p>
          ComReg says your contract must state the minimum, normally available, maximum and advertised speeds, upload
          included. If the cabled result is well below the minimum, ring your provider with the figures.
        </p>

        <h3>When is it worth changing your broadband plan?</h3>
        <p>
          When the line delivers what the contract says and it is still not enough. Add up the upload your house uses at
          once; if it comes close to your contract&apos;s upload, a plan with more upload will help and better Wi-Fi will
          not. ComReg&apos;s Broadband Checker shows what is available at your address, and at the end of a contract you
          are entitled to Best Tariff Advice from your provider. Our guide to{" "}<Link href="/blog/what-broadband-speed-do-i-need-ireland">what broadband speed you actually need</Link> helps you size it.
        </p>

        <h2 id="before-a-call">What should I check before an important call?</h2>
        <ol>
          <li>Plug in by cable, or sit where the laptop holds the 5 GHz network.</li>
          <li>
            Pause cloud backups and big downloads. OneDrive, for one, can cap its upload rate in its settings.
          </li>
          <li>Ask the house to hold off on 4K streaming for the hour.</li>
          <li>
            Make a test call: zoom.us/test for Zoom, or Settings, Devices, Make a test call in the Teams desktop app.
          </li>
          <li>
            If the Wi-Fi has been patchy, restart the router well beforehand. Virgin Media says a restart lets its Hub pick
            the best channel.
          </li>
          <li>If the picture breaks up, turn your camera off. Voice needs a fraction of the upload.</li>
        </ol>

        <h2 id="measured">When is it worth getting the home office measured?</h2>
        <p>
          When the cabled test at the router is fine, the desk is not, and a cable is not practical. That is what our{" "}
          <Link href="/services/wifi">€395 home network assessment</Link> is for: a two-hour visit that tests the broadband
          at the router by cable and measures every room, then a working trial system left for three days on the floor
          that struggles, with your own Wi-Fi on beside it to compare. You get the figures in a written report, and the €395
          is credited in full against any work. Dublin and the rest of Leinster.
        </p>

        <h2 id="questions">What else do people ask?</h2>
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

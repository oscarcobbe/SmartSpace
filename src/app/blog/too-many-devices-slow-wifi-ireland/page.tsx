import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("too-many-devices-slow-wifi-ireland")!;

/*
 * Written for the search "too many devices on wifi" / "is my wifi overloaded",
 * in an Irish home. The short answer first (Wi-Fi is shared airtime, devices
 * take turns), how a houseful of devices and the slow old ones on 2.4 GHz use
 * it up, the fixes that add capacity rather than just coverage, and the point
 * that coverage and capacity are different problems. Questions at the end
 * double as FAQPage data.
 *
 * Sources, read 1 October 2026:
 *   - ComReg, "Get the most out of your broadband & home phone": the more
 *     devices active at once, the more the line struggles, and a wired
 *     connection is always more reliable.
 *   - TP-Link FAQ 499: the 2.4 GHz band is more crowded and slower, with fewer
 *     devices on 5 GHz; its QoS guidance on prioritising specific devices; the
 *     Deco Ethernet backhaul FAQ (a cabled link loses no bandwidth to a
 *     wireless hop). Microsoft Learn on OneDrive: capping the upload rate.
 *   - The airtime explanation (Wi-Fi is half-duplex: one device transmits on a
 *     channel at a time, and the rest wait their turn) is standard Wi-Fi
 *     behaviour, stated plainly rather than attributed to a product.
 * It recommends no product. Wi-Fi 6's handling of a busy house is covered in
 * and linked to the Wi-Fi 6 guide. The assessment is described from
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
  { id: "how-many", label: "How many devices is a lot?" },
  { id: "why-it-slows", label: "Why more devices slow the Wi-Fi down" },
  { id: "old-devices", label: "The slow old devices on the crowded band" },
  { id: "one-device", label: "When one device hogs it all" },
  { id: "fixes", label: "How to add capacity, not just coverage" },
  { id: "coverage", label: "Coverage and capacity are different problems" },
  { id: "faq", label: "Frequently asked questions" },
];

const FAQ = [
  {
    q: "How many devices can a home router handle?",
    a: "It depends on the router. A basic one supplied with a broadband package can start to slow with twenty or thirty active devices, while a modern dual or tri-band router with band steering handles far more. What matters is not how many are connected but how many are actually sending or receiving at the same moment.",
  },
  {
    q: "Do smart home devices slow down Wi-Fi?",
    a: "They can, especially cheaper ones that sit on the crowded 2.4 GHz band and talk constantly. On their own each uses little, but a houseful of plugs, bulbs, cameras and speakers adds up. Keeping them on 2.4 GHz and your phones, laptops and TVs on 5 GHz keeps the two out of each other's way.",
  },
  {
    q: "Why does my Wi-Fi slow down when everyone is home?",
    a: "Wi-Fi is shared airtime: on a given channel only one device transmits at a time and the rest wait their turn, very quickly. The more devices are active at once, the longer each waits, so an evening with everyone streaming and calling is when it shows. ComReg makes the same point about the line struggling as more devices come on.",
  },
  {
    q: "Will a mesh system fix a house with too many devices?",
    a: "A mesh helps coverage, getting a signal into every room, but capacity in a busy house comes more from spreading devices across the bands, wiring the heavy fixed ones, and a router built for a busy home. A mesh whose units talk to each other over Wi-Fi can even use some of the airtime itself.",
  },
  {
    q: "Should I put my smart devices on a separate network?",
    a: "Putting the always-on smart devices on the 2.4 GHz band, or on a guest network, keeps them from competing with the devices you actually watch and wait on. It also helps security by keeping them apart from your phones and laptops, which our guide to securing a home network covers.",
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
          <strong>The short answer:</strong> Wi-Fi is shared airtime. On any one channel only a single device transmits at
          a time, and the rest wait their turn, which happens so fast you never normally notice it. Add enough devices,
          especially slow old ones on the crowded 2.4 GHz band, and the turns pile up until everything is waiting. A basic
          router juggling thirty or forty connections struggles where a newer one copes. The fix is rarely a bigger
          broadband plan: it is spreading devices across the bands, wiring the heavy ones so they leave the air, and in
          some homes a router built for a busy house.
        </p>

        <h2 id="how-many">How many devices is a lot?</h2>
        <p>
          More than most people would guess, once you actually count. A fairly ordinary family home now carries:
        </p>
        <ul>
          <li>A phone, a watch and often a tablet for each person.</li>
          <li>A laptop or two, and a work laptop.</li>
          <li>Every television, plus a streaming stick or a games console on each.</li>
          <li>The doorbell and any security cameras.</li>
          <li>Smart speakers, a printer, maybe a robot vacuum.</li>
          <li>Smart plugs, bulbs, a thermostat, a heating controller.</li>
        </ul>
        <p>
          It is easy to pass thirty without owning anything unusual. Most sit quiet most of the time, so the question is
          never how many are connected, but how many are awake and talking at once, which is highest in the evening.
        </p>

        <h2 id="why-it-slows">Why more devices slow the Wi-Fi down</h2>
        <p>
          Wi-Fi works like a single conversation in a room: one device speaks on a channel at a time while the others
          hold back, then takes its turn. It is quick enough that a handful of devices never have to wait long. But the
          time on the channel is shared out among all of them, so as the number talking at once climbs, each one waits a
          little longer for its turn, and the connection starts to feel sluggish even though the broadband line is nowhere
          near full. ComReg, the communications regulator, makes the same point from the line&apos;s side: the more
          devices active at once, the more it struggles.
        </p>

        <h2 id="old-devices">The slow old devices on the crowded band</h2>
        <p>
          Not every device costs the same amount of airtime. Older and cheaper ones, most smart plugs and bulbs among
          them, can only use the 2.4 GHz band, which TP-Link describes as the crowded one: slower, with few channels and
          many devices competing. A slow device takes longer to say the same thing, so it holds the channel for longer,
          and a dozen chatty smart-home gadgets on 2.4 GHz can get in the way of the laptop trying to use the same band.
        </p>
        <p>
          The answer is to keep them apart: let the always-on smart devices sit on 2.4 GHz, and put the phones, laptops
          and televisions you actually wait on across onto 5 GHz, which is faster and far less crowded. Many routers do
          this for you with band steering under a single network name.
        </p>

        <h2 id="one-device">When one device hogs it all</h2>
        <p>
          Sometimes it is not the count but a single device. A phone or computer uploading a big photo or video backup can
          fill the connection on its own, and once it is full everything else queues behind it: the delay climbs and
          calls and games, which cannot wait, suffer first. It is the same effect behind a lot of{" "}
          <Link href="/blog/working-from-home-wifi-ireland">dropped Teams and Zoom calls</Link>. Pausing cloud backups at
          busy times helps, and Microsoft&apos;s OneDrive, for one, can be set to cap its upload rate so it never takes
          the whole line.
        </p>

        <h2 id="fixes">How to add capacity, not just coverage</h2>
        <p>These add room for more devices, in roughly the order worth trying them:</p>
        <ul>
          <li>
            <strong>Spread the devices across the bands.</strong> Free, and the single biggest help: smart-home devices on
            2.4 GHz, the things you watch and wait on across onto 5 GHz. Turn on band steering if the router has it.
          </li>
          <li>
            <strong>Wire the heavy, fixed devices.</strong> A smart TV, a desktop, a console or a camera base plugged in
            by a network cable, or by <Link href="/blog/powerline-adapters-ireland">powerline</Link> where a cable cannot
            be run, leaves the air entirely and frees airtime for everything still on Wi-Fi. ComReg notes a wired
            connection is always more reliable, and our guide to{" "}
            <Link href="/blog/running-ethernet-cable-existing-house-ireland">running cable in an existing house</Link>{" "}
            shows the routes that avoid tearing up walls.
          </li>
          <li>
            <strong>Prioritise the device that matters.</strong> Many routers have QoS, which TP-Link describes as putting
            specific devices first when you need them most. Point it at the work laptop or the main TV.
          </li>
          <li>
            <strong>Replace an old single-band router.</strong> A newer router handles a busy house far better, as our
            guide to <Link href="/blog/wifi-6-wifi-7-new-router-ireland">Wi-Fi 6, 6E and 7</Link> explains, because it can
            serve several devices in one go rather than strictly one after another.
          </li>
        </ul>

        <h2 id="coverage">Coverage and capacity are different problems</h2>
        <p>
          It is worth being clear about this, because the usual shop advice for any Wi-Fi complaint is to buy a mesh or an
          extender. That is a fix for <em>coverage</em>: getting a signal into a room that had none. A house that is slow
          because too much is on it at once has a <em>capacity</em> problem, and more access points do not add capacity if
          the units feed each other over Wi-Fi, since that link uses airtime too. Capacity comes from the bands, from
          wiring the heavy devices off the air, and from a router built for a busy home. Our guide to{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">extender, mesh or powerline</Link> and to{" "}
          <Link href="/blog/mesh-wifi-explained">mesh Wi-Fi</Link> sort out which problem each one actually solves. An
          evening slowdown often mixes the two, which our guide to{" "}
          <Link href="/blog/wifi-slow-in-the-evening-ireland">Wi-Fi that slows after tea</Link> untangles.
        </p>
        <p>
          If the house is busy and you cannot tell whether it needs capacity, coverage or a different plan, that is what
          our <Link href="/services/wifi">home network assessment</Link> is for. It tests the broadband at the router by
          cable, measures every floor with the house as it really is, and leaves a working powerline and access point
          trial on the floor that struggles for three days, with the figures in a written report. It is €395, credited in
          full against any work, in Dublin and the rest of Leinster. To start for free, run the{" "}
          <Link href="/wifi-check">Wi-Fi check</Link> in the room that struggles.
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

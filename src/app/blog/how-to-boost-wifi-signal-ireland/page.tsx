import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("how-to-boost-wifi-signal-ireland")!;

/*
 * The head-term guide for "how to boost my wifi", written honestly: the free
 * moves that work, the kit that works when it is the right kit, and the hacks
 * and gadgets that do nothing. It is the overview of the home network cluster,
 * so it routes to the specific guides rather than repeating them. Short answer
 * first, question headings, and the questions again at the end as FAQPage data.
 *
 * Sources, read 1 October 2026:
 *   - ComReg, "Get the most out of your broadband & home phone": a central
 *     router, a wired connection always more reliable, speeds slower at peak
 *     times, more devices meaning more strain.
 *   - Virgin Media Ireland, "How can I improve my Wi-Fi signal": the Hub in the
 *     open and not in a cabinet, walls, metal, large mirrors and baby monitors,
 *     2.4 GHz against 5 GHz, a cable for any device that can take one, and a
 *     restart letting the Hub pick the best channel.
 *   - NETGEAR: router placement, and that 2.4 GHz gives the most coverage and
 *     6 GHz the least because higher frequencies get through walls less well.
 *   - TP-Link: FAQ 499 (2.4 GHz crowded; microwaves and cordless phones),
 *     firmware updates often improving performance, and that a basic extender
 *     listens and talks on the same radio, so it passes on only part of the
 *     speed and must sit where the signal is still good.
 *   - ComReg, "Mobile Phone Repeaters": only compliant mobile repeaters are
 *     legal, which is a different device from a Wi-Fi booster.
 * The foil and app points are plain radio facts (metal reflects; software
 * cannot add signal), stated as such, not attributed to a study. It recommends
 * no product. The assessment is described from /services/wifi, mentioned once.
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
  { id: "measure-first", label: "Measure before you spend" },
  { id: "free", label: "What actually works, for free" },
  { id: "worth-it", label: "What is worth paying for" },
  { id: "waste", label: "What is a waste of money" },
  { id: "match", label: "Match the fix to the problem" },
  { id: "faq", label: "Frequently asked questions" },
];

const FAQ = [
  {
    q: "Does putting tin foil behind the router boost Wi-Fi?",
    a: "Not reliably. Metal reflects the signal, so a sheet of foil or a cut drinks can can nudge it in one direction, but it cannot push it through a wall, and it is as likely to make things worse. Moving the router into the open does far more, for nothing.",
  },
  {
    q: "Do Wi-Fi booster apps work?",
    a: "No. An app on your phone cannot add radio signal; the signal comes from the router and your phone's aerial, neither of which an app changes. The apps that are honest just show you the signal or help you reconnect.",
  },
  {
    q: "Is it better to buy a Wi-Fi extender or a faster broadband plan?",
    a: "Neither bought blind. Test by cable at the router first: if that is fast and a room is slow, it is the Wi-Fi, so a bigger plan will not help, and an extender helps only if it sits where it still hears the router well. If the cabled test is slow too, it is the line, and then the plan matters.",
  },
  {
    q: "What is the cheapest way to boost Wi-Fi?",
    a: "Free, in this order: move the router into the open and up off the floor, use the 5 GHz band on devices near it, restart the router so it picks a clearer channel, update its firmware, and move it away from the microwave, cordless phone and any baby monitor.",
  },
  {
    q: "Why did my Wi-Fi booster not help?",
    a: "Usually it was plugged in where the signal was already weak, so it rebroadcast a weak signal. Sometimes the real limit was the broadband line, not coverage, so nothing in the house would have helped. And a basic extender can make a second network your devices cling to instead of moving to the stronger one.",
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
          <strong>The short answer:</strong> most of what genuinely boosts a home Wi-Fi signal is free. Move the router
          into the open, use the 5 GHz band on devices near it, restart it, update it, and keep it away from
          interference. When the free moves are not enough, the kit that helps is the kit matched to your problem: mesh
          for a weak signal spread across a house, powerline or a cabled access point for a floor cut off by walls, a
          newer router for a busy house. What does nothing: foil and tin-can hacks, phone apps that claim to boost
          signal, buying a booster without knowing where to put it, and paying for a faster broadband plan when the
          Wi-Fi, not the line, is the limit. Measure first.
        </p>

        <h2 id="measure-first">Measure before you spend</h2>
        <p>
          Almost every wasted purchase comes from skipping this. Plug a laptop into the router with a network cable and
          run a speed test, then test on Wi-Fi in the room that struggles, on the same device. If it is slow even on the
          cable at the router, the problem is the broadband line, and no amount of Wi-Fi kit will fix it. If the router
          is fast and the room is slow, it is the Wi-Fi, and now it is worth spending. Our guides to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> and to{" "}
          <Link href="/blog/how-to-test-wifi-speed-room-by-room">testing room by room</Link> show how, and the{" "}
          <Link href="/wifi-check">free Wi-Fi check</Link> runs both tests for you.
        </p>

        <h2 id="free">What actually works, for free</h2>
        <p>Try these first, and test after each one. They cost nothing and fix a surprising number of houses.</p>
        <ul>
          <li>
            <strong>Move the router.</strong> Central, out in the open, up off the floor, and away from the microwave,
            the cordless phone base, any baby monitor, metal and large mirrors. ComReg, Virgin Media Ireland and NETGEAR
            all agree on this, and it is the single biggest free gain. More in our guide to{" "}
            <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why Wi-Fi fades upstairs</Link>.
          </li>
          <li>
            <strong>Use 5 GHz near the router.</strong> It is faster and far less crowded than 2.4 GHz. Keep older
            devices and far rooms on 2.4 GHz, which reaches further.
          </li>
          <li>
            <strong>Restart the router.</strong> Virgin Media says this lets it pick the best channel, and it clears a
            router that has been running for weeks.
          </li>
          <li>
            <strong>Update the firmware.</strong> TP-Link notes updates often improve performance and stability.
          </li>
          <li>
            <strong>Turn off Wi-Fi power saving</strong> on a device that keeps dropping, and if your router allows it,
            try a less crowded channel by hand.
          </li>
        </ul>
        <p>
          If the trouble is a connection that cuts out rather than one that is simply slow, our guide to{" "}
          <Link href="/blog/why-does-my-wifi-keep-dropping-ireland">why Wi-Fi keeps dropping</Link> goes through the
          causes.
        </p>

        <h2 id="worth-it">What is worth paying for (when it is the right fix)</h2>
        <p>
          When the free moves are not enough, match the spend to the problem rather than buying the first box on the
          shelf. Our guide to{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">extender, mesh or powerline</Link> sets them side by
          side; in short:
        </p>
        <ul>
          <li>
            <strong>A weak signal spread across a house:</strong> a{" "}
            <Link href="/blog/mesh-wifi-explained">mesh system</Link>, where the link between the units decides
            everything.
          </li>
          <li>
            <strong>A floor or room cut off by walls, with no cable route:</strong>{" "}
            <Link href="/blog/powerline-adapters-ireland">powerline</Link> carrying the connection over the electrical
            wiring to an access point.
          </li>
          <li>
            <strong>The steadiest fix of all:</strong> a{" "}
            <Link href="/blog/running-ethernet-cable-existing-house-ireland">network cable to an access point</Link>,
            which gets past every wall in the way.
          </li>
          <li>
            <strong>A busy house on an old single-band router:</strong> a{" "}
            <Link href="/blog/wifi-6-wifi-7-new-router-ireland">newer router</Link>, which copes better with many
            devices at once. Our guide to{" "}
            <Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices</Link> covers that case.
          </li>
        </ul>

        <h2 id="waste">What is a waste of money</h2>
        <p>These come up again and again, and they do not work.</p>
        <ul>
          <li>
            <strong>Foil, tin cans and DIY reflectors behind the router.</strong> Metal reflects the signal, so at most
            these nudge it in one direction. They cannot push it through a wall, and they are as likely to make things
            worse as better.
          </li>
          <li>
            <strong>Phone apps that promise to boost your signal.</strong> Software cannot add radio signal. The signal
            comes from the router and your device&apos;s aerial, and an app changes neither. The honest ones only show
            you the signal or help you reconnect.
          </li>
          <li>
            <strong>A booster or extender bought without a plan for where it goes.</strong> TP-Link points out that a
            basic extender has to listen and talk on the same radio, so it passes on only part of the speed, and it has
            to sit where the signal is still good. Plugged into the dead room, it just rebroadcasts a weak signal.
          </li>
          <li>
            <strong>A faster broadband plan, when the Wi-Fi is the limit.</strong> A 1,000 Mbps plan cannot get past the
            walls to the far bedroom. If the cabled test at the router was already fine, the plan is not the problem.
            Our guide to <Link href="/blog/what-broadband-speed-do-i-need-ireland">what broadband speed you need</Link>{" "}
            covers when a plan is worth changing and when it is not.
          </li>
          <li>
            <strong>A new camera, when the camera was never the fault.</strong> Nine times in ten a camera that keeps
            going offline is a Wi-Fi problem, as our guide to{" "}
            <Link href="/blog/smart-camera-wifi-drops-irish-homes">cameras that drop the signal</Link> explains.
          </li>
          <li>
            <strong>A mobile signal booster, for Wi-Fi.</strong> That is a different device, for phone reception rather
            than Wi-Fi, and ComReg says only compliant repeaters may be used. Our guide to{" "}
            <Link href="/blog/wifi-calling-ireland">Wi-Fi calling</Link> covers poor mobile coverage at home.
          </li>
        </ul>

        <h2 id="match">Match the fix to the problem</h2>
        <p>What the two tests tell you, and where to go next:</p>
        <ul>
          <li>
            <strong>Slow everywhere, including on a cable at the router:</strong> the line. Take the figures to your
            provider; better Wi-Fi will not help.
          </li>
          <li>
            <strong>Fast at the router, slow in a far room:</strong> coverage. Move the router first, then mesh,
            powerline or a cabled access point.
          </li>
          <li>
            <strong>Fine until the whole house is online:</strong> capacity. Spread devices across the bands, wire the
            heavy ones, and consider a newer router.
          </li>
          <li>
            <strong>Fine by day, slow in the evening:</strong> congestion. Restart for a clearer channel and move to
            5 GHz; see <Link href="/blog/wifi-slow-in-the-evening-ireland">Wi-Fi slow in the evening</Link>.
          </li>
        </ul>
        <p>
          If you would rather have it measured than guess, our{" "}
          <Link href="/services/wifi">home network assessment</Link> tests the broadband at the router by cable, measures
          every floor, and leaves a working powerline and access point trial on the floor that struggles for three days,
          with the figures in a written report. It is €395, credited in full against any work, in Dublin and the rest of
          Leinster. To start for free, run the <Link href="/wifi-check">Wi-Fi check</Link> in the room that struggles.
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

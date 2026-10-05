import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("wifi-slow-in-the-evening-ireland")!;

/*
 * Written for the search "why is my wifi slow in the evening", in an Irish
 * home. The short answer first, then the two causes kept apart (the line at
 * peak times, and the Wi-Fi channels crowded by the neighbours), the one test
 * that tells them apart, and what fixes each. Questions at the end double as
 * FAQPage data.
 *
 * Sources, read 1 October 2026:
 *   - ComReg, "Get the most out of your broadband & home phone": speeds can be
 *     noticeably slower at peak times, and the more devices active at once the
 *     more the line struggles. ComReg, "Your contract must include your
 *     broadband speed": minimum and normally available speeds. ComReg's
 *     Broadband Checker at comreg.ie/broadbandchecker.
 *   - Virgin Media Ireland, "How can I improve my Wi-Fi signal": leave large
 *     downloads until late at night, and a restart lets the Hub pick the best
 *     channel; 2.4 GHz against 5 GHz.
 *   - TP-Link FAQ 499: the 2.4 GHz band is more crowded, and fewer devices use
 *     5 GHz. NETGEAR's knowledge base: 5 GHz has more channels and less
 *     interference, though it carries less far.
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
  { id: "two-causes", label: "Two different things slow down in the evening" },
  { id: "the-line", label: "The line at peak times" },
  { id: "the-channel", label: "The neighbours' Wi-Fi crowding the channel" },
  { id: "your-house", label: "Your own house, all on at once" },
  { id: "tell-which", label: "How to tell which one it is" },
  { id: "fixes", label: "What fixes each" },
  { id: "faq", label: "Frequently asked questions" },
];

const FAQ = [
  {
    q: "Why is my internet fast during the day and slow at night?",
    a: "Two things get busy after tea. Your broadband line is shared with your area, and ComReg notes speeds can be noticeably slower at peak times. Separately, your Wi-Fi shares a few channels with every router near you, and in the evening they are all busy. On top of both, your own house tends to be doing the most at once in the evening.",
  },
  {
    q: "Is slow evening broadband my provider's fault?",
    a: "It depends which part slows. If a laptop plugged into the router by cable is much slower in the evening than during the day, and below the speeds in your contract, that points to congestion on the line, which is the provider's side. If the cabled result holds up and only Wi-Fi devices slow down, it is the Wi-Fi channels in and around your home that are crowded.",
  },
  {
    q: "Does changing the Wi-Fi channel help an evening slowdown?",
    a: "If the slowdown is channel crowding, yes. Virgin Media Ireland says a restart lets the router pick the best channel, and moving your devices to the 5 GHz band avoids the most crowded one, since it has far more channels and fewer devices on it.",
  },
  {
    q: "What time is broadband slowest in Ireland?",
    a: "The busiest stretch in most homes is the evening, roughly from after tea until late, when the most people in an area are streaming, calling and online at once. ComReg notes speeds can be noticeably slower at these peak times.",
  },
  {
    q: "Will a better router fix evening slowdowns?",
    a: "It can help with the Wi-Fi side, because a newer router handles a busy band better and steers devices onto clearer channels. It cannot fix congestion on the broadband line itself, which sits on your provider's network rather than in your house.",
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
          <strong>The short answer:</strong> broadband that flies all day and crawls at eight in the evening is almost
          always one of two things, and they are not the same problem. Your broadband line is shared with the rest of your
          area, and it gets busier at peak times; and your Wi-Fi shares a handful of channels with every router around
          you, which are all busy in the evening too. Your own house doing the most at once after tea sits on top of both.
          A speed test on a cable at the router, run in the evening and again during the day, tells you which half to deal
          with.
        </p>

        <h2 id="two-causes">Two different things slow down in the evening</h2>
        <p>
          It helps to keep them apart from the start, because they have different fixes and different people responsible:
        </p>
        <ul>
          <li>
            <strong>The line</strong>, the broadband coming into your house, is shared with your neighbourhood and is
            under the most demand in the evening.
          </li>
          <li>
            <strong>The Wi-Fi</strong>, the radio between your router and your devices, competes with every other router
            nearby for a few channels, and they are all at their busiest in the evening.
          </li>
          <li>
            <strong>Your house</strong> is usually doing the most at once after tea: everyone home, screens on, calls,
            downloads.
          </li>
        </ul>

        <h2 id="the-line">The line at peak times</h2>
        <p>
          Broadband is not a private pipe from your house to the internet. The capacity near you is shared, and when the
          most people in your area are online at the same time, each connection can get less of it. ComReg, the
          communications regulator, puts it plainly: speeds can be noticeably slower at peak times, and the more devices
          active at once, the more the line struggles.
        </p>
        <p>
          If this is what is happening, you will see it even with the Wi-Fi taken out of the picture: a laptop plugged
          into the router by cable is slower in the evening than it is at ten in the morning. If that evening result is
          also below the minimum and normally available speeds your contract has to state, it is worth a call to your
          provider with the figures and the times. Our guide to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">testing the line against the Wi-Fi</Link> shows how
          to run it.
        </p>

        <h2 id="the-channel">The neighbours&apos; Wi-Fi crowding the channel</h2>
        <p>
          Wi-Fi is radio, and there are only so many channels to go round. The 2.4 GHz band, the one older and cheaper
          devices use, is the worst for this: TP-Link, which makes routers, describes it as crowded, with few channels
          and many devices competing. In an estate or an apartment block, your router and a dozen of your neighbours&apos;
          are all trying to use the same few, and in the evening they are all busy at once. The result is a connection
          that is fine at the router during the day and stutters in the evening, with nothing wrong with the line at all.
        </p>
        <p>
          The 5 GHz band avoids most of it, because, as NETGEAR explains, it has far more channels and fewer devices on
          them, though it does not carry as far through the house. This is the same crowding behind a lot of{" "}
          <Link href="/blog/why-does-my-wifi-keep-dropping-ireland">Wi-Fi that drops in the evening</Link>, and it is
          worst in flats, which our guide to{" "}<Link href="/blog/apartment-wifi-ireland">apartment Wi-Fi</Link> covers.
        </p>

        <h2 id="your-house">Your own house, all on at once</h2>
        <p>
          The third piece is simply that the evening is when your house asks the most of the connection. Two televisions
          streaming, someone on a call, a console downloading an update and phones backing up photos all land in the same
          couple of hours. Our guides to{" "}
          <Link href="/blog/what-broadband-speed-do-i-need-ireland">how much broadband speed you need</Link> and to{" "}
          <Link href="/blog/too-many-devices-slow-wifi-ireland">a house with too many devices on it</Link> go through how
          that adds up. Virgin Media Ireland&apos;s own advice is to leave large downloads until late at night, when the
          house and the area have quietened down.
        </p>

        <h2 id="tell-which">How to tell which one it is</h2>
        <p>The test is the same one, run at two times of day, with the Wi-Fi taken out of it:</p>
        <ol>
          <li>Plug a laptop into the router with a network cable.</li>
          <li>Run a speed test in the quiet of the morning, and note it.</li>
          <li>Run the same test in the evening, when it feels slow.</li>
        </ol>
        <p>
          If the cabled result drops a lot in the evening, the line is congesting at peak times, and that is the
          provider&apos;s side. If the cabled result holds steady but your phones and laptops still slow down in the
          evening, the line is fine and the Wi-Fi channels are crowded. The <Link href="/wifi-check">free Wi-Fi check</Link>{" "}
          run beside the router and in the room that struggles will show the gap, and whether it is worth going further.
        </p>

        <h2 id="fixes">What fixes each</h2>
        <h3>If it is the line at peak times</h3>
        <ul>
          <li>Ring your provider with the cabled figures, the times and the dates. Congestion on the line is theirs to carry.</li>
          <li>
            Check ComReg&apos;s Broadband Checker at{" "}
            <a href="https://www.comreg.ie/broadbandchecker" rel="noopener">comreg.ie/broadbandchecker</a> for what else
            your address can get, in case a different connection in your area is less congested.
          </li>
          <li>Move the heaviest downloads to late at night, as Virgin Media suggests.</li>
        </ul>
        <h3>If it is the Wi-Fi channels</h3>
        <ul>
          <li>Restart the router, which lets it pick a clearer channel, per Virgin Media.</li>
          <li>Move your main devices onto the 5 GHz band, which is far less crowded.</li>
          <li>If your router lets you set the 2.4 GHz channel by hand, try one away from your neighbours&apos;.</li>
          <li>
            For rooms a clearer channel cannot reach, carry the connection there by cable to an access point, by
            powerline, or by a mesh unit linked back by cable. A newer router also handles a busy band better, as our
            guide to <Link href="/blog/wifi-6-wifi-7-new-router-ireland">Wi-Fi 6, 6E and 7</Link> explains.
          </li>
        </ul>
        <p>
          If the evening slowdown is in the Wi-Fi and a clearer channel has not fixed it, our{" "}
          <Link href="/services/wifi">home network assessment</Link> measures what the house is actually doing: it tests
          the broadband at the router by cable, measures every floor, and leaves a working powerline and access point
          trial on the floor that struggles for three days, with the figures in a written report. It is €395, credited in
          full against any work, in Dublin and the rest of Leinster.
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

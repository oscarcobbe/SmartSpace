import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("why-does-my-wifi-keep-dropping-ireland")!;

/*
 * Written for the question people type and ask the assistants: why does my
 * Wi-Fi keep dropping, and how do I stop it, in an Irish home. A direct answer
 * first, then the one test that splits the problem in two (does a cabled device
 * drop at the same moment?), question headings, and the same questions again at
 * the end as FAQPage data.
 *
 * Sources, read 1 October 2026:
 *   - ComReg, "Get the most out of your broadband & home phone": speeds
 *     noticeably slower at peak times, the more devices active at once the more
 *     the line struggles, a wired connection always more reliable, a central
 *     router. ComReg, "Your contract must include your broadband speed":
 *     minimum, normally available, maximum and advertised speeds. ComReg's
 *     Broadband Checker at comreg.ie/broadbandchecker.
 *   - Virgin Media Ireland, "How can I improve my Wi-Fi signal": the Hub in the
 *     open and not in a cabinet, walls and baby monitors, 2.4 GHz against
 *     5 GHz, and a restart letting the Hub pick the best channel.
 *   - TP-Link FAQ 499 (2.4 GHz is more crowded; microwaves and cordless phones)
 *     and its weak-Wi-Fi guidance (walls, floors, brick, concrete and metal;
 *     firmware updates often improve performance) and the Deco Ethernet
 *     backhaul FAQ (a cabled link is more stable, with lower latency).
 *   - NETGEAR's knowledge base on 2.4, 5 and 6 GHz: higher frequencies carry
 *     less far but have more channels and less interference.
 * It recommends no product. The assessment is described from /services/wifi and
 * src/data/wifiPackages.ts, and mentioned once.
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
  { id: "split", label: "Does everything drop, or just one device?" },
  { id: "line-or-wifi", label: "Is it the Wi-Fi or the broadband line?" },
  { id: "causes", label: "What makes the Wi-Fi itself keep dropping?" },
  { id: "interference", label: "Interference and a crowded channel" },
  { id: "fixes", label: "How to stop Wi-Fi dropping, from free upwards" },
  { id: "measured", label: "When it still drops after all that" },
  { id: "faq", label: "Frequently asked questions" },
];

/* One list feeds both the questions on the page and the FAQPage schema, so the
   two cannot say different things. */
const FAQ = [
  {
    q: "Why does my Wi-Fi drop for a few seconds and then come back?",
    a: "A short drop that fixes itself is usually a burst of interference on the crowded 2.4 GHz band, a device hopping between bands or mesh units, or the broadband line briefly re-syncing. The quick way to tell them apart is to watch a device that is plugged in by cable: if it drops at the same moment, it is the line or the router, not the Wi-Fi.",
  },
  {
    q: "Why does only one device keep disconnecting when the others are fine?",
    a: "That device is usually at the edge of the signal, is an older one that can only use the slower 2.4 GHz band, or is set to switch its Wi-Fi off to save battery. Devices closer to the router, or on the 5 GHz band, hold the connection while it loses it.",
  },
  {
    q: "Does restarting the router actually help?",
    a: "Yes. Virgin Media Ireland says a restart lets the router pick the best channel, and it clears a router that has been running for weeks. If you find you have to restart it every day to keep things working, the router or the line needs attention rather than a nightly reboot.",
  },
  {
    q: "Can my neighbours' Wi-Fi make mine keep dropping?",
    a: "On the 2.4 GHz band, yes. Everyone in a street or an apartment block shares only a few channels, so the more routers that are busy at once, usually in the evening, the more each one stalls. A clearer channel or the 5 GHz band avoids most of it.",
  },
  {
    q: "Is it my broadband or my Wi-Fi if the connection keeps dropping?",
    a: "If a device plugged into the router by cable drops at the same moment as everything else, it is the broadband line or the router, and your provider's to fix. If only wireless devices in certain spots drop while a cabled one stays up, it is the Wi-Fi inside the house. A cabled speed test run when it usually happens settles it.",
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
          <strong>The short answer:</strong> Wi-Fi keeps dropping for a handful of reasons. The signal is too weak where
          the device sits, something nearby is interfering on the same band, the router is overloaded or needs a restart
          or a firmware update, a device is set to drop its Wi-Fi to save battery, or the broadband line itself is
          dropping. The first thing to find out is whether everything loses the connection at the same moment, which
          points to the router or the line, or whether one device in one place drops while the rest stay up, which points
          to the Wi-Fi to that spot.
        </p>

        <h2 id="split">Does everything drop, or just one device?</h2>
        <p>
          This one question splits the problem in two, and it costs nothing to answer. Leave a laptop plugged into the
          router with a network cable, or keep an eye on a smart TV or games console that is wired in, and watch what
          happens the next time the Wi-Fi goes.
        </p>
        <ul>
          <li>
            <strong>If the wired device drops at the same moment</strong> as the phones and laptops, the Wi-Fi is not the
            problem. The broadband line or the router is losing the connection for the whole house.
          </li>
          <li>
            <strong>If the wired device stays online</strong> while one or two wireless devices drop, the line is fine and
            the Wi-Fi is losing it on the way to those spots.
          </li>
        </ul>
        <p>Those are two different problems, with two different people to fix them. Take them one at a time.</p>

        <h2 id="line-or-wifi">Is it the Wi-Fi or the broadband line?</h2>
        <p>
          A broadband line can drop on its own: a fibre or cable fault, a copper line re-syncing, or work on the
          provider&apos;s network. The signs are that the broadband light on the router changes colour or goes red, that
          wired devices drop along with everything else, and that it comes back by itself after a minute or two.
        </p>
        <p>
          To check, plug a laptop into the router by cable and run a speed test when the drops usually happen. ComReg, the
          communications regulator, notes that speeds can be noticeably slower at peak times, so test in the evening as
          well as during the day. Our guide to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> walks
          through it. If the cabled connection itself stalls or drops, and the result is well below the minimum and
          normally available speeds your contract has to state, ring your provider with the figures: when you tested,
          that it was on a cable, and what you saw.
        </p>

        <h2 id="causes">What makes the Wi-Fi itself keep dropping?</h2>
        <p>If a wired device stays up while wireless ones drop, the signal is being lost between the router and those spots. The usual reasons:</p>
        <ul>
          <li>
            <strong>Weak signal at the edge of range.</strong> Distance, walls, floors and foil-backed insulation all
            take a share of the signal. A device at the very edge holds on, then drops whenever the signal dips a little
            further. Our guides to{" "}
            <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why Wi-Fi fades upstairs</Link> and to{" "}
            <Link href="/blog/how-to-test-wifi-speed-room-by-room">testing room by room</Link> show how to find the spot
            where it goes.
          </li>
          <li>
            <strong>Band and mesh hopping.</strong> When the 2.4 GHz and 5 GHz bands share one network name, or a mesh
            system hands a device from one unit to the next, a device can lose the connection for a second as it moves.
            It is brief, but it is enough to drop a call or a camera.
          </li>
          <li>
            <strong>A device saving battery.</strong> Phones and laptops can switch their Wi-Fi off when they think they
            are idle, which shows up as a device that keeps dropping and reconnecting while it sits on a shelf.
          </li>
          <li>
            <strong>A tired or overloaded router.</strong> ComReg points out that the more devices are active at once,
            the more the line struggles. A router that has been running for weeks, or a basic one carrying a houseful of
            devices, drops connections it would otherwise hold.
          </li>
        </ul>

        <h2 id="interference">Interference and a crowded channel</h2>
        <p>
          The 2.4 GHz band reaches furthest, which is why older and cheaper devices use it, but it is also the most
          crowded. TP-Link, which makes routers, names microwaves and cordless phones as the worst offenders; Virgin
          Media Ireland adds baby monitors. A Bluetooth speaker and the neighbours&apos; networks sit in the same band.
          When one of them bursts into life on the same channel, a 2.4 GHz device can drop.
        </p>
        <p>
          In an estate or an apartment block, every router is competing for the same few 2.4 GHz channels. The more of
          them that are busy at once, usually in the evening, the more each one stalls, which is why a connection that is
          steady all day starts dropping after tea. Our guide to{" "}
          <Link href="/blog/wifi-slow-in-the-evening-ireland">Wi-Fi that slows in the evening</Link> goes into that
          pattern. The 5 GHz band has far more channels and much less of this, as NETGEAR explains, though it does not
          reach as far.
        </p>

        <h2 id="fixes">How to stop Wi-Fi dropping, from free upwards</h2>
        <p>
          Roughly in order of cost. Give each one a day or two to show whether it helped. For the fuller list of what
          helps and what is a waste of money, see{" "}
          <Link href="/blog/how-to-boost-wifi-signal-ireland">how to boost your Wi-Fi signal</Link>.
        </p>

        <h3>1. Restart the router, and keep it updated</h3>
        <p>
          Turn the router off for a minute and on again. Virgin Media Ireland says this lets it pick the best channel, and
          it clears a router that has been running a long time. While you are in its settings, check for a firmware update:
          TP-Link notes these often improve performance and stability.
        </p>

        <h3>2. Put the right devices on the right band</h3>
        <p>
          Near the router, join the 5 GHz network, which is faster and far less crowded. Leave older devices that can
          only see 2.4 GHz for the jobs that do not move. If your bands share one name and a device keeps hopping, some
          routers let you split them into two names so a device stays put.
        </p>

        <h3>3. Move the router, and move the interference</h3>
        <p>
          Routers end up wherever the line came in: the hall, a press, behind the TV. Put it out in the open and up off
          the floor, which ComReg, Virgin Media and NETGEAR all recommend, and keep it away from the microwave, the
          cordless phone base and any baby monitor. Our guide to{" "}
          <Link href="/blog/why-wifi-slow-upstairs-irish-homes">slow Wi-Fi upstairs</Link> covers placement in more
          detail.
        </p>

        <h3>4. Turn off Wi-Fi power saving on the device that drops</h3>
        <p>
          If it is one device that keeps falling off, look in its Wi-Fi or battery settings for an option that turns Wi-Fi
          off when idle, and switch it off for that device.
        </p>

        <h3>5. Carry the signal to the spot that drops</h3>
        <p>
          If a room is simply too far for a steady signal, bring the connection to it rather than hoping it reaches. A
          network cable to an access point gets past every wall in the way; where a cable cannot be run, powerline can
          carry it over the electrical wiring, and a mesh unit linked back by cable is steadier than one relying on Wi-Fi.
          Our guides to <Link href="/blog/mesh-wifi-explained">mesh Wi-Fi</Link>,{" "}
          <Link href="/blog/powerline-adapters-ireland">powerline in Irish houses</Link> and{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">extender, mesh or powerline</Link> cover which suits
          which problem.
        </p>

        <h3>6. Replace a tired single-band router</h3>
        <p>
          A basic, single-band router supplied years ago struggles with a houseful of modern devices. A newer router
          copes better with a busy house, as our guide to{" "}
          <Link href="/blog/wifi-6-wifi-7-new-router-ireland">Wi-Fi 6, 6E and 7</Link> explains, though a new router in the
          same bad spot still has to get through the same walls.
        </p>

        <h2 id="measured">When it still drops after all that</h2>
        <p>
          If the router has been restarted, moved and updated, the device is on the right band, and the connection still
          drops, it is worth measuring the house before spending more. Our{" "}
          <Link href="/services/wifi">home network assessment</Link> does that: a two-hour visit that tests the broadband
          at the router by cable and measures every floor, then a working powerline and access point trial left for three
          days on the floor that struggles, with the figures in a written report. It costs €395, credited in full against
          any work you go ahead with, in Dublin and the rest of Leinster. If the report shows the line itself is dropping,
          you have the figures to bring to your provider.
        </p>
        <p>
          To start for free, run the <Link href="/wifi-check">Wi-Fi check</Link> beside the router and again in the room
          that drops. It grades the result and tells you whether it is worth going further.
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

import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("apartment-wifi-ireland")!;

/*
 * Written for "apartment wifi" problems in Ireland: a crowded band shared with
 * the block, one small router by the door, and walls a renter cannot drill.
 * Short answer first, question headings, and the questions again at the end as
 * FAQPage data.
 *
 * Sources, read 1 October 2026:
 *   - TP-Link FAQ 499: the 2.4 GHz band is crowded and slower, with fewer
 *     devices on 5 GHz. NETGEAR: 5 GHz has more channels and less interference,
 *     though it carries less far. Virgin Media Ireland: a restart lets the Hub
 *     pick the best channel; the Hub in the open.
 *   - ComReg, "The Effect of Building Materials on Indoor Mobile Performance"
 *     (18/73, 2018): about 5 dB of extra loss through solid concrete block and
 *     brick, about 25 dB through cavity concrete block, measured at mobile
 *     frequencies with losses generally growing with frequency. ComReg, "Get
 *     the most out of your broadband": speeds slower at peak times.
 *   - NETGEAR powerline FAQ and TP-Link powerline FAQ 406: powerline works
 *     across circuit breakers, the age of the wiring and appliances matter, and
 *     a pair on separate circuits loses its link; so a shared or old consumer
 *     unit can limit it to one flat's own wiring.
 * It recommends no product. The assessment is described from /services/wifi,
 * mentioned once, and its trial is noted as reversible for renters.
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
  { id: "why", label: "Why a flat is its own problem" },
  { id: "crowded", label: "You and twenty neighbours on the same channels" },
  { id: "one-router", label: "One small router, by the front door" },
  { id: "renting", label: "What you can do when you rent" },
  { id: "fixes", label: "What actually helps, in order" },
  { id: "faq", label: "Frequently asked questions" },
];

const FAQ = [
  {
    q: "Why is my apartment Wi-Fi so slow in the evening?",
    a: "The 2.4 GHz band has only a few channels, and in a block every router is sharing them. After tea, when the whole building is streaming and calling at once, they all compete, and your connection slows even though the line is fine. Moving your devices to 5 GHz and restarting the router so it picks a clearer channel avoids most of it.",
  },
  {
    q: "Can I improve Wi-Fi in a rented apartment without drilling?",
    a: "Yes. Moving to 5 GHz, choosing a clearer channel, and moving the router if the cable allows are all free and change nothing in the flat. Plug-in powerline adapters and a compact two-unit mesh are reversible and need no fixing to the wall. Check with your landlord before anything permanent.",
  },
  {
    q: "Do powerline adapters work in an apartment?",
    a: "Often, within your own flat's wiring. They will not reach a neighbour's flat, which is good for security, and an old or shared consumer unit, or a long run, can limit them. Because the wiring decides it, test a pair in your own flat before relying on them.",
  },
  {
    q: "Why does my neighbour's Wi-Fi affect mine?",
    a: "On the 2.4 GHz band everyone shares only a handful of channels, and a block has a lot of routers on them at once. The 5 GHz band has far more channels and fewer devices, so moving your main devices onto it avoids most of the crowding.",
  },
  {
    q: "Is a mesh system worth it in a small flat?",
    a: "Usually only if a bedroom or a home office is genuinely cut off. In a small, open flat, moving the router and using 5 GHz often does it. A two-unit mesh helps a long or L-shaped apartment where one end never gets a signal.",
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
          <strong>The short answer:</strong> a flat&apos;s Wi-Fi trouble is rarely weak signal over distance, because
          flats are small. It is three other things: a 2.4 GHz band shared with every router in the block, a single
          provider router parked by the front door, and solid block or concrete walls you cannot drill if you rent. Most
          of the fixes are free: move your devices to 5 GHz, pick a clearer channel, and move the router if the cable
          allows. Where a bedroom or a home office is still cut off, powerline or a compact mesh helps, and none of it
          needs cabling.
        </p>

        <h2 id="why">Why a flat is its own problem</h2>
        <p>
          Most Wi-Fi advice is about getting a signal across a house, through walls and up stairs. An apartment is a
          different shape of problem. The rooms are close together, so distance is rarely the issue. What gets in the way
          instead is everything around you: the neighbours on every side, the concrete the building is made of, and a
          router you did not choose and may not be allowed to replace.
        </p>

        <h2 id="crowded">You and twenty neighbours on the same channels</h2>
        <p>
          Wi-Fi is radio, and there are only so many channels to go round. The 2.4 GHz band, the one older and cheaper
          devices use, is the worst for this: TP-Link describes it as crowded, with few channels and many devices
          competing. In a block, your router and a dozen of your neighbours&apos; are all trying to use the same few, and
          in the evening they are all busy at once. ComReg notes speeds can be noticeably slower at peak times, and in a
          dense building that peak is sharper.
        </p>
        <p>
          The 5 GHz band avoids most of it, because, as NETGEAR explains, it has far more channels and fewer devices on
          them. Move your phone, laptop and TV onto 5 GHz, restart the router so it picks a clearer channel, as Virgin
          Media Ireland advises, and if your router lets you set the 2.4 GHz channel by hand, try one away from the
          strongest neighbours. This is the same crowding behind{" "}
          <Link href="/blog/wifi-slow-in-the-evening-ireland">Wi-Fi that slows in the evening</Link> and some{" "}
          <Link href="/blog/why-does-my-wifi-keep-dropping-ireland">connections that keep dropping</Link>.
        </p>

        <h2 id="one-router">One small router, by the front door</h2>
        <p>
          In most flats the provider&apos;s router sits wherever the line comes in, which is often a hall cupboard or a
          meter box by the front door, in the corner of the home farthest from where you actually sit. The signal is
          strongest where nobody is and weakest in the living room and bedroom.
        </p>
        <p>
          If the cable allows, move it out into the open and more central, up off the floor, as our guide to{" "}
          <Link href="/blog/why-wifi-slow-upstairs-irish-homes">router placement</Link> covers. If it is tied to the
          meter box, ask your provider what a longer lead or a relocation would involve. And if the flat is full of
          devices for its size, our guide to{" "}
          <Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices on the Wi-Fi</Link> helps.
        </p>

        <h2 id="renting">What you can do when you rent</h2>
        <p>
          Renting rules out drilling, chasing walls and running cable. The good news is that the things that help most in
          a flat need none of that, and all of them are reversible:
        </p>
        <ul>
          <li>
            <strong>The free changes</strong> above: 5 GHz, a clearer channel, moving the router if the lead reaches.
          </li>
          <li>
            <strong>Powerline adapters.</strong> They plug into existing sockets and carry the connection over the
            wiring, with nothing fixed to the wall. In a flat they work within your own circuits and will not reach a
            neighbour, which is good for your security. An older or shared consumer unit, or a long run, can limit them,
            so test a pair first. Our{" "}
            <Link href="/blog/powerline-adapters-ireland">guide to powerline in Irish houses</Link> explains what decides
            it.
          </li>
          <li>
            <strong>A compact mesh.</strong> A two-unit mesh plugs in and lifts off again when you move, and suits a long
            or L-shaped flat where one end is cut off. Our{" "}
            <Link href="/blog/mesh-wifi-explained">guide to mesh Wi-Fi</Link> covers where the second unit goes.
          </li>
        </ul>
        <p>Before fixing anything to the building, or asking for a provider change, check with your landlord.</p>

        <h2 id="fixes">What actually helps, in order</h2>
        <ol>
          <li>Move your main devices onto the 5 GHz network.</li>
          <li>Restart the router so it picks a clearer channel, and set the 2.4 GHz channel by hand if you can.</li>
          <li>Move the router into the open, if the cable allows.</li>
          <li>For a bedroom or office that is still cut off, a powerline link or a two-unit mesh.</li>
          <li>If the provider&apos;s box is a basic single-band one, ask about a newer router, as our guide to{" "}
            <Link href="/blog/wifi-6-wifi-7-new-router-ireland">Wi-Fi 6, 6E and 7</Link> explains.
          </li>
        </ol>
        <p>
          If a room never comes right, our <Link href="/services/wifi">home network assessment</Link> measures the flat:
          the broadband tested at the router by cable, every room measured, and a working powerline and access point
          trial left for three days, with the figures in a written report. The trial lifts out again, which suits a
          rental. It is €395, credited in full against any work, in Dublin and the rest of Leinster. To start for free,
          run the <Link href="/wifi-check">Wi-Fi check</Link> beside the router and in the room that struggles.
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

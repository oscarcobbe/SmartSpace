import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("rural-broadband-ireland")!;

/*
 * Written for "rural broadband ireland": the connections a rural home can
 * actually get (fibre including the National Broadband Plan, fixed wireless on
 * 4G or 5G, and satellite such as Starlink), how to check by Eircode, and the
 * point that funnels back to us: whatever the line, the house still has to
 * carry it to every room. Short answer first, one table, questions as FAQPage
 * data at the end.
 *
 * Sources, read 1 October 2026:
 *   - ComReg: the Broadband Checker (comreg.ie/broadbandchecker) lists what an
 *     Eircode can get; full fibre typically up to 2 Gbps. "Types of Broadband
 *     Technology": mobile broadband is a SIM router on 4G or 5G, not normally
 *     as fast or reliable as a fixed line, and insulation, thick walls and
 *     double or triple glazing can weaken indoor coverage. The coverage map at
 *     coveragemap.comreg.ie shows predicted outdoor mobile coverage by Eircode.
 *     "Mobile Phone Repeaters": only compliant repeaters are legal.
 *   - National Broadband Ireland (nbi.ie): delivering the Government's National
 *     Broadband Plan, building high-speed fibre in every county to the premises
 *     left out of the commercial rollout; an Eircode checker shows rollout
 *     status and anticipated connection dates, which the site says can change;
 *     NBI builds the network, retail providers sell the plans on it.
 *   - Starlink (starlink.com/ie): low-earth-orbit satellite broadband available
 *     to Irish residential addresses, including remote areas; needs a clear view
 *     of the sky. Exact prices and speeds change and are left out.
 * It recommends no provider. The assessment is described from /services/wifi,
 * mentioned once.
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
  { id: "check-first", label: "First, check what your Eircode can get" },
  { id: "fibre", label: "Fibre, including the National Broadband Plan" },
  { id: "fixed-wireless", label: "Fixed wireless: 4G and 5G home broadband" },
  { id: "satellite", label: "Satellite: Starlink and the rest" },
  { id: "compare", label: "Which suits which rural home" },
  { id: "the-house", label: "Whatever the connection, the house still carries it" },
  { id: "faq", label: "Frequently asked questions" },
];

const CELL = { paddingLeft: "0.5rem", paddingRight: "0.5rem" };

const OPTIONS = [
  {
    option: "Fibre (including the NBP)",
    when: "Available, under way or planned at your Eircode",
    watch: "Check the NBI map; dates can change",
  },
  {
    option: "Fixed wireless (4G/5G)",
    when: "No fibre yet, but a strong mast signal",
    watch: "Coverage varies; walls weaken it indoors",
  },
  {
    option: "Satellite (Starlink)",
    when: "Remote, no fibre or mast, a clear view of the sky",
    watch: "Needs sky view; fibre is still faster where you can get it",
  },
];

const FAQ = [
  {
    q: "What are my broadband options if I live in rural Ireland?",
    a: "Three kinds, depending on where you are: fibre where it is available, increasingly through the National Broadband Plan; fixed wireless over 4G or 5G; and satellite such as Starlink. What you can actually get depends on your Eircode, so check ComReg's Broadband Checker and the National Broadband Ireland map.",
  },
  {
    q: "Is Starlink good for rural Ireland?",
    a: "It reaches places fibre and mobile do not, and it needs a clear view of the sky. It is far better than older satellite broadband, though fibre is still faster and lower in latency where you can get it. Check your address on the Starlink site.",
  },
  {
    q: "How do I check if fibre is coming to my area?",
    a: "Check your Eircode on ComReg's Broadband Checker, and on the National Broadband Ireland map at nbi.ie. The NBI map shows whether high-speed fibre at your address is available, under way or planned, though it says the anticipated dates can change.",
  },
  {
    q: "Is 5G home broadband good enough in the countryside?",
    a: "It can be, where there is a strong mast signal. ComReg notes mobile broadband is not normally as fast or as reliable as a fixed line, and that thick walls, insulation and double or triple glazing weaken it indoors, so test a phone on that network inside the house first.",
  },
  {
    q: "Why is my rural Wi-Fi still bad after getting faster broadband?",
    a: "Because the line and the home network are two different things. A large or old rural house still has to carry the connection from the router to every room, and thick stone or block walls and a long footprint take a lot of it. That is a separate job from the line, and the one we measure.",
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
          <strong>The short answer:</strong> a rural Irish home usually chooses between three kinds of connection: fixed
          fibre, increasingly through the National Broadband Plan; fixed wireless over 4G or 5G; and satellite such as
          Starlink. Which you can actually get depends entirely on where you are, so start at your Eircode on ComReg&apos;s
          Broadband Checker and the National Broadband Ireland map. And whichever you end up on, a large or old rural
          house still has to carry the connection from the router to every room, which is a separate job from the line.
        </p>

        <h2 id="check-first">First, check what your Eircode can get</h2>
        <p>
          Rural broadband is decided by location more than anything else, so begin with what is actually available at
          your address rather than at a plan.
        </p>
        <ul>
          <li>
            ComReg&apos;s Broadband Checker at{" "}
            <a href="https://www.comreg.ie/broadbandchecker" rel="noopener">comreg.ie/broadbandchecker</a> lists the
            connections available by address or Eircode, and describes full fibre as typically delivering up to 2 Gbps.
          </li>
          <li>
            The National Broadband Ireland map at <a href="https://nbi.ie" rel="noopener">nbi.ie</a> shows whether
            high-speed fibre under the National Broadband Plan is available, under way or planned at your Eircode,
            with an anticipated connection date the site says can still change.
          </li>
        </ul>

        <h2 id="fibre">Fibre, including the National Broadband Plan</h2>
        <p>
          Where you can get it, fibre is the fastest and most reliable, and worth waiting a little for. Many rural
          premises that commercial operators did not reach are now being connected under the Government&apos;s National
          Broadband Plan, which National Broadband Ireland is building county by county. NBI builds the network; you then
          buy a plan from one of the retail providers that sell over it. If your Eircode shows fibre available or due
          soon, that is usually the one to hold out for.
        </p>

        <h2 id="fixed-wireless">Fixed wireless: 4G and 5G home broadband</h2>
        <p>
          Fixed wireless is a router with a SIM card in it, using the same 4G and 5G masts as a phone. Where there is a
          strong signal it can be a good connection, and it is often quicker to get than fibre. The catch is coverage.
          ComReg notes that mobile broadband is not normally as fast or as reliable as a fixed line, and that insulation,
          thick walls and double or triple glazing weaken it indoors.
        </p>
        <ul>
          <li>
            Check the predicted outdoor coverage for each network on ComReg&apos;s coverage map at{" "}
            <a href="https://coveragemap.comreg.ie/map" rel="noopener">coveragemap.comreg.ie</a>, then try a phone on that
            network inside the house, at the spot the router would sit.
          </li>
          <li>
            Where the signal is marginal, an external aerial on the router can help. Only legally compliant equipment may
            be used, the same rule ComReg sets for mobile repeaters, which our guide to{" "}
            <Link href="/blog/wifi-calling-ireland">Wi-Fi calling and poor indoor signal</Link> covers.
          </li>
        </ul>

        <h2 id="satellite">Satellite: Starlink and the rest</h2>
        <p>
          Where there is no fibre and no usable mast, satellite reaches almost anywhere. Starlink uses a cluster of
          low-earth-orbit satellites, far closer than the old satellite broadband, so it is far quicker and more
          responsive than that was, and it is available to Irish homes including remote ones. It needs a clear view of
          the sky for the dish, so a spot away from tall trees and the shadow of the house matters. Fibre is still faster
          and lower in latency where you can get it, so satellite is the answer when the first two are not available.
          Check your address on the Starlink site, and note that other satellite services exist too.
        </p>

        <h2 id="compare">Which suits which rural home</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {["Option", "Works well when", "Watch out for"].map((h) => (
                  <th key={h} style={CELL}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OPTIONS.map((r) => (
                <tr key={r.option}>
                  <td style={CELL}>{r.option}</td>
                  <td style={CELL}>{r.when}</td>
                  <td style={CELL}>{r.watch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The order to try is usually fibre, then fixed wireless, then satellite: take fibre if your Eircode can get it,
          fixed wireless where a mast is strong, and satellite where neither reaches.
        </p>

        <h2 id="the-house">Whatever the connection, the house still has to carry it</h2>
        <p>
          This is the part that catches rural homes out. Getting a fast connection to the house is only half the job; the
          Wi-Fi then has to carry it from the router to every room. Rural homes make that harder than most: long
          footprints and bungalows that stretch out, thick stone or block walls, an office over the garage or a
          converted outbuilding, and a router sitting in the utility room where the line happens to come in.
        </p>
        <p>
          So a home that finally gets good broadband can still have a bedroom or a kitchen that barely sees it. The fix
          is the same as in any house, matched to the distance and the walls: move the router, then a{" "}
          <Link href="/blog/mesh-wifi-explained">mesh system</Link>,{" "}
          <Link href="/blog/powerline-adapters-ireland">powerline</Link>, or a{" "}
          <Link href="/blog/running-ethernet-cable-existing-house-ireland">cabled access point</Link> for a room cut off
          by walls or distance. Our guides to{" "}
          <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why Wi-Fi fades through a house</Link> and to{" "}
          <Link href="/blog/wifi-garden-office-ireland">Wi-Fi in a garden office or outbuilding</Link> go further, and the{" "}
          <Link href="/wifi-check">free Wi-Fi check</Link> shows where the signal is being lost.
        </p>
        <p>
          If a far room never comes right, our <Link href="/services/wifi">home network assessment</Link> tests the
          broadband at the router by cable, measures every room, and leaves a working powerline and access point trial on
          the part of the house that struggles for three days, with the figures in a written report. It is €395, credited
          in full against any work, in Dublin and the rest of Leinster, including rural Wicklow, Meath and Kildare.
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

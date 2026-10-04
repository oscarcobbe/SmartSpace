import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("powerline-adapters-ireland")!;

/*
 * Written for the powerline searches, which Keyword Planner put at 480 a
 * month for "powerline adapter", 140 for "tp link powerline", 40 each for
 * "devolo" and "ethernet over power", and 30 for "powerline wifi" (Ireland,
 * English, read 30 September 2026).
 *
 * Sources, read 30 September 2026: NETGEAR's powerline FAQ (no power strips,
 * surge protectors or extension leads; powerline works across circuit
 * breakers; every appliance on the line adds noise; real speeds differ from
 * the figures on the box) and TP-Link's FAQ on appliances (washers, dryers,
 * fridges and air conditioners; keep adapters away from them; plug straight
 * into the wall). It names no product to buy.
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
  { id: "how-it-works", label: "How powerline works" },
  { id: "the-box", label: "The speed on the box" },
  { id: "what-decides-it", label: "What decides it in your house" },
  { id: "setting-up", label: "Setting it up properly" },
  { id: "wifi-at-the-far-end", label: "Wi-Fi at the far end" },
  { id: "measure-it", label: "Measure it in your own house" },
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

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <BlogLayout post={post} toc={toc} cta={NETWORK_GUIDE_CTA}>
        <p>
          Ask whether powerline adapters work and you will hear both answers, both from people telling the truth. In one
          house they carry the broadband upstairs as well as a cable would; in the next they are slow or drop out. The
          adapters are not the difference. The house is.
        </p>

        <h2 id="how-it-works">How powerline works</h2>
        <p>
          One adapter plugs into a wall socket beside your router and connects to it with a network cable. A second plugs
          into a socket in the room that needs the connection. The two send your data to each other along the electrical
          wiring already in the walls, so nothing is chased into plaster and no floors come up. Irish sockets take the
          same three-pin plug as the UK, so adapters sold for either fit.
        </p>
        <p>
          The pair link with a button on each adapter, and newer models encrypt what passes between them, so a neighbour on
          the same supply cannot read it. That makes powerline a tidy, reversible fix for a flat, which our guide to{" "}
          <Link href="/blog/apartment-wifi-ireland">apartment Wi-Fi</Link> goes into.
        </p>

        <h2 id="the-box">The speed on the box</h2>
        <p>
          Powerline adapters are sold by a headline figure, such as 600, 1000 or 2000. That is the fastest the link between
          the two adapters can run in ideal conditions, not the speed you will get. NETGEAR&apos;s own guidance is that real
          speeds differ significantly, because of the wiring, the overheads of the connection and electrical noise on the
          line. Treat the number as a ceiling, and the speed in your house as something to measure.
        </p>

        <h2 id="what-decides-it">What decides it in your house</h2>
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Extension leads and surge protectors</td>
              <td>They filter out the signal the adapters use. NETGEAR and TP-Link both say to plug straight into the wall.</td>
            </tr>
            <tr>
              <td>Appliances</td>
              <td>
                Every appliance on the wiring adds electrical noise. TP-Link names washing machines, dryers, fridges and air
                conditioners, and advises keeping adapters as far from them as you can.
              </td>
            </tr>
            <tr>
              <td>The route between the sockets</td>
              <td>
                Powerline works across the breakers in your fuse board, but the signal travels the whole route between the
                two sockets, through the board and along each cable, and loses strength on the way.
              </td>
            </tr>
            <tr>
              <td>The wiring itself</td>
              <td>Its age and layout. The same adapters can do well in one house and poorly in the next.</td>
            </tr>
          </tbody>
        </table>
        <p>
          If speeds drop at certain times, switch high-power appliances off one at a time, as TP-Link suggests, to find the
          one making the noise.
        </p>

        <h2 id="setting-up">Setting it up properly</h2>
        <ul>
          <li>Plug each adapter directly into a wall socket, never into an extension lead, adapter or surge protector.</li>
          <li>Choose sockets away from the washing machine, the fridge and the tumble dryer where you can.</li>
          <li>Pair the adapters, then test speed at the far end before you decide where they live for good.</li>
        </ul>

        <h2 id="wifi-at-the-far-end">Wi-Fi at the far end</h2>
        <p>
          Some adapters have Wi-Fi built in, which makes a second network in that room. The other way is to plug an access
          point, or a mesh unit, into the far adapter, so the powerline link feeds a proper Wi-Fi signal on the floor that
          needs it, under the same network name as the rest of the house. That is the fix we fit, and our{" "}
          <Link href="/blog/mesh-wifi-explained">guide to mesh Wi-Fi</Link> explains why a wired or powerline link between
          units beats one over the air.
        </p>

        <h2 id="measure-it">Measure it in your own house</h2>
        <p>
          Because the wiring decides the result, the only way to know is to test powerline in your own house. Run the{" "}
          <Link href="/wifi-check">free Wi-Fi check</Link> beside the router and in the room that struggles first, so you
          know what you are starting from. Our{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">guide to extenders, mesh and powerline</Link> covers
          which problem each one fixes.
        </p>
        <p>
          The <Link href="/services/wifi">€395 home network assessment</Link> does the measuring for you: your broadband
          tested by cable at the router, every floor measured, and a working powerline and access point trial left on the
          floor that struggles for three days, with the figures in writing. It is credited in full against any work you go
          ahead with.
        </p>
      </BlogLayout>
    </>
  );
}

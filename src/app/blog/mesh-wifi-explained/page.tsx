import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("mesh-wifi-explained")!;

/*
 * Written for the mesh searches, which Keyword Planner put at 880 a month for
 * "mesh network", 480 for "mesh wifi", 210 each for "mesh wifi system" and
 * "deco mesh", and 50 for "what is mesh wifi" (Ireland, English, read 30
 * September 2026).
 *
 * Source for the backhaul facts, read 30 September 2026: TP-Link's EasyMesh
 * guidance, that mesh units joined by Ethernet talk to each other faster and
 * with lower latency than over the air. It names no product to buy.
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
  { id: "what-it-is", label: "What a mesh system is" },
  { id: "backhaul", label: "The part nobody mentions: backhaul" },
  { id: "placement", label: "Where the second unit goes" },
  { id: "when-it-works", label: "When mesh is the answer, and when it is not" },
  { id: "before-you-buy", label: "Before you buy" },
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
          Mesh Wi-Fi is sold as the end of dead spots: a few small units around the house and one strong network everywhere.
          In plenty of houses that is exactly what it does. In others the units are bought, placed, and the back bedroom is
          no better. The difference comes down to one thing the box rarely talks about.
        </p>

        <h2 id="what-it-is">What a mesh system is</h2>
        <p>
          A mesh system is a set of units, often called nodes, that work together as one Wi-Fi network. One connects to your
          router; the others sit around the house. Your phone, laptop and TV see one network name and one password, and
          move from unit to unit as you walk around, without you choosing.
        </p>
        <p>
          That is the clear advantage over a plain extender, which usually creates a second network that devices hold on to
          for too long. Systems such as TP-Link&apos;s Deco range are sold as mesh, and many newer routers and extenders
          can join together the same way under the Wi-Fi Alliance&apos;s EasyMesh standard.
        </p>

        <h2 id="backhaul">The part nobody mentions: backhaul</h2>
        <p>
          Every mesh unit has two jobs: talking to your devices, and talking back to the router. The second job is called
          backhaul, and it decides how fast everything behind that unit can go.
        </p>
        <table>
          <thead>
            <tr>
              <th>Backhaul</th>
              <th>How the units connect</th>
              <th>What to expect</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wireless</td>
              <td>Over the air, through the same walls and floors</td>
              <td>Only as good as the signal between the units</td>
            </tr>
            <tr>
              <td>Ethernet cable</td>
              <td>A network cable from unit to unit</td>
              <td>Faster, with lower delay</td>
            </tr>
            <tr>
              <td>Powerline</td>
              <td>Over the electrical wiring, into the unit&apos;s Ethernet socket</td>
              <td>Depends on the wiring between the two sockets</td>
            </tr>
          </tbody>
        </table>
        <p>
          With wireless backhaul, a unit upstairs has to hear the router through the very floor that caused the problem.
          TP-Link&apos;s own guidance is that units joined by Ethernet talk to each other faster and with lower delay than
          units joined over the air. Where a cable cannot be run, powerline can carry the link instead; our{" "}
          <Link href="/blog/powerline-adapters-ireland">guide to powerline in Irish houses</Link> covers what decides how
          well that works.
        </p>

        <h2 id="placement">Where the second unit goes</h2>
        <p>
          The instinct is to put the second unit in the room with no signal. With wireless backhaul that is the one place it
          cannot work, because it hears the router no better than your phone did.
        </p>
        <ul>
          <li>Place it between the router and the problem room, where the router&apos;s signal is still good.</li>
          <li>Keep it in the open: not in a cupboard, behind the TV, on the floor or beside the microwave.</li>
          <li>
            Test before and after. Our <Link href="/blog/how-to-test-wifi-speed-room-by-room">room-by-room guide</Link>{" "}
            shows how, so you can see whether moving a unit helped.
          </li>
        </ul>

        <h2 id="when-it-works">When mesh is the answer, and when it is not</h2>
        <ul>
          <li>
            <strong>A big, open or long house, with a weak signal spread across it:</strong> mesh is built for this, and
            wireless backhaul is often enough.
          </li>
          <li>
            <strong>One floor cut off by a solid floor or wall:</strong> mesh helps if the units can be linked by a cable or
            by powerline. Over the air, the link faces the same obstacle.
          </li>
          <li>
            <strong>Slow even beside the router:</strong> mesh cannot fix it, because the problem is the broadband. Our guide
            to <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> shows how
            to check, with your provider&apos;s own speed test.
          </li>
        </ul>
        <p>
          Mesh fixes coverage, not capacity. If a room is slow because too much is on the network at once rather than
          because the signal is weak, see our guide to{" "}
          <Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices on the Wi-Fi</Link>.
        </p>
        <p>
          For how mesh compares with extenders and powerline side by side, see{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">Wi-Fi extender, mesh or powerline</Link>.
        </p>

        <h2 id="before-you-buy">Before you buy</h2>
        <p>
          Measure first. A test beside the router and another in the room that struggles tells you whether the problem is
          the line or the house, and how much speed each room is losing. The{" "}
          <Link href="/wifi-check">free Wi-Fi check</Link> does both and grades the result green, amber or red.
        </p>
        <p>
          If you would rather see the fix working before paying for it, the{" "}
          <Link href="/services/wifi">€395 home network assessment</Link> measures your broadband and every floor, then
          leaves a working trial system on the floor that struggles for three days, with the figures in writing. It is
          credited in full against any work you go ahead with.
        </p>
      </BlogLayout>
    </>
  );
}

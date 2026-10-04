import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("why-wifi-slow-upstairs-irish-homes")!;

/*
 * Written to answer one question the way an assistant would be asked it: why
 * is my Wi-Fi slow upstairs or in the back rooms of an Irish house, and how do
 * I fix it. A direct answer first, question headings, one table, and the
 * questions again at the end with FAQPage schema built from the same text.
 *
 * Sources, read 30 September 2026:
 *   - ComReg, "The Effect of Building Materials on Indoor Mobile Performance"
 *     (ComReg 18/73, August 2018): samples of materials used in Irish
 *     construction measured from 400 MHz to 2.2 GHz, losses rising with
 *     frequency; foil-faced PIR board the worst insulation, up to 55 dB for
 *     150 mm; foil-backed plasterboard up to 45 dB at some frequencies; plain
 *     plasterboard, fibreglass and mineral wool negligible; solid concrete
 *     block and brick about 5 dB, cavity concrete block 25 dB; windows 15 to
 *     45 dB; large room-to-room variation; the 2011 and 2017 Building
 *     Regulations; 20 dB is a hundredfold drop.
 *   - Virgin Media Ireland's Wi-Fi signal help page: central and in the open;
 *     walls, metal objects, furniture, a large mirror and fish tanks; 2.4 GHz
 *     reaches further but is slower, 5 GHz faster but works best closer; a
 *     restart helps the hub pick the best channel.
 *   - NETGEAR's router placement guide (central, off the floor, not in a
 *     corner or cupboard, away from metal, reflective surfaces and fish tanks;
 *     in two-storey homes, ground floor near the ceiling or upstairs near the
 *     floor) and its knowledge base article on 2.4, 5 and 6 GHz (higher
 *     frequencies get through walls and floors less well).
 *   - TP-Link: FAQ 499 (2.4 GHz is more crowded, microwaves and cordless
 *     phones; fewer devices use 5 GHz), its band steering post, its weak Wi-Fi
 *     post (walls, floors, brick, concrete and metal; 2.4 GHz for rooms behind
 *     walls; channel; firmware) and its Deco Ethernet backhaul FAQ (faster,
 *     more stable, lower latency; thick walls and multi-storey homes).
 *   - Net1's fibre installation page: the line comes to the first point of
 *     entry, usually near the phone line, with sockets there for the router.
 *   - eir's Smart WiFi Hub quick start guide: place the unit halfway between
 *     the modem and the area with poor Wi-Fi.
 *   - Nu-Heat's ClippaPlate and FoilBoard pages: aluminium plates in
 *     underfloor heating for timber floors.
 * It recommends no product.
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
  { id: "why-it-fades", label: "Why does Wi-Fi fade upstairs and in the back rooms?" },
  { id: "materials", label: "Which building materials weaken Wi-Fi?" },
  { id: "bands", label: "2.4 GHz or 5 GHz: which is better upstairs?" },
  { id: "diagnose", label: "How do you find where the signal is lost?" },
  { id: "fixes", label: "What fixes it, from free upwards?" },
  { id: "measured", label: "When is it worth having the house measured?" },
  { id: "faq", label: "Frequently asked questions" },
];

/* One list feeds both the questions on the page and the FAQPage schema, so
   the two cannot say different things. */
const FAQ = [
  {
    q: "Why is my Wi-Fi fine downstairs but slow upstairs?",
    a: "Wi-Fi weakens with distance and with every wall, floor and ceiling it passes through, and the router usually sits downstairs, where the broadband line comes in. Foil-backed insulation and metal take more of the signal again.",
  },
  {
    q: "Does foil-backed insulation block Wi-Fi?",
    a: "It weakens it badly. In ComReg's 2018 tests, foil-faced insulation board cost up to 55 dB more than open air and foil-backed plasterboard up to 45 dB, while plain plasterboard and mineral wool barely mattered. ComReg tested mobile frequencies, below Wi-Fi's, and found the losses grew with frequency.",
  },
  {
    q: "Do concrete block walls block Wi-Fi?",
    a: "They weaken it. At mobile frequencies ComReg measured about 5 dB of extra loss through solid concrete block and brick, and about 25 dB through cavity concrete block. The losses add up wall by wall.",
  },
  {
    q: "Should I use 2.4 GHz or 5 GHz upstairs?",
    a: "2.4 GHz reaches further and gets through walls and floors better, but it is slower and more crowded. 5 GHz is faster but works best close to the router or an access point. Many routers can choose for each device, which TP-Link calls band steering.",
  },
  {
    q: "Will a Wi-Fi extender or mesh system fix slow Wi-Fi upstairs?",
    a: "Only if it can hear the router. A unit linked over Wi-Fi receives the signal through the same walls and floors, so place it halfway, where the signal is still good. A unit linked by cable or powerline gets past them.",
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
          <strong>The short answer:</strong> Wi-Fi is a radio signal, and every wall, floor and metre between the router
          and your room takes a share of it. The router usually sits where the broadband line comes into the house, a
          spot chosen for the line, not for the Wi-Fi. Foil is the worst of it: in tests by ComReg, the communications
          regulator, foil-faced insulation took the most signal of any building material, while plain plasterboard and
          mineral wool barely mattered. Test first, move the router, change its settings, and only then pay for mesh,
          powerline or a cabled access point.
        </p>

        <h2 id="why-it-fades">Why does Wi-Fi fade upstairs and in the back rooms?</h2>
        <p>
          Your router sends Wi-Fi out in every direction. TP-Link, which makes routers, puts it plainly: walls, floors,
          ceilings and dense materials such as brick and concrete each absorb part of the signal. The further the room,
          and the more walls and floors in between, the less arrives.
        </p>
        <p>
          The router&apos;s spot is chosen for the line. Net1, an Irish provider, tells fibre customers the line is
          usually brought to the first point of entry into the house, near where the phone line comes in, with sockets
          there for the router. If yours is in the hall beside the phone socket, that is why.
        </p>
        <p>
          ComReg adds that the Building Regulations revised in 2011 and 2017 made new homes meet EU energy-efficiency
          targets, and that some of the materials used to meet them, foil-backed insulation and windows with aluminium
          or metal frames, reflect radio signals as well as keeping the heat in.
        </p>

        <h2 id="materials">Which building materials weaken Wi-Fi in an Irish house?</h2>
        <p>
          In 2018 ComReg tested panels of the brick, block, insulation, windows and roof tiles used in Irish building,
          and{" "}
          <a
            href="https://www.comreg.ie/publication/the-effect-of-building-materials-on-indoor-mobile-performance"
            rel="noopener"
          >
            published how much signal each one took
          </a>
          . It measured mobile phone frequencies, from 400 MHz to 2.2 GHz. Wi-Fi runs higher, at 2.4 and 5 GHz, and
          ComReg found the losses generally grew with frequency. By its own explanation, 20 dB is a hundredfold drop in
          signal strength.
        </p>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>What the tests found</th>
              <th>What to do about it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Foil-faced insulation board (PIR)</td>
              <td>
                The worst insulation tested. Foil on both faces; the loss grew with thickness, up to 55 dB more than open
                air for 150 mm board.
              </td>
              <td>Do not rely on Wi-Fi passing through it. Feed an access point on the near side by cable or powerline.</td>
            </tr>
            <tr>
              <td>Foil-backed plasterboard</td>
              <td>Up to 45 dB more at some frequencies. Plain plasterboard barely registered.</td>
              <td>Treat a wall dry-lined with it like foil board.</td>
            </tr>
            <tr>
              <td>Fibreglass and mineral wool</td>
              <td>Negligible.</td>
              <td>Not the cause.</td>
            </tr>
            <tr>
              <td>Solid concrete block and brick</td>
              <td>About 5 dB.</td>
              <td>Small for one wall, but the losses add up. Count the walls between router and room.</td>
            </tr>
            <tr>
              <td>Cavity concrete block</td>
              <td>About 25 dB.</td>
              <td>Keep the router off the far side of one.</td>
            </tr>
            <tr>
              <td>Windows</td>
              <td>15 to 45 dB. Aluminium and PVC frames took more than hardwood.</td>
              <td>Matters for a garden room reached through glass.</td>
            </tr>
            <tr>
              <td>Metal, large mirrors, fish tanks</td>
              <td>Named by Virgin Media Ireland and NETGEAR. Not measured.</td>
              <td>Keep them out of the line between router and room.</td>
            </tr>
            <tr>
              <td>Underfloor heating in an upstairs timber floor</td>
              <td>
                Not tested by ComReg. Systems for timber floors, such as Nu-Heat&apos;s ClippaPlate and FoilBoard, use
                aluminium plates to spread the heat.
              </td>
              <td>A layer of metal between a router downstairs and the rooms above. Put a Wi-Fi source upstairs.</td>
            </tr>
          </tbody>
        </table>
        <p>
          A chimney breast is a thick mass of brick or block, the kind of thick wall TP-Link says absorbs a meaningful
          share of the signal. ComReg also found the loss can vary a great deal from room to room in one building, which
          is why one bedroom can be fine and the next one hopeless.
        </p>

        <h2 id="bands">2.4 GHz or 5 GHz: which is better upstairs?</h2>
        <p>
          Virgin Media Ireland sums up the trade: 2.4 GHz reaches further from the router but is slower; 5 GHz is faster
          but works well only closer to it. NETGEAR explains why: higher frequencies get through walls and floors less
          well. The 6 GHz band on newer Wi-Fi 6E and Wi-Fi 7 routers is faster again, and reaches least far.
        </p>
        <ul>
          <li>
            Near the router or an access point, use 5 GHz. Upstairs or behind walls, TP-Link&apos;s advice is 2.4 GHz.
          </li>
          <li>2.4 GHz is crowded. TP-Link names microwaves and cordless phones as the biggest offenders.</li>
          <li>
            Band steering, as TP-Link calls it, lets the router pick the band for each device under one network name,
            and leaves 2.4 GHz clearer for devices that can use nothing else.
          </li>
        </ul>
        <p>A different band can steady a weak connection. It cannot replace a signal the house is blocking.</p>

        <h2 id="diagnose">How do you find where the signal is being lost?</h2>
        <p>
          Run a speed test beside the router, then in the room that struggles, on the same device. Slow even at the
          router means the broadband, not the house: our guide to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> shows how to
          check with your provider&apos;s own test. Fast at the router and slow upstairs means the Wi-Fi is being lost on
          the way, and our <Link href="/blog/how-to-test-wifi-speed-room-by-room">room-by-room guide</Link> shows where to
          test and what the numbers mean. The <Link href="/wifi-check">free Wi-Fi check</Link> runs both tests for you. If the signal gets so weak that devices keep dropping off altogether, see{" "}<Link href="/blog/why-does-my-wifi-keep-dropping-ireland">why Wi-Fi keeps dropping</Link>.
        </p>

        <h2 id="fixes">What fixes slow Wi-Fi upstairs, from free upwards?</h2>
        <p>
          Roughly in order of cost. Test after each one to see what helped. For the same ladder across a whole house, and
          the buys that are a waste of money, see{" "}
          <Link href="/blog/how-to-boost-wifi-signal-ireland">how to boost your Wi-Fi signal</Link>.
        </p>

        <h3>1. Move the router</h3>
        <p>It costs nothing. Router makers and providers agree:</p>
        <ul>
          <li>Central, and up off the floor on a shelf or table.</li>
          <li>In the open: not in a cupboard, behind the TV or in a corner.</li>
          <li>Away from metal, large mirrors, fish tanks, the microwave and cordless phones.</li>
          <li>In a two-storey house, NETGEAR suggests high up on the ground floor or low down on the floor above.</li>
        </ul>
        <p>
          If the line ties it to the hall, ask your provider what moving it would involve, or let one of the fixes below
          carry the connection away from it.
        </p>

        <h3>2. Change the settings</h3>
        <ul>
          <li>Restart the router, which Virgin Media Ireland says helps its hub pick the best channel.</li>
          <li>Update the firmware, which TP-Link notes often brings performance improvements.</li>
          <li>Try a less crowded channel, so you are not competing with the neighbours&apos; networks.</li>
          <li>Turn on band steering, or put the devices that live upstairs on 2.4 GHz.</li>
        </ul>

        <h3>3. Mesh Wi-Fi</h3>
        <p>
          A mesh system puts several units around the house on one network name. Unless they are cabled, the units link
          to each other over Wi-Fi, so the link to an upstairs unit crosses the same floor the router could not. Place that
          unit roughly halfway, where the signal is still good, as eir advises for its own Smart WiFi units, not in the dead
          room. More in our <Link href="/blog/mesh-wifi-explained">guide to mesh Wi-Fi</Link>.
        </p>

        <h3>4. Powerline</h3>
        <p>
          Powerline adapters carry the connection over the electrical wiring, so the long part of the trip happens inside
          the walls rather than through them. How well depends on your wiring; our{" "}
          <Link href="/blog/powerline-adapters-ireland">guide to powerline in Irish houses</Link> covers what decides it.
        </p>

        <h3>5. Wired access points</h3>
        <p>
          A network cable from the router to an access point on the floor that needs it gets past every wall and floor in
          the way. TP-Link&apos;s guidance for its mesh units is that a cable link is faster and more stable than a
          wireless one, with lower delay, and particularly worth it with thick walls and more than one floor. It is the
          most work, since the cable has to be run; where it cannot be, powerline can feed the access point. For
          which fix suits which problem, see{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">Wi-Fi extender, mesh or powerline</Link>.
        </p>

        <h2 id="measured">When is it worth having the house measured?</h2>
        <p>
          If the router has moved, the settings are tried and a floor is still slow, measure the whole house before buying
          anything. Our <Link href="/services/wifi">home network assessment</Link> does that: a two-hour visit to test
          your broadband by cable at the router and measure every room, then a working powerline and access point trial
          left on the floor that struggles for three days, with a written report of the figures. It costs €395, credited
          in full against any work you go ahead with, in Dublin and the rest of Leinster.
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

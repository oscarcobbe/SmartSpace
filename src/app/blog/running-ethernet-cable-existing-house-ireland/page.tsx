import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("running-ethernet-cable-existing-house-ireland")!;

/*
 * Written for "how do I run Ethernet cable in an existing Irish house without
 * ripping walls apart", laid out so an AI assistant can lift the short answer,
 * the routes table and the questions whole.
 *
 * Sources, read 30 September 2026:
 *  - ComReg, "All About Broadband" (consumer brochure, September 2025): a wired
 *    ethernet connection will always be more reliable and will generally be
 *    faster; the most stable connections are wired.
 *  - TP-Link FAQ 1794, "Deco Ethernet Backhaul: Setup, Wiring Rules, and
 *    Troubleshooting" (updated 17 April 2026): faster and more stable than a
 *    wireless link, uses none of the wireless bandwidth shared with devices,
 *    lower latency; not every unit needs a cable; wired and wireless backhaul
 *    can be mixed; a switch can sit between units.
 *  - Fluke Networks:
 *     - "Ethernet Cable Categories Explained: A Brief History" (24 February
 *       2022): Cat5e 100 MHz, gigabit; some installed Cat5e and Cat6 can carry
 *       2.5 or 5 Gb/s to 100 m after qualification testing; Cat6 250 MHz;
 *       Cat6A 500 MHz, 10 Gb/s to 100 m, recommended for new horizontal LAN
 *       deployments.
 *     - "10GBASE-T field testing requirements" (TSB-155): 10GBASE-T over Cat6
 *       up to 37 m, and 37 to 55 m depending on the alien crosstalk.
 *     - "Channel, Permanent Link, Patch Cords, MPTL, E2E... Oh My!" (26 June
 *       2019): 100 m channel including cords, 90 m permanent link.
 *     - "Stranded vs. Solid Wire Cable: How to Choose" (6 March 2024): the
 *       standards require solid cable for the permanent link; stranded has 20
 *       to 50 per cent more attenuation and is limited to patch cords and 10 m
 *       within a channel; solid can break if flexed too often.
 *     - "Residential Cabling Specification" (knowledge base, 28 January 2014):
 *       Cat5e or Cat6 home runs to each outlet, two per outlet; at least 12
 *       inches from electrical cabling and from light fixtures; cross at 90
 *       degrees; exterior-rated cable where a run goes outside; nail and staple
 *       holes as a cause of faults; links tested.
 *     - "CCA Wire: What Is Copper Clad Aluminum Cable?": does not meet the
 *       category standards; does not support PoE.
 *     - "A Guide to Successful Installation of Power over Ethernet": low-voltage
 *       DC power and data together over Cat5e, Cat6 and Cat6A; Wi-Fi access
 *       points and cameras among the devices.
 *  - Excel Networking, Installation Guidelines (Excel Encyclopaedia, section
 *    19): EN 50174 separation summary, with safety separation taking
 *    precedence; no more than two 90 degree bends in a pulled run; kinked cable
 *    replaced; ties not over-tightened, jacket not deformed; avoid routes with
 *    extreme thermal cycling; last twist within 13 mm of the termination;
 *    diameters (Cat5e U/UTP 5.2 mm, Cat6 U/UTP 6.2 mm, Cat6A U/UTP 8.3 mm);
 *    armoured cable for direct burial, its earthing left to the electrical
 *    trade. Datasheet 190-980-DS (generated 3 February 2025): outdoor Cat6A
 *    with a PE outer sheath that is water, UV and moisture resistant, for ducts
 *    outdoors, the outer sheath removed where more than 2 m runs inside.
 *  - Safe Electric Ireland, "Restricted & Controlled Electrical Works":
 *    installing or replacing circuits and modifying or replacing distribution
 *    boards in a home are Restricted Electrical Works, carried out and
 *    certified only by a Registered Electrical Contractor.
 *  - NETGEAR KB 20233, powerline FAQ: works across closed circuit breakers;
 *    appliances on the line and the age of the wiring matter more than
 *    distance.
 *
 * Left out as unverified: the I.S. 10101 cable zones in walls (only UK BS 7671
 * write-ups found), rules for drilling joists (only UK guidance found), and any
 * claim about how Irish walls and floors are typically built.
 *
 * Smart Space does not run cable; its fix is powerline. The assessment is
 * described from /services/wifi and src/data/wifiPackages.ts and mentioned
 * once. No product is recommended and no price is given except our own.
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
  { id: "short-answer", label: "How do I run Ethernet without ripping walls apart?" },
  { id: "why-wired", label: "Is a cable still better than Wi-Fi?" },
  { id: "which-cable", label: "Cat5e, Cat6 or Cat6a: which should I use?" },
  { id: "how-far", label: "How long can an Ethernet run be?" },
  { id: "routes", label: "What are the usual routes through a house?" },
  { id: "mains", label: "How far should data cable be from mains?" },
  { id: "outdoor", label: "What cable do I need outside?" },
  { id: "sockets", label: "Wall sockets or a long patch lead?" },
  { id: "powerline", label: "What if there is no route at all?" },
  { id: "access-points", label: "What goes on the end of the cable?" },
  { id: "check-first", label: "Is it worth measuring before drilling?" },
  { id: "questions", label: "Common questions" },
];

const faqs = [
  {
    q: "Can I run Ethernet cable without damaging walls?",
    a: "Usually. Most houses have a route through the attic, along the skirting, under the floorboards, through the hot press or round the outside in conduit. A hollow internal wall needs only small holes.",
  },
  {
    q: "Should I use Cat6 or Cat6a in a house?",
    a: "Cat6 suits most houses: gigabit over the full run, and 10 Gb/s up to about 37 metres. Cat6a carries 10 Gb/s the full 100 metres but is thicker and harder to fit.",
  },
  {
    q: "How far can an Ethernet cable run?",
    a: "100 metres in total under the cabling standards, including the patch leads at each end, with 90 metres for the fixed cable.",
  },
  {
    q: "Can Ethernet cable run beside electrical cables?",
    a: "Keep them apart. Fluke Networks' residential cabling specification asks for at least 12 inches, about 30 cm, and for crossings at right angles. New circuits and fuse board changes are for a Registered Electrical Contractor.",
  },
  {
    q: "Can I use ordinary Ethernet cable outside?",
    a: "No. Use exterior-rated cable, ideally in conduit. Excel Networking's outdoor Cat6a, for example, has a sheath that resists water and UV, stripped off where more than 2 metres runs indoors.",
  },
  {
    q: "Is powerline as good as an Ethernet cable?",
    a: "Not always. It needs no new cable, but NETGEAR says the appliances on the line and the age of the wiring affect it more than distance. Test it in your own house first.",
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
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc} cta={NETWORK_GUIDE_CTA}>
        <p>
          Wi-Fi is fine for phones. A desk, a TV or a mesh unit does better on a cable, and most houses have hidden paths
          for one.
        </p>

        <h2 id="short-answer">How do I run Ethernet cable without ripping walls apart?</h2>
        <p>
          Follow the gaps the house already has. Go up through the attic and drop down a hollow internal wall, clip the
          cable along the skirting, run it round the outside in conduit with outdoor-rated cable, lift a floorboard, or
          follow the pipes through the hot press. Use solid Cat6 for the fixed run, finish it on a wall socket at each end,
          keep it about 30 cm from mains cables, and keep the fixed run under 90 metres. Where there is no route at all,
          powerline uses the electrical wiring instead.
        </p>

        <h2 id="why-wired">Is a cable still better than Wi-Fi?</h2>
        <p>
          For anything that stays put, yes. ComReg&apos;s broadband guide says a wired connection &ldquo;will always be more
          reliable and will generally be faster.&rdquo;
        </p>
        <ul>
          <li>
            <strong>Desks and TVs</strong> on a cable stop competing with phones and tablets for the Wi-Fi, which is one of
            the best fixes for{" "}
            <Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices on the Wi-Fi</Link>.
          </li>
          <li>
            <strong>Mesh units</strong> linked by cable: TP-Link says that is faster and more stable than a wireless link,
            with lower latency, and uses none of the Wi-Fi capacity your devices share.
          </li>
        </ul>

        <h2 id="which-cable">Cat5e, Cat6 or Cat6a: which should I use?</h2>
        <p>The category says how much signal a cable is built to carry. As Fluke Networks, which makes cable testers, sets out:</p>
        <ul>
          <li>
            <strong>Cat5e</strong> is rated to 100 MHz and built for gigabit. Some installed Cat5e can carry 2.5 or 5 Gb/s
            over 100 metres after testing.
          </li>
          <li>
            <strong>Cat6</strong> is rated to 250 MHz. It carries 10 Gb/s only on shorter runs: up to 37 metres, and up to
            55 depending on interference from neighbouring cables.
          </li>
          <li>
            <strong>Cat6a</strong> is rated to 500 MHz and carries 10 Gb/s the full 100 metres. It is thicker: Excel
            Networking&apos;s unscreened Cat6a is 8.3 mm across, against 6.2 mm for its Cat6, so it needs bigger holes,
            deeper back boxes and gentler bends.
          </li>
        </ul>
        <p>
          For a house, Cat6 is the sensible default. Fluke&apos;s residential cabling specification calls for Cat5e or Cat6,
          two cables to each outlet, which is worth copying while the route is open. Avoid copper-clad aluminium (CCA)
          cable: Fluke says it does not meet the category standards and cannot carry Power over Ethernet.
        </p>

        <h2 id="how-far">How long can an Ethernet run be?</h2>
        <p>
          100 metres end to end, including the leads at each end, with 90 metres for the fixed cable, under the cabling
          standards as Fluke explains them. A house rarely gets near it; a{" "}
          <Link href="/blog/wifi-garden-office-ireland">garden office</Link> can.
        </p>

        <h2 id="routes">What are the usual routes through a house?</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Disruption</th>
                <th>Good for</th>
                <th>Watch out for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Up through the attic, down an internal wall</td>
                <td>Low: a hole at the top of the wall and a socket box</td>
                <td>Upstairs rooms, the landing, a ceiling access point</td>
                <td>Solid walls; light fittings and mains cables in the attic</td>
              </tr>
              <tr>
                <td>Along the skirting</td>
                <td>Low: clips or slim trunking, a hole through each wall</td>
                <td>Rooms side by side, the TV corner</td>
                <td>Clips that squash the cable; door frames</td>
              </tr>
              <tr>
                <td>Outside, in conduit</td>
                <td>Medium: a hole through the outside wall at each end</td>
                <td>Front to back of the house, an extension</td>
                <td>Outdoor-rated cable; sealing the holes</td>
              </tr>
              <tr>
                <td>Under the floor</td>
                <td>Medium: lifting floorboards</td>
                <td>Suspended timber floors, between upstairs rooms</td>
                <td>Solid floors; joists, pipes and mains under the boards</td>
              </tr>
              <tr>
                <td>Hot press or a cupboard void</td>
                <td>Low to medium: holes in the cupboard floor and ceiling</td>
                <td>Getting from one floor to the next</td>
                <td>Hot pipes and the cylinder</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul>
          <li>
            <strong>The attic:</strong> a hollow stud wall lets a cable drop to a socket box; a solid wall does not, so look
            for a partition or a boxed-in corner. Fluke keeps data cable 12 inches from light fittings.
          </li>
          <li>
            <strong>The skirting:</strong> use clips sized for the cable, never hammered tight. Fluke lists nail and staple
            holes among common faults.
          </li>
          <li>
            <strong>Under the floor:</strong> drilling joists in the wrong place weakens a floor, so leave that to someone
            who knows where it is safe.
          </li>
          <li>
            <strong>The hot press:</strong> keep the cable off hot pipes and the cylinder. Excel advises avoiding routes
            exposed to extreme heating and cooling.
          </li>
          <li>
            <strong>Any route:</strong> pull gently, allow no more than two right-angle bends between pulling points, and
            replace any length that kinks, as Excel advises.
          </li>
        </ul>

        <h2 id="mains">How far should data cable be from mains?</h2>
        <p>
          Fluke&apos;s residential specification asks for as much distance as possible from electrical cables, at least 12
          inches (about 30 cm), and a right angle where the two must cross. Excel, summarising the European standard EN
          50174, adds that any separation required for safety comes first. Check for hidden cables and pipes before
          drilling.
        </p>
        <p>
          The data cable carries no mains power, but the work around it may. Safe Electric Ireland says installing or
          replacing circuits, and changing the fuse board, are Restricted Electrical Works, which in a home only a
          Registered Electrical Contractor may carry out and certify. An access point that takes Power over Ethernet needs no
          socket: Fluke describes it as low-voltage DC power sent along the data cable.
        </p>

        <h2 id="outdoor">What cable do I need outside?</h2>
        <p>
          Exterior-rated cable, which Fluke&apos;s residential specification calls for wherever a run goes outside the home.
        </p>
        <ul>
          <li>
            Excel&apos;s outdoor Cat6a, for example, has a black polyethylene sheath that resists water, UV and moisture,
            and must be stripped where more than 2 metres runs indoors, leaving a fire-rated inner sheath. Check the
            datasheet of whatever you buy.
          </li>
          <li>Run it in conduit along the wall, with the holes sealed where it goes in and out.</li>
          <li>
            Buried straight in the ground, Excel recommends armoured cable, and says earthing the armour is for the
            electrical trade.
          </li>
        </ul>

        <h2 id="sockets">Wall sockets or a long patch lead?</h2>
        <p>
          A ready-made patch lead suits a short run you can see. Inside a wall, do it properly:
        </p>
        <ul>
          <li>
            <strong>Solid cable in the wall.</strong> Fluke says the standards require it for the fixed run. Stranded cable
            bends well but loses 20 to 50 per cent more signal, so it is limited to patch leads of up to 10 metres in total.
          </li>
          <li>
            <strong>A wall socket at each end,</strong> with short patch leads to the router and the device. Solid cable can
            break if flexed too often, so the leads take the wear.
          </li>
          <li>
            <strong>Neat terminations:</strong> Excel keeps the last twist within 13 mm of the connection. Test every run
            before closing anything up.
          </li>
        </ul>

        <h2 id="powerline">What if there is no route at all?</h2>
        <p>
          Powerline adapters carry your connection over the electrical wiring, with no drilling. NETGEAR says powerline
          generally works across circuit breakers, but every appliance on the line adds interference, and the age of the
          wiring matters more than distance. Our <Link href="/blog/powerline-adapters-ireland">guide to powerline in Irish
          houses</Link> explains how to test it.
        </p>

        <h2 id="access-points">What goes on the end of the cable?</h2>
        <p>
          The device itself, or Wi-Fi for the room. A wired access point gives a room or floor its own signal, and Fluke
          lists access points among the devices commonly powered over the cable. A mesh unit can use the cable as its
          backhaul: TP-Link says you need not cable every unit, and wired and wireless links can be mixed. Our{" "}
          <Link href="/blog/mesh-wifi-explained">guide to mesh Wi-Fi</Link> explains where the units should go.
        </p>

        <h2 id="check-first">Is it worth measuring before drilling?</h2>
        <p>
          Yes. Run the <Link href="/wifi-check">free Wi-Fi check</Link> beside the router and in the room that struggles.
          In Dublin or Leinster, our <Link href="/services/wifi">€395 home network assessment</Link> tests your broadband by
          cable at the router, measures every floor, and leaves a working trial on the floor that struggles for three days,
          with a written report. If your house really does need cabling, you have the measurements to hand to whoever does
          it. It is credited in full against any work.
        </p>

        <h2 id="questions">Common questions</h2>
        {faqs.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </BlogLayout>
    </>
  );
}

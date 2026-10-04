import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("wifi-garden-office-ireland")!;

/*
 * Written for the garden office and garden room Wi-Fi question, laid out so an
 * AI assistant can lift the short answer, the table and the questions whole.
 *
 * Sources, read 30 September 2026:
 *  - "Building Materials and Propagation", the final report Aegis, Signal
 *    Science and BRE wrote for Ofcom (14 September 2014): metal in buildings
 *    strongly attenuates radio; the thin metal in foil-backed insulation boards
 *    and low emissivity glass gives losses of tens of decibels; measured at
 *    2.4 GHz and 5.8 GHz among others.
 *  - Kingspan's Thermawall TW55 brochure (Ireland edition): faced on both
 *    sides with low emissivity composite foil, for timber and steel frame walls.
 *  - Summerhouse24 Ireland: "Best Insulated Garden Rooms" (11 February 2026),
 *    PIR boards such as Celotex or Kingspan are the standard for high
 *    performance rooms; "Technical and Legal Requirements for Garden Office
 *    Electricity in Ireland" (13 March 2026), power usually arrives by armoured
 *    cable, a separate fuse board in the office is standard practice, and Cat6
 *    should run in its own duct in the same trench.
 *  - TP-Link: Deco placement guide (two bars between units; open area away from
 *    walls and metal; wired backhaul more stable and faster), Deco range FAQ
 *    (wireless units no more than 50 feet apart), Deco X50-Outdoor UK product
 *    page (IP65, PoE or mains, joins any Deco network), powerline FAQ 406 (some
 *    fuse boards filter the signal; a pair that loses its link when moved is
 *    usually on separate circuits), and the Outdoor CPE installation guide
 *    (clear line of sight, elevated mounting, trees, buildings and steel weaken
 *    the link, proper grounding).
 *  - NETGEAR powerline FAQ 20233: works across closed breakers; distance and
 *    line noise reduce coverage.
 *  - Fluke Networks, "Channel, Permanent Link, Patch Cords": 100 metre channel,
 *    90 metre permanent link.
 *  - ComReg: "Types of Broadband Technology" (mobile broadband is a SIM router
 *    on 4G or 5G, not normally as fast or reliable as fixed; insulation can
 *    hurt indoor coverage) and "Check mobile coverage at your location"
 *    (predicted outdoor coverage by Eircode; insulation, thick walls and double
 *    or triple glazing weaken it indoors).
 *  - Microsoft Learn, "Prepare your organization's network for Teams" (video
 *    meetings 2,500 kbps up and 4,000 down recommended; 5 GHz better suited to
 *    real-time media) and Zoom's system requirements (1080p group video 3.8
 *    Mbps up, 3.0 down).
 *
 * The assessment is described from /services/wifi and the home network
 * assessment entry in src/data/wifiPackages.ts, and mentioned once. No product
 * is recommended and no price is given except our own.
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
  { id: "short-answer", label: "What is the best way to get Wi-Fi to a garden office?" },
  { id: "why-it-drops", label: "Why does the signal drop in a garden room?" },
  { id: "compare", label: "Which option suits which garden room?" },
  { id: "mesh", label: "Will a mesh unit at the back of the house reach it?" },
  { id: "outdoor-access-point", label: "Are outdoor access points worth it?" },
  { id: "bridge", label: "What is a point-to-point wireless bridge?" },
  { id: "ethernet", label: "Why is a cable in a duct the gold standard?" },
  { id: "powerline", label: "Will powerline work in a garden room?" },
  { id: "own-broadband", label: "Should the garden office have its own broadband or 5G?" },
  { id: "video-calls", label: "How do I keep video calls steady out there?" },
  { id: "measure", label: "When is it worth getting it measured?" },
  { id: "questions", label: "Common questions" },
];

const faqs = [
  {
    q: "Can I get Wi-Fi in a garden room without running a cable?",
    a: "Yes. A mesh unit at the back of the house, an outdoor access point, a wireless bridge, powerline or 5G home broadband can all work without a trench, depending on the distance, what is in the way, and how the room is built and wired.",
  },
  {
    q: "Do powerline adapters work in a garden office?",
    a: "Sometimes. The signal weakens over long runs and through some fuse boards, and garden rooms often have their own fuse board fed by a buried cable. Test a pair in the room before relying on it.",
  },
  {
    q: "How far can an Ethernet cable run to a garden office?",
    a: "Up to 100 metres in total under the cabling standards, including the leads at each end, with 90 metres for the fixed run.",
  },
  {
    q: "Does insulation block Wi-Fi in a garden room?",
    a: "It can. A report for Ofcom found that foil-faced insulation boards and low emissivity glass can cause heavy signal losses, and metal cladding or roofing blocks radio more strongly still.",
  },
  {
    q: "What internet speed do I need for video calls from a garden office?",
    a: "Microsoft recommends 2.5 Mbps up and 4 Mbps down per person for Teams video meetings; Zoom lists 3.8 Mbps up and 3.0 Mbps down for 1080p group video. Measure the upload at your desk.",
  },
  {
    q: "Is 5G home broadband a good option for a garden office?",
    a: "It can be, where coverage is strong, though ComReg says mobile broadband will not normally be as fast or reliable as a fixed line, and insulation can weaken indoor coverage. Check ComReg's coverage map for your Eircode.",
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
          A garden office works well until the video call freezes. The Wi-Fi has to leave the house, cross the garden and
          get into a building designed to keep heat in. Here are six realistic ways to get it there.
        </p>

        <h2 id="short-answer">What is the best way to get Wi-Fi to a garden office?</h2>
        <p>
          The most reliable way is a network cable from the house to the garden room, in its own duct, with a mesh unit or
          access point at the far end. Without digging, a point-to-point wireless bridge or an outdoor access point carries
          the connection across the garden. A mesh unit at the back of the house suits a close room with glass facing the
          house. Powerline works only if the room&apos;s wiring allows, and a separate line or 5G home broadband skips the
          house network altogether. Measure the speed in the room first.
        </p>

        <h2 id="why-it-drops">Why does the signal drop in a garden room?</h2>
        <ul>
          <li>
            <strong>Distance.</strong> TP-Link advises keeping its Deco mesh units no more than 50 feet, about 15 metres,
            apart when they link over the air. Many garden rooms are further away.
          </li>
          <li>
            <strong>The back wall of the house,</strong> before the signal even reaches the garden.
          </li>
          <li>
            <strong>The room itself.</strong> Rigid PIR boards, such as Kingspan&apos;s and Celotex&apos;s, are standard in
            well-insulated garden rooms, and Kingspan&apos;s Thermawall TW55 for timber frame walls is faced on both sides
            with foil. A report for Ofcom, the UK regulator, found that the thin metal in foil-faced insulation and low
            emissivity glass can cause heavy signal losses, and that metal in a building strongly blocks radio. A room
            lined with foil, or clad or roofed in metal, can have a poor signal with the house in plain view.
          </li>
        </ul>

        <h2 id="compare">Which option suits which garden room?</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Works well when</th>
                <th>Watch out for</th>
                <th>Effort</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mesh unit at the back of the house</td>
                <td>The room is close, with glass facing the house</td>
                <td>Distance, foil insulation, coated glass</td>
                <td>Low: plug in and set up</td>
              </tr>
              <tr>
                <td>Outdoor access point</td>
                <td>You want the garden covered too</td>
                <td>The room&apos;s walls and glass, still in the way</td>
                <td>Medium: a weatherproof unit, cabled to the router</td>
              </tr>
              <tr>
                <td>Point-to-point wireless bridge</td>
                <td>A clear line of sight between the buildings</td>
                <td>Trees and buildings in the path; earthing</td>
                <td>Medium: a radio on each building</td>
              </tr>
              <tr>
                <td>Ethernet cable in a duct</td>
                <td>You want it to behave like a room in the house</td>
                <td>The digging; a 100 metre limit</td>
                <td>High: a trench, easiest when the power goes in</td>
              </tr>
              <tr>
                <td>Powerline</td>
                <td>The room shares the house&apos;s wiring on a short run</td>
                <td>A separate fuse board or supply; a long run</td>
                <td>Low: plug in, pair, test</td>
              </tr>
              <tr>
                <td>Own broadband line or 5G</td>
                <td>The house connection is stretched, or no cable route exists</td>
                <td>A second bill; 5G depends on coverage</td>
                <td>Low to medium: a second contract</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 id="mesh">Will a mesh unit at the back of the house reach it?</h2>
        <p>
          Often, if the room is close. Put one unit near a back window facing the garden and a second inside the garden
          room. Linked over the air, the second needs a decent signal from the first: TP-Link recommends two bars between
          units. Cable the back-of-house unit to the router if you can: TP-Link says a wired link is more stable and
          faster. Our <Link href="/blog/mesh-wifi-explained">guide to mesh Wi-Fi</Link> explains why, and{" "}
          <Link href="/blog/wifi-extender-mesh-or-powerline-ireland">extender, mesh or powerline</Link> compares the three.
        </p>

        <h2 id="outdoor-access-point">Are outdoor access points worth it?</h2>
        <p>
          An outdoor access point is a weatherproof Wi-Fi unit on the back wall of the house, cabled to the router, so the
          house&apos;s own walls are out of the way. TP-Link&apos;s Deco X50-Outdoor, for example, is rated IP65, joins an
          existing Deco network, and can take its power over the network cable (Power over Ethernet). The room&apos;s
          walls and glass still sit between it and your desk, so it suits a room with glass facing the house.
        </p>

        <h2 id="bridge">What is a point-to-point wireless bridge?</h2>
        <p>
          A pair of directional outdoor radios, one on the house and one on the garden room, aimed at each other. The house
          end is cabled to the router, the garden room end to an access point or mesh unit inside. Both radios sit outside,
          so the room&apos;s insulation does not affect the link.
        </p>
        <p>
          The catch is the view. TP-Link&apos;s guide for its outdoor radios asks for a clear line of sight and a high
          mounting, warns that trees, buildings and large steel structures weaken the signal, and stresses proper earthing.
          A bridge suits a long garden with a clear view.
        </p>

        <h2 id="ethernet">Why is a cable in a duct the gold standard?</h2>
        <p>
          A network cable gives the garden room the same connection as a room in the house. Plug a mesh unit or access
          point in at the far end.
        </p>
        <ul>
          <li>
            <strong>Give it its own duct.</strong> Irish garden building supplier Summerhouse24 recommends shielded Cat6 in a
            separate duct in the same trench as the power cable, away from its interference.
          </li>
          <li>
            <strong>Keep it within 100 metres.</strong> As Fluke Networks explains the cabling standards, that limit includes
            the leads at each end, with 90 metres for the fixed run.
          </li>
          <li>
            <strong>Do it while the trench is open.</strong> Power usually reaches a garden room by armoured cable
            underground, so if the room is not built yet, ask for a data duct alongside.
          </li>
        </ul>

        <h2 id="powerline">Will powerline work in a garden room?</h2>
        <p>
          Sometimes. Powerline sends your connection along the wiring between two sockets. NETGEAR says it generally works
          across circuit breakers, but distance and electrical noise reduce its reach; TP-Link says some fuse boards filter
          the signal. Summerhouse24 describes a separate fuse board in a garden office, fed by its own cable, as standard
          practice, so the signal must cross both boards and the buried cable. A room on its own electricity supply shares
          no wiring with the house at all.
        </p>
        <p>
          TP-Link&apos;s rule of thumb: a pair that works in one room but loses its link when moved is usually on separate
          circuits. Plug straight into the wall and test speed in the garden room before relying on it. Our{" "}
          <Link href="/blog/powerline-adapters-ireland">guide to powerline in Irish houses</Link> has more.
        </p>

        <h2 id="own-broadband">Should the garden office have its own broadband or 5G?</h2>
        <p>
          A second connection skips the house network entirely. A separate fixed line means a second contract; ask
          providers whether they will bring one to an outbuilding at your address.
        </p>
        <p>
          5G home broadband is a router with a SIM card, on the same signals as a phone. ComReg notes it will not normally
          be as fast or as reliable as a fixed line, and that insulation, thick walls and double or triple glazing can
          weaken indoor coverage. Check ComReg&apos;s coverage map for your Eircode, then try a phone on that network inside
          the room. For the rural picture, fibre, fixed wireless and satellite together, see{" "}
          <Link href="/blog/rural-broadband-ireland">rural broadband in Ireland</Link>.
        </p>

        <h2 id="video-calls">How do I keep video calls steady out there?</h2>
        <ul>
          <li>
            <strong>Know the target.</strong> Microsoft recommends 2.5 Mbps up and 4 Mbps down per person for Teams video
            meetings; Zoom lists 3.8 Mbps up and 3.0 Mbps down for 1080p group video.
          </li>
          <li>
            <strong>Measure at the desk,</strong> at the time you usually take calls. Our{" "}
            <Link href="/blog/how-to-test-wifi-speed-room-by-room">room-by-room guide</Link> shows how.
          </li>
          <li>
            <strong>Use a cable</strong> if the unit in the room has a network port.
          </li>
          <li>
            <strong>On Wi-Fi, use 5 GHz.</strong> Microsoft says it suits calls better, while 2.4 GHz is often affected by
            other devices.
          </li>
          <li>
            <strong>Keep the unit in the open,</strong> away from walls and metal, as TP-Link advises.
          </li>
          <li>
            <strong>Pause cloud backups</strong> during calls.
          </li>
        </ul>

        <h2 id="measure">When is it worth getting it measured?</h2>
        <p>
          Before paying for a trench or a bridge, run the <Link href="/wifi-check">free Wi-Fi check</Link> beside the router
          and at your desk in the garden room. If it is slow even at the router, the problem is the broadband, not the
          garden: see <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link>.
        </p>
        <p>
          In Dublin or Leinster, our <Link href="/services/wifi">€395 home network assessment</Link> tests your broadband by
          cable at the router, measures room by room, and leaves a working trial in the room that struggles for three days,
          with a written report. If the trial does not work in your house, the report says so, with figures you can hand to
          whoever runs a cable. It is credited in full against any work.
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

import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("ring-installation-cost-ireland")!;

/*
 * Written for "how much does it cost to have a Ring doorbell or camera
 * installed in Ireland", the question people put to ChatGPT and Google before
 * they book anyone. Every price in it is Smart Space's own, read on 30
 * September 2026 from the live pages and from src/data/productCatalogue.ts,
 * which those pages render:
 *
 *  - /services/doorbell: Plus €329, Pro €479, "All doorbell installations
 *    include the supply and setup of a Ring Chime", "can save almost €100 vs.
 *    running new mains cabling", "as little as an hour". Product variants:
 *    €429 and €579 with "New Cabling & Power Source Required".
 *  - /services/camera: Plus Floodlight Cam €379, Pro €479; variants €449 and
 *    €549 with "Yes - New Power Source Required"; an hour to two hours.
 *  - /services/installation-only: "From €139", and the calculator, which is
 *    the installation-only product's variant matrix (devices 1 to 6, existing
 *    working wired doorbell, cameras needing new power cabling). Combinations
 *    with no variant show "Quote required". Same price for every brand.
 *  - /services/bundles, /bundles/driveway, /bundles/whole-home: from €658
 *    (Pro €908), saves €50; from €987 (Pro €1,337), saves €100; Ring Chime
 *    included; whole home "typically takes half a day" and how new camera
 *    power is run. Eldercare bundle from €509.
 *  - /services/single only routes to the doorbell and camera pages.
 *  - /services/free-consultation: "Complimentary", no obligation, no card,
 *    Wi-Fi and wiring check, written quote the same day.
 *  - /terms: 12-month workmanship guarantee, warranty-claim help, public
 *    liability insurance. /faq: Ring Protect is paid to Ring.
 *
 * Outside sources, read the same day:
 *  - Safe Electric, "Restricted & Controlled Electrical Works" and "Find a
 *    Registered Electrical Contractor": what only a REC may do, minor works,
 *    always use a REC and ask for a Completion Certificate.
 *  - Ring (GB), "Positioning video doorbells and security cameras" (e6l7e):
 *    doorbells at 1.2 metres, outdoor cameras 2.5 to 3 metres with a
 *    20-degree tilt. Ring (GB), "Fixing offline devices" (uii72): add a
 *    Chime Pro, or use 2.4GHz instead of 5GHz.
 *
 * Left out as unverified: any competitor's prices, device-only prices, a price
 * for a Chime Pro, and €299 for a camera, which /services/camera's meta
 * description and /services/single still say while the camera page itself
 * shows €379. Nothing here says who does Smart Space's mains work.
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
  { id: "prices", label: "How much does Smart Space charge?" },
  { id: "included", label: "What is included in the price?" },
  { id: "installation-only", label: "What does fitting your own device cost?" },
  { id: "price-factors", label: "What makes an installation cost more?" },
  { id: "diy", label: "Is it cheaper to fit it yourself?" },
  { id: "ask", label: "What should you ask any installer?" },
  { id: "examples", label: "What do typical jobs cost?" },
  { id: "faq", label: "Questions people ask" },
  { id: "sources", label: "Sources" },
];

/* One list feeds both the visible questions and the FAQPage schema, so the
   two cannot say different things. Plain text only. */
const FAQ = [
  {
    q: "How much does it cost to have a Ring doorbell installed in Ireland?",
    a: "At Smart Space, a Ring video doorbell supplied and fitted costs €329 (Plus) or €479 (Pro), including a Ring Chime, or €429 and €579 where new cabling and power are needed. Fitting a doorbell you already own starts at €139.",
  },
  {
    q: "How much does it cost to have a Ring floodlight camera installed?",
    a: "At Smart Space, €379 for the Plus Floodlight Cam or €479 for the Pro when it replaces an existing light, and €449 or €549 when a new power source is needed. Fitting a camera you already own is €139, or €229 if it needs new power cabling.",
  },
  {
    q: "Is a Ring Chime included with a doorbell installation?",
    a: "With Smart Space, yes. All doorbell installations, bundles included, come with the supply and setup of a Ring Chime.",
  },
  {
    q: "Do I need an electrician to install a Ring doorbell?",
    a: "Not for a battery doorbell. If new mains wiring is needed, Safe Electric says installing a circuit is Restricted Electrical Works, which only a Registered Electrical Contractor can carry out and certify. It also says to ask for a Completion Certificate when the work is done.",
  },
  {
    q: "Is there a monthly fee after a Ring installation?",
    a: "The installation is a one-off cost. Ring Protect, Ring's optional cloud recording, is a separate subscription paid directly to Ring.",
  },
  {
    q: "Is the home security consultation really free?",
    a: "Yes. Smart Space's consultation is complimentary, with no obligation and no card required. We check Wi-Fi coverage and existing wiring, and send a written quote the same day.",
  },
];

const SOURCES = [
  {
    label: "Safe Electric, Restricted & Controlled Electrical Works",
    href: "https://safeelectric.ie/help-advice/controlled-restricted-electrical-works/",
  },
  {
    label: "Safe Electric, Find a Registered Electrical Contractor",
    href: "https://safeelectric.ie/find-an-electrician/",
  },
  {
    label: "Ring, Positioning video doorbells and security cameras",
    href: "https://ring.com/gb/en/support/articles/e6l7e/How-to-Properly-Position-Floodlight-Cam",
  },
  {
    label: "Ring, Fixing offline devices",
    href: "https://ring.com/gb/en/support/articles/uii72/fixing-offline-devices",
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
      <BlogLayout post={post} toc={toc}>
        <p>
          The price depends on the wiring at your door, how many devices you want, and whether you buy the kit or only
          the fitting.
        </p>
        <p>
          <strong>The short answer:</strong> at Smart Space, a Ring video doorbell supplied and fitted costs €329 (Plus)
          or €479 (Pro), with a Ring Chime included. A Ring floodlight camera supplied and fitted costs €379 (Plus) or
          €479 (Pro). If you already have the device, fitting starts at €139. Where new cabling and power are needed, add
          €100 to a doorbell and €70 to a floodlight camera. Bundles start at €658, and the home survey is free. These are
          our published prices on 30 September 2026, for Dublin and all of Leinster.
        </p>

        <h2 id="prices">How much does Smart Space charge?</h2>
        <table>
          <thead>
            <tr>
              <th>What you get</th>
              <th>Price</th>
              <th>With new cabling or power</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Plus Video Doorbell (2K), supplied and fitted</td>
              <td>€329</td>
              <td>€429</td>
            </tr>
            <tr>
              <td>Pro Video Doorbell (4K), supplied and fitted</td>
              <td>€479</td>
              <td>€579</td>
            </tr>
            <tr>
              <td>Plus Floodlight Cam (1080p), replacing an existing light</td>
              <td>€379</td>
              <td>€449</td>
            </tr>
            <tr>
              <td>Pro Floodlight Cam (4K), replacing an existing light</td>
              <td>€479</td>
              <td>€549</td>
            </tr>
            <tr>
              <td>Driveway Bundle: doorbell and one floodlight cam</td>
              <td>From €658 (Plus), €908 (Pro)</td>
              <td>Up to €828 (Plus), €1,078 (Pro)</td>
            </tr>
            <tr>
              <td>Whole Home Bundle: doorbell and two floodlight cams</td>
              <td>From €987 (Plus), €1,337 (Pro)</td>
              <td>Up to €1,227 (Plus), €1,577 (Pro)</td>
            </tr>
            <tr>
              <td>Installation only, your own device</td>
              <td>From €139</td>
              <td>€229 for one device</td>
            </tr>
            <tr>
              <td>Home consultation and written quote</td>
              <td>Free</td>
              <td>Not applicable</td>
            </tr>
          </tbody>
        </table>
        <p>
          The <Link href="/services/doorbell">doorbell</Link> and <Link href="/services/camera">floodlight camera</Link>{" "}
          pages show each price for your options before you book. The{" "}
          <Link href="/services/bundles/driveway">Driveway Bundle</Link> saves €50 and the{" "}
          <Link href="/services/bundles/whole-home">Whole Home Bundle</Link> saves €100 against the same devices bought
          singly: a Plus doorbell and Plus floodlight cam come to €708 separately, €658 together.
        </p>

        <h2 id="included">What is included in the price?</h2>
        <ul>
          <li>
            <strong>A Ring Chime with every doorbell.</strong> Our doorbell page says &quot;All doorbell installations
            include the supply and setup of a Ring Chime&quot;, so you hear the bell anywhere in the house. The bundles
            include one too.
          </li>
          <li>
            <strong>The fitting and the setup.</strong> Mounting, wiring, the Ring app, motion zones and a walkthrough.
          </li>
          <li>
            <strong>A 12-month workmanship guarantee.</strong> Our <Link href="/terms">terms</Link> say a fault caused by
            how we installed a device is fixed at no charge.
          </li>
          <li>
            <strong>Not included:</strong> Ring Protect, Ring&apos;s optional cloud recording, which is a separate
            subscription paid directly to Ring.
          </li>
        </ul>
        <p>
          A doorbell can take as little as an hour, a floodlight camera one to two hours, and a Whole Home Bundle
          typically half a day.
        </p>

        <h2 id="installation-only">What does fitting your own device cost?</h2>
        <p>
          For a Ring, Eufy, Nest, Tapo or Aosu device you bought yourself, the{" "}
          <Link href="/services/installation-only">installation-only page</Link> prices the fitting, the same for every
          brand. Its calculator asks three things: how many devices, whether there is a working wired doorbell where the
          new one goes, and how many cameras need new power cabling. It shows the total before you book.
        </p>
        <p>
          Where nothing needs new cabling, one device is €139, two €264, three €379, four €484, five €589 and six €694.
          Each device that needs new cabling adds €70 to €90, less on bigger jobs, so one doorbell or one camera needing
          new cabling is €229. A combination with no fixed price shows &quot;Quote required&quot; and a number to call.
        </p>

        <h2 id="price-factors">What makes an installation cost more?</h2>
        <ul>
          <li>
            <strong>Existing wiring or new cabling.</strong> The biggest factor in our prices. Re-using a working wired
            doorbell &quot;can save almost €100 vs. running new mains cabling&quot;, which is the gap between €329
            and €429. A floodlight camera that replaces an existing light is €70 less than one needing new power. On our
            Whole Home page, new camera power means a cable through the house wall, run along the skirting inside with
            white clips to the nearest socket, with the holes sealed.
          </li>
          <li>
            <strong>Number of devices.</strong> Bundles save €50 or €100. For installation only, a second device adds
            €125 and each one after that €105 to €115.
          </li>
          <li>
            <strong>Wall type, height and ladders.</strong> None of these is an option on our price pages; a job outside them
            is quoted after a chat about access, wiring routes and Wi-Fi. Ring says doorbells should sit 1.2 metres from
            the ground and outdoor cameras 2.5 to 3 metres up, so a floodlight camera means a ladder. Stone or solid
            block takes longer to drill than a timber frame. When comparing quotes, ask what each assumes.
          </li>
          <li>
            <strong>Wi-Fi at the door.</strong> Ring&apos;s fixes for an
            offline device include adding a Chime Pro to boost the signal, or using a 2.4GHz network instead of 5GHz. Ask
            whether a quote includes a Chime Pro. Why the signal dies at so many Irish front doors is in{" "}
            <Link href="/blog/smart-camera-wifi-drops-irish-homes">Why Your Smart Camera Keeps Dropping the Signal</Link>.
          </li>
        </ul>

        <h2 id="diy">Is it cheaper to fit it yourself?</h2>
        <p>
          Yes, if the job suits it. A battery doorbell on a timber frame is a reasonable DIY job, and the saving is the
          fitting fee: €139 for one device on our installation-only page. Swapping an existing wired doorbell is possible
          if you understand the wiring. New mains wiring is not a DIY job (see the next section). Our{" "}
          <Link href="/blog/ring-doorbell-installation-ireland-guide">Ring doorbell installation guide</Link> has the
          full DIY or professional breakdown, and{" "}
          <Link href="/blog/video-doorbell-no-existing-wiring-ireland">No Doorbell Wiring?</Link> covers doors with no
          bell wire.
        </p>

        <h2 id="ask">What should you ask any installer?</h2>
        <ol>
          <li>
            <strong>Is the price fixed, and what does it assume?</strong> Existing wiring, the number of devices, the
            wall and the height.
          </li>
          <li>
            <strong>Are you insured?</strong> Public liability insurance covers accidental damage to your home during the
            job. Our terms say we carry it.
          </li>
          <li>
            <strong>Who does any mains work, and will I get a certificate?</strong>{" "}
            <a href="https://safeelectric.ie/help-advice/controlled-restricted-electrical-works/" rel="noopener">
              Safe Electric
            </a>{" "}
            says Restricted Electrical Works, which covers most electrical work in a home, including installing a new
            circuit and its protective device on the fuse board, can only be carried out and certified by a Registered
            Electrical Contractor. Minor works, such as adding a socket to an existing circuit, are excluded. It says to
            always use one and ask for a Completion Certificate afterwards. Check a contractor on its{" "}
            <a href="https://safeelectric.ie/find-an-electrician/" rel="noopener">
              Find a Contractor
            </a>{" "}
            search.
          </li>
          <li>
            <strong>What aftercare is included?</strong> Who comes back if a device goes offline, and for how long.
            Ours is a 12-month workmanship guarantee, and in that time we help with any Ring warranty claim
            at no charge.
          </li>
          <li>
            <strong>What is in the price, and what is monthly?</strong> A chime, app setup, and whether any subscription
            is extra.
          </li>
        </ol>

        <h2 id="examples">What do typical jobs cost?</h2>
        <p>Example quotes, built only from Smart Space&apos;s published prices on 30 September 2026:</p>
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>At the house</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Fit a doorbell you bought</td>
              <td>Working wired doorbell already there</td>
              <td>€139</td>
            </tr>
            <tr>
              <td>Fit a doorbell you bought</td>
              <td>No wiring: new cabling and power</td>
              <td>€229</td>
            </tr>
            <tr>
              <td>Fit a doorbell and a camera you bought</td>
              <td>Doorbell wiring there, camera needs new power</td>
              <td>€349</td>
            </tr>
            <tr>
              <td>Plus Video Doorbell, supplied and fitted</td>
              <td>Working wired doorbell already there</td>
              <td>€329</td>
            </tr>
            <tr>
              <td>Pro Video Doorbell, supplied and fitted</td>
              <td>New cabling and power</td>
              <td>€579</td>
            </tr>
            <tr>
              <td>Plus Floodlight Cam, supplied and fitted</td>
              <td>Replaces an existing light</td>
              <td>€379</td>
            </tr>
            <tr>
              <td>Plus Driveway Bundle</td>
              <td>Doorbell needs new cabling, floodlight replaces a light</td>
              <td>€758</td>
            </tr>
            <tr>
              <td>Pro Whole Home Bundle</td>
              <td>New cabling for the doorbell and both cameras</td>
              <td>€1,577</td>
            </tr>
          </tbody>
        </table>
        <p>
          Not sure which row is yours? Book the <Link href="/services/free-consultation">free consultation</Link>: we
          check the Wi-Fi and wiring, and send a written quote the same day.
        </p>

        <h2 id="faq">Questions people ask</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <h2 id="sources">Sources</h2>
        <p>
          Prices are from our service pages, linked above. Outside sources, read on 30 September 2026:
        </p>
        <ul>
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a href={s.href} rel="noopener">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </BlogLayout>
    </>
  );
}

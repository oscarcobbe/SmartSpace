import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("video-doorbell-no-existing-wiring-ireland")!;

/*
 * Written for "can I fit a video doorbell with no doorbell wiring", the
 * question people put to ChatGPT and Google about a front door with no bell
 * wire. Every technical figure in it was read on 30 September 2026 from the
 * makers' own support pages, and nothing else:
 *
 *  - Ring, "Troubleshooting battery performance" (9iatk): months between
 *    charges, what drains it, up to 10 hours to charge, RSSI in Device Health.
 *  - Ring, "Ring devices and extreme temperatures" (6nmmg): shorter battery
 *    life around freezing, no charging below freezing.
 *  - Ring, "Guidelines for Hardwiring Your Ring Video Doorbell" (utvz2):
 *    transformer ranges per model, the Plug-In Adapter (24Vdc, 500mA) and what
 *    it is for, the qualified-electrician line.
 *  - Ring, "Installing Ring Plug-In Adapter (2nd Generation)" (fai45), and the
 *    en-uk.ring.com product page for it: socket near the door, cable through a
 *    wall, door or window, avoid wiring and pipes, "no chime", 6m cable.
 *  - Ring, "Hardwiring your battery-powered Ring doorbell" (7hvj2): trickle
 *    charge, the right chime setting prevents device damage.
 *  - Ring, "Configuring and troubleshooting your in-home chime" (vk1ml): the
 *    models with no in-home chime, Ring Chime, Chime Pro or Echo instead.
 *  - Ring, "Chime, Chime Plus and Chime Pro setup guide" (i5mq1), and "Fixing
 *    offline devices" (2ki93): plug-in chimes, Chime Pro halfway, 2.4GHz.
 *  - eufy (service.eufy.com): "My eufy Battery Video Doorbell Discharges
 *    Quickly" (four to six months), "How long does the fully charged 2K
 *    battery doorbell last?" (180 days and the test conditions), the 2K battery
 *    doorbell's hardwiring voltage, HomeBase-as-chime and HomeBase range
 *    answers, the wired doorbell's voltage and chime answers, "Does eufy Wi-Fi
 *    doorbell chime need to be hardwired?", and "How to Hardwire Your eufy
 *    Wired Doorbell without Existing Wires" (5m adapter in the UK and EU box).
 *  - Safe Electric, "Restricted & Controlled Electrical Works": new circuits
 *    and fuse-board protective devices are Restricted Electrical Works.
 *
 * Prices are only the ones published on /services/doorbell and
 * /services/installation-only, read on the live site the same day, quoted as
 * they appear. Left out as unverified: any battery figure for a specific Ring
 * model, and whether Irish sockets take the UK adapter as sold.
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
  { id: "options", label: "What are the options with no doorbell wiring?" },
  { id: "battery", label: "How often does a battery doorbell need charging?" },
  { id: "plug-in", label: "Can a video doorbell run from a plug socket?" },
  { id: "new-wiring", label: "What does running new doorbell wiring involve?" },
  { id: "chime", label: "Will it ring inside the house?" },
  { id: "wifi", label: "Is the Wi-Fi strong enough at the front door?" },
  { id: "installer", label: "What does an installer do on a door with no wiring?" },
  { id: "battery-or-wired", label: "Battery or wired: which should you choose?" },
  { id: "cost", label: "What does it cost to have one fitted?" },
  { id: "faq", label: "Questions people ask" },
];

/* One list feeds both the visible questions and the FAQPage schema, so the
   two cannot say different things. Plain text only. */
const FAQ = [
  {
    q: "Can I fit a Ring doorbell if my house has no doorbell wiring?",
    a: "Yes. Ring's battery doorbells need no wiring. They can also run from an indoor socket through Ring's Plug-In Adapter, or from a doorbell transformer if new wiring is run to the door.",
  },
  {
    q: "How long does a video doorbell battery last between charges?",
    a: "Ring says its batteries are made to last for months between charges. Eufy says its Battery Video Doorbell usually lasts four to six months under normal usage. More motion events, cold weather and a weak Wi-Fi signal all shorten it.",
  },
  {
    q: "Will a battery doorbell ring a chime inside the house?",
    a: "Not by itself where there is no bell wire. Ring says a Ring Chime, Ring Chime Pro or Amazon Alexa Echo gives alerts without hardwiring to an in-home chime. Eufy's 2K battery doorbell uses its HomeBase speaker as the chime.",
  },
  {
    q: "Do I need an electrician to fit a video doorbell with no wiring?",
    a: "Not for a battery doorbell. Mains work, such as fitting a new doorbell transformer, should be done by a qualified electrician. Safe Electric says installing a circuit is Restricted Electrical Works, which only a Registered Electrical Contractor can carry out and certify.",
  },
  {
    q: "What if the Wi-Fi is weak at my front door?",
    a: "Ring says a weak signal makes a doorbell keep losing the connection and reconnecting, which also drains a battery faster. It suggests a Chime Pro about halfway between the router and the farthest Ring device, or a 2.4GHz network instead of 5GHz.",
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
          Plenty of Irish front doors have no bell wire: houses that only ever had a knocker, apartments, newer builds
          where nobody ran a cable.
        </p>
        <p>
          <strong>The short answer:</strong> yes, you can still fit a Ring, Eufy or other video doorbell. You can power
          it three ways: its own rechargeable battery, a plug-in adapter from a socket inside, or new low-voltage wiring
          from a doorbell transformer. Battery is the quickest and needs no cable. New wiring is the most work, and its
          mains end is a job for a qualified electrician. Ringing inside the house is a separate choice: a plug-in
          chime, a hub, or the app.
        </p>

        <h2 id="options">What are the options with no doorbell wiring?</h2>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Power source</th>
              <th>Chime</th>
              <th>Effort</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Battery doorbell</td>
              <td>Rechargeable battery, charged by USB</td>
              <td>Plug-in chime, Eufy HomeBase or the app</td>
              <td>Least: no cable at all</td>
              <td>Rentals, quiet doors, a quick start</td>
            </tr>
            <tr>
              <td>Plug-in adapter</td>
              <td>An indoor socket, one cable to the door</td>
              <td>Plug-in chime or the app</td>
              <td>Some: one hole through the wall or frame</td>
              <td>A socket near the door, no charging</td>
            </tr>
            <tr>
              <td>New low-voltage wiring</td>
              <td>A transformer on the mains, low-voltage cable to the door</td>
              <td>Wired chime on some models, or plug-in</td>
              <td>Most: an electrician for the mains end</td>
              <td>Owners who want it permanent</td>
            </tr>
          </tbody>
        </table>

        <h2 id="battery">How often does a battery doorbell need charging?</h2>
        <p>
          <a href="https://ring.com/support/articles/9iatk/troubleshooting-battery-performance" rel="noopener">Ring says</a>{" "}
          its batteries are &quot;made to last for months between charges&quot;. More Live Views, linked events and
          motion events mean more charging, and a weak Wi-Fi signal drains the battery faster because the doorbell keeps
          reconnecting. Ring also says battery life is shorter around freezing and its devices stop charging below
          freezing, so a winter charge may have to happen indoors. A full charge can take up to 10 hours.
        </p>
        <p>
          <a href="https://service.eufy.com/article-description/My-eufy-Battery-Video-Doorbell-Discharges-Quickly" rel="noopener">Eufy says</a>{" "}
          its Battery Video Doorbell &quot;usually lasts four to six months under normal usage&quot;. For its 2K battery
          doorbell it quotes 180 days, tested at 20°C with 10 motion detections a day and a 30 second recording each
          time, and says detections, recording length and temperature all change that. An Irish winter is a lot colder
          than 20°C, so treat these as best cases.
        </p>
        <p>
          Lower motion sensitivity and tighter motion zones help, Ring says. In Eufy&apos;s Optimal Battery Life mode the
          doorbell records only when someone rings.
        </p>

        <h2 id="plug-in">Can a video doorbell run from a plug socket?</h2>
        <p>Yes. It is the middle option: no charging, and no mains work.</p>
        <p>
          Ring&apos;s Plug-In Adapter (2nd Generation) lets its battery doorbells run on wired power, keeping the battery
          trickle-charged. It plugs into an indoor socket and has a 6 metre cable. Ring&apos;s instructions are to pick a
          socket near the door, run the cable through the wall, the door or a window, and avoid existing wiring and pipes
          when drilling. It does not work with the Peephole Cam or the Video Doorbell Elite.
        </p>
        <p>
          Eufy calls a plug-in adapter the easiest way to fit its wired doorbell where there are no existing wires. In
          the UK and EU one comes in the box with a 5 metre lead, though you may need to drill right through the external
          wall. Either way, you need a socket within reach of the door.
        </p>

        <h2 id="new-wiring">What does running new doorbell wiring involve?</h2>
        <p>
          A doorbell transformer steps the mains down, and a thin cable carries low voltage to the door. The transformer must suit the doorbell.{" "}
          <a href="https://ring.com/support/articles/utvz2/Guidelines-for-Hardwiring-Your-Ring-Video-Doorbell" rel="noopener">Ring lists</a>{" "}
          8 to 24 VAC (5 to 40 VA) for its battery doorbells when hardwired, 10 to 24 VAC (8 to 40 VA) for the Video
          Doorbell Wired, and 16 to 24 VAC (10 to 40 VA) for its Pro models and the Wired Doorbell 2K Plus. Eufy asks for
          8 to 24 VAC at 10 VA or more for its 2K battery doorbell, and 16 to 24 VAC at 30 VA or more for its wired
          doorbell.
        </p>
        <p>
          The transformer end is mains work and should be done by a qualified electrician; Ring itself says installation
          by one may be required. In Ireland,{" "}
          <a href="https://safeelectric.ie/help-advice/controlled-restricted-electrical-works/" rel="noopener">Safe Electric</a>{" "}
          says installing or replacing a circuit, including adding its protective device on the fuse board, is Restricted
          Electrical Works, which only a Registered Electrical Contractor can carry out and certify.
        </p>

        <h2 id="chime">Will it ring inside the house?</h2>
        <p>With no bell wire, an old wired chime has nothing to connect to. Your choices:</p>
        <ul>
          <li>
            <strong>A plug-in chime.</strong> Ring Chime and Chime Pro plug into a socket, and Ring says they, or an
            Amazon Alexa Echo, give alerts without hardwiring to an in-home chime. Eufy&apos;s Wi-Fi chime also just plugs
            in.
          </li>
          <li>
            <strong>A hub.</strong> Eufy&apos;s 2K battery doorbell uses its HomeBase speaker as the chime.
          </li>
          <li>
            <strong>The app only.</strong> Fine if someone always has a phone on them; otherwise, add a plug-in chime.
          </li>
        </ul>
        <p>
          Running new wiring for a traditional chime? Check the model. Ring&apos;s battery doorbells, hardwired, can ring
          a mechanical or digital chime, but the Video Doorbell Wired, Wired Doorbell 2K Plus and Wired Doorbell 4K Pro
          (unless powered by PoE) cannot, and Eufy&apos;s wired doorbell only works with Eufy&apos;s own chime. On a Plug-In
          Adapter, set the chime type to &quot;No chime&quot;; Ring says the right setting prevents damage.
        </p>

        <h2 id="wifi">Is the Wi-Fi strong enough at the front door?</h2>
        <p>
          Ring&apos;s fixes for a weak signal at the door are a Chime Pro, which doubles as a Wi-Fi extender and goes about halfway between the router and the farthest Ring
          device, or a 2.4GHz network instead of 5GHz. The Ring app shows signal strength (RSSI) under Device Health.
          Eufy says its HomeBase can usually sit 20 to 30 feet from a battery doorbell, depending on the walls in
          between. Why the signal so often dies at an Irish front door is in{" "}
          <Link href="/blog/smart-camera-wifi-drops-irish-homes">Why Your Smart Camera Keeps Dropping the Signal</Link>.
        </p>

        <h2 id="installer">What does an installer do on a door with no wiring?</h2>
        <ol>
          <li>Checks the Wi-Fi at the door before drilling anything.</li>
          <li>Agrees the power with you: battery, plug-in adapter or new wiring, and who does any mains work.</li>
          <li>Routes any cable clear of existing wiring and pipes.</li>
          <li>Mounts the doorbell, with a wedge or corner bracket if needed.</li>
          <li>Sets the chime type in the app, and sets up a plug-in chime.</li>
          <li>Sets up the app, motion zones and alerts, and shows you how it works.</li>
        </ol>

        <h2 id="battery-or-wired">Battery or wired: which should you choose?</h2>
        <p>
          Battery if you rent, want it up today, or have a quiet door. A plug-in adapter if there is a socket near the
          door and you never want to charge it. New wiring if you own the house and want it done once. The longer
          answer is in{" "}
          <Link href="/blog/battery-vs-hardwired-smart-doorbell-ireland">Battery or Hardwired?</Link> For brands, see{" "}
          <Link href="/blog/ring-vs-eufy-doorbell-ireland">Ring vs Eufy</Link>; for the models, our{" "}
          <Link href="/blog/ring-doorbell-installation-ireland-guide">Ring installation guide</Link>.
        </p>

        <h2 id="cost">What does it cost to have one fitted?</h2>
        <p>Smart Space&apos;s own published prices, as of 30 September 2026:</p>
        <ul>
          <li>
            <strong>Supplied and fitted.</strong> Our <Link href="/services/doorbell">video doorbell page</Link> lists the
            Plus Video Doorbell at €329 and the Pro Video Doorbell at €479: &quot;All doorbell installations include the
            supply and setup of a Ring Chime&quot;. It says re-using a working wired doorbell &quot;can save almost €100
            vs. running new mains cabling&quot;, so a door with no wiring costs more than those figures.
          </li>
          <li>
            <strong>Your own doorbell, fitted.</strong> The{" "}
            <Link href="/services/installation-only">installation-only page</Link> starts &quot;From €139&quot;. For one
            doorbell it shows €139 with an existing working wired doorbell, and €229 for &quot;No - New Cabling &amp;
            Power Required&quot;.
          </li>
        </ul>
        <p>
          Not sure which your door needs? That is what the{" "}
          <Link href="/services/free-consultation">free consultation</Link> is for: we&apos;ll look at the door and the
          Wi-Fi, and tell you straight.
        </p>

        <h2 id="faq">Questions people ask</h2>
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

import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("home-security-cameras-ireland-buyers-guide")!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
  openGraph: {
    title: post.title,
    description: post.description,
    url: `${SITE}/blog/${post.slug}`,
    type: "article",
    publishedTime: post.datePublished,
    modifiedTime: post.dateModified,
  },
};

const toc = [
  { id: "what-to-look-for", label: "What to actually look for in 2026" },
  { id: "comparison", label: "Ring vs Nest vs Eufy vs Tapo — compared" },
  { id: "floodlight", label: "Floodlight cameras for driveways" },
  { id: "indoor", label: "Indoor cameras: do you need one?" },
  { id: "insurance", label: "Insurance and Garda-recommended setups" },
  { id: "storage", label: "Storage: cloud vs local" },
  { id: "irish-homes", label: "Real Irish-home setups that work" },
  { id: "booking", label: "Booking professional installation" },
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
      <BlogLayout post={post} toc={toc}>
        <p>
          If you&apos;ve searched for home security cameras in Ireland recently, you&apos;ll
          know the problem: the market is saturated with sub-€100 no-name cameras, Amazon
          reviews contradict each other, and most of the &quot;best of 2026&quot; lists are
          written by people who never installed one on an actual Irish property. This guide
          is different. We install these cameras for a living — and here&apos;s what
          actually works in 2026.
        </p>

        <h2 id="what-to-look-for">What to actually look for in 2026</h2>
        <p>
          After 5,000+ installations, we&apos;ve settled on a short list of features that
          matter and a long list that don&apos;t.
        </p>
        <p><strong>Actually matters:</strong></p>
        <ul>
          <li>
            <strong>Pre-roll / pre-buffer recording.</strong> Captures the few seconds
            before motion is detected. Without it, you get the back of someone&apos;s head
            instead of their face.
          </li>
          <li>
            <strong>1080p at minimum, ideally 1536p or 2K.</strong> Below 1080p you
            can&apos;t read a number plate or an Amazon parcel label.
          </li>
          <li>
            <strong>Wired power, or very frequent battery checks.</strong> Battery cameras
            are fine in theory. In Irish winter, motion events drain them faster than the
            spec sheet suggests.
          </li>
          <li>
            <strong>Good low-light / colour night vision.</strong> Irish evenings are dark
            for eight months a year. Infrared-only cameras give you a grey-scale ghost.
          </li>
          <li>
            <strong>Local-brand support.</strong> Ring, Nest, Eufy and Tapo all have solid
            firmware paths. Obscure brands stop shipping updates after 18 months.
          </li>
        </ul>
        <p><strong>Doesn&apos;t really matter:</strong></p>
        <ul>
          <li>4K resolution — the lens and sensor are the bottleneck, not pixel count.</li>
          <li>Two-way audio on outdoor cams — hardly anyone uses it.</li>
          <li>Pan-and-tilt on outdoor cams — fragile and prone to wind failure.</li>
        </ul>

        <h2 id="comparison">Ring vs Nest vs Eufy vs Tapo — compared</h2>
        <p>
          All four brands have outdoor cameras that work in Ireland. Here&apos;s how they
          actually compare in use.
        </p>
        <table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>Best for</th>
              <th>Trade-off</th>
              <th>Subscription needed?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ring</td>
              <td>Unified system with doorbell, integrates with Alexa</td>
              <td>Cloud-recording subscription for 30-day history</td>
              <td>Yes (Ring Protect — €3.99/mo basic)</td>
            </tr>
            <tr>
              <td>Nest (Google)</td>
              <td>Clean app, integrates with Google Home</td>
              <td>Pricier hardware, fewer install variants</td>
              <td>Yes (Nest Aware)</td>
            </tr>
            <tr>
              <td>Eufy</td>
              <td>Local storage, no required subscription</td>
              <td>HomeBase hub required for most cameras</td>
              <td>No (local storage)</td>
            </tr>
            <tr>
              <td>Tapo (TP-Link)</td>
              <td>Budget — cheapest of the four</td>
              <td>App is less polished; integration limited</td>
              <td>Optional</td>
            </tr>
          </tbody>
        </table>
        <p>
          We install all four brands — see <Link href="/services/installation-only">installation-only</Link>{" "}
          for pricing — and the most common choice for new Irish customers in 2026 is
          still Ring, because the ecosystem (doorbell + cameras + Chime Pro + smart lock)
          all lives in one app.
        </p>

        <h2 id="floodlight">Floodlight cameras for driveways</h2>
        <p>
          If there&apos;s one camera worth putting on an Irish home, it&apos;s a floodlight
          camera at the driveway or side entrance. Motion triggers a bright light, the
          camera records, and you get an alert on your phone. Most break-ins and package
          thefts are opportunistic — a floodlight camera deters both.
        </p>
        <p>
          For details on our Ring Floodlight Cam install, see{" "}
          <Link href="/services/camera">our Floodlight Cam service</Link>. Or pair a
          doorbell and floodlight in the <Link href="/services/bundles/driveway">Driveway
          Bundle</Link>.
        </p>

        <h2 id="indoor">Indoor cameras: do you need one?</h2>
        <p>
          Honest answer: probably not, unless you have a specific reason — monitoring an
          elderly parent at home, watching a pet, or keeping an eye on a holiday-let. For
          general home security, outdoor cameras at entry points catch far more useful
          footage than an indoor camera pointed at an empty hallway.
        </p>
        <p>
          If you do want an indoor camera, the Ring Indoor Cam and Eufy Indoor Cam are both
          well-priced. Eufy has a privacy-shutter mode that physically blocks the lens when
          you&apos;re home — worth having if you dislike the idea of an always-on camera
          in the kitchen.
        </p>

        <h2 id="insurance">Insurance and Garda-recommended setups</h2>
        <p>
          A few Irish insurers (AXA, Aviva, Allianz) now offer premium reductions when you
          have a properly installed home security system. The typical requirements:
        </p>
        <ul>
          <li>At least one camera covering the main entry point.</li>
          <li>Motion-activated lighting at the perimeter.</li>
          <li>A video doorbell that records to the cloud or a local hub.</li>
          <li>
            Installation by a professional (sometimes a formal install specification is
            required — we supply this on request).
          </li>
        </ul>
        <p>
          Garda Crime Prevention Officers generally recommend at least <strong>one front
          and one back camera</strong>, plus a doorbell. That maps neatly onto our{" "}
          <Link href="/services/bundles/whole-home">Whole Home Bundle</Link>.
        </p>

        <h2 id="storage">Storage: cloud vs local</h2>
        <p>
          Cloud storage (Ring Protect, Nest Aware) is the easiest setup. You pay a monthly
          fee, the footage lives on the provider&apos;s servers, and you can access it from
          anywhere. If your camera is stolen, the footage is still recoverable.
        </p>
        <p>
          Local storage (Eufy HomeBase, Tapo SD card) is cheaper long-term but more fiddly.
          If the base is stolen along with the cameras, the footage is gone. For most
          homeowners, cloud storage at €3.99–€7.99/month is fine. For tech-literate users
          or those with privacy concerns, local storage is the right call.
        </p>

        <h2 id="irish-homes">Real Irish-home setups that work</h2>
        <p>Three configurations we&apos;ve installed dozens of times:</p>
        <ul>
          <li>
            <strong>Semi-D in Dublin 6/12/14.</strong> Ring Video Doorbell Pro at the front
            door, one Floodlight Cam covering the side passage. Total cost with install:
            around €658.
          </li>
          <li>
            <strong>Detached house in Kildare or Meath.</strong> Ring Video Doorbell +
            two Floodlight Cams (front driveway + rear garden). From €987. This is what most
            insurance policies want to see.
          </li>
          <li>
            <strong>Elderly relative&apos;s home anywhere in Leinster.</strong> Ring
            Video Doorbell + smart Wi-Fi keybox for carer access. Around €509 — see the{" "}
            <Link href="/services/bundles/eldercare">Eldercare Bundle</Link>.
          </li>
        </ul>

        <h2 id="booking">Booking professional installation</h2>
        <p>
          If you&apos;d like Smart Space to come out, walk the property, and put together a
          camera plan that actually fits your house, book a{" "}
          <Link href="/services/free-consultation">complimentary consultation</Link>. No
          hard sell — we&apos;ll recommend the right camera count and brands for your
          needs, and you can decide whether you want us to install or whether you&apos;d
          rather do it yourself.
        </p>
      </BlogLayout>
    </>
  );
}

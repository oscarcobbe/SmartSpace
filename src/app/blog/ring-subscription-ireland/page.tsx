import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("ring-subscription-ireland")!;

/*
 * Written to answer "do I need a Ring subscription in Ireland?", so that an
 * assistant quoting it quotes Ring's own prices and help pages, not ours.
 *
 * Every price and feature comes from these pages, all read 30 September 2026:
 *   - Ring, Ring Protect plans, ring.com/eu/en/plans. Choosing Ireland on
 *     ring.com/country-selector lands on ring.com/eu/en, and its plans page
 *     prices in euro: Ring Solo €3.99/mo or €39.99/yr (one device), Ring Multi
 *     €9.99/mo or €99.99/yr and Ring Pro €19.99/mo or €199.99/yr (all devices
 *     at one location); add-ons Pro Intelligence +€4/mo per device and 24/7
 *     Continuous Recording +€3/mo per camera (10 devices, kept up to 14 days).
 *     Also: the comparison table, the 30-day trial, auto-renewal, card only,
 *     one subscription per address, videos lost if the trial or plan lapses,
 *     the Package Alerts footnote, and Familiar Faces listed for Ireland.
 *   - Ring Help (ring.com/gb/en/support, which the EU plans page links to for
 *     help): Understanding Ring Protect subscriptions (lw54x), Ring
 *     subscription plan changes in 2026 (v5hc7: Home Basic to Ring Solo, Home
 *     Standard to Ring Multi, Home Premium to Premium Legacy), the Ring Solo,
 *     Multi and Pro plan pages (Pro's Familiar Faces footnote leaves Ireland
 *     out), the Video Doorbell and Security Camera FAQ (03vq7), Live View
 *     (sjo2f: 10 minutes, two-way talk, Shared Users, Extended Live View 30
 *     minutes), Managing alerts (d6p12), Using Motion Detection (q986o),
 *     Setting up Smart Alerts (9qnpt), Adjusting your video storage time
 *     (1nce1), and Managing your Ring videos (6shp7).
 *   - Ring blog, Ring Cameras Without Subscription (16 July 2026): motion
 *     alerts, two-way talk, motion zones and Alexa Live View with no plan.
 *   - eufy Ireland, Video Doorbell E340 product page: 8GB on the doorbell,
 *     HomeBase S380 up to 16TB, no monthly fee, the 90-day estimate.
 *
 * The install line says only what /services/doorbell and /services/camera
 * say: we set up the Ring app and motion zones and walk you through the app.
 * Neither page mentions subscriptions, so this guide does not claim we set
 * one up.
 *
 * Left out as unverified for Ireland: the extended warranty and Snapshot
 * Capture (on Ring's GB help pages, not on the EU plans page), the 10% ring.com
 * discount (Ring says it may not apply where devices are not sold on
 * ring.com), and Ring Guard Response (not offered on the EU plans page).
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
  { id: "short-answer", label: "Do I need a Ring subscription in Ireland?" },
  { id: "plans", label: "What do Ring's plans cost in Ireland?" },
  { id: "no-plan", label: "What works with no plan?" },
  { id: "plan-adds", label: "What does a plan add?" },
  { id: "storage", label: "How long does Ring keep video?" },
  { id: "sharing", label: "How do I save and share Ring footage?" },
  { id: "worth-it", label: "Is a Ring plan worth it?" },
  { id: "eufy", label: "What about Eufy's local storage?" },
  { id: "faq", label: "Questions people ask" },
  { id: "sources", label: "Sources" },
];

/* One list feeds both the visible questions and the FAQPage schema, so the
   two cannot say different things. Plain text only. */
const FAQ = [
  {
    q: "Does a Ring doorbell work without a subscription?",
    a: "Yes. Ring says its devices do not require a subscription. Without one you get doorbell and motion alerts, Live View for up to 10 minutes at a time, and two-way talk. Nothing is recorded, so you cannot replay, save or share video.",
  },
  {
    q: "How much is a Ring subscription in Ireland?",
    a: "On Ring's European store, which serves Ireland: Ring Solo is €3.99 a month or €39.99 a year for one device, Ring Multi €9.99 a month or €99.99 a year for every device at one address, and Ring Pro €19.99 a month or €199.99 a year.",
  },
  {
    q: "What happened to Ring Home Basic, Standard and Premium?",
    a: "Ring renamed its Ring Home plans as Ring Protect plans in 2026. Home Basic became Ring Solo, Home Standard became Ring Multi, and Home Premium became Premium Legacy. Ring says subscribers keep the same features at no extra charge.",
  },
  {
    q: "How long does Ring keep my videos?",
    a: "Up to 180 days with a plan. New devices start at 30 days, and you can choose from 1 to 180 days for each device. Videos are lost if your plan lapses or the storage time runs out, so download any you need to keep.",
  },
  {
    q: "Is there a free trial of Ring Protect?",
    a: "Yes. A free 30-day trial starts when you set up a new Ring doorbell, camera or alarm, unless your address already has a plan. If you do not subscribe before it ends, the videos recorded during the trial are lost.",
  },
  {
    q: "Does one Ring plan cover two houses?",
    a: "No. Ring says you need a separate subscription for each address. Ring Multi and Ring Pro cover every Ring device at one address; Ring Solo covers one device.",
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

const SOURCES = [
  { label: "Ring, Ring Protect plans (Ring's European store, served for Ireland)", href: "https://ring.com/eu/en/plans" },
  {
    label: "Ring Help, Understanding Ring Protect subscriptions",
    href: "https://ring.com/gb/en/support/articles/lw54x/ring-subscriptions",
  },
  {
    label: "Ring Help, Ring subscription plan changes in 2026",
    href: "https://ring.com/gb/en/support/articles/v5hc7/introducing-ring-home-plans",
  },
  { label: "Ring Help, Ring Solo", href: "https://ring.com/gb/en/support/plans/solo" },
  { label: "Ring Help, Ring Multi", href: "https://ring.com/gb/en/support/plans/multi" },
  { label: "Ring Help, Ring Pro", href: "https://ring.com/gb/en/support/plans/pro" },
  {
    label: "Ring Help, Ring Video Doorbell and Security Camera FAQ",
    href: "https://ring.com/gb/en/support/articles/03vq7/Ring-Video-Doorbell-and-Security-Camera-Frequently-Asked-Questions",
  },
  {
    label: "Ring Help, Live View for Video Doorbells and Security Cameras",
    href: "https://ring.com/gb/en/support/articles/sjo2f/live-view-for-doorbells-and-cameras",
  },
  {
    label: "Ring Help, Managing alerts for Video Doorbells and Security Cameras",
    href: "https://ring.com/gb/en/support/articles/d6p12/managing-alerts-for-ring-doorbells-and-cameras",
  },
  { label: "Ring Help, Using Motion Detection", href: "https://ring.com/gb/en/support/articles/q986o/using-motion-detection" },
  { label: "Ring Help, Setting up Smart Alerts", href: "https://ring.com/gb/en/support/articles/9qnpt/setting-up-smart-alerts" },
  {
    label: "Ring Help, Adjusting your video storage time",
    href: "https://ring.com/gb/en/support/articles/1nce1/Understanding-and-Adjusting-Your-Video-Storage-Time",
  },
  { label: "Ring Help, Managing your Ring videos", href: "https://ring.com/gb/en/support/articles/6shp7/managing-your-ring-videos" },
  {
    label: "Ring blog, Ring Cameras Without Subscription (16 July 2026)",
    href: "https://blog.ring.com/home-security/ring-cameras-without-subscription/",
  },
  { label: "eufy Ireland, Video Doorbell E340", href: "https://www.eufy.com/ie/products/t8214311" },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc}>
        <h2 id="short-answer">Do I need a Ring subscription in Ireland?</h2>
        <p>
          <strong>No, but without one nothing is recorded.</strong> A Ring doorbell or camera works with no plan: it
          alerts you when someone rings or moves in view, and you can watch live and talk to whoever is there. What you
          cannot do is look back. Ring records events only once you subscribe, so with no plan there is no video to
          replay, save or share.
        </p>
        <p>
          Ring&apos;s plans are now called Ring Protect. In Ireland, Ring Solo costs €3.99 a month for one device, Ring
          Multi €9.99 a month for every device at one address, and Ring Pro €19.99 a month. A new device comes with a
          free 30-day trial.
        </p>

        <h2 id="plans">What do Ring&apos;s plans cost in Ireland?</h2>
        <p>
          Choose Ireland on ring.com and you land on Ring&apos;s European store, whose{" "}
          <a href="https://ring.com/eu/en/plans" rel="noopener">
            plans page
          </a>{" "}
          prices in euro. These are its prices on 30 September 2026:
        </p>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Price</th>
              <th>Covers</th>
              <th>What it adds</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>No plan</td>
              <td>Free</td>
              <td>Every device</td>
              <td>Doorbell and motion alerts, Live View up to 10 minutes, two-way talk. No recording.</td>
            </tr>
            <tr>
              <td>Ring Solo</td>
              <td>€3.99 a month or €39.99 a year</td>
              <td>One doorbell or camera</td>
              <td>
                Up to 180 days of video history; person, package and vehicle alerts; Extended Live View; Doorbell Calls;
                Video Preview Alerts; Multi-Cam Live View; Device Modes
              </td>
            </tr>
            <tr>
              <td>Ring Multi</td>
              <td>€9.99 a month or €99.99 a year</td>
              <td>Every Ring device at one address</td>
              <td>The same features as Solo, on every device</td>
            </tr>
            <tr>
              <td>Ring Pro</td>
              <td>€19.99 a month or €199.99 a year</td>
              <td>Every Ring device at one address</td>
              <td>
                Everything in Multi, plus Video Descriptions, Video Search, Single Event Alerts and Familiar Faces (beta)
              </td>
            </tr>
            <tr>
              <td>Pro Intelligence add-on</td>
              <td>€4 a month per device</td>
              <td>One device, on Solo or Multi</td>
              <td>Ring Pro&apos;s intelligent features for that device</td>
            </tr>
            <tr>
              <td>24/7 Continuous Recording add-on</td>
              <td>€3 a month per camera</td>
              <td>Eligible cameras, on any plan</td>
              <td>Nonstop recording, kept for up to 14 days</td>
            </tr>
          </tbody>
        </table>
        <p>
          Paying yearly costs about the same as ten months. Plans renew until you cancel, and you pay online through
          ring.com. If older pages or your bill say Ring Home, Ring{" "}
          <a href="https://ring.com/gb/en/support/articles/v5hc7/introducing-ring-home-plans" rel="noopener">
            renamed those plans in 2026
          </a>
          : Home Basic is now Ring Solo, Home Standard is Ring Multi, and Home Premium is Premium Legacy.
        </p>

        <h2 id="no-plan">What works with no Ring plan?</h2>
        <p>
          Ring&apos;s{" "}
          <a href="https://ring.com/gb/en/support/articles/lw54x/ring-subscriptions" rel="noopener">
            help pages
          </a>{" "}
          say that without a subscription you can view live video and respond to alerts as they happen. In practice:
        </p>
        <ul>
          <li>
            <strong>Alerts.</strong> A Ring Alert when someone presses the doorbell, and a Motion Alert when the device
            detects motion.
          </li>
          <li>
            <strong>Live View</strong> for up to 10 minutes at a time, in the Ring app or on ring.com.
          </li>
          <li>
            <strong>Two-way talk</strong> during Live View, plus Replies, and the siren and lights on cameras that have
            them.
          </li>
          <li>
            <strong>Motion settings:</strong> motion zones, sensitivity and schedules, to cut out the road and the
            neighbour&apos;s bins.
          </li>
          <li>
            <strong>Shared Users.</strong> Family members you add can use Live View too.
          </li>
          <li>
            <strong>Alexa.</strong> Live View on a compatible Echo Show or Fire TV.
          </li>
        </ul>
        <p>
          What you lose is the record. Ring says events are recorded only after you subscribe, and that earlier events
          may show in your history but cannot be viewed or recovered. Smart alerts, Doorbell Calls and Live View past 10
          minutes need a plan too.
        </p>

        <h2 id="plan-adds">What does a Ring plan add?</h2>
        <ul>
          <li>
            <strong>Video history.</strong> Every doorbell ring, motion event and Live View is saved for up to 180 days,
            to replay, download and share.
          </li>
          <li>
            <strong>Smart alerts</strong> for a person, a vehicle or a package. Package Alerts work on select doorbells,
            best with medium to large boxes, Ring says.
          </li>
          <li>
            <strong>Doorbell Calls</strong>, where a ring comes in like a phone call, and Extended Live View of up to 30
            minutes.
          </li>
          <li>
            <strong>Ring Pro only:</strong> text descriptions of what triggered an alert, and a search across your
            recorded events. Familiar Faces, in beta, is listed for Ireland on Ring&apos;s plans page but not in its
            help pages.
          </li>
        </ul>

        <h2 id="storage">How long does Ring keep video?</h2>
        <p>
          Up to 180 days, in Ring&apos;s cloud. According to Ring&apos;s{" "}
          <a href="https://ring.com/gb/en/support/articles/1nce1/Understanding-and-Adjusting-Your-Video-Storage-Time" rel="noopener">
            storage guide
          </a>
          , new devices start at 30 days, and you can choose 1, 3, 7, 14, 21, 30, 60, 90, 120 or 180 days for each
          device: in the app, Control Centre, then Video and Snapshot Storage, then Video and Snapshot Storage Time.
        </p>
        <ul>
          <li>A new setting applies only to videos recorded after you change it.</li>
          <li>A device that is reset or replaced goes back to 30 days.</li>
          <li>
            Videos are gone for good if you delete them, if the plan lapses, or when the storage time runs out. To keep
            one, download it.
          </li>
          <li>24/7 Continuous Recording keeps footage for up to 14 days.</li>
        </ul>
        <p>
          If your camera sees beyond your boundary, how long you keep footage and who you share it with are also data
          protection questions: see{" "}
          <Link href="/blog/doorbell-camera-rules-ireland-gdpr">Is My Doorbell Camera Legal in Ireland?</Link>
        </p>

        <h2 id="sharing">How do I save and share Ring footage?</h2>
        <p>
          You need a plan, or the trial. From Ring&apos;s guide to{" "}
          <a href="https://ring.com/gb/en/support/articles/6shp7/managing-your-ring-videos" rel="noopener">
            managing your videos
          </a>
          :
        </p>
        <ol>
          <li>
            <strong>In the app:</strong> tap History, find the video, tap the three dots (•••), then Download or Share.
            The app downloads one clip at a time.
          </li>
          <li>
            <strong>On ring.com:</strong> sign in, go to History, select Manage (the pencil), tick the videos, then
            Download or Share. Several videos download together as a .zip of .mp4 files.
          </li>
        </ol>
        <p>
          Sharing creates a link. Ring warns that a shared link can keep working after you delete the video, and that
          unsharing does not delete it. For the Gardaí, download the clip.
        </p>

        <h2 id="worth-it">Is a Ring plan worth it?</h2>
        <p>
          <strong>If you only want to see and answer the door</strong>, no. Alerts, Live View and two-way talk are free.
        </p>
        <p>
          <strong>Renters</strong> with one doorbell: Ring Solo at €3.99 a month covers it, month to month until you
          cancel. If you are not sure, the free trial shows you whether you ever look back at old clips.
        </p>
        <p>
          <strong>Families</strong> with a doorbell and a camera or two: Ring Multi covers every device at the address
          for €9.99 a month, where Solo covers only one. Everyone in the house can be a Shared User.
        </p>
        <p>
          <strong>If you want evidence</strong>, you need a plan, and you need it before anything happens: Ring cannot
          record retrospectively. Download anything that matters, and consider 24/7 Continuous Recording (€3 a month per
          camera) for what happens between motion events.
        </p>
        <p>
          When we fit a Ring <Link href="/services/doorbell">video doorbell</Link> or{" "}
          <Link href="/services/camera">floodlight camera</Link>, we set up the Ring app and motion zones and walk you
          through the app before we leave, which is a good moment to decide what you want from the trial.
        </p>

        <h2 id="eufy">What about Eufy&apos;s local storage?</h2>
        <p>
          Eufy takes the other approach. Its{" "}
          <a href="https://www.eufy.com/ie/products/t8214311" rel="noopener">
            Irish page for the Video Doorbell E340
          </a>{" "}
          says it saves video to 8GB of storage on the doorbell, about 90 days at 30 twenty-second clips a day, or to a
          HomeBase S380 with up to 16TB, with full functionality and no monthly fee; optional extras may need a
          subscription. Whether that beats Ring is a bigger question than the fee, and it is in{" "}
          <Link href="/blog/ring-vs-eufy-doorbell-ireland">Ring vs Eufy</Link>.
        </p>

        <h2 id="faq">Questions people ask</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <h2 id="sources">Sources</h2>
        <p>Read on 30 September 2026.</p>
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

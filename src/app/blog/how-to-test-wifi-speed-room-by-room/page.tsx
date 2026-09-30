import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("how-to-test-wifi-speed-room-by-room")!;

/*
 * Written for the Wi-Fi speed test searches: Keyword Planner put "wifi speed
 * test" and its variants at 40,500 a month, "wifi test" at 1,900, and "check
 * wifi speed" and "test wifi speed" at 720 each (Ireland, English, read 30
 * September 2026). The page competes with the tests themselves by saying
 * what they leave out: where to test, and what the numbers mean in a house.
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
  { id: "one-test", label: "Why one test tells you very little" },
  { id: "before-you-start", label: "Before you start" },
  { id: "where-to-test", label: "Where to test" },
  { id: "what-the-numbers-mean", label: "What the numbers mean in your house" },
  { id: "patterns", label: "Four patterns, and what each points to" },
  { id: "free-check", label: "Doing it with the free check" },
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
          A Wi-Fi speed test takes about twenty seconds, which is why most people run one, look at the number and stop.
          The number on its own is not much use. A test beside the router measures your broadband more than your Wi-Fi,
          and the rooms that give you trouble are rarely beside the router.
        </p>
        <p>
          Testing properly takes a few minutes and a few rooms. Here is how, and what the results mean for the things you
          actually do in the house.
        </p>

        <h2 id="one-test">Why one test tells you very little</h2>
        <p>
          A speed test times data travelling between your device and a server. Everything on the way counts: your
          provider&apos;s network, the line into the house, the router, and the Wi-Fi between the router and you. Beside
          the router, the Wi-Fi part is short, so the result is mostly your broadband. Two floors up, the Wi-Fi part is
          the longest and hardest part of the trip.
        </p>
        <p>
          So the useful information is not one number. It is the difference between the number at the router and the
          number in each room.
        </p>

        <h2 id="before-you-start">Before you start</h2>
        <ul>
          <li>Use the same device for every test, ideally the phone or laptop you use most.</li>
          <li>Close anything downloading in the background: updates, cloud photo backups, a TV streaming in another room.</li>
          <li>Turn off a VPN if you use one, since it sends everything through another server first.</li>
          <li>Note the time. Results are often lower in the evening, when more people nearby are online.</li>
        </ul>

        <h2 id="where-to-test">Where to test</h2>
        <ol>
          <li>
            <strong>Beside the router, or plugged into it by cable if you can.</strong> This is your baseline: what the
            broadband delivers before the Wi-Fi has to travel.
          </li>
          <li>
            <strong>In the room that struggles.</strong> Stand where you actually use the device: the desk, the bed, the
            couch facing the TV.
          </li>
          <li>
            <strong>Somewhere in between,</strong> such as the landing or the hall. It shows where the signal starts to
            fall away.
          </li>
          <li>
            <strong>Outside the front door,</strong> if you have a doorbell or a camera there. It sits on the far side of
            an outside wall, one of the hardest places in a house for Wi-Fi to reach.
          </li>
        </ol>

        <h2 id="what-the-numbers-mean">What the numbers mean in your house</h2>
        <ul>
          <li>
            <strong>Download, for the TV:</strong> Netflix recommends 15 Mbps for each 4K stream. Look at the figure in the
            room the TV is in, not the one beside the router.
          </li>
          <li>
            <strong>Upload, for cameras and calls:</strong> Ring asks for 2 Mbps of upload for each 1080p camera, and rates
            upload above 10 Mbps as good, 5 to 10 Mbps as okay, and below 5 Mbps as poor. Many broadband packages have far
            less upload than download to begin with, and the Wi-Fi can cut it further.
          </li>
          <li>
            <strong>Ping, for calls and games:</strong> how quickly the connection answers. Watch how it behaves while
            someone else is streaming: a connection that is quick when idle and stalls when busy is the one that breaks
            up video calls.
          </li>
          <li>
            <strong>How much each room keeps:</strong> our free check treats a room that keeps at least 60 per cent of the
            router&apos;s speed as fine, and one that keeps under 30 per cent as a room that has lost most of it.
          </li>
        </ul>

        <h2 id="patterns">Four patterns, and what each points to</h2>
        <p>
          <strong>Slow everywhere, including beside the router.</strong> The broadband itself. Test on a cable at the
          router at two different times, then take the figures to your provider. Our guide to{" "}
          <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> goes through
          it step by step.
        </p>
        <p>
          <strong>Fast at the router, slow upstairs or at the back of the house.</strong> The Wi-Fi is not getting through
          the house. Walls, floors, foil-backed insulation and distance are taking it on the way.
        </p>
        <p>
          <strong>Fine in the daytime, slow in the evening, even at the router.</strong> Congestion on the line or on your
          provider&apos;s network at busy times. Another case for your provider, with the evening figures.
        </p>
        <p>
          <strong>Download fine, upload poor.</strong> Cameras, doorbells and video calls suffer first. Check the upload on
          your contract, then check it in the room or at the door where the camera is.
        </p>

        <h2 id="free-check">Doing it with the free check</h2>
        <p>
          Our <Link href="/wifi-check">free Wi-Fi check</Link> does this in order: a test beside the router, a test in the
          room that struggles, six questions about your home, and a report graded green, amber or red with what to do
          next. The speed test itself is run by Measurement Lab, the same open platform behind Google&apos;s speed test,
          and the check tells you before you start that Measurement Lab publishes each result with the internet address
          it came from.
        </p>
        <p>
          If the report comes back amber or red, the <Link href="/services/wifi">€395 home network assessment</Link> is the
          next step: your broadband tested at the router by cable, every floor measured, and a working trial system left
          on the floor that struggles for three days, with the figures in writing. It is credited in full against any
          work you go ahead with.
        </p>
      </BlogLayout>
    </>
  );
}

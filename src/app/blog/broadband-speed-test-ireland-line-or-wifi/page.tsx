import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("broadband-speed-test-ireland-line-or-wifi")!;

/*
 * Written for the provider speed-test searches, which Keyword Planner put at
 * 1,900 a month for "eir speed test", 880 for "broadband speed test ireland",
 * 720 for "virgin media speed test" and 320 for "vodafone speed test"
 * (Ireland, English, read 30 September 2026). Every figure in it is sourced:
 * Netflix's 15 Mbps per 4K stream, Ring's upload scale, and the Wi-Fi check's
 * own published thresholds.
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
  { id: "what-it-measures", label: "What a speed test actually measures" },
  { id: "which-test", label: "eir, Virgin Media, Vodafone or Google: which test to use" },
  { id: "test-the-line", label: "Test the line: by cable, at the router" },
  { id: "test-the-rooms", label: "Then test the rooms" },
  { id: "reading-the-numbers", label: "Reading the numbers" },
  { id: "who-to-call", label: "Line or Wi-Fi: who to call" },
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
          Most people run a speed test when something feels slow: the TV buffering, a call breaking up, a camera that
          will not load. Search for one in Ireland and you will find eir&apos;s, Virgin Media&apos;s, Vodafone&apos;s and
          Google&apos;s own. They all answer the same narrow question: how fast is the connection between this device and
          a test server, right now.
        </p>
        <p>
          They do not tell you where the slowdown is. That is the question that decides who can fix it: your broadband
          provider, or whoever deals with the Wi-Fi inside your house. Two tests, done in the right places, answer it.
        </p>

        <h2 id="what-it-measures">What a speed test actually measures</h2>
        <p>
          A speed test sends data between your device and a server and times it. The result can only be as fast as the
          slowest part of that journey: the server, your provider&apos;s network, the line into your house, your router,
          and the Wi-Fi between the router and your device.
        </p>
        <p>It gives you three numbers.</p>
        <ul>
          <li>
            <strong>Download</strong> is how fast data reaches you. Streaming, browsing and downloads depend on it.
          </li>
          <li>
            <strong>Upload</strong> is how fast data leaves. Video calls depend on it, and so does every clip a smart
            camera or doorbell sends.
          </li>
          <li>
            <strong>Ping</strong> is how quickly the connection answers. A call or a game feels it more than it feels the
            headline speed.
          </li>
        </ul>

        <h2 id="which-test">eir, Virgin Media, Vodafone or Google: which test to use</h2>
        <p>
          A provider&apos;s own test usually runs to a server on or near its own network, which makes it a fair test of
          the part the provider is responsible for. If you are going to ring your provider, use theirs: it is the figure
          they will ask for.
        </p>
        <p>
          Google&apos;s speed test, and the <Link href="/wifi-check">free Wi-Fi check</Link> on this site, use Measurement
          Lab, an open testing platform that is not run by any broadband provider. For comparing rooms, any test works, as
          long as you use the same one each time.
        </p>

        <h2 id="test-the-line">Test the line: by cable, at the router</h2>
        <p>
          To find out what your broadband delivers, take the Wi-Fi out of the picture. Plug a laptop into the router with
          a network cable and run the test there. If you have no cable, stand beside the router and test with a clear
          line of sight to it.
        </p>
        <ul>
          <li>Close anything downloading in the background: updates, cloud photo backups, a TV streaming in another room.</li>
          <li>Turn off a VPN if you use one, since it sends everything through another server first.</li>
          <li>Run it two or three times, and once in the evening, when more people in your area are online.</li>
        </ul>
        <p>
          Compare the result with the speed on your contract. If the result is well below it, and stays low on a cable,
          the problem is outside your house.
        </p>

        <h2 id="test-the-rooms">Then test the rooms</h2>
        <p>
          Now test where the trouble is: the back bedroom, the home office, the kitchen at the back of an extension,
          outside the front door if you have a doorbell camera. Use the same device and the same test, so the results
          compare.
        </p>
        <p>
          The gap between the router result and the room result is your Wi-Fi. Distance, walls, floors and foil-backed
          insulation all take a share on the way. Our free check treats a room that keeps at least 60 per cent of the
          router&apos;s speed as fine, and one that keeps under 30 per cent as a room that has lost most of it.
        </p>

        <h2 id="reading-the-numbers">Reading the numbers</h2>
        <ul>
          <li>
            <strong>Streaming:</strong> Netflix recommends 15 Mbps for each 4K stream, so two TVs streaming at once want 30
            Mbps or more reaching the rooms they are in.
          </li>
          <li>
            <strong>Cameras and doorbells:</strong> Ring asks for 2 Mbps of upload for each 1080p camera, and rates upload
            above 10 Mbps as good, 5 to 10 Mbps as okay, and below 5 Mbps as poor. Check the upload in the place the camera
            is, not beside the router.
          </li>
          <li>
            <strong>Calls:</strong> a steady connection matters more than a fast one. A connection can be quick when it is
            idle and still stall when someone else starts streaming, which is why our check also measures how it responds
            while busy.
          </li>
        </ul>

        <h2 id="who-to-call">Line or Wi-Fi: who to call</h2>
        <p>
          <strong>If the test at the router is slow, on a cable, at more than one time of day:</strong> it is the line or
          your provider&apos;s network. Ring your provider with the figures: when you tested, where, and that it was on a
          cable.
        </p>
        <p>
          <strong>If the router test is fine and the rooms are not:</strong> it is the Wi-Fi inside your house. Your
          provider can swap the router, but a different router in the same spot still has to get through the same walls
          and floors.
        </p>
        <p>
          That second case is the one we measure. Our{" "}
          <Link href="/services/wifi/home-network-assessment">€395 home network assessment</Link> tests your broadband at
          the router by cable, measures every floor, and leaves a working trial system on the floor that struggles for
          three days, with the figures in a written report. It is credited in full against any work you go ahead with.
          If the report shows the line itself is the problem, you have the figures to take to your provider.
        </p>
        <p>
          To start for free, run the <Link href="/wifi-check">Wi-Fi check</Link> beside your router and again in the room
          that struggles. It grades the result green, amber or red, and tells you whether it is worth going further.
        </p>
      </BlogLayout>
    </>
  );
}

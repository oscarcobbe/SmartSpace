import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("eufy-video-doorbell-e340-fitted-ireland")!;

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
  { id: "box", label: "What you actually get" },
  { id: "dual-camera", label: "The dual camera and the Irish doorstep" },
  { id: "storage", label: "Local storage and the no-fee promise" },
  { id: "power", label: "The two power situations that set your price" },
  { id: "chime", label: "The chime, so it rings inside" },
  { id: "limits", label: "Where it is not the right call" },
  { id: "booking", label: "Getting one fitted" },
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
          The Eufy Video Doorbell E340 is the one we get asked about most often when someone wants a
          doorbell with no monthly fee. It is a genuinely good bit of kit, and it is the Eufy doorbell
          we supply and fit as standard across Dublin and Leinster. This is what it is actually like
          once it is on the wall, written by the people who put it there rather than by the marketing
          team who wrote the box.
        </p>

        <h2 id="box">What you actually get</h2>
        <p>
          The E340 is a wired doorbell with two cameras built into one unit, colour night vision, and
          on-device person, parcel and vehicle alerts. It pairs with a plug-in chime so it rings inside
          the house, and everything records locally with no subscription. When we fit it for you it
          comes supplied, mounted, wired, set up on your phone, and tuned so you are not getting an
          alert every time a car passes. You can see the full spec and the two install options on the{" "}
          <Link href="/services/eufy-video-doorbell-e340" className="text-brand-500 hover:underline">
            Eufy Video Doorbell E340 page
          </Link>
          .
        </p>

        <h2 id="dual-camera">The dual camera and the Irish doorstep</h2>
        <p>
          The clever part of the E340 is the second camera. The main lens looks straight ahead at the
          person standing at the door, head to toe, so you are not getting a fisheye view of a forehead.
          The second lens points down at the step. That sounds like a gimmick until you have had a
          parcel left on the ground and the courier gone by the time you check the app. With a single
          forward-facing camera, the package below the camera line is invisible. With the downward lens
          you can see it sitting there, and you can see if someone walks off with it.
        </p>
        <p>
          For a lot of Irish homes that is the whole reason people want a doorbell in the first place.
          Deliveries during the working day, nobody home, and a porch or step that is not visible from
          the road. The downward camera is the feature that earns its keep here.
        </p>

        <h2 id="storage">Local storage and the no-fee promise</h2>
        <p>
          This is where Eufy has always made its case. The footage from the E340 saves to the doorbell
          itself, or to a HomeBase hub inside the house, not to a cloud server you pay a monthly fee to
          reach. No subscription, ever, is a real selling point and it is true. If you want a single
          doorbell and you never plan to expand, you will never pay Eufy another cent after we leave.
        </p>
        <p>
          The honest caveat we always add: local storage means the recordings live in your house. That
          is great for privacy and great for your wallet. It also means that if you want the footage to
          survive a power cut or a stolen doorbell, you want a HomeBase indoors holding the recordings
          rather than relying only on the chip in the unit on the wall. We talk that through on the day,
          and it is the main reason people step up from a single doorbell to one of the{" "}
          <Link href="/services/eufy/bundles" className="text-brand-500 hover:underline">
            Eufy home bundles
          </Link>{" "}
          that include the S380 HomeBase.
        </p>

        <h2 id="power">The two power situations that set your price</h2>
        <p>
          The E340 is mains powered, wired to a doorbell feed. There are only two situations, and which
          one you are in is what decides the price.
        </p>
        <p>
          <strong>You already have a working wired doorbell.</strong> This is the common one. There is
          a live doorbell feed at the door, we connect to it, and the job is straightforward. That is
          our lower install price.
        </p>
        <p>
          <strong>There is no doorbell wiring at the door.</strong> New build with no provision, a
          knocker where a bell never was, or old wiring that is dead. Here we run a power feed for you,
          which is more work, so it is the higher price. We quote it clearly up front, no surprises on
          the day. Both prices, and which one applies, are laid out on the{" "}
          <Link href="/services/eufy-video-doorbell-e340" className="text-brand-500 hover:underline">
            product page
          </Link>{" "}
          before you book.
        </p>

        <h2 id="chime">The chime, so it rings inside</h2>
        <p>
          A doorbell that only buzzes your phone is no use to half the household. The E340 we supply
          comes with a plug-in chime that rings inside the house the moment someone presses the button,
          no phone needed, no app open. You plug it into a socket within Wi-Fi range and it rings. For
          older relatives, for anyone who keeps their phone on silent, or for a big house where the
          phone is upstairs in a coat pocket, the chime is the bit that makes the doorbell behave like a
          doorbell.
        </p>

        <h2 id="limits">Where it is not the right call</h2>
        <p>
          We will tell you straight when the E340 is not the right buy. If you want a doorbell plus a
          few outdoor cameras plus an alarm, all in one app with cloud backup and a support line behind
          it, you may be better served elsewhere, and we install other brands too. We wrote a longer,
          honest comparison in{" "}
          <Link href="/blog/ring-vs-eufy-doorbell-ireland" className="text-brand-500 hover:underline">
            Ring vs Eufy
          </Link>{" "}
          if you want the full picture. And if your front door has no power and no easy route to run
          one, a wired doorbell of any brand becomes a bigger job, which is exactly the kind of thing we
          check on a survey before you spend anything.
        </p>

        <h2 id="booking">Getting one fitted</h2>
        <p>
          If the E340 is what you want, you can pick your power option and book your installation date
          straight from the{" "}
          <Link href="/services/eufy-video-doorbell-e340" className="text-brand-500 hover:underline">
            Eufy Video Doorbell E340 page
          </Link>
          , or browse the rest of the range on the{" "}
          <Link href="/services/eufy" className="text-brand-500 hover:underline">
            Eufy installation page
          </Link>
          . Not sure whether you have a live doorbell feed or whether you need a new one? Book a{" "}
          <Link href="/services/free-consultation" className="text-brand-500 hover:underline">
            free consultation
          </Link>{" "}
          and we will check the wiring, the Wi-Fi at the threshold, and tell you the exact price before
          you commit. Already bought the E340 yourself and just need it fitted? That is our{" "}
          <Link href="/services/installation-only" className="text-brand-500 hover:underline">
            installation-only service
          </Link>
          , same standard, your hardware.
        </p>
      </BlogLayout>
    </>
  );
}

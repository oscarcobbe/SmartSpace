import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("eufy-home-bundles-driveway-garden-ireland")!;

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
  { id: "front-door-easy", label: "The front door is the easy bit" },
  { id: "floodlight", label: "The Floodlight Cam E340, the workhorse" },
  { id: "homebase", label: "The S380 HomeBase, where it all records" },
  { id: "bundles", label: "The three bundles we fit most" },
  { id: "eldercare", label: "The eldercare setup" },
  { id: "solar", label: "When there is no power out there" },
  { id: "booking", label: "How we scope it" },
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
          Almost everyone starts with the doorbell, and almost nobody stops to think about the rest of
          the property until something happens at the side gate. We fit a lot of Eufy across Dublin and
          Leinster, and the jobs that actually protect a house are the ones that cover the driveway, the
          rear garden and the side passage, not just the front step. Here is how we put a whole Eufy
          system together, what each piece does, and the three bundles we fit most often.
        </p>

        <h2 id="front-door-easy">The front door is the easy bit</h2>
        <p>
          A doorbell tells you who is at the front door. That is useful, and the{" "}
          <Link href="/services/eufy-video-doorbell-e340" className="text-brand-500 hover:underline">
            Eufy Video Doorbell E340
          </Link>{" "}
          does it well. But the front door is the one part of the house a burglar is least likely to
          use, because it is the most visible. The break-ins and the near-misses we hear about happen at
          the side gate of a semi-D, the patio door on a rear extension, or the garden office with a
          laptop in it. Covering those is what turns a doorbell into actual home security.
        </p>

        <h2 id="floodlight">The Floodlight Cam E340, the workhorse</h2>
        <p>
          The piece that does most of the work outside the front door is the{" "}
          <Link href="/services/eufy-floodlight-cam-e340" className="text-brand-500 hover:underline">
            Eufy Floodlight Cam E340
          </Link>
          . It is a dual-camera unit on a 360 degree pan-tilt head, so it follows movement across the
          whole drive rather than staring at one fixed spot, and it has two bright motion-activated
          floodlights. On an Irish driveway in November, the light itself is half the value. A
          well-lit drive with a camera that visibly turns to track someone is a far better deterrent
          than a discreet lens nobody notices.
        </p>
        <p>
          It is mains powered. The cleanest fit is where it replaces an existing outdoor light, because
          the power is already there. Where there is no existing light point, we run a feed, which is a
          bit more work. Both situations are priced clearly on the product page before you book.
        </p>

        <h2 id="homebase">The S380 HomeBase, where it all records</h2>
        <p>
          The piece people do not know they need is the S380 HomeBase. It is a small hub that sits
          inside the house and holds the recordings for every Eufy device on the system, locally, with
          no monthly fee. There are three reasons we put one in on any multi-device job.
        </p>
        <p>
          First, storage. One HomeBase holds far more footage than the chips inside individual cameras,
          and you are not paying a cloud bill for it. Second, resilience. The recordings live indoors,
          so if a camera is stolen or knocked offline, the footage it already captured is safe on the
          hub. Third, signal. The HomeBase helps tie the cameras together reliably, which matters in a
          typical Irish build where thick walls and foil-backed insulation chew through Wi-Fi. Every one
          of our multi-camera Eufy bundles includes the S380 for exactly these reasons.
        </p>

        <h2 id="bundles">The three bundles we fit most</h2>
        <p>
          Rather than make you guess, we package the common setups. You can see all three on the{" "}
          <Link href="/services/eufy/bundles" className="text-brand-500 hover:underline">
            Eufy home bundles page
          </Link>
          , each supplied, installed, linked and tuned in one visit.
        </p>
        <p>
          <strong>Driveway and Garden.</strong> The Video Doorbell E340 at the door plus a Floodlight
          Cam on the drive, recording to an S380 HomeBase. This is the most popular first proper system,
          front door and the most-used approach to the house covered together.
        </p>
        <p>
          <strong>Whole Home.</strong> The doorbell plus two Floodlight Cams, front and rear, on the
          HomeBase. This is the one for a house where the back garden, a side return or a rear extension
          needs covering as well as the drive. One visit, the full perimeter.
        </p>
        <p>
          <strong>Eldercare.</strong> The doorbell with a plug-in Chime and the S380 HomeBase, set up to
          be as simple as possible. More on that next.
        </p>

        <h2 id="eldercare">The eldercare setup</h2>
        <p>
          The Eldercare bundle is built for older relatives and the family who help them. The point is
          not more cameras, it is less faff. The plug-in Chime rings loudly inside the house the moment
          someone is at the door, with no phone to unlock and no app to open, which is the single
          biggest barrier for an older user. The HomeBase keeps everything recorded at home with no
          monthly bill to manage, and family members can be added to the app so they can check in or see
          who called. It is a small, calm system rather than a wall of screens.
        </p>

        <h2 id="solar">When there is no power out there</h2>
        <p>
          Sometimes the spot that needs a camera has no power and no easy way to run one. A shed at the
          end of the garden, a gate down a side passage, an outbuilding. For those, a wired floodlight
          cam is the wrong tool, and a solar-powered camera is the right one. Solar siting depends on
          how much sky the panel can actually see through an Irish winter, so we quote those
          individually rather than list a flat price. If that is your situation,{" "}
          <Link href="/contact" className="text-brand-500 hover:underline">
            get in touch
          </Link>{" "}
          and we will work out what will hold a charge where you need it.
        </p>

        <h2 id="booking">How we scope it</h2>
        <p>
          The best way to get a whole-property setup right is to let us look at the property. On a{" "}
          <Link href="/services/free-consultation" className="text-brand-500 hover:underline">
            free consultation
          </Link>{" "}
          we walk the outside of the house, find the blind spots, check where the power and the Wi-Fi
          actually reach, and tell you which bundle fits and what it costs, with no obligation. If you
          already know you want a single device to start, you can pick a doorbell or a camera on the{" "}
          <Link href="/services/eufy" className="text-brand-500 hover:underline">
            Eufy installation page
          </Link>{" "}
          and add to it later. Everything Eufy we fit keeps your footage at home and carries no monthly
          fee, whether it is one doorbell or the full perimeter.
        </p>
      </BlogLayout>
    </>
  );
}

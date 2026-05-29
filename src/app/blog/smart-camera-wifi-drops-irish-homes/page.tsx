import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("smart-camera-wifi-drops-irish-homes")!;

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
  { id: "the-myth", label: "The myth that it's the camera" },
  { id: "irish-builds", label: "Why Irish builds are so bad for Wi-Fi" },
  { id: "what-we-check", label: "What we actually check on a survey" },
  { id: "extenders", label: "Three fixes that work most of the time" },
  { id: "mesh", label: "When a mesh system is the real answer" },
  { id: "homebase", label: "If you've got Eufy: where to put the HomeBase" },
  { id: "before-you-drill", label: "We test before we drill" },
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
          We get the phone call a couple of times a month. Someone&apos;s bought a Ring or a Eufy
          doorbell, taken it out of the box, stuck it up themselves, and now half the time the live
          view spins forever or the alerts come through three minutes after the courier&apos;s gone.
          They&apos;re convinced the camera is faulty. They&apos;ve already exchanged it once. The
          replacement is doing the same thing.
        </p>
        <p>
          It&apos;s almost never the camera. It&apos;s the Wi-Fi. And the reason it&apos;s the Wi-Fi
          is specifically because of how houses are built in this country in the last fifteen years.
          Here&apos;s what we mean.
        </p>

        <h2 id="the-myth">The myth that it&apos;s the camera</h2>
        <p>
          People assume that because their phone has full bars in the hall, the doorbell two metres
          away on the other side of the front door has full bars too. It doesn&apos;t. Your phone is
          probably connecting to a 5 GHz signal that the doorbell can&apos;t use, and the 2.4 GHz
          signal the doorbell actually needs is being absorbed by the wall it&apos;s mounted on.
        </p>
        <p>
          The other thing people don&apos;t realise is that the bar indicator on their phone is
          measured in seconds, but the doorbell is making decisions every few milliseconds about
          whether to send video or queue it. A signal that&apos;s &quot;mostly fine&quot; on a phone
          is borderline-unusable for a camera. You don&apos;t need full bars at the front door, you
          need a clean strong signal. There&apos;s a difference.
        </p>

        <h2 id="irish-builds">Why Irish builds are so bad for Wi-Fi</h2>
        <p>
          Three things stacked on top of each other:
        </p>
        <p>
          <strong>One:</strong> the brick. Standard Irish front-wall construction is a 100mm outer
          leaf of brick or block, a cavity, then a 100mm inner leaf. That&apos;s already two layers
          of dense masonry the signal has to push through. A modern doorbell radio puts out about 100
          mW. A brick wall costs you maybe 10–15 dB of signal strength per layer. You&apos;re losing
          more than three quarters of your signal just to the walls themselves.
        </p>
        <p>
          <strong>Two:</strong> the insulation. From around 2015 onwards, more or less every new build
          and most retrofits use either PIR boards (the rigid foam ones with a silver foil face) or
          thermal-insulated plasterboard with a foil backing. Foil is a near-perfect Wi-Fi reflector.
          It&apos;s not just attenuating the signal — it&apos;s actively bouncing it back into the
          house. We&apos;ve been in 2020-build homes in Lucan and Adamstown where the router&apos;s
          eight metres from the front door in a straight line and the signal at the threshold is
          essentially zero. The foil is doing exactly what it&apos;s designed to do for heat. It does
          the same thing to Wi-Fi.
        </p>
        <p>
          <strong>Three:</strong> the consumer unit. Irish builds typically have the fuse board in or
          near the hall — often directly between the router and the front door. Big metal box full of
          copper. Another shadow on the signal.
        </p>
        <p>
          Stack those three and you can have a perfectly good 1 Gbps fibre connection in the living
          room and a doorbell that can&apos;t send a clip to the cloud. The internet isn&apos;t the
          problem. The path from the router to the doorbell is the problem.
        </p>

        <h2 id="what-we-check">What we actually check on a survey</h2>
        <p>
          When we walk a property before quoting, we don&apos;t just look at where the bell goes.
          We walk the path the signal will need to take.
        </p>
        <p>
          The first thing we ask: where&apos;s the router right now, and can it move? The number of
          times the router is in a wardrobe behind a TV behind a sofa is silly. If we can&apos;t
          move it, we can usually run a Cat6 cable to a better spot — or recommend the homeowner ask
          their broadband provider for a longer fibre patch lead and a relocation.
        </p>
        <p>
          Second: what&apos;s the signal at the threshold? We measure it with the phone but more
          usefully with the doorbell itself. Most modern smart doorbells will tell you the signal
          strength during setup in dBm. Anything weaker than around −67 dBm is going to be
          unreliable. −75 dBm and the doorbell will spin trying to connect. The reading itself
          tells you whether you need an extender before you even mount the thing.
        </p>
        <p>
          Third: what&apos;s the construction between the router and the door? Stud-wall plasterboard
          is fine. Solid block or foil-backed insulation is the killer combo we look out for. If we
          see foil-backed boards on the inside of the front wall, we know we&apos;re going to need
          a hop.
        </p>

        <h2 id="extenders">Three fixes that work most of the time</h2>
        <p>
          We&apos;re not going to recommend a specific extender model because they change every six
          months. Here&apos;s the order we&apos;d try things.
        </p>
        <p>
          <strong>The Ring Chime Pro.</strong> If you&apos;re going with a Ring doorbell, this plugs
          into a socket somewhere between the router and the door. It does double duty — extends the
          Wi-Fi specifically to the doorbell <em>and</em> acts as an indoor chime so you don&apos;t
          have to rely on your phone to hear the bell. We tend to put it in the hall press or just
          inside the porch wall. Genuinely the cleanest fix for Ring.
        </p>
        <p>
          <strong>A standalone Wi-Fi range extender or access point.</strong> If you&apos;ve got a
          decent router, often the cheapest fix is one good extender placed on the side of the foil
          wall facing the camera. The signal hops once at full strength rather than trying to push
          through the wall directly. We aim to put the extender as close to the camera as we can on
          the inside of the wall.
        </p>
        <p>
          <strong>Run a Cat6 to a new access point.</strong> If we&apos;re already pulling cable for
          a hardwired doorbell, we&apos;ll often run a second cable for an access point right beside
          the front door. This is the gold-standard fix and the one that never gives bother three
          years later. Slightly more work, but you&apos;re only doing it once.
        </p>

        <h2 id="mesh">When a mesh system is the real answer</h2>
        <p>
          If a customer has more than one camera planned, or a garden office at the back of the
          property, or a side-entrance camera, we usually steer them toward a proper mesh Wi-Fi
          system rather than a string of extenders. A mesh covers the whole footprint of the house
          with nodes that handshake cleanly between each other, so the doorbell, the back-garden
          floodlight, and the side-gate camera all stay connected to the strongest node without
          dropping. Strings of extenders can get into fights with each other and cause more problems
          than they solve.
        </p>
        <p>
          Mesh kit isn&apos;t cheap. A decent three-node set is €250 to €400. But if you&apos;re
          spending €600 to €800 on a Ring or Eufy ecosystem, you&apos;re going to lose half of it
          to unreliability if the underlying Wi-Fi isn&apos;t up to it. We&apos;d rather have the
          conversation up front than be called back in two months to figure out why the back
          floodlight goes offline every time it rains.
        </p>

        <h2 id="homebase">If you&apos;ve got Eufy: where to put the HomeBase</h2>
        <p>
          One thing specifically for Eufy customers. Eufy&apos;s HomeBase isn&apos;t an extender —
          it&apos;s a hub that talks to the cameras on a dedicated low-frequency channel separate
          from your house Wi-Fi. So in theory it doesn&apos;t care about the foil-backed walls. In
          practice you still need to think about where it sits, because the HomeBase&apos;s own
          radio still has to reach the camera.
        </p>
        <p>
          We aim to put it as close to the inside of the front wall as we can — usually in the hall
          coats press, on top of a shelf, or wherever there&apos;s a free socket and a clear line of
          sight (or near-line) to the doorbell. If the customer has stuck it on the sideboard at the
          back of the kitchen, the signal&apos;s travelling the full depth of the house plus through
          the front wall, which is exactly the failure mode they were trying to avoid.
        </p>

        <h2 id="before-you-drill">We test before we drill</h2>
        <p>
          Every install we do, we mount the camera temporarily, power it up, walk the signal,
          measure the strength, then take it down and put the bracket up properly. Sounds obvious.
          It&apos;s the step most DIY jobs skip — and it&apos;s the reason the camera comes off the
          wall three months later.
        </p>
        <p>
          If you&apos;ve already done a DIY install and you&apos;re getting drops, you don&apos;t
          necessarily need a new camera. You probably need a survey of the path between the router
          and the front door, and one of the three fixes above. The{" "}
          <Link href="/services/free-consultation" className="text-brand-500 hover:underline">
            complimentary consultation
          </Link>{" "}
          covers exactly this — we&apos;ll come out, measure the signal, and tell you what would
          actually solve it. If the fix is just a €60 extender plugged into the right socket,
          we&apos;ll tell you that and you can do it yourself.
        </p>
      </BlogLayout>
    </>
  );
}

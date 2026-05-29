import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("tapo-vs-eufy-vs-ring-budget-doorbell-ireland")!;

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
  { id: "what-tapo-is", label: "What Tapo actually is" },
  { id: "ages-out", label: "The three things that age out fastest" },
  { id: "what-we-replace", label: "What customers come to us to replace" },
  { id: "where-tapo-works", label: "Where Tapo is genuinely the right buy" },
  { id: "five-year-cost", label: "The real total cost over five years" },
  { id: "what-to-do", label: "What we'd do if it were our money" },
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
          Walk into Currys or Harvey Norman in Dundrum and the smart-doorbell shelf has Ring at the
          top, Eufy in the middle, and Tapo at the bottom for usually a third of the price. A lot
          of people, reasonably, look at that and think: I&apos;ll just buy the cheap one, it&apos;s
          probably grand for what I need. Sometimes that&apos;s right. A lot of the time it
          isn&apos;t. We&apos;ve installed plenty of Tapo and we&apos;ve also taken plenty of it
          down. Here&apos;s the honest read.
        </p>

        <h2 id="what-tapo-is">What Tapo actually is</h2>
        <p>
          Tapo is TP-Link&apos;s consumer smart-home brand. TP-Link itself is enormous — they make a
          big chunk of the world&apos;s home routers. Tapo started off as the cheap-and-cheerful
          range: smart plugs at €15, light bulbs at €12, indoor cameras at €25. They were excellent
          at that. Then they expanded outwards into doorbells, outdoor cameras, robot hoovers,
          everything Ring and Eufy do, at noticeably lower prices.
        </p>
        <p>
          The thing to understand is that the smart-doorbell line is the newest, least-mature part
          of Tapo&apos;s catalogue. The indoor cameras and the smart plugs are years ahead in
          development cycles. The outdoor security stuff is catching up — but it&apos;s catching up
          to where Eufy was about three years ago, which is itself behind where Ring is now.
          That&apos;s the position.
        </p>

        <h2 id="ages-out">The three things that age out fastest</h2>
        <p>
          When we get called out to a job where a Tapo doorbell or camera has stopped working, it&apos;s
          usually one of these three things. Not always in the camera&apos;s second week —
          usually somewhere between twelve and twenty-four months in.
        </p>
        <p>
          <strong>The weatherproofing.</strong> Tapo gear is rated IP65 or IP66 on the spec sheet,
          which on paper means it&apos;s fine for outdoor use. The actual hardware tells a different
          story. The rubber gaskets on the back of the unit dry out faster than the equivalent Ring
          or Eufy gear, the plastic housing yellows from UV faster, and the screw covers tend to pop
          off. Once water gets in, that&apos;s the camera. Irish weather is the test that finishes
          most of the cheaper kit — we have driving horizontal rain six months of the year and
          temperature swings between freezing and 14°C in the same week. It&apos;s a worse climate
          for outdoor electronics than people think.
        </p>
        <p>
          <strong>The notification speed.</strong> Tapo&apos;s alerts can come through two or three
          seconds slower than the equivalent Ring or Eufy. That sounds tiny on paper. In practice,
          when the courier&apos;s standing at the door for ten seconds before they leave the
          parcel and walk off, three seconds is the difference between you opening the app to a
          live view of them and opening it to an empty driveway. Customers tolerate this for about
          a year before they get sick of it.
        </p>
        <p>
          <strong>The app updates.</strong> The Tapo app gets fewer updates than the Ring or Eufy
          apps. Not always a bad thing — but when iOS or Android pushes a major update, the smaller
          apps can break for a week or two. We had a customer in Stillorgan last spring whose Tapo
          notifications stopped firing after an iOS update and didn&apos;t come back for nearly a
          month. That&apos;s the kind of thing that pushes someone to replace the whole system.
        </p>

        <h2 id="what-we-replace">What customers come to us to replace</h2>
        <p>
          We get the call most weeks. Someone bought a Tapo doorbell at Christmas, it was perfect
          for the first six months, now it&apos;s started missing motion events or the live view
          takes thirty seconds to load. The honest read is they&apos;ve got two reasonable choices:
          live with it, or replace it.
        </p>
        <p>
          Most of the time they ask us to put up a Ring or a Eufy in its place. The cost of that
          swap — new doorbell, our install fee — is usually around the same as if they&apos;d
          bought the better doorbell in the first place. So they&apos;ve effectively paid twice.
          The Tapo wasn&apos;t the cheap option, it was just the option they bought first.
        </p>

        <h2 id="where-tapo-works">Where Tapo is genuinely the right buy</h2>
        <p>
          To be fair to the brand, there&apos;s a category of job where we&apos;d genuinely
          recommend Tapo over the alternatives.
        </p>
        <p>
          <strong>Indoor cameras.</strong> Pet cams, baby cams, looking-at-the-front-room-when-you&apos;re-on-holiday
          cams. Indoor environments don&apos;t have the weather problem, the lighting is
          consistent, and the cameras aren&apos;t making split-second motion decisions about
          couriers. Tapo&apos;s indoor units are properly good for the money and we&apos;d say
          buy with no hesitation.
        </p>
        <p>
          <strong>Garden sheds and outbuildings.</strong> If you want eyes on a shed at the back of
          the garden that contains nothing irreplaceable, Tapo will do the job for half the price of
          a Eufy. The trade-off — slower notifications, shorter expected lifespan — matters less
          when you&apos;re mostly interested in deterrence and a recording-after-the-fact.
        </p>
        <p>
          <strong>A second camera in a system you already trust.</strong> If you&apos;ve already
          got a Ring or Eufy ecosystem and you want to add a fourth or fifth camera covering a
          low-priority angle, dropping in a Tapo can make sense. You&apos;re relying on the main
          system for the critical bits.
        </p>
        <p>
          Where we wouldn&apos;t put Tapo: the front door, the side gate, anywhere a parcel might
          be left, or as the only security camera on the house.
        </p>

        <h2 id="five-year-cost">The real total cost over five years</h2>
        <p>
          The shelf price is the bit everyone looks at. The bit nobody looks at is the cost over
          five years, which is the realistic timeframe for outdoor security gear. A rough sketch:
        </p>
        <p>
          <strong>Tapo doorbell, DIY install.</strong> €60 for the doorbell. Free to install
          yourself. Likely replacement in 18 to 24 months — call it €60 again. Plus the second
          install. Plus any frustration in between. Five-year cost: somewhere between €120 and
          €200, plus your time.
        </p>
        <p>
          <strong>Ring or Eufy mid-range doorbell, professional install.</strong> €180 for the
          doorbell. Install fee on top. Expected lifespan of the hardware: 5 to 7 years. Software
          updates throughout. The doorbell you bought is the doorbell you have at the end of the
          five years. Five-year cost: the original outlay and not much else.
        </p>
        <p>
          The €60 doorbell isn&apos;t actually cheaper over the long horizon. It&apos;s cheaper in
          month one, and that&apos;s a real thing if budget is tight right now. But if the budget
          is the only reason to buy Tapo at the front door, it&apos;s worth doing the maths first.
        </p>

        <h2 id="what-to-do">What we&apos;d do if it were our money</h2>
        <p>
          If it was our front door and we had €100 to spend, we&apos;d buy a base-model Ring or Eufy
          and skip the install rather than buy a flagship Tapo. The flagship Tapo will be a year
          old in technology terms before it gets to your house. The base-model Ring or Eufy will
          still be getting software updates in 2031.
        </p>
        <p>
          If it was our front door and we had €60 to spend, we&apos;d wait three months, save
          another €40, and buy the cheaper option from the better brand. We genuinely think
          that&apos;s the right call.
        </p>
        <p>
          And if it was a shed at the bottom of the garden looking at nothing of consequence, we&apos;d
          buy the Tapo and call it sound.
        </p>
        <p>
          If you want a walkthrough of which makes sense for your specific house, that&apos;s what
          the{" "}
          <Link href="/services/free-consultation" className="text-brand-500 hover:underline">
            complimentary consultation
          </Link>{" "}
          is for. We charge the same install fee regardless of which brand you pick, so we&apos;ve
          no reason to push you up the price chart.
        </p>
      </BlogLayout>
    </>
  );
}

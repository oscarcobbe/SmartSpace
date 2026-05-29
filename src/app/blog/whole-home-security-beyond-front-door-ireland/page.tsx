import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("whole-home-security-beyond-front-door-ireland")!;

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
  { id: "blind-spot", label: "The vulnerability nobody plans for" },
  { id: "side-gate", label: "Side gates and the semi-detached blind spot" },
  { id: "garden-office", label: "Garden offices: the new target" },
  { id: "extensions", label: "Rear extensions and patio doors" },
  { id: "layered", label: "What a properly layered system looks like" },
  { id: "alarm", label: "Where the alarm fits in" },
  { id: "cost", label: "What it costs vs what a break-in costs" },
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
          We put a lot of doorbells up. And once that&apos;s done, the bell&apos;s on, the chime
          is in the hall, the family&apos;s set up on the app, a lot of people consider the job
          finished. The front of the house is sorted. Job done.
        </p>
        <p>
          The thing is, the front of the house is rarely where anyone gets in. Most break-ins around
          Dublin and the Leinster commuter belt happen at the side gate, the rear patio door, or a
          detached garden building. None of which a front doorbell sees. This piece is about what we
          tell customers when they ask &quot;should I get cameras anywhere else?&quot;, and what
          we&apos;ve genuinely seen work.
        </p>

        <h2 id="blind-spot">The vulnerability nobody plans for</h2>
        <p>
          The instinct is: protect the front door because that&apos;s where visitors come from.
          That&apos;s fair for visitors, package thieves, the daily noise of a normal house. But the
          people who are actually trying to get in without you noticing are doing the opposite, they
          want the part of the house no neighbours can see and no doorbell is pointing at.
        </p>
        <p>
          The pattern we see when we&apos;re called out to add cameras after the fact is consistent.
          A semi-D in Beaumont, a four-bed in Castleknock, an estate house in Clane, the way they
          got in was the side gate, the rear extension door, or sometimes through a garden gate at
          the bottom of the property that the owners didn&apos;t even consider a real entry point.
          The break-in often takes under three minutes. There&apos;s usually no warning.
        </p>

        <h2 id="side-gate">Side gates and the semi-detached blind spot</h2>
        <p>
          The semi-detached layout has one obvious weak point: the alleyway down the side of the
          house between the gable wall and the boundary. Sometimes it&apos;s gated. Often the gate
          is six feet of plywood that you could lift over in five seconds. Either way, once
          someone&apos;s in that alley, they&apos;re between the front of the house (the only place
          with a camera) and the back garden (where the patio door is). They&apos;re also out of
          sight of the road.
        </p>
        <p>
          What we do on a side-gate camera is straightforward. A motion-activated camera with a
          built-in floodlight mounted high on the gable wall, looking down the alley toward the
          front gate. The motion sensor triggers the light and the recording the moment something
          enters the alley. From a deterrent standpoint, that floodlight kicking on when someone
          steps in is the single most effective piece of kit in the system. Most people turn around
          and leave.
        </p>
        <p>
          The Ring Floodlight Cam and the Eufy equivalent both do this job. The Ring one talks to
          the rest of the Ring ecosystem so the side gate triggering can also flash the doorbell
          chime inside the house. The Eufy version is more standalone but cheaper to run because
          there&apos;s no subscription needed. Either works. We&apos;d weigh it the same way we
          weighed it in the{" "}
          <Link href="/blog/ring-vs-eufy-doorbell-ireland" className="text-brand-500 hover:underline">
            Ring vs Eufy piece
          </Link>
          . What&apos;s the rest of the system?
        </p>

        <h2 id="garden-office">Garden offices: the new target</h2>
        <p>
          This one&apos;s changed completely since 2020. The work-from-home garden office is
          everywhere now, proper insulated cabins with a laptop on a desk, sometimes a second
          screen, sometimes equipment worth four figures inside. They&apos;re typically at the
          bottom of the garden, often visible from the back lane or the back of the neighbouring
          estate, and almost never alarmed.
        </p>
        <p>
          The pattern: opportunistic break-ins of garden offices have crept up steadily over the last
          three years, and the people doing them know exactly what they&apos;re looking for.
          Laptop, tablet, maybe a camera or DSLR if the owner&apos;s a creator type. In and out in
          two minutes. The owner doesn&apos;t even know until they go down in the morning to start
          work.
        </p>
        <p>
          What we put on garden offices: a camera under the eaves pointing at the door, motion-only
          recording, and crucially, a contact sensor on the door itself if the homeowner has an
          alarm system. The contact sensor means the alarm can fire the same as if a window was
          broken in the main house. The camera gives you the footage. Both together mean someone
          who tries it gets a phone alert, a recording, and a loud alarm within seconds. Most people
          will not push through that.
        </p>
        <p>
          We also recommend keeping the garden office Wi-Fi on the main house network rather than
          its own separate router, because a camera on its own Wi-Fi can be defeated by simply
          unplugging the router. Camera on the main house Wi-Fi can&apos;t.
        </p>

        <h2 id="extensions">Rear extensions and patio doors</h2>
        <p>
          Modern Irish houses are increasingly built or extended with a big glass back. Bifold doors,
          sliders, full-height windows. Architecturally beautiful. Security-wise, a known weak point.
        </p>
        <p>
          What we do: a camera mounted on the gable wall or under the soffit covering the back of
          the house, ideally with a wide enough field of view to catch the patio area and the rear
          fence line in the same frame. The trick on Irish builds is the camera&apos;s field of view
          versus the depth of the back garden. A standard doorbell-style camera will show you
          someone at the patio door but won&apos;t catch them coming over the back fence. A wider-
          lens floodlight cam (or two cameras at different angles) is usually the right call.
        </p>
        <p>
          On the door itself: if there&apos;s an alarm system, contact sensors on every leaf of a
          bifold or sliding door. Sounds excessive. Isn&apos;t, the way bifolds are forced is one
          leaf at a time. A sensor on just the main leaf isn&apos;t enough.
        </p>

        <h2 id="layered">What a properly layered system looks like</h2>
        <p>
          When we talk about &quot;layered defence&quot; we&apos;re not selling something fancy.
          We&apos;re describing the principle that each piece of kit does one thing well and together
          they cover the whole perimeter. A working example for a typical four-bed semi-D:
        </p>
        <p>
          One: doorbell at the front, covering arrival and the porch area. Two: floodlight cam on the
          gable wall, covering the side alley. Three: rear camera under the soffit, covering the
          patio and back garden. Four: contact sensors on the back door, the patio doors, and any
          ground-floor windows that aren&apos;t fitted with restrictor stays. Five, if there&apos;s
          a garden building, a camera and a sensor on it.
        </p>
        <p>
          That&apos;s the perimeter. A determined burglar can defeat any single one of those, but
          together they make the house properly noisy and properly visible. Most opportunistic
          break-ins are looking for a quiet target. A layered system makes you not the quiet
          target.
        </p>

        <h2 id="alarm">Where the alarm fits in</h2>
        <p>
          The conversation a lot of people skip: cameras record, alarms react. They do different
          jobs. A camera tells you what happened. An alarm tries to stop it happening.
        </p>
        <p>
          We&apos;re increasingly recommending the Ring Alarm to customers who are already going
          Ring on the cameras, because the single app handles both. You arm the house from your
          phone, the sensors trigger if someone breaches them, the sirens go off, you get an alert,
          and optionally Ring&apos;s assisted monitoring can call a contact for you. It&apos;s
          covered under the same subscription that runs the cameras, no extra monthly fee.
        </p>
        <p>
          If you&apos;re Eufy on the cameras, the Eufy alarm is its own thing and it doesn&apos;t
          integrate as cleanly. Most of our customers in that situation either stick with a
          standalone alarm (Phonewatch, HomeSecure, whoever) or switch to Ring for the integration.
          We&apos;ve done both.
        </p>

        <h2 id="cost">What it costs vs what a break-in costs</h2>
        <p>
          A full layered system, front doorbell, side floodlight cam, rear camera, contact sensors,
          an alarm, for a standard semi-D typically costs €1,500 to €2,500 in kit, plus install.
          That&apos;s a real number and we&apos;re not going to pretend it&apos;s small. Most
          households spread it: doorbell first, side gate six months later, the rest of the
          perimeter the following year.
        </p>
        <p>
          The break-in figure people quote is usually the value of what got stolen, laptops,
          jewellery, a couple of grand of personal stuff. The number that lands harder is the
          insurance excess (€500 to €1,000 typically) plus the premium hike for the next three or
          four years (often €200 to €400 a year). Plus the bit you can&apos;t put a number on, which
          is how the house feels for six months after.
        </p>
        <p>
          We&apos;re not in the fear-selling business, most houses don&apos;t get broken into,
          and we&apos;ll be the first to say if you live in a quiet cul-de-sac in Foxrock you
          probably don&apos;t need the full perimeter. But if you&apos;re in an estate that&apos;s
          had a couple of breakins on the road in the last two years, or you&apos;ve got a garden
          office with serious gear in it, it&apos;s worth thinking past the front door.
        </p>
        <p>
          If you want a walkthrough of what your house specifically needs, not a sales pitch,
          that&apos;s what the{" "}
          <Link href="/services/free-consultation" className="text-brand-500 hover:underline">
            complimentary consultation
          </Link>{" "}
          covers. We&apos;ll walk the perimeter with you and tell you straight which bits matter and
          which bits would be overkill for your setup.
        </p>
      </BlogLayout>
    </>
  );
}

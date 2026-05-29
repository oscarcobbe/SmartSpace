import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("battery-vs-hardwired-smart-doorbell-ireland")!;

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
  { id: "the-chore", label: "The charging-every-three-months chore" },
  { id: "irish-chimes", label: "Why your old chime probably won't do" },
  { id: "8v-16v", label: "The 8V vs 16V battle in plain English" },
  { id: "battery-is-right", label: "When battery is genuinely the right call" },
  { id: "hardwire-conversion", label: "What we actually do on a hardwire conversion" },
  { id: "risk", label: "Why we don't recommend the DIY transformer swap" },
  { id: "verdict", label: "What we'd pick for our own front door" },
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
          Most people don&apos;t think about this until the day they have to take the doorbell down,
          carry it inside, plug it into a USB cable, and wait three hours for it to charge. Then they
          go: there has to be a better way to do this. There is. It&apos;s called hardwiring. And
          for most Irish houses, it&apos;s a bit more involved than the marketing makes out.
        </p>

        <h2 id="the-chore">The charging-every-three-months chore</h2>
        <p>
          Manufacturers will tell you a battery doorbell lasts &quot;up to six months&quot; on a
          charge. In real conditions in Ireland that&apos;s closer to two to three months for most
          people. Why?
        </p>
        <p>
          Two reasons. The first is cold. Lithium batteries lose capacity quickly below 5°C, and
          we&apos;re routinely below that overnight from November through March. The chemistry
          slows down. The doorbell ends up doing the same job with less available power and runs
          down faster.
        </p>
        <p>
          The second is motion events. If your bell is on a road with footfall, kids walking past
          to school in the morning, the postman, a courier in the afternoon, every motion event
          wakes the camera, fires a recording, and pushes a notification. Each one is a small drain.
          Set the motion sensitivity high and you&apos;ll be charging the bell every six weeks. Set
          it low and you&apos;ll miss things.
        </p>
        <p>
          The job of taking the bell down, charging it, putting it back up isn&apos;t hard. It&apos;s
          just annoying. Especially in horizontal rain in February. People stop bothering. The
          battery runs flat. The bell becomes ornamental.
        </p>

        <h2 id="irish-chimes">Why your old chime probably won&apos;t do</h2>
        <p>
          Most Irish homes built between roughly the 1960s and the early 2000s have a wired doorbell
          with a low-voltage transformer hidden somewhere, usually in the hot press, sometimes in
          the meter box, occasionally up in the attic. That transformer steps your 230V mains down
          to either 4V, 6V, or most commonly 8V AC. Enough to ring a mechanical bell when someone
          pushes the button. It&apos;s been doing that job uncomplaining for thirty or forty years.
        </p>
        <p>
          Modern smart doorbells don&apos;t want 8V. They want 16V to 24V AC, with around 10VA of
          power available. A modern doorbell is essentially a small computer with a camera, an
          infrared illuminator for night vision, radar sensors on the higher-end models, and a
          wireless radio that needs steady current. The old chime transformer can&apos;t supply
          that.
        </p>
        <p>
          What people sometimes do is wire the new smart doorbell to the old 8V chime anyway, and
          it appears to work for a week or two. Two things then happen. One: the doorbell is
          undersupplied and intermittently drops off Wi-Fi or fails to record. Two: the transformer
          gets hot because it&apos;s being asked to deliver continuous current it wasn&apos;t
          designed for, and over a few weeks the windings can degrade. Worst case is the transformer
          fails, and depending on where it&apos;s mounted, that&apos;s a fire risk.
        </p>

        <h2 id="8v-16v">The 8V vs 16V battle in plain English</h2>
        <p>
          Modern Ring and Eufy doorbells will physically wire to the old 8V chime, the terminals
          fit, the wire works. You can put the bell on the wall and it&apos;ll light up. That makes
          a lot of people think the install is done.
        </p>
        <p>
          What they&apos;re actually relying on is the bell&apos;s internal battery. Even the
          &quot;wired&quot; models have a small backup battery that gets topped up when the
          transformer can supply enough current. On 8V, the bell is essentially running off battery
          for most of its life and getting a slow trickle from the chime. So you&apos;re back to
          charging it again, just less often. It&apos;s not properly hardwired, it&apos;s
          accidentally-still-battery.
        </p>
        <p>
          Proper hardwiring means replacing the old 8V transformer with a modern 16V or 24V unit,
          rated 10VA or higher, fitted to current regulations, and ideally on its own circuit
          within the consumer unit. That way the bell is genuinely running off mains forever and
          the battery&apos;s only a backup.
        </p>

        <h2 id="battery-is-right">When battery is genuinely the right call</h2>
        <p>
          We don&apos;t want to be the people telling everyone they need to spend more. Sometimes
          battery is the right answer.
        </p>
        <p>
          <strong>Rented properties.</strong> If you don&apos;t own the house, you don&apos;t want
          to start drilling into the consumer unit or running new cabling. A battery doorbell with
          a wireless chime sat on a shelf inside is a clean, removable, end-of-tenancy-friendly
          install.
        </p>
        <p>
          <strong>No existing wired bell at all.</strong> Some older bungalows and a lot of newer
          apartments simply don&apos;t have a wired doorbell circuit. Putting one in from scratch is
          a real piece of work, a chase down the wall, a fish through the cavity, a connection to
          the consumer unit. For a single doorbell with a quiet entryway, a battery unit is often
          a better trade-off.
        </p>
        <p>
          <strong>Low-traffic front doors.</strong> If your bell rings four times a week and nothing
          much triggers motion alerts (set back from the road, no front pathway), the battery will
          last the full six months the box promised. Charging twice a year is fine for most
          people.
        </p>
        <p>
          For everyone else, busy fronts, normal Irish weather, a desire to never think about it
          again, hardwired is the answer if it can be done cleanly.
        </p>

        <h2 id="hardwire-conversion">What we actually do on a hardwire conversion</h2>
        <p>
          Worth walking through, because most homeowners have never seen one and the manufacturer
          videos make it look like a five-minute job.
        </p>
        <p>
          First, we find the existing transformer. Could be in the hot press, the meter box, the
          attic, or occasionally hidden inside a stud wall. Then we check what it&apos;s rated and
          whether the existing wiring will carry the new voltage cleanly. Sometimes the cable run is
          fine and we just swap the transformer. Sometimes the old wire is too thin a gauge and we
          need to pull new cable.
        </p>
        <p>
          Then we fit a modern transformer, typically 16V or 24V, properly rated, on its own MCB in
          the consumer unit so it can be isolated for any future work. The doorbell wires get
          terminated at the front door behind the bracket, with appropriate weatherproofing where
          the cable enters the bell. Where we&apos;re replacing an internal mechanical chime that&apos;s
          incompatible with the smart bell&apos;s power needs, we usually install a Ring Pro Power
          Kit or equivalent bypass module so the chime either still works or gets cleanly
          deactivated without the bell continuously firing it.
        </p>
        <p>
          Once that&apos;s done, the bell&apos;s on permanent power, the internal battery is the
          backup, and you&apos;ll never touch it again until it needs replacing in five-plus years.
          The whole job is normally a couple of hours.
        </p>

        <h2 id="risk">Why we don&apos;t recommend the DIY transformer swap</h2>
        <p>
          People do attempt this themselves and we&apos;d gently advise against it.
        </p>
        <p>
          The actual transformer change is technically simple, disconnect the old one, wire in the
          new one. The problem is the old one is wired into a 230V circuit somewhere in your
          consumer unit, and it&apos;s often on a shared lighting circuit because that&apos;s how
          the original electrician routed it in 1985. If you don&apos;t know what you&apos;re
          looking at when you open the meter box, you&apos;re working on live mains with the wrong
          breaker turned off.
        </p>
        <p>
          We&apos;ve been called out twice this year to homes where someone had attempted a DIY
          transformer swap and ended up with half the upstairs lights dead or a tripping main RCD.
          Both times the original work was done thinking it was a doorbell job. It wasn&apos;t, it
          was a mains job that touched a doorbell.
        </p>
        <p>
          You also can&apos;t self-certify electrical work to current regs in Ireland on any
          modification to a domestic consumer unit. If you sell the house and the buyer&apos;s
          surveyor spots a non-compliant install, that&apos;s a problem at closing.
        </p>
        <p>
          For roughly €140 to €180 we&apos;ll do the conversion properly, certify it, and you&apos;ll
          never look at the bell again. That&apos;s what we&apos;d recommend.
        </p>

        <h2 id="verdict">What we&apos;d pick for our own front door</h2>
        <p>
          For a house we&apos;d live in long-term: hardwired, every time. Charging a doorbell every
          twelve weeks in January is the kind of small annoyance that wears you down. Five-year
          cost is roughly the same once you factor in the transformer install, and the day-to-day
          experience is significantly better.
        </p>
        <p>
          For a rental or somewhere we might move from in a year or two: battery. No structural
          work, no holes that need filling on the way out.
        </p>
        <p>
          If you want a look at your own setup, what the existing transformer is, whether the
          cabling will carry the new voltage, whether a hardwire conversion is even possible without
          opening walls, that&apos;s exactly what the{" "}
          <Link href="/services/free-consultation" className="text-brand-500 hover:underline">
            complimentary consultation
          </Link>{" "}
          is for. We&apos;ll tell you straight what your house can take and what it can&apos;t.
        </p>
      </BlogLayout>
    </>
  );
}

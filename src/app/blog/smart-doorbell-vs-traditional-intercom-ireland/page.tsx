import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("smart-doorbell-vs-traditional-intercom-ireland")!;

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
  { id: "differences", label: "Smart doorbell vs intercom: the actual differences" },
  { id: "cost", label: "Cost comparison" },
  { id: "wiring", label: "Wiring a smart doorbell into an existing intercom" },
  { id: "who-should", label: "Who should upgrade, who shouldn't" },
  { id: "older-homes", label: "Older Irish homes: the common pitfalls" },
  { id: "eldercare", label: "Smart doorbells for older family members" },
  { id: "next-steps", label: "What to do next" },
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
          A lot of Irish homes — especially those built in the 70s, 80s and 90s — still
          have wired intercom systems at the front gate or front door. Most of them are
          either broken, half-broken, or so old the handset inside the hall looks like a
          1987 telephone. If you&apos;re considering ripping out the old intercom and
          replacing it with a modern smart doorbell, this guide covers whether it&apos;s
          worth it, what it costs, and the Irish-specific gotchas.
        </p>

        <h2 id="differences">Smart doorbell vs intercom: the actual differences</h2>
        <p>
          A traditional wired intercom is a single-purpose device: press the button at the
          gate, someone inside the house picks up a handset, you have a voice conversation,
          they buzz you in. That&apos;s it.
        </p>
        <p>
          A smart doorbell (Ring, Nest, Eufy) does more:
        </p>
        <ul>
          <li>
            <strong>Video.</strong> You see who&apos;s at the door, not just hear them.
          </li>
          <li>
            <strong>Recording.</strong> Every press and every motion event is recorded.
            Useful for deliveries you missed, or for unwanted callers.
          </li>
          <li>
            <strong>Remote answering.</strong> You can answer from anywhere — in the
            garden, in the car, on holiday. Couriers get a response even when you&apos;re
            not home.
          </li>
          <li>
            <strong>Notifications on phone and smartwatch.</strong> No more missing the
            door because you were upstairs.
          </li>
          <li>
            <strong>Integration with other smart devices.</strong> Smart locks, cameras,
            lights can all be linked.
          </li>
        </ul>
        <p>
          A traditional intercom still has one advantage: it works when your broadband is
          down. For 99% of modern Irish homes, the trade-off is worth it.
        </p>

        <h2 id="cost">Cost comparison</h2>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Typical cost (Ireland, 2026)</th>
              <th>Lifespan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Repair existing wired intercom</td>
              <td>€150 – €350 (call-out + parts)</td>
              <td>3–7 more years before next failure</td>
            </tr>
            <tr>
              <td>Replace with new wired intercom (audio only)</td>
              <td>€400 – €650</td>
              <td>10+ years</td>
            </tr>
            <tr>
              <td>Replace with new wired video intercom</td>
              <td>€800 – €1,400</td>
              <td>10+ years but the tech dates quickly</td>
            </tr>
            <tr>
              <td>Smart doorbell (Ring Video Doorbell + professional install)</td>
              <td>From €299</td>
              <td>5–8 years, firmware updates indefinitely</td>
            </tr>
            <tr>
              <td>Smart doorbell + smart lock</td>
              <td>From €509 — see <Link href="/services/bundles/eldercare">Eldercare Bundle</Link></td>
              <td>5–8 years</td>
            </tr>
          </tbody>
        </table>
        <p>
          In most cases, replacing a dying intercom with a smart doorbell is both cheaper
          and more capable than repairing or like-for-like replacing.
        </p>

        <h2 id="wiring">Wiring a smart doorbell into an existing intercom</h2>
        <p>
          Irish intercom installations typically use 2- or 4-wire cable running from a gate
          or front-door panel to an internal handset, powered by a small transformer in the
          meter cupboard. A professional installer can usually reuse this cabling to supply
          power to a smart doorbell, but a few gotchas:
        </p>
        <ul>
          <li>
            <strong>Voltage.</strong> Older intercoms run 12V or 24V AC. Ring doorbells
            need 8V–24V AC at the bell push. We verify with a multimeter before connecting
            — a 24V transformer connected directly to a Ring Doorbell Wired will damage
            the unit.
          </li>
          <li>
            <strong>Cable length and gauge.</strong> If the run from the meter cupboard to
            the front door is over 15 metres on thin cable, voltage drop can cause flaky
            behaviour. Sometimes a fresh cable run is the right call.
          </li>
          <li>
            <strong>Removal of internal handset.</strong> Leaving the old handset on the
            wall looks unfinished. A good installer patches and paints the wall after
            removal.
          </li>
        </ul>

        <h2 id="who-should">Who should upgrade, who shouldn&apos;t</h2>
        <p>
          <strong>You should upgrade if:</strong> your intercom has failed or is failing;
          you miss deliveries because you can&apos;t hear the door; you want to answer the
          door from anywhere; you have elderly family members you want to check in on; or
          you&apos;re renovating and the intercom wiring is coming out anyway.
        </p>
        <p>
          <strong>You probably shouldn&apos;t upgrade if:</strong> your existing intercom
          works fine and you don&apos;t care about the extra features; you have no Wi-Fi at
          the front door and can&apos;t add a Chime Pro; or you&apos;re in a listed
          building where any external device needs planning permission.
        </p>

        <h2 id="older-homes">Older Irish homes: the common pitfalls</h2>
        <p>
          In older homes (pre-2000), we often encounter:
        </p>
        <ul>
          <li>
            <strong>Intercom wiring shared with the doorbell lighting circuit.</strong>{" "}
            Fixable but needs to be separated before a smart doorbell goes in.
          </li>
          <li>
            <strong>Ancient transformers.</strong> 1970s doorbell transformers are often
            still technically working but well out of spec. Replace before fitting anything
            new.
          </li>
          <li>
            <strong>Granite, stone, or render.</strong> Mounting into stone or granite
            requires proper masonry drilling and chemical anchors, not the plastic plugs in
            the Ring box.
          </li>
          <li>
            <strong>Weak Wi-Fi at the front door.</strong> Thick stone walls and lead
            flashing kill Wi-Fi. A Chime Pro or additional access point is usually needed.
          </li>
        </ul>

        <h2 id="eldercare">Smart doorbells for older family members</h2>
        <p>
          One of the most common reasons we get called to install smart doorbells isn&apos;t
          for the homeowner — it&apos;s for a parent or an older relative. The setup we
          install most is a Ring Video Doorbell linked to the family&apos;s phones, plus a
          smart Wi-Fi keybox that a carer can open with a one-time code.
        </p>
        <p>
          The older person presses the doorbell, everyone gets notified, and family members
          can answer the door remotely. The carer arrives, enters the keybox code on their
          phone, collects the key, and lets themselves in — no more keys hidden under plant
          pots. See the <Link href="/services/bundles/eldercare">Eldercare Bundle</Link>{" "}
          for the full setup.
        </p>

        <h2 id="next-steps">What to do next</h2>
        <p>
          If you have an old intercom and you&apos;re not sure whether to repair or replace,
          book a free consultation. We&apos;ll check the existing wiring, test voltages,
          confirm Wi-Fi signal, and tell you honestly whether a smart doorbell makes sense
          in your home — or whether a like-for-like intercom repair is the right call.
        </p>
        <p>
          Smart Space is Dublin&apos;s #1 Ring installer and covers all of Leinster.{" "}
          <Link href="/services/free-consultation">Book a free consultation</Link> or{" "}
          <Link href="/contact">get in touch</Link>.
        </p>
      </BlogLayout>
    </>
  );
}

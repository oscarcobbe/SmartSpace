import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("smart-home-tech-elderly-parent-ireland")!;

/*
 * Written to answer "what smart home tech actually helps an elderly parent
 * living at home in Ireland?" the way an assistant would be asked it: a direct
 * answer first, question headings, one table, and the questions again at the
 * end with FAQPage schema built from the same list.
 *
 * Sources, all read 30 September 2026:
 *   - An Garda Síochána, Crime Prevention Message: Bogus Callers / Traders
 *     (Crimecall, 27 January 2025): older or vulnerable people living alone
 *     often targeted; most incidents 9am to 4pm, Monday to Friday; "consider
 *     installing a video doorbell which links to your mobile phone" so you
 *     need not open the door; do not let in someone you do not know.
 *   - Ring, Managing permissions for users (GB): the owner invites family as
 *     shared users, each with their own Ring account; no subscription needed
 *     to add them; Limited, Standard and Advanced levels; live view and
 *     real-time notifications; reviewing recorded video needs a Ring subscription.
 *   - Ring, Understanding wifi recommendations for Ring devices (GB): doorbells
 *     and cameras need an active internet connection; signal weakens with
 *     distance and walls.
 *   - Amazon.co.uk help: How Does Drop In Work with Alexa? (optional, like an
 *     intercom, light pulses green and the connection begins automatically,
 *     both sides give permission for contacts); Manage Drop In Permissions;
 *     Turn Drop In On or Off for Your Device; What Is Alexa Calling and
 *     Messaging? (calls between Echo devices and the Alexa app; calls to phone
 *     numbers only in the US, UK, Canada and Mexico); Make Alexa Calls with
 *     Your Voice (no emergency numbers, for example 112; no international
 *     numbers); What Is an Alexa Emergency Contact? (no 999; nothing without
 *     Wi-Fi); Set Reminders with Alexa and What are Alexa Reminders? (by voice
 *     or in the app, choosing the announcing device; recurring, "Remind me to
 *     call Dad every Saturday"); Make Video Calls On Your Echo Devices with a
 *     Screen (the camera can be turned off at any time); What Can You Do with Alexa
 *     Routines? (a time of day can start one; turn smart home devices on or
 *     off).
 *   - WhatsApp Help Center, How to make a 1:1 video call: open the chat, tap
 *     Call; no auto-answer for video calls.
 *   - Philips Hue (UK), What can you do with a Philips Hue motion sensor?:
 *     lights on with movement and off after a period; hallways; day and night
 *     time slots; needs a Hue Bridge. No smart plug maker's page was read: the
 *     plug line rests on Amazon's routines page.
 *   - Data Protection Commission, Guidance on the use of Domestic CCTV (May
 *     2026): capture images only within the perimeter of your own property.
 *   - SmartCare Living, How can I keep an eye on my elderly mum or dad who
 *     lives alone? (no single option covers everything; the options it
 *     compares; the 2023 survey on privacy and showering or changing; agree any
 *     camera and keep it to shared rooms) and SmartGuardian (non-wearable
 *     sensors, falls including slow slides, time in bed, movement and night-time
 *     bathroom trips week to week, stick figures, no video leaves the home, the
 *     sensor has a lens, alerts to family phones, does not call 999, needs a
 *     working internet connection). Described only as those pages describe
 *     themselves; SmartGuardian's prices are left to its own pages.
 *   - Smart Space, /services/eldercare-security-bundle (€509, or €609 where new
 *     cabling and a power source are needed; what it includes) and
 *     /services/wifi (the €395 assessment and the monitoring plans).
 *
 * Left out as unverified: Alexa's "call for help" emergency contact feature
 * with an Irish number (Amazon lists phone-number calling only for the US, UK,
 * Canada and Mexico), any claim that smart lighting prevents falls, and any
 * figure for how often doorstep scams happen.
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
  { id: "short-answer", label: "What smart home tech actually helps?" },
  { id: "at-a-glance", label: "What does each one help with, and need?" },
  { id: "doorbell", label: "How does a video doorbell help?" },
  { id: "speaker", label: "Can a smart speaker help them keep in touch?" },
  { id: "video-calls", label: "What is the simplest way to video call?" },
  { id: "lighting", label: "Can smart lights and plugs help at night?" },
  { id: "wifi", label: "Why does the Wi-Fi matter so much?" },
  { id: "falls", label: "What about falls and wellbeing monitoring?" },
  { id: "dignity", label: "How do you keep it simple and respectful?" },
  { id: "setup", label: "Who sets it up and supports it?" },
  { id: "faq", label: "Frequently asked questions" },
  { id: "sources", label: "Sources" },
];

/* One list feeds both the questions on the page and the FAQPage schema, so
   the two cannot say different things. */
const FAQ = [
  {
    q: "What is the best smart home tech for an elderly parent?",
    a: "Whatever fixes a problem they already have: often a video doorbell, to talk to callers without opening the door, and a smart speaker, to call family and set reminders by voice. Check the Wi-Fi reaches those spots first.",
  },
  {
    q: "Can Alexa call 999 in Ireland?",
    a: "No. Amazon says Alexa calling does not support emergency numbers such as 999 or 112. A smart speaker is for keeping in touch, not an emergency alarm.",
  },
  {
    q: "Can family see who comes to my parent's door?",
    a: "With a Ring doorbell, yes. The account owner invites family as shared users, each with their own Ring account, and Ring says no subscription is needed to add them. Recorded video needs a Ring subscription.",
  },
  {
    q: "What is Alexa Drop In, and should we use it?",
    a: "An optional feature that connects to an Echo like an intercom, starting automatically without anyone answering. It can be turned off on each device. Agree it with your parent before switching it on.",
  },
  {
    q: "Should I put a camera inside my parent's home?",
    a: "Only with their agreement, and treat it as a big step: a doorbell looks at the doorstep, an indoor camera looks at your parent. If you go ahead, keep it to shared rooms.",
  },
  {
    q: "Does smart home tech need good Wi-Fi?",
    a: "Yes. Ring says its doorbells need an active internet connection, and Amazon says an Echo cannot call without Wi-Fi. Test the signal at the front door and in the rooms your parent uses.",
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

const SCL_GUIDE = "https://www.smartcareliving.ie/how-to-monitor-elderly-parent-ireland";
const SCL_SMARTGUARDIAN = "https://www.smartcareliving.ie/smartguardian";

const SOURCES = [
  {
    label: "An Garda Síochána, Crime Prevention Message: Bogus Callers / Traders (January 2025)",
    href: "https://www.garda.ie/en/crime-prevention/crimecall-on-rte/crimecall-episodes/2025/27-january/crime-prevention-message-bogus-callers-traders.html",
  },
  {
    label: "Data Protection Commission, Guidance on the use of Domestic CCTV (updated May 2026)",
    href: "https://www.dataprotection.ie/en/dpc-guidance/guidance-use-domestic-cctv",
  },
  {
    label: "Ring, Managing permissions for users",
    href: "https://ring.com/gb/en/support/articles/clv68/adding-and-managing-shared-and-guest-users",
  },
  {
    label: "Ring, Understanding wifi recommendations for Ring devices",
    href: "https://ring.com/gb/en/support/articles/92bd2/Test-Your-Wifi-Connections",
  },
  {
    label: "Amazon, How Does Drop In Work with Alexa?",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GS3WRTSRKD2U6MCK",
  },
  {
    label: "Amazon, Manage Drop In Permissions for Alexa Contacts",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=TVSlCiXM4nLWIDwCW2",
  },
  {
    label: "Amazon, Turn Drop In On or Off for Your Device",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GXEKQNFSP9QEWKAD",
  },
  {
    label: "Amazon, What Is Alexa Calling and Messaging?",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GHGG9TWN6NYP4DJS",
  },
  {
    label: "Amazon, Make Alexa Calls with Your Voice",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GEC6XC297YU93LDA",
  },
  {
    label: "Amazon, What Is an Alexa Emergency Contact?",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=G6WYZPF5XKHNBZKA",
  },
  {
    label: "Amazon, Set Reminders with Alexa",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GDDXYWQUKGGWG79Y",
  },
  {
    label: "Amazon, What are Alexa Reminders?",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GVMW5E8YCNR6AC6E",
  },
  {
    label: "Amazon, Make Video Calls On Your Echo Devices with a Screen",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=TfVwC33cpZGYw4jVPM",
  },
  {
    label: "Amazon, What Can You Do with Alexa Routines?",
    href: "https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GJWYQVSUF3W9V7N9",
  },
  {
    label: "WhatsApp Help Center, How to make a 1:1 video call",
    href: "https://faq.whatsapp.com/1862285217468140/",
  },
  {
    label: "Philips Hue, What can you do with a Philips Hue motion sensor?",
    href: "https://www.philips-hue.com/en-gb/products/smart-light-accessories/what-can-you-do-with-philips-hue-motion-sensor",
  },
  {
    label: "SmartCare Living, How can I keep an eye on my elderly mum or dad who lives alone?",
    href: SCL_GUIDE,
  },
  {
    label: "SmartCare Living, SmartGuardian",
    href: SCL_SMARTGUARDIAN,
  },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc}>
        <h2 id="short-answer">What smart home tech actually helps an elderly parent living at home?</h2>
        <p>
          <strong>The short answer:</strong> whatever solves a problem your parent already has. For many families that
          is a video doorbell, to talk to callers without opening the door, and a smart speaker, to call family and set
          reminders by voice. Video calls and night-time lighting can follow, and all of it needs Wi-Fi that reaches
          where it is used. Choose it with your parent, not for them, and think hard before any camera goes inside. None
          of it is a <a href="#falls">fall alarm</a>.
        </p>

        <h2 id="at-a-glance">What does each one help with, and what does it need?</h2>
        <table>
          <thead>
            <tr>
              <th>Tech</th>
              <th>What it helps with</th>
              <th>What it needs</th>
              <th>Good first step?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Video doorbell</td>
              <td>Talking to callers without opening the door; family see who called</td>
              <td>Wi-Fi at the door, an app; a subscription for Ring recordings</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Smart speaker</td>
              <td>Calling family by voice, reminders, Drop In</td>
              <td>Wi-Fi, the Alexa app</td>
              <td>Yes, if they like talking to it</td>
            </tr>
            <tr>
              <td>Video calling</td>
              <td>Seeing family, not just hearing them</td>
              <td>Wi-Fi, an Echo Show or an app they know</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Smart lights and plugs</td>
              <td>Light in the hall at night; lamps on a timer</td>
              <td>Wi-Fi, an app, sometimes a hub</td>
              <td>A good second step</td>
            </tr>
            <tr>
              <td>Wi-Fi throughout</td>
              <td>Everything above, in every room</td>
              <td>Coverage where the devices are</td>
              <td>Check it first</td>
            </tr>
            <tr>
              <td>Indoor camera</td>
              <td>Seeing inside the home</td>
              <td>Wi-Fi, an app, your parent&apos;s agreement</td>
              <td>No; discuss it first</td>
            </tr>
            <tr>
              <td>Fall detection</td>
              <td>Knowing about a fall</td>
              <td>A specialist system, internet</td>
              <td>If falls are the worry</td>
            </tr>
          </tbody>
        </table>

        <h2 id="doorbell">How does a video doorbell help an elderly parent?</h2>
        <p>
          An Garda Síochána says bogus callers often target an older or vulnerable person living alone, mostly between
          9am and 4pm on weekdays. Its{" "}
          <a
            href="https://www.garda.ie/en/crime-prevention/crimecall-on-rte/crimecall-episodes/2025/27-january/crime-prevention-message-bogus-callers-traders.html"
            rel="noopener"
          >
            crime prevention advice
          </a>{" "}
          suggests a video doorbell linked to a mobile phone, so you can speak to a caller without opening the door, and
          says not to let in anyone you don&apos;t know.
        </p>
        <p>
          Family can see who called too. On Ring, the account owner invites family as shared users, each with their own
          Ring account; at the Standard level they get live view and real-time notifications. Ring says no subscription
          is needed to add them, though recorded video needs one.
        </p>
        <p>
          Keep the camera on your parent&apos;s own door, path and garden: the Data Protection Commission says a home
          camera should capture images only within the owner&apos;s property. See our guides to{" "}
          <Link href="/blog/doorbell-camera-rules-ireland-gdpr">doorbell camera rules in Ireland</Link> and{" "}
          <Link href="/blog/home-security-cameras-ireland-buyers-guide">home security cameras</Link>.
        </p>

        <h2 id="speaker">Can a smart speaker help them keep in touch?</h2>
        <p>Yes, by voice, with nothing to dial. With an Amazon Echo:</p>
        <ul>
          <li>
            <strong>Calls.</strong> Alexa calls run between Echo devices and the Alexa app on family phones. Amazon lists
            calls to ordinary phone numbers only in the US, UK, Canada and Mexico, not Ireland.
          </li>
          <li>
            <strong>Reminders.</strong> Set by voice, or in the Alexa app, choosing which Echo announces them. They can
            repeat, as in Amazon&apos;s example: &quot;Remind me to call Dad every Saturday.&quot;
          </li>
          <li>
            <strong>Drop In.</strong> Optional, and works like an intercom: the call begins automatically, without anyone
            answering. Contacts must both allow it, and it can be turned off on each device. Agree it with your parent
            first.
          </li>
        </ul>
        <p>
          It is not an emergency alarm. Amazon says Alexa calling does not support emergency numbers such as 999 or 112,
          and an Echo cannot call anyone without Wi-Fi.
        </p>

        <h2 id="video-calls">What is the simplest way to video call?</h2>
        <p>
          The one your parent will actually use. Amazon says calls to an Echo Show, the Echo with a screen, can use its
          camera, which can be turned off at any time. With Drop In agreed, nobody has to answer. If your parent already
          uses WhatsApp on a phone or tablet, a video call is a tap from the chat, and since WhatsApp has no auto-answer,
          they choose when to pick up.
        </p>

        <h2 id="lighting">Can smart lights and plugs help at night?</h2>
        <p>
          They put light where it is needed without anyone feeling for a switch. A motion sensor can turn the hall light
          on as someone walks through and off again afterwards; Philips Hue lets you set it differently for day and
          night, and its sensors need a Hue Bridge. A lamp on a smart plug can be switched on at a set time by an Alexa
          routine. Keep the wall switches working as they always have.
        </p>

        <h2 id="wifi">Why does the Wi-Fi matter so much?</h2>
        <p>
          Everything here runs on it. Ring says its doorbells need an active internet connection, and that signal
          weakens with distance and through walls, so a doorbell at the far end of the hall or a speaker in a back
          bedroom is where problems show. Our guide to{" "}
          <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why Wi-Fi is slow upstairs in Irish homes</Link> explains
          why, and the <Link href="/wifi-check">free Wi-Fi check</Link> compares the signal at the router with the room
          that struggles.
        </p>
        <p>
          If a room still struggles, our <Link href="/services/wifi">home network assessment</Link> measures every room on
          a two-hour visit and leaves a working trial system on the floor that struggles for three days, with a written
          report. It costs €395, credited in full against any work, in Dublin and the rest of Leinster.
        </p>

        <h2 id="falls">What about falls and wellbeing monitoring?</h2>
        <p>
          A doorbell or speaker will not tell you your parent has fallen. That is what our sister company SmartCare Living
          specialises in. Its guide to{" "}
          <a href={SCL_GUIDE} rel="noopener">
            keeping an eye on an elderly parent living alone
          </a>{" "}
          compares the options in Ireland, from daily calls and the Seniors Alert Scheme to pendants, sensors and carers,
          and says no single option covers everything.
        </p>
        <p>
          Its own system,{" "}
          <a href={SCL_SMARTGUARDIAN} rel="noopener">
            SmartGuardian
          </a>
          , uses non-wearable sensors to catch a fall automatically, including slow slides to the floor, and shows how
          time in bed, movement and night-time bathroom trips change week to week. Nothing is worn or pressed. Each person
          becomes an anonymous stick figure on the sensor and no video leaves the home, though the sensor does have a
          lens. Alerts go to family phones; it does not call 999, and it needs a working internet connection.
        </p>

        <h2 id="dignity">How do you keep it simple, and respect their dignity and privacy?</h2>
        <ul>
          <li>
            <strong>Decide together.</strong> It is their home. Start with one thing that fixes a problem they recognise.
          </li>
          <li>
            <strong>Say who can see what.</strong> Who views the doorbell, who can Drop In, and change it if they ask.
          </li>
          <li>
            <strong>Treat indoor cameras as a big step.</strong> SmartCare Living&apos;s guide cites a 2023 survey in which
            privacy needs were highest for showering and changing clothes, and advises agreeing any camera with your
            parent and keeping it to shared rooms.
          </li>
          <li>
            <strong>Keep the familiar.</strong> Light switches, the phone and the door key should work as before.
          </li>
          <li>
            <strong>Write it down.</strong> One page: what each device does, and who to ring if it stops.
          </li>
        </ul>

        <h2 id="setup">Who sets it up and supports it?</h2>
        <p>
          Often a son or daughter sets up the speaker and apps. Make one person the account owner and add the rest.
        </p>
        <p>
          Smart Space fits doorbells across Dublin and Leinster. Our{" "}
          <Link href="/services/eldercare-security-bundle">Eldercare Security Bundle</Link>, designed for elderly
          relatives and their carers, pairs a Basic Ring Video Doorbell Plus, so family can see who is at the door from
          anywhere, with a Digital Lockbox, a Wi-Fi keybox giving carers secure, auditable key access by one-time code.
          It includes a Ring Chime, mounting and wiring, Wi-Fi signal optimisation and app set-up for family members,
          for €509, or €609 where new cabling and a power source are needed. An optional
          network monitoring plan, from €39 a month, then alerts us when the broadband fails or a device you named goes
          offline.
        </p>

        <h2 id="faq">Frequently asked questions</h2>
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

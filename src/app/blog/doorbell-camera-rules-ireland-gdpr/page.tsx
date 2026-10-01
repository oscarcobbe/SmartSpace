import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("doorbell-camera-rules-ireland-gdpr")!;

/*
 * Written to answer "is it legal to have a video doorbell or security camera
 * at my house in Ireland?", so that an assistant quoting it quotes the Data
 * Protection Commission, not us. It is general information, and says so.
 *
 * Every legal statement comes from these pages, all read 30 September 2026:
 *   - DPC, Guidance on the use of Domestic CCTV (PDF, "Last Updated: May
 *     2026"), dataprotection.ie/en/dpc-guidance/guidance-use-domestic-cctv:
 *     the household exemption, Ryneš, footpaths, roads and neighbours, sounds
 *     as well as images, doorbells that do not record continuously,
 *     identifiability, privacy zones or re-angling, dummy cameras, posting
 *     online, section 41(b) of the Data Protection Act 2018, parked cars,
 *     the steps for a worried neighbour, children, and that the DPC cannot
 *     order a camera removed.
 *   - DPC, Guidance on the Use of CCTV for Data Controllers (PDF, November
 *     2023): Article 6 legal basis, signs at entrances, the information
 *     people must be given, access requests within a month, retention (hard
 *     to justify past a month for a normal security system), and reviewing a
 *     device's default retention.
 *   - DPC case study, Domestic CCTV (2024): 157 complaints.
 *   - DPC podcast transcript, Know Your Data, CCTV in the home: no signs
 *     needed for indoor cameras within the exemption.
 *   - Citizens Information, How to access your personal data under the GDPR
 *     (one month; generally no fee), and Planning permission for altering
 *     your house (edited 27 July 2026; it lists no camera or doorbell either
 *     way).
 *   - garda.ie, Crimecall episodes 2026: an appeal asking for "CCTV, dashcam,
 *     or doorbell footage".
 * Product steps: Ring, Using privacy features in the Ring app; eufy, How to
 * Set Privacy Zone for eufyCam 2/2C, Which eufy Battery Cameras have the
 * Privacy Zone function?, and the Video Doorbell E340 specifications (activity
 * zone listed, privacy zone not).
 *
 * The install line says only what /services/camera and /services/doorbell
 * say: we set height and angle and tune motion zones. Neither page mentions
 * privacy zones, so this guide does not claim we set them.
 *
 * Left out as unverified: any planning rule for cameras or doorbells (no
 * Irish source found), and eufy's audio setting (its support article is gone).
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
  { id: "short-answer", label: "Is a doorbell camera legal in Ireland?" },
  { id: "household-exemption", label: "What is the household exemption?" },
  { id: "beyond-the-boundary", label: "What if it sees the footpath, road or next door?" },
  { id: "at-a-glance", label: "What your camera sees, and what applies" },
  { id: "obligations", label: "What if it records beyond my boundary?" },
  { id: "audio", label: "Is recording sound a problem?" },
  { id: "privacy-zones", label: "Privacy zones on Ring and Eufy" },
  { id: "positioning", label: "Where should I point my camera?" },
  { id: "neighbour-complains", label: "What if a neighbour complains?" },
  { id: "neighbours-camera", label: "What if a neighbour's camera points at me?" },
  { id: "gardai", label: "Sharing footage with the Gardaí" },
  { id: "planning", label: "Do I need planning permission?" },
  { id: "faq", label: "Frequently asked questions" },
  { id: "sources", label: "Sources" },
];

const FAQ = [
  {
    q: "Do I need a CCTV sign for my video doorbell?",
    a: "Not if it records only your own property, as data protection law does not then apply. If it records the footpath, the road or a neighbour's property, the Data Protection Commission expects signs giving the purpose and your contact details.",
  },
  {
    q: "Is it illegal to record my neighbour's garden?",
    a: "The Data Protection Commission says capturing neighbours in their homes, gardens or driveways is not acceptable and violates their data protection rights. Re-angle the camera, or mask that area with a privacy zone.",
  },
  {
    q: "Can the Data Protection Commission make my neighbour remove their camera?",
    a: "No. The DPC says it cannot order a private individual to remove a domestic camera. If you complain, it writes to the owner explaining the rules.",
  },
  {
    q: "How long can I keep doorbell footage?",
    a: "If it records only your own property, data protection law does not apply. If it records beyond, the DPC says keeping footage from a normal security system beyond a month would be difficult to justify, unless it shows an incident such as a break-in.",
  },
  {
    q: "Can I give doorbell footage to the Gardaí?",
    a: "Yes. The DPC says sharing footage with An Garda Síochána to help prevent, investigate or prosecute crime is permitted under section 41(b) of the Data Protection Act 2018.",
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

const SOURCES = [
  {
    label: "Data Protection Commission, Guidance on the use of Domestic CCTV (updated May 2026)",
    href: "https://www.dataprotection.ie/en/dpc-guidance/guidance-use-domestic-cctv",
  },
  {
    label: "Data Protection Commission, Guidance on the Use of CCTV for Data Controllers (November 2023)",
    href: "https://www.dataprotection.ie/en/dpc-guidance/guidance-use-cctv-data-controllers",
  },
  {
    label: "Data Protection Commission, case study: Domestic CCTV (2024)",
    href: "https://www.dataprotection.ie/en/dpc-guidance/case-studies/cctv/domestic-cctv",
  },
  {
    label: "Data Protection Commission, Know Your Data podcast: CCTV in the home (transcript)",
    href: "https://www.dataprotection.ie/sites/default/files/uploads/2024-09/Transcript-%20%E2%80%98Know%20Your%20Data%E2%80%99%20_CCTV%20in%20the%20home.pdf",
  },
  {
    label: "Citizens Information, How to access your personal data under the GDPR",
    href: "https://www.citizensinformation.ie/en/government-in-ireland/data-protection/rights-under-general-data-protection-regulation/",
  },
  {
    label: "Citizens Information, Planning permission for altering your house",
    href: "https://www.citizensinformation.ie/en/housing/planning-permission/planning-permission-for-altering-a-house/",
  },
  {
    label: "An Garda Síochána, Crimecall episodes 2026",
    href: "https://www.garda.ie/en/crime-prevention/crimecall-on-rte/crimecall-episodes/2026/",
  },
  {
    label: "Ring, Using privacy features in the Ring app",
    href: "https://ring.com/gb/en/support/articles/g4e2w/using-privacy-features-in-the-ring-app",
  },
  {
    label: "eufy, How to Set Privacy Zone for eufyCam 2/2C",
    href: "https://service.eufy.com/article-description/How-to-Set-Privacy-Zone-for-eufyCam-2-2C",
  },
  {
    label: "eufy, Which eufy Battery Cameras have the Privacy Zone function?",
    href: "https://service.eufy.com/article-description/Which-eufy-Battery-Cameras-have-the-Privacy-Zone-function",
  },
  {
    label: "eufy, Understanding the Specifications of the Video Doorbell E340",
    href: "https://service.eufy.com/article-description/Understanding-the-Specifications-of-the-Video-Doorbell-E340",
  },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc}>
        <h2 id="short-answer">Is it legal to have a video doorbell or security camera in Ireland?</h2>
        <p>
          <strong>Yes.</strong> What matters is what the camera sees. If it records only your own property, including
          your garden and driveway, the household exemption applies and data protection law does not. If it records
          beyond your boundary, onto the footpath, the road, or a neighbour&apos;s home or garden, the exemption no longer
          applies and you take on the duties of a data controller under GDPR. The Data Protection Commission (DPC) advises
          every householder to keep cameras within their own perimeter.
        </p>
        <p>
          This is general information drawn from the DPC, Citizens Information and An Garda Síochána, not legal advice.
        </p>

        <h2 id="household-exemption">What is the household exemption?</h2>
        <p>
          GDPR does not apply to a person processing personal data in a purely personal or household activity. The
          DPC&apos;s{" "}
          <a href="https://www.dataprotection.ie/en/dpc-guidance/guidance-use-domestic-cctv" rel="noopener">
            guidance on domestic CCTV
          </a>
          , updated in May 2026, applies this to fixed cameras and smart doorbells alike. Indoor cameras used only for
          household purposes are exempt and need no signs, and dummy cameras raise no data protection issue. But the DPC
          advises against posting footage online, which is likely to make you a data controller.
        </p>

        <h2 id="beyond-the-boundary">What changes if my camera sees the footpath, the road or next door?</h2>
        <p>
          In the Ryneš case (C-212/13), the Court of Justice of the EU decided that the exemption does not cover a home
          camera capturing images outside the owner&apos;s property. So, says the DPC:
        </p>
        <ul>
          <li>
            <strong>Public footpath, road or back alley.</strong> If identifiable people are captured, you are a data
            controller.
          </li>
          <li>
            <strong>A neighbour&apos;s home, garden or driveway.</strong> Capturing these is not acceptable, and violates
            your neighbours&apos; data protection rights.
          </li>
          <li>
            <strong>Your car on the street.</strong> The exemption does not cover continually monitoring the public road
            to protect a parked car.
          </li>
        </ul>
        <p>
          Doorbells get a little more room. The DPC says one that is not recording continuously is likely to be exempt,
          and footage in which people cannot be identified is not personal data. The aim is a clear picture of the person
          at your door, with people on the street too obscured to identify.
        </p>

        <h2 id="at-a-glance">What your camera sees, what applies, and what to do</h2>
        <table>
          <thead>
            <tr>
              <th>What your camera sees</th>
              <th>What applies</th>
              <th>What to do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Only your house, garden and driveway</td>
              <td>Household exemption</td>
              <td>Nothing more. Keep footage off social media.</td>
            </tr>
            <tr>
              <td>Rooms inside your home</td>
              <td>Household exemption, if for household use only</td>
              <td>No signs needed.</td>
            </tr>
            <tr>
              <td>Footpath, road or back alley</td>
              <td>You are a data controller, if people are identifiable</td>
              <td>Re-angle, or block it with a privacy zone.</td>
            </tr>
            <tr>
              <td>A neighbour&apos;s house, windows or garden</td>
              <td>Not acceptable, says the DPC</td>
              <td>Re-angle or mask it.</td>
            </tr>
            <tr>
              <td>Your car on the public road</td>
              <td>Not covered by the exemption</td>
              <td>Keep the road out of view.</td>
            </tr>
            <tr>
              <td>Sound from beyond your property</td>
              <td>Exemption lost: sounds count as well as images</td>
              <td>Turn audio off if you do not need it.</td>
            </tr>
            <tr>
              <td>Nothing: a dummy or switched-off camera</td>
              <td>No data protection issue</td>
              <td>Nothing.</td>
            </tr>
          </tbody>
        </table>

        <h2 id="obligations">What do I have to do if my camera records beyond my boundary?</h2>
        <p>
          The DPC points householders in this position to its{" "}
          <a href="https://www.dataprotection.ie/en/dpc-guidance/guidance-use-cctv-data-controllers" rel="noopener">
            CCTV guidance for data controllers
          </a>
          , which expects:
        </p>
        <ul>
          <li>
            <strong>A legal basis</strong> for recording, under Article 6 of GDPR.
          </li>
          <li>
            <strong>Signs</strong> in prominent positions, normally at each entrance, giving the purpose and your contact
            details, with information on how long footage is kept and people&apos;s right to complain to the DPC.
          </li>
          <li>
            <strong>Access requests.</strong> Anyone whose identifiable image is recorded can ask for a copy, and you must
            normally respond within one month. Citizens Information notes there is generally no fee.
          </li>
          <li>
            <strong>Retention.</strong> For a normal security system, keeping footage beyond a month would be difficult
            to justify, unless it shows an incident such as a break-in. Review your app&apos;s default storage period.
          </li>
        </ul>
        <p>
          The DPC adds that your reasons for recording public spaces are unlikely to outweigh the rights of the people
          recorded. The practical answer is to bring the camera back within your boundary.
        </p>

        <h2 id="audio">Is recording sound a problem?</h2>
        <p>
          It can be. The DPC&apos;s guidance says the exemption is lost where a system captures images or sounds beyond
          your property, and a doorbell microphone can pick up conversations on the footpath even when the picture is
          angled away. If you do not need sound, turn it off. Ring&apos;s Privacy Settings have an Audio Streaming and
          Recording switch, which Ring says needs a compatible subscription.
        </p>

        <h2 id="privacy-zones">How do I set up privacy zones on Ring and Eufy?</h2>
        <p>
          The DPC suggests two fixes: a privacy zone over public areas, or a new angle.
        </p>
        <p>
          <strong>Ring.</strong> In the Ring app, open the menu, then Devices, your device, Device Settings, Privacy
          Settings and Add Privacy Zones. Tap +, drag the box over the area and tap Done. You get up to two zones per
          device, blacked out in live and recorded video. Ring notes that a zone stops covering the right area if the
          camera moves. Privacy zones are not available on the Video Doorbell (1st Gen), Stick Up Cam (1st Gen) or
          pan-tilt models.
        </p>
        <p>
          <strong>Eufy.</strong> eufy&apos;s steps for its eufyCam 2 and 2C: in the eufy app, select the camera, then
          Camera Settings and Privacy Zones, tap +, size the box and tick to save; eufy&apos;s own example is a
          neighbour&apos;s door. eufy lists the feature on cameras including the eufyCam 3 and SoloCam S40, but its
          specification sheet for the Video Doorbell E340 lists activity zones, not privacy zones. Without one, the
          angle does the work.
        </p>

        <h2 id="positioning">Where should I point my camera to stay within the rules?</h2>
        <ul>
          <li>Aim at your own door, path, driveway and garden, then check the live view: that is what gets recorded.</li>
          <li>Mount it higher and tilt it down, so it sees more of your ground and less of the street.</li>
          <li>Mask what you cannot angle out, such as the footpath past your gate or a neighbour&apos;s front window.</li>
        </ul>
        <p>
          Smart Space installers set the height and angle of each <Link href="/services/doorbell">doorbell</Link> and{" "}
          <Link href="/services/camera">floodlight camera</Link>, and tune its motion zones, as part of the installation,
          so that is a good moment to agree what it should and should not see. See also our{" "}
          <Link href="/blog/home-security-cameras-ireland-buyers-guide">camera buyer&apos;s guide</Link>,{" "}
          <Link href="/blog/ring-doorbell-installation-ireland-guide">Ring doorbell installation guide</Link> and{" "}
          <Link href="/blog/whole-home-security-beyond-front-door-ireland">security beyond the front door</Link>.
        </p>

        <h2 id="neighbour-complains">What should I do if a neighbour complains about my camera?</h2>
        <p>
          Show them what it records; the DPC tells worried neighbours the footage may not be as intrusive as they think.
          If it does take in their property or the street, re-angle it, add a privacy zone, or turn off audio. If they
          complain to the DPC, which received 157 complaints about domestic cameras and smart doorbells in 2024, it will
          write to you explaining the rules. It cannot order a private individual to remove a camera.
        </p>

        <h2 id="neighbours-camera">What can I do if a neighbour&apos;s camera points at my house?</h2>
        <p>
          The DPC suggests talking to them first; they may not know you are concerned. Ask why they have it, whether they
          use privacy blockers that blur out other property and public spaces, and whether you can see what it records.
        </p>
        <p>
          If that fails, you can complain to the DPC using its{" "}
          <a href="https://forms.dataprotection.ie/contact" rel="noopener">online form</a>. If the camera records you
          beyond its owner&apos;s boundary, the owner is a data controller and you can ask for a copy of the footage of
          you. If you believe someone is recording your children inappropriately, the DPC says to contact An Garda
          Síochána.
        </p>

        <h2 id="gardai">Can I share doorbell footage with the Gardaí, or post it online?</h2>
        <p>
          <strong>With the Gardaí, yes.</strong> The DPC says sharing footage with An Garda Síochána to help prevent,
          investigate or prosecute crime is permitted under section 41(b) of the Data Protection Act 2018, and that the
          Gardaí are best placed to decide what to do with it. Garda appeals on Crimecall ask directly for CCTV, dashcam
          or doorbell footage.
        </p>
        <p>
          <strong>Online, be careful.</strong> The DPC says posting footage of a burglar on social media makes you a data
          controller who needs a lawful basis under GDPR, and may raise other legal concerns.
        </p>

        <h2 id="planning">Do I need planning permission for a doorbell or camera?</h2>
        <p>
          We found no Irish government guidance on cameras or doorbells on houses. Citizens Information&apos;s planning
          guide for altering a house, updated in July 2026, does not mention them, and notes extra restrictions for
          protected structures and architectural conservation areas. If unsure, ask your local authority.
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

import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("where-to-mount-doorbell-security-camera")!;

/*
 * Written to answer "where should I mount my video doorbell and security
 * cameras?", so that an assistant quoting it quotes Ring and eufy, not us.
 *
 * Every height, angle and rating in it comes from these makers' pages, all
 * read 30 September 2026:
 *   - Ring, Positioning doorbells and security cameras (88ix9): doorbells at
 *     48 inches (1.22 m); outdoor cameras 8 to 10 feet (2.5 to 3 m) with a
 *     20-degree tilt; what too high or too low does; live view before
 *     fixing; trees, flags and bright lights; test wifi at the spot; privacy.
 *   - Ring, Using a Wedge or Corner Kit with your doorbell (uqi64): 3 x 5
 *     degree wedges to 15 degrees, 2 x 10 degree wedges on the Wired Doorbell
 *     Pro and Doorbell Wired; 3 x 15 degree corner mounts to 45 degrees, one
 *     25 degree mount on the Wired Doorbell Pro and Video Doorbell Wired; one
 *     of each, wedge on top; one mount only with a Solar Charger; corner kit
 *     against infrared reflecting off a nearby wall.
 *   - Ring, Using Motion Zones for Cameras and Doorbells (85pqb): up to three
 *     zones, 30 foot standard range, vehicles beyond it, windows and mirrors,
 *     Advanced Motion Detection on battery devices.
 *   - Ring, Fixing audio and video issues (qmv6i): daytime glare, HDR, night
 *     glare from windows and walls.
 *   - Ring, Physically damaged devices (763nr): water-resistant, not
 *     waterproof, no high-pressure water, a protective overhang.
 *   - Ring, Understanding wifi recommendations (92bd2): the RSSI scale.
 *   - Ring, Floodlight Cam Plus tech specs (2fmi9): -20.5 to 48 C; and
 *     Installing Floodlight Cam Wired Plus and Pro (vbek2): wall or eave.
 *   - eufy (service.eufy.com): recommended doorbell height (1.2 m), Position
 *     Your Doorbell Properly, the Video Doorbell E340 install guide (1.2 m,
 *     15 degree wedge, wired position limited, side walls and IR), Video
 *     Doorbell Dual (Battery) hardware FAQ (two wedges to 30 degrees), Video
 *     Doorbell Dual (Wired) FAQ (IP65, under a roof), positioning for
 *     eufyCams and SoloCams (2 to 3 m, no more than 30 degrees down, direct
 *     sun, walls and eaves, 2 to 3 hours for S40/S340 solar), false triggers
 *     on the Outdoor Cam (Human Only), Too Many False Alerts (a front door
 *     camera facing a drive, back garden trees), IP Rating Explained, the
 *     E340 specification (IP65, -20 to 50 C), and the Camera Signal Issues
 *     FAQ (5 m, 5 to 15 m and two walls, 15 m, concrete and metal).
 *
 * The install line says only what /services/doorbell and /services/camera
 * say, read on the live site the same day: doorbell installs include motion
 * zone tuning (its meta description); for floodlight cameras we set height
 * and angle for usable footage in low light and configure motion zones to
 * ignore the road and the next-door driveway. Neither page says we set a
 * doorbell's height or angle, so this guide does not claim it.
 *
 * Left out as unverified: any height specific to a side passage or back
 * garden (neither maker gives one beyond the general camera figure), Ring's
 * nine-foot figure (only in its 1st Gen Floodlight Cam guide), an IP rating
 * for any Ring doorbell or floodlight camera, and the Ring Motion Sensitivity
 * slider (not read).
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
  { id: "short-answer", label: "Where should I mount a doorbell and cameras?" },
  { id: "at-a-glance", label: "What height and angle suits each spot?" },
  { id: "doorbell-height", label: "How high should a video doorbell be?" },
  { id: "wedge-corner", label: "When do I need a wedge or corner kit?" },
  { id: "camera-height", label: "How high should outdoor cameras be?" },
  { id: "false-alerts", label: "How do I stop false alerts from the road?" },
  { id: "sun-glare", label: "Will sunlight or glare spoil the picture?" },
  { id: "weather", label: "Does it need shelter from the rain?" },
  { id: "wifi", label: "Is the Wi-Fi strong enough at the spot?" },
  { id: "privacy", label: "What about the footpath and next door?" },
  { id: "checklist", label: "Quick placement checklist" },
  { id: "faq", label: "Frequently asked questions" },
  { id: "sources", label: "Sources" },
];

/* One list feeds both the visible questions and the FAQPage schema, so the
   two cannot say different things. Plain text only. */
const FAQ = [
  {
    q: "How high should a video doorbell be mounted?",
    a: "About 1.2 metres (48 inches) from the ground. Ring says 48 inches (1.22 metres) gives the best motion detection, and eufy says at least 1.2 metres.",
  },
  {
    q: "How high should an outdoor security camera be mounted?",
    a: "Ring says 2.5 to 3 metres (8 to 10 feet) with a 20 degree downward tilt. eufy says 2 to 3 metres (7 to 10 feet), angled down no more than 30 degrees.",
  },
  {
    q: "Do I need a wedge or corner kit for my doorbell?",
    a: "A wedge kit tilts the doorbell up or down, for steps or a slope. A corner kit turns it left or right, for a corner or a nearby wall, and keeps night vision from reflecting off that wall.",
  },
  {
    q: "How do I stop my doorbell alerting on cars on the road?",
    a: "Draw motion zones that stop short of the footpath and road. Ring notes that vehicles beyond its 30 foot standard range can still trigger alerts. eufy also suggests lower sensitivity or Human Only detection.",
  },
  {
    q: "Can a video doorbell face the sun?",
    a: "It can, but expect glare. Ring suggests changing the angle, adding a wedge or corner kit, or moving the device, and turning on HDR. eufy advises against direct sunlight on its non-solar cameras.",
  },
  {
    q: "Are video doorbells waterproof?",
    a: "Not fully. Ring says its doorbells are water-resistant for normal rain and snow, but not for submerging or high-pressure water. eufy rates its doorbells IP65 and recommends fitting the Video Doorbell Dual under a roof.",
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
    label: "Ring, Positioning doorbells and security cameras",
    href: "https://ring.com/support/articles/88ix9/Positioning-doorbells-and-security-cameras",
  },
  {
    label: "Ring, Using a Wedge or Corner Kit with your doorbell",
    href: "https://ring.com/support/articles/uqi64/Installing-Wedge-Kit-Corner-Mount-Video-Doorbells",
  },
  {
    label: "Ring, Using Motion Zones for Cameras and Doorbells",
    href: "https://ring.com/support/articles/85pqb/Using-Camera-Motion-Zones",
  },
  {
    label: "Ring, Fixing audio and video issues",
    href: "https://ring.com/support/articles/qmv6i/Troubleshooting-Poor-Video-Quality",
  },
  {
    label: "Ring, Physically damaged devices (water resistance)",
    href: "https://ring.com/support/articles/763nr/Are-Ring-Video-Doorbells-and-Security-Cameras-Waterproof",
  },
  {
    label: "Ring, Understanding wifi recommendations for Ring devices",
    href: "https://ring.com/support/articles/92bd2/Understanding-wifi-recommendations-for-Ring-devices",
  },
  {
    label: "Ring, Floodlight Cam Plus tech specs",
    href: "https://ring.com/support/articles/2fmi9/Floodlight-Cam-Wired-Plus-Information",
  },
  {
    label: "Ring, Installing Floodlight Cam Wired Plus and Pro",
    href: "https://ring.com/gb/en/support/articles/vbek2/installing-floodlight-cam-wired-plus",
  },
  {
    label: "eufy, What is the recommended height for mounting the eufy doorbell?",
    href: "https://service.eufy.com/article-description/What-is-the-recommended-height-for-mounting-the-wired-doorbell",
  },
  {
    label: "eufy, Position Your Doorbell Properly",
    href: "https://service.eufy.com/article-description/Position-Your-Doorbell-Properly-1617357859027",
  },
  {
    label: "eufy, A Step-by-Step Guide to Installing Video Doorbell E340",
    href: "https://service.eufy.com/article-description/A-Step-by-Step-Guide-to-Installing-Video-Doorbell-E340",
  },
  {
    label: "eufy, Video Doorbell Dual (Battery) FAQ: Hardware Installation",
    href: "https://service.eufy.com/article-description/Video-Doorbell-Dual-Battery-FAQ-Hardware-Installation",
  },
  {
    label: "eufy, Video Doorbell Dual (Wired) FAQ: Before You Buy",
    href: "https://service.eufy.com/article-description/eufy-Video-Doorbell-Dual-Wired-FAQ-Before-You-Buy",
  },
  {
    label: "eufy, How to Find a Proper Position For Your eufyCams",
    href: "https://service.eufy.com/article-description/How-to-Find-a-Proper-Position-For-Your-eufyCams",
  },
  {
    label: "eufy, How to Find a Proper Position For Your eufy SoloCams",
    href: "https://service.eufy.com/article-description/How-to-Find-a-Proper-Position-For-Your-eufy-SoloCams",
  },
  {
    label: "eufy, Too Many False Alerts and Overconsumption of Power for eufy Cameras",
    href: "https://service.eufy.com/article-description/Too-Many-False-Alerts-and-Overconsumption-of-Power-for-eufy-Cameras",
  },
  {
    label: "eufy, How to Avoid False Triggers on eufy Outdoor Cam",
    href: "https://service.eufy.com/article-description/How-to-Avoid-False-Triggers-on-eufy-Outdoor-Cam",
  },
  {
    label: "eufy, IP Rating Explained: IPX3, IP65 and IP67",
    href: "https://service.eufy.com/article-description/IP-Rating-Explained-The-Mysteries-of-IPX3-IP65-and-IP67",
  },
  {
    label: "eufy, Understanding the Specifications of the Video Doorbell E340",
    href: "https://service.eufy.com/article-description/Understanding-the-Specifications-of-the-Video-Doorbell-E340",
  },
  {
    label: "eufy, eufy Camera Signal Issues FAQ",
    href: "https://service.eufy.com/article-description/eufy-Camera-Signal-Issues-FAQ-User-Guide",
  },
];

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc}>
        <h2 id="short-answer">Where should I mount a video doorbell and security cameras?</h2>
        <p>
          <strong>The short answer:</strong> mount a video doorbell about 1.2 metres (48 inches) off the ground, as both
          Ring and eufy advise. Mount outdoor cameras higher: 2.5 to 3 metres, tilted down 20 degrees, says Ring, or 2 to
          3 metres, angled down no more than 30 degrees, says eufy. Before drilling, hold the device in place with the
          app&apos;s live view open and check what it sees beyond your boundary, the sun, any wall close to the lens, and
          the Wi-Fi.
        </p>

        <h2 id="at-a-glance">What height and angle suits each spot?</h2>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Suggested height or angle</th>
              <th>What to watch for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Front door</td>
              <td>1.2 m (48 in) (Ring, eufy)</td>
              <td>The footpath and road in the motion zone</td>
            </tr>
            <tr>
              <td>Steps, a slope or a long path</td>
              <td>1.2 m, with a wedge: up to 15° up or down (Ring)</td>
              <td>Faces cut off at the top or bottom</td>
            </tr>
            <tr>
              <td>Beside a wall or on a corner</td>
              <td>1.2 m, with a corner kit: up to 45° sideways (Ring)</td>
              <td>Night vision reflecting off the wall</td>
            </tr>
            <tr>
              <td>Driveway</td>
              <td>2.5 to 3 m, tilted down 20° (Ring); 2 to 3 m, no more than 30° down (eufy)</td>
              <td>Passing cars and the next-door drive</td>
            </tr>
            <tr>
              <td>Back garden</td>
              <td>As for the driveway</td>
              <td>Trees moving in the wind; a solar panel in shade</td>
            </tr>
            <tr>
              <td>Side passage</td>
              <td>As for the driveway, looking along the passage</td>
              <td>Walls close to the lens at night</td>
            </tr>
          </tbody>
        </table>

        <h2 id="doorbell-height">How high should a video doorbell be?</h2>
        <p>
          <a href="https://ring.com/support/articles/88ix9/Positioning-doorbells-and-security-cameras" rel="noopener">
            Ring says
          </a>{" "}
          its doorbells should be mounted 48 inches (1.22 metres) from the ground for the best motion detection. Their
          wide field of view means they need not go higher or lower to see visitors, and too high or too low can give
          inconsistent detection.{" "}
          <a href="https://service.eufy.com/article-description/Position-Your-Doorbell-Properly-1617357859027" rel="noopener">
            eufy says
          </a>{" "}
          at least 1.2 metres (48 inches), and notes that video doorbells usually sit higher than old bell pushes.
        </p>
        <p>
          A wired doorbell is tied to where the bell wire comes out. If the view there is poor, a wedge or corner kit
          fixes it without moving the wires.
        </p>

        <h2 id="wedge-corner">When do I need a wedge or corner kit?</h2>
        <ul>
          <li>
            <strong>A wedge kit</strong> tilts the view up or down, for steps, a slope or a path to the door. Most{" "}
            <a href="https://ring.com/support/articles/uqi64/Installing-Wedge-Kit-Corner-Mount-Video-Doorbells" rel="noopener">
              Ring wedge kits
            </a>{" "}
            have three 5 degree mounts that stack to 15 degrees; those for the Wired Doorbell Pro and Doorbell Wired have
            two 10 degree mounts.
          </li>
          <li>
            <strong>A corner kit</strong> turns it left or right, for a corner or beside a wall. Most Ring
            corner kits stack three 15 degree mounts to 45 degrees; the Wired Doorbell Pro and Video Doorbell Wired get
            one 25 degree mount. Angling away from the wall also keeps night-vision infrared from reflecting off it.
          </li>
          <li>
            <strong>Both:</strong> Ring recommends one of each, wedge on top; with a solar charger, only one.
          </li>
          <li>
            <strong>eufy</strong> uses a 15 degree wedge. For its Video Doorbell Dual, a second one stacks to 30 degrees.
          </li>
        </ul>

        <h2 id="camera-height">How high should driveway, garden and side passage cameras be?</h2>
        <p>
          Ring says outdoor cameras are designed for 2.5 to 3 metres (8 to 10 feet) with a 20 degree tilt.{" "}
          <a href="https://service.eufy.com/article-description/How-to-Find-a-Proper-Position-For-Your-eufy-SoloCams" rel="noopener">
            eufy says
          </a>{" "}
          2 to 3 metres (7 to 10 feet), angled down no more than 30 degrees, and warns that a badly mounted camera may
          miss motion altogether. Neither gives a separate figure for driveways, gardens or side passages.
        </p>
        <ul>
          <li>
            <strong>Driveway.</strong> Look down the drive, not out at the road. Ring&apos;s Floodlight Cam Wired Plus
            goes on a wall or eave, but keep the eave out of the picture: eufy says eaves reflect infrared at night.
          </li>
          <li>
            <strong>Back garden.</strong> Moving tree shadows can trigger cameras, eufy says, so avoid facing dense trees
            and trim branches near the lens. Its solar SoloCam S40 and S340 need 2 to 3 hours of sun a day.
          </li>
          <li>
            <strong>Side passage.</strong> Point it along the passage, not across. Walls close to the lens spoil night
            vision, eufy says.
          </li>
        </ul>

        <h2 id="false-alerts">How do I stop false alerts from the road?</h2>
        <p>Tilt the camera down at your own ground first, then use the app:</p>
        <ul>
          <li>
            <strong>Ring motion zones</strong>, up to three per device. Ring suggests leaving out busy streets and
            footpaths. Its standard detection range is 30 feet (about 9 metres), but vehicles further off can still
            trigger it. Battery models may need Advanced Motion Detection turned on.
          </li>
          <li>
            <strong>eufy activity zones</strong> that leave out footpaths and roads, eufy says, then lower sensitivity
            or set detection to Human Only.
          </li>
          <li>
            <strong>Reflections.</strong> A window or mirror in view can affect motion detection, Ring warns.
          </li>
        </ul>

        <h2 id="sun-glare">Will sunlight or glare spoil the picture?</h2>
        <p>
          It can. For daytime glare,{" "}
          <a href="https://ring.com/support/articles/qmv6i/Troubleshooting-Poor-Video-Quality" rel="noopener">
            Ring suggests
          </a>{" "}
          changing the angle, adding a wedge or corner kit, or moving the device, and turning on HDR. eufy advises
          against direct sunlight on its non-solar cameras, and Ring says sunlight, reflections and shadows can cause
          unwanted alerts. At night, Ring says, do not point a camera at windows, and face it away from nearby
          walls.
        </p>

        <h2 id="weather">Does it need shelter from the rain?</h2>
        <p>
          <a href="https://ring.com/support/articles/763nr/Are-Ring-Video-Doorbells-and-Security-Cameras-Waterproof" rel="noopener">
            Ring says
          </a>{" "}
          its doorbells and outdoor cameras are water-resistant for normal rain and snow but not waterproof: no
          submerging and no high-pressure water, so keep the power washer away. It suggests a protective overhang. eufy
          rates its video doorbells and floodlight cameras IP65, which it says handles rain, snow and condensation but
          not submersion, and several eufyCams IP67. It still recommends fitting its Video Doorbell Dual under a roof.
          Ring rates its Floodlight Cam Plus for -20.5°C to 48°C, and eufy the E340 for -20°C to 50°C.
        </p>

        <h2 id="wifi">Is the Wi-Fi strong enough where you want to mount it?</h2>
        <p>
          Check before you drill. Ring&apos;s app shows the signal as RSSI under Device Health: 0 to -60 is great, -60
          to -70 could be improved, -70 to -80 brings interruptions, and -80 or worse drops offline.
          eufy&apos;s rule of thumb: within 5 metres of the router or HomeBase works almost anywhere; at 5 to 15
          metres, no more than two walls between; beyond 15 metres, likely too weak. Thick concrete walls and metal doors
          are the worst blockers. The fixes are in{" "}
          <Link href="/blog/smart-camera-wifi-drops-irish-homes">Why Your Smart Camera Keeps Dropping the Signal</Link>.
        </p>

        <h2 id="privacy">What about the footpath, the road and next door?</h2>
        <p>
          In Ireland, a camera that sees only your own property is generally outside GDPR; take in the footpath, the
          road or next door and that changes, as{" "}
          <Link href="/blog/doorbell-camera-rules-ireland-gdpr">Is My Doorbell Camera Legal in Ireland?</Link> explains.
          Higher and tilted down sees more of your ground and less of the street, and Ring&apos;s privacy zones can
          mask the rest.
        </p>

        <h2 id="checklist">Quick placement checklist</h2>
        <ol>
          <li>Live view open before drilling.</li>
          <li>Doorbell at 1.2 metres; cameras at 2 to 3 metres, tilted down.</li>
          <li>A wedge for steps; a corner kit beside a wall.</li>
          <li>No wall, eave or window close to the lens.</li>
          <li>Checked against the morning and evening sun.</li>
          <li>Footpath, road and next door out of view or masked.</li>
          <li>Wi-Fi checked at the spot (on Ring, 0 to -60).</li>
          <li>Under an overhang where possible; solar panels in sun.</li>
          <li>Motion zones drawn, then tested by walking up the path.</li>
        </ol>
        <p>
          If Smart Space fits it, this is part of the job: every <Link href="/services/doorbell">doorbell installation</Link>{" "}
          includes motion zone tuning, and for a <Link href="/services/camera">floodlight camera</Link> we set the height
          and angle for usable footage in low light and the motion zones to ignore the road and the next-door driveway.
          See also our <Link href="/blog/home-security-cameras-ireland-buyers-guide">camera buyer&apos;s guide</Link>{" "}
          and, for side gates and garden offices,{" "}
          <Link href="/blog/whole-home-security-beyond-front-door-ireland">The Front Door Is the Easy Bit</Link>.
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

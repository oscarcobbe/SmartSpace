import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("wifi-calling-ireland")!;

/*
 * Written for "my mobile signal is bad at home": what Wi-Fi Calling is, which
 * Irish networks offer it, how to switch it on, and what else ComReg says to
 * try. Every claim about a network, a phone or a ComReg rule comes from the
 * pages below, all read 30 September 2026.
 *
 *   - Three: "4G and WiFi Calling" support page (Republic of Ireland only;
 *     iPhone steps; emergency services may need to verify your address) and
 *     its WiFi Calling Terms (phone list, which ends at the iPhone 14 and the
 *     Galaxy S23; emergency calls try the mobile network first; not supported
 *     while roaming; quality depends on the other devices on the Wi-Fi; calls
 *     drop if the Wi-Fi goes).
 *   - Vodafone: "4G & Wi-Fi Calling" network page (phone list, from the
 *     iPhone 6 and all models launched since July 2022, when bought from
 *     Vodafone; iPhone and Android steps; charged as normal calls; Super Wi-Fi
 *     for Wi-Fi Calling in every corner of the home) and the Next Generation
 *     Voice support page (texts are not sent over Wi-Fi Calling; not available
 *     when roaming).
 *   - eir: WiFi Calling support page, its supported phones page (bill pay
 *     plans; iPhone SE 2020 and XR to iPhone 16, Galaxy S21 to S25) and the
 *     eir WiFi Call terms PDF (emergency calls try the mobile network first,
 *     and over WiFi Call the emergency services cannot identify your location;
 *     quality depends on Wi-Fi speed and other devices; roaming charges).
 *   - GoMo: Network & Coverage help (turn it on in phone settings; support
 *     varies by phone). Clear Mobile: Network help (included at no extra cost).
 *   - 48 and Tesco Mobile Ireland: neither network's own pages, as read, say
 *     whether they offer it (48.ie renders nothing without JavaScript; Tesco
 *     Mobile's service information and 2G/3G closure pages do not mention
 *     it). Forum posts say 48 does not, but 48's community pages refused the
 *     request, so the table says to check with them.
 *   - Apple (support.apple.com/en-ie/108066): steps, the address prompt,
 *     emergency calls, and that not every Wi-Fi network works with it.
 *     Google Phone app help: Android steps. Samsung Ireland: Galaxy steps.
 *   - ComReg: "Get the most out of your mobile service" (what weakens indoor
 *     signal; check coverage, then Wi-Fi Calling, then a compliant repeater),
 *     "Mobile Phone Repeaters" (licence exempt; no licence or registration;
 *     non-compliant boosters illegal, with the fines; a professional install
 *     advised) and "Switch Mobile Provider" (keeping your number is free; the
 *     coverage map shows predicted outdoor coverage). The exemption itself is
 *     S.I. No. 86 of 2026, read on irishstatutebook.ie.
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
  { id: "what-it-is", label: "What is Wi-Fi Calling?" },
  { id: "which-networks", label: "Which Irish networks support it?" },
  { id: "turn-it-on", label: "How do I turn it on?" },
  { id: "wifi-needed", label: "What does it need from my Wi-Fi?" },
  { id: "emergency-calls", label: "Can I call 112 or 999 over Wi-Fi?" },
  { id: "other-options", label: "What else can fix poor indoor signal?" },
  { id: "real-fix", label: "When is the real fix the Wi-Fi?" },
  { id: "faq", label: "Questions" },
];

const FAQ = [
  {
    q: "Does Wi-Fi Calling cost extra in Ireland?",
    a: "Not from Three, Vodafone or eir: Wi-Fi calls come out of your normal allowance, charged like any mobile call. Three and eir note that your Wi-Fi provider's own data charges still apply.",
  },
  {
    q: "Does Wi-Fi Calling work on 48 or Tesco Mobile?",
    a: "We could not confirm it on either network's own website. Ask them before you rely on it, or before you switch to them for it.",
  },
  {
    q: "Can I use Wi-Fi Calling abroad?",
    a: "It depends on the network. Three offers it in the Republic of Ireland only, and Vodafone not while roaming. eir's terms allow it abroad, with calls to Irish numbers taken from your home allowance.",
  },
  {
    q: "Why can't I find the Wi-Fi Calling setting on my phone?",
    a: "Usually your network has not enabled it for that phone. Vodafone warns that phones bought elsewhere might not support it, and Three and eir say you may need a software update. If it still does not appear, ask your network.",
  },
  {
    q: "Are mobile signal boosters legal in Ireland?",
    a: "Only repeaters that meet ComReg's technical conditions and carry the CE mark, and those need no licence or registration. Non-compliant boosters are illegal to sell or use and can be seized, with fines of up to €5,000 on summary conviction.",
  },
  {
    q: "Will better Wi-Fi help if Wi-Fi Calling keeps dropping?",
    a: "If the call drops because the Wi-Fi is weak in that room, yes. Three and eir both say a Wi-Fi call ends when the phone loses the Wi-Fi, so the fix is a stronger signal where you make the call.",
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

export default function Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogLayout post={post} toc={toc} cta={NETWORK_GUIDE_CTA}>
        <p>
          <strong>The short answer:</strong> Wi-Fi Calling sends your ordinary phone calls over your home broadband when
          the mobile signal indoors is weak. It uses your normal mobile number and the phone&apos;s own dialler, with no
          app to install. In Ireland, Three, Vodafone and eir offer it, and so do GoMo and Clear Mobile. You switch it on
          in your phone&apos;s settings, on a phone your network supports. It is only as good as the Wi-Fi in the room you
          are standing in.
        </p>

        <h2 id="what-it-is">What is Wi-Fi Calling?</h2>
        <p>
          It is a feature of your phone and your mobile network. When the mobile signal is weak and the phone is on
          Wi-Fi, it makes and receives calls over the Wi-Fi instead. Three, Vodafone and eir charge these calls the same
          as normal calls, out of your usual allowance.
        </p>
        <p>
          ComReg, the communications regulator, lists insulation, double and triple glazing, metal-framed windows and
          thick walls as reasons for poor coverage indoors. Its research found that building materials used to improve
          insulation will often limit mobile coverage.
        </p>

        <h2 id="which-networks">Which Irish networks support Wi-Fi Calling?</h2>
        <p>Each line below comes from the network&apos;s own website, read on 30 September 2026.</p>
        <table>
          <thead>
            <tr>
              <th>Network</th>
              <th>Wi-Fi Calling</th>
              <th>Phones and notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Three</td>
              <td>Yes</td>
              <td>
                Listed phones from the iPhone 8 and Galaxy S10 up to the iPhone 14 and Galaxy S23; for newer phones, Three
                points to the maker&apos;s website. Republic of Ireland only.
              </td>
            </tr>
            <tr>
              <td>Vodafone</td>
              <td>Yes</td>
              <td>
                Listed phones from the iPhone 6, plus all models launched since July 2022, if bought from Vodafone. Not
                while roaming, and texts do not go over Wi-Fi.
              </td>
            </tr>
            <tr>
              <td>eir</td>
              <td>Yes (eir WiFi Call)</td>
              <td>
                Bill pay plans, on listed phones such as the iPhone SE (2020) and XR to the iPhone 16, and the Galaxy S21
                to S25. Calls and texts, and it works abroad.
              </td>
            </tr>
            <tr>
              <td>GoMo</td>
              <td>Yes</td>
              <td>Turn it on in your phone settings. GoMo says support varies by phone.</td>
            </tr>
            <tr>
              <td>Clear Mobile</td>
              <td>Yes</td>
              <td>Included at no extra cost.</td>
            </tr>
            <tr>
              <td>48</td>
              <td>Not confirmed</td>
              <td>Not confirmed on 48&apos;s own website. Check with 48.</td>
            </tr>
            <tr>
              <td>Tesco Mobile</td>
              <td>Not confirmed</td>
              <td>Not mentioned on the Tesco Mobile help pages we read. Check with Tesco Mobile.</td>
            </tr>
          </tbody>
        </table>
        <p>On any other network, or with a phone that is not on the list, check with your network.</p>

        <h2 id="turn-it-on">How do I turn on Wi-Fi Calling?</h2>
        <p>
          Update the phone&apos;s software first: Three and eir both say you may need the latest version. Then connect to
          your Wi-Fi.
        </p>
        <h3>On an iPhone</h3>
        <ol>
          <li>Open Settings and tap Mobile Service. Depending on the software, it may be Mobile Data, or Phone.</li>
          <li>Tap Wi-Fi Calling and turn on Wi-Fi Calling on This iPhone.</li>
          <li>Tap Enable. Apple says you may be asked to confirm your address for the emergency services.</li>
        </ol>
        <p>Once it works, Apple says &quot;Wi-Fi&quot; shows in the status bar when you open Control Centre.</p>
        <h3>On an Android phone</h3>
        <p>The menu differs by maker.</p>
        <ul>
          <li>
            <strong>Samsung Galaxy:</strong> open the Phone app, tap the three dots, then Settings, and switch on Wi-Fi
            Calling.
          </li>
          <li>
            <strong>Google Pixel and other phones using Google&apos;s Phone app:</strong> Settings, then Network and
            internet, then SIMs, then your SIM, then Wi-Fi calling.
          </li>
        </ul>
        <p>
          If the option is missing, Google says your network does not support it. Samsung says to ask your network to
          check that it is switched on for your phone.
        </p>

        <h2 id="wifi-needed">What does Wi-Fi Calling need from my Wi-Fi?</h2>
        <p>
          A good signal where you make the call. Vodafone calls Wi-Fi Calling ideal when the mobile signal is low, as long
          as the Wi-Fi is strong. Three&apos;s and eir&apos;s terms say call quality depends on the Wi-Fi, its speed and how
          many other devices share it, and that the call ends if the phone loses the Wi-Fi.
        </p>
        <p>
          That catches people out. The rooms with no mobile signal are often the rooms the Wi-Fi struggles to reach too:
          upstairs, the back bedroom, the extension. Walk out of Wi-Fi range mid-call, with no mobile signal to fall back
          on, and the call drops. Our guide to{" "}<Link href="/blog/why-does-my-wifi-keep-dropping-ireland">why Wi-Fi keeps dropping</Link> covers the other reasons a connection cuts out. Apple adds that not every Wi-Fi network works with Wi-Fi Calling.
        </p>
        <p>
          Vodafone makes the same link when it sells whole-home Wi-Fi: Wi-Fi in every corner of the home means Wi-Fi
          calls in every corner. To find your weak rooms, see our{" "}
          <Link href="/blog/how-to-test-wifi-speed-room-by-room">guide to testing Wi-Fi room by room</Link>, and if the
          trouble is upstairs,{" "}
          <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why Wi-Fi is slow upstairs in Irish homes</Link>.
        </p>

        <h2 id="emergency-calls">Can I call 112 or 999 over Wi-Fi Calling?</h2>
        <p>
          Yes, but your phone tries the mobile network first. Three&apos;s and eir&apos;s terms say an emergency call goes
          over Wi-Fi only when no mobile network is available, and Apple says the same of the iPhone.
        </p>
        <p>
          What changes is what the emergency services know about where you are. eir&apos;s terms say that over its WiFi
          Call service, the emergency services will not be able to identify your location. Three warns they may need to
          verify your address, and Apple says an iPhone&apos;s location may be used to help. If your house has no mobile
          signal at all, be ready to give your full address. And because Wi-Fi Calling runs on your broadband and router,
          a power cut or a broadband fault takes it with them.
        </p>

        <h2 id="other-options">What else can fix poor mobile signal indoors?</h2>
        <p>ComReg&apos;s advice for better coverage at home is three steps, in this order.</p>
        <ol>
          <li>
            <strong>Check which network covers your area best.</strong> ComReg&apos;s{" "}
            <a href="https://coveragemap.comreg.ie/map" rel="noopener">coverage map</a> shows predicted outdoor coverage
            for every network. Its testing also found that some phones have better antennas, so one handset can get
            signal indoors where another gets none. Keeping your number when you switch is free; tell the new network you
            want it.
          </li>
          <li>
            <strong>Turn on Wi-Fi Calling,</strong> if your network and phone support it.
          </li>
          <li>
            <strong>Fit a legally compliant mobile repeater,</strong> which uses an outside aerial to pick up the signal
            and amplify it indoors.
          </li>
        </ol>
        <h3>Which repeaters are legal?</h3>
        <p>
          Under S.I. No. 86 of 2026, repeaters that conform to the Radio Equipment Directive and meet ComReg&apos;s
          technical conditions are licence exempt, and ComReg says no licence or registration is needed. They carry the
          CE mark, come with a Declaration of Conformity, and may cover more than one network.
        </p>
        <p>
          Cheap &quot;boosters&quot; usually do not. ComReg calls them amplifiers with no built-in protection against
          interfering with the network, and says non-compliant devices are illegal to sell or use under the Wireless
          Telegraphy Acts. They can be seized, with fines of up to €5,000 on summary conviction or €250,000 on
          indictment. ComReg publishes{" "}
          <a
            href="https://www.comreg.ie/advice-information/mobile/get-the-most-out-of-your-mobile-service/mobile-phone-repeaters/"
            rel="noopener"
          >
            lists of compliant manufacturers and installers
          </a>
          , tells buyers to be wary of online marketplaces, and strongly recommends a professional installer, above all
          if there is no reception outside either.
        </p>

        <h2 id="real-fix">When is the real fix your home Wi-Fi?</h2>
        <p>
          When Wi-Fi Calling works beside the router and fails in the rooms where you need it. Then the phone and the
          network are fine, and the problem is Wi-Fi coverage. A{" "}
          <Link href="/blog/mesh-wifi-explained">mesh system</Link> can carry the signal to those rooms, if its units can
          talk to each other.
        </p>
        <p>
          If you would rather know what your house needs before buying anything, our{" "}
          <Link href="/services/wifi">€395 home network assessment</Link>, in Dublin and Leinster, tests your broadband at
          the router by cable, measures every floor, and leaves a working trial system on the floor that struggles for
          three days, with the figures in a written report. It is credited in full against any work you go ahead with.
        </p>

        <h2 id="faq">Questions about Wi-Fi Calling in Ireland</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </BlogLayout>
    </>
  );
}

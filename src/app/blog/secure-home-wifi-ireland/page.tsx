import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("secure-home-wifi-ireland")!;

/*
 * Written for the question people put to ChatGPT and the other assistants:
 * how do I secure my home Wi-Fi and smart devices in Ireland. The short
 * answer comes first, the headings are questions, one table is the ten-step
 * checklist, and the questions at the end are also FAQPage data.
 *
 * Every recommendation is from a page read on 30 September 2026:
 *   - NCSC, Working From Home Security Advice (advisory 2004011554, 8 April
 *     2020): many home routers use a default password; rename the SSID, as a
 *     default name reveals make and model, and never one that identifies the
 *     family; disable WPS (on by default on many routers, PIN easily
 *     brute-forced); turn off guest access that is on by default with no
 *     security key; WPA2 or the newer WPA3; hiding the SSID; the password
 *     advice (12 characters, passphrases of random unrelated words, no family
 *     names, pets or local football club, no reuse, password managers, MFA).
 *   - NCSC, Secure your home office (ECSM page): the password supplied with a
 *     router is generally shorter than the recommended 12 characters.
 *   - NCSC, Seasonal Cyber Awareness (PDF): MFA fatigue, scammers bombarding
 *     people with push prompts; calls claiming to be from internet providers.
 *   - An Garda Síochána, Broadband phone scams (February 2019): callers posing
 *     as phone or broadband providers, card details and card reader codes,
 *     remote control, hang up and ring a number you looked up after hearing a
 *     dial tone, tell your bank and the Gardaí.
 *   - ComReg, Scam Calls & Texts: STOP, CHECK, AVOID, MARK IT; CLI spoofing;
 *     hang up if pressured; never share bank details, PPS number or passwords;
 *     contact the organisation through its official website or app.
 *   - Citizens Information, How to avoid scams (edited 26 June 2025): never
 *     allow remote access to your computer; if scammed, tell your bank and
 *     report it to your local Garda station.
 *   - eir, Online safety: eir will never need access to your computer or your
 *     card details for a fault or repair. Virgin Media Ireland, Prevent home
 *     and mobile scams: hang up and ring Virgin Media directly.
 *   - Ring: two-step verification (code required at sign-in, Account
 *     Verification in Control Center, text or authenticator app); Resetting
 *     your password and signing in (never share your password, staff never
 *     ask for it, Shared Users keep you in control); Managing permissions for
 *     users (the permission table, User Permissions, Invite User, Delete User,
 *     14-day invitations, own Ring account); Manage access (Authorized Client
 *     Devices, Remove All Devices); Firmware updates (automatic after setup);
 *     Fixing offline devices (Device Health, Reconnect or Change Network).
 *   - eufy: Ensuring Account Security (Control Center, Two-Factor
 *     Authentication; never give out your password, code or recovery PIN;
 *     keep the app and firmware updated; update the router's admin password,
 *     as the default can be easy to guess); Keep Your eufy Account Safe (code
 *     to a trusted email or phone, shared users, email on each new login);
 *     How do I update devices' software? (HomeBase updates when idle).
 *   - TP-Link: WPA2 vs. WPA3 (8 July 2026: WPA3 stronger, WPA3-only rejects
 *     WPA2-only devices, mixed mode, firmware patches, a guest network for
 *     older devices, WPA2 still workable); FAQ 73, the admin password is
 *     separate from the Wi-Fi password (updated 10 September 2026); How to
 *     check who's connected (1 June 2026: Clients, note the MAC address,
 *     changing the Wi-Fi password disconnects everything); FAQ 4420, Deco IoT
 *     network (2 July 2026); FAQ 4940, some ISP-customised models lack the
 *     IoT Network (18 March 2026); service-provider FAQ 900, older IoT devices
 *     and mixed encryption, WPA2 (AES) only for now (16 April 2026).
 *   - NETGEAR (all updated 7 July 2025): guest WiFi and network separation;
 *     WPA3's handshake; automatic firmware updates, 1am to 4am; Attached
 *     Devices.
 *
 * The times in the checklist are our own rough guide, and the page says so.
 * The one mention of our work says only what /services/doorbell says: app
 * setup and configuration are part of the install, and we walk you through
 * the Ring app before we leave.
 *
 * Left out as unverified: who updates the firmware on a router supplied by
 * an Irish provider (NETGEAR's article on ISP routers would not load as text,
 * and no provider page was found), any provider's own router security steps
 * (Virgin Media's broadband security page and eir's online safety page give
 * none), whether Ring or Eufy devices work fully on a guest or IoT network,
 * and whether Ring's two-step verification can be switched off.
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
  { id: "checklist", label: "What are the ten steps?" },
  { id: "default-passwords", label: "Why change the router's default passwords?" },
  { id: "strong-password", label: "What makes a strong Wi-Fi password?" },
  { id: "wpa3-or-wpa2", label: "Should I pick WPA3 or WPA2?" },
  { id: "wps", label: "Why turn off WPS?" },
  { id: "updates", label: "Do routers, cameras and doorbells need updates?" },
  { id: "guest-network", label: "Should visitors and smart devices use a guest network?" },
  { id: "two-step", label: "How do I turn on two-step login for Ring and Eufy?" },
  { id: "family-access", label: "Should the family share one Ring login?" },
  { id: "someone-on-network", label: "What if I think someone is on my network?" },
  { id: "scam-calls", label: "How do I spot a call pretending to be my broadband provider?" },
  { id: "questions", label: "What else do people ask?" },
  { id: "sources", label: "Where does this advice come from?" },
];

/* The checklist. Each reason is from the source named beside it; the times
   are our own rough guide, as the note under the table says. */
const STEPS = [
  { step: "Change the router's admin password", why: "Default logins can be easy to guess (Eufy).", time: "5 minutes" },
  { step: "Rename the Wi-Fi network", why: "A default name can reveal the router's model (NCSC).", time: "2 minutes" },
  {
    step: "Set a long Wi-Fi passphrase",
    why: "Supplied ones are usually under 12 characters (NCSC).",
    time: "10 minutes, then reconnect devices",
  },
  { step: "Choose WPA3, or WPA2/WPA3 mixed", why: "WPA3 is the stronger standard (TP-Link).", time: "2 minutes" },
  { step: "Turn off WPS", why: "Its PIN is easily brute-forced (NCSC).", time: "2 minutes" },
  { step: "Update the router", why: "Makers regularly patch security flaws (TP-Link).", time: "10 minutes" },
  { step: "Check cameras and doorbells are updated", why: "Releases include security fixes (Eufy).", time: "5 minutes" },
  { step: "Set up a guest network", why: "Guests cannot reach your main network (NETGEAR).", time: "10 minutes" },
  { step: "Use two-step login on Ring or Eufy", why: "A password alone will not open the account (Eufy).", time: "5 minutes" },
  { step: "Give family their own Ring access", why: "You keep control of the account (Ring).", time: "5 minutes a person" },
];

/* Narrower side padding, so three columns fit a phone without the page
   scrolling sideways. */
const CELL = { paddingLeft: "0.5rem", paddingRight: "0.5rem" };

/* Shown at the end of the guide and sent as FAQPage data, so the two match. */
const FAQ = [
  {
    q: "Should I hide my Wi-Fi network name?",
    a: "It helps a little. The NCSC says a hidden network stays off the list nearby devices see, though scanning tools still find it, and an opportunist is more likely to pick a visible one.",
  },
  {
    q: "Is WPA2 still safe for a home network?",
    a: "The NCSC recommends WPA2 or the newer WPA3. TP-Link calls WPA2 still workable if you keep the firmware updated and use a strong password you have not used elsewhere.",
  },
  {
    q: "Will changing my Wi-Fi password knock my cameras offline?",
    a: "Yes, until each has the new password, as TP-Link notes. In the Ring app, open the device's Device Health tile, then Reconnect or Change Network.",
  },
  {
    q: "Does each family member need their own Ring account?",
    a: "To be a Shared User, yes. Ring emails an invitation, valid for 14 days, which they accept by signing in to their own Ring account or creating one.",
  },
  {
    q: "Would eir or Virgin Media ring me to fix my broadband?",
    a: "Be wary of any call offering to. eir says it will never need access to your computer or your card details for a fault or repair, and Virgin Media advises hanging up and ringing it directly.",
  },
];

/* Every page the guide draws on, shown at the end so a reader, or an
   assistant quoting the guide, can check it. */
const SOURCES = [
  {
    label: "National Cyber Security Centre, Working From Home Security Advice (April 2020)",
    href: "https://www.ncsc.gov.ie/pdfs/WFH-Advisory.pdf",
  },
  { label: "National Cyber Security Centre, Secure your home office", href: "https://www.ncsc.gov.ie/ecsm20/wfh/" },
  {
    label: "National Cyber Security Centre, Seasonal Cyber Awareness",
    href: "https://ncsc.gov.ie/pdfs/Seasonal_Advisory.pdf",
  },
  {
    label: "An Garda Síochána, Broadband phone scams (February 2019)",
    href: "https://www.garda.ie/en/about-us/our-departments/office-of-corporate-communications/press-releases/2019/february/broadband-phone-scams.html",
  },
  { label: "ComReg, Scam Calls & Texts", href: "https://www.comreg.ie/advice-information/scam-calls/" },
  {
    label: "Citizens Information, How to avoid scams (edited June 2025)",
    href: "https://www.citizensinformation.ie/en/consumer/buying-digital-content-and-services/scams-and-fraud/",
  },
  { label: "eir, Online safety", href: "https://www.eir.ie/online-safety/" },
  {
    label: "Virgin Media Ireland, Prevent home and mobile scams",
    href: "https://www.virginmedia.ie/fraud-hub/mobile-home-phone-security/",
  },
  {
    label: "Ring, Setting up two-step verification for Ring",
    href: "https://ring.com/support/articles/2mmqs/setting-up-two-step-verification-for-Ring",
  },
  {
    label: "Ring, Resetting your password and signing in",
    href: "https://ring.com/gb/en/support/articles/byl0l/resetting-your-password-and-signing-in",
  },
  {
    label: "Ring, Managing permissions for users",
    href: "https://ring.com/support/articles/clv68/Managing-Shared-Users",
  },
  {
    label: "Ring, Manage access to your Ring account and devices",
    href: "https://ring.com/support/articles/hpw10/manage-access-ring-account-devices",
  },
  {
    label: "Ring, Firmware updates for Ring devices",
    href: "https://ring.com/support/articles/d89ce/Firmware-updates-for-Ring-devices",
  },
  { label: "Ring, Fixing offline devices", href: "https://ring.com/support/articles/uii72/fixing-offline-devices" },
  {
    label: "eufy, Ensuring Account Security",
    href: "https://service.eufy.com/article-description/Unlock-the-Power-of-eufy-Ensuring-Account-Security",
  },
  {
    label: "eufy, Keep Your eufy Account Safe",
    href: "https://service.eufy.com/article-description/Keep-Your-eufy-Account-Safe",
  },
  {
    label: "eufy, How do I update devices' software?",
    href: "https://service.eufy.com/article-description/How-do-I-update-devices-software",
  },
  {
    label: "TP-Link, WPA2 vs. WPA3: A Breakdown of Wi-Fi Security Protocols (July 2026)",
    href: "https://www.tp-link.com/us/blog/2556/wpa2-vs-wpa3-a-breakdown-of-wi-fi-security-protocols/",
  },
  {
    label: "TP-Link, How to Change Your TP-Link Device Admin Password",
    href: "https://www.tp-link.com/us/support/faq/73/",
  },
  {
    label: "TP-Link, How to Check Who's Connected to Your TP-Link Wi-Fi Router",
    href: "https://www.tp-link.com/ph/blog/2462/how-to-check-who-s-connected-to-your-tp-link-wi-fi-router/",
  },
  {
    label: "TP-Link, Deco Smart Home Setup: Settings to Prevent & Fix Connection Issues",
    href: "https://www.tp-link.com/us/support/faq/4420/",
  },
  {
    label: "TP-Link, How to create an IoT Network on TP-Link ISP-customized Router",
    href: "https://www.tp-link.com/us/support/faq/4940/",
  },
  {
    label: "TP-Link, How to choose the encryption method for my IoT devices",
    href: "https://service-provider.tp-link.com/faq/900/",
  },
  {
    label: "NETGEAR, How do I set up guest WiFi on my NETGEAR Nighthawk router?",
    href: "https://kb.netgear.com/24097/How-do-I-set-up-guest-WiFi-on-my-NETGEAR-Nighthawk-router-from-the-router-web-interface",
  },
  {
    label: "NETGEAR, What is WPA3 security?",
    href: "https://kb.netgear.com/000060424/What-is-WPA3-security-and-how-does-it-work-with-my-NETGEAR-router-or-Orbi-mesh-system",
  },
  {
    label: "NETGEAR, Automatic firmware updates for my NETGEAR router",
    href: "https://kb.netgear.com/000058854/How-do-I-make-sure-that-automatic-firmware-updates-happen-in-the-middle-of-the-night-for-my-NETGEAR-router",
  },
  {
    label: "NETGEAR, How do I view the devices on my network?",
    href: "https://kb.netgear.com/24230/How-do-I-view-the-devices-on-my-network-from-my-Nighthawk-router",
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
  citation: SOURCES.map((s) => s.href),
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
          <strong>The short answer:</strong> change the router&apos;s admin password and the Wi-Fi name and password it
          came with, choose WPA3 (or WPA2 where a device needs it), turn off WPS, and keep the router, cameras and doorbell
          updated. Put visitors on a guest network, use two-step login on Ring or Eufy, and give family members their own
          access, not your password. The advice comes from Ireland&apos;s National Cyber Security Centre (NCSC), and from
          Ring, Eufy, TP-Link and NETGEAR.
        </p>

        <h2 id="checklist">What are the ten steps?</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {["Step", "Why it matters", "Rough time"].map((h) => (
                  <th key={h} style={CELL}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STEPS.map((r, i) => (
                <tr key={r.step}>
                  <td style={CELL}>
                    {i + 1}. {r.step}
                  </td>
                  <td style={CELL}>{r.why}</td>
                  <td style={CELL}>{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Reasons from the sources below; times are our own rough guide.</p>

        <h2 id="default-passwords">Why change the router&apos;s default passwords?</h2>
        <p>
          A router has two passwords: the Wi-Fi password, and an admin password that opens its settings. TP-Link notes
          they are separate. Eufy advises changing the admin password, as the default can be easy to guess and anyone on
          your Wi-Fi could then get in.
        </p>
        <p>
          The NCSC also advises renaming the network. A default name can tell an attacker the router&apos;s make and
          model, and so whether it has a known weakness. Pick a name that does not identify your family.
        </p>

        <h2 id="strong-password">What makes a strong Wi-Fi password?</h2>
        <p>
          The NCSC says the password supplied with a router is generally shorter than the 12 characters it recommends.
          Its advice: a passphrase of random, unrelated words, with numbers and symbols mixed through it; nothing
          personal, such as family names, pets or your local football club; and no reusing passwords. A password manager
          helps.
        </p>
        <p>
          Changing the Wi-Fi password disconnects every device, TP-Link notes. Reconnect a Ring camera or doorbell from
          its Device Health tile in the Ring app.
        </p>

        <h2 id="wpa3-or-wpa2">Should I pick WPA3 or WPA2?</h2>
        <p>
          WPA3, if your router and devices support it. The NCSC recommends WPA2 or the newer WPA3; TP-Link calls WPA3 the
          stronger standard, and NETGEAR says its handshake adds protection even if the password is weak.
        </p>
        <p>
          A router set to WPA3 only rejects devices that only speak WPA2, TP-Link says, so use WPA2/WPA3 mixed mode. If
          an older smart device still will not connect, TP-Link&apos;s advice on its own routers is to switch temporarily
          to WPA2 (AES) only.
        </p>

        <h2 id="wps">Why turn off WPS?</h2>
        <p>
          WPS (Wi-Fi Protected Setup) is a shortcut for joining devices. The NCSC says it has a known flaw, is still on by
          default on many routers, and its PIN can be easily brute-forced. Turn it off in the router&apos;s settings.
        </p>

        <h2 id="updates">Do routers, cameras and doorbells need updates?</h2>
        <p>
          Yes, though most update themselves. TP-Link advises keeping router firmware updated, as makers regularly patch
          security flaws, and some NETGEAR routers update automatically overnight. Turn on automatic updates if your
          router offers them.
        </p>
        <p>
          Ring devices keep updating automatically after setup, and Eufy&apos;s HomeBase updates when idle. Eufy asks you
          to keep its app and your devices&apos; firmware up to date, as releases include critical security updates.
        </p>

        <h2 id="guest-network">Should visitors and smart devices use a guest network?</h2>
        <p>
          A guest network gets visitors online without your main password, and NETGEAR says devices on it cannot reach
          your main network, or the other way round.
        </p>
        <p>
          It can suit smart devices too. TP-Link suggests a separate guest network for older WPA2-only devices, and some
          of its routers, including Deco <Link href="/blog/mesh-wifi-explained">mesh systems</Link>, offer an IoT
          network: a dedicated network, with its own name and password, for smart home devices. Not every router has
          one. Keeping a houseful of smart devices on their own network also keeps them from slowing the ones you use, as
          our guide to{" "}
          <Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices on the Wi-Fi</Link> explains.
        </p>
        <p>
          The NCSC&apos;s caution: some routers switch guest access on by default, with no password needed. If yours
          does, turn it off.
        </p>

        <h2 id="two-step">How do I turn on two-step login for Ring and Eufy?</h2>
        <p>Two-step login means a password alone will not open the account; a six-digit code is needed too.</p>
        <ul>
          <li>
            <strong>Ring</strong> requires it whenever you sign in. Choose text message or an authenticator app under
            Account Verification in the app&apos;s Control Center.
          </li>
          <li>
            <strong>Eufy:</strong> side menu, then Control Center, then Two-Factor Authentication. Codes go to your
            trusted email or phone, and Eufy emails you whenever a new device logs in.
          </li>
        </ul>
        <p>
          Never share a password or code; Ring says its staff will never ask for your password. Decline any sign-in
          approval you did not start: the NCSC warns that scammers bombard people with prompts until they give in.
        </p>

        <h2 id="family-access">Should the family share one Ring login?</h2>
        <p>
          No. Ring says not to share your password, and to add people as Shared Users so you keep control of the
          account. In the app: Settings or Control Center, User Permissions, Invite User. Each person needs their own Ring
          account, and you choose their level:
        </p>
        <ul>
          <li>
            <strong>Limited:</strong> Live View, Event History and device control.
          </li>
          <li>
            <strong>Standard:</strong> adds alerts, and downloading and sharing recordings.
          </li>
          <li>
            <strong>Advanced:</strong> adds device settings, and managing users and devices.
          </li>
        </ul>
        <p>
          Only the owner can manage the subscription or delete recordings. To remove someone, start from their name
          under User Permissions; the last step is Delete User. On Eufy, only the primary account owner can give others access, and can remove
          them at any time.
        </p>
        <p>
          When we fit a <Link href="/services/doorbell">Ring doorbell</Link>, app setup is part of the installation and we
          walk you through the app before we leave, a good moment to add the family. Where the camera should point is
          covered in our <Link href="/blog/doorbell-camera-rules-ireland-gdpr">doorbell camera rules guide</Link>.
        </p>

        <h2 id="someone-on-network">What if I think someone is on my network?</h2>
        <ol>
          <li>
            Check the list of connected devices: Clients in TP-Link&apos;s Tether app, or Attached Devices on a NETGEAR
            router.
          </li>
          <li>Block anything you do not recognise, noting its MAC address first, as TP-Link suggests.</li>
          <li>
            Change the Wi-Fi password, which TP-Link calls the fastest way to remove every unauthorised device at once.
          </li>
          <li>Change the router&apos;s admin password, and check WPS is off.</li>
          <li>
            In Ring&apos;s Control Center, Authorized Client Devices, Remove All Devices signs out every phone and
            tablet.
          </li>
          <li>
            If you gave bank or card details, tell your bank and your local Garda station, as Citizens Information
            advises.
          </li>
        </ol>
        <p>
          If a camera keeps dropping off afterwards, see{" "}
          <Link href="/blog/smart-camera-wifi-drops-irish-homes">why smart cameras lose the signal</Link>.
        </p>

        <h2 id="scam-calls">How do I spot a call pretending to be my broadband provider?</h2>
        <p>
          The Gardaí warn of callers posing as a phone or broadband provider, offering to fix your connection. They are
          after your card details and card reader codes, and may ask to control your computer remotely. eir says it will
          never need access to your computer or your card details for a fault or repair, and ComReg warns that caller ID
          can be faked.
        </p>
        <ul>
          <li>
            Hang up and ring the provider on a number you looked up yourself, after hearing a dial tone, as the Gardaí
            advise.
          </li>
          <li>Never give a caller remote access, or share bank details, passwords or your PPS number.</li>
          <li>
            Do not use links or numbers in a text you are unsure of; ComReg says to contact the company through its
            official website or app.
          </li>
          <li>If you have given details, contact your bank and your local Garda station.</li>
        </ul>

        <h2 id="questions">What else do people ask?</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <h2 id="sources">Where does this advice come from?</h2>
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

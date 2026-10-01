import type { Metadata } from "next";
import Link from "next/link";
import BlogLayout from "@/components/BlogLayout";
import { getPostBySlug } from "../blog-posts";
import { NETWORK_GUIDE_CTA } from "../network-guide-cta";

const SITE = "https://smart-space.ie";
const post = getPostBySlug("wifi-6-wifi-7-new-router-ireland")!;

/*
 * Written to answer one question the way an assistant would be asked it:
 * Wi-Fi 6, 6E and 7 explained, and do I need a new router in Ireland. A
 * direct answer first, question headings, one table, and the questions again
 * at the end with FAQPage schema built from the same text.
 *
 * Sources, read 30 September 2026:
 *   - Wi-Fi Alliance, "Wi-Fi (MAC/PHY)" (wi-fi.org/wi-fi-macphy): Wi-Fi 5
 *     mostly dual band, 2.4 and 5 GHz; Wi-Fi 6 higher data rates, greater
 *     capacity, stronger performance in dense environments, OFDMA, target wake
 *     time for battery life; Wi-Fi 7 across 2.4, 5 and 6 GHz, 320 MHz channels
 *     in 6 GHz with twice the throughput of Wi-Fi 6, multi-link operation.
 *     "Wi-Fi Alliance brings Wi-Fi 6 into 6 GHz": Wi-Fi 6E is Wi-Fi 6 extended
 *     into 6 GHz, wider channels, less interference from older Wi-Fi 4 and 5
 *     devices. Its 6 GHz regulations map lists Ireland at 5925/5945-6425 MHz.
 *   - ComReg 02/71 R17, "Permitted Short Range Devices in Ireland" (28
 *     November 2024), Table 3, row 7: WAS/RLANs in 5.945 to 6.425 GHz. Low
 *     power indoor devices 23 dBm e.i.r.p., restricted to indoor use, outdoor
 *     use including in road vehicles not permitted; very low power devices 14
 *     dBm, indoor and outdoor, portable use only. Under ECC/DEC/(20)01 and
 *     (EU) 2021/1067. No row for the band above 6.425 GHz. ComReg's list of
 *     licence exemptions counts radio LANs among the devices in 02/71.
 *   - NETGEAR KB 29396 (6 GHz the least coverage, higher frequencies get
 *     through walls and floors less well, 6 GHz only for Wi-Fi 6E and newer
 *     devices), KB 30187 and KB 000061927 (double NAT; bridge mode on the ISP
 *     gateway, or its Wi-Fi off and the router in AP mode, which loses
 *     features such as the guest network).
 *   - TP-Link FAQ 3305 (6 GHz runs 5.925 to 7.125 GHz, up to 1,200 MHz; older
 *     phones and laptops use 2.4 and 5 GHz) and FAQ 3594 (devices made before
 *     2020 unlikely to support 6 GHz, before 2022 unlikely to support Wi-Fi 7).
 *   - Apple, "Use Wi-Fi 6E or Wi-Fi 7 networks with Apple devices" and "Wi-Fi
 *     7 availability on Apple devices". Microsoft, "Faster and more secure
 *     Wi-Fi in Windows" (router, adapter and Windows; Wi-Fi 7 from Windows 11
 *     24H2; netsh wlan show drivers).
 *   - Providers: eir's "About WiFi 7" and WiFi booster pages; Vodafone
 *     Ireland's Gigabox support page and its Gigabox device guide; Sky
 *     Ireland's broadband and WiFi Max pages; Virgin Media Ireland's Wi-Fi help
 *     page and WiFi Guarantee page; Pure Telecom's broadband page and its Zyxel
 *     and FRITZ!Box guides; Digiweb's home page.
 * Left out, because no provider page we found said it: the Wi-Fi standard of
 * Virgin Media's Hub, Sky's Max Hub and Pure Telecom's modems, and which
 * providers' routers support bridge mode. It recommends no product.
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
  { id: "what-changes", label: "What do Wi-Fi 6, 6E and 7 change?" },
  { id: "compare", label: "How do the generations compare?" },
  { id: "six-ghz", label: "Is 6 GHz Wi-Fi allowed in Ireland?" },
  { id: "range", label: "Does 6 GHz reach as far as 5 GHz?" },
  { id: "devices", label: "Do your devices need to support it?" },
  { id: "providers", label: "What routers do Irish providers supply?" },
  { id: "when-it-helps", label: "When does a new router help?" },
  { id: "own-router", label: "Can you use your own router or mesh?" },
  { id: "faq", label: "Frequently asked questions" },
];

/* One list feeds both the questions on the page and the FAQPage schema, so
   the two cannot say different things. */
const FAQ = [
  {
    q: "Do I need a Wi-Fi 7 router in Ireland?",
    a: "Only if your devices support Wi-Fi 7 and your broadband is fast enough to use it: eir lists its Wi-Fi 7 fibre box for up to 5Gb, and Sky requires its Wi-Fi 7 hub for 2Gbps and 5Gbps. A new router will not fix a slow line or thick walls.",
  },
  {
    q: "Is 6 GHz Wi-Fi allowed in Ireland?",
    a: "Yes, indoors. ComReg allows Wi-Fi in 5,945 to 6,425 MHz without a licence; low power indoor devices may not be used outdoors, including in road vehicles.",
  },
  {
    q: "Will my older phone and laptop work with a Wi-Fi 6E or Wi-Fi 7 router?",
    a: "Yes, on 2.4 and 5 GHz as before. Only Wi-Fi 6E and Wi-Fi 7 devices can use 6 GHz, such as the iPhone 15 Pro or later.",
  },
  {
    q: "Does Wi-Fi 6E or Wi-Fi 7 reach further than Wi-Fi 6?",
    a: "No. The 6 GHz band they add has the shortest reach of the three, because higher frequencies get through walls and floors less well. For rooms far from the router, the fix is coverage: mesh, powerline or a cabled access point.",
  },
  {
    q: "How do I check which Wi-Fi my laptop supports?",
    a: "On Windows, type netsh wlan show drivers into Command Prompt: under Radio types supported, 802.11ax means Wi-Fi 6 or 6E and 802.11be means Wi-Fi 7. For Macs, Apple's support site lists which models use each.",
  },
  {
    q: "Can I use my own router with my broadband provider's router?",
    a: "Usually. Put the provider's router in bridge mode, or turn off its Wi-Fi and run yours in access point mode, so you do not end up with double NAT. Ask your provider first.",
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
          <strong>The short answer:</strong> only when three things line up. Your devices support the newer Wi-Fi, your
          broadband is fast enough to need it, and the rooms that matter are near the router. Wi-Fi 6 copes better with a
          house full of devices. Wi-Fi 6E adds the 6 GHz band, which ComReg, the communications regulator, allows indoors
          in Ireland. Wi-Fi 7 adds wider 6 GHz channels and can use more than one band at once. But 6 GHz has the
          shortest reach, so a new router will not fix a slow line or a bedroom the signal does not reach.
        </p>

        <h2 id="what-changes">What do Wi-Fi 6, 6E and 7 actually change?</h2>
        <p>
          The names come from the{" "}
          <a href="https://www.wi-fi.org/wi-fi-macphy" rel="noopener">
            Wi-Fi Alliance
          </a>
          , the industry body that certifies Wi-Fi equipment.
        </p>
        <ul>
          <li>
            <strong>Wi-Fi 6 (802.11ax)</strong> uses 2.4 and 5 GHz, like Wi-Fi 5. The Alliance says it brings greater
            capacity, stronger performance in crowded places and better battery life for devices.
          </li>
          <li>
            <strong>Wi-Fi 6E</strong> is Wi-Fi 6 extended into the 6 GHz band: wider channels in clear spectrum that
            older Wi-Fi 4 and Wi-Fi 5 devices cannot use.
          </li>
          <li>
            <strong>Wi-Fi 7 (802.11be)</strong> works across all three bands. Its 320 MHz channels in 6 GHz give twice
            the throughput of Wi-Fi 6, by the Alliance&apos;s figures, and multi-link operation lets a device use more
            than one band at once, which Microsoft says avoids congestion.
          </li>
        </ul>

        <h2 id="compare">How do the generations compare?</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Generation</th>
                <th>Bands</th>
                <th>What it improves</th>
                <th>Worth it when</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Wi-Fi 5 (802.11ac)</td>
                <td>2.4 and 5 GHz on most routers</td>
                <td>The baseline: faster devices can use the less crowded 5 GHz.</td>
                <td>Keep it if your line and your rooms test well.</td>
              </tr>
              <tr>
                <td>Wi-Fi 6 (802.11ax)</td>
                <td>2.4 and 5 GHz</td>
                <td>Capacity with many devices, crowded areas, battery life.</td>
                <td>A busy house or apartment, with devices that support it.</td>
              </tr>
              <tr>
                <td>Wi-Fi 6E</td>
                <td>Adds 6 GHz</td>
                <td>Wider channels in spectrum older devices cannot use.</td>
                <td>Devices that support 6E, used near the router.</td>
              </tr>
              <tr>
                <td>Wi-Fi 7 (802.11be)</td>
                <td>2.4, 5 and 6 GHz</td>
                <td>320 MHz channels, multi-link operation.</td>
                <td>A 2Gb or 5Gb line, and Wi-Fi 7 devices to use it.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 id="six-ghz">Is 6 GHz Wi-Fi allowed in Ireland?</h2>
        <p>
          Yes, indoors. ComReg&apos;s guidelines,{" "}
          <a href="https://www.comreg.ie/publication/permitted-short-range-devices-in-ireland-7" rel="noopener">
            Permitted Short Range Devices in Ireland
          </a>{" "}
          (document 02/71 R17, November 2024), allow Wi-Fi in 5,945 to 6,425 MHz without a licence, under a European
          decision. Low power indoor devices, the stronger of its two levels, are restricted to indoor use; outdoor use,
          including in road vehicles, is not permitted. Very low power devices may go outdoors, but only portable ones.
        </p>
        <p>
          That is the lower part of the band: 480 MHz, against 1,200 MHz where countries have opened it all, so channel
          counts in American reviews do not apply here.
        </p>

        <h2 id="range">Does 6 GHz reach as far as 5 GHz?</h2>
        <p>
          No. NETGEAR, another router maker, says 2.4 GHz gives the most coverage and 6 GHz the least, because higher
          frequencies get through walls and floors less well. Further from the router, devices drop back to 5 or 2.4 GHz.
          Our
          guide to <Link href="/blog/why-wifi-slow-upstairs-irish-homes">why Wi-Fi is slow upstairs</Link> covers which
          building materials take the most.
        </p>

        <h2 id="devices">Do your phone, laptop and TV need to support it too?</h2>
        <p>
          Yes. TP-Link says devices made before 2020 are unlikely to support 6 GHz, and those made before 2022 unlikely
          to support Wi-Fi 7. They still connect, on 2.4 or 5 GHz.
        </p>
        <ul>
          <li>
            <strong>iPhones.</strong>{" "}
            <a href="https://support.apple.com/en-ie/102285" rel="noopener">
              Apple lists
            </a>{" "}
            the iPhone 15 Pro or later for 6 GHz, but not the iPhone 15, 15 Plus, 16e or 17e; for every Wi-Fi 7 feature,
            the iPhone 16 Pro or later, again not the 16e or 17e.
          </li>
          <li>
            <strong>Windows laptops.</strong> Microsoft says the Wi-Fi adapter must support the standard, and Wi-Fi 7
            needs Windows 11 version 24H2. Type <code>netsh wlan show drivers</code> into Command Prompt: under Radio
            types supported, 802.11ax means Wi-Fi 6 or 6E, 802.11be means Wi-Fi 7.
          </li>
          <li>
            <strong>TVs and consoles.</strong> Check the specification for 802.11ax or 802.11be. Virgin Media advises
            plugging smart TVs, consoles and PCs in by cable where you can, leaving the Wi-Fi for everything else.
          </li>
        </ul>

        <h2 id="providers">What routers do Irish broadband providers supply?</h2>
        <p>What each provider&apos;s own pages said when we read them. Models change, so confirm with yours.</p>
        <ul>
          <li>
            <strong>eir.</strong> Its{" "}
            <a href="https://eir.ie/fibre-broadband-wifi7/" rel="noopener">
              Wi-Fi 7 page
            </a>{" "}
            compares the eir fibre box 7 (Wi-Fi 7, 2.4, 5 and 6 GHz, 320 MHz channels, up to 5Gb) with the fibre box
            F3500 (Wi-Fi 6, 2.4 and 5 GHz, up to 1Gb). Its Wi-Fi 7 booster is only for the 5Gb package.
          </li>
          <li>
            <strong>Vodafone.</strong> The{" "}
            <a
              href="https://n.vodafone.ie/support/broadband-and-landline-hub/broadband-landline/gigabox-modem.html"
              rel="noopener"
            >
              Gigabox+
            </a>{" "}
            is Wi-Fi 6 and comes only with Gigabit 2000 Fibre. Vodafone&apos;s device guide lists the standard Gigabox as
            802.11ac, which is Wi-Fi 5.
          </li>
          <li>
            <strong>Sky.</strong> The Wi-Fi 7{" "}
            <a href="https://www.sky.com/ie/broadband" rel="noopener">
              Gigafast+ Hub
            </a>{" "}
            is required for the 2Gbps and 5Gbps packages; the Sky Max Pods that extend it are Wi-Fi 5. Sky&apos;s Irish
            pages do not state the Sky Max Hub&apos;s standard.
          </li>
          <li>
            <strong>Virgin Media.</strong> Its help pages say the Hub uses 2.4 and 5 GHz but give no Wi-Fi standard, so
            check with Virgin Media.
          </li>
          <li>
            <strong>Pure Telecom.</strong> Its modem guides cover 2.4 and 5 GHz, with no standard stated, so check with
            Pure Telecom.
          </li>
          <li>
            <strong>Digiweb.</strong> Its Siro Gigabit offer includes a Wi-Fi 6 modem.
          </li>
        </ul>
        <p>The newest routers come with the fastest packages.</p>

        <h2 id="when-it-helps">When does a new router help, and when is the problem elsewhere?</h2>
        <p>
          Test before you buy: by cable at the router, then over Wi-Fi beside it and in the room that struggles. Our guide
          to <Link href="/blog/broadband-speed-test-ireland-line-or-wifi">telling the line from the Wi-Fi</Link> shows
          how.
        </p>
        <ul>
          <li>
            <strong>Slow even by cable:</strong> the line. No router delivers more than the line brings in, so take the
            figures to your provider.
          </li>
          <li>
            <strong>Fast by cable, slow over Wi-Fi beside the router on a recent device:</strong> the router may be the
            limit, especially an older one on a 1Gb line or with many devices; our guide to{" "}<Link href="/blog/too-many-devices-slow-wifi-ireland">a home with too many devices on the Wi-Fi</Link> covers that case. A newer router, or your provider&apos;s
            upgrade, can help.
          </li>
          <li>
            <strong>Fine beside the router, slow upstairs:</strong> coverage. A new router in the same spot faces the same
            walls, and its 6 GHz band gets through them least well. See our{" "}
            <Link href="/blog/mesh-wifi-explained">guide to mesh Wi-Fi</Link>.
          </li>
        </ul>
        <p>
          If you would rather know before buying anything, our <Link href="/services/wifi">home network assessment</Link>{" "}
          measures your broadband at the router and on every floor, then leaves a working trial on the floor that
          struggles for three days, with a written report. It costs €395, credited in full against any work you go ahead
          with.
        </p>

        <h2 id="own-router">Can you use your own router or mesh with your provider&apos;s?</h2>
        <p>
          Usually, but keep the provider&apos;s box as the modem: Sky, for one, says its hub lets its tech team run checks
          if there is a problem. Your own router plugged in behind it puts two routers in a row, which NETGEAR calls
          double NAT and which can cause network problems. There are two ways round it:
        </p>
        <ul>
          <li>
            <strong>Bridge mode.</strong> The provider&apos;s box passes the connection through and yours does the
            routing and the Wi-Fi. NETGEAR recommends this. Pure Telecom&apos;s guide for its Zyxel modem does it by
            switching the connection type to bridge and turning off the modem&apos;s Wi-Fi and DHCP.
          </li>
          <li>
            <strong>Access point mode.</strong> If the box cannot be bridged, turn off its Wi-Fi and set your router or
            mesh to access point mode, which NETGEAR notes loses some features, such as the guest network.
          </li>
        </ul>
        <p>
          Ask your provider first. Its own mesh units are built to work with its router, but check their standard:
          Sky&apos;s Max Pods are Wi-Fi 5.
        </p>

        <h2 id="faq">Frequently asked questions</h2>
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

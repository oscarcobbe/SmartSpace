"use client";

/**
 * Deep engagement tracking, sitewide.
 *
 * What was here before this measured the moments somebody converted: a tel:
 * tap, a form submit, a purchase. GA4 showed 2,507 page views and 2 form
 * submissions over ninety days against 25 form starts, and nothing recorded
 * what happened in between, so "why did twenty three people start the form and
 * stop" had no answer and could not get one retrospectively. GA4 keeps no
 * history of events it never received.
 *
 * The sister site, smartcareliving.ie, got the same set on 16 September. This
 * is the same event vocabulary so the two properties can be read side by side
 * rather than each needing its own translation.
 *
 * Everything goes through gtag, which is already consent-gated by the banner,
 * and nothing here mints an identifier or posts anywhere except Google.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Params = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export default function EngagementTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    /*
     * gtag is NOT required at mount, and the first version of this was wrong
     * about that. gtag arrives on an async script tag, this effect runs as
     * soon as the component mounts, and on a fast connection the effect wins
     * the race: the check returned, no listener was ever registered, and the
     * whole component did nothing on a page that scrolled to 95%. Verified in
     * a browser, which is the only place that race exists.
     *
     * dataLayer is created synchronously by the gtag snippet in the document
     * head, so pushing there reaches Google whether or not the library itself
     * has finished loading, and gtag reads the same queue.
     */

    const origin = window.location.hostname.replace(/^www\./, "");
    const fired: Record<string, true> = {};
    const once = (k: string) => (fired[k] ? false : ((fired[k] = true), true));
    const send = (name: string, params: Params = {}) => {
      const payload = { page_clean: pathname, ...params };
      if (typeof window.gtag === "function") window.gtag("event", name, payload);
      else (window.dataLayer ||= []).push({ event: name, ...payload });
    };

    /* Scroll depth. Next.js keeps the document between routes, so the marks
       reset per pathname through the effect's dependency rather than staying
       satisfied from the previous page. */
    const marks = [25, 50, 75, 90];
    const seen: Record<number, true> = {};
    let scrolled = false;
    const onScroll = () => {
      const doc = document.documentElement;
      const height = Math.max(1, doc.scrollHeight - window.innerHeight);
      /* A page shorter than the viewport is 100% read at rest, and counting
         that as a scroll would make every short page look fully consumed. */
      const pct = height < 40 ? 100 : (window.scrollY / height) * 100;
      for (const m of marks) {
        if (pct >= m && !seen[m] && (scrolled || height < 40)) {
          seen[m] = true;
          send("scroll_depth", { percent_scrolled: m });
        }
      }
      scrolled = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* Time on page, and only while the tab is in front. A tab left open in the
       background is not somebody reading. */
    const timers = [15, 30, 60, 120, 300].map((s) =>
      window.setTimeout(() => {
        if (document.visibilityState === "visible" && once(`t${s}`)) send("time_on_page", { seconds: s });
      }, s * 1000),
    );

    /* One click listener for links. tel: is deliberately NOT handled here:
       PhoneClickTracker already fires a conversion for it, and a second
       handler on the same tap is how a phone call gets counted twice. */
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const a = t?.closest?.("a");
      if (a) {
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#") || /^tel:/i.test(href)) return;
        const text = (a.textContent || "").trim().slice(0, 60);
        if (/^mailto:/i.test(href)) return send("email_click", { link_text: text });
        if (/^https?:\/\//i.test(href)) {
          let host = "";
          try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { return; }
          if (host !== origin) return send("outbound_click", { link_domain: host, link_text: text });
        }
        if (/\.(pdf|docx?|xlsx?|csv|zip)(\?|$)/i.test(href)) {
          return send("file_download", { file_name: href.split("/").pop()?.split("?")[0] || "" });
        }
        return send("internal_click", { link_text: text, link_url: href.slice(0, 120) });
      }
      const b = t?.closest?.('button, [role="button"]');
      if (b) {
        const label = (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 60);
        if (label) send("button_click", { button_text: label });
      }
    };
    document.addEventListener("click", onClick, true);

    /* Forms: begun, completed, and the field somebody was on when they left.
       That last one is the field to shorten, and it is the number this site
       most needs: twenty five starts, two submissions. */
    let formStarted = "";
    let formSubmitted = false;
    let lastField = "";
    const onFocus = (e: FocusEvent) => {
      const f = e.target as HTMLInputElement | null;
      if (!f?.name || !f.form) return;
      lastField = f.name;
      const id = f.form.getAttribute("id") || f.form.getAttribute("name") || "form";
      if (!formStarted) { formStarted = id; send("form_begin", { form_id: id }); }
    };
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      formSubmitted = true;
      send("form_complete", { form_id: form.getAttribute("id") || "form" });
    };
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("submit", onSubmit, true);

    /* Three presses on one element inside two seconds is somebody expecting
       something to happen. The only signal here that reports a fault rather
       than an interest. */
    let clickTimes: number[] = [];
    let lastTarget: EventTarget | null = null;
    const onRage = (e: MouseEvent) => {
      const now = Date.now();
      if (e.target !== lastTarget) { lastTarget = e.target; clickTimes = []; }
      clickTimes.push(now);
      clickTimes = clickTimes.filter((x) => now - x < 2000);
      if (clickTimes.length >= 3 && once(`rage${clickTimes[0]}`)) {
        const el = e.target as HTMLElement;
        send("rage_click", { element: (el.tagName || "").toLowerCase(), element_text: (el.textContent || "").trim().slice(0, 50) });
      }
    };
    document.addEventListener("click", onRage, true);

    /* pagehide rather than beforeunload: beforeunload does not fire when a
       phone browser is backgrounded, and phones are most of this traffic. */
    const start = Date.now();
    const onExit = () => {
      if (formStarted && !formSubmitted && once(`ab${formStarted}`)) {
        send("form_abandon", { form_id: formStarted, last_field: lastField });
      }
      if (!once("exit")) return;
      const doc = document.documentElement;
      const height = Math.max(1, doc.scrollHeight - window.innerHeight);
      send("page_exit", {
        seconds_on_page: Math.round((Date.now() - start) / 1000),
        max_scroll: Math.min(100, Math.round((window.scrollY / height) * 100)),
      });
    };
    window.addEventListener("pagehide", onExit);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("click", onRage, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pagehide", onExit);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pathname]);

  return null;
}

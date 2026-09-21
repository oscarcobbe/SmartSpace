"use client";

/**
 * The two halves of outreach that are not a prospect list: what we are putting
 * out in public, and what we are saying to partners in private.
 *
 * A client component because both are things somebody reads, copies and plays.
 * A caption nobody can copy in one action gets retyped into LinkedIn with a
 * word changed, and then the post on the site and the post on LinkedIn are two
 * different posts.
 */
import { useState } from "react";
import { Panel } from "../ui";
import { LINKEDIN_POSTS, type LinkedInPost } from "@/lib/crm/content/linkedin-posts";
import { PITCH, WHO, OPENER, OBJECTIONS, ECONOMICS } from "@/lib/crm/content/partners";

/* Four thousand two hundred and eighty four euro reads as a part number
   without its separator, and this figure is the one a partner repeats. */
const eur0 = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Copy({ text, label = "Copy caption" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch { /* a browser that refuses the clipboard is not an error worth shouting about */ }
      }}
      className="min-h-[34px] rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900"
    >
      {done ? "Copied" : label}
    </button>
  );
}

function Post({ post }: { post: LinkedInPost }) {
  /* The video is the post and the still is what a reader who will not press
     play sees, so the video is shown with the still as its poster rather than
     the two being offered as alternatives. */
  return (
    <article className="grid gap-5 border-t border-slate-200 p-4 first:border-t-0 sm:grid-cols-[260px_1fr]">
      <div>
        {post.video ? (
          <video
            className="w-full rounded-lg border border-slate-200 bg-slate-50"
            controls
            preload="none"
            poster={post.still ?? undefined}
          >
            <source src={post.video} type="video/mp4" />
          </video>
        ) : post.still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.still} alt="" className="w-full rounded-lg border border-slate-200" />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
            No artwork yet
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
          {post.video && <a className="underline" href={post.video} download>Download mp4</a>}
          {post.still && <a className="underline" href={post.still} download>Download still</a>}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            <span className="mr-2 text-slate-400 tabular-nums">{post.n}</span>
            {post.title}
          </h3>
          <Copy text={post.caption + (post.tags.length ? "\n\n" + post.tags.join(" ") : "")} />
        </div>
        <p className="mt-1 text-xs text-slate-500">Closes on a {post.close || "line"}.</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{post.caption}</p>
        {post.tags.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">{post.tags.join("  ")}</p>
        )}
      </div>
    </article>
  );
}

export function LinkedInSection() {
  return (
    <Panel
      title="What is going out on LinkedIn"
      aside={<span className="text-xs text-slate-500">{LINKEDIN_POSTS.length} written, artwork made</span>}
    >
      {LINKEDIN_POSTS.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">
          Nothing written yet. The drafts live in the SmartCare Living repository and are built in here.
        </p>
      ) : (
        LINKEDIN_POSTS.map((p) => <Post key={p.n} post={p} />)
      )}
    </Panel>
  );
}

export function PartnersSection() {
  const { subscriptionPerMonth: price, shareLow, shareHigh } = ECONOMICS;
  const share = (pct: number) => (price === null ? null : (price * pct) / 100);

  return (
    <Panel
      title="Home care companies"
      aside={<span className="text-xs text-slate-500">{shareLow} to {shareHigh}% of the subscription</span>}
    >
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <p className="text-sm leading-relaxed text-slate-700">
          A home care company is paid for the hours its carers are in the house, which is a few
          hours out of a hundred and sixty eight. The families worry about the rest. We fit the
          sensors and the care company takes a share of the subscription on the hours it was never
          going to bill, for as long as that home stays on it.
        </p>
      </div>

      {/* The money, or an honest gap where it will be. A worked example with a
          made-up subscription price is a number somebody repeats in a meeting. */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 border-b border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { k: "Per home, per month", v: price === null ? "not set" : `€${price}` ,
            note: price === null ? "Set the subscription price to fill in the rest" : "The subscription a share is taken of" },
          { k: `Partner share at ${shareLow}%`, v: share(shareLow) === null ? "–" : `€${share(shareLow)!.toFixed(2)}`,
            note: "Recurring, not a one-off referral fee" },
          { k: `At ${shareHigh}%`, v: share(shareHigh) === null ? "–" : `€${share(shareHigh)!.toFixed(2)}`,
            note: "Per home, every month it stays on" },
        ].map((c) => (
          <div key={c.k} className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.k}</div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{c.v}</div>
            <div className="text-xs text-slate-500">{c.note}</div>
          </div>
        ))}
      </div>

      {/* The figure that makes it land. One home at ten per cent is small
          enough to dismiss; the number a care manager is actually deciding
          about is the book of homes they already have. */}
      {price !== null && (
        <p className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
          Twenty homes at {shareHigh} per cent is{" "}
          <strong className="font-semibold tabular-nums text-slate-900">
            {eur0((price * shareHigh) / 100 * 20)}
          </strong>{" "}
          a month, or{" "}
          <strong className="font-semibold tabular-nums text-slate-900">
            {eur0((price * shareHigh) / 100 * 20 * 12)}
          </strong>{" "}
          a year, recurring, on hours nobody was booked for.
        </p>
      )}

      <div className="grid gap-x-8 gap-y-6 p-4 lg:grid-cols-2">
        {[WHO, ...PITCH].map((s) => (
          <section key={s.heading}>
            <h3 className="text-sm font-semibold text-slate-900">{s.heading}</h3>
            <ul className="mt-2 space-y-1.5">
              {s.body.map((b) => (
                <li key={b} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">The first message</h3>
          <Copy text={OPENER.body} label="Copy message" />
        </div>
        <p className="mt-1 text-xs text-slate-500">Subject: {OPENER.subject}</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-sans text-sm leading-relaxed text-slate-700">
          {OPENER.body}
        </pre>
      </div>

      <div className="border-t border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">What comes back, and the honest answer</h3>
        <dl className="mt-2 space-y-3">
          {OBJECTIONS.map((o) => (
            <div key={o.q}>
              <dt className="text-sm font-medium text-slate-900">{o.q}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-slate-600">{o.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}

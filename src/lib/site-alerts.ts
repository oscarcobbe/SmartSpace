/**
 * Centralised site-health alert sender.
 *
 * Every "something is broken, Nigel needs to know" email in the app should
 * go through this. Why: without a single chokepoint we'd be (a) duplicating
 * Resend wiring in every route, (b) unable to rate-limit, and (c) unable to
 * dedupe — a wedged Stripe key would fire one alert per request until Nigel
 * intervened, drowning the inbox.
 *
 * Three layers of defence against noise:
 *   1. In-memory dedup keyed on `dedupeKey` (default = subject). Same key
 *      seen within DEDUPE_WINDOW_MS is dropped. The map is process-local —
 *      Vercel cold starts reset it, which is fine: a fresh Lambda firing
 *      "the site is broken" once is still useful, just not 50× per minute.
 *   2. Per-process cap: at most MAX_ALERTS_PER_WINDOW emails per window,
 *      regardless of dedupe key. Catches the case where many different
 *      things break at once (e.g. all pages 500 → many distinct dedupe
 *      keys, still one underlying root cause).
 *   3. Resend errors are swallowed + logged, never thrown — alerts must
 *      never break the caller's user-facing flow.
 *
 * Required env vars (all already used elsewhere — no new setup needed):
 *   RESEND_API_KEY, RESEND_FROM_EMAIL, CONTACT_TO_EMAIL (defaults to
 *   nigel@smart-space.ie).
 */

import { Resend } from "resend";
import { alertTo } from "@/lib/business-constants";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_ALERTS_PER_WINDOW = 10;
const PROCESS_WINDOW_MS = 15 * 60 * 1000; // 15min

const recentAlerts = new Map<string, number>();
const processAlertTimestamps: number[] = [];

function pruneRecentAlerts(now: number) {
  // Array.from for compatibility with the tsconfig target (no downlevelIteration).
  Array.from(recentAlerts.entries()).forEach(([key, ts]) => {
    if (now - ts > DEDUPE_WINDOW_MS) {
      recentAlerts.delete(key);
    }
  });
}

function pruneProcessTimestamps(now: number) {
  while (processAlertTimestamps.length && now - processAlertTimestamps[0] > PROCESS_WINDOW_MS) {
    processAlertTimestamps.shift();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SiteAlertSeverity = "warning" | "error" | "critical";

export interface SiteAlertParams {
  /** Short category for routing/filtering: "stripe" | "contact-form" | "page-down" | "client-error" | etc. */
  category: string;
  /** Severity prefix appears in the subject line. */
  severity?: SiteAlertSeverity;
  /** One-line human summary — used as the email subject body and the dedupe key fallback. */
  summary: string;
  /** Optional detailed plain-text body. Markdown-style bullet lists render fine. */
  details?: string;
  /** Optional override for dedupe key. Default = `${category}:${summary}`. */
  dedupeKey?: string;
  /** Optional explicit recipient. Default = CONTACT_TO_EMAIL. */
  to?: string;
}

export interface SendSiteAlertResult {
  sent: boolean;
  reason?: "missing-env" | "deduped" | "rate-limited" | "send-failed";
}

/**
 * Send an alert email. Returns a result object describing what happened
 * (sent, deduped, rate-limited, etc.) — never throws.
 */
export async function sendSiteAlert(params: SiteAlertParams): Promise<SendSiteAlertResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = params.to ?? alertTo();

  if (!apiKey || !from) {
    console.warn(
      `[site-alerts] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skipping alert: ${params.summary}`
    );
    return { sent: false, reason: "missing-env" };
  }

  const now = Date.now();
  pruneRecentAlerts(now);
  pruneProcessTimestamps(now);

  const dedupeKey = params.dedupeKey ?? `${params.category}:${params.summary}`;
  if (recentAlerts.has(dedupeKey)) {
    console.log(`[site-alerts] deduped (within ${DEDUPE_WINDOW_MS}ms): ${dedupeKey}`);
    return { sent: false, reason: "deduped" };
  }

  if (processAlertTimestamps.length >= MAX_ALERTS_PER_WINDOW) {
    console.warn(
      `[site-alerts] rate-limited — already sent ${MAX_ALERTS_PER_WINDOW} alerts in last ${PROCESS_WINDOW_MS}ms. Skipping: ${dedupeKey}`
    );
    return { sent: false, reason: "rate-limited" };
  }

  const severity = params.severity ?? "error";
  const severityIcon =
    severity === "critical" ? "🚨" : severity === "warning" ? "⚠️" : "❌";
  const severityLabel =
    severity === "critical" ? "CRITICAL" : severity === "warning" ? "WARNING" : "ERROR";
  const subject = `[Smart Space ${severityLabel}] ${severityIcon} ${params.summary}`;

  const dashboardUrl = "https://smart-space.ie/admin";
  const logsUrl = "https://vercel.com/oscar-5316s-projects/smart-space-ring-camera/logs";
  const text = [
    `${severityIcon} ${severityLabel}: ${params.summary}`,
    "",
    `Category: ${params.category}`,
    `Time:     ${new Date().toISOString()}`,
    "",
    params.details ?? "(no further detail)",
    "",
    "—",
    `Admin:  ${dashboardUrl}`,
    `Logs:   ${logsUrl}`,
    "",
    "This alert is deduped for 1 hour and capped at 10 emails per 15 minutes per process,",
    "so if multiple things are breaking simultaneously you may not see every individual",
    "failure here — check the admin dashboard and Vercel logs.",
  ].join("\n");
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a;max-width:640px">
      <p style="font-size:18px;font-weight:700;color:${severity === "critical" ? "#b91c1c" : severity === "warning" ? "#b45309" : "#991b1b"};margin:0 0 8px">
        ${severityIcon} ${severityLabel}: ${escapeHtml(params.summary)}
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px">
        <strong>Category:</strong> ${escapeHtml(params.category)} &middot;
        <strong>Time:</strong> ${escapeHtml(new Date().toISOString())}
      </p>
      <div style="background:#f9fafb;border-left:3px solid ${severity === "critical" ? "#b91c1c" : "#d97706"};padding:14px 18px;border-radius:4px;margin-bottom:20px">
        <pre style="margin:0;font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;color:#111827">${escapeHtml(params.details ?? "(no further detail)")}</pre>
      </div>
      <p style="font-size:13px;margin:0 0 8px">
        <a href="${dashboardUrl}" style="color:#16a34a;font-weight:600">Open admin dashboard</a>
        &nbsp;&middot;&nbsp;
        <a href="${logsUrl}" style="color:#16a34a;font-weight:600">Open Vercel logs</a>
      </p>
      <p style="font-size:11px;color:#9ca3af;margin-top:24px;line-height:1.5">
        Deduped for 1 hour and capped at 10 emails per 15 minutes per process —
        if many things are breaking at once you may not see every failure here.
        Check the admin dashboard and Vercel logs for the full picture.
      </p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html,
    });
    recentAlerts.set(dedupeKey, now);
    processAlertTimestamps.push(now);
    console.log(`[site-alerts] sent alert: ${subject}`);
    return { sent: true };
  } catch (err) {
    console.error(`[site-alerts] CRITICAL: alert email failed to send. summary="${params.summary}" err=`, err);
    return { sent: false, reason: "send-failed" };
  }
}

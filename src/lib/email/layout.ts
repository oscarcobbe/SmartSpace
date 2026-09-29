/**
 * Smart Space's email frame and the pieces every email is built from.
 *
 * Before this, each email the site sends carried its own copy of the same
 * 600px table layout: the contact auto-reply, the order confirmation and the
 * paused day-before reminder each wrote the header, the card and the dark
 * footer out by hand, and they had already drifted (three footer taglines,
 * two orange link colours, one with a mobile stylesheet and two without).
 * Designing the emails as a set means one frame and one set of blocks.
 *
 * The look is the one already in customers' inboxes: cream page, white card,
 * logo header, orange eyebrow, dark footer. Tables and inline styles only,
 * because Gmail, Outlook and Apple Mail strip or ignore most of anything
 * else. One small stylesheet for phones, which clients that ignore it can
 * afford to: the inline widths already fit.
 *
 * Pure string functions with no imports, so the email studio at /dev/emails,
 * the routes that send, and any check all render exactly the same markup.
 */

export const INK = "#1C1A18";
export const BODY = "#3f3d3a";
export const MUTED = "#7a7975";
export const RULE = "#e6e3df";
export const PAGE = "#f1efea";
export const ORANGE = "#f48222";
/* Orange that white text can sit on, and orange text on white: 4.8 to 1.
   White on #f48222 is 2.6 to 1, which fails for anything but large text. */
export const ORANGE_TEXT = "#b55810";
export const PANEL = "#fef4eb";
export const PANEL_RULE = "#f4d4a8";
const FONT = "'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif";

const SITE = "https://smart-space.ie";
const PHONE_DISPLAY = "01 513 0424";
const PHONE_TEL = "+35315130424";
const EMAIL = "info@smart-space.ie";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A block is one row of the card: a <tr>. */
export type Block = string;

const row = (inner: string, pad = "16px 32px 0") =>
  `<tr><td class="px" style="padding:${pad};font-family:${FONT};">${inner}</td></tr>`;

export const eyebrow = (text: string, color = ORANGE_TEXT): Block =>
  row(
    `<div style="font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${color};">${esc(text)}</div>`,
    "30px 32px 0",
  );

export const heading = (text: string): Block =>
  row(
    `<h1 class="h1" style="margin:0;font-size:26px;line-height:1.18;letter-spacing:-0.4px;color:${INK};font-weight:800;">${esc(text)}</h1>`,
    "10px 32px 0",
  );

/** A paragraph. Takes HTML, so callers escape their own values. */
export const para = (html: string, opts: { size?: number; color?: string; pad?: string } = {}): Block =>
  row(
    `<p style="margin:0;font-size:${opts.size ?? 15}px;line-height:1.6;color:${opts.color ?? BODY};">${html}</p>`,
    opts.pad,
  );

export const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="color:${ORANGE_TEXT};font-weight:700;text-decoration:underline;">${esc(label)}</a>`;

export const phoneLink = () => link(`tel:${PHONE_TEL}`, PHONE_DISPLAY);
export const emailLink = () => link(`mailto:${EMAIL}`, EMAIL);

/** The orange summary panel: a title and label/value rows. */
export const summary = (title: string, rows: [string, string][]): Block =>
  row(
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${PANEL};border:1px solid ${PANEL_RULE};border-radius:6px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-size:11px;font-weight:800;color:${ORANGE_TEXT};letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;">${esc(title)}</div>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:14px;line-height:1.6;color:${INK};">
          ${rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:4px 0;color:${MUTED};font-weight:600;width:130px;vertical-align:top;">${esc(k)}</td><td style="padding:4px 0;color:${INK};font-weight:700;">${esc(v)}</td></tr>`,
            )
            .join("")}
        </table>
      </td></tr>
    </table>`,
    "22px 32px 0",
  );

/** A panel of prose, with an optional title. */
export const panel = (html: string, title?: string): Block =>
  row(
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${PANEL};border:1px solid ${PANEL_RULE};border-radius:6px;">
      <tr><td style="padding:18px 20px;font-size:14px;line-height:1.6;color:${BODY};">
        ${title ? `<div style="font-size:11px;font-weight:800;color:${ORANGE_TEXT};letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px;">${esc(title)}</div>` : ""}
        ${html}
      </td></tr>
    </table>`,
    "22px 32px 0",
  );

/** A bulleted checklist inside a panel. Items take HTML. */
export const checklist = (title: string, items: string[]): Block =>
  panel(
    `<ul style="margin:0;padding-left:20px;">${items
      .map((i, n) => `<li style="margin-bottom:${n === items.length - 1 ? 0 : 10}px;">${i}</li>`)
      .join("")}</ul>`,
    title,
  );

/** Numbered steps with orange discs. Items take HTML. */
export const steps = (title: string, items: string[]): Block =>
  row(
    `<div style="font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${ORANGE_TEXT};margin-bottom:12px;">${esc(title)}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${items
        .map(
          (t, n) => `<tr>
        <td valign="top" style="padding:0 0 14px;width:36px;">
          <div style="background:${ORANGE_TEXT};color:#ffffff;width:28px;height:28px;border-radius:999px;text-align:center;font-weight:800;font-size:14px;line-height:28px;font-family:${FONT};">${n + 1}</div>
        </td>
        <td valign="top" style="padding:3px 0 14px 12px;font-size:15px;line-height:1.55;color:${BODY};">${t}</td>
      </tr>`,
        )
        .join("")}
    </table>`,
    "26px 32px 0",
  );

/** A button. Outlook drops the rounded corners and keeps the rest. */
export const button = (label: string, href: string, tone: "orange" | "ink" = "orange"): Block =>
  row(
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr><td align="center" bgcolor="${tone === "ink" ? INK : ORANGE_TEXT}" style="border-radius:999px;">
        <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(label)}</a>
      </td></tr>
    </table>`,
    "24px 32px 0",
  );

/** The ring-us-if block with an orange rule down the left. */
export const contactNote = (lead: string): Block =>
  row(
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-left:3px solid ${ORANGE};">
      <tr><td style="padding:4px 0 4px 16px;">
        <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:${INK};font-weight:700;">${esc(lead)}</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:${BODY};">Phone: ${phoneLink()}<br>Email: ${emailLink()}</p>
      </td></tr>
    </table>`,
    "24px 32px 0",
  );

export const signoff = (closing: string, name: string): Block =>
  row(
    `<p style="margin:0;font-size:15px;line-height:1.6;color:${BODY};">${esc(closing)}<br><strong style="color:${INK};">${esc(name)}</strong></p>`,
    "26px 32px 32px",
  );

/**
 * A feature card for announcements: an optional logo, a tag, a title, body
 * text and a link. Its own accent colour, so a sister brand can appear in
 * its colours inside a Smart Space email.
 */
export const feature = (f: {
  accent: string;
  tint: string;
  tag: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  logo?: { src: string; alt: string; width: number };
}): Block =>
  row(
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${f.tint};border-radius:8px;border-top:4px solid ${f.accent};">
      <tr><td style="padding:22px 22px 24px;">
        ${f.logo ? `<img src="${esc(f.logo.src)}" width="${f.logo.width}" alt="${esc(f.logo.alt)}" style="display:block;height:auto;max-width:${f.logo.width}px;border:0;margin-bottom:14px;">` : ""}
        <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${f.accent};">${esc(f.tag)}</div>
        <div style="margin-top:6px;font-size:20px;line-height:1.25;font-weight:800;color:${INK};">${esc(f.title)}</div>
        <div style="margin-top:10px;font-size:15px;line-height:1.6;color:${BODY};">${f.bodyHtml}</div>
        ${
          f.cta
            ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;"><tr><td bgcolor="${f.accent}" style="border-radius:999px;"><a href="${esc(f.cta.href)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(f.cta.label)}</a></td></tr></table>`
            : ""
        }
      </td></tr>
    </table>`,
    "22px 32px 0",
  );

/** A marked gap in a draft: a sentence that has not been written yet. */
export const placeholder = (label: string) =>
  `<span style="background:#fff3bf;color:#7a5b00;font-weight:700;padding:1px 6px;border-radius:4px;">[${esc(label)}]</span>`;

export type Footer =
  | { kind: "transactional"; note: string }
  | { kind: "marketing"; reason: string; unsubscribeUrl: string };

function footerRow(f: Footer): string {
  const fine =
    f.kind === "transactional"
      ? esc(f.note)
      : `${esc(f.reason)} <a href="${esc(f.unsubscribeUrl)}" style="color:#bbbbbb;text-decoration:underline;">Unsubscribe</a>.`;
  return `<tr><td class="px" style="padding:28px 32px;background:${INK};color:#cccccc;font-family:${FONT};font-size:13px;line-height:1.55;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td valign="top" class="stack" style="padding-right:16px;">
          <div style="font-weight:800;color:#ffffff;font-size:14px;letter-spacing:0.4px;margin-bottom:8px;">Smart Space</div>
          <div>Expertly Installed. Perfectly Secured.</div>
          <div>Dublin and Leinster.</div>
        </td>
        <td valign="top" class="stack stack-right" style="padding-left:16px;text-align:right;">
          <div><a href="tel:${PHONE_TEL}" style="color:#ffffff;text-decoration:none;font-weight:700;">${PHONE_DISPLAY}</a></div>
          <div><a href="mailto:${EMAIL}" style="color:#ffffff;text-decoration:none;">${EMAIL}</a></div>
          <div><a href="${SITE}" style="color:#ffffff;text-decoration:none;">smart-space.ie</a></div>
        </td>
      </tr>
    </table>
    <div style="border-top:1px solid #2e2c2a;margin-top:18px;padding-top:14px;font-size:11px;color:#8a8a8a;line-height:1.55;">${fine}</div>
  </td></tr>`;
}

export function renderEmail(opts: { title: string; preheader: string; blocks: Block[]; footer: Footer }): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en-IE">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(opts.title)}</title>
<style type="text/css">
  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:${PAGE}; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; }
    .px { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:23px !important; line-height:1.22 !important; }
    .stack { display:block !important; width:100% !important; padding:0 !important; }
    .stack-right { text-align:left !important; padding-top:14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};">
<div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:${PAGE};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(opts.preheader)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${PAGE};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="width:600px;max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td class="px" style="padding:24px 32px 16px;border-bottom:1px solid ${RULE};" align="left">
        <img src="${SITE}/Logo1.png" width="120" alt="Smart Space" style="display:block;height:auto;max-width:120px;border:0;">
      </td></tr>
      ${opts.blocks.join("\n")}
      ${footerRow(opts.footer)}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

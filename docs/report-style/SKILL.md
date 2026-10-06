---
name: smartspace-report
description: Smart Space's house style for client reports and documents (home network assessments, quotes, anything sent to a customer). Use it whenever you make a Smart Space report, so every report looks like smart-space.ie.
---

# Smart Space report style

Every Smart Space report uses one look: the smart-space.ie website on an A4 sheet. The
look lives in one file, `network-assessment.html`, beside this one. Its `<style>` block is
the stylesheet, and the file itself is a finished network assessment report to copy from.

Template: https://raw.githubusercontent.com/oscarcobbe/SmartSpace/main/docs/report-style/network-assessment.html

## A home network assessment

1. Start from `network-assessment.html`. Do not rewrite it from scratch.
2. Change only the `const R = { ... }` block between the two `EDITABLE BLOCK` comments:
   the client, the visit dates, their complaint, the verdict, every measurement, the plan
   and the money. Everything below that block draws the report from those figures.
3. Leave the rest of the file exactly as it is: the stylesheet, the letterhead, the logo,
   the charts and the footer.
4. Open the file in Chrome, then File > Print > Save as PDF, paper size A4. If the dark
   panel prints white, tick "Background graphics" under More settings.

The sentences under the charts are written from the figures, so they only say what was
measured. Leave a field out rather than guess it:

- `trial.tests`, `trial.medianDown`, `trial.medianUp`, `trial.failed`, `trial.hours`: from the
  three-day log. With them the trial section says how many hourly tests ran and which could not.
- `trial.eveningComplaint: true` only when the customer said the trouble is worst in the evening.
- `trial.roomOnTrial`: the compared room's speed on the trial network, if it was measured.
- `trial.deviceSource: "checks"` when device drops come from the Pi's two-minute checks rather
  than the Deco log.
- `monitoring`: leave it empty and the monitoring line is left out.

The CRM's assessment portal (smart-space.ie/crm/network/assessments) fills all of this from the
visit and the logs, and drafts the report for Nigel to approve.

If you are working in a Claude artifact, edit the `R` block in place rather than writing the
page out again.

## Any other report

Copy these from `network-assessment.html` without changing them:

- the `<link>` to Google Fonts and the whole `<style>` block
- the `<div class="letterhead">`, including the `<img class="ss-logo">` element
- the `<footer class="foot">` with the company particulars

Then build the body only from the parts the stylesheet already has:

| Part | Markup |
|---|---|
| Small orange label above a title | `<p class="kicker">` |
| Client name or report title | `<h1>` |
| Facts about the job (address, dates, engineer) | `<div class="meta">` with `<div><span>Label</span>Value</div>` items |
| The conclusion, said once, plainly | `<div class="verdict"><h2>What we found</h2><p>…</p><div class="after">…</div></div>` |
| A numbered section | `<section>` starting with `<div class="shead"><div class="n">1</div><div class="t"><h2>Title</h2><p class="gloss">How it was measured</p></div></div>` |
| The client's words | `<p class="lede">` for their complaint, `<blockquote>…<cite>Name, when</cite></blockquote>` for a quote |
| Tables | `<div class="scroll"><table>`; give number columns `class="n"`; the last row of a bill is `<tr class="total">` |
| Status | `<span class="pill good">Healthy</span>`, `pill fair`, `pill poor`; our pick is `pill chosen` |
| A chart | `<figure><div class="chart"><svg viewBox="0 0 820 …">…</svg></div><figcaption>…</figcaption></figure>` |
| What we are not doing, and why | `<div class="wont"><h3>…</h3><p>…</p></div>` |
| New page when printed | add `class="pagebreak"` to a `<section>`; otherwise let the pages break on their own |

Do not add other fonts, colours, icons, emoji, shadows or gradients.

The printed page footer reads "Smart Space · Home network assessment" and the page number. It is
the `@bottom-left` line in the `@page` rule: change those words to name the new report.

## Colours

All colours are tokens at the top of the stylesheet. Charts read them too, so use the
tokens and never type a colour in.

| Token | Use |
|---|---|
| `--ss-orange` #F48222 | the brand: rules, the letterhead line |
| `--ss-orange-strong` #D96D15 | section numbers, the upload line on charts |
| `--ss-orange-text` #B55810 | small orange text such as the kicker |
| `--ss-ink` #26221E, `--ss-ink-soft` #5A524C | text |
| `--ss-dark` #1C1A18 | the verdict panel |
| `--ss-cream-100` #F5F3EE, `--ss-cream-200` #EDEAE3 | cards and dividers |
| `--ss-good` #16A34A, `--ss-fair` #F5B400, `--ss-poor` #DC2626 | status: green, amber, red, as on the Wi-Fi check |
| `--ss-good-text`, `--ss-fair-text`, `--ss-poor-text` | the same status as text on white |

Orange is the brand, never a status. Amber is yellow so it is never mistaken for the brand.

## Charts

- Draw inline SVG on a viewBox 820 wide, with text 13 to 18 units high.
- Colour bars by status against what the room needs: green, amber or red. Print each value
  in the matching `-text` shade, and keep labels inside the viewBox.
- One sentence under each chart says what it shows, in plain words.

## Words

- Plain English, short sentences, the client's own words where we have them.
- Every figure was measured in the house. Say so, and never estimate one.
- It is a network diagnosis, never "Wi-Fi installation".
- Say powerline, or "fed over the mains". Never recommend cabling.
- Monitoring is "monitored", never "managed". Do not write "professional-grade".
- Never name the monitoring equipment or the companies that make it. Say what it does.
- Always say what we are not recommending, and why.

## The logo

The `<img class="ss-logo">` element in the template carries the logo inside it. Copy that
element as it is. Never retype, shorten or redraw it. If it cannot be copied, use
`<img class="ss-logo" alt="Smart Space" src="https://smart-space.ie/Logo1.png">`, which
works in a file opened in a browser and in the PDF, but not inside a Claude artifact.

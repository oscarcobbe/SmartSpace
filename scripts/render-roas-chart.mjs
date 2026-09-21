#!/usr/bin/env node
/**
 * Render the real return-on-spend chart to a file, with data we control.
 *
 * The CRM reads a database this machine cannot reach, so every change to this
 * chart was being made, typechecked, and shipped without anybody looking at
 * it. That is how it went out with a line floating over bars it had nothing
 * to do with. This renders the actual component, not a copy of its
 * arithmetic, against buckets shaped like the real ones.
 *
 *   node scripts/render-roas-chart.mjs [month|day] > /tmp/chart.html
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(ROOT, ".render-"));

const compile = (rel, out, rewrites = []) => {
  let js = ts.transpileModule(readFileSync(join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const [from, to] of rewrites) js = js.split(from).join(to);
  const file = join(dir, out);
  writeFileSync(file, js);
  return file;
};

compile("src/app/crm/roas-scale.ts", "roas-scale.mjs");
const chart = compile("src/app/crm/roas-chart.tsx", "roas-chart.mjs", [
  ['from "./roas-scale"', 'from "./roas-scale.mjs"'],
  ['"use client";', ""],
]);
const { default: RoasChart } = await import(pathToFileURL(chart).href);

/* Shaped like the real months: small spend, lumpy revenue, the click id
   stopping part way through the last month but one. */
const months = [
  { key: "2026-04", label: "Apr 2026", start: "2026-04-13", end: "2026-04-30", days: 18, partial: true, spend: 180, spendBlind: 0, adRevenue: 0, allRevenue: 900, googleValue: 120, conversions: 1, orders: 2 },
  { days: 31, key: "2026-05", label: "May 2026", start: "2026-05-01", end: "2026-05-31", spend: 451, spendBlind: 0, adRevenue: 2404, allRevenue: 3100, googleValue: 1055, conversions: 9, orders: 7 },
  { days: 30, key: "2026-06", label: "Jun 2026", start: "2026-06-01", end: "2026-06-30", spend: 551, spendBlind: 0, adRevenue: 1791, allRevenue: 2600, googleValue: 1444, conversions: 8, orders: 6 },
  { days: 31, key: "2026-07", label: "Jul 2026", start: "2026-07-01", end: "2026-07-31", spend: 608, spendBlind: 0, adRevenue: 1143, allRevenue: 4200, googleValue: 1186, conversions: 7, orders: 5 },
  { days: 31, key: "2026-08", label: "Aug 2026", start: "2026-08-01", end: "2026-08-31", spend: 608, spendBlind: 260, adRevenue: 1218, allRevenue: 6167, googleValue: 492, conversions: 6, orders: 16 },
  { days: 22, key: "2026-09", label: "Sept 2026", start: "2026-09-01", end: "2026-09-30", spend: 438, spendBlind: 438, adRevenue: 0, allRevenue: 4386, googleValue: 33, conversions: 2, orders: 11, partial: true },
];
const totals = (xs) => xs.reduce((a, b) => ({
  spend: a.spend + b.spend, adRevenue: a.adRevenue + b.adRevenue,
  allRevenue: a.allRevenue + b.allRevenue, googleValue: a.googleValue + b.googleValue,
  days: a.days + 30,
}), { spend: 0, adRevenue: 0, allRevenue: 0, googleValue: 0, days: 0 });

const counted = totals(months.slice(0, 5));
const excluded = totals(months.slice(5));

const html = renderToStaticMarkup(React.createElement(RoasChart, {
  day: [], week: [], month: months,
  counted, excluded,
  lastAttributed: "2026-08-12",
  revenueKnown: true,
  capturedAt: "2026-09-21T08:00:00.000Z",
  siteLabel: "Smart Space",
}));

rmSync(dir, { recursive: true, force: true });
process.stdout.write(
  `<!doctype html><meta charset="utf-8">` +
  `<script src="https://cdn.tailwindcss.com"></script>` +
  `<body style="margin:0;background:#f1f5f9;padding:24px">` +
  `<div style="max-width:860px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">${html}</div>`,
);

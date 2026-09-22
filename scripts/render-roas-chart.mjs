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

/* The real months, as read live from Stripe and Google Ads on 22 September
   2026, so what this renders is what the owner sees rather than a guess at it. */
const m = (key, label, spend, back, estimated, taken, unseen, share, partial = false) =>
  ({ key, label, spend, back, estimated, taken, unseen, share, sales: 0, tiedSales: 0, partial });
const months = [
  m("2026-04", "Apr 2026", 412, 0, 0, 762, 322, 0),
  m("2026-05", "May 2026", 451, 2403, 1261, 5167, 1930, 0.65),
  m("2026-06", "Jun 2026", 551, 1793, 1284, 3648, 1716, 0.75),
  m("2026-07", "Jul 2026", 608, 1141, 2947, 6157, 4029, 0.73),
  m("2026-08", "Aug 2026", 608, 908, 1416, 7059, 2995, 0.47),
  m("2026-09", "Sept 2026", 484, 0, 806, 6188, 3495, 0.23, true),
];
const sum = (k) => months.reduce((a, x) => a + x[k], 0);

const html = renderToStaticMarkup(React.createElement(RoasChart, {
  months, spend: sum("spend"), back: sum("back"), estimated: sum("estimated"), siteLabel: "Smart Space",
}));

rmSync(dir, { recursive: true, force: true });
process.stdout.write(
  `<!doctype html><meta charset="utf-8">` +
  `<script src="https://cdn.tailwindcss.com"></script>` +
  `<body style="margin:0;background:#f1f5f9;padding:24px">` +
  `<div style="max-width:860px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">${html}</div>`,
);

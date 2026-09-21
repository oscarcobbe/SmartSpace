#!/usr/bin/env node
/**
 * Render the outreach sections to a file, so they can be looked at.
 *
 * Same reason as render-roas-chart.mjs: the CRM reads a database this machine
 * cannot reach, so anything built for it ships unseen unless something like
 * this exists.
 *
 *   node scripts/render-outreach-sections.mjs > /tmp/outreach.html
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync, cpSync, existsSync } from "node:fs";
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
  writeFileSync(join(dir, out), js);
  return join(dir, out);
};

compile("src/lib/crm/content/linkedin-posts.ts", "linkedin-posts.mjs");
compile("src/lib/crm/content/partners.ts", "partners.mjs");
compile("src/app/crm/ui.tsx", "ui.mjs", [
  ['from "@/lib/crm/glossary"', 'from "./glossary.mjs"'],
]);
if (existsSync(join(ROOT, "src/lib/crm/glossary.ts"))) compile("src/lib/crm/glossary.ts", "glossary.mjs");

const sections = compile("src/app/crm/outreach/sections.tsx", "sections.mjs", [
  ['"use client";', ""],
  ['from "../ui"', 'from "./ui.mjs"'],
  ['from "@/lib/crm/content/linkedin-posts"', 'from "./linkedin-posts.mjs"'],
  ['from "@/lib/crm/content/partners"', 'from "./partners.mjs"'],
]);

const { LinkedInSection, PartnersSection } = await import(pathToFileURL(sections).href);
const html = renderToStaticMarkup(
  React.createElement("div", { className: "space-y-6" },
    React.createElement(PartnersSection),
    React.createElement(LinkedInSection)));

rmSync(dir, { recursive: true, force: true });
process.stdout.write(
  `<!doctype html><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script>` +
  `<body style="margin:0;background:#f1f5f9;padding:24px">` +
  `<div style="max-width:1000px;margin:0 auto">${html}</div>`,
);

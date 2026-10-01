#!/usr/bin/env node
/**
 * A lead form answers the visitor before the sheet, not after it.
 *
 * /api/contact (the contact and callback forms) and /api/checkout/free (the
 * free consultation) used to await the leads sheet, the CRM mirror, the
 * consent record and the server conversion before answering. The sheet alone
 * can take 12 s, a 1.5 s pause and a 10 s retry. The browser fires the Google
 * Ads conversion only once the answer arrives, so a visitor who gave up during
 * that wait was never counted. SCL lost a lead to the same pattern.
 *
 * Those four now run after the answer through afterResponse
 * (src/lib/after-response.ts), which hands them to waitUntil from
 * @vercel/functions. A bare `void task()` is not the same thing: Vercel can
 * stop a function once it has answered, and the free consultation's CRM
 * mirror was exactly that.
 *
 * This fails the build when, in either route, logLead, sendToCrm,
 * recordEnquiryConsent or fireServerConversion is called anywhere except
 * inside a function passed to afterResponse (so awaited before the answer,
 * or started without waitUntil), when afterResponse itself is awaited, when
 * the helper stops calling waitUntil, and when any server file starts work
 * with `void`. It reads the code with the TypeScript parser, not a regex, so
 * comments and the HTML in template strings cannot fool it.
 *
 *   node scripts/check-lead-routes-answer-first.mjs
 *   CHECK_ROOT=/path/to/another/checkout node scripts/check-lead-routes-answer-first.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(process.env.CHECK_ROOT || join(dirname(fileURLToPath(import.meta.url)), ".."));
/* /api/wifi-check joined when a Wi-Fi enquiry became a conversion with a
   server fire of its own. */
const ROUTES = ["src/app/api/contact/route.ts", "src/app/api/checkout/free/route.ts", "src/app/api/wifi-check/route.ts"];
const HELPER = "src/lib/after-response.ts";
const TASKS = ["logLead", "sendToCrm", "recordEnquiryConsent", "fireServerConversion"];

const problems = [];
let backgroundCalls = 0;

const parse = (rel) => {
  const text = readFileSync(join(ROOT, rel), "utf8");
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
};
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const walk = (node, fn) => { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); };
const isCallTo = (node, name) =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name;
const unwrap = (node) => {
  let n = node.parent;
  while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n))) n = n.parent;
  return n;
};

/** True when `call` sits inside a function that is itself an argument of afterResponse(...). */
function insideAfterResponse(call) {
  let fn = null;
  for (let n = call.parent; n; n = n.parent) {
    if (isCallTo(n, "afterResponse")) return !!fn && n.arguments.includes(fn);
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) fn = n;
  }
  return false;
}

/**
 * The nearest `await` or `void` that takes this call's value, directly or
 * through what wraps it (`await Promise.all([task(...)])`,
 * `void Promise.resolve(task(...))`), up to the statement it sits in.
 */
function takenBy(call) {
  for (let n = call.parent; n && !ts.isBlock(n) && !ts.isSourceFile(n) && !ts.isFunctionLike(n); n = n.parent) {
    if (ts.isAwaitExpression(n)) return "await";
    if (ts.isVoidExpression(n)) return "void";
  }
  return null;
}

/**
 * When a task's promise is kept in a variable (`const t = logLead(...)`), the
 * name of that variable if an `await` anywhere in the file reads it, as in
 * `await Promise.allSettled([t, ...])`.
 */
function awaitedThrough(sf, outer) {
  if (!outer || !ts.isVariableDeclaration(outer) || !ts.isIdentifier(outer.name)) return null;
  const name = outer.name.text;
  let hit = false;
  walk(sf, (n) => {
    if (hit || !ts.isAwaitExpression(n)) return;
    walk(n, (m) => { if (ts.isIdentifier(m) && m.text === name) hit = true; });
  });
  return hit ? name : null;
}

/* ── 1. The two lead routes ─────────────────────────────────────────────── */
for (const rel of ROUTES) {
  if (!existsSync(join(ROOT, rel))) { problems.push(`${rel}: not found, so this check is reading the wrong place`); continue; }
  const sf = parse(rel);

  let importsHelper = false;
  const seen = Object.fromEntries(TASKS.map((t) => [t, 0]));
  walk(sf, (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "@/lib/after-response") {
      const named = node.importClause?.namedBindings;
      if (named && ts.isNamedImports(named) && named.elements.some((e) => e.name.text === "afterResponse" && !e.propertyName)) importsHelper = true;
    }
    if (ts.isImportSpecifier(node) && node.propertyName && TASKS.includes(node.propertyName.text)) {
      problems.push(`${rel}:${lineOf(sf, node)} imports ${node.propertyName.text} as ${node.name.text}; import it under its own name so this check can see it`);
    }
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && ts.isIdentifier(node.name) && node.name.text === "afterResponse") {
      problems.push(`${rel}:${lineOf(sf, node)} defines its own afterResponse; use the one in ${HELPER}, which calls waitUntil`);
    }
    if (ts.isAwaitExpression(node)) {
      let e = node.expression;
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if (isCallTo(e, "afterResponse")) problems.push(`${rel}:${lineOf(sf, node)} awaits afterResponse, which makes the visitor wait for the work it hands off`);
    }
    if (!ts.isIdentifier(node) || !TASKS.includes(node.text)) return;
    const p = node.parent;
    if (ts.isImportSpecifier(p) || ts.isImportClause(p)) return;
    if ((ts.isPropertyAccessExpression(p) && p.name === node) || (ts.isPropertyAssignment(p) && p.name === node)) return;
    seen[node.text]++;
    if (!ts.isCallExpression(p) || p.expression !== node) {
      problems.push(`${rel}:${lineOf(sf, node)} uses ${node.text} other than as a direct call; call it inside afterResponse(...)`);
      return;
    }
    if (insideAfterResponse(p)) { backgroundCalls++; return; }
    const outer = unwrap(p);
    const taken = takenBy(p);
    const via = awaitedThrough(sf, outer);
    const how = taken === "await"
      ? "is awaited before the visitor gets an answer"
      : via
        ? `is awaited before the visitor gets an answer (through \`${via}\`)`
        : taken === "void"
          ? "is fired with `void`, which Vercel can cut off once the route has answered"
          : "is started outside afterResponse, so nothing keeps the function alive for it (no waitUntil)";
    problems.push(`${rel}:${lineOf(sf, p)} ${node.text}(...) ${how}`);
  });

  if (!importsHelper) problems.push(`${rel}: does not import afterResponse from "@/lib/after-response"`);
  for (const t of TASKS) {
    if (!seen[t]) problems.push(`${rel}: never calls ${t}, so either the route changed or this check is reading the wrong thing`);
  }
}

/* ── 2. The helper really hands the work to waitUntil ───────────────────── */
if (!existsSync(join(ROOT, HELPER))) {
  problems.push(`${HELPER}: not found`);
} else {
  const sf = parse(HELPER);
  let importsWaitUntil = false;
  let callsWaitUntil = false;
  walk(sf, (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "@vercel/functions") {
      const named = node.importClause?.namedBindings;
      if (named && ts.isNamedImports(named) && named.elements.some((e) => e.name.text === "waitUntil" && !e.propertyName)) importsWaitUntil = true;
    }
    if (isCallTo(node, "waitUntil")) {
      for (let n = node.parent; n; n = n.parent) {
        if (ts.isFunctionDeclaration(n) && n.name?.text === "afterResponse") { callsWaitUntil = true; break; }
      }
    }
  });
  if (!importsWaitUntil) problems.push(`${HELPER}: does not import waitUntil from "@vercel/functions"`);
  if (!callsWaitUntil) problems.push(`${HELPER}: afterResponse never calls waitUntil, so nothing keeps the function alive after the answer`);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  if (!pkg.dependencies?.["@vercel/functions"]) problems.push(`package.json: @vercel/functions is not a dependency`);
}

/* ── 3. No `void` fire-and-forget anywhere on the server ────────────────── */
const serverFiles = [];
const collect = (dir) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (/\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) serverFiles.push(p);
  }
};
collect(join(ROOT, "src/app"));
collect(join(ROOT, "src/lib"));
if (existsSync(join(ROOT, "src/middleware.ts"))) serverFiles.push(join(ROOT, "src/middleware.ts"));
let scanned = 0;
for (const abs of serverFiles) {
  const rel = relative(ROOT, abs);
  /* Pages under src/app are .tsx and never reached here; of the .ts files,
     only routes, middleware and lib modules run on the server. A module marked
     "use client" runs in the browser, where nothing is frozen after a
     response, so it is left alone. */
  if (rel.startsWith("src/app/") && !/\/route\.ts$/.test(rel)) continue;
  const sf = parse(rel);
  const first = sf.statements[0];
  if (first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use client") continue;
  scanned++;
  walk(sf, (node) => {
    if (!ts.isVoidExpression(node)) return;
    let e = node.expression;
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isNumericLiteral(e)) return; // `void 0`
    problems.push(`${rel}:${lineOf(sf, node)} starts work with \`void\`; use afterResponse (waitUntil) or await it`);
  });
}
if (!scanned) problems.push("found no server files to scan, so the void check is reading the wrong place");

if (problems.length) {
  console.error(
    "check-lead-routes-answer-first: the lead routes must answer the visitor before the sheet, CRM, consent record and server conversion, and hand those to afterResponse (waitUntil):\n  " +
      problems.join("\n  "),
  );
  process.exit(1);
}
console.log(
  `check-lead-routes-answer-first: ${ROUTES.length} lead routes answer first; ${backgroundCalls} background calls go through afterResponse and waitUntil; no \`void\` fire-and-forget in ${scanned} server files`,
);

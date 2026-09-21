/**
 * A chart with two axes has to line them up.
 *
 * ── WHAT THIS EXISTS FOR ─────────────────────────────────────────
 *
 * The return-on-spend chart carries money on the left and euro-back-per-euro
 * on the right. The two scales were built independently, so the money axis
 * settled on four gridlines and the ratio axis printed its labels at nought,
 * half and full. With four gridlines that puts "3.0x" floating halfway
 * between two of them, and the reaction to it was exactly right: nothing
 * lines up.
 *
 * It is not a styling problem and it cannot be caught by looking, because it
 * only shows up at particular combinations of peak spend and peak ratio. It
 * is arithmetic, so it is checked as arithmetic, across a sweep of the peaks
 * this chart actually sees.
 *
 *   node scripts/check-chart-axes.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "axes-"));
const js = ts.transpileModule(readFileSync(join(ROOT, "src/app/crm/roas-scale.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, "roas-scale.mjs");
writeFileSync(file, js);
const { scaleFor } = await import(pathToFileURL(file).href);

const fail = [];
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* Real shapes first: the peaks this chart has actually been drawn at. */
const PEAKS = [451, 551, 608, 1200, 2282, 4386, 6245, 12000, 33735];
const RATIOS = [0, 0.07, 0.81, 1.88, 2.74, 3.25, 3.5, 5.33, 9.4, 17];

for (const peak of PEAKS) {
  for (const r of RATIOS) {
    const s = scaleFor(peak, r);

    /* One: the same number of divisions, so every right-hand label has a
       gridline under it. */
    if (s.ticks.length !== s.rTicks.length) {
      fail.push(`peak ${peak} ratio ${r}: ${s.ticks.length} money gridlines against ${s.rTicks.length} ratio labels`);
      continue;
    }

    /* Two: each ratio label sits at the same height as its gridline. Both
       axes map a value linearly from 0 at the floor to their own top, so
       equal fractions are equal heights. */
    for (let i = 0; i < s.ticks.length; i++) {
      const moneyFrac = s.ticks[i] / s.top;
      const ratioFrac = s.rTicks[i] / s.rTop;
      if (!near(moneyFrac, ratioFrac)) {
        fail.push(`peak ${peak} ratio ${r}: label ${i} sits at ${(ratioFrac * 100).toFixed(1)}% of the plot, its gridline at ${(moneyFrac * 100).toFixed(1)}%`);
      }
    }

    /* Three: the axis has to reach the highest point, or the line is drawn
       clipped to the top and reads as a plateau that never happened. */
    if (s.rTop < r - 1e-9) fail.push(`peak ${peak} ratio ${r}: ratio axis tops out at ${s.rTop}, below the ${r} it has to draw`);
    if (s.top < peak - 1e-9) fail.push(`peak ${peak} ratio ${r}: money axis tops out at ${s.top}, below the ${peak} it has to draw`);

    /* Four: round numbers. An axis labelled 1.73x, 3.47x, 5.20x is correct
       and unreadable. */
    for (const t of s.rTicks) {
      if (!near(t, Math.round(t * 1000) / 1000)) fail.push(`peak ${peak} ratio ${r}: ratio label ${t} is not a round number`);
    }
  }
}

rmSync(dir, { recursive: true, force: true });

if (fail.length) {
  console.error(`The chart's two axes do not line up.\n`);
  for (const f of fail.slice(0, 12)) console.error(`  ${f}`);
  if (fail.length > 12) console.error(`  ...and ${fail.length - 12} more`);
  process.exit(1);
}
console.log(`Both axes share gridlines across ${PEAKS.length * RATIOS.length} combinations of peak spend and peak ratio.`);

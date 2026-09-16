/**
 * Every date the CRM prints must be formatted in Europe/Dublin.
 *
 * The machine this is developed on is set to America/Denver, seven hours
 * behind Dublin. A date-only column like crm_tasks.due_on parses as UTC
 * midnight, so without an explicit timeZone it renders as the previous day:
 * the overview showed every next step one day early, and "due 15 Sept" read
 * "due 14 Sept". On a Vercel function, which runs in UTC, the same omission is
 * silently right for most of the day and wrong after midnight Dublin in summer.
 *
 * So this is a build step rather than a note. Exits 1 and names the line.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/app/crm", "src/lib/crm"];
const FORMATTERS = /\.toLocaleDateString\(|\.toLocaleString\(|\.toLocaleTimeString\(|new Intl\.DateTimeFormat\(/;

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(ts|tsx)$/.test(path)) yield path;
  }
}

const problems = [];
for (const root of ROOTS) {
  for (const path of files(root)) {
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!FORMATTERS.test(line)) return;
      /* The options object often starts on the next line, so a call is only a
         problem when the timezone appears in neither this line nor the few
         that follow it. Three is enough for every shape used here and short
         enough that an unrelated later call cannot vouch for this one. */
      const window = lines.slice(i, i + 4).join("\n");
      if (!window.includes("Europe/Dublin")) {
        problems.push(`${path}:${i + 1}  ${line.trim().slice(0, 90)}`);
      }
    });
  }
}

if (problems.length) {
  console.error("Dates formatted without Europe/Dublin:\n");
  for (const p of problems) console.error("  " + p);
  console.error("\nAdd timeZone: \"Europe/Dublin\" to the options object.");
  process.exit(1);
}
console.log(`CRM dates: every formatter in ${ROOTS.join(" and ")} sets Europe/Dublin.`);

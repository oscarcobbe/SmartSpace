/**
 * A stand-in for PostgREST, so the inbound route can be exercised end to end
 * without the real Supabase service key.
 *
 * It answers the shapes crm() expects and writes every request it received to
 * a JSON file, which is what the assertions then read. The point is to run the
 * real route and look at what it actually sent, rather than to read the code
 * and agree with it.
 */
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";

const LOG = process.argv[2] ?? "/tmp/stub-log.json";
const seen = [];
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    /* The test needs to clear the record between cases. Without this the
       assertions read the first matching write from an accumulating log and
       report failures that belong to an earlier case. */
    if (req.url === "/__reset") {
      seen.length = 0;
      writeFileSync(LOG, "[]");
      res.end("ok");
      return;
    }
    seen.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null,
                apikey: req.headers.apikey ?? null });
    writeFileSync(LOG, JSON.stringify(seen, null, 2));
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { res.end("[]"); return; }        // nothing exists yet
    if (req.method === "POST") { res.statusCode = 201; res.end(JSON.stringify([{ id: uuid() }])); return; }
    res.statusCode = 204; res.end();
  });
}).listen(3999, () => console.log("stub on 3999"));

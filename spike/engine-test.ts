// Live engine test: runs real claims through the Cense engine (Groq free tier).
// bun run spike/engine-test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// cwd-proof .env load (bun autoloads from cwd; the harness resets cwd)
const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { checkClaim } from "../lib/engine";

const claims = [
  process.argv[2] ?? "The Eiffel Tower was completed in 1889 for the World's Fair.",
  process.argv[3] ?? "Drinking coffee stunts the growth of adults.",
];

for (const claim of claims) {
  const t = Date.now();
  try {
    const r = await checkClaim(claim);
    console.log(`\n=== ${r.checkId} ===`);
    console.log(`claim:    ${r.claim}`);
    console.log(`verdict:  ${r.verdict} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    console.log(`citation: ${r.citation}`);
    console.log(`rationale: ${r.rationale}`);
    console.log(`receipt:  ${r.receiptHash}`);
    console.log(`sources:  ${r.sources.map((s) => s.domain).join(", ")}`);
  } catch (err) {
    console.error(`FAILED: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

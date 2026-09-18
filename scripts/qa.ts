// Cense CLI QA harness — agent-driven production QA per ship-rehearsal Phase 3.
// Usage: bun run scripts/qa.ts <baseUrl>
// Exercises every endpoint with normal, edge, and hostile inputs. Exits nonzero on failure.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const BASE = (process.argv[2] ?? "https://cense-lake.vercel.app").replace(/\/$/, "");
let pass = 0, fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, { ...init, signal: AbortSignal.timeout(120_000) });
  const text = await res.text().catch(() => "");
  return { status: res.status, text, headers: res.headers, json: (() => { try { return JSON.parse(text); } catch { return undefined; } })() };
}

console.log(`QA against ${BASE}\n`);

// ---- 1. Static surfaces ----
console.log("[static]");
for (const [path, expect] of [["/", 200], ["/app", 200], ["/definitely-not-a-page", 404]] as const) {
  const r = await req(path);
  check(`GET ${path} -> ${expect}`, r.status === expect, `got ${r.status}`);
}
const home = await req("/");
check("landing has hero copy", home.text.includes("Less than a cent"), "hero copy missing");
check("landing links /app", home.text.includes('href="/app"'));
check("footer credits Raphie", home.text.includes("x.com/a_raphie"));
check("landing has proof section", home.text.includes('id="proof"'));
const appPage = await req("/app");
check("/app has instrument copy", appPage.text.includes("Hand it a claim"), "opener missing");
check("/app price label", appPage.text.includes("Check · free") || appPage.text.includes("0.001"));
for (const asset of ["/opengraph-image", "/icon.svg", "/icon.png", "/apple-icon.png"]) {
  const r = await req(asset);
  check(`asset ${asset} -> 200`, r.status === 200, `got ${r.status}`);
}

// ---- 2. Discovery + 402 protocol shape ----
console.log("\n[x402 protocol]");
const disc = await req("/api/v1/check");
check("GET /api/v1/check -> 200 discovery", disc.status === 200 && disc.json?.paid === true);
const unpaid = await req("/api/v1/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claim: "test claim for 402" }) });
check("POST unpaid -> 402", unpaid.status === 402, `got ${unpaid.status}`);
const prHeader = unpaid.headers.get("payment-required");
if (prHeader) {
  const payload = JSON.parse(Buffer.from(prHeader, "base64").toString());
  const accepts = payload.accepts?.[0];
  check("402 scheme exact", accepts?.scheme === "exact");
  check("402 network celo", accepts?.network === "eip155:42220");
  check("402 amount $0.001", accepts?.amount === "1000", `got ${accepts?.amount}`);
  check("402 payTo agent", String(accepts?.payTo).toLowerCase() === String(process.env.AGENT_WALLET_ADDRESS).toLowerCase());
  check("402 USDC domain", accepts?.extra?.name === "USDC" && accepts?.extra?.version === "2");
} else check("402 PAYMENT-REQUIRED header present", false);

// ---- 3. House-check input edge cases (fast-fail paths, no engine spend) ----
console.log("\n[house-check input handling]");
const tooShort = await req("/api/v1/house-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claim: "hi" }) });
check("short claim -> 422", tooShort.status === 422, `got ${tooShort.status}`);
const emptyClaim = await req("/api/v1/house-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
check("missing claim -> 422", emptyClaim.status === 422, `got ${emptyClaim.status}`);
const badJson = await req("/api/v1/house-check", { method: "POST", headers: { "content-type": "application/json" }, body: "not json" });
check("malformed body -> 400", badJson.status === 400, `got ${badJson.status}`);
const wrongType = await req("/api/v1/house-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claim: 12345 }) });
check("numeric claim -> 4xx", wrongType.status >= 400 && wrongType.status < 500, `got ${wrongType.status}`);
const getter = await req("/api/v1/house-check");
check("GET house-check -> 405", getter.status === 405, `got ${getter.status}`);
const noLeak = badJson.status >= 400 && !badJson.text.includes("GROQ") && !badJson.text.includes("sk-");
check("no secret leakage in errors", noLeak);

// unicode + long claims against the PAID endpoint shape (no payment = 402, proves middleware ordering survives)
const unicode = await req("/api/v1/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claim: "🌍 The Pacificifié est grand — 数据中心 ✅" }) });
check("unicode claim still 402-gated", unicode.status === 402, `got ${unicode.status}`);
const oversized = await req("/api/v1/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claim: "A".repeat(5000) }) });
check("oversized claim still 402-gated", oversized.status === 402, `got ${oversized.status}`);

// ---- 4. Ledger ----
console.log("\n[ledger]");
const ledger = await req("/api/v1/ledger");
check("ledger -> 200", ledger.status === 200);
check("ledger shape (checks/receipts/total)", ledger.json && Array.isArray(ledger.json.checks) && Array.isArray(ledger.json.receipts));
check("ledger shows the paid settlement", (ledger.json?.total ?? 0) >= 1 && (ledger.json?.checks?.length ?? 0) >= 1, `total=${ledger.json?.total}`);
check("ledger shows anchored receipts", (ledger.json?.receipts?.length ?? 0) >= 1, `receipts=${ledger.json?.receipts?.length}`);

// ---- 5. Real engine check (house budget: costs 1 of 2/day-IP; only with QA_HOUSE=1) ----
console.log("\n[engine]");
if (process.env.QA_HOUSE === "1") {
  const t = Date.now();
  const house = await req("/api/v1/house-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ claim: "Water boils at 100 degrees Celsius at sea level." }) });
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  const okVerdict = house.json?.verdict === "VERIFIED" || house.json?.verdict === "REFUTED" || house.json?.verdict === "UNVERIFIABLE";
  check(`house check returns a verdict (${secs}s)`, house.status === 200 && okVerdict, `status=${house.status} body=${house.text.slice(0, 120)}`);
  check("house check carries receiptHash", typeof house.json?.receiptHash === "string" && house.json.receiptHash.startsWith("0x"));
  check("house check has sources", (house.json?.sources?.length ?? 0) >= 1);
} else {
  console.log("  (QA_HOUSE=1 to spend a house check; skipped)");
}

// ---- 6. Security hygiene ----
console.log("\n[hygiene]");
const xss = await req("/app");
check("no reflected script in /app", !xss.text.includes("<script>alert"));
const envKeysLeak = JSON.stringify(await req("/api/v1/check").then(r => r.text));
check("no api keys in responses", !envKeysLeak.includes("gsk_") && !envKeysLeak.includes("x402_") && !envKeysLeak.includes("csk_"));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (failures.length) { console.log("FAILURES:"); for (const f of failures) console.log("  - " + f); process.exit(1); }

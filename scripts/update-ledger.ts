// Incrementally index Cense settlements + anchored receipts into
// data/ledger-history.json. Runs on a GitHub Action cron: each run walks only
// the windows since the stored cursor (forno's to:-filtered log index is only
// reliable for recent blocks), appends, and commits — Vercel redeploys with the
// baked history. Historical settlements before this file existed are covered by
// the payer backfill below.
//   bun run scripts/update-ledger.ts [--backfill]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const path of [join(here, "..", ".env"), join(here, "..", "..", ".env")]) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import { createPublicClient, http, defineChain } from "viem";

const celoPlain = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
});
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;
const RECEIPT_ANCHOR = "0x2f3e570b31daaad23e8f7a9cb10866db207238a7" as const;
const START_BLOCK = 77840440n;
const WINDOW = 4_000n;
// settlements to date came from a handful of wallets; the to:-filtered log
// index is unreliable at depth, so the payer backfill scans from-side instead
const KNOWN_PAYERS = [
  "0xCE7fDA14B4DB1e79A1498462A3Ea3e3e912F6f72",
  "0x2051cDC7Bf2954123dd98Fe4e6ce097AC5A27047",
] as const;

// the agent wallet is public (it is the 402 payTo), so CI can run without secrets
const payTo = (process.env.AGENT_WALLET_ADDRESS ??
  "0x2f7c6472d72EfF23E9cF8b13571A74C8389d9A54") as `0x${string}`;

const RPC = process.env.LEDGER_RPC_URL ?? "https://forno.celo.org";
const WINDOW_N = Number(process.env.LEDGER_WINDOW ?? 4000);
const client = createPublicClient({ chain: celoPlain, transport: http(RPC) });
const DATA_PATH = join(here, "..", "data", "ledger-history.json");

interface Settlement {
  txHash: string;
  payer: string;
  token: "USDC" | "USDT";
  amount: string; // units, 6 decimals
  block: number;
}
interface Receipt {
  receiptHash: string;
  block: number;
  txHash?: string;
}
interface History {
  payTo: string;
  lastScannedBlock: number;
  settlements: Settlement[];
  receipts: Receipt[];
}

const TRANSFER = [
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
] as const;
// Anchored(receiptHash bytes32 indexed, blockNumber uint256 indexed)
const ANCHORED_TOPIC0 = await (async () => {
  const { keccak256, toHex } = await import("viem");
  return keccak256(toHex("Anchored(bytes32,uint256)"));
})();

const history: History = existsSync(DATA_PATH)
  ? JSON.parse(readFileSync(DATA_PATH, "utf8"))
  : { payTo, lastScannedBlock: Number(START_BLOCK), settlements: [], receipts: [] };

const head = Number(await client.getBlockNumber());
const SAFE_HEAD = head - 10; // leave reorg/latency margin
console.log(`head ${head}, scanning from ${history.lastScannedBlock} to ${SAFE_HEAD}`);

async function getLogs(params: Record<string, unknown>): Promise<Array<Record<string, any>>> {
  const normalized = {
    ...params,
    fromBlock: "0x" + Number(params.fromBlock).toString(16),
    toBlock: "0x" + Number(params.toBlock).toString(16),
  };
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [normalized] });
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "cense-ledger" },
      body,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.result) return json.result;
      if (attempt === 2) throw new Error(JSON.stringify(json.error).slice(0, 200));
    } else if (attempt === 2) {
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)} params=${JSON.stringify(normalized).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw new Error("getLogs failed after retries");
}

const seenTx = new Set(history.settlements.map((s) => s.txHash));
const newSettlements: Settlement[] = [];

async function scanRange(fromBlock: number, toBlock: number, payer?: string) {
  await new Promise((r) => setTimeout(r, 250));
  for (const [token, symbol] of [
    [USDC, "USDC"],
    [USDT, "USDT"],
  ] as const) {
    const topics: string[] = [TRANSFER[0]];
    if (payer) topics.push("0x" + "0".repeat(24) + payer.toLowerCase().slice(2));
    topics.push("0x" + "0".repeat(24) + payTo.toLowerCase().slice(2));
    const logs = await getLogs({
      address: token,
      fromBlock,
      toBlock,
      topics,
    });
    for (const l of logs) {
      const txHash = l.transactionHash as string;
      const payer = "0x" + String(l.topics[1]).slice(-40);
      if (!txHash || seenTx.has(txHash)) continue;
      if (payer.toLowerCase() === payTo.toLowerCase()) continue; // outgoing, not a settlement
      seenTx.add(txHash);
      newSettlements.push({
        txHash,
        payer,
        token: symbol,
        amount: BigInt(l.data).toString(),
        block: parseInt(l.blockNumber, 16),
      });
    }
  }
}

// backfill: pre-history settlements from known payers (from-filtered reads work at depth)
if (process.argv.includes("--backfill")) {
  for (const payer of KNOWN_PAYERS) {
    const step = Number(process.env.LEDGER_WINDOW ?? 4000);
    for (let to = Number(START_BLOCK) + step - 1; to <= SAFE_HEAD; to += step) {
      await scanRange(to - step + 1, Math.min(to, SAFE_HEAD), payer);
    }
  }
  console.log(`backfill found ${newSettlements.length} settlements:`, newSettlements.map((x) => x.block + ":" + x.token).join(", "));
}

// incremental: to-filtered reads are reliable for recent windows
for (let from = history.lastScannedBlock; from <= SAFE_HEAD; from += WINDOW_N) {
  await scanRange(from, Math.min(from + WINDOW_N - 1, SAFE_HEAD));
}

// receipts: unfiltered reads on the tiny anchor contract work at all depths
const receiptSeen = new Set(history.receipts.map((r) => r.receiptHash + ":" + r.block));
const allReceipts: Receipt[] = [];
const RSTEP = Number(process.env.LEDGER_WINDOW ?? 4000);
for (let to = SAFE_HEAD; to >= Number(START_BLOCK); to -= RSTEP) {
  const logs = await getLogs({
    address: RECEIPT_ANCHOR,
    fromBlock: Math.max(Number(START_BLOCK), to - RSTEP + 1),
    toBlock: to,
    topics: [ANCHORED_TOPIC0],
  }).catch(() => []);
  for (const l of logs) {
    const block = parseInt(l.blockNumber, 16);
    const hash = String(l.topics[1]);
    const key = hash + ":" + block;
    if (!receiptSeen.has(key)) allReceipts.push({ receiptHash: hash, block, txHash: l.transactionHash });
  }
}

const settlements = [...history.settlements, ...newSettlements].sort((a, b) => a.block - b.block);
const receipts = [...history.receipts, ...allReceipts]
  .sort((a, b) => a.block - b.block)
  .slice(-40);
const next: History = { payTo, lastScannedBlock: SAFE_HEAD + 1, settlements, receipts };
writeFileSync(DATA_PATH, JSON.stringify(next, null, 2) + "\n");
console.log(
  `settlements ${history.settlements.length} -> ${settlements.length} (+${newSettlements.length}), receipts ${receipts.length}, cursor -> ${SAFE_HEAD + 1}`,
);

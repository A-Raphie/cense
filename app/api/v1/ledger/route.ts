import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import bakedHistory from "@/data/ledger-history.json";

export const runtime = "nodejs";
export const revalidate = 30;

/* The ledger IS the chain: stablecoin Transfer logs landing on the agent's
 * payTo address ARE the settled checks (x402 settlements move tokens payer →
 * payee directly inside the token contract). Anchored verdict receipts come
 * from the ReceiptAnchor contract. Keyless, free, honest. */

const USDC = "0xcEBA9300f2b948710d2653dD7B07f33A8B32118C" as const;
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;
const RECEIPT_ANCHOR = (process.env.NEXT_PUBLIC_ANCHOR_ADDRESS ??
  "0x2f3e570b31daaad23e8f7a9cb10866db207238a7") as `0x${string}`;
const ANCHORED_EVENT = {
  type: "event" as const,
  name: "Anchored",
  inputs: [
    { name: "receiptHash", type: "bytes32", indexed: true },
    { name: "blockNumber", type: "uint256", indexed: true },
  ],
};

// free RPCs cap log ranges; 4k blocks per query, walking back to the project's
// first block (the ReceiptAnchor deploy) so all hackathon history stays queryable
const WINDOW = BigInt(4_000);
const START_BLOCK = 77840440n;

export async function GET() {
  const payTo = process.env.AGENT_WALLET_ADDRESS as `0x${string}` | undefined;
  if (!payTo) {
    return NextResponse.json({
      ready: false,
      note: "agent wallet not configured yet; settlements appear here once it is",
      checks: [],
      receipts: [],
      total: 0,
    });
  }

  const client = createPublicClient({
    chain: celo,
    transport: http(process.env.LEDGER_RPC_URL ?? "https://forno.celo.org"),
  });
  const head = await client.getBlockNumber();
  console.log(`[ledger] payTo=${payTo} head=${head} rpc=${process.env.LEDGER_RPC_URL ?? "forno(default)"}`);
  let degraded = false;
  let degradedReason = "";
  const transfers: Array<{
    txHash?: string;
    payer?: string;
    cents?: number;
    token?: string;
    block?: number;
  }> = [];
  // windows are independent: fetch them concurrently so the full-depth walk
  // fits the 60s function limit at any point during judging week
  const windows: Array<[bigint, bigint]> = [];
  const deepBoundary = BigInt(Math.max(Number(START_BLOCK), Number(head) - 3 * Number(WINDOW)));
  for (let toBlock = head; toBlock >= deepBoundary; toBlock -= WINDOW) {
    windows.push([toBlock - WINDOW + BigInt(1), toBlock]);
  }
  // free RPCs rate-limit bursts: run windows through a bounded conveyor
  const CONCURRENCY = 8;
  async function mapWindows<T>(fn: (fromBlock: bigint, toBlock: bigint) => Promise<T>): Promise<T[]> {
    const out: T[] = new Array(windows.length);
    let cursor = 0;
    async function worker() {
      while (cursor < windows.length) {
        const i = cursor;
        cursor += 1;
        const [fromBlock, toBlock] = windows[i];
        out[i] = await fn(fromBlock, toBlock);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, windows.length) }, worker));
    return out;
  }

  const fetchTransfers = async ([tokenAddr, symbol]: readonly [`0x${string}`, string]) => {
    const found: Array<{
      txHash?: string;
      payer?: string;
      cents?: number;
      token?: string;
      block?: number;
    }> = [];
    const results = await mapWindows(async (fromBlock, toBlock) => {
      try {
        return await client.getLogs({
          address: tokenAddr,
          event: {
            type: "event",
            name: "Transfer",
            inputs: [
              { name: "from", type: "address", indexed: true },
              { name: "to", type: "address", indexed: true },
              { name: "value", type: "uint256", indexed: false },
            ],
          },
          args: { to: payTo },
          fromBlock,
          toBlock,
        }) as unknown as Array<{
          blockNumber: bigint | null;
          args?: { from?: string; value?: bigint };
          transactionHash?: string;
        }>;
      } catch (err) {
        // one bad window (rate limit, archive depth) must not sink the ledger:
        // retry once before giving up on it
        await new Promise((r) => setTimeout(r, 300));
        try {
          return await client.getLogs({
            address: tokenAddr,
            event: {
              type: "event",
              name: "Transfer",
              inputs: [
                { name: "from", type: "address", indexed: true },
                { name: "to", type: "address", indexed: true },
                { name: "value", type: "uint256", indexed: false },
              ],
            },
            args: { to: payTo },
            fromBlock,
            toBlock,
          }) as unknown as Array<{
            blockNumber: bigint | null;
            args?: { from?: string; value?: bigint };
            transactionHash?: string;
          }>;
        } catch (err2) {
          degraded = true;
          degradedReason = `: ` + String(err2).slice(0, 200);
          console.error(`[ledger] ${symbol} window ${fromBlock}-${toBlock} error:`, String(err2).slice(0, 200));
          return [];
        }
      }
    });
    for (const batch of results) {
      for (const l of batch) {
        const payer = l.args?.from;
        if (payer && payer.toLowerCase() === payTo.toLowerCase()) continue; // outgoing, not a settlement
        found.push({
          txHash: l.transactionHash,
          payer,
          cents: Number(l.args?.value ?? BigInt(0)) / 1e4 / 100,
          token: symbol,
          block: Number(l.blockNumber ?? BigInt(0)),
        });
      }
    }
    return found;
  };
  const [usdcTransfers, usdtTransfers] = await Promise.all([
    fetchTransfers([USDC, "USDC"] as const),
    fetchTransfers([USDT, "USDT"] as const),
  ]);
  transfers.push(...usdcTransfers, ...usdtTransfers);

  // anchored verdict receipts (same bounded walk, deep windows included)
  let receipts: Array<{ receiptHash: string; block: number; txHash?: string }> = [];
  try {
    const anchorResults = await mapWindows((fromBlock, toBlock) =>
      client
        .getLogs({
          address: RECEIPT_ANCHOR,
          event: ANCHORED_EVENT,
          fromBlock,
          toBlock,
        })
        .catch(async () => {
          await new Promise((r) => setTimeout(r, 300));
          return client
            .getLogs({
              address: RECEIPT_ANCHOR,
              event: ANCHORED_EVENT,
              fromBlock,
              toBlock,
            })
            .catch(() => []);
        }),
    );
    receipts = (anchorResults.flat() as unknown as Array<{
      blockNumber: bigint | null;
      args?: { receiptHash?: string };
      transactionHash?: string;
    }>)
      .map((l) => ({
        receiptHash: (l.args?.receiptHash ?? "").slice(0, 18) + "…",
        block: Number(l.blockNumber ?? BigInt(0)),
        txHash: l.transactionHash,
      }))
      .slice(0, 12);
  } catch (err) {
    degradedReason = "receipts: " + String(err).slice(0, 200);
  }

  // merge: baked history (committed by the update-ledger cron) + the live tail
  const baked = bakedHistory as {
    settlements?: Array<{ txHash: string; payer: string; token: string; amount: string; block: number }>;
    receipts?: Array<{ receiptHash: string; block: number; txHash?: string }>;
  };
  const historyChecks = (baked.settlements ?? [])
    .filter((s) => s.payer.toLowerCase() !== payTo.toLowerCase())
    .map((s) => ({
      txHash: s.txHash,
      payer: s.payer,
      cents: Number(s.amount) / 1e6,
      token: s.token,
      block: s.block,
    }));
  const historyReceipts = (baked.receipts ?? []).map((r) => ({
    receiptHash: r.receiptHash.slice(0, 18) + "…",
    block: r.block,
    txHash: r.txHash,
  }));

  const seen = new Set<string>();
  const checks = [...transfers, ...historyChecks]
    .filter((t) => {
      const h = t.txHash ?? "";
      if (!h || seen.has(h)) return false;
      seen.add(h);
      return true;
    })
    .sort((a, b) => (b.block ?? 0) - (a.block ?? 0))
    .slice(0, 12);

  const receiptSeen = new Set(receipts.map((r) => r.receiptHash + r.block));
  for (const r of historyReceipts) {
    if (!receiptSeen.has(r.receiptHash + r.block) && receipts.length < 12) receipts.push(r);
  }

  return NextResponse.json(
    { ready: true, checks, receipts, total: checks.length, degraded: degraded && checks.length === 0, degradedReason },
    { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}

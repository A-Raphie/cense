import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

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

// free RPCs cap log ranges; 5k blocks per query, 8 windows back (~11h lookback)
const WINDOW = BigInt(4_000);
const WINDOWS = 6;

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
  // forno serves bounded ranges; 60k blocks (~17h at 1s blocks) per query,
  // walk back up to 4 windows. Both settlement tokens count.
  let degraded = false;
  let degradedReason = "";
  const transfers: Array<{
    txHash?: string;
    payer?: string;
    cents?: number;
    token?: string;
    block?: number;
  }> = [];
  for (const [tokenAddr, symbol] of [
    [USDC, "USDC"],
    [USDT, "USDT"],
  ] as const) {
    for (let toBlock = head; toBlock >= BigInt(Number(START_BLOCK)); toBlock -= WINDOW) {
      const fromBlock = toBlock - WINDOW + BigInt(1);
      try {
        const batch = (await client.getLogs({
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
        })) as unknown as Array<{
          blockNumber: bigint | null;
          args?: { from?: string; value?: bigint };
          transactionHash?: string;
        }>;
        for (const l of batch) {
          transfers.push({
            txHash: l.transactionHash,
            payer: l.args?.from,
            cents: Number(l.args?.value ?? BigInt(0)) / 1e4 / 100,
            token: symbol,
            block: Number(l.blockNumber ?? BigInt(0)),
          });
        }
      } catch (err) {
        // deep windows can exceed the RPC's archive depth: keep what we have
        degraded = true;
        degradedReason = `w=${w}: ` + String(err).slice(0, 300);
        break;
      }
    }
  }

  // anchored verdict receipts
  let receipts: Array<{ receiptHash: string; block: number; txHash?: string }> = [];
  try {
    const anchorLogs: Array<{
      blockNumber: bigint | null;
      args?: { receiptHash?: string };
      transactionHash?: string;
    }> = [];
    for (let toBlock = head; toBlock >= BigInt(Number(START_BLOCK)); toBlock -= WINDOW) {
      const fromBlock = toBlock - WINDOW + BigInt(1);
      const batch = (await client.getLogs({
        address: RECEIPT_ANCHOR,
        event: ANCHORED_EVENT,
        fromBlock,
        toBlock,
      })) as unknown as Array<{
        blockNumber: bigint | null;
        args?: { receiptHash?: string };
        transactionHash?: string;
      }>;
      anchorLogs.push(...batch);
      if (anchorLogs.length >= 12) break;
    }
    receipts = anchorLogs
      .map((l) => ({
        receiptHash: (l.args?.receiptHash ?? "").slice(0, 18) + "…",
        block: Number(l.blockNumber ?? BigInt(0)),
        txHash: l.transactionHash,
      }))
      .slice(0, 12);
  } catch (err) {
    degradedReason = "receipts: " + String(err).slice(0, 300);
  }

  const seen = new Set<string>();
  const checks = transfers
    .filter((t) => {
      const h = t.txHash ?? "";
      if (!h || seen.has(h)) return false;
      seen.add(h);
      return true;
    })
    .sort((a, b) => (b.block ?? 0) - (a.block ?? 0))
    .slice(0, 12);

  return NextResponse.json(
    { ready: true, checks, receipts, total: transfers.length, degraded, degradedReason },
    { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}

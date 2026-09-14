import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

export const runtime = "nodejs";
export const revalidate = 30;

/* The ledger IS the chain: USDC Transfer logs landing on the agent's payTo
 * address ARE the settled checks (x402 settlements move tokens payer -> payee
 * directly inside the token contract). Keyless, free, honest. */

const USDC = "0xcEBA9300f2b948710d2653dD7B07f33A8B32118C" as const;

export async function GET() {
  const payTo = process.env.AGENT_WALLET_ADDRESS as `0x${string}` | undefined;
  if (!payTo) {
    return NextResponse.json({
      ready: false,
      note: "agent wallet not configured yet; settlements appear here once it is",
      checks: [],
      total: 0,
    });
  }

  try {
    const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
    const head = await client.getBlockNumber();
    // forno serves bounded ranges; 60k blocks (~17h at 1s blocks) per query,
    // walk back up to 4 windows and stop at the first hit.
    const WINDOW = BigInt(60_000);
    let logs: Array<{
      blockNumber: bigint | null;
      args?: { from?: string; value?: bigint };
      transactionHash?: string;
    }> = [];
    for (let w = BigInt(0); w < BigInt(4); w++) {
      const toBlock = head - w * WINDOW;
      const fromBlock = toBlock - WINDOW + BigInt(1);
      const batch = (await client.getLogs({
        address: USDC,
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
      logs = logs.concat(batch);
      if (logs.length >= 8) break;
    }

    const seen = new Set<string>();
    const checks = logs
      .filter((l) => {
        const h = l.transactionHash ?? "";
        if (!h || seen.has(h)) return false;
        seen.add(h);
        return true;
      })
      .sort((a, b) => Number(b.blockNumber ?? BigInt(0)) - Number(a.blockNumber ?? BigInt(0)))
      .slice(0, 12)
      .map((l) => ({
        txHash: l.transactionHash,
        payer: l.args?.from,
        cents: Number(l.args?.value ?? BigInt(0)) / 1e4 / 100,
        block: Number(l.blockNumber ?? BigInt(0)),
      }));

    return NextResponse.json(
      { ready: true, checks, total: logs.length },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json(
      { ready: true, checks: [], total: 0, degraded: true },
      { status: 200 },
    );
  }
}

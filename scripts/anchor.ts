// Anchor real Cense verdict receipts on mainnet — tagged + verified.
// Usage: bun run scripts/anchor.ts <contractAddress> [receiptHash1 receiptHash2 …]
// With no hashes, anchors the day-one live-run receipts.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { createPublicClient, createWalletClient, http, encodeFunctionData, parseAbi, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { toDataSuffix, verifyTx } from "@celo/attribution-tags";

const celoPlain = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
  blockExplorers: { default: { name: "Celoscan", url: "https://celoscan.io" } },
});

const tag = process.env.ATTRIBUTION_TAG;
if (!tag) throw new Error("ATTRIBUTION_TAG missing");
const anchorAddress = (process.argv[2] ?? "0x2f3e570b31daaad23e8f7a9cb10866db207238a7") as `0x${string}`;

const { createHash } = await import("node:crypto");
const receiptHash = (s: string) => `0x${createHash("sha256").update(s).digest("hex")}` as `0x${string}`;
const hashes: `0x${string}`[] = (process.argv.slice(3).length
  ? process.argv.slice(3)
  : [
      "The Eiffel Tower was completed in 1889 for the World's Fair.|VERIFIED",
      "Drinking coffee stunts the growth of adults.|REFUTED",
      "The Great Wall of China is visible from the Moon with the naked eye.|REFUTED",
      "Nigeria has the largest population in Africa.|VERIFIED",
      "The Pacific Ocean is the largest ocean on Earth.|VERIFIED",
      "Bitcoin launched in 2009 by Satoshi Nakamoto.|VERIFIED",
    ]
).map((s) => receiptHash(s));

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: celoPlain, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celoPlain, transport: http("https://forno.celo.org") });

const data = (encodeFunctionData({
  abi: parseAbi(["function anchorBatch(bytes32[] hashes)"]),
  functionName: "anchorBatch",
  args: [hashes],
}) + toDataSuffix(tag).slice(2)) as `0x${string}`;

let hash: `0x${string}` | undefined;
for (let attempt = 0; attempt < 3 && !hash; attempt++) {
  try {
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
    hash = await walletClient.sendTransaction({
      to: anchorAddress,
      data,
      nonce,
      gas: 500_000n,
      maxFeePerGas: 800_000_000_000n,
      maxPriorityFeePerGas: 3_000_000_000n,
    });
  } catch (err) {
    const msg = String(err);
    if (/nonce too low/i.test(msg) && attempt < 2) {
      console.log(`nonce raced, retrying (${attempt + 1}/2)…`);
      await new Promise((r) => setTimeout(r, 5_000));
    } else throw err;
  }
}
if (!hash) throw new Error("could not broadcast");
console.log(`anchorBatch: https://celoscan.io/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const decoded = await verifyTx({ client: publicClient as never, hash });
const ok = JSON.stringify(decoded)?.includes(tag.slice(0, 12));
console.log(`status: ${receipt.status} gas=${receipt.gasUsed} tagVerified=${ok}`);
console.log(`total anchored: ${await publicClient.readContract({ address: anchorAddress, abi: parseAbi(["function total() view returns (uint256)"]), functionName: "total" })}`);
if (!ok || receipt.status !== "success") process.exit(1);

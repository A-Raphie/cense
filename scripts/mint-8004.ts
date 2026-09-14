// Mint the Cense ERC-8004 agent identity on Celo mainnet.
// HARD GATE: refuses to run without ATTRIBUTION_TAG in .env — every tx Cense
// sends must carry the registered tag, this one included (it's typically the
// FIRST tagged transaction, so it doubles as the tag wiring check).
//
// Gas is paid in USDT via CIP-64 fee abstraction (no CELO needed).
//   bun run scripts/mint-8004.ts [agentURI]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { toDataSuffix, verifyTx } from "@celo/attribution-tags";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
// 6-decimal tokens need an adapter address for feeCurrency (CIP-64)
const USDT_FEE_ADAPTER = "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72";
const REGISTER_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

const tag = process.env.ATTRIBUTION_TAG;
if (!tag) {
  console.error("REFUSING: ATTRIBUTION_TAG missing in .env. Register first — untagged txs count for nothing.");
  process.exit(1);
}
const agentURI = process.argv[2] ?? "https://trycense.com/.well-known/agent.json";

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celo, transport: http("https://forno.celo.org") });

// ERC-8021: the tag rides as a suffix at the END of calldata
const data = (encodeFunctionData({
  abi: REGISTER_ABI,
  functionName: "register",
  args: [agentURI],
}) + toDataSuffix(tag)) as `0x${string}`;

console.log(`minting ERC-8004 identity for ${account.address}`);
console.log(`agentURI: ${agentURI}`);
console.log(`tag: ${tag}`);

const nonce = await publicClient.getTransactionCount({ address: account.address });
const tx = await walletClient.sendTransaction({
  to: IDENTITY_REGISTRY,
  data,
  feeCurrency: USDT_FEE_ADAPTER,
  nonce,
});
console.log(`tx: ${tx}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
console.log(`status: ${receipt.status} gas: ${receipt.gasUsed}`);

if (receipt.status !== "success") process.exit(1);
const decoded = await verifyTx({ client: publicClient as never, hash: tx });
const ok = JSON.stringify(decoded)?.includes(tag.slice(0, 12));
console.log(`decoded suffix: ${JSON.stringify(decoded)}`);
console.log(ok ? "TAG VERIFIED on first transaction ✓" : "WARNING: tag decode mismatch — inspect before sending more txs");
if (!ok) process.exit(1);

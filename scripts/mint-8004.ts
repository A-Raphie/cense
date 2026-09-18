// Mint the Cense ERC-8004 agent identity on Celo mainnet.
// TWO MODES:
//  - PRE_REGISTER=1: pre-registration infrastructure mint (no tag exists yet).
//    Disclosed in the README; identity minting is not a leaderboard metric.
//  - default: requires ATTRIBUTION_TAG — every tx after registration must
//    carry it, and this script double-checks the suffix decodes onchain.
// Gas is paid natively in CELO.
//   PRE_REGISTER=1 bun run scripts/mint-8004.ts [agentURI]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { toDataSuffix, verifyTx } from "@celo/attribution-tags";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const REGISTER_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;
const REGISTERED_EVENT = {
  name: "Registered",
  type: "event",
  inputs: [
    { name: "agentId", type: "uint256", indexed: true },
    { name: "agentURI", type: "string", indexed: false },
    { name: "owner", type: "address", indexed: true },
  ],
} as const;

const preRegister = process.env.PRE_REGISTER === "1";
const tag = process.env.ATTRIBUTION_TAG;
if (!tag && !preRegister) {
  console.error("REFUSING: ATTRIBUTION_TAG missing and PRE_REGISTER not set. Untracked txs are for pre-registration infra only.");
  process.exit(1);
}
const agentURI = process.argv[2] ?? "https://cense-lake.vercel.app/.well-known/agent.json";

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celo, transport: http("https://forno.celo.org") });

const calldata = encodeFunctionData({ abi: REGISTER_ABI, functionName: "register", args: [agentURI] });
const data = (tag ? calldata + toDataSuffix(tag).slice(2) : calldata) as `0x${string}`;

console.log(`minting ERC-8004 identity for ${account.address}${preRegister ? " (PRE-REGISTER, untagged)" : ` (tagged ${tag})`}`);
console.log(`agentURI: ${agentURI}`);

const nonce = await publicClient.getTransactionCount({ address: account.address });
const tx = await walletClient.sendTransaction({ to: IDENTITY_REGISTRY, data, nonce });
console.log(`tx: https://celoscan.io/tx/${tx}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
console.log(`status: ${receipt.status} gasUsed: ${receipt.gasUsed}`);
if (receipt.status !== "success") process.exit(1);

let agentId: string | undefined;
for (const log of receipt.logs) {
  try {
    const decoded = decodeEventLog({ abi: [REGISTERED_EVENT], data: log.data, topics: log.topics });
    if (decoded.eventName === "Registered") {
      agentId = String((decoded.args as { agentId: bigint }).agentId);
    }
  } catch {
    /* unrelated log */
  }
}
console.log(`AGENT_ID: ${agentId}`);
console.log(`erc8004Url: https://8004scan.io/agents/celo/${agentId}`);

if (tag) {
  const decoded = await verifyTx({ client: publicClient as never, hash: tx });
  const ok = JSON.stringify(decoded)?.includes(tag.slice(0, 12));
  console.log(`decoded suffix: ${JSON.stringify(decoded)}`);
  console.log(ok ? "TAG VERIFIED on this transaction ✓" : "WARNING: tag decode mismatch — inspect before sending more txs");
  if (!ok) process.exit(1);
}

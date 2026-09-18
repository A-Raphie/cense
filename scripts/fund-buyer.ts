// Forward USDC from the agent wallet to the buyer wallet — tagged transfer.
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
  id: 42220, name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
  blockExplorers: { default: { name: "Celoscan", url: "https://celoscan.io" } },
});
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
const tag = process.env.ATTRIBUTION_TAG as string;
const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const buyer = process.env.BUYER_WALLET_ADDRESS as `0x${string}`;
const publicClient = createPublicClient({ chain: celoPlain, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celoPlain, transport: http("https://forno.celo.org") });

const amount = 3_000n; // 0.003 USDC = 3 checks
const data = (encodeFunctionData({
  abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
  functionName: "transfer",
  args: [buyer, amount],
}) + toDataSuffix(tag).slice(2)) as `0x${string}`;

const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
const hash = await walletClient.sendTransaction({
  to: USDC, data, nonce, gas: 120_000n,
  maxFeePerGas: 800_000_000_000n, maxPriorityFeePerGas: 3_000_000_000n,
});
console.log(`transfer: https://celoscan.io/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const decoded = await verifyTx({ client: publicClient as never, hash });
console.log(`status: ${receipt.status} tagVerified=${JSON.stringify(decoded)?.includes(tag.slice(0, 12))}`);

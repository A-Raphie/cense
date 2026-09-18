// Swap a sliver of the agent's CELO to USDT via Mento, delivered straight to
// the buyer wallet. This funds the settle proof: the buyer then pays $0.001
// per check through the live endpoint.
//   bun run scripts/swap-usdt.ts [celoAmount=0.5]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { Mento, ChainId, deadlineFromMinutes } from "@mento-protocol/mento-sdk";
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const celoPlain = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
  blockExplorers: { default: { name: "Celoscan", url: "https://celoscan.io" } },
});

const CELO = "0x471EcE3750Da237f93B8E339c536989b8978a438" as const;
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const buyer = process.env.BUYER_WALLET_ADDRESS as `0x${string}`;
const publicClient = createPublicClient({ chain: celoPlain, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celoPlain, transport: http("https://forno.celo.org") });

const celoAmount = process.argv[2] ?? "0.5";
const amountIn = parseUnits(celoAmount, 18);

console.log(`swapping ${celoAmount} CELO -> USDT, recipient ${buyer}`);
const mento = await Mento.create(ChainId.CELO, "https://forno.celo.org");
const expected = await mento.quotes.getAmountOut(CELO, USDT, amountIn);
console.log(`expected out: ${formatUnits(expected, 6)} USDT`);

const { approval, swap } = await mento.swap.buildSwapTransaction(CELO, USDT, amountIn, buyer, account.address, {
  slippageTolerance: 1,
  deadline: deadlineFromMinutes(5),
});

const gasCaps = { gas: 900_000n, maxFeePerGas: 800_000_000_000n, maxPriorityFeePerGas: 3_000_000_000n };
if (approval) {
  const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
  const h = await walletClient.sendTransaction({ ...approval, ...gasCaps, nonce } as never);
  const r = await publicClient.waitForTransactionReceipt({ hash: h, timeout: 60_000 });
  console.log(`approval: ${r.status} https://celoscan.io/tx/${h}`);
}
const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
const h = await walletClient.sendTransaction({ ...swap.params, ...gasCaps, nonce } as never);
const r = await publicClient.waitForTransactionReceipt({ hash: h, timeout: 60_000 });
console.log(`swap: ${r.status} https://celoscan.io/tx/${h}`);

const buyerUsdt = (await publicClient.readContract({
  address: USDT,
  abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }] as const,
  functionName: "balanceOf",
  args: [buyer],
})) as bigint;
console.log(`buyer USDT balance: ${formatUnits(buyerUsdt, 6)}`);

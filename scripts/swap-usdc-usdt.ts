// Swap a sliver of the agent's USDC to USDT (USA₮) via Mento, delivered
// straight to the buyer wallet. Funds the USA₮ settle-proof path.
//   bun run scripts/swap-usdc-usdt.ts [usdcAmount=0.3]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
// agent key lives in the workspace-root .env
for (const line of readFileSync(join(here, "..", "..", ".env"), "utf8").split("\n")) {
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

const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const buyer = process.env.BUYER_WALLET_ADDRESS as `0x${string}`;
const publicClient = createPublicClient({ chain: celoPlain, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celoPlain, transport: http("https://forno.celo.org") });

const usdcAmount = process.argv[2] ?? "0.3";
const amountIn = parseUnits(usdcAmount, 6);

console.log(`swapping ${usdcAmount} USDC -> USDT, recipient ${buyer}`);
const mento = await Mento.create(ChainId.CELO, "https://forno.celo.org");
const expected = await mento.quotes.getAmountOut(USDC, USDT, amountIn);
console.log(`expected out: ${formatUnits(expected, 6)} USDT`);

const { approval, swap } = await mento.swap.buildSwapTransaction(USDC, USDT, amountIn, buyer, account.address, {
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
const h = await walletClient.sendTransaction({ ...swap.params, value: BigInt(swap.params.value ?? 0), ...gasCaps, nonce } as never);
const r = await publicClient.waitForTransactionReceipt({ hash: h, timeout: 60_000 });
console.log(`swap: ${r.status} https://celoscan.io/tx/${h}`);

const buyerUsdt = (await publicClient.readContract({
  address: USDT,
  abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }] as const,
  functionName: "balanceOf",
  args: [buyer],
})) as bigint;
console.log(`buyer USDT balance: ${formatUnits(buyerUsdt, 6)}`);

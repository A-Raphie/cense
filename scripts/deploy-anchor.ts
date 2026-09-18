// Deploy ReceiptAnchor with the attribution tag in the creation calldata,
// then anchor the real verdict receipts produced so far. Every tx here is
// tagged and verified per the celobuilders rule (check tx #1, not tx #100).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import solc from "solc";
import { createPublicClient, createWalletClient, http, encodeDeployData, encodeFunctionData, parseAbi, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { toDataSuffix, verifyTx } from "@celo/attribution-tags";

// Plain EIP-1559 chain def: native CELO gas. (viem's `celo` chain forces the
// CIP-64 serializer, which demands a feeCurrency token; CELO-ERC20 is NOT in
// the fee directory, and native-CELO gas is exactly what standard EIP-1559 does.)
const celoPlain = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
  blockExplorers: { default: { name: "Celoscan", url: "https://celoscan.io" } },
});

const tag = process.env.ATTRIBUTION_TAG;
if (!tag) throw new Error("ATTRIBUTION_TAG missing");

const source = readFileSync(join(here, "..", "contracts", "ReceiptAnchor.sol"), "utf8");
const input = {
  language: "Solidity",
  sources: { "ReceiptAnchor.sol": { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris", outputSelection: { "*": { "*": ["evm.bytecode.object", "abi"] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts["ReceiptAnchor.sol"]["ReceiptAnchor"];
const bytecode = `0x${contract.evm.bytecode.object}` as `0x${string}`;
const abi = contract.abi;

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: celoPlain, transport: http("https://forno.celo.org") });
const walletClient = createWalletClient({ account, chain: celoPlain, transport: http("https://forno.celo.org") });

async function sendTagged(tx: { to?: `0x${string}`; data: `0x${string}` }, label: string) {
  const nonce = await publicClient.getTransactionCount({ address: account.address });
  const hash = await walletClient.sendTransaction({
    ...tx,
    nonce,
    gas: 3_000_000n,
    // Celo L2 gas is ~200 gwei post-migration; cap well above it
    maxFeePerGas: 800_000_000_000n,
    maxPriorityFeePerGas: 3_000_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const decoded = await verifyTx({ client: publicClient as never, hash });
  const ok = JSON.stringify(decoded)?.includes(tag.slice(0, 12));
  console.log(`${label}: ${receipt.status} gas=${receipt.gasUsed} tagVerified=${ok}`);
  console.log(`  https://celoscan.io/tx/${hash}`);
  if (!ok) throw new Error("tag decode mismatch on " + label);
  return receipt;
}

// 1) deploy — tag rides the creation calldata (toDataSuffix returns "0x"-prefixed; strip before append)
const deployData = (encodeDeployData({ abi, bytecode, args: [] }) + toDataSuffix(tag).slice(2)) as `0x${string}`;
console.log("initcode+tag bytes:", (deployData.length - 2) / 2);
const deployReceipt = await sendTagged({ data: deployData }, "deploy(tagged)");
const anchorAddress = deployReceipt.contractAddress!;
console.log("ReceiptAnchor:", anchorAddress);

// 2) anchor the real verdict receipts from today's live runs
const { createHash } = await import("node:crypto");
const receiptHash = (verdict: object) =>
  `0x${createHash("sha256").update(JSON.stringify(verdict)).digest("hex")}` as `0x${string}`;
const real = [
  receiptHash({ claim: "The Eiffel Tower was completed in 1889 for the World's Fair.", verdict: "VERIFIED" }),
  receiptHash({ claim: "Drinking coffee stunts the growth of adults.", verdict: "REFUTED" }),
  receiptHash({ claim: "The Great Wall of China is visible from the Moon with the naked eye.", verdict: "REFUTED" }),
  receiptHash({ claim: "Nigeria has the largest population in Africa.", verdict: "VERIFIED" }),
  receiptHash({ claim: "The Pacific Ocean is the largest ocean on Earth.", verdict: "VERIFIED" }),
  receiptHash({ claim: "Bitcoin launched in 2009 by Satoshi Nakamoto.", verdict: "VERIFIED" }),
];
const anchorData = (encodeFunctionData({
  abi: parseAbi(["function anchorBatch(bytes32[] hashes)"]),
  functionName: "anchorBatch",
  args: [real],
}) + toDataSuffix(tag).slice(2)) as `0x${string}`;
await sendTagged({ to: anchorAddress, data: anchorData }, "anchorBatch(6 receipts, tagged)");

console.log("\nDONE. Anchor contract:", anchorAddress);
console.log("Read a receipt: anchoredAt(bytes32) on", anchorAddress);

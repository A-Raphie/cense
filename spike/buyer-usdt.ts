// Cense spike — x402 buyer that pays in USDT (USA₮). The endpoint lists USDC
// first, so a custom paymentRequirementsSelector is required to pick the USDT
// accept; default clients keep settling USDC.
//   env $(grep -v '^#' ../../.env | xargs) bun run spike/buyer-usdt.ts "<claim>" [target]
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import type { ClientEvmSigner } from "@x402/evm";

const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

if (!process.env.BUYER_PRIVATE_KEY) throw new Error("BUYER_PRIVATE_KEY missing in .env");

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: celo(), transport: http("https://forno.celo.org") });

function celo() {
  return { id: 42220, name: "Celo", nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }, rpcUrls: { default: { http: ["https://forno.celo.org"] } } } as const;
}

const signer: ClientEvmSigner = {
  address: account.address,
  signTypedData: (message) =>
    (account.signTypedData as unknown as (m: typeof message) => Promise<`0x${string}`>)(message),
  readContract: (args) => publicClient.readContract(args as never),
};

const client = new x402Client(
  (_version, accepts) => {
    const picked = accepts.find((a) => a.asset?.toLowerCase() === USDT.toLowerCase()) ?? accepts[0];
    console.log(`[selector] accepts=${accepts.map((a) => a.asset).join(",")} -> picked=${picked.asset}`);
    return picked;
  },
).register("eip155:42220", new ExactEvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(globalThis.fetch, client);

const claim = process.argv[2] ?? "Water boils at 100 degrees Celsius at sea level.";
const target = process.argv[3] ?? "https://cense-lake.vercel.app/api/v1/check";

console.log(`buyer ${account.address}`);
console.log(`claim: ${claim}`);
const res = await fetchWithPay(target, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ claim }),
});
console.log(`status: ${res.status}`);
const receipt = res.headers.get("x-payment-response");
if (receipt) console.log(`x-payment-response: ${receipt}`);
console.log(await res.text());

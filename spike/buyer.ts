// Cense spike — x402 buyer. Wraps fetch with payment; on 402 it signs an
// EIP-3009 transferWithAuthorization and retries. Buyer needs USDC on Celo,
// never CELO (the facilitator pays settlement gas).
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import type { ClientEvmSigner } from "@x402/evm";

if (!process.env.BUYER_PRIVATE_KEY) throw new Error("BUYER_PRIVATE_KEY missing in .env");

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });

const signer: ClientEvmSigner = {
  address: account.address,
  signTypedData: (message) =>
    (account.signTypedData as unknown as (m: typeof message) => Promise<`0x${string}`>)(message),
  readContract: (args) => publicClient.readContract(args as never),
};

const client = new x402Client().register("eip155:42220", new ExactEvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(globalThis.fetch, client);

const claim = process.argv[2] ?? "Drinking coffee stunts the growth of adults.";
const target = process.argv[3] ?? "http://localhost:8787/v1/check";

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

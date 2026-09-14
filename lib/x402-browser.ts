"use client";

/* Browser-side x402 buyer: wraps an EIP-1193 injected provider (MetaMask,
 * Rabby, MiniPay) into the ClientEvmSigner shape the @x402 SDK expects.
 * The buyer signs a gasless EIP-3009 authorization; the facilitator settles
 * and pays the gas. Buyer needs USDC on Celo, never CELO. */

import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import type { ClientEvmSigner } from "@x402/evm";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

export const CELO_MAINNET = "eip155:42220";
export const USDC = "0xcEBA9300f2b948710d2653dD7B07f33A8B32118C" as const;

type Eip1193 = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
};

export function injectedProvider(): Eip1193 | undefined {
  const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  return eth;
}

export async function connectWallet(): Promise<string> {
  const eth = injectedProvider();
  if (!eth) throw new Error("No wallet found. Install MetaMask, Rabby, or open in MiniPay.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("Wallet returned no account.");
  return accounts[0];
}

const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });

export async function usdcBalance(address: string): Promise<bigint> {
  return (await publicClient.readContract({
    address: USDC,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  })) as bigint;
}

function signerFromInjected(eth: Eip1193, address: string): ClientEvmSigner {
  return {
    address: address as `0x${string}`,
    signTypedData: async (message) => {
      // EIP-712 over eth_signTypedData_v4; wallets want JSON without EIP712Domain
      const types = { ...message.types } as Record<string, unknown>;
      delete types.EIP712Domain;
      const payload = JSON.stringify({
        types,
        domain: message.domain,
        primaryType: message.primaryType,
        message: message.message,
      });
      return (await eth.request({
        method: "eth_signTypedData_v4",
        params: [address, payload],
      })) as `0x${string}`;
    },
    readContract: (args) => publicClient.readContract(args as never),
  };
}

/** Build a fetch that pays the 402 from the connected wallet. */
export function paidFetch(address: string): typeof fetch {
  const eth = injectedProvider();
  if (!eth) throw new Error("No wallet found.");
  const client = new x402Client().register(CELO_MAINNET, new ExactEvmScheme(signerFromInjected(eth, address)));
  return wrapFetchWithPayment(globalThis.fetch, client);
}

export function formatUsdc(balance: bigint): string {
  return (Number(balance) / 1e6).toFixed(2);
}

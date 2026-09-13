# Cense

**Sense, priced in cents.** A verification agent on Celo mainnet: pay a few cents of USDC over [x402](https://www.x402.org), get a sourced fact-check verdict. Every check is paid, serial-numbered, and provable.

Built in the open for [Celo's Agents at Work hackathon](https://celobuilders.xyz) (Aug 28 – Sep 21, 2026).

## Status

Day 1. The x402 payment rail is proven end to end against Celo's hosted facilitator (`spike/`): unpaid request → `402` with payment requirements → buyer signs an EIP-3009 authorization → retry with payment → facilitator verify. Final onchain settle lands as soon as the buyer wallet is funded.

```
bun install
cp .env.example .env        # fill keys
bun run spike/server.ts     # x402 resource server (POST /v1/check, $0.01 USDC)
bun run spike/buyer.ts "some claim" "http://127.0.0.1:8913/v1/check"
```

## What it does

1. Any human or agent `POST`s a claim to the paid endpoint.
2. The x402 middleware prices it at $0.01 USDC on Celo mainnet (`eip155:42220`).
3. The buyer signs a gasless EIP-3009 `transferWithAuthorization`; the facilitator settles onchain and pays the gas.
4. Cense checks the claim against live web sources and returns a verdict with evidence.
5. Verdict receipts are anchored onchain — every check leaves a public, curl-able proof.

## Why paid

Free fact-checking gets you a language model's guess. A paid verdict is a different product: the agent stakes its reputation (ERC-8004 identity) on every answer, the payment makes spam uneconomic, and the onchain settlement makes each check auditable. Cents, not subscriptions.

## Stack

Next.js · TypeScript · viem · `@x402/*` (official Celo facilitator, `api.x402.celo.org`) · `@celo/attribution-tags` (ERC-8021) · ERC-8004 agent identity · Groq (`openai/gpt-oss-120b` + built-in browser search) · Vercel.

---

built by [Raphie](https://x.com/a_raphie)

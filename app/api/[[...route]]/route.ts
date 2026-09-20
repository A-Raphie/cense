// Cense production API — x402-paid claim checks on Celo mainnet, serverless.
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { checkClaim } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

const CELO_MAINNET = "eip155:42220";
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"; // USA₮ (Tether USD)
const PRICE_PER_CHECK = "1000"; // $0.001, 6 decimals

const payTo = (process.env.AGENT_WALLET_ADDRESS ?? "") as `0x${string}`;

const facilitator = new HTTPFacilitatorClient({
  url: "https://api.x402.celo.org",
  createAuthHeaders: async () => {
    const h = { "X-API-Key": process.env.X402_API_KEY ?? "" };
    return { verify: h, settle: h, supported: h };
  },
});

const server = new x402ResourceServer(facilitator);
server.register("eip155:*", new ExactEvmScheme());

const routes: RoutesConfig = {
  "POST /api/v1/check": {
    accepts: [
      {
        scheme: "exact",
        network: CELO_MAINNET,
        payTo,
        price: {
          amount: PRICE_PER_CHECK,
          asset: USDC,
          extra: { name: "USDC", version: "2" },
        },
      },
      {
        scheme: "exact",
        network: CELO_MAINNET,
        payTo,
        price: {
          amount: PRICE_PER_CHECK,
          asset: USDT,
          extra: { name: "Tether USD", version: "1" },
        },
      },
    ],
    description: "Cense claim check: one sourced fact-check verdict",
    mimeType: "application/json",
  },
};

const app = new Hono();
// Middleware sees the full path (no basePath games) and matches RoutesConfig itself
app.use(async (c, next) => {
  console.log(`[cense] ${c.req.method} ${c.req.path}`);
  await next();
});
app.use(paymentMiddleware(routes, server));

app.post("/api/v1/check", async (c) => {
  let claim = "";
  try {
    const body = await c.req.json();
    claim = String(body?.claim ?? "").slice(0, 500);
  } catch {
    return c.json({ error: "body must be JSON: { claim }" }, 400);
  }
  try {
    const result = await checkClaim(claim, { fast: true });
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "check failed";
    const friendly = /KEY is not set|not configured/i.test(msg)
      ? "the checker is warming up, retry"
      : /rate limit|429/i.test(msg)
        ? "daily check budget used up, retry after it resets"
        : msg;
    return c.json({ error: friendly }, 422);
  }
});

// Free discovery endpoint: what the paid endpoint accepts (x402 well-known)
app.get("/api/v1/check", (c) =>
  c.json({
    paid: true,
    price: "$0.001 USDC or USDT (USA₮) on Celo mainnet",
    protocol: "x402",
    facilitator: "https://api.x402.celo.org",
    usage: "POST with x402 payment header, body { claim: string }",
  }),
);

export const POST = handle(app);
export const GET = handle(app);

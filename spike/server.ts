// Cense spike — x402 resource server on Celo mainnet.
// Proves the full product: paid request → real sourced verdict.
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkClaim } from "../lib/engine";

// cwd-proof .env load (bun autoloads from cwd; the harness resets cwd)
const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const CELO_MAINNET = "eip155:42220";
const USDC = "0xcEBA9300f2b948710d2653dD7B07f33A8B32118C";
const PRICE_PER_CHECK = "1000"; // $0.001, 6 decimals

if (!process.env.AGENT_WALLET_ADDRESS) throw new Error("AGENT_WALLET_ADDRESS missing in .env");

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
  "POST /v1/check": {
    accepts: [
      {
        scheme: "exact",
        network: CELO_MAINNET,
        payTo: process.env.AGENT_WALLET_ADDRESS as `0x${string}`,
        price: {
          amount: PRICE_PER_CHECK,
          asset: USDC,
          extra: { name: "USDC", version: "2" }, // EIP-712 domain must match the token
        },
      },
    ],
    description: "Cense claim check: one sourced fact-check verdict",
    mimeType: "application/json",
  },
};

const app = express();
app.use(express.json());
app.use(((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.url} payment-sig=${req.headers["payment-signature"] ? "yes" : "no"}`);
  next();
}) as express.RequestHandler);
app.use(paymentMiddleware(routes, server));

app.post("/v1/check", async (req, res) => {
  const claim = String(req.body?.claim ?? "").slice(0, 500);
  try {
    const result = await checkClaim(claim);
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: err instanceof Error ? err.message : "check failed" });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`cense spike server on :${port}`));

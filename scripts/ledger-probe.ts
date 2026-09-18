import { readFileSync } from "node:fs";
for (const line of readFileSync(join2(), "utf8").split("\n")) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
function join2() { return "/Users/raphie/Documents/Hackathons/cense/.env"; }
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
const payTo = process.env.AGENT_WALLET_ADDRESS as `0x${string}`;
const head = await client.getBlockNumber();
console.log("payTo:", payTo, "| head:", head);
const logs = await client.getLogs({
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  event: { type: "event", name: "Transfer", inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ] },
  args: { to: payTo },
  fromBlock: head - BigInt(5_000),
  toBlock: head,
});
console.log("settlements found:", logs.length);
for (const l of logs) console.log("  from", l.args.from, "| value", Number(l.args.value ?? 0n)/1e6, "| block", l.blockNumber, "| tx", l.transactionHash);

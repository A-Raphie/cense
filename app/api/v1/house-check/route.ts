import { NextRequest, NextResponse } from "next/server";
import { checkClaim } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

/* House checks: the same engine, paid by the house, one per visitor per day.
 * Disclosed in the UI and the README honesty table. Self-limiting budget:
 * the point is a zero-friction judge path, not free volume. */

const dailyByIp = new Map<string, { date: string; count: number }>();
const MAX_PER_IP_PER_DAY = 2;
const GLOBAL_DAILY_CAP = 150;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rateKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || "local";
}

export async function POST(req: NextRequest) {
  let claim = "";
  try {
    const body = await req.json();
    claim = String(body?.claim ?? "").slice(0, 500);
  } catch {
    return NextResponse.json({ error: "body must be JSON: { claim }" }, { status: 400 });
  }

  const ip = rateKey(req);
  const day = today();
  const rec = dailyByIp.get(ip);
  const globalRec = dailyByIp.get("__global__");
  const globalCount = globalRec?.date === day ? globalRec.count : 0;

  if (globalCount >= GLOBAL_DAILY_CAP) {
    return NextResponse.json(
      { error: "The house is out of checks today. Connect a wallet to check onchain — it settles for $0.01." },
      { status: 429 },
    );
  }
  if (rec?.date === day && rec.count >= MAX_PER_IP_PER_DAY) {
    return NextResponse.json(
      { error: "Your house checks are spent for today. Connect a wallet to keep checking — $0.01 a check, settled onchain." },
      { status: 429 },
    );
  }

  try {
    const result = await checkClaim(claim, { fast: true });
    dailyByIp.set(ip, { date: day, count: (rec?.date === day ? rec.count : 0) + 1 });
    dailyByIp.set("__global__", { date: day, count: globalCount + 1 });
    return NextResponse.json({ ...result, house: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "check failed";
    // setup/config faults must not leak env var names to visitors
    const friendly = /KEY is not set|not configured/i.test(msg)
      ? "The checker is warming up. Give it a minute and try again."
      : msg;
    return NextResponse.json({ error: friendly }, { status: 422 });
  }
}

import { createHash, randomUUID } from "node:crypto";
import { Agent } from "./agent";
import { gatherEvidence } from "./search";
import { verifyClaim } from "./verify";
import type { CheckResult } from "./types";

export { Agent, AgentError } from "./agent";
export { gatherEvidence } from "./search";
export type { CheckResult, Evidence, Verdict, UsageSummary } from "./types";

/**
 * One paid claim check: search → strict verdict → serial + receipt hash.
 * The receiptHash is what gets anchored onchain per verdict.
 * fast=true tightens timeouts for serverless budgets (must fit a function window).
 */
export async function checkClaim(
  claim: string,
  opts: { fast?: boolean } = {},
): Promise<CheckResult> {
  const trimmed = claim.trim().slice(0, 500);
  if (trimmed.length < 8) throw new Error("claim too short to check");
  const startedAt = Date.now();
  // fast mode: search runs on 20b (browser_search is heavy AND rate buckets are
  // per-model), verdict on 120b, falling back to 20b when 120b's bucket is dry
  const fastOpts = {
    callTimeoutMs: 25_000,
    max429Retries: 1,
    maxNetworkRetries: 1,
    maxWaitMs: 4_000,
  } as const;
  const searchAgent = opts.fast
    ? new Agent(undefined, undefined, { ...fastOpts, model: "openai/gpt-oss-20b" })
    : new Agent();
  const verifyAgent = opts.fast ? new Agent(undefined, undefined, fastOpts) : new Agent();

  let evidence;
  try {
    evidence = await gatherEvidence(searchAgent, trimmed);
  } catch (err) {
    throw new Error(`phase=search: ${(err as Error).message}`);
  }
  const checkId = `cense-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
  let result;
  try {
    result = await verifyClaim(verifyAgent, { checkId, claim: trimmed, evidence }, startedAt);
  } catch (err) {
    const msg = (err as Error).message;
    if (opts.fast && /429|rate limit/i.test(msg)) {
      result = await verifyClaim(searchAgent, { checkId, claim: trimmed, evidence }, startedAt);
    } else {
      throw new Error(`phase=verify: ${msg}`);
    }
  }
  const receiptHash = receiptHashOf(result);
  return { ...result, receiptHash };
}

/** Deterministic keccak-style receipt: sha256 of the canonical JSON body. */
export function receiptHashOf(r: Omit<CheckResult, "receiptHash">): `0x${string}` {
  const canonical = JSON.stringify({
    checkId: r.checkId,
    claim: r.claim,
    verdict: r.verdict,
    citation: r.citation,
    rationale: r.rationale,
    sources: r.sources.map((s) => s.url),
  });
  return `0x${createHash("sha256").update(canonical).digest("hex")}`;
}

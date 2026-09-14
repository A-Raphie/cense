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
  const agent = opts.fast
    ? new Agent(undefined, undefined, { callTimeoutMs: 22_000, max429Retries: 2 })
    : new Agent();
  const evidence = await gatherEvidence(agent, trimmed);
  const checkId = `cense-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
  const result = await verifyClaim(agent, { checkId, claim: trimmed, evidence }, startedAt);
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

export type Verdict = "VERIFIED" | "REFUTED" | "UNVERIFIABLE";

export interface Evidence {
  url: string;
  domain: string;
  title?: string;
  snippet?: string;
}

export interface CheckResult {
  checkId: string;
  claim: string;
  verdict: Verdict;
  rationale: string;
  citation: string;
  settlesWith?: string;
  sources: Evidence[];
  latencyMs: number;
  /** sha256 of the canonical result — this is what gets anchored onchain */
  receiptHash?: `0x${string}`;
}

export interface UsageSummary {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

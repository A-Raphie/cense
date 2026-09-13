import type { Agent } from "./agent";
import type { CheckResult, Evidence, Verdict } from "./types";

const VERIFIER_SYSTEM = `You are a verification judge. Someone paid for this check; read the
collected evidence (search results with snippets) and reply with a strict verdict.

Verdicts:
- VERIFIED: the evidence directly supports the claim as stated.
- REFUTED: the evidence directly contradicts the claim as stated.
- UNVERIFIABLE: the evidence cannot decide the claim (opinion, prediction, too new,
  only fringe or single-source coverage, or nothing in the evidence bears on it).

Strictness rules:
- A distorted version of a real event is REFUTED, not VERIFIED: judge the claim as stated.
- Absence of evidence is not refutation. If nothing in the evidence addresses the claim,
  answer UNVERIFIABLE, never guess.
- citation must reference the decisive evidence: a domain plus its key line. Keep it under
  240 characters.
- rationale: one or two sentences a normal person can re-check against the sources.
- For UNVERIFIABLE only: settlesWith names the concrete thing that would decide it
  (e.g. "an official statement from the agency", "the actual study text"). One sentence.

Reply ONLY with JSON:
{"verdict":"VERIFIED|REFUTED|UNVERIFIABLE","citation":"...","rationale":"...","settlesWith":"..."}`;

const VERDICTS: Verdict[] = ["VERIFIED", "REFUTED", "UNVERIFIABLE"];

export interface VerifyInput {
  checkId: string;
  claim: string;
  evidence: Evidence[];
}

export async function verifyClaim(
  agent: Agent,
  input: VerifyInput,
  startedAt: number,
): Promise<CheckResult> {
  const evidenceText = input.evidence.length
    ? input.evidence
        .map(
          (e, i) =>
            `SOURCE ${i + 1}: ${e.url}\n${e.title ? `${e.title}\n` : ""}${e.snippet ?? ""}`,
        )
        .join("\n\n")
    : "(no sources were found)";
  const reply = await agent.chatJson<{
    verdict?: string;
    citation?: string;
    rationale?: string;
    settlesWith?: string;
  }>({
    label: "verify",
    system: VERIFIER_SYSTEM,
    user: [`CLAIM: ${input.claim}`, `EVIDENCE:\n${evidenceText}`].join("\n\n"),
  });
  const verdict = VERDICTS.includes(reply.verdict as Verdict) ? (reply.verdict as Verdict) : "UNVERIFIABLE";
  return {
    checkId: input.checkId,
    claim: input.claim,
    verdict,
    citation: (reply.citation || "(no citation provided)").slice(0, 300),
    rationale: clean(reply.rationale || "(no rationale provided)", 600),
    settlesWith: reply.settlesWith ? clean(reply.settlesWith, 240) : undefined,
    sources: input.evidence,
    latencyMs: Date.now() - startedAt,
  };
}

function clean(s: string, max: number): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[—–]/g, "-")
    .trim()
    .slice(0, max);
}

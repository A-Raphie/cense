import type { Agent, AgentCall } from "./agent";
import type { Evidence } from "./types";

/**
 * Evidence gathering runs on the verdict model itself, with Groq's built-in
 * browser_search server tool (proven pattern from quash: groq/compound 413s
 * on real queries at this tier; gpt-oss-120b + browser_search does not).
 */
const SEARCH_SYSTEM = `You have a browser_search tool. Search the web, then answer.

Given one claim someone is prepared to pay to have checked, run one or two searches and report
the 3 to 5 most decisive sources that would settle whether the claim is true.

Rules:
- ONLY report URLs that actually appeared in your search results. Never invent a URL.
- Prefer primary and high-authority sources: official statements, peer-reviewed work,
  major newsrooms, primary filings. Skip aggregators, forums, and content farms.
- snippet: one sentence from (or about) the source that bears on the claim.
- If searches surface nothing that bears on the claim, return an empty sources array.

Reply ONLY with a JSON object (no markdown fences):
{"sources":[{"url":"https://...","title":"...","snippet":"..."}]}`;

const BROWSER_SEARCH_TOOL = [{ type: "browser_search" }];
const MAX_SOURCES = 5;

export async function gatherEvidence(agent: Agent, claim: string): Promise<Evidence[]> {
  const call: AgentCall = {
    label: "search",
    system: SEARCH_SYSTEM,
    user: `CLAIM: ${claim}`,
    tools: BROWSER_SEARCH_TOOL,
  };
  const reply = await agent.chatFull(call);
  const out: Evidence[] = [];
  let parsed: { sources?: Array<{ url?: string; title?: string; snippet?: string }> } = {};
  try {
    parsed = JSON.parse(reply.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  } catch {
    parsed = {};
  }
  for (const raw of parsed.sources ?? []) {
    const ev = toEvidence(raw);
    if (ev) out.push(ev);
    if (out.length >= MAX_SOURCES) return dedupe(out);
  }
  // Backup harvest: URLs straight out of the executed search output.
  if (out.length === 0) {
    for (const tool of reply.executedTools) {
      for (const m of (tool.output ?? "").matchAll(/https?:\/\/[^\s)"'\\]+/g)) {
        const ev = toEvidence({ url: m[0].replace(/[.,]+$/, "") });
        if (ev) out.push(ev);
        if (out.length >= MAX_SOURCES) return dedupe(out);
      }
    }
  }
  return dedupe(out);
}

function toEvidence(raw: { url?: string; title?: string; snippet?: string }): Evidence | undefined {
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return undefined;
  let domain = "";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
  return {
    url,
    domain,
    title: typeof raw.title === "string" ? raw.title.slice(0, 160) : undefined,
    snippet: typeof raw.snippet === "string" ? raw.snippet.slice(0, 400) : undefined,
  };
}

function dedupe(sources: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = s.url.replace(/[#?].*$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

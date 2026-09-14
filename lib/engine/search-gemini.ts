import type { Evidence } from "./types";

/**
 * Evidence gathering via Gemini + native Google Search grounding.
 * Free tier carries google_search on the v1alpha endpoint (verified Sep 14);
 * v1beta rejects tools for these key tiers with a misleading empty 404.
 * Sources come from groundingMetadata — machine-read, never hallucinated.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent";
const MAX_SOURCES = 5;

interface GroundingChunk {
  web?: { uri?: string; title?: string; domain?: string };
}

export async function geminiSearch(claim: string, apiKey: string): Promise<Evidence[]> {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Search the web for the 3 to 5 most authoritative sources that settle whether this claim is true. ` +
                `Prefer primary and high-authority sources (official statements, peer-reviewed work, major newsrooms). ` +
                `Then state which side the sources support, briefly.\n\nCLAIM: ${claim}`,
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`gemini search HTTP ${res.status} ${body.slice(0, 160)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      groundingMetadata?: { groundingChunks?: GroundingChunk[]; webSearchQueries?: string[] };
    }>;
  };
  const candidate = data.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];

  const out: Evidence[] = [];
  const seen = new Set<string>();
  for (const ch of chunks) {
    const web = ch.web ?? {};
    const uri = typeof web.uri === "string" ? web.uri : "";
    if (!/^https?:\/\//i.test(uri)) continue;
    const key = uri.replace(/[#?].*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    let domain = web.domain || "";
    // some chunks omit domain and their uri is a google redirect — recover the
    // real domain from the title (Gemini titles carry it) before falling back
    if (!domain || domain.includes("vertexaisearch") || domain.includes("google")) {
      const t = (web.title || "").trim();
      if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(t)) domain = t;
    }
    if (!domain) {
      try {
        domain = new URL(uri).hostname.replace(/^www\./, "");
      } catch {
        domain = "via Google Search";
      }
    }
    out.push({
      url: uri,
      domain: domain.replace(/^www\./, ""),
      title: typeof web.title === "string" ? web.title.slice(0, 160) : undefined,
    });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

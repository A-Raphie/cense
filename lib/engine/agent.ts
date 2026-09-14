import type { UsageSummary } from "./types";

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

// Public list prices per 1M tokens, for honest cost reporting only.
const PRICES: Record<string, [number, number]> = {
  "openai/gpt-oss-120b": [0.15, 0.6],
  "openai/gpt-oss-20b": [0.075, 0.3],
};

export class AgentError extends Error {}

export interface AgentCall {
  system: string;
  user: string;
  maxTokens?: number;
  label: string;
  /** Server-side tools (e.g. Groq built-in browser_search). Disables response_format. */
  tools?: unknown[];
}

type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

export interface FullReply {
  text: string;
  executedTools: Array<{ name?: string; output?: string }>;
}

export class Agent {
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly temperature: number;
  private readonly fetchImpl: FetchImpl;
  private readonly callTimeoutMs: number;
  private readonly max429Retries: number;
  readonly usage: UsageSummary = {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
  };

  constructor(
    env: NodeJS.ProcessEnv = process.env,
    fetchImpl: FetchImpl = fetch,
    opts: { callTimeoutMs?: number; max429Retries?: number } = {},
  ) {
    this.baseUrl = (env.CENSE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = env.CENSE_API_KEY || env.GROQ_API_KEY || "";
    this.model = env.CENSE_MODEL || DEFAULT_MODEL;
    this.temperature = Number(env.CENSE_TEMPERATURE ?? 0);
    this.fetchImpl = fetchImpl;
    // serverless budget: routes must finish inside the function window
    this.callTimeoutMs = opts.callTimeoutMs ?? 120_000;
    this.max429Retries = opts.max429Retries ?? 6;
    if (!this.apiKey) {
      throw new AgentError(
        "CENSE_API_KEY is not set. Cense needs any OpenAI-compatible key. " +
          "Free tiers such as Groq work: CENSE_BASE_URL=https://api.groq.com/openai/v1 " +
          "CENSE_MODEL=openai/gpt-oss-120b CENSE_API_KEY=...",
      );
    }
  }

  async chat(call: AgentCall, attempt = 0): Promise<string> {
    return (await this.chatFull(call, attempt)).text;
  }

  async chatFull(call: AgentCall, attempt = 0): Promise<FullReply> {
    let res: Response;
    try {
      res = await this.fetchWithNetworkRetry(call, attempt);
    } catch (err) {
      throw new AgentError(`model call ${call.label} failed: ${(err as Error).message}`);
    }
    if (res.status === 429 && attempt < this.max429Retries) {
      const body = await res.text().catch(() => "");
      let waitMs = 15_000;
      const m = body.match(/try again in ([\d.]+)s/i);
      if (m?.[1]) waitMs = Math.ceil(parseFloat(m[1]) * 1000) + 1_000;
      else {
        const ra = res.headers.get("retry-after");
        if (ra) waitMs = Math.ceil(parseFloat(ra) * 1000) + 1_000;
      }
      console.error(`  429 on ${call.label}: pacing ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/6)`);
      await new Promise((r) => setTimeout(r, waitMs));
      return this.chatFull(call, attempt + 1);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (body.includes("output_parse_failed") && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2_000));
        return this.chatFull(call, attempt + 1);
      }
      throw new AgentError(`model call ${call.label} failed: HTTP ${res.status} ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as any;
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new AgentError(`model call ${call.label} returned empty content`);
    }
    this.absorbUsage(data);
    return { text, executedTools: data?.choices?.[0]?.message?.executed_tools ?? [] };
  }

  private async fetchWithNetworkRetry(call: AgentCall, attempt: number): Promise<Response> {
    try {
      const body: Record<string, unknown> = {
        model: this.model,
        temperature: this.temperature,
        max_tokens: call.maxTokens ?? (call.tools ? 4096 : 2048),
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
      };
      if (call.tools) body.tools = call.tools;
      else body.response_format = { type: "json_object" };
      return await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.callTimeoutMs),
      });
    } catch (err) {
      if (attempt < 8) {
        const wait = 5_000;
        console.error(`  network on ${call.label}: retrying in ${wait / 1000}s (attempt ${attempt + 1}/8)`);
        await new Promise((r) => setTimeout(r, wait));
        return this.fetchWithNetworkRetry(call, attempt + 1);
      }
      throw err;
    }
  }

  async chatJson<T>(call: AgentCall, attempt = 0): Promise<T> {
    const text = await this.chat(call, attempt);
    try {
      return parseJsonLoose(text) as T;
    } catch (err) {
      if (attempt < 1) {
        return this.chatJson(
          {
            ...call,
            user:
              `${call.user}\n\nYour previous reply was not valid JSON ` +
              `(${(err as Error).message}). Reply again with ONLY the JSON object.`,
          },
          attempt + 1,
        );
      }
      throw new AgentError(`model call ${call.label} produced unparseable JSON: ${text.slice(0, 300)}`);
    }
  }

  private absorbUsage(data: any): void {
    const u = data?.usage;
    if (!u) return;
    this.usage.calls += 1;
    this.usage.promptTokens += Number(u.prompt_tokens ?? 0);
    this.usage.completionTokens += Number(u.completion_tokens ?? 0);
    const price = this.pricePerMTok();
    this.usage.costUsd +=
      (Number(u.prompt_tokens ?? 0) / 1e6) * price[0] +
      (Number(u.completion_tokens ?? 0) / 1e6) * price[1];
  }

  private pricePerMTok(): [number, number] {
    return PRICES[this.model] ?? [0, 0];
  }
}

export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("no JSON object found");
  }
}

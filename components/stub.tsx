import type { CheckResult, Verdict } from "@/lib/engine/types";

/* THE CLAIM STUB — Cense's signature component (design.md).
 * Bespoke: perforated tear edge, serial, verdict ink, settlement block.
 * The tear animation fires ONCE on settlement arrival; nothing loops. */

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const map = {
    VERIFIED: { ink: "var(--status-success)", bg: "var(--status-success-bg)", glyph: "=", label: "VERIFIED" },
    REFUTED: { ink: "var(--status-error)", bg: "var(--status-error-bg)", glyph: "x", label: "REFUTED" },
    UNVERIFIABLE: { ink: "var(--status-neutral)", bg: "var(--status-neutral-bg)", glyph: "?", label: "UNVERIFIABLE" },
  } as const;
  const s = map[verdict];
  return (
    <span
      className="inline-flex items-center gap-2 px-2.5 py-1 font-mono text-[12px] font-semibold tracking-[0.06em]"
      style={{ color: s.ink, background: s.bg, borderRadius: "var(--radius-input)" }}
    >
      <span aria-hidden className="inline-block h-3.5 w-3.5 text-center leading-[14px]">
        {s.glyph}
      </span>
      {s.label}
    </span>
  );
}

/** Perforation edge: dashed rule + punch holes matching the counter field. */
function Perforation({ position }: { position: "top" | "bottom" }) {
  return (
    <div aria-hidden className="relative" style={{ height: 12 }}>
      <div
        className="absolute inset-x-0"
        style={{
          top: position === "top" ? 5 : 5,
          borderTop: "2px dashed var(--border-strong)",
        }}
      />
      <div
        className="absolute left-4 right-4 flex justify-between"
        style={{ top: 0 }}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)" }}
          />
        ))}
      </div>
    </div>
  );
}

export interface StubData extends CheckResult {
  /** "house" when the house paid; otherwise the payer address + tx hash */
  settlement?: {
    txHash?: string;
    payer?: string;
    fee?: string;
  };
  house?: boolean;
}

export function Stub({
  data,
  torn = false,
}: {
  data: StubData;
  /** torn = the settlement has landed; the stub animates off the counter once */
  torn?: boolean;
}) {
  const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
  return (
    <article
      className="stub-enter overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-card)",
        maxWidth: 640,
        transform: torn ? "translateY(6px) rotate(0.35deg)" : "none",
        transition: "transform 260ms ease-out",
      }}
    >
      <Perforation position="top" />
      <div className="px-5 pb-5 pt-1 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className="px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.14em]"
            style={{ background: "var(--bg-stock)", color: "var(--accent-foreground)" }}
          >
            CLAIM CHECK
          </span>
          <span className="font-mono text-[12px] text-ink-2" style={{ fontVariantNumeric: "tabular-nums" }}>
            {data.checkId}
          </span>
        </div>

        <blockquote className="mt-4 border-l-2 pl-4 text-[17px] leading-relaxed text-ink" style={{ borderColor: "var(--bg-stock)" }}>
          “{data.claim}”
        </blockquote>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <VerdictBadge verdict={data.verdict} />
          <span className="font-mono text-[12px] text-ink-3" style={{ fontVariantNumeric: "tabular-nums" }}>
            {(data.latencyMs / 1000).toFixed(1)}s
          </span>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-ink">{data.rationale}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          <span className="micro mr-2" style={{ letterSpacing: "0.06em" }}>
            decisive
          </span>
          {data.citation}
        </p>
        {data.verdict === "UNVERIFIABLE" && data.settlesWith ? (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            <span className="micro mr-2">settles with</span>
            {data.settlesWith}
          </p>
        ) : null}

        {data.sources.length > 0 ? (
          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border-default)" }}>
            <span className="micro">sources</span>
            <ul className="mt-2 space-y-1.5">
              {data.sources.map((s) => (
                <li key={s.url} className="truncate font-mono text-[12px]">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-2 underline decoration-line underline-offset-2 hover:text-ink"
                  >
                    {s.domain}
                  </a>
                  {s.title ? <span className="text-ink-3"> · {s.title.slice(0, 80)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t px-0 pt-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border-default)" }}
        >
          {data.house ? (
            <span className="text-ink-2">paid by the house · no wallet needed</span>
          ) : data.settlement?.txHash ? (
            <>
              <span className="text-ink-2">
                paid by {short(data.settlement?.payer)} · $0.01 USDC
              </span>
              <a
                href={`https://celoscan.io/tx/${data.settlement.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-line underline-offset-2 hover:text-ink"
              >
                {data.settlement.txHash.slice(0, 10)}…{data.settlement.txHash.slice(-6)}
              </a>
            </>
          ) : (
            <span className="text-ink-2">
              {data.settlement?.payer ? "settling…" : "specimen · a real stub carries payer, tx, and receipt"}
            </span>
          )}
          <span className="text-ink-3">receipt {data.receiptHash?.slice(0, 10)}…</span>
        </div>
      </div>
      <Perforation position="bottom" />
    </article>
  );
}

/** Loading shape mirrors the stub exactly (skeleton, not spinner). */
export function StubSkeleton({ progress }: { progress?: string }) {
  return (
    <div aria-busy="true" className="overflow-hidden" style={{ maxWidth: 640 }}>
      <div className="panel" style={{ borderRadius: 0 }}>
        <Perforation position="top" />
        <div className="px-5 pb-5 pt-1 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-4 w-40" style={{ background: "var(--bg-subtle)" }} />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-4 w-11/12" style={{ background: "var(--bg-subtle)" }} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-6 w-32" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-4 w-12" style={{ background: "var(--bg-subtle)" }} />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3.5 w-full" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-3.5 w-4/5" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-3.5 w-3/5" style={{ background: "var(--bg-subtle)" }} />
          </div>
          <p className="mt-4 font-mono text-[12px] text-ink-2">{progress ?? "Searching the record…"}</p>
        </div>
        <Perforation position="bottom" />
      </div>
    </div>
  );
}

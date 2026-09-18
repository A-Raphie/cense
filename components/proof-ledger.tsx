"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface LedgerCheck {
  txHash?: string;
  payer?: string;
  cents?: number;
  block?: number;
}

interface LedgerPayload {
  ready: boolean;
  checks: LedgerCheck[];
  receipts: Array<{ receiptHash: string; block: number; txHash?: string }>;
  total: number;
  degraded?: boolean;
  note?: string;
}

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function ProofLedger() {
  const [state, setState] = useState<"loading" | "ok" | "degraded">("loading");
  const [data, setData] = useState<LedgerPayload | null>(null);

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/v1/ledger");
      const json = (await res.json()) as LedgerPayload;
      setData(json);
      setState(json.degraded ? "degraded" : "ok");
    } catch {
      setState("degraded");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 60_000); // poll at 60s, paused on hidden tabs
    const wake = () => void load();
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [load]);

  if (state === "loading") {
    return (
      <div className="panel mt-6 px-5 py-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--border-rule)" }}>
            <div className="h-4 w-40" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-4 w-24" style={{ background: "var(--bg-subtle)" }} />
            <div className="h-4 w-20" style={{ background: "var(--bg-subtle)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (state === "degraded" || !data?.ready) {
    return (
      <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-[14px] text-ink-2">The ledger read failed just now. The chain is still the record.</p>
        <button className="btn btn-ghost" style={{ minHeight: 36 }} onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (data.checks.length === 0) {
    return (
      <div className="panel mt-6 flex flex-col items-start gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
          {data.note ?? "No checks have settled yet. The first one writes the first line of this ledger."}
        </p>
        <Link href="/app" className="btn btn-ghost" style={{ minHeight: 36 }}>
          Be the first check
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]" style={{ fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr className="border-b text-ink-3" style={{ borderColor: "var(--border-rule)" }}>
            <th className="py-2 pr-4 font-medium">settled at block</th>
            <th className="py-2 pr-4 font-medium">payer</th>
            <th className="py-2 pr-4 font-medium">amount</th>
            <th className="py-2 font-medium">tx</th>
          </tr>
        </thead>
        <tbody>
          {data.checks.map((c) => (
            <tr key={c.txHash} className="border-b" style={{ borderColor: "var(--border-rule)" }}>
              <td className="py-2 pr-4 font-mono text-[12px] text-ink-2">{c.block}</td>
              <td className="py-2 pr-4 font-mono text-[12px] text-ink-2">{short(c.payer)}</td>
              <td className="py-2 pr-4 text-ink">${(c.cents ?? 0).toFixed(2)}</td>
              <td className="py-2">
                {c.txHash ? (
                  <a
                    href={`https://celoscan.io/tx/${c.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[12px] text-ink-2 underline decoration-line underline-offset-2 hover:text-ink"
                  >
                    {c.txHash.slice(0, 10)}…{c.txHash.slice(-6)}
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.total > data.checks.length ? (
        <p className="mt-2 font-mono text-[12px] text-ink-3">+{data.total - data.checks.length} more in this window</p>
      ) : null}

      {data.receipts.length > 0 ? (
        <div className="mt-8">
          <span className="micro">anchored verdict receipts</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.receipts.map((r) => (
              <a
                key={r.receiptHash + String(r.block)}
                href={r.txHash ? `https://celoscan.io/tx/${r.txHash}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="chip hover:text-ink"
                title={`anchored at block ${r.block}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {r.receiptHash} · block {r.block}
              </a>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-ink-3">
            Each chip is a receipt hash written to the ReceiptAnchor contract; the verdict it proves is in the stub.
          </p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Stub, StubSkeleton, VerdictBadge, type StubData } from "@/components/stub";
import { connectWallet, paidFetch, usdcBalance, formatUsdc } from "@/lib/x402-browser";

type Phase = "idle" | "searching" | "reading" | "writing" | "done" | "error";

const PHASES: Array<{ at: number; label: string }> = [
  { at: 0, label: "Searching the record…" },
  { at: 8_000, label: "Reading sources…" },
  { at: 16_000, label: "Writing the verdict" },
];

export default function AppPage() {
  const [claim, setClaim] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StubData | null>(null);
  const [torn, setTorn] = useState(false);
  const [wallet, setWallet] = useState<{ address: string; balance: string } | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [houseSpent, setHouseSpent] = useState(false);
  const [visit, setVisit] = useState<Array<{ serial: string; claim: string; verdict: StubData["verdict"] }>>([]);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (sessionStorage.getItem("cense-house-spent")) setHouseSpent(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  async function refreshBalance(addr: string) {
    try {
      const b = await usdcBalance(addr);
      setWallet({ address: addr, balance: formatUsdc(b) });
      return Number(b) >= 1_000; // >= $0.001
    } catch {
      return false;
    }
  }

  async function onConnect() {
    setWalletBusy(true);
    setError(null);
    try {
      const addr = await connectWallet();
      await refreshBalance(addr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect the wallet.");
    } finally {
      setWalletBusy(false);
    }
  }

  async function runCheck(kind: "wallet" | "house") {
    if (claim.trim().length < 8) {
      setError("Give the agent a claim worth checking — a sentence at least.");
      return;
    }
    setError(null);
    setResult(null);
    setTorn(false);
    setPhase("searching");
    timers.current.forEach(clearTimeout);
    PHASES.forEach(({ at, label }) => {
      if (at === 0) return;
      timers.current.push(setTimeout(() => setPhase(label.startsWith("Reading") ? "reading" : "writing"), at));
    });

    try {
      let res: Response;
      const clientAbort = AbortSignal.timeout(70_000); // never hang the skeleton
      if (kind === "house") {
        res = await fetch("/api/v1/house-check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ claim: claim.trim() }),
          signal: clientAbort,
        });
      } else {
        if (!wallet) throw new Error("Connect a wallet first.");
        res = await paidFetch(wallet.address)("/api/v1/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ claim: claim.trim() }),
          signal: clientAbort,
        });
      }

      const paymentResponse = res.headers.get("x-payment-response");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Check failed (HTTP ${res.status})`);

      let txHash: string | undefined;
      if (paymentResponse) {
        try {
          const decoded = JSON.parse(atob(paymentResponse));
          txHash = decoded?.transaction?.hash ?? decoded?.transaction?._hash ?? decoded?.hash;
        } catch {
          /* settlement receipt opaque; the chain still holds the truth */
        }
      }

      const stub: StubData = {
        ...data,
        house: kind === "house",
        settlement: kind === "wallet" ? { payer: wallet?.address, txHash } : undefined,
      };
      setResult(stub);
      setPhase("done");
      setVisit((v) => [
        { serial: stub.checkId, claim: stub.claim, verdict: stub.verdict },
        ...v,
      ]);
      if (kind === "house") {
        sessionStorage.setItem("cense-house-spent", "1");
        setHouseSpent(true);
      }
      if (kind === "wallet" && wallet) {
        void refreshBalance(wallet.address);
        // the tear fires once, when the settlement is on the stub
        setTimeout(() => setTorn(true), 120);
      }
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "The check failed. Try again.");
    }
  }

  const canWalletCheck = Boolean(wallet) && phase !== "searching" && phase !== "reading" && phase !== "writing";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
      {/* front door: one plain-verb line orients a stranger */}
      <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
        Hand it a claim. It pays out a verdict.
      </h1>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
        Paste any factual claim below. The first check is on the house, no wallet needed.
        After that, checks settle for $0.001 of USDC on Celo mainnet, straight from your wallet.
      </p>

      {/* the counter window */}
      <div className="mt-10">
        <label htmlFor="claim" className="micro">
          the claim
        </label>
        <textarea
          id="claim"
          className="field mt-2"
          rows={3}
          maxLength={500}
          placeholder="The Great Wall of China is visible from the Moon."
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && phase === "idle") {
              void runCheck(houseSpent ? "wallet" : "house");
            }
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* ONE adaptive primary: free house check first, wallet after it is spent.
              His catch Sep 14: two buttons + "no wallet needed" copy contradicted. */}
          {!houseSpent ? (
            <button
              className="btn btn-primary"
              disabled={phase === "searching" || phase === "reading" || phase === "writing"}
              onClick={() => void runCheck("house")}
            >
              Check · free
            </button>
          ) : wallet ? (
            <button
              className="btn btn-primary"
              disabled={!canWalletCheck}
              onClick={() => void runCheck("wallet")}
            >
              Check · $0.001
            </button>
          ) : (
            <button className="btn btn-primary" disabled={walletBusy || phase === "searching"} onClick={() => void onConnect()}>
              {walletBusy ? "Connecting…" : "Connect wallet to check"}
            </button>
          )}
          {wallet ? (
            <span className="chip" style={{ fontVariantNumeric: "tabular-nums" }}>
              {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)} · {wallet.balance} USDC
            </span>
          ) : null}
        </div>
        {wallet && Number(wallet.balance) < 0.01 ? (
          <p className="mt-2 text-[13px] text-ink-2">
            This wallet has no USDC on Celo. Fund it with any amount, or use the house check.
          </p>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-center gap-3 border px-4 py-3 text-[14px] text-ink"
            style={{ borderColor: "var(--status-error)", background: "var(--status-error-bg)", borderRadius: "var(--radius-input)" }}
          >
            <span>{error}</span>
            {phase === "error" ? (
              <button className="btn btn-ghost" style={{ minHeight: 32 }} onClick={() => void runCheck(houseSpent ? "wallet" : "house")}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* the stub output */}
      <div className="mt-10" aria-live="polite">
        {phase === "searching" || phase === "reading" || phase === "writing" ? (
          <StubSkeleton progress={PHASES.find((p) => (p.label.startsWith("Searching") ? phase === "searching" : p.label.startsWith("Reading") ? phase === "reading" : phase === "writing"))?.label} />
        ) : null}
        {phase === "idle" ? (
          <div className="panel max-w-[640px] px-6 py-5">
            <p className="text-[15px] text-ink">What you get back</p>
            <ul className="mt-2 space-y-1.5 text-[14px] text-ink-2">
              <li>A verdict: VERIFIED, REFUTED, or UNVERIFIABLE. No guessing.</li>
              <li>The decisive source, quoted, plus every source used.</li>
              <li>A receipt: serial number and hash, anchored onchain.</li>
            </ul>
          </div>
        ) : null}
        {result ? <Stub data={result} torn={torn} /> : null}
      </div>

      {/* agent commerce: the same endpoint, no UI */}
      <div className="mt-16 max-w-[720px]">
        <span className="micro">for agents</span>
        <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-ink">
          Any agent can call this endpoint
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          The instrument above is a wallet in front of one x402 endpoint. Your agent points
          its x402 client at the same URL and settles the same $0.01, no account, no API key.
        </p>
        <pre
          className="mt-3 overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-ink"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-card)" }}
        >
          {`curl -i https://cense-lake.vercel.app/api/v1/check \\
  -X POST -H 'content-type: application/json' \\
  -d '{"claim":"The Eiffel Tower opened in 1889"}'

# 402 arrives with payment requirements (USDC, eip155:42220).
# Sign, retry with your x402 client, the verdict is the body.`}
        </pre>
      </div>

      {/* this-visit ledger */}
      <div className="mt-16">
        <div className="flex items-baseline justify-between">
          <span className="micro">checked this visit</span>
          <span className="font-mono text-[12px] text-ink-3" style={{ fontVariantNumeric: "tabular-nums" }}>
            {visit.length} check{visit.length === 1 ? "" : "s"}
          </span>
        </div>
        {visit.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-2">
            Nothing yet. Settled checks land onchain; this list clears when you leave.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr className="border-b text-ink-3" style={{ borderColor: "var(--border-rule)" }}>
                  <th className="py-2 pr-4 font-medium">serial</th>
                  <th className="py-2 pr-4 font-medium">claim</th>
                  <th className="py-2 font-medium">verdict</th>
                </tr>
              </thead>
              <tbody>
                {visit.map((v) => (
                  <tr key={v.serial} className="border-b" style={{ borderColor: "var(--border-rule)" }}>
                    <td className="py-2 pr-4 font-mono text-[12px] text-ink-2">{v.serial}</td>
                    <td className="max-w-[380px] truncate py-2 pr-4 text-ink">{v.claim}</td>
                    <td className="py-2">
                      <VerdictBadge verdict={v.verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

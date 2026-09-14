import Link from "next/link";
import type { Metadata } from "next";
import { Stub } from "@/components/stub";
import type { CheckResult } from "@/lib/engine/types";
import { ProofLedger } from "@/components/proof-ledger";

export const metadata: Metadata = {
  title: "Cense -- pay a cent, know if it's true",
  description:
    "A verification agent on Celo mainnet. Pay $0.01 of USDC over x402, get a sourced verdict with a receipt.",
};

/* SPECIMEN: real stub format, real engine field names, honestly labeled. */
const SPECIMEN: CheckResult = {
  checkId: "cense-specimen-0001",
  claim: "The Eiffel Tower was completed in 1889 for the World's Fair.",
  verdict: "VERIFIED",
  citation: "toureiffel.paris: the tower was built for the 1889 Exposition Universelle",
  rationale:
    "The operator's own site and two encyclopedias confirm the tower finished in 1889 as the entrance to the World's Fair.",
  sources: [
    { url: "https://www.toureiffel.paris/en/the-monument", domain: "toureiffel.paris" },
    { url: "https://www.britannica.com/topic/Eiffel-Tower", domain: "britannica.com" },
  ],
  latencyMs: 21_900,
};

const STEPS = [
  {
    n: "01",
    title: "Hand over the claim",
    body: "Paste any factual claim. A sentence is enough. The agent takes it as written, no rewording.",
  },
  {
    n: "02",
    title: "The meter runs once",
    body: "x402 prices the check at $0.01 of USDC. Your wallet signs a gasless authorization; the facilitator settles it on Celo mainnet and pays the gas.",
  },
  {
    n: "03",
    title: "The agent searches the record",
    body: "It runs live web searches, keeps only primary and high-authority sources, and drops anything it cannot open.",
  },
  {
    n: "04",
    title: "The stub comes back",
    body: "One of three verdicts: VERIFIED, REFUTED, or UNVERIFIABLE. With the decisive quote, every source used, and a receipt you can curl.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* hero — split 7/5, one primary CTA owned by the hero */}
      <section
        className="grid items-start gap-10 lg:grid-cols-[7fr_5fr]"
        style={{ paddingTop: "var(--space-section)" }}
      >
        <div>
          <p className="micro">a verification agent on celo mainnet</p>
          <h1 className="mt-4 text-[clamp(2.6rem,6vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-ink">
            Pay a cent.
            <br />
            <span style={{ opacity: 0.45 }}>Know if it&apos;s true.</span>
          </h1>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">
            Cense checks claims against live sources and returns a verdict with its evidence.
            Each check costs $0.01 of USDC, settled onchain in about a second.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/app" className="btn btn-primary">
              Check a claim
            </Link>
            <Link href="/#proof" className="btn btn-ghost">
              Read the proof
            </Link>
          </div>
          <p className="mt-5 font-mono text-[12px] text-ink-3">
            x402 settles in ~1s · gas paid by the facilitator · receipts anchored onchain
          </p>
        </div>
        <div className="relative">
          <span
            className="absolute -top-3 left-3 z-10 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em]"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            SPECIMEN · YOURS WILL LOOK LIKE THIS
          </span>
          <Stub data={SPECIMEN} />
        </div>
      </section>

      {/* mechanism — numbered once, flow line carries the loop */}
      <section style={{ paddingTop: "var(--space-section)" }} className="grid gap-10 lg:grid-cols-[7fr_4fr]">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">How a check runs</h2>
          <ol className="mt-6 space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="grid grid-cols-[48px_1fr] gap-4">
                <span className="number-lg pt-0.5 text-[20px] text-ink-2">{s.n}</span>
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 max-w-[58ch] text-[14px] leading-relaxed text-ink-2">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="panel p-5">
          <span className="micro">the whole loop</span>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-ink-2">
{`claim → 402 → sign → settle
     → search → verdict → stub`}
          </pre>
          <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
            Free fact-checking is a guess with no name on it. A paid verdict has a payer, a
            payee, a price, and a receipt. That is what makes it worth something.
          </p>
          <Link href="/app" className="mt-4 inline-block text-[14px] text-ink underline decoration-line-strong underline-offset-2 hover:text-ink-2">
            Run your first check: it&apos;s on the house
          </Link>
        </aside>
      </section>

      {/* can / cannot — the boundary stated plainly */}
      <section style={{ paddingTop: "var(--space-section)" }}>
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">What it checks</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <span className="micro" style={{ color: "var(--status-success)" }}>
              yes
            </span>
            <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink">
              <li>Checkable factual claims: events, quotes, numbers, studies</li>
              <li>Claims with a public record, however obscure</li>
              <li>Claims in English, from anywhere</li>
            </ul>
          </div>
          <div className="panel p-5">
            <span className="micro" style={{ color: "var(--status-error)" }}>
              no
            </span>
            <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink">
              <li>Opinions, predictions, and moral questions</li>
              <li>Private matters no public record can settle</li>
              <li>Anything posted after your check: verdicts are dated</li>
            </ul>
          </div>
        </div>
      </section>

      {/* proof — the chain is the ledger */}
      <section id="proof" style={{ paddingTop: "var(--space-section)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Settled checks</h2>
          <p className="font-mono text-[12px] text-ink-3">read live from USDC transfers on Celo</p>
        </div>
        <ProofLedger />
      </section>

      {/* FAQ */}
      <section id="faq" style={{ paddingTop: "var(--space-section)" }}>
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">Questions</h2>
        <div className="mt-6 grid max-w-[820px] gap-5">
          {[
            {
              q: "Why pay for a fact check?",
              a: "Free answers have no cost when they are wrong. The $0.01 makes spam uneconomic, pays for real searches, and buys a receipt: payer, payee, price, and proof that a specific agent staked its identity on the answer.",
            },
            {
              q: "What if the verdict is wrong?",
              a: "Every verdict shows the decisive source, so you can re-check the reasoning in one click. UNVERIFIABLE is an honest verdict: the agent names exactly what evidence would settle the claim instead of guessing.",
            },
            {
              q: "Do I need CELO for gas?",
              a: "No. Checks settle through the x402 facilitator, which pays the gas. You sign a gasless authorization and the USDC moves payer to payee inside the token contract. You need USDC on Celo and nothing else.",
            },
            {
              q: "Can other software use this?",
              a: "That is the point. The instrument at /app is one client of a plain x402 endpoint. Any agent with an x402 client can call it, settle the same $0.01, and get the same JSON verdict.",
            },
          ].map((f) => (
            <div key={f.q} className="border-t pt-4" style={{ borderColor: "var(--border-rule)" }}>
              <h3 className="text-[16px] font-semibold text-ink">{f.q}</h3>
              <p className="mt-1.5 max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* final CTA — quiet repeat, Peak-End */}
      <section
        className="flex flex-col items-start gap-4 border-t pt-16 sm:flex-row sm:items-center sm:justify-between"
        style={{ marginTop: "var(--space-section)", paddingBottom: 64 }}
      >
        <p className="text-[18px] font-medium text-ink">
          Bring a claim you have doubted. <span style={{ opacity: 0.45 }}>It costs a cent to stop wondering.</span>
        </p>
        <Link href="/app" className="btn btn-stock">
          Check a claim · $0.01
        </Link>
      </section>
    </div>
  );
}

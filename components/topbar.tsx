import Link from "next/link";

/** THE one chrome row: brand left, plain-noun nav, provenance pill right.
 *  Per winsznx top rules: no second strip, no second CTA. */
export function TopBar() {
  return (
    <header className="border-b border-line" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink no-underline">
            <span
              aria-hidden
              className="inline-block h-4 w-4"
              style={{ background: "var(--bg-stock)", borderRadius: "var(--radius-card)", border: "1px solid var(--border-strong)" }}
            />
            Cense
          </Link>
          <nav className="hidden items-center gap-6 text-[14px] sm:flex">
            <Link href="/app" className="text-ink no-underline hover:text-ink-2">
              Instrument
            </Link>
            <Link href="/#proof" className="text-ink no-underline hover:text-ink-2">
              Proof
            </Link>
            <Link href="/#faq" className="text-ink no-underline hover:text-ink-2">
              FAQ
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full" style={{ background: "var(--status-success)" }} />
          </span>
          <span className="chip">Celo mainnet</span>
        </div>
      </div>
      <nav className="flex items-center gap-5 border-t border-line px-4 py-2 text-[13px] sm:hidden">
        <Link href="/app" className="text-ink no-underline">
          Instrument
        </Link>
        <Link href="/#proof" className="text-ink no-underline">
          Proof
        </Link>
        <Link href="/#faq" className="text-ink no-underline">
          FAQ
        </Link>
      </nav>
    </header>
  );
}

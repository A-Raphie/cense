export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col justify-between gap-2 border-t border-line pt-6 text-[13px] text-ink-2 sm:flex-row sm:items-center">
          <p>
            Cense · settles on Celo mainnet · reading is free, checking costs $0.01
          </p>
          <p>
            built by{" "}
            <a
              href="https://x.com/a_raphie"
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
            >
              Raphie
            </a>{" "}
            for Celo&apos;s Agents at Work
          </p>
        </div>
      </div>
    </footer>
  );
}

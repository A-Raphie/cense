"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 sm:px-6" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
      <p className="micro">something broke on our side</p>
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-ink">
        The counter had to close for a moment.
      </h1>
      <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
        An unexpected error stopped this page. Nothing you paid was lost: settlements live on
        the chain, not on this page.
      </p>
      <button className="btn btn-primary mt-6" onClick={reset}>
        Open the counter again
      </button>
    </div>
  );
}

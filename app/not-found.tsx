import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start px-4 sm:px-6" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
      <p className="micro">404 · no such page</p>
      <h1 className="mt-3 text-[30px] font-semibold tracking-tight text-ink">
        This page was never issued a stub.
      </h1>
      <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
        The thing you are looking for does not exist at this address. The counter is still open.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/app" className="btn btn-primary">
          Check a claim
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back to the front page
        </Link>
      </div>
    </div>
  );
}

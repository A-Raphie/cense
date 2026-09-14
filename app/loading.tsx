export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6" style={{ paddingTop: "var(--space-section)" }} aria-busy="true">
      <div className="h-4 w-32" style={{ background: "var(--bg-subtle)" }} />
      <div className="mt-4 h-16 w-full max-w-[640px]" style={{ background: "var(--bg-subtle)" }} />
      <div className="panel mt-10 max-w-[640px] px-6 py-5">
        <div className="h-5 w-28" style={{ background: "var(--bg-subtle)" }} />
        <div className="mt-4 h-4 w-full" style={{ background: "var(--bg-subtle)" }} />
        <div className="mt-2 h-4 w-4/5" style={{ background: "var(--bg-subtle)" }} />
        <div className="mt-2 h-4 w-3/5" style={{ background: "var(--bg-subtle)" }} />
      </div>
    </div>
  );
}

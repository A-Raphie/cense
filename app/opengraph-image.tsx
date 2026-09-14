import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cense: pay a cent, know if it's true";

/* Static OG rendered at build (count v3 lesson: no server fetches in OG).
   Values mirror globals.css tokens; keep both in sync. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fcf6f1",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 22, height: 22, background: "#fcff52", border: "2px solid #151310" }} />
          <span style={{ fontSize: 30, fontWeight: 700, color: "#151310" }}>Cense</span>
          <span style={{ fontSize: 22, color: "#655947" }}>· a verification agent on Celo mainnet</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: "-0.03em", color: "#151310", lineHeight: 1.02 }}>
            Pay a cent.
          </div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: "-0.03em", color: "#151310", opacity: 0.4, lineHeight: 1.02 }}>
            Know if it&apos;s true.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", padding: "12px 20px", background: "#fcff52", border: "2px solid #151310", fontSize: 26, color: "#151310" }}>
            $0.01 per check · x402 · USDC
          </div>
          <div style={{ fontSize: 24, color: "#655947" }}>VERIFIED · REFUTED · UNVERIFIABLE</div>
        </div>
      </div>
    ),
    size,
  );
}

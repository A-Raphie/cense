# Cense — design.md (binding contract)

## Style Genome — Cense
- **Mode: K · ticket-and-stub** (one-level hybrid: + D tabular grid discipline inside /app ledger table). The product IS a claim check: hand over your claim, pay a cent, receive a numbered stub. Unused mode; unused mechanic.
- **Axis pushes:** ① layout paradigm = document/counter metaphor (check counter, stubs tear off) — NOT document/ledger list layout (owned by rushes/assay/scrip); ② motion = event-only choreography (the stub tears ON settlement; nothing loops; `[data-reduce-motion]` override); ③ color = sponsor-true single accent (Celo #fcff52 as STOCK, never text — black ink on yellow).
- **Axes held conventional:** typography (two-font Plex system, sans display), elevation (hairlines + 1px rules, no shadows), density (marketing-airy landing, command-dense app ledger).
- **Neutral reference of the build: celo.org** (sponsor's own site; never used by a prior build; hexes mined live this build: #fcff52 ×9, #fcf6f1, #e7e3d4, #655947, #56df7c, #ffa3eb, #7cc0ff). Pending: IAB render check before ship.
- **Signature move: THE CLAIM STUB.** Every check renders as a perforated stub: serial `cense-YYYYMMDD-xxxx`, claim, verdict ink, sources, settlement block (tx hash → celoscan, fee, block). Stub TEARS off the counter when the x402 settlement lands (clip-path tear + drop, event-driven). Demo money moment = the tear. Five-minute test: perforation + serial + settlement block + tear choreography is bespoke; not in any library.
- **Ledger check:** last 3 (count v3 paper-desk/intaglio/violet-rule; Curb chart-canvas/spec-sheet; ballast time-canvas/decision-ink) — all avoided. Long-banned avoided: document/ledger lists, stamps (assay), ticker-tape printing (scrip), mono-first, terminal instrument, stillness-as-pitch, verdict desaturated pairs (recourse/tally), dark+accent (gage/tally v3/purser), didone numerals (count), decision card/bell (purser/verger).
- **Clone test:** beside celo.org, Cense reads as a ticket counter, not a chain landing: perforation, serials, stub tear, ledger table. Beside claimcheck (cream legal verdict cards): different mode (K vs legal), different stock (yellow/ivory, no cream), different signature.

## Tokens (semantic-tokens contract; zero raw hex outside globals.css)
- field `#fcf6f1` · surface `#ffffff` · stock `#fcff52` (yellow underlay: black ink only) · manila `#e7e3d4` (muted surface / stub backs)
- ink `#151310` · ink-2 `#655947` (Celo brown-gray) · ink-3 faint
- hairline `#00000014` · rule `#00000026` (1px grid lines in app)
- accent (action) `#151310` ink-on-light button + stock-yellow fill pair; links underline only
- status: supported `#1F7A3D` / contradicted `#B3261E` / unverifiable `#655947` — computed for AA on ivory; ALWAYS paired with label + glyph (color never sole signal)
- radius: 2px sharp (ticket stock), 6px controls, 999 pills
- type: IBM Plex Sans (display 600 tight / prose 400) + IBM Plex Mono (serials, stubs, ledger data, code — never display scale). Geist fallbacks not needed.
- numerics: `tabular-nums` everywhere money/counts appear. Focus-visible 3px outline. 44px controls.

## Anatomy (winsznx Part 3, cut to 6 chunks per count-v3 lesson)
1. **One top bar** (only chrome row): Cense brand-left · nav (Instrument, Proof, FAQ) · live dot + `Celo mainnet` pill right. App shares this spine.
2. **Hero (split 7/5):** plain eyebrow → two-tone h1 ("Pay a cent. / Know if it's true.") → 56ch lede → ONE primary CTA (Check a claim → /app) + ghost (Read the proof → /#proof) → quiet proof line. Right: framed live CLAIM STUB object (last real check; labeled honestly if none).
3. **Mechanism** (numbered 01-04 + one mono flow line; money-moment rail beside steps).
4. **Can/cannot** (✓/✗ two-col; folded from why-blocks).
5. **Proof /#proof:** recent stubs ledger (real checks only; empty state teaches + discloses).
6. **FAQ (4)** → final CTA (ends on last verdict) → honest footer (mainnet posture, built by Raphie → x.com/a_raphie).
- /app (Part 4): shared top bar → plain-verb opener line → instrument (textarea + Check button $0.01) → stub output with all states (empty teaches / skeleton stub-shaped / error retries in place / success tears) → house-check disclosed one-per-visit → agent section (curl + X-PAYMENT snippet) → recent ledger (dense table, D-grid discipline).

## Copy voice (humaniser)
No em dashes. No buzzwords. Buttons are verbs with objects. One line per element. Claims in copy must be exercised against the build (claims-verify at ship).

## Avoid-list
Gradients · glassmorphism · shadows on light stock · mono display · emoji icons · purple/blue · bento grids · sparse wireframe · mascots · stock photos · fade-in-up loops · dead links · second header bar · duplicate CTA · stacked end-margins (compact tail: closer 64, footer 24) · purple-to-blue anything · universa rounded-2xl.

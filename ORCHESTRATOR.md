# Cense — Hackathon Orchestrator Ledger
Event: Celo "Agents at Work" (https://celoplatform.notion.site/Agents-at-Work-Hackathon-3c1d5cb803de81139de7f4f3d09e55dc) · Deadline: **2026-09-21 09:00 UTC** · Winners Sep 25 · Current stage: 3 (Build) · Updated: 2026-09-13

## Event facts (verified from celobuilders.xyz API + Notion, Sep 13)
- Celo MAINNET ONLY (eip155:42220). Testnet counts for nothing.
- Registration = first draft save → returns attributionTag (`celo_` + 12 hex, derived from owner/repo, locked at first save). **Tag must be in calldata of every tx BEFORE it's sent. No backfill.**
- x402 settlement attribution to agentWalletAddress is RETROACTIVE (late wallet costs nothing but visibility).
- Tracks: value-moved $2k (1500/500) · real-world-adoption $1k + stablecoin $750 (cNGN/wFIAT/USAt/x402 qualify) · askbots-growth $500 (round 2 Sep 19-20) · judges-favorite $500 · buy-feedback $250 (5×$50).
- Judging: live Dune dashboards + farming audit (pre-existing wallet history, first-funder collapse, spawn-window clustering, text self-similarity).
- Submission: PUT /submissions/me then /publish (confirm:true). Required: public X post (@CeloDevs + @Celo), celoNetwork=celo-mainnet, ERC-8004 agent URL, agent wallet, Telegram.

## Sweeps
| Stage | Entered | Exited | Notes |
|---|---|---|---|
| 0 Calibrate | Sep 13 | Sep 13 | live-page research via 3 agents; forensic playbook read; go/no-go approved by Raphie (full push, claim-check thesis, ≤$5 float) |
| 1 Idea | Sep 13 | Sep 13 | idea picked via gates: pay-per-claim-check x402 agent (translate Claimcheck thesis); autopsy+before-you-build compressed into gate questions per ≤48h-style compression (8d window, collision week) |
| 2 Plan+design | Sep 13 | Sep 13 | naming: Cense locked (portfolio diff: assay/assize collision caught, obol/truebill/sounding/gainsay/winnow cut); repo public; scaffold |
| 3 Build | Sep 13 | — | spike: x402 rail proven to verify-stage; settle pending funding+API key |

## Skill ledger
| Skill | Stage | State | Note |
|---|---|---|---|
| hackathon-orchestrator | 0 | ✅ | this ledger |
| hackathon-winner-research | 0 | ✅ | 3 research agents; winner patterns: narrow job + owned channel + onchain metrics |
| naming | 2 | ✅ | Cense locked; trycense.com clean; A-Raphie/cense free |
| hackathon-idea-hack | 1 | 🔍 | gates answered by Raphie directly (thesis pre-chosen from research-backed shortlist) |
| idea-autopsy | 1 | 🔍 | ≤48h-style compression: idea-hack gates embedded in go/no-go questions |
| see-whats-going-on | 0 | ✅ | Notion page + celobuilders API + docs.celo.org fetched & read |
| semantic-tokens / component-harvest / ui-craft / ux-laws / humaniser | 3 | ⏸ | revisit at UI build (Sep 14-16) |
| hackathon-design | 3 | ⏸ | differentiator identity pass before UI |
| deploy-target check | 2 | ✅ | Vercel static/serverless only; spike runs local; prod = Next.js API routes or Hono-on-Vercel |
| wallet-connect-fix | 3 | ⏸ | buyer wallet UX in /app |
| mock-hunter | 5 | ⏸ | pre-demo: every value REAL vs MOCK |
| claims-verify | 5 | ⏸ | pre-submission: copy vs deployed build |
| ship-rehearsal → pre-release-review → pre-ship-gate | 5 | ⏸ | ship order mandated |
| readme / submission / x-post | 6 | ⏸ | submission package Sep 20-21; socialLink = real X post |
| post-hackathon | 7 | ⏸ | keep-alive through Sep 25 |
| lemmaly/invariant-guard/mathguard | 3 | 🔍 | no non-trivial algorithms in scope yet; revisit if receipt-anchor batching gets clever |
| talk-to-users | 1 | 🔍 | 8-day window + mainnet micro-price product; distribution = X + agent-callable API |

## Stage gate (current: 3 → 4 boundary)
- [x] Spike de-risked: x402 402→sign→retry proven (Express local) — Sep 13
- [x] Engine LIVE: Groq gpt-oss-120b + browser_search → strict sourced verdicts — Sep 13
- [x] Serverless port LIVE: Hono + @x402/hono on Next 16; **https://cense-lake.vercel.app** — Sep 13
- [x] UI family BUILT + deployed (Sep 14): Mode K ticket-and-stub genome; THE CLAIM STUB signature; landing 6-chunk; /app counter instrument; house checks; chain-read ledger; metadata + OG + icons + 404/error/loading; states verified live in IAB (skeleton/disabled/error all exercised)
- [x] Production hardening: fast-budget engine (15s calls, bounded retries, 50s deadline), phase instrumentation, visitor-safe error mapping; Vercel env vars GROQ_API_KEY + AGENT_WALLET_ADDRESS set
- [⚠] **Groq TPD exhausted (Sep 14)**: shared free key hit 200K tokens/day (199,040 used) — live checks 422 with honest "daily budget" copy until reset. FIX = fresh dedicated Groq key (his 2-min job) → vercel env add + redeploy. NOT a code bug; the 402 rail, engine logic, UI all proven.
- [ ] Raphie gates QUEUED: ① fresh Groq key (or wait for TPD reset) ② fund wallets (buyer 0xCE7f…6f72 ~$2 USDC; agent 0x2f7c…9A54 ~$2 USDT) ③ x402.celo.org API key ④ Telegram handle ⑤ Google sign-in
- [ ] After gates: live happy-path check → register → tag → mint 8004 → first tagged tx → x402 settle proof → X post draft
- [ ] Sep 19-20: mock-hunter + claims-verify + ship-rehearsal + README honesty table + submission package
- [ ] Sep 21: submission publish (notify-gate → his click)

## Gotchas learned (build log)
- bun fetch honors a localhost interception (use 127.0.0.1); port 8787 squatted on this Mac
- toDataSuffix(tag) RETURNS the suffix to append to calldata (not a 2-arg wrap)
- Hono middleware sees FULL path — x402 RoutesConfig keys must carry the /api prefix; no basePath
- Next 16 reverts tsconfig target to ES2017 — use BigInt() calls, not literals
- Vercel env add CLI: pipe value via stdin, ONE environment per call
- Groq free tier: TPD 200K/day (not just TPM) — browser_search calls cost ~1K tokens each; 429 retry hints can be 30s+ and will eat a serverless function window if retries are unbounded
- IAB fullPage screenshots loop on short pages (stitcher artifact); capture per-viewport; hidden-pane visibility toggle fixes "capture failed for guest"

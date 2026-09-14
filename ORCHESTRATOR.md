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

## Stage gate (current: 3)
- [x] Spike de-risked: x402 402→sign→retry proven (Express local) — Sep 13
- [x] Engine LIVE: Groq gpt-oss-120b + browser_search → strict sourced verdicts (Eiffel VERIFIED / coffee REFUTED, 22-30s, 429 pacing auto) — Sep 13
- [x] Serverless port LIVE: Hono + @x402/hono on Next 16 catch-all; production build green; **deployed https://cense-lake.vercel.app — live 402 + payment-required header verified** — Sep 13
- [x] Gotchas solved: facilitator port 8787 squatter (use 8913+), bun honors localhost interception (use 127.0.0.1), toDataSuffix(tag) RETURNS suffix to append, Hono middleware sees full path (no basePath with x402 RoutesConfig), dep must live in cense/package.json (parent root node_modules trap)
- [ ] ERC-8004 mint (script ready `scripts/mint-8004.ts`, HARD-GATED on ATTRIBUTION_TAG; needs agent wallet USDT) — after funding + registration
- [ ] Registration → attributionTag → wire toDataSuffix into EVERY tx path
- [ ] First tagged tx + verifyTx decode check
- [ ] UI family: design-direction + winsznx genome + ui-craft (landing + /app instrument)
- [ ] Settle proof: needs funded buyer USDC + X402_API_KEY (free credits on new account)
- [ ] Raphie gates QUEUED: ① fund wallets (buyer 0xCE7f…6f72 ~$2 USDC; agent 0x2f7c…9A54 ~$2 USDT) ② x402.celo.org API key ③ Telegram handle ④ Google sign-in

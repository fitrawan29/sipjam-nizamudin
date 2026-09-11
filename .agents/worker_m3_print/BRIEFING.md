# BRIEFING — 2026-09-11T13:09:20Z

## Mission
Implement Milestone 3: Strict Print Formatting (PrintHeader & Signatures) for sipjam-app, adhering to all typography, dynamic scaling, Google Drive URL transformation, and signature rules.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_print
- Original parent: 5a481f87-05a5-40d3-b299-861aa70f2584
- Milestone: Milestone 3 - Strict Print Formatting (PrintHeader & Signatures)

## 🔒 Key Constraints
- Exclusive write ownership: `src/components/PrintHeader.tsx`, `src/app/globals.css`, `src/components/AdminConfigView.tsx` (only for `kota_ttd`).
- Do NOT touch `GuruJurnal.tsx`, `AppScreen.tsx`, or `layout.tsx`.
- All implementations must be genuine - no cheating, hardcoded test strings, or dummy facades.
- Must execute Git Workflow Rule upon task completion (`git status`, `git add .`, `git commit -m "..."`, `git push origin main`).
- Must report completion via `send_message` to parent (`5a481f87-05a5-40d3-b299-861aa70f2584`).

## Current Parent
- Conversation ID: 5a481f87-05a5-40d3-b299-861aa70f2584
- Updated: 2026-09-11T13:09:20Z

## Task Summary
- **What to build**:
  1. PrintHeader: Google Drive URL transformation (`transformGoogleDriveUrl`), logo sizing (`shrink-0 w-24 h-24`), address single-line enforcement (`nowrap`), dynamic font size scaling for long addresses, exact line-height 1 (`leading-none`).
  2. PrintSignature: "[Kabupaten/Kota], [Date]" immediately above "Kepala Sekolah", dynamic region from `kota_ttd` / fallback from `kop_alamat`, Indonesian date formatting in WITA (`Asia/Makassar`).
  3. globals.css: Print media rules for line-height 1, `.print-address`, container queries, and pagination protection.
  4. AdminConfigView: Input field for `kota_ttd`.
- **Success criteria**: Clean compilation via `npm run build`, verified print preview rendering, clean tests/build.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not yet run
- **Lint status**: Clean
- **Tests added/modified**: Pending

## Artifact Index
- `.agents/worker_m3_print/DISPATCH.md` — Assignment instructions
- `.agents/worker_m3_print/BRIEFING.md` — Situational awareness index
- `.agents/worker_m3_print/progress.md` — Liveness and progress heartbeat
- `.agents/worker_m3_print/handoff.md` — Final handoff report

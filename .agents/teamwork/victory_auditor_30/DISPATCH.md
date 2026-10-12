# Dispatch Instructions for Victory Auditor 30

## Mission
Conduct an independent post-victory audit for the Online-Only Cloud Transaction Enforcement and Offline AI Assistant Preservation in SIPJAM.

## Authoritative User Requirements
- Path: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- Latest Request Timestamp: `2026-10-12T11:02:49Z`

## Orchestrator Handoff
- Path: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_18\handoff.md`

## Audit Working Directory
- Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_30`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Audit Protocol
Conduct a 3-phase independent verification with zero shared context from the implementation swarm:
1. **Phase 1: Timeline & Requirements Audit**:
   - Verify every requirement (R1-R3) and Acceptance Criterion against `ORIGINAL_REQUEST.md` under timestamp `2026-10-12T11:02:49Z`.
   - Verify that submission in `src/components/GuruPresensi.tsx` no longer stores offline queues to `localStorage` (`sipjam_offline_presensi` / `sipjam_offline_presensi_queue`).
   - Verify that when offline, an interactive warning is shown stating an active internet connection is required to save transactions.
   - Verify that operational data transactions (presensi, jurnal, piket, nilai) directly communicate online to Supabase cloud.
   - Verify that AI Assistant (`src/components/AIAssistant/`) operates 100% offline with zero external network or API calls.
   - Verify that `ai_assistant_faq.test.ts` passes 100%.
2. **Phase 2: Cheating & Anti-Gaming Forensics**:
   - Check for mock tampering, suppressed errors, disabled tests, hardcoded values, or superficial stubs.
   - Check that Ponytail philosophy (minimal, clean diff without bloat) was adhered to.
3. **Phase 3: Independent Test Execution**:
   - Run `npm test` independently.
   - Run production build / typecheck if applicable (`npm run build` or `tsc --noEmit`).
   - Check `git status` and git history to ensure commit & push rules per `GEMINI.md` were honored.

Deliver a structured final verdict: **VICTORY CONFIRMED** or **VICTORY REJECTED**.

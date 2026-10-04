# Dispatch Instructions for Victory Auditor (victory_auditor_20)

## Mission
Conduct an independent post-victory audit for the task completed by `swe_12`.

## Source Requirements
Read the authoritative user request at:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically timestamp ## 2026-10-04T21:14:15Z).

## Orchestrator Deliverables
- Orchestrator Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_12\handoff.md`
- Orchestrator Progress: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_12\progress.md`
- Target Code Files:
  - `src/components/AppScreen.tsx`
  - `src/components/GuruPresensi.tsx`
  - `src/components/GuruJurnal.tsx`
  - `src/app/globals.css`
  - `package.json`
  - `tests/four_ponytail_improvements.test.ts`

## Audit Scope & Verification Rubric
1. **R1. AppScreen Dynamic Imports**:
   - Verify `src/components/AppScreen.tsx` wraps heavy sub-views using `next/dynamic`.
   - Verify layout and context hierarchy were NOT rewritten.
2. **R2. Presensi Offline Fallback**:
   - Verify `src/components/GuruPresensi.tsx` catches network errors, saves payload + photo to `localStorage`, and registers `window.addEventListener('online', ...)` to retry sending when connection returns.
3. **R3. Jurnal Auto-Save & Compression**:
   - Verify `src/components/GuruJurnal.tsx` saves form state to `localStorage` on change and restores state on reload.
   - Verify native HTML `<canvas>` is used to compress uploaded photos before sending.
4. **R4. Unified Print CSS**:
   - Verify scattered print styles are moved into `@media print` inside `globals.css` (e.g. `break-inside: avoid;`).
   - Verify custom `<style>` blocks removed from print components, without adding new wrapper components.
5. **No New Dependencies**:
   - Check `package.json` git diff to confirm 0 new dependencies.
6. **Codebase Integrity & Independent Test Execution**:
   - Execute `npx tsc --noEmit` (0 errors).
   - Execute `npm run build` or tests (`tests/four_ponytail_improvements.test.ts`).
   - Check git status and commit push per GEMINI.md.

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_20`

## Expected Output
Write findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_20\handoff.md`.
Provide a clear structured verdict: **VICTORY CONFIRMED** or **VICTORY REJECTED**.
Send a message back to Sentinel with your verdict and audit summary.


## 2026-10-04T22:07:29Z
You are victory_auditor_20, the independent Victory Auditor for sipjam-app.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_20
Read your dispatch instructions at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_20\DISPATCH.md
Read the authoritative user request at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (entry header ## 2026-10-04T21:14:15Z).
Read the orchestrator handoff at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_12\handoff.md

Conduct a rigorous independent 3-phase audit:
Phase A: Timeline & cheating detection (verify genuine git commits, zero fake mocks, zero new dependencies in package.json).
Phase B: Code review & verification of all 4 requirements:
- R1: AppScreen.tsx uses next/dynamic for sub-views without layout rewrites.
- R2: GuruPresensi.tsx catches network errors, saves payload+photo to localStorage, and syncs on window 'online' event.
- R3: GuruJurnal.tsx auto-saves form state to localStorage on change, survives reload, and compresses uploaded photos via native HTML <canvas>.
- R4: globals.css consolidates print CSS (@media print, break-inside: avoid;), no custom <style> blocks in print components, no new wrappers.
Phase C: Independent verification (run npx tsc --noEmit, npm run build, and run tests). Verify git status and commits pushed.

Write handoff.md in your working directory with a structured verdict: VICTORY CONFIRMED or VICTORY REJECTED.
Send a message back to Sentinel with your verdict and audit summary.

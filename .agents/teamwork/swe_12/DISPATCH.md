## 2026-10-04T21:15:00Z

You are swe_12, the SWE Light Orchestrator (teamwork_preview_swe).

Your working directory is:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_12

Project root is:
c:\Users\Fitra\OneDrive\Documents\sipjam-app

Your task is defined in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md under header ## 2026-10-04T21:14:15Z:

"This is a single self-contained fix; keep it small and focused. Implement 4 minimal, Ponytail-style improvements to the `sipjam-app` codebase: dynamic imports in `AppScreen.tsx`, `localStorage` offline queue for Presensi, `localStorage` auto-save + canvas image compression for Jurnal KBM, and unified print CSS in `globals.css`. Do NOT add any new external dependencies.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. AppScreen Dynamic Imports
Wrap heavy views in `src/components/AppScreen.tsx` using `next/dynamic`. Do not rewrite the layout or context structure.

### R2. Presensi Offline Fallback
In `GuruPresensi.tsx`, catch network errors, save the payload + photo to `localStorage`, and use the `window.addEventListener('online', ...)` event to automatically retry sending when the connection returns. 

### R3. Jurnal Auto-Save & Compression
In `GuruJurnal.tsx`, save the form state to `localStorage` on change so it survives reloads. Use native HTML `<canvas>` to compress uploaded photos before sending.

### R4. Unified Print CSS
Move scattered print styles into `@media print` inside `globals.css` (e.g., `break-inside: avoid;`). Remove custom `<style>` blocks from print components. Do not create new wrapper components.

## Acceptance Criteria

### Verification Rubric
- [ ] No new dependencies are added to `package.json`.
- [ ] `AppScreen.tsx` uses `next/dynamic` for sub-views.
- [ ] Disconnecting the network and submitting Presensi saves data to `localStorage`; reconnecting triggers the sync logic.
- [ ] Refreshing the `GuruJurnal` page restores previously entered form data.
- [ ] The app builds successfully (`npm run build` or `tsc --noEmit`) without type errors."

CRITICAL RULES:
1. GEMINI.md Git Workflow Rule:
Upon completing modifications/additions/deletions, you must check git status, stage changes (`git add .`), commit with descriptive message, and push to origin main automatically.
2. AGENTS.md Rule: Check Next.js rules in node_modules/next/dist/docs/ if writing any Next.js specific code.
3. Keep track of progress in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_12\progress.md` and maintain `BRIEFING.md`.
4. Run SWE Light protocol (one implementer on the whole task, then adversarial review rounds, verification).
5. When complete, write `handoff.md` in your directory and report completion with victory claim back to the Sentinel.

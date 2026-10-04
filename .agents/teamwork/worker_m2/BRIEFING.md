# BRIEFING — 2026-10-04T07:37:00Z

## Mission
Implement Milestone 2 (R3): Hide AI Assistant / floating elements in print while strictly preserving .sipjam-print-watermark, standardize teacher DokumenView printing to match Admin standard, and standardize RekapJurnalView print layout and Wali Kelas signature autofill.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: Milestone 2 (R3)

## 🔒 Key Constraints
- Exclusive write ownership files:
  - `src/app/globals.css`
  - `src/components/AIAssistant/AIAssistant.tsx`
  - `src/components/DokumenView.tsx`
  - `src/components/RekapJurnalView.tsx`
- DO NOT write to any other source files.
- Integrity mandate: genuine implementation only, zero hardcoded cheat results.
- Run `npx tsc --noEmit` and confirm 0 TypeScript errors.
- Ensure `.sipjam-print-watermark` has `display: flex !important;` in `@media print` and is never hidden by fixed element rules.
- Follow Git Workflow Rule at completion if applicable or report back to orchestrator.

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T07:37:00Z

## Task Summary
- **What to build**:
  1. Hide floating robot / AI Assistant and floating UI in print:
     - `src/components/AIAssistant/AIAssistant.tsx`: added `no-print print:hidden` to trigger button & chat modal.
     - `src/app/globals.css`: added `@media print` selectors for `[data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], [role="dialog"][aria-label*="Asisten AI"], .fa-robot, button.fixed, div.fixed:not(.sipjam-print-watermark)`.
  2. Preserve `.sipjam-print-watermark` in `src/app/globals.css`:
     - Ensured `display: flex !important;` in `@media print`, exempted from fixed element hiding via `:not(.sipjam-print-watermark)`, and hidden on `@media screen`.
  3. Standardize teacher document printing in `src/components/DokumenView.tsx`:
     - Added `<PrintHeader user={user} sekolahId={user?.sekolah_id} />`.
     - Added standardized Print Subheader with Teacher Name, School Year, Print Date.
     - Added `PrintOrientationToggle` and "Cetak Dokumen" button with `no-print`.
     - Hid interactive web cards, KPI tabs, and upload forms with `no-print`.
     - Added standardized Print-Only Table (`border-collapse border border-black text-[8pt]`, header `bg-gray-100 text-black font-bold px-2 py-1.5`, cells `px-2 py-1.5 border border-black`).
     - Rendered `<PrintSignature />` with dual signers.
  4. Standardize print styling & Wali Kelas autofill in `src/components/RekapJurnalView.tsx`:
     - Standardized cell padding from `p-2` to `px-2 py-1.5 print:p-1.5`.
     - Standardized table header background to `print:bg-gray-100`.
     - Added `no-print` to raw GPS coordinates.
     - Autofilled Wali Kelas name and NIP in signature when user is Wali Kelas (`isWaliKelas || waliClasses.length > 0`).

## Change Tracker
- **Files modified**:
  - `src/app/globals.css`: expanded `@media print` hide selectors, preserved `.sipjam-print-watermark`, hid watermark in `@media screen`.
  - `src/components/AIAssistant/AIAssistant.tsx`: added `no-print print:hidden` on floating button and chat modal.
  - `src/components/DokumenView.tsx`: integrated PrintHeader, subheader, orientation toggle, print-only table, and PrintSignature; marked web cards with `no-print`.
  - `src/components/RekapJurnalView.tsx`: standardized table padding (`px-2 py-1.5`), header bg (`print:bg-gray-100`), hid GPS coords (`no-print`), autofilled Wali Kelas signature.
- **Build status**: `npx tsc --noEmit` PASS (0 errors), `npm test` PASS (all suites), `npm run build` PASS.
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (TypeScript 0 errors, full Next.js build clean, 25/25 M2 checks passed).
- **Lint status**: Clean.
- **Tests added/modified**: `.agents/teamwork/worker_m2/verify_m2.ts` (25 automated assertion checks covering all M2 criteria).

## Loaded Skills
- None specified in dispatch

# BRIEFING — 2026-10-04T07:22:30Z

## Mission
Survey technical details for R3: Penyesuaian Format Cetak Dokumen Guru & Hapus "Robot" (Kecuali Watermark).

## 🔒 My Identity
- Archetype: explorer
- Roles: technical surveyor, analyst
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source files
- Strict 5-component handoff report (handoff.md)
- Ensure school watermark is preserved while hiding robot/floating UI during print
- Send message to parent upon completion

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T07:15:30Z

## Investigation State
- **Explored paths**:
  - `src/app/globals.css`: `@media print` rules, watermark styles, selector gaps
  - `src/components/PrintHeader.tsx`: Kop surat, watermark portal, signatures, orientation toggle
  - `src/components/AIAssistant/AIAssistant.tsx`: floating trigger button with `fa-robot` & chat panel missing `no-print`
  - `src/components/DokumenView.tsx`: missing `PrintHeader`, subheader, table layout, signatures, print button
  - `src/components/RekapJurnalView.tsx`: comparison of teacher journal print vs admin rekap print
  - `src/components/AdminRekapView.tsx`: gold standard admin print layout
  - `src/components/GradebookView.tsx`, `src/components/PiketView.tsx`, `src/components/RekapSiswaView.tsx`: other print layouts
  - `src/components/Onboarding/OnboardingTutorial.tsx`, `TeacherReminderManager.tsx`: other floating UI elements
- **Key findings**:
  1. The "Robot" element is the AIAssistant trigger button (`fa-robot`) and chat dialog in `AIAssistant.tsx`. Neither has `no-print` / `print:hidden`. In `globals.css`, selector `[class*="ai-"]` fails to match because AIAssistant uses utility classes (`fixed bottom-5 right-5 ...`).
  2. The school watermark is created in `PrintHeader.tsx` line 178 via `createPortal(<div className="sipjam-print-watermark">...)` into `document.body` and styled in `globals.css` with `position: fixed; opacity: 0.07; rotate(-45deg); z-index: 9999;`. Any broad `@media print` rule hiding fixed elements MUST exempt `.sipjam-print-watermark`.
  3. `DokumenView.tsx` currently has NO print integration at all (no `PrintHeader`, no Kop Surat, no watermark, no signatures, no tabular print layout, no `no-print` on screen cards/buttons).
  4. `RekapJurnalView.tsx` has minor formatting differences compared to `AdminRekapView.tsx` (cell padding 8px vs 6px, header background gray-200 vs gray-100, raw GPS text printed without `no-print`, Wali Kelas name unpopulated).
- **Unexplored areas**: None. Complete investigation achieved across all relevant files.

## Key Decisions Made
- Formulate concrete CSS and component fixes:
  1. Add `no-print print:hidden` directly to `AIAssistant.tsx` (button and modal) and update `globals.css` `@media print` to catch all floating UI (`[data-tour="ai-assistant-btn"]`, `[aria-label*="Asisten AI"]`, `.fa-robot`, `button.fixed`, `div[class*="fixed"]:not(.sipjam-print-watermark)`).
  2. Explicitly preserve `.sipjam-print-watermark` in `globals.css` and ensure `PrintHeader` is mounted in all document views (including `DokumenView.tsx`).
  3. Add full print architecture to `DokumenView.tsx` (Kop Surat, Watermark, Print Subheader, Printable Curriculum Documents Table, `PrintSignature`, and `PrintOrientationToggle`).
  4. Standardize table padding and styling in `RekapJurnalView.tsx` to match Admin's layout.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- BRIEFING.md — Persistent context & state
- progress.md — Liveness heartbeat
- handoff.md — Final investigation report

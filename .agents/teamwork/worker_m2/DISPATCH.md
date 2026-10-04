## 2026-10-04T07:25:38Z
You are Worker 2 (worker_m2).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2

Read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request at the bottom, 2026-10-04T07:11:46Z).

Read PROJECT.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_13\PROJECT.md

Read the survey handoff from explorer_survey_2 at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md

Your exclusive write ownership files (YOU OWN ONLY THESE FILES):
- `src/app/globals.css`
- `src/components/AIAssistant/AIAssistant.tsx`
- `src/components/DokumenView.tsx`
- `src/components/RekapJurnalView.tsx`
DO NOT write to any other source files.

Task: Implement Milestone 2 (R3):
1. Sembunyikan Elemen Robot & Tombol UI Melayang saat Print:
   - In `src/components/AIAssistant/AIAssistant.tsx`: Add `no-print print:hidden` to the trigger button (`data-tour="ai-assistant-btn"`) and chat modal dialog container.
   - In `src/app/globals.css`: In `@media print`, expand selectors to hide:
     `[data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], [role="dialog"][aria-label*="Asisten AI"], .fa-robot, button.fixed, div.fixed:not(.sipjam-print-watermark)`
     Ensure all floating/interactive buttons are hidden cleanly.

2. Pertahankan Watermark Sekolah:
   - CRITICAL: Watermark sekolah (`.sipjam-print-watermark`) in `PrintHeader.tsx` and `globals.css` MUST REMAIN PRINTED.
   - Ensure ANY rule hiding `fixed` elements strictly uses `:not(.sipjam-print-watermark)`.
   - Ensure `.sipjam-print-watermark` has `display: flex !important;` in `@media print`.

3. Standarisasi Format Cetak Dokumen Guru (Identik Admin):
   - In `src/components/DokumenView.tsx`:
     - Import and render `<PrintHeader user={user} sekolahId={user?.sekolah_id} />`.
     - Add print subheader (Nama Guru, Tahun Ajaran, Tanggal Cetak).
     - Add `PrintOrientationToggle` and "Cetak Dokumen" button (`no-print`).
     - Hide web interactive cards, KPI tabs, upload forms with `no-print`.
     - Add clean print table (Print-Only Table) for curriculum documents / teacher requirements with admin standard styling (`border-collapse border border-black text-[8pt]`, header `bg-gray-100 text-black font-bold px-2 py-1.5`, cells `px-2 py-1.5 border border-black`).
     - Render `<PrintSignature />` (Guru & Kepala Sekolah).
   - In `src/components/RekapJurnalView.tsx`:
     - Standardize table cells from `p-2` to `px-2 py-1.5` / `print:p-1.5`.
     - Standardize table header bg to `print:bg-gray-100`.
     - Add `no-print` to raw GPS coordinates.
     - Autofill Wali Kelas name in signature if user is Wali Kelas (`isWaliKelas`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Acceptance verification:
Run `npx tsc --noEmit` and relevant tests. Make sure there are 0 TypeScript errors.
Document all changes and test outputs in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md`.
Send a message to parent when completed.

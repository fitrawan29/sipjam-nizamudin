## 2026-10-16T11:50:43Z
[Message] timestamp=2026-10-16T11:50:43Z sender=b8a13b7c-6c39-493c-96de-cd823a6f72d9 priority=MESSAGE_PRIORITY_HIGH content=You are test_writer_o22.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_o22
Caller/Parent ID: b8a13b7c-6c39-493c-96de-cd823a6f72d9

MANDATORY FIRST STEP:
Read the following files before starting any work:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_22\PROJECT.md
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m1\handoff.md
4. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m2\handoff.md
5. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_3\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test implementations must be genuine, comprehensive, and assert real behavior. DO NOT bypass tests or make them trivial.

EXCLUSIVE WRITE BOUNDARIES:
You EXCLUSIVELY own:
- `tests/whatsapp_parent_notify_and_autosave.test.ts` (create this file)
- `package.json` (append this test to the "test" script)
Do NOT modify application source code in `src/`.

TASK SPECIFICATION (Milestone 3 - Test Suite & Build Verification):
1. Create `tests/whatsapp_parent_notify_and_autosave.test.ts` following SIPJAM's test idiom (npx tsx with node:assert, clean colored pass/fail reporter, process.exitCode on failure).
Include the following 5 rigorous test sections:
- Section 1: Phone Number Normalization
  - Test valid formats: `081234567890`, `+6281234567890`, `6281234567890`, `0812-3456-7890`, `0812 3456 7890`, `(0812) 3456-7890`, `+62 (812) 3456-7890` -> all normalize to `6281234567890`.
  - Test edge cases / invalid numbers: `""`, `null`, `undefined`, `"12345"` (too short), `"021123456"` (landline), `"abcdef"` -> returns `null`.
- Section 2: WhatsApp URI & Message Formatting
  - Verify URI starts with `https://wa.me/6281234567890?text=`.
  - Verify query param is properly encoded with `encodeURIComponent`.
  - Verify message includes student name, class, date, status, school name, and optional note.
  - Test formatting across different attendance statuses: Hadir, Terlambat, Alpa, Bolos, Izin, Sakit.
- Section 3: Gradebook Scoped Draft Key & Storage Lifecycle
  - Setup mock `localStorage` attached to `globalThis.localStorage`.
  - Verify scoped key generation: `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`.
  - Test save, load, and clear lifecycle.
  - Verify data integrity of saved grades.
  - Test key isolation: drafts for different classes/subjects/TPs do not collide.
  - Test corrupted JSON handling: returns null gracefully without throwing.
- Section 4: GuruJurnal Offline Draft Retention
  - Test `saveJurnalDraft`, `loadJurnalDraft`, `clearJurnalDraft`.
  - Verify draft in localStorage is preserved when network failure / offline occurs, and only removed on explicit clear.
- Section 5: Static Code Inspection & UI Wiring Verification
  - Read `src/components/PiketView.tsx` and assert:
    - Imports from `@/utils/whatsappUtils`
    - Contains 1-click WhatsApp buttons in manual table, scan log, and mobile cards.
  - Read `src/components/RekapSiswaView.tsx` and assert:
    - Imports from `@/utils/whatsappUtils`
    - Contains 1-click WhatsApp buttons in Gerbang and Rekap tables with `print:hidden`.
  - Read `src/components/GradebookView.tsx` and assert:
    - Imports from `@/utils/draftStorage`
    - Contains debounced auto-save effect, restore effect, clear on save, and "Draft Lokal Tersimpan" badge.
  - Read `src/components/GuruJurnal.tsx` and assert:
    - Imports from `@/utils/draftStorage`
    - Contains "Draft Lokal Tersimpan" badge and draft preservation on network error.

2. Update `package.json`:
   - Append ` && tsx tests/whatsapp_parent_notify_and_autosave.test.ts` to the `"test"` script.

3. Execute and Verify:
   - Run the test suite: `npx tsx tests/whatsapp_parent_notify_and_autosave.test.ts`. Must pass with 100% success.
   - Run typecheck: `npx tsc --noEmit`. Must exit with code 0.
   - Run production build: `npm run build`. Must compile with 0 errors.

4. Write handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_o22\handoff.md`.
5. Send completion message to b8a13b7c-6c39-493c-96de-cd823a6f72d9.

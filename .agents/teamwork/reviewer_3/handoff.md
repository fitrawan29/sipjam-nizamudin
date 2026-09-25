# Reviewer Round 3 — Handoff Record

## Summary of Defects Found & Fixed in Round 3

1. **HTML5 Form Constraint Validation Blockage on Preserved State (`GuruPresensi.tsx`)**
   - **Input:** Teacher selects "Izin" mode, attaches a doctor's note / permit document, switches tabs or re-renders the component where `file` remains preserved in React state, then submits the form.
   - **Expected:** The form successfully submits using the preserved `file` object.
   - **Actual:** Native HTML5 constraint validation failed because `<input type="file" required>` lacked files in its DOM `FileList`, prompting the browser's native blocking tooltip "Please select a file" despite `file` already being present in React state.
   - **Root Cause:** Hardcoded `required` attribute on native file input instead of dynamic `required={!file}`.
   - **Fix:** Updated `<input type="file" required={!file} ...>` and rendered a document status badge with a confirmation modal for "Ganti File", ensuring complete state transparency and effortless document replacement.

2. **Silent Failure on Background Google Drive Sync (`GuruPresensi.tsx`)**
   - **Input:** Teacher submits attendance, instant non-intrusive toast is displayed, but background Google Drive upload fails (e.g., transient network hiccup).
   - **Expected:** Teacher is notified non-intrusively that photo sync failed so they can report or retry.
   - **Actual:** The background promise failure only logged to `console.error` and updated Supabase `link_bukti: 'gagal_upload'` without informing the user.
   - **Root Cause:** Missing non-intrusive error notification in the background upload catch handler.
   - **Fix:** Added `showToast('Sinkronisasi Tertunda', 'Foto tersimpan di database lokal namun gagal diunggah ke Google Drive.', 'warning')`.

3. **Residual Blocking SweetAlert2 Popups Across Remaining Views**
   - **Input:** User interacts with Account Settings (`AccountSettingsModal.tsx`), Admin Config (`AdminConfigView.tsx`), Admin Verification (`AdminVerifView.tsx`), Class Journal Recap (`RekapJurnalView.tsx`), and Chat (`ChatView.tsx`).
   - **Expected:** Validation warnings, success alerts, and informational notices are displayed as non-intrusive toasts without blocking OK click requirements.
   - **Actual:** Over 20 blocking modal dialogs persisted across these components.
   - **Root Cause:** Incomplete toast migration in previous rounds, which focused solely on GuruPresensi, GradebookView, PiketView, GuruJurnal, and AdminDataView.
   - **Fix:** Migrated all non-critical alerts in `AccountSettingsModal.tsx`, `AdminConfigView.tsx`, `AdminVerifView.tsx`, `RekapJurnalView.tsx`, and `ChatView.tsx` to `showToast` from `@/lib/toast`, while preserving critical destructive confirmation dialogs.

## Verification
- `npm test`: All 11 test suites passed 100% (61 UI/UX audit tests).
- `npm run test:e2e`: All 4 tiers passed 100% (111 assertions).
- `npm run build`: Turbopack build succeeded with 0 TypeScript/syntax errors.

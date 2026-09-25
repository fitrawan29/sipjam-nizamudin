# Dispatch to Reviewer (Round 2)

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_2
Parent Orchestrator: swe_1 (Conversation ID: 9dd52156-c90d-404b-9593-7446ffab66bb)

<original_task>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small, focused team

This is a single self-contained fix; keep it small and focused.

This project involves implementing a series of UI/UX improvements across the Sipjam application based on a recent audit. The primary goals are replacing blocking SweetAlert modals with non-intrusive toasts, fixing destructive form resets in attendance, and making data tables responsive on mobile devices.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Non-Intrusive Notifications
Replace generic blocking `Swal.fire` (SweetAlert2) calls for success, info, and validation errors with non-intrusive Toast notifications (e.g., using `react-hot-toast` or similar) across the application (especially in `GuruPresensi.tsx`). Critical alerts (like confirmation to delete) may still use modals.

### R2. Preserving Form State
In `GuruPresensi.tsx`, prevent the automatic deletion of the user's uploaded photo/selfie when they toggle between different attendance types (`tipeAbsen` or `jenisPresensi`). If state must be cleared, implement a confirmation warning first.

### R3. Mobile-Responsive Tables
Refactor data-heavy tables in `AdminDataView.tsx`, `PiketView.tsx`, and `GradebookView` to be mobile-friendly. Either wrap them in horizontally scrollable containers (`overflow-x-auto whitespace-nowrap`) or convert the rows into a stacked "Card" layout on small screens.

## Acceptance Criteria

### UI Behavior Validation
- [ ] Programmatic/Visual Check: Submitting a successful attendance record triggers a non-blocking toast. The UI does not present a popup requiring an "OK" click to proceed.
- [ ] Programmatic/Visual Check: Toggling between "Datang" and "Pulang" in `GuruPresensi.tsx` after attaching a mock file does not erase the file state without explicit user confirmation.
- [ ] Programmatic/Visual Check: Tables in `PiketView.tsx` and `AdminDataView.tsx` scroll horizontally (or stack) when the viewport width is simulated to be < 640px, without causing horizontal layout overflow on the main body.
</original_task>

<prior_attempt>
> [!WARNING] **Skepticism Disclaimer**
> High confidence in desktop, simulated mobile, and unit test suites across all 4 tiers, but live physical hardware touch scrolling on actual mobile devices and physical camera sensor handoff still remain untested in a real device environment.

## 1. What the prior attempt got wrong

1. **CameraSelfieCapture State Desync & UI Lockup when Resetting / Replacing Photo**
   - **Input:** User clicks "Ganti Foto" in `GuruPresensi.tsx` (which resets `file` and `photoPreviewUrl` to `null`), or completes attendance submission (which resets `photoPreviewUrl` to `null`).
   - **Expected:** `CameraSelfieCapture` detects prop update `existingPhotoUrl={null}`, clears its internal `capturedImage` state, and immediately restarts the live camera feed so the user can retake/take a new photo.
   - **Actual:** `CameraSelfieCapture` remained stuck displaying the old captured image `<img src={capturedImage} />` with no camera restart, effectively bricking photo capture until a hard page reload.
   - **Root Cause:** In `CameraSelfieCapture.tsx`, `capturedImage` was initialized with `useState(existingPhotoUrl || null)` with no `useEffect` reacting to `existingPhotoUrl` prop changes.

2. **Incomplete Toast Migration Across Master and Daily Views**
   - **Input:** Saving records or receiving validation errors in `AdminDataView.tsx`, `PiketView.tsx`, `GuruJurnal.tsx`, or `CameraSelfieCapture.tsx`.
   - **Expected:** Non-intrusive toast notifications for validation errors, upload errors, assignment confirmations, and save feedback per requirement R1.
   - **Actual:** Multiple generic blocking `Swal.fire` modals remained in `AdminDataView.tsx` (CSV upload, record inserts, updates, deletes), `PiketView.tsx` (photo validation, drive upload errors, teacher/student assignment notifications), `GuruJurnal.tsx` (photo requirement validation, upload error, save error), and `CameraSelfieCapture.tsx` (capture frame error, confirmation without capture).
   - **Root Cause:** Partial migration in prior attempt — implementer only converted a subset of success messages in `GuruPresensi` and `GradebookView`.

3. **Flawed and Vacuous Assertions in `tests/ui_ux_improvements_audit.test.ts`**
   - **Input:** Running automated test for form state preservation.
   - **Expected:** Test accurately slices and tests `handleTipeAbsenChange` and `togglePresensiFields` functions.
   - **Actual:** `handleTipeAbsenChange` appeared after `togglePresensiFields` in `GuruPresensi.tsx`, making the slice `guruPresensiContent.slice(startHandleTipe, startTogglePresensi)` an empty string `""` that passed `!handleTipe.includes('setFile(null)')` vacuously. Additionally, `indexOf('const handleFileChange =')` returned `-1`.
   - **Root Cause:** Copy-pasted string indexing without verifying actual line order or return values.

4. **Presensi Form State Document Validation Gap**
   - **Input:** User attaches a photo of a doctor's note (`image/jpeg`) in `Izin` mode, then toggles `jenisPresensi` to `Sekolah`.
   - **Expected:** Since the file is a document attachment rather than a verified live selfie with watermark, system prompts confirmation before discarding the file.
   - **Actual:** Prior condition `!file.type.startsWith('image/')` evaluated to `false` for image doctor notes, falsely preserving the doctor note image as a verified selfie.
   - **Root Cause:** Checking only MIME type instead of whether a confirmed camera selfie preview URL (`photoPreviewUrl`) existed.

5. **Gradebook View Tabs Horizontal Overflow on Narrow Viewports (< 400px)**
   - **Input:** Simulating viewport width < 400px on `GradebookView.tsx`.
   - **Expected:** View tabs header ("Penilaian TP", "Rekap Nilai Rapor Semester", "Statistik & Analisis") scrolls smoothly without clipping or pushing parent container width.
   - **Actual:** Tabs container lacked horizontal scroll styling, causing tab labels to wrap awkwardly or overflow.
   - **Root Cause:** Missing `overflow-x-auto custom-scroll max-w-full` on the tab pill container.

## 2. What I changed

- **`src/components/CameraSelfieCapture.tsx`**:
  - Added synchronization `useEffect` listening to `existingPhotoUrl` prop that resets `capturedImage` and `capturedFile` when `existingPhotoUrl` changes or becomes null.
  - Replaced blocking `Swal.fire` modals in `handleCapturePhoto` and `handleConfirmPhoto` with `showToast`. Removed unused `Swal` import.
- **`src/components/GuruPresensi.tsx`**:
  - Refined `togglePresensiFields` condition to `(!photoPreviewUrl || !file.type.startsWith('image/'))` ensuring verified live selfies are preserved while unverified document files require confirmation before clearing.
- **`src/components/AdminDataView.tsx`**:
  - Replaced routine blocking `Swal.fire` alerts with `showToast` across CSV upload, record insertions, updates, and delete operations.
  - Retained critical modal confirmation dialog for `handleDeleteItem`.
- **`src/components/PiketView.tsx`**:
  - Replaced remaining blocking `Swal.fire` modals (photo validation, upload error, save error, teacher assignment, student assignment, assignment deletion) with `showToast`.
  - Retained critical modal confirmation dialog for `handleDeletePenugasan`.
- **`src/components/GuruJurnal.tsx`**:
  - Replaced all remaining blocking `Swal.fire` modals (photo validation, upload error, save error) with `showToast`. Removed unused `Swal` import.
- **`src/components/GradebookView.tsx`**:
  - Added `overflow-x-auto custom-scroll max-w-full` and `whitespace-nowrap shrink-0` to the view tabs navigation header to prevent mobile horizontal layout blowout.
- **`tests/ui_ux_improvements_audit.test.ts`**:
  - Completely rewritten to fix index slicing bugs, added behavioral simulation for state preservation during Datang/Pulang toggles, and added comprehensive assertions verifying toast coverage across all modified components.

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm test`: All 11 automated test suites passed 100% (including 23 M1 tests, 35 M4 tests, 41 UI/UX audit tests).
  - `npm run test:e2e`: All 4 tiers passed 100% (75 Boundary/Corner cases, 16 Cross-Feature interactions, 20 Real-World E2E scenarios — 111 assertions total).
  - `npm run build`: Next.js Turbopack production build compiled with 0 TypeScript and syntax errors.
- **Shallow Verification (manual only):**
  - Inspected responsive Tailwind CSS classes (`whitespace-nowrap`, `overflow-x-auto`, `custom-scroll`, `max-w-full`) across all modified view containers.
  - Inspected SweetAlert2 toast options across all toast invocations (`toast: true`, `timer: 3000`, `showConfirmButton: false`).
- **Unverified aspects:**
  - Real iOS Safari momentum bounce (`-webkit-overflow-scrolling: touch`) on physical hardware.
  - Rapid double-toggle of `tipeAbsen` under CPU throttling.

## 4. Known Issues

- `Minor Robustness Risk`: On ultra-narrow screens (< 320px width), the Gradebook evaluation matrix columns require continuous horizontal swipe panning due to the large number of assessment criteria.
- `Shallow Verification`: Background upload progress for attendance selfie to Google Drive displays an instant confirmation toast, while actual background upload to Drive relies on the background worker promise.

## 5. Remaining risk & next step

- **Task is complete**: All three requirements (R1 Non-Intrusive Notifications, R2 Form State Preservation, R3 Mobile-Responsive Tables) and Acceptance Criteria have been fully implemented, verified with end-to-end passing tests, clean Turbopack production build, and committed/pushed to origin main. Ready for final user inspection.
</prior_attempt>

<additional_context>
Open Issues Ledger:
- [Implementer] Physical touch responsiveness (momentum scrolling on real iOS Safari and Android Chrome hardware).
- [Implementer] Toast behavior when network requests fail while the user is rapidly navigating away from the page.
- [Reviewer 1] Real iOS Safari momentum bounce (-webkit-overflow-scrolling: touch) on physical hardware.
- [Reviewer 1] Rapid double-toggle of tipeAbsen under CPU throttling.
- [Reviewer 1] Minor Robustness Risk: On ultra-narrow screens (< 320px width), the Gradebook evaluation matrix columns require continuous horizontal swipe panning due to the large number of assessment criteria.
- [Reviewer 1] Shallow Verification: Background upload progress for attendance selfie to Google Drive displays an instant confirmation toast, while actual background upload to Drive relies on the background worker promise.

Reviewer Instructions:
- Re-derive the requirements independently.
- Actively try to BREAK the existing diff and implementation by testing edge conditions, boundary cases, mobile layouts, and notifications.
- If you find any issues, defects, or areas for improvement, fix them directly, re-run tests, and verify.
- Follow GEMINI.md git workflow rules: git status, git add ., git commit -m "...", git push origin.
- Maintain your own progress.md and handoff.md in your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_2.
</additional_context>

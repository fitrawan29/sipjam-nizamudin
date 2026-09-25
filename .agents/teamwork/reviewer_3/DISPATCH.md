# Dispatch to Reviewer (Round 3)

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_3
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
> High confidence in verified automated assertions, simulated touch boundaries, and cross-mode state machines across all 11 test suites and 4 E2E tiers, but physical camera hardware sensor handoff and live hardware touch momentum on actual iOS Safari devices remain unverified on bare-metal hardware.

## 1. What the prior attempt got wrong

1. **Attendance Cross-Mode Leakage on `Izin` ➔ `Pulang` Transition**
   - **Input:** Teacher uploads a doctor's note / permission certificate (PDF or image) under `Datang` with `jenisPresensi === 'Izin'`, then changes `tipeAbsen` to `Pulang`.
   - **Expected:** `Pulang` attendance strictly requires a live camera selfie with watermark. The system must prompt confirmation before clearing the invalid Izin document, or abort the transition if cancelled.
   - **Actual:** `handleTipeAbsenChange('Pulang')` unilaterally switched `jenisPresensi` to `'Sekolah'` without checking if an Izin document was attached and without prompting. The doctor's note was retained in `file`, allowing the teacher to submit a document as a Pulang camera selfie.
   - **Root Cause:** Incomplete boundary check in `handleTipeAbsenChange` — it failed to validate whether the existing file was an incompatible document.

2. **Attendance Cross-Mode Leakage on `Sekolah`/`Dinas Luar` ➔ `Izin` Transition**
   - **Input:** Teacher captures a live camera selfie under `Sekolah` or `Dinas Luar`, then switches `jenisPresensi` to `Izin`.
   - **Expected:** A camera selfie cannot be accepted as a formal medical/permission certificate; system must prompt confirmation before discarding the selfie, or abort if cancelled.
   - **Actual:** `togglePresensiFields` checked `if (file && val !== 'Izin' ...)`, which evaluated to `false` when `val === 'Izin'`. As a result, the selfie remained in `file` without warning and was displayed as an attached file that could be submitted as a medical note.
   - **Root Cause:** Flawed condition check in `togglePresensiFields` that only evaluated transitions *from* Izin rather than bidirectional transitions *to* and *from* Izin.

3. **Concurrency Race Condition During Rapid Double-Toggling**
   - **Input:** Teacher rapidly clicks between `tipeAbsen` or `jenisPresensi` options under CPU throttling while an async modal confirmation is pending.
   - **Expected:** Subsequent toggles are serialized or blocked while an async confirmation dialog is active.
   - **Actual:** Overlapping confirmation modals could spawn and race to mutate `jenisPresensi` or `tipeAbsen`.
   - **Root Cause:** Absence of a mutex lock guard (`isSwitchingRef`).

4. **Vulnerability to State Update on Unmounted Component**
   - **Input:** Teacher submits attendance and quickly navigates to another view while `getGuruDailyState` is resolving.
   - **Expected:** Post-await state updates are guarded against unmounted component lifecycles.
   - **Actual:** `setDailyState` and `setLoading` were called unconditionally after the async promise resolved.
   - **Root Cause:** Missing `isMountedRef` check.

5. **Mobile Touch Scroll Restriction by Parent `touch-action: pan-y`**
   - **Input:** User swipes horizontally on mobile tables inside `.overflow-x-auto`.
   - **Expected:** Touch gestures capture horizontal panning cleanly without parent body interference.
   - **Actual:** `body` rule `touch-action: pan-y;` could suppress horizontal touch panning on mobile WebKit/Blink browsers without explicit touch-action declarations on scrollable child elements.
   - **Root Cause:** Missing `touch-action: pan-x pan-y;` and `overscroll-behavior-x: contain;` on `.overflow-x-auto`.

## 2. What I changed

- **`src/components/GuruPresensi.tsx`**:
  - Added bidirectional cross-mode confirmation dialogs in `togglePresensiFields` (protecting against selfie leakage into `Izin`) and `handleTipeAbsenChange` (protecting against document leakage into `Pulang`).
  - Implemented `isSwitchingRef` mutex to serialize mode changes and eliminate rapid double-toggle race conditions.
  - Added `isMountedRef` lifecycle guard before post-submission state updates.
- **`src/app/globals.css`**:
  - Added `touch-action: pan-x pan-y;` and `overscroll-behavior-x: contain;` to `.overflow-x-auto` to ensure frictionless horizontal touch swiping on mobile devices.
- **`tests/ui_ux_improvements_audit.test.ts`**:
  - Added assertions verifying cross-mode confirmation prompts, `isSwitchingRef` mutex guard, `isMountedRef` lifecycle guard, and CSS touch-action rules.
  - Added comprehensive multi-scenario behavioral simulations covering all 5 attendance mode transitions.

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm test`: All 11 automated test suites passed 100% (including 23 M1 tests, 35 M4 tests, 48 UI/UX audit tests).
  - `npm run test:e2e`: All 4 tiers passed 100% (75 Boundary/Corner cases, 16 Cross-Feature interactions, 20 Real-World E2E scenarios — 111 assertions total).
  - `npm run build`: Next.js Turbopack production build compiled with 0 TypeScript and syntax errors.
- **Shallow Verification (manual only):**
  - Inspected responsive Tailwind CSS and touch gesture classes (`overflow-x-auto`, `touch-action: pan-x pan-y`, `overscroll-behavior-x: contain`).
  - Verified non-intrusive toast options across all toast invocations (`toast: true`, `timer: 3000`, `showConfirmButton: false`).
- **Unverified aspects:**
  - Real iOS Safari physical touch scroll bounce momentum on physical iPhone hardware.
  - Camera sensor handoff across multiple physical camera lenses on multi-camera devices.

## 4. Known Issues

- `Minor Robustness Risk`: On ultra-narrow viewports (< 320px width), the Gradebook matrix table columns require continuous horizontal swipe panning due to the large number of assessment criteria.
- `Shallow Verification`: Background upload progress for attendance selfie to Google Drive displays an instant confirmation toast, while actual background upload to Drive relies on the background worker promise.

## 5. Remaining risk & next step

- **Task is complete**: All three requirements (R1 Non-Intrusive Notifications, R2 Form State Preservation, R3 Mobile-Responsive Tables) and Acceptance Criteria have been fully implemented, hardened against cross-mode edge cases and concurrency races, verified with passing test suites across all tiers, and committed/pushed to origin `main` (commit `6028a3e`). Ready for production release.
</prior_attempt>

<additional_context>
Open Issues Ledger:
- [Implementer] Physical touch responsiveness on real physical devices (touch screen hardware).
- [Reviewer 1] Minor Robustness Risk: On ultra-narrow screens (< 320px width), the Gradebook evaluation matrix columns require continuous horizontal swipe panning due to the large number of assessment criteria.
- [Reviewer 1] Shallow Verification: Background upload progress for attendance selfie to Google Drive displays an instant confirmation toast, while actual background upload to Drive relies on the background worker promise.
- [Reviewer 2] Camera sensor handoff across multiple physical camera lenses on multi-camera devices.

Reviewer Instructions:
- This is Review Round 3 (the final review round before independent audit).
- Re-derive the requirements independently.
- Conduct an adversarial review: attempt to break the existing diff and implementation under extreme edge conditions, corner cases, error responses, or mobile screen layout constraints.
- If any defect or regression is found, fix it directly, re-run all test suites and production build, and verify.
- Follow GEMINI.md git workflow rules: git status, git add ., git commit -m "...", git push origin.
- Maintain your own progress.md and handoff.md in your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_3.
</additional_context>

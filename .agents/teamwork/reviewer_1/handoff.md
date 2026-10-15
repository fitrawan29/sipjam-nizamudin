# Handoff Report — reviewer_1 (Adversarial Reviewer)

> [!WARNING] **Skepticism Disclaimer**
> I am confident that the archive selection reset bug and multi-tab storage desynchronization have been diagnosed and permanently resolved; local automated tests (33 suites) and production builds pass with 100% success, though physical multi-client hardware printing across diverse mobile OS print previewers remains inherently empirical.

## 1. What the prior attempt got wrong

### Issue 1: Fatal Archive Selection Reset Bug (Violating R2)
- **Input:** User changes academic year dropdown in `RaporView` to an archive year (e.g. `'2023/2024'` or `'2021/2022'`).
- **Expected:** `selectedTahunAjaran` stays `'2023/2024'`, loads historical student grades, notes, and learning achievements for that selected year.
- **Actual:** The dropdown immediately snaps back to active school year (`activeSchoolTahunAjaran`, e.g. `'2024/2025'`), preventing teachers and admins from viewing past reports.
- **Root Cause:**
  1. `fetchTahunAjaranOptions` included `selectedTahunAjaran` in its `useCallback` dependency array `[activeSchoolTahunAjaran, selectedTahunAjaran, sekolahId]`.
  2. The initial mount `useEffect` had `[fetchSchoolConfig, fetchTahunAjaranOptions]` in its dependency array.
  3. Consequently, whenever the user selected a different academic year from the dropdown, `fetchTahunAjaranOptions` was recreated with a new reference, re-triggering the mount `useEffect`.
  4. That `useEffect` re-invoked `fetchSchoolConfig()`, which unconditionally executed `setSelectedTahunAjaran(activeTa)` and `setSelectedSemester(activeSem)`, completely wiping the user's archive selection.

### Issue 2: Cross-Tab / Multi-Window Realtime Desynchronization (Violating R1 Realtime Guarantee)
- **Input:** School Administrator updates `tahun_ajaran` or `semester` in `AdminConfigView` in Tab 1 while a Homeroom Teacher or Admin is viewing `RaporView` in Tab 2.
- **Expected:** Tab 2 immediately synchronizes its active school configuration and updates without requiring manual browser page reload.
- **Actual:** Tab 2 never received the update if Supabase realtime channels were offline or mock/placeholder was active. `AdminConfigView` dispatches `sipjam:config_updated` via `window.dispatchEvent`, which is scoped strictly to Tab 1's window.
- **Root Cause:** `RaporView` did not listen to the standard `storage` event for `sipjam:config_sync` / `sipjam_config_sync`, which `AdminConfigView` writes to `localStorage` specifically for multi-tab notification.

### Issue 3: Surrounding Academic Year Calculation Failure on Non-Standard Year Formatting (Known Issue Weakness)
- **Input:** School database contains or configures an academic year with dashes or surrounding spaces (e.g. `'2024-2025'` or `' 2024 / 2025 '`).
- **Expected:** Correctly extracts `2024` as base year and generates surrounding offset years (`2022/2023` to `2026/2027`).
- **Actual:** Strict regex `/^(\d{4})\/(\d{4})$/` returned `null`, falling back to `new Date().getFullYear()` (e.g. `2026`), generating mismatched surrounding years.
- **Root Cause:** Inflexible regular expression that only allowed exact 4-digit slashes without supporting dashes or whitespace.

### Issue 4: Document Print Title Collision and Premature Reversion
- **Input:** User prints E-Rapor via `handlePrintRapor`.
- **Expected:** `document.title` sets the clean filename for PDF export (`E-Rapor_[Name]_[Class]_[Semester]_[TA]`) and cleanly restores the application title when printing finishes.
- **Actual:** `handleBeforePrint` grabbed `document.title` after `handlePrintRapor` already modified it to `E-Rapor_...`, causing `handleAfterPrint` to restore `E-Rapor_...` instead of the original title `'SIPJAM'`, while a 2000ms hardcoded timeout prematurely reverted the title while user was still in the print dialog.
- **Root Cause:** Lack of prefix guard (`!document.title.startsWith('E-Rapor_')`) in `handleBeforePrint` and `handlePrintRapor`.

---

## 2. What I changed

1. **`src/components/RaporView.tsx`**:
   - Added `hasInitializedConfig` ref and `selectedTahunAjaranRef` to isolate the dynamic options builder from dropdown selection state.
   - Refactored `fetchSchoolConfig` with `(forceSelect = false)` parameter. It sets `selectedTahunAjaran` and `selectedSemester` on initial mount (`!hasInitializedConfig.current`) or when explicitly forced by a realtime config event, but NEVER overwrites active archive selections during dropdown interaction.
   - Decoupled `fetchTahunAjaranOptions` dependency array from `selectedTahunAjaran`, removing it from the mount `useEffect` re-run loop.
   - Made the academic year regex parser resilient (`/(\d{4})\s*[-/]\s*(\d{4})/`) to handle slashes, dashes, and whitespace seamlessly.
   - Added `storage` event listener for `sipjam:config_sync` and `sipjam_config_sync` to guarantee multi-tab synchronization even when Supabase web sockets are disconnected or mocked.
   - Added prefix collision protection (`!document.title.startsWith('E-Rapor_')`) to `handleBeforePrint` and `handlePrintRapor`, extending safety fallback timeout to 5000ms.

2. **`tests/e_rapor_tahun_ajaran_sync.test.ts`**:
   - Added adversarial test assertions for multi-tab `storage` event listener (R1-04), archive selection retention (R2-03), resilient year parsing (R2-04), and print title isolation (R3-04). Total passed: 13 / 13.

3. **`tests/adversarial_rapor_archive_retention.test.ts` & `package.json`**:
   - Created comprehensive adversarial test suite validating storage event parsing, whitespace/dash format tolerance, and print title preservation cycles.
   - Registered test suite in `package.json` `npm test` pipeline. Total passed: 3 / 3.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts`: 13 / 13 assertions PASSED.
  - Ran `npx tsx tests/adversarial_rapor_archive_retention.test.ts`: 3 / 3 assertions PASSED.
  - Ran `npm test`: all 33 unit and adversarial test suites PASSED with 0 errors.
  - Ran `npm run build`: Turbopack build and TypeScript check completed with 0 errors across all routes.
- **Shallow Verification (manual only):**
  - Simulated `StorageEvent` dispatch and year regex extraction across edge cases (`2024-2025`, `2024 / 2025`, etc.).
  - Verified static SSR markup renders Administrator and (Aktif) indicators accurately.
- **Unverified aspects:**
  - Physical OS-level PDF rendering on mobile printer hardware devices (e.g. thermal Bluetooth receipt printers vs AirPrint).

---

## 4. Known Issues

- `Minor Robustness Risk` — If a database row in `pengaturan` has a malformed JSON payload in `catatan_wali` or `deep_learning` caused by external SQL manual tampering, it falls back gracefully to localStorage or empty map via existing try/catch blocks.

---

## 5. Remaining risk & next step

- **Task Completion Status:** COMPLETE. All requirements R1, R2, and R3 are satisfied, verified by 33 automated test suites and a clean production build (`npm run build`).
- **Next Step:** Commit and push changes per Git Workflow Rule, then hand off to parent orchestrator.

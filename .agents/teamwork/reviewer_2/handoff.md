# Handoff Report — reviewer_2

> [!WARNING] **Skepticism Disclaimer**
> High confidence in the state retention, synchronization, and race-protection fixes; all 33 test suites (including 7 adversarial retention tests) pass 100% and production build compiles with 0 errors, though browser print layout fidelity on third-party mobile webviews cannot be simulated in headless terminal environments.

## 1. What the prior attempt got wrong

### Defect 1: Archive Dropdown Reset on Window Focus / App Resume and Autosave (Violating R2)
- **Input:** User selects an archive academic year (e.g. `'2023/2024'`) or semester in `RaporView`, then blurs/focuses the window, switches tabs, or edits a Catatan Wali / Deep Learning observation (which autosaves to table `pengaturan`).
- **Expected:** `selectedTahunAjaran` and `selectedSemester` stay on the user's selected archive values (`'2023/2024'`).
- **Actual:** The view abruptly resets back to active school configuration (`'2024/2025'` and `'Ganjil'`).
- **Root Cause:**
  1. `AppScreen` listens to window `focus`, `online`, `visibilitychange`, and Supabase `postgres_changes` on `pengaturan`, dispatching `sipjam:config_updated` with detail `{ sekolah_id }` (no `tahun_ajaran` or `semester` fields).
  2. In `RaporView`, `handleConfigSync` detected `!newTa || !newSem` and called `fetchSchoolConfig(true)` with `forceSelect = true`.
  3. `fetchSchoolConfig(true)` unconditionally overrode `selectedTahunAjaran(activeTa)` and `selectedSemester(activeSem)`.
  4. Even when `newTa` was provided (e.g. admin saving general settings in `AdminConfigView`), `handleConfigSync` unconditionally invoked `setSelectedTahunAjaran(newTa)` without checking whether the user was viewing an archive.

### Defect 2: False Wali Kelas Fallback from Historical Database Entries
- **Input:** A class has a recorded wali kelas in `wali_kelas` for an older academic year (e.g. `'2022/2023'`), but no row for current/selected year `'2024/2025'`.
- **Expected:** Since no assignment exists for `'2024/2025'` in `wali_kelas`, fallback cleanly checks `data_guru.wali_kelas` or the logged-in homeroom teacher (`assignedKelas === selectedKelas`).
- **Actual:** `(wList || []).find(...) || (wList || [])[0]` matched the first row in `wList`, incorrectly assigning the older year's teacher signature to the current report.
- **Root Cause:** Injudicious fallback to `(wList || [])[0]` regardless of whether `w.tahun_ajaran` matched or belonged to a different year.

### Defect 3: Out-of-Order Async Fetch Race Condition in `fetchClassData`
- **Input:** Teacher rapidly changes selected classes or academic years.
- **Expected:** The UI displays data corresponding strictly to the latest selected combination.
- **Actual:** If a prior fetch took longer over the network than a subsequent fetch, the slower response could overwrite the newer state.
- **Root Cause:** `fetchClassData` lacked a request ID tracking guard to discard stale async query responses.

## 2. What I changed

- **`src/components/RaporView.tsx`**:
  - Added refs: `selectedSemesterRef`, `activeSchoolTahunAjaranRef`, `activeSchoolSemesterRef`, and `fetchClassRequestId`.
  - Refactored `fetchSchoolConfig(isInitial = false)`: Compares database configuration with previous active refs. Only updates `selectedTahunAjaran` and `selectedSemester` if on initial component mount or if the user was actively following the previous active setting.
  - Refactored `handleConfigSync`: When active school year is promoted, updates users following the active year to the new year while strictly protecting users who selected archive years from disruption.
  - Refactored `matchingWali`: Only falls back to unversioned rows (`!w.tahun_ajaran`), preventing false matches from historical records of other years.
  - Added `fetchClassRequestId` guard to `fetchClassData` to safely discard out-of-order stale responses.
- **`tests/adversarial_rapor_archive_retention.test.ts`**:
  - Added assertions ADV-04 through ADV-07 covering window focus retention, admin save event archive preservation, active promotion isolation, and wali kelas year matching precision.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_rapor_archive_retention.test.ts`: 7 / 7 PASSED.
  - `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts`: 13 / 13 PASSED.
  - `npm test`: 33 / 33 test suites PASSED (0 failures across all unit & adversarial suites).
  - `npm run build`: Turbopack build succeeded with 0 errors across all routes.
- **Shallow Verification (manual only):**
  - Inspected AST & DOM structure of dropdowns, badge indicators, and print sheet layouts.
- **Unverified aspects:**
  - Physical OS-level Bluetooth thermal printing and mobile Safari webview print dialogs.

## 4. Known Issues
- `Minor Robustness Risk` — If an external direct SQL script inserts a row in `pengaturan` with unparseable invalid JSON in `catatan_wali` or `deep_learning`, it is gracefully caught by JSON parse try/catch blocks.

## 5. Remaining risk & next step
- Implementation is complete, tested with adversarial scenarios, and verified with 0-error production build.

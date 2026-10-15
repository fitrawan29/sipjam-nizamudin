> [!WARNING] **Skepticism Disclaimer**
> Highly confident in the database JSON parse hardening, redundant query suppression, and option state stability; all 33 test suites (including 10 adversarial checks) pass 100% and production build succeeds with 0 errors, though physical OS-level printer dialogue behavior on mobile Safari cannot be simulated in headless CLI.

## 1. What the prior attempt got wrong

### Issue 1: Fatal Runtime Crash on `null` or Non-Object JSON Payload in `pengaturan`
- **Input:** Database row in `pengaturan` for `catatan_wali` or `deep_learning` contains the literal string `"null"`, `"123"`, or `"[1,2,3]"` (caused by external SQL manual maintenance or corrupted cache).
- **Expected:** Graceful fallback to empty record `{}` without crashing the page.
- **Actual:** `loadedNotes = JSON.parse(nDb.value)` returned `null` or an array/primitive. Subsequent call `Object.keys(loadedNotes)` threw an unhandled `TypeError: Cannot convert undefined or null to object`, crashing the entire E-Rapor view.
- **Root Cause:** Inadequate validation of `JSON.parse` output before invoking `Object.keys()`.

### Issue 2: Redundant 4-Table Database Query Avalanche on Every Note Autosave
- **Input:** Teacher edits a note or focus/resume event fires while on the active academic year (e.g. `'2024/2025'`).
- **Expected:** System should acknowledge config sync without repeatedly re-querying all historical tables for academic year options.
- **Actual:** Every 800ms debounce autosave dispatched `sipjam:config_updated`, triggering `fetchTahunAjaranOptions`, which queried all 4 tables (`capaian_pembelajaran`, `tujuan_pembelajaran`, `wali_kelas`, `jadwal_pelajaran`) across the network even though the academic year was completely unchanged.
- **Root Cause:** `handleConfigSync` unconditionally invoked `fetchTahunAjaranOptions(newTa)` on any config sync event without checking `newTa !== prevActiveTa`.

### Issue 3: Unstable Hook Dependency Causing Potential Double Initialization
- **Input:** Mount lifecycle with an active academic year that differs from the default `'2024/2025'`.
- **Expected:** `fetchSchoolConfig` and options fetch run exactly once per mount or `sekolahId` change.
- **Actual:** `fetchTahunAjaranOptions` listed `activeSchoolTahunAjaran` in its dependency array. When `activeSchoolTahunAjaran` updated, `fetchTahunAjaranOptions` changed identity, re-triggering the mount `useEffect` and running `fetchSchoolConfig(true)` a second time with `isInitial = true`.
- **Root Cause:** Failing to read `activeSchoolTahunAjaranRef.current` inside `fetchTahunAjaranOptions`, causing unstable hook references.

## 2. What I changed

- **`src/components/RaporView.tsx`**:
  - Hardened notes & deep learning JSON deserialization: checks `typeof parsed === 'object' && !Array.isArray(parsed)`, preventing `TypeError: Cannot convert undefined or null to object`.
  - Stabilized `fetchTahunAjaranOptions` dependencies using `activeSchoolTahunAjaranRef.current` so its callback identity is fixed per `sekolahId`.
  - Added query suppression in `handleConfigSync`: skips querying the 4 database tables if `newTa` has not changed from `prevActiveTa`.
  - Synchronously updated `activeSchoolTahunAjaranRef`, `activeSchoolSemesterRef`, `selectedTahunAjaranRef`, and `selectedSemesterRef` inside `fetchSchoolConfig`, `handleConfigSync`, and dropdown `onChange` handlers to guarantee zero transient race windows.
  - Ensured `tahunAjaranList` state immediately incorporates `activeTa` upon arrival, preventing transient empty/mismatched `<option>` states in the UI.
- **`tests/adversarial_rapor_archive_retention.test.ts`**:
  - Added checks ADV-08, ADV-09, and ADV-10 testing null/malformed JSON immunity, query avalanche suppression, and immediate select option synchronization. Total: 10 / 10 passed.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_rapor_archive_retention.test.ts`: 10 / 10 PASSED.
  - `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts`: 13 / 13 PASSED.
  - `npm test`: 33 / 33 test suites PASSED with 0 errors across the entire codebase.
  - `npm run build`: Turbopack build succeeded with 0 errors across all routes.
- **Shallow Verification (manual only):**
  - AST inspection of `<select>` dropdowns, `displayedTaList` stability, and badge elements.
- **Unverified aspects:**
  - Physical OS-level thermal bluetooth printing and native iOS Safari print dialogs.

## 4. Known Issues
- `Minor Robustness Risk` — Physical OS print preview dialog cancellation handling relies on standard browser `afterprint` event listener.

## 5. Remaining risk & next step
- **Task Status:** COMPLETE. All requirements (R1 automatic sync, R2 dynamic archive options with retention protection and query avalanche prevention, R3 print and query consistency) are fully satisfied and robustly tested. Ready for final user delivery.

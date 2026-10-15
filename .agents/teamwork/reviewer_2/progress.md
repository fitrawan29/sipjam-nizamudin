# Progress — reviewer_2

Last visited: 2026-10-15T22:47:00Z
Status: Completed adversarial review and verification

## Key Findings & Defect Resolution
1. **Critical Archive Selection Reset on Window Focus/Resume & Save Events**:
   - `handleConfigSync` previously called `fetchSchoolConfig(true)` whenever `newTa` or `newSem` was not in event detail (such as `{ sekolah_id }` fired by `AppScreen` on window focus/resume or table `pengaturan` change events triggered by notes/deep-learning autosave).
   - In `fetchSchoolConfig(true)`, `forceSelect` forcibly reset `selectedTahunAjaran` and `selectedSemester` back to the active school setting, abruptly wiping out user archive selections during inspection or editing.
   - Even when `newTa` and `newSem` were present, `handleConfigSync` unconditionally called `setSelectedTahunAjaran(newTa)` even if the user had selected an archive year.
   - **Fix**: Added refs for `selectedSemester`, `activeSchoolTahunAjaran`, and `activeSchoolSemester`. Decoupled `fetchSchoolConfig` and `handleConfigSync` to compare with the previous active configuration; only update `selectedTahunAjaran`/`selectedSemester` if the user was actively following the active configuration or on initial load. Preserved user selections during focus events and non-year config updates.
2. **Historical Wali Kelas Assignment Mismatch**:
   - `matchingWali` fell back to `(wList || [])[0]` when `w.tahun_ajaran === selectedTahunAjaran` had no match. If a class had a historical wali kelas assignment from years prior, selecting a new year without a direct assignment would falsely bind the historical teacher instead of falling back to current teacher assignments.
   - **Fix**: Refactored `matchingWali` fallback to only match unversioned rows (`!w.tahun_ajaran`), allowing legitimate fallbacks to `data_guru` or current assigned teacher.
3. **Out-of-order Async Fetch Race Protection in `fetchClassData`**:
   - Rapid switching between classes or archive years could result in slower out-of-order async responses overwriting newer state.
   - **Fix**: Added `fetchClassRequestId` ref guard to reject stale async responses.

## Verification
- `npx tsx tests/adversarial_rapor_archive_retention.test.ts`: 7 / 7 PASSED (added ADV-04 through ADV-07).
- `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts`: 13 / 13 PASSED.
- `npm test`: 33 / 33 test suites PASSED.
- `npm run build`: Turbopack build succeeded with 0 errors across all routes.

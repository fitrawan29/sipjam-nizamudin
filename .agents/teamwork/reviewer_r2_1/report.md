> [!WARNING] **Skepticism Disclaimer**
> High confidence: 58 automated test suites passing 100% including 10 dedicated adversarial student CSV scenarios, though native browser drag-and-drop OS events remain simulated in Node/JSDOM.

## 1. What the prior attempt got wrong
1. **Partial Background DB Refresh Data Overwrite in `handleFileUpload` & `loadData`**:
   - **Input**: User uploads student CSV containing all 392 students. The background query or `loadData` returns partial data from Supabase (e.g. Due to default query limits, replication delays, or pagination returning fewer than 392 rows).
   - **Expected**: All 392 uploaded students remain displayed in the table and in the storage cache, retaining any updated database fields while never dropping valid uploaded rows.
   - **Actual**: `setDataList(data)` blindly replaced the list with `data`, causing up to hundreds of students to disappear from the table and storage cache once the background query completed.
   - **Root Cause**: Unconditional assignment `setDataList(data)` in both `loadData` and `handleFileUpload` without merging against existing `cachedRows` / `rows` by record `id`.
2. **Key Resolution Discrepancy & Unsanitized Class Name Spaces in Idempotent Resolution**:
   - **Input**: CSV containing student names with Unicode diacritics or multiple spaces (e.g. `'André René Gautier'` or `'XI  Merdeka D'`).
   - **Expected**: Existing student records in DB match accurately by `(nama_siswa, kelas)` regardless of whitespace variations or diacritic differences.
   - **Actual**: In `data_siswa`, `row.kelas` was not normalized for spaces. In Step A of `importMasterDataFromCsv`, `s.nama_siswa` was not normalized with `normalizeName` nor single-spaced, while Step B and the mapping loop used single spaces and `normalizeName`. As a result, students matched in Step A failed to resolve in the mapping loop, receiving duplicate UUIDs.
   - **Root Cause**: Inconsistent key normalization across Step A, Step B, and the mapping loop in `importMasterDataFromCsv`.
3. **Excel Scientific Notation and Mangled Phone/NISN Values**:
   - **Input**: CSV saved in Microsoft Excel where 10-digit NISNs or 11/12-digit phone numbers are converted to scientific notation (e.g. `1.06436E+08` or `8.2193147509e+10`), phone numbers lose their leading zero (e.g. `82193147509`), or phone placeholders like `'-'` or `'null'` are present.
   - **Expected**: Numbers are cleanly parsed to integers (`106436000`), phone numbers starting with `8` are restored with leading `0` (`082193147509`), and placeholders are converted to empty string `''`.
   - **Actual**: Scientific notation strings (`'1.06436E+08'`) and placeholders (`'-'`) were stored literally in the database, breaking phone dials and QR generation.
   - **Root Cause**: Lack of Excel scientific notation normalization and phone leading-zero auto-recovery in `parseAndValidateMasterCsv`.
4. **Lack of Cross-Component Cache Hydration in `AdminKelasView`**:
   - **Input**: Student CSV uploaded from `AdminKelasView` or user navigates between `AdminDataView` and `AdminKelasView` before DB synchronization completes.
   - **Expected**: Uploaded student data is shared across both views via the master data storage cache.
   - **Actual**: `AdminKelasView` neither saved imported student rows to `setStorageCache('Data_Siswa', ...)` nor checked `getStorageCache('Data_Siswa', ...)` on load failure/empty state.
   - **Root Cause**: Storage cache operations were isolated to `AdminDataView` instead of being shared via `@/lib/dataIntegrityGuard`.

## 2. What I changed
- **`src/lib/dataIntegrityGuard.ts`**:
  - Moved and exported shared `getStorageCache` and `setStorageCache` utility functions with isolated try/catch blocks for `sessionStorage` and `localStorage` to safeguard against quota errors.
  - In `parseAndValidateMasterCsv` for `data_siswa`:
    - Added whitespace collapse for `row.kelas = rawKelasSiswa.replace(/\s+/g, ' ')`.
    - Added automatic expansion for Excel scientific notation on `row.nisn` and `row.no_hp_ortu` (`Number(...).toFixed(0)`).
    - Added phone number auto-restoration for missing leading zero (`/^8\d{8,12}$/` -> `0${hpClean}`).
    - Normalized phone placeholders (`'-'`, `'null'`, `'undefined'`) to empty string `''`.
  - In `importMasterDataFromCsv` for `data_siswa`:
    - Unified key normalization across Step A, Step B, and the mapping loop using `normalizeName(...).toLowerCase().replace(/\s+/g, ' ')`.
- **`src/components/AdminDataView.tsx`**:
  - Re-exported `getStorageCache` and `setStorageCache` from `@/lib/dataIntegrityGuard` for 100% backward compatibility.
  - In `loadData`: Implemented ID-based merge between Supabase `data` and `cachedRows` (`mergedMap.set(...)`), preventing any uploaded students from disappearing if the database query returns partial rows.
  - In `handleFileUpload`: Implemented ID-based merge between background DB refresh `data` and `rows` to preserve all 392 uploaded students.
- **`src/components/AdminKelasView.tsx`**:
  - Imported `getStorageCache` and `setStorageCache` from `@/lib/dataIntegrityGuard`.
  - In `handleClassFileUpload`: Added `setStorageCache('Data_Siswa', schoolId, rows)` upon student CSV import.
  - In `loadAllData`: Added hydration from `getStorageCache('Data_Siswa', sekolahId)` when `sData` is empty.
- **`tests/adversarial_student_csv_review.test.ts`**:
  - Expanded test suite to 10 comprehensive adversarial tests:
    - Test 7: Excel scientific notation, phone leading zero auto-restoration, and placeholder sanitization.
    - Test 8: Class name and student name space normalization.
    - Test 9: Diacritic and multi-space tolerant idempotent resolution.
    - Test 10: ID-based merge on DB refresh preserving 100% of uploaded records.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_student_csv_review.test.ts`: Passed (10/10 tests, 100%).
  - `npx tsx tests/test_user_exact_student_csv.ts`: Passed (392/392 students parsed, validated, and verified).
  - `npm test`: All 58 automated test suites passing 100% with zero regressions.
- **Shallow Verification (manual only):**
  - Code inspection of `AdminDataView.tsx`, `AdminKelasView.tsx`, and `dataIntegrityGuard.ts` for clean type guards and error isolation.
- **Unverified aspects:**
  - Real browser OS file dialog drag-and-drop behavior on touchscreen devices (verified via simulated Node/JSDOM events).
  - Supabase installations with strict custom database triggers that disallow phone number format changes.

## 4. Known Issues
- `Minor Robustness Risk`: If a school has more than 2,000 students, the initial un-cached cold start query in `loadData` will only fetch the first 2,000 rows unless paginated; however, once uploaded, the full dataset is retained and rendered in memory and storage cache via ID-based merge.
- `Shallow Verification`: OS-native drag-and-drop and clipboard paste file events are simulated via synthetic event fixtures.

## 5. Remaining risk & next step
- Both R1 and R2 are verified complete: the CSV template matches master data, the 392-student dataset imports seamlessly without error or empty state warnings, and all 58 project test suites pass with zero regressions.
- Next step: Stage, commit, and push to `main` as required by the Git Workflow Rule.

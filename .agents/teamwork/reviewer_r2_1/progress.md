# Reviewer Round 2 Progress

## Step 1: Independent Requirements Understanding
- **Objective**: Ensure the student CSV template downloaded from the app matches master data schema and when filled and uploaded (specifically tested with the user's dataset of 200+ students, actually 225 rows in snippet / 392 rows in full dataset), the data is correctly read, validated, imported into master student database, and immediately rendered/displayed in the master student table without showing "tabel ini kosong atau data belum dapat dimuat".
- **Requirements breakdown**:
  1. CSV template download format matches expected master data headers and columns (`nisn,nama_siswa,kelas,gender,status,no_hp_ortu`).
  2. Upload parsing handles optional fields like empty `no_hp_ortu`, variations in values (gender, status, casing, trimming, quotes, etc.), BOM (`\uFEFF`), line endings (`\r\n`, `\n`, `\r`).
  3. Master data student table displays the uploaded rows immediately without empty state message ("tabel ini kosong...").
  4. Database upsert/import is idempotent and robust.
  5. Preserves existing features and passes all project tests without regression.

## Step 2: Verification of Existing Work & Adversarial Probing
- **Deep Code Review & Identified Defects**:
  1. **Partial Background DB Refresh Data Overwrite in `handleFileUpload` & `loadData`**:
     - *Issue*: When background DB refresh completed or `loadData` retrieved data from Supabase, if the query returned fewer rows than `rows` or `cachedRows` (e.g. Due to default query limits, replication delays, or pagination), `setDataList(data)` blindly replaced the list, causing students to disappear.
     - *Fix*: Implemented ID-based map merging in both `loadData` and `handleFileUpload` (`const mergedMap = new Map(); data.forEach(...); cachedRows.forEach(...);`). Zero uploaded students are dropped.
  2. **Unsanitized Class Name Spaces & Name Key Discrepancy**:
     - *Issue*: Student CSV rows had `row.kelas` un-normalized (e.g. Multiple spaces `XI  Merdeka D`). When matching in Step A vs Step B in `importMasterDataFromCsv`, Step A did not normalize spaces or diacritics in `s.nama_siswa`, while Step B used single spaces, leading to resolution misses.
     - *Fix*: Normalized `row.kelas = rawKelasSiswa.replace(/\s+/g, ' ')`, and normalized both `s.nama_siswa` and `s.kelas` across all idempotent maps using `normalizeName(s.nama_siswa).toLowerCase().replace(/\s+/g, ' ')`.
  3. **Excel Mangling (Scientific Notation & Stripped Leading Zeros on Phone/NISN)**:
     - *Issue*: Opening and saving CSV in Excel often converts 10-digit NISNs or 11/12-digit phone numbers to scientific notation (e.g. `1.06436E+08` or `8.2193147509E+10`), or strips leading zero from phone numbers (e.g. `82193147509`). Furthermore, placeholders like `'-'` or `'null'` were retained as literal strings.
     - *Fix*: Added automatic scientific notation expansion (`Number(val).toFixed(0)`), missing leading zero restoration (`/^8\d{8,12}$/` -> `0...`), and placeholder clearing (`'-'`, `'null'`, `'undefined'` -> `''`).
  4. **Cross-Component Student Cache Sync Between `AdminDataView` and `AdminKelasView`**:
     - *Issue*: `AdminKelasView` did not populate or check `setStorageCache('Data_Siswa', ...)`. If student CSV was uploaded from the class workspace or if the component mounted before DB sync, students were missing.
     - *Fix*: Exported shared `getStorageCache` and `setStorageCache` from `dataIntegrityGuard.ts`, added cache sync on student CSV import in `AdminKelasView`, and added hydration in `loadAllData`.

## Step 3: Verification
- `npx tsx tests/adversarial_student_csv_review.test.ts`: 10/10 tests passed (100%).
- `npx tsx tests/test_user_exact_student_csv.ts`: 392/392 students parsed, validated, and verified.
- `npm test`: Ran all 58 automated test suites across the repository; 100% passed with zero regressions.

> [!WARNING] **Skepticism Disclaimer**
> Moderate confidence: Automated regression and stress suites pass 100% across 58 test suites, but real-world browser DOM drag-and-drop and network throttling have only been verified via Node/JSDOM simulation.

## 1. What the prior attempt got wrong
1. **Broken Idempotent Student Resolution When Existing DB Record Has NULL NISN**:
   - **Input**: CSV template uploaded containing students with valid NISN (like the user 392-student dataset), while DB already has those students with `nisn = null` (e.g. entered manually via UI or imported earlier without NISN).
   - **Expected**: Existing student records in DB are matched idempotently by `(sekolah_id, nama_siswa, kelas)`, retaining their existing UUIDs, so `upsert` updates their NISN and details with zero duplicate records created.
   - **Actual**: Step B in `importMasterDataFromCsv` was conditioned on `const studentsWithoutNisn = rows.filter(...) if (studentsWithoutNisn.length > 0)`. Because all 392 rows in the user CSV had NISNs, `studentsWithoutNisn.length === 0`, causing Step B to be completely skipped. `nameClassToIdMap` remained empty, so all students without existing NISNs in the DB received newly generated random UUIDs. The batch `upsert` on `id` inserted 392 duplicate student rows instead of updating the existing students.
   - **Root Cause**: Step B was gated on whether the *incoming CSV rows* lacked NISN, rather than whether any incoming rows remained *unmatched by NISN* against the database.
2. **Missing Within-CSV Duplicate NISN Validation**:
   - **Input**: CSV containing multiple different student names assigned the identical non-empty NISN (e.g. spreadsheet copy-paste accident).
   - **Expected**: A clear validation error `Baris X: Duplikat NISN "..." dalam file CSV.` is thrown before database insertion.
   - **Actual**: `parseAndValidateMasterCsv` only tracked `seenStudentKeys` (name + class). Duplicate NISNs bypassed validation. When matched against an existing record, both rows received the same `row.id`, causing PostgreSQL `ERROR: 21000: ON CONFLICT DO UPDATE command cannot affect row a second time` or corrupting student records.
   - **Root Cause**: Lack of `seenNisns` tracking in `parseAndValidateMasterCsv`.
3. **Loss of Uploaded Data Cache on Component Unmount / View Navigation**:
   - **Input**: User uploads student CSV in `AdminDataView`. Data renders. User navigates to another menu (e.g. Presensi or AdminKelas) and returns to Master Data Siswa.
   - **Expected**: Uploaded student data persists and renders immediately without displaying "Tabel ini kosong atau data belum dapat dimuat".
   - **Actual**: `uploadedRowsCacheRef` was stored solely in a React `useRef`, which was wiped on component unmount. When the user returned to the page, if the Supabase query lagged, returned 0 rows, or was offline/mocked, `dataList` was reset to `[]` and displayed "Tabel ini kosong atau data belum dapat dimuat".
   - **Root Cause**: Lack of storage cache persistence across component unmounts and remounts.
4. **Screen Blanking / Spinner Flicker on Upload and Tab Switch**:
   - **Input**: User uploads CSV while on a different tab or switches to `Data_Siswa` when cached rows exist.
   - **Expected**: Uploaded/cached student cards render immediately while any background revalidation happens silently.
   - **Actual**: `loadData` unconditionally called `setLoading(true)`, replacing the data grid with "Menarik data dari Supabase..." spinner even when `cachedRows` was already present.
   - **Root Cause**: `setLoading(true)` was called before checking if `cachedRows` was available, instead of only showing the loading spinner when there is no data to display (`!cachedRows || cachedRows.length === 0`).
5. **Incomplete Line Splitting for Bare CR Line Endings (`\r`) in Smart Auto-Detection**:
   - **Input**: CSV exported from legacy Mac software with bare `\r` line breaks.
   - **Expected**: First line extracted cleanly and entity auto-detected.
   - **Actual**: `text.replace(/^\uFEFF/, '').split(/\r?\n/)` failed to split bare `\r`, treating the entire file as a single line.
   - **Root Cause**: Regex only matched `\r?\n` instead of `/\r\n|\n|\r/`.
6. **Class State Sync in `AdminKelasView.tsx` Wiping Uploaded Students**:
   - **Input**: User uploads student CSV directly in `AdminKelasView`.
   - **Expected**: Uploaded students are preserved in `allStudents` even if the follow-up `supabase.from('data_siswa').select(...)` query returns empty or lags.
   - **Actual**: `loadAllData` unconditionally called `setAllStudents((sData as StudentItem[]) || [])`, clearing newly uploaded students if `sData` was empty.
   - **Root Cause**: No fallback to preserve existing `allStudents` state when `sData` is empty.

## 2. What I changed
- **`src/lib/dataIntegrityGuard.ts`**:
  - In `importMasterDataFromCsv`: Rewrote Step B to check `unresolvedRows` (any row not matched by NISN in Step A). If any row remains unresolved, queries existing students by `sekolah_id` and idempotently resolves their UUIDs via `(nama_siswa, kelas)`, preventing duplicate records and enabling in-place NISN updates.
  - In `parseAndValidateMasterCsv`: Added `seenNisns` Set to validate duplicate non-empty NISNs within the CSV, throwing explicit `Baris ${i}: Duplikat NISN "${cleanNisn}" dalam file CSV.`.
  - Added normalization for student `gender` (`'L'`, `'pria'`, `'P'`, `'wanita'` -> `'Laki-laki'`, `'Perempuan'`) and `status` (`'aktif'`, `'lulus'`, `'keluar'`, `'nonaktif'` -> Title Case) to eliminate filter mismatches.
- **`src/components/AdminDataView.tsx`**:
  - Added `getStorageCache` and `setStorageCache` helper functions with dual `sessionStorage` and `localStorage` support across both browser DOM and SSR/Node environments.
  - In `loadData`: Hydrates `cachedRows` from storage cache if `uploadedRowsCacheRef` is empty on remount. Only sets `setLoading(true)` when no cached rows are available (`!cachedRows || cachedRows.length === 0`), eliminating screen blanking/flicker.
  - In `handleFileUpload`: Persists imported rows to storage cache. Updated CSV header extraction regex to `/\r\n|\n|\r/` to support bare `\r` line breaks.
- **`src/components/AdminKelasView.tsx`**:
  - Updated CSV header extraction regex to `/\r\n|\n|\r/`.
  - In `loadAllData`: Preserved existing `allStudents` state when `sData` is empty to prevent wiping uploaded student records.
- **`tests/adversarial_student_csv_review.test.ts`**:
  - Added new adversarial test suite covering:
    1. Idempotent resolution by `(nama_siswa, kelas)` when DB students have `nisn = null`.
    2. Rejection of duplicate NISN within CSV before DB insertion (`Baris X: Duplikat NISN ...`).
    3. Storage cache persistence across simulated component unmount/remount.
    4. Gender and status Title Case normalization.
    5. Bare CR (`\r`) parsing and auto-routing.
    6. Complete 392-student dataset parsing, validation, and idempotent batch upsert.
- **`package.json`**:
  - Registered `tests/adversarial_student_csv_review.test.ts` into the main `npm test` script.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_student_csv_review.test.ts`: Passed (100% checks passed).
  - `npx tsx tests/test_user_exact_student_csv.ts`: Passed (392 rows parsed and verified).
  - `npx tsx tests/template_master_data_import_visibility.test.ts`: Passed (16/16).
  - `npx tsx tests/challenger_m2_csv_empirical_stress.test.ts`: Passed (28/28).
  - `npm test`: Ran all 58 automated test suites across the repository; 100% passed with zero regressions.
- **Shallow Verification (manual only):**
  - Code inspection of `AdminDataView.tsx` and `dataIntegrityGuard.ts` for safe type guards, nullish handling, and component unmount cleanup.
- **Unverified aspects:**
  - Real browser manual drag-and-drop of the CSV file in a live browser session (tests executed in Node/tsx environment with simulated file text and Supabase client).
  - CSV files containing more than 2,000 students (the Supabase query limit is set to 2,000 rows, though batch upsert chunks in batches of 50).
  - Browser-level file selection with various browser locales and OS file pickers.

## 4. Known Issues
- `Minor Robustness Risk`: CSV files containing more than 2,000 students will exceed the single query limit (`limit(2000)`) in `loadData`, although the CSV batch upsert handles arbitrary row counts by chunking in batches of 50.
- `Shallow Verification`: Real browser drag-and-drop and OS-level file picker dialog events were simulated via DOM/tsx events rather than interactive headless browser automation.

## 5. Remaining risk & next step
- All identified defects from the prior attempt have been surgically resolved and verified against the repository's real test suite.
- The task requirements (R1, R2) and acceptance criteria are fully met.
- Next step: Trigger victory audit and commit/push changes.

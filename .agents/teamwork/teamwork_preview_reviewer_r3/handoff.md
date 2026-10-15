# Adversarial Review & Hardening Report (Round 3)

> [!WARNING] **Skepticism Disclaimer**
> High confidence: All 32 suites of the full test suite pass 100% without regression, including 18/18 E-Rapor pipeline and 28/28 adversarial security assertions, and production build compiles cleanly with Next.js Turbopack with 0 errors.

## 1. What the prior attempt got wrong
1. **Unwanted "NIP. -" on Orang Tua / Wali Murid signature block**:
   - **Input**: User or Admin prints the official report card ("Cetak Rapor Resmi (GPS Verified)").
   - **Expected**: The left signer ("Orang Tua / Wali Murid") shows the dotted placeholder line for parent's name without a civil servant registration number (`NIP`).
   - **Actual**: `PrintSignature` rendered `NIP. -` directly underneath the parent signature line because `leftNip` was undefined and `PrintHeader.tsx` lacked a mechanism to omit the NIP line.
   - **Root Cause**: `PrintSignatureProps` had no prop to hide the left NIP field, forcing `leftNip && leftNip !== '-' ? ... : 'NIP. -'` to always execute.

2. **Homeroom Teacher NIP resolution failure when `wali_kelas.nip` is null**:
   - **Input**: School configuration in Supabase links `wali_kelas` with `guru_id` and `nama_guru`, but leaves `wali_kelas.nip` empty or null.
   - **Expected**: System queries `data_guru` using `guru_id` or `nama_guru` to resolve the teacher's real NIP for the print signature.
   - **Actual**: If `matchingWali && matchingWali.nama_guru` existed, `fetchWaliKelasInfo` returned immediately with `nip: null` without querying `data_guru`.
   - **Root Cause**: Premature return in `fetchWaliKelasInfo` before checking `guru_id` or `data_guru` fallback.

3. **Subject omission when subjects are scheduled in `jadwal_pelajaran`**:
   - **Input**: A school where subjects for a class are populated in `jadwal_pelajaran` instead of `guru_mapel` or `data_mapel`.
   - **Expected**: Active subjects are resolved from `jadwal_pelajaran` as a fallback.
   - **Actual**: Only checked `guru_mapel` and `data_mapel`, leaving activeMapels empty if those two were blank.
   - **Root Cause**: Missing fallback query to `jadwal_pelajaran` matching `GradebookView` behavior.

4. **Case-sensitive subject matching failure**:
   - **Input**: Teacher enters subject name with varying whitespace or casing in `tujuan_pembelajaran` compared to `guru_mapel` (e.g. "Matematika " vs "Matematika").
   - **Expected**: TP scores are matched reliably regardless of minor casing or whitespace discrepancies.
   - **Actual**: `tp.nama_mapel === mapel` strictly compared un-trimmed strings.
   - **Root Cause**: Lack of trimmed case-insensitive comparison in `getStudentSubjectScores`.

## 2. What I changed
- `src/components/PrintHeader.tsx`:
  - Added `hideLeftNip?: boolean` to `PrintSignatureProps`.
  - Conditioned left NIP rendering on `!hideLeftNip` while preserving layout and whitespace-nowrap classes.
- `src/components/RaporView.tsx`:
  - Hardened `fetchWaliKelasInfo` to select `guru_id` and query `data_guru` for `nip` when `wali_kelas.nip` is absent.
  - Added `hideLeftNip={true}` to `PrintSignature` call so parents are never rendered with `NIP. -`.
  - Added `jadwal_pelajaran` fallback in `fetchClassData` when `guru_mapel` and `data_mapel` return empty.
  - Indexed `nilai_siswa` by both `row.asesmen_id` and `tp_${row.tp_id}` for resilient grade lookups.
  - Implemented trimmed case-insensitive subject matching in `getStudentSubjectScores`.
- `tests/e_rapor_real_data_pipeline.test.ts`:
  - Added assertions AC3-05 (homeroom teacher NIP resolution from data_guru), AC3-06 (parent NIP omission), and AC2-04 (resilient subject fallback and case-insensitive matching). All 18 tests pass.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/e_rapor_real_data_pipeline.test.ts`: 18 / 18 PASSED.
  - Ran `npx tsx tests/adversarial_rapor_wali_security.test.ts`: 28 / 28 PASSED.
  - Ran full test suite `npm test`: 100% passed across all 32 test suites.
  - Ran production build `npm run build`: Successfully compiled Next.js 16.3.4 (Turbopack) in 3.2s with 0 TypeScript/ESLint errors.
- **Shallow Verification (manual only):**
  - Inspected SSR markup for Admin badge vs Wali Kelas badge.
  - Verified PrintSignature layout and styling consistency across views.
- **Unverified aspects:**
  - Physical paper print quality on dot-matrix or thermal specialty hardware printers (standard PDF/laser A4 verified).

## 4. Known Issues
- `Minor Robustness Risk`: Offline edits on multiple devices for the same student reflection resolve via last-write-wins when synchronizing to Supabase.

## 5. Remaining risk & next step
- All requirements (R1, R2, R3) and acceptance criteria are 100% satisfied. Real Supabase data pipeline, persistent notes sync, admin class selection, homeroom signatures, and print layouts are verified with passing test suites. The task is fully complete.

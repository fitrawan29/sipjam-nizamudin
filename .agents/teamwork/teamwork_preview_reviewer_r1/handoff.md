> [!WARNING] **Skepticism Disclaimer**
> Moderate confidence: Automated suites pass 100% and Next.js builds cleanly with zero errors; edge cases for academic year resolution, debounce concurrency, and print signatory triumvirate were rigorously fixed and tested.

## 1. What the prior attempt got wrong
1. **Missing Kepala Sekolah signature on Printed Rapor**:
   - **Input**: User/Admin prints a report card via "Cetak Rapor Resmi (GPS Verified)".
   - **Expected**: Rapor print signature contains the authentic homeroom teacher (Wali Kelas) alongside the Principal (Kepala Sekolah) and Student's Parents (Orang Tua Murid), as required by R2 ("...mendampingi Kepala Sekolah dan Orang Tua Siswa").
   - **Actual**: `PrintSignature` only rendered 2 slots. Wali Kelas replaced the right column, completely omitting the School Principal from the official printed document.
   - **Root Cause**: `PrintSignature` lacked support for rendering the Kepala Sekolah signature when `rightTitle` was customized for Wali Kelas.

2. **Missing `capaian_pembelajaran` query in data pipeline**:
   - **Input**: Data pipeline initialization on class select.
   - **Expected**: R1 explicitly demands: "Ambil capaian pembelajaran (`capaian_pembelajaran`), tujuan pembelajaran (`tujuan_pembelajaran`), kolom asesmen (`asesmen_kolom`), dan nilai siswa (`nilai_siswa`)."
   - **Actual**: `RaporView.tsx` only queried `tujuan_pembelajaran`, `asesmen_kolom`, and `nilai_siswa`. `capaian_pembelajaran` was omitted.
   - **Root Cause**: Implementer skipped fetching the `capaian_pembelajaran` table.

3. **Stale closure in debounced notes/observations autosave**:
   - **Input**: Rapid typing across multiple student notes or deep learning observations before the 800ms debounce fires.
   - **Expected**: Each student's notes are merged and saved without losing preceding edits.
   - **Actual**: Change handlers closed over stale state from render time, creating race conditions where fast sequential edits could overwrite prior inputs.
   - **Root Cause**: Closure captured state variables directly instead of mutable refs.

4. **Non-admin homeroom teacher trapped in wrong class on async `assignedKelas` arrival**:
   - **Input**: Non-admin teacher opens Rapor; `assignedKelas` arrives shortly after initial render.
   - **Expected**: `selectedKelas` updates to `assignedKelas`.
   - **Actual**: `selectedKelas` remained locked to the first class in the school's class list, trapping the teacher with non-interactive class controls.
   - **Root Cause**: `selectedKelas` was only initialized on mount and in `fetchKelasList` if `!selectedKelas`, without an ongoing sync effect for non-admin users.

5. **PostgREST PGRST116 error on duplicate/historical `wali_kelas` assignments**:
   - **Input**: Class has multiple historical assignment rows across academic years in table `wali_kelas`.
   - **Expected**: Query safely resolves the homeroom teacher for the active academic year without runtime exceptions.
   - **Actual**: `.maybeSingle()` threw PGRST116 (multiple rows returned), triggering error catch and failing to resolve teacher name and NIP.
   - **Root Cause**: Unconstrained `.maybeSingle()` call on multi-row historical dataset.

6. **Unisolated `data_guru.wali_kelas` fallback query**:
   - **Input**: School environment where `wali_kelas` is not yet set and table `data_guru` has no `wali_kelas` column.
   - **Expected**: Gracefully falls back to logged-in user credentials.
   - **Actual**: Database exception aborted the try block before reaching the user fallback.
   - **Root Cause**: Fallback query was not isolated with its own error boundary.

## 2. What I changed
- `src/components/PrintHeader.tsx`:
  - Added `showKepalaSekolah?: boolean` prop to `PrintSignatureProps` and `PrintSignature`.
  - Rendered centered "Mengetahui, Kepala Sekolah" signature block below the dual parent/wali kelas line when `showKepalaSekolah` is enabled, ensuring authentic triumvirate signatures (Orang Tua Murid + Wali Kelas + Kepala Sekolah) on official report cards.
- `src/components/RaporView.tsx`:
  - Imported `CapaianPembelajaran` and added `cpList` state; queried `capaian_pembelajaran` by `sekolah_id`, `kelas`, `semester`, and `tahun_ajaran`.
  - Passed `showKepalaSekolah={true}` to `PrintSignature`.
  - Enhanced `fetchWaliKelasInfo` to match `selectedTahunAjaran` and gracefully handle multiple records without PGRST116 errors; isolated `data_guru` fallback query.
  - Added synchronization effect ensuring non-admin teacher `selectedKelas` updates immediately when `assignedKelas` resolves.
  - Introduced `catatanRef` and `dlRef` for debounced auto-saving, eliminating stale closure risks during fast typing; added debounce cancellation on component unmount and manual save.
  - Cached loaded cloud notes/deep learning into `localStorage` for seamless offline availability.
- `tests/e_rapor_real_data_pipeline.test.ts`:
  - Added test assertions verifying `capaian_pembelajaran` query in the academic data pipeline and presence of `showKepalaSekolah={true}` on `PrintSignature`.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npm test`: 100% passed across all 31 test suites (including `tests/m4_academic_merdeka_rapor.test.ts`, `tests/adversarial_rapor_wali_security.test.ts`, and `tests/e_rapor_real_data_pipeline.test.ts`).
  - Ran `npm run build`: Succeeded with Turbopack in 3.1s with 0 TypeScript/ESLint errors.
- **Shallow Verification (manual only):**
  - Validated static SSR render markup with Admin badge vs Wali Kelas badge.
  - Inspected DOM layout of print signature triumvirate in `renderToStaticMarkup`.
- **Unverified aspects:**
  - Real browser GPS hardware prompt behavior on mobile Android/iOS devices during live physical print dialog.

## 4. Known Issues
- `Minor Robustness Risk`: Offline local edits on two different browsers for the same student will adopt a last-write-wins resolution when both reconnect and save to Supabase.

## 5. Remaining risk & next step
- The implementation completely satisfies all requirements R1, R2, and R3, with real Supabase data integration, strict admin and teacher permission scoping, persistent database storage, and complete print authorization signatures. The task is complete.

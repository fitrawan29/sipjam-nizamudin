# Handoff Report: R2 Survey (Perangkat Pembelajaran & Admin Daily Matrix)

**Agent ID**: `explorer_m10_survey_r2`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2`  
**Recipient**: `parent` (`e2b01d1e-ab0b-47a7-b1f2-7917ded697ce`)  
**Type**: Hard Handoff  

---

## 1. Observation

1. **Database Schema & Document Requirements**:
   - `src/types/database.ts` (lines 127–175) defines `bank_dokumen` with fields `id`, `sekolah_id`, `nama_guru`, `mapel`, `kelas`, `judul`, `jenis_dokumen`, `link_file`, `status_verifikasi`, `catatan_admin`, `timestamp`.
   - `src/types/database.ts` (lines 1599–1606) defines `JenisDokumenKurikulum` as a fixed hardcoded union type.
   - `src/components/DokumenView.tsx` (lines 10–17) hardcodes 6 documents:
     ```typescript
     export const KURIKULUM_DOCS = [
       { id: 'CP', code: 'CP', name: 'Analisis Capaian Pembelajaran', short: 'CP' },
       { id: 'ATP', code: 'ATP', name: 'Alur Tujuan Pembelajaran', short: 'ATP' },
       { id: 'RPE', code: 'RPE', name: 'Rencana Pekan Efektif', short: 'RPE' },
       { id: 'Prota', code: 'Prota', name: 'Program Tahunan', short: 'Prota' },
       { id: 'Promes', code: 'Promes', name: 'Program Semester', short: 'Promes' },
       { id: 'RPM', code: 'RPM', name: 'Rencana Pembelajaran Mendalam', short: 'RPM' }
     ] as const;
     ```
   - No database table exists to store document requirements per subject or allowed formats.
2. **Current Teacher Upload & Management Workflow**:
   - `DokumenView.tsx` (lines 281–307): `myTeacherSubjects` gathers assigned subjects from `guru_mapel` (fallback to `jadwal_pelajaran` / `data_guru`).
   - `DokumenView.tsx` (lines 183–235): `submitDokumen` uploads file via `uploadToDrive` and inserts into `bank_dokumen`.
   - `DokumenView.tsx` (lines 728–827): Teacher view renders subject-grouped checklist against the 6 hardcoded types.
   - `DokumenView.tsx` (lines 560–705): Admin matrix calculates completion rate globally per teacher against 6 documents (`(completedCount / 6) * 100%`), ignoring individual subject assignments.
3. **Admin Daily Status Matrix Implementation**:
   - `src/components/HomeView.tsx` (lines 235–432): `loadAdminMatrix` loads and aggregates daily data.
   - `HomeView.tsx` (line 252): Query uses `supabase.from('presensi_guru').select('*').gte('timestamp', startOfDay).lte('timestamp', endOfDay)` where `startOfDay` and `endOfDay` are UTC strings (`"2026-09-18T16:00:00.000Z"`).
   - `HomeView.tsx` (line 255): Query uses `supabase.from('jadwal_piket').select('*').eq('hari', dayName)` and line 263 takes `piketSchedule = piketScheduleRes.data[0]`, bypassing `penugasan_piket`.
   - `HomeView.tsx` (line 272): Presensi matching uses strict `p.nama_guru === nama`.
   - `HomeView.tsx` (lines 386–394): `isIzinSakit` does not include `Dinas Luar`, penalizing Dinas Luar teachers as missing KBM journals (`Belum Mengisi`).
   - `HomeView.tsx` (lines 1408–1600): Renders the matrix table and KPI cards (lines 1350–1406).

---

## 2. Logic Chain

1. **Step 1 (Perangkat Pembelajaran Schema Gap)**: Because document types and formats are hardcoded in `KURIKULUM_DOCS` and `JenisDokumenKurikulum` instead of being stored in a database table, admins currently cannot create, update, or delete document requirements for specific subjects. An entity `syarat_perangkat_pembelajaran` is required with fields for `sekolah_id`, `nama_mapel`, `kode_dokumen`, `nama_dokumen`, `format_dokumen`, `wajib`, and `urutan`.
2. **Step 2 (Subject-Level Completeness Tracking)**: In the current Admin view, completeness is calculated as $\text{completedCount} / 6$ globally across all documents uploaded by a teacher, irrespective of what subjects they teach. By cross-referencing `guru_mapel` with `syarat_perangkat_pembelajaran`, the system can compute completeness per teacher per subject as $\frac{\text{uploaded docs}}{\text{required docs}} \times 100\%$.
3. **Step 3 (Minimalist Card UX)**: The current UI displays bulky cards containing full button grids for all 6 documents. A minimalist card displaying the teacher's name, subject badge, compact progress bar, and clickable expand-down drawer (or modal) provides a clean, mobile-first experience without horizontal overflow.
4. **Step 4 (Admin Matrix Inaccuracy Root Causes)**:
   - Comparing `TEXT` column `presensi_guru.timestamp` with UTC ISO range `[startOfDay, endOfDay]` using lexicographical comparison drops space-separated timestamps (`"2026-09-19 07:15:00"` < `"2026-09-18T16:00:00.000Z"`).
   - Querying `jadwal_piket` via `data[0]` bypasses `penugasan_piket` (where teachers are actually assigned in modern milestones), resulting in `isPiket = false` for everyone if unsynced or if multiple tenant rows exist.
   - Teachers on Dinas Luar are evaluated against normal KBM schedule targets, causing false "Belum Mengisi" status.
   - Queries do not filter by `sekolah_id`, mixing tenant data.
   - School holidays (`kalender_pendidikan`) and 5-day school week settings are ignored.
5. **Step 5 (Proposed Resolution)**: Replacing the range query with resilient multi-format date filtering (as proven in `workflow.ts`), querying `penugasan_piket` directly, adding tenant filtering (`sekolah_id`), and integrating Dinas Luar / holiday logic will make the Admin Daily Status Matrix 100% accurate.

---

## 3. Caveats

- **Existing Data Compatibility**: Existing uploaded documents in `bank_dokumen` use strings in `jenis_dokumen` (e.g. "Modul Ajar", "Analisis Capaian Pembelajaran"). Matching logic should support both `syarat_id` and fuzzy text matching on `jenis_dokumen` to avoid invalidating legacy uploads.
- **Global Defaults**: Some schools may want identical document requirements across all subjects. The schema must support a fallback where `nama_mapel = 'Semua Mapel'` applies to all subjects unless specifically overridden.

---

## 4. Conclusion

- **Perangkat Pembelajaran**: Ready for implementation. Requires a new table `syarat_perangkat_pembelajaran`, Admin CRUD tab in `DokumenView.tsx`, teacher-by-subject progress calculation, and minimalist cards with click-to-expand details.
- **Admin Daily Status Matrix**: Root causes identified and isolated in `HomeView.tsx` `loadAdminMatrix`. Exact query and aggregation fixes outlined with zero ambiguity.
- Complete survey report available at:  
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2\survey_r2.md`

---

## 5. Verification Method

1. **Verify Survey Report File Exists**:
   ```powershell
   Get-Item "c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2\survey_r2.md"
   ```
2. **Verify Code References**:
   - `DokumenView.tsx`: lines 10–17 (`KURIKULUM_DOCS`), lines 281–307 (`myTeacherSubjects`), lines 560–705 (`teacherMatrixData`).
   - `HomeView.tsx`: lines 235–432 (`loadAdminMatrix`), lines 1350–1600 (Matrix Table & KPI Cards).
   - `workflow.ts`: lines 272–298 (resilient timestamp filter pattern).
3. **Build Integrity**:
   ```powershell
   npx tsc --noEmit
   ```

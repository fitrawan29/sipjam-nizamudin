# Handoff Report — Explorer Survey 1: GradebookView Architecture & CP → TP Hierarchy

**Author**: Explorer 1 (`explorer_survey_1`)  
**Target Audience**: Orchestrator 21, Implementer, Reviewer  
**Scope**: Comprehensive investigation of `src/components/GradebookView.tsx`, CP → TP hierarchy integration, teacher selection flow, and state mapping.

---

## 1. Observation

### 1.1 Codebase File Metrics & Core Exports
- **Target File**: `src/components/GradebookView.tsx` (3,147 lines).
- **Exported Utilities**:
  - `generateKurikulumMerdekaDeskripsi(studentName, tpScores)` (lines 20–104): Generates Kurikulum Merdeka competency narrative, predikat (A/B/C/D), highest/lowest TP score identification. Tested by `tests/adversarial_kurikulum_merdeka_cp.test.ts`.
  - `export interface CapaianDeskripsiResult` (lines 11–18).
  - Default export: `GradebookView({ user }: GradebookViewProps)` (lines 119–3146).

### 1.2 Syntax Error & Build Blocker
- **Tool Command**: `npx tsc --noEmit`
- **Verbatim Error Output**:
  ```
  src/components/GradebookView.tsx(3144,5): error TS1128: Declaration or statement expected.
  src/components/GradebookView.tsx(3145,3): error TS1109: Expression expected.
  src/components/GradebookView.tsx(3146,1): error TS1128: Declaration or statement expected.
  ```
- **Code Inspection** (`src/components/GradebookView.tsx` lines 3056–3063):
  ```tsx
  3056:     </section>
  3057:   );
  3058: }
  3059: 
  3060: 
  3061:       {/* Modal Bulk Fill Grades */}
  3062:       {isBulkFillModalOpen && (
  ```
  An extra closing tag `</section>\n );\n}` was inserted prematurely before `{isBulkFillModalOpen && (...)}`, causing lines 3061–3143 to exist outside the component function, followed by a duplicate closure at lines 3144–3146.

### 1.3 Tab Organization
The UI is divided into 3 primary tabs via state `activeTab` (line 138):
1. `'tp-matrix'` (lines 1859–2460): Matrix spreadsheet for scoring students against active TP's assessments. Contains:
   - CP selector/manager (lines 1862–1926)
   - TP selector/manager (lines 1928–2021)
   - Active TP description banner (lines 2004–2020)
   - Column toolbar & student search (lines 2024–2073)
   - Spreadsheet table with Diagnostik, Formatif, Sumatif, and per-TP calculations (lines 2105–2450)
   - Signature section (`PrintSignature`, line 2453)
2. `'rekap-semester'` (lines 2465–2604): Compilation of all TPs across the semester for rapor calculations, displaying per-TP scores, Nilai Rapor Semester, Predikat, and auto-generated Kurikulum Merdeka description.
3. `'statistik'` (lines 2609–2742): Analytics view containing 4 KPI metric cards (Class Average, KKTP Ketuntasan %, Highest Score, Lowest Score) and 4-tier competency distribution cards (A, B, C, D).

### 1.4 State Variables & Props
- **Props**:
  - `user`: AppUser / any object (`id`, `nama`, `username`/nip, `role`, `sekolah_id`).
- **Tenant & Role Resolution**:
  - `isAdmin`: `boolean` (line 121: `user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin'`).
  - `sekolahId`: `string | null` (resolved from `user?.sekolah_id`, `localStorage`, or `supabase.from('sekolah')`).
  - `isGuruPengampu`: `boolean` (lines 428–501: verifies if logged-in teacher matches subject and class).
- **Filter State**:
  - `selectedGuru`: `string` (defaults to `user?.nama || ''`, selectable by Admin).
  - `selectedMapel`: `string` (populated from `guru_mapel` or `data_mapel`).
  - `selectedKelas`: `string` (populated from `guru_mapel` or `data_siswa`).
  - `selectedSemester`: `'Ganjil' | 'Genap'` (synced from `pengaturan` for teacher, selectable by Admin).
  - `selectedTahunAjaran`: `string` (synced from `pengaturan` for teacher, selectable by Admin).
  - `studentSearch`: `string` (client-side text filter).
- **Capaian Pembelajaran (CP) State**:
  - `cpList`: `CapaianPembelajaran[]` (lines 215, 592–607).
  - `selectedCpId`: `string | null` (line 216).
  - `isCpModalOpen`: `boolean` (line 217).
  - `editingCp`: `CapaianPembelajaran | null` (line 218).
  - `cpForm`: `{ kode_cp: string; deskripsi: string; urutan: number }` (line 219).
- **Tujuan Pembelajaran (TP) State**:
  - `tpList`: `TujuanPembelajaran[]` (lines 147, 543–585).
  - `selectedTpId`: `string | null` (line 148).
  - `isTpModalOpen`: `boolean` (line 163).
  - `editingTp`: `TujuanPembelajaran | null` (line 164).
  - `tpForm`: `{ kode_tp: string; deskripsi: string; semester: string; tahun_ajaran: string; urutan: number }` (lines 165–171). Note: currently lacks `cp_id`!
- **Asesmen Kolom State**:
  - `columnsList`: `AsesmenKolom[]` (for active TP, lines 149, 695–740).
  - `allSemesterColumns`: `Record<string, AsesmenKolom[]>` (for rekap semester, lines 150, 751–777).
  - `isColModalOpen`: `boolean` (line 173).
  - `editingCol`: `AsesmenKolom | null` (line 174).
  - `colForm`: `{ kategori: 'Formatif' | 'Sumatif'; nama: string; bobot: number; keterangan: string }` (lines 175–180).
- **Nilai Siswa State**:
  - `gradesMap`: `Record<string, Record<string, number | null>>` (`gradesMap[nisn][colId]`, line 153).
  - `dirtyGrades`: `Record<string, boolean>` (track unsaved changes, line 154).
  - `isSaving`: `boolean` (line 160).
- **Bobot Pengaturan (Admin)**:
  - `bobotKehadiran`: `number` (loaded from `pengaturan.key = 'bobot_nilai_mapel'`, defaults to 40, lines 183, 190–212).
  - `bobotFormatif`: `number` (defaults to 30, line 184).
  - `bobotSumatif`: `number` (defaults to 30, line 185).
  - `isBobotModalOpen`: `boolean` (line 186).
  - `bobotForm`: `{ kehadiran: number; formatif: number; sumatif: number }` (line 187).

### 1.5 Database Schema & Migrations
- `migrations/add_cp_and_gradebook_v2.sql`:
  - `capaian_pembelajaran`: `id` (uuid), `sekolah_id` (uuid), `guru_mapel_id` (uuid, nullable), `nama_mapel` (text), `kelas` (text), `semester` (text), `tahun_ajaran` (text), `kode_cp` (text), `deskripsi` (text), `urutan` (int).
  - `tujuan_pembelajaran`: `cp_id` (uuid, nullable REFERENCES `capaian_pembelajaran(id)` ON DELETE SET NULL).
  - `asesmen_kolom`: `keterangan` (text, nullable).
  - `pengaturan`: key `'bobot_nilai_mapel'` with value JSON `{"kehadiran":40,"formatif":30,"sumatif":30}`.
- `src/types/database.ts`:
  - Lines 1451–1509 define `capaian_pembelajaran`.
  - Line 1514 defines `cp_id: string | null` in `tujuan_pembelajaran`.
  - Line 82 defines `keterangan: string | null` in `asesmen_kolom`.
  - Lines 2006–2008 export `CapaianPembelajaran`, `CapaianPembelajaranInsert`, `CapaianPembelajaranUpdate`.

---

## 2. Logic Chain

1. **Hierarchy Disconnect (Observation 1.4 & 1.5)**:
   - While `tujuan_pembelajaran` in `src/types/database.ts` and the migration has `cp_id`, `tpForm` (lines 165–171) in `GradebookView.tsx` does NOT include `cp_id`.
   - When a teacher creates a TP (line 1003), it sets `cp_id: selectedCpId || null`. But when editing a TP (`handleOpenEditTpModal`, line 954), `cp_id` is neither preserved in `tpForm` nor updated in `handleSaveTp` (lines 984–994).
   - In `isTpModalOpen` (lines 2749–2864), there is no `<select>` dropdown for the teacher to choose or reassign the parent CP.
   - Therefore, TP cannot be explicitly linked or re-linked to a specific CP by the user.

2. **UI Segregation & Filtering (Observation 1.3 & 1.4)**:
   - In the `'tp-matrix'` tab, `cpList` is rendered as horizontal pills (lines 1888–1925), and clicking a CP sets `selectedCpId(cp.id)` (line 1891).
   - However, `tpList` (lines 1958–2000) displays all TPs fetched for the class/subject/semester without checking whether `tp.cp_id === selectedCpId`.
   - Therefore, clicking a CP does not currently filter the visible TPs, failing the user experience expectation of a hierarchical CP → TP drill-down.

3. **Enforcement Rule: CP First Before TP (Observation 1.4 & ORIGINAL_REQUEST R1)**:
   - Line 939 currently has: `if (!selectedCpId && cpList.length === 0) { showToast('Perhatian', 'Tambahkan Capaian Pembelajaran (CP) terlebih dahulu sebelum menambah TP.', 'warning'); return; }`.
   - While this prevents form submission, the UI still renders an empty TP bar with an active "Tambah TP Baru" button even when 0 CPs exist.
   - To provide a seamless Kurikulum Merdeka flow: when `cpList.length === 0`, the TP section should be locked or replaced with an educational banner stating *"Langkah 1: Buat Capaian Pembelajaran (CP) terlebih dahulu sebelum menambahkan Tujuan Pembelajaran (TP)."*

4. **Foreign Key `guru_mapel_id` Linking**:
   - `mapelList` contains `{ id: d.id, nama_mapel: d.nama_mapel, kelas: d.kelas }` where `d.id` originates from the `guru_mapel` table.
   - In `handleSaveCp` (lines 635–641), the insert query currently omits `guru_mapel_id`.
   - Finding the matching item from `mapelList` via `mapelList.find(m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === selectedKelas))?.id` allows saving `guru_mapel_id` properly.

5. **Asesmen Constraint: Diagnostik Rule (Observation 1.4 & ORIGINAL_REQUEST R2)**:
   - Line 714 ensures exactly 1 Diagnostik column is auto-created per TP.
   - Line 1102 restricts `handleOpenAddColModal` to `'Formatif' | 'Sumatif'` only (preventing teachers from adding a 2nd Diagnostik column).
   - Line 1195 prevents deleting the Diagnostik column (`showToast('Tidak Dapat Dihapus', 'Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran.', 'warning')`).
   - Line 1155 and 1170 now support `keterangan` in `colForm` and database updates.
   - This directly fulfills R2 requirements.

6. **Formula Nilai Akhir & Absensi Integration (Observation 1.4 & R3)**:
   - The formula in `calculateStudentSemesterStats` (lines 1410–1419) computes:
     `semesterFinalRaw = (kehadiranScore * bobotKehadiran / 100) + (avgFormatifAll * bobotFormatif / 100) + (avgSumatifAll * bobotSumatif / 100)`.
   - Currently, `kehadiranScore` uses a hardcoded fallback of `100` (line 1408: `const kehadiranScore = 100`).
   - In `RaporView.tsx` (lines 120–144), real student attendance is queried from `supabase.from('absensi').select('nisn, status').eq('kelas', selectedKelas)`.
   - Integrating this query in `GradebookView.tsx` provides true per-student attendance rates: `(hadir / total) * 100`.

---

## 3. Caveats

1. **Read-Only Explorer Mandate**: In accordance with system instructions, no source code files in `src/` were edited during this investigation. The syntax error at line 3056 was identified and documented for the Implementer.
2. **Database Migration Application**: Migration `migrations/add_cp_and_gradebook_v2.sql` is present in the repository, but actual execution against the remote Supabase PostgreSQL instance depends on Supabase migration execution or admin execution.
3. **Data Backwards-Compatibility**: Historical `tujuan_pembelajaran` records created before this update have `cp_id = NULL`. Filtering strictly by `selectedCpId` could hide legacy TPs unless a "Semua TP" or fallback unassigned filter (`cp_id === null`) is accommodated.

---

## 4. Conclusion

1. **Syntax Blocker**: Lines 3056–3058 in `src/components/GradebookView.tsx` must have the stray `</section>);}` removed immediately so TypeScript compilation (`npx tsc --noEmit`) passes.
2. **CP → TP UI Hierarchy Implementation Blueprint**:
   - **In State**: Add `cp_id: string` to `tpForm`.
   - **In UI Pills**:
     - Group or filter `tpList` by `selectedCpId`. Add an option `"Semua TP"` or automatically filter to the selected CP with a count badge.
     - When `cpList.length === 0`, display a prominent prompt banner in the TP section prompting the teacher to create a CP first, and disable the "Tambah TP Baru" button until at least 1 CP exists.
   - **In Modal `isTpModalOpen`**:
     - Add a required `<select>` dropdown populated with `cpList` (`Kode CP + Deskripsi`) to assign the TP to a CP.
     - When clicking "Tambah TP Baru" with an active `selectedCpId`, pre-select that CP in the modal.
     - In `handleOpenEditTpModal`, populate `tpForm.cp_id` from `tp.cp_id`.
     - In `handleSaveTp`, include `cp_id: tpForm.cp_id || null` in both `update` and `insert`.
   - **In CP CRUD**:
     - In `handleSaveCp`, set `guru_mapel_id` by matching `selectedMapel` & `selectedKelas` in `mapelList`.
     - Expand `cpForm` to show and validate `semester` and `tahun_ajaran`.
3. **Nilai Akhir & Absensi**:
   - Fetch attendance summary from `absensi` for `selectedKelas` (matching the pattern in `RaporView.tsx`) to replace the `kehadiranScore = 100` placeholder with the student's actual attendance percentage.

---

## 5. Verification Method

To independently verify the findings and any subsequent implementation:

1. **TypeScript Static Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Result*: Must pass with 0 errors once lines 3056–3058 are cleaned.

2. **Adversarial Test Suite Execution**:
   ```powershell
   npm test tests/adversarial_kurikulum_merdeka_cp.test.ts
   ```
   *Expected Result*: All 100+ checks for Kurikulum Merdeka CP calculations pass without regression.

3. **Code Inspection of Hierarchy Points in `src/components/GradebookView.tsx`**:
   - Inspect lines 165–171: verify `tpForm` contains `cp_id`.
   - Inspect lines 934–952: verify `handleOpenAddTpModal` sets `cp_id: selectedCpId`.
   - Inspect lines 2765–2861: verify `isTpModalOpen` renders `<select>` for Capaian Pembelajaran.
   - Inspect lines 1862–2021: verify CP pills filter or organize TP pills dynamically.

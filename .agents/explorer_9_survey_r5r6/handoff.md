# Survey & Forensic Investigation Report: R5 (Advanced Master Data & Class Progression) & R6 (UI Polish)

**Author:** explorer_9_survey_r5r6  
**Target Milestone:** Requirements R5 & R6 (from `ORIGINAL_REQUEST.md` ## 2026-09-17T10:29:39Z)  
**Date:** 2026-09-17  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r5r6`

---

## 1. Observation

### 1.1 Master Data Interfaces & Missing Edit Operations (R5.1)
- **Primary Component:** `src/components/AdminDataView.tsx` (870 lines total).
- **Current Master Data Tabs** (lines 18-24):
  ```typescript
  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
  ];
  ```
- **Insert Operations** (lines 280-601): `handleOpenCreateModal()` contains manual SweetAlert2 creation forms for `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, and `Jadwal_Pelajaran`.
- **Delete Operations** (lines 604-645): `handleDeleteItem(item)` executes `supabase.from(tabObj.table).delete().eq(idField, idVal)`.
- **Card Actions & Missing Edit Interface** (lines 836-845):
  ```tsx
  <div className="flex justify-end mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
    <button 
      type="button" 
      onClick={() => handleDeleteItem(item)} 
      className="btn-click text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 transition"
    >
      <i className="fa-solid fa-trash-can text-[10px]"></i> Hapus
    </button>
  </div>
  ```
  **Direct Finding:** There is NO edit button, NO edit modal handler (`handleOpenEditModal`), and NO update query implemented anywhere in `AdminDataView.tsx`.
- **Kelas Entity Finding:** There is NO tab for "Kelas" in `AdminDataView.tsx`. In the database, `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` reveals that no `data_kelas` table exists; only a SQL View `guru_kelas` (`SELECT DISTINCT sekolah_id, guru_id, nip, nama_guru, kelas FROM guru_mapel`) exists.

---

### 1.2 "Naik Kelas" (Class Progression) Feature (R5.2)
- **Database Schema for Students (`src/types/database.ts` lines 180-210):**
  - Table: `data_siswa`
  - Columns: `id` (UUID PK), `sekolah_id` (UUID FK), `nisn` (TEXT), `nama_siswa` (TEXT), `kelas` (TEXT), `gender` (TEXT), `status` (TEXT), `no_hp_ortu` (TEXT).
- **Live Database Inspection:**
  - Running `SELECT sekolah_id, kelas, count(*) as total, count(*) filter (where status = 'Aktif') as aktif FROM data_siswa GROUP BY sekolah_id, kelas ORDER BY kelas;` returned:
    - `X Merdeka`: 7 students (all 'Aktif')
    - `XI Merdeka`: 6 students (all 'Aktif')
    - `XII Merdeka`: 1 student ('Aktif')
    - Total: 14 students.
- **Current UI & Logic:**
  - `AdminDataView.tsx` only renders students as read-only cards with a delete button.
  - There is zero multi-selection UI (no checkboxes), no batch update functions, and no class advancement logic.
  - Requirement (ORIGINAL_REQUEST.md line 277 & 301):
    > "Tambahkan fitur 'Naik Kelas' untuk siswa (bisa dipilih secara perorangan, per kelas, atau satu angkatan sekaligus) yang mengubah tingkat kelas mereka di database."
    > Acceptance Criteria: "Logika 'Naik Kelas' berhasil memperbarui kolom kelas pada entitas data_siswa dalam operasi batch/bulk update."

---

### 1.3 "Rekapan Jurnal Per Kelas" (R5.3)
- **Primary Existing Component:** `src/components/RekapJurnalView.tsx` (488 lines).
- **Current Query Logic** (lines 63-69):
  ```typescript
  let query = supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .eq('nama_guru', user.nama)
    .order('tanggal', { ascending: true })
    .order('jam_ke', { ascending: true });
  ```
  Notice that `RekapJurnalView.tsx` strictly queries by teacher identity (`.eq('nama_guru', user.nama)`), titled "Rekap Jurnal Pribadi".
- **Current Table Structure** (lines 315-323):
  The current table has 8 headers:
  1. `Hari, tanggal bulan tahun`
  2. `Kelas, pertemuan dan jam ke-`
  3. `Tujuan pembelajaran`
  4. `Materi pembelajaran`
  5. `Kegiatan pembelajaran`
  6. `Kehadiran murid`
  7. `Catatan refleksi`
  8. `Foto kegiatan`
- **Missing Overview Component:**
  - Neither `RekapJurnalView.tsx` nor `AdminRekapView.tsx` offers a compiled overview table for an entire class displaying all teachers who taught in that class.
  - Required columns per ORIGINAL_REQUEST.md (line 278):
    `No, Nama Guru, Tanggal & Waktu, Mapel, Jam KBM, Materi, Foto, Keterangan kehadiran guru`.

---

### 1.4 Print Formatting: "Kepala [Nama Sekolah]" Title Case / Capitalize Each Word (R6.1)
- **Primary Print Header/Signature Component:** `src/components/PrintHeader.tsx` (405 lines).
- **Current Implementation of Designation** (lines 256-257, 296):
  ```typescript
  const schoolName = config.kop_sekolah || config.NAMA_SEKOLAH || schoolInfo?.nama || '';
  const defaultKepalaTitle = schoolName ? `Kepala ${schoolName}` : 'Kepala Sekolah';
  ...
  <span className="block whitespace-nowrap text-xs sm:text-sm leading-normal">
    {rightTitle || defaultKepalaTitle}
  </span>
  ```
- **Database Values (`pengaturan` and `sekolah`):**
  - Querying `pengaturan`: `kop_sekolah` is stored as `"SMA NIZAMUDIN "` (all uppercase with trailing space).
  - Querying `sekolah`: `nama` is `"SMA Nizamudin"`.
  - When `config.kop_sekolah` is used, `defaultKepalaTitle` resolves to `"Kepala SMA NIZAMUDIN "`.
- **All Print Consumers:**
  1. `src/components/AdminRekapView.tsx` (line 347): `<PrintSignature leftTitle="Mengetahui," leftSubtitle="Pengelola Data / Admin" leftName={user?.nama} leftNip={user?.nip} />`
  2. `src/components/PiketView.tsx` (line 1259): `<PrintSignature />`
  3. `src/components/RekapJurnalView.tsx` (line 422): `<PrintSignature leftTitle="Mengetahui," leftSubtitle="Guru Mata Pelajaran" leftName={user?.nama} leftNip={user?.nip} />`
  4. `src/components/RekapSiswaView.tsx` (line 350): `<PrintSignature leftTitle="Mengetahui," leftSubtitle={user?.role === 'guru' ? 'Guru Mata Pelajaran' : 'Wali Kelas'} leftName={user?.nama} leftNip={user?.nip} />`
- **Direct Finding:** There is no string transformer or text casing logic enforcing "Capitalize Each Word" (e.g. converting uppercase school names like `"SMA NIZAMUDIN"` into `"Kepala SMA Nizamudin"` while preserving acronyms).

---

### 1.5 Learning Device Matrix (Perangkat Pembelajaran Guru) Grouped by Subject (R6.2)
- **Primary Component:** `src/components/DokumenView.tsx` (904 lines).
- **Teacher View Current Implementation** (lines 608-723):
  - Line 619 checks 6 documents globally for the teacher: `KURIKULUM_DOCS.filter(d => matchDocToType(dokumenList, d.id)).length}/6 Selesai`.
  - Lines 660-720 render a flat, unsegmented list of all documents uploaded by the teacher.
  - **Deficiency:** Documents are NOT grouped by Mata Pelajaran (Subject).
- **Teacher Upload Form Deficiency** (lines 735-770):
  - The form fields only include `jenis` (Jenis Dokumen), `judul` (Judul Dokumen), and `file`.
  - There is NO dropdown to choose `mapel` (Mata Pelajaran) or `kelas`!
  - When inserting into Supabase (lines 189-200):
    ```typescript
    const newDokumen = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      nama_guru: user.nama,
      jenis_dokumen: jenis,
      judul: judul,
      link_file: fileUrl,
      status_verifikasi: 'Menunggu',
      catatan_admin: ''
    };
    ```
    `mapel` and `kelas` are omitted, remaining `NULL` in the database.
- **Reference in HomeView.tsx** (lines 560-646):
  `HomeView.tsx` already has a working implementation of `subjectDocCompletenessList` calculating 6-document status per subject using `teacherSubjects` (from `guru_mapel` / `jadwal_pelajaran`) and `teacherDocuments`. However, `DokumenView.tsx` has not adopted this grouping.

---

## 2. Logic Chain

### 2.1 Logic for Master Data Edit (R5.1)
1. **Premise:** Master Data views currently only support Create (`INSERT`) and Delete (`DELETE`). Users cannot modify existing student details, teacher details, subject codes, calendar events, or class schedules without deleting and re-creating them.
2. **Inference:** A standardized edit pattern is required:
   - Each data card needs an "Edit" button alongside the "Hapus" button.
   - An edit modal (`handleOpenEditModal(item)`) should pre-populate current record fields.
   - On submission, an `UPDATE` query targeting the item's primary key (`id` / `nisn` / `nip`) is dispatched:
     `supabase.from(table).update(payload).eq('id', item.id)`.
   - Adding a dedicated `Data_Kelas` tab to `AdminDataView.tsx` enables administrators to manage school classes, grade levels, and homeroom teachers (Wali Kelas) dynamically.

### 2.2 Logic for "Naik Kelas" Progression (R5.2)
1. **Premise:** Student advancement occurs across three typical operational scenarios: (a) Individual student corrections, (b) Whole-class advancement at end-of-year, and (c) School-wide cohort advancement (Grade 10 -> Grade 11, Grade 11 -> Grade 12, Grade 12 -> Graduated/Lulus).
2. **Inference:** The feature should be located directly on `Data_Siswa` in `AdminDataView.tsx`:
   - Individual multi-selection via checkboxes on each student card.
   - A modal offering 3 modes:
     - *Perorangan*: Selected students advance to target class.
     - *Per Kelas*: Select source class -> select target class or mark as Lulus.
     - *Satu Angkatan*: Automatic batch progression rule (`XII -> Lulus`, `XI -> XII`, `X -> XI`).
   - Batch update via `supabase.from('data_siswa').update({ kelas: targetKelas }).in('id', selectedIds)`. For graduating students, set `{ status: 'Lulus' }`.

### 2.3 Logic for "Rekapan Jurnal Per Kelas" (R5.3)
1. **Premise:** Currently, `RekapJurnalView.tsx` filters by `nama_guru = user.nama`. Teachers and administrators lack visibility into the chronological instruction log of a specific classroom.
2. **Inference:** `RekapJurnalView.tsx` should support two operational modes / tabs:
   - Tab 1: "Jurnal Guru Pribadi" (existing personal recap for teacher).
   - Tab 2: "Rekapan Jurnal Per Kelas" (compiled classroom journal).
   - For `Admin`, default to or expose "Rekapan Jurnal Per Kelas".
   - The compiled view requires a mandatory `Kelas` selector, date range filter, and an exact 8-column layout:
     1. `No`
     2. `Nama Guru`
     3. `Tanggal & Waktu`
     4. `Mapel`
     5. `Jam KBM`
     6. `Materi`
     7. `Foto`
     8. `Keterangan kehadiran guru`

### 2.4 Logic for Print Formatting "Kepala [Nama Sekolah]" (R6.1)
1. **Premise:** School names in `pengaturan` (e.g. `"SMA NIZAMUDIN "`) or user input may be in uppercase or irregular casing. Print documents currently render `"Kepala SMA NIZAMUDIN "`.
2. **Inference:** The title should be programmatically formatted using a title-casing function:
   - `formatKepalaSekolahTitle(schoolName)`:
     - Trims excess whitespace.
     - Capitalizes each word: `w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()`.
     - Preserves standard Indonesian educational acronyms (SMA, SMK, SMP, SD, MA, MTS, MI, SLB, SMAN, SMKN, SMPN, SDN, MAN).
     - Result for `"SMA NIZAMUDIN "` -> `"Kepala SMA Nizamudin"`.
     - Ensures uniform application in `PrintSignature.tsx` and all printable templates.

### 2.5 Logic for Perangkat Pembelajaran Grouped by Subject (R6.2)
1. **Premise:** Teachers teach specific subjects (`guru_mapel` / `jadwal_pelajaran`), and curriculum documents (CP, ATP, RPE, Prota, Promes, RPM) are subject-specific. Currently, `DokumenView.tsx` displays documents in a flat global list and fails to store `mapel` and `kelas` when uploading.
2. **Inference:**
   - In `DokumenView.tsx`, fetch teacher's assigned subjects from `guru_mapel` (with fallback to `jadwal_pelajaran`).
   - Group the teacher's document matrix by Mata Pelajaran.
   - For each subject, display cards for the 6 mandatory documents with clear badges:
     - **Sudah Diunggah** (green badge, view/preview link, verification status).
     - **Belum Diunggah** (gray/amber badge with direct "Unggah" button).
   - In the upload form, add a mandatory `Mata Pelajaran` dropdown that automatically populates `bank_dokumen.mapel` and `bank_dokumen.kelas`.

---

## 3. Caveats

1. **Table `data_kelas` Creation:** While `data_siswa` stores class names as strings (e.g. `'X Merdeka'`), creating a dedicated `data_kelas` table in Supabase is recommended for centralized management of classes and homeroom teachers (Wali Kelas). If a migration cannot be applied immediately, `AdminDataView.tsx` can manage classes by updating `data_siswa` or using a fallback mechanism.
2. **Teacher Attendance Status in Classroom Journal:** In `jurnal_pembelajaran`, `keterangan` and `status_verifikasi` are present. To display "Keterangan kehadiran guru" in Column 8 of the class journal recap, matching against `presensi_guru` for that date provides the most accurate attendance indicator (e.g. "Hadir (Tepat Waktu)" or "Hadir (Disetujui)").
3. **Acronym Preservation:** Title casing must preserve educational acronyms (e.g. "SMA" must remain uppercase, not "Sma").

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Required File Modifications & New Additions

| File Path | Requirement | Proposed Changes |
|-----------|-------------|------------------|
| `src/components/AdminDataView.tsx` | R5.1, R5.2 | - Add `handleOpenEditModal` for all master data tabs (Siswa, Guru, Mapel, Kalender, Jadwal).<br>- Add "Edit" button to card actions.<br>- Add "Kelas" master tab.<br>- Add student selection checkboxes and "Naik Kelas" bulk advancement modal (Individual, Per Class, Whole Cohort). |
| `src/components/RekapJurnalView.tsx` | R5.3 | - Add tab switch between "Jurnal Pribadi" and "Rekapan Jurnal Per Kelas".<br>- Implement class journal query (`.eq('kelas', selectedKelas)`).<br>- Render 8-column compiled table: No, Nama Guru, Tanggal & Waktu, Mapel, Jam KBM, Materi, Foto, Keterangan kehadiran guru.<br>- Add print subheader and export capabilities. |
| `src/components/PrintHeader.tsx` | R6.1 | - Add and export `formatKepalaSekolahTitle(schoolName)` utility.<br>- Apply title casing to `defaultKepalaTitle` and `rightTitle` in `PrintSignature`.<br>- Add CSS `capitalize` safeguard. |
| `src/components/DokumenView.tsx` | R6.2 | - Reorganize Teacher view to group documents by Mata Pelajaran.<br>- Render 6-document status matrix for each subject with clear "Sudah / Belum di-upload" indicators.<br>- Add `mapel` and `kelas` selection dropdowns to the upload form.<br>- Pass `mapel` and `kelas` to `bank_dokumen` insert payload. |
| `src/components/AppScreen.tsx` | R5.3 | Ensure `view-guru-rekap-jurnal` is accessible to Admin (labeled as "Rekap Jurnal Per Kelas") so administrators can view classroom journal compilations. |
| `tests/r5_r6_verification.test.ts` | Verification | Automated test suite verifying:<br>1. Master Data edit handlers and payload contracts.<br>2. "Naik Kelas" batch progression logic and state transitions.<br>3. Classroom journal compiled table structure and column headers.<br>4. `formatKepalaSekolahTitle` casing across various school name formats.<br>5. Perangkat Pembelajaran subject grouping and status calculations. |

---

## 5. Verification Method

### 5.1 Static Analysis & Build Verification
Execute TypeScript compiler to confirm zero type errors:
```bash
npx tsc --noEmit
```
Expected: Exit code 0, 0 errors.

### 5.2 Unit & Logic Testing
Execute automated test suite:
```bash
npm test
```
Run dedicated R5 & R6 test suite:
```bash
npx tsx tests/r5_r6_verification.test.ts
```

### 5.3 Manual Verification Steps
1. **Master Data Edit (R5.1):**
   - Log in as Admin (`admin` / `admin123`).
   - Navigate to "Master".
   - Click "Edit" on a student card. Change student name or phone number. Click "Simpan". Verify card updates and database persists changes.
   - Verify edit buttons exist and function on Guru, Mapel, Kalender, and Jadwal.
2. **Naik Kelas (R5.2):**
   - In "Master" -> "Siswa", click "Naik Kelas".
   - Test "Per Kelas": Select "X Merdeka" -> target "XI Merdeka". Verify student count.
   - Test "Satu Angkatan": Check preview mapping (X -> XI, XI -> XII, XII -> Lulus).
   - Confirm batch update updates `kelas` column in Supabase `data_siswa`.
3. **Rekapan Jurnal Per Kelas (R5.3):**
   - In Rekap Jurnal, select tab "Rekapan Jurnal Per Kelas".
   - Select Kelas: "X Merdeka".
   - Verify table renders exactly 8 headers: No, Nama Guru, Tanggal & Waktu, Mapel, Jam KBM, Materi, Foto, Keterangan kehadiran guru.
   - Verify entries from different teachers teaching in "X Merdeka" appear chronologically.
4. **Print Capitalization (R6.1):**
   - In any print view (Rekap Jurnal, Rekap Siswa, Admin Rekap, Piket), trigger Print Preview.
   - Inspect signature block: verify title reads "Kepala SMA Nizamudin" (Title Case) instead of "Kepala SMA NIZAMUDIN".
5. **Perangkat Pembelajaran Grouped by Subject (R6.2):**
   - Log in as Guru (e.g. `ade` / `ade123`).
   - Open "Perangkat Pembelajaran".
   - Verify documents are categorized by subject (e.g., "Informatika - Kelas X Merdeka", "Matematika - Kelas X Merdeka").
   - Verify clear badges indicating "Sudah Diunggah" vs "Belum Diunggah" for each document type.
   - Click "Upload Baru", select subject from dropdown, upload a file, and confirm `mapel` and `kelas` are stored in `bank_dokumen`.

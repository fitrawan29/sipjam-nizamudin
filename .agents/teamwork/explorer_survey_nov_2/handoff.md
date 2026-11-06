# HANDOFF REPORT — SURVEY REQUIREMENTS R3 & R5
**Agent**: `explorer_survey_nov_2`  
**Date**: 2026-11-06T22:38:00Z  
**Scope**: Codebase survey for Requirements R3 (Buku Nilai Mapel cascading selection) and R5 (System Backup & Restore ZIP Package).

---

## 1. Observation

### 1.1 Requirement R3: Buku Nilai Mapel (Asesmen dan Rapor)

#### A. Component Location & Mounting
- **Component File**: `src/components/GradebookView.tsx` (5,133 lines).
- **Mount Point**: `src/components/AppScreen.tsx`, lines 1147–1154:
  ```tsx
  {currentView === 'view-gradebook' && (
    <GradebookView
      user={user}
      initialTab={urlTab === 'rapor' ? 'rapor' : 'gradebook'}
      assignedKelas={assignedKelas}
      isKepalaSekolah={isKepalaSekolah}
    />
  )}
  ```
- **Navigation Wiring**: `src/lib/navigation.ts` lines 145 & 170 (`id: 'view-gradebook'`, label: `'Asesmen & Rapor Sekolah'` for Admin, `'Asesmen & Rapor'` for Guru).
- **Sub-Tabs inside GradebookView**:
  - `gradebook`: "Buku Nilai Mapel" (Kurikulum Merdeka TP matrix, Formatif & Sumatif assessments, bobot calculation, rekap rapor).
  - `rapor`: "Rapor Kelas Binaan" (Wali Kelas view, rendered via `src/components/RaporView.tsx`).

#### B. Current State of Dropdown Selection & Ordering
- In `src/components/GradebookView.tsx`, lines 2698–2811, the filter controls are laid out horizontally:
  1. **Guru Pengampu** (Lines 2700–2726):
     - Admin mode: `<select value={selectedGuru} onChange={e => handleSelectGuru(e.target.value)}>` listing `teachersList`.
     - Non-admin (Guru): read-only badge showing `user?.nama || 'Guru Terpilih'`.
  2. **Mata Pelajaran** (Lines 2728–2748): `<select value={selectedMapel} onChange={e => handleSelectMapel(e.target.value)}>` listing `uniqueMapelList`.
  3. **Kelas** (Lines 2750–2770): `<select value={selectedKelas} onChange={e => handleSelectKelas(e.target.value)}>` listing `kelasList`.
  4. **Semester** (Lines 2772–2785): Semester Ganjil / Genap.
  5. **Tahun Ajaran** (Lines 2787–2810): Academic year selector.

#### C. Observed Flaws & Gaps in Current Selection Flow
1. **Auto-selection on initial load (Bypasses required initial Guru selection)**:
   - Line 963 in `GradebookView.tsx`:
     ```tsx
     const initialGuru = selectedGuru || (isAdmin ? (teachers[0]?.nama_guru || '') : (user?.nama || ''));
     if (!selectedGuru && initialGuru) {
       setSelectedGuru(initialGuru);
     }
     ```
   - For Admin, the system automatically defaults to `teachers[0]`, immediately running queries for that teacher's first subject and first class.
   - The `<select>` element (lines 2706–2715) lacks an unselected option (`-- Pilih Guru Pengampu --`).
2. **Subject & Class Preference Carryover**:
   - In `handleSelectGuru(newGuru)` (line 440), when Admin changes teacher, `selectedMapel` and `selectedKelas` are passed to `syncTeacherAssignments` as `prefMapel` and `prefKelas`. If the new teacher teaches the same subject name, it attempts to retain the previous class or falls back.
3. **Class Fallback Leaking Irrelevant Grade Levels (Violation of Requirement R3)**:
   - In `syncTeacherAssignments` (lines 389–403):
     ```tsx
     const matchingClasses = Array.from(new Set(
       formattedMapels
         .filter(m => !activeMapel || m.nama_mapel === activeMapel)
         .map(m => m.kelas)
         .filter(Boolean) as string[]
     )).sort();

     let targetClasses = matchingClasses;
     if (targetClasses.length === 0) {
       const allTeacherClasses = Array.from(new Set(
         formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
       )).sort();
       targetClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
     }
     ```
   - If `matchingClasses.length === 0`, `targetClasses` falls back to `allTeacherClasses`, and if that is empty, it falls back to `fallbackClasses` (`masterClassesList`), which contains **ALL classes in the school** (X, XI, XII).
   - In `handleSelectMapel` (lines 471–475):
     ```tsx
     const targetClasses = matchingClasses.length > 0
       ? matchingClasses
       : (mapelList.some(m => m.kelas)
           ? Array.from(new Set(mapelList.map(m => m.kelas).filter(Boolean) as string[])).sort()
           : masterClassesList);
     ```
   - If a subject belongs to class XI (e.g., "XI Matematika Tingkat Lanjut" or `data_mapel.kategori === 'XI'`), but has no explicit class assigned in `guru_mapel`, the dropdown currently shows all classes across all grade levels instead of strictly showing class XI options.
4. **Existing Safeguards Preserved**:
   - `handleSelectGuru`, `handleSelectMapel`, and `handleSelectKelas` already check `dirtyGrades` and display `window.confirm('Terdapat perubahan nilai yang belum disimpan...')`.
   - Browser tab close / unload protection is active via `beforeunload` (lines 428–437).

#### D. Database Tables Supplying the Relation for R3
- `data_guru` (`id`, `user_id`, `nama_guru`, `nip`, `mata_pelajaran`).
- `guru_mapel` (`id`, `sekolah_id`, `guru_id`, `nip`, `nama_guru`, `mapel_id`, `nama_mapel`, `mapel_singkat`, `kelas`).
- `jadwal_pelajaran` (`id`, `sekolah_id`, `user_id`, `nama_guru`, `mata_pelajaran`, `kelas`).
- `data_mapel` (`id`, `sekolah_id`, `nama_mata_pelajaran`, `kategori`, `kelompok`).
- `data_kelas` / `data_siswa` (`nama_kelas`, `tingkat` / `kelas`).
- `parseTingkat(nama)` helper in `src/components/AdminKelasView.tsx` (lines 53–59) parses `'10' | '11' | '12' | 'Lainnya'`.

---

### 1.2 Requirement R5: Penyesuaian Pencadangan Data Sistem (System Backup)

#### A. Component Location & Invariants
- **Component File**: `src/components/AdminBackupView.tsx` (274 lines).
- **Mount Points**:
  - `src/components/AdminConfigView.tsx`, lines 603–606 (Tab 5 "backup"):
    ```tsx
    <div className={activeTab === 'backup' ? 'block' : 'hidden'}>
      <AdminBackupView user={user} />
    </div>
    ```
  - `src/components/AppScreen.tsx`, line 1330 (`currentView === 'view-admin-backup'`).
- **Strict Invariant**: Enforced by `tests/menu_consolidation_feature_recovery.test.ts` line 724:
  `adminBackupContent.includes('<div id="view-admin-backup" className="space-y-4 fade-in">')` must not be altered or nested under `<section className="view-section">`.

#### B. Current Implementation Analysis (Flaws & Deficiencies)
1. **Google Sheets Webhook Dependency**:
   - Line 12: `const webhookUrl = process.env.NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL;`
   - If not set, backup and restore abort with: `"Webhook URL belum dikonfigurasi di .env.local"`.
2. **Narrow Table Scope (Only 2 of 33 Tables)**:
   - Line 70–71:
     ```tsx
     const presensi = await fetchAllData("presensi_guru");
     const jurnal = await fetchAllData("jurnal_pembelajaran");
     ```
   - Only `presensi_guru` and `jurnal_pembelajaran` are processed. The remaining 31 core tables (`data_guru`, `data_siswa`, `data_mapel`, `jadwal_pelajaran`, `wali_kelas`, `nilai_siswa`, `capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `absensi`, `presensi_siswa`, `sekolah`, `users`, `pengaturan`, etc.) are completely omitted.
3. **Destructive Purge on Backup**:
   - Lines 110–111:
     ```tsx
     await deleteInChunks("presensi_guru", presensi);
     await deleteInChunks("jurnal_pembelajaran", jurnal);
     ```
   - Running backup immediately deletes data from the database.
4. **No ZIP File Generated**:
   - Generates no local file for download.
5. **No Photos / Assets Handled**:
   - No photos (avatars, camera selfies, leave certificates, journal evidence photos, school logos) are exported.
6. **Existing Restore Logic**:
   - Lines 153–184: Fetches from `webhookUrl`, filters `r.Tabel === 'presensi_guru'` and `r.Tabel === 'jurnal_pembelajaran'`, and calls `supabase.from(...).upsert(..., { ignoreDuplicates: true })`.

#### C. Database Schema Inventory (All 33 Tables for Full Backup)
From `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` and `src/types/database.ts`:
1. `sekolah` (School profile, tenant configuration, logo URLs)
2. `users` (User credentials, roles, session tokens, avatars)
3. `data_guru` (Teacher master records)
4. `data_mapel` (Subject master records)
5. `data_siswa` (Student master records)
6. `data_kelas` (Class records, optional table)
7. `guru_mapel` (Teacher-subject-class relational assignments)
8. `wali_kelas` (Homeroom teacher assignments)
9. `jadwal_pelajaran` (Schedule timetable)
10. `jadwal_piket` (Piket timetable)
11. `penugasan_piket` (Piket assignments per date)
12. `piket_form_lock` (Piket concurrency lease lock)
13. `laporan_piket` (Piket reports with photos)
14. `presensi_guru` (Teacher attendance, selfies, coordinates, verification status)
15. `jurnal_pembelajaran` (Teaching journals with documentation photos)
16. `absensi` (Daily student attendance records)
17. `presensi_siswa` (Student QR gate attendance)
18. `capaian_pembelajaran` (CP Kurikulum Merdeka)
19. `tujuan_pembelajaran` (TP Kurikulum Merdeka)
20. `asesmen_kolom` (Assessment columns per TP)
21. `nilai_siswa` (Student grades)
22. `kalender_pendidikan` (School calendar events)
23. `bank_dokumen` (Document repository)
24. `pengaturan` (System configuration key-values)
25. `pengumuman` (Broadcast announcements)
26. `pengumuman_dibaca` (Announcement read receipts)
27. `pengumuman_tanggapan` (Announcement responses)
28. `chat_messages` (Direct communications)
29. `push_subscriptions` (Web Push credentials)
30. `sistem_blok` (Block system schedules)
31. `syarat_perangkat_pembelajaran` (Teaching device requirements)
32. `riwayat_backup` (Backup execution audit log)
33. `sekolah_registry` (Centralized school registry)

#### D. Photo & Asset Storage Formats
1. **Base64 Data URLs**:
   - `users.avatar`: Profile pictures stored as `data:image/jpeg;base64,...` or `data:image/png;base64,...` (max 1MB).
   - `sekolah.logo_url`, `logo_kiri_url`, `logo_kanan_url`: School crest / logos.
2. **External Hosted / Google Drive URLs**:
   - `presensi_guru.link_bukti` / `foto`: Live selfie camera URLs (GAS Google Drive or CDN).
   - `jurnal_pembelajaran.foto_kegiatan`, `link_bukti_foto`: KBM documentation images.
   - `laporan_piket.link_foto`: Piket duty photos.
   - `bank_dokumen.file_url`: Uploaded document URLs.

---

## 2. Logic Chain

### 2.1 R3 Logic Chain: From Observations to Cascading Implementation

1. **Premise**: Requirement R3 mandates that selection starts with choosing the teacher first, and dropdowns for subjects and classes must cascade strictly based on that teacher's assignment. Specifically, if a subject belongs to class XI, only class XI options are shown.
2. **Observation**: In `GradebookView.tsx`, `selectedGuru` is automatically set to `teachers[0]?.nama_guru` on mount for Admin, and there is no prompt or placeholder (`-- Pilih Guru Pengampu --`).
3. **Observation**: When `matchingClasses` is empty for a subject, the code currently falls back to `masterClassesList` (all classes across all grade levels), leaking classes from grades X and XII into grade XI subjects.
4. **Deduction**:
   - For Admin, `selectedGuru` must default to `""` initially.
   - When `selectedGuru === ""`, Mapel and Kelas selects must be disabled or show "Pilih guru pengampu terlebih dahulu", and the gradebook table should display an empty state instructing the user to select a teacher.
   - Once a teacher is chosen, the Mapel dropdown is populated with `distinctMapels` for that teacher.
   - When a subject is chosen, classes must be populated strictly from the teacher's assignments for that subject (`a.nama_mapel === selectedMapel`).
   - If the subject is associated with a specific grade level (e.g. `parseTingkat(selectedMapel)` or `data_mapel.kategori` is `'11'` or `'XI'`), any class fallback must be filtered strictly by `parseTingkat(kelas) === tingkat` (e.g. only classes matching grade 11).
   - When switching teachers, `selectedMapel` and `selectedKelas` must reset cleanly to prevent orphaned state and invalid grade fetching.

### 2.2 R5 Logic Chain: From Observations to ZIP Backup & Restore

1. **Premise**: Requirement R5 states that backup must package ALL application data into a single ZIP archive containing:
   - `data/`: JSON files for all database entities.
   - `foto/`: Stored photos/images/assets.
   - Format must be compatible and readable by the system for restoration.
2. **Observation**: Current `AdminBackupView.tsx` only handles 2 tables, deletes rows on backup, uses an external webhook, generates no file, and handles no photos.
3. **Observation**: Node.js standard environment lacks native `.zip` directory packaging without `zlib` raw deflating or an archive library. `jszip` is a standard, lightweight, dependency-free JS library that runs in both browser and Node.js environments.
4. **Deduction for Backup Generation**:
   - The backup process must query all 33 tables scoped by `sekolah_id` (using pagination chunks of 1000 rows to bypass PostgREST limit).
   - In the ZIP archive:
     - `data/<table_name>.json`: Pretty-printed JSON array for each table.
     - `foto/avatars/<user_id>.jpg` / `foto/sekolah/...`: Decoded binary image files extracted from base64 data URLs.
     - `manifest.json`: Root metadata containing backup version, timestamp, school tenant details, table row counts, and asset mappings.
   - After packaging, trigger a browser download of `backup_sipjam_<sekolah>_<timestamp>.zip`.
   - Record the operation in `riwayat_backup`.
5. **Deduction for Restore**:
   - System must provide an upload input accepting `.zip`.
   - The restore flow reads `manifest.json`, validates school tenant and schema version.
   - **Crucial Dependency Ordering (Topological Order)** to prevent Foreign Key constraint violations:
     - Level 0: `sekolah`, `pengaturan`, `kalender_pendidikan`, `sistem_blok`, `syarat_perangkat_pembelajaran`, `pengumuman`.
     - Level 1: `users`, `data_mapel`, `data_kelas`, `jadwal_piket`, `bank_dokumen`, `riwayat_backup`, `chat_messages`, `push_subscriptions`, `piket_form_lock`.
     - Level 2: `data_guru`, `data_siswa`, `capaian_pembelajaran`, `pengumuman_dibaca`, `pengumuman_tanggapan`.
     - Level 3: `wali_kelas`, `penugasan_piket`, `guru_mapel`, `jadwal_pelajaran`, `laporan_piket`, `presensi_guru`, `jurnal_pembelajaran`, `absensi`, `presensi_siswa`, `tujuan_pembelajaran`.
     - Level 4: `asesmen_kolom`.
     - Level 5: `nilai_siswa`.
   - Each table is restored using batch upserts (`supabase.from(table).upsert(chunk, { ignoreDuplicates: false })`).
   - Photos from `foto/` are re-attached to their respective entity records (e.g. updating `users.avatar`).

---

## 3. Caveats

1. **Existing Unit Test Invariants**:
   - `tests/gradebook_teacher_filter_ponytail.test.ts` asserts:
     - `code.includes('export function isTeacherMatch')`
     - `code.includes('export function isAssignmentMatchTeacher')`
     - `code.includes('onChange={e => handleSelectGuru(e.target.value)}')`
     - `code.includes('Tidak ada mapel ditugaskan')`
     - `code.includes('Tidak ada kelas ditugaskan')`
   - `tests/menu_consolidation_feature_recovery.test.ts` asserts:
     - `adminBackupContent.includes('<div id="view-admin-backup" className="space-y-4 fade-in">')`
     - `!adminBackupContent.includes('<section className="view-section"')`
   - Any refactoring must strictly preserve these exact code patterns to prevent breaking existing regression suites.
2. **External Photo URLs vs Base64**:
   - Avatars and school logos are stored as Base64 Data URLs, which can be extracted directly into binary files in `foto/`.
   - Some selfies in `presensi_guru` and `jurnal_pembelajaran` point to Google Drive URLs. In browser environments, downloading remote Google Drive links directly via client-side `fetch()` may face CORS limitations. The backup manifest should record the remote URL mapping, and for reachable/base64 assets, package them into `foto/`.
3. **Large Database Payloads**:
   - Schools with thousands of attendance records and journals will produce large payloads. Supabase limits single PostgREST queries to 1000 rows. Both backup export and restore must use pagination / chunking (e.g. 500–1000 rows per batch).

---

## 4. Conclusion

1. **R3 (Buku Nilai Mapel)**:
   - Current implementation in `src/components/GradebookView.tsx` already has the basic building blocks (`isTeacherMatch`, `isAssignmentMatchTeacher`, `syncTeacherAssignments`), but fails the new requirement in two key areas:
     1. Admin is not forced to select a teacher first (it auto-selects the first teacher on load).
     2. Class filtering falls back to all school classes (`masterClassesList`), leaking classes from other grade levels when a subject belongs to a specific level (e.g. class XI).
   - Fix:
     - Default `selectedGuru` to `""` for Admin on mount.
     - Add `-- Pilih Guru Pengampu --` as the initial unselected option.
     - Disable Mapel and Kelas dropdowns when no teacher is selected.
     - Scope class dropdown strictly to the chosen teacher + chosen subject, and enforce grade level (tingkat) filtering using `parseTingkat` so grade XI subjects only show grade XI classes.
     - Reset dependent state on teacher change to avoid race conditions and dirty grade collisions.

2. **R5 (System Backup & Restore)**:
   - Existing `src/components/AdminBackupView.tsx` is completely inadequate: it targets only 2 tables, deletes rows upon backup, requires a Google Sheets webhook, produces no ZIP file, and handles no photos.
   - Fix:
     - Upgrade `AdminBackupView.tsx` to support full system ZIP backup and restore.
     - Package all 33 database entities into `data/<table_name>.json`.
     - Extract stored photos (avatars, logos, evidence) into `foto/`.
     - Include a structured `manifest.json`.
     - Implement full ZIP file upload and topological restore with foreign key ordering.
     - Maintain the required root DOM tag `<div id="view-admin-backup" className="space-y-4 fade-in">`.

---

## 5. Verification Method

To independently verify these survey findings and test proposed changes:

1. **Gradebook Teacher Filter Verification**:
   ```powershell
   npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
   ```
   *Expected*: All 17 checks pass.

2. **DOM & Invariant Verification**:
   ```powershell
   npx tsx tests/menu_consolidation_feature_recovery.test.ts
   ```
   *Expected*: Check 6.4 passes for `AdminBackupView.tsx`.

3. **Verify Gradebook View Code**:
   Inspect `src/components/GradebookView.tsx` at:
   - Lines 328–411 (`syncTeacherAssignments`)
   - Lines 440–493 (`handleSelectGuru`, `handleSelectMapel`, `handleSelectKelas`)
   - Lines 960–978 (Initial teacher resolution on load)
   - Lines 2698–2811 (Filter controls render)

4. **Verify Backup View Code**:
   Inspect `src/components/AdminBackupView.tsx` at:
   - Lines 54–73 (`fetchAllData` only targeting `presensi_guru` and `jurnal_pembelajaran`)
   - Lines 110–111 (`deleteInChunks` destructive purge)
   - Lines 136–189 (`handleRestore` webhook-only restore)

5. **New Test Suite Creation (Recommended for Builder)**:
   - Create `tests/survey_r3_gradebook_cascade.test.ts` to verify:
     - Admin requires selecting Guru first (`selectedGuru === ''` renders placeholder and disables Mapel/Kelas).
     - Selecting Guru cascades Mapel dynamically.
     - Selecting Mapel cascades Kelas strictly to classes of that subject and grade level (e.g. XI Mapel only shows XI classes).
   - Create `tests/survey_r5_backup_zip.test.ts` to verify:
     - ZIP structure has `data/`, `foto/`, and `manifest.json`.
     - JSON data covers all system tables.
     - Restore parses ZIP and validates topological dependency order.

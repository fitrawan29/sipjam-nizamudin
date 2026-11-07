# Project: SIPJAM — Penyesuaian Produksi Role Admin & Zero Regression

## Architecture
- **Stack**: Next.js 16 (App Router with Turbopack), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL, JSZip.
- **Module Boundaries**:
  1. **Pusat Verifikasi Data & Laporan (`src/components/AdminVerifView.tsx`, `AdminRekapView.tsx`, `DokumenView.tsx`, `RekapJurnalView.tsx`, `src/lib/attendanceAlpa.ts`)**:
     - Presensi & Jurnal Verification: Integrated holiday detection via `kalender_pendidikan` and 5-day week configuration; multi-day excused leave detection (`Izin`, `Sakit`); non-delinquency holiday handling.
     - Document Printing: Clear printing of `Izin` and `Sakit` statuses; exclusion of `Libur` rows from print outputs.
     - Perangkat Pembelajaran: Fuzzy/tokenized teacher matching and Class X subject resolution, removing the generic `'Mata Pelajaran Umum'` fallback.
     - Laporan & Analitik Kerja: Clean removal of duplicate Sub-Tab 3 (`Cetak Dokumen Resmi`) with transparent route fallback to `'tabel'`, updating onboarding tutorials and assertions.
     - Pre-existing compilation fixes: Relocating `isRealSubmittedJournal` outside component in `AdminVerifView.tsx` and correcting `jurnalColor` type in `HomeViewAdmin.tsx`.
  2. **Asesmen & Rapor — Buku Nilai Mapel (`src/components/GradebookView.tsx`)**:
     - Selection Flow: Enforces starting with teacher selection (`-- Pilih Guru Pengampu --`) for Admin mode.
     - Cascading Filters: Selected Guru dynamically populates assigned Mapel. Selected Mapel dynamically filters assigned Kelas strictly by subject and grade level (`parseTingkat`), preventing class leakage across grade levels.
     - State Sanitization: Resets downstream selections on teacher change with dirty-grade confirmation preservation.
  3. **Master Data (`src/components/AdminDataView.tsx`, `AdminKelasView.tsx`, `src/lib/dataIntegrityGuard.ts`)**:
     - Navigation & Workflow: Preserves exact tab sequence (Siswa -> Kelas -> Mapel -> Guru -> Jadwal -> Wali Kelas -> Pengguna -> Kalender -> Periode Blok) and introduces an interactive visual workflow stepper.
     - Pre-Upload Relational Validation: Validates cross-table prerequisites (Kelas for Siswa; Guru, Mapel, Kelas for Jadwal; Guru, Kelas for Wali Kelas) before bulk upsert.
     - Database Schema Template Alignment: Validates and harmonizes all 7 templates with database schema.
     - Upload Progress Bar: Real-time visual progress indicator emitting percentages and descriptive stages.
     - Specific Diagnostic Errors: Translates PostgreSQL error codes (23503, 23502, 23505) and validation errors to exact row numbers, columns, and remediation advice.
  4. **Pencadangan & Pemulihan Sistem (`src/components/AdminBackupView.tsx`)**:
     - System Backup: Packages all 33 database entities into structured JSON under `data/<table_name>.json`, extracts binary photos/assets into `foto/`, and includes `manifest.json` in a single downloadable ZIP archive without external webhook dependencies or destructive row deletions.
     - System Restore: Unpacks backup ZIP, validates manifest, and executes topological multi-level upserts (Levels 0 through 5) to respect foreign key constraints and restore photos/assets cleanly.
     - Root DOM Invariant: Preserves `<div id="view-admin-backup" className="space-y-4 fade-in">`.
  5. **Verification & Zero Regression (`tests/`)**:
     - Dedicated verification test suites for all 6 requirements.
     - Full automated test suite (`npm test`), static type check (`npx tsc --noEmit`), and production build (`npm run build`).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Akomodasi Status Libur, Izin, Sakit pada Verifikasi Presensi & Jurnal | Membaca status libur (kalender & weekend), izin, dan sakit pada validasi verifikasi presensi dan jurnal tanpa menandai alpa/belum presensi | M1 | R1 | DONE |
| 2 | F2: Akurasi Status Cetak Dokumen Presensi & Jurnal | Mencantumkan izin dan sakit pada cetak dokumen serta mengecualikan keterangan libur dari hasil cetak | M1 | R1 | DONE |
| 3 | F3: Spesifikasi Mapel Kelas X pada Verifikasi Perangkat | Menampilkan nama mata pelajaran spesifik kelas X pada verifikasi perangkat pembelajaran tanpa fallback 'Mata Pelajaran Umum' | M1 | R1 | DONE |
| 4 | F4: Penghapusan Sub Menu Cetak Dokumen Resmi pada Laporan & Analitik | Menghilangkan sub menu cetak dokumen resmi dari navigasi dan routing Laporan & Analitik Kinerja dengan fallback transparan ke tabel | M1 | R2 | DONE |
| 5 | F5: Alur Filter Bertingkat Buku Nilai Mapel (Guru -> Mapel -> Kelas) | Mengharuskan pemilihan guru pengampu terlebih dahulu, diikuti penyesuaian berjenjang mapel dan kelas terfilter spesifik tingkat kelas | M2 | R3 | DONE |
| 6 | F6: Urutan Navigasi & Panduan Alur Master Data | Menata urutan navigasi master data (Siswa s/d Periode Blok) dan menambahkan visual workflow stepper panduan alur | M3 | R4 | DONE |
| 7 | F7: Penyelarasan Template Master Data & Validasi Dependensi Upload | Memastikan template sesuai skema DB dan memvalidasi keberadaan data prasyarat relasional saat proses upload | M3 | R4 | DONE |
| 8 | F8: Visualisasi Progress Bar & Error Handling Spesifik Master Data | Menampilkan progress bar interaktif saat upload berlangsung dan menyajikan rincian error spesifik (nomor baris, kolom, saran) | M3 | R4 | DONE |
| 9 | F9: Pencadangan Sistem Komprehensif Berkas ZIP (Data JSON + Foto) | Mencadangkan seluruh 33 entitas database dalam folder data JSON dan folder foto dalam satu arsip ZIP mandiri | M4 | R5 | PLANNED |
| 10 | F10: Pemulihan Sistem Berkas ZIP Terstruktur (Topological Restore) | Membaca ulang berkas cadangan ZIP dan memulihkan seluruh data secara kompatibel dengan urutan dependensi foreign key | M4 | R5 | PLANNED |
| 11 | F11: Dedicated Automated Verification Suites & Zero Regression Gate | Membuat test suite baru dan memverifikasi npm test (60+ file test), npx tsc --noEmit, serta npm run build lulus tanpa regresi | M5 | R6 | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Penyesuaian Pusat Verifikasi Data & Laporan Analitik | `AdminVerifView.tsx`, `AdminRekapView.tsx`, `DokumenView.tsx`, `RekapJurnalView.tsx`, `attendanceAlpa.ts`, `HomeViewAdmin.tsx`, `tutorialSteps.ts` | none | DONE |
| M2 | Penyesuaian Asesmen & Rapor (Buku Nilai Mapel Cascading) | `src/components/GradebookView.tsx` | none | DONE |
| M3 | Penyesuaian Master Data (Stepper, Dependensi, Progress, Error) | `src/components/AdminDataView.tsx`, `src/lib/dataIntegrityGuard.ts`, `AdminKelasView.tsx` | none | DONE |
| M4 | Penyesuaian Pencadangan & Pemulihan Sistem Berkas ZIP | `src/components/AdminBackupView.tsx` | none | PLANNED |
| M5 | Verifikasi Otomatis Komprehensif & Zero Regression Gate | `tests/`, `npm test`, `npx tsc --noEmit`, `npm run build` | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### AdminVerifView & RekapJurnalView ↔ Kalender & Leave Data
- `kalender_pendidikan`: Scoped by `sekolah_id` (or universal null).
- Holiday check: `isHoliday(dateStr, hariSekolah, liburMap): boolean`.
- Leave check: Queries `presensi_guru` matching `(status_verifikasi IN ('Disetujui', 'Diverifikasi') AND (jenis_presensi IN ('Izin', 'Sakit') OR detail_izin ILIKE '%sakit%'))` within date window.
- Holiday display: Banner indicating "Hari Libur: [keterangan]" without flagging unsubmitted teachers.

### DokumenView ↔ data_mapel & jadwal_pelajaran
- Class X Subject Matching:
  - Resolves teacher names via tokenized/fuzzy match (`Ade` -> `Ade Fitrawan Ibrahim`).
  - Matches `jadwal_pelajaran` rows where `kelas ILIKE 'X %'`.
  - Maps to specific subject names (`Matematika`, `Fisika`, `Informatika`, etc.) rather than `'Mata Pelajaran Umum'`.

### GradebookView Selection State Contract
- Initial State: `selectedGuru = ''` for admin mode; Mapel and Kelas selects disabled with placeholder prompt.
- Cascading Handlers:
  - `handleSelectGuru(guruName)`: Resets `selectedMapel = ''` and `selectedKelas = ''`, queries subjects assigned to `guruName`.
  - `handleSelectMapel(mapelName)`: Resets `selectedKelas = ''`, resolves classes assigned for `(guruName, mapelName)`.
  - Class filtering: Evaluates `parseTingkat(mapelName)` or `mapel.kategori` — if Class XI, only classes where `parseTingkat(kelas) === '11'` are selectable.

### AdminDataView ↔ dataIntegrityGuard (Master Data Upload)
- Function signature:
  ```ts
  importMasterDataFromCsv(
    supabase: any,
    csvText: string,
    tableName: string,
    user?: any,
    onProgress?: (progress: {
      stage: string;
      percentage: number;
      currentBatch: number;
      totalBatches: number;
      processedRows: number;
      totalRows: number;
    }) => void
  ): Promise<{ count: number; rows: any[] }>
  ```
- Dependency validation order:
  - `data_siswa`: Checks that student's `kelas` exists in `data_kelas` or `wali_kelas`.
  - `jadwal_pelajaran`: Checks that `nama_guru` exists in `data_guru`, `mata_pelajaran` exists in `data_mapel`, and `kelas` exists in `data_kelas`.
  - `wali_kelas`: Checks that `nama_guru` exists in `data_guru` and `kelas` exists in `data_kelas`.
- Error reporting: Throws structured error with `{ row: number, column: string, message: string, code: string }`.

### AdminBackupView ZIP Package Contract
- Archive file: `backup_sipjam_<sekolah>_<timestamp>.zip`
- Folder structure:
  - `manifest.json`: `{ version: "2.0", timestamp: string, sekolah_id: string, tableCounts: Record<string, number>, assetCount: number }`
  - `data/`: Contains `<table_name>.json` for all 33 tables.
  - `foto/`: Contains binary asset files (e.g. `foto/avatars/<user_id>.jpg`, `foto/sekolah/<logo_name>.png`, etc.).
- Restore mechanism:
  - Reads `manifest.json`.
  - Restores tables in topological order (Level 0 through Level 5) via batch upserts.
  - Restores photos to database records and storage buckets.

## Code Layout
- `src/components/AdminVerifView.tsx`: Verification center for presence, journals, devices.
- `src/components/AdminRekapView.tsx`: Attendance & performance reports and print views.
- `src/components/RekapJurnalView.tsx`: Journal recap and print views.
- `src/components/DokumenView.tsx`: Learning device verification matrix and cards.
- `src/components/GradebookView.tsx`: Subject gradebook and Merdeka assessment matrix.
- `src/components/AdminDataView.tsx`: Master data management, tabs, and CSV import UI.
- `src/lib/dataIntegrityGuard.ts`: Master data CSV validation, dependency checks, and upserts.
- `src/components/AdminBackupView.tsx`: System backup and restore ZIP utility.
- `src/components/HomeViewAdmin.tsx`: Admin dashboard overview.
- `tests/`: Automated test suites and regression test runner.

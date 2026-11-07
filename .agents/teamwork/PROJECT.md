# Project: SIPJAM — Penyesuaian & Perbaikan Role Admin Lingkungan Produksi (R1–R5)

## Architecture
- **Framework**: Next.js 16 (App Router, `'use client'`), React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase (PostgreSQL + RLS).
- **Executive & Operational Dashboard Layer**:
  - `src/components/HomeViewAdmin.tsx`: Operational dashboard for Administrator, greeting card, quick links, active statistics.
  - `src/components/AdminRekapView.tsx`: Executive analytics, teacher presence compilation, multi-mode filter, and print layout.
- **Verification & Workflow Alignment Layer**:
  - `src/components/AdminVerifView.tsx`: Verification center for Presensi, Jurnal, Piket, and Perangkat Ajar.
  - `src/components/PiketView.tsx`: Teacher piket schedules and activity reporting.
  - `src/components/DokumenView.tsx`: Teaching devices / RPP / modul ajar matrix by subject and grade level.
  - `src/components/GuruPresensi.tsx` & `src/lib/attendanceAlpa.ts` & `src/components/RekapJurnalView.tsx`: Teacher attendance workflow and automated KBM journal synchronization.
- **Assessment & Raport Layer**:
  - `src/components/GradebookView.tsx` & `src/components/RaporView.tsx`: Academic gradebook, active semester/year synchronization, and dynamic meeting attendance point weights.
- **Master Data, System Config, & Account Layer**:
  - `src/components/AdminDataView.tsx`: Master data CSV templates, parsing, and database insertion guards.
  - `src/components/AdminConfigView.tsx`: System parameters, school profile, working hours, and multi-tab configuration persistence.
  - `src/components/AccountSettingsModal.tsx`: User profile editing, credentials, and identity configuration.

- **System Backup, Restore, & Storage Layer**:
  - `src/components/AdminBackupView.tsx`: System full backup & restore engine, multi-table JSON serialization, binary photo asset bundling, ZIP compression, topological restoration.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: Eliminasi Duplikasi Nama Sekolah Dashboard Admin | Perbaiki teks admin [nama sekolah] di `HomeViewAdmin.tsx` | M1 | R1 | DONE |
| 2 | R1: Eliminasi Pusat Informasi dari Dashboard Operasional | Hapus seksi kartu 'Pusat Informasi' dari `HomeViewAdmin.tsx` | M1 | R1 | DONE |
| 3 | R3: Deduplikasi & Normalisasi Guru "Ade Fitrawan Ibrahim" | Deduplikasi entri di `AdminRekapView.tsx` | M1 | R3 | DONE |
| 4 | R2: Eliminasi SOP Disiplin & Pedoman SIPJAM | Hapus tombol Pedoman Kebijakan & SOP dari `AdminVerifView.tsx` | M2 | R2 | DONE |
| 5 | R2: Urutan Riwayat Presensi Terbaru ke Terlama | Pastikan riwayat presensi terurut descending | M2 | R2 | DONE |
| 6 | R2: Label "Bebas Hadir" Guru KBM Tanpa Jadwal | Tampilkan keterangan "Bebas Hadir" | M2 | R2 | DONE |
| 7 | R2: Penegasan Status Izin Sakit & Kategori Presensi | Tampilkan badge status kategori presensi secara tegas | M2 | R2 | DONE |
| 8 | R2: Penandaan Langsung "Tidak Membuat Laporan Piket" | Guru terjadwal piket belum melapor langsung ditandai | M2 | R2 | DONE |
| 9 | R2: Pembatasan Unggah Perangkat Ajar Kelas Paralel | Batasi unggahan perangkat per mapel hanya 1x per tingkat kelas | M2 | R2 | DONE |
| 10 | R2: Otomasi Jurnal KBM Ketidakhadiran (Sakit, Izin, Dinas Luar) | Otomatis isi jurnal KBM guru berstatus tidak hadir | M2 | R2 | DONE |
| 11 | R4: Default Semester & Tahun Ajaran Aktif Admin | Tampilkan semester/tahun ajaran aktif secara default di Gradebook/Rapor | M3 | R4 | DONE |
| 12 | R4: Form Dinamis Bobot Poin Kehadiran per Pertemuan | Konfigurasi dinamis bobot poin kehadiran per pertemuan | M3 | R4 | DONE |
| 13 | R5: Pencadangan Sistem ZIP 33 Tabel Database | Cadangkan seluruh 33 tabel database dalam folder `data/<table_name>.json`, folder `foto/` untuk aset biner, dan `manifest.json` dalam ZIP tunggal (`backup_sipjam_<sekolah>_<timestamp>.zip`) | M4 | R5 | DONE |
| 14 | R5: Kompatibilitas Pemulihan (Restore) Topological Order & Foto | Format cadangan kompatibel dan dapat dibaca ulang untuk pemulihan bertahap (topological order Level 0 s/d Level 5) serta memulihkan foto/aset | M4 | R5 | DONE |
| 15 | R6: Preservasi Fitur dan Logika Eksisting (Zero Regression) | Seluruh penyesuaian tidak merusak fitur/logika eksisting aplikasi (`npm test`, `npx tsc --noEmit`, `npm run build`) | M5 | R6 | IN_PROGRESS |
| 16 | R6: Automated Test Suite Pemulihan/Pencadangan & Sistem | Test suite komprehensif di `tests/` untuk memverifikasi pencadangan/pemulihan ZIP dan integritas sistem | M5 | R6 | IN_PROGRESS |
| 17 | R6: Mandatory Git Delivery ke `main` | Eksekusi `git status`, `git add .`, `git commit -m "..."`, dan `git push origin main` sesuai `GEMINI.md` | M5 | GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dashboard Operasional & Laporan Analitik (R1, R3) | `src/components/HomeViewAdmin.tsx`, `src/components/AdminRekapView.tsx` | none | DONE |
| M2 | Pusat Verifikasi & Workflow Penyelarasan Presensi, Piket, Perangkat, & Jurnal (R2) | `src/components/AdminVerifView.tsx`, `src/components/DokumenView.tsx`, `src/components/GuruPresensi.tsx`, `src/lib/attendanceAlpa.ts`, `src/components/RekapJurnalView.tsx` | M1 | DONE |
| M3 | Asesmen, Raport, & Bobot Kehadiran Dinamis (R4) | `src/components/GradebookView.tsx`, `src/components/RaporView.tsx`, `src/components/AdminConfigView.tsx` | M1, M2 | DONE |
| M4 | Penyesuaian Pencadangan Data Sistem ZIP 33 Tabel & Restore (R5) | `src/components/AdminBackupView.tsx`, JSZip / Zip compression, storage bucket assets, topological restore engine | M1, M2, M3 | DONE |
| M5 | Automated Test Suite, Zero Regression, & Git Delivery (R6) | `tests/`, `npm test`, `npx tsc --noEmit`, `npm run build`, `git push origin main` | M1, M2, M3, M4 | IN_PROGRESS |



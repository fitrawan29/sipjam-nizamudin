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

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: Eliminasi Duplikasi Nama Sekolah Dashboard Admin | Perbaiki teks admin [nama sekolah] di `HomeViewAdmin.tsx` agar tidak terduplikasi saat `user.nama` sudah memuat nama sekolah | M1 | R1 | DONE |
| 2 | R1: Eliminasi Pusat Informasi dari Dashboard Operasional | Hapus seksi kartu 'Pusat Informasi' dari `HomeViewAdmin.tsx` | M1 | R1 | DONE |
| 3 | R3: Deduplikasi & Normalisasi Guru "Ade Fitrawan Ibrahim" | Pada tabel rekapitulasi `AdminRekapView.tsx`, gabungkan entri bergulir/gelar dan tanpa gelar menjadi satu entri tunggal tanpa gelar | M1 | R3 | DONE |
| 4 | R2: Eliminasi SOP Disiplin & Pedoman SIPJAM | Hapus tombol Pedoman Kebijakan & SOP SIPJAM dari `AdminVerifView.tsx` | M2 | R2 | DONE |
| 5 | R2: Urutan Riwayat Presensi Terbaru ke Terlama | Pastikan daftar riwayat presensi di `AdminVerifView.tsx` terurut descending berdasarkan timestamp | M2 | R2 | DONE |
| 6 | R2: Label "Bebas Hadir" Guru KBM Tanpa Jadwal | Tampilkan keterangan "Bebas Hadir" (tanpa keterangan lainnya) untuk guru wajib hadir pada jadwal KBM saat tidak ada jadwal KBM dan piket hari ini | M2 | R2 | DONE |
| 7 | R2: Penegasan Status Izin Sakit & Kategori Presensi | Tampilkan badge status kategori presensi (Sakit, Izin, Dinas Luar, Hadir di Sekolah) secara tegas dan jelas di `AdminVerifView.tsx` | M2 | R2 | DONE |
| 8 | R2: Penandaan Langsung "Tidak Membuat Laporan Piket" | Guru yang terjadwal piket namun belum melapor langsung ditandai "tidak membuat laporan piket" tanpa konfirmasi admin atau sistem | M2 | R2 | DONE |
| 9 | R2: Pembatasan Unggah Perangkat Ajar Kelas Paralel | Batasi pengunggahan perangkat pembelajaran per mata pelajaran hanya 1 kali untuk kelas paralel pada tingkat kelas yang sama di `DokumenView.tsx` | M2 | R2 | DONE |
| 10 | R2: Otomasi Jurnal KBM Ketidakhadiran (Sakit, Izin, Dinas Luar) | Otomatis isikan jurnal KBM guru berstatus Sakit, Izin, atau Dinas Luar yang memiliki jadwal KBM pada hari tersebut sesuai keterangan presensinya | M2 | R2 | DONE |
| 11 | R4: Default Semester & Tahun Ajaran Aktif Admin | Tampilkan semester dan tahun ajaran aktif secara default sesuai pengaturan admin di `GradebookView.tsx` dan `RaporView.tsx` | M3 | R4 | DONE |
| 12 | R4: Form Dinamis Bobot Poin Kehadiran per Pertemuan | Sediakan konfigurasi form dinamis bobot poin kehadiran per pertemuan (Hadir: 100, Sakit/Izin/Terlambat: 75, Alpa: 0) dan terapkan rumusnya | M3 | R4 | DONE |
| 13 | R5: Penyesuaian Template CSV Master Data & Kalender | Sesuaikan template CSV Kalender Pendidikan dan Jadwal Pelajaran dengan skema UUID Supabase agar bebas error 22P02 | M4 | R5 | DONE |
| 14 | R5: Persistensi Konfigurasi Sistem & Database Seluruh Sub Menu | Perbaiki form multi-tab di `AdminConfigView.tsx` (`noValidate`) dan sinkronisasi seluruh identitas sekolah ke tabel `sekolah` | M4 | R5 | DONE |
| 15 | R5: Eliminasi Bidang/Fitur Penambahan Gelar Pengaturan Akun | Hapus kontainer Multi-Gelar Manager dan tombol "+ Tambah Gelar" pada `AccountSettingsModal.tsx` | M4 | R5 | DONE |
| 16 | Validasi Sistem & Regression Test Suite | Buat automated regression test suite komprehensif untuk memvalidasi R1–R5 dan pastikan `npm run build` berhasil | M5 | Acceptance Criteria | IN_PROGRESS |
| 17 | Mandatory Git Delivery ke `main` | Eksekusi `git status`, `git add .`, `git commit -m "..."`, dan `git push origin main` sesuai `GEMINI.md` | M5 | GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dashboard Operasional & Laporan Analitik (R1, R3) | `src/components/HomeViewAdmin.tsx`, `src/components/AdminRekapView.tsx` | none | DONE |
| M2 | Pusat Verifikasi & Workflow Penyelarasan Presensi, Piket, Perangkat, & Jurnal (R2) | `src/components/AdminVerifView.tsx`, `src/components/DokumenView.tsx`, `src/components/GuruPresensi.tsx`, `src/lib/attendanceAlpa.ts`, `src/components/RekapJurnalView.tsx` | M1 | DONE |
| M3 | Asesmen, Raport, & Bobot Kehadiran Dinamis (R4) | `src/components/GradebookView.tsx`, `src/components/RaporView.tsx`, `src/components/AdminConfigView.tsx` | M1, M2 | DONE |
| M4 | Master Data Templates, System & DB Persistence, & Akun (R5) | `src/components/AdminDataView.tsx`, `src/lib/dataIntegrityGuard.ts`, `src/components/AdminConfigView.tsx`, `src/components/AccountSettingsModal.tsx` | M1, M2, M3 | DONE |
| M5 | Automated Regression Test Suite & Git Delivery | `tests/production_admin_adjustments.test.ts`, `npm test`, `npm run build`, `git push origin main` | M1, M2, M3, M4 | IN_PROGRESS |


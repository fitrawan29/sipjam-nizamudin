# Project: SIPJAM Hak Akses Piket, Rekap Wali Kelas, Cetak Dokumen & Download Kartu QR Siswa

## Architecture
SIPJAM is a multi-tenant school management system built on Next.js 16 (React 19) + Supabase with role-based access control (Superadmin, Admin, Guru, Wali Kelas).

### Modules & Boundaries
1. **Access Control & Routing Layer (`src/lib/workflow.ts`, `src/components/AppScreen.tsx`)**:
   - `isPiketHariIni`: Query `penugasan_piket` & `jadwal_piket` for today's WITA day. Admins have 24/7 access; teachers only have access if assigned today.
   - `isWaliKelas` & `assignedKelas`: Restricts whole-class attendance recap (`view-rekap-siswa`) strictly to assigned Wali Kelas and Admins.
   - Teacher subject attendance (`GuruJurnal.tsx`) remains independent per teaching schedule session.
2. **Attendance & Student Recap Views (`src/components/PiketView.tsx`, `src/components/RekapSiswaView.tsx`, `src/components/GuruJurnal.tsx`)**:
   - `PiketView.tsx`: Blocks non-assigned teachers with informative lock UI.
   - `RekapSiswaView.tsx`: Locks class dropdown strictly to the teacher's assigned class (`assignedKelas` / `waliKelasList`).
   - `GuruJurnal.tsx`: Preserves subject-level attendance management for subject teachers unaffected.
3. **Print Layout, Robot UI & Watermark Layer (`src/app/globals.css`, `AIAssistant.tsx`, `DokumenView.tsx`, `RekapJurnalView.tsx`, `PrintHeader.tsx`)**:
   - Robot element (`fa-robot` & chat popup in `AIAssistant.tsx`) and floating buttons hidden via `no-print print:hidden` and specific `@media print` rules.
   - School watermark (`.sipjam-print-watermark` created by `PrintHeader.tsx`) strictly preserved using `:not(.sipjam-print-watermark)` and `display: flex !important;`.
   - `DokumenView.tsx`: Complete print integration with `PrintHeader`, subheader, print table, `PrintSignature`, and `no-print` on web cards.
   - `RekapJurnalView.tsx`: Table padding standardized to `px-2 py-1.5`, header to `print:bg-gray-100`, raw GPS coords hidden with `no-print`.
4. **Student Identity & QR Card Download Layer (`src/lib/qrSiswa.ts`, `src/components/AdminDataView.tsx`)**:
   - Client-side zero-dependency HTML5 Canvas generator for student ID cards (600x960 px portrait).
   - Generates PNG download with complete student identity: Nama Lengkap, NISN, Kelas, Nama Sekolah, and sharp QR code matrix.
   - Integrated into `AdminDataView.tsx` with "Download Kartu" button per student and preview modal options.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Akses Piket Sesuai Jadwal | Cek `penugasan_piket` & `jadwal_piket` hari ini; sembunyikan menu & blokir akses non-piket; Admin/Superadmin bypass | M1 | R1 | DONE |
| 2 | Pembatasan Rekap Wali Kelas | Menu & view `RekapSiswaView` hanya untuk Wali Kelas; dropdown kelas terkunci mutlak ke kelas binaan | M1 | R2 | DONE |
| 3 | Akses Presensi Guru Mapel | Guru Mapel tetap dapat melihat & mengelola kehadiran murid di kelas/mapel binaan saat KBM (`GuruJurnal`) | M1 | R2 | DONE |
| 4 | Sembunyikan Robot & UI Melayang saat Print | Sembunyikan tombol robot AI, chat popup, floating reminder/modals saat cetak (`@media print` & `no-print`) | M2 | R3 | DONE |
| 5 | Pertahankan Watermark Sekolah | Watermark sekolah (`.sipjam-print-watermark`) tetap tercetak di background kertas dan tidak boleh disembunyikan | M2 | R3 | DONE |
| 6 | Standarisasi Format Cetak Dokumen Guru | `DokumenView` & `RekapJurnalView` disamakan strukturnya dengan standar Admin (`PrintHeader`, tabel `px-2 py-1.5`, `PrintSignature`) | M2 | R3 | DONE |
| 7 | Generator & Download Kartu QR Siswa | Download kartu presensi PNG via HTML5 Canvas (Nama, NISN, Kelas, Nama Sekolah, QR code) di `AdminDataView` | M3 | R4 | DONE |
| 8 | Verifikasi, Audit, & Git Workflow | `tsc --noEmit`, `npm run build`, unit/integration tests, Reviewer, Challenger, Forensic Auditor, Git commit & push | M4 | R1-R4, GEMINI.md | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Piket & Attendance Access Control | R1 (Akses Piket sesuai jadwal hari ini) & R2 (Rekap Wali Kelas vs Guru Mapel) | none | DONE |
| M2 | Print Layout, Hide Robot UI & Watermark | R3 (Format cetak guru identik admin, sembunyikan robot & tombol melayang, pertahankan watermark) | none | DONE |
| M3 | Download Kartu Presensi QR Siswa | R4 (Download kartu identitas QR siswa PDF/Image di AdminDataView) | none | DONE |
| M4 | Comprehensive Verification, Audit & Git Delivery | Automated test suite, `tsc --noEmit`, `npm run build`, Reviewer, Challenger, Auditor, Git commit & push | M1, M2, M3 | DONE |

---

## Code Layout
- `src/lib/workflow.ts`: Helper `getGuruDailyState` diperbarui untuk query `penugasan_piket` dan `jadwal_piket` hari ini.
- `src/components/AppScreen.tsx`: State `isPiketHariIni`, pembatasan menu `view-piket` & `view-rekap-siswa`, guard navigasi, passing `assignedKelas`.
- `src/components/PiketView.tsx`: UI akses terblokir untuk guru yang tidak bertugas hari ini.
- `src/components/RekapSiswaView.tsx`: Guard akses untuk non-wali-kelas, dropdown kelas terkunci mutlak ke kelas binaan.
- `src/components/GuruJurnal.tsx`: Verifikasi presensi mapel tetap berfungsi penuh.
- `src/app/globals.css`: Selektor `@media print` untuk sembunyikan robot, tombol fixed, dengan pengecualian `:not(.sipjam-print-watermark)`.
- `src/components/AIAssistant/AIAssistant.tsx`: Penambahan `no-print print:hidden` pada button & modal dialog.
- `src/components/DokumenView.tsx`: Penambahan `PrintHeader`, subheader cetak, print table matriks perangkat, `PrintSignature`, dan `no-print` pada web cards.
- `src/components/RekapJurnalView.tsx`: Standardisasi padding sel tabel (`px-2 py-1.5`), header bg, hide raw GPS geotag, signature wali kelas.
- `src/lib/qrSiswa.ts`: Penambahan helper `downloadStudentCardPng`, `generateStudentCardCanvas`, `printStudentQrCardWithSchool`.
- `src/components/AdminDataView.tsx`: Tombol "Download Kartu" per siswa, modal preview dengan opsi download & print, batch print/download.
- `tests/adversarial_piket_wali_challenger_1.test.ts`: Uji empiris hak akses piket dan rekap wali kelas (42 tests).
- `tests/adversarial_r3_r4_challenger_2.test.ts`: Uji empiris CSS print, watermark, dan generator kartu siswa (102 tests).

---

## Interface Contracts
### `isPiketHariIni` Contract
- Input: `user: User`, `day: DayName` (WITA)
- Check 1: `penugasan_piket` where `tipe_petugas = 'Guru'` AND `hari = day` AND (`guru_id = user.id` OR `guru_nama = user.nama` OR `guru_nip = user.nip`)
- Check 2: `jadwal_piket` where `hari = day` AND `daftar_guru` contains `user.nama`
- Bypass: `user.role === 'admin' || user.role === 'superadmin'` -> always `true`

### `isWaliKelas` & `assignedKelas` Contract
- In `RekapSiswaView`:
  - If `!isAdmin`: `select` dropdown disabled or restricted strictly to `[assignedKelas, ...waliKelasList.map(w => w.kelas)]`.
  - Class query in `tarikRekap` clamped to assigned class.
- In `GuruJurnal`:
  - Attendance query for current class/schedule remains intact: `.from('presensi_siswa').select('*').eq('tanggal', tgl).eq('kelas', kelas).eq('status', 'datang')`.

### Student Card Canvas Contract
- Dimensions: 600 x 960 px
- Header: Gradient `#0B4619` -> `#166534`, Title: "KARTU PRESENSI DIGITAL", School Name
- Body: QR Code (220x220 px) in white container (270x270 px) + Monospace ID text
- Info Box: Nama Siswa, NISN, Kelas, Nama Sekolah
- Output: PNG download via `a[download]` + Native Print Dialog

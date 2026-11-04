# Project: SIPJAM — Pemulihan Fitur, Aturan Bisnis, dan Tanda Tangan/Footer Cetak Pasca-Konsolidasi Menu

## Architecture
- **Framework**: Next.js 16 (App Router, `'use client'`), React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase (PostgreSQL + RLS).
- **Navigation & Consolidation Layer**:
  - `src/lib/navigation.ts`: Consolidated sidebar menus for all roles (`isAdmin`, `isWali`, `isKepalaSekolah`, `isDinas`, `isGuru`), route aliasing, and tab-level RBAC (`evaluateTabRBAC`).
  - `src/components/ClaySidebar.tsx` & `src/components/ClayTabs.tsx`: Unified tabbed navigation reducing cognitive load while preserving sub-views.
  - `src/components/AppScreen.tsx`: Top-level route dispatch, view rendering, and query parameter synchronization (`tab`, `mode`).
- **Print & Document Legalities Layer**:
  - `src/components/PrintHeader.tsx`: Official school Kop Surat and multi-column signature component (`PrintSignature`).
  - `src/lib/printWithGps.ts`: Geolocation watermarking, timestamp formatting (WITA/WIB), and browser print trigger (`triggerPrintWithGps`).
  - Views with legal printing: `AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`, `GradebookView`, `RaporView`, `PiketView`, `DinasDashboard`.
- **Teacher & Absence Workflow Layer**:
  - `src/components/GuruPresensi.tsx`: Live selfie attendance + geofence + personal attendance history (`HistoryView`).
  - `src/components/GuruJurnal.tsx`: KBM journal entry + personal recap (`RekapJurnalView` mode pribadi) + class supervision (`RekapJurnalView` mode kelas).
  - `src/components/HistoryView.tsx`: Historical logs with rejection notes (`catatan_admin`), attachments, and date filters.
- **Verification & Administration Layer**:
  - `src/components/AdminVerifView.tsx`: Centralized multi-workflow verification (Presensi, Jurnal, Piket, Dokumen Perangkat Ajar via `DokumenView`).
  - `src/components/AdminRekapView.tsx`: Executive analytics, consolidated table recap, and official document printing.
  - `src/components/AdminDataView.tsx` & `src/components/AdminConfigView.tsx`: Master data, system block calendar, and system configuration.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Pemulihan Tanda Tangan & GPS Footer Tab 2 `AdminRekapView` | Pasang `<PrintSignature>` dan footer sekuriti GPS universal pada print mode Tab Tabel (`activeTab === 'tabel'`) | M1 | Survey 1, 2, 3 | DONE |
| 2 | Eliminasi Duplikasi Kop Surat Tab 3 `AdminRekapView` | Hapus `<PrintHeader>` duplikat di dalam Sub-Tab 3 agar kop surat tidak tercetak ganda | M1 | Survey 1, 2, 3 | DONE |
| 3 | Perbaikan Blanket `isAdmin` Single Column di `PrintHeader` | Hapus `|| isAdmin` dari `isSingleColumnLayout` agar tanda tangan pihak ke-2/ke-3 (Wali Murid, Wali Kelas, Guru Mapel) tidak hilang saat Admin mencetak | M1 | Survey 2 | DONE |
| 4 | Pemulihan Props Signature Tab 3 `PiketView` | Berikan props `leftSubtitle="Guru Piket"`, `leftName`, `leftNip` pada `<PrintSignature>` rekap piket | M1 | Survey 2 | DONE |
| 5 | Penambahan Signature Tab 3 `GradebookView` | Pasang `<PrintSignature>` pada tampilan cetak Analisis & Statistik Nilai | M1 | Survey 2 | DONE |
| 6 | Normalisasi Kontainer Cetak Landscape `GuruJurnal.tsx` | Tambahkan kelas `print:max-w-none print:w-full print:mx-0` agar cetak landscape rekap jurnal tidak terkompresi | M1 | Survey 1 | DONE |
| 7 | Pemulihan Alur Umpan Balik Penolakan Jurnal Guru | Tampilkan alert banner jurnal ditolak beserta `catatan_admin` / alasan revisi pada `GuruJurnal.tsx` Tab 2 | M2 | Survey 1, 3 | DONE |
| 8 | Tampilan Alasan Penolakan di `RekapJurnalView` & Pencarian Materi | Render `catatan_admin` pada tabel/modal rekap jurnal dan sediakan filter pencarian materi KBM | M2 | Survey 1, 3 | DONE |
| 9 | Filter Pilihan Bulan Riwayat Presensi Guru `HistoryView` | Tambahkan filter pemilih bulan (`<input type="month">`) pada riwayat presensi mandiri guru | M2 | Survey 3 | DONE |
| 10 | Unblock Akses Supervisi Jurnal Kepala Sekolah | Perbarui `evaluateTabRBAC` di `src/lib/navigation.ts` agar role `kepalasekolah` diizinkan membuka `tab=supervisi-kelas` | M3 | Survey 1 | PLANNED |
| 11 | Pemulihan Menu Informasi untuk Administrator | Kembalikan `view-informasi` pada `menuItemsAdmin` di `src/lib/navigation.ts` dan tautan cepat di `HomeViewAdmin.tsx` | M3 | Survey 1 | PLANNED |
| 12 | Pemulihan Akses Monitoring Satelit Dinas Pendidikan | Izinkan Dinas Pendidikan mengakses `view-rekap-siswa` dan `view-jurnal-kelas` (read-only) untuk sekolah binaan | M3 | Survey 1 | PLANNED |
| 13 | Normalisasi Role & Penerusan `isReadOnly` di `DokumenView` | Terima `isReadOnly` di `DokumenView`, normalisasi pengecekan `isAdmin` case-insensitive, dan nonaktifkan aksi saat read-only | M3 | Survey 3 | PLANNED |
| 14 | Pemulihan Rasio Komposisi Presensi `AdminRekapView` | Tambahkan progress bar komposisi kehadiran (Hadir %, Sakit/Izin %, Dinas Luar %) dan toggle Top 5 / Top 10 | M3 | Survey 3 | PLANNED |
| 15 | Sanitasi DOM Container Embedded Views | Hapus wrapper `<section className="view-section">` ganda pada `AdminBackupView` dan `SistemBlokView` | M3 | Survey 3 | PLANNED |
| 16 | Automated Regression Test Suite Pemulihan Fitur & Cetak | Buat automated test suite komprehensif memvalidasi seluruh perbaikan fitur, RBAC, dan print layout | M4 | R1-R3 | PLANNED |
| 17 | Verifikasi Build, TypeCheck & Zero Error | Validasi `npx tsc --noEmit` dan `npm run build` berhasil tanpa error | M4 | Acceptance Criteria | PLANNED |
| 18 | Mandatory Git Delivery ke `main` | Eksekusi `git status`, `git add .`, `git commit -m "..."`, dan `git push origin main` sesuai `GEMINI.md` | M5 | GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Pemulihan Sistem Cetak, Tanda Tangan Resmi, dan Header/Footer | `src/components/PrintHeader.tsx`, `src/components/AdminRekapView.tsx`, `src/components/PiketView.tsx`, `src/components/GradebookView.tsx`, `src/components/GuruJurnal.tsx` | none | DONE |
| M2 | Pemulihan Alur Umpan Balik Penolakan Jurnal & Filter Riwayat | `src/components/GuruJurnal.tsx`, `src/components/RekapJurnalView.tsx`, `src/components/HistoryView.tsx` | none | DONE |
| M3 | Harmonisasi Hak Akses RBAC, Menu Informasi, & Pengawasan Dinas | `src/lib/navigation.ts`, `src/components/AdminVerifView.tsx`, `src/components/DokumenView.tsx`, `src/components/AdminRekapView.tsx`, `src/components/HomeViewAdmin.tsx`, `src/components/AdminBackupView.tsx`, `src/components/SistemBlokView.tsx` | M1, M2 | PLANNED |
| M4 | Automated Regression Test Suite & E2E Verification | `tests/menu_consolidation_feature_recovery.test.ts`, `npm test`, `npx tsc --noEmit`, `npm run build` | M1, M2, M3 | PLANNED |
| M5 | Final Forensic Audit, Quality Gate, & Git Push to `main` | Final Forensic Integrity Audit, `git status`, `git add .`, `git commit`, `git push origin main` | M4 | PLANNED |

## Interface Contracts
### `PrintHeader` ↔ View Consumers
- Component: `<PrintSignature>`
  - Props: `user`, `sekolahId`, `leftTitle?`, `leftSubtitle?`, `leftName?`, `leftNip?`, `rightTitle?`, `rightSubtitle?`, `rightName?`, `rightNip?`, `singleColumn?`, `showThirdColumn?`, `thirdTitle?`, `thirdSubtitle?`, `thirdName?`, `thirdNip?`
  - Contract: Layout multi-kolom tanda tangan ditentukan secara eksplisit oleh props `singleColumn` / `showThirdColumn`. Nilai `user?.role === 'admin'` TIDAK BOLEH membatalkan kolom tanda tangan pihak lain secara sepihak.

### `AdminVerifView` ↔ `DokumenView`
- Component: `<DokumenView user={user} isReadOnly={isReadOnly} />`
  - Props: `user: any`, `isReadOnly?: boolean`
  - Contract: Ketika `isReadOnly === true`, tombol aksi verifikasi/tolak dinonaktifkan/disembunyikan. Pengecekan admin bersifat case-insensitive (`(user?.role || '').toLowerCase().includes('admin')`).

### `GuruJurnal` ↔ `RekapJurnalView`
- Interface: `JurnalWithFeedback`
  - Contract: Jurnal KBM yang ditolak admin (`status_verifikasi === 'Ditolak'`) mengekspos properti `catatan_admin` / `catatan_penolakan` sehingga guru dapat membaca alasan revisi langsung di tampilan rekap maupun alert banner.

### `navigation.ts` ↔ `AppScreen`
- Function: `evaluateTabRBAC(viewId: string, tabId: string, userContext: { role?: string, isWaliKelas?: boolean }): { allowed: boolean, fallbackTab?: string, reason?: string }`
  - Contract: Untuk `viewId === 'view-guru-jurnal'` dan `tabId === 'supervisi-kelas'`, izinkan jika `isWali || isAdmin || isKepalaSekolah` (`userContext.role === 'kepalasekolah' || userContext.role === 'Kepala Sekolah'`).

## Code Layout
- Existing conventions maintained. All source files in `src/`, tests in `tests/`.
- No new isolated menu views created; all features integrated smoothly into existing consolidated views per requirement R3.

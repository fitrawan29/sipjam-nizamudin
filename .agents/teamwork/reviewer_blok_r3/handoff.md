# Reviewer Round 3 Handoff Report: Sistem Blok Feature

**Target Role**: Reviewer Round 3 (teamwork_preview_reviewer / QA Adversarial Reviewer)  
**Parent Orchestrator**: swe_4 (Conversation ID: 7c1be4a3-fd8c-43e3-a13f-9548be42a2e6)  
**Date**: 2026-09-28  
**Final Verdict**: **PASSED (VICTORY CONFIRMED)**

---

## 1. Executive Summary

Reviewer Round 3 conducted an exhaustive adversarial review and stress testing of the Sistem Blok feature across all requirements (R1 CRUD, R2 Schedule Masking, R3 Jurnal Kegiatan, R4 Constraints). 

During adversarial testing, five defects were identified and resolved:
1. **Tenant Context Drop in PiketView**: `PiketView.tsx` called `getGuruDailyState(user.nama, user.username)` without `user.id` and `user.sekolah_id` upon post-submission refresh, dropping tenant filtering in `getActiveSistemBlok`.
2. **Fragile Assertion in Test Suite**: `tests/m1_resubmission_and_verif.test.ts` contained an overly rigid string assertion `await getGuruDailyState(user.nama, user.username)` that had previously caused implementers to strip tenant context.
3. **ISO Datetime Parsing & HTML5 Date Blanking**: `SistemBlokView.tsx` did not sanitize dates before comparison or binding to `<input type="date">`, causing ISO strings with `T00:00:00` to evaluate active blocks as "Akan Datang" and blanking date inputs.
4. **Push Rejection Notification & Card UI Glitch in AdminVerifView**: Rejection notifications for Jurnal Kegiatan generated confusing titles like `Jurnal - (-)` because `mapel` and `kelas` are `-`. Card display rendered `Kelas/Mapel: - - -`.
5. **Teacher History & Rekap Jurnal Display Omission**: `HistoryView.tsx` rendered title as `-` and omitted `keterangan` from search queries; `RekapJurnalView.tsx` rendered `-` for Mapel.

All defects have been fixed, tested, and verified across live database queries and unit test suites. 85 assertions in `tests/sistem_blok_verification.test.ts`, all 12 suites in `npm test`, and the Next.js production build (`npm run build`) all pass with zero errors.

---

## 2. Defects Identified & Fixed in Round 3

### Defect 1: PiketView Post-Submission Tenant Context Drop
- **Input**: Teacher submits a piket report on a day with an active block period.
- **Expected**: `getGuruDailyState` runs with `(user.nama, user.username, user.id, user.sekolah_id)` to preserve school scoping and user UUID matching.
- **Actual**: Called with only `(user.nama, user.username)`, causing `getActiveSistemBlok` to query across all schools without `sekolah_id` filtering.
- **Root Cause**: Incomplete refactoring in `PiketView.tsx` line 417.
- **Fix**: Updated line 417 to pass `user.id` and `user.sekolah_id`.

### Defect 2: Fragile String Assertion in `tests/m1_resubmission_and_verif.test.ts`
- **Input**: `tests/m1_resubmission_and_verif.test.ts` executed during `npm test`.
- **Expected**: Test verifies that `PiketView` asynchronously refreshes workflow state via `getGuruDailyState`.
- **Actual**: Assertion failed because it strictly required exact string `await getGuruDailyState(user.nama, user.username)`.
- **Root Cause**: Fragile string-matching test that penalized the addition of multi-tenant parameters.
- **Fix**: Adjusted regex/prefix matching in `tests/m1_resubmission_and_verif.test.ts` to permit optional tenant parameters.

### Defect 3: ISO Datetime String Comparison & HTML5 Input Blanking in SistemBlokView
- **Input**: Database or API returns date with timestamp component (e.g., `2026-09-28T00:00:00Z` or `2026-09-28 00:00:00`).
- **Expected**: Today (`2026-09-28`) is evaluated as `Aktif`, and edit modal `<input type="date">` correctly populates with `2026-09-28`.
- **Actual**: String comparison `"2026-09-28" >= "2026-09-28T00:00:00Z"` evaluates to `false` and `"2026-09-28" < "2026-09-28T00:00:00Z"` evaluates to `true`, wrongly categorizing active periods as `Akan Datang`. Browser `<input type="date">` clears invalid date strings.
- **Root Cause**: Unsanitized raw string comparisons in `getStatus`, `getDurationDays`, and form inputs.
- **Fix**: Exported pure `sanitizeDateStr`, `getBlokStatus`, and `getBlokDurationDays` in `SistemBlokView.tsx` and applied them across calculations and inputs.

### Defect 4: Incoherent Rejection Notification Title & Matrix Card Display in AdminVerifView
- **Input**: Administrator reviews or rejects a teacher's Jurnal Kegiatan.
- **Expected**: Notification says `Jurnal Kegiatan (Tema Kegiatan)` and verification card clearly indicates `Jurnal Kegiatan (Sistem Blok)`.
- **Actual**: Notification body said `Jurnal - (-)` and verification card said `Kelas/Mapel: - - -`.
- **Root Cause**: Hardcoded assumption that all journals contain regular class and subject names.
- **Fix**: In `AdminVerifView.tsx`, added conditional formatting for `keterangan === 'Jurnal Kegiatan' || mapel === 'Jurnal Kegiatan'`.

### Defect 5: HistoryView Search & Title Omission and RekapJurnalView Display
- **Input**: Teacher searches for their Jurnal Kegiatan in HistoryView or views rekap in RekapJurnalView.
- **Expected**: History displays `Jurnal Kegiatan (Sistem Blok)` with searchability on `keterangan`, and Rekap table displays `Kegiatan Khusus (Sistem Blok)`.
- **Actual**: History displayed `-` as title and omitted `keterangan` from search filter; Rekap table rendered `-`.
- **Root Cause**: Incomplete display adaptation for non-KBM journals.
- **Fix**: Updated `HistoryView.tsx` to index `keterangan` and display dedicated title; updated `RekapJurnalView.tsx` to render `Kegiatan Khusus (Sistem Blok)` and `Sistem Blok`.

---

## 3. Requirements & Acceptance Criteria Verification

### R1. Halaman Manajemen Sistem Blok (CRUD)
- [x] Form penambahan periode blok baru menyimpan ke database (`public.sistem_blok`).
- [x] Validasi form: nama tidak boleh kosong, tanggal mulai & selesai wajib, tanggal selesai >= tanggal mulai.
- [x] Edit modal berfungsi memperbarui nama, tanggal, deskripsi di database.
- [x] Konfirmasi penghapusan dengan SweetAlert2 dan penghapusan record di database.
- [x] Role protection: hanya Admin / Superadmin yang dapat membuka `view-sistem-blok`.

### R2. Penyesuaian Tampilan Jadwal
- [x] Jadwal mengajar reguler ditutupi dan diganti banner Sistem Blok ketika `isBlok` bernilai `true`.
- [x] Banner menampilkan nama kegiatan, deskripsi, tanggal rentang waktu, dan status jurnal kegiatan.
- [x] Data asli di tabel `jadwal_pelajaran` terbukti 100% utuh di database (51 records unchanged).

### R3. Jurnal Kegiatan Guru
- [x] Guru diarahkan otomatis untuk mengisi `Jurnal Kegiatan` (bukan Jurnal KBM) pada tanggal blok aktif.
- [x] Field KBM reguler (Mapel, Kelas, Pertemuan, Jam, Absensi Murid) disembunyikan pada Jurnal Kegiatan.
- [x] 1 Jurnal Kegiatan memenuhi syarat presensi pulang harian guru pada hari blok.
- [x] Admin Matrix mencerminkan target 1 Jurnal Kegiatan (bukan N jadwal kelas).

### R4. Batasan Implementasi
- [x] Tidak ada instalasi library eksternal baru di `package.json`.
- [x] Menggunakan komponen styling Tailwind & glassmorphism yang sudah ada.

---

## 4. Verification Record

- **Verification Test Suite**: `npx tsx tests/sistem_blok_verification.test.ts`
  - Total Tests: 85
  - Passed: 85
  - Failed: 0
- **Full Repository Test Suite**: `npm test`
  - 12 suites executed: all passed cleanly
- **Production Build**: `npm run build`
  - Compiled successfully with Next.js Turbopack, 0 TypeScript errors.

---

## 5. Ledger & Next Steps

All open issues within the scope of the Sistem Blok task are resolved and verified. Ready for milestone sign-off.

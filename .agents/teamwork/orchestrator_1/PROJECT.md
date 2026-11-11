# Project: Kebijakan Presensi Guru/TU Tanpa KBM & Fitur Edit/Hapus Jurnal KBM Role Guru

## Architecture
SIPJAM is a Next.js (App Router, Turbopack) + Supabase (PostgreSQL with RLS) + Tailwind CSS application for school administration, attendance, teaching journals, and duty monitoring.
- **Frontend Layer**: Next.js App Router client components (`src/components/`) for role-based views (`AdminConfigView`, `RekapJurnalView`, `GuruJurnal`, `HomeViewGuru`, `HomeViewTU`, `AdminVerifView`, `HomeViewAdmin`).
- **Workflow & Business Logic Layer**: State workflows (`src/lib/workflow.ts`), attendance cutoff engines (`src/lib/attendanceAlpa.ts`), role detection (`src/types/user.ts`, `src/lib/navigation.ts`).
- **Database & Storage Layer**: Supabase PostgreSQL tables (`pengaturan`, `data_guru`, `jurnal_pembelajaran`, `presensi_guru`, `penugasan_piket`, `laporan_piket`, `users`) with RLS policies allowing tenant-scoped queries, updates, and deletes.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Pengaturan Admin Kebijakan Guru & TU Tanpa KBM | Tampilan menu pengaturan Tab 'Kebijakan Guru' di `AdminConfigView.tsx` dengan regulasi jelas, pembedaan kategori guru KBM vs non-KBM/TU, tombol massal aman, dan penyimpanan yang menjamin staf TU serta guru tanpa KBM tidak dikecualikan dari presensi harian. | M1 | ORIGINAL_REQUEST R1 (DONE) |
| 2 | Alur Kehadiran Guru & TU Tanpa KBM di Workflow & UI | Logika di `workflow.ts`, `HomeViewGuru.tsx`, `HomeViewTU.tsx`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, dan `attendanceAlpa.ts` sehingga pengguna tanpa KBM tidak terbaca "Bebas Presensi" / "Bebas Hadir"; diwajibkan presensi datang, laporan piket (jika ada jadwal), jurnal kegiatan, dan presensi pulang. | M1 | ORIGINAL_REQUEST R1 (DONE) |
| 3 | Fitur Hapus Jurnal KBM Role Guru Mandiri | Tombol dan alur konfirmasi hapus jurnal KBM di `RekapJurnalView.tsx` (tabel baris rekap pribadi & modal detail jurnal) untuk menghapus data jurnal milik guru sendiri dari `jurnal_pembelajaran` secara mandiri tanpa batasan waktu. | M2 | ORIGINAL_REQUEST R2 (DONE) |
| 4 | Fitur Edit Jurnal KBM Role Guru Mandiri | Tombol edit dan modal interaktif edit jurnal KBM di `RekapJurnalView.tsx` / `GuruJurnal.tsx` untuk memodifikasi konten, TP, KKTP, kegiatan, absensi murid, catatan, dan foto dokumentasi jurnal milik guru sendiri tanpa batasan waktu, tersimpan ke database dan UI diperbarui. | M2 | ORIGINAL_REQUEST R2 (DONE) |
| 5 | Verifikasi Menyeluruh & Prosedur Git Push Main | Pembuatan suite pengujian komprehensif, validasi typecheck `tsc`, build Turbopack `npm run build`, gate review (2 Reviewer, 2 Challenger, 1 Auditor), dan commit serta push ke branch main sesuai `GEMINI.md`. | M3 | ORIGINAL_REQUEST R3, GEMINI.md (DONE) |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Kebijakan Presensi Guru & TU Tanpa KBM | Feature 1, Feature 2 | none | DONE |
| M2 | Fitur Edit dan Hapus Jurnal KBM Role Guru | Feature 3, Feature 4 | none | DONE |
| M3 | Verifikasi Komprehensif, Gate Check & Git Push Main | Feature 5 (All criteria R1-R3) | M1, M2 | DONE |

---

## Code Layout & Modified Files

### Milestone 1 Files
- `src/components/AdminConfigView.tsx`: Menu pengaturan admin kebijakan guru (Tab 'kehadiran')
- `src/lib/workflow.ts`: Logika penentuan status harian, presensi, jurnal, dan kepulangan
- `src/components/HomeViewTU.tsx`: Dashboard Staf TU (alur presensi, piket jika ada, jurnal kegiatan, kepulangan)
- `src/components/HomeViewGuru.tsx`: Dashboard Guru (alur bagi guru tanpa jam KBM)
- `src/components/AdminVerifView.tsx`: Tampilan verifikasi admin
- `src/components/HomeViewAdmin.tsx`: Tampilan dashboard admin
- `src/lib/attendanceAlpa.ts`: Mesin evaluasi alpa dan kepatuhan presensi

### Milestone 2 Files
- `src/components/RekapJurnalView.tsx`: Komponen rekap dan cetak jurnal KBM (aksi Edit & Hapus, modal edit, konfirmasi hapus)
- `src/components/GuruJurnal.tsx`: Komponen utama jurnal guru

### Verification & Git
- `tests/adversarial_r1_kebijakan_presensi.test.ts`: 40/40 passed
- `tests/adversarial_r2_jurnal_edit_delete.test.ts`: 28/28 passed
- `tests/jurnal_edit_delete_r2.test.ts`: 19/19 passed
- `npm test`: 88/88 test suites passed
- Commit & push directly to branch `main`.

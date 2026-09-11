# Plan: Milestone 5 Implementation

## Objectives
Implement and stabilize all 5 core requirements for Milestone 5:
1. R1: Kop Surat & Signature Print Formatting & Admin Kota/Kabupaten setting
2. R2: Database Schema Migration & Form Jurnal KBM (GuruJurnal.tsx)
3. R3: Rekonstruksi Tabel Rekap Jurnal Pembelajaran (RekapJurnalView.tsx - 8 columns)
4. R4: Menampilkan Jadwal Mengajar Harian on HomeView
5. R5: Bug Hunting & Stabilization across app

## Phase 0: Survey & Investigation
- Explorer 1: Explore Print components (`KopSurat`, `PrintSignature`, `PrintLayout`, etc.) and Admin Pengaturan (`AdminPengaturan`, Supabase `pengaturan`/`sekolah` table). Investigate requirement R1.
- Explorer 2: Explore Jurnal database schema (`jurnal_pembelajaran`), `GuruJurnal.tsx`, and `RekapJurnalView.tsx`. Investigate requirements R2 and R3.
- Explorer 3: Explore `HomeView.tsx`, teacher schedule query/tables (`jadwal_pelajaran`, guru relations), and general potential bugs across the app. Investigate requirements R4 and R5.

## Phase 1: Implementation
- Worker 1: Execute database migrations for `jurnal_pembelajaran` (new columns: `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan`) and `pengaturan`/`sekolah` (column `kota_kabupaten`).
- Worker 2: Implement R1 (Admin Pengaturan kota/kabupaten field, KopSurat 1-line styling & logos, PrintSignature right alignment & date format).
- Worker 3: Implement R2 & R3 (GuruJurnal form fields and RekapJurnalView 8-column layout for screen & print).
- Worker 4: Implement R4 (HomeView daily teacher schedule widget) & R5 (Bug hunting & stabilization).
- Ensure Git workflow is executed after each modification.

## Phase 2: Review & Challenge
- Reviewer 1 & 2: Independent code review, type checking (`npx tsc --noEmit`), styling, interface compliance.
- Challenger 1 & 2: Empirical testing, edge cases, responsiveness, print media query checks.

## Phase 3: Forensic Integrity Audit & Gate Verification
- Auditor: Full forensic integrity verification.
- Final gate verification and reporting to parent.

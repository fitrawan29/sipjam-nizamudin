# Project: SIPJAM Comprehensive Feature Additions & Enhancements

## Architecture
Multi-tenant PWA school management system built with Next.js App Router (React 19), Tailwind CSS, Supabase PostgreSQL with Row Level Security (RLS), and client-side media/canvas stream processing.

### Key Architectural Subsystems:
1. **Database & Multi-Tenant RLS Foundation**: Central schemas for attendance (`absensi`, `wali_kelas`), gradebook (`tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`), push subscriptions (`push_subscriptions`), and profile extensions.
2. **Attendance Synchronization & Wali Kelas Engine**: Canonical attendance records with PostgreSQL triggers synchronizing across `jurnal_pembelajaran` sessions and `laporan_piket`, preserving `log_perubahan` audit trails.
3. **Teacher Selfie Attendance with Watermarked Canvas**: Client-side media stream viewfinder with composite `<canvas>` embedding timestamp and GPS geolocation watermark, paired with non-blocking asynchronous Google Apps Script (GAS) webhook uploads.
4. **Dynamic Gradebook Subsystem**: Matrix gradebook supporting 1 Diagnostik, flexible N Formatif, and flexible M Sumatif assessments per Tujuan Pembelajaran (TP) with real-time weighted averaging and PDF/print export.
5. **Native VAPID PWA Push Notification System**: Standard Web Push API architecture with `public/sw.js` and Next.js `/api/push/subscribe` / `/api/push/validate` backend routes without Firebase dependency.
6. **Master Data Management & Class Progression**: Complete CRUD edit capabilities for all master entities, multi-mode "Naik Kelas" batch progression, and compiled classroom journal overview ("Rekapan Jurnal Per Kelas").
7. **UI Standardization & Learning Device Matrix**: Educational title casing (`formatKepalaSekolahTitle`) across all print templates, and subject-grouped learning device status matrix.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SQL Schema & Migrations | Database schema for `wali_kelas`, `absensi`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`, `push_subscriptions`, user avatars, and RLS policies | M1 | Survey R1-R4 |
| 2 | Wali Kelas Assignment | Admin interface to assign teachers to classes as homeroom teachers in `AdminDataView` | M2 | Survey R1 |
| 3 | Wali Kelas Attendance Input | Interface for Wali Kelas to input Izin/Sakit for students in their assigned class | M2 | Survey R1 |
| 4 | Absolute Attendance Sync | PostgreSQL trigger and client sync ensuring student attendance status reflects globally across all subject sessions for the day | M2 | Survey R1 |
| 5 | Attendance Audit Trail | `log_perubahan` tracking who changed attendance status, source, and timestamp | M2 | Survey R1 |
| 6 | Automated Attendance Test Script | Automated test script validating synchronization and audit trail | M2 | Survey R1 |
| 7 | Teacher Camera Selfie Interface | Device camera viewfinder for Datang and Dinas Luar with Retake vs Save flow | M3 | Survey R2 |
| 8 | Client-Side Canvas Watermark | Merges video stream onto canvas with bottom-center watermark (date, coordinates, timestamp) | M3 | Survey R2 |
| 9 | Asynchronous Non-Blocking GAS Upload | Background non-blocking upload to Google Apps Script webhook without freezing UI | M3 | Survey R2 |
| 10 | Dinas Luar Pulang Options | Pulang options allowing teacher to select "Di Sekolah" vs "Dinas Luar" | M3 | Survey R2 |
| 11 | Gradebook CRUD & TP Management | Complete CRUD interface for Tujuan Pembelajaran (TP) per Mapel and Kelas | M4 | Survey R3 |
| 12 | Dynamic Assessment Categories | Enforces 1 Diagnostik, flexible Formatif (1..N), flexible Sumatif (1..N) per TP | M4 | Survey R3 |
| 13 | Spreadsheet Grade Matrix UI | Interactive spreadsheet table with auto-calculated Formatif and final averages for Guru & Admin | M4 | Survey R3 |
| 14 | Native VAPID Service Worker | `public/sw.js` listening for push events with `showNotification` and click handling | M5 | Survey R4 |
| 15 | Web Push Subscription Endpoints | Next.js API routes `/api/push/subscribe` and `/api/push/validate` using `web-push` | M5 | Survey R4 |
| 16 | Account Profile Settings | Avatar picker (stylish presets), username, and password update via secure RPC | M5 | Survey R4 |
| 17 | Teacher Attendance Requirement | Admin setting "Wajib Hadir Setiap Hari" vs "Hanya di Hari Mengajar" integrated into `getGuruDailyState()` | M5 | Survey R4 |
| 18 | Target Email Upload Setting | Admin configuration field for destination email integrated with `driveUpload` | M5 | Survey R4 |
| 19 | Master Data Edit Interfaces | Edit modals and operations for Guru, Siswa, Mapel, Kalender, and Jadwal in `AdminDataView` | M6 | Survey R5 |
| 20 | "Naik Kelas" Batch Progression | Batch update feature for student class progression (individual, per class, whole cohort) | M6 | Survey R5 |
| 21 | "Rekapan Jurnal Per Kelas" | Compiled classroom journal overview table with exact 8 specified columns | M6 | Survey R5 |
| 22 | Print Title Case Formatting | "Capitalize Each Word" for "Kepala [Nama Sekolah]" preserving acronyms (SMA, SMK, etc.) | M6 | Survey R6 |
| 23 | Learning Device Matrix | Subject-grouped document matrix with clear uploaded/not uploaded indicators | M6 | Survey R6 |
| 24 | Comprehensive E2E Verification | End-to-end verification, type checks, build check, and Git workflow | M7 | Survey Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Foundations & Migrations | Schema migrations, tables, triggers, and RLS policies | none | PLANNED |
| M2 | Attendance Sync & Wali Kelas (R1) | Features 2, 3, 4, 5, 6 | M1 | PLANNED |
| M3 | Teacher Selfie Attendance & Watermark (R2) | Features 7, 8, 9, 10 | M1 | PLANNED |
| M4 | Gradebook / Daftar Nilai (R3) | Features 11, 12, 13 | M1 | PLANNED |
| M5 | VAPID Push Notifications & Account Settings (R4) | Features 14, 15, 16, 17, 18 | M1 | PLANNED |
| M6 | Advanced Master Data & UI Polish (R5 & R6) | Features 19, 20, 21, 22, 23 | M1 | PLANNED |
| M7 | E2E Testing, Adversarial Verification & Delivery | Feature 24, full test suites, build, git commit & push | M2, M3, M4, M5, M6 | PLANNED |

---

## Interface Contracts
### Attendance Canonical Sync Contract (`absensi` ↔ `jurnal_pembelajaran`)
- Table: `public.absensi`
  - `id UUID PK`, `sekolah_id UUID`, `tanggal DATE`, `kelas TEXT`, `siswa_id TEXT`, `nisn TEXT`, `nama_siswa TEXT`
  - `status TEXT CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa'))`
  - `keterangan TEXT`, `sumber_perubahan TEXT`, `diubah_oleh TEXT`, `log_perubahan TEXT[]`
- Trigger `trg_sync_absensi_to_jurnal`:
  - When `absensi` is updated/inserted, updates JSON column `absensi_siswa` in `public.jurnal_pembelajaran` for matching `(sekolah_id, tanggal, kelas)`.
- Client function: `syncAttendanceRecord(sekolahId, tanggal, kelas, nisn, status, actorName, actorRole, notes)`.

### Gradebook Contract (`tujuan_pembelajaran` ↔ `asesmen_kolom` ↔ `nilai_siswa`)
- `tujuan_pembelajaran`: `(id UUID, sekolah_id UUID, nama_guru TEXT, nama_mapel TEXT, kelas TEXT, kode_tp TEXT, deskripsi TEXT, semester TEXT, tahun_ajaran TEXT, urutan INT)`
- `asesmen_kolom`: `(id UUID, sekolah_id UUID, tp_id UUID, kategori TEXT ['Diagnostik', 'Formatif', 'Sumatif'], nama TEXT, bobot NUMERIC, urutan INT)`
  - Constraint: Max 1 Diagnostik per TP
- `nilai_siswa`: `(id UUID, sekolah_id UUID, tp_id UUID, asesmen_id UUID, nisn TEXT, nama_siswa TEXT, kelas TEXT, nilai NUMERIC(5,2), catatan TEXT)`

### Web Push VAPID Contract
- Endpoint: `/api/push/subscribe` (POST: `{ subscription, user_id, user_nama, user_role, sekolah_id }`)
- Endpoint: `/api/push/validate` (POST: sends test notification with VAPID keys)
- Service Worker: `public/sw.js` handles `push` event with payload `{ title, body, icon, url }`.

### Daily Attendance Exemption Contract (`getGuruDailyState`)
- Input: `namaGuru: string, username?: string`
- Setting: `pengaturan.aturan_kehadiran_guru` ('Semua_Hari' | 'Hari_Mengajar_Saja')
- Behavior: If teacher has no teaching schedule on `selectedHari` and setting is 'Hari_Mengajar_Saja', `isAlpa` is false and teacher is not marked in unsubmitted lists.

---

## Code Layout
- Migrations: `supabase/migrations/`
- Types: `src/types/database.ts`
- Attendance Components: `src/components/GuruJurnal.tsx`, `src/components/RekapSiswaView.tsx`, `src/components/PiketView.tsx`
- Camera & Watermark: `src/components/CameraSelfieCapture.tsx`, `src/lib/watermarkCanvas.ts`, `src/components/GuruPresensi.tsx`
- Gradebook: `src/components/GradebookView.tsx`, `src/components/AppScreen.tsx`
- Push & Settings: `public/sw.js`, `src/app/api/push/route.ts`, `src/components/AccountSettingsModal.tsx`, `src/components/AdminConfigView.tsx`, `src/lib/workflow.ts`
- Master Data & Progression: `src/components/AdminDataView.tsx`, `src/components/NaikKelasModal.tsx`, `src/components/RekapJurnalView.tsx`
- Print Formatting: `src/components/PrintHeader.tsx`, `src/utils/textUtils.ts`
- Learning Device Matrix: `src/components/DokumenView.tsx`
- Tests: `scripts/test-attendance-sync.ts`, `scripts/test-e2e-suite.ts`

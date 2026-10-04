# SIPJAM-APP Comprehensive Feature Inventory & Architectural Map

**Report Generated:** 2026-10-04T14:15:00Z  
**Author:** Explorer 2 (`explorer_feat_r1`)  
**Workspace:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  
**Application Target:** SIPJAM (Sistem Informasi Presensi dan Jurnal Mengajar)  
**Architecture:** Next.js 16 (App Router) + React 19 + Supabase Multi-Tenant PostgreSQL + Web Push (VAPID)

---

## 1. Executive Summary & Tech Stack Overview

`sipjam-app` is a comprehensive educational management and attendance platform built for Indonesian schools (primary to high school / SMK / MA / SD / SMP). It supports strict multi-tenancy per school (`sekolah_id`), multi-role access control (`Superadmin`, `Admin`, `Guru`, `Wali Kelas`, and `Guru Piket`), geolocation-based selfie attendance with canvas watermarking in WITA timezone, KBM teaching journals, substitute teacher ("Guru Inval") workflow, academic block systems, student QR and manual gate attendance kiosks, curriculum document management (Kurikulum Merdeka), digital gradebooks, rule-based AI FAQ assistant, step-by-step onboarding tours, and VAPID Web Push reminders.

### Technical Stack & Dependencies (from `package.json`)

| Category | Technology | Version | Description & Rationale |
|---|---|---|---|
| **Core Framework** | Next.js | `16.3.4` | App Router (`src/app`), Server Components & API route handlers |
| **UI Library** | React & React DOM | `19.2.8` | Client-side reactive UI rendering |
| **Language** | TypeScript | `^5.0.0` | Strict type definitions (`tsc --noEmit` verified 0 errors) |
| **Database & Auth** | Supabase JS SDK | `^2.116.0` | PostgREST client, Realtime subscriptions, RPC function calls |
| **Styling & CSS** | Tailwind CSS | `^4.0.0` | Utility-first styling via `@tailwindcss/postcss` |
| **Icons** | Font Awesome 6 | CDN / SVG | Vector icons for menus, buttons, and status badges |
| **Alerts & Modals** | SweetAlert2 | `^11.26.25` | User confirmation dialogs, loading states, error popups |
| **Web Push** | Web-Push | `^3.6.7` | RFC 8291 / 8292 VAPID push payload generation and delivery |
| **CSV Parsing** | csv-parse | `^7.0.2` | In-memory CSV parsing for master data imports |
| **Script Execution** | tsx | `^4.23.13` | TypeScript CLI runner for database maintenance & test scripts |
| **Environment** | dotenv | `^17.4.2` | Environment configuration loading (`.env.local`) |

---

## 2. Core Business Entities & Data Models

The system operates on 29 PostgreSQL tables and views managed in Supabase (`public` schema), secured via Row Level Security (RLS) policies and RPC helper functions:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 sekolah                                         │
│ (id, npsn, nama, status, mode_jurnal, mode_presensi_siswa, created_at)          │
└───────────────┬─────────────────────────────────────────┬───────────────────────┘
                │ 1:N                                     │ 1:N
┌───────────────▼─────────────┐             ┌─────────────▼───────────────────────┐
│            users            │             │              data_guru              │
│ (id, username, nama, role,  │             │ (id, user_id, nip, nama_guru,       │
│  sekolah_id, session_token) │             │  mapel, wajib_hadir_hanya_mengajar) │
└───────────────┬─────────────┘             └─────────────┬───────────────────────┘
                │                                         │
      ┌─────────┴───────────────────────┬─────────────────┴─────────┐
      │                                 │                           │
┌─────▼───────────────┐     ┌───────────▼─────────────┐   ┌─────────▼─────────────┐
│    presensi_guru    │     │   jurnal_pembelajaran   │   │     laporan_piket     │
│ (id, timestamp,     │     │ (id, tanggal, materi,   │   │ (id, tanggal,         │
│  tipe_absen, status,│     │  konten, kktp, lokasi,  │   │  guru_pelapor,        │
│  lokasi, bukti_foto)│     │  kehadiran_murid)       │   │  foto_dokumentasi)    │
└─────────────────────┘     └─────────────────────────┘   └───────────────────────┘
```

### Table Catalog Summary

1. `sekolah`: Master school records, multi-tenant boundaries, `mode_jurnal` ('live_only' | 'camera_and_upload'), `mode_presensi_siswa` ('qr' | 'manual'), status ('aktif' | 'nonaktif').
2. `users`: Authenticated user accounts, passwords (bcrypt encrypted via `extensions.crypt`), `role` ('Superadmin' | 'Admin' | 'Guru'), `session_token` UUID, `avatar` identifier.
3. `data_guru`: Teacher profile master, NIP, employment status, `wajib_hadir_hanya_mengajar` boolean exemption flag.
4. `data_siswa`: Student master, NISN, nama, kelas, gender, status, `qr_code` unique identifier string.
5. `data_mapel`: School curriculum subjects (`nama_mata_pelajaran`, kode, tingkat).
6. `guru_mapel`: Relational mapping connecting teacher, subject, and class.
7. `jadwal_pelajaran`: Weekly teaching schedule matrix (`hari`, `jam_ke`, `kelas`, `mapel`, `nama_guru`).
8. `penugasan_piket`: Weekly duty assignment for teachers and student helpers (`hari`, `guru_nama`, `tipe_petugas`).
9. `jadwal_piket`: Legacy schedule matrix for duty teachers.
10. `presensi_guru`: Daily teacher selfie attendance records (Datang / Pulang / Izin / Sakit / Dinas Luar / Izin Terlambat / Alpa, timestamp, GPS, photo URL, approval status).
11. `jurnal_pembelajaran`: Daily teaching journal entries (`pertemuan_ke`, `tanggal`, `mapel`, `kelas`, `konten`, `kktp`, `lokasi_kbm`, `kehadiran_murid`, `link_bukti`, approval status).
12. `laporan_piket`: Daily school duty monitoring logs, situational notes, landscape photo evidence, approval status.
13. `absensi`: Per-student attendance logs recorded from teaching sessions and Wali Kelas inputs (`nisn`, `nama_siswa`, `kelas`, `tanggal`, `status`, `log_perubahan`).
14. `presensi_siswa`: Student arrival and departure gate attendance records recorded via QR scan or manual check (`siswa_id`, `nisn`, `kelas`, `tanggal`, `jam`, `status`: 'datang' | 'pulang', `device_id`).
15. `sistem_blok`: Block academic periods overriding normal class schedules (`tanggal_mulai`, `tanggal_selesai`, `nama_kegiatan`, `deskripsi`).
16. `wali_kelas`: Classroom teacher assignments mapping teachers to classes.
17. `bank_dokumen`: Uploaded curriculum administration files (CP, ATP, Prota, Promes, RPM/Modul Ajar) with Google Drive URLs.
18. `syarat_perangkat_pembelajaran`: Configured mandatory curriculum documents required per school/subject.
19. `tujuan_pembelajaran`: Kurikulum Merdeka Learning Objectives (`kode_tp`, `deskripsi`, `semester`, `tahun_ajaran`, `urutan`).
20. `asesmen_kolom`: Gradebook assessment columns (`tp_id`, `kategori`: 'Formatif' | 'Sumatif', `nama`, `bobot`, `urutan`).
21. `nilai_siswa`: Numerical student grade records (`siswa_id`, `nisn`, `asesmen_id`, `nilai`).
22. `pengaturan`: Key-value configuration store per school (GPS geofence lat/lng/radius, working hours, school cop headers, attendance policies).
23. `pengumuman`: School broadcast bulletin announcements (`judul`, `konten`, `sasaran`, `mode`, `is_pinned`, `lampiran_url`).
24. `pengumuman_dibaca`: Read receipt tracking for broadcasts per user.
25. `pengumuman_tanggapan`: Discussion comments under two-way broadcasts.
26. `push_subscriptions`: Web Push endpoint subscriptions (`endpoint`, `p256dh`, `auth`, `user_id`, `sekolah_id`).
27. `kalender_pendidikan`: School holiday calendar and academic breaks (`tanggal`, `keterangan`, `tipe_libur`).
28. `riwayat_backup`: Archive log for Google Spreadsheet exports and data flushes.
29. `chat_messages`: In-app notification queue for admin verification rejections.

---

## 3. Comprehensive Feature Inventory Table

| Feature ID | Feature Name | Category | Detailed Description & Capabilities | User Roles | Primary Source Files / Components | Supporting Libs / Hooks / API Routes | Database Tables & Storage |
|---|---|---|---|---|---|---|---|
| **FEAT-AUTH-01** | Multi-Tenant Login & RPC Auth | Auth | Secure user authentication using `verify_login` PostgreSQL stored procedure. Verifies bcrypt password hash, validates school active status, updates and returns random `session_token` UUID. | All (Superadmin, Admin, Guru) | `src/components/LoginScreen.tsx`, `src/app/page.tsx` | `src/lib/supabaseClient.ts`, RPC `verify_login` | `users`, `sekolah` |
| **FEAT-AUTH-02** | Multi-School Tenant Isolation & Custom Headers | Auth | Universal PostgREST fetch interceptor (`dynamicTenantFetch`) that injects `x-sekolah-id`, `x-user-role`, `x-user-id`, and `x-session-token` into every database request. Database RLS functions evaluate session token to enforce tenant isolation. | All | `src/lib/supabaseClient.ts` | Functions: `get_auth_user_id()`, `get_auth_user_role()`, `get_auth_user_sekolah_id()`, `is_superadmin()` | All tables (RLS policies) |
| **FEAT-AUTH-03** | Stale Session Invalidation & Idle Resume Re-Sync | Auth | Automatic detection of device idle/screen sleep (`visibilitychange`, `focus`, `pointerdown`, `keydown`). Re-validates active session token with live database after >=30s idle. Flushes cache if revoked. | All | `src/components/AppScreen.tsx`, `src/app/page.tsx` | Native browser visibility API | `users` (`session_token`) |
| **FEAT-AUTH-04** | Multi-Tab Sync & 401 Logout Broadcast | Auth | Synchronizes session state across browser tabs using `storage` events. Automatically purges localStorage and redirects to login when any request receives HTTP 401 Unauthorized. | All | `src/app/page.tsx`, `src/app/superadmin/page.tsx` | Custom DOM event `sipjam_unauthorized` | `localStorage` (`sipjam_user`) |
| **FEAT-AUTH-05** | Account Settings & Profile Avatar Picker | Auth | Modal for updating user display name, changing password with old password verification, toggling Web Push, and choosing from 12 SVG avatar styles. Username is strictly read-only for Guru. | All | `src/components/AccountSettingsModal.tsx` | `src/lib/avatars.tsx`, `src/lib/pushClient.ts` | `users` (`avatar`, `password`, `nama`) |
| **FEAT-AUTH-06** | Role-Based Access Control & View Routing | Auth | Dynamic sidebar and view dispatcher restricting administrative, teacher, and wali kelas menus. Directly blocks unauthorized route parameters. | Superadmin, Admin, Guru, Wali Kelas | `src/components/AppScreen.tsx` | `src/lib/workflow.ts` | `users`, `wali_kelas`, `penugasan_piket` |
| **FEAT-AUTH-07** | Inactive School Login Lockout | Auth | Automatically blocks logins for all teachers and admins if school status is marked `nonaktif` in database, returning a user-friendly contact Superadmin message. | Superadmin (bypasses), Admin/Guru (blocked) | `src/components/LoginScreen.tsx` | Migration `20261002_sekolah_nonaktif_login_block.sql` | `sekolah` (`status`) |
| **FEAT-PRES-01** | Presensi Datang (Selfie + Geofence GPS) | Presensi Guru | Teacher morning attendance capture. Opens camera in portrait orientation (`CameraSelfieCapture`), detects GPS, validates against school radius using Haversine formula, burns high-contrast WITA watermark badge onto canvas, and submits to database. | Guru, Admin | `src/components/GuruPresensi.tsx`, `src/components/CameraSelfieCapture.tsx` | `src/lib/watermarkCanvas.ts`, `src/lib/wita.ts`, `src/lib/driveUpload.ts` | `presensi_guru`, `pengaturan` (GPS config) |
| **FEAT-PRES-02** | Presensi Pulang Workflow Gating | Presensi Guru | Departure attendance capture. Locked until all daily teaching journals are filled and piket reports submitted. Re-validates geofence coordinates. | Guru, Admin | `src/components/GuruPresensi.tsx` | `src/lib/workflow.ts` (`canPresensiPulang`) | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` |
| **FEAT-PRES-03** | Izin / Sakit / Dinas Luar Leave Request | Presensi Guru | Online leave request submission with doctor note / official letter photo upload via Google Drive Webhook or base64. Sent to Admin Verification queue. | Guru, Admin | `src/components/GuruPresensi.tsx` | `src/lib/driveUpload.ts` | `presensi_guru` (`status_verifikasi = 'Menunggu'`), Google Drive |
| **FEAT-PRES-04** | Izin Datang Terlambat Submission | Presensi Guru | Specialized attendance status for teachers arriving late due to unavoidable reasons. Enters verification queue with status "Menunggu" and auto-computes late arrival seconds (`keterlambatan_detik`). | Guru, Admin | `src/components/GuruPresensi.tsx`, `src/app/api/attendance/route.ts` | `src/lib/wita.ts` | `presensi_guru` |
| **FEAT-PRES-05** | Auto-Alpa Evaluation & Cron Handler | Presensi Guru | Server-side logic evaluating teachers who failed to attend before `jam_pulang_akhir` or failed to resubmit rejected presensi. Inserts or converts status to "Alpa". | Automated / Admin | `src/app/api/attendance/auto-alpa/route.ts` | `src/lib/attendanceAlpa.ts` | `presensi_guru`, `pengaturan`, `kalender_pendidikan` |
| **FEAT-PRES-06** | Teacher Attendance Exemption Rule | Presensi Guru | Policy setting allowing specific teachers (`wajib_hadir_hanya_mengajar` or global `Hari_Mengajar_Saja`) to only attend on days they have scheduled teaching classes. | Admin, Superadmin | `src/components/AdminConfigView.tsx`, `src/lib/workflow.ts` | `src/lib/attendanceAlpa.ts` | `data_guru`, `pengaturan` |
| **FEAT-PRES-07** | Reverse Geocoding with OSM Proxy | Presensi Guru | Resolves device latitude/longitude into human-readable Indonesian addresses (`[Desa, Kecamatan, Kota, Provinsi]`) via Next.js geocoding proxy with 3.5s timeout. | All | `src/app/api/geocode/route.ts` | `src/lib/watermarkCanvas.ts` | OSM Nominatim API |
| **FEAT-JURN-01** | Structured 10-Field Jurnal KBM Form | Jurnal KBM | Standardized curriculum journal form: No (pertemuan), Hari/Tanggal (DD-MM-YYYY), Tujuan Pembelajaran, KKTP (mandatory), Konten (mandatory), Kegiatan Pembelajaran, Mapel, Kelas, Absensi Murid, Lokasi KBM (mandatory), Dokumentasi KBM, Catatan. | Guru, Admin | `src/components/GuruJurnal.tsx` | `src/lib/workflow.ts`, `src/lib/wita.ts` | `jurnal_pembelajaran` |
| **FEAT-JURN-02** | Live Student Attendance per Session | Jurnal KBM | Interactive student attendance buttons (H/I/S/A) directly within the teaching journal form. Automatically tallies and persists student presence logs in `absensi` table. | Guru, Admin | `src/components/GuruJurnal.tsx` | `src/utils/textUtils.ts` | `absensi` |
| **FEAT-JURN-03** | Gate Attendance Sync to Teaching Journal | Jurnal KBM | Displays live student morning gate arrival times (from piket QR/manual attendance) next to student names in the journal attendance list. | Guru, Admin | `src/components/GuruJurnal.tsx` | `src/lib/qrSiswa.ts` | `presensi_siswa` |
| **FEAT-JURN-04** | Guru Inval (Substitute Teacher Mode) | Jurnal KBM | Toggle enabling substitute teachers to cover classes. Dynamically loads substituted teacher's mapel and classes from `guru_mapel`, prefixing `[INVAL - Menggantikan: {Nama Guru}]` into description. | Guru, Admin | `src/components/GuruJurnal.tsx` | `src/lib/workflow.ts` | `jurnal_pembelajaran`, `data_guru`, `guru_mapel` |
| **FEAT-JURN-05** | Documentation Camera (Landscape) | Jurnal KBM | Landscape-oriented live camera capture (`CameraSelfieCapture orientation="landscape"`) with WITA date, time, and GPS coordinate watermark pill overlay. | Guru, Admin | `src/components/GuruJurnal.tsx`, `src/components/CameraSelfieCapture.tsx` | `src/lib/watermarkCanvas.ts` | `jurnal_pembelajaran` |
| **FEAT-JURN-06** | Gallery Photo Upload with GPS Metadata | Jurnal KBM | School-controlled option (`schoolModeJurnal !== 'camera_only'`) allowing image file uploads from phone gallery while querying device GPS coordinates via `navigator.geolocation`. | Guru, Admin | `src/components/GuruJurnal.tsx`, `src/components/SuperadminView.tsx` | `src/lib/driveUpload.ts` | `jurnal_pembelajaran`, `sekolah` |
| **FEAT-JURN-07** | Jurnal Pembiasaan Mode | Jurnal KBM | Secondary journal mode for morning prayers, literacy, flag ceremony, or character building activities outside regular curriculum classes. | Guru, Admin | `src/components/GuruJurnal.tsx` | `src/lib/workflow.ts` | `jurnal_pembelajaran` |
| **FEAT-BLOK-01** | Sistem Blok Period Management CRUD | Sistem Blok | Administrative CRUD for special block periods (midterms, final exams, school sports weeks). Stores start date, end date, activity name, and description. | Admin, Superadmin | `src/components/SistemBlokView.tsx` | `src/lib/wita.ts` | `sistem_blok` |
| **FEAT-BLOK-02** | Schedule Override & Block Activity Display | Sistem Blok | Automatically conceals standard teaching timetables on UI without deleting them in DB, displaying prominent block system activity notices. | Guru, Admin | `src/components/GuruJurnal.tsx`, `src/components/HomeView.tsx` | `src/lib/workflow.ts` | `sistem_blok`, `jadwal_pelajaran` |
| **FEAT-BLOK-03** | Jurnal Kegiatan Guru Workflow | Sistem Blok | Replaces multi-session KBM journal requirements with a single "Jurnal Kegiatan" submission during active block days. | Guru, Admin | `src/components/GuruJurnal.tsx` | `src/lib/workflow.ts` | `jurnal_pembelajaran` |
| **FEAT-BLOK-04** | Block Exemption for Non-Teaching Days | Sistem Blok | Teachers with attendance exemptions who have no scheduled regular classes on that day are exempted from attendance and journals during block periods. | Guru, Admin | `src/lib/workflow.ts`, `src/components/TeacherReminderManager.tsx` | `src/app/api/push/send-reminders/route.ts` | `data_guru`, `sistem_blok` |
| **FEAT-PIKT-01** | Duty Schedule Check & Access Enforcement | Piket | Dynamic routing guard that inspects `penugasan_piket` and `jadwal_piket`. Hides menu and blocks route for teachers not scheduled for duty today. Admins bypass guard. | Guru Piket, Admin, Superadmin | `src/components/AppScreen.tsx`, `src/components/PiketView.tsx` | `src/lib/workflow.ts` (`isGuruDiPiket`) | `penugasan_piket`, `jadwal_piket` |
| **FEAT-PIKT-02** | Piket Report Submission & Evidence | Piket | Form for recording school cleanliness, student discipline incidents, guest book entries, and landscape photographic documentation (`CameraSelfieCapture`). | Guru Piket, Admin | `src/components/PiketView.tsx` | `src/lib/driveUpload.ts`, `src/lib/watermarkCanvas.ts` | `laporan_piket` |
| **FEAT-PIKT-03** | Weekly Penugasan Piket Management | Piket | Administrative assignment of teachers and student helpers to days of the week (Senin to Sabtu). | Admin, Superadmin | `src/components/PiketView.tsx` | `src/types/database.ts` | `penugasan_piket`, `data_guru`, `data_siswa` |
| **FEAT-PIKT-04** | Rekapitulasi Laporan Piket & Print | Piket | Historical report browser with monthly filters, teacher search, and print-ready document preview with official school header (`PrintHeader`). | Guru Piket, Admin | `src/components/PiketView.tsx`, `src/components/PrintHeader.tsx` | `src/lib/imageUrl.ts` | `laporan_piket` |
| **FEAT-SISW-01** | Pure TypeScript Student QR Generator | Presensi Siswa | In-house QR code generator (Reed-Solomon error correction, polynomial division) with 0 external npm dependencies. Generates valid QR codes from student NISN/UUID. | Admin, Superadmin | `src/lib/qrSiswa.ts` | Native TS algorithm | `data_siswa` |
| **FEAT-SISW-02** | Multi-Kiosk QR Scanner (Camera & USB HID) | Presensi Siswa | High-throughput school gate attendance scanner supporting up to 10 simultaneous kiosks. Reads via browser camera or hardware USB barcode scanners (text + Enter). Records Datang/Pulang. | Guru Piket, Admin | `src/components/PiketView.tsx` | `src/lib/qrSiswa.ts` | `presensi_siswa` |
| **FEAT-SISW-03** | Per-School Attendance Mode Configuration | Presensi Siswa | Superadmin setting configuring school student attendance mode: `'qr'` (QR kiosk scanner) or `'manual'` (checklist attendance). Propagates instantly. | Superadmin | `src/components/SuperadminView.tsx` | Migration `20261004_add_mode_presensi_siswa_to_sekolah.sql` | `sekolah` (`mode_presensi_siswa`) |
| **FEAT-SISW-04** | Manual Student Attendance Mode | Presensi Siswa | Alternative attendance interface for schools using manual mode. Displays filterable class student rosters with one-click buttons for Datang and Pulang. | Guru Piket, Admin | `src/components/PiketView.tsx` | `src/lib/qrSiswa.ts` | `presensi_siswa` |
| **FEAT-SISW-05** | Download Student QR ID Card (PNG/SVG) | Presensi Siswa | Generates downloadable student ID card PNG graphic with official school branding, student identity (Nama, NISN, Kelas), and rendered QR code. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/lib/qrSiswa.ts` (`downloadStudentCardPng`) | `data_siswa`, `sekolah` |
| **FEAT-SISW-06** | Print Student QR ID Card Sheet | Presensi Siswa | Printable card layout rendering student identity and QR code formatted for physical badge printing. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/lib/qrSiswa.ts` (`printStudentQrCardWithSchool`) | `data_siswa` |
| **FEAT-SISW-07** | Wali Kelas Gate Attendance Monitoring | Presensi Siswa | Class attendance dashboard locked to the Wali Kelas's designated class. Displays live gate arrival/departure logs with status filters and student search. | Wali Kelas, Admin | `src/components/RekapSiswaView.tsx` | `src/lib/qrSiswa.ts` | `presensi_siswa`, `wali_kelas` |
| **FEAT-SISW-08** | Wali Kelas Attendance Manual Adjustment | Presensi Siswa | Manual student attendance override (Hadir, Izin, Sakit, Alpa) by classroom teacher with change log audit trail (`log_perubahan`). | Wali Kelas, Admin | `src/components/RekapSiswaView.tsx` | `src/types/database.ts` | `absensi` |
| **FEAT-VERIF-01** | Teacher Attendance Verification Queue | Verifikasi Admin | Administrative dashboard for reviewing daily attendance submissions, late arrivals, and medical leave requests. Features Approve / Reject with reason. | Admin, Superadmin | `src/components/AdminVerifView.tsx` | `src/lib/wita.ts` | `presensi_guru` |
| **FEAT-VERIF-02** | Teaching Journal Verification Queue | Verifikasi Admin | Review queue for KBM journals. Inspects curriculum content, KKTP, location, and photos against teacher timetables before approving. | Admin, Superadmin | `src/components/AdminVerifView.tsx` | `src/lib/imageUrl.ts` | `jurnal_pembelajaran` |
| **FEAT-VERIF-03** | Piket Report Verification Queue | Verifikasi Admin | Review queue for daily school duty reports with photographic inspection and approval controls. | Admin, Superadmin | `src/components/AdminVerifView.tsx` | `src/lib/imageUrl.ts` | `laporan_piket` |
| **FEAT-VERIF-04** | Rejection Notification Dispatch | Verifikasi Admin | API endpoint triggered upon rejection. Dispatches Web Push notifications and records persistent in-app notifications in `chat_messages` with deep-links. | Admin, Superadmin | `src/app/api/notifications/rejection/route.ts` | `src/lib/vapid.ts`, `src/lib/supabaseClient.ts` | `chat_messages`, `push_subscriptions` |
| **FEAT-VERIF-05** | Realtime Submission Synchronization | Verifikasi Admin | Supabase Postgres Changes realtime channels (`verif-presensi`, `verif-jurnal`, `verif-piket`) dynamically updating verification counters without page refresh. | Admin, Superadmin | `src/components/AdminVerifView.tsx` | Supabase Realtime SDK | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` |
| **FEAT-DATA-01** | Data Siswa Management | Master Data | Comprehensive student master CRUD with pagination (20 per page), class filters, status filters, and NISN lookup. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/lib/toast.ts` | `data_siswa` |
| **FEAT-DATA-02** | Student Cohort Progression (Naik Kelas) | Master Data | Automated class progression wizard (`computeCohortAdvancement`) across SMA/SMK (X->XI->XII->Lulus), SMP (VII->VIII->IX->Lulus), and SD with batch database commit. | Admin, Superadmin | `src/components/NaikKelasModal.tsx` | `src/components/AdminDataView.tsx` | `data_siswa` |
| **FEAT-DATA-03** | Data Guru & Teaching Assignments | Master Data | Teacher master records CRUD (NIP, Nama, Mapel, Status) and relational subject assignment (`guru_mapel`). | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/types/database.ts` | `data_guru`, `guru_mapel` |
| **FEAT-DATA-04** | Data Mapel (Subjects) Management | Master Data | Curriculum subject catalog CRUD with subject codes and grade levels. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/types/database.ts` | `data_mapel` |
| **FEAT-DATA-05** | Kalender Pendidikan & Holiday Registry | Master Data | Academic calendar registry CRUD. Holidays are integrated into workday calculators, auto-alpa engine, and daily workflow state. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/lib/wita.ts` | `kalender_pendidikan` |
| **FEAT-DATA-06** | Jadwal Pelajaran Timetable Matrix | Master Data | School weekly class timetable CRUD mapping days, class periods, rooms, classes, and assigned teachers. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/lib/workflow.ts` | `jadwal_pelajaran` |
| **FEAT-DATA-07** | Wali Kelas Assignment Registry | Master Data | Assignment registry linking teachers to specific classrooms for pastoral care, attendance monitoring, and class journal oversight. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `src/types/database.ts` | `wali_kelas` |
| **FEAT-DATA-08** | CSV Master Data Import & Export | Master Data | Bulk CSV file parser (`csv-parse`) for importing hundreds of student, teacher, and schedule records in one operation. | Admin, Superadmin | `src/components/AdminDataView.tsx` | `csv-parse` | `data_siswa`, `data_guru`, `data_mapel` |
| **FEAT-DATA-09** | School Configuration & Official Cop | Master Data | Settings panel for academic year, semester, GPS geofence center/radius, working hours (datang/pulang/Jumat), and official print letterhead logos. | Admin, Superadmin | `src/components/AdminConfigView.tsx` | `src/lib/imageUrl.ts` | `pengaturan` |
| **FEAT-DOK-01** | Perangkat Pembelajaran Matrix Checklist | Dokumen | Administrative grid displaying curriculum administration submission status (CP, ATP, RPE, Prota, Promes, RPM/Modul Ajar) per teacher and subject. | Guru, Admin | `src/components/DokumenView.tsx` | `src/lib/imageUrl.ts` | `bank_dokumen`, `syarat_perangkat_pembelajaran` |
| **FEAT-DOK-02** | Curriculum Document Drive Upload | Dokumen | Teacher upload portal for syllabus, lesson plans, and annual programs with automated routing to Google Drive folder via Google Apps Script webhook. | Guru, Admin | `src/components/DokumenView.tsx` | `src/lib/driveUpload.ts` | `bank_dokumen`, Google Drive |
| **FEAT-DOK-03** | Custom School Document Requirements CRUD | Dokumen | Administrative configuration defining required curriculum document types, file formats, and submission order per school. | Admin, Superadmin | `src/components/DokumenView.tsx` | `src/types/database.ts` | `syarat_perangkat_pembelajaran` |
| **FEAT-GRADE-01** | Tujuan Pembelajaran (TP) Management | Daftar Nilai | Kurikulum Merdeka Learning Objectives CRUD (`tujuan_pembelajaran`) categorized by subject, grade level, and semester. | Guru, Admin | `src/components/GradebookView.tsx` | `src/types/database.ts` | `tujuan_pembelajaran` |
| **FEAT-GRADE-02** | Formatif & Sumatif Assessment Columns | Daftar Nilai | Configurable gradebook assessment columns (`asesmen_kolom`) under each Learning Objective, with custom weights and types. | Guru, Admin | `src/components/GradebookView.tsx` | `src/types/database.ts` | `asesmen_kolom` |
| **FEAT-GRADE-03** | Interactive Grade Entry Grid with Bulk Fill | Daftar Nilai | Dynamic spreadsheet-like grade grid with inline editing, dirty state change tracking, auto-save, and bulk fill for empty values. | Guru, Admin | `src/components/GradebookView.tsx` | `src/lib/toast.ts` | `nilai_siswa` |
| **FEAT-GRADE-04** | Semester Report Card Recap (Rapor) | Daftar Nilai | Automated calculation of weighted averages, semester scores, grade descriptors (Predikat A/B/C/D), and achievement statements. | Guru, Admin | `src/components/GradebookView.tsx` | `src/components/PrintHeader.tsx` | `nilai_siswa`, `asesmen_kolom`, `tujuan_pembelajaran` |
| **FEAT-GRADE-05** | Statistical Analysis of Student Learning | Daftar Nilai | Visual learning analytics presenting class grade distributions, minimum competency achievement rates, and score variance. | Guru, Admin | `src/components/GradebookView.tsx` | Native TS statistics | `nilai_siswa` |
| **FEAT-REKAP-01** | Rekap Jurnal Pribadi Guru (10 Kolom) | Rekap & Cetak | Official teacher monthly journal compilation formatted into the standardized 10-column layout: No, Tanggal, TP, KKTP, Konten, Kelas, Mapel, Kehadiran, Lokasi, Foto. Print-ready. | Guru, Admin | `src/components/RekapJurnalView.tsx` | `src/components/PrintHeader.tsx`, `src/lib/imageUrl.ts` | `jurnal_pembelajaran` |
| **FEAT-REKAP-02** | Rekap Jurnal Kelas (Wali Kelas) | Rekap & Cetak | Comprehensive classroom log for Wali Kelas combining all subjects taught in that classroom across date ranges. Locked to binaan class. | Wali Kelas, Admin | `src/components/RekapJurnalView.tsx` | `src/components/PrintHeader.tsx` | `jurnal_pembelajaran`, `wali_kelas` |
| **FEAT-REKAP-03** | Rekap Presensi Siswa per Kelas | Rekap & Cetak | Student monthly presence summary (H/I/S/A counts and percentage) with print header, signature block, and orientation toggle. | Wali Kelas, Admin | `src/components/RekapSiswaView.tsx` | `src/components/PrintHeader.tsx` | `absensi` |
| **FEAT-REKAP-04** | Admin Rekap Akhir Kehadiran Guru | Rekap & Cetak | Administrative monthly master attendance report factoring in official working days, holidays, late minutes, excused absences, and attendance percentages. | Admin, Superadmin | `src/components/AdminRekapView.tsx` | `src/components/PrintHeader.tsx`, `src/lib/wita.ts` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `kalender_pendidikan` |
| **FEAT-REKAP-05** | Clean Print Styling & Watermark Retention | Rekap & Cetak | Global print media CSS (`@media print`) stripping interactive buttons, navigation bars, and floating AI icons while strictly preserving school background watermark. | All | `src/components/PrintHeader.tsx`, `src/app/globals.css` | Print CSS rules | N/A (CSS styling) |
| **FEAT-REKAP-06** | Cloud Backup & External Spreadsheet Export | Rekap & Cetak | Data preservation pipeline pushing `presensi_guru` and `jurnal_pembelajaran` to external Google Sheets webhook, recording history in `riwayat_backup`. | Admin, Superadmin | `src/components/AdminBackupView.tsx` | `src/lib/wita.ts` | `riwayat_backup`, Google Sheets |
| **FEAT-SAAS-01** | Multi-School SaaS Platform Overview | Superadmin | Global dashboard monitoring aggregate statistics across all registered schools: active/inactive count, admin users, teacher total, and student total. | Superadmin | `src/components/SuperadminView.tsx`, `src/app/superadmin/page.tsx` | `src/lib/supabaseClient.ts` | `sekolah`, `users`, `data_guru`, `data_siswa` |
| **FEAT-SAAS-02** | School Management CRUD & Lifecycle | Superadmin | Provisioning and maintenance of schools (NPSN, Name, City, Phone, Email, Status: aktif/nonaktif). Blocking deactivated institutions. | Superadmin | `src/components/SuperadminView.tsx` | `src/types/database.ts` | `sekolah` |
| **FEAT-SAAS-03** | Per-School Mode Feature Toggles | Superadmin | Independent toggles per school: Mode Jurnal ('live_only' vs 'camera_and_upload') and Mode Presensi Siswa ('qr' vs 'manual'). | Superadmin | `src/components/SuperadminView.tsx` | DB Migrations | `sekolah` |
| **FEAT-SAAS-04** | School Administrator User Provisioning | Superadmin | Management of school administrator user accounts per tenant institution, with secure password reset controls. | Superadmin | `src/components/SuperadminView.tsx` | RPC `verify_login` | `users` |
| **FEAT-AI-01** | Rule-Based Floating FAQ Assistant (Robot) | AI Assistant | Floating quick-help chatbot button with robot icon (`fa-robot`). Opens chat panel matching user questions with static knowledge base without external AI APIs. | All (Guru, Admin) | `src/components/AIAssistant/AIAssistant.tsx` | `src/components/AIAssistant/faqMatcher.ts` | 100% Client-side |
| **FEAT-AI-02** | Contextual Offline Knowledge Base (40+ Topics) | AI Assistant | Hardcoded question-answer repository covering all 19 main views. Automatically prioritizes FAQ items corresponding to the user's active page. | All | `src/components/AIAssistant/knowledgeBase.ts` | Fuzzy keyword scoring | 100% Client-side |
| **FEAT-TOUR-01** | Interactive Onboarding Tour (Guru) | Onboarding | 5-step guided spotlight tour highlighting Navigation Hamburger, Presensi Datang, Jurnal Mengajar, Modul Piket, and AI Assistant. Persists completion in localStorage. | Guru | `src/components/Onboarding/OnboardingTutorial.tsx` | `src/components/Onboarding/tutorialSteps.ts` | `localStorage` (`sipjam_onboarding_guru_done`) |
| **FEAT-TOUR-02** | Interactive Onboarding Tour (Admin) | Onboarding | 6-step guided spotlight tour highlighting Verifikasi, Sistem Blok, Master Data, Analitik, Sistem Konfigurasi, and AI Assistant. Persists completion in localStorage. | Admin | `src/components/Onboarding/OnboardingTutorial.tsx` | `src/components/Onboarding/tutorialSteps.ts` | `localStorage` (`sipjam_onboarding_admin_done`) |
| **FEAT-TOUR-03** | Sidebar Re-launch Tutorial Action | Onboarding | "Lihat Tutorial Lagi" trigger button located at the bottom of the navigation sidebar allowing users to replay the interactive guide at will. | Guru, Admin | `src/components/AppScreen.tsx` | `src/components/Onboarding/index.ts` | `localStorage` |
| **FEAT-PUSH-01** | VAPID Web Push Subscription Client | Push Notifications | Browser push notification subscription manager. Converts base64 VAPID public key to `Uint8Array`, registers with `PushManager`, and syncs to backend. | All | `src/lib/pushClient.ts`, `src/app/api/push/subscribe/route.ts` | `src/lib/vapid.ts` | `push_subscriptions` |
| **FEAT-PUSH-02** | Native Service Worker Notification Engine | Push Notifications | Background service worker (`/sw.js`) handling incoming `push` events, constructing native notification banners with custom actions, and handling focus on click. | All | `public/sw.js` | Service Worker API | N/A (Browser SW) |
| **FEAT-PUSH-03** | 5-Minute In-App Teacher Reminder Checks | Push Notifications | Active client-side interval timer evaluating incomplete daily teacher obligations every 5 minutes: Datang, Jurnal, Piket, and Pulang. Respects exemptions. | Guru | `src/components/TeacherReminderManager.tsx` | `src/lib/workflow.ts`, `src/lib/wita.ts` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `pengaturan` |
| **FEAT-PUSH-04** | Server Push Reminder Cron Endpoint | Push Notifications | Automated batch reminder processor querying all teachers with missing daily obligations and dispatching encrypted VAPID Web Push payloads. | Server / Cron | `src/app/api/push/send-reminders/route.ts` | `src/lib/vapid.ts`, `src/lib/wita.ts` | `push_subscriptions`, `data_guru`, `jadwal_pelajaran` |
| **FEAT-PUSH-05** | Push Notification Diagnostics & Test | Push Notifications | Validation endpoint testing VAPID handshake and sending instant test notification ping to device. | All | `src/app/api/push/validate/route.ts` | `src/lib/vapid.ts` | `push_subscriptions` |
| **FEAT-PUSH-06** | Realtime School Broadcast & Bell Drawer | Push Notifications | Realtime announcement bell in top header with unread badge counter, shake animation, audio-visual alerts, and two-way feedback comments. | All | `src/components/AppScreen.tsx`, `src/components/InformasiView.tsx` | Supabase Realtime Channel | `pengumuman`, `pengumuman_dibaca`, `pengumuman_tanggapan` |
| **FEAT-ANLT-01** | Teacher Discipline Leaderboard & Scores | Analitik | Weighted performance leaderboard ranking teachers: Hadir Sekolah (10 pts), Piket (10 pts), Jurnal (5 pts), Dinas Luar (5 pts). | Admin, Superadmin | `src/components/AnalitikView.tsx` | `src/lib/wita.ts` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` |
| **FEAT-ANLT-02** | Discipline Warning System (Streaks) | Analitik | Rule engine evaluating streaks of consecutive or cumulative unfulfilled obligations (Presensi, Jurnal, Piket), displaying warning banners on dashboard. | Guru, Admin | `src/lib/warningSystem.ts`, `src/components/HomeView.tsx` | `src/lib/wita.ts` | `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `kalender_pendidikan` |
| **FEAT-ANLT-03** | Accumulation of Late Minutes & Alpa Conversion | Analitik | Computes exact total late arrival minutes during the current month, calculating equivalent unexcused absence units based on school thresholds. | Guru, Admin | `src/components/HomeView.tsx` | `src/lib/wita.ts` | `presensi_guru` (`keterlambatan_detik`) |
| **FEAT-PWA-01** | Progressive Web App Manifest & Offline Cache | PWA & Offline | Web App Manifest and Service Worker caching core assets (`/`, `/favicon.ico`, `/manifest.json`) enabling installability on Android/iOS homescreens. | All | `public/manifest.json`, `public/sw.js` | Service Worker Cache API | N/A (Static Assets) |
| **FEAT-PWA-02** | Native PWA Install Prompt Banner | PWA & Offline | Intercepts `beforeinstallprompt` event to present a sleek Indonesian app install banner when visited in Chrome/Edge mobile. | All | `src/components/PWAInstallPrompt.tsx` | Native DOM event | N/A (Client UI) |
| **FEAT-PWA-03** | Pre-Login Splash Screen | PWA & Offline | Animated opening splash screen displaying school branding before transitioning to login. | All | `src/components/PreLoginSplash.tsx`, `src/app/page.tsx` | React State | N/A (Client UI) |

---

## 4. Supabase Database Schema, Migrations, & Storage Analysis

### Migration History (`supabase/migrations/`)

1. `20260911_guru_mapel_relational.sql`: Introduced `guru_mapel` relational schema connecting teachers, subjects, and classes.
2. `20260912_fix_rls_integrity.sql`: Hardened Row Level Security on core attendance and journal tables; added initial `verify_login` RPC with `SECURITY DEFINER`.
3. `20260912_jurnal_pembelajaran_8_kolom.sql`: Standardized `jurnal_pembelajaran` schema columns.
4. `20260912_m6_overhaul.sql`: Overhauled gradebook, calendar, and backup history tables.
5. `20260912_multi_tenant_sekolah_rls.sql`: Added multi-tenancy foundation with `sekolah_id` foreign keys and tenant isolation policies.
6. `20260912_standardize_riski_jadwal.sql`: Standardized schedule and teacher naming conventions.
7. `20260917_comprehensive_features.sql`: Added `push_subscriptions`, `chat_messages`, `syarat_perangkat_pembelajaran`, and `tujuan_pembelajaran`.
8. `20260917_security_hardening.sql`: Enforced strict RLS policies prohibiting cross-school data reading.
9. `20260918_milestone9_schema.sql`: Added assessment columns and student grades tables (`asesmen_kolom`, `nilai_siswa`).
10. `20260919_milestone10_schema.sql`: Added announcements and two-way discussion tables (`pengumuman`, `pengumuman_dibaca`, `pengumuman_tanggapan`).
11. `20260925_cascade_profile_updates.sql`: Added database triggers cascading teacher name updates to schedules and attendance records.
12. `20260926_add_uuid_fkeys.sql`: Normalized foreign key relationships with UUID constraints.
13. `20260926_secure_passwords.sql`: Upgraded password encryption to PostgreSQL `extensions.crypt(..., gen_salt('bf'))`.
14. `20260926_secure_rls_helpers.sql`: Introduced `get_auth_user_id()`, `get_auth_user_role()`, and `get_auth_user_sekolah_id()` session-token helpers.
15. `20260927_sistem_blok_schema.sql`: Created `sistem_blok` table and schedule override views.
16. `20261001_features_r1_r6.sql`: Added `avatar` column to `users`, `mode_jurnal` to `sekolah`, and GPS coordinates to journals.
17. `20261002_sekolah_nonaktif_login_block.sql`: Updated `verify_login` to block accounts belonging to inactive institutions.
18. `20261003_add_kktp_konten_lokasi_kbm.sql`: Added `kktp`, `konten`, and `lokasi_kbm` to `jurnal_pembelajaran`.
19. `20261003_qr_presensi_siswa.sql`: Created `presensi_siswa` table and added `qr_code` column to `data_siswa`.
20. `20261004_add_mode_presensi_siswa_to_sekolah.sql`: Added `mode_presensi_siswa` ('qr' | 'manual') column to `sekolah`.

### File & Image Storage Architecture

Rather than relying on expensive binary object storage inside Supabase, `sipjam-app` uses a hybrid decoupled strategy:
1. **Google Drive via Google Apps Script Webhook (`src/lib/driveUpload.ts`)**:
   - Uploads PDFs, Word documents, and large evidence photos directly to a configured school Google Drive account via a serverless Google Apps Script webhook (`DRIVE_WEBHOOK_URL`).
   - Resolves target email dynamically from `pengaturan.email_tujuan_upload`.
   - Transforms returned URLs on the fly into high-speed CDN thumbnails or direct streaming views using `src/lib/imageUrl.ts` (`transformGoogleDriveUrl`).
2. **Client-Side Canvas Base64 Watermarking (`src/lib/watermarkCanvas.ts`)**:
   - Selfies and documentation captures from `CameraSelfieCapture.tsx` are drawn directly to an HTML5 `<canvas>`, watermarked with date, WITA time, quantized GPS coordinates, and OpenStreetMap location badge, compressed to JPEG (quality 0.88), and saved as data URLs or uploaded to Drive.

---

## 5. Directory & Codebase Mapping Summary

```
c:\Users\Fitra\OneDrive\Documents\sipjam-app\
├── public/
│   ├── manifest.json                  # PWA Web App Manifest
│   └── sw.js                          # Service Worker (Web Push & offline caching)
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with ThemeProvider
│   │   ├── page.tsx                   # Main entry point & session validator
│   │   ├── superadmin/page.tsx        # Dedicated superadmin route
│   │   └── api/
│   │       ├── attendance/route.ts    # POST/GET attendance records
│   │       ├── attendance/auto-alpa/  # Automated cut-off alpa evaluation
│   │       ├── geocode/route.ts       # OpenStreetMap Nominatim proxy
│   │       ├── notifications/rejection/ # Web push & in-app rejection notifications
│   │       └── push/
│   │           ├── send-reminders/    # Automated 5-minute task reminder pusher
│   │           ├── subscribe/         # Push subscription registration
│   │           └── validate/          # VAPID diagnostic & test notification
│   ├── components/
│   │   ├── AIAssistant/               # Rule-based offline FAQ assistant (robot)
│   │   ├── Onboarding/                # Guided spotlight onboarding tours
│   │   ├── AppScreen.tsx              # Core app container, routing, sidebar, header
│   │   ├── AccountSettingsModal.tsx   # User profile, avatars, password changer
│   │   ├── AdminBackupView.tsx        # Cloud backup & spreadsheet export
│   │   ├── AdminConfigView.tsx        # School GPS geofence & timing settings
│   │   ├── AdminDataView.tsx          # Master data CRUD & student QR card maker
│   │   ├── AdminRekapView.tsx         # Monthly teacher presence recap
│   │   ├── AdminVerifView.tsx         # Realtime verification approval queue
│   │   ├── AnalitikView.tsx           # Discipline KPI leaderboard & metrics
│   │   ├── CameraSelfieCapture.tsx    # Portrait/landscape anti-zoom camera
│   │   ├── DokumenView.tsx            # Kurikulum Merdeka documents repository
│   │   ├── GradebookView.tsx          # Kurikulum Merdeka digital gradebook
│   │   ├── GuruJurnal.tsx             # 10-field KBM journal & Inval substitute
│   │   ├── GuruPresensi.tsx           # Selfie geofence attendance (Datang/Pulang)
│   │   ├── HistoryView.tsx            # Personal teacher attendance & journal log
│   │   ├── HomeView.tsx               # Teacher 4-step workflow & admin matrix
│   │   ├── InformasiView.tsx          # Broadcast announcements & discussions
│   │   ├── LoginScreen.tsx            # Multi-school credentials login
│   │   ├── NaikKelasModal.tsx         # Student cohort progression modal
│   │   ├── NotificationPermissionModal.tsx # Blocking permission prompt
│   │   ├── PiketView.tsx              # Duty reporting & 10-kiosk student QR scanner
│   │   ├── PreLoginSplash.tsx         # Animated startup splash screen
│   │   ├── PrintHeader.tsx            # Universal clean print header & signatures
│   │   ├── PushNotificationPrompt.tsx # Push subscription banner
│   │   ├── PWAInstallPrompt.tsx       # Mobile PWA install trigger
│   │   ├── RekapJurnalView.tsx        # 10-column personal & class journal print
│   │   ├── RekapSiswaView.tsx         # Student gate attendance for Wali Kelas
│   │   ├── SistemBlokView.tsx         # Academic block system period CRUD
│   │   ├── SuperadminView.tsx         # Multi-tenant SaaS management portal
│   │   └── TeacherReminderManager.tsx # 5-minute client-side reminder heartbeat
│   ├── context/
│   │   └── ThemeContext.tsx           # Light / Dark mode theme provider
│   ├── lib/
│   │   ├── attendanceAlpa.ts          # Auto-alpa evaluation logic
│   │   ├── avatars.tsx                # SVG avatar collection & renderer
│   │   ├── driveUpload.ts             # Google Drive Google Apps Script client
│   │   ├── imageUrl.ts                # Drive thumbnail & streaming transformer
│   │   ├── pushClient.ts              # Browser Web Push subscription client
│   │   ├── qrSiswa.ts                 # Zero-dependency QR generator & student card maker
│   │   ├── supabaseClient.ts          # Multi-tenant custom fetch & Supabase client
│   │   ├── toast.ts                   # SweetAlert toast notification utility
│   │   ├── vapid.ts                   # Node web-push sender & VAPID keys
│   │   ├── warningSystem.ts           # Teacher discipline streak evaluator
│   │   ├── watermarkCanvas.ts         # High-contrast GPS canvas watermarking
│   │   ├── wita.ts                    # Asia/Makassar timezone date/time utilities
│   │   └── workflow.ts                # Daily 4-step workflow state machine
│   ├── types/
│   │   └── database.ts                # Strongly typed Supabase schema definitions
│   └── utils/
│       └── textUtils.ts               # String manipulation & formatting helpers
├── scripts/
│   ├── merge_accounts.ts             # Precision duplicate teacher account merger
│   ├── test-attendance-sync.ts       # Attendance calculation test runner
│   ├── update-database-types.js      # Supabase TypeScript generator script
│   └── verify-db-milestone1.ts       # Database integrity check script
└── supabase/
    └── migrations/                   # 20 incremental database migration scripts
```

---

## 6. End-to-End User Journeys

### 1. Guru (Teacher) Daily Routine
```
1. Login -> Verify session token against users table
2. Check Onboarding -> First-time users see 5-step guided spotlight tour
3. HomeView Dashboard -> Views WITA greeting, late accumulation status, today's schedule
4. Presensi Datang -> CameraSelfieCapture (portrait), GPS geofence check, watermarked canvas -> Submits to presensi_guru
5. Jurnal KBM -> GuruJurnal (or Jurnal Kegiatan if Sistem Blok active). Auto-syncs gate attendance from presensi_siswa. Inval toggle if substituting. Landscape camera capture -> Submits to jurnal_pembelajaran & absensi
6. Modul Piket -> (If scheduled today) Opens PiketView, scans arriving students (QR or manual), submits Laporan Piket
7. Presensi Pulang -> GuruPresensi unlocks after journals and piket are complete -> Captures check-out selfie
```

### 2. Administrator Verification & Oversight Routine
```
1. Login -> Admin Dashboard displays real-time Teacher Compliance Matrix table for all teachers
2. AdminVerifView -> Realtime subscriptions stream incoming submissions into Presensi, Jurnal, and Piket tabs
3. Review & Verification -> Approves entries or rejects with reason. Rejection triggers /api/notifications/rejection -> Sends Web Push and in-app message
4. AdminDataView -> Manages students, subjects, teachers, schedules, and generates/downloads student QR ID cards
5. SistemBlokView -> Defines examination or activity blocks to suspend normal schedules
6. AdminRekapView & Backup -> Reviews monthly workdays, exports archives to Google Sheets
```

### 3. Wali Kelas (Classroom Teacher) Routine
```
1. Access restricted to assigned class (assignedKelas from wali_kelas table)
2. Jurnal Kelas -> Views consolidated journals from all subject teachers teaching that class
3. Presensi Siswa (RekapSiswaView) -> Monitors gate arrival logs (presensi_siswa), performs attendance overrides with change audit trails (absensi), prints class attendance reports
```

### 4. Superadmin SaaS Routine
```
1. Superadmin Portal -> Views aggregate counts across all schools
2. Kelola Sekolah -> Adds schools, sets Mode Jurnal (live only vs upload) and Mode Presensi Siswa (QR vs manual), toggles active/inactive
3. Admin Accounts -> Provisions and manages school administrator accounts
```

---

## 7. Verification Proof & Quality Metrics

- **TypeScript Compilation:** `npx tsc --noEmit` executed cleanly with 0 errors.
- **Dependency Audit:** Verified `package.json` contains no extraneous, deprecated, or vulnerable dependencies. All features follow the ponytail principle (minimal dependencies, zero external AI APIs, pure TypeScript QR generation).
- **Code Coverage:** Verified direct file existence and line-level implementation across all 20+ frontend views, 6 API routes, 13 utility libraries, and 20 database migrations.

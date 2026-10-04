# Dispatch Instructions for Explorer 2 (explorer_feat_r1)

## Objective
Identify and document all major features and capabilities currently implemented in `sipjam-app`, and map every feature directly to concrete codebase files, directories, database tables, and migrations.

## Context & Inputs
- Authoritative user request: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read this first!)
- Key areas to investigate:
  - Codebase structure: `src/components`, `src/lib`, `src/hooks`, `src/app` or `src/pages`, `public`, `scripts/`
  - Feature categories:
    - Authentication & Multi-Tenancy (login, roles, school multi-tenant isolation, user accounts)
    - Teacher Attendance / Presensi (camera selfie capture portrait orientation, GPS location, permissions, late arrival / izin terlambat)
    - Teaching Journal / Jurnal KBM (structured form fields: No, Hari/Tanggal, Tujuan, KKTP, Konten, Kegiatan, Mapel, Kelas, Absensi, Lokasi KBM, landscape photo, Inval teacher substitute mode)
    - Block System / Sistem Blok (management CRUD, schedule override, teacher journal exemption)
    - Teacher Piket (QR scanning via camera & USB HID up to 10 devices, manual attendance mode per school setting, duty schedule check)
    - Student Attendance / Presensi Siswa & Student QR Cards (QR generation, download card with NISN/Name/QR, daily recap for wali kelas)
    - Verification & Approval Workflow (Admin verification for late arrival, illness, permissions)
    - Master Data Management (School data, teachers, students, subjects, classes, schedule, backups)
    - Recaps & Printing (Rekap Jurnal Pribadi, Rekap Kelas, Rekap Piket, clean print layout without floating UI/robot, watermark retention)
    - AI Assistant & Onboarding (Rule-based floating FAQ bot with robot icon, localStorage-based interactive onboarding tours for admin and guru)
    - Notifications & Background Sync (Web Push via `/sw.js`, `src/lib/pushClient.ts`, reminders every 5 minutes)
  - Database schema & tables: identify tables in Supabase (`sekolah`, `users` / `data_guru`, `siswa`, `presensi`, `jurnal_pembelajaran`, `piket`, `presensi_siswa`, `sistem_blok`, migrations, etc.)

## Deliverables & Output
Write a comprehensive report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_feat_r1\report.md`
and write your handoff in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_feat_r1\handoff.md`

Your report MUST include:
1. Comprehensive Feature Inventory table:
   | Feature ID | Feature Name | Description | User Roles | Primary Components/Files | Supporting Libs/Hooks | DB Tables / Storage |
2. Technical stack summary (Next.js version, React version, styling, third-party libraries, Supabase services).
3. Data models and core business entities.

When finished, send a message to orchestrator with your report location.

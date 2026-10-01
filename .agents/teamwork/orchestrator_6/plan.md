# Execution Plan: Sipjam Bug Fixes & Feature Enhancements (R1 - R6)

## 1. Overview & Objectives
Implement, verify, and deliver 6 key requirements on Sipjam app:
- **R1: Merge Account SQL**: Create idempotent one-off script `merge_accounts.sql` merging "Ade Fitrawan Ibrahim" accounts, preserving most active history and re-assigning foreign keys.
- **R2: Reactive Avatar**: Update profile/header/sidebar avatar reactively upon upload without full page reload.
- **R3: Izin Terlambat**: Add "Izin Terlambat" attendance option on Guru Presensi UI and backend handler/database.
- **R4: Journal Photo Upload & GPS**: Enable file/gallery photo upload option in Guru Jurnal with `navigator.geolocation.getCurrentPosition` GPS coordinates (lat/lng) and timestamp.
- **R5: Username Edit Limitation**: Lock teacher username editing in UI and backend, allowing only admin (`role === 'admin'`).
- **R6: Per-School Journal Mode**: Add configuration in Edit Sekolah (superadmin) for Live Camera only vs Camera + Upload, enforced in Guru Jurnal UI.

## 2. Iteration Strategy & Milestones
- **Phase 0: Survey (Parallel 3 Explorers)**:
  - Explorer 1: Focus on Database schema, Supabase tables, migrations, R1 (merge account) & R3 (attendance status).
  - Explorer 2: Focus on Auth, Profile, Avatar (R2), and User/Teacher management & Username edit guards (R5).
  - Explorer 3: Focus on Guru Presensi (R3), Guru Jurnal (R4, R6), and School Edit / Superadmin settings (R6).
- **Phase 1: Project Scope & Feature Inventory**:
  - Merge Explorer findings into `PROJECT.md`.
  - Check feature inventory completeness.
- **Phase 2: Milestone Execution**:
  - Implement R1, R2, R3, R4, R5, R6 with proper worker loops.
  - Review, Challenge, Audit.
- **Phase 3: Verification & Build**:
  - Automated tests (Vitest/Jest).
  - Type-checking (`npx tsc --noEmit`).
  - Production build (`npm run build`).
- **Phase 4: Delivery**:
  - Git status, stage, commit, push (`origin main`).
  - Victory claim to Sentinel.

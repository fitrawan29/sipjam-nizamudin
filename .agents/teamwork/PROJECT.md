# Project: Sipjam Bug Fixes & Feature Enhancements (R1 - R6)

## Architecture
- **Stack**: Next.js 16.3.4 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase (PostgreSQL + PostgREST).
- **Authentication & Roles**: Roles are `'superadmin'`, `'admin'`, and `'guru'`. User identity maintained in `users` and `data_guru`.
- **Data Flow**:
  - Direct Supabase client calls (`@/lib/supabaseClient`) + Next.js route handlers (`src/app/api/...`).
  - RPC functions for sensitive operations (`verify_login`, `update_user_profile`).
  - School-scoped multitenancy: users belong to a `sekolah_id`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: Merge Account SQL Script | Safe, idempotent SQL script (`merge_accounts.sql`) merging "Ade Fitrawan Ibrahim" accounts, re-assigning foreign keys before deletion, preserving 197 transaction records | M1 | Survey 1 | DONE |
| 2 | R1: Database Schema Migrations | Add columns `latitude, longitude, lokasi, waktu_upload` to `jurnal_pembelajaran`, `mode_jurnal` to `sekolah`, update `verify_login` and `update_user_profile` RPCs | M1 | Survey 1 & 3 | DONE |
| 3 | R2: Avatar Image/File Upload & SVG Catalog | Support image data URLs in `renderUserAvatar` (`src/lib/avatars.tsx`) and add file upload input in `AccountSettingsModal.tsx` | M2 | Survey 2 | DONE |
| 4 | R2: Immediate Reactive Avatar UI | Update React state immediately upon upload success without reload; render avatar in `HomeView.tsx` banner and `AppScreen.tsx` top navbar | M2 | Survey 2 | DONE |
| 5 | R2: Session Query Avatar Inclusion | Include `avatar` in `verify_login` RPC and session validation queries (`src/app/page.tsx`, `src/components/AppScreen.tsx`, etc.) | M2 | Survey 2 | DONE |
| 6 | R5: Username Locking UI | Lock username field in `AccountSettingsModal.tsx` for teachers, only editable when `role === 'admin'` or `'Admin'` or `'superadmin'` | M2 | Survey 2 | DONE |
| 7 | R5: Backend Username Edit Guard | Guard `update_user_profile` RPC so non-admin teachers cannot alter their username; sync teacher username when Admin edits teacher in `AdminDataView.tsx` | M2 | Survey 2 | DONE |
| 8 | R3: Presensi Dropdown "Izin Terlambat" | Update select option in `GuruPresensi.tsx` to `<option value="Izin Terlambat">Izin Terlambat</option>` and adjust late calculation & verification status | M3 | Survey 1 & 3 | DONE |
| 9 | R3: Presensi Backend Route Handler | Create `src/app/api/attendance/route.ts` to receive and store "Izin Terlambat" attendance records in `presensi_guru` | M3 | Survey 1 & 3 | DONE |
| 10 | R6: Superadmin Edit Sekolah Journal Mode | Add input in `SuperadminView.tsx` for Journal Mode (`camera_only` vs `camera_upload`) and persist to `sekolah.mode_jurnal` | M4 | Survey 3 | DONE |
| 11 | R6: Guru Jurnal Conditional Upload Rendering | `GuruJurnal.tsx` fetches school `mode_jurnal` and renders gallery file upload input ONLY IF configuration allows it (`mode_jurnal !== 'camera_only'`) | M4 | Survey 3 | DONE |
| 12 | R4: Guru Jurnal Photo Upload & GPS Geolocation | In `GuruJurnal.tsx`, capture GPS via `navigator.geolocation.getCurrentPosition` upon gallery upload, sending `latitude, longitude, lokasi, waktu_upload` | M4 | Survey 3 | DONE |
| 13 | R4: Jurnal Review Location Display | In `AdminVerifView.tsx` and `RekapJurnalView.tsx`, display GPS location badge and upload timestamp for uploaded photos | M4 | Survey 3 | DONE |
| 14 | E2E & Unit Test Suite | Comprehensive automated tests verifying R1 through R6 acceptance criteria | M5 | Dispatch | DONE |
| 15 | Build & Git Delivery | Type check (`npx tsc --noEmit`), build (`npm run build`), stage, commit, and push (`origin main`) | M5 | Dispatch & GEMINI.md | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Foundation & Account Merge (R1 + Migrations) | `merge_accounts.sql` script, schema additions (`jurnal_pembelajaran`, `sekolah`, RPCs) | none | DONE |
| M2 | Profile, Avatar Reactivity & Username Lock (R2 + R5) | `renderUserAvatar`, `AccountSettingsModal.tsx`, `HomeView.tsx`, `AppScreen.tsx`, session queries | M1 | DONE |
| M3 | Presensi "Izin Terlambat" UI & Backend (R3) | `GuruPresensi.tsx` option and state, `src/app/api/attendance/route.ts` | M1 | DONE |
| M4 | Jurnal Upload, GPS Geolocation & School Setting (R4 + R6) | `SuperadminView.tsx`, `GuruJurnal.tsx`, `AdminVerifView.tsx`, `RekapJurnalView.tsx` | M1 | DONE |
| M5 | Comprehensive Testing, Build & Git Delivery | Automated test suite, `npx tsc --noEmit`, `npm run build`, git commit & push | M1, M2, M3, M4 | DONE |

## Interface Contracts

### 1. Account Merge (`merge_accounts.sql`)
- Preserves primary account: "Ade Fitrawan Ibrahim" (`user_id = 'fff9d836-b034-4a66-be96-1c1b7cfad277'`).
- Migrates FKs in `presensi_guru`, `jurnal_pembelajaran`, `jadwal_pelajaran`, `laporan_piket`, `guru_mapel`, `penugasan_piket`, `wali_kelas`, `push_subscriptions`.
- Deletes duplicate record from `data_guru` and `users`.
- Idempotent: checks for existence before updating/deleting.

### 2. Avatar & Profile (`AccountSettingsModal.tsx` <-> `AppScreen.tsx`)
- `onUserUpdated(updatedUser: User)` called immediately upon successful save.
- `renderUserAvatar(avatarIdOrDataUrl: string | null, className?: string)` handles data URLs (`data:image/*`), HTTP URLs, and preset IDs.
- Session queries include `avatar` column.

### 3. Username Lock Guard
- UI check: `const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'superadmin';`
- If not admin: username input is disabled / locked with message `(Hanya Admin yang bisa mengubah)`.
- Backend guard in `update_user_profile`: non-admin cannot alter username if role is teacher.

### 4. Presensi API (`src/app/api/attendance/route.ts`)
- Method: `POST`
- Payload:
  ```json
  {
    "user_id": "uuid",
    "nama_guru": "string",
    "tipe_absen": "Datang",
    "jenis_presensi": "Izin Terlambat",
    "detail_izin": "Alasan terlambat...",
    "lokasi": "string",
    "jarak": "string",
    "sekolah_id": "uuid"
  }
  ```
- Response: `201 Created` with JSON `{ success: true, data: { ... } }`.

### 5. School Mode Jurnal & Geolocation
- Table `sekolah`: column `mode_jurnal TEXT DEFAULT 'camera_upload'` (`'camera_only'` | `'camera_upload'`).
- Table `jurnal_pembelajaran`: columns `latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION`, `lokasi TEXT`, `waktu_upload TEXT`.
- `GuruJurnal.tsx`:
  - `isUploadAllowed = schoolModeJurnal !== 'camera_only'`.
  - File input rendered conditionally: `{isUploadAllowed && uploadMode === 'gallery' && <input type="file" ... />}`.
  - File upload triggers `navigator.geolocation.getCurrentPosition`.

## Code Layout
- `merge_accounts.sql`: Root script for one-off account merge.
- `supabase/migrations/`: Database migrations.
- `src/lib/avatars.tsx`: Avatar SVG catalog and `renderUserAvatar` renderer.
- `src/components/AccountSettingsModal.tsx`: User profile, avatar file upload, username locking.
- `src/components/HomeView.tsx`: Dashboard header, avatar display.
- `src/components/AppScreen.tsx`: Top navbar avatar, session sync, view routing.
- `src/components/GuruPresensi.tsx`: Teacher attendance options and submission.
- `src/app/api/attendance/route.ts`: Attendance backend endpoint.
- `src/components/GuruJurnal.tsx`: Teacher journal, gallery upload, GPS capture.
- `src/components/SuperadminView.tsx`: School configuration modal.
- `src/components/AdminVerifView.tsx` & `src/components/RekapJurnalView.tsx`: Location and upload time display.
- `tests/`: Automated unit & integration tests.

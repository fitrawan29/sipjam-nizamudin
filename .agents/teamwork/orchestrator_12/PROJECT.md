# Project: SIPJAM - Mode Presensi Siswa Per-Sekolah (QR vs Manual)

## Architecture
SIPJAM is a multi-tenant school operations platform built on Next.js 16 + React 19 + TypeScript + Supabase.
Each tenant is identified by `sekolah_id` (UUID in `public.sekolah`).
The student attendance system records attendance into `public.presensi_siswa` with columns:
`id`, `sekolah_id`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `status` ('datang' | 'pulang'), `jam`, `timestamp`, `device_id`.
A unique constraint `(sekolah_id, tanggal, siswa_id, status)` prevents duplicates.

Now, a per-school configuration `mode_presensi_siswa` (`'qr'` | `'manual'`) in `public.sekolah` determines how attendance is recorded in the Piket module:
- `'qr'`: Teacher uses camera scanner or USB HID barcode/QR scanner.
- `'manual'`: Teacher checks student arrival and departure one by one on a class checklist.
Both modes write to the exact same `presensi_siswa` schema, allowing downstream consumers (`RekapSiswaView`, `GuruJurnal`) to read seamlessly without schema changes.

## Code Layout
- Migrations: `supabase/migrations/20261004_add_mode_presensi_siswa_to_sekolah.sql`
- Types: `src/types/database.ts`
- Superadmin UI: `src/components/SuperadminView.tsx`
- Piket Module: `src/components/PiketView.tsx`
- Downstream Views: `src/components/RekapSiswaView.tsx`, `src/components/GuruJurnal.tsx`
- Attendance Helper: `src/lib/qrSiswa.ts`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Schema & Migration | Add `mode_presensi_siswa` column with default `'qr'` and constraint `('qr', 'manual')` | M1 | R1 |
| 2 | TypeScript Definitions | Add `mode_presensi_siswa` to `sekolah.Row`, `Insert`, `Update`, and export `ModePresensiSiswa` | M1 | R1 |
| 3 | Superadmin Add/Edit UI | Add `mode_presensi_siswa` select to Add & Edit School modals in `SuperadminView.tsx` | M2 | R2 |
| 4 | Superadmin Badge & Toggle | Display mode badge in school table and provide quick toggle handler | M2 | R2 |
| 5 | Piket Mode Fetching | In `PiketView.tsx`, fetch school's `mode_presensi_siswa` by `user.sekolah_id` on mount | M3 | R3, R4 |
| 6 | Piket Manual Checklist UI | When mode is `'manual'`, render class-filterable student roster with Datang and Pulang buttons | M3 | R3 |
| 7 | Piket QR Retained | When mode is `'qr'`, retain full camera and USB HID kiosk scanner functionality | M3 | R4 |
| 8 | Downstream Views Check | Ensure `RekapSiswaView.tsx` and `GuruJurnal.tsx` read manual records seamlessly and neutralize labels | M4 | R5 |
| 9 | Multi-Tenant Isolation | Verify strict multi-tenant boundary per `sekolah_id` across all operations | M4 | AC |
| 10 | Build & Compile Gate | Ensure `tsc --noEmit` exits 0 and `npm run build` succeeds | M4 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Database Migration & Types | Migration SQL file, apply migration to remote Supabase, update `src/types/database.ts` | none | DONE |
| 2 | M2: Superadmin Configuration UI | `SuperadminView.tsx` add/edit form, save handlers, badges, quick toggle | M1 | DONE |
| 3 | M3: Piket View QR vs Manual | `PiketView.tsx` school mode fetch, manual class checklist UI, record saving via `recordPresensiSiswa` | M1, M2 | PLANNED |
| 4 | M4: Downstream Alignment & Verification | `RekapSiswaView.tsx`, `GuruJurnal.tsx`, multi-tenant isolation, build and test gates | M3 | PLANNED |

## Interface Contracts
### `public.sekolah` ↔ `AppScreen` / `SuperadminView` / `PiketView`
- Column: `mode_presensi_siswa TEXT NOT NULL DEFAULT 'qr'`
- Allowed values: `'qr'`, `'manual'`
- RLS: Superadmin can UPDATE all; Admin can UPDATE own school; Users can SELECT own school where `id = get_auth_user_sekolah_id()`.

### `PiketView` (Manual mode) ↔ `public.presensi_siswa`
- In manual mode, marking student arrival/departure calls:
  `recordPresensiSiswa(supabase, { siswa, status: 'datang' | 'pulang', sekolahId: user.sekolah_id, deviceId: 'manual' })`
- Writes to `public.presensi_siswa` with fields:
  `{ sekolah_id, siswa_id, nisn, nama_siswa, kelas, tanggal, status, jam, timestamp, device_id: 'manual' }`
- Unique constraint `uq_presensi_siswa_status` enforces single datang and single pulang per student per date.

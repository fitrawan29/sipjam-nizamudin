# Project: SIPJAM — Chat Removal, QR Siswa Presensi, Piket/Wali Kelas Reporting & Guru Mapel Sync

## Architecture
- **Stack**: Next.js 16.3.4 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase (PostgreSQL + PostgREST).
- **Authentication & Roles**: Roles are `'superadmin'`, `'admin'`, and `'guru'`. User identity maintained in `users` and `data_guru`.
- **Multi-tenant Data Flow**: All operational queries are strictly partitioned by `sekolah_id`.
- **Database Schema Additions**:
  - `data_siswa`: Column `qr_code TEXT` storing unique QR identifier (fallback to NISN or UUID).
  - `presensi_siswa`: New attendance table tracking gate check-ins (datang / pulang) by Piket with unique constraint `(sekolah_id, tanggal, siswa_id, status)`.
- **Scanner Kiosk Architecture**:
  - `PiketView.tsx` with dedicated Scan tab.
  - Native Web API `BarcodeDetector` / camera stream for browser scanning.
  - External USB HID barcode/QR scanner via auto-focused text input listening to Enter key event.
  - Concurrent operation: supports up to 10 independent kiosks/tabs concurrently via idempotent PostgreSQL upserts and Supabase realtime synchronization.
- **Reporting & Sync**:
  - `PiketView.tsx`: Live daily gate attendance log and summary.
  - `RekapSiswaView.tsx`: Wali Kelas filtered view for assigned class daily gate attendance.
  - `GuruJurnal.tsx`: Synchronization showing students who checked in with Piket (`Hadir di Sekolah`) when teacher opens active class journal.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: Hapus ChatView Component & File | Delete `src/components/ChatView.tsx` without leaving broken references | M1 | Survey 1 | DONE |
| 2 | R1: Hapus ChatView References di AppScreen | Remove import, `view-chat` menu item in `menuItemsGuru` & `menuItemsAdmin`, and route render in `src/components/AppScreen.tsx` | M1 | Survey 1 | DONE |
| 3 | R1: Audit Test Guard for ChatView | Update `tests/ui_ux_improvements_audit.test.ts` to guard or adapt `ChatView.tsx` existence check so `npm test` passes cleanly | M1 | Survey 1 | DONE |
| 4 | R2: Database Migration Siswa QR & Presensi | Migration SQL adding `qr_code` to `data_siswa` and creating table `presensi_siswa` with multi-tenant RLS & unique constraint | M2 | Survey 2 | DONE |
| 5 | R2: Student QR Generation & Export Mechanism | Mechanism to generate/populate unique QR identifiers (`data_siswa.qr_code`) and display/print student QR codes in Admin/Piket | M2 | Survey 2 | DONE |
| 6 | R2: PiketView Scanner UI & Multi-Input | Dedicated Scan tab in `PiketView.tsx` with Datang/Pulang toggle, camera Web API scanner, and USB HID scanner input (text + Enter) | M3 | Survey 2 | DONE |
| 7 | R2: 10-Unit Hardware Scanner Concurrency | Robust concurrency handling for up to 10 simultaneous kiosk scanner windows with idempotent upsert and audio/visual feedback | M3 | Survey 2 | DONE |
| 8 | R3: Piket Attendance Daily Log & Summary | Real-time table and status summary of today's scanned students in `PiketView.tsx` | M3 | Survey 2 & 3 | DONE |
| 9 | R3: Wali Kelas Attendance Report | Daily gate attendance report by class in `RekapSiswaView.tsx` for teachers assigned as Wali Kelas | M4 | Survey 3 | PLANNED |
| 10 | R4: Guru Mapel Attendance Sync | In `GuruJurnal.tsx`, display gate arrival status (`Hadir di Sekolah` vs `Belum Scan`) in student list for today's teaching schedule | M4 | Survey 3 | PLANNED |
| 11 | Multi-Tenant Data Isolation Guard | Ensure all queries for `presensi_siswa`, `data_siswa`, and schedules strictly filter by `sekolah_id` | M2, M3, M4 | Dispatch | IN_PROGRESS |
| 12 | Comprehensive Verification, Build & Git Delivery | Automated test suite verification, `npx tsc --noEmit`, `npm run build`, and automatic git commit & push per GEMINI.md | M5 | Dispatch & GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Hapus Fitur Chat Guru & Test Fix | Delete `ChatView.tsx`, remove references from `AppScreen.tsx`, adjust `ui_ux_improvements_audit.test.ts` | none | DONE |
| M2 | Database Migrations & QR Code Siswa Mechanism | Migration SQL (`data_siswa.qr_code`, `presensi_siswa`), QR generation/display helper | M1 | DONE |
| M3 | PiketView QR Scanner (Camera + USB HID 10-Unit) & Piket Daily Report | `PiketView.tsx` Scan tab, camera & USB HID handler, multi-kiosk concurrency, daily scan log | M2 | DONE |
| M4 | Laporan Wali Kelas & Sinkronisasi Guru Mapel | `RekapSiswaView.tsx` Wali Kelas reporting, `GuruJurnal.tsx` student arrival status sync | M2, M3 | IN_PROGRESS |
| M5 | E2E Testing, Build & Git Delivery | Comprehensive automated tests, `npx tsc --noEmit`, `npm run build`, git commit & push | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Database Schema (`presensi_siswa`)
- Columns:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `sekolah_id`: UUID NOT NULL REFERENCES sekolah(id)
  - `siswa_id`: UUID NOT NULL REFERENCES data_siswa(id) ON DELETE CASCADE
  - `nisn`: TEXT
  - `nama_siswa`: TEXT NOT NULL
  - `kelas`: TEXT NOT NULL
  - `tanggal`: DATE NOT NULL DEFAULT CURRENT_DATE
  - `status`: TEXT NOT NULL CHECK (status IN ('datang', 'pulang'))
  - `jam`: TIME NOT NULL DEFAULT CURRENT_TIME
  - `timestamp`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `device_id`: TEXT DEFAULT 'kiosk-default'
- Constraint:
  - `UNIQUE (sekolah_id, tanggal, siswa_id, status)`
- RLS Policy:
  - Select/Insert/Update enabled for authenticated users where `sekolah_id` matches user session `sekolah_id`.

### 2. Student QR Identifier (`data_siswa.qr_code`)
- Value format: string identifier (e.g. NISN or UUID or `QR-SISWA-${id}`).
- Resolution query:
  `.or(\`qr_code.eq.\${code},nisn.eq.\${code},id.eq.\${code}\`)` scoped by `.eq('sekolah_id', sekolah_id)`.

### 3. Piket Scanner Input Contract
- Input modes:
  1. Camera: HTML5 Video + `BarcodeDetector` API (or fallback canvas scanning).
  2. Hardware USB HID: Text input field auto-focused; on `keydown (Enter)`, read string value, trim, trigger scan handler, clear input, and re-focus.
- Upsert logic:
  - Check mode (`datang` or `pulang`).
  - Upsert into `presensi_siswa` on conflict `(sekolah_id, tanggal, siswa_id, status)` DO UPDATE SET `jam = EXCLUDED.jam, timestamp = EXCLUDED.timestamp`.

### 4. Guru Mapel Sync Contract (`GuruJurnal.tsx`)
- When active class is selected for today:
  - Query: `supabase.from('presensi_siswa').select('siswa_id, status, jam').eq('sekolah_id', user.sekolah_id).eq('tanggal', todayDate).eq('kelas', activeKelas).eq('status', 'datang')`
  - Map results by `siswa_id`:
    - If present: show badge `✓ Hadir di Sekolah (Jam ${jam})`
    - If not present: show badge `Belum Scan Piket`

## Code Layout
- `supabase/migrations/`: Migration scripts (`20261003_qr_presensi_siswa.sql`).
- `src/components/AppScreen.tsx`: Top layout, navigation menu items, view switcher.
- `src/components/PiketView.tsx`: Piket management, Scan kiosk tab, daily gate attendance log.
- `src/components/RekapSiswaView.tsx`: Student attendance recap, Wali Kelas gate attendance view.
- `src/components/GuruJurnal.tsx`: Teacher journal, class selection, live attendance sync with gate scan.
- `src/lib/`: Helpers for QR generation and Supabase client queries.
- `tests/`: Automated unit & E2E tests verifying all requirements.

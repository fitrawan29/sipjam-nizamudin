# DISPATCH — worker_o10_m2

## Milestone
Milestone 2 (M2): Database Migrations & QR Code Siswa Mechanism

## Scope & Instructions
1. Read `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o10_2\report.md`.
3. Create Supabase migration file `supabase/migrations/20261003_qr_presensi_siswa.sql`:
   - Add column `qr_code TEXT` to `data_siswa`.
   - Update existing rows in `data_siswa` where `qr_code IS NULL` to set `qr_code = COALESCE(NULLIF(nisn, ''), id::text)`.
   - Create table `presensi_siswa`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID NOT NULL REFERENCES sekolah(id)`
     - `siswa_id UUID NOT NULL REFERENCES data_siswa(id) ON DELETE CASCADE`
     - `nisn TEXT`
     - `nama_siswa TEXT NOT NULL`
     - `kelas TEXT NOT NULL`
     - `tanggal DATE NOT NULL DEFAULT CURRENT_DATE`
     - `status TEXT NOT NULL CHECK (status IN ('datang', 'pulang'))`
     - `jam TIME NOT NULL DEFAULT CURRENT_TIME`
     - `timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - `device_id TEXT DEFAULT 'kiosk-default'`
     - `CONSTRAINT uq_presensi_siswa_status UNIQUE (sekolah_id, tanggal, siswa_id, status)`
   - Enable RLS on `presensi_siswa` and add multi-tenant policies.
   - Add indexes for performant lookups by `(sekolah_id, tanggal, kelas)` and `(sekolah_id, siswa_id)`.
4. Apply the migration / execute SQL if supabase connection is available, or ensure schema is created.
5. Create QR utility/helper `src/lib/qrSiswa.ts`:
   - Generate student QR identifier / QR data URL or SVG.
   - Lookup function to resolve student by code (`qr_code`, `nisn`, or `id`) with `sekolah_id` filter.
   - Generate / update QR code in `data_siswa` if empty.
6. In `src/components/AdminDataView.tsx` (or student management view):
   - Display QR code badge/button for students so admins/piket can view or print student QR codes.
7. Run `npx tsc --noEmit` and tests.
8. Follow GEMINI.md git workflow: git status -> git add . -> git commit -m "..." -> git push origin main.
9. Deliver handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m2\handoff.md`.


## 2026-10-03T20:27:32Z
You are Worker 2 (worker_o10_m2) for sipjam-app.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m2
Dispatch file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m2\DISPATCH.md
ORIGINAL_REQUEST.md path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Explorer Report path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o10_2\report.md

You MUST read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md first before starting work.
Also read node_modules/next/dist/docs/ as instructed by AGENTS.md before writing any Next.js code.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope: Milestone 2 (M2) — Database Migrations & QR Code Siswa Mechanism
1. Create Supabase migration file `supabase/migrations/20261003_qr_presensi_siswa.sql`:
   - Add column `qr_code TEXT` to `data_siswa`.
   - Update existing rows in `data_siswa` where `qr_code IS NULL` to set `qr_code = COALESCE(NULLIF(nisn, ''), id::text)`.
   - Create table `presensi_siswa`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID NOT NULL REFERENCES sekolah(id)`
     - `siswa_id UUID NOT NULL REFERENCES data_siswa(id) ON DELETE CASCADE`
     - `nisn TEXT`
     - `nama_siswa TEXT NOT NULL`
     - `kelas TEXT NOT NULL`
     - `tanggal DATE NOT NULL DEFAULT CURRENT_DATE`
     - `status TEXT NOT NULL CHECK (status IN ('datang', 'pulang'))`
     - `jam TIME NOT NULL DEFAULT CURRENT_TIME`
     - `timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - `device_id TEXT DEFAULT 'kiosk-default'`
     - `CONSTRAINT uq_presensi_siswa_status UNIQUE (sekolah_id, tanggal, siswa_id, status)`
   - Enable RLS on `presensi_siswa` and add multi-tenant policies.
   - Add indexes on `(sekolah_id, tanggal, kelas)` and `(sekolah_id, siswa_id)`.
2. Apply the migration using Supabase CLI / MCP execute_sql if available, or ensure migration file is completely valid and tested.
3. Create helper `src/lib/qrSiswa.ts`:
   - Generate student QR identifier / QR display data.
   - Lookup function to resolve student by code (`qr_code`, `nisn`, or `id`) filtered by `sekolah_id`.
   - Function to record/upsert presensi siswa into `presensi_siswa` (supporting both 'datang' and 'pulang') with conflict handling.
4. In `src/components/AdminDataView.tsx` (or student data table):
   - Add QR code action/badge so admins can view/print student QR codes.
5. Run `npx tsc --noEmit` and `npm test` to verify build and test health.
6. Per GEMINI.md:
   a. git status
   b. git add .
   c. git commit -m "feat(qr): add qr_code to data_siswa, create presensi_siswa table and qrSiswa helpers"
   d. git push origin main
7. Write your handoff report to:
   c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m2\handoff.md
8. Use send_message to report completion back to parent.

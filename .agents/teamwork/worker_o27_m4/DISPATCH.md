## 2026-11-05T16:45:49Z

You are worker_o27_m4. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m4\

MANDATORY: Read the authoritative request before starting work:
- Path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project scope: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Investigation blueprint: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_3\report.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o27_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of Milestone M4 (R5: Master Data Templates, System & DB Persistence, & Akun):
Files you have exclusive write ownership over:
- src/components/AdminDataView.tsx
- src/lib/dataIntegrityGuard.ts
- src/components/AdminConfigView.tsx
- src/components/AccountSettingsModal.tsx

Tasks to implement:
1. Penyesuaian Template Data & Sanitasi CSV (Master Data & Kalender):
   - In `src/components/AdminDataView.tsx` (around lines 223–232):
     In `Kalender_Pendidikan` and `Jadwal_Pelajaran` CSV templates, remove `'id'` from `headers` and remove sample non-UUID IDs (`'KP-01'`, `'JP-01'`) from `sample`.
   - In `src/lib/dataIntegrityGuard.ts` and `src/components/AdminDataView.tsx`:
     Sanitize any uploaded CSV rows targeting UUID-keyed tables (`kalender_pendidikan`, `jadwal_pelajaran`). If an `id` field is missing, empty, or not a valid UUID format (e.g. string like `'KP-01'`), delete it or replace with `crypto.randomUUID()` so PostgreSQL Error 22P02 (`invalid input syntax for type uuid`) is completely prevented.
2. Persistensi Konfigurasi Sistem & Database pada Seluruh Sub Menu:
   - In `src/components/AdminConfigView.tsx`:
     Add `noValidate` attribute to `<form onSubmit={handleSave} noValidate>` so that hidden inactive tabs with `required` inputs (like `waktu_efektif_mulai`, `kop_sekolah`, etc.) do not cause browser HTML5 native validation to silently abort form submission.
   - In `AdminConfigView.tsx` `handleSave`:
     Persistently update all school profile fields (`nama`, `alamat`, `npsn`, `kota_kabupaten`, `logo`) into the `sekolah` table (via Supabase) in addition to `pengaturan`, ensuring changes save reliably to the database and system.
3. Penghapusan Fitur Penambahan Gelar pada Pengaturan Akun:
   - In `src/components/AccountSettingsModal.tsx`:
     Completely remove the Multi-Gelar Manager section (lines 539–630), including the "+ Tambah Gelar" button, quick chips, and degree input rows.
     Simplify the name input field to a single `Nama Lengkap *` input.

Verification requirements:
- Run `npx tsc --noEmit` -> 0 errors.
- Run `npm test` -> all test suites pass with 0 failures.
- Deliver `handoff.md` in your working directory and notify parent.

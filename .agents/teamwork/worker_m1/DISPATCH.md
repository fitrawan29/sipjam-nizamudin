## 2026-11-02T12:39:28Z

You are worker_m1.
Your role: teamwork_worker.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASK ASSIGNMENT — Milestone 1: Database Schema, Types & Admin Configuration UI

1. Background & References:
   - Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
   - Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
   - Read explorer survey findings in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\analysis.md and handoff.md

2. Scope & File Ownership:
   You own the following files exclusively:
   - `supabase/migrations/20261102_flexible_sistem_blok.sql` (create this migration)
   - `src/types/database.ts` (update `sistem_blok` Row, Insert, Update, and `SistemBlok`)
   - `src/components/SistemBlokView.tsx` (update UI for target scope & time range configuration)

3. Detailed Requirements:
   A. Migration & Database Schema:
      - Create migration `supabase/migrations/20261102_flexible_sistem_blok.sql` adding:
        * `tipe_target TEXT NOT NULL DEFAULT 'sekolah' CHECK (tipe_target IN ('sekolah', 'angkatan', 'kelas', 'guru'))`
        * `target_angkatan TEXT DEFAULT NULL`
        * `target_kelas TEXT DEFAULT NULL`
        * `target_guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL DEFAULT NULL`
        * `target_guru_nama TEXT DEFAULT NULL`
        * `is_full_day BOOLEAN NOT NULL DEFAULT true`
        * `jam_mulai TEXT DEFAULT NULL`
        * `jam_selesai TEXT DEFAULT NULL`
      - Execute this migration or add these columns to the live Supabase database using Supabase client in a script if needed, ensuring backward compatibility (`tipe_target = 'sekolah'`, `is_full_day = true`).
   B. TypeScript Database Types:
      - In `src/types/database.ts`, update `sistem_blok` table definition (`Row`, `Insert`, `Update`) with these fields.
   C. Admin Configuration UI (`src/components/SistemBlokView.tsx`):
      - Target scope configuration:
        * Option selector: Keseluruhan Sekolah (`sekolah`), Per Angkatan (`angkatan`), Per Kelas (`kelas`), Per Guru (`guru`).
        * Dynamic input according to chosen target:
          - If `angkatan`: Dropdown for angkatan (e.g. 10/X, 11/XI, 12/XII or derived from existing classes).
          - If `kelas`: Dropdown populated from classes in school (fetch from `data_siswa` or existing class list).
          - If `guru`: Dropdown populated from active teachers in school (fetch from `data_guru`).
          - If `sekolah`: Displays informative message that rule applies to entire school.
      - Time range configuration:
        * Toggle / checkbox: "Berlaku Sepanjang Hari" (`is_full_day`, default true).
        * If not full day: show `jam_mulai` and `jam_selesai` inputs.
        * Validation: if not full day, both `jam_mulai` and `jam_selesai` are required, and `jam_mulai < jam_selesai`.
      - CRUD persistence:
        * Save handler (`handleSave`): correctly writes all target attributes and time range attributes to Supabase.
        * Edit handler (`handleEdit`): pre-populates all target attributes and time range attributes in form state.
        * Reset handler: resets all target and time fields to defaults.
      - Rule Display (Table / Cards):
        * Add informative badges showing target scope (e.g. "Semua Sekolah", "Angkatan 10", "Kelas X-A", "Guru: Bpk. Budi").
        * Add informative badges showing time range (e.g. "Sepanjang Hari" or "07:30 - 10:00").
   D. Verification:
      - Run TypeScript check: `npx tsc --noEmit`
      - Run test suite: `npx tsx tests/sistem_blok_verification.test.ts` (all 85 existing tests MUST pass without failure).

4. Deliverables:
   - Write comprehensive report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md
   - Include command outputs and verification evidence in handoff.
   - Send completion message to orchestrator when finished.

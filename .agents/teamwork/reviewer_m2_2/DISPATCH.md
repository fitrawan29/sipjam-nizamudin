## 2026-11-06T00:58:48Z
You are a Teamwork Reviewer for Milestone 2 (Penyelarasan Template Master Data & Impor CSV).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Worker handoff report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before reviewing.

Scope of Review:
1. Examine data integrity, idempotency, and error boundaries:
   - Does student import idempotently match existing students by `(sekolah_id, nisn)` so re-uploading an updated roster updates existing records instead of duplicating them?
   - Does `data_kelas` upsert handle `isSchemaCacheError` (`PGRST205` / `42P01`) defensively without throwing unhandled exceptions?
   - Are anti-dummy, anti-22P02, and anti-23502 protections preserved across all 7 tables?
2. Run verification commands:
   - `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`
   - `npx tsx tests/production_admin_adjustments.test.ts`
   - `npx tsc --noEmit`
3. Document observations, logic chain, caveats, and state your final verdict:
   `VERDICT: APPROVE` or `VERDICT: REQUEST_CHANGES`
   in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_2\handoff.md
4. Send a brief message back to the orchestrator when done.

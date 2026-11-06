## 2026-11-06T00:24:13Z
You are a Teamwork Challenger for Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m1_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Worker handoff report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before challenging.

Your task:
Empirically test the correctness, invariants, and edge cases of the centralized class allocation mechanism in `src/components/AdminKelasView.tsx` and `src/components/AdminDataView.tsx`:
1. Check or write an automated execution script to test:
   - Aggregation of class cards from students and homeroom records.
   - Student movement logic: moving student from Class A to Class B updates class attributes cleanly.
   - Allocating unassigned students (`kelas = null` or `''`) into a designated class.
   - Cascading rename of a class across `data_siswa`, `wali_kelas`, and `jadwal_pelajaran`.
   - Prevention of class deletion when students are still enrolled.
   - Multi-tenant tenant isolation (`sekolah_id`).
2. Run your challenge script and existing test suites:
   - `npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts`
   - `npx tsc --noEmit`
3. Document empirical test results, stress outcomes, and state your final verdict:
   `VERDICT: APPROVE` or `VERDICT: REQUEST_CHANGES`
   in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m1_1\handoff.md
4. Send a brief message back to the orchestrator when done.

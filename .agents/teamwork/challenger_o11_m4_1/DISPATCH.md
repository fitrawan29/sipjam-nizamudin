# Dispatch — challenger_o11_m4_1

## Identity
- Role: Challenger (Empirical Verifier)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o11_m4_1
- Parent: orchestrator_11 (71224a06-b69c-4ce9-8bfe-d2e6923181fe)

## Task Description
Empirically verify and challenge Milestone 4: Laporan Wali Kelas & Sinkronisasi Guru Mapel.
Execute stress tests and adversarial edge cases on:
- `RekapSiswaView.tsx` (filtering by Wali Kelas assigned class vs admin, empty records, missing dates, multiple schools)
- `GuruJurnal.tsx` (live gate badge sync, timestamp formats, Terapkan Presensi Piket button)
- `workflow.ts` (multi-tenant scoping)
- `tests/m4_wali_kelas_guru_sync.test.ts`
- `PROJECT.md`: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- `ORIGINAL_REQUEST.md`: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Write test harness in `tests/` if needed, execute tests, inspect results, and write handoff.md with verdict: APPROVE or REJECT.

## 2026-10-04T00:44:30Z
You are challenger_o11_m4_1, an empirical challenger.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o11_m4_1
Read DISPATCH.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o11_m4_1\DISPATCH.md
Read ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Read PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
Read worker handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m4\handoff.md

Empirically test and stress-test Milestone 4 (Wali Kelas report and Guru Mapel sync).
Write and run tests in tests/ to challenge:
- Edge cases in date formats, empty attendance, missing classes
- Wali Kelas vs Admin permissions and filtering
- Multi-tenant school isolation
- Roll call synchronization logic in GuruJurnal
Write your handoff.md in your working directory with explicit verdict: APPROVE or REJECT.
Send completion message to parent.

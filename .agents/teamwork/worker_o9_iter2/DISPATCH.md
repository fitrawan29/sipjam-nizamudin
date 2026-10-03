# Dispatch for worker_o9_iter2

You are worker_o9_iter2 (teamwork_preview_worker).
Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o9_iter2
Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_9\SCOPE.md

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Task
Apply the verified regex fix in `src/components/RekapJurnalView.tsx`:
1. In `formatAbsensi`, update lines 255–258 from:
   ```tsx
   const hadirMatch = km.match(/(?:Hadir|Hadir siswa)(?:\s*:|\s+)(\d+)/i);
   const izinMatch = km.match(/Izin(?:\s*:|\s+)(\d+)/i);
   const sakitMatch = km.match(/Sakit(?:\s*:|\s+)(\d+)/i);
   const alpaMatch = km.match(/Alpa(?:\s*:|\s+)(\d+)/i);
   ```
   to:
   ```tsx
   const hadirMatch = km.match(/(?:Hadir|Hadir siswa)(?:\s*:\s*|\s+)(\d+)/i);
   const izinMatch = km.match(/Izin(?:\s*:\s*|\s+)(\d+)/i);
   const sakitMatch = km.match(/Sakit(?:\s*:\s*|\s+)(\d+)/i);
   const alpaMatch = km.match(/Alpa(?:\s*:\s*|\s+)(\d+)/i);
   ```
2. Update lines 287–290 from:
   ```tsx
   const h = parseInt(raw.match(/H:(\d+)/i)?.[1] || '0', 10);
   const i = parseInt(raw.match(/I:(\d+)/i)?.[1] || '0', 10);
   const s = parseInt(raw.match(/S:(\d+)/i)?.[1] || '0', 10);
   const a = parseInt(raw.match(/A:(\d+)/i)?.[1] || '0', 10);
   ```
   to:
   ```tsx
   const h = parseInt(raw.match(/H\s*:\s*(\d+)/i)?.[1] || '0', 10);
   const i = parseInt(raw.match(/I\s*:\s*(\d+)/i)?.[1] || '0', 10);
   const s = parseInt(raw.match(/S\s*:\s*(\d+)/i)?.[1] || '0', 10);
   const a = parseInt(raw.match(/A\s*:\s*(\d+)/i)?.[1] || '0', 10);
   ```
3. Run verification tests:
   - `npx tsx tests/adversarial_challenge_r1_r2_r3.test.ts` (all 42 assertions must pass)
   - `npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts` (all 14 assertions must pass)
   - `npx tsc --noEmit`
   - `npm run build`
   - `npm test`
4. Git workflow:
   - `git status`
   - `git add .`
   - `git commit -m "fix(rekap): perbaiki regex parsing kehadiran murid historis"`
   - `git push origin main`
5. Write your complete handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o9_iter2\handoff.md`.

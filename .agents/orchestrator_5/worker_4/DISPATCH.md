## 2026-09-11T23:01:02Z

You are Worker 4 (teamwork_preview_worker).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\worker_4

Read the authoritative user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
Also refer to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\SCOPE.md
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\challenger_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context:
Challenger 2 discovered 2 real-world defects in `src/lib/workflow.ts` schedule matching:
1. Pak Riski Candra Mamangkai (username: 'Riski') does not match 'Rizki' in `jadwal_pelajaran` due to 's' vs 'z' spelling. He gets 0 classes on Mondays and Thursdays.
2. Ibu Assyfa Fitra Azzahrah Abukasim (username: 'Assyfa') has 'Fitra' in her middle name. Because `workflow.ts` checked `guruWords.includes(jNama)`, she falsely matched Pak Fitra's 3 PJOK classes, locking her Presensi Pulang checkout.

Your Tasks:
1. Update `src/lib/workflow.ts`:
   - Enhance `findJadwalForGuru(hari: string, namaGuru: string, username?: string)`:
     - Allow optional `username?: string`.
     - Normalize phonetic/spelling variations (e.g. `s.toLowerCase().replace(/z/g, 's')` so `'rizki'` matches `'riski'`).
     - Prioritize username matching if provided (`userLower === jLower`, etc.).
     - For full name matching, match first name:
       `const firstName = namaLower.split(/\s+/)[0];`
       If `firstName` matches `jNama` (or startsWith), match.
       Do NOT match middle/last name tokens if the first name is different (e.g. `"assyfa"` must NOT match `"fitra"`!).
   - In `getGuruDailyState(namaGuru: string, username?: string)`:
     - Pass `username` to `findJadwalForGuru(selectedHari, namaGuru, username)`.

2. Update `src/components/HomeView.tsx`:
   - Pass `user.username` when invoking `getGuruDailyState(user.nama, user.username)`.

3. Update `public.jadwal_pelajaran` in Supabase:
   - Execute SQL query to standardize spelling:
     `UPDATE public.jadwal_pelajaran SET nama_guru = 'Riski' WHERE nama_guru = 'Rizki';`
   - Save this update in migration script or record it.

4. Update `tests/dailyScheduleAndFixes.test.ts`:
   - Add test cases verifying:
     - `findJadwalForGuru("Senin", "Riski Candra Mamangkai", "Riski")` returns the 2 Sejarah classes.
     - `findJadwalForGuru("Rabu", "Assyfa Fitra Azzahrah Abukasim", "Assyfa")` returns 0 classes (`[]`).
     - `findJadwalForGuru("Rabu", "FITRA SURYAZANA MAMONTO", "Fitra")` returns the 3 PJOK classes.

5. Validate:
   - `npm test`
   - `node --env-file=.env.local -r tsx/cjs tests/dailyScheduleAndFixes.test.ts`
   - `npx tsc --noEmit` (must have 0 errors).

6. Execute Git Workflow (per GEMINI.md):
   - git status
   - git add .
   - git commit -m "fix(schedule): resolve Riski/Rizki alias and prevent Assyfa/Fitra token collision"
   - git push origin main

Write your completion and handoff report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\worker_4\handoff.md
Send a message with your report path when done.

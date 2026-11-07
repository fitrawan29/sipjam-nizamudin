## 2026-11-07T09:59:59Z
You are Worker M5 (worker_o28_m5).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m5
Workspace: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY REFERENCES:
Before starting work, read:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4_2\handoff.md
4. c:\Users\Fitra\OneDrive\Documents\sipjam-app\GEMINI.md (Mandatory Git Workflow Rule)

TASKS FOR MILESTONE M5 (R6 - Zero Regression & Git Delivery):
1. Create a comprehensive, holistic regression test suite in `tests/production_admin_adjustments_m5.test.ts` covering:
   - R1: Admin school greeting name deduplication & removal of info center card in HomeViewAdmin.tsx.
   - R2: Admin verification center: descending presence history, "Bebas Hadir" status badge, piket auto-marking "tidak membuat laporan piket", 1 upload per subject per grade level in DokumenView.tsx, and auto-filled KBM journal on leave.
   - R3: Deduplication of teacher "Ade Fitrawan Ibrahim" into single row in AdminRekapView.tsx.
   - R4: Gradebook active semester & dynamic attendance point weights.
   - R5: System full ZIP backup and topological restore engine: 33 entities across Levels 0–5 in `src/lib/backupEngine.ts`, `manifest.json`, `data/` and `foto/` folders, view safety (`guru_kelas`), non-destructive backup.
   - R6: AST root invariant in AdminBackupView.tsx (`<div id="view-admin-backup" className="space-y-4 fade-in">`) and clean package.json dependencies.
2. Run Typecheck & Verification:
   - Run `npx tsc --noEmit` -> ensure 0 errors.
   - Run `npm run build` -> ensure Next.js production build succeeds.
   - Note on PowerShell environment: if PowerShell encounters .NET CLR issue during `run_command`, run node/tsx directly or document verification method thoroughly.
3. MANDATORY GIT DELIVERY KE BRANCH MAIN:
   Strictly execute the Git workflow mandated by GEMINI.md:
   - `git status`
   - `git add .`
   - `git commit -m "feat(admin): complete M4 backup-restore ZIP 33 tables and M5 zero-regression test suite"`
   - `git push origin main`
4. Document all verification steps, test output, and git push results in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m5\handoff.md`.
5. Update progress.md before finishing and report back via send_message.

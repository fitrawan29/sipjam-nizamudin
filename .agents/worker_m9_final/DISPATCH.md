# Worker Task Assignment: Final Remediation for Milestone 9

## Scope and Owned Files
- `src/app/api/push/send-reminders/route.ts`
- `tests/m9_4_chat_and_notifications.test.ts`

## Mandatory Requirements
1. Read `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md` and `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`.
2. Inspect `src/app/api/push/send-reminders/route.ts` and `tests/m9_4_chat_and_notifications.test.ts`.
3. In `src/app/api/push/send-reminders/route.ts`:
   - Replace the query on `presensi_guru` where `.eq('tanggal', todayStr).eq('jenis', 'Datang')` is used.
   - The actual columns in `public.presensi_guru` are `timestamp` (TIMESTAMPTZ) and `tipe_absen` (TEXT, e.g. "Datang", "Pulang").
   - Query `timestamp` with a range or pattern covering the current date (e.g. `.gte('timestamp', `${todayStr}T00:00:00`).lte('timestamp', `${todayStr}T23:59:59.999`)` or `.gte('timestamp', `${todayStr}T00:00:00.000Z`).lte('timestamp', `${todayStr}T23:59:59.999Z`)` or `.ilike('timestamp', `${todayStr}%`)` - inspect how timestamp is stored in presensi_guru across the codebase and in tests) and filter `.eq('tipe_absen', 'Datang')`.
4. In `tests/m9_4_chat_and_notifications.test.ts`:
   - Update tests to verify that `presensi_guru` is queried using `tipe_absen` and `timestamp`.
5. Run all verification commands:
   - `npx tsx tests/m9_1_database_and_types.test.ts`
   - `npx tsx tests/m9_2_3_verification.test.ts`
   - `npx tsx tests/m9_4_chat_and_notifications.test.ts`
   - `npx tsc --noEmit`
   - `npm run build`
6. Per `GEMINI.md`:
   - Check `git status`
   - Stage changes: `git add .`
   - Commit: `git commit -m "fix(notifications): align presensi_guru schema contract to timestamp and tipe_absen in send-reminders route and tests"`
   - Push to active branch: `git push origin main` (or active branch)
7. Write `handoff.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_final\handoff.md` detailing changes, test command results, and git status/push output.

> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

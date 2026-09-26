# Dispatch: Worker M1 (Implementation Track)

## Assigned Task
Implement genuine fixes for all 5 identified root causes across the codebase:
1. `src/app/page.tsx`: Handle legacy stored sessions in localStorage that lack `session_token`. If `storedUser` lacks `session_token` (or fails verification), purge `localStorage.removeItem('sipjam_user')` and send user to login, or re-verify.
2. `src/lib/workflow.ts`:
   - Line 217: Replace `nama` and `username` query on `data_guru` with valid columns `nama_guru` and `nip`.
   - `findJadwalForGuru`: Combine UUID matches and fuzzy/name matches (deduplicating by `id`) so teachers don't lose unlinked classes.
   - Presensi/Jurnal queries: Safely match by `user_id` OR fallback to teacher name/NIP so historical records aren't dropped.
3. `src/components/AppScreen.tsx` & `src/components/RekapJurnalView.tsx`:
   - Replace `nama.eq...` on `data_guru` with `nama_guru.eq...` and use `user.id` or `nip`.
4. `src/components/GuruJurnal.tsx` & `src/components/HomeView.tsx`:
   - Sanitize teacher name in PostgREST `.or()` filter (e.g. quote `%${name}%` or strip degrees/commas) so academic titles with commas don't trigger `PGRST100`.
5. `src/components/AdminDataView.tsx`:
   - Ensure fallback direct REST fetch includes `x-session-token` and `x-sekolah-id` from active user context.
6. `src/lib/supabaseClient.ts`:
   - Ensure `getTenantSupabaseClient` and test clients can pass `sessionToken` properly.
7. Database / Migrations:
   - Ensure `get_auth_user_sekolah_id()` and `get_auth_user_role()` in PostgreSQL correctly support session token resolution, and backfill `jadwal_pelajaran.user_id` where possible.
8. Run builds and tests to verify no syntax errors or regressions.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

# Dispatch for Worker Remediation M1

## 2026-10-23T20:45:44Z
- Read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Read Challenger 2 handoff at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o23_m1_2\handoff.md
- Read Reviewer 2 handoff at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_o23_m1_2\handoff.md
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m1_remediation

Implement the 4 remediation items:
1. In `src/lib/supabaseClient.ts`: tighten the `/rpc/verify_login` check with `!requestUrlStr.split('?')[0].endsWith('/rpc/verify_login')` in both `masterFetch` and `dynamicTenantFetch`.
2. In `src/components/SuperadminView.tsx`:
   - Remove `created_at` from `.select('id, username, nama, role, sekolah_id, kota_kabupaten')`.
   - Fix `matchingSchoolsCount` empty string leak when `userRegion` is falsy.
   - Use case-insensitive Map deduplication in `getDistinctRegions()`.
3. In `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`: add RLS policies for `public.sekolah` and `public.sekolah_registry` allowing `dinas_pendidikan` SELECT.
4. Update `tests/adversarial_superadmin_cleanup_reviewer.test.ts` to allow `'dinas'` tab and dinas user management.
5. Verify with `npx tsc --noEmit` and run the tests.
6. Commit changes with a descriptive message and push to origin dev (`git push origin dev`).
7. Write `handoff.md` and notify me via send_message when done.

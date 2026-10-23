# Gate Status — Milestone 1

## Gate — Iteration 1 (Milestone 1)
| Agent | Role | Verdict | Source |
|-------|------|---------|--------|
| worker_o23_m1 | teamwork_preview_worker | DONE (tsc & assertions passed) | handoff.md |
| reviewer_o23_m1_1 | teamwork_preview_reviewer | APPROVE | progress.md |
| reviewer_o23_m1_2 | teamwork_preview_reviewer | REQUEST_CHANGES | handoff.md |
| challenger_o23_m1_1 | teamwork_preview_challenger | APPROVE (149/149 passed) | handoff.md |
| challenger_o23_m1_2 | teamwork_preview_challenger | REQUEST_CHANGES | handoff.md |
| auditor_o23_m1_1 | teamwork_preview_auditor | CLEAN | handoff.md |

Gate Result: **FAIL** (Reviewer 2 & Challenger 2 REQUEST_CHANGES)

### Concrete Remediation Items:
1. `src/lib/supabaseClient.ts`:
   - Tighten mutation guard exception: replace loose `!requestUrlStr.includes('/rpc/verify_login')` with exact pathname check `!requestUrlStr.split('?')[0].endsWith('/rpc/verify_login')` to prevent query string bypass.
2. `src/components/SuperadminView.tsx`:
   - Line 129: Remove non-existent column `created_at` from `.select('id, username, nama, role, sekolah_id, kota_kabupaten')`.
   - Line 1968: Fix `matchingSchoolsCount` leak for unassigned accounts (`const matchingSchoolsCount = userRegion ? satelliteSchools.filter(...).length : 0`).
   - Line 345-353: Case-insensitive map deduplication for `getDistinctRegions()`.
3. `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`:
   - Add RLS SELECT policies for `public.sekolah` and `public.sekolah_registry` for `role = 'dinas_pendidikan'`.
4. `tests/adversarial_superadmin_cleanup_reviewer.test.ts`:
   - Reconcile test expectations to permit the legitimate `'dinas'` tab and user queries so `npm test` passes.

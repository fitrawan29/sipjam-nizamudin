# Dispatch for Test Writer M4 (`tests/dinas_pendidikan_monitoring.test.ts`)

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_o23_m4`

## Authoritative User Request
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read latest request at 2026-10-23T19:45:33Z)

## Project Scope
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_23\PROJECT.md`

## Input Reports
- Explorer 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_3\report.md` (see Section on Test Infrastructure Blueprint)
- Worker M1 Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m1_remediation\handoff.md`
- Worker M2 Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m2\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All test implementations must be genuine. DO NOT create dummy tests, tautological tests (assert(true)), or skip assertions. A teamwork_preview_auditor will independently verify your work.

## Objective
Author the official, comprehensive automated test suite required by Requirement R4 and Acceptance Criteria:
File: `tests/dinas_pendidikan_monitoring.test.ts`

The test file must run via `npx tsx tests/dinas_pendidikan_monitoring.test.ts` and verify:
1. **Suite 1: Superadmin Regional Assignment**
   - Superadmin can assign and update `kota_kabupaten` on users with role `dinas_pendidikan`.
   - Distinct regions extracted from `sekolah` / `sekolah_registry` are case-insensitively deduplicated.
   - Dinas accounts created have `role = 'dinas_pendidikan'`, `sekolah_id = null`, and `kota_kabupaten = assignedRegion`.
2. **Suite 2: Regional Scoping & Zero-Leak Isolation**
   - User with role `dinas_pendidikan` assigned to region A (e.g. "Kota Kotamobagu") only receives schools in region A.
   - Schools in region B (e.g. "Kab. Bolaang Mongondow Timur") or unassigned regions are strictly excluded from school lists, dropdowns, and metrics.
   - Target school switching (`getActiveTargetSchool()`) strictly enforces regional boundary (cross-region returns `null`).
3. **Suite 3: RBAC & Read-Only Isolation**
   - Role `dinas_pendidikan` has default view `'view-dinas-overview'`.
   - Navigation guard in `AppScreen.tsx` blocks mutation views (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`).
   - Network layer mutation guard in `dynamicTenantFetch` & `masterFetch` returns HTTP 403 Forbidden with `{ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }` for POST, PUT, PATCH, DELETE.
   - Drilldown views (`AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`) receive `isReadOnly={true}` and suppress mutation controls.
4. **Suite 4: Executive Aggregation Metrics & Attention Detection**
   - Calculates Total Sekolah Binaan, Kehadiran Guru (%), Kehadiran Siswa (%), Satelit Health, and Sekolah Perlu Perhatian correctly based on region data.
   - Schools with high student alpa (>10%) or low teacher attendance (<70%) are flagged as needing attention.
5. **Suite 5: Drilldown & Session Integrity**
   - Switching target school updates scope to target school ID without corrupting `sipjam_user` or session token.
   - `clearActiveTargetSchool()` cleanly returns to regional dashboard.
6. **Suite 6: Print System Access**
   - Regional summary print view includes `PrintHeader` and `PrintSignature` with GPS metadata.
   - Drilldown print views resolve target school Kop Surat and signatures.

## Verification Command
- `npx tsx tests/dinas_pendidikan_monitoring.test.ts`
- `npx tsc --noEmit`
- `npm test`
Deliver full report in `handoff.md`.


## 2026-10-23T21:21:05Z
Read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Read your assignment at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_o23_m4\DISPATCH.md
Read Explorer 3 blueprint at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_3\report.md
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_o23_m4

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test implementations must be genuine. DO NOT create dummy tests or tautological assertions.

Write the official automated test suite required by Requirement R4:
File: `tests/dinas_pendidikan_monitoring.test.ts`
Implement 6 comprehensive test suites runnable with `npx tsx tests/dinas_pendidikan_monitoring.test.ts`:
1. Superadmin regional assignment (`kota_kabupaten`) to dinas accounts.
2. Regional scoping and zero-leak isolation (dinas login only sees schools in their assigned region; foreign region schools blocked; target school switching boundaries).
3. RBAC & read-only isolation (default view, AppScreen navigation blocking, network layer 403 mutation prevention, isReadOnly prop propagation).
4. Aggregation metrics and attention detection.
5. Drilldown scope switching and session integrity.
6. Print system access.

Run `npx tsx tests/dinas_pendidikan_monitoring.test.ts` and `npx tsc --noEmit`. Ensure all tests pass 100%.
Stage, commit, and push to origin dev (`git push origin dev`).
Write `handoff.md` and notify me via send_message when done.

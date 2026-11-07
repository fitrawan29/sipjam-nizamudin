## 2026-11-07T17:44:32Z
You are Reviewer 2 (reviewer_tu_2) conducting an independent review of the role Tata Usaha ('tata_usaha') implementation in SIPJAM.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_tu_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Worker report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tu\handoff.md
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Read ORIGINAL_REQUEST.md and PROJECT.md before starting.

Review Focus:
1. Examine `src/lib/supabaseClient.ts`, `src/components/AdminDataView.tsx`, and `src/components/AdminPenggunaView.tsx`.
2. Verify mutation security: `isAdminRole('tata_usaha')` must remain strictly `false`; `checkMasterDataMutationGuard` must allow mutations ONLY on `data_siswa` and `data_guru`, while returning 403 Forbidden for all other 14 master data tables.
3. Verify `AdminDataView.tsx`: `tabs` array preserved for AST compatibility; `visibleTabs` filters to Siswa & Guru for TU; `canModify` allows operational CRUD for TU on Siswa & Guru without leaking to other tabs.
4. Verify `AdminPenggunaView.tsx`: Admin can add/edit TU accounts without corrupting teacher account synchronization.
5. Run independent verification commands:
   - `npx tsx tests/master_data_admin_role_restriction.test.ts`
   - `npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`
   - `npx tsc --noEmit`
6. Verify /ponytail compliance (reusing existing components, zero unnecessary bloat).

Deliverable:
Write your structured review report with a clear verdict (APPROVE or REQUEST_CHANGES) to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_tu_2\handoff.md
Notify the orchestrator via send_message when done.

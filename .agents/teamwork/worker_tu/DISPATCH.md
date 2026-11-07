## 2026-11-07T17:19:49Z
You are the Worker agent (worker_tu) tasked with implementing role Tata Usaha ('tata_usaha') and its operational scope for the SIPJAM application following the /ponytail methodology (simplest, shortest diff, zero bloat, 100% reuse).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tu\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before starting.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Authoritative Architecture & Explorer Reports:
Read the findings and blueprints carefully:
- PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- Explorer 1 Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_1\handoff.md
- Explorer 2 Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_2\handoff.md
- Explorer 3 Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_3\handoff.md

### Exclusive Write Ownership:
You own and may edit the following files:
1. `src/types/user.ts` (Add 'tata_usaha' to UserRole & AppUser.role)
2. `src/types/database.ts` (Add 'tata_usaha' to RoleUser)
3. `src/lib/navigation.ts` (Add aliases 'view-data-siswa' & 'view-data-guru' to VIEW_ALIASES; return strictly 2 menu items for 'tatausaha' in getConsolidatedMenuItems; enforce tab RBAC in evaluateTabRBAC)
4. `src/lib/supabaseClient.ts` (Update checkMasterDataMutationGuard to allow data_siswa & data_guru mutations for 'tatausaha', while rejecting other master tables with 403. Keep isAdminRole('tata_usaha') as false!)
5. `src/components/AppScreen.tsx` (Add isTataUsaha check; set landing/default view to 'view-admin-data'; guard view-dokumen with Akses Terblokir; allow view-admin-data for isTataUsaha; exclude isTataUsaha from teacher onboarding tour; preserve AST comment {/* AST preservation: data-tour={item.id} */})
6. `src/components/ClaySidebar.tsx` (Add Tata Usaha role label, fa-id-card-clip icon, badge styling; preserve AST comment)
7. `src/components/AdminDataView.tsx` (Filter tabs array to ['Data_Siswa', 'Data_Guru'] when isTataUsaha; calculate canModify to authorize add/edit/delete/import/export on student & teacher tabs)
8. `src/components/AdminPenggunaView.tsx` (Allow admin to create/manage Tata Usaha accounts without breaking teacher sync)
9. `tests/tata_usaha_role_rbac_and_isolation.test.ts` (Create dedicated test suite testing Auth identity, menu isolation of 2 items, tab RBAC blocks, PostgREST mutation security, and non-regression)
10. `package.json` (Append `&& tsx tests/tata_usaha_role_rbac_and_isolation.test.ts` to "test" script)

### Strict Invariants:
1. In `AppScreen.tsx` and `ClaySidebar.tsx`, you MUST preserve verbatim:
   `{/* AST preservation: data-tour={item.id} */}`
2. `isAdminRole('tata_usaha')` must remain `false`.
3. Do NOT create new page components or duplicate data views — reuse `AdminDataView.tsx`.
4. Role Tata Usaha must have ZERO access to Bank Dokumen / Persuratan (`view-dokumen`), system config (`view-admin-config`, `view-admin-backup`, `view-sistem-blok`), and Superadmin views (`view-superadmin-*`).
5. All existing roles (`superadmin`, `admin`, `guru`, `dinas_pendidikan`, `siswa`, `kepalasekolah`) must remain 100% operative with zero regression.

### Verification Steps Required:
Run the tests and builds, and include their exact outputs in your report:
1. `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`
2. `npx tsx tests/master_data_admin_role_restriction.test.ts`
3. `npx tsx tests/kepsek_pengawas_rbac.test.ts`
4. `npx tsc --noEmit`
5. `npm test`

Write your completion report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tu\handoff.md` and send a message when done.

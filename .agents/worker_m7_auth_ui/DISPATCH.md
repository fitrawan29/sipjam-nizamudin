## 2026-09-12T10:04:04Z

<USER_REQUEST>
You are a Worker subagent for Milestone 7 (M7.2 & M7.3: Superadmin & Admin Hierarchy, Tenant Scoping in UI).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_auth_ui

MANDATORY FIRST STEP:
Read the authoritative user request and architectural files:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_auth_admin\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_db\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL GIT WORKFLOW RULE (from GEMINI.md):
Every time you finish modifying, adding, or deleting files for this task:
1. Check git status (git status)
2. Stage all changed files (git add .)
3. Commit with descriptive message (git commit -m "feat(auth-ui): implement superadmin hierarchy and tenant context scoping")
4. Push immediately to remote branch (git push origin main). Do NOT ask for permission, do it automatically!

FILE OWNERSHIP:
You have exclusive write ownership of:
- `src/components/SuperadminView.tsx` (new)
- `src/app/superadmin/page.tsx` (new)
- `src/components/AppScreen.tsx`
- `src/components/LoginScreen.tsx`
- `src/components/AdminConfigView.tsx`
- `src/components/AdminDataView.tsx`
- `src/components/AdminBackupView.tsx`
- `src/components/PrintHeader.tsx`
(DO NOT TOUCH `RekapJurnalView.tsx`, `RekapSiswaView.tsx`, `AdminRekapView.tsx`, or `PiketView.tsx` - they belong to parallel worker_m7_recap_sorting).

YOUR MISSION:
1. Create `src/components/SuperadminView.tsx`:
   - Tab 1: Platform Overview (metrics: total active/inactive schools, total school admins, total registered teachers & students across schools, quick action buttons).
   - Tab 2: School Management (table listing all schools from `public.sekolah`, search, city filter, status badge; modal to register new school with complete fields: nama, npsn, alamat, kota_kabupaten, provinsi, nama_kepala_sekolah, nip_kepala_sekolah, logo_url, status; modal/action to edit school details or toggle status between 'aktif' and 'nonaktif').
   - Tab 3: School Admin Accounts (table listing admins with role='Admin' from `public.users` joined/labeled with school name; modal to create new School Admin account: username, password, nama, and dropdown selecting `sekolah_id` from active schools).
2. Create deep-link route `src/app/superadmin/page.tsx`:
   - Checks logged-in user in localStorage; if Superadmin, renders Superadmin interface; if not, redirects to `/`.
3. Update `src/components/AppScreen.tsx`:
   - If `user.role === 'Superadmin'`: render `SuperadminView` and render `menuItemsSuperadmin` (Overview, Kelola Sekolah, Kelola Admin); Superadmin cannot see teacher daily duties or single-school admin tools.
   - If `user.role === 'Admin'`: render existing `menuItemsAdmin` (School management views only; cannot access Superadmin menus).
   - If `user.role === 'Guru'`: render existing `menuItemsGuru` (Teacher views only).
   - Dynamic Header: Replace hardcoded "Nizamudin" with `{user.role === 'Superadmin' ? 'Superadmin' : (schoolData?.nama || 'Sekolah')}`.
   - Dynamically load school profile from `public.sekolah` when `user.sekolah_id` exists.
4. Update `src/components/LoginScreen.tsx`:
   - Modernize branding to multi-school SaaS portal.
   - Ensure authenticated user object contains `sekolah_id`.
5. Update `AdminConfigView.tsx`:
   - Change `pengaturan` upsert to `{ onConflict: 'sekolah_id,key' }` and ensure `sekolah_id: user.sekolah_id` is supplied.
6. Update `AdminDataView.tsx` & `AdminBackupView.tsx`:
   - Include `sekolah_id: user.sekolah_id` on inserts and scope queries by `sekolah_id`.
7. Update `src/components/PrintHeader.tsx`:
   - Accept optional `sekolahId` / `user` prop with `localStorage` fallback to resolve active school ID and fetch school-specific `pengaturan` (Kop, logos, principal signature).
8. Run `npx tsc --noEmit` and `npm run build` to verify 0 errors.
9. Execute Git Workflow (git status -> git add . -> git commit -> git push origin main).
10. Write report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_auth_ui\handoff.md`.

When complete, send a message to orchestrator parent (conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec).
</USER_REQUEST>

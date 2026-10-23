# Dispatch for Explorer 1 (Auth, User Management, RBAC & Superadmin)

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1`

## Authoritative Request
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read the latest request at 2026-10-23T19:45:33Z)

## Objective
Investigate codebase regarding:
1. User roles, types, and RBAC: Find where user roles are defined (e.g. `User` interface, `UserRole`, `types/index.ts` or `src/types/`, auth services/hooks, `AppScreen.tsx`).
2. Authentication & Login: How users log in, how session/role is stored, and where redirection on login happens.
3. Superadmin management: Inspect `SuperadminView.tsx` or similar. How schools (`sekolah` table) and user accounts are created/managed. How `kota_kabupaten` / region is stored in the database for schools or users. How Superadmin can assign assigned regions (`kota_kabupaten`) to `dinas_pendidikan` accounts.
4. Read-only isolation: How mutations are guarded in frontend/backend to ensure `dinas_pendidikan` has zero mutation privileges (cannot mutate master data, users, school config, or attendance).
5. Output: Write findings and architectural recommendations to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1\report.md` and complete `handoff.md`.

## 2026-10-23T19:48:52Z
[Message] timestamp=2026-10-23T19:48:52Z sender=b9c240a0-6ada-4834-ac97-9bf90cc14baf priority=MESSAGE_PRIORITY_HIGH content=Read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Read your assignment at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1\DISPATCH.md
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1

Investigate user roles, types, authentication/login flows, Superadmin school and user management in the codebase.
Find where and how:
1. `UserRole` and `User` interface are declared.
2. Login and navigation redirect users based on role.
3. Superadmin manages schools (`sekolah` table) and users (`users` or `data_guru` or Supabase auth/metadata). Check if `kota_kabupaten` exists on `sekolah` or where regions are tracked.
4. How Superadmin can assign an assigned region (`kota_kabupaten`) to a `dinas_pendidikan` user account.
5. How read-only isolation can be strictly enforced across the application for `dinas_pendidikan`.

Write your full detailed report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1\report.md
Write your handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_1\handoff.md
Update progress.md as your liveness heartbeat. When done, notify me via send_message with a summary.

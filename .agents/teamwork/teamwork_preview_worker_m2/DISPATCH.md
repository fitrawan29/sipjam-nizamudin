# Task Assignment: Worker Milestone 2 (Avatar Reactivity R2 & Username Locking R5)

## Identity
- Archetype: teamwork_preview_worker
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Survey References
- Explorer Survey 2 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_report.md`
- Survey 2 Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md`

## Write Ownership (Strictly Exclusive)
You exclusively own and may modify ONLY these files:
- `src/lib/avatars.tsx`
- `src/components/AccountSettingsModal.tsx`
- `src/components/HomeView.tsx`
- `src/components/AppScreen.tsx`
- `src/components/AdminConfigView.tsx`
- `src/components/AdminDataView.tsx`
- `src/app/page.tsx`
- `src/app/superadmin/page.tsx`

DO NOT modify `GuruPresensi.tsx`, `GuruJurnal.tsx`, `SuperadminView.tsx`, or any migration files.

## Mission & Detailed Requirements

### 1. R2: Avatar Upload & Immediate Reactive State
1. **`src/lib/avatars.tsx`**:
   - Enhance `renderUserAvatar(avatarId?: string | null, className?: string)` so it supports:
     - Preset avatar IDs in `AVATAR_LIST`
     - Image data URLs (e.g. `data:image/*`)
     - Image URLs (`http://`, `https://`, `/`)
     - If it's an image/data URL, render `<img src={avatarId} alt="Avatar" className={`${className} rounded-full object-cover`} />`.
2. **`src/components/AccountSettingsModal.tsx`**:
   - Provide custom photo upload (file input `<input type="file" accept="image/*">`) alongside preset avatar selection.
   - When a file is chosen, read it as Data URL (with client-side size check e.g. < 1MB) and set it to `selectedAvatar`.
   - On successful save (`update_user_profile` RPC), construct `updatedUser` with the new avatar and:
     - Update `localStorage.setItem('sipjam_user', ...)`
     - Call `onUserUpdated(updatedUser)` immediately so parent React state updates without page reload.
3. **`src/components/HomeView.tsx`**:
   - In the dashboard banner (lines 924-927), replace the hardcoded `<i className="fa-solid fa-user-tie">` with `renderUserAvatar(user?.avatar, 'w-10 h-10 sm:w-11 sm:h-11')`.
4. **`src/components/AppScreen.tsx`**:
   - In the top header profile button (lines 543-550), render `renderUserAvatar(currentUser?.avatar, 'w-7 h-7')` or avatar preview instead of static gear icon.
   - In `checkIdleAndResume` (line 91), include `avatar` in the Supabase `.select('id, username, nama, role, sekolah_id, session_token, avatar')`.
5. **`src/components/AdminConfigView.tsx`**:
   - Pass `onUserUpdated={(updated) => onUserUpdated && onUserUpdated(updated)}` or similar callback to `<AccountSettingsModal>` so changing avatar from admin config also updates immediately.
6. **Session Queries**:
   - In `src/app/page.tsx` line 60 and `src/app/superadmin/page.tsx` line 39, include `avatar` in the `.select(...)` query.

### 2. R5: Username Edit Limitation (Admin Only)
1. **`src/components/AccountSettingsModal.tsx`**:
   - Ensure the condition checking if user can edit username checks:
     `const isAdmin = user?.role === 'admin' || user?.role === 'Admin' || user?.role === 'superadmin' || user?.role === 'Superadmin' || (user?.role || '').toLowerCase() === 'admin';`
   - Explicitly include condition `role === 'admin'`.
   - For non-admins:
     - Keep the username input disabled / locked.
     - Show padlock and label `(Hanya Admin yang bisa mengubah)`.
     - In `handleSave`, ensure non-admins cannot send a modified username: `p_username: isAdmin ? username.trim() : user.username`.
2. **`src/components/AdminDataView.tsx`**:
   - In `handleSaveGuru` (or teacher edit modal), when Admin edits a teacher's `nip` or username, also update `users.username` so the teacher's login username is updated by the Admin.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification
- Verify TypeScript types (`npx tsc --noEmit`).
- Document all changes and verification in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\handoff.md`.
- Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:17:37Z
You are assigned as Worker Milestone 2 (Avatar Reactivity R2 & Username Locking R5). Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement R2 (Avatar upload, immediate reactive update in React state, HomeView avatar, AppScreen navbar avatar, session queries) and R5 (Username locking UI with role === 'admin' check, backend parameter guard, AdminDataView sync).
Verify with tsc --noEmit.
Write handoff.md in your working directory and notify orchestrator_6 via send_message when done.

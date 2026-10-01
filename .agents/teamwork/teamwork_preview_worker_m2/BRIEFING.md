# BRIEFING — 2026-10-01T11:26:00Z

## Mission
Implement Avatar Reactivity (R2) and Username Locking (R5) for Sipjam app across specified components without page reloads.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: M2 (Avatar Reactivity R2 & Username Locking R5)

## 🔒 Key Constraints
- Exclusively modify only allowed files: `src/lib/avatars.tsx`, `src/components/AccountSettingsModal.tsx`, `src/components/HomeView.tsx`, `src/components/AppScreen.tsx`, `src/components/AdminConfigView.tsx`, `src/components/AdminDataView.tsx`, `src/app/page.tsx`, `src/app/superadmin/page.tsx`.
- DO NOT modify `GuruPresensi.tsx`, `GuruJurnal.tsx`, `SuperadminView.tsx`, or any migration files.
- DO NOT CHEAT: genuine implementation only, real state, real behavior. No hardcoded test results.
- Git Workflow: git status, git add ., git commit -m "...", git push origin main automatically upon completion.

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: 2026-10-01T11:26:00Z

## Task Summary
- **What to build**: Avatar Reactivity R2 & Username Locking R5
- **Success criteria**:
  1. Avatar upload support (Data URL / custom photo upload) + instant reactive update in React state without reload.
  2. HomeView banner and AppScreen navbar render user avatar.
  3. Session queries in page.tsx and superadmin/page.tsx include avatar.
  4. Username locked for non-admins; only admin/superadmin can edit username in UI and backend guard.
  5. Admin editing teacher nip/username syncs to users.username in AdminDataView.tsx.
  6. tsc --noEmit passes.
- **Interface contracts**: PROJECT.md § Interface Contracts
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- `renderUserAvatar`: Detects data URLs (`data:image/*`) and URLs (`http://`, `https://`, `/`) and renders `<img>` with `rounded-full object-cover`.
- `AccountSettingsModal`: Added file input `<input type="file" accept="image/*">`, FileReader to Data URL, 1MB size validation, custom avatar active indicator.
- Immediate reactivity: In `handleSave`, after successful profile RPC, `localStorage` is updated immediately and `onUserUpdated(updatedUser)` is triggered directly.
- R5 Username locking: `const isAdmin = user?.role === 'admin' || user?.role === 'Admin' || user?.role === 'superadmin' || user?.role === 'Superadmin' || (user?.role || '').toLowerCase() === 'admin';` explicitly enforces `role === 'admin'` check. For non-admins, username input is locked with padlock and label `(Hanya Admin yang bisa mengubah)`, and `p_username` payload retains `user.username`.
- `AdminConfigView`: Props enhanced with `onUserUpdated` and forwarded to `AccountSettingsModal`, synced in `AppScreen`.
- `AdminDataView`: Labeled NIP field as `NIP (Username Login)` and automatically synchronizes `users.username` for `item.user_id` or `item.nip` upon teacher data save.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Situational awareness
- progress.md — Liveness & status log
- handoff.md — Final handoff report

## Change Tracker
- **Files modified**:
  - `src/lib/avatars.tsx`: Support image data URLs and URLs in `renderUserAvatar`
  - `src/components/AccountSettingsModal.tsx`: Custom photo upload, 1MB limit, immediate state update, `role === 'admin'` username lock
  - `src/components/HomeView.tsx`: Dashboard banner renders `renderUserAvatar(user?.avatar, ...)`
  - `src/components/AppScreen.tsx`: Top navbar profile button renders `renderUserAvatar(currentUser?.avatar, 'w-7 h-7')`, session query includes `avatar`, forwards `onUserUpdated` to `AdminConfigView`
  - `src/components/AdminConfigView.tsx`: Accept and forward `onUserUpdated` to `AccountSettingsModal`
  - `src/components/AdminDataView.tsx`: Label NIP as `NIP (Username Login)` and sync `users.username` when Admin updates teacher
  - `src/app/page.tsx`: Session validation query and state diff include `avatar`
  - `src/app/superadmin/page.tsx`: Session validation query includes `avatar`
- **Build status**: `npx tsc --noEmit` passed with exit code 0.
- **Pending issues**: none

## Quality Status
- **Build/test result**: Typecheck passed (`npx tsc --noEmit` code 0)
- **Lint status**: No type or syntax errors
- **Tests added/modified**: Verified against m5_push_settings (37/37 passed)

## Loaded Skills
- none

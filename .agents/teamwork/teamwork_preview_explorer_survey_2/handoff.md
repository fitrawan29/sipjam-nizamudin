# Handoff Report: Explorer Survey 2 (R2 Avatar & R5 Username Edit Limitation)

## 1. Observation
1. **`src/components/HomeView.tsx` lines 924–927**:
   ```tsx
   <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shrink-0">
     <i className="fa-solid fa-user-tie text-lg sm:text-xl text-white"></i>
   </div>
   ```
   Renders a static icon `<i className="fa-solid fa-user-tie"></i>` instead of invoking `renderUserAvatar(user?.avatar)`.
2. **`src/components/AppScreen.tsx` lines 543–550**:
   ```tsx
   <button
     type="button"
     onClick={() => setIsAccountModalOpen(true)}
     className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
     title="Pengaturan Akun & Profil"
   >
     <i className="fa-solid fa-user-gear text-sm"></i>
   </button>
   ```
   Renders a static gear icon `<i className="fa-solid fa-user-gear"></i>` rather than user avatar.
3. **`src/components/AdminConfigView.tsx` lines 571–575**:
   ```tsx
   <AccountSettingsModal 
     isOpen={accountModalOpen} 
     onClose={() => setAccountModalOpen(false)} 
     user={user} 
   />
   ```
   Omits `onUserUpdated` prop, preventing `AppScreen` user state from receiving updates when opened from the config view.
4. **`supabase/migrations/20260926_secure_passwords.sql` lines 11–19**:
   ```sql
   CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
   RETURNS TABLE (
     id UUID,
     username TEXT,
     nama TEXT,
     role TEXT,
     sekolah_id UUID,
     session_token UUID
   )
   ```
   Omit `avatar` from the return columns.
5. **`src/app/page.tsx` line 60 & `src/components/AppScreen.tsx` line 91**:
   Query `.select('id, username, nama, role, sekolah_id, session_token')` without selecting `avatar`.
6. **`src/components/AccountSettingsModal.tsx` line 291**:
   ```tsx
   {user?.role === 'Admin' || user?.role === 'Superadmin' ? (
   ```
   Checks uppercase `'Admin'` and does not explicitly include `role === 'admin'`. Non-admin users see the locked input with message `(Hanya Admin yang bisa mengubah)`.
7. **`supabase/migrations/20260926_secure_passwords.sql` lines 46–115 (`update_user_profile`)**:
   Contains no role check on whether `v_target_user.role = 'Guru'` before updating `username`.

## 2. Logic Chain
1. Based on Observation 1 and 2, even though `AccountSettingsModal` dispatches `onUserUpdated` to `AppScreen`, the visual representations of the profile (the user card in `HomeView` and navbar button in `AppScreen`) do not render `user.avatar`. Therefore, changes appear invisible to the user on screen.
2. Based on Observation 4 and 5, whenever a user refreshes the page or returns after an idle session, the app re-validates the session against `public.users` or `verify_login`. Because these queries do not retrieve `avatar`, `avatar` is dropped from the session object, preventing persistence across reloads.
3. Based on Observation 3, when an admin changes their profile from `AdminConfigView`, the missing `onUserUpdated` callback causes the state to remain stale until a reload.
4. Based on Observation 6, while `AccountSettingsModal` locks the username input for non-Admins, the condition `user?.role === 'Admin'` is vulnerable to role casing (`'admin'`) and does not literally match `role === 'admin'`.
5. Based on Observation 7, any direct call to `update_user_profile` RPC allows teachers to update their username in the database without authorization checks.

## 3. Caveats
- No custom file storage bucket (e.g. Supabase Storage `avatars`) is currently configured in the migrations; avatars should either use the 12 preset vector IDs or Base64 Data URLs (<1MB) stored in `users.avatar (TEXT)` to avoid schema migration overhead.
- In `AdminDataView.tsx`, teacher data is primarily referenced through `data_guru.nip`. Updating `data_guru.nip` should cascade or update `users.username` for matching `user_id`.

## 4. Conclusion
To resolve R2 and R5 completely:
1. **R2**:
   - Render `renderUserAvatar(user?.avatar)` in `HomeView.tsx` (header banner) and `AppScreen.tsx` (navbar profile button).
   - Support image URLs/data URLs in `src/lib/avatars.tsx`.
   - Add file upload option in `AccountSettingsModal.tsx` that updates local and parent state immediately upon upload/save.
   - Include `avatar` in `verify_login` RPC and in `.select()` queries in `page.tsx` and `AppScreen.tsx`.
   - Forward `onUserUpdated` from `AppScreen` to `AdminConfigView`.
2. **R5**:
   - In `AccountSettingsModal.tsx`, normalize the role check to explicitly check `role === 'admin'` along with case-insensitive checks.
   - Guard `p_username` in `handleSave` so non-admin users cannot submit altered usernames.
   - In `update_user_profile` RPC, add a guard rejecting username updates for teacher accounts when the caller is not an Admin or Superadmin.

## 5. Verification Method
1. Check code matching:
   - Run: `grep -n "renderUserAvatar" src/components/HomeView.tsx` to verify avatar rendering in dashboard banner.
   - Run: `grep -n "role === 'admin'" src/components/AccountSettingsModal.tsx` to verify AC compliance.
2. Run TypeScript check: `npx tsc --noEmit`
3. Inspect `survey_report.md` for full component diffs and architectural plans.

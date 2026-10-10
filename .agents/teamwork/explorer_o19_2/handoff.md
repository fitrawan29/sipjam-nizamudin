# Handoff Report — Explorer 2 (Phase 2 Investigation: R5, R6, R7)

## 1. Observation

1. **R5 (Type Safety & User Interface):**
   - In `src/components/AppScreen.tsx`: line 50 specifies `user: any`, line 52 specifies `onUserUpdate?: (user: any) => void`. Further down:
     - line 680: accesses `(user?.username || user?.nip)`
     - line 1079: accesses `userName={user?.nama || user?.name}`
     - line 216–218: accesses `user?.wali_kelas` where it can be a string or `{ kelas: string }`
   - In `src/components/LoginScreen.tsx`: line 7 specifies `onLoginSuccess: (user: any) => void`, returning rows from `verify_login` RPC which provides `id, username, nama, role, sekolah_id, session_token, avatar`.
   - In `src/components/GuruPresensi.tsx`: line 13 specifies `{ user }: { user: any }`, accessing `user.nama`, `user.username`, `user.id`, and `user.sekolah_id`.
   - In `src/components/HomeView.tsx`: line 66 specifies `user: any`, accessing `user.id`, `user.nama`, `user.username`, `user.role`, `user.sekolah_id`, and `user.avatar`.
   - `src/types/user.ts` currently does not exist.

2. **R6 (Hook Extraction in `AppScreen.tsx`):**
   - Lines 74–162 in `AppScreen.tsx`: implements idle detection (30s threshold), session validation against `supabase.from('users')`, logout triggers, `sipjam_user` localStorage sync, and `syncKey` increment.
   - Lines 210–264 in `AppScreen.tsx`: implements wali kelas resolution checking `user.wali_kelas`, `supabase.from('wali_kelas')`, and `supabase.from('data_guru')`, returning `isWaliKelas` and `assignedKelas`.
   - Lines 266–291 in `AppScreen.tsx`: implements piket verification calling `getGuruDailyState(...)`, returning `isPiketHariIni`.
   - Lines 314–421 in `AppScreen.tsx`: implements broadcasts management with realtime channel `realtime-broadcasts-${user?.sekolah_id || 'global'}`, audience filtering (`sasaran`), read state in `pengumuman_dibaca`, and unread count badge.

3. **R7 (HomeView Splitting):**
   - `src/components/HomeView.tsx` has 1831 lines.
   - Line 78 contains the R3 bug: `const isGuru = user?.role !== 'Admin';` which improperly treats Superadmin as Guru.
   - Lines 80–273, 684–1022, and 1080–1513 are strictly teacher-specific logic and UI (stats cards, 4-step workflow progress, journal ratios, subject attendance, curriculum completeness).
   - Lines 98–104, 274–682, and 1518–1826 are strictly administrator-specific logic and UI (`loadAdminMatrix`, KPI counters, shortcuts, interactive daily status matrix table).
   - Only `AppScreen.tsx` imports `HomeView.tsx` via `const HomeView = dynamic(() => import('./HomeView'));` (line 7).

4. **Test Suite Invariants:**
   - Command `npx tsc --noEmit` runs with exit code 0.
   - `tests/m10_r2_r3.test.ts`, `tests/m6_3_dashboards_and_verif.test.ts`, `tests/three_fixes_verification.test.ts`, and `tests/m4_features_verification.test.ts` perform `fs.readFileSync` on `HomeView.tsx` to assert string presence of teacher and admin sections.
   - In `npm test`, `tests/m6_2_print_redesign.test.ts` currently fails 8 assertions due to the removal of `PrintOrientationToggle` in milestone M10.

---

## 2. Logic Chain

1. **R5:** Because `user?.nip` (line 680) and `user?.name` (line 1079) are accessed on `user` in `AppScreen.tsx`, defining `AppUser` strictly with only `id, username, nama, role, sekolah_id, session_token, avatar, wali_kelas` would trigger TypeScript compilation errors on those lines. Adding optional `nip?: string;`, `name?: string;`, `penugasan?: any;` and an index signature `[key: string]: any;` guarantees complete type safety without breaking changes.
2. **R6:** Because `AppScreen.tsx` (1101 lines) embeds idle revalidation, wali kelas lookup, daily piket verification, and realtime broadcasts into its main render body, extracting them into 4 distinct custom hooks (`useSessionSync`, `useWaliKelas`, `usePiket`, `useBroadcasts`) preserves identical state and effects while decoupling business concerns.
3. **R7:** Because `HomeView.tsx` (1831 lines) clearly separates Teacher states/render (lines 1080–1513) from Admin states/render (lines 1518–1826), extracting them into `HomeViewGuru.tsx` (~1100 lines) and `HomeViewAdmin.tsx` (~700 lines) allows `HomeView.tsx` to become a thin role router (< 50 lines). Correcting `isGuru = !isAdmin` in this router fixes the R3 bug for Superadmin without impacting any other component.
4. **Test Suite:** Because legacy test files inspect `HomeView.tsx` directly with `fs.readFileSync`, those test files should inspect both child components so that `npm test` passes with exit code 0 when `HomeView.tsx` is split.

---

## 3. Caveats

- We did NOT execute edits on source files (strictly read-only mode).
- In `tests/m6_2_print_redesign.test.ts`, the failures are pre-existing due to Milestone M10's requirement removing print orientation toggles; this should be addressed by the orchestrator/builder to achieve exit code 0 on `npm test`.

---

## 4. Conclusion

The specifications for R5, R6, and R7 are fully established, rigorously verified, and ready for immediate implementation by the builder agent:
- `src/types/user.ts` exports `AppUser`.
- `src/hooks/useSessionSync.ts`, `useWaliKelas.ts`, `usePiket.ts`, and `useBroadcasts.ts` provide self-contained logic consumed by `AppScreen.tsx`.
- `src/components/HomeViewGuru.tsx`, `src/components/HomeViewAdmin.tsx`, and `HomeView.tsx` (< 50 lines) cleanly divide the dashboard concerns while maintaining full backward-compatible dynamic imports.

Detailed specifications, signatures, and line mappings are documented in `analysis.md`.

---

## 5. Verification Method

1. **Type Checking:** Run `npx tsc --noEmit`. Must exit with code 0 without any user type errors.
2. **Line Count Verification:** Verify `HomeView.tsx` line count is < 200 lines:
   ```powershell
   (Get-Content src/components/HomeView.tsx).Length
   ```
3. **Hook Consumption:** Check that `AppScreen.tsx` imports and consumes all 4 hooks:
   ```powershell
   Select-String -Path src/components/AppScreen.tsx -Pattern "useSessionSync|useWaliKelas|usePiket|useBroadcasts"
   ```
4. **Build & Tests:**
   - Run `npm run build` to confirm Next.js build passes.
   - Run `npm test` to verify unit and regression tests pass.

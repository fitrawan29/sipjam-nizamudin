# Handoff Report — Milestone M3 (R4: Asesmen, Raport, & Bobot Kehadiran Dinamis)

## 1. Observation

1. **Default Academic Year & Semester Synchronization**:
   - In `src/components/GradebookView.tsx` (previously lines 488–498), `fetchAcademicYearSettings` used `if (!isAdmin)` checks that prevented Admin from receiving the configured active school year (`tahun_ajaran`) and semester (`semester`), leaving Admin stuck on default `'2024/2025'` and `'Ganjil'`.
   - Furthermore, `GradebookView.tsx` lacked event listeners for `sipjam:config_updated` and `storage`, preventing real-time synchronization when Admin updated academic year settings in another tab or view.
   - The academic year select element in `GradebookView.tsx` hardcoded options `2024/2025`, `2025/2026`, and `2026/2027`, which could omit other active years configured by administrators.
   - In `src/components/RaporView.tsx`, lazy initializers were needed to ensure instant display of synced active school year and semester without waiting for Supabase query completion, and `handleConfigSync` needed to keep Admin in sync with active changes.

2. **Meeting Attendance Status Points & Dynamic Calculation**:
   - In `src/components/GradebookView.tsx` (previously lines 350–402), attendance calculation only awarded points for `'H'` / `'HADIR'` (`rates[s.nisn] = (hadir / validSessions) * 100`). All other presence categories (Sakit, Izin, Terlambat, Alpa) resulted in 0 points, which unfairly penalized students with excused absences.
   - The grade weight modal in `GradebookView.tsx` (previously lines 4491–4536) only provided inputs for 3 percentage fields (`kehadiran`, `formatif`, `sumatif`), lacking any configuration sub-form for per-meeting status point values.

## 2. Logic Chain

1. **Elimination of `if (!isAdmin)` & Realtime Sync in `GradebookView.tsx` and `RaporView.tsx`**:
   - Removing `if (!isAdmin)` allows `fetchAcademicYearSettings` to set `selectedTahunAjaran`, `selectedSemester`, and `tpForm` to the school's configured active academic year and semester for all roles, including Admin.
   - Adding `window.addEventListener('sipjam:config_updated', handleConfigSync)` and `window.addEventListener('storage', handleStorageSync)` ensures that any configuration changes dispatched from `AdminConfigView` immediately update `GradebookView` in real time.
   - Lazy `useState` initializers in both `GradebookView.tsx` and `RaporView.tsx` read `localStorage.getItem('sipjam_config_sync')` to populate the active semester and year on initial render before network calls return.
   - The `gradebookTahunAjaranOptions` memoizes dynamic academic year options including the current selection and active year tagged with `(Aktif)`.

2. **Dynamic Attendance Point Weights & Formula Update**:
   - Defined `AttendanceStatusPoints` and `DEFAULT_STATUS_POINTS` (`hadir: 100`, `sakit: 75`, `izin: 75`, `terlambat: 75`, `alpa: 0`).
   - Extended `bobot_nilai_mapel` payload in `pengaturan` table to persist `status_points` alongside `kehadiran`, `formatif`, and `sumatif`.
   - Extended the modal UI with a dedicated sub-form allowing Admin to customize points for each of the 5 statuses (clamped 0–100) and a "Reset Default" button.
   - Updated `fetchMapelAttendance` to calculate attendance scores by accumulating configured point values per student session:
     $$\text{Attendance Rate} = \frac{\sum \text{Earned Status Points}}{\text{Valid Sessions} \times 100} \times 100$$
   - Applied the same point accumulation logic to the canonical `absensi` table fallback.

## 3. Caveats

- **No Caveats**: The changes strictly preserve existing data structures, add defensive backwards compatibility for existing `bobot_nilai_mapel` records (falling back to default points 100, 75, 75, 75, 0 if `status_points` key is absent), and maintain complete type safety.

## 4. Conclusion

Milestone M3 is fully implemented and verified:
1. `GradebookView.tsx` and `RaporView.tsx` now select the active school year and semester by default for both Admin and Guru, with instant localStorage hydration and real-time event updates via `sipjam:config_updated` and `storage`.
2. Grade weight configuration in `GradebookView.tsx` features a dynamic sub-form for customizing attendance status points (Hadir, Sakit, Izin, Terlambat, Alpa) stored in `status_points`.
3. Attendance calculation accurately accumulates earned points divided by `(validSessions * 100) * 100`.

## 5. Verification Method

- **TypeScript Compilation**: `npx tsc --noEmit` -> 0 errors.
- **Next.js Production Build**: `npm run build` -> Compiled successfully in 2.4s.
- **Unit & Logic Regression Test**: `npx tsx tests/test_m3_r4_logic.ts` -> 9/9 tests passed.
- **Existing Test Suite**: `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts` -> 13/13 tests passed.
- **Full Test Suite**: `npm test` -> 49 test suites passed with 0 failures.

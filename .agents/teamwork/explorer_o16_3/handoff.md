# Handoff Report: Codebase Survey for R3, R4, and Testing Infrastructure

## 1. Observation

- **AppScreen Role & Navigation Architecture**:
  In `src/components/AppScreen.tsx`:
  - `isWaliKelas` evaluated at lines 197-264 via `user?.wali_kelas`, `supabase.from('wali_kelas')`, and `data_guru.wali_kelas`.
  - `isPiketHariIni` evaluated at lines 199, 266-291 via `getGuruDailyState(...)`.
  - `menuItemsGuru` defined at lines 534-546 with conditional spreads `...(isWaliKelas ? [{ id: 'view-jurnal-kelas', ... }, { id: 'view-rekap-siswa', ... }] : [])` and `...(isPiketHariIni ? [{ id: 'view-piket', ... }] : [])`.
  - Route guards in `handleNavigation` at lines 438-485 intercept unauthorized access via `Swal.fire`.
  - Direct render guards at lines 760-830 display a red "Akses Terblokir" modal card.

- **Gate to Mapel Attendance Sync in GuruJurnal**:
  In `src/components/GuruJurnal.tsx`:
  - Lines 558-577: Queries `presensi_siswa` for today's gate check-ins (`status = 'datang'`) and caches them in `piketAttendance: Record<string, { jam: string }>`.
  - Lines 1270-1286: Renders `✓ Hadir di Sekolah (Piket ${pRec.jam})` or `Belum Presensi Piket`.
  - Line 607: `handleApplyPiketAttendance` sets `absensi[s.nisn] = 'H'` for gate-present students.
  - Lines 623-660: `handleAbsensiChange` modifies attendance to `'H'`, `'S'`, `'I'`, or `'A'`. No truancy warning badge or flagging is currently triggered when a gate-checked student is marked `'A'`.

- **Piket Attendance & Form Concurrency**:
  In `src/components/PiketView.tsx`:
  - Lines 1103-1200: `handlePiketSubmit` saves `rekap_absen_kelas` into `laporan_piket` and bulk upserts into `public.absensi`.
  - Lines 435, 621: `isSubmittingPresensiRef` is an in-memory ref protecting only single-window re-entrancy. No server-side or shared lock exists across multiple concurrent users on duty.

- **Academic Calculations & CP Descriptions**:
  In `src/components/GradebookView.tsx`:
  - Lines 1034-1103: `calculateStudentTpStats` computes Formatif and Sumatif weighted means and 50/50 final TP score.
  - Lines 1106-1181: `calculateStudentSemesterStats` averages TP scores into `semesterFinal` and assigns grade letter/predicate (A, B, C, D).
  - Lines 2162-2250: Tab 2 (`rekap-semester`) renders TP columns and `Nilai Rapor`, but lacks dynamic Capaian Pembelajaran descriptions.

- **Tutorial Subsystems**:
  - `src/components/Onboarding/tutorialSteps.ts`: Contains `GURU_STEPS` (5 steps) and `ADMIN_STEPS` (6 steps) targeted via `data-tour`.
  - `src/components/Tutorial/tutorialData.ts`: Contains `TUTORIAL_DATA` (589 lines) with structured guide cards for all views.

- **Testing Infrastructure**:
  - `package.json`: Scripts `"test": "tsx tests/..."` and `"test:e2e": "tsx tests/e2e/run_all_e2e.ts"`. Vitest/Playwright are not installed; all tests run via `tsx`.
  - `tests/e2e/helpers/testHarness.ts`: Provides custom `TestRunner` and DOM/canvas polyfills.
  - Tool verification: `npm run test:e2e` exited with code 0 (123 passed in 0.09s), `npm test` exited with code 0 (27 test files passed), and `npx tsc --noEmit` exited with code 0.

---

## 2. Logic Chain

1. **RBAC Logic**:
   - Because `AppScreen.tsx` cleanly encapsulates menu definition (`menuItemsGuru`), route interception (`handleNavigation`), and view rendering (`currentView === 'view-...'`), adding the Wali Kelas "Rapor" menu requires mirroring the exact existing pattern used for `view-jurnal-kelas` and `view-rekap-siswa`.
   - Adding `...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])` guarantees that only verified Homeroom Teachers (and Admins) see the menu and can enter the view.

2. **Truancy Detection Logic**:
   - `GuruJurnal.tsx` already retrieves gate check-ins from `presensi_siswa` into `piketAttendance`.
   - Truancy occurs if and only if `piketAttendance[s.nisn]` exists AND `absensi[s.nisn] === 'A'`.
   - Detecting this in UI and saving `[Terindikasi Bolos]` into `absensi.log_perubahan` and `keterangan` fulfills automatic detection without requiring database schema migrations.

3. **Concurrency Lock Logic**:
   - Because multiple teachers can be assigned to Piket on the same day, they can access the student attendance form at the same time.
   - An active lease-based lock table `public.piket_form_lock` (or fallback session store) with `(sekolah_id, tanggal, form_type)` uniqueness allows User A to acquire the lock while locking out User B.
   - A 5-minute lease with a 60-second heartbeat ensures that unexpected disconnects do not permanently lock out the school.

4. **Kurikulum Merdeka Logic**:
   - Under the Kemendikbudristek guide, report descriptions are derived from the highest-scoring and lowest-scoring learning objectives (TP).
   - Enhancing `calculateStudentSemesterStats` to identify `max(tpScores)` and `min(tpScores)` and synthesizing standard narrative sentences directly fulfills the Kurikulum Merdeka requirement.

5. **Test Harness Feasibility**:
   - Because `tsx` and the custom `TestRunner` execute quickly and deterministically in Node.js with mock DOM/canvas environments, all 5 acceptance criteria can be tested via `tsx` scripts without adding third-party testing frameworks.

---

## 3. Caveats

- **Database RLS vs Service Role**: Direct Supabase queries in client components depend on existing RLS policies. The new `piket_form_lock` table should include tenant-safe RLS policies (`sekolah_id = get_auth_user_sekolah_id()`).
- **Component Naming**: The user prompt referred to `DaftarNilaiView.tsx`, but the actual repository component is `src/components/GradebookView.tsx`.
- **Network Mode**: In offline environments, the concurrency lock should gracefully fall back to local tab mutex or surface an informational banner.

---

## 4. Conclusion

The application architecture is well-structured and fully prepared for R3 and R4 implementations:
1. **Student Attendance RBAC**: Enforce through `AppScreen.tsx`, `RekapSiswaView.tsx`, and `GuruJurnal.tsx`.
2. **Gate to Mapel Sync & Truancy**: Trigger via `piketAttendance` vs `absensi === 'A'`, displaying warning badges and logging to `log_perubahan`.
3. **Piket Concurrency Lock**: Implement lease-based lock via `src/lib/piketLock.ts` and `piket_form_lock`.
4. **Kurikulum Merdeka**: Synthesize highest/lowest TP narratives in `GradebookView.tsx` and render in semester recap.
5. **Wali Kelas Rapor Menu**: Add conditionally to `menuItemsGuru` and `menuItemsAdmin` in `AppScreen.tsx`.
6. **In-App Tutorials**: Update `tutorialSteps.ts` and `tutorialData.ts`.
7. **Test Suite**: Write programmatic test files under `tests/` and `tests/e2e/` executing via `tsx`.

---

## 5. Verification Method

1. **Verify Report**: Inspect `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_3\report.md`.
2. **Verify Type Safety**: Run `npx tsc --noEmit`.
3. **Verify Existing Tests**: Run `npm run test:e2e` and `npm test`.
4. **Invalidation Conditions**: If any of the existing 27 test files fail, or if `tsc --noEmit` returns errors, the findings must be re-evaluated.

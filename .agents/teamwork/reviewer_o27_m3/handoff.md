# Review & Adversarial Critic Handoff Report — Milestone M3 (R4: Asesmen, Raport, & Bobot Kehadiran Dinamis)

## 1. Observation

1. **Academic Year & Semester Active Selection for Admin**:
   - In `src/components/GradebookView.tsx` (lines 561–590), `fetchAcademicYearSettings` previously gated setting `selectedTahunAjaran` and `selectedSemester` behind an `if (!isAdmin)` conditional, which caused Admin users to default to hardcoded `'2024/2025'` and `'Ganjil'` regardless of school settings. This condition has been completely removed.
   - In `src/components/GradebookView.tsx` (lines 599–647), event listeners for `sipjam:config_updated` and `storage` are mounted on window, syncing `syncedTahunAjaran`, `selectedTahunAjaran`, `syncedSemester`, `selectedSemester`, and `tpForm` in real time, and unmounted during component cleanup.
   - Dynamic academic year options are computed via `gradebookTahunAjaranOptions` (lines 650–655), rendering `(Aktif)` indicators for the active school year and semester in the dropdowns.
   - In `src/components/RaporView.tsx` (lines 48–81, 241–254, 360–382), lazy `useState` initializers retrieve cached active config from `localStorage.getItem('sipjam_config_sync')`, and `isAdmin` is explicitly included in the sync triggers for `selectedTahunAjaran` and `selectedSemester`.

2. **Dynamic Attendance Meeting Points Configuration**:
   - `export interface AttendanceStatusPoints` and `export const DEFAULT_STATUS_POINTS: AttendanceStatusPoints = { hadir: 100, sakit: 75, izin: 75, terlambat: 75, alpa: 0 }` are declared in `src/components/GradebookView.tsx` (lines 24–37).
   - In `GradebookView.tsx` (lines 4710–4808), the grade weight modal features a dedicated sub-form ("Poin Status Kehadiran per Pertemuan") with individual inputs for Hadir, Sakit, Izin, Terlambat, and Alpa (each bounded 0–100), plus a "Reset Default" action button.
   - In `handleSaveBobot` (lines 1060–1088), status points are sanitized using `Math.min(100, Math.max(0, Number(statusPointsForm[key]) || 0))` and stored under `status_points` within the `bobot_nilai_mapel` JSON payload in the `pengaturan` table. Existing configurations without `status_points` safely fallback to `DEFAULT_STATUS_POINTS` upon load (lines 375–381).

3. **Attendance Rate Calculation Logic**:
   - In `src/components/GradebookView.tsx` (lines 406–461), `getStatusPointValue` maps status abbreviations (`H`, `S`, `I`, `T`, `A`), exact words, and contextual aliases (`BEBAS`, `DINAS`, `BOLOS`) to configured points.
   - Points earned per student across all valid sessions in `jurnal_pembelajaran.absensi_siswa` are accumulated, and the attendance rate is calculated as:
     $$\text{rate} = \left(\frac{\text{earned}}{\text{validSessions} \times 100}\right) \times 100$$
   - The result is clamped to $[0, 100]$ with one decimal precision. If `validSessions === 0`, it cascades to canonical `absensi` table aggregation with the same point mapping, or defaults to 100% if no records exist.
   - `useEffect` for attendance calculation explicitly includes `statusPoints` in its dependency array (line 500), ensuring that updating point weights immediately triggers recalculation.

4. **Integrity & Anti-Cheat Audit**:
   - Zero hardcoded mock returns, fake data bypasses, or facades were identified in `src/components/GradebookView.tsx` or `src/components/RaporView.tsx`.
   - Real database read/write queries to `pengaturan`, `jurnal_pembelajaran`, and `absensi` are properly executed via Supabase client.

## 2. Logic Chain

1. Removing `if (!isAdmin)` in `GradebookView.tsx` directly resolves the bug where Admin users were stuck on hardcoded default terms, aligning `GradebookView` behavior with `RaporView` and administrative school configurations.
2. The addition of `sipjam:config_updated` and `storage` event listeners establishes unified cross-view and cross-tab synchronization. When an Admin changes academic periods in `AdminConfigView`, all open Gradebook and Rapor sessions immediately update without requiring a full page reload.
3. The dynamic attendance point model accurately implements the client's business requirement: non-zero points for excused absences (Sakit 75, Izin 75, Terlambat 75) prevent unfair grading penalties for excused absences while maintaining strict 0 points for unexcused absences (Alpa).
4. The accumulation formula $\frac{\text{earned}}{\text{validSessions} \times 100} \times 100$ guarantees that maximum possible attendance produces 100% while scaling proportionally with whatever weights the school administration configures.

## 3. Caveats

- **No Caveats**: The implementation provides backwards-compatible fallback values for existing school records where `status_points` was not previously stored, clamps user inputs to avoid invalid mathematical percentages, handles empty/zero session states gracefully, and introduces no breaking changes or runtime dependencies.

## 4. Conclusion

**Verdict: APPROVE**

Milestone M3 (R4: Asesmen, Raport, & Bobot Kehadiran Dinamis) satisfies all requirements and acceptance criteria:
1. Active semester and school year from admin settings are selected by default for Admin on mount in both `GradebookView.tsx` and `RaporView.tsx`, and synchronize in real-time via `sipjam:config_updated` and `storage`.
2. Dynamic form configuration in the grade weight modal properly customizes Hadir (100), Sakit (75), Izin (75), Terlambat (75), and Alpa (0), and persists to `status_points` in `bobot_nilai_mapel`.
3. Attendance calculation accurately accumulates earned points divided by `(validSessions * 100) * 100` and reacts immediately to configuration changes.
4. All integrity checks passed with zero integrity violations.

## 5. Verification Method

Independent verification was conducted with the following clean test and build runs:
1. **TypeScript Typecheck**:
   - Command: `npx tsc --noEmit`
   - Output: 0 errors (exited with code 0).
2. **Next.js Production Build**:
   - Command: `npm run build`
   - Output: Compiled successfully in 2.1s, static pages generated (13/13) with 0 errors.
3. **M3 Unit & Logic Test Suite**:
   - Command: `npx tsx tests/test_m3_r4_logic.ts`
   - Output: 9/9 tests passed (0 failed).
4. **E-Rapor Synchronization Suite**:
   - Command: `npx tsx tests/e_rapor_tahun_ajaran_sync.test.ts`
   - Output: 13/13 tests passed (0 failed).
5. **Full Regression Test Suite**:
   - Command: `npm test`
   - Output: 49 test suites executed and passed with 0 failures.

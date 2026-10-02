# Handoff Report: Reviewer R4 (Adversarial Review & QA)

> [!WARNING] **Skepticism Disclaimer**
> High confidence following discovery and remediation of (1) admin matrix exemption disconnect where global school settings and exempt lists were parsed but unapplied, (2) false Jurnal Kegiatan demand during active block weeks for voluntarily checked-in exempt teachers, and (3) reminder/auto-alpa edge cases for school-wide exemption policies. All 85 test assertions across 13 test suites and all 111 assertions across 4 E2E tiers pass with 100% success rate, and Turbopack production build compiles with zero errors.

## 1. What the prior attempt got wrong

1. **Admin Matrix Exemption Disconnect (`aturanGlobal` & `guruHanyaMengajarList` unapplied)**:
   - **Input**: A school applies global policy `aturan_kehadiran_guru: 'Hari_Mengajar_Saja'` or defines a list in `guru_hanya_mengajar` in `pengaturan`. A teacher who has no teaching schedule today (`targetCount === 0`) does not have `wajib_hadir_hanya_mengajar = true` set on their individual record in `data_guru`.
   - **Expected**: In `HomeView.tsx` Admin Status Matrix, `isExemptNonTeaching` evaluates to `true`. They are displayed as `Bebas Hadir` (blue), `Bebas KBM` (gray) or `Jurnal Selesai`, `Bebas Piket` / `Bukan Petugas`, and counted as `isTugasLengkap = true`.
   - **Actual**: `loadAdminMatrix()` in `HomeView.tsx` fetched `aturanGlobal` and `guruHanyaMengajarList`, but line 415 computed `isExemptNonTeaching = Boolean(teacher.wajib_hadir_hanya_mengajar) && targetCount === 0;`. Global and list exemptions were completely ignored. The teacher was wrongly classified as `Belum Datang`, `Perlu Jurnal Kegiatan`, `Belum Mengisi`, and flagged as `Belum Lengkap`.
   - **Root Cause**: The parsed `aturanGlobal` and `guruHanyaMengajarList` variables were never combined into `isTeacherExempt` for each teacher row before evaluating `isExemptNonTeaching`.

2. **False Block Journal Requirement in `getNextAction()` for Voluntarily Checked-in Exempt Teachers**:
   - **Input**: An exempt teacher without classes today during an active `sistem_blok` voluntarily submits Presensi Datang.
   - **Expected**: `getNextAction()` should acknowledge that their attendance is complete and direct them to Presensi Pulang: *"Semua tugas selesai! Silakan lakukan Presensi Pulang."* (matching `isJurnalDone = true` and `canPresensiPulang = true` in `workflow.ts`).
   - **Actual**: `getNextAction()` evaluated `if (dailyState.isBlok && !dailyState.jurnalKegiatan)` without checking `!dailyState.isNonTeachingDay`. Even though the workflow step showed "Bebas Jurnal" and the schedule card showed "Bebas Jurnal", `getNextAction()` erroneously demanded: *"Periode Sistem Blok: Silakan isi Jurnal Kegiatan (Kegiatan Blok)."* and blocked the prompt for Presensi Pulang.
   - **Root Cause**: The block journal condition in `getNextAction()` lacked an exclusion guard for `dailyState.isNonTeachingDay`.

3. **School-Wide Exemption Blindspot in Push Reminders & Auto-Alpa**:
   - **Input**: School configured with `aturan_kehadiran_guru: 'Hari_Mengajar_Saja'` where teachers do not have individual `wajib_hadir_hanya_mengajar` boolean flags set.
   - **Expected**: Push reminder cron (`send-reminders/route.ts`) and nightly auto-alpa cutoff (`attendanceAlpa.ts`) should exempt teachers who have no scheduled classes today from attendance and journal reminders / Alpa records.
   - **Actual**: Both routes only inspected `teacher.wajib_hadir_hanya_mengajar` column and skipped querying `pengaturan` for `aturan_kehadiran_guru` and `guru_hanya_mengajar`.
   - **Root Cause**: Policy resolution was coupled solely to the `data_guru.wajib_hadir_hanya_mengajar` column rather than resolving `pengaturan` fallback.

## 2. What I changed

1. `src/components/HomeView.tsx`:
   - Updated `loadAdminMatrix` row evaluation to define `isTeacherExempt` integrating `teacher.wajib_hadir_hanya_mengajar`, `aturanGlobal === 'Hari_Mengajar_Saja'`, and `guruHanyaMengajarList` checks.
   - Updated `isExemptNonTeaching = isTeacherExempt && targetCount === 0;` so the Admin Status Matrix accurately honors global and custom exemption configurations.
   - Updated `getNextAction()` line 1014: `if (dailyState.isBlok && !dailyState.isNonTeachingDay && !dailyState.jurnalKegiatan)` to prevent falsely demanding Jurnal Kegiatan from exempt teachers without classes today.
2. `src/app/api/push/send-reminders/route.ts`:
   - Added `pengaturan` query to resolve `aturan_kehadiran_guru` and `guru_hanya_mengajar` per school.
   - Added `isExemptTeacher()` helper and applied it to Datang presensi, Jurnal (KBM & Blok), and Piket reminder evaluations.
3. `src/lib/attendanceAlpa.ts`:
   - Added `aturan_kehadiran_guru` and `guru_hanya_mengajar` resolution from `pengaturan`.
   - Evaluated `isTeacherExempt` so teachers under school-wide `Hari_Mengajar_Saja` are protected from automated Alpa insertions on non-teaching days.
4. `tests/three_fixes_verification.test.ts` & `tests/sistem_blok_verification.test.ts`:
   - Updated assertions to verify `isExemptNonTeaching` with `isTeacherExempt`.
   - Added assertions `R1.12` and `R1.13` verifying Admin Matrix exemption integration and `getNextAction()` block journal exemption guard.

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm test`: All 13 test suites executed (`tests/imageUrl.test.ts`, `tests/printHeader.test.ts`, `tests/qolAudit.test.ts`, `tests/m6_1_database_and_types.test.ts`, `tests/m6_2_print_redesign.test.ts`, `tests/m6_3_dashboards_and_verif.test.ts`, `tests/m6_4_piket_perangkat_broadcast.test.ts`, `tests/m10_r2_r3.test.ts`, `tests/m1_resubmission_and_verif.test.ts`, `tests/m4_features_verification.test.ts`, `tests/ui_ux_improvements_audit.test.ts`, `tests/sistem_blok_verification.test.ts`, `tests/three_fixes_verification.test.ts`). All 85 assertions PASSED (100%).
  - `npm run test:e2e`: All 4 tiers (Tier 1: Feature Coverage, Tier 2: Boundary & Corner Cases, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Scenarios). All 111 assertions PASSED (100%).
  - `npm run build`: Turbopack production build compiled cleanly in 1568ms, TypeScript typecheck completed in 2.1s with 0 errors, all 12 static/dynamic routes generated.
- **Shallow Verification (manual only):**
  - Inspected format string `${hariIni}, ${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` resulting in exact `Jumat, 02-10-2026`.
  - Confirmed CSS `@media print` rules `print:w-full print:h-auto` and `object-fit: contain` across all print tables.
- **Unverified aspects:**
  - Physical printer hardware ink output (verified via headless print DOM structure and CSS print styles).

## 4. Known Issues

- `Fatal Functional Bug`: None.
- `Shallow Verification`: Physical ink-on-paper output rendering depends on browser printer drivers and margin settings, though CSS strictly enforces `print:w-full print:h-auto` without fixed heights.
- `Minor Robustness Risk`: If an exempt teacher has no schedule in `jadwal_pelajaran` for today but has an ad-hoc informal assignment during a block week, the system treats them as exempt unless an admin assigns them a schedule entry or they voluntarily check in.

## 5. Remaining risk & next step

- All three core requirements (R1 Block System exemption for non-teaching teachers, R2 Print photo fluid sizing, R3 Dashboard date format `[hari, DD-MM-YYYY]` with mobile responsiveness) and all edge cases (voluntary attendance, global school attendance policy, push reminders, auto-alpa, and admin matrix) are fully resolved and verified.
- Proceeding with Git workflow commit and push per GEMINI.md rules.

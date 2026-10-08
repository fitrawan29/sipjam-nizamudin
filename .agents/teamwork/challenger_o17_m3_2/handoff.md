# Handoff Report: Challenger 2 — Milestone 3 (R3 Student Attendance & Piket Flow)

**Agent**: `challenger_o17_m3_2` (Empirical Challenger: Critic & Specialist)  
**Milestone**: Milestone 3 (R3 Student Attendance & Piket Flow)  
**Date**: 2026-10-08  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o17_m3_2`  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct observations from codebase inspection, empirical test execution, and static checks:

1. **Truancy Logic in `src/components/GuruJurnal.tsx`**:
   - Lines 560–577: Gate arrival records queried from `presensi_siswa` filtered strictly by `eq('status', 'datang')`, `eq('kelas', kelas)`, and `eq('tanggal', tgl)`. Records indexed by both `nisn` and `siswa_id` into `piketAttendance`.
   - Lines 640–655: When subject teacher modifies attendance status in `handleAbsensiChange`:
     ```ts
     const pRec = (student.nisn && piketAttendance[student.nisn]) || (student.id && piketAttendance[student.id]) || piketAttendance[nisn];
     const isTruant = status === 'A' && Boolean(pRec);
     ```
     When truant:
     - `logEntry = [${nowWita} WITA] Terindikasi Bolos: Hadir di Gerbang Piket (${pRec.jam}), tetapi ditandai Alpa oleh ${user?.nama || 'Guru Mapel'} (${mapel || 'Mapel'})`
     - `noteKeterangan = Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)`
     - Appended to `absensi.log_perubahan` and stored into `absensi.keterangan`.
   - Lines 1272–1279: Top warning banner rendered dynamically when `truantCount > 0`:
     `<div id="jurnal-truancy-alert" ...>⚠️ Perhatian: Terdeteksi {truantCount} siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini).</div>`
   - Lines 1305–1308: Student row badge rendered for truant student:
     `<span ... className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-800 ... animate-pulse"><i className="fa-solid fa-triangle-exclamation text-[8px]"></i> ⚠️ Terindikasi Bolos (Hadir Gerbang {pRec.jam}, Alpa Mapel)</span>`

2. **Non-Truant Scenarios in `src/components/GuruJurnal.tsx`**:
   - Scenario (a) Gate Hadir + Mapel Hadir/Izin/Sakit: `status !== 'A'`, so `isTruant = false`. Renders green badge: `✓ Hadir di Sekolah (Piket ${pRec.jam})` (`bg-emerald-100 text-emerald-800`). Top banner is hidden (`truantCount === 0`). `log_perubahan` logs normal transition without "Terindikasi Bolos".
   - Scenario (b) Gate absent + Mapel Alpa: `pRec` is undefined, so `Boolean(pRec && status === 'A')` evaluates to `false`. Renders amber badge: `Belum Presensi Piket` (`bg-amber-50 text-amber-700`). Top banner is hidden. `log_perubahan` logs normal transition to Alpa without truancy tag.
   - Dynamic remediation: If student was initially marked 'A' and subsequently marked 'H', `isTruant` evaluates to `false`, the red badge flips to `✓ Hadir di Sekolah`, and `truantCount` decrements to 0, immediately removing the top warning banner.

3. **RBAC Boundaries**:
   - **Subject Teacher (Non-Wali)**:
     - In `src/components/AppScreen.tsx` (lines 538–545): `view-jurnal-kelas` and `view-rekap-siswa` are conditionally appended to `menuItemsGuru` only `if (isWaliKelas)`.
     - Direct route attempts to `view-rekap-siswa` or `view-jurnal-kelas` trigger Swal rejection: `"Akses Terblokir: Halaman Presensi Siswa secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan."` (lines 439–484).
     - Inside `src/components/RekapSiswaView.tsx` (lines 626–640): Renders fallback `"Akses Terblokir"` card when `masterLoaded && !isWaliKelasUser`.
   - **Subject Teacher (Non-Piket)**:
     - In `src/components/AppScreen.tsx` (lines 462–472, 539): `view-piket` is excluded from sidebar unless `isPiketHariIni`. Navigation attempts trigger Swal rejection `"Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini."`.
     - Inside `src/components/PiketView.tsx` (lines 1501–1518): Renders fallback card `"Bukan Jadwal Piket Hari Ini"` when `isGuru && dailyState && !dailyState.isPiket && !isAdmin`.
     - `canReport` explicitly requires `dailyState && dailyState.isPiket && !dailyState.isLibur` (lines 1496–1499).
   - **Homeroom Teacher Class Isolation**:
     - In `src/components/RekapSiswaView.tsx` (lines 357–365, 1210–1225): `allowedClasses` strictly isolates teacher to assigned class(es). Dropdown is locked (`disabled={allowedClasses.length <= 1}`).
     - In `tarikRekap` (lines 368–388): Foreign class requests are clamped back to `allowedClasses[0]` and rejected with Swal `"Akses Ditolak: Anda hanya dapat melihat rekapitulasi kehadiran untuk kelas binaan Anda."`.
     - In `handleSaveWaliAttendance` (lines 310–335): Submissions strictly upsert rows for `activeWaliKelas.kelas` from filtered `waliStudents`.
   - **Duty Teachers on Non-Duty Days**:
     - `dailyState.isPiket = false` on non-duty days completely locks out reporting and renders the lock card.

4. **Empirical Adversarial Test Execution (`tests/adversarial_m3_truancy_rbac_challenger.test.ts`)**:
   - Executed 17 programmatic tests covering:
     - `[TRUANT-01]` to `[TRUANT-05]`: Canonical truancy flagging, red badge, top banner, audit log format, multi-student aggregation.
     - `[NONTRUANT-01]` to `[NONTRUANT-05]`: Hadir/Izin/Sakit non-truant behavior, unrecorded gate non-truant behavior, departure-only exclusion, and dynamic remediation.
     - `[RBAC-01]` to `[RBAC-04]`: Subject teacher homeroom and piket isolation, homeroom class lock, and duty vs non-duty day gating.
     - `[LOCK-01]` to `[LOCK-03]`: Concurrency lease prevention of concurrent edits, multi-tenant isolation, and release takeover.
   - Result: **17 / 17 PASSED (100%)**.

5. **Full System Test & Build Verification**:
   - `npx tsx tests/m3_student_attendance_piket_lock.test.ts`: 17 / 17 passed.
   - `npx tsx tests/adversarial_m3_truancy_rbac_challenger.test.ts`: 17 / 17 passed.
   - `npx tsc --noEmit`: Exited with code 0 (zero errors).
   - `npm test`: Exited with code 0 (all test suites passed).
   - `npx tsx tests/e2e/run_all_e2e.ts`: All 4 tiers passed (100%).
   - `npm run build`: Compiled successfully in 2.8s; all routes generated cleanly.

---

## 2. Logic Chain

1. **Truancy Detection Verification**:
   - By querying `presensi_siswa` specifically for `status = 'datang'`, gate arrival is reliably distinguished from gate departures.
   - Evaluating `status === 'A' && Boolean(pRec)` correctly flags students present on campus who skipped class, while avoiding false positives for students who were absent all day (ordinary Alpa) or students present with excuse (Izin/Sakit).
   - The persistence of `logEntry` and `keterangan` in `absensi` creates an auditable record of the truancy event with WITA timestamp, gate arrival time, and teacher identity.

2. **RBAC Hardening Verification**:
   - Enforcement exists at three separate layers:
     1. Navigation / Menu Layer: UI menu items omitted when role or duty condition is not met.
     2. Routing Guard Layer: `handleViewSelect` in `AppScreen.tsx` rejects unauthorized URL or navigation events.
     3. Component Boundary Layer: Inner component render trees (`RekapSiswaView` and `PiketView`) render blocking cards with access termination.
   - Class confinement for homeroom teachers enforces that even within `RekapSiswaView`, teachers cannot read or mutate records belonging to classes other than `allowedClasses`.

3. **Concurrency Safety Verification**:
   - Distributed lease locks in `piket_form_lock` prevent data clobbering when multiple teachers share piket duty.
   - Multi-tenant tenant scoping `(sekolah_id, tanggal, form_type)` ensures school isolation.

---

## 3. Caveats

- In high-latency or disconnected offline situations, if the client cannot reach Supabase, the 5-minute lease will expire without heartbeat, allowing another duty teacher to assume the lock. This is by design to prevent indefinite lockout upon browser termination.
- No other caveats; all specified flows verified empirically.

---

## 4. Conclusion

**Verdict: APPROVE**

The implementation of Milestone 3 (R3 Student Attendance & Piket Flow) meets all acceptance criteria:
- Truancy detection accurately detects gate-present but mapel-alpa scenarios, presenting the required warning badge, top banner, and audit log notes.
- Non-truant scenarios (Hadir, Izin, Sakit, and unrecorded gate arrival) are strictly guarded against false-positive truancy flags.
- RBAC boundaries are completely enforced across subject teachers, homeroom teachers, and duty teachers.
- Concurrency locks prevent duplicate simultaneous editing.
- Type checking (`tsc --noEmit`), unit/adversarial tests, full E2E suites, and production build (`npm run build`) pass cleanly.

---

## 5. Verification Method

To independently verify this evaluation:

1. **Run Dedicated Milestone 3 Adversarial Test Suite**:
   ```powershell
   npx tsx tests/adversarial_m3_truancy_rbac_challenger.test.ts
   ```
   *Expected: 17 / 17 tests PASS.*

2. **Run Worker Milestone 3 Test Suite**:
   ```powershell
   npx tsx tests/m3_student_attendance_piket_lock.test.ts
   ```
   *Expected: 17 / 17 tests PASS.*

3. **Run TypeScript Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, zero errors.*

4. **Run Full Test Suite**:
   ```powershell
   npm test
   ```
   *Expected: All test suites PASS.*

5. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected: Optimized production build completes successfully.*

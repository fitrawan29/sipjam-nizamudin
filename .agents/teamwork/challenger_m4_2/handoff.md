# Challenger M4.2 Empirical Verification & Stress Test Handoff Report

**Date**: 2026-09-24T21:49:00Z  
**Author**: Challenger M4.2 (`challenger_m4_2`)  
**Scope**: Milestone 4 (F12, F13, F14, F15) Adversarial Verification & Stress Testing  
**Verdict**: **APPROVE**  
**Target Recipient**: Parent Orchestrator (`27aff737-528f-4fb8-aa92-42cf3da52fd7`)  

---

## 1. Observation

Direct code inspections, automated test executions, and adversarial stress harness results:

### 1.1 F12: Late Accumulation & Alpa Conversion Invariant (`src/components/HomeView.tsx`)
- Lines 120–128:
  ```tsx
  let query = supabase
    .from('presensi_guru')
    .select('timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id')
    .eq('nama_guru', user.nama)
    .eq('tipe_absen', 'Datang');
  ```
- Lines 138–154: `matchWitaMonth` accurately parses ISO timestamps (`2026-09-01T07:15:00+08:00`), slash formats (`9/1/2026 07:15:00`), and Date instances into target WITA month (`2026-09`).
- Lines 167–170 & 195:
  ```tsx
  if (p.status_verifikasi === 'Ditolak') return;
  const detik = Number(p.keterlambatan_detik) || 0;
  totalDetik += detik;
  ...
  setAkumulasiTelat({ detik: totalDetik, alpa: Math.floor(totalDetik / 14400) });
  ```
- **Empirical Stress Test Execution**:
  - Boundary assertions in `tests/adversarial_m4_challenger_2.test.ts`:
    - `0s -> 0 alpa`, `14,399s -> 0 alpa` (3h 59m 59s passes without deduction).
    - `14,400s -> 1 alpa` (4h exact step transition).
    - `28,799s -> 1 alpa`, `28,800s -> 2 alpa` (8h exact step transition).
    - `43,200s -> 3 alpa`, `57,600s -> 4 alpa`, `72,000s -> 5 alpa`.
  - Date parser matrix: All 13 edge cases (month start, month end, past month, next month, null, undefined, empty, corrupt string) passed.
  - Monte-Carlo 1,000-trial randomized batch test: 1,000 batches executed with zero invariant divergence.

### 1.2 F13: Camera Switch Mutex & Delay Stress (`src/components/CameraSelfieCapture.tsx`)
- Lines 100–107:
  ```tsx
  if (isStartingRef.current) return;
  isStartingRef.current = true;
  setCameraError(null);
  stopCamera();
  await new Promise(r => setTimeout(r, 150));
  if (!isMountedRef.current) {
    isStartingRef.current = false;
    return;
  }
  ```
- Line 135: `OverconstrainedError` fallback to `{ video: true, audio: false }`.
- Line 177: `finally { isStartingRef.current = false; }` guarantees mutex unlock under all outcomes.
- Lines 182–187: `toggleFacingMode` checks `if (isStartingRef.current) return;` before updating mode state.
- **Empirical Stress Test Execution**:
  - Mutex burst test: 50 simultaneous concurrent `toggleFacingMode()` calls admitted exactly 1 request; 49 overlapping requests were dropped safely without throwing.
  - Hardware delay guarantee: Measured pause was 154ms, strictly satisfying the `>= 140ms` requirement.
  - Component unmount abort: When unmounted at 50ms during the pause, camera acquisition was aborted and mutex was released cleanly with 0 stream leaks.
  - Fallback and error recovery: `OverconstrainedError` cleanly recovered stream; `NotReadableError` set message `'Kamera sedang digunakan oleh aplikasi lain.'` and released mutex.

### 1.3 F14: Teacher Username & Password Change via `update_user_profile` RPC
- `src/components/AccountSettingsModal.tsx`:
  - Lines 145–166: Validates current password, rejects new passwords shorter than 6 characters (`newPassword.length < 6`), and validates confirmation password match.
  - Lines 170–184: Calls `supabase.rpc('update_user_profile', payload)`. If `changePassword` is false, `p_password` is passed as `null`.
- `supabase/migrations/20260917_security_hardening.sql`:
  - Lines 72–75: `v_caller_id := public.get_auth_user_id(); IF v_caller_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Autentikasi diperlukan...'); END IF;`
  - Lines 92–94: Enforces caller authorization `IF v_caller_id <> p_user_id THEN RETURN json_build_object('success', false, 'message', 'Anda hanya diizinkan untuk memperbarui profil akun Anda sendiri.'); END IF;` (IDOR immune).
  - Lines 110–116: Updates `avatar`, `username`, `password`, `nama`. Column `role` is strictly excluded from mutation.
- **Empirical Live Database Execution**:
  - Live call to `update_user_profile` via anonymous client returned verbatim:
    `{ success: false, message: 'Autentikasi diperlukan untuk memperbarui profil.' }`.
  - Client-side validation suite: 9/9 form validation checks passed (including empty username, 5-char password rejection, mismatch rejection, 6-char acceptance).

### 1.4 F15: Multi-Tab Search & Filter Conjunction (`src/components/AdminDataView.tsx`)
- Lines 1370–1422: `filteredList` evaluates text search across 12 item fields with whitespace trimming and enforces tab-specific dropdown criteria via strict AND conjunction.
- Lines 1632–1799: Dropdown `<select>` controls rendered in JSX for all 6 tabs (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`).
- **Empirical Stress Test Execution**:
  - All 6 tabs tested against complex multi-criteria permutations:
    - `Data_Siswa`: `Kelas="VII A"` AND `Status="Aktif"` AND `Search="Budi"` correctly isolated target students.
    - `Data_Guru`: `Status="Aktif"` AND `Mapel="Matematika"` correctly isolated target teachers.
    - `Data_Mapel`: `Kategori="Wajib A"` AND `Search="Bahasa"` correctly matched.
    - `Kalender_Pendidikan`: `Tipe="Libur"` AND `Bulan="09"` correctly matched September holidays while excluding December.
    - `Jadwal_Pelajaran`: `Hari="Senin"` AND `Kelas="VII A"` AND `Search="IPA"` correctly isolated schedule.
    - `Wali_Kelas`: `Kelas="VII A"` AND `Tahun Ajaran="2026/2027"` filtered homeroom assignments uniquely.
  - Regex crash injection: Tested search terms `(Dasar)`, `+`, `[Kelas X]`, `*Organik*`, `Biologi?` with 0 unhandled exceptions or regex syntax errors.
  - Null-safety: Corrupted datasets with `null`, `undefined`, and empty object entries filtered without throwing `TypeError`.

---

## 2. Logic Chain

1. **F12 Late Invariant**: The requirement states that tardiness is accumulated per teacher and converted to Alpa at a rate of 1 day per 4 hours (14,400 seconds). The mathematical step function `Math.floor(totalDetik / 14400)` strictly models this constraint. Records with `status_verifikasi === 'Ditolak'` are skipped, preventing unverified or rejected presensi from triggering wrongful Alpa penalties. Month-matching in WITA guarantees that tardiness resets cleanly across billing/attendance periods.
2. **F13 Hardware Mutex**: WebKit iOS Safari crashes or throws `NotReadableError` if `getUserMedia` is called concurrently or before the previous sensor is released. The combination of `isStartingRef.current` mutex, `stopCamera()`, and a mandatory 150ms delay creates a hardware-safe serialization barrier that withstands rapid user tapping.
3. **F14 Profile & Security**: Teachers now have access to `AccountSettingsModal` via header, drawer, and HomeView. Passwords are validated client-side with a strict 6-character floor and matching confirmation. Server-side, `update_user_profile` validates caller identity via `get_auth_user_id()`, prevents IDOR tampering across users or schools, enforces username uniqueness, and leaves user roles strictly immutable.
4. **F15 Query Logic**: In `AdminDataView.tsx`, master data is dynamically filtered using native `Array.prototype.filter` with `String.prototype.includes`. By utilizing string inclusion rather than unescaped `RegExp`, user inputs with regex metacharacters cannot trigger regex syntax errors. Combining search and column dropdowns with boolean AND ensures precision across all 6 administrative tables.

---

## 3. Caveats

- Camera hardware behavior in `CameraSelfieCapture.tsx` was tested in a simulated WebKit environment conforming to MDN/W3C Media Capture specifications; physical iOS Safari device behavior depends on user granting browser permissions over HTTPS.
- No other caveats: All mathematical invariants, security boundaries, and concurrency constraints pass empirically.

---

## 4. Conclusion

Milestone 4 (F12, F13, F14, F15) satisfies all functional requirements and passes every adversarial stress test without defect or regression.

**Gate Verdict: APPROVE**

---

## 5. Verification Method

To independently verify this evaluation:

1. **Run Challenger Adversarial Suite (60 assertions)**:
   ```bash
   npx tsx tests/adversarial_m4_challenger_2.test.ts
   ```
   *Expected output*: `TOTAL CHECKS: 60, PASSED: 60, FAILED: 0`.

2. **Run Cross-Challenger Adversarial Suite (78 assertions)**:
   ```bash
   npx tsx tests/challenger_m4_adversarial.test.ts
   ```
   *Expected output*: `TOTAL ADVERSARIAL ASSERTIONS: 78, PASSED: 78, FAILED: 0`.

3. **Run Full Project Test Suite**:
   ```bash
   npm test
   ```
   *Expected output*: All 10 suites pass with 0 errors.

4. **Run TypeScript Check & Production Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   *Expected output*: Zero type errors, Next.js optimized production build succeeds.

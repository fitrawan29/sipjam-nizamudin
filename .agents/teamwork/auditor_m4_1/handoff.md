# Forensic Audit & Integrity Verification Report — Milestone 4 (F12, F13, F14, F15)

**Date**: 2026-09-25T05:50:00+08:00  
**Auditor**: Forensic Auditor M4.1 (`auditor_m4_1`)  
**Target Recipient**: Parent Orchestrator (`orchestrator_3` / `27aff737-528f-4fb8-aa92-42cf3da52fd7`)  
**Work Product**: Milestone 4 Implementation (`src/components/HomeView.tsx`, `src/components/CameraSelfieCapture.tsx`, `src/components/AccountSettingsModal.tsx`, `src/components/AppScreen.tsx`, `src/components/AdminDataView.tsx`)  
**Profile**: General Project (Benchmark Mode)  
**Verdict**: **CLEAN**

---

## Forensic Audit Summary

| Prohibited Pattern | Benchmark Mode Strictness | Status | Finding / Evidence |
|---|---|---|---|
| **1. Hardcoded test results** | 🔴 PROHIBITED | **PASS (CLEAN)** | Zero hardcoded return values, fake mocks, or test-specific branches detected in component code. |
| **2. Facade implementations** | 🔴 PROHIBITED | **PASS (CLEAN)** | All components implement authentic, reactive, production-grade business logic and state management. |
| **3. Fabricated verification outputs** | 🔴 PROHIBITED | **PASS (CLEAN)** | All test suites and builds were executed live and empirically verified by the auditor. |
| **4. Self-certifying / circular tests** | 🔴 PROHIBITED | **PASS (CLEAN)** | Tests verify actual source AST/content and exercise rigorous algorithmic simulations independently. |
| **5. Execution delegation** | 🔴 PROHIBITED | **PASS (CLEAN)** | Target deliverables are genuinely implemented in-tree without delegating core logic to external cheats. |

---

## 5-Component Forensic Handoff Report

### 1. Observation

Direct empirical inspection and verification of source code and test outputs revealed:

#### 1.1 F12: Keterlambatan Accumulation Fix (`src/components/HomeView.tsx`)
- **Query Integrity**: Lines 120–128 genuinely query Supabase table `presensi_guru` selecting `timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id` filtered by `nama_guru === user.nama`, `tipe_absen === 'Datang'`, and `sekolah_id`.
- **WITA Month Parser**: Lines 137–154 (`matchWitaMonth`) dynamically matches current year-month against both ISO strings (`YYYY-MM-DDTHH:mm:ss+08:00`) and slash date strings (`M/D/YYYY HH:mm:ss`) in WITA timezone.
- **Exclusion of Rejected Records**: Line 167 explicitly executes:
  ```tsx
  if (p.status_verifikasi === 'Ditolak') return;
  ```
  ensuring attendance records rejected by administration do not improperly accumulate late penalty seconds.
- **Accurate Late & Alpa Summation**: Lines 169–170 & 195 accumulate total seconds (`totalDetik += Number(p.keterlambatan_detik) || 0`) and compute 1 Alpa per 14,400s (4 hours) via `Math.floor(totalDetik / 14400)`.
- **UI Rendering**: Lines 1040–1059 render late duration formatted into `X Jam Y Menit Z Detik` alongside red badge indicator for `Potongan Alpa` when `akumulasiTelat.alpa > 0`.

#### 1.2 F13: Camera Switch `facingMode` Fix (`src/components/CameraSelfieCapture.tsx`)
- **Concurrency Mutex Lock**: Lines 26, 100–101, and 183 employ `isStartingRef = useRef(false)` to strictly block concurrent or re-entrant camera toggling.
- **Clean Stream Teardown**: Lines 85–96 stop every existing media track (`track.stop()`) and nullify `srcObject` before opening a new stream.
- **Hardware Sensor Release Delay**: Line 107 enforces `await new Promise(r => setTimeout(r, 150))`, critical for iOS Safari WebKit hardware sensor release before invoking `getUserMedia`.
- **Decoupled Mount Hook**: Lines 190–199 decouple `useEffect` from `facingMode`, preventing double-invocation cascades during camera switching.
- **OverconstrainedError Fallback**: Lines 134–140 provide graceful fallback to `{ video: true, audio: false }` for single-camera devices.
- **iOS WebKit Inline Flags**: Lines 152–153 & 305–307 enforce `playsInline`, `webkit-playsinline`, `autoPlay`, and `muted`.

#### 1.3 F14: Teacher Username & Password Change Option (`src/components/AccountSettingsModal.tsx` & `src/components/AppScreen.tsx`)
- **Password Length Enforcement**: Lines 157–160 in `AccountSettingsModal.tsx` enforce minimum 6 characters:
  ```tsx
  if (newPassword.length < 6) {
    Swal.fire('Validasi Gagal', 'Password baru minimal 6 karakter.', 'warning');
    return;
  }
  ```
- **Database Synchronization**: Lines 170–184 invoke PostgreSQL stored procedure `supabase.rpc('update_user_profile', payload)` passing `p_password: changePassword ? newPassword : null` to safely preserve existing credentials if password is not modified.
- **Multi-surface Access Points**:
  - Global header in `src/components/AppScreen.tsx` (lines 376–382)
  - Sidebar mobile drawer in `src/components/AppScreen.tsx` (lines 424–430)
  - Teacher header banner in `src/components/HomeView.tsx` (lines 901–911) with "Edit Akun" button wired to `onOpenAccountSettings`.

#### 1.4 F15: Master Menus Search Bar & Column Dropdown Filters (`src/components/AdminDataView.tsx`)
- **Search Sanitization**: Lines 1376–1393 use literal `.toLowerCase().includes(term)` across all record properties, safely handling metacharacters (`+`, `(`, `)`, `[`, `]`) without regex crashing.
- **Dynamic Dropdown Filters**: Lines 1284–1368 dynamically derive sorted unique option lists from `dataList` (`uniqueKelas`, `uniqueStatusSiswa`, `uniqueStatusGuru`, `uniqueMapel`, `uniqueKategori`, `uniqueTipeKalender`, `uniqueHari`, `uniqueTahunAjaran`).
- **JSX Select Elements**: Lines 1637–1798 render accessible `<select>` dropdown controls with tooltips across all 6 tabs (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`).
- **AND Conjunction Enforcement**: Lines 1395–1422 strictly enforce multi-criteria AND conjunction between text search and active column filters.
- **Reset Button**: Lines 1800–1815 render a dynamic "Reset Filter" button clearing search and resetting dropdowns to `ALL`.

---

### 2. Logic Chain

1. **Anti-Cheating Verification**: A thorough inspection across all four component files confirmed no conditional bypasses (e.g. `process.env.NODE_ENV === 'test'` or mock stubs returning fixed values). All computations (`totalDetik`, `Math.floor(totalDetik / 14400)`, `newPassword.length < 6`, and `filteredList`) operate dynamically on runtime data.
2. **Apple / Mobile Safari Compatibility**: The combination of `isStartingRef` mutex locking, 150ms sensor release pause, `OverconstrainedError` fallback, and `playsinline` attributes addresses the core WebKit camera toggle freeze bug.
3. **Teacher Autonomy**: Exposing `AccountSettingsModal` in both the top header, the drawer menu, and the teacher dashboard banner fulfills requirement R3 without exposing administrative controls to teachers.
4. **Data Administration Ergonomics**: Master data filtering combines general substring matching with tab-specific column dropdowns, strictly joined via boolean AND logic, enabling instantaneous record isolation across large tables.

---

### 3. Caveats

- **Integrity Mode**: Benchmark Mode constraints were strictly enforced. Zero external dependency delegation or unauthorized code borrowing occurred.
- **Camera Runtime**: Hardware camera testing in live mobile browsers requires HTTPS or `localhost` context to satisfy WebRTC security requirements.
- **No caveats**: All 186 E2E tests, 35 M4 verification assertions, 10 unit test suites, TypeScript compilation, and Turbopack production builds passed with 0 errors.

---

### 4. Conclusion

**Verdict: CLEAN**

Milestone 4 (F12, F13, F14, F15) satisfies all authenticity, anti-cheating, and behavioral requirements outlined in `ORIGINAL_REQUEST.md`. The implementation is genuine, production-grade, and free of integrity violations.

---

### 5. Verification Method

The auditor independently ran all verification commands on Windows PowerShell:

1. **Milestone 4 Dedicated Test Suite**:
   ```powershell
   npx tsx tests/m4_features_verification.test.ts
   ```
   *Result*: **35/35 PASSED** (Exit Code 0).

2. **Full Unit Test Suite**:
   ```powershell
   npm test
   ```
   *Result*: **All 10 suites PASSED** (Exit Code 0).

3. **Complete E2E Test Suite (Tiers 1–4)**:
   ```powershell
   npm run test:e2e
   ```
   *Result*: **186/186 assertions PASSED (100%)** (Exit Code 0).

4. **TypeScript Compiler Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Result*: **Clean compilation (0 errors)** (Exit Code 0).

5. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Result*: **Next.js 16.3.4 (Turbopack) production build completed cleanly** (Exit Code 0).

# Quality & Adversarial Review Report — Milestone 3 (Requirement R4)

## Review Summary

**Verdict**: REQUEST_CHANGES

The implementation of Milestone 3 by `worker_m3_nov` successfully introduces the Clay-styled Visual Workflow Stepper, full 9-step canonical order in `AdminDataView.tsx`, tab routing & URL synchronization, pre-upload relational validation, upload progress indicators, and granular database error diagnostics.

However, adversarial stress testing and gate verification revealed two blocking issues that must be addressed before approval:
1. **Critical Defect (Data Loss on CSV Upload)**: `src/lib/dataIntegrityGuard.ts` (`normalizeCsvHeaders`) unconditionally aliases `'kelompok'` to `'kategori'`. In `data_mapel`, `kategori` and `kelompok` are distinct database columns defined in `Template_Data_Mapel.csv` (`['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']`). This causes `kelompok` to overwrite `kategori` and be dropped entirely from the parsed payload, failing adversarial test `tests/adversarial_m3_dependencies.test.ts` (Check 3.3).
2. **Major Regression (CI Gate Failure)**: The repository working tree contains uncommitted edits in `src/lib/workflow.ts` and `src/components/GuruPresensi.tsx` that break `tests/jurnal_r1_r2_r3_verification.test.ts` during `npm test` (Check 2.1 fails with `false !== true`).

---

## 1. Observation

### Observation 1.1: Canonical Tab Sequence & Visual Stepper in `AdminDataView.tsx`
- **File**: `src/components/AdminDataView.tsx` lines 217–227:
  ```tsx
  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa', step: 1, icon: 'fa-user-graduate', desc: 'Identitas Siswa' },
    { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas', step: 2, icon: 'fa-chalkboard', desc: 'Rombel & Tingkat' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel', step: 3, icon: 'fa-book', desc: 'Mata Pelajaran' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru', step: 4, icon: 'fa-chalkboard-user', desc: 'Data Pendidik' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran', step: 5, icon: 'fa-calendar-days', desc: 'Jadwal KBM' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas', step: 6, icon: 'fa-user-tie', desc: 'Penugasan Wali' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users', step: 7, icon: 'fa-users-gear', desc: 'Akun Login' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan', step: 8, icon: 'fa-calendar-check', desc: 'Hari Efektif & Libur' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok', step: 9, icon: 'fa-cubes', desc: 'Rotasi Blok KBM', optional: true },
  ];
  ```
- **Visual Workflow Stepper Card**: `src/components/AdminDataView.tsx` lines 2482–2558 renders an interactive Clay-styled pipeline above the tab pills:
  - Active step: purple-to-indigo gradient (`bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/50`).
  - Past steps: white/dark background with purple checkmark circle (`<i className="fa-solid fa-check text-[9px] sm:text-[10px]"></i>`).
  - Connectors: `fa-solid fa-chevron-right` between pipeline items.
  - Interactive click handling: `onClick={() => handleSwitchTab(step.id)}`.

### Observation 1.2: Tab Routing & URL Query Parameter Synchronization
- **File**: `src/components/AdminDataView.tsx` lines 229–239:
  ```tsx
  const handleSwitchTab = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedStudentIds([]);
    setSearch('');
    setFilter1('ALL');
    setFilter2('ALL');
    setPage(0);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `?view=view-admin-data&tab=${tabId}`);
    }
  };
  ```
- Also synchronizes URL when auto-switching tabs on CSV upload (lines 786–788).

### Observation 1.3: AST Invariant Preservation
- **File**: `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` lines 338–353:
  - Matches `const tabsMatch = adminDataSrc.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\];/);`
  - Verifies `id: 'Data_Kelas'`, `label: 'Kelas'`, `table: 'data_kelas'`.
  - Verifies position: `Data_Siswa` < `Data_Kelas` < `Data_Guru`.
  - Result: `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` passed 58/58 checks.

### Observation 1.4: Adversarial Test Failure — `data_mapel.kelompok` Dropped
- **Tool Command**: `npx tsx tests/adversarial_m3_dependencies.test.ts`
- **Output**:
  ```
  ✖ [FAIL] 3.3: Every template can be roundtripped through parseAndValidateMasterCsv without errors
     AssertionError [ERR_ASSERTION]: Template [Data_Mapel] column "kelompok" was unexpectedly dropped or missing after parseAndValidateMasterCsv
    at <anonymous> (C:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\adversarial_m3_dependencies.test.ts:491:16)
  ```
- **Source Cause**: In `src/lib/dataIntegrityGuard.ts` lines 801–803:
  ```ts
  // 11. Category aliases
  if (clean === 'kelompok' || clean === 'kategori_mapel') {
    return 'kategori';
  }
  ```
  `clean === 'kelompok'` is unconditionally rewritten to `'kategori'`.
  However, in `AdminDataView.tsx` line 523:
  `Data_Mapel: { filename: 'Template_Data_Mapel.csv', headers: ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'], sample: ['MP-01', 'Matematika Wajib', 'Umum', 'Wajib'] }`
  And in `dataIntegrityGuard.ts` line 1257:
  `ALLOWED_COLUMNS_BY_TABLE`: `data_mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan', 'kode_mapel', 'nama_mapel']`
  Because `'kelompok'` becomes `'kategori'`, it overwrites the `'kategori'` field and `'kelompok'` is never populated in the database.

### Observation 1.5: Workspace Regression on `npm test`
- **Tool Command**: `npm test`
- **Output**:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧪 TEST SUITE: JURNAL FOTO UPLOAD, PRESENSI PULANG & REKAP STANDAR (R1-R3)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  --- Section 2: R2 - Presensi Pulang Flexibility & Time Validation ---
    ❌ [FAIL] 2.1: canTeacherPresensiPulang allows departure when presensiDatang is present even without journals: canTeacherPresensiPulang MUST return true once presensiDatang exists

  false !== true
  ```
- **Root Cause**: `git status` shows uncommitted changes in:
  - `src/components/GuruPresensi.tsx`
  - `src/lib/workflow.ts`
  - `tests/sistem_blok_verification.test.ts`
  Reverting `canTeacherPresensiPulang` from returning `true` to requiring all journals filled breaks `tests/jurnal_r1_r2_r3_verification.test.ts`.

---

## 2. Logic Chain

1. *Requirement R4 Compliance*: R4 demands: "Menata urutan navigasi menu dan panduan alur penginputan master data sesuai urutan: siswa, kelas, mapel, guru, jadwal, wali kelas, pengguna, kalender, dan periode sistem blok (opsional)".
   - Observation 1.1 confirms that `AdminDataView.tsx` defines all 9 tabs in exact canonical sequence with step numbers 1 to 9.
   - Observation 1.1 and 1.2 confirm that the Visual Workflow Stepper card renders with full Claymorphism styling, past step checkmarks, active step gradient highlights, and `handleSwitchTab` routing that synchronizes `?view=view-admin-data&tab=${tabId}` and resets filters.
   - Observation 1.3 confirms all regex AST invariants in `admin_submenu_kelas_dan_alokasi_siswa.test.ts` pass without regression.

2. *Template & Column Mapping Integrity*: R4 demands: "Memastikan template data pada masing-masing master data sesuai dengan format skema database agar tidak ada error saat pengunggahan."
   - In `AdminDataView.tsx`, the template for `Data_Mapel` specifies both `kategori` and `kelompok`.
   - The database table `data_mapel` has separate columns `kategori` and `kelompok`.
   - However, Observation 1.4 reveals that `normalizeCsvHeaders` rewrites `kelompok` to `kategori`. When an administrator downloads `Template_Data_Mapel.csv` and uploads it, `kelompok` overwrites `kategori`, and `kelompok` is completely omitted from the database insert payload.
   - This was caught by adversarial check 3.3 in `tests/adversarial_m3_dependencies.test.ts`.

3. *Regression Invariant (R6)*: R6 requires zero regression across all test suites (`npm test`).
   - Observation 1.5 proves that `npm test` failed on `tests/jurnal_r1_r2_r3_verification.test.ts` due to conflicting uncommitted edits in `workflow.ts` and `sistem_blok_verification.test.ts`.
   - Because `npm test` fails, the implementation cannot pass the quality gate until this regression is resolved.

---

## 3. Findings

### [Critical] Finding 1: `normalizeCsvHeaders` drops `kelompok` column on `data_mapel` import
- **Where**: `src/lib/dataIntegrityGuard.ts` lines 801–803.
- **Why**: Unconditionally mapping `kelompok` -> `kategori` causes `data_mapel` to lose its `kelompok` data and corrupts `kategori` with the `kelompok` value.
- **Suggestion**: Scope the alias so that for `tableName` === `'data_mapel'` or `'mapel'`, `kelompok` remains `'kelompok'`:
  ```ts
  // 11. Category aliases
  if (clean === 'kelompok') {
    return isMapel ? 'kelompok' : 'kategori';
  }
  if (clean === 'kategori_mapel') {
    return 'kategori';
  }
  ```

### [Major] Finding 2: Uncommitted workspace edits cause `npm test` failure
- **Where**: `src/lib/workflow.ts` line 1333, `src/components/GuruPresensi.tsx` line 377, `tests/sistem_blok_verification.test.ts` line 1640.
- **Why**: Reverting `canTeacherPresensiPulang` causes `tests/jurnal_r1_r2_r3_verification.test.ts` to fail during `npm test`, breaking the regression gate.
- **Suggestion**: Harmonize `tests/sistem_blok_verification.test.ts` and `src/lib/workflow.ts` so that `tests/jurnal_r1_r2_r3_verification.test.ts` and `tests/sistem_blok_verification.test.ts` both pass simultaneously.

---

## 4. Verified Claims

- Canonical 9-step tab sequence in `AdminDataView.tsx` -> verified via AST & inspection -> PASS
- Claymorphism Visual Workflow Stepper UI -> verified via DOM / CSS classes inspection -> PASS
- URL query parameter synchronization (`?view=view-admin-data&tab=${tabId}`) -> verified in `handleSwitchTab` -> PASS
- Invariant compatibility with `admin_submenu_kelas_dan_alokasi_siswa.test.ts` -> verified via test run (58/58) -> PASS
- Pre-upload relational dependency validation in `validateRelationalDependencies` -> verified via test run (18/18) -> PASS
- Granular PostgreSQL error translation (`23503`, `23502`, `23505`, `42501`) -> verified in `adversarial_m3_diagnostics.test.ts` (22/22) -> PASS
- Monotonic upload progress bar and micro-yield event-loop responsiveness -> verified via test run -> PASS
- Integrity Check: NO fake/hardcoded tests, NO dummy facades, NO shortcuts -> verified via forensic inspection -> CLEAN

---

## 5. Caveats

- Testing was performed in the Windows development workspace using mocked / simulated Supabase responses as well as offline AST analysis.
- Live PostgreSQL production database constraints were simulated using the project's standardized test harness.

---

## 6. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 3 is 95% complete with excellent architecture and genuine implementations across the visual stepper, relational checks, and diagnostics. However, the `kelompok` column drop bug in `dataIntegrityGuard.ts` and the `npm test` regression must be resolved before Milestone 3 can be approved and merged into production.

---

## 7. Verification Method

To independently verify after fixes are applied:
1. `npx tsc --noEmit` -> Must return exit code 0.
2. `npx tsx tests/master_data_workflow_stepper_and_relational_validation.test.ts` -> 18/18 PASS.
3. `npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` -> 58/58 PASS.
4. `npx tsx tests/adversarial_m3_dependencies.test.ts` -> Must pass 23/23 (verifying `data_mapel.kelompok` is preserved).
5. `npx tsx tests/adversarial_m3_diagnostics.test.ts` -> 22/22 PASS.
6. `npm test` -> All 62+ suites must complete with exit code 0.

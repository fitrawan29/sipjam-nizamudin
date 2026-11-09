# Handoff Report: BK Role & Non-Regression Survey (R1 & R3)

**Agent**: `explorer_bk_3`  
**Date**: 2026-11-09  
**Scope**: 
1. Admin & Kepala Sekolah Access to BK Journal (Monitoring & Supervision)
2. Non-Regression of Existing Features (Guru Mapel Journals, Schedules, Piket, Homeroom, RBAC)
3. Test Suite & Verification Audit (Test runner analysis & 6-suite verification strategy)

---

## 1. Observation

### 1.1 Existing Admin & Kepala Sekolah Access Architecture
- **Kepala Sekolah Detection & RBAC**:
  - `src/hooks/useKepalaSekolah.ts`: Lines 23–76:
    `checkIsKepalaSekolah(user, schoolData, configData)` identifies Kepala Sekolah via:
    1. Direct role check: `roleNorm === 'kepalasekolah' || roleNorm === 'kepsek' || roleNorm === 'pltkepalasekolah' || roleNorm === 'plhkepalasekolah'`.
    2. Explicit flags: `user.is_kepala_sekolah === true || user.isKepalaSekolah === true`.
    3. Designated ID: `configData?.kepala_sekolah_id` matching `user.id || user.guru_id || user.data_guru_id`.
    4. NIP / Title-normalized name matching against `nama_kepala_sekolah` / `ttd_kepsek_nip`.
- **Read-Only Pattern for Kepala Sekolah in Admin Views**:
  - `src/components/AppScreen.tsx`: Line 1311:
    `<AdminVerifView user={user} isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin} initialTab={urlTab || undefined} />`
  - `src/components/AdminVerifView.tsx`: Lines 1047–1057:
    ```tsx
    {isReadOnly && (
      <div data-testid="readonly-notice" className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-eye text-xs"></i>
        </div>
        <div>
          <span className="font-bold block">Mode Peninjauan (Monitoring Read-Only)</span>
          <span className="text-[11px] opacity-90">Akses pemantauan verifikasi aktif. Aksi modifikasi data dan persetujuan verifikasi dinonaktifkan.</span>
        </div>
      </div>
    )}
    ```
  - `src/components/AdminVerifView.tsx`: Lines 368–370 & 531–533:
    `if (isReadOnly) return showToast('Mode Peninjau', 'Aksi dinonaktifkan: Anda dalam mode peninjauan (read-only).', 'warning');`
  - `src/components/RekapSiswaView.tsx`: Lines 266–271:
    `disabled={waliSaving || waliLoading || waliStudents.length === 0 || isIntervensiExpired || isReadOnly}`
- **Admin Verification Current Scope**:
  - `src/components/AdminVerifView.tsx`: Lines 103 & 356–364:
    Active tabs are: `'Presensi' | 'Jurnal' | 'Piket' | 'Dokumen'`.
    `table: 'jurnal_pembelajaran'` is queried for the `Jurnal` tab.
    Lines 734–740 calculate delinquency (`unsubmittedJurnal`) comparing all teachers against `allJadwalPelajaran`.
- **Rekap Jurnal Current Scope**:
  - `src/components/RekapJurnalView.tsx`: Lines 57–58 & 201–205:
    Supports `tabMode: 'pribadi' | 'kelas'` querying `jurnal_pembelajaran`.
    In classroom mode (`kelas`), allows Admin and Kepala Sekolah to inspect all classes, while regular teachers are strictly locked out and Wali Kelas can only view their assigned class (Lines 183–197).

### 1.2 Non-Regression Invariants in Existing Codebase
- **Guru Mapel KBM Coupling Invariants**:
  - `src/components/GuruJurnal.tsx`: Lines 63–85:
    Tied strictly to `tipeJurnal` ('Jurnal KBM' / 'Jurnal Kegiatan'), `mapel` (subject), `kelas` (class), `pertemuanKe`, `jamKe`, and `absensi` (student attendance per teaching slot). Writes to table `jurnal_pembelajaran`.
  - `src/lib/workflow.ts`: Lines 1430–1470:
    `canTeacherPresensiPulang(state)`: Verifies whether scheduled KBM journals (`jadwalKBM`) match submitted KBM journals (`jurnalKBM`) in `jurnal_pembelajaran`. If scheduled classes are unfilled, afternoon checkout (`Presensi Pulang`) is locked with `lockedReason: "Anda belum menyelesaikan: Jurnal (KBM/Kegiatan)"`.
  - `src/lib/attendanceAlpa.ts`: Lines 9–11:
    Auto-records delinquency (`recordUnfilledJournalsAndPiket`) inserting `"tidak masuk kelas"` into `jurnal_pembelajaran` if teachers fail to submit scheduled KBM journals.
- **Piket & Presence Workflows**:
  - `src/components/PiketView.tsx`: Guarded by `isAdmin || isSuperadmin || isPiketHariIni`.
  - `src/components/GuruPresensi.tsx`: Lines 600–620:
    Universal attendance records in `presensi_guru`.
- **AST Comment Invariants**:
  - `src/components/AppScreen.tsx`: Line 1024:
    `{/* AST preservation: data-tour={item.id} */}`
  - `src/components/ClaySidebar.tsx`: Line 73:
    `{/* AST preservation: data-tour={item.id} */}`
  - Verified by `tests/tata_usaha_role_rbac_and_isolation.test.ts`: Lines 347–350.

### 1.3 Test Suite & Runner Audit
- **Test Runner**:
  - `package.json`: Line 10:
    Scripts run via `tsx tests/<file>.test.ts`. Node standard assertion library (`node:assert` or `assert`) is used with colorized terminal output.
  - Zero external test runner overhead (no Vitest / Jest configuration needed).
- **Existing Test Execution Proof**:
  - Executed `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`: 87/87 passed in 2.1s.
  - Executed `npx tsx tests/kepsek_pengawas_rbac.test.ts`: 47/47 passed in 1.8s.
  - Executed `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`: 20/20 passed in 1.9s.
  - Executed `npx tsx tests/tutuyan_jurnal_kelas_dan_nizamudin_isolation.test.ts`: 16/16 passed in 4.5s.

---

## 2. Logic Chain

1. **Decoupling BK Journal from `jurnal_pembelajaran`**:
   - *Premise*: `jurnal_pembelajaran` is wired directly into `GuruDailyState`, `unsubmittedJurnal` delinquency calculation, and `canTeacherPresensiPulang`.
   - *Inference*: If BK journals were saved in `jurnal_pembelajaran`, counseling records without `mapel`, `kelas`, or `jam_ke` would break KBM validation, trigger false delinquency reports in `AdminVerifView`, or interfere with teacher checkout.
   - *Conclusion*: Jurnal BK must operate on a distinct storage structure (`jurnal_bk` table / dedicated client persistence abstraction), completely separated from `jurnal_pembelajaran`.

2. **Admin & Kepala Sekolah Role-Based Access Pattern**:
   - *Premise*: Original user request R1 states: *"Akses terhadap data jurnal BK dibatasi hanya untuk role BK dan Admin / Kepala Sekolah, dan tidak dapat diakses oleh role guru reguler atau pengguna lain tanpa izin."*
   - *Inference*: In the SIPJAM design system:
     - Admin has full operational authority (can view all entries, filter across all counselors, and manage/edit/delete if needed).
     - Kepala Sekolah has executive oversight authority. In accordance with established architectural patterns in `AdminVerifView`, `RekapSiswaView`, and `AdminRekapView`, Kepala Sekolah views all records but operations must be read-only (`isReadOnly={true}`).
   - *Conclusion*: The BK Journal view (`BkJurnalView.tsx`) must accept `user` and `isReadOnly`. When `isKepalaSekolah && !isAdmin && !isSuperadmin`:
     - Mutative actions (Tambah Jurnal BK, Edit, Hapus) are hidden/disabled.
     - A banner `<div data-testid="readonly-notice">` is displayed.
     - Filtering by counselor, date range, student, service type, and case status is fully available.

3. **Protection Against Prohibited Roles (Confidentiality Protection)**:
   - *Premise*: Counseling records contain highly sensitive student personal and disciplinary cases.
   - *Inference*: Regular teachers (`guru`), homeroom teachers (`wali_kelas`), piket teachers, administrative staff (`tata_usaha`), students (`siswa`), and regional officers (`dinas_pendidikan`) must not view or tamper with BK records.
   - *Conclusion*: 
     - In `src/lib/navigation.ts`: `evaluateTabRBAC('view-jurnal-bk', '', user)` must return `{ allowed: true }` ONLY for `normRole === 'bk'`, `normRole === 'gurubk'`, `isAdmin`, and `isKepalaSekolah`. For all other roles, it must return `{ allowed: false, fallbackTab: 'view-home', reason: '...' }`.
     - In `src/components/AppScreen.tsx`: Both `handleNavigation` and JSX render branches must block unauthorized roles and display an "Akses Terblokir" card.

4. **Sidebar Menu Consolidation (Miller's Law 7 ± 2)**:
   - *Premise*: `getConsolidatedMenuItems` maintains 5–9 items per role.
   - *Conclusion*:
     - For `role === 'bk'`: Return strictly 5 menu items:
       1. Dashboard (`view-home`)
       2. Presensi BK (`view-guru-presensi`)
       3. Jurnal Bimbingan Konseling (`view-jurnal-bk`)
       4. Informasi Sekolah (`view-informasi`)
       5. Pengaturan Akun (`view-pengaturan-akun`)
     - For `role === 'kepalasekolah'`: Retains 7 items + optionally adds Bimbingan Konseling (`view-jurnal-bk`) = 8 items (compliant with 7 ± 2).
     - For `role === 'admin'`: Retains 9 items; can access `view-jurnal-bk` via menu or via Pusat Supervisi.
     - For all other roles: Sidebar menus remain 100% untouched.

---

## 3. Caveats

1. **Database Schema Availability**:
   - In production Supabase instances without the `jurnal_bk` table yet created, the application must use resilient schema cache handling and fallback patterns (e.g. client fallback / local persistence / memory sync) similar to `sekolah_registry` and `data_guru` fallback routines in `src/lib/supabaseClient.ts`.
2. **Dual-Role Assignment**:
   - If a teacher is assigned as both Guru Mapel and BK Counselor, their primary role in `users.role` determines their default navigation, while `evaluateTabRBAC` and `AppScreen` should allow access based on their assigned privileges.
3. **Multi-Tenant Scoping**:
   - All BK journal queries, student lookups, and counselor lookups must strictly filter by `sekolah_id` to guarantee tenant isolation across satellite schools.

---

## 4. Conclusion

### 4.1 Recommendations for Admin & Kepala Sekolah Access
1. **Access Mechanism**:
   - Provide direct access to `view-jurnal-bk` (`BkJurnalView.tsx`) for Role BK, Admin, and Kepala Sekolah.
   - In `AdminVerifView` / `RekapJurnalView`, provide an intuitive quick-switch or subtab button allowing Admin and Kepala Sekolah to effortlessly navigate to Jurnal BK.
2. **Controls & Filters in `BkJurnalView`**:
   - **Counselor Filter**: Select specific BK counselor or "Semua Guru BK" (enabled for Admin & Kepsek).
   - **Date Range Filter**: Filter by date range (start date & end date) or single date.
   - **Student Search**: Autocomplete / search by Student Name, NISN, or Class across all classes in the school.
   - **Guidance Category Filter (`jenis_layanan`)**: Pribadi, Sosial, Belajar, Karir, Konseling Individu, Konseling Kelompok, Mediasi, Home Visit, Alih Tangan Kasus.
   - **Case Status Filter (`status`)**: Semua, Dalam Penanganan, Selesai, Alih Tangan Kasus.
   - **Print Report**: Formatted print output integrating `PrintHeader` and `PrintSignature` with Kop Sekolah and Headmaster signature.
3. **Mode Protection**:
   - **Role BK**: Full CRUD on own counseling records + school-wide student search.
   - **Admin**: Full supervision, viewing all counseling records, filter, export, and administrative management.
   - **Kepala Sekolah**: Full monitoring with `isReadOnly={true}`: mutative buttons hidden/disabled, `data-testid="readonly-notice"` rendered.
   - **All Other Roles**: Denied access (403).

### 4.2 Non-Regression Architecture
1. **Zero Changes to KBM Tables**:
   - `jurnal_pembelajaran`, `jadwal_pelajaran`, `guru_mapel`, and `sistem_blok` remain exclusively for regular academic teaching and must not be touched by BK entries.
2. **Preservation of Daily Workflow State**:
   - `canTeacherPresensiPulang` in `src/lib/workflow.ts` continues to evaluate KBM journals without any side effects.
3. **AST Preservation Invariant**:
   - Preserve `{/* AST preservation: data-tour={item.id} */}` verbatim in `AppScreen.tsx` and `ClaySidebar.tsx`.

---

## 5. Verification Method & Test Strategy

Implement a dedicated automated test suite:
`tests/bk_role_and_jurnal_rbac_verification.test.ts`
Executable via `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`.

### Test Suites Structure:

```typescript
/**
 * TEST SUITE: ROLE BK & JURNAL BIMBINGAN KONSELING RBAC AND NON-REGRESSION
 * File: tests/bk_role_and_jurnal_rbac_verification.test.ts
 */

// Suite 1: Authentication & Role Identity Invariants
// - T1.1: isAdminRole('bk') strictly returns false (zero role escalation)
// - T1.2: isAdminRole('guru_bk') strictly returns false
// - T1.3: src/types/user.ts defines 'bk' in UserRole union
// - T1.4: src/types/database.ts defines 'bk' in RoleUser union

// Suite 2: Menu Isolation & Canonical Route Aliases (Miller's Law)
// - T2.1: getConsolidatedMenuItems({ role: 'bk' }) returns strictly 5 items
// - T2.2: Menu items contain strictly Dashboard, Presensi BK, Jurnal BK, Informasi Sekolah, Pengaturan Akun
// - T2.3: Menu items strictly exclude view-admin-data, view-dokumen, view-gradebook, view-rapor, view-jurnal-kelas, view-piket, view-ujian
// - T2.4: resolveCanonicalRoute('view-jurnal-bk') resolves to 'view-jurnal-bk'

// Suite 3: RBAC & Routing Isolation (evaluateTabRBAC & AppScreen Guards)
// - T3.1: evaluateTabRBAC allows 'view-jurnal-bk' for role: 'bk' and 'guru_bk'
// - T3.2: evaluateTabRBAC allows 'view-jurnal-bk' for role: 'admin' and 'superadmin'
// - T3.3: evaluateTabRBAC allows 'view-jurnal-bk' for isKepalaSekolah: true
// - T3.4: evaluateTabRBAC strictly denies 'view-jurnal-bk' for role: 'guru' (regular teacher)
// - T3.5: evaluateTabRBAC strictly denies 'view-jurnal-bk' for role: 'guru' with isWaliKelas: true
// - T3.6: evaluateTabRBAC strictly denies 'view-jurnal-bk' for role: 'tata_usaha'
// - T3.7: evaluateTabRBAC strictly denies 'view-jurnal-bk' for role: 'siswa'
// - T3.8: evaluateTabRBAC strictly denies 'view-jurnal-bk' for role: 'dinas_pendidikan'
// - T3.9: AppScreen contains JSX guard and "Akses Terblokir" card for unauthorized direct URL manipulation

// Suite 4: Classless BK Journal Data Model & CRUD Invariants
// - T4.1: BK journal entity contains required fields (siswa_id, nama_siswa, nisn, kelas, tanggal, waktu, jenis_layanan, catatan/uraian_kasus, tindak_lanjut, status)
// - T4.2: Zero foreign key / join dependency on jadwal_pelajaran or academic time slots (jam_ke, pertemuan_ke)
// - T4.3: Classless student selection across any class from data_siswa
// - T4.4: Multi-filter support (counselor, date range, student, service category, status)

// Suite 5: Admin & Kepala Sekolah Access and Read-Only Invariants
// - T5.1: BkJurnalView accepts user and isReadOnly props
// - T5.2: AppScreen passes isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin} to BkJurnalView
// - T5.3: BkJurnalView renders data-testid="readonly-notice" when isReadOnly is true
// - T5.4: Mutative actions (Tambah, Edit, Hapus) are disabled or hidden in read-only mode

// Suite 6: Non-Regression on Existing Roles & Modules
// - T6.1: GuruJurnal.tsx KBM schedule and assignment mapping remains 100% intact
// - T6.2: canTeacherPresensiPulang in src/lib/workflow.ts remains intact
// - T6.3: AST comment {/* AST preservation: data-tour={item.id} */} is preserved in AppScreen.tsx
// - T6.4: Consolidated menus for admin, superadmin, kepalasekolah, guru, tata_usaha, siswa remain 100% unchanged
```

### Invalidation Conditions:
- Any modification that alters existing Guru Mapel journal submissions in `jurnal_pembelajaran`.
- Any leakage of confidential BK counseling records to regular teachers or homeroom teachers (`isWaliKelas`).
- Failure of existing tests (`npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`, `npx tsx tests/kepsek_pengawas_rbac.test.ts`, `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`).

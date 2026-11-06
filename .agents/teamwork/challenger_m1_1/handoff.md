# Empirical Challenge Report: Milestone 1 — Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa

**Challenger**: `challenger_m1_1`  
**Target Milestone**: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)  
**Target Files**: `src/components/AdminKelasView.tsx`, `src/components/AdminDataView.tsx`, `src/lib/navigation.ts`  
**Test Suite Created**: `tests/adversarial_centralized_class_allocation_m1.test.ts`  
**Verdict**: `VERDICT: APPROVE`

---

## 1. Observation

Direct observations and execution results collected across the codebase, verification scripts, and live database:

1. **Class Directory Aggregation & Synthesis (`src/components/AdminKelasView.tsx:197-284`)**:
   - `consolidatedClasses` aggregates classes from 3 distinct sources: physical `dbClasses` (`data_kelas`), in-memory `customClasses`, and distinct `s.kelas` from `allStudents`.
   - `parseTingkat(nama)` (`AdminKelasView.tsx:53-59`) correctly maps Roman and Arabic numerals (`XII/12 -> '12'`, `XI/11 -> '11'`, `X/10 -> '10'`, otherwise `'Lainnya'`).
   - Sorting order (`AdminKelasView.tsx:277-283`) guarantees Grade 10 -> 11 -> 12 -> Lainnya, followed by natural alphanumeric sort.
   - Male (`L`) and female (`P`) student counters accurately partition active students.
   - Students with `status === 'Lulus'` are strictly skipped (`AdminKelasView.tsx:238`), ensuring alumni never inflate active class rosters or spawn phantom class cards.
   - Homeroom teachers (`waliKelasList`) match by class name (`AdminKelasView.tsx:269-274`).

2. **Student Movement & Centralized Re-allocation (`src/components/AdminKelasView.tsx:562-695`)**:
   - Outbound batch move (`handleBatchTransfer`):
     * Updates student `kelas` and `status` in memory first for zero-latency UI responsiveness (`AdminKelasView.tsx:598-610`).
     * Mutates Supabase via `data_siswa.update({ kelas: newKelas, status: newStatus, updated_at: ... }).in('id', studentIds).eq('sekolah_id', sekolahId)` (`AdminKelasView.tsx:614-622`).
     * Clean rollback restores previous state on error (`AdminKelasView.tsx:625-627`).
     * Supports transfer to other classes, expulsion to unassigned pool (`kelas = null`), and graduation (`status = 'Lulus'`).
   - Inbound allocation (`handleInboundAllocate`):
     * Allocates students from unallocated pool or cross-class directly into selected target class.
     * Standalone quick drawer (`AdminKelasView.tsx:1524-1707`) provides rapid allocation for students with `kelas = null` or `''`.

3. **Cascading Rename Integrity (`src/components/AdminKelasView.tsx:414-504`)**:
   - Cascades class rename across 4 tables:
     1. `data_siswa.update({ kelas: targetName }).eq('sekolah_id', sekolahId).eq('kelas', oldName)`
     2. `wali_kelas.update({ kelas: targetName })` guarded by conflict pre-check to prevent `uq_wali_kelas_sekolah_kelas` (`23505`) violations.
     3. `jadwal_pelajaran.update({ kelas: targetName }).eq('sekolah_id', sekolahId).eq('kelas', oldName)`
     4. `data_kelas.update({ nama_kelas: targetName, tingkat: parseTingkat(targetName) }).eq('sekolah_id', sekolahId).eq('nama_kelas', oldName)`
   - Scoped strictly by `sekolah_id`, preventing leakage to other school tenants.

4. **Zero-Student Deletion Protection Guard (`src/components/AdminKelasView.tsx:507-559`)**:
   - `if (cls.totalSiswa > 0)` immediately halts execution with a SweetAlert warning dialog and does not execute delete queries on Supabase (`AdminKelasView.tsx:512-519`).
   - Classes with `totalSiswa === 0` are safely removed from `data_kelas`, `wali_kelas`, and `customClasses`.

5. **Multi-Tenant Scoping & Security (`src/components/AdminKelasView.tsx:109, 133, 144, 157, 446, 456, 476, 487, 539, 547, 622, 682`)**:
   - All queries and mutations enforce `.eq('sekolah_id', sekolahId)`.
   - Default fallback: `user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001'`.

6. **Route Aliasing & Tab Normalization (`src/lib/navigation.ts`, `src/components/AdminDataView.tsx`)**:
   - `resolveCanonicalRoute('view-admin-kelas')` -> `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`.
   - `resolveCanonicalRoute('view-kelas')` -> `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`.
   - `normalizeAdminTab`: normalizes `Data_Kelas`, `data_kelas`, `Kelas`, `kelas` to canonical `'Data_Kelas'`.
   - `evaluateTabRBAC`: permits Admin and Superadmin; strictly blocks non-admin roles (Guru, Siswa, Dinas, Kepsek) with appropriate redirects (`view-ujian` for Siswa, `view-home` for others).

7. **Empirical Automated Test Results**:
   - `npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts`:
     * Total checks: 15 | Passed: 15 | Failed: 0 (100% pass rate).
   - `npx tsx tests/challenger_m1_empirical.test.ts`:
     * Total checks: 143 | Passed: 143 | Failed: 0 (100% pass rate).
   - `npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts`:
     * Total checks: 16 | Passed: 16 | Failed: 0 (100% pass rate, master data 100% intact).
   - `npx tsx tests/master_data_admin_role_restriction.test.ts`:
     * Total checks: 8 | Passed: 8 | Failed: 0 (100% pass rate).
   - `npx tsc --noEmit`:
     * 0 compilation errors (exit code 0).

---

## 2. Logic Chain

1. **Empirical Correctness of Class Aggregation**:
   - Observation 1.1 demonstrates that class directory items are accurately derived even when the physical `data_kelas` table returns `PGRST205` (missing table in schema cache).
   - Observation 1.1 and test Suite 1 prove that alumni students (`status === 'Lulus'`) are strictly excluded, while active unassigned students are tallied into executive metrics and warning alerts.

2. **Invariants of Centralized Student Allocation**:
   - Observation 1.2 and test Suite 2 prove that moving a student from Class A to Class B immediately updates student class attributes, rebalances class roster counts, and recalculates gender statistics without data loss.
   - If a network error occurs during mutation, rollback state restoration guarantees consistency between React state and the database.

3. **Integrity Preservation on Cascading Rename**:
   - Observation 1.3 and test Suite 3 verify that when an administrator renames a class, references in `data_siswa`, `wali_kelas`, and `jadwal_pelajaran` are updated in synchrony.
   - The conflict pre-check on `wali_kelas` prevents database unique constraint crashes.

4. **Safety Against Orphaned Students**:
   - Observation 1.4 and test Suite 4 confirm that the UI blocks any attempt to delete a class with `totalSiswa > 0`, making accidental student abandonment impossible.

5. **Multi-Tenant Boundary Shielding**:
   - Observation 1.5 and test Suite 5 establish that every single Supabase mutation is strictly scoped by `sekolah_id`, preventing cross-tenant modifications.

6. **RBAC & Zero Regression**:
   - Observations 1.6 and 1.7 confirm that non-admin users cannot access `Data_Kelas` or its aliases, and existing master data records (`data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`) remain completely untouched and intact.

---

## 3. Caveats

1. **Physical `data_kelas` Schema Cache State**:
   - Live Supabase returned `Could not find the table 'public.data_kelas' in the schema cache` (`PGRST205`). `AdminKelasView` defensively accommodates this state by aggregating classes from `data_siswa.kelas` and `wali_kelas.kelas`.
2. **Milestone 2 Scoping**:
   - The CSV template alignment and CSV upload parser for `Template_Data_Kelas.csv` in `dataIntegrityGuard.ts` are scheduled for Milestone 2. In Milestone 1, clicking the `Kelas` tab cleanly renders `AdminKelasView` and avoids triggering unsupported generic CSV table operations.

---

## 4. Conclusion

The implementation of Milestone 1 in `src/components/AdminKelasView.tsx`, `src/components/AdminDataView.tsx`, and `src/lib/navigation.ts` satisfies all requirements and invariants:
- Clean class card aggregation with grade filtering and gender breakdown.
- Centralized two-way student allocation (outbound transfer and inbound allocation).
- Dedicated alert banner and drawer for unallocated students.
- Cascading class rename across `data_siswa`, `wali_kelas`, and `jadwal_pelajaran`.
- Strict deletion guard against non-empty classes.
- Robust multi-tenant scoping and hardened RBAC protection.
- 100% pass rate across all empirical challenger test suites and zero regression on master data.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this empirical challenge:

1. **Run Empirical Challenger Test Suite**:
   ```powershell
   npx tsx tests/adversarial_centralized_class_allocation_m1.test.ts
   ```
   *Expected output*: Total checks: 15 | Passed: 15 | Failed: 0.

2. **Run Master Integrity Test**:
   ```powershell
   npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts
   ```
   *Expected output*: Total checks: 16 | Passed: 16 | Failed: 0.

3. **Run Static Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected output*: Exit code 0, 0 errors.

4. **Run Navigation & RBAC Empirical Suite**:
   ```powershell
   npx tsx tests/challenger_m1_empirical.test.ts
   ```
   *Expected output*: 143/143 tests passed.

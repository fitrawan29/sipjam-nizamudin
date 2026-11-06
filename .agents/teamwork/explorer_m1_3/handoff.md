# Handoff Report: Data Mutations, Database Scoping, and State Synchronization for Centralized Student Class Allocation

**Agent**: Explorer M1-3 (`explorer_m1_3`)  
**Mission**: Analyze data mutations, database scoping, and state synchronization for centralized student class allocation in Milestone 1.  
**Target Component**: `src/components/AdminKelasView.tsx` and integration with `AdminDataView.tsx` & `NaikKelasModal.tsx`.  

---

## 1. Observation

### 1.1 Database Schema & Structural Analysis
From `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` and `src/types/database.ts`:
1. **`data_siswa` table structure** (`SETUP_NEW_SCHOOL_TEMPLATE.sql:82-94`, `src/types/database.ts:328-361`):
   ```sql
   CREATE TABLE IF NOT EXISTS public.data_siswa (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
       nisn TEXT,
       nama_siswa TEXT NOT NULL,
       kelas TEXT NOT NULL,
       gender TEXT,
       status TEXT DEFAULT 'Aktif',
       no_hp_ortu TEXT,
       qr_code TEXT,
       created_at TIMESTAMPTZ DEFAULT now(),
       updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```
   - In `src/types/database.ts:330-338`: `kelas: string | null`, `nisn: string | null`, `status: string | null`.
   - `nisn` is not marked unique on `data_siswa`, which means students can have `nisn: null` or duplicate NISNs across migration imports.
   - Primary key is `id` (UUID). Every single mutation must be keyed on `id` (or `(sekolah_id, id)`) to prevent unintended mutation of students with identical names or null NISNs.

2. **`wali_kelas` table structure** (`SETUP_NEW_SCHOOL_TEMPLATE.sql:111-121`, `src/types/database.ts:1716-1746`):
   ```sql
   CREATE TABLE IF NOT EXISTS public.wali_kelas (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
       kelas TEXT NOT NULL,
       guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
       nama_guru TEXT NOT NULL,
       nip TEXT,
       tahun_ajaran TEXT DEFAULT '2024/2025',
       created_at TIMESTAMPTZ DEFAULT now(),
       CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)
   );
   ```
   - **Crucial Invariant**: `CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)` strictly forbids having two rows with the same `(sekolah_id, kelas)`.
   - When renaming a class, updating `wali_kelas.kelas` directly to `newKelas` will crash with error code `23505` (`unique_violation`) if `newKelas` already has a row in `wali_kelas`.

3. **`jadwal_pelajaran` table structure** (`SETUP_NEW_SCHOOL_TEMPLATE.sql:124-135`, `src/types/database.ts:433-469`):
   ```sql
   CREATE TABLE IF NOT EXISTS public.jadwal_pelajaran (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
       hari TEXT NOT NULL,
       nama_guru TEXT NOT NULL,
       mata_pelajaran TEXT NOT NULL,
       kelas TEXT NOT NULL,
       jam_ke TEXT,
       jam_mulai TIME,
       jam_selesai TIME,
       created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

4. **`guru_mapel` table structure** (`SETUP_NEW_SCHOOL_TEMPLATE.sql:97-108`, `src/types/database.ts:372-408`):
   ```sql
   CREATE TABLE IF NOT EXISTS public.guru_mapel (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
       guru_id UUID REFERENCES public.data_guru(id) ON DELETE CASCADE,
       nip TEXT,
       nama_guru TEXT NOT NULL,
       mapel_id TEXT,
       nama_mapel TEXT NOT NULL,
       kelas TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT now(),
       CONSTRAINT uq_guru_mapel_sekolah UNIQUE (sekolah_id, nip, nama_mapel)
   );
   ```

5. **`data_kelas` table status**:
   - Grep search for `CREATE TABLE.*data_kelas` yielded 0 results in SQL files.
   - In `src/lib/supabaseClient.ts:136`, `data_kelas` is included in the master tables list.
   - In `supabase/migrations/20261102_restrict_master_data_to_admin.sql:70`: `CALL public.setup_master_data_admin_policies('data_kelas');`.
   - As observed in `tests/jadwal_mapel_validity_and_master_integrity.test.ts:431-434`, classes across the app (`X Merdeka`, `XI Merdeka`, `XII Merdeka`) are dynamically derived via `supabase.from('data_siswa').select('kelas')` and `wali_kelas`.
   - Direct queries to `data_kelas` may fail with `PGRST205` (relation does not exist) if a physical table is not instantiated. Any query to `data_kelas` must be wrapped in `isSchemaCacheOrMissingTableError()` fallback handling.

### 1.2 Multi-Tenant Security & Role-Based Access Control (RBAC)
From `supabase/migrations/20261102_restrict_master_data_to_admin.sql:9-56`:
- `data_siswa`, `wali_kelas`, `jadwal_pelajaran`, and `guru_mapel` are guarded by Row Level Security:
  * **SELECT**: Accessible by tenant users (`sekolah_id = get_auth_user_sekolah_id()`).
  * **INSERT, UPDATE, DELETE**: Strictly enforced:
    `USING (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id()))`
- From `src/lib/dataIntegrityGuard.ts:15`:
  `isMasterDataModificationAllowed(user?.role)` returns true only for `'Admin'` and `'Superadmin'`. Non-admin users must be completely barred from triggering mutations in `AdminKelasView`.

### 1.3 NaikKelasModal Cohort Advancement Invariants
From `src/components/NaikKelasModal.tsx:25-57` and `tests/m6_master_data_polish.test.ts:134-219`:
- `NaikKelasModal` supports 3 modes:
  1. `perorangan`: batch updates selected student IDs (`.in('id', localSelectedIds)`).
  2. `per_kelas`: transfers all students of a selected source class to a target class or sets status to `'Lulus'`.
  3. `satu_angkatan`: evaluates `computeCohortAdvancement()` (e.g. `X Merdeka` -> `XI Merdeka`, `XI Merdeka` -> `XII Merdeka`, `XII Merdeka` -> `Lulus`) and dispatches batch updates across all classes.
- Contract:
  ```ts
  export interface NaikKelasModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedStudentIds?: string[];
    students: any[];
    sekolahId?: string;
    role?: string;
  }
  ```
- Invariant from `tests/m6_master_data_polish.test.ts:216`:
  `AdminDataView.tsx` must keep `<NaikKelasModal` and `selectedStudentIds={selectedStudentIds}`.

---

## 2. Logic Chain

### 2.1 Centralized Mutation Operations Design

#### Operation A: Moving Single or Multiple Students to a Target Class
**Rationale**: When an administrator selects one or more students from a class roster or unallocated pool and clicks "Pindahkan Siswa" or assigns them to a target class:
- **Target Table**: `public.data_siswa`
- **Scoping**: Must filter by `id.in(studentIds)` and `sekolah_id.eq(sekolahId)`.
- **Status Alignment**:
  * If `targetKelas === 'Lulus'`, update `status: 'Lulus'`.
  * If `targetKelas !== 'Lulus'`, ensure `status: 'Aktif'` (in case a student was previously marked inactive or unallocated).
- **Exact Supabase Mutation**:
  ```ts
  const isLulus = targetKelas.trim().toLowerCase() === 'lulus';
  const newStatus = isLulus ? 'Lulus' : 'Aktif';

  const { error } = await supabase
    .from('data_siswa')
    .update({
      kelas: targetKelas.trim(),
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .in('id', selectedStudentIds)
    .eq('sekolah_id', sekolahId);

  if (error) throw error;
  ```

#### Operation B: Allocating Unassigned Students
**Rationale**: Students with missing or unallocated classes (`kelas IS NULL`, `kelas = ''`, `kelas = '-'`, or `kelas = 'Tanpa Kelas'`):
- **Retrieval Filter**:
  ```ts
  const isUnassigned = (k?: string | null) => 
    !k || !k.trim() || k.trim() === '-' || k.trim().toLowerCase() === 'tanpa kelas';
  ```
- **Batch Inbound Allocation**:
  Admin selects target class `targetKelas`, then selects unassigned students from a dedicated drawer/modal "Alokasikan Siswa Masuk":
  ```ts
  const { error } = await supabase
    .from('data_siswa')
    .update({
      kelas: targetKelas.trim(),
      status: 'Aktif',
      updated_at: new Date().toISOString()
    })
    .in('id', unallocatedSelectedIds)
    .eq('sekolah_id', sekolahId);
  ```

#### Operation C: Cascading Class Rename
**Rationale**: When an admin renames a class (e.g. from `"X-1"` to `"X Merdeka 1"`), all references across relational and denormalized tables must update consistently.
- **Affected Tables in Order of Execution**:
  1. **`data_siswa`**: All students enrolled in `oldKelas` must have their `kelas` updated:
     ```ts
     const { error: errSiswa } = await supabase
       .from('data_siswa')
       .update({ kelas: newKelas, updated_at: new Date().toISOString() })
       .eq('sekolah_id', sekolahId)
       .eq('kelas', oldKelas);
     if (errSiswa) throw errSiswa;
     ```
  2. **`wali_kelas`**: Homeroom teacher record update:
     * Check for uniqueness constraint violation `uq_wali_kelas_sekolah_kelas`.
     * Query whether `newKelas` already exists in `wali_kelas`:
       ```ts
       const { data: existingWali } = await supabase
         .from('wali_kelas')
         .select('id')
         .eq('sekolah_id', sekolahId)
         .eq('kelas', newKelas)
         .maybeSingle();

       if (!existingWali) {
         await supabase
           .from('wali_kelas')
           .update({ kelas: newKelas })
           .eq('sekolah_id', sekolahId)
           .eq('kelas', oldKelas);
       }
       ```
  3. **`jadwal_pelajaran`**: Update course schedules for that class:
     ```ts
     await supabase
       .from('jadwal_pelajaran')
       .update({ kelas: newKelas })
       .eq('sekolah_id', sekolahId)
       .eq('kelas', oldKelas);
     ```
  4. **`guru_mapel`**: Update subject teacher allocations:
     ```ts
     try {
       await supabase
         .from('guru_mapel')
         .update({ kelas: newKelas })
         .eq('sekolah_id', sekolahId)
         .eq('kelas', oldKelas);
     } catch (_) { /* ignore if guru_mapel is not populated */ }
     ```
  5. **`data_kelas` (Optional Table)**:
     ```ts
     try {
       await supabase
         .from('data_kelas')
         .update({ nama_kelas: newKelas })
         .eq('sekolah_id', sekolahId)
         .eq('nama_kelas', oldKelas);
     } catch (_) { /* ignore missing table */ }
     ```

### 2.2 Local State Reactivity (Zero Full Page Reloads)
**Rationale**: Reloading the page (`window.location.reload()`) causes jarring UX, resets scroll position, breaks active filters, and increases database load.  
`AdminKelasView` must implement immediate client-side reactive state management:

1. **State Store Structure**:
   ```ts
   const [students, setStudents] = useState<StudentItem[]>([]);
   const [waliList, setWaliList] = useState<WaliItem[]>([]);
   const [customClasses, setCustomClasses] = useState<string[]>([]);
   const [selectedClass, setSelectedClass] = useState<string>('ALL');
   const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
   const [searchQuery, setSearchQuery] = useState<string>('');
   ```

2. **Derived Computations via `useMemo`**:
   - `allClassNames`: Set union of `customClasses`, unique classes in `students`, and unique classes in `waliList` (excluding null/empty/Lulus).
   - `classStats`: Map of class statistics:
     ```ts
     const classStats = useMemo(() => {
       const map = new Map<string, { total: number; laki: number; perempuan: number }>();
       // Pre-fill for all known classes
       allClassNames.forEach(c => map.set(c, { total: 0, laki: 0, perempuan: 0 }));
       
       students.forEach(s => {
         if (s.status === 'Lulus' || !s.kelas) return;
         const stat = map.get(s.kelas) || { total: 0, laki: 0, perempuan: 0 };
         stat.total += 1;
         const g = (s.gender || '').toUpperCase();
         if (g.startsWith('L')) stat.laki += 1;
         else if (g.startsWith('P')) stat.perempuan += 1;
         map.set(s.kelas, stat);
       });
       return map;
     }, [allClassNames, students]);
     ```
   - `unallocatedStudents`:
     ```ts
     const unallocatedStudents = useMemo(() => {
       return students.filter(s => isUnassigned(s.kelas) && s.status !== 'Lulus');
     }, [students]);
     ```

3. **Immediate In-Memory Update on Mutation**:
   When moving students to `targetKelas`:
   ```ts
   // Update state immediately without network delay
   setStudents(prev => prev.map(s => {
     if (selectedStudentIds.includes(s.id)) {
       return {
         ...s,
         kelas: targetKelas,
         status: targetKelas.toLowerCase() === 'lulus' ? 'Lulus' : 'Aktif'
       };
     }
     return s;
   }));
   setSelectedStudentIds([]);
   showToast('Berhasil', `${selectedStudentIds.length} siswa dipindahkan ke ${targetKelas}.`, 'success');
   ```
   All cards, gender badges, and unallocated counters re-render instantly!

4. **Optimistic Rollback Guard**:
   If the background Supabase call fails, catch the error, revert `students` to the snapshot prior to mutation, and fire `Swal.fire('Gagal', error.message, 'error')`.

### 2.3 Edge Cases and Guardrails Specification

1. **Guardrail 1: Empty Target Class Name Prevention**
   - Condition: Admin submits blank, whitespace-only, or undefined `targetKelas`.
   - Behavior: Stop mutation immediately before network call.
   - User feedback:
     ```ts
     if (!targetKelas || !targetKelas.trim()) {
       Swal.fire('Peringatan', 'Harap pilih atau masukkan nama kelas tujuan yang valid.', 'warning');
       return;
     }
     ```

2. **Guardrail 2: Prevent Deleting a Class with Enrolled Students**
   - Condition: Admin attempts to delete class card `targetKelas`.
   - Check:
     ```ts
     const enrolled = students.filter(s => s.kelas === targetKelas && s.status !== 'Lulus');
     if (enrolled.length > 0) {
       Swal.fire({
         icon: 'warning',
         title: 'Kelas Tidak Dapat Dihapus',
         html: `Kelas <b>${targetKelas}</b> masih memiliki <b>${enrolled.length} siswa</b> aktif. Harap pindahkan seluruh siswa ke kelas lain terlebih dahulu sebelum menghapus kelas ini.`
       });
       return;
     }
     ```
   - Deletion Action (if 0 enrolled): Remove homeroom teacher row in `wali_kelas` and remove from `customClasses`.

3. **Guardrail 3: Duplicate Student Names & Null NISN Handling**
   - **Primary Key Scoping**: The UI multiselect checkbox binds directly to `student.id` (UUID), NOT `nama_siswa` or `nisn`.
   - **Display Disambiguation**: In student roster rows and dropdown selectors, display:
     `{s.nama_siswa} • NISN: {s.nisn || '-'} • ({s.gender || 'L/P'})`
     This ensures teachers and admins clearly differentiate between two different individuals who happen to share the same name.
   - **Target Class Name Clash Warning**:
     If a student being moved into `targetKelas` has the exact same name as an existing student in `targetKelas`:
     Show confirmation modal:
     `"Di kelas ${targetKelas} sudah terdapat siswa bernama '${s.nama_siswa}'. Apakah Anda yakin ingin memindahkan siswa ini ke kelas tersebut?"`

4. **Guardrail 4: Bulk Cohort Advancement via `NaikKelasModal.tsx`**
   - In `AdminKelasView`, render a prominent action button:
     `<button onClick={() => setNaikKelasOpen(true)}>Naik Kelas / Kelulusan</button>`
   - Pass props:
     ```tsx
     <NaikKelasModal
       isOpen={isNaikKelasOpen}
       onClose={() => setIsNaikKelasOpen(false)}
       onSuccess={async () => {
         setSelectedStudentIds([]);
         await fetchAllData(); // reload fresh state
       }}
       selectedStudentIds={selectedStudentIds}
       students={students}
       sekolahId={user?.sekolah_id}
       role={user?.role}
     />
     ```
   - If students are already checked in `AdminKelasView`, `NaikKelasModal` automatically opens with mode `'perorangan'` pre-populated with those student IDs.
   - If no students are checked, the admin can switch seamlessly to mode `'per_kelas'` or `'satu_angkatan'`.

---

## 3. Caveats
1. **Physical `data_kelas` Table Availability**:
   The table `data_kelas` might exist in some tenant schemas or not exist (virtual classes derived from `data_siswa` & `wali_kelas`). All code touching `data_kelas` MUST use silent try/catch or `isSchemaCacheOrMissingTableError()` so that Postgres `PGRST205` errors never break class management.
2. **Historical Attendance Class Snapshots**:
   Historical records in `presensi_siswa` store `kelas` at the time attendance was scanned. Cascading class rename deliberately does NOT rewrite historical attendance logs to preserve historical audit fidelity.
3. **Multi-Tenant Scoping**:
   Every database query MUST include `.eq('sekolah_id', user.sekolah_id)` to satisfy the tenant RLS policies (`supabase/migrations/20261102_restrict_master_data_to_admin.sql`).

---

## 4. Conclusion
1. **Centralized Model**: `data_siswa.kelas` serves as the authoritative ground truth for student enrollment. `AdminKelasView.tsx` will provide a unified command center for creating classes, viewing class enrollments, moving students in bulk, allocating unassigned students, cascading renames, and launching `NaikKelasModal`.
2. **Multi-Tenant Guarantee**: All mutations must strictly filter by `id` (UUID) and `sekolah_id = user.sekolah_id`, respecting RLS and RBAC restrictions (`isMasterDataModificationAllowed`).
3. **Zero-Reload Reactivity**: Local state updates in `AdminKelasView` using `setStudents` and `useMemo` provide instantaneous UI feedback without triggering disruptive page reloads.
4. **Resilience & Invariants**: Safe cascading renames prevent unique constraint conflicts in `wali_kelas`, guardrails prevent deletion of non-empty classes and blank target class names, and UUID-keyed tracking guarantees reliable handling of duplicate names and null NISNs.

---

## 5. Verification Method

### 5.1 Manual Verification Scenarios
1. **Student Class Transfer**:
   - In `AdminKelasView`, select 2 students in class `X Merdeka`.
   - Select target class `XI Merdeka` and confirm transfer.
   - Verify local state updates immediately (class `X Merdeka` count decreases by 2, `XI Merdeka` count increases by 2) without page reload.
   - Verify in database: `SELECT id, nama_siswa, kelas FROM data_siswa WHERE id IN (...)` reflects `kelas = 'XI Merdeka'`.
2. **Unallocated Student Allocation**:
   - View "Siswa Belum Memiliki Kelas" section.
   - Select an unassigned student, click "Alokasikan", choose `X Merdeka`.
   - Verify student moves out of unassigned list into `X Merdeka`.
3. **Class Cascading Rename**:
   - Rename class `X Merdeka` to `X Merdeka 1`.
   - Verify `data_siswa`, `wali_kelas`, and `jadwal_pelajaran` all update to `X Merdeka 1`.
4. **Guardrail Enforcements**:
   - Try to delete a class with enrolled students -> SweetAlert warning is shown, action blocked.
   - Try to move students with empty target class name -> Warning is shown, action blocked.
5. **Bulk Cohort Advancement**:
   - Open `NaikKelasModal` from `AdminKelasView`.
   - Run Satu Angkatan progression -> Verify students advance from X to XI, XI to XII, and XII to Lulus.

### 5.2 Automated Invariant & Test Verification
Run existing automated test suite:
```powershell
npm test
```
Verify that existing invariants in:
- `tests/m6_master_data_polish.test.ts`
- `tests/jadwal_mapel_validity_and_master_integrity.test.ts`
- `tests/master_data_admin_role_restriction.test.ts`
all pass with 100% success rate and zero regressions.

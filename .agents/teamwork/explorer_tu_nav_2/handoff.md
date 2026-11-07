# Handoff Report: Survey and Investigation of R2 (Hak Akses Read-Only Asesmen dan Rapor untuk TU)

## Executive Summary
Role Tata Usaha (TU) requires read-only viewing of Asesmen (Buku Nilai Mapel) and Rapor across all class levels and teachers. Existing implementations in `GradebookView.tsx` and `RaporView.tsx` already feature an Admin viewing mode that loads all teachers, classes, and subjects while disabling grade mutation (`isAdmin || !isGuruPengampu`). Applying the `/ponytail` philosophy (simplest, shortest diff, zero unnecessary abstractions), TU can seamlessly reuse this existing multi-teacher viewing pipeline by expanding the filter selector condition to include `isTataUsaha`, hiding the Admin Bobot button, converting Rapor inputs to read-only text, and adding defense-in-depth guards in the service and PostgREST layers.

---

## 1. Observation

### 1.1 Implementation Locations
- **`src/components/GradebookView.tsx`** (5,290 lines):
  - Component: `GradebookView({ user, initialTab = 'gradebook', assignedKelas, isKepalaSekolah })`
  - Encapsulates "Buku Nilai Mapel" (Tujuan Pembelajaran, Asesmen Diagnostik, Formatif, Sumatif, calculation of Nilai Akhir, and Capaian Pembelajaran hierarchy).
  - Also hosts Sub-Tab 2: `Rapor Kelas Binaan`, which renders `<RaporView user={user} assignedKelas={assignedKelas || null} />` at line 5278.
- **`src/components/RaporView.tsx`** (1,606 lines):
  - Component: `RaporView({ user, assignedKelas }: RaporViewProps)`
  - Sub-tab `ringkasan`: Student table with NISN, Name, Attendance recap (H/I/S/A), Catatan Wali Kelas input, and view button.
  - Sub-tab `cetak-individu`: Individual student report card for preview & print, with Nilai Mapel, CP descriptions, Observasi Kurikulum Deep Learning (Mindful, Meaningful, Joyful), Catatan Wali Kelas textarea, and signature sections (`PrintHeader`, homeroom teacher, and principal).
- **`src/components/AppScreen.tsx`**:
  - Line 1209–1216: renders `<GradebookView user={user} initialTab={urlTab === 'rapor' ? 'rapor' : 'gradebook'} assignedKelas={assignedKelas} isKepalaSekolah={isKepalaSekolah} />`.
  - Line 1268–1285: renders `<RaporView user={user} assignedKelas={assignedKelas} />`, guarded by `isAdmin || isSuperadmin || isWaliKelas`.
- **`src/lib/navigation.ts`**:
  - Line 29: `'view-rapor': { view: 'view-gradebook', tab: 'rapor' }`.
  - Lines 236–240:
    ```ts
    if (viewId === 'view-gradebook' && tabId === 'rapor') {
      if (!isWali && !isAdmin) {
        return { allowed: false, fallbackTab: 'gradebook', reason: 'Halaman Rapor secara eksklusif hanya dapat diakses oleh Wali Kelas dan Administrator.' };
      }
    }
    ```
  - Lines 247–259: currently restricts `isTataUsaha` exclusively to `view-admin-data` (tabs: `Data_Siswa`, `Data_Guru`) and `view-home`. Any access to `view-gradebook` or `view-rapor` is blocked and redirected to `view-data-siswa`.

---

### 1.2 Data Scoping: Teacher vs. Admin vs. TU

#### A. In `GradebookView.tsx`:
1. **Teacher Scoping (`!isAdmin`)**:
   - `teachersList` is restricted strictly to the current teacher (lines 996–1002):
     ```tsx
     teachers = [{
       id: user?.id,
       nama_guru: user?.nama || 'Tanpa Nama',
       nip: user?.username || '',
       mata_pelajaran: user?.mata_pelajaran || '',
     }];
     ```
   - Queries to `guru_mapel` and `jadwal_pelajaran` are scoped to `user.username` (NIP) or `user.nama` (lines 1007–1025).
   - In UI: Guru filter displays a locked read-only badge with `{user?.nama || 'Guru Terpilih'}` (lines 2851–2860).
   - `verifyGuruPengampu` (lines 1122–1200) determines whether current teacher is the assigned instructor. If matched, `isGuruPengampu` is set to `true`.
   - When `isGuruPengampu` is `true`, mutation buttons ("Simpan Semua Nilai", "Tambah TP", "Edit TP", "Hapus TP", "Tambah Kolom", "Edit Kolom", "Hapus Kolom", "Isi Cepat") are visible, and grade cells render as `<input type="number" ... />`.

2. **Admin Scoping (`isAdmin`)**:
   - `teachersList` queries all teachers in the school from `data_guru` (lines 981–994):
     ```tsx
     if (isAdmin) {
       let gQuery = supabase.from('data_guru').select('id, nama_guru, nip, mata_pelajaran');
       if (sekolahId) gQuery = gQuery.eq('sekolah_id', sekolahId);
       const { data: gData } = await gQuery.order('nama_guru', { ascending: true });
       ...
     }
     ```
   - Queries to `guru_mapel` and `jadwal_pelajaran` retrieve all assignments without teacher filters (lines 1006, 1020).
   - In UI: Guru filter renders a `<select>` dropdown (lines 2833–2850) with all teachers:
     ```tsx
     <select value={selectedGuru} onChange={e => handleSelectGuru(e.target.value)}>
       <option value="">-- Pilih Guru Pengampu --</option>
       {teachersList.map((g, idx) => (
         <option key={idx} value={g.nama_guru}>{g.nama_guru}</option>
       ))}
     </select>
     ```
   - Selecting a teacher executes `handleSelectGuru(newGuru)` -> `syncTeacherAssignments`, dynamically filtering the available subjects and classes for that chosen teacher.
   - **Crucial Invariant**: For Admin, `verifyGuruPengampu` executes:
     ```tsx
     if (isAdmin) {
       setIsGuruPengampu(false);
       return;
     }
     ```
     Therefore, for Admin, `isGuruPengampu` is **strictly false**.
   - Because `isGuruPengampu` is false:
     - All editing buttons are automatically hidden: `{!isAdmin && isGuruPengampu && (...)}`.
     - Grade table cells render as read-only text:
       Line 4214: `{isAdmin || !isGuruPengampu ? (<span>{gradeVal ?? '-'}</span>) : (<input type="number" ... />)}`.
     - Grade save function rejects mutation:
       Line 1807–1809: `if (isAdmin) { return; }`.

3. **TU Reuse of Admin Scoping**:
   - TU requires the exact same multi-teacher selection capability as Admin.
   - By creating a combined condition: `const canSelectAllTeachers = isAdmin || isTataUsaha;`, TU can reuse:
     - Full teacher list retrieval (`data_guru`).
     - Unfiltered assignment loading (`guru_mapel`, `jadwal_pelajaran`).
     - Guru Pengampu dropdown selection.
     - Automatic disabling of `isGuruPengampu` (`if (isAdmin || isTataUsaha) { setIsGuruPengampu(false); return; }`).
   - The only Admin control TU must **not** have is the Admin "Bobot" configuration button (line 2809):
     ```tsx
     {isAdmin && !isTataUsaha && (
       <button ... onClick={() => setIsBobotModalOpen(true)}>Bobot: ...</button>
     )}
     ```

#### B. In `RaporView.tsx`:
1. **Wali Kelas Scoping (`!isAdmin`)**:
   - Homeroom class is locked to `assignedKelas` (lines 160–164):
     ```tsx
     if (!isAdmin && assignedKelas && selectedKelas !== assignedKelas) {
       setSelectedKelas(assignedKelas);
     }
     ```
   - In UI: Class selector is a static read-only badge (lines 1146–1150) displaying `{selectedKelas || assignedKelas || 'Tidak Ada'}`.
   - Homeroom teachers can edit notes and deep learning observations:
     - Table note input: `onChange={(e) => handleCatatanChange(s.nisn, e.target.value)}` (line 1351).
     - Deep Learning inputs: `handleDeepLearningChange` (lines 1501, 1514, 1527).
     - Catatan textarea: `handleCatatanChange` (line 1545).
     - "Simpan Rapor" button: `handleManualSave` (line 1122–1131).

2. **Admin Scoping (`isAdmin || isSuperadmin`)**:
   - Class selector renders a `<select>` dropdown with all classes in the school (lines 1136–1145):
     ```tsx
     {isAdmin || isSuperadmin ? (
       <select value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)}>
         {kelasList.map(k => (<option key={k} value={k}>{k}</option>))}
       </select>
     ) : ...}
     ```

3. **TU Reuse in `RaporView.tsx`**:
   - Expanding class selector condition to `{isAdmin || isSuperadmin || isTataUsaha ? (<select ...>) : ...}` allows TU to select and inspect ANY class across the entire school.
   - Bypassing the homeroom lock:
     Line 161: `if (!isAdmin && !isTataUsaha && assignedKelas && selectedKelas !== assignedKelas)`.
   - When no class is pre-selected, line 187 (`setSelectedKelas(assignedKelas || unique[0])`) defaults cleanly to the first available class.

---

### 1.3 Inventory of Mutation Actions in Asesmen and Rapor

| Component | Element / Action | Location in File | Current Guard / Behavior | Required TU Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **GradebookView** | "Simpan Semua Nilai" Button | Line 2794–2807 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed because `isGuruPengampu === false` for TU) |
| **GradebookView** | "Bobot" Config Button | Line 2809–2827 | `{isAdmin && (...) }` | **Must be hidden**: change to `{isAdmin && !isTataUsaha && (...) }` |
| **GradebookView** | "Inisialisasi Penilaian" Button | Line 3086 | `{!isAdmin && isGuruPengampu && tpList.length === 0}` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Tambah TP" Button | Lines 3185, 3797 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Edit TP" Button | Line 3228 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Hapus TP" Button | Line 3427 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Tambah Kolom Asesmen" Button | Lines 3560, 3872 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Edit Kolom Asesmen" Button | Line 3650 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Hapus Kolom Asesmen" Button | Line 3718 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | "Isi Cepat (Bulk Fill)" Button | Line 4101 | `{!isAdmin && isGuruPengampu && (...) }` | Hidden (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | Grade table cells | Lines 4214, 4256, 4300 | `{isAdmin || !isGuruPengampu ? (<span>...</span>) : (<input ... />)}` | Displays plain text `<span>` (guaranteed by `!isGuruPengampu`) |
| **GradebookView** | Grade save handler | Lines 1807–1813 | `if (isAdmin) return; if (!isGuruPengampu) return;` | Reject save (`if (isAdmin || isTataUsaha || !isGuruPengampu) return;`) |
| **RaporView** | "Simpan Rapor" Button | Lines 1122–1131 | Unconditional button calling `handleManualSave` | **Must be hidden**: wrap with `{!isTataUsaha && (...) }` |
| **RaporView** | Table Catatan Wali input | Lines 1347–1354 | `<input type="text" ... onChange={...} />` | **Must be read-only**: render `{isTataUsaha ? (<span className="text-xs text-gray-700 italic">{note || '-'}</span>) : (<input ... />)}` |
| **RaporView** | Deep Learning inputs | Lines 1496–1532 | 3 `<input type="text" ... />` elements | **Must be non-editable**: hide inputs and show only `<p className="italic text-xs">{val || '-'}</p>` |
| **RaporView** | Catatan Wali textarea | Lines 1543–1554 | `<textarea ... />` in Cetak Individu tab | **Must be non-editable**: hide `<textarea>` and display styled `<p className="italic">{note || '...'}</p>` |
| **RaporView** | Save handlers | Lines 802, 837, 912 | `saveCatatanToSupabase`, `saveDlToSupabase`, `handleManualSave` | Defense-in-depth: immediate abort `if (isTataUsaha) return false;` |
| **RaporView** | Signature in Print Preview | Lines 1564–1565 | Falls back to `user?.nama` if not admin | Prevent TU name from appearing as homeroom teacher: fallback only if `!isAdmin && !isTataUsaha` |

---

### 1.4 PostgREST & Service-Layer Mutation Guards
- **`src/lib/supabaseClient.ts`**:
  - Contains `checkMasterDataMutationGuard(requestUrlStr, method, role)` (lines 196–218).
  - Intercepts all mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  - For `normRole === 'tatausaha'`, it currently permits operations only on `['data_siswa', 'siswa', 'data_guru', 'guru']` (lines 204–212).
  - Assessment tables (`capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`) are not currently guarded by `checkMasterDataMutationGuard`.
  - Adding an assessment table check (`isAssessmentEndpoint`) to `checkMasterDataMutationGuard` ensures that if role `tatausaha` attempts a `POST`, `PUT`, `PATCH`, or `DELETE` on assessment tables, a `403 Forbidden` (`code: '42501'`) response is immediately returned.

---

### 1.5 Existing Tests
1. `tests/tata_usaha_role_rbac_and_isolation.test.ts`:
   - Validates TU role invariants (`isAdminRole('tatausaha') === false`).
   - Suite 2 currently enforces `tuMenuItems.length === 2` and strictly `Data Siswa` & `Data Guru`.
   - Will need to be updated when R1 (6-item menu) is integrated.
2. `tests/adversarial_tu_postgrest_ast_challenger_2.test.ts`:
   - Validates AST patterns and PostgREST mutation interceptor for TU.
3. `tests/gradebook_teacher_filter_ponytail.test.ts`:
   - Tests `isTeacherMatch` and `isAssignmentMatchTeacher` functions in `GradebookView.tsx`.
4. `tests/m4_academic_merdeka_rapor.test.ts` & `tests/e_rapor_real_data_pipeline.test.ts`:
   - Validates Kurikulum Merdeka pipeline, calculations, and notes persistence in `RaporView.tsx`.

---

## 2. Logic Chain

1. **Premise 1 (R2 Requirement)**:
   Role TU must view assessments and report cards for all class levels and teachers without any ability to modify, insert, edit, or delete grades or report data.
2. **Premise 2 (Existing Admin Architecture in `GradebookView.tsx`)**:
   `GradebookView.tsx` already has an established mechanism that:
   - Queries all teachers via `supabase.from('data_guru')`.
   - Provides a `<select>` dropdown to pick any teacher.
   - Synchronizes mapels and classes for that teacher.
   - Sets `isGuruPengampu` to `false` (line 1125), which automatically renders grade inputs as plain text `<span>`, hides all CRUD action buttons, and rejects save calls.
3. **Inference 1 (Minimal Reusability for Asesmen)**:
   Introducing `const isTataUsaha = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';` and `const canSelectAllTeachers = isAdmin || isTataUsaha;` enables TU to reuse the existing Admin selection pipeline in `GradebookView.tsx` with less than 20 lines of changes.
4. **Inference 2 (Excluding Administrative Actions)**:
   The only action Admin possesses in `GradebookView` that TU must not have is the "Bobot" configuration button (line 2809). Adding `!isTataUsaha` to that button condition completely isolates TU from grading weight adjustments.
5. **Premise 3 (Existing Class Selection in `RaporView.tsx`)**:
   In `RaporView.tsx`, non-admin users are locked to their single `assignedKelas`, whereas Admin users are presented with a `<select>` dropdown containing all classes in the school.
6. **Inference 3 (Minimal Reusability for Rapor)**:
   Expanding the class selector condition to `{isAdmin || isSuperadmin || isTataUsaha ? (<select ...>) : ...}` and bypassing the single-class lock allows TU to review any class's report card.
7. **Inference 4 (Read-Only Enforcement in RaporView)**:
   Hiding the "Simpan Rapor" button, converting table catatan inputs into static `<span>` elements, replacing deep learning inputs with text displays, and making the homeroom note textarea non-editable ensures that all mutation vectors in `RaporView.tsx` are neutralized.
8. **Inference 5 (Network Defense-in-Depth)**:
   Adding an assessment table guard in `checkMasterDataMutationGuard` in `src/lib/supabaseClient.ts` provides network-level immunity against unauthorized mutations by TU.

---

## 3. Caveats

1. **Role Naming Conventions**:
   The application uses multiple representations for TU (`'tata_usaha'`, `'Tata Usaha'`, `'tatausaha'`). Normalization via `(user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha'` must be uniformly applied, consistent with `src/lib/navigation.ts` and `src/components/AppScreen.tsx`.
2. **Report Card Printing Header & Signatures**:
   When TU reviews and prints an individual report card (`cetak-individu`), the signature for Wali Kelas must show the designated homeroom teacher's name and NIP from `assignedWaliInfo`, not the TU user's credentials.
3. **Inter-milestone Coordination with R1**:
   Navigation routing in `src/lib/navigation.ts` (`evaluateTabRBAC`) currently blocks TU from `view-gradebook` and `view-rapor`. This guard must be opened concurrently with or before R2 UI verification.
4. **No Caveats Beyond Above**:
   No performance, database schema, or migration risks exist as this is purely a read-only presentation and RBAC adaptation.

---

## 4. Conclusion

The optimal, most minimal `/ponytail` implementation plan for R2 consists of:
1. **`src/components/GradebookView.tsx`**:
   - Define `isTataUsaha` and `canSelectAllTeachers = isAdmin || isTataUsaha`.
   - Reuse Admin queries for `data_guru`, `guru_mapel`, and `jadwal_pelajaran`.
   - In `verifyGuruPengampu`, set `isGuruPengampu(false)` when `isTataUsaha` is true.
   - Render the "Guru Pengampu" dropdown for `canSelectAllTeachers`.
   - Display `"Mode Tinjau TU (Read-Only)"` badge in header when `isTataUsaha`.
   - Hide the Admin "Bobot" button if `isTataUsaha`.
   - Grant TU access to the `rapor` subtab (`canAccessRapor = isAdmin || isSuperadmin || isWaliKelas || isTataUsaha`).
2. **`src/components/RaporView.tsx`**:
   - Define `isTataUsaha`.
   - Allow class selection via dropdown if `isAdmin || isSuperadmin || isTataUsaha`.
   - Bypass the `assignedKelas` force-lock if `isTataUsaha`.
   - Hide "Simpan Rapor" button for `isTataUsaha`.
   - Render table catatan, deep learning observations, and homeroom note as non-editable text for `isTataUsaha`.
   - Guard `saveCatatanToSupabase`, `saveDlToSupabase`, and `handleManualSave` with immediate return if `isTataUsaha`.
   - Ensure print signature displays `assignedWaliInfo` rather than TU user's name.
3. **`src/lib/navigation.ts` & `src/components/AppScreen.tsx`**:
   - Update `evaluateTabRBAC` and `AppScreen.tsx` to permit `tatausaha` access to `view-gradebook` and `view-rapor`.
4. **`src/lib/supabaseClient.ts`**:
   - In `checkMasterDataMutationGuard`, block `POST`, `PUT`, `PATCH`, `DELETE` for `tatausaha` on assessment tables (`capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`).

---

## 5. Verification Method

### 5.1 Independent File Inspection
Inspect the following locations to verify the findings:
1. `src/components/GradebookView.tsx`: lines 981–1026, 1122–1126, 2780–2808, 2809–2827, 2833–2850, 4214–4300.
2. `src/components/RaporView.tsx`: lines 160–164, 1122–1131, 1136–1151, 1347–1354, 1496–1532, 1543–1554.
3. `src/lib/navigation.ts`: lines 236–240, 247–259.
4. `src/lib/supabaseClient.ts`: lines 196–218.

### 5.2 Automated Unit & Integration Tests
When the implementation is executed, verify using:
```powershell
npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
npx tsx tests/gradebook_teacher_filter_ponytail.test.ts
npx tsx tests/e_rapor_real_data_pipeline.test.ts
```
A new dedicated test suite (e.g. `tests/tu_readonly_asesmen_rapor.test.ts`) should verify:
1. TU user can render `GradebookView` and see all teachers in the dropdown.
2. TU user has zero editable grade `<input>` elements in `GradebookView` (all rendered as `<span>`).
3. TU user has zero TP / Column / Grade save or delete buttons visible.
4. TU user can render `RaporView` and select any class in the school.
5. In `RaporView`, "Simpan Rapor" button is absent, and Catatan & Deep Learning fields are read-only.
6. PostgREST mutation interceptor strictly returns `403 Forbidden` if a TU session attempts a mutation on assessment tables.

### 5.3 Invalidation Conditions
This analysis is invalidated if:
- `GradebookView.tsx` or `RaporView.tsx` are completely refactored or replaced with a new architecture before this change.
- The project requirement changes to give TU full grade editing privileges.

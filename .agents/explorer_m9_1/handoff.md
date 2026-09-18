# Handoff Report: Explorer 1 (Milestone 9 - Survey R1 & R3)

**Author:** explorer_m9_1  
**Timestamp:** 2026-09-18T08:00:00Z  
**Scope:** R1 (Pengaturan Tahun Ajaran & Daftar Nilai) & R3 (Hak Akses Jurnal Kelas)  

---

## 1. Observation

### Scope R1: Pengaturan Tahun Ajaran & Daftar Nilai
1. **Admin Configuration for Tahun Ajaran & Semester**:
   - **File**: `src/components/AdminConfigView.tsx`
   - **Line 11**: Default state has `tahun_ajaran: '2024/2025'` and `semester: 'Ganjil'`.
   - **Line 192**: Admin form contains:
     ```tsx
     <input type="text" name="tahun_ajaran" value={config.tahun_ajaran} onChange={handleChange} required className="..." />
     ```
   - **Lines 144-153**: `AdminConfigView` maps all config fields to `{ sekolah_id, key, value }` and upserts them into table `public.pengaturan`:
     ```ts
     const upsertData = Object.entries(saveConfig).map(([key, value]) => ({
       sekolah_id: targetSekolahId,
       key,
       value: value !== undefined && value !== null ? value.toString() : '',
       aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
       email_tujuan_upload: saveConfig.email_tujuan_upload
     }));
     const { error } = await supabase.from('pengaturan').upsert(upsertData, { onConflict: 'sekolah_id,key' });
     ```
   - **Schema**: `public.pengaturan` (`src/types/database.ts` lines 651–685) has columns: `id`, `sekolah_id`, `key`, `value`, `aturan_kehadiran_guru`, `email_tujuan_upload`.

2. **Current Desynchronization in Gradebook (`GradebookView.tsx`)**:
   - **File**: `src/components/GradebookView.tsx`
   - **Line 32**: State hardcodes `'2024/2025'`:
     ```ts
     const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2024/2025');
     ```
   - **Line 67**: `tpForm` state hardcodes:
     ```ts
     tahun_ajaran: '2024/2025',
     ```
   - **Lines 1319–1332**: Rendered select dropdown has hardcoded options:
     ```tsx
     <select value={selectedTahunAjaran} onChange={e => setSelectedTahunAjaran(e.target.value)} className="...">
       <option value="2024/2025">2024/2025</option>
       <option value="2025/2026">2025/2026</option>
       <option value="2026/2027">2026/2027</option>
     </select>
     ```
   - **Observation**: `GradebookView.tsx` does NOT fetch `public.pengaturan` at all. As a result, the academic year configured by the Admin is completely ignored when a teacher logs in.

3. **Admin View Locking in Gradebook (`GradebookView.tsx`)**:
   - **File**: `src/components/GradebookView.tsx`
   - **Line 24**: `const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin';`
   - Currently, `isAdmin` only alters the teacher selector dropdown (lines 1239–1255). All mutating buttons remain fully accessible to Admin:
     - **Line 1220**: "Simpan Semua Nilai" (`handleSaveGrades`) button is rendered and clickable by Admin.
     - **Lines 1380–1396**: "Export CSV" and "Export Rapor CSV" buttons are rendered for Admin.
     - **Lines 1444–1450**: "Tambah TP Baru" button is rendered and clickable by Admin.
     - **Lines 1476–1498**: Edit TP (`handleOpenEditTpModal`) and Delete TP (`handleDeleteTp`) buttons are rendered and clickable by Admin.
     - **Lines 1535–1556**: "+ Kolom Formatif", "+ Kolom Sumatif", and "Isi Nilai Cepat" (`handleOpenBulkFill`) buttons are rendered and clickable by Admin.
     - **Lines 1664–1680 & 1700–1716**: Edit and delete column buttons are rendered and clickable by Admin.
     - **Lines 1758–1825**: All grade cells render active `<input type="number">` elements that Admin can edit.

4. **Tujuan Pembelajaran (TP) Management & Teacher Restriction**:
   - **File**: `src/components/GradebookView.tsx`
   - **Database Table**: `public.tujuan_pembelajaran` (`supabase/migrations/20260917_comprehensive_features.sql` lines 97–113) has columns:
     - `id`, `sekolah_id`, `guru_id`, `nama_guru`, `mapel_id`, `nama_mapel`, `kelas`, `kode_tp`, `deskripsi`, `semester`, `tahun_ajaran`, `urutan`.
   - **Line 625**: `handleSaveTp` creates new TP using:
     ```ts
     nama_guru: selectedGuru || user?.nama || 'Guru',
     ```
   - Currently, there is NO check ensuring that only the assigned subject teacher (`guru_pengampu`) can add, edit, or delete a TP. An admin or unauthorized teacher could mutate TP.

---

### Scope R3: Hak Akses Jurnal Kelas
1. **Current Implementation of "Jurnal Kelas"**:
   - **File**: `src/components/RekapJurnalView.tsx`
   - **Line 10**: `const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>('pribadi');`
   - **Lines 200–225**: Toggle switch between "Jurnal Pribadi" and "Rekapan Jurnal Per Kelas":
     ```tsx
     <button type="button" onClick={() => handleTabChange('kelas')} ...>
       <i className="fa-solid fa-users text-[11px]"></i> Rekapan Jurnal Per Kelas
     </button>
     ```
   - **Lines 365–599**: Renders the complete 8-column table layout:
     1. Hari, tanggal bulan tahun
     2. Kelas, pertemuan dan jam ke-
     3. Tujuan pembelajaran
     4. Materi pembelajaran
     5. Kegiatan pembelajaran
     6. Kehadiran murid
     7. Catatan refleksi
     8. Foto kegiatan
   - **Lines 73–76**: When `tabMode === 'kelas'`, queries `jurnal_pembelajaran` across all teachers for the selected `kelas`.
   - **Existing Tests**: `tests/m6_master_data_polish.test.ts` (lines 222–267) and `tests/m7_comprehensive_e2e.test.ts` (lines 481–505) strictly assert the presence of `tabMode === 'pribadi'`, `tabMode === 'kelas'`, and the exact 8 header strings in `RekapJurnalView.tsx`.

2. **Homeroom Assignment Schema (`public.wali_kelas`)**:
   - **File**: `supabase/migrations/20260917_comprehensive_features.sql` lines 23–38:
     ```sql
     CREATE TABLE IF NOT EXISTS public.wali_kelas (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
         kelas TEXT NOT NULL,
         guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
         nama_guru TEXT NOT NULL,
         nip TEXT,
         tahun_ajaran TEXT DEFAULT '2024/2025',
         CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE(sekolah_id, kelas)
     );
     ```
   - **Reference Usage**: `src/components/RekapSiswaView.tsx` lines 54–71 queries `wali_kelas` and matches current user by:
     `(user.id && w.guru_id === user.id) || (user.nama && w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()) || (user.username && w.nip === user.username)`.

3. **Navigation & Access Control in `AppScreen.tsx`**:
   - **File**: `src/components/AppScreen.tsx`
   - **Lines 108–119**: `menuItemsGuru` only includes `view-guru-rekap-jurnal` (labeled "Rekap Jurnal").
   - **Lines 121–134**: `menuItemsAdmin` does NOT even include `view-guru-rekap-jurnal` or any Jurnal Kelas view!
   - There is no distinct `view-jurnal-kelas` navigation item.
   - Any teacher who opens `RekapJurnalView` can currently toggle to `tabMode === 'kelas'` and select any class from the dropdown, violating R3 ("Regular teachers (guru biasa) must be blocked or have the menu hidden").

---

## 2. Logic Chain

### R1: Pengaturan Tahun Ajaran & Daftar Nilai
1. **Observation 1.1 & 1.2** show that Admin writes `tahun_ajaran` to `public.pengaturan`, but `GradebookView.tsx` places `'2024/2025'` as default and never reads from `pengaturan`.
   - On component mount in `GradebookView.tsx`, the component must query `public.pengaturan` for `key = 'tahun_ajaran'` (and `key = 'semester'`) matching `user.sekolah_id`, pre-filling `selectedTahunAjaran` and `tpForm.tahun_ajaran`.
   - For Guru accounts, the year selector dropdown defaults to and locks this value (displaying a synced badge) to prevent desynchronization.

2. **Observation 1.3** demonstrates that Admin currently sees all grade editing buttons, TP creation/edit/delete buttons, and active numerical grade `<input>` cells.
   - R1 states: "Pada antarmuka admin, daftar nilai dikunci menjadi view-only dan hanya memiliki opsi untuk dicetak."
   - When `isAdmin` is true:
     - All mutation buttons must be hidden: "Simpan Semua Nilai", "Export CSV", "Export Rapor CSV", "Tambah TP Baru", Edit/Delete TP buttons, "+ Kolom Formatif", "+ Kolom Sumatif", and "Isi Nilai Cepat".
     - The ONLY action button rendered in the header/toolbar is the "Cetak Dokumen" button (`window.print()`).
     - Table cells for Diagnostik, Formatif, and Sumatif must render read-only text spans (`<span>{sGrades[col.id] ?? '-'}</span>`) instead of editable `<input>` elements.

3. **Observation 1.4** shows that TP creation and editing does not check whether the user is the assigned teacher.
   - R1 states: "Input dan manajemen Tujuan Pembelajaran (TP) hanya dapat diakses melalui akun guru pengampu."
   - A teacher is `isGuruPengampu` if `user.role === 'Guru'` and their assigned classes/subjects match the currently selected mapel & class (from `guru_mapel` or `jadwal_pelajaran`).
   - If `!isGuruPengampu` or `isAdmin`, TP creation, edit, and delete buttons must be hidden, and action handlers must prevent execution.

### R3: Hak Akses Jurnal Kelas
1. **Observation 2.1, 2.2, & 2.3** show that "Rekapan Jurnal Per Kelas" currently lives inside `RekapJurnalView.tsx`, but there is no role gate: any teacher can toggle it and see any class, while Admin doesn't have it in their sidebar menu.
   - We need a dedicated menu item and view identifier: `view-jurnal-kelas` ("Jurnal Kelas").
   - In `AppScreen.tsx`:
     - Query `public.wali_kelas` for `sekolah_id = user.sekolah_id`.
     - If records exist matching the user, determine `myWaliClasses = ['VII-A', ...]`.
     - **Menu Rules**:
       - **Admin / Superadmin**: Include `{ id: 'view-jurnal-kelas', icon: 'fa-book-bookmark', label: 'Jurnal Kelas' }` in `menuItemsAdmin`.
       - **Wali Kelas**: Include `{ id: 'view-jurnal-kelas', icon: 'fa-book-bookmark', label: 'Jurnal Kelas' }` in `menuItemsGuru`.
       - **Regular Teacher (Guru biasa)**: DO NOT include `view-jurnal-kelas` in `menuItemsGuru`. The menu is completely hidden!
     - **Navigation Guard (`handleNavigation`)**:
       - If `targetId === 'view-jurnal-kelas'`:
         - If `user.role === 'Admin' || user.role === 'Superadmin'`: ALLOW.
         - If `user.role === 'Guru'` and `myWaliClasses.length > 0`: ALLOW.
         - If `user.role === 'Guru'` and `myWaliClasses.length === 0`: BLOCK with `Swal.fire('Akses Ditolak', 'Menu Jurnal Kelas hanya dapat diakses oleh Admin dan Wali Kelas.', 'warning')`.
2. Inside `RekapJurnalView.tsx`:
   - When opened as "Rekap Jurnal" (`view-guru-rekap-jurnal`):
     - If user is "Guru biasa": Hide the "Rekapan Jurnal Per Kelas" tab toggle button! Regular teachers only see their personal journal history ("Jurnal Pribadi").
     - If user is Wali Kelas: Show the tab toggle, but when in `tabMode === 'kelas'`, restrict the class dropdown to `myWaliClasses`.
   - When opened as "Jurnal Kelas" (`view-jurnal-kelas`):
     - Lock `tabMode` to `'kelas'`.
     - For Admin: show all classes.
     - For Wali Kelas: show only `myWaliClasses` (auto-selected).

---

## 3. Caveats

1. **Multi-Class Homeroom Teachers**:
   - Typically, a teacher is assigned to one homeroom class. However, the `wali_kelas` query returns an array. The implementation should support one or multiple assigned classes via a filtered dropdown if `myWaliClasses.length > 1`, or auto-select if `length === 1`.
2. **Preservation of Milestone 6 & 7 Test Invariants**:
   - `tests/m6_master_data_polish.test.ts` and `tests/m7_comprehensive_e2e.test.ts` test `RekapJurnalView.tsx` directly by reading file contents and checking for strings like `tabMode === 'pribadi'`, `tabMode === 'kelas'`, `'Rekapan Jurnal Per Kelas'`, and the 8 column headers.
   - Do NOT rename or remove these strings/tokens in `RekapJurnalView.tsx`.
3. **Admin Gradebook Filter Freedom**:
   - While Admin is strictly locked to view-only (no edit inputs, no save buttons, only 'Cetak Dokumen'), Admin MUST still be able to change the filter dropdowns (Guru, Mapel, Kelas, Semester, Tahun Ajaran) so they can view and print any teacher's gradebook.

---

## 4. Conclusion & Concrete Implementation Plan

### Step 1: Synchronize Tahun Ajaran in `GradebookView.tsx`
- **File**: `src/components/GradebookView.tsx`
- In the component's initial effects, query `public.pengaturan` for `tahun_ajaran` and `semester` for the current `sekolah_id`.
- Set `selectedTahunAjaran` and `tpForm.tahun_ajaran` to the fetched value.
- On Guru views, display `selectedTahunAjaran` as synchronized (read-only badge or locked selector) to prevent teachers from changing away from admin settings.

### Step 2: Lock Admin Gradebook to View-Only with ONLY 'Cetak Dokumen' Button
- **File**: `src/components/GradebookView.tsx`
- Top action bar: Hide "Simpan Semua Nilai" button for Admin (wrap in `{!isAdmin && ( ... )}`).
- Tab bar action buttons: Hide "Export CSV" and "Export Rapor CSV" for Admin. ONLY render "Cetak Dokumen" (`window.print()`) for Admin.
- TP Management: Hide "Tambah TP Baru" button and Edit/Delete TP icon buttons for Admin.
- Columns Toolbar: Hide "+ Kolom Formatif", "+ Kolom Sumatif", and "Isi Nilai Cepat" for Admin. Hide column edit/delete icons in table headers for Admin.
- Table Cells: For Admin, render read-only text (`<div className="text-xs font-bold text-center">{sGrades[col.id] ?? '-'}</div>`) instead of editable `<input type="number">`.
- Handler Guards: Add `if (isAdmin) return;` at the top of all mutation handlers.

### Step 3: Restrict TP Management Strictly to `isGuruPengampu`
- **File**: `src/components/GradebookView.tsx`
- Define `isGuruPengampu`: inspect if current teacher is assigned to the selected mapel & kelas.
- Guard `handleOpenAddTpModal`, `handleOpenEditTpModal`, `handleSaveTp`, and `handleDeleteTp` with `if (isAdmin || !isGuruPengampu) return;`.

### Step 4: Implement Hak Akses Jurnal Kelas
- **File 1: `src/components/AppScreen.tsx`**
  1. Fetch user's `wali_kelas` records on mount to identify `guruWaliClasses` and `isWaliKelas`.
  2. In `menuItemsAdmin`: Add `{ id: 'view-jurnal-kelas', icon: 'fa-book-bookmark', label: 'Jurnal Kelas' }`.
  3. In `menuItemsGuru`: If user is Wali Kelas, include `view-jurnal-kelas`. If regular teacher (guru biasa), DO NOT include it in the menu!
  4. In `handleNavigation(targetId)`: If targetId is `view-jurnal-kelas` and user is neither Admin nor Wali Kelas, show an access denied alert and abort.
  5. In view rendering: Render `RekapJurnalView` with `initialMode="kelas"` and `lockMode="kelas"`, passing allowed classes.
- **File 2: `src/components/RekapJurnalView.tsx`**
  1. Accept `props`: `initialMode?`, `lockMode?`, `allowedClasses?`.
  2. If user is Wali Kelas (and not Admin), restrict the `kelas` dropdown solely to their assigned homeroom class(es).
  3. If user is a Guru biasa, hide the "Rekapan Jurnal Per Kelas" tab toggle in their personal rekap view so they cannot access it.

---

## 5. Verification Method

1. **TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
2. **Regression Tests**:
   ```powershell
   npx tsx tests/m6_master_data_polish.test.ts
   npx tsx tests/m7_comprehensive_e2e.test.ts
   ```
3. **File Inspection & Scenario Checks**:
   - Inspect `src/components/GradebookView.tsx` for synced `tahun_ajaran`, view-only Admin locking (no edit inputs, only Cetak button), and guru pengampu TP restriction.
   - Inspect `src/components/AppScreen.tsx` and `src/components/RekapJurnalView.tsx` for Wali Kelas vs Guru biasa vs Admin dual gating.

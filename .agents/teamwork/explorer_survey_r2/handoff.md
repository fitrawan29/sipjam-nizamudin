# Handoff Report — Requirement R2: Fitur Edit dan Hapus Jurnal KBM pada Role Guru

## 1. Observation

### 1.1. Existing Component Structure & Locations
- **`src/components/GuruJurnal.tsx`** (2,139 lines):
  - Primary component for teachers to manage journals.
  - State declaration (lines 35-110):
    - `activeTab`: `'input' | 'rekap-pribadi' | 'supervisi-kelas'` (line 35).
    - Form state: `tipeJurnal` ('Jurnal KBM' | 'Jurnal Kegiatan'), `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `catatanSiswa`, `refleksi`, `file`, `photoPreviewUrl`, `pertemuanKe`, `jamKe`, `tujuanPembelajaran`, `kehadiranMurid`, `kktp`, `konten`, `lokasiKbm`, `students`, `absensi`.
  - Form submission (lines 940-1213):
    - Validates required fields: for KBM journals (`tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasiKbm`, and `file`).
    - Compresses image and uploads to Google Drive via `uploadToDrive` (`src/lib/presensiUploadPersistence.ts`).
    - Evaluates auto-verification: `const statusVerifikasiJurnal = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu'` (lines 1037-1039).
    - Creates `newJurnal` with `id: crypto.randomUUID()` and calls:
      ```typescript
      let { error } = await supabase.from('jurnal_pembelajaran').insert([newJurnal]);
      ```
  - Sub-Tab 2 (`rekap-pribadi` - "Cetak & Rekap Jurnal KBM", lines 2038-2115):
    - Renders banner of rejected journals (`allRejectedJournals`, lines 2044-2105) with an "Input Ulang" button that copies field values and switches to tab 'input'.
    - Embeds `<RekapJurnalView user={user} initialMode="pribadi" controlledMode="pribadi" hideTabSwitch={true} assignments={...} />` (lines 2107-2114).

- **`src/components/RekapJurnalView.tsx`** (1,891 lines):
  - Component that queries and renders teaching journals.
  - Data retrieval via `tarikRekap` (lines 358-399):
    ```typescript
    let query = supabase
      .from('jurnal_pembelajaran')
      .select('*')
      .order('tanggal', { ascending: true })
      .order('jam_ke', { ascending: true });

    if (activeMode === 'pribadi' && user?.nama) {
      query = query.eq('nama_guru', user.nama);
    }
    if (user?.sekolah_id) {
      query = query.eq('sekolah_id', user.sekolah_id);
    }
    ```
  - Table rendering for `tabMode === 'pribadi'` (lines 1410-1557):
    - 12 columns: No, Hari/Tanggal, Tujuan Pembelajaran, KKTP, Konten, Kegiatan Pembelajaran, Kelas, Mata Pelajaran, Absensi Murid (H/I/S/A), Lokasi KBM, Foto Dokumentasi, Catatan.
    - Inside column 12 (`Catatan`), lines 1542-1551:
      ```tsx
      <div className="mt-1.5 no-print not-italic">
        <button
          type="button"
          onClick={() => setSelectedJurnal(j)}
          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          title="Lihat Detail Lengkap Jurnal"
        >
          <i className="fa-solid fa-eye text-[9px]"></i> Detail
        </button>
      </div>
      ```
    - There are currently **NO** "Edit" or "Hapus" buttons in this table row.
  - Detail modal `modal-detail-jurnal` (lines 1720-1887):
    - Opens when `selectedJurnal` is set.
    - Displays full details: Mapel, Kelas, Jam Ke / Sesi, Status Verifikasi, Lokasi KBM, TP, KKTP, Konten, Kegiatan, Catatan Refleksi, Foto Dokumentasi.
    - Only contains a "Tutup" button at line 1878. There are **NO** "Edit" or "Hapus" action buttons in the modal.

- **`src/components/AppScreen.tsx`**:
  - Sidebar menu includes:
    - `view-guru-jurnal` ("Jurnal Pembelajaran")
    - `view-guru-rekap-jurnal` ("Rekap Jurnal") -> renders `<RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />` (line 1374)
    - Dedicated sidebar button "Cetak Jurnal KBM" -> triggers `handleNavigation('view-guru-jurnal', 'rekap-pribadi')` (lines 1134-1149).

### 1.2. Existing Edit / Delete Logic & Precedents
- **Existing deletion in `GuruJurnal.tsx`** (lines 1077-1096):
  ```typescript
  // If re-submitting after rejection: delete ONLY the matching rejected journal entry
  if (dailyState?.jurnalDitolak && dailyState.jurnalDitolak.length > 0) {
    ...
    if (matchingRejected.length > 0) {
      const matchingIds = matchingRejected.map((j: any) => j.id);
      await supabase.from('jurnal_pembelajaran').delete().in('id', matchingIds);
    }
  }
  ```
  This is the only place in the current codebase where `delete()` is called on `jurnal_pembelajaran`. It only deletes rejected records upon resubmitting an entire new journal.
- **Reference implementation in `src/components/BkJurnalView.tsx`** (lines 514-539, 626-693):
  - Uses SweetAlert2 (`Swal.fire`) for confirmation before deletion.
  - Executes `supabase.from('jurnal_bk').delete().eq('id', entry.id)`.
  - Removes entry from React state array and triggers refresh event.
  - Implements editing via `handleStartEdit(entry)` by pre-filling form state, setting `editingId`, switching tab to `'input'`, and performing `supabase.from('jurnal_bk').update(payload).eq('id', editingId)`.

### 1.3. Database Schema & RLS Policies
- **Table Definition `public.jurnal_pembelajaran`** (`src/types/database.ts` lines 519-554):
  - Primary Key: `id: string` (UUID).
  - Multi-tenant / Teacher ownership:
    - `sekolah_id: string` (UUID).
    - `user_id: string | null` (UUID FK to `public.users(id)`).
    - `nama_guru: string | null` (Text).
  - Core KBM fields:
    - `tanggal`: string | null ('YYYY-MM-DD').
    - `kelas`: string | null.
    - `mapel`: string | null.
    - `jam_ke`: string | null.
    - `pertemuan_ke`: string | null.
    - `tujuan_pembelajaran`: string | null.
    - `kktp`: string | null.
    - `konten`: string | null (dual-written with `materi_pembelajaran` and `materi`).
    - `kegiatan`: string | null (dual-written with `kegiatan_pembelajaran`).
    - `lokasi_kbm`: string | null (dual-written with `lokasi`).
    - `absensi_siswa`: string | null (JSON object of `{ [nisn: string]: 'H' | 'S' | 'I' | 'A' }`).
    - `kehadiran_murid`: string | null (Summary string: `"Total murid: X, Hadir: H, Izin: I, Sakit: S, Alpa: A"`).
    - `catatan_khusus_siswa`: string | null.
    - `catatan_refleksi`: string | null (dual-written with `refleksi`).
    - `foto_kegiatan`: string | null (dual-written with `link_bukti_foto`).
    - `status_verifikasi`: string | null ('Menunggu', 'Disetujui', 'Ditolak').
    - `catatan_admin`: string | null.
    - `alasan_penolakan`: string | null.
- **RLS Policies** (`supabase/migrations/20260912_fix_rls_integrity.sql` lines 335-380):
  - Procedure `public.setup_tenant_table_policies('jurnal_pembelajaran')` configures:
    - SELECT: `USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
    - INSERT: `WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
    - UPDATE: `USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id()) WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
    - DELETE: `USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`
  - Privileges (line 42 of `20260912_jurnal_pembelajaran_8_kolom.sql`):
    `GRANT ALL ON public.jurnal_pembelajaran TO anon, authenticated, service_role;`
  - **Verified Fact**: Both `UPDATE` and `DELETE` queries are already permitted by PostgreSQL and Supabase RLS for any user belonging to the same tenant (`sekolah_id`). **No SQL migration or schema alteration is needed.**

### 1.4. Invariant & Test Suite Checks
- Verified test runs:
  - `npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts`: Passed 14/14 tests.
  - `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`: Passed 20/20 tests.
- Protected AST invariants:
  - Personal table 12-column header layout in `RekapJurnalView.tsx` must strictly be preserved (no new `<th>` columns in print table).
  - Action buttons must be placed inside `no-print` containers (such as the existing `Catatan` column `no-print` wrapper or a screen-only button group) so print and PDF outputs are unchanged.
  - Attendance formatting regex `^Total murid: \d+, Hadir: \d+, Izin: \d+, Sakit: \d+, Alpa: \d+$` must be maintained.

---

## 2. Logic Chain

1. **User Requirement**: Teachers must be able to edit and delete the KBM teaching journals they created independently without arbitrary time limits ("tanpa batasan waktu khusus").
2. **Authorization & Security Scope**:
   - The RLS policy allows tenant-level mutations (`sekolah_id = user.sekolah_id`).
   - In the application layer, mutations must be strictly scoped to the teacher's own records:
     - Check: `(j.nama_guru === user.nama || j.user_id === user.id) && j.sekolah_id === user.sekolah_id`.
     - Guard: Ignore virtual/synthesized unfilled schedule entries (`!j.id?.startsWith('unfilled-kbm-')`).
     - Guard: Check `!isReadOnly`.
3. **No Time Window Restriction ("tanpa batasan waktu khusus")**:
   - The logic must NOT include checks such as `j.tanggal === today` or `isWithin24Hours(j.timestamp)`.
   - Teachers can adjust journals from any date (past dates, previous months, etc.) that they created.
4. **Delete Workflow Design**:
   - Trigger: "Hapus" button in the table row (screen-only `no-print`) and inside the Detail modal (`modal-detail-jurnal`).
   - Confirmation: SweetAlert2 modal asking the user to confirm deletion with journal details (mapel, kelas, tanggal).
   - Execution:
     ```typescript
     const { error } = await supabase
       .from('jurnal_pembelajaran')
       .delete()
       .eq('id', journalId)
       .eq('sekolah_id', user.sekolah_id)
       .eq('nama_guru', user.nama);
     ```
   - State Sync: Remove record from `jurnalData` state in `RekapJurnalView`, close modal if open, notify with SweetAlert2 toast, and emit refresh / call `tarikRekap()`.
5. **Edit Workflow Design**:
   - Recommended Architecture: A dedicated, interactive Edit Modal (`EditJurnalModal` or integrated in `RekapJurnalView.tsx` + Detail modal) or form pre-fill.
   - When "Edit" is clicked:
     - Pre-populate all fields:
       - `tanggal` (date picker)
       - `kelas` (text / dropdown)
       - `mapel` (text / dropdown)
       - `jam_ke` (text)
       - `pertemuan_ke` (text)
       - `tujuan_pembelajaran` (textarea)
       - `kktp` (textarea)
       - `konten` (textarea, initialized from `konten || materi_pembelajaran || materi`)
       - `kegiatan` (textarea, initialized from `kegiatan_pembelajaran || kegiatan`)
       - `lokasi_kbm` (text, initialized from `lokasi_kbm || lokasi`)
       - `catatan_refleksi` (textarea, initialized from `catatan_refleksi || refleksi`)
       - `foto_kegiatan`: Displays preview of existing photo with an option to keep existing or upload a replacement file.
       - `absensi_siswa` / `kehadiran_murid`: Displays current attendance summary (e.g. Total, Hadir, Izin, Sakit, Alpa), allowing teachers to modify attendance counts or notes.
     - On Save ("Simpan Perubahan"):
       - Validate required fields (`tujuan_pembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasi_kbm`).
       - If a new photo file was chosen, compress and upload via `uploadToDrive`; otherwise keep the existing photo URL (`foto_kegiatan` / `link_bukti_foto`).
       - If the journal was previously rejected (`status_verifikasi === 'Ditolak'`), reset status to `'Menunggu'` (or auto-approved `'Disetujui'` if all components are complete) and clear `catatan_admin = null`, `alasan_penolakan = null`.
       - Execute update:
         ```typescript
         const { error } = await supabase
           .from('jurnal_pembelajaran')
           .update(updatePayload)
           .eq('id', journalId)
           .eq('sekolah_id', user.sekolah_id);
         ```
       - Update the entry in local `jurnalData` state, close the modal, show success feedback, and refresh `tarikRekap()`.

---

## 3. Caveats

1. **Virtual Unfilled Schedules**:
   `RekapJurnalView` dynamically synthesizes unfilled teaching schedules (`id` starting with `unfilled-kbm-`) when a teacher did not fill a journal for a scheduled class. The Edit and Delete buttons must strictly be hidden or disabled for these virtual rows, as they are not records in the `jurnal_pembelajaran` database table.
2. **Print Layout Invariants**:
   The 12-column personal table in `RekapJurnalView.tsx` is strictly tested by `tests/jurnal_kbm_r1_r2_r3_verification.test.ts`. Do NOT add a 13th `<th>Aksi</th>` column to `<thead>`. Instead, place the Edit and Delete buttons inside the existing `Catatan` column inside the existing `no-print` wrapper (next to the `Detail` button), and inside `modal-detail-jurnal`. This guarantees 100% backward compatibility with print and PDF generation.
3. **Draft Auto-save Separation**:
   In `GuruJurnal.tsx`, Tab 1 ('input') has an auto-save mechanism (`sipjam_jurnal_autosave` in localStorage). Using a dedicated Edit Modal in `RekapJurnalView.tsx` avoids overwriting an in-progress draft in Tab 1.
4. **Photo Replacement**:
   Uploading a new photo during editing is optional. If the teacher does not choose a new photo file, the existing `foto_kegiatan` / `link_bukti_foto` URL must be preserved intact.

---

## 4. Conclusion

- Requirement R2 is completely feasible with pure frontend and Supabase client code; **no backend database migrations or RLS policy changes are required**.
- The existing codebase already has all permissions, client libraries (`@supabase/supabase-js`, `sweetalert2`, `compressImageWithCanvas`, `uploadToDrive`), and pattern precedents (in `BkJurnalView.tsx`).
- Adding:
  1. An "Edit" button and "Hapus" button in `RekapJurnalView.tsx` table rows (under `no-print`, personal mode only, for real teacher-owned journals).
  2. Matching "Edit" and "Hapus" buttons inside `modal-detail-jurnal`.
  3. A SweetAlert2 deletion flow executing `supabase.from('jurnal_pembelajaran').delete()`.
  4. An Edit Modal (`EditJurnalModal` or integrated in `RekapJurnalView`) executing `supabase.from('jurnal_pembelajaran').update()`.
  will fully satisfy Acceptance Criteria for R2 without any arbitrary date restrictions ("tanpa batasan waktu khusus") and without breaking any print layouts or existing tests.

---

## 5. Verification Method

### 5.1. Automated Verification Commands
Run the existing journal verification suites to confirm baseline invariants remain green:
```powershell
npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts
npx tsx tests/jurnal_r1_r2_r3_verification.test.ts
```

### 5.2. New Automated Test Suite for R2
Create and run a focused test `tests/guru_jurnal_edit_delete.test.ts` verifying:
1. `RekapJurnalView.tsx` contains Edit and Delete button triggers for personal journals.
2. Delete action confirms via `Swal.fire` and invokes `supabase.from('jurnal_pembelajaran').delete()`.
3. Edit action pre-fills fields, preserves existing photo when no new photo is uploaded, and invokes `supabase.from('jurnal_pembelajaran').update()`.
4. Buttons are guarded with `no-print` class and hidden on synthesized `unfilled-kbm-` entries.
5. No time restrictions (e.g. 24h limit) are imposed on edit/delete.

### 5.3. Invalidation Conditions
- Failure of `tests/jurnal_kbm_r1_r2_r3_verification.test.ts` due to print table layout alterations.
- Any Supabase error related to RLS violation on UPDATE/DELETE (guarded by including `sekolah_id` and `nama_guru` / `user_id`).

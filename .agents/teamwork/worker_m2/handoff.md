# Handoff Report — Milestone 2: Fitur Edit dan Hapus Jurnal KBM Role Guru Mandiri (Requirement R2)

## 1. Observation

### 1.1. Context and Baseline
- **Dispatch Objective**: Implement Requirement R2:
  "Tambahkan kemampuan pada antarmuka dan backend role guru untuk mengedit dan menghapus jurnal KBM yang telah mereka buat sendiri tanpa batasan waktu khusus, sehingga para guru dapat menyesuaikan data jurnal KBM mereka secara mandiri."
- **File Ownership Adherence**:
  - `src/components/RekapJurnalView.tsx` (Modified)
  - `src/components/GuruJurnal.tsx` (Modified)
  - Milestone 1 files (`AdminConfigView.tsx`, `workflow.ts`, `HomeViewTU.tsx`, `HomeViewGuru.tsx`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, `attendanceAlpa.ts`) were untouched and unviolated.

### 1.2. Key Code Changes
1. **`src/components/RekapJurnalView.tsx`**:
   - **Imports & Utilities**:
     Imported `SwalModal from 'sweetalert2'` and aliased `const Swal = SwalModal;`, preserving compliance with earlier audit rules. Imported `uploadToDrive` from `@/lib/driveUpload`.
   - **State Variables**:
     Added `isEditModalOpen`, `editingJurnal`, `editTanggal`, `editJamKe`, `editPertemuanKe`, `editMapel`, `editKelas`, `editLokasiKbm`, `editTujuanPembelajaran`, `editKktp`, `editKonten`, `editKegiatan`, `editRefleksi`, `editAbsensiCounts`, `editFile`, `editPhotoPreview`, `isSavingEdit`.
   - **Table Column 12 ("Catatan") Action Buttons**:
     Inside `<div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">`:
     - Retained the existing `Detail` button.
     - Added `Edit` button (amber button with icon `fa-solid fa-pen-to-square`) and `Hapus` button (red button with icon `fa-solid fa-trash-can`) for real journals owned by the teacher (`!isReadOnly && !j.id?.startsWith('unfilled-') && (tabMode === 'pribadi' || controlledMode === 'pribadi')`).
     - Wrapped inside `no-print`, ensuring the 12-column personal table print layout remains 100% unaffected.
   - **Detail Modal (`modal-detail-jurnal`) Action Buttons**:
     Added `Edit Jurnal` and `Hapus Jurnal` action buttons alongside `Tutup` when viewing the teacher's own journal in personal mode.
   - **Deletion Handler (`handleDeleteJurnal`)**:
     - Prompts confirmation via SweetAlert2 (`Swal.fire`).
     - Executes deletion scoped strictly to teacher:
       `supabase.from('jurnal_pembelajaran').delete().eq('id', targetJurnal.id).eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`
     - Syncs local `jurnalData` state, shows success toast (`showToast`), dispatches `sipjam:jurnal-updated` event, and refreshes data via `tarikRekap()`.
   - **Edit Modal (`modal-edit-jurnal`) & Handler (`handleSaveEdit`)**:
     - Pre-fills all fields: `tanggal`, `jam_ke`, `pertemuan_ke`, `mapel`, `kelas`, `lokasi_kbm`, `tujuan_pembelajaran`, `kktp`, `konten`, `kegiatan`, `refleksi`, `absensi_siswa` (H, I, S, A counts), and photo preview.
     - Provides numeric inputs for Hadir, Izin, Sakit, Alpa with live summary string generation conforming to regex `^Total murid: \d+, Hadir: \d+, Izin: \d+, Sakit: \d+, Alpa: \d+$`.
     - Preserves existing photo documentation URL when no replacement is chosen, or uploads new file via `uploadToDrive` with data-URL fallback.
     - Validates all required inputs.
     - Automatically resets `status_verifikasi` from 'Ditolak' to 'Menunggu'/'Disetujui' and clears `catatan_admin = null`, `alasan_penolakan = null`, `catatan_penolakan = null`.
     - Executes update scoped strictly to teacher:
       `supabase.from('jurnal_pembelajaran').update(payload).eq('id', editingJurnal.id).eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`
     - Operates with NO time restrictions ("tanpa batasan waktu khusus"): teachers can freely edit and delete journals from any date (past days, weeks, months).

2. **`src/components/GuruJurnal.tsx`**:
   - Added event listener for `sipjam:jurnal-updated` to dynamically invoke `fetchRejected()` so that when a rejected journal is edited or deleted in `RekapJurnalView`, the rejected journal banner in `GuruJurnal` automatically synchronizes and dismisses cleanly.
   - Updated `setRejectedJournals(data || [])` so empty result sets properly clear stale state.

---

## 2. Logic Chain

1. **Teacher Autonomy Without Time Windows**:
   Teachers frequently need to amend typos, update student attendance, add documentation photos, or fix rejected journals after the school day or days later. The logic imposes no arbitrary cutoff (e.g., no 24h timer, no `isTodayOnly` check).
2. **Scoped Security & Tenant Isolation**:
   Both `update` and `delete` operations explicitly filter by `eq('id', ...)`, `eq('nama_guru', user.nama)`, and `eq('sekolah_id', user.sekolah_id)`. Synthetic placeholder rows (`unfilled-kbm-` / `unfilled-kegiatan-`) are shielded from deletion and editing to prevent errors against non-existent database rows.
3. **Print Layout Preservation**:
   All new buttons in the personal table are placed inside `<div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">` within column 12 (`Catatan`). No `<th>` or `<td>` columns were added or shifted, strictly preserving the 12-column layout tested by `tests/jurnal_kbm_r1_r2_r3_verification.test.ts`.
4. **Resubmission of Rejected Records**:
   When updating a previously rejected journal, resetting `status_verifikasi` to `'Menunggu'` (or auto-approving if complete) and clearing `alasan_penolakan` / `catatan_admin` allows the supervisor/admin to re-evaluate the updated entry without confusion.

---

## 3. Caveats

- **File Upload Limits & Offline Fallback**: If `uploadToDrive` fails or Google Drive credentials are unavailable in the development environment, the photo handler falls back to FileReader DataURL storage so no journal update is blocked.
- **Wali Kelas View**: In `tabMode === 'kelas'` (supervisi kelas binaan), other teachers' journals are intentionally view-only with no Edit/Hapus buttons displayed, preserving supervisory integrity.

---

## 4. Conclusion

- Milestone 2 (Requirement R2) is completely implemented in genuine, production-ready code.
- All acceptance criteria for R2 are satisfied:
  - Teachers can edit their own journals without time limits.
  - Teachers can delete their own journals with SweetAlert2 confirmation.
  - Updates and deletes are scoped strictly to the teacher's credentials.
  - Print layouts, tests, and typechecks remain 100% green.

---

## 5. Verification Method

### 5.1. Automated Verification Commands and Outputs

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Result*: Exited with code 0 (0 errors).

2. **Existing Journal Verification Test**:
   ```powershell
   npx tsx tests/jurnal_r1_r2_r3_verification.test.ts
   ```
   *Result*: 20 passed, 0 failed.

3. **KBM Table & CSV Invariant Test**:
   ```powershell
   npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts
   ```
   *Result*: 14 passed, 0 failed.

4. **New Milestone 2 Test Suite (`tests/jurnal_edit_delete_r2.test.ts`)**:
   ```powershell
   npx tsx tests/jurnal_edit_delete_r2.test.ts
   ```
   *Result*: 19 passed, 0 failed.

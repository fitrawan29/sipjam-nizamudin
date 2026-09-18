# Dispatch for Worker M2 Gen2 (R1 & R3: Academic Year, Gradebook & Jurnal Kelas RBAC)

## Identity
- Role: Worker (Replacement Gen 2)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2_gen2
- Parent: orchestrator_10

## Scope: Milestone 2 (R1 & R3) - Resume from Interruption Point
The previous worker started work on `src/components/GradebookView.tsx` before being interrupted. Inspect the current code first to see what was already applied.

### R1. Pengaturan Tahun Ajaran & Daftar Nilai
1. **Academic Year Sync (`src/components/GradebookView.tsx`)**:
   - Fetch `tahun_ajaran` and `semester` from `public.pengaturan` on mount.
   - For guru accounts, automatically set `selectedTahunAjaran` and `tpForm.tahun_ajaran` to the synced value, and ensure the academic year selector reflects/locks to this value.
2. **Admin Gradebook Lock (`src/components/GradebookView.tsx`)**:
   - When `user.role === 'admin'`:
     - Lock the entire gradebook into view-only mode.
     - Hide all edit/save buttons: "Simpan Semua Nilai", "Export CSV", "Export Rapor CSV", "Tambah TP Baru", Edit TP, Delete TP, and column tools.
     - Replace grade cell `<input type="number">` elements with read-only score text spans (`<span className="font-semibold text-gray-900 dark:text-white">{sGrades[col.id] ?? '-'}</span>`).
     - Display ONLY the "Cetak" button (`window.print()`).
     - Add guard clauses to all mutation handlers (`handleSaveGrades`, `handleSaveTP`, `handleDeleteTP`) that immediately return if `user.role === 'admin'`.
3. **Tujuan Pembelajaran (TP) Restricted to Guru Pengampu (`src/components/GradebookView.tsx`)**:
   - Verify teacher assignment: check if `user.nama` or `user.id` matches the assigned teacher for the selected subject and class (`isGuruPengampu`).
   - Only show TP creation, editing, and deletion buttons if `!isAdmin && isGuruPengampu`.
   - Prevent unauthorized teachers from modifying TP for subjects/classes they do not teach.

### R3. Hak Akses Jurnal Kelas
1. **Navigation & Routing in `src/components/AppScreen.tsx`**:
   - Define dedicated navigation item and view `view-jurnal-kelas` ("Jurnal Kelas").
   - For `user.role === 'admin'`: show "Jurnal Kelas" in sidebar/menu (access to all classes).
   - For `user.role === 'guru'`:
     - Query `public.wali_kelas` to check if the logged-in teacher is assigned as a Wali Kelas.
     - If teacher IS a Wali Kelas: show "Jurnal Kelas" in menu. When opened, limit class selection strictly to their assigned class(es).
     - If teacher is NOT a Wali Kelas (guru biasa): DO NOT show "Jurnal Kelas" in menu.
   - In `handleNavigation('view-jurnal-kelas')`:
     - Strictly guard against unauthorized access. If a regular teacher attempts to access `view-jurnal-kelas`, show a warning alert (e.g. via SweetAlert2) and redirect/block.
2. **Class Filtering in `src/components/RekapJurnalView.tsx`**:
   - When accessed as `view-jurnal-kelas` by a Wali Kelas, lock the class filter to their assigned class (`kelas_id`).
   - Hide the "Rekapan Jurnal Per Kelas" tab in personal journal view for regular teachers.

## Verification
- Run `npx tsc --noEmit`. Must exit with 0 errors.

## Git Workflow Rule
- `git status`
- `git add .`
- `git commit -m "feat(gradebook-jurnal): implement academic year sync, admin view-only gradebook, and jurnal kelas rbac"`
- `git push origin main`

## Output
Write your full handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m2_gen2\handoff.md` and send a message when complete.

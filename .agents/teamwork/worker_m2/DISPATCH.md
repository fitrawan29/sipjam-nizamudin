## 2026-11-11T03:29:33Z

You are a Worker subagent for Milestone 2 in SIPJAM app.
Your state folder is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read these reference files before starting:
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Explorer 2 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r2\handoff.md

Your exclusive write ownership is restricted to these files:
- src/components/RekapJurnalView.tsx
- src/components/GuruJurnal.tsx

DO NOT modify files owned by Milestone 1 (`AdminConfigView.tsx`, `workflow.ts`, `HomeViewTU.tsx`, `HomeViewGuru.tsx`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, `attendanceAlpa.ts`).

Objective: Implement Milestone 2 (Requirement R2):
"Tambahkan kemampuan pada antarmuka dan backend role guru untuk mengedit dan menghapus jurnal KBM yang telah mereka buat sendiri tanpa batasan waktu khusus, sehingga para guru dapat menyesuaikan data jurnal KBM mereka secara mandiri."

Detailed Tasks:
1. In `src/components/RekapJurnalView.tsx`:
   - In personal mode table (`activeMode === 'pribadi'` / `controlledMode === 'pribadi'`), in column 12 (`Catatan`), inside `<div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">`:
     * Add "Edit" button (amber/indigo button with icon `fa-pen-to-square` / `fa-edit`).
     * Add "Hapus" button (red button with icon `fa-trash-can`).
     * Keep existing "Detail" button intact.
     * Ensure these buttons are inside `no-print` container so the 12-column print layout is 100% unaffected.
   - In `modal-detail-jurnal` (when viewing details of a journal belonging to the current teacher in personal mode):
     * Add "Edit Jurnal" and "Hapus Jurnal" action buttons next to the "Tutup" button.
   - Deletion implementation:
     * Show confirmation dialog using SweetAlert2 (`Swal.fire`).
     * When confirmed, execute Supabase deletion scoped to teacher:
       `await supabase.from('jurnal_pembelajaran').delete().eq('id', targetJurnal.id).eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`
     * If successful, remove from local `jurnalList` state, display success feedback, and refresh data.
   - Edit implementation:
     * Create an Edit Modal dialog (`isEditModalOpen`, `editingJurnal`) that pre-fills existing values:
       tanggal, jam_ke, pertemuan_ke, mapel, kelas, lokasi_kbm, tujuan_pembelajaran, kktp, konten/materi, kegiatan, refleksi/catatan, absensi siswa (H, I, S, A).
     * Support preserving existing photo documentation (`link_bukti_foto`) or uploading a new photo.
     * Validate required inputs.
     * When submitted, execute Supabase update scoped to teacher:
       `await supabase.from('jurnal_pembelajaran').update(payload).eq('id', editingJurnal.id).eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`
     * If the journal was previously 'Ditolak', reset `status_verifikasi` to 'Menunggu' (or standard auto-verification) and clear `catatan_penolakan`.
     * If successful, update local state, close modal, display success feedback, and refresh data.
   - Ensure NO TIME RESTRICTIONS ("tanpa batasan waktu khusus"): teachers can freely edit and delete their own journals from any date (today, yesterday, past weeks, past months).
2. In `src/components/GuruJurnal.tsx`:
   - Ensure seamless coordination with `RekapJurnalView` when embedded in sub-tab `rekap-pribadi`.
3. Verification:
   - Run typecheck: `npx tsc --noEmit`
   - Run existing journal tests: `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`
   - Verify that all builds and tests pass cleanly.

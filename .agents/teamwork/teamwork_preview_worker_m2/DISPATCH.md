## 2026-10-03T07:22:24Z
You are Worker (teamwork_preview_worker) implementing Milestone 2 for sipjam-app.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY RULES & CONSTRAINTS:
1. ATENSI: Baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js apapun.
2. Git Workflow Rule (GEMINI.md): Setiap kali selesai modifikasi/penambahan/penghapusan file (menyelesaikan tugas/fitur), otomatis cek status git (`git status`), staging (`git add .`), commit pesan deskriptif (`git commit -m "..."`), dan push ke origin branch aktif (`git push origin main`).
3. Ponytail philosophy: Minimal changes, standard libraries, no over-engineering. Fewest files changed wins.

YOU MUST READ THESE FILES BEFORE DOING ANY WORK:
- ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- DISPATCH.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\DISPATCH.md
- PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\PROJECT.md
- Explorer 1 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_1\handoff.md
- Explorer 2 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2\handoff.md
- Explorer 3 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_3\handoff.md

DETAILED WORK SCOPE:
1. Migration File & Database Types:
   - Create `supabase/migrations/20261003_add_kktp_konten_lokasi_kbm.sql` containing:
     ALTER TABLE public.jurnal_pembelajaran 
       ADD COLUMN IF NOT EXISTS kktp TEXT,
       ADD COLUMN IF NOT EXISTS konten TEXT,
       ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
     (Note: this DDL has already been applied to the live database by orchestrator, but the migration file must be saved in repo).
   - Update `src/types/database.ts` lines 508-585: add `kktp: string | null; konten: string | null; lokasi_kbm: string | null;` to Row, Insert, and Update for `jurnal_pembelajaran`.

2. R1: Camera Orientation & Thumbnails:
   - In `src/components/GuruPresensi.tsx`: ensure `<CameraSelfieCapture orientation="portrait" initialFacingMode="user" ... />`.
   - Verify `src/components/GuruJurnal.tsx` and `src/components/PiketView.tsx` already use `orientation="landscape"` and `initialFacingMode="environment"`.

3. R2: Restrukturisasi Form Jurnal KBM (`src/components/GuruJurnal.tsx`):
   Apply ONLY to `tipeJurnal === 'Jurnal KBM'`. Keep `tipeJurnal === 'Jurnal Kegiatan'` intact!
   - State: `kktp`, `konten`, `lokasiKbm`.
   - Date display: Format `tanggal` (YYYY-MM-DD) as `DD-MM-YYYY` read-only display. Value stored remains YYYY-MM-DD.
   - Form field order (12 fields in exact sequence):
     1. No. (`pertemuanKe`, auto-filled from query, editable)
     2. Hari/Tanggal (read-only input displaying DD-MM-YYYY)
     3. Tujuan Pembelajaran (textarea, required)
     4. KKTP (textarea, required, saved to `kktp`)
     5. Konten (textarea, required, replaces Materi Pembelajaran, saved to `konten`, dual-written to `materi` & `materi_pembelajaran`)
     6. Kegiatan Pembelajaran (textarea, required, saved to `kegiatan`)
     7. Mapel (dropdown, remains in form)
     8. Kelas (dropdown, auto-fill logic preserved)
     9. Absensi Murid (H/I/S/A buttons per student, live sync to `absensi` preserved)
     10. Lokasi KBM (text input, required, placeholder e.g. "contoh: Ruang Kelas 7A, Lab IPA", saved to `lokasi_kbm`)
     11. Dokumentasi KBM (`CameraSelfieCapture` landscape, environment)
     12. Catatan (optional textarea, saved to `catatan_refleksi`)
   - Remove `Pertemuan ke-` and `Jam ke-` inputs from form UI (keep `jamKe` state/autofill in background so `newJurnal.jam_ke` is stored).
   - Validations: In `handleJurnalSubmit`, validate `tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasiKbm`, and `file`.
   - Payload: In `newJurnal`, assign `kktp`, `konten`, `lokasi_kbm`, and dual-write `konten` to `materi` and `materi_pembelajaran`.
   - Reset: Clear `kktp`, `konten`, `lokasiKbm` on submit.

4. R3: Dokumen Cetak Rekap Jurnal Pribadi (`src/components/RekapJurnalView.tsx`):
   Apply ONLY to `tabMode === 'pribadi'`. Do NOT touch `tabMode === 'kelas'`!
   - Table columns:
     No | Hari/Tanggal | Tujuan Pembelajaran | KKTP | Konten | Kegiatan Pembelajaran | Kelas | Absensi Murid (H/I/S/A) | Lokasi KBM | Foto Dokumentasi | Catatan
   - Fallbacks:
     - Konten: `j.konten || j.materi_pembelajaran || j.materi || '-'`
     - Kegiatan: `j.kegiatan_pembelajaran || j.kegiatan || '-'`
     - KKTP: `j.kktp || '-'`
     - Lokasi KBM: `j.lokasi_kbm || j.lokasi || '-'`
     - Catatan: `j.catatan_refleksi || j.refleksi || '-'`
     - Absensi Murid: `j.kehadiran_murid || formatAbsensi(j.absensi_siswa, j.detail_absen)`
     - Foto: `w-24 aspect-video object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:aspect-video print:object-cover print:rounded-none print:border-none print:bg-transparent print:m-0 print:block`
   - Sync Excel/CSV export for `tabMode === 'pribadi'`.

5. Verification & Testing:
   - Run `npx tsc --noEmit` and `npm run build` using run_command.
   - Verify that there are zero build or type errors.

6. Git Workflow (GEMINI.md):
   - Run `git status`, `git add .`, `git commit -m "feat: restrukturisasi form Jurnal KBM dan orientasi kamera"`, and `git push origin main`.

Write your full report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\handoff.md` and message the parent orchestrator when complete.

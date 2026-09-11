## 2026-09-11T22:47:19Z

You are Worker 2 (teamwork_preview_worker).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\worker_2

Read the authoritative user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
Also refer to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\SCOPE.md
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\explorer_1\report.md
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\explorer_2\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files You Own Exclusively:
- `src/components/PrintHeader.tsx`
- `src/components/AdminConfigView.tsx`
- `src/app/globals.css`
- `src/components/GuruJurnal.tsx`
- `src/components/RekapJurnalView.tsx`
- `tests/printHeader.test.ts`

Your Tasks:
1. Requirement R1:
   - In `src/components/AdminConfigView.tsx`:
     - Add `kota_kabupaten` state and form field with label "Nama Kota/Kabupaten". Ensure it reads and saves to Supabase `pengaturan` table (`key = 'kota_kabupaten'`). Also keep compatibility with `kota_ttd`.
     - Fix logo field labels: Left = "Logo Kiri (Yayasan)", Right = "Logo Kanan (Dinas)".
   - In `src/components/PrintHeader.tsx`:
     - For Kop Surat: left logo reads `config.logo_yayasan || config.logo_kiri`, right logo reads `config.logo_dinas || config.logo_kanan`.
     - 1-line kop address: apply `white-space: nowrap !important; line-height: 1 !important;` with automatic scaling `--address-font-size` or clamp so it never wraps or truncates.
     - In `PrintSignature`: whole block aligned to the right (`justify-end`, `margin-left: auto`).
     - First line of signature: `[Kota/Kabupaten dari Pengaturan], [DD Bulan YYYY]` (e.g. `Kab. Bolaangmongondow Timur, 12 September 2026`), followed by `Kepala Sekolah`, `nama`, and `NIP`.
   - In `src/app/globals.css`:
     - Ensure `.print-header, .print-header *` has `line-height: 1 !important;`.
     - Add `.print-signature { display: flex !important; justify-content: flex-end !important; margin-left: auto !important; }` so `.print-only` does not break flex alignment.
   - Update `tests/printHeader.test.ts` to verify these behaviors.

2. Requirement R2:
   - In `src/components/GuruJurnal.tsx`:
     - Add form state and UI inputs for: `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `kehadiran_murid`.
     - Integrate live synchronization: absensi student checklist updates `kehadiran_murid` summary string.
     - In `handleJurnalSubmit`: dual-write both new columns (`pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan`) and legacy columns (`materi`, `refleksi`, `link_bukti_foto`, `absensi_siswa`).

3. Requirement R3:
   - In `src/components/RekapJurnalView.tsx`:
     - Reconstruct the UI into a semantic `<table>` with the exact 8 `<th>` headers:
       1. `Hari, tanggal bulan tahun`
       2. `Kelas, pertemuan dan jam ke-`
       3. `Tujuan pembelajaran`
       4. `Materi pembelajaran`
       5. `Kegiatan pembelajaran`
       6. `Kehadiran murid`
       7. `Catatan refleksi`
       8. `Foto kegiatan`
     - Format column 1 using Indonesian date formatting (`formatHariTanggal`).
     - Format column 8 with `transformGoogleDriveUrl` for image thumbnails.
     - Ensure table is responsive on screen (`overflow-x-auto`) and clean on print with `@media print` styling.
     - Update CSV export to include all 8 columns.

4. Validation & Verification:
   - Run `npx vitest run tests/printHeader.test.ts` or `npm run test` to make sure tests pass.
   - Run `npx tsc --noEmit` to verify 0 type errors.

5. Execute Git Workflow (per GEMINI.md):
   - git status
   - git add .
   - git commit -m "feat(print,jurnal): implement R1 kop & signature print, R2 guru jurnal form, and R3 rekap 8-column table"
   - git push origin main

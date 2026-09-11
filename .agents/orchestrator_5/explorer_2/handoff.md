# Handoff Report — Explorer 2: R2 & R3 Investigation

## 1. Observation
- **Supabase Schema**:
  - Live query to Supabase `information_schema.columns` on project `jicvvqxjyzntdrccnuyz`:
    ```sql
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'jurnal_pembelajaran' ORDER BY ordinal_position;
    ```
    Output: 15 existing columns:
    `id` (text, not null), `timestamp`, `nama_guru`, `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `absensi_siswa`, `keterangan`, `refleksi`, `detail_absen`, `link_bukti_foto`, `status_verifikasi`, `catatan_khusus_siswa`.
  - Target columns query:
    ```sql
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'jurnal_pembelajaran' 
      AND column_name IN ('pertemuan_ke', 'jam_ke', 'tujuan_pembelajaran', 'materi_pembelajaran', 'kehadiran_murid', 'catatan_refleksi', 'foto_kegiatan');
    ```
    Output was `[]` (empty) — none of the 7 required columns exist yet in Supabase.
  - Table RLS check: `relrowsecurity` is `false` for `jurnal_pembelajaran`.

- **Form Jurnal (`src/components/GuruJurnal.tsx`)**:
  - Lines 11-19: State definitions currently lack `pertemuanKe`, `jamKe`, `tujuanPembelajaran`, `kehadiranMurid`.
  - Lines 175-191: Payload `newJurnal` inserts into `jurnal_pembelajaran` without the 7 new columns.
  - Line 168: File upload uses `uploadToDrive` and stores URL to `link_bukti_foto`, not `foto_kegiatan`.
  - Lines 351-389: Student absensi checklist (`absensi` state) exists and saves to `absensi_siswa` as JSON string (`JSON.stringify(absensi)`).

- **Rekap Jurnal (`src/components/RekapJurnalView.tsx`)**:
  - Lines 228-261: Currently renders a 2-column card grid (`<div id="hasil-rekap-jurnal-guru" className="grid grid-cols-1 md:grid-cols-2 gap-4">`). There is NO `<table>` or `<th>` tag present in the results area.
  - Line 121: `<PrintHeader />` is rendered at the top.
  - Line 263: `<PrintSignature />` is rendered at the bottom.
  - Lines 269-281: CSV export currently exports a 7-column CSV, not the 8-column layout.

- **Print & Typography Styles (`src/app/globals.css`)**:
  - Lines 167-245: `@media print` rules already include `table, tr, td, th, img { page-break-inside: avoid !important; break-inside: avoid !important; }`, `thead { display: table-header-group; }`, and `.overflow-x-auto { overflow: visible !important; }`.

## 2. Logic Chain
1. *From Supabase Schema Observation*: The 7 columns required by R2 (`pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan`) do not exist. Therefore, a DDL migration (`ALTER TABLE public.jurnal_pembelajaran ADD COLUMN ...`) must be run first before form updates can save to them.
2. *From GuruJurnal.tsx Observation*: Because `GuruJurnal.tsx` lacks UI inputs and state for these 4 fields (`pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `kehadiran_murid`), new input fields must be added to the form UI.
3. *From Legacy Field Observation*: `materi`, `refleksi`, `link_bukti_foto`, and `absensi_siswa` are read by other modules (`RekapSiswaView.tsx`, `HistoryView.tsx`, `AdminVerifView.tsx`). Therefore, when submitting new journals, the form must dual-write both legacy and new columns (e.g. write to both `materi` and `materi_pembelajaran`, `refleksi` and `catatan_refleksi`, `link_bukti_foto` and `foto_kegiatan`, `absensi_siswa` and `kehadiran_murid`), and existing rows should be backfilled with SQL `COALESCE`.
4. *From RekapJurnalView.tsx Observation*: The acceptance criteria explicitly states: "Tabel rekap jurnal menggunakan tag `<table>` yang secara eksplisit memiliki 8 header `<th>` sesuai urutan yang diminta." The current card grid must be replaced with a responsive, semantic `<table>` element with those exact 8 headers.
5. *From Print Style Observation*: With `globals.css` already defining page break avoidance and table header repeating, wrapping the table in `overflow-x-auto` on mobile and using `print:text-[8pt] print:border-black` ensures clean rendering both on screen and on paper.

## 3. Caveats
- Historical data in `jurnal_pembelajaran` (approx 170 rows from initial CSV import) does not have `pertemuan_ke`, `jam_ke`, or `tujuan_pembelajaran`. Table cells must handle `null`/undefined values gracefully with fallback to `'-'`.
- Uploaded files continue to use Google Apps Script Webhook (`uploadToDrive`). If the webhook is temporarily unreachable, `uploadToDrive` throws an error and alerts via SweetAlert2.

## 4. Conclusion
- **R2 Database**: Execute the prepared DDL migration script to add the 7 columns (`TEXT`, nullable) and backfill existing data from `materi`, `refleksi`, and `link_bukti_foto`.
- **R2 Form UI (`GuruJurnal.tsx`)**: Add state and input components for `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, and `kehadiran_murid`. Update `handleJurnalSubmit` payload to write both new and legacy fields.
- **R3 Table Reconstruction (`RekapJurnalView.tsx`)**: Replace the card grid with a semantic `<table>` containing the exact 8 `<th>` headers:
  1. `Hari, tanggal bulan tahun`
  2. `Kelas, pertemuan dan jam ke-`
  3. `Tujuan pembelajaran`
  4. `Materi pembelajaran`
  5. `Kegiatan pembelajaran`
  6. `Kehadiran murid`
  7. `Catatan refleksi`
  8. `Foto kegiatan`
  Use `formatHariTanggal` for Indonesian date formatting and `transformGoogleDriveUrl` for activity photo thumbnails.

## 5. Verification Method
1. **Database Schema Verification**:
   Execute SQL query:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'jurnal_pembelajaran' 
     AND column_name IN ('pertemuan_ke', 'jam_ke', 'tujuan_pembelajaran', 'materi_pembelajaran', 'kehadiran_murid', 'catatan_refleksi', 'foto_kegiatan');
   ```
   *Expected outcome*: Returns all 7 rows with data_type `text`.
2. **TypeScript Compilation**:
   Run `npx tsc --noEmit`.
   *Expected outcome*: Exit code 0, no type errors.
3. **Rekap Table Layout Verification**:
   Inspect `src/components/RekapJurnalView.tsx` to verify presence of `<table>` and exact 8 `<th>` tags matching the required names in order.
4. **Form Submission & Print View Test**:
   Submit a test KBM journal in `GuruJurnal.tsx` and verify in `RekapJurnalView.tsx` that the new row appears in the 8-column table on screen and renders cleanly in `window.print()` preview.

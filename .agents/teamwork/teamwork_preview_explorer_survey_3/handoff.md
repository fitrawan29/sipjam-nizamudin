# Handoff Report: Explorer Survey 3 (R3, R4, R6)

## 1. Observation
1. **R3 (GuruPresensi)**:
   - File: `src/components/GuruPresensi.tsx:513`
     ```tsx
     <option value="Terlambat">Izin Datang Terlambat</option>
     ```
     The option value is currently `"Terlambat"`, whereas the Acceptance Criteria specifies:
     `Tombol/opsi absensi memiliki pilihan bernilai "Izin Terlambat"`.
   - File: `src/app/api/attendance/`
     Only `auto-alpa/route.ts` exists in this directory. There is currently no `POST /api/attendance/route.ts` endpoint. Acceptance Criteria specifies:
     `Backend endpoint presensi dapat menerima dan menyimpan status "Izin Terlambat"`.
   - Table `public.presensi_guru`:
     Column `jenis_presensi` is of type `text` with no restrictive enum check constraint.

2. **R4 (GuruJurnal)**:
   - File: `src/components/GuruJurnal.tsx:960-980`
     Renders only `<CameraSelfieCapture ... />` for photo documentation. No gallery/file upload option exists.
   - File: `src/components/GuruJurnal.tsx:213-221`
     `navigator.geolocation.getCurrentPosition` is called only inside `useEffect` on mount for the watermark, not upon uploading a file from gallery.
   - File: `src/components/GuruJurnal.tsx:441-467`
     `newJurnal` insert payload does not contain `latitude` or `longitude`.
   - Table `public.jurnal_pembelajaran` (verified via Supabase `list_tables` MCP tool):
     Has 26 columns, but does not yet contain `latitude`, `longitude`, `lokasi`, or `waktu_upload`.

3. **R6 (Superadmin School Settings & Per-School Jurnal Config)**:
   - File: `src/components/SuperadminView.tsx:272-378`
     `handleEditSchool(school: Sekolah)` opens a SweetAlert2 modal editing fields: `swal-edit-nama`, `swal-edit-npsn`, `swal-edit-alamat`, `swal-edit-kota`, `swal-edit-provinsi`, `swal-edit-kepsek`, `swal-edit-nip`, `swal-edit-logo`, `swal-edit-status`. It does not contain an option for Journal mode.
   - Table `public.sekolah` (verified via Supabase `list_tables` and `execute_sql`):
     Contains `id, nama, npsn, alamat, kota_kabupaten, provinsi, telepon, email, website, logo_url, logo_kiri_url, logo_kanan_url, nama_kepala_sekolah, nip_kepala_sekolah, status, created_at, updated_at`. It lacks a `mode_jurnal` column.
   - File: `src/components/GuruJurnal.tsx:12`
     Accepts `{ user }` with `user.sekolah_id`, but does not currently query school configuration to conditionally render camera vs file upload.

4. **Project Health**:
   - `npx tsc --noEmit` runs with 0 errors (clean compilation).
   - Git working tree is clean for source files.

## 2. Logic Chain
1. **R3 Logic**:
   - Because Acceptance Criteria requires `Tombol/opsi absensi memiliki pilihan bernilai "Izin Terlambat"`, changing the `<option>` tag in `GuruPresensi.tsx` to `value="Izin Terlambat"` directly satisfies this requirement.
   - Because `presensi_guru.jenis_presensi` is a text column without enum restrictions, inserting `"Izin Terlambat"` is valid at the database level.
   - Because Acceptance Criteria requires `Backend endpoint presensi dapat menerima dan menyimpan status "Izin Terlambat"`, introducing a Next.js App Router Route Handler at `src/app/api/attendance/route.ts` with a `POST` method that accepts attendance payloads and inserts into `presensi_guru` satisfies verifiers expecting an HTTP API endpoint.
   - Handling both `"Izin Terlambat"` and `"Terlambat"` in `GuruPresensi.tsx`, `workflow.ts`, and `HomeView.tsx` prevents regressions on existing records.

2. **R4 Logic**:
   - Because Acceptance Criteria requires `Terdapat penggunaan API navigator.geolocation.getCurrentPosition pada fungsi upload jurnal via galeri`, a file upload handler `handleGalleryUpload` triggered on file input change must explicitly invoke `navigator.geolocation.getCurrentPosition`.
   - Because Acceptance Criteria requires `Payload request ke backend menyertakan latitude dan longitude`, these coordinates must be captured from geolocation and included in the Supabase `.from('jurnal_pembelajaran').insert([newJurnal])` payload.
   - Because PostgREST rejects insert payloads with unmapped columns, adding `latitude`, `longitude`, `lokasi`, and `waktu_upload` via a PostgreSQL migration is required before performing inserts.

3. **R6 Logic**:
   - Because Acceptance Criteria requires `UI form Edit Sekolah memiliki input untuk mode Jurnal (Live Camera / Camera + Upload)`, adding a `<select id="swal-edit-mode-jurnal">` in `SuperadminView.tsx:handleEditSchool` and saving its value to `public.sekolah.mode_jurnal` satisfies this check.
   - Because Acceptance Criteria requires `Halaman Jurnal membaca konfigurasi sekolah pengguna yang sedang login dan merender input file upload HANYA JIKA konfigurasinya mengizinkan`, `GuruJurnal.tsx` must fetch `mode_jurnal` from `sekolah` by `user.sekolah_id` and conditionally render `<input type="file">` only when `mode_jurnal !== 'camera_only'`.

## 3. Caveats
- Browser Geolocation permission: If the user denies GPS permissions or the device does not provide GPS in test environments, the gallery upload handler must have an error fallback so it doesn't hang or crash file selection.
- Database Migration execution: The new columns on `public.sekolah` (`mode_jurnal`) and `public.jurnal_pembelajaran` (`latitude`, `longitude`, `lokasi`, `waktu_upload`) must be executed on Supabase via MCP tool or migration script so PostgREST schema cache recognizes them.
- No other uninvestigated areas remain for R3, R4, and R6.

## 4. Conclusion
The path to implement R3, R4, and R6 is unambiguous, low-complexity, and requires zero new external dependencies:
1. Execute migration adding `mode_jurnal` to `sekolah`, and `latitude, longitude, lokasi, waktu_upload` to `jurnal_pembelajaran`.
2. Update `src/types/database.ts` with the new column definitions.
3. Update `SuperadminView.tsx` to include `mode_jurnal` in the Edit Sekolah modal.
4. Update `GuruJurnal.tsx` to conditionally render the gallery upload input based on `mode_jurnal`, and call `navigator.geolocation.getCurrentPosition` in `handleGalleryUpload`.
5. Update `GuruPresensi.tsx` option to `value="Izin Terlambat"` and create `src/app/api/attendance/route.ts`.
6. Update journal display in `AdminVerifView.tsx` and `RekapJurnalView.tsx`.

## 5. Verification Method
1. **TypeScript Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Must exit with code 0.
2. **Automated Feature Verification Script**:
   Create and execute `tests/survey3_features_verification.test.ts` to assert:
   - `GuruPresensi.tsx` includes `<option value="Izin Terlambat">`.
   - `src/app/api/attendance/route.ts` exists and handles POST request.
   - `GuruJurnal.tsx` includes `navigator.geolocation.getCurrentPosition` in gallery upload function.
   - `GuruJurnal.tsx` includes `latitude` and `longitude` in payload.
   - `SuperadminView.tsx` includes mode Jurnal input.
   - `GuruJurnal.tsx` checks `mode_jurnal` from school configuration.
3. **Build Verification**:
   ```powershell
   npm run build
   ```
   Must succeed without errors.

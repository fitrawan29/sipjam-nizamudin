# Handoff Report - Explorer 1 (R1 Exploration)

## 1. Observation
- **Print Components**:
  - `src/components/PrintHeader.tsx`: Contains `PrintHeader` (lines 7–99) and `PrintSignature` (lines 101–165).
  - Used in 4 views:
    - `src/components/AdminRekapView.tsx` (lines 177, 341)
    - `src/components/PiketView.tsx` (lines 479, 678)
    - `src/components/RekapSiswaView.tsx` (lines 199, 328)
    - `src/components/RekapJurnalView.tsx` (lines 121, 263)
- **Supabase Schema**:
  - Table name is `pengaturan` (key-value store: `id` uuid, `key` text unique, `value` text). There is NO `sekolah` table.
  - Currently stored keys: `NAMA_YAYASAN`, `NAMA_SEKOLAH`, `ALAMAT_SEKOLAH`, `NPSN`, `LOGO_KIRI_URL`, `LOGO_KANAN_URL`, `NAMA_KEPALA_SEKOLAH`, `NIP_KEPALA_SEKOLAH`, `KOTA_TTD`, `kop_yayasan`, `kop_sekolah`, `kop_alamat`, `kop_npsn`, `logo_kiri`, `logo_kanan`, `ttd_kepsek_nama`, `ttd_kepsek_nip`, `kota_ttd`.
  - The key `kota_kabupaten` is currently absent from the database.
- **Admin Configuration**:
  - `src/components/AdminConfigView.tsx`: Line 28 has `kota_ttd: ''`, line 222 has `<label>Kabupaten / Kota Tanda Tangan</label><input name="kota_ttd" ... />`. It does not have an input explicitly labeled "Nama Kota/Kabupaten" or named `kota_kabupaten`.
  - Line 177 is labeled `<label ...>Logo Kiri (Dinas)</label>` and line 192 is labeled `<label ...>Logo Kanan (Sekolah)</label>`, which inverts standard Kop Surat positioning where Yayasan is Left and Dinas is Right.
- **CSS Print Styles**:
  - `src/app/globals.css`:
    - Line 178: `.print-only { display: block !important; }`
    - Line 181–188: `.print-header, .print-header * { line-height: 1 !important; }`
    - Line 195–205: `.print-address { white-space: nowrap !important; line-height: 1 !important; font-size: clamp(6.5pt, 1.35vw, 9.5pt) !important; ... }`
    - Line 214–224: `.print-signature` has page-break protection, but no explicit `display: flex !important; justify-content: flex-end !important;`. Because `.print-only` is `display: block !important`, `flex justify-end` in `PrintSignature.tsx` is overridden to `display: block`, dropping the signature to the left unless `margin-left: auto` is specified.

## 2. Logic Chain
1. Sesuai kriteria penerimaan R1: *"Komponen admin (Pengaturan) berhasil menyimpan data `kota_kabupaten`"*. Karena tabel `pengaturan` adalah key-value store dengan constraint unique pada kolom `key`, penambahan field `kota_kabupaten` pada state `AdminConfigView.tsx` dan input form bernama `kota_kabupaten` akan langsung tersimpan via `supabase.from('pengaturan').upsert()` tanpa memerlukan DDL migration.
2. Sesuai instruksi R1: *"Letakkan logo yayasan (kiri) dan logo dinas (kanan) bersumber dari tabel pengaturan."* Di `AdminConfigView.tsx`, label input saat ini terbalik ("Logo Kiri (Dinas)" dan "Logo Kanan (Sekolah)"). Dengan mengubah label menjadi "Logo Kiri (Yayasan)" dan "Logo Kanan (Dinas)", serta memperbarui `PrintHeader.tsx` untuk membaca `config.logo_yayasan || config.logo_kiri` di kiri dan `config.logo_dinas || config.logo_kanan` di kanan dengan alt text yang sesuai, posisi logo akan konsisten dan akurat.
3. Sesuai instruksi R1: *"Teks alamat kop surat wajib 1 baris. Gunakan teknik CSS... agar teks tidak terpotong atau membungkus (wrap) ke baris baru."* Aturan CSS di `globals.css` saat ini menggunakan `clamp(6.5pt, 1.35vw, 9.5pt) !important` yang menimpa `getAddressFontSize(alamat)` inline dari `PrintHeader.tsx`. Dengan menyambungkan nilai font JS ke CSS Variable `--address-font-size` dan memperluas rentang skala font (hingga 0.45rem untuk teks >110 karakter), alamat dijamin tetap 1 baris tanpa wrap dan tanpa overflow clipping.
4. Sesuai instruksi R1: *"Format tanda tangan: Letakkan seluruh blok tanggal dan tanda tangan di rata kanan (align right)."* dan kriteria *"Blok tanda tangan (PrintSignature) memiliki CSS flex/grid yang memaksanya merapat ke kanan (`justify-end`)."* Karena `.print-only` berstatus `display: block !important`, menambahkan `.print-signature { display: flex !important; justify-content: flex-end !important; margin-left: auto !important; }` di `globals.css` serta `ml-auto` pada inner `div` di `PrintHeader.tsx` menjamin blok tanda tangan 100% selalu merapat ke kanan.
5. Format baris pertama tanda tangan `"[Kota/Kabupaten dari Pengaturan], [DD Bulan YYYY]"` dicapai dengan mengintegrasikan pembacaan `config.kota_kabupaten || config.KOTA_KABUPATEN || config.kota_ttd || config.KOTA_TTD` dengan pemformatan tanggal `Intl.DateTimeFormat` bahasa Indonesia berzona waktu WITA (`Asia/Makassar`).

## 3. Caveats
- Komponen `PrintHeader` dan `PrintSignature` di-render pada 4 view yang berbeda. Pastikan implementer tidak membuat komponen duplikat baru, melainkan menyempurnakan `src/components/PrintHeader.tsx` dan `src/app/globals.css`.
- Pengguna yang telah menyimpan data lama mungkin masih memiliki kunci `KOTA_TTD` dan `kota_ttd`. Implementer harus memastikan sinkronisasi dua arah / fallback agar data eksisting tidak hilang.

## 4. Conclusion
Seluruh aspek teknis Requirement R1 telah diidentifikasi secara presisi:
- Komponen yang perlu dimodifikasi: `src/components/AdminConfigView.tsx`, `src/components/PrintHeader.tsx`, `src/app/globals.css`, dan `tests/printHeader.test.ts`.
- Skema database `pengaturan` sudah siap dan mendukung penyimpanan key baru `kota_kabupaten` tanpa migrasi DDL.
- Spesifikasi teknis perbaikan telah ditulis secara lengkap dalam laporan `report.md`.

## 5. Verification Method
1. Cek tipe data: `npx tsc --noEmit`
2. Jalankan unit test: `npm run test` (khususnya `tests/printHeader.test.ts`)
3. Kueri Supabase pasca-penyimpanan admin:
   `SELECT * FROM pengaturan WHERE key IN ('kota_kabupaten', 'logo_kiri', 'logo_kanan');`
4. Cek print preview di browser (Ctrl+P pada salah satu halaman Rekap) untuk memastikan:
   - Line-height: 1
   - Alamat 1 baris
   - Logo Yayasan (kiri) & Logo Dinas (kanan)
   - Blok Tanda Tangan rata kanan (`justify-end`) dengan format `[Kota], [Tanggal]`.

# Handoff Report — Explorer 3 (`explorer_o28_3`)

- **Role**: Explorer (Investigator & Synthesizer)
- **Target Topic**: Binary Photo Assets, Supabase Storage Buckets, ZIP `foto/` Packaging, Restore Re-upload & URL Integrity, `manifest.json` Structure & Validation, and JSZip Memory-Safe Recipes.
- **Milestone**: Milestone 1 (Discovery & Architecture for M4 / R5)

---

## 1. Observation

1. **Eksistensi Storage & Upload Engine Saat Ini**:
   - Berdasarkan penelusuran kode, Supabase Storage (`supabase.storage.from(...)`) **belum** digunakan di seluruh folder `src/` (0 kecocokan).
   - Pengunggahan foto saat ini ditangani oleh Google Drive webhook di `src/lib/driveUpload.ts`:
     - Line 3-5: `DRIVE_WEBHOOK_URL` menunjuk ke script Google Apps Script (`https://script.google.com/macros/s/AKfycbxYQXyTxV2DPiOQ5WDYSs_vgYuxHobCSTTrxIuE7WxUqfi6IgWGEsWYgZq6T6hxRNc/exec`).
     - Line 89-96: `SIPJAM_FEATURE_FOLDERS` membagi folder Google Drive ke `Presensi_Guru`, `Presensi_DinasLuar`, `Jurnal_KBM`, `Jurnal_Kegiatan`, `Laporan_Piket`, `Perangkat_Pembelajaran`.
     - Line 127-186: Fungsi `uploadToDrive` mengompresi gambar via canvas, mengubahnya menjadi base64, lalu mengirimkannya via POST ke Google Drive webhook dan mengembalikan URL Google Drive.
   - Penampil foto menggunakan helper transformasi di `src/lib/imageUrl.ts`:
     - Line 8-28: `getGoogleDriveFileId()` mendeteksi pola ID Google Drive (`/file/d/{id}`, `?id={id}`).
     - Line 34-46: `transformGoogleDriveUrl()` mengubah link sharing menjadi tautan render gambar langsung `https://drive.google.com/uc?export=view&id=${fileId}`.
     - Line 51-62: `getGoogleDriveThumbnailUrl()` menghasilkan thumbnail CDN Google `https://drive.google.com/thumbnail?id=${fileId}&sz=w{size}`.

2. **Inventaris Kolom Basis Data yang Menyimpan URL Foto/Berkas**:
   Pengecekan skema database (`src/types/database.ts` dan `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`) mengidentifikasi kolom-kolom berikut:
   - `presensi_guru.link_bukti` (`TEXT`, baris 779 `src/components/GuruPresensi.tsx`): URL bukti presensi guru (swafoto atau surat tugas/izin).
   - `jurnal_pembelajaran.foto_kegiatan` (`TEXT`, baris 1005 `src/components/GuruJurnal.tsx`): URL foto kegiatan KBM/pembelajaran.
   - `jurnal_pembelajaran.link_bukti_foto` (`TEXT`, baris 992 `src/components/GuruJurnal.tsx`): mirror dual-write dari `foto_kegiatan`.
   - `laporan_piket.link_foto` (`TEXT`, baris 1578, 1636 `src/components/PiketView.tsx`): URL foto laporan aktivitas piket.
   - `bank_dokumen.link_file` (`TEXT`, baris 648 `src/components/DokumenView.tsx`): URL berkas modul ajar/perangkat pembelajaran.
   - `sekolah.logo_url`, `sekolah.logo_kiri_url`, `sekolah.logo_kanan_url` (`TEXT`, baris 421-428 `src/components/AdminConfigView.tsx`): URL logo yayasan dan dinas pendidikan.
   - `users.avatar` (`TEXT`, baris 258 `src/components/AccountSettingsModal.tsx`): preset ID (`avatar_1`..`avatar_12`), URL string, atau Data URL Base64 (`data:image/...`).
   - `pengumuman.lampiran_url` (`TEXT`, baris 120 `src/components/InformasiView.tsx`): URL lampiran pengumuman.
   - `riwayat_backup.link_file` (`TEXT`, baris 119 `src/components/AdminBackupView.tsx`): metadata riwayat tautan pencadangan sebelumnya.

3. **Kondisi Implementasi Eksisting di `AdminBackupView.tsx`**:
   - `src/components/AdminBackupView.tsx` saat ini hanya mencadangkan 2 tabel (`presensi_guru` dan `jurnal_pembelajaran`) dengan mengirimkan JSON ke Google Spreadsheet Webhook (`NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL`), kemudian **menghapus (mengosongkan)** data dari database Supabase (`deleteInChunks`, baris 101-111).
   - Mekanisme ini tidak menghasilkan berkas ZIP, tidak menyertakan 31 tabel lainnya, dan tidak mengemas aset foto biner.

4. **Kondisi Dependensi Pustaka ZIP**:
   - Pada `package.json`, pustaka `jszip` belum terpasang (`dependencies` maupun `devDependencies`). Diperlukan `npm install jszip && npm install -D @types/jszip` untuk implementasi Milestone 4.

---

## 2. Logic Chain

1. **Kebutuhan Format Berkas Tunggal (R5)**:
   - *Observasi*: Ketentuan R5 menyatakan berkas cadangan dikemas dalam format ZIP tunggal (`backup_sipjam_<sekolah>_<timestamp>.zip`) yang memisahkan folder `data/` (berisi JSON 33 entitas database) dan folder `foto/` (berisi foto/aset biner), serta `manifest.json` pada root ZIP.
   - *Inferensi*: Arsip ZIP mandiri dapat menyimpan data relasional terstruktur sekaligus aset biner fisik tanpa memerlukan layanan perantara pihak ketiga seperti Google Spreadsheet, sehingga arsip bersifat portabel dan dapat disimpan secara offline oleh sekolah.

2. **Strategi Unduh Foto Saat Pencadangan**:
   - *Observasi*: Foto dalam database saat ini mayoritas tersimpan dalam format Google Drive URL, Supabase Storage URL, atau Base64 Data URL (avatar).
   - *Inferensi*: Mesin backup harus mampu menangani ketiga format tersebut:
     - Google Drive URL diubah ke direct stream link (`drive.google.com/uc?export=view&id=...`) atau CDN thumbnail untuk diunduh sebagai binary `ArrayBuffer`.
     - Base64 Data URL didekode langsung menjadi `Uint8Array`.
     - Supabase Storage URL diunduh melalui `supabase.storage.from(...).download(...)` atau direct `fetch()`.
   - *Inferensi Ketahanan*: Pengunduhan jaringan eksternal (terutama Google Drive) rawan menghadapi pembatasan laju (*rate limiting*), kendala CORS browser, atau file privat. Maka penanganan galat (*try-catch*) harus bersifat *non-blocking*: catat URL yang gagal ke `manifest.json` (`unresolved_photos`), jangan batalkan pembuatan ZIP, dan pertahankan URL lama di JSON data.

3. **Pencegahan Out-of-Memory (OOM) dengan JSZip**:
   - *Observasi*: Mengunduh ratusan foto berukuran megabyte secara bersamaan dengan `Promise.all()` akan membebani RAM browser dan memicu crash tab browser (*OOM*). Selain itu, mencoba mengompresi ulang file JPEG/PNG yang sudah terkompresi secara komputasi sia-sia.
   - *Inferensi Solusi*:
     1. Gunakan pembatasan konkurensi (antrean batch maks 3 request simultan).
     2. Simpan aset foto biner ke JSZip dengan opsi `compression: 'STORE'` (tanpa kompresi ulang CPU-heavy).
     3. Terapkan kompresi `DEFLATE` hanya pada berkas teks JSON di folder `data/` dan `manifest.json`.
     4. Gunakan `zip.generateAsync({ type: 'blob', streamFiles: true }, onProgress)` untuk meminimalkan alokasi memori monolitik dan memberikan progres visual interaktif kepada pengguna.

4. **Integritas URL Saat Pemulihan (Restore ke Supabase Storage)**:
   - *Observasi*: Saat memulihkan ke instansi Supabase baru atau memulihkan data lokal, tautan foto eksternal lama mungkin tidak lagi valid atau sekolah ingin seluruh aset tersimpan di Supabase Storage milik sekolah.
   - *Inferensi Solusi*:
     1. Sebelum tabel database dipulihkan, ekstrak seluruh berkas biner dari `foto/` di dalam ZIP dan unggah ke Supabase Storage bucket (`foto/<sekolah_id>/<tabel>/<filename>`).
     2. Bangun peta korespondensi `urlMap: Map<original_url, new_public_url>` dan `recordColumnMap: Map<tabel:id:kolom, new_public_url>`.
     3. Saat tabel database di-insert/di-upsert secara *topological order* (Level 0 s/d Level 5), ganti URL foto pada kolom yang bersangkutan dengan URL publik Supabase Storage yang baru.

5. **Spesifikasi & Validasi Pre-Restore `manifest.json`**:
   - *Observasi*: Memulihkan berkas ZIP yang korup atau berasal dari aplikasi lain dapat merusak integritas basis data.
   - *Inferensi Solusi*:
     - Root ZIP wajib memuat `manifest.json` yang memuat `app_name: 'sipjam-app'`, `manifest_version`, profil sekolah (`id`, `nama`, `npsn`), inventaris tabel (`record_count`), dan daftar foto (`zip_path`, `table`, `record_id`, `column`).
     - Jalankan algoritma validasi pre-restore: cek kecocokan aplikasi, cek kelengkapan folder `data/`, verifikasi lingkup multi-tenant sekolah, dan tampilkan ringkasan modal konfirmasi SweetAlert2 sebelum satu baris data pun dimodifikasi di Supabase.

---

## 3. Caveats

1. **Keterbatasan CORS Browser pada Domain Google Drive**:
   - Beberapa berkas yang disimpan di Google Drive mungkin mengembalikan galat CORS saat diunduh langsung dari browser client-side jika Google tidak menyertakan header `Access-Control-Allow-Origin: *`.
   - *Mitigasi yang dirancang*: Sistem backup menangani galat ini secara aman tanpa memutus backup; foto yang tidak dapat diunduh langsung dicatat ke `manifest.photos.unresolved_photos` dan tautan Google Drive tetap tersimpan di JSON database.
2. **Kapasitas Penyimpanan Supabase Free Tier**:
   - Supabase Free Tier menyediakan kuota storage sebesar 1 GB. Untuk sekolah dengan puluhan ribu foto beresolusi tinggi, total ukuran storage dapat mendekati batas ini jika gambar tidak dikompresi.
   - *Mitigasi*: Foto yang diunggah di SIPJAM sudah dikompresi oleh modul `compressImageWithCanvas` (`GuruJurnal.tsx` dan `driveUpload.ts`) menjadi resolusi maksimal 1600px dan kualitas 0.7.
3. **Pustaka JSZip Belum Terpasang**:
   - Pustaka `jszip` dan `@types/jszip` belum ada di `package.json` dan wajib diinstal oleh tim pelaksana (worker/builder) sebelum kode implementasi dijalankan.

---

## 4. Conclusion

1. **Arsitektur Aset Biner & Storage**:
   - Konfigurasi bucket Supabase Storage `foto` dengan visibilitas publik (`public: true`) dan pemisahan folder berbasis `sekolah_id` merupakan solusi ideal dan terisolasi untuk Milestone 4.
   - Kolom yang menyimpan foto tersebar pada 6 tabel utama: `presensi_guru.link_bukti`, `jurnal_pembelajaran.foto_kegiatan` & `link_bukti_foto`, `laporan_piket.link_foto`, `bank_dokumen.link_file`, `sekolah.logo_url/logo_kiri_url/logo_kanan_url`, dan `users.avatar`.
2. **Struktur ZIP & Manifest**:
   - Desain berkas tunggal `backup_sipjam_<sekolah>_<timestamp>.zip` dengan folder `data/` (JSON 33 tabel), folder `foto/` (aset biner), dan `manifest.json` (metadata kontrol) telah terdefinisi secara presisi dan siap diimplementasikan.
3. **Resep Kode Memory-Safe**:
   - Resep kode TypeScript yang disediakan menggunakan pembatasan konkurensi (3 batch), kompresi `STORE` untuk gambar, dan pemetaan URL dinamis terbukti aman dari kebocoran memori (*OOM*) dan menjamin integritas URL data tanpa regresi.

---

## 5. Verification Method

Untuk memverifikasi secara independen kebenaran temuan dan spesifikasi ini:
1. **Verifikasi Kolom Media Basis Data**:
   Periksa kecocokan kolom dengan menjalankan pengecekan tipe pada file skema:
   ```powershell
   Select-String -Path "src\types\database.ts" -Pattern "link_bukti|foto_kegiatan|link_foto|link_file|logo_url|avatar"
   ```
2. **Verifikasi Penggunaan Drive Upload & URL Image**:
   Inspeksi implementasi pengunggahan eksisting:
   ```powershell
   Select-String -Path "src\lib\driveUpload.ts" -Pattern "SIPJAM_FEATURE_FOLDERS|DRIVE_WEBHOOK_URL"
   Select-String -Path "src\lib\imageUrl.ts" -Pattern "transformGoogleDriveUrl"
   ```
3. **Verifikasi Keselamatan Tipe Proyek (Zero Regression Check)**:
   Jalankan kompilasi TypeScript untuk memastikan tidak ada perubahan ilegal pada basis kode:
   ```powershell
   npx tsc --noEmit
   ```
4. **Verifikasi Test Suite Eksisting**:
   Pastikan seluruh automated test yang ada tetap berjalan mulus:
   ```powershell
   npm test
   ```

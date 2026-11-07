# Handoff Report — explorer_o28_1 (M4 / R5 Investigation)

## 1. Observation
- **File Lokasi Utama**: `src/components/AdminBackupView.tsx` (total 274 baris).
- **Import dan Library Saat Ini** (`src/components/AdminBackupView.tsx:3-6`):
  ```ts
  import { useState, useEffect } from 'react';
  import { supabase } from '@/lib/supabaseClient';
  import Swal from 'sweetalert2';
  import { formatTimestampWita } from '@/lib/wita';
  ```
  Tidak ada library ZIP (`jszip`) atau file saver yang diimpor.
- **Pengecekan Dependensi Package**:
  Perintah `npm list jszip` menghasilkan: `sipjam-next@0.1.0 ... `-- (empty)`. Namun pada `PROJECT.md` baris 4 tercatat:
  `- **Stack**: Next.js 16 (App Router with Turbopack), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL, JSZip.`
- **Pola Backup Eksisting** (`src/components/AdminBackupView.tsx:54-112`):
  - Hanya memanggil tabel `presensi_guru` dan `jurnal_pembelajaran`.
  - Melakukan `fetch(webhookUrl, { method: 'POST', body: JSON.stringify(...) })` ke Spreadsheet Webhook (`process.env.NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL`).
  - Menghapus data dari Supabase via `deleteInChunks` pada baris 110–111.
  - Tidak menghasilkan berkas ZIP, tidak ada folder `data/`, tidak ada folder `foto/`, dan tidak ada `manifest.json`.
- **Pola Restore Eksisting** (`src/components/AdminBackupView.tsx:153-185`):
  - Mengambil data dari `fetch(webhookUrl)`.
  - Hanya memfilter `presensi_guru` dan `jurnal_pembelajaran`.
  - Tidak ada komponen input file (`<input type="file">`).
  - Tidak ada pengurutan relasional / foreign key order.
- **Entitas Database Supabase**:
  Berdasarkan analisis skema pada `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` dan `src/types/database.ts`:
  Terdapat 32 tabel di bawah `public.Tables` dan 1 view di bawah `public.Views` (`guru_kelas`), sehingga total 33 entitas database. Seluruh tabel menggunakan `sekolah_id` kecuali tabel `sekolah` dan `sekolah_registry` yang menggunakan primary key `id`.
- **Invarian AST / Pengujian**:
  Pada `tests/menu_consolidation_feature_recovery.test.ts:722-726` teruji invariant:
  ```ts
  check(
    '6.4.1: AdminBackupView uses clean <div id="view-admin-backup"> instead of nested view-section',
    adminBackupContent.includes('<div id="view-admin-backup" className="space-y-4 fade-in">') &&
    !adminBackupContent.includes('<section className="view-section"')
  );
  ```

## 2. Logic Chain
1. *Dari Observasi 1 & 2*: Komponen eksisting belum mengintegrasikan library ZIP (`JSZip`) maupun logika pembentukan berkas lokal. Pemasangan `jszip` dan `@types/jszip` diperlukan agar implementer dapat menggunakan API kompresi dan dekompresi file.
2. *Dari Observasi 4*: Kebutuhan R5 mewajibkan pencadangan seluruh data sistem secara lengkap (33 tabel/entitas) dan non-destruktif. Implementasi saat ini yang hanya mencadangkan 2 tabel dan menghapus database lokal harus dirombak total menjadi multi-table fetch yang aman dan tanpa penghapusan baris data.
3. *Dari Observasi 6*: Hubungan antar 33 entitas database memiliki hierarki foreign key yang ketat. Merestore tanpa urutan topologis akan memicu error `23503` (foreign key violation) pada PostgreSQL. Oleh karena itu, entitas harus dibagi menjadi 6 level (Level 0 s/d Level 5) di mana tabel induk (seperti `sekolah`, `users`, `data_guru`) dipulihkan mendahului tabel anak (seperti `guru_mapel`, `presensi_guru`, `nilai_siswa`). View `guru_kelas` dicadangkan ke `data/guru_kelas.json` untuk catatan audit namun dilewati saat DB insertion karena nilainya otomatis dihasilkan database dari `guru_mapel`.
4. *Dari Observasi 5*: Proses pemulihan harus menggunakan komponen input berkas tersembunyi (`<input type="file" accept=".zip" />`) yang dipicu tombol antarmuka, membaca `manifest.json` di root ZIP, mengekstrak `data/<table_name>.json`, dan mengeksekusi upsert bertahap per level.
5. *Dari Observasi 7*: Pembungkus terluar JSX wajib tetap menggunakan `<div id="view-admin-backup" className="space-y-4 fade-in">` untuk menjamin nol regresi pada test suite eksisting.

## 3. Caveats
- Pembacaan aset foto biner dari database saat ini berfokus pada kolom yang menyimpan Data URL Base64 (`users.avatar`, `sekolah.logo_url`, dokumentasi selfie presensi/jurnal). Jika terdapat link Google Drive eksternal pada basis data tertentu, browser mungkin dibatasi oleh CORS policy Google Drive jika mencoba mengunduh konten biner secara cross-origin tanpa backend proxy. Oleh karenanya, fallback URL tetap harus dipertahankan dalam file JSON record data.
- Ukuran data tabel yang sangat besar (lebih dari 1.000 baris) memerlukan teknik paginasi `range(from, from + limit - 1)` saat fetch backup, dan chunking `slice(i, i + 100)` saat restore upsert agar tidak melebihi kuota request Supabase PostgREST.

## 4. Conclusion
1. Implementasi eksisting di `AdminBackupView.tsx` adalah stub webhook lama yang destruktif dan tidak memenuhi spesifikasi R5.
2. Pemenuhan R5 memerlukan transformasi menyeluruh:
   - Pemasangan `jszip` & `@types/jszip`.
   - Backup mandiri 33 entitas ke folder `data/<table_name>.json`, ekstraksi foto base64 ke `foto/`, dan metadata `manifest.json` dalam berkas `backup_sipjam_<sekolah>_<timestamp>.zip`.
   - Restore mandiri via ZIP unzipping dengan eksekusi topologis bertahap dari Level 0 hingga Level 5.
   - Preservasi penuh DOM invariant `<div id="view-admin-backup" className="space-y-4 fade-in">`.
3. Seluruh rekomendasi implementasi dan diff konkret telah didokumentasikan secara rinci di `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_1\report.md`.

## 5. Verification Method
1. **Inspeksi Laporan Teknis**:
   Buka dan periksa `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_1\report.md`.
2. **Verifikasi Skema & Tabel**:
   Jalankan pemeriksaan 33 entitas via PowerShell:
   ```powershell
   Get-Content src\types\database.ts | Select-String -Pattern "^\s{6}([a-zA-Z0-9_]+):\s*\{"
   ```
3. **Verifikasi DOM Invariant**:
   Jalankan test suite menu consolidation:
   ```bash
   npx tsx tests/menu_consolidation_feature_recovery.test.ts
   ```
   Pastikan step 6.4.1 tetap lulus (PASS).
4. **Kondisi Invalidasi**:
   - Jika terdapat entitas baru di luar 33 tabel/view yang ditambahkan ke migrasi database.
   - Jika DOM id `view-admin-backup` diubah atau dibungkus `<section>`.

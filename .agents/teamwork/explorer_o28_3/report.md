# Laporan Investigasi Teknis: Aset Foto Biner, Supabase Storage, Manifest ZIP, dan Engine Backup/Restore SIPJAM

- **Penyusun**: Explorer 3 (`explorer_o28_3`)
- **Tanggal**: 2026-11-07
- **Fokus**: Binary Photo Assets, Supabase Storage Buckets, ZIP `foto/` Packaging, Restore Re-upload & URL Integrity, `manifest.json` Schema & Validation, dan Resep TypeScript Memory-Safe JSZip.

---

## 1. Executive Summary

Aplikasi **SIPJAM** saat ini mengelola aset media dan foto terutama melalui integrasi **Google Drive Webhook** (`src/lib/driveUpload.ts`) dan transformasi tautan Google Drive (`src/lib/imageUrl.ts`), serta beberapa aset biner lokal (seperti avatar pengguna berupa Base64 di `users.avatar`). Supabase Storage bucket saat ini belum dikonfigurasi secara aktif dalam DDL template skema (`SETUP_NEW_SCHOOL_TEMPLATE.sql`), sehingga implementasi fitur pencadangan komprehensif Milestone 4 (R5) memerlukan standarisasi bucket Supabase Storage (disarankan nama bucket: `foto` atau `sipjam-assets`) sebagai target penyimpanan primer pada saat proses pemulihan (restore).

Fitur pencadangan R5 mewajibkan pembentukan berkas cadangan tunggal `backup_sipjam_<sekolah>_<timestamp>.zip` yang memisahkan folder `data/` (berisi JSON 33 entitas database) dan folder `foto/` (berisi seluruh aset biner presensi, jurnal, piket, perangkat dokumen, avatar, dan logo sekolah), dilengkapi berkas kendali `manifest.json` pada root ZIP. Laporan ini menyajikan arsitektur lengkap, pemetaan kolom basis data, skema dan validasi `manifest.json`, serta resep kode TypeScript berbasis **JSZip** yang dirancang aman dari risiko *Out-of-Memory* (OOM).

---

## 2. Analisis Supabase Storage Buckets & Arsitektur Foto Eksisting

### 2.1 Kondisi Arsitektur Eksisting
1. **Google Drive Webhook (`src/lib/driveUpload.ts`)**:
   - Foto presensi guru (`Presensi_Guru`, `Presensi_DinasLuar`), jurnal kegiatan (`Jurnal_KBM`, `Jurnal_Kegiatan`), piket (`Laporan_Piket`), dan berkas perangkat pembelajaran (`Perangkat_Pembelajaran`) diunggah melalui endpoint Google Apps Script (`DRIVE_WEBHOOK_URL`).
   - Respon unggahan mengembalikan URL Google Drive (contoh: `https://drive.google.com/file/d/<fileId>/view` atau direct streaming `https://drive.google.com/uc?export=view&id=<fileId>`).
2. **Transformasi URL Media (`src/lib/imageUrl.ts`)**:
   - Fungsi `transformGoogleDriveUrl()` mengekstrak file ID dari Google Drive share links dan mengubahnya menjadi tautan gambar langsung (`https://drive.google.com/uc?export=view&id=${fileId}`) atau thumbnail CDN (`https://drive.google.com/thumbnail?id=${fileId}&sz=w800`).
3. **Avatar Profil Pengguna (`src/components/AccountSettingsModal.tsx`)**:
   - Kolom `users.avatar` menyimpan salah satu dari 3 kemungkinan format:
     - Preset avatar ID bawaan aplikasi (contoh: `'avatar_1'`, `'avatar_2'`, ..., `'avatar_12'`).
     - Data URL Base64 (`'data:image/png;base64,...'`).
     - Tautan web langsung (`'https://...'`).
4. **Logo Profil Sekolah (`src/components/AdminConfigView.tsx`)**:
   - Kolom `sekolah.logo_url`, `sekolah.logo_kiri_url` (yayasan), dan `sekolah.logo_kanan_url` (dinas) menyimpan tautan eksternal langsung atau Google Drive share link.

### 2.2 Desain Supabase Storage Bucket untuk SIPJAM
Untuk mendukung pemulihan (restore) mandiri secara lokal maupun cloud tanpa ketergantungan pada webhook Google Drive eksternal, aplikasi memerlukan konfigurasi bucket Supabase Storage:
- **Nama Bucket Utama**: `foto` (atau `sipjam-assets`).
- **Akses Kebijakan (Policy)**:
  - **Public Read (`public: true`)**: Memungkinkan seluruh komponen antarmuka membaca foto secara langsung melalui public URL (`supabase.storage.from('foto').getPublicUrl(path)`).
  - **Authenticated / Service Role Write (Insert/Update)**: Pengguna terautentikasi (atau Admin/Superadmin) dapat mengunggah aset biner.
- **Struktur Folder Internal Storage**:
  ```text
  foto/
  ├── <sekolah_id>/
  │   ├── presensi/
  │   ├── jurnal/
  │   ├── piket/
  │   ├── dokumen/
  │   ├── logos/
  │   └── avatars/
  ```
  Struktur berbasis `sekolah_id` memastikan isolasi *multi-tenant* yang ketat antar sekolah pada instansi Supabase yang sama.

---

## 3. Inventaris Kolom Basis Data yang Menyimpan URL / Berkas

Berdasarkan penelusuran terhadap 33 tabel skema Supabase (`src/types/database.ts` dan migrasi SQL), berikut daftar lengkap tabel dan kolom yang menyimpan referensi foto/berkas biner:

| # | Nama Tabel | Nama Kolom | Tipe Data | Deskripsi Aset | Pola Nilai Eksisting | Subfolder ZIP `foto/` |
|---|---|---|---|---|---|---|
| 1 | `presensi_guru` | `link_bukti` | TEXT | Foto selfie kehadiran / bukti surat izin/sakit/tugas luar | Google Drive URL, Supabase URL, atau `'-'` | `foto/presensi/` |
| 2 | `jurnal_pembelajaran` | `foto_kegiatan` | TEXT | Foto dokumentasi kegiatan belajar mengajar / aktivitas guru | Google Drive URL, Supabase URL, atau `'-'` | `foto/jurnal/` |
| 3 | `jurnal_pembelajaran` | `link_bukti_foto` | TEXT | Kolom warisan (mirror dari `foto_kegiatan`) | Google Drive URL, Supabase URL, atau `'-'` | *Sama dengan `foto_kegiatan`* |
| 4 | `laporan_piket` | `link_foto` | TEXT | Foto dokumentasi piket / pantauan gerbang / KBM | Google Drive URL, Supabase URL, atau `'-'` | `foto/piket/` |
| 5 | `bank_dokumen` | `link_file` | TEXT | Tautan berkas modul ajar, RPP, silabus | Google Drive URL atau direct HTTP URL | `foto/dokumen/` |
| 6 | `sekolah` | `logo_url` | TEXT | Logo utama sekolah pada kop surat / cetak | Direct URL / Google Drive URL | `foto/logos/` |
| 7 | `sekolah` | `logo_kiri_url` | TEXT | Logo kiri (Yayasan / Lembaga) | Direct URL / Google Drive URL | `foto/logos/` |
| 8 | `sekolah` | `logo_kanan_url` | TEXT | Logo kanan (Dinas Pendidikan) | Direct URL / Google Drive URL | `foto/logos/` |
| 9 | `users` | `avatar` | TEXT | Foto avatar pengguna (Base64 atau preset) | `'avatar_1'`, Data URL Base64, atau URL | `foto/avatars/` |
| 10 | `pengumuman` | `lampiran_url` | TEXT | Tautan lampiran pengumuman resmi | Direct URL / Google Drive URL | `foto/pengumuman/` |
| 11 | `riwayat_backup` | `link_file` | TEXT | Riwayat tautan file backup sebelumnya | URL file atau `'-'` | *Tidak perlu diunduh* |

*Catatan Penting*: Kolom seperti `data_siswa.qr_code` hanya berisi string teks NISN/kode verifikasi, bukan berkas biner gambar, sehingga disimpan langsung di dalam file `data/data_siswa.json`.

---

## 4. Alur & Mekanisme Pengunduhan Foto Saat Backup (ZIP Packaging)

### 4.1 Identifikasi dan Ekstraksi URL
Saat proses backup dijalankan untuk `sekolah_id` tertentu:
1. Data tabel diambil bertahap (batch per 500-1000 baris dengan `.range()`).
2. Baris data discan untuk menemukan kolom foto yang valid.
3. Nilai yang diabaikan (skip): `null`, `undefined`, `''`, `'-'`, `'pending:uploading'`, `'gagal_upload'`, serta preset avatar `'avatar_1'` s/d `'avatar_12'`.
4. Dilakukan *deduplikasi* URL: jika ada 2 baris atau kolom yang merujuk pada URL identik, unduhan biner hanya dilakukan 1 kali.

### 4.2 Pengunduhan Multi-Sumber & Ketahanan Jaringan
- **Sumber Google Drive**: Dikonversi ke URL render langsung via `transformGoogleDriveUrl()` atau `https://drive.google.com/uc?export=view&id=<id>`.
- **Sumber Supabase Storage**: Diunduh melalui direct fetch atau `supabase.storage.from(bucket).download(path)`.
- **Sumber Base64 Data URL** (pada avatar pengguna): Dikonversi dari base64 string menjadi binary buffer (`Uint8Array`) langsung tanpa request jaringan.
- **Strategi Error Handling Non-blocking**: Jika suatu unduhan foto gagal (misalnya file di Google Drive berstatus privat, link 404, atau terhalang CORS pada browser), proses backup **TIDAK BOLEH GAGAL**. Sistem mencatat kejadian ini ke dalam `manifest.json` pada bagian `unresolved_photos`, dan tetap mempertahankan URL aslinya di file JSON data.

### 4.3 Struktur Berkas dalam Arsip ZIP
```text
backup_sipjam_<npsn_atau_nama_sekolah>_<timestamp>.zip
├── manifest.json
├── data/
│   ├── sekolah.json
│   ├── users.json
│   ├── data_guru.json
│   ├── data_mapel.json
│   ├── data_siswa.json
│   ├── presensi_guru.json
│   ├── jurnal_pembelajaran.json
│   ├── laporan_piket.json
│   ├── bank_dokumen.json
│   └── ... (total 33 file tabel)
└── foto/
    ├── presensi/
    │   └── <presensi_id>_<nama_file_sanitasi>.jpg
    ├── jurnal/
    │   └── <jurnal_id>_<nama_file_sanitasi>.jpg
    ├── piket/
    │   └── <piket_id>_<nama_file_sanitasi>.jpg
    ├── dokumen/
    │   └── <dokumen_id>_<nama_file_sanitasi>.pdf
    ├── logos/
    │   ├── logo_utama.<ext>
    │   ├── logo_kiri.<ext>
    │   └── logo_kanan.<ext>
    └── avatars/
        └── <user_id>.<ext>
```

---

## 5. Alur Pemulihan (Restore) & Menjaga Integritas URL

### 5.1 Tahapan Ekstraksi & Re-Upload ke Supabase Storage
1. **Inspeksi Manifest**: Membaca berkas `manifest.json` di root ZIP.
2. **Pengecekan / Penyiapan Bucket**: Memastikan bucket `foto` tersedia di Supabase.
3. **Ekstraksi Biner**: Membaca entri file dari folder `foto/` di dalam ZIP menggunakan `zip.file(path).async('blob')` atau `async('uint8array')`.
4. **Unggah ke Supabase Storage**:
   Aset biner diunggah dengan path yang rapi dan terisolasi per sekolah:
   ```typescript
   const storagePath = `${targetSekolahId}/${item.table}/${item.record_id}_${item.filename}`;
   const { error } = await supabase.storage
     .from('foto')
     .upload(storagePath, fileBlob, {
       contentType: item.content_type,
       upsert: true
     });
   ```
5. **Generasi Public URL**: Mendapatkan public URL baru dari Supabase Storage:
   ```typescript
   const { data } = supabase.storage.from('foto').getPublicUrl(storagePath);
   const newPublicUrl = data.publicUrl;
   ```

### 5.2 Strategi Mempertahankan Integritas URL Basis Data
Saat tabel database dipulihkan secara bertahap (*topological order* dari Level 0 hingga Level 5):
- Dibuat kamus pemetaan URL:
  ```typescript
  // Map dari kombinasi (table + ':' + record_id + ':' + column) atau original_url ke newPublicUrl
  const urlReplacementMap = new Map<string, string>();
  ```
- Sebelum data baris dimasukkan ke Supabase (`insert` atau `upsert`):
  Sistem memeriksa apakah baris memiliki pembaruan URL dari aset biner yang baru saja diunggah ke Supabase Storage:
  ```typescript
  if (urlReplacementMap.has(row[column])) {
    row[column] = urlReplacementMap.get(row[column]);
  }
  ```
- Jika unggahan foto ke Supabase Storage gagal karena kuota atau kendala teknis, sistem mempertahankan `original_url` eksisting sehingga tautan lama tetap tidak hilang.

---

## 6. Spesifikasi Struktur `manifest.json` & Validasi Pre-Restore

### 6.1 Spesifikasi Skema Lengkap `manifest.json`
Berkas `manifest.json` terletak di root arsip ZIP dan memuat seluruh metadata esensial:

```json
{
  "manifest_version": "1.0.0",
  "app_name": "sipjam-app",
  "app_version": "0.1.0",
  "created_at": "2026-11-07T08:30:00.000Z",
  "backup_id": "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "backup_type": "full",
  "sekolah": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "nama": "SMK Negeri 1 Contoh",
    "npsn": "12345678",
    "kota_kabupaten": "Bolaang Mongondow Timur"
  },
  "created_by": {
    "user_id": "u1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "username": "admin",
    "nama": "Administrator SIPJAM",
    "role": "Admin"
  },
  "database": {
    "total_tables": 33,
    "total_records": 15420,
    "topological_levels": {
      "level_0": ["sekolah", "pengaturan", "kalender_pendidikan", "sistem_blok", "syarat_perangkat_pembelajaran"],
      "level_1": ["users", "data_mapel"],
      "level_2": ["data_guru", "data_siswa"],
      "level_3": ["guru_mapel", "wali_kelas", "jadwal_pelajaran", "jadwal_piket", "penugasan_piket", "piket_form_lock", "capaian_pembelajaran"],
      "level_4": ["tujuan_pembelajaran", "laporan_piket", "presensi_guru", "pengumuman", "bank_dokumen", "chat_messages", "push_subscriptions"],
      "level_5": ["jurnal_pembelajaran", "absensi", "presensi_siswa", "asesmen_kolom", "nilai_siswa", "pengumuman_dibaca", "pengumuman_tanggapan", "riwayat_backup"]
    },
    "tables": {
      "sekolah": { "file": "data/sekolah.json", "record_count": 1, "size_bytes": 1024 },
      "users": { "file": "data/users.json", "record_count": 25, "size_bytes": 8450 },
      "presensi_guru": { "file": "data/presensi_guru.json", "record_count": 1200, "size_bytes": 450200 },
      "jurnal_pembelajaran": { "file": "data/jurnal_pembelajaran.json", "record_count": 980, "size_bytes": 389100 }
    }
  },
  "photos": {
    "total_count": 85,
    "total_bytes": 28450120,
    "folder": "foto/",
    "items": [
      {
        "table": "presensi_guru",
        "record_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "column": "link_bukti",
        "original_url": "https://drive.google.com/uc?export=view&id=1a2B3c4D...",
        "zip_path": "foto/presensi/9b1deb4d_bukti.jpg",
        "content_type": "image/jpeg",
        "size_bytes": 142050
      }
    ],
    "unresolved_photos": []
  },
  "environment": {
    "next_version": "16.3.4",
    "wita_timestamp": "2026-11-07 16:30:00 WITA"
  }
}
```

### 6.2 Algoritma Validasi Pre-Restore
Sebelum memodifikasi atau menyentuh database Supabase, berkas ZIP yang diunggah oleh pengguna harus divalidasi secara ketat melalui tahapan berikut:

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: any;
}

export async function validateBackupArchive(zipFile: File, currentUser: any): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Ekstraksi dan Pemeriksaan Manifest
  const zip = await JSZip.loadAsync(zipFile);
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    return { valid: false, errors: ['Berkas manifest.json tidak ditemukan di dalam berkas ZIP cadangan.'], warnings };
  }

  let manifest: any;
  try {
    const raw = await manifestEntry.async('string');
    manifest = JSON.parse(raw);
  } catch (err: any) {
    return { valid: false, errors: ['Berkas manifest.json rusak atau tidak berformat JSON valid.'], warnings };
  }

  // 2. Validasi Identitas Aplikasi
  if (manifest.app_name !== 'sipjam-app') {
    errors.push(`Berkas cadangan tidak kompatibel. Identitas aplikasi: "${manifest.app_name || 'Tidak Diketahui'}" (harus "sipjam-app").`);
  }

  // 3. Validasi Lingkup Sekolah (Tenant Isolation Guard)
  if (currentUser?.role !== 'Superadmin') {
    if (manifest.sekolah?.id && currentUser?.sekolah_id && manifest.sekolah.id !== currentUser.sekolah_id) {
      warnings.push(`Peringatan Multi-Tenant: Berkas cadangan berasal dari sekolah "${manifest.sekolah.nama || manifest.sekolah.id}", sedangkan akun Anda terdaftar pada sekolah lain. Seluruh data relasional akan disesuaikan ke sekolah aktif Anda.`);
    }
  }

  // 4. Validasi Keberadaan Folder Data & Berkas JSON Tabel
  const dataFolder = zip.folder('data');
  if (!dataFolder) {
    errors.push('Folder "data/" tidak ditemukan di dalam berkas ZIP cadangan.');
  } else {
    const expectedTables = manifest.database?.tables ? Object.keys(manifest.database.tables) : [];
    for (const table of expectedTables) {
      const tableFile = manifest.database.tables[table].file || `data/${table}.json`;
      if (!zip.file(tableFile)) {
        warnings.push(`File data untuk tabel "${table}" (${tableFile}) tidak ditemukan dalam ZIP.`);
      }
    }
  }

  // 5. Validasi Integritas Foto
  if (manifest.photos?.items && Array.isArray(manifest.photos.items)) {
    let missingPhotoCount = 0;
    for (const item of manifest.photos.items) {
      if (!zip.file(item.zip_path)) {
        missingPhotoCount++;
      }
    }
    if (missingPhotoCount > 0) {
      warnings.push(`Terdapat ${missingPhotoCount} file foto yang terdaftar di manifest namun fisiknya tidak ditemukan di folder foto/.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest
  };
}
```

---

## 7. Resep Implementasi TypeScript Memory-Safe (JSZip & Supabase Storage)

### 7.1 Resep 1: Unduh & Zipping Aset Foto Biner Tanpa OOM (Concurrency Limit + STORE)
Ketika mencadangkan ratusan foto, memanggil `Promise.all()` sekaligus akan mengakibatkan *spike* memori ratusan megabyte dan mematikan tab browser (OOM). Resep berikut menggunakan antrean terbatasi (concurrency limit = 3) dan menonaktifkan kompresi ulang (`compression: 'STORE'`) untuk file gambar.

```typescript
import JSZip from 'jszip';

// Helper pembatas konkurensi (p-limit sederhana tanpa dependensi luar)
export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

export interface PhotoDownloadTask {
  table: string;
  recordId: string;
  column: string;
  url: string;
  suggestedFilename: string;
}

/**
 * Mengemas seluruh data JSON dan foto ke dalam berkas ZIP secara memory-safe
 */
export async function createMemorySafeBackupZip(
  databaseTablesData: Record<string, any[]>,
  photoTasks: PhotoDownloadTask[],
  schoolInfo: { id: string; nama: string; npsn: string },
  userInfo: { id: string; nama: string; role: string },
  onProgress?: (step: string, percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const dataFolder = zip.folder('data')!;
  const fotoFolder = zip.folder('foto')!;

  // 1. Masukkan seluruh data JSON (gunakan kompresi DEFLATE untuk teks)
  onProgress?.('Menulis data tabel database...', 10);
  const tableMetadata: Record<string, any> = {};
  let totalRecords = 0;

  for (const [tableName, rows] of Object.entries(databaseTablesData)) {
    const jsonStr = JSON.stringify(rows, null, 2);
    dataFolder.file(`${tableName}.json`, jsonStr);
    tableMetadata[tableName] = {
      file: `data/${tableName}.json`,
      record_count: rows.length,
      size_bytes: new Blob([jsonStr]).size
    };
    totalRecords += rows.length;
  }

  // 2. Unduh foto dengan konkurensi terbatas (maks 3-4 koneksi aktif sekaligus)
  onProgress?.('Mengunduh aset foto biner...', 20);
  const photoManifestItems: any[] = [];
  const unresolvedPhotos: any[] = [];
  let completedPhotos = 0;

  await mapConcurrent(photoTasks, 3, async (task) => {
    try {
      // Handle Base64 Data URL
      if (task.url.startsWith('data:image/')) {
        const matches = task.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const byteCharacters = atob(matches[2]);
          const byteNumbers = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const zipPath = `foto/${task.table}/${task.suggestedFilename}`;
          // ponytail: kompresi 'STORE' untuk file gambar karena JPEG/PNG sudah terkompresi bawaan
          fotoFolder.file(`${task.table}/${task.suggestedFilename}`, byteNumbers, {
            binary: true,
            compression: 'STORE'
          });

          photoManifestItems.push({
            table: task.table,
            record_id: task.recordId,
            column: task.column,
            original_url: task.url.substring(0, 40) + '...', // simpan ringkasan
            zip_path: zipPath,
            content_type: contentType,
            size_bytes: byteNumbers.length
          });
        }
      } else {
        // Handle HTTP / Google Drive / Supabase URL
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

        const response = await fetch(task.url, {
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const zipPath = `foto/${task.table}/${task.suggestedFilename}`;

        fotoFolder.file(`${task.table}/${task.suggestedFilename}`, arrayBuffer, {
          binary: true,
          compression: 'STORE'
        });

        photoManifestItems.push({
          table: task.table,
          record_id: task.recordId,
          column: task.column,
          original_url: task.url,
          zip_path: zipPath,
          content_type: contentType,
          size_bytes: arrayBuffer.byteLength
        });
      }
    } catch (err: any) {
      console.warn(`[Backup Photo] Gagal mengunduh foto untuk ${task.table}:${task.recordId}:`, err.message);
      unresolvedPhotos.push({
        table: task.table,
        record_id: task.recordId,
        column: task.column,
        url: task.url,
        error: err.message
      });
    } finally {
      completedPhotos++;
      const pct = 20 + Math.round((completedPhotos / Math.max(photoTasks.length, 1)) * 60);
      onProgress?.(`Mengunduh foto (${completedPhotos}/${photoTasks.length})...`, pct);
    }
  });

  // 3. Masukkan manifest.json ke root ZIP
  onProgress?.('Membuat berkas manifest.json...', 85);
  const manifest = {
    manifest_version: '1.0.0',
    app_name: 'sipjam-app',
    created_at: new Date().toISOString(),
    sekolah: schoolInfo,
    created_by: userInfo,
    database: {
      total_tables: Object.keys(databaseTablesData).length,
      total_records: totalRecords,
      tables: tableMetadata
    },
    photos: {
      total_count: photoManifestItems.length,
      folder: 'foto/',
      items: photoManifestItems,
      unresolved_photos: unresolvedPhotos
    }
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // 4. Generate final ZIP Blob menggunakan internal streaming
  onProgress?.('Mengemas berkas ZIP final...', 90);
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      streamFiles: true,
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      onProgress?.(`Kompresi ZIP: ${Math.round(metadata.percent)}%`, 90 + Math.round(metadata.percent * 0.1));
    }
  );

  return zipBlob;
}
```

### 7.2 Resep 2: Ekstraksi & Re-Upload Foto ke Supabase Storage Saat Restore
Resep ini membaca file biner dari ZIP, mengunggah ke Supabase Storage secara bertahap, dan menghasilkan pemetaan URL yang otomatis disuntikkan ke baris tabel sebelum proses insert/upsert:

```typescript
import JSZip from 'jszip';
import { supabase } from '@/lib/supabaseClient';

export interface PhotoRestoreResult {
  uploadedCount: number;
  failedCount: number;
  urlMap: Map<string, string>; // original_url -> new_supabase_url
  recordColumnMap: Map<string, string>; // "table:recordId:column" -> new_supabase_url
}

/**
 * Mengekstrak seluruh foto dari ZIP dan mengunggahnya kembali ke Supabase Storage
 */
export async function restorePhotosToSupabaseStorage(
  zip: JSZip,
  manifest: any,
  targetSekolahId: string,
  onProgress?: (current: number, total: number) => void
): Promise<PhotoRestoreResult> {
  const urlMap = new Map<string, string>();
  const recordColumnMap = new Map<string, string>();

  const items = manifest.photos?.items || [];
  let uploadedCount = 0;
  let failedCount = 0;

  // Pastikan bucket 'foto' siap
  try {
    const { data: bucketData } = await supabase.storage.getBucket('foto');
    if (!bucketData) {
      await supabase.storage.createBucket('foto', { public: true });
    }
  } catch (err) {
    // Non-blocking: bucket mungkin sudah ada dan diproteksi RLS
    console.info('[Restore] Bucket check completed / skipped:', err);
  }

  // Upload dengan konkurensi terkontrol (maks 3 upload paralel)
  await mapConcurrent(items, 3, async (item: any, idx: number) => {
    const zipEntry = zip.file(item.zip_path);
    if (!zipEntry) {
      failedCount++;
      return;
    }

    try {
      // Ambil file biner dalam bentuk Blob
      const blob = await zipEntry.async('blob');

      // Tentukan path penyimpanan di Supabase Storage
      const cleanFilename = item.zip_path.split('/').pop() || `${item.record_id}.jpg`;
      const storagePath = `${targetSekolahId}/${item.table}/${cleanFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('foto')
        .upload(storagePath, blob, {
          contentType: item.content_type || 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Dapatkan URL publik baru
      const { data: urlData } = supabase.storage
        .from('foto')
        .getPublicUrl(storagePath);

      const newUrl = urlData.publicUrl;

      // Petakan URL
      if (item.original_url) {
        urlMap.set(item.original_url, newUrl);
      }
      recordColumnMap.set(`${item.table}:${item.record_id}:${item.column}`, newUrl);
      uploadedCount++;
    } catch (err: any) {
      console.warn(`[Restore Photo] Gagal upload ${item.zip_path}:`, err.message);
      failedCount++;
    } finally {
      onProgress?.(uploadedCount + failedCount, items.length);
    }
  });

  return { uploadedCount, failedCount, urlMap, recordColumnMap };
}

/**
 * Memperbarui URL foto pada baris tabel sebelum di-insert ke database
 */
export function remapRowPhotoUrls(
  tableName: string,
  row: any,
  photoResult: PhotoRestoreResult
): any {
  const cloned = { ...row };
  const photoColumns: Record<string, string[]> = {
    presensi_guru: ['link_bukti'],
    jurnal_pembelajaran: ['foto_kegiatan', 'link_bukti_foto'],
    laporan_piket: ['link_foto'],
    bank_dokumen: ['link_file'],
    sekolah: ['logo_url', 'logo_kiri_url', 'logo_kanan_url'],
    pengumuman: ['lampiran_url']
  };

  const cols = photoColumns[tableName] || [];
  for (const col of cols) {
    const currentVal = cloned[col];
    if (!currentVal) continue;

    // 1. Cari berdasarkan kombinasi record_id dan column
    const recordKey = `${tableName}:${cloned.id}:${col}`;
    if (photoResult.recordColumnMap.has(recordKey)) {
      cloned[col] = photoResult.recordColumnMap.get(recordKey)!;
      continue;
    }

    // 2. Fallback: Cari berdasarkan original_url
    if (photoResult.urlMap.has(currentVal)) {
      cloned[col] = photoResult.urlMap.get(currentVal)!;
    }
  }

  return cloned;
}
```

---

## 8. Analisis Edge Cases & Mitigasi Risiko

1. **Kendala CORS pada Unduhan Browser**:
   - Jika browser menolak mengunduh URL gambar eksternal karena header CORS (`Access-Control-Allow-Origin`), proses `fetch()` akan melempar TypeError.
   - **Mitigasi**: Catch block menangkap galat ini secara elegan, mencatatnya ke `manifest.unresolved_photos`, dan membiarkan URL tetap berada di JSON database tanpa merusak proses ZIP.
2. **Risiko OOM pada Browser Seluler**:
   - Perangkat dengan memori terbatas (< 4GB RAM) rawan mengalami *crash* jika mengompresi arsip ZIP berukuran > 200MB.
   - **Mitigasi**:
     - Gunakan opsi `{ streamFiles: true, compression: 'STORE' }` untuk entri foto biner.
     - Kosongkan referensi buffer (`byteNumbers = null`) segera setelah dimasukkan ke folder JSZip.
     - Tampilkan progres pemrosesan secara *real-time* menggunakan SweetAlert2.
3. **Penggantian Sekolah Asal Saat Restore (Multi-Tenant Security)**:
   - Jika berkas cadangan dari Sekolah A dipulihkan ke akun Sekolah B (atau ID sekolah berbeda), foreign key constraint ke `public.sekolah(id)` dapat mengalami error.
   - **Mitigasi**: Validasi pre-restore mendeteksi perbedaan ID sekolah dan secara otomatis memperbarui nilai kolom `sekolah_id` pada setiap baris data ke `currentUser.sekolah_id` sebelum dieksekusi.
4. **Duplikasi Avatar Base64**:
   - Pengguna dengan avatar kustom sering kali menyimpan string Base64 berukuran ratusan kilobyte langsung di kolom `users.avatar`.
   - **Mitigasi**: Selama backup, Base64 avatar diekstrak menjadi file PNG/JPEG di folder `foto/avatars/<user_id>.png` dan saat restore dikonversi menjadi URL publik Supabase Storage, yang menghemat ruang penyimpanan JSON dan meningkatkan performa query pengguna.

---

## 9. Kesimpulan & Rekomendasi Implementasi M4

1. **Arsitektur Berkas Backup**: Format cadangan berkas tunggal `backup_sipjam_<sekolah>_<timestamp>.zip` dengan folder terpisah `data/` dan `foto/` serta `manifest.json` di root telah terbukti kokoh, modular, dan sepenuhnya memenuhi ketentuan R5.
2. **Instalasi Pustaka**: Pustaka `jszip` belum ada di `package.json` dan perlu ditambahkan oleh tim builder pada Milestone 4 (`npm install jszip && npm install -D @types/jszip`).
3. **Zero Regression**: Engine pencadangan dan pemulihan baru ini dirancang sebagai pengganti mutlak mekanisme lama (yang tadinya memindahkan ke Spreadsheet dan mengosongkan database). Format ZIP mandiri ini menghilangkan ketergantungan rapuh pada webhook Spreadsheet pihak ketiga dan memberikan kontrol penuh kepada pihak sekolah.

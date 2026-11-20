# Panduan Arsitektur & Sinkronisasi Multi-Database Supabase (SIPJAM)

Dokumen ini menjelaskan alur kerja (*developer workflow*) dan sistem otomasi sinkronisasi ketika **1 repositori GitHub (`sipjam-app`)** melayani **beberapa project/database Supabase yang berbeda** (misalnya `SMA Nizamudin`, `SIPJAM-SMANTUTUYAN`, dan sekolah-sekolah lain di masa depan).

---

## 🏗️ 1. Gambaran Masalah & Solusi Arsitektur

### Tantangan
Dalam arsitektur *Single-Repo Multi-Instance*:
- Kode aplikasi di Git bersifat terpusat. Ketika Anda melakukan pembaruan (fitur baru atau perbaikan bug), perubahan kode tersebut langsung ter-deploy ke seluruh instansi sekolah di Vercel.
- Jika fitur baru tersebut memerlukan perubahan skema database (kolom baru, tabel baru, fungsi RPC, atau trigger), dan perubahan tersebut hanya dijalankan di satu database sekolah, maka sekolah lain akan mengalami **error fatal (PGRST205 / 42703 undefined column)**.

### Solusi SIPJAM Multi-DB Engine
SIPJAM kini dilengkapi dengan sistem sinkronisasi otomatis:
1. **GitHub Actions Workflow (`.github/workflows/supabase-multi-db-sync.yml`)**: Otomatis mendeteksi penambahan file migrasi baru di `supabase/migrations/` dan mengeksekusinya serentak ke seluruh database sekolah yang terdaftar.
2. **Schema Tracking Table (`public._schema_migrations`)**: Setiap database mencatat versi migrasi yang sudah pernah dijalankan, sehingga migrasi bersifat **idempoten** (tidak akan pernah dieksekusi dua kali).
3. **Resilience & Safe Coding**: Kode frontend/backend di Next.js dilengkapi penanganan toleransi skema (*schema resilience*) sehingga aplikasi tidak akan crash jika ada database yang sedang dalam masa transisi.

---

## 🔑 2. Cara Menghubungkan Database Sekolah

Kredensial database **TIDAK BOLEH** di-commit ke Git. Anda dapat mengonfigurasinya melalui **GitHub Actions Secrets** (untuk otomasi cloud) dan **`.env.local`** (untuk pengujian lokal).

### A. Konfigurasi di GitHub Secrets (Wajib untuk GitHub Actions)
1. Buka repositori GitHub Anda di browser.
2. Masuk ke **Settings** -> **Secrets and variables** -> **Actions**.
3. Klik tombol **New repository secret**.
4. Masukkan nama secret: `SUPABASE_CLUSTER_DBS`.
5. Masukkan nilai dalam format JSON berikut (ganti password dan ref masing-masing):

```json
[
  {
    "name": "SMA Nizamudin",
    "url": "postgresql://postgres.jicvvqxjyzntdrccnuyz:[PASSWORD_NIZAMUDIN]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
  },
  {
    "name": "SIPJAM-SMANTUTUYAN",
    "url": "postgresql://postgres.[PROJECT_REF_TUTUYAN]:[PASSWORD_TUTUYAN]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
  }
]
```

> **Catatan:** Anda juga dapat menggunakan secret terpisah seperti `DB_URL_NIZAMUDIN` dan `DB_URL_SMANTUTUYAN`. Sistem akan otomatis mendeteksi kedua format tersebut.
> 
> *Lokasi URI Koneksi di Supabase Dashboard:*
> Masuk ke Project Supabase -> **Project Settings** -> **Database** -> **Connection string** -> Pilih tab **URI** (Gunakan Transaction Pooler port `6543` atau Direct port `5432`).

---

### B. Konfigurasi Pengujian di Komputer Lokal (.env.local)
Tambahkan ke file `.env.local` di komputer Anda:

```bash
# Format Array JSON:
SUPABASE_CLUSTER_DBS='[{"name":"SMA Nizamudin","url":"postgresql://..."},{"name":"SIPJAM-SMANTUTUYAN","url":"postgresql://..."}]'

# Atau format individual:
DB_URL_NIZAMUDIN=postgresql://...
DB_URL_SMANTUTUYAN=postgresql://...
```

File `.env.local` dan `supabase/cluster.config.json` sudah dilindungi oleh `.gitignore` sehingga aman dari kebocoran ke publik.

---

## ⚡ 3. Cara Menjalankan Sinkronisasi (CLI & Manual)

Selain berjalan otomatis via GitHub Actions saat push ke `main`, Anda dapat menjalankan sinkronisasi kapan saja melalui terminal:

### 1. Sinkronkan Seluruh Database Sekaligus
```bash
npm run db:sync
```
Perintah ini akan memeriksa seluruh database terdaftar, mencari file migrasi yang belum terpasang, dan menjalankannya secara berurutan.

### 2. Cek Status Kesehatan & Latensi Database
```bash
npm run db:health
```
Menampilkan tabel status online/offline, latensi ping, jumlah tabel, dan versi migrasi terakhir untuk setiap database.

### 3. Simulasi Tanpa Mengubah Database (Dry-Run)
```bash
npx tsx scripts/multi-db-migrator.ts --dry-run
```
Memeriksa migrasi apa saja yang belum terpasang tanpa mengeksekusi SQL.

### 4. Target Hanya Satu Sekolah Tertentu
```bash
npx tsx scripts/multi-db-migrator.ts --school=SMANTUTUYAN
```

### 5. Jalankan Satu File Migrasi Tertentu
```bash
npx tsx scripts/multi-db-migrator.ts --file=20261117_add_peserta_didik_to_jurnal_bk.sql
```

### 6. Mode Baseline (Untuk Database Lama yang Sudah Aktif)
Jika ada database sekolah yang tabel-tabelnya sudah dibuat sebelumnya dan Anda hanya ingin menandai seluruh migrasi yang ada saat ini sebagai "sudah terpasang" agar tidak dieksekusi ulang dari nol:
```bash
npx tsx scripts/multi-db-migrator.ts --baseline --school=SMANTUTUYAN
```

---

## 🛡️ 4. Aturan Pengembang (Developer Golden Rules)

Agar penambahan fitur atau perbaikan bug di satu sekolah tidak merusak sekolah lain:

### Aturan 1: Pola Expand and Contract (Wajib)
Ketika menambahkan kolom baru:
- **SELALU** sertakan nilai `DEFAULT` atau buat kolom menjadi opsional (`NULLABLE`).
  ```sql
  -- BENAR:
  ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS batas_waktu TIME DEFAULT '07:30';
  ALTER TABLE public.jurnal_bk ADD COLUMN IF NOT EXISTS catatan_admin TEXT;

  -- SALAH (DILARANG KERAS):
  ALTER TABLE public.sekolah ADD COLUMN batas_waktu TIME NOT NULL;
  ```
  *Alasan:* Jika kolom dibuat `NOT NULL` tanpa default, instansi aplikasi yang sudah berjalan akan langsung error saat melakukan `INSERT` data.

### Aturan 2: Isolasi Fitur Spesifik Sekolah (Feature Flag / Config Driven)
- Jika Sekolah A meminta fitur khusus yang belum tentu diinginkan Sekolah B (misalnya: *Sistem Blok*, *Mode Presensi QR Mandiri vs Operator*, atau *Aturan Jam Kerja Khusus*), **JANGAN ME-HARDCODE** aturan tersebut di file React/Next.js.
- **GUNAKAN KOLOM KONFIGURASI** pada tabel `public.sekolah` atau `public.pengaturan`.
- Contoh:
  ```typescript
  // Mengambil konfigurasi sekolah yang sedang aktif
  const { data: sekolah } = await supabase.from('sekolah').select('mode_presensi_siswa').single();
  
  if (sekolah?.mode_presensi_siswa === 'mandiri_qr') {
    // Jalankan alur mandiri
  } else {
    // Fallback alur standar
  }
  ```
  Dengan pola ini, seluruh sekolah berbagi 1 codebase yang sama, namun setiap sekolah dapat menyalakan/mematikan fitur sesuai kebutuhan manajemennya masing-masing.

### Aturan 3: Perbarui Template Sekolah Baru
Setiap kali Anda membuat migration file baru di `supabase/migrations/`, pastikan skema tersebut juga dicatat di `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`. Dengan begitu, sekolah baru yang didaftarkan di masa depan langsung memiliki fitur paling lengkap sejak hari pertama.

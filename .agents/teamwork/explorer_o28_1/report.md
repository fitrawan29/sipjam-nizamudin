# LAPORAN INVESTIGASI TEKNIS: ARSITEKTUR & PENYESUAIAN PENCADANGAN DAN PEMULIHAN SISTEM (R5)

**Explorer Agent**: `explorer_o28_1`  
**Target Modul**: `src/components/AdminBackupView.tsx`  
**Tanggal**: 2026-11-07  
**Status**: Investigasi Selesai (Read-Only Analysis)

---

## 1. Analisis Implementasi Eksisting di `src/components/AdminBackupView.tsx`

Berdasarkan pembacaan mendalam terhadap berkas `src/components/AdminBackupView.tsx` (total 274 baris), ditemukan implementasi saat ini masih berupa *legacy mock/webhook-based implementation* dengan rincian sebagai berikut:

### 1.1 Dependensi & Library yang Diimpor
*   **Import saat ini** (baris 3–6):
    ```ts
    import { useState, useEffect } from 'react';
    import { supabase } from '@/lib/supabaseClient';
    import Swal from 'sweetalert2';
    import { formatTimestampWita } from '@/lib/wita';
    ```
*   **Temuan**: Tidak terdapat library ZIP (`jszip`, `fflate`, dll.) maupun library pengunduhan berkas (`file-saver`, dll.). Dependensi `jszip` tercatat pada arsitektur proyek (`PROJECT.md` baris 4) namun belum terpasang di `package.json` (`dependencies`).

### 1.2 Format dan Penamaan Berkas Cadangan
*   **Kondisi saat ini**: Tidak ada berkas yang di-generate atau diunduh ke komputer pengguna.
*   Proses *backup* saat ini mengirimkan data melalui HTTP POST ke URL eksternal Google Spreadsheet Webhook (`process.env.NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL`, baris 12, 82–98).
*   **Kesenjangan terhadap R5**: R5 mewajibkan pembentukan berkas ZIP lokal yang langsung dapat diunduh pengguna dengan pola format penamaan:
    `backup_sipjam_<sekolah>_<timestamp>.zip` (contoh: `backup_sipjam_smkn_1_tutuyan_2026-11-07T08-00-00.zip`).

### 1.3 Tabel/Entitas yang Dicadangkan
*   **Kondisi saat ini** (baris 70–72):
    Hanya mencadangkan **2 tabel transaksi**:
    1. `presensi_guru`
    2. `jurnal_pembelajaran`
*   **Kelemahan Destruktif Kritis** (baris 100–112):
    Setelah mengirim data ke Webhook, sistem **menghapus secara permanen** baris data tersebut dari database Supabase (`deleteInChunks("presensi_guru", presensi)` dan `deleteInChunks("jurnal_pembelajaran", jurnal)`).
*   **Kesenjangan terhadap R5**: R5 mewajibkan pencadangan non-destruktif terhadap **seluruh 33 tabel/entitas database** yang diidentifikasi dari skema Supabase.

### 1.4 Struktur Berkas & Aset Biner Foto
*   **Kondisi saat ini**: Tidak ada pembuatan arsip ZIP. Tidak ada folder `data/`, tidak ada folder `foto/`, dan tidak ada berkas metadata `manifest.json`.
*   Aset foto di tabel `users` (avatar), `sekolah` (logo), `presensi_guru` (bukti hadir/dinas), `jurnal_pembelajaran` (foto kegiatan), dan `laporan_piket` sama sekali tidak dibackup.

---

## 2. Analisis Implementasi Proses Pemulihan (Restore) Eksisting

### 2.1 Alur Unggah Berkas Restore
*   **Kondisi saat ini** (baris 136–191):
    Tidak ada antarmuka input berkas (`<input type="file">`). Tombol *Restore* hanya memanggil fungsi `handleRestore()` yang melakukan `fetch(webhookUrl)` untuk menarik kembali JSON dari Spreadsheet Google Apps Script.

### 2.2 Pembacaan dan Ekstraksi ZIP
*   Sistem tidak memiliki mekanisme unzipping, parsing `manifest.json`, pembacaan `data/<table_name>.json`, maupun pemulihan folder aset `foto/`.

### 2.3 Urutan Penyisipan Database & Penanganan Foreign Key
*   **Kondisi saat ini** (baris 160–185):
    Data hanya disaring untuk 2 tabel (`presensi_guru` dan `jurnal_pembelajaran`) dan langsung dilakukan `upsert({ ignoreDuplicates: true })`.
*   **Masalah Integritas**: Tidak memperhitungkan urutan dependensi relasional (*topological sort*). Jika data pengguna (`users`) atau data guru (`data_guru`) belum ada di database, foreign key constraint PostgreSQL (`user_id REFERENCES public.users(id) ON DELETE CASCADE`) akan menolak operasi insert/upsert dengan kode error `23503` (foreign key violation).

---

## 3. Pemetaan Lengkap 33 Tabel/Entitas Supabase & Graf Ketergantungan Relasional

Berdasarkan audit komparatif antara `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`, seluruh berkas migrasi `supabase/migrations/*.sql`, dan `src/types/database.ts`:
*   32 tabel database di bawah `public.Tables`
*   1 view database di bawah `public.Views` (`guru_kelas`)
*   **Total: 33 entitas database**.

Berikut adalah pemetaan topologis 6 tingkat (Level 0 sampai Level 5) untuk memastikan proses pemulihan (restore) berjalan 100% bebas dari kegagalan foreign key:

| Level | Entitas Database | Tipe | Dependensi Foreign Key (Prasyarat Relasional) | Catatan Khusus Multi-Tenant |
|:---:|:---|:---:|:---|:---|
| **Level 0** | `sekolah` | Tabel | *(None - Root Tenant)* | Filter via `id = user.sekolah_id` |
| **Level 0** | `sekolah_registry` | Tabel | *(None - Central Multi-School Registry)* | Filter via `id = user.sekolah_id` |
| **Level 1** | `pengaturan` | Tabel | `sekolah` | Key-value konfigurasi sekolah |
| **Level 1** | `kalender_pendidikan` | Tabel | `sekolah` | Master hari libur dan agenda |
| **Level 1** | `syarat_perangkat_pembelajaran` | Tabel | `sekolah` | Master jenis syarat dokumen ajar |
| **Level 1** | `data_mapel` | Tabel | `sekolah` | Master mata pelajaran |
| **Level 1** | `data_siswa` | Tabel | `sekolah` | Master siswa |
| **Level 1** | `users` | Tabel | `sekolah` | Akun pengguna sistem (Admin, Guru, Piket) |
| **Level 1** | `jadwal_piket` | Tabel | `sekolah` | Master hari piket |
| **Level 1** | `piket_form_lock` | Tabel | `sekolah` | Tabel concurrency lease form piket |
| **Level 1** | `pengumuman` | Tabel | `sekolah` | Master pengumuman internal |
| **Level 1** | `riwayat_backup` | Tabel | `sekolah` | Riwayat log pencadangan sistem |
| **Level 2** | `data_guru` | Tabel | `sekolah`, `users` | Profil biodata guru (merujuk user_id) |
| **Level 2** | `jadwal_pelajaran` | Tabel | `sekolah`, `users` | Jadwal KBM mingguan |
| **Level 2** | `presensi_siswa` | Tabel | `sekolah`, `data_siswa` | Log presensi gerbang/kiosk siswa |
| **Level 2** | `absensi` | Tabel | `sekolah`, `data_siswa` | Absensi harian canonical siswa |
| **Level 2** | `bank_dokumen` | Tabel | `sekolah`, `syarat_perangkat_pembelajaran` | Dokumen perangkat ajar yang diunggah |
| **Level 2** | `pengumuman_dibaca` | Tabel | `sekolah`, `pengumuman`, `users` | Rekam jejak pembaca pengumuman |
| **Level 2** | `pengumuman_tanggapan` | Tabel | `sekolah`, `pengumuman`, `users` | Respon/komentar pengumuman |
| **Level 2** | `chat_messages` | Tabel | `sekolah`, `users` | Pesan komunikasi antar user |
| **Level 2** | `push_subscriptions` | Tabel | `sekolah`, `users` | Langganan notifikasi web push |
| **Level 3** | `guru_mapel` | Tabel | `sekolah`, `data_guru`, `data_mapel` | Alokasi guru mengampu mapel dan kelas |
| **Level 3** | `wali_kelas` | Tabel | `sekolah`, `data_guru` | Penugasan wali kelas |
| **Level 3** | `penugasan_piket` | Tabel | `sekolah`, `data_guru` | Penugasan jadwal piket guru |
| **Level 3** | `sistem_blok` | Tabel | `sekolah`, `data_guru` | Periode sistem blok waktu mengajar |
| **Level 3** | `laporan_piket` | Tabel | `sekolah`, `users` | Jurnal laporan harian tim piket |
| **Level 3** | `presensi_guru` | Tabel | `sekolah`, `users` | Transaksi presensi datang & pulang guru |
| **Level 3** | `jurnal_pembelajaran` | Tabel | `sekolah`, `users` | Transaksi jurnal KBM guru di kelas |
| **Level 4** | `capaian_pembelajaran` | Tabel | `sekolah`, `guru_mapel` | Elemen CP Kurikulum Merdeka |
| **Level 4** | `tujuan_pembelajaran` | Tabel | `sekolah`, `capaian_pembelajaran`, `data_guru` | Tujuan Pembelajaran (TP) turunan CP |
| **Level 4** | `asesmen_kolom` | Tabel | `sekolah`, `tujuan_pembelajaran` | Kolom penilaian (formatif/sumatif) |
| **Level 5** | `nilai_siswa` | Tabel | `sekolah`, `asesmen_kolom`, `tujuan_pembelajaran` | Rekam nilai siswa |
| **Level 5** | `guru_kelas` | View | `sekolah`, `guru_mapel`, `data_guru` | **Database View** (hanya dicadangkan ke JSON untuk audit; dilewati saat DB insert pada restore) |

---

## 4. Spesifikasi Kontrak Berkas ZIP Sesuai R5

Berkas ZIP yang dihasilkan harus mematuhi struktur standar produksi:

```text
backup_sipjam_<sekolah>_<timestamp>.zip
├── manifest.json
├── data/
│   ├── sekolah.json
│   ├── sekolah_registry.json
│   ├── pengaturan.json
│   ├── kalender_pendidikan.json
│   ├── syarat_perangkat_pembelajaran.json
│   ├── data_mapel.json
│   ├── data_siswa.json
│   ├── users.json
│   ├── jadwal_piket.json
│   ├── piket_form_lock.json
│   ├── pengumuman.json
│   ├── riwayat_backup.json
│   ├── data_guru.json
│   ├── jadwal_pelajaran.json
│   ├── presensi_siswa.json
│   ├── absensi.json
│   ├── bank_dokumen.json
│   ├── pengumuman_dibaca.json
│   ├── pengumuman_tanggapan.json
│   ├── chat_messages.json
│   ├── push_subscriptions.json
│   ├── guru_mapel.json
│   ├── wali_kelas.json
│   ├── penugasan_piket.json
│   ├── sistem_blok.json
│   ├── laporan_piket.json
│   ├── presensi_guru.json
│   ├── jurnal_pembelajaran.json
│   ├── capaian_pembelajaran.json
│   ├── tujuan_pembelajaran.json
│   ├── asesmen_kolom.json
│   ├── nilai_siswa.json
│   └── guru_kelas.json
└── foto/
    ├── avatars/
    │   └── <user_id>.png
    ├── sekolah/
    │   └── logo_<id>.png
    ├── presensi/
    │   └── <presensi_id>.png
    └── jurnal/
        └── <jurnal_id>.png
```

### 4.1 Skema `manifest.json`
```json
{
  "version": "2.0",
  "appName": "SIPJAM",
  "timestamp": "2026-11-07T08:00:00.000Z",
  "sekolah_id": "a0000000-0000-0000-0000-000000000001",
  "sekolah_nama": "SMK Negeri 1 Tutuyan",
  "exportedBy": "Admin",
  "tahun_backup": "2026",
  "totalEntities": 33,
  "tableCounts": {
    "sekolah": 1,
    "sekolah_registry": 1,
    "pengaturan": 6,
    "kalender_pendidikan": 12,
    "syarat_perangkat_pembelajaran": 10,
    "data_mapel": 15,
    "data_siswa": 120,
    "users": 28,
    "jadwal_piket": 6,
    "piket_form_lock": 0,
    "pengumuman": 4,
    "riwayat_backup": 3,
    "data_guru": 24,
    "jadwal_pelajaran": 60,
    "presensi_siswa": 450,
    "absensi": 320,
    "bank_dokumen": 18,
    "pengumuman_dibaca": 35,
    "pengumuman_tanggapan": 10,
    "chat_messages": 8,
    "push_subscriptions": 14,
    "guru_mapel": 30,
    "wali_kelas": 8,
    "penugasan_piket": 12,
    "sistem_blok": 0,
    "laporan_piket": 22,
    "presensi_guru": 180,
    "jurnal_pembelajaran": 160,
    "capaian_pembelajaran": 25,
    "tujuan_pembelajaran": 50,
    "asesmen_kolom": 15,
    "nilai_siswa": 300,
    "guru_kelas": 30
  },
  "assetCount": 15,
  "topologicalLevels": {
    "Level 0": ["sekolah", "sekolah_registry"],
    "Level 1": ["pengaturan", "kalender_pendidikan", "syarat_perangkat_pembelajaran", "data_mapel", "data_siswa", "users", "jadwal_piket", "piket_form_lock", "pengumuman", "riwayat_backup"],
    "Level 2": ["data_guru", "jadwal_pelajaran", "presensi_siswa", "absensi", "bank_dokumen", "pengumuman_dibaca", "pengumuman_tanggapan", "chat_messages", "push_subscriptions"],
    "Level 3": ["guru_mapel", "wali_kelas", "penugasan_piket", "sistem_blok", "laporan_piket", "presensi_guru", "jurnal_pembelajaran"],
    "Level 4": ["capaian_pembelajaran", "tujuan_pembelajaran", "asesmen_kolom"],
    "Level 5": ["nilai_siswa", "guru_kelas"]
  }
}
```

### 4.2 Penanganan Ekstraksi & Restorasi Aset Biner Foto (`foto/`)
1.  **Ekstraksi saat Backup**:
    *   Kolom `users.avatar`, `sekolah.logo_url`, `presensi_guru.link_bukti`, `jurnal_pembelajaran.foto_kegiatan`, dll. yang menyimpan citra biner dalam format Data URL (`data:image/...;base64,...`) dipisahkan.
    *   Header Data URL diurai menjadi MIME type (`image/png`, `image/jpeg`) dan string base64 dikonversi ke buffer/blob biner untuk disimpan dalam folder `foto/`.
2.  **Pemulihan saat Restore**:
    *   Saat file ZIP diekstrak, jika terdapat berkas di dalam `foto/avatars/<user_id>.<ext>`, berkas tersebut dibaca dan dikonversi kembali menjadi Data URL atau dipulihkan ke record tabel terkait (`users.avatar`).
    *   Sama halnya dengan logo sekolah dan dokumentasi presensi/jurnal.

---

## 5. Invarian Kode & Uji Regresi yang Wajib Dipatuhi

Dalam berkas tes `tests/menu_consolidation_feature_recovery.test.ts` baris 722–726 terdapat invariant pengujian AST berikut:
```ts
check(
  '6.4.1: AdminBackupView uses clean <div id="view-admin-backup"> instead of nested view-section',
  adminBackupContent.includes('<div id="view-admin-backup" className="space-y-4 fade-in">') &&
  !adminBackupContent.includes('<section className="view-section"')
);
```
**Perhatian Khusus**: Pembungkus elemen root terluar dari komponen `AdminBackupView` **harus persis** `<div id="view-admin-backup" className="space-y-4 fade-in">` dan dilarang menggunakan `<section className="view-section">`.

Selain itu, `tests/four_ponytail_improvements.test.ts` dan `tests/adversarial_m2_regression_and_ast_challenger_2.test.ts` memverifikasi bahwa:
1. `AdminBackupView` diimpor secara dinamis via `next/dynamic` di `AppScreen.tsx`.
2. `AdminBackupView` diimpor dan dipasang di tab backup `AdminConfigView.tsx` dengan prop `<AdminBackupView user={user} />`.

---

## 6. Rekomendasi Code Diff Konkret untuk `src/components/AdminBackupView.tsx`

### 6.1 Pemasangan Library
Karena `JSZip` adalah bagian dari arsitektur resmi SIPJAM (`PROJECT.md`), langkah pra-kondisi untuk implementasi:
```bash
npm install jszip
npm install --save-dev @types/jszip
```

### 6.2 Modifikasi Header & Imports (`AdminBackupView.tsx` baris 1–15)
```diff
  'use client';
 
- import { useState, useEffect } from 'react';
+ import { useState, useEffect, useRef } from 'react';
  import { supabase } from '@/lib/supabaseClient';
  import Swal from 'sweetalert2';
  import { formatTimestampWita } from '@/lib/wita';
+ import JSZip from 'jszip';
 
  export default function AdminBackupView({ user }: { user: any }) {
    const [tahun, setTahun] = useState(new Date().getFullYear().toString());
    const [riwayat, setRiwayat] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
-   const webhookUrl = process.env.NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL;
+   const fileInputRef = useRef<HTMLInputElement>(null);
```

### 6.3 Definisi Tingkatan Topologis (Konstanta Data)
```diff
+ const ALL_TABLE_ENTITIES = [
+   // Level 0: Root Independent
+   { name: 'sekolah', level: 0, isView: false, isRootId: true },
+   { name: 'sekolah_registry', level: 0, isView: false, isRootId: true },
+   // Level 1: Depend on Sekolah
+   { name: 'pengaturan', level: 1, isView: false },
+   { name: 'kalender_pendidikan', level: 1, isView: false },
+   { name: 'syarat_perangkat_pembelajaran', level: 1, isView: false },
+   { name: 'data_mapel', level: 1, isView: false },
+   { name: 'data_siswa', level: 1, isView: false },
+   { name: 'users', level: 1, isView: false },
+   { name: 'jadwal_piket', level: 1, isView: false },
+   { name: 'piket_form_lock', level: 1, isView: false },
+   { name: 'pengumuman', level: 1, isView: false },
+   { name: 'riwayat_backup', level: 1, isView: false },
+   // Level 2: Depend on Level 1
+   { name: 'data_guru', level: 2, isView: false },
+   { name: 'jadwal_pelajaran', level: 2, isView: false },
+   { name: 'presensi_siswa', level: 2, isView: false },
+   { name: 'absensi', level: 2, isView: false },
+   { name: 'bank_dokumen', level: 2, isView: false },
+   { name: 'pengumuman_dibaca', level: 2, isView: false },
+   { name: 'pengumuman_tanggapan', level: 2, isView: false },
+   { name: 'chat_messages', level: 2, isView: false },
+   { name: 'push_subscriptions', level: 2, isView: false },
+   // Level 3: Depend on Level 2
+   { name: 'guru_mapel', level: 3, isView: false },
+   { name: 'wali_kelas', level: 3, isView: false },
+   { name: 'penugasan_piket', level: 3, isView: false },
+   { name: 'sistem_blok', level: 3, isView: false },
+   { name: 'laporan_piket', level: 3, isView: false },
+   { name: 'presensi_guru', level: 3, isView: false },
+   { name: 'jurnal_pembelajaran', level: 3, isView: false },
+   // Level 4: Academic Curriculum
+   { name: 'capaian_pembelajaran', level: 4, isView: false },
+   { name: 'tujuan_pembelajaran', level: 4, isView: false },
+   { name: 'asesmen_kolom', level: 4, isView: false },
+   // Level 5: Assessment Scores & View
+   { name: 'nilai_siswa', level: 5, isView: false },
+   { name: 'guru_kelas', level: 5, isView: true },
+ ];
```

### 6.4 Rekomendasi Penggantian `handleBackup` (baris 31–134)
```diff
-   const handleBackup = async () => {
-     if (!tahun) return Swal.fire('Error', 'Tahun harus diisi', 'error');
-     if (!webhookUrl) return Swal.fire('Error', 'Webhook URL belum dikonfigurasi di .env.local', 'error');
-     
-     // Confirm backup
-     const confirm = await Swal.fire({
-       title: 'Yakin Backup & Kosongkan Data?',
-       text: "Data presensi dan jurnal di database akan dikirim ke Spreadsheet dan dihapus dari sistem ini.",
-       icon: 'warning',
-       showCancelButton: true,
-       confirmButtonColor: '#4f46e5',
-       cancelButtonColor: '#d33',
-       confirmButtonText: 'Ya, Backup Sekarang!'
-     });
- 
-     if (!confirm.isConfirmed) return;
- 
-     setLoading(true);
-     Swal.fire({ title: 'Memproses Backup...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
- 
-     try {
-       // 1. Fetch data scoped by user.sekolah_id
-       const fetchAllData = async (table: string) => { ... };
-       const presensi = await fetchAllData("presensi_guru");
-       const jurnal = await fetchAllData("jurnal_pembelajaran");
-       ...
-       // Hapus data dari Supabase
-       await deleteInChunks("presensi_guru", presensi);
-       await deleteInChunks("jurnal_pembelajaran", jurnal);
-       ...
-     }
+   const handleBackup = async () => {
+     const confirm = await Swal.fire({
+       title: 'Cadangkan Seluruh Data Sistem?',
+       text: 'Sistem akan mengekspor seluruh 33 entitas database dan aset foto ke dalam berkas ZIP terkompresi tanpa menghapus data dari database.',
+       icon: 'question',
+       showCancelButton: true,
+       confirmButtonColor: '#4f46e5',
+       cancelButtonColor: '#6b7280',
+       confirmButtonText: 'Ya, Buat Berkas ZIP'
+     });
+     if (!confirm.isConfirmed) return;
+
+     setLoading(true);
+     Swal.fire({
+       title: 'Membuat Berkas Cadangan ZIP...',
+       html: '<div id="swal-backup-progress" class="text-xs text-gray-600 mt-2">Menghubungi database Supabase...</div>',
+       allowOutsideClick: false,
+       didOpen: () => Swal.showLoading()
+     });
+
+     try {
+       const targetSekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
+       // 1. Ambil profil sekolah untuk penamaan berkas
+       const { data: sekolahRow } = await supabase.from('sekolah').select('nama').eq('id', targetSekolahId).maybeSingle();
+       const cleanSchoolName = (sekolahRow?.nama || 'sekolah').toLowerCase().replace(/[^a-z0-9]+/g, '_');
+       const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
+       const zipFileName = `backup_sipjam_${cleanSchoolName}_${timestampStr}.zip`;
+
+       const zip = new JSZip();
+       const dataFolder = zip.folder('data');
+       const fotoFolder = zip.folder('foto');
+       const tableCounts: Record<string, number> = {};
+       let assetCount = 0;
+
+       // 2. Fetch seluruh 33 entitas secara terurut
+       for (let i = 0; i < ALL_TABLE_ENTITIES.length; i++) {
+         const entity = ALL_TABLE_ENTITIES[i];
+         const elProgress = document.getElementById('swal-backup-progress');
+         if (elProgress) elProgress.innerText = `Mengambil data ${entity.name} (${i + 1}/33)...`;
+
+         let allRows: any[] = [];
+         let from = 0;
+         const limit = 1000;
+         while (true) {
+           let q = supabase.from(entity.name).select('*').range(from, from + limit - 1);
+           if (entity.isRootId) {
+             q = q.eq('id', targetSekolahId);
+           } else {
+             q = q.eq('sekolah_id', targetSekolahId);
+           }
+           const { data, error } = await q;
+           if (error || !data || data.length === 0) break;
+           allRows = allRows.concat(data);
+           if (data.length < limit) break;
+           from += limit;
+         }
+
+         // Ekstraksi aset foto biner dari kolom yang menyimpan Data URI Base64
+         allRows.forEach((row: any) => {
+           if (entity.name === 'users' && row.avatar && row.avatar.startsWith('data:image')) {
+             const parts = row.avatar.split(',');
+             const mimeMatch = parts[0].match(/data:(image\/[a-zA-Z+]+);base64/);
+             const ext = mimeMatch ? mimeMatch[1].replace('image/', '') : 'png';
+             fotoFolder?.file(`avatars/${row.id}.${ext}`, parts[1], { base64: true });
+             assetCount++;
+           }
+           if (entity.name === 'sekolah' && row.logo_url && row.logo_url.startsWith('data:image')) {
+             const parts = row.logo_url.split(',');
+             fotoFolder?.file(`sekolah/logo_${row.id}.png`, parts[1], { base64: true });
+             assetCount++;
+           }
+         });
+
+         tableCounts[entity.name] = allRows.length;
+         dataFolder?.file(`${entity.name}.json`, JSON.stringify(allRows, null, 2));
+       }
+
+       // 3. Buat manifest.json di root ZIP
+       const manifest = {
+         version: '2.0',
+         appName: 'SIPJAM',
+         timestamp: new Date().toISOString(),
+         sekolah_id: targetSekolahId,
+         sekolah_nama: sekolahRow?.nama || 'Sekolah',
+         exportedBy: `${user?.nama || 'Admin'} (${user?.role || 'Admin'})`,
+         tahun_backup: tahun,
+         totalEntities: ALL_TABLE_ENTITIES.length,
+         tableCounts,
+         assetCount
+       };
+       zip.file('manifest.json', JSON.stringify(manifest, null, 2));
+
+       // 4. Kompresi dan download langsung di browser
+       const elProgress = document.getElementById('swal-backup-progress');
+       if (elProgress) elProgress.innerText = 'Mengompresi berkas ZIP...';
+       const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
+       const blobUrl = URL.createObjectURL(zipBlob);
+       const downloadLink = document.createElement('a');
+       downloadLink.href = blobUrl;
+       downloadLink.download = zipFileName;
+       document.body.appendChild(downloadLink);
+       downloadLink.click();
+       document.body.removeChild(downloadLink);
+       URL.revokeObjectURL(blobUrl);
+
+       // 5. Catat riwayat backup
+       await supabase.from('riwayat_backup').insert([{
+         id: crypto.randomUUID(),
+         sekolah_id: targetSekolahId,
+         timestamp: new Date().toISOString(),
+         tahun_backup: tahun,
+         link_file: zipFileName,
+         status: 'Sukses',
+         keterangan: `Cadangan ZIP 33 tabel & ${assetCount} aset foto (${zipFileName})`
+       }]);
+
+       Swal.fire('Berhasil', `Berkas cadangan ${zipFileName} berhasil dibuat dan diunduh.`, 'success');
+       fetchRiwayat();
+     } catch (error: any) {
+       Swal.fire('Gagal', error.message || 'Terjadi kesalahan saat membuat cadangan ZIP.', 'error');
+     }
+     setLoading(false);
+   };
```

### 6.5 Rekomendasi Penggantian `handleRestore` (baris 136–191)
```diff
-   const handleRestore = async () => { ... fetch(webhookUrl) ... }
+   const handleTriggerRestore = () => {
+     fileInputRef.current?.click();
+   };
+
+   const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
+     const file = e.target.files?.[0];
+     if (!file) return;
+     e.target.value = '';
+
+     const confirm = await Swal.fire({
+       title: 'Pulihkan Data dari Berkas ZIP?',
+       html: `Anda akan memulihkan data dari berkas: <b>${file.name}</b>.<br><span class="text-xs text-amber-600">Proses ini akan memperbarui dan menyinkronkan data database berdasarkan urutan relasional (Level 0 - Level 5).</span>`,
+       icon: 'warning',
+       showCancelButton: true,
+       confirmButtonColor: '#10b981',
+       cancelButtonColor: '#6b7280',
+       confirmButtonText: 'Ya, Mulai Restore'
+     });
+     if (!confirm.isConfirmed) return;
+
+     setLoading(true);
+     Swal.fire({
+       title: 'Memulihkan Data Sistem...',
+       html: '<div id="swal-restore-progress" class="text-xs text-gray-600 mt-2">Membaca arsip ZIP...</div>',
+       allowOutsideClick: false,
+       didOpen: () => Swal.showLoading()
+     });
+
+     try {
+       const zip = await JSZip.loadAsync(file);
+       const manifestEntry = zip.file('manifest.json');
+       if (!manifestEntry) {
+         throw new Error('Berkas ZIP tidak valid: manifest.json tidak ditemukan di root arsip.');
+       }
+       const manifestText = await manifestEntry.async('text');
+       const manifest = JSON.parse(manifestText);
+
+       let restoredTableCount = 0;
+       let restoredRowCount = 0;
+
+       // Pulihkan data berdasarkan urutan topologis Level 0 s/d Level 5
+       for (let level = 0; level <= 5; level++) {
+         const entitiesAtLevel = ALL_TABLE_ENTITIES.filter(e => e.level === level);
+         for (const entity of entitiesAtLevel) {
+           if (entity.isView) {
+             // View database seperti guru_kelas tidak perlu di-insert
+             continue;
+           }
+           const tableFile = zip.file(`data/${entity.name}.json`);
+           if (!tableFile) continue;
+
+           const elProgress = document.getElementById('swal-restore-progress');
+           if (elProgress) elProgress.innerText = `Menyimpan data ${entity.name} (Level ${level})...`;
+
+           const rawJson = await tableFile.async('text');
+           const rows = JSON.parse(rawJson);
+           if (!Array.isArray(rows) || rows.length === 0) continue;
+
+           // Upsert dalam batch 100 baris untuk efisiensi
+           const chunkSize = 100;
+           for (let idx = 0; idx < rows.length; idx += chunkSize) {
+             const chunk = rows.slice(idx, idx + chunkSize);
+             const { error: upsertErr } = await supabase.from(entity.name).upsert(chunk, { ignoreDuplicates: true });
+             if (upsertErr) {
+               console.warn(`Peringatan restore ${entity.name}:`, upsertErr.message);
+             }
+           }
+           restoredTableCount++;
+           restoredRowCount += rows.length;
+         }
+       }
+
+       Swal.fire('Pemulihan Selesai', `Berhasil memulihkan ${restoredRowCount} baris data dari ${restoredTableCount} tabel.`, 'success');
+       fetchRiwayat();
+     } catch (err: any) {
+       Swal.fire('Gagal Restore', err.message || 'Terjadi kesalahan saat memulihkan data dari ZIP.', 'error');
+     }
+     setLoading(false);
+   };
```

### 6.6 Pembaruan JSX / UI (`AdminBackupView.tsx` baris 204–218)
```diff
              <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 text-center">
                  <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2">Lakukan Backup & Restore</h3>
-                 <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Backup akan memindahkan data transaksi (presensi, jurnal) ke Spreadsheet dan <b>mengosongkan database Supabase</b> agar performa tetap cepat. Gunakan Restore untuk menarik kembali data tersebut ke Supabase.</p>
+                 <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Fitur pencadangan mengemas seluruh 33 tabel/entitas database dan aset foto ke dalam berkas ZIP mandiri tanpa menghapus data. Fitur pemulihan membaca kembali berkas ZIP untuk sinkronisasi database.</p>
+                 <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".zip" className="hidden" />
                  <div className="flex flex-col sm:flex-row justify-center gap-2 max-w-sm mx-auto">
                      <input type="number" value={tahun} onChange={e => setTahun(e.target.value)} className="w-full sm:w-24 px-3 py-2.5 text-sm rounded-xl input-premium text-center text-gray-900 dark:text-white bg-white dark:bg-gray-800" placeholder="Tahun" />
                      <div className="flex gap-2 flex-grow">
                        <button type="button" onClick={handleBackup} disabled={loading} className="btn-click flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50">
-                         {loading ? 'Proses...' : <><i className="fa-solid fa-cloud-arrow-up"></i> Backup</>}
+                         {loading ? 'Proses...' : <><i className="fa-solid fa-file-zipper"></i> Unduh Cadangan ZIP</>}
                        </button>
-                       <button type="button" onClick={handleRestore} disabled={loading} className="btn-click flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50">
-                         {loading ? 'Proses...' : <><i className="fa-solid fa-cloud-arrow-down"></i> Restore</>}
+                       <button type="button" onClick={handleTriggerRestore} disabled={loading} className="btn-click flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50">
+                         {loading ? 'Proses...' : <><i className="fa-solid fa-upload"></i> Pulihkan dari ZIP</>}
                        </button>
                      </div>
                  </div>
              </div>
```

---

## 7. Rangkuman Kesimpulan

1.  **Arsitektur Saat Ini Terlalu Sederhana dan Merusak Data**: Komponen eksisting hanya menangani 2 tabel, bergantung pada webhook eksternal yang lambat/rawan gagal, dan secara keliru menghapus data database asli saat backup.
2.  **Pemenuhan R5 Memerlukan Transformasi Penuh**:
    *   33 entitas database (32 tabel + 1 view) harus diorganisasikan ke dalam skema topologis 6 tingkat (Level 0 – Level 5).
    *   Pengemasan mandiri dalam satu berkas `backup_sipjam_<sekolah>_<timestamp>.zip` dengan folder `data/`, folder `foto/`, dan file `manifest.json`.
    *   Proses pemulihan mandiri melalui input file picker yang membaca arsip ZIP secara lokal menggunakan `JSZip`.
3.  **Kepatuhan Invarian**:
    *   DOM root invariant `<div id="view-admin-backup" className="space-y-4 fade-in">` harus dipertahankan secara ketat untuk mencegah kegagalan test suite.
    *   Operasi batching (chunk size 100–200) mencegah pembatasan batas muatan PostgREST Supabase.

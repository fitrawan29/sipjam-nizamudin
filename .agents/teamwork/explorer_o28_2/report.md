# Laporan Teknis: Analisis Skema Database & Hierarki Topologis Restorasi (33 Entitas)

**Penulis**: Explorer 2 (`explorer_o28_2`)  
**Tanggal**: 2026-11-07  
**Fokus**: Pemetaan 33 Entitas Database, Analisis Dependensi Foreign Key, Level Topologis Pemulihan (Level 0 s/d Level 5), Penanganan Siklus/Self-Reference, dan Definisi TypeScript Siap Pakai untuk `AdminBackupView.tsx`.

---

## 1. Ringkasan Eksekutif (Executive Summary)

Penyelidikan mendalam terhadap skema database aplikasi SIPJAM yang mencakup seluruh berkas migrasi Supabase (`supabase/migrations/*.sql`), templat penyediaan instansi baru (`supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`), tipe data TypeScript (`src/types/database.ts`), serta pemanfaatan tabel di komponen antarmuka (`src/components/`) berhasil mengidentifikasi secara pasti **33 entitas/tabel database**.

Untuk menjamin proses pencadangan (backup) dan pemulihan (restore) berjalan tanpa kegagalan integritas referensial (error PostgreSQL `23503: foreign_key_violation`), seluruh 33 entitas database telah dipetakan ke dalam **6 tingkatan topologis (Level 0 hingga Level 5)**. Dengan urutan ini, setiap entitas yang dipulihkan pada Level $N$ hanya memiliki dependensi foreign key ke entitas pada Level $\le N$ yang telah berhasil dipulihkan terlebih dahulu.

---

## 2. Inventaris Lengkap 33 Tabel/Entitas Database

Berikut adalah katalog lengkap 33 tabel/entitas database, mencakup nama tabel, tujuan operasional, primary key (PK), dependensi foreign key (FK), dan isolasi multi-tenant (`sekolah_id`):

| # | Nama Tabel | Deskripsi & Tujuan Entitas | Primary Key (PK) | Dependensi Foreign Key (References) | Tenant Column (`sekolah_id`) |
|---|---|---|---|---|---|
| 1 | `sekolah` | Master profil sekolah, NPSN, identitas instansi, konfigurasi kop/logo, status instansi | `id` (UUID) | *Tidak ada* (Akar Multi-Tenant) | N/A (Akar Tenant) |
| 2 | `sekolah_registry` | Direktori global portal induk jaringan multi-sekolah untuk routing satelit | `id` (UUID) | *Tidak ada* (Direktori Global) | N/A (Superadmin Directory) |
| 3 | `pengaturan` | Parameter operasional sistem, jam kerja, batas toleransi, aturan kehadiran | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 4 | `users` | Akun autentikasi dan peran akses (Superadmin, Admin, Guru, Piket, Wali Kelas) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NULLABLE) |
| 5 | `data_mapel` | Master data mata pelajaran kurikulum, kelompok, dan urutan tampilan | `id` (TEXT) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 6 | `data_kelas` | Master direktori kelas sekolah (nama kelas, tingkat, jurusan) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 7 | `data_siswa` | Master biodata siswa, NISN, kelas, jenis kelamin, kontak orang tua, QR Code | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 8 | `kalender_pendidikan` | Kalender akademik sekolah, agenda kegiatan, hari libur nasional dan semester | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 9 | `sistem_blok` | Konfigurasi periode pembelajaran sistem blok per angkatan, kelas, atau guru | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 10 | `syarat_perangkat_pembelajaran` | Master daftar instrumen perangkat ajar wajib/opsional (RPP/Modul, Silabus/ATP) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 11 | `jadwal_piket` | Pengaturan jadwal kelompok guru piket harian berdasarkan hari operasional | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 12 | `piket_form_lock` | Kunci konkurensi (lease lock) pengisian laporan piket dan presensi siswa | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 13 | `pengumuman` | Papan informasi dan pengumuman sekolah untuk guru, staf, atau umum | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 14 | `riwayat_backup` | Log audit aktivitas pencadangan dan pemulihan data sistem beserta tautan file | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 15 | `data_guru` | Master data guru, NIP, kontak, mapel ampu, wajib hadir hanya mengajar | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 16 | `jadwal_pelajaran` | Jadwal mingguan KBM per kelas, hari, jam mengajar, dan pengampu | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 17 | `presensi_guru` | Log transaksi kehadiran guru (datang, pulang, izin, sakit, koordinat, foto) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 18 | `jurnal_pembelajaran` | Catatan KBM harian guru (materi, ketercapaian, absensi murid, foto kelas) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 19 | `laporan_piket` | Laporan harian guru piket (rekap apel, rekap absen kelas, catatan kejadian) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 20 | `presensi_siswa` | Transaksi presensi mandiri siswa via kiosk/QR gerbang (datang & pulang) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`siswa_id` → `data_siswa(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 21 | `absensi` | Rekap kehadiran harian siswa per kelas (Hadir, Izin, Sakit, Alpa) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 22 | `bank_dokumen` | Berkas digital perangkat pembelajaran (Modul Ajar, Silabus, RPP, Promes) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 23 | `chat_messages` | Komunikasi perpesanan internal antar pengguna dalam satu tenant sekolah | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`sender_id` → `users(id)` ON DELETE CASCADE<br>`receiver_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 24 | `push_subscriptions` | Kredensial endpoint langganan Web Push Notification per pengguna | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 25 | `pengumuman_dibaca` | Log audit pembacaan pengumuman per pengguna | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`pengumuman_id` → `pengumuman(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 26 | `pengumuman_tanggapan` | Tanggapan / feedback komentar pengguna pada pengumuman | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`pengumuman_id` → `pengumuman(id)` ON DELETE CASCADE<br>`user_id` → `users(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 27 | `guru_mapel` | Relasi penugasan pengajaran guru ke mata pelajaran dan rombongan belajar | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`guru_id` → `data_guru(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 28 | `wali_kelas` | Penugasan guru sebagai wali kelas per tahun ajaran aktif | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`guru_id` → `data_guru(id)` ON DELETE SET NULL | `sekolah_id` (UUID NOT NULL) |
| 29 | `penugasan_piket` | Penugasan guru piket individual per hari operasional sekolah | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`guru_id` → `data_guru(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 30 | `capaian_pembelajaran` | Standar Capaian Pembelajaran (CP) Kurikulum Merdeka per mapel & fase | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`guru_mapel_id` → `guru_mapel(id)` ON DELETE SET NULL | `sekolah_id` (UUID NOT NULL) |
| 31 | `tujuan_pembelajaran` | Tujuan Pembelajaran (TP) hasil breakdown CP per guru, mapel, dan kelas | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`cp_id` → `capaian_pembelajaran(id)` ON DELETE SET NULL<br>`guru_id` → `data_guru(id)` ON DELETE SET NULL | `sekolah_id` (UUID NOT NULL) |
| 32 | `asesmen_kolom` | Kolom penilaian asesmen Kurikulum Merdeka (Diagnostik, Formatif, Sumatif) | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`tp_id` → `tujuan_pembelajaran(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |
| 33 | `nilai_siswa` | Nilai angka capaian dan umpan balik siswa per asesmen dan tujuan belajar | `id` (UUID) | `sekolah_id` → `sekolah(id)` ON DELETE CASCADE<br>`tp_id` → `tujuan_pembelajaran(id)` ON DELETE CASCADE<br>`asesmen_id` → `asesmen_kolom(id)` ON DELETE CASCADE | `sekolah_id` (UUID NOT NULL) |

*(Catatan: View `guru_kelas` merupakan security invoker view yang diturunkan dari `guru_mapel`, sehingga tidak memerlukan pemulihan data tabel terpisah).*

---

## 3. Hierarki Urutan Pemulihan Topologis (Level 0 hingga Level 5)

Proses pemulihan (restore) database dari cadangan ZIP harus dieksekusi secara ketat mengikuti urutan topologis di bawah ini. Setiap tingkatan diselesaikan secara penuh (batch upsert) sebelum beralih ke tingkatan berikutnya:

```
[Level 0: Akar & Konfigurasi Induk]
    sekolah, sekolah_registry, pengaturan
             │
             ▼
[Level 1: Master Data Primer & Jadwal Operasional]
    users, data_mapel, data_kelas, data_siswa, kalender_pendidikan,
    sistem_blok, syarat_perangkat_pembelajaran, jadwal_piket, piket_form_lock,
    pengumuman, riwayat_backup
             │
             ▼
[Level 2: Master Pendidik & Transaksi Aktivitas]
    data_guru, jadwal_pelajaran, presensi_guru, jurnal_pembelajaran,
    laporan_piket, presensi_siswa, absensi, bank_dokumen, chat_messages,
    push_subscriptions, pengumuman_dibaca, pengumuman_tanggapan
             │
             ▼
[Level 3: Penugasan Relasional Guru]
    guru_mapel, wali_kelas, penugasan_piket
             │
             ▼
[Level 4: Kurikulum Merdeka & Tujuan Pembelajaran]
    capaian_pembelajaran, tujuan_pembelajaran
             │
             ▼
[Level 5: Asesmen & Buku Nilai Siswa]
    asesmen_kolom, nilai_siswa
```

### Rincian Per Tingkatan:

### **Level 0: Independent Root Tables (3 Tabel)**
Tabel-tabel fondasi sistem yang tidak bergantung pada tabel aplikasi lain.
1. `sekolah`: Entitas penyewa (tenant) utama. Seluruh tabel lain mengacu pada UUID sekolah ini.
2. `sekolah_registry`: Indeks satelit multi-sekolah untuk superadmin.
3. `pengaturan`: Konfigurasi global instansi (kop surat, jam kerja, tahun ajaran).

### **Level 1: Core Master & Config Tables (11 Tabel)**
Tabel master data dasar yang hanya memiliki dependensi foreign key ke `sekolah` (Level 0).
4. `users`: Kredensial akun sistem yang dibutuhkan oleh transaksi di level selanjutnya.
5. `data_mapel`: Katalog mata pelajaran.
6. `data_kelas`: Direktori rombongan belajar / tingkat kelas.
7. `data_siswa`: Biodata siswa terdaftar.
8. `kalender_pendidikan`: Hari libur dan jadwal operasional akademik.
9. `sistem_blok`: Rentang waktu pembelajaran sistem blok.
10. `syarat_perangkat_pembelajaran`: Standar instrumen dokumen ajar.
11. `jadwal_piket`: Pengelompokan hari piket.
12. `piket_form_lock`: Concurrency lease lock.
13. `pengumuman`: Konten pengumuman instansi.
14. `riwayat_backup`: Catatan riwayat pencadangan data.

### **Level 2: Extended Master & Activity Transactions (12 Tabel)**
Tabel master pendidik dan seluruh transaksi harian operasional sekolah yang bergantung pada `users`, `data_siswa`, atau tabel Level 1 lainnya.
15. `data_guru`: Master guru (mengacu pada `users.id` melalui `user_id`).
16. `jadwal_pelajaran`: Jadwal KBM guru (mengacu pada `users.id`).
17. `presensi_guru`: Transaksi presensi pendidik (mengacu pada `users.id`).
18. `jurnal_pembelajaran`: Transaksi jurnal KBM kelas (mengacu pada `users.id`).
19. `laporan_piket`: Laporan guru piket (mengacu pada `users.id`).
20. `presensi_siswa`: Transaksi presensi QR gerbang (mengacu pada `data_siswa.id`).
21. `absensi`: Rekap absensi harian siswa per kelas.
22. `bank_dokumen`: Unggahan file modul ajar / RPP guru.
23. `chat_messages`: Komunikasi obrolan (mengacu pada `users.id` sender dan receiver).
24. `push_subscriptions`: Subscription Web Push (mengacu pada `users.id`).
25. `pengumuman_dibaca`: Status pembacaan (mengacu pada `pengumuman.id` dan `users.id`).
26. `pengumuman_tanggapan`: Komentar pengguna (mengacu pada `pengumuman.id` dan `users.id`).

### **Level 3: Teacher Relational Assignments (3 Tabel)**
Tabel penugasan yang memetakan guru (`data_guru` Level 2) ke rombel, mapel, dan piket.
27. `guru_mapel`: Penugasan guru ke mata pelajaran dan rombel (mengacu pada `data_guru.id`).
28. `wali_kelas`: Penugasan wali kelas (mengacu pada `data_guru.id`).
29. `penugasan_piket`: Penugasan piket guru per hari (mengacu pada `data_guru.id`).

### **Level 4: Learning Objectives & Curriculum (2 Tabel)**
Tabel kurikulum operasional yang diturunkan dari penugasan mengajar guru.
30. `capaian_pembelajaran`: CP Kurikulum Merdeka (mengacu pada `guru_mapel.id`).
31. `tujuan_pembelajaran`: Tujuan Pembelajaran (mengacu pada `capaian_pembelajaran.id` dan `data_guru.id`).

### **Level 5: Assessment Columns & Student Grades (2 Tabel)**
Tabel buku nilai terdalam (leaf child tables).
32. `asesmen_kolom`: Kolom penilaian formatif/sumatif (mengacu pada `tujuan_pembelajaran.id`).
33. `nilai_siswa`: Nilai capaian siswa (mengacu pada `tujuan_pembelajaran.id` dan `asesmen_kolom.id`).

---

## 4. Analisis Siklus Dependensi (Cycles) & Self-Referential Foreign Keys

### A. Temuan Struktur Relasional
1. **Tidak Ada Siklus Langsung pada Skema DDL**:
   - Skema SIPJAM dirancang secara bersih dan defensif: kolom pimpinan sekolah pada tabel `sekolah` (`nama_kepala_sekolah`, `nip_kepala_sekolah`) disimpan dalam format string (`TEXT`), bukan sebagai foreign key UUID ke `data_guru(id)` atau `users(id)`. Hal ini mencegah timbulnya dead-lock siklus `sekolah ↔ data_guru`.
2. **Tidak Ada Self-Referential Keys**:
   - Tidak ada tabel yang memiliki foreign key ke tabel itu sendiri (seperti `parent_id` hierarkis).
3. **Hubungan Relasi Nullable (Defensive Soft References)**:
   - Beberapa relasi foreign key didefinisikan sebagai `NULLABLE` dengan klausul `ON DELETE SET NULL` atau `ON DELETE CASCADE`:
     - `data_guru.user_id` (NULLABLE): Guru dapat terdaftar sebelum akun login `users` dibuat.
     - `guru_mapel.guru_id` (NULLABLE): Mengakomodasi mata pelajaran tanpa pengampu tetap.
     - `wali_kelas.guru_id` (NULLABLE): Mengakomodasi kelas tanpa wali kelas definitif.
     - `capaian_pembelajaran.guru_mapel_id` (NULLABLE).
     - `tujuan_pembelajaran.cp_id` dan `tujuan_pembelajaran.guru_id` (NULLABLE).
     - `presensi_siswa.siswa_id` (NULLABLE).

### B. Strategi Penanganan Saat Proses Restore
Untuk menjamin proses pemulihan 100% tahan uji terhadap anomali data historis atau referensi yatim (orphaned IDs):
1. **Strict Topological Batch Upsert**:
   - Pemulihan berjalan berurutan dari Level 0 ke Level 5 menggunakan metode `upsert` dengan opsi `{ onConflict: 'id', ignoreDuplicates: false }`.
2. **Nullable Fallback Sanitization (Pass 1)**:
   - Jika berkas cadangan memuat foreign key opsional (seperti `user_id` pada `data_guru` atau `guru_id` pada `wali_kelas`) yang entitas induknya tidak ditemukan di tabel target, sistem pemulihan tidak boleh menggagalkan seluruh batch. Kolom referensi yang tidak valid tersebut otomatis disetel ke `null`, dan detail peringatan dicatat pada log pemulihan.
3. **Two-Pass Upsert Protocol (Protokol Dua Tahap)**:
   - Khusus entitas yang memiliki dependensi silang horizontal (misalnya jika di masa depan ditambahkan referensi dari `sekolah` ke `data_guru`):
     - **Tahap 1**: Masukkan seluruh baris dengan foreign key opsional disetel sementara ke `null`.
     - **Tahap 2**: Setelah seluruh data pada tingkatan terkait selesai dibuat, lakukan update sekunder untuk menautkan foreign key UUID yang sesuai.

---

## 5. Analisis Isolasi Multi-Tenant (`sekolah_id`)

Dari total 33 tabel di database:
- **31 Tabel** memiliki kolom `sekolah_id` (dengan 30 tabel bertipe `UUID NOT NULL` dan 1 tabel `users` bertipe `UUID NULLABLE` untuk mendukung akun Superadmin lintas sekolah).
- **2 Tabel** tidak memiliki kolom `sekolah_id`:
  1. `sekolah`: Tabel ini sendiri merupakan entitas penyewa (tenant container) di mana kolom `id` adalah UUID sekolah.
  2. `sekolah_registry`: Direktori global portal induk jaringan multi-sekolah yang dikelola secara eksklusif oleh Superadmin.

### Implikasi untuk Backup dan Restore:
1. **Pencadangan (Backup)**:
   - Administrator sekolah reguler (`role: 'Admin'`) hanya mencadangkan baris data di mana `sekolah_id = user.sekolah_id` (atau `id = user.sekolah_id` pada tabel `sekolah`).
   - Tabel `sekolah_registry` dikecualikan dari cadangan tenant biasa, atau dicadangkan dalam mode read-only metadata.
2. **Pemulihan (Restore)**:
   - Engine restore memvalidasi bahwa seluruh baris data JSON yang akan di-upsert memiliki `sekolah_id` yang sesuai dengan target sekolah yang sedang dipulihkan (mencegah class/data injection ke sekolah lain).

---

## 6. Identifikasi Aset Biner & Foto Terkait

Tabel-tabel yang memuat kolom tautan file biner yang harus diunduh dan dipaketkan ke dalam folder `foto/` dalam arsip ZIP:

| Nama Tabel | Kolom Aset / Foto | Deskripsi Aset |
|---|---|---|
| `sekolah` | `logo_url`, `logo_kiri_url`, `logo_kanan_url` | Logo resmi instansi untuk kop surat dan rapor |
| `users` | `avatar` | Foto profil pengguna akun |
| `data_siswa` | `qr_code` | Kartu/QR code identitas presensi siswa |
| `presensi_guru` | `link_bukti` | Foto selfie presensi kehadiran atau dokumen surat sakit/izin |
| `jurnal_pembelajaran` | `link_bukti_foto`, `foto_kegiatan` | Dokumentasi kegiatan belajar mengajar di kelas |
| `laporan_piket` | `link_foto` | Dokumentasi apel pagi atau situasi lingkungan sekolah |
| `bank_dokumen` | `link_file` | Berkas Modul Ajar, RPP, dan administrasi guru |
| `pengumuman` | `lampiran_url` | Lampiran surat edaran atau dokumen pengumuman |
| `riwayat_backup` | `link_file` | Tautan arsip cadangan terdahulu |

---

## 7. Struktur Data TypeScript untuk `AdminBackupView.tsx`

Berikut adalah definisi tipe data dan array konfigurasi 33 entitas database siap pakai untuk diintegrasikan secara langsung ke `src/components/AdminBackupView.tsx`:

```typescript
export interface TableDependencyConfig {
  tableName: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  levelLabel: string;
  primaryKey: string;
  label: string;
  hasTenantIsolation: boolean;
  tenantColumn: string | null;
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
    isNullable: boolean;
  }>;
  hasBinaryAssets?: boolean;
  assetColumns?: string[];
}

export const BACKUP_DATABASE_TABLES: TableDependencyConfig[] = [
  // ============================================================================
  // LEVEL 0: Independent Root Tables (3 Entitas)
  // ============================================================================
  {
    tableName: 'sekolah',
    level: 0,
    levelLabel: 'Level 0: Akar Multi-Tenant & Profil Sekolah',
    primaryKey: 'id',
    label: 'Profil Sekolah',
    hasTenantIsolation: false,
    tenantColumn: null,
    foreignKeys: [],
    hasBinaryAssets: true,
    assetColumns: ['logo_url', 'logo_kiri_url', 'logo_kanan_url']
  },
  {
    tableName: 'sekolah_registry',
    level: 0,
    levelLabel: 'Level 0: Akar Multi-Tenant & Profil Sekolah',
    primaryKey: 'id',
    label: 'Registri Satelit Sekolah',
    hasTenantIsolation: false,
    tenantColumn: null,
    foreignKeys: []
  },
  {
    tableName: 'pengaturan',
    level: 0,
    levelLabel: 'Level 0: Akar Multi-Tenant & Profil Sekolah',
    primaryKey: 'id',
    label: 'Konfigurasi Sistem',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },

  // ============================================================================
  // LEVEL 1: Core Master & Config Tables (11 Entitas)
  // ============================================================================
  {
    tableName: 'users',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Pengguna & Akun',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: true }
    ],
    hasBinaryAssets: true,
    assetColumns: ['avatar']
  },
  {
    tableName: 'data_mapel',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Mata Pelajaran',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'data_kelas',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Direktori Kelas',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'data_siswa',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Data Siswa',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ],
    hasBinaryAssets: true,
    assetColumns: ['qr_code']
  },
  {
    tableName: 'kalender_pendidikan',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Kalender Pendidikan',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'sistem_blok',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Periode Sistem Blok',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'syarat_perangkat_pembelajaran',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Instrumen Perangkat Ajar',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'jadwal_piket',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Jadwal Hari Piket',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'piket_form_lock',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Kunci Formulir Piket',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'pengumuman',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Papan Pengumuman',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ],
    hasBinaryAssets: true,
    assetColumns: ['lampiran_url']
  },
  {
    tableName: 'riwayat_backup',
    level: 1,
    levelLabel: 'Level 1: Master Data Primer & Akun',
    primaryKey: 'id',
    label: 'Log Riwayat Backup',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ],
    hasBinaryAssets: true,
    assetColumns: ['link_file']
  },

  // ============================================================================
  // LEVEL 2: Extended Master & Activity Transactions (12 Entitas)
  // ============================================================================
  {
    tableName: 'data_guru',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Data Guru',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'jadwal_pelajaran',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Jadwal Pelajaran',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'presensi_guru',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Presensi Guru',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ],
    hasBinaryAssets: true,
    assetColumns: ['link_bukti']
  },
  {
    tableName: 'jurnal_pembelajaran',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Jurnal KBM',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ],
    hasBinaryAssets: true,
    assetColumns: ['link_bukti_foto', 'foto_kegiatan']
  },
  {
    tableName: 'laporan_piket',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Laporan Piket',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ],
    hasBinaryAssets: true,
    assetColumns: ['link_foto']
  },
  {
    tableName: 'presensi_siswa',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Presensi Siswa (Gerbang/QR)',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'siswa_id', referencedTable: 'data_siswa', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'absensi',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Rekap Absensi Harian Siswa',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'bank_dokumen',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Bank Dokumen Perangkat Ajar',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false }
    ],
    hasBinaryAssets: true,
    assetColumns: ['link_file']
  },
  {
    tableName: 'chat_messages',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Pesan Chat Internal',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'sender_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true },
      { column: 'receiver_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'push_subscriptions',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Langganan Web Push',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'pengumuman_dibaca',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Audit Keterbacaan Pengumuman',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'pengumuman_id', referencedTable: 'pengumuman', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'pengumuman_tanggapan',
    level: 2,
    levelLabel: 'Level 2: Master Pendidik & Transaksi Aktivitas',
    primaryKey: 'id',
    label: 'Tanggapan Pengumuman',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'pengumuman_id', referencedTable: 'pengumuman', referencedColumn: 'id', isNullable: false },
      { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', isNullable: true }
    ]
  },

  // ============================================================================
  // LEVEL 3: Teacher Relational Assignments (3 Entitas)
  // ============================================================================
  {
    tableName: 'guru_mapel',
    level: 3,
    levelLabel: 'Level 3: Penugasan Relasional Guru',
    primaryKey: 'id',
    label: 'Penugasan Guru Mapel & Kelas',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'guru_id', referencedTable: 'data_guru', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'wali_kelas',
    level: 3,
    levelLabel: 'Level 3: Penugasan Relasional Guru',
    primaryKey: 'id',
    label: 'Penugasan Wali Kelas',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'guru_id', referencedTable: 'data_guru', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'penugasan_piket',
    level: 3,
    levelLabel: 'Level 3: Penugasan Relasional Guru',
    primaryKey: 'id',
    label: 'Penugasan Petugas Piket',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'guru_id', referencedTable: 'data_guru', referencedColumn: 'id', isNullable: true }
    ]
  },

  // ============================================================================
  // LEVEL 4: Learning Objectives & Curriculum (2 Entitas)
  // ============================================================================
  {
    tableName: 'capaian_pembelajaran',
    level: 4,
    levelLabel: 'Level 4: Kurikulum & Capaian Belajar',
    primaryKey: 'id',
    label: 'Capaian Pembelajaran (CP)',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'guru_mapel_id', referencedTable: 'guru_mapel', referencedColumn: 'id', isNullable: true }
    ]
  },
  {
    tableName: 'tujuan_pembelajaran',
    level: 4,
    levelLabel: 'Level 4: Kurikulum & Capaian Belajar',
    primaryKey: 'id',
    label: 'Tujuan Pembelajaran (TP)',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'cp_id', referencedTable: 'capaian_pembelajaran', referencedColumn: 'id', isNullable: true },
      { column: 'guru_id', referencedTable: 'data_guru', referencedColumn: 'id', isNullable: true }
    ]
  },

  // ============================================================================
  // LEVEL 5: Assessment Columns & Student Grades (2 Entitas)
  // ============================================================================
  {
    tableName: 'asesmen_kolom',
    level: 5,
    levelLabel: 'Level 5: Asesmen & Buku Nilai Siswa',
    primaryKey: 'id',
    label: 'Kolom Asesmen (Formatif/Sumatif)',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'tp_id', referencedTable: 'tujuan_pembelajaran', referencedColumn: 'id', isNullable: false }
    ]
  },
  {
    tableName: 'nilai_siswa',
    level: 5,
    levelLabel: 'Level 5: Asesmen & Buku Nilai Siswa',
    primaryKey: 'id',
    label: 'Nilai Siswa',
    hasTenantIsolation: true,
    tenantColumn: 'sekolah_id',
    foreignKeys: [
      { column: 'sekolah_id', referencedTable: 'sekolah', referencedColumn: 'id', isNullable: false },
      { column: 'tp_id', referencedTable: 'tujuan_pembelajaran', referencedColumn: 'id', isNullable: false },
      { column: 'asesmen_id', referencedTable: 'asesmen_kolom', referencedColumn: 'id', isNullable: false }
    ]
  }
];
```

---

## 8. Panduan Integrasi Restore Engine

Agar pemulihan berjalan mulus, algoritma restore pada `AdminBackupView.tsx` disarankan mengimplementasikan pola eksekusi berjenjang:

1. **Unzip & Manifest Parsing**: Baca `manifest.json` dan verifikasi keberadaan data untuk seluruh entitas.
2. **Topological Level Loop**:
   ```typescript
   for (let level = 0; level <= 5; level++) {
     const levelTables = BACKUP_DATABASE_TABLES.filter(t => t.level === level);
     for (const tableConfig of levelTables) {
       const fileData = await zip.file(`data/${tableConfig.tableName}.json`)?.async('string');
       if (!fileData) continue;
       const records: any[] = JSON.parse(fileData);
       if (records.length === 0) continue;

       // Tenant Isolation Guard
       const scopedRecords = records.map(r => ({
         ...r,
         ...(tableConfig.hasTenantIsolation ? { sekolah_id: targetSekolahId } : {})
       }));

       // Batch Upsert
       await batchUpsert(tableConfig.tableName, scopedRecords, 100);
     }
   }
   ```
3. **Binary Assets Restoration**: Setelah seluruh data level 0 s/d 5 ter-upsert, lakukan upload berkas biner dari folder `foto/` ke Supabase storage bucket yang sesuai.

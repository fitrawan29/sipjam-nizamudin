# Handoff Report: Analisis Skema Database & Hierarki Topologis Restorasi (33 Entitas)

**Agent ID**: `explorer_o28_2`  
**Milestone**: M4 (Penyesuaian Pencadangan Data Sistem ZIP 33 Tabel Database & Restorasi Topologis)  
**Parent Agent**: `8f5aacc7-a6e3-45c5-9d25-d67c36b27ad6`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_2`  
**Artifact Report**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_2\report.md`

---

## 1. Observation

1. **Skema Basis Data SQL & Migrasi**:
   - `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` mendefinisikan 31 tabel inti:
     - Garis 17: `public.sekolah` (Akar penyewa multi-tenant)
     - Garis 42: `public.users`
     - Garis 56: `public.data_guru`
     - Garis 72: `public.data_mapel`
     - Garis 84: `public.data_siswa`
     - Garis 99: `public.guru_mapel`
     - Garis 113: `public.wali_kelas`
     - Garis 126: `public.jadwal_pelajaran`
     - Garis 141: `public.jadwal_piket`
     - Garis 151: `public.penugasan_piket`
     - Garis 162: `public.piket_form_lock`
     - Garis 175: `public.laporan_piket`
     - Garis 194: `public.presensi_guru`
     - Garis 221: `public.jurnal_pembelajaran`
     - Garis 262: `public.absensi`
     - Garis 281: `public.presensi_siswa`
     - Garis 298: `public.capaian_pembelajaran`
     - Garis 314: `public.tujuan_pembelajaran`
     - Garis 334: `public.asesmen_kolom`
     - Garis 348: `public.nilai_siswa`
     - Garis 366: `public.kalender_pendidikan`
     - Garis 376: `public.bank_dokumen`
     - Garis 390: `public.pengaturan`
     - Garis 405: `public.pengumuman`
     - Garis 419: `public.pengumuman_dibaca`
     - Garis 428: `public.pengumuman_tanggapan`
     - Garis 440: `public.chat_messages`
     - Garis 454: `public.push_subscriptions`
     - Garis 466: `public.sistem_blok`
     - Garis 478: `public.syarat_perangkat_pembelajaran`
     - Garis 488: `public.riwayat_backup`
     - Garis 501: `public.guru_kelas` didefinisikan sebagai *VIEW* (bukan base table): `CREATE VIEW public.guru_kelas WITH (security_invoker = true) AS SELECT DISTINCT sekolah_id, guru_id, nip, nama_guru, kelas FROM public.guru_mapel;`.
   - `supabase/migrations/20261013_portal_induk_jaringan_multi_sekolah.sql` & `20261016_fix_sekolah_registry_schema_cache.sql`:
     - Garis 25: `public.sekolah_registry` (Tabel ke-32 untuk portal induk jaringan satelit multi-sekolah).
   - `supabase/migrations/20261102_restrict_master_data_to_admin.sql` & `src/components/AdminKelasView.tsx`:
     - Garis 70 pada migrasi 20261102 dan Garis 270 pada `AdminKelasView.tsx`: `public.data_kelas` (Tabel ke-33 untuk master direktori kelas sekolah).

2. **Foreign Key Dependensi & Nullabilitas**:
   - Skrip `node scripts/check_fk_nullability.js` memverifikasi seluruh foreign key:
     - `users.sekolah_id` (NULLABLE, ON DELETE CASCADE).
     - `data_guru.user_id` (NULLABLE, ON DELETE CASCADE).
     - `jadwal_pelajaran.user_id`, `presensi_guru.user_id`, `jurnal_pembelajaran.user_id`, `laporan_piket.user_id`, `push_subscriptions.user_id` (semua NULLABLE, ON DELETE CASCADE ditambahkan pada `20260926_add_uuid_fkeys.sql`).
     - `guru_mapel.guru_id` (NULLABLE, ON DELETE CASCADE).
     - `wali_kelas.guru_id` (NULLABLE, ON DELETE SET NULL).
     - `penugasan_piket.guru_id` (NULLABLE, ON DELETE CASCADE).
     - `capaian_pembelajaran.guru_mapel_id` (NULLABLE, ON DELETE SET NULL).
     - `tujuan_pembelajaran.cp_id` dan `guru_id` (keduanya NULLABLE, ON DELETE SET NULL).
     - `asesmen_kolom.tp_id` (NOT NULL, ON DELETE CASCADE).
     - `nilai_siswa.tp_id` dan `asesmen_id` (keduanya NOT NULL, ON DELETE CASCADE).

3. **Verifikasi Bebas Siklus (Acyclic Verification)**:
   - Skrip `node scripts/test_topological_validity.js` membuktikan bahwa ke-33 tabel dalam struktur Level 0 hingga Level 5 menghasilkan 0 pelanggaran dependensi (`Violations found: 0`).
   - Tidak ada foreign key siklik (`sekolah` tidak memiliki FK ke `data_guru` atau `users`, data kepala sekolah berupa teks literal).

---

## 2. Logic Chain

1. **Identifikasi Entitas Dasar**:
   - Dari templat `SETUP_NEW_SCHOOL_TEMPLATE.sql`, terdapat 31 tabel fisik dan 1 view (`guru_kelas`). Karena `guru_kelas` adalah view derivatif dari `guru_mapel`, ia tidak dimasukkan ke dalam cadangan tabel fisik.
   - Penelusuran migrasi menemukan tabel `sekolah_registry` (entitas ke-32).
   - Penelusuran antarmuka master data dan migrasi hak akses menemukan `data_kelas` (entitas ke-33) yang melengkapi seluruh 33 entitas database.

2. **Penyusunan Hierarki Topologis 6 Tingkat (Level 0 s/d Level 5)**:
   - **Level 0**: Tabel tanpa dependensi ke entitas aplikasi lain: `sekolah`, `sekolah_registry`, dan konfigurasi sistem `pengaturan` (3 tabel).
   - **Level 1**: Master primer dan jadwal yang hanya membutuhkan `sekolah` (Level 0): `users`, `data_mapel`, `data_kelas`, `data_siswa`, `kalender_pendidikan`, `sistem_blok`, `syarat_perangkat_pembelajaran`, `jadwal_piket`, `piket_form_lock`, `pengumuman`, `riwayat_backup` (11 tabel).
   - **Level 2**: Entitas yang bergantung pada `users`, `data_siswa`, atau Level 1: `data_guru`, `jadwal_pelajaran`, `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `presensi_siswa`, `absensi`, `bank_dokumen`, `chat_messages`, `push_subscriptions`, `pengumuman_dibaca`, `pengumuman_tanggapan` (12 tabel).
   - **Level 3**: Penugasan yang bergantung pada pendidik `data_guru` (Level 2): `guru_mapel`, `wali_kelas`, `penugasan_piket` (3 tabel).
   - **Level 4**: Kurikulum pembelajaran yang bergantung pada penugasan Level 3 dan guru Level 2: `capaian_pembelajaran`, `tujuan_pembelajaran` (2 tabel).
   - **Level 5**: Buku nilai terdalam yang bergantung pada tujuan pembelajaran Level 4: `asesmen_kolom`, `nilai_siswa` (2 tabel).
   - Total: 3 + 11 + 12 + 3 + 2 + 2 = 33 tabel.

3. **Integritas Restorasi Berjenjang**:
   - Karena setiap level hanya bergantung pada level sebelumnya, proses restore berurutan dari Level 0 hingga Level 5 secara matematis menjamin tidak akan pernah terjadi error `23503: foreign_key_violation`.
   - Foreign key yang bersifat opsional (`user_id` pada guru, `guru_id` pada wali kelas, `cp_id` pada TP) disanitasi menjadi `null` jika ID relasi tidak ditemukan di database target.

---

## 3. Caveats

1. **Tabel `sekolah_registry`**:
   - Bersifat portal induk global untuk Superadmin. Pada pencadangan oleh Admin sekolah reguler, tabel ini dicadangkan kosong atau berisi data registry sekolah terkait saja guna menjaga kerahasiaan multi-sekolah.
2. **View `guru_kelas`**:
   - Merupakan tampilan dinamis dari `guru_mapel`. Tidak perlu diekspor ke `data/guru_kelas.json` karena akan terisi otomatis saat `guru_mapel` dipulihkan.
3. **Penyimpanan Lokal (Local Storage Sync)**:
   - Beberapa tabel master (seperti kelas kustom pada `data_kelas`) memiliki sinkronisasi cadangan di `localStorage` klien browser. Proses restore database akan otomatis menyelaraskan cache tersebut saat antarmuka dimuat ulang.

---

## 4. Conclusion

- Seluruh **33 entitas database** telah teridentifikasi secara presisi tanpa ada yang terlewat.
- Struktur topologis **Level 0 hingga Level 5** telah terbukti valid dan siap diintegrasikan ke `src/components/AdminBackupView.tsx`.
- Skema terbebas dari siklus referensial buntu, dan strategi penanganan foreign key nullable menjamin pemulihan tanpa kegagalan.
- Laporan teknis lengkap dan konstanta TypeScript `BACKUP_DATABASE_TABLES` telah terdokumentasi secara penuh di file `report.md`.

---

## 5. Verification Method

1. **Verifikasi Validitas Topologis via Node.js**:
   Jalankan skrip verifikasi otomatis yang telah disiapkan:
   ```bash
   node scripts/test_topological_validity.js
   ```
   *Ekspektasi*: Menampilkan `Total tables in proposed levels: 33`, `Matches 33? true`, dan `PERFECT! All 33 tables satisfy strict topological ordering without ANY violations!`.

2. **Verifikasi Jumlah & Nama Entitas**:
   Jalankan skrip pencocokan entitas:
   ```bash
   node scripts/find_all_entities.js
   ```
   *Ekspektasi*: Menampilkan 33 entitas unik yang identik dengan inventaris pada tabel di `report.md`.

3. **Inspeksi Berkas Laporan**:
   Periksa berkas teknis lengkap pada path:
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_2\report.md`.

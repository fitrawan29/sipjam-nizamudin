# Analisis Arsitektur Data KBM, Pemetaan Konsumen & Rencana Verifikasi Objektif (KBM Architecture & Verification Planner)

**Dokumen**: `analysis.md`  
**Penyusun**: `explorer_kbm_3` (KBM Architecture & Verification Planner)  
**Tanggal**: 2026-11-12  
**Target Aplikasi**: `sipjam-app`  
**Status**: Completed — Read-Only Investigation  

---

## 1. Executive Summary

Berdasarkan investigasi menyeluruh terhadap basis kode, skema basis data PostgreSQL/Supabase, riwayat commit terkini (`bece4f3`, `3c4ff91`, `a2db0d7`, `7e4cf9d`), serta alur kerja end-to-end dari pembuatan hingga pencetakan dokumen, ditemukan ringkasan esensial berikut:

1. **Entitas Basis Data Tunggal (`jurnal_pembelajaran`)**:
   Tidak terdapat tabel terpisah bernama `jurnal_kbm` maupun `jurnal_guru` di skema basis data PostgreSQL. Seluruh entri jurnal mengajar guru (KBM) dan jurnal kegiatan disimpan dalam satu tabel tunggal: **`public.jurnal_pembelajaran`** (ditambah tabel khusus bimbingan konseling **`public.jurnal_bk`**). Perbedaan antara Jurnal KBM dan Jurnal Kegiatan ditentukan oleh nilai kolom `keterangan` dan `mapel`.
2. **Akar Penyebab Utama Jurnal KBM Guru Tidak Bisa Disimpan (R1)**:
   - **Terkunci Sebelum Submit (`isLocked`)**: Kondisi `hasNoKbmAssignments` dan `dailyState.canOpenJurnal` dapat mengunci formulir secara agresif (`isLocked = true` memicu `pointer-events-none` dan `disabled` pada tombol submit) jika penugasan guru (`guru_mapel` / `jadwal_pelajaran`) sedang dalam proses muat lambat atau guru belum terekam presensi datang pada hari itu.
   - **Dual-Phase Sub-Mode Absensi vs Jurnal**: Mekanisme pemisahan absensi siswa (`kbmSubMode === 'absensi'`) dan jurnal KBM (`kbmSubMode === 'jurnal'`) menghasilkan dua tahap simpan. Jika pencarian sesi eksisting (`existingSessionQuery`) gagal mencocokkan sesi absensi yang telah dibuat sebelumnya (akibat sensitivitas PostgREST `.or()` pada nama guru bergelar/tanda baca), sistem melakukan `insert` baru, memicu duplikasi atau kegagalan constraint bila foreign key/RLS tidak terpenuhi.
   - **Ketidaksinkronan Kolom `kegiatan_pembelajaran`**: Pada payload `newJurnal` di `GuruJurnal.tsx`, kolom `kegiatan_pembelajaran` tidak diisi (hanya `kegiatan`), sehingga pada komponen yang membaca `kegiatan_pembelajaran`, data tampak kosong.
   - **Resiliensi `sekolah_id`**: Pada `newJurnal`, fallback `sekolah_id` tidak memiliki default statis saat objek `user` lokal belum memuat atribut tersebut, berpotensi memicu pelanggaran `NOT NULL constraint` pada PostgreSQL.
3. **Akar Penyebab Data Jurnal Guru Hilang pada Cetak Jurnal KBM (R2)**:
   - **Over-Filtering Kelas Akibat Default Wali Kelas**: Pada `RekapJurnalView.tsx` (baris 342-348), fungsi `fetchMaster` secara otomatis memanggil `setKelas(assignedWalis[0])` apabila guru tersebut merupakan Wali Kelas. Ketika guru membuka tab "Cetak Jurnal KBM" (mode pribadi: `tabMode === 'pribadi'`), fungsi `tarikRekap` mengeksekusi `query.eq('kelas', activeKelas)`. Akibatnya, sistem **hanya menampilkan jurnal kelas binaan wali kelas tersebut** dan **menghilangkan seluruh data jurnal KBM dari kelas-kelas lain yang diajarkan oleh guru tersebut**.
   - **Mismatch Pemetaan Kolom Render**: Tabel cetak dokumen 12-kolom guru mengevaluasi `konten`, `materi_pembelajaran`, `kegiatan_pembelajaran`, dan `foto_kegiatan`. Jurnal versi tertentu yang hanya memiliki `materi` atau `kegiatan` sempat tereliminasi atau menampilkan tanda `-`.
4. **Interplay R1 dan R2**:
   Alur R1 (simpan di `GuruJurnal.tsx`) dan R2 (cetak di `RekapJurnalView.tsx`) merupakan dua sisi dari kontrak data yang sama pada tabel `jurnal_pembelajaran`. Menyelaraskan struktur payload dual-write pada penyimpanan sekaligus menormalkan query filter kelas pada cetak menjamin data yang disimpan guru langsung muncul secara utuh dan lengkap pada lembar cetak dokumen tanpa regresi.

---

## 2. Investigasi Arsitektur Data End-to-End

### 2.1 Peta Entitas Basis Data (Entity Relationship & Schema Contracts)

```
                       +-----------------------+
                       |        sekolah        |
                       +-----------------------+
                                   | 1
                                   |
         +-------------------------+-------------------------+
         |                         |                         |
         v *                       v *                       v *
+-----------------+       +-----------------+       +-------------------+
|      users      |       |    data_guru    |       |    data_siswa     |
+-----------------+       +-----------------+       +-------------------+
         |                         |                         |
         +------------+------------+                         |
                      | 1                                    |
                      v *                                    |
          +-----------------------+                          |
          |   jadwal_pelajaran    |                          |
          +-----------------------+                          |
                      |                                      |
                      v                                      |
          +=======================+                          |
          |  jurnal_pembelajaran  |<-------------------------+
          | (Canonical KBM Table) | (embedded absensi_siswa JSON)
          +=======================+
                      ^
                      | (Auto-sync Rule 2 Bolos)
          +-----------------------+
          |        absensi        |
          | (Daily Class Absensi) |
          +-----------------------+
```

### 2.2 Spesifikasi Kolom Tabel `jurnal_pembelajaran`

Sesuai definisi pada `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` baris 223–261 dan migrasi terkait (`20260912_jurnal_pembelajaran_8_kolom.sql`, `20261001_features_r1_r6.sql`, `20261003_add_kktp_konten_lokasi_kbm.sql`):

| Nama Kolom | Tipe Data Postgres | Status Nullable | Deskripsi & Kompatibilitas |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | UUID entri jurnal unik (`crypto.randomUUID()`) |
| `sekolah_id` | `UUID` | NOT NULL | Multi-tenant identifier (relasi ke `sekolah.id`) |
| `user_id` | `UUID` | NULLABLE | Relasi ke `users.id` (pembuat jurnal) |
| `timestamp` | `TIMESTAMPTZ` | DEFAULT now() | Waktu pencatatan sesi jurnal |
| `nama_guru` | `TEXT` | NOT NULL | Nama lengkap guru pengajar |
| `mapel` | `TEXT` | NOT NULL | Mata pelajaran resmi KBM atau `Jurnal Kegiatan` |
| `kelas` | `TEXT` | NOT NULL | Kelas target KBM (misal: "7A", "8B") |
| `tanggal` | `TEXT` | NOT NULL | Tanggal KBM format ISO string `YYYY-MM-DD` |
| `materi` | `TEXT` | NULLABLE | Ringkasan materi (Legacy/Dual-write fallback) |
| `kegiatan` | `TEXT` | NULLABLE | Uraian kegiatan pembelajaran (Legacy/Dual-write) |
| `absensi_siswa` | `TEXT` | NULLABLE | Stringified JSON map kehadiran murid `{"NISN": "H"\|"S"\|"I"\|"A"}` |
| `kehadiran_murid` | `TEXT` | NULLABLE | Ringkasan teks statistik kehadiran (`Total murid: X, Hadir: Y...`) |
| `keterangan` | `TEXT` | NULLABLE | Jenis jurnal (`Jurnal KBM`, `Jurnal Kegiatan`, atau prefix INVAL) |
| `refleksi` / `catatan_refleksi` | `TEXT` | NULLABLE | Catatan evaluasi/refleksi guru |
| `link_bukti_foto` / `foto_kegiatan` | `TEXT` | NULLABLE | URL foto bukti pembelajaran (Google Drive / Base64 preview) |
| `status_verifikasi` | `TEXT` | DEFAULT 'Menunggu' | Status audit admin (`Menunggu`, `Disetujui`, `Ditolak`) |
| `catatan_khusus_siswa` | `TEXT` | NULLABLE | Catatan individual siswa |
| `pertemuan_ke` | `TEXT` | NULLABLE | Nomor pertemuan KBM |
| `jam_ke` | `TEXT` | NULLABLE | Jam pelajaran (misal: "1-2", "3") |
| `tujuan_pembelajaran` | `TEXT` | NULLABLE | Capaian tujuan pembelajaran Kurikulum Merdeka |
| `kktp` | `TEXT` | NULLABLE | Kriteria Ketercapaian Tujuan Pembelajaran |
| `konten` | `TEXT` | NULLABLE | Topik materi/konten pembelajaran modern |
| `materi_pembelajaran` | `TEXT` | NULLABLE | Nama materi kurikulum standar |
| `kegiatan_pembelajaran` | `TEXT` | NULLABLE | Uraian kegiatan pembelajaran modern |
| `lokasi_kbm` / `lokasi` | `TEXT` | NULLABLE | Ruang atau tempat pelaksanaan KBM |
| `latitude` / `longitude` | `NUMERIC(10, 7)` | NULLABLE | Koordinat geolokasi saat pengisian |
| `waktu_upload` | `TEXT` | NULLABLE | Timestamp waktu upload |
| `catatan_admin` / `alasan_penolakan` | `TEXT` | NULLABLE | Feedback penolakan dari verifikator |

---

## 3. Pemetaan Modul Konsumen & Penilaian Risiko Regresi

Perubahan pada data jurnal KBM dapat berdampak luas pada sistem. Berikut adalah pemetaan 15 modul/komponen konsumen beserta strategi mitigasi risiko degradasinya:

| Modul Konsumen | File Komponen | Data yang Dikonsumsi | Ekspektasi Perilaku | Risiko Regresi & Mitigasi |
|---|---|---|---|---|
| **1. Form Input Guru** | `src/components/GuruJurnal.tsx` | `jurnal_pembelajaran` (query sesi hari ini) | Menghubungkan sesi absensi dan materi jurnal dalam satu record terpadu. | **TINGGI**: Jangan pisahkan ID sesi; update record yang sama jika absensi sudah tersimpan terlebih dahulu. |
| **2. Cetak Jurnal KBM** | `src/components/RekapJurnalView.tsx` | Seluruh baris `jurnal_pembelajaran` guru periode terpilih | Menampilkan seluruh sesi mengajar guru di semua kelas binaan dan reguler tanpa ada yang terpotong. | **KRITIS**: Jangan filter `kelas` di mode pribadi kecuali user secara eksplisit memilih kelas tertentu di dropdown. |
| **3. Dashboard Guru** | `src/components/HomeViewGuru.tsx` & `src/lib/workflow.ts` | `getGuruDailyState` -> `jurnalKBM` | Menampilkan lencana jadwal KBM ("Sudah Diisi", "Hanya Absensi", "Belum Diisi"). | **TINGGI**: `hasJournalContent()` harus memvalidasi bahwa materi/konten bukan placeholder `-`. |
| **4. Presensi Pulang Guru** | `src/components/GuruPresensi.tsx` | `canTeacherPresensiPulang()` | Membuka kunci tombol checkout jika seluruh jadwal KBM hari ini telah diisi jurnalnya. | **TINGGI**: Sesi yang baru berstatus absensi-saja tidak boleh membuka checkout pulang sebelum jurnal diselesaikan. |
| **5. Verifikasi Admin & Kepsek** | `src/components/AdminVerifView.tsx` | `jurnal_pembelajaran` (filter `isRealSubmittedJournal`) | Hanya menampilkan jurnal yang sudah tuntas diisi materi & foto; tidak menampilkan draft absensi. | **SEDANG**: Filter `isRealSubmittedJournal` harus tetap mengecualikan record dengan `materi === '-' && kegiatan === '-'`. |
| **6. Rekapitulasi Admin/Kepsek** | `src/components/AdminRekapView.tsx` | `jurnal_pembelajaran` (`status_verifikasi = 'Disetujui'`) | Menghitung total jam KBM yang terlaksana untuk laporan dinas/penggajian. | **SEDANG**: Status verifikasi otomatis (`Disetujui`) saat form lengkap harus tetap disematkan. |
| **7. Supervisi Kelas Binaan (Wali Kelas)** | `src/components/RekapJurnalView.tsx` (`mode = 'kelas'`) | `jurnal_pembelajaran` (filter `kelas`) | Menampilkan tabel 8-kolom jurnal seluruh guru yang mengajar di kelas perwalian tersebut. | **SEDANG**: Tab mode `'kelas'` harus tetap terisolasi pada `activeKelas` wali kelas tanpa mengganggu mode `'pribadi'`. |
| **8. Rekap Kehadiran Siswa** | `src/components/RekapSiswaView.tsx` | `jurnal_pembelajaran.absensi_siswa` | Mengagregasi persentase kehadiran siswa (H/I/S/A) dari seluruh mapel. | **SEDANG**: Format JSON map pada `absensi_siswa` harus tetap valid string JSON standar. |
| **9. Gradebook / Buku Nilai** | `src/components/GradebookView.tsx` | `jurnal_pembelajaran` | Korelasi antara materi KBM dan asesmen capaian pembelajaran. | **RENDAH**: Tidak terpengaruh asalkan nama kelas dan mapel konsisten. |
| **10. Riwayat Guru** | `src/components/HistoryView.tsx` | `jurnal_pembelajaran` | Garis waktu aktivitas harian guru. | **RENDAH**: Kompatibel dengan pembacaan dual-write materi dan konten. |
| **11. Aturan Bolos Otomatis** | `src/lib/attendanceAlpa.ts` & `GuruJurnal.tsx` | `public.absensi` & `jurnal_pembelajaran` | Mengubah status siswa Hadir pagi menjadi 'Bolos' jika dialpakan pada KBM. | **SEDANG**: Pastikan `tgl` valid digunakan pada sinkronisasi status bolos. |
| **12. Sistem Peringatan Dini** | `src/lib/warningSystem.ts` | `jurnal_pembelajaran` | Peringatan akumulasi guru tidak mengisi jurnal KBM. | **RENDAH**: Query berdasarkan rentang tanggal dan `user_id`. |
| **13. Reminder Push Notification** | `src/app/api/push/send-reminders/route.ts` | `jurnal_pembelajaran` | Notifikasi otomatis pengingat jurnal belum lengkap di jam pulang. | **RENDAH**: Membaca jumlah jurnal hari ini. |
| **14. Dashboard Dinas Pendidikan** | `src/components/DinasDashboard.tsx` | Agregat `jurnal_pembelajaran` per `sekolah_id` | Memonitor kepatuhan administrasi KBM antar sekolah. | **RENDAH**: Membaca volume entri terverifikasi per sekolah. |
| **15. Ekspor CSV / Excel Jurnal** | `src/components/RekapJurnalView.tsx` | `filteredJurnal` | Mengunduh file spreadsheet berformat resmi. | **SEDANG**: Header kolom spreadsheet harus mencerminkan data 12-kolom guru secara lengkap. |

---

## 4. Analisis Mendalam Akar Masalah (Root Causes)

### 4.1 Mengapa Jurnal KBM Guru Tidak Bisa Disimpan (R1)

Investigasi pada `src/components/GuruJurnal.tsx` mengidentifikasi faktor-faktor kunci berikut:

1. **Kondisi Form Terkunci (`isLocked`) yang Terlalu Dini**:
   - Baris 1908: `const isLocked = !!(dailyState?.isLibur || (dailyState && !dailyState.canOpenJurnal && !hasRejectedJurnal) || hasNoKbmAssignments);`
   - Pada baris 1904: `const hasNoKbmAssignments = tipeJurnal === 'Jurnal KBM' && !isFetchingAssignments && mapelList.length === 0 && !kelas && !mapel && user?.role !== 'Admin';`
   - Bila seorang guru membuka form sebelum state penugasan (`myAssignments`) selesai dimuat, atau saat koneksi lambat menyebabkan `mapelList` kosong sesaat, `hasNoKbmAssignments` dapat bernilai `true` dan mengunci input.
   - Lebih lanjut, bila guru belum melakukan "Presensi Datang", `dailyState.canOpenJurnal` bernilai `false`, menyebabkan formulir menjadi buram (`opacity-50 pointer-events-none`) dan tombol submit dinonaktifkan (`disabled`).
2. **Kegagalan Pencarian & Rekonsiliasi Sesi KBM Terpadu**:
   - Pada baris 1583–1638: Ketika guru telah menyimpan absensi di sub-mode `absensi` (yang mencatat entri awal dengan `materi: '-'`), guru kemudian berpindah ke sub-mode `jurnal` untuk mengisi materi, KKTP, tujuan pembelajaran, dan dokumentasi.
   - Query pencarian sesi menggunakan:
     ```ts
     existingSessionQuery.or(`user_id.eq.${targetSearchUserId},nama_guru.ilike."%${searchEffectiveName}%"`);
     ```
   - Karakter kutip dan token nama pada klausa `.or()` PostgREST dapat gagal mencocokkan jika nama guru mengandung gelar atau tanda baca (misal: `"Budi Santoso, S.Kom."`).
   - Apabila sesi tidak ditemukan, sistem mengeksekusi `insert` baru (`supabase.from('jurnal_pembelajaran').insert([newJurnal])`) alih-alih `update`. Ini dapat memicu konflik atau menghasilkan dua baris terpisah untuk hari/kelas/mapel yang sama (satu baris berisi absensi kosong materi, satu baris berisi materi kosong absensi).
3. **Payload Dual-Write Tidak Lengkap (`kegiatan_pembelajaran`)**:
   - Objek `newJurnal` (baris 1526–1559) menulis `materi: finalKonten`, `materi_pembelajaran: finalKonten`, `konten: finalKonten`, `kegiatan: kegiatan`, namun **tidak menyertakan `kegiatan_pembelajaran: kegiatan`**. Komponen yang mengutamakan kolom `kegiatan_pembelajaran` akan membaca nilai `null` atau `'-'`.
4. **Resiliensi Fallback Multi-Tenant `sekolah_id`**:
   - Baris 1558: `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})`.
   - Kolom `sekolah_id` pada basis data adalah `NOT NULL`. Jika objek `user` dari session storage kehilangan field `sekolah_id`, PostgreSQL akan menolak operasi penyimpanan (`null value in column "sekolah_id" violates not-null constraint`). Berbeda dengan `handleSaveAbsensiOnly` yang memiliki fallback aman, `newJurnal` perlu menjamin fallback tenant yang konsisten.

### 4.2 Mengapa Data Jurnal Guru Hilang pada Cetak Jurnal KBM (R2)

Investigasi pada `src/components/RekapJurnalView.tsx` dan git log commit `7e4cf9d` mengungkap akar penyebab yang sangat spesifik:

1. **Auto-Populate Filter Kelas Menimpa Query Mode Pribadi**:
   - Di `RekapJurnalView.tsx` baris 342–348:
     ```tsx
     if (isAdmin || isKepalaSekolah || assignedWalis.length > 0) {
       setIsWaliKelas(true);
       setWaliClasses(assignedWalis);
       if (!isAdmin && !isKepalaSekolah && assignedWalis.length > 0) {
         setKelas(prev => prev || assignedWalis[0]);
       }
     }
     ```
   - Dan di baris 425–427 pada `tarikRekap`:
     ```tsx
     if (activeMode === 'kelas') {
       if (!isAdmin && !isKepalaSekolah && waliClasses.length > 0) {
         query = query.eq('kelas', activeKelas || waliClasses[0]);
       } else if (activeKelas) {
         query = query.eq('kelas', activeKelas);
       }
     } else if (activeKelas) {
       query = query.eq('kelas', activeKelas);
     }
     ```
   - **Mekanisme Bug**: Mayoritas guru SMP/SMA juga ditugaskan sebagai Wali Kelas untuk satu kelas tertentu (misal Kelas 7A). Namun guru tersebut mengajar mata pelajarannya di 4 sampai 6 kelas paralel (misal 7A, 7B, 7C, 8A, 8B).
   - Ketika guru mengklik menu **"Cetak Jurnal KBM"**, komponen `RekapJurnalView` dimuat dalam mode pribadi (`tabMode === 'pribadi'`). Karena `fetchMaster` mendeteksi guru adalah Wali Kelas, state `kelas` secara otomatis diisi dengan `assignedWalis[0]` (misal `"7A"`).
   - Akibatnya, query PostgREST menambahkan klausa `.eq('kelas', '7A')`. Seluruh jurnal yang telah diisi oleh guru tersebut di kelas 7B, 7C, 8A, 8B **tidak terambil oleh query basis data** dan hilang dari tabel cetak! Guru mengira data jurnal mengajar mereka hilang, padahal data tersebut terfilter secara keliru oleh penugasan wali kelas.
2. **Kesesuaian Kolom Tabel Cetak 12-Kolom**:
   - Format cetak dokumen jurnal pribadi guru (`tabMode === 'pribadi'`) menggunakan 12 kolom standar (baris 1690–1706):
     `No`, `Hari/Tanggal`, `Tujuan Pembelajaran`, `KKTP`, `Konten`, `Kegiatan Pembelajaran`, `Kelas`, `Mata Pelajaran`, `Absensi Murid (H/I/S/A)`, `Lokasi KBM`, `Foto Dokumentasi`, `Catatan`.
   - Logika render kolom harus memiliki fallback berjenjang:
     * Kolom Konten/Materi: `j.konten || j.materi_pembelajaran || j.materi || '-'`
     * Kolom Kegiatan: `j.kegiatan_pembelajaran || j.kegiatan || '-'`
     * Kolom Absensi: `formatAttendanceSummary(j.absensi_siswa, j.detail_absen, j.kehadiran_murid)`
     * Kolom Foto: `j.foto_kegiatan || j.link_bukti_foto || '-'`

---

## 5. Evaluasi Interaksi Antara R1 (Penyimpanan) dan R2 (Pencetakan)

Hubungan antara perbaikan penyimpanan jurnal (R1) dan pemulihan tampilan cetak (R2) memiliki sifat mutual:

```
[Guru Input / Simpan Jurnal KBM] (R1)
             |
             | Menulis: user_id, nama_guru, kelas, mapel, tanggal,
             |          konten, kktp, tujuan_pembelajaran,
             |          kegiatan, kegiatan_pembelajaran,
             |          absensi_siswa, kehadiran_murid, foto
             v
   [public.jurnal_pembelajaran]
             |
             | Membaca: query filter periode & guru
             |          tanpa over-filtering kelas tak disengaja
             v
[Tampilan & Cetak Jurnal KBM] (R2)
```

1. **Jaminan Kontrak Data (Data Contract Consistency)**:
   Jika R1 melakukan dual-write secara lengkap (`materi`, `materi_pembelajaran`, `konten`, `kegiatan`, `kegiatan_pembelajaran`), maka R2 dijamin dapat membaca dan merender dokumen cetak secara sempurna baik untuk data baru maupun data historis/warisan (backward compatibility).
2. **Satu Sesi Tunggal Terpadu (Single Unified Session)**:
   Penyimpanan absensi dan materi KBM yang disatukan dalam satu baris record di `jurnal_pembelajaran` mencegah timbulnya baris ganda (duplikat) di lembar cetak dokumen R2. Sesi KBM tampil rapi, satu baris per jam KBM, dengan absensi murid dan dokumentasi lengkap berdampingan.
3. **Pemisahan Filter Mode Pribadi vs Mode Supervisi Kelas**:
   Di R2, ketika guru bertindak sebagai Guru Mapel yang mencetak jurnal pribadinya, filter kelas harus bersifat opsional (default: "Semua Kelas yang Diajar"). Filter kelas hanya diwajibkan secara otomatis ketika berada di mode Supervisi Kelas Binaan (`tabMode === 'kelas'`).

---

## 6. Rencana Verifikasi Objektif (Acceptance Test Plan & Automated Test Suite)

Untuk membuktikan secara terukur bahwa kedua kendala telah teratasi tanpa regresi, dirancang strategi pengujian dengan 4 pilar utama.

### 6.1 Matriks Kriteria Penerimaan (Acceptance Criteria)

| ID Uji | Target Fitur | Kondisi Prasyarat | Aksi Uji | Ekspektasi Hasil Objektif |
|---|---|---|---|---|
| **AC-01** | Simpan Jurnal KBM Baru (Direct Save) | Guru memiliki jadwal, belum pernah input absensi | Isi materi, KKTP, tujuan pembelajaran, kegiatan, lokasi, foto, submit | Record baru tercipta di `jurnal_pembelajaran` dengan seluruh field lengkap, status auto-approved 'Disetujui', toast sukses muncul. |
| **AC-02** | Simpan Jurnal KBM setelah Absensi Selesai (2-Phase Save) | Guru telah menyimpan absensi mandiri (`materi: '-'`) | Beralih ke form jurnal, isi konten & foto, submit Simpan Jurnal KBM | Record eksisting diperbarui (ID tetap sama), data absensi siswa tidak terhapus/tertimpa, materi & kegiatan terisi penuh. |
| **AC-03** | Pembukaan Kunci Presensi Pulang | Jurnal KBM tersimpan | Evaluasi `canTeacherPresensiPulang()` | Bernilai `true`; guru dapat melakukan presensi pulang tanpa terganjal. |
| **AC-04** | Cetak Jurnal KBM Guru Multi-Kelas | Guru mengajar di Kelas 7A, 7B, 8A; Guru juga Wali Kelas 7A | Masuk ke menu "Cetak Jurnal KBM" (mode pribadi) | Data jurnal dari **seluruh kelas (7A, 7B, 8A) muncul lengkap**; tidak terfilter hanya ke 7A. |
| **AC-05** | Integritas Render Dokumen 12 Kolom | Jurnal KBM berisi data baru dan legacy | Render tabel print dan verifikasi 12 kolom | Tidak ada kolom kosong/blank tanda strip bila salah satu pasangan dual-write (`konten`/`materi`, `kegiatan`/`kegiatan_pembelajaran`) tersedia. |
| **AC-06** | Non-Regresi: Verifikasi Admin | Draft absensi (`materi: '-'`) vs Jurnal KBM tuntas | Evaluasi antrean di `AdminVerifView` | Draft absensi diabaikan dari antrean verifikasi; jurnal KBM tuntas muncul di antrean admin. |
| **AC-07** | Non-Regresi: Rekap Bulanan Admin | Entri jurnal KBM terverifikasi | Evaluasi agregasi di `AdminRekapView` | Jam KBM terhitung akurat sesuai jadwal mengajar. |
| **AC-08** | Non-Regresi: Supervisi Wali Kelas | Wali kelas membuka tab 'supervisi-kelas' | Render tabel kelas binaan | Tampil tabel 8-kolom kelas binaan dengan seluruh entri guru di kelas tersebut. |

---

## 7. Rekomendasi Solusi Teknis / Ponytail Fix Strategy

Untuk implementer yang akan mengeksekusi perbaikan kode, berikut usulan perbaikan minimalis dan presisi sesuai filosofi `/ponytail` (sederhana, zero bloat, tepat sasaran):

### 7.1 Perbaikan di `src/components/GuruJurnal.tsx`

1. **Pastikan `kegiatan_pembelajaran` disertakan pada `newJurnal`**:
   ```ts
   // Pada pembentukan objek newJurnal:
   kegiatan: kegiatan,
   kegiatan_pembelajaran: kegiatan, // Tambahkan dual-write untuk kompatibilitas cetak
   ```
2. **Fallback `sekolah_id` yang aman**:
   ```ts
   sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
   ```
3. **Penyelarasan Query Sesi Eksisting**:
   Pastikan query PostgREST untuk pencarian sesi eksisting menangani variasi nama tanpa menyebabkan PostgREST syntax error bila terdapat karakter khusus.

### 7.2 Perbaikan di `src/components/RekapJurnalView.tsx`

1. **Isolasi Auto-Populate `setKelas` Khusus Mode Kelas**:
   Pada `fetchMaster` baris 345–347:
   ```ts
   // SEBELUM:
   if (!isAdmin && !isKepalaSekolah && assignedWalis.length > 0) {
     setKelas(prev => prev || assignedWalis[0]);
   }

   // SESUDAH (/ponytail):
   // Hanya pasang default wali kelas jika tab mode adalah 'kelas' (Supervisi Kelas Binaan).
   // Pada mode 'pribadi' (Cetak Jurnal Saya), biarkan kelas kosong agar seluruh kelas yang diajar tampil lengkap.
   if (!isAdmin && !isKepalaSekolah && assignedWalis.length > 0 && effectiveMode === 'kelas') {
     setKelas(prev => prev || assignedWalis[0]);
   }
   ```
2. **Kondisional Filter Kelas pada `tarikRekap`**:
   Pada `tarikRekap` baris 419–427:
   ```ts
   if (activeMode === 'kelas') {
     if (!isAdmin && !isKepalaSekolah && waliClasses.length > 0) {
       query = query.eq('kelas', activeKelas || waliClasses[0]);
     } else if (activeKelas) {
       query = query.eq('kelas', activeKelas);
     }
   } else if (activeKelas && activeKelas !== '') {
     // Di mode pribadi, hanya filter kelas jika guru sengaja memilih kelas spesifik dari dropdown filter
     query = query.eq('kelas', activeKelas);
   }
   ```

---

## 8. Ringkasan Kesimpulan Investigasi

1. **Arsitektur Basis Data**: `jurnal_pembelajaran` adalah tabel tunggal kanonikal; penyebutan `jurnal_kbm` dan `jurnal_guru` merujuk pada baris-baris dalam tabel tersebut.
2. **Penyimpanan (R1)**: Kegagalan simpan dipicu oleh proteksi form penguncian `isLocked` yang terpicu prematur, hilangnya kolom `kegiatan_pembelajaran`, dan query pencarian sesi yang dapat gagal mengenali sesi absensi sebelumnya pada nama bergelar.
3. **Cetak (R2)**: Hilangnya data jurnal guru pada Cetak Jurnal KBM disebabkan oleh pre-set `setKelas(assignedWalis[0])` di `fetchMaster` yang menyaring query basis data hanya pada 1 kelas wali saja, mengeliminasi seluruh kelas lain yang diajar guru tersebut.
4. **Verifikasi**: Telah dirancang acceptance test criteria dan spesifikasi automated test suite untuk menjamin perbaikan R1 dan R2 terverifikasi secara objektif dan bebas dari regresi.

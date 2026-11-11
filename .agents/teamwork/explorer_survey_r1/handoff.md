# Laporan Investigasi Mendalam: Requirement R1 (Kebijakan Presensi Guru & Staf TU Tanpa Jam KBM)

## 1. Observation

### 1.1 Lokasi Pengaturan Admin Kebijakan Guru
- **File**: `src/components/AdminConfigView.tsx`
- **Tab Identifier**: `activeTab === 'kehadiran'` (label: "Kebijakan Guru", icon: `fa-solid fa-user-check`, baris 76 & 690–895).
- **Elemen UI Saat Ini**:
  1. **Aturan Kehadiran Guru Global (baris 696–717)**:
     - Dropdown select `config.aturan_kehadiran_guru` dengan dua opsi:
       - `Semua_Hari`: "Semua_Hari (Wajib Hadir Setiap Hari)"
       - `Hari_Mengajar_Saja`: "Hari_Mengajar_Saja (Wajib Hadir Hanya di Hari Mengajar)"
     - Teks deskripsi saat ini (baris 711–715):
       ```tsx
       {config.aturan_kehadiran_guru === 'Hari_Mengajar_Saja'
         ? 'Mode Hari Mengajar Saja: Guru yang tidak memiliki jadwal KBM atau tugas piket pada hari berjalan dibebaskan dari kewajiban presensi dan tidak dihitung sebagai Alpa.'
         : 'Mode Semua Hari: Seluruh guru wajib hadir dan melakukan presensi pada setiap hari aktif sekolah.'
       }
       ```
     - **Temuan**: Sama sekali belum ada keterangan atau penegasan mengenai status Guru dan Staf TU yang tidak memiliki jam KBM.
  2. **Pengecualian Kehadiran Guru (Model B - Eksplisit per Guru) (baris 719–894)**:
     - Memuat daftar guru dari tabel `data_guru` (baris 173).
     - Tombol aksi massal (baris 732–750):
       - `Set Semua Hadir Setiap Hari`: `onClick={() => setExemptTeacherIds([])}`
       - `Set Semua Hanya Hari KBM`: `onClick={() => setExemptTeacherIds(guruList.map(g => g.id).filter(Boolean))}`
     - **Temuan Masalah**: Tombol `Set Semua Hanya Hari KBM` secara membabi-buta menyetel **seluruh entri** di `guruList` ke `wajib_hadir_hanya_mengajar = true`, termasuk akun staf Tata Usaha (`mata_pelajaran: 'Tata Usaha (Administrasi)'`) dan guru yang tidak memiliki jam KBM sama sekali di `jadwal_pelajaran`.

### 1.2 Penyimpanan Kebijakan di Database & Alur Penyimpanan Admin
- **Tabel & Kolom Database**:
  1. `public.pengaturan`:
     - Row key `aturan_kehadiran_guru`: nilai `'Semua_Hari'` atau `'Hari_Mengajar_Saja'`. Juga tersimpan pada kolom `aturan_kehadiran_guru` di tabel `pengaturan`.
     - Row key `guru_hanya_mengajar`: JSON string array ID guru yang dikecualikan (misal `["uuid-1", "uuid-2"]`).
  2. `public.data_guru`:
     - Kolom `wajib_hadir_hanya_mengajar`: `BOOLEAN DEFAULT FALSE`.
       - `true`: Dikecualikan (hanya wajib hadir jika ada jadwal KBM atau tugas piket).
       - `false`: Wajib hadir setiap hari kerja.
       - `null` (legacy): Fallback ke `pengaturan.guru_hanya_mengajar` dan `pengaturan.aturan_kehadiran_guru`.
- **Mekanisme Simpan di AdminConfigView.tsx (baris 347–500)**:
  - Menyaring ID ke `exemptIds` dan `nonExemptIds`.
  - Melakukan `upsert` ke tabel `pengaturan` (baris 355–378).
  - Melakukan update massal ke tabel `data_guru` (baris 486–492):
    ```typescript
    if (exemptIds.length > 0) {
      await supabase.from('data_guru').update({ wajib_hadir_hanya_mengajar: true }).in('id', exemptIds);
    }
    if (nonExemptIds.length > 0) {
      await supabase.from('data_guru').update({ wajib_hadir_hanya_mengajar: false }).in('id', nonExemptIds);
    }
    ```
  - Memancarkan Custom Event `sipjam:config_updated` dan sinkronisasi realtime (baris 526–550).

### 1.3 Perhitungan dan Tampilan "Bebas Presensi" / "Bebas Hadir"
1. **Di `src/lib/workflow.ts` (`getGuruDailyState`)**:
   - Baris 1190–1206: Evaluasi `isTeacherExempt`:
     ```typescript
     if (explicitTeacherSetting === false) {
       isTeacherExempt = false;
     } else if (explicitTeacherSetting === true) {
       isTeacherExempt = true;
     } else {
       if (aturanKehadiran === 'Hari_Mengajar_Saja') {
         isTeacherExempt = true;
       }
     }
     ```
   - Baris 1502–1520:
     ```typescript
     const hasTeachingObligation = (state.isBlok && !isTeacherExempt) || state.jadwalKBM.length > 0 || state.isPiket;

     if (!state.presensiDatang) {
       if (isTeacherExempt) {
         if (!hasTeachingObligation) {
           state.isNonTeachingDay = true;
           state.bebasAlpa = true;
           state.isAlpa = false;
           state.lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).';
           return state;
         }
       }
     }
     ```
2. **Di `src/components/HomeViewGuru.tsx`**:
   - Baris 421–426 (Step 1 Presensi Datang):
     ```typescript
     if (dailyState.isNonTeachingDay) {
       if (!dailyState.presensiDatang) {
         steps.push({ label: 'Bebas Presensi', status: 'skipped', detail: 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran)', icon: 'fa-calendar-check' });
         return steps;
       }
     }
     ```
   - Baris 491–492 (Step 3 Jurnal):
     ```typescript
     } else if (dailyState.isNonTeachingDay || (dailyState.aturanKehadiran === 'Hari_Mengajar_Saja' && (!dailyState.jadwalKBM || dailyState.jadwalKBM.length === 0))) {
       steps.push({ label: 'Bebas Jurnal', status: 'skipped', detail: 'Tidak ada jadwal mengajar hari ini', icon: 'fa-book-journal-whills' });
     ```
   - Baris 563:
     ```typescript
     if (dailyState.isNonTeachingDay && !dailyState.presensiDatang) return { text: 'Hari ini Anda tidak memiliki jadwal mengajar (Bebas Presensi, Jurnal, dan Piket).', color: 'text-blue-600 dark:text-blue-400' };
     ```
   - Baris 1056–1070:
     Menampilkan Card Hero "Bebas Presensi Hari Ini" ("Anda tidak memiliki jadwal mengajar hari ini. Anda bebas presensi, alpa, dan jurnal.").
3. **Di `src/components/AdminVerifView.tsx` (baris 859–872)**:
   ```typescript
   const isTeacherExempt = isExplicitExempt || (!hasExplicitSetting && (isLegacyInList || aturanGlobal === 'Hari_Mengajar_Saja'));
   const isFreeFromPresence = isTeacherExempt && scheduledClasses.length === 0 && !hasPiketToday;
   // Menetapkan status_label & status_verifikasi: 'Bebas Hadir'
   ```
4. **Di `src/components/HomeViewAdmin.tsx` (baris 402–442)**:
   ```typescript
   const isExemptNonTeaching = isTeacherExempt && targetCount === 0;
   const isFreeFromPresence = isSchoolDayOff ? false : (isExemptNonTeaching && !hasPiketDuty);
   let presensiDatangStatus = isSchoolDayOff ? 'Libur' : isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang';
   ```
5. **Di `src/lib/attendanceAlpa.ts` (baris 410–447)**:
   ```typescript
   if (isTeacherExempt) {
     if (!hasTeachingToday && !hasPiketDuty) {
       continue; // Tidak wajib hadir, bebas Alpa
     }
   }
   ```

### 1.4 Fakta Perlakuan Staf TU dan Guru Tanpa Jam KBM
- **Staf Tata Usaha (TU)**:
  - Didaftarkan di tabel `users` dengan `role: 'tata_usaha'` dan di tabel `data_guru` dengan `mata_pelajaran: 'Tata Usaha (Administrasi)'` (`AdminPenggunaView.tsx` baris 69, 243, 405).
  - Staf TU **tidak memiliki jadwal KBM** di `jadwal_pelajaran`.
  - Jika sekolah memilih `Hari_Mengajar_Saja` atau admin menekan tombol "Set Semua Hanya Hari KBM", staf TU ikut di-set `wajib_hadir_hanya_mengajar = true`.
  - Akibatnya, pada tampilan Admin Verifikasi (`AdminVerifView.tsx`) dan Dashboard Admin (`HomeViewAdmin.tsx`), staf TU terbaca sebagai **`Bebas Hadir`** dan tidak tercatat alpa di `attendanceAlpa.ts`!
  - Di `src/components/HomeViewTU.tsx` (baris 23–38, 301–322, 481–622):
    - Alur TU saat ini: Step 1 Presensi Datang -> Step 2 Jurnal Kegiatan -> Step 3 Presensi Pulang.
    - **Celah Observasi**: `HomeViewTU.tsx` saat ini **belum memeriksa tugas piket** (`penugasan_piket` / `jadwal_piket` dan `laporan_piket`), sehingga jika staf TU ditugaskan piket, antarmuka mereka belum menyediakan step "Laporan Piket" dan `canPresensiPulang` belum mensyaratkan penyelesaian laporan piket.
- **Guru Tanpa Jam KBM**:
  - Guru yang tidak memiliki jadwal mengajar di `jadwal_pelajaran` (atau memiliki 0 jam mengajar).
  - Jika kebijakan sekolah adalah `Hari_Mengajar_Saja` (atau guru tersebut ditandai `wajib_hadir_hanya_mengajar = true`), karena jadwalnya 0 jam setiap hari, guru tersebut akan **permanen berstatus "Bebas Presensi" setiap hari**!
  - Sebaliknya, jika guru tersebut disetel ke **"Wajib Hadir Setiap Hari"** (`isTeacherExempt = false`), alur kerja di `HomeViewGuru.tsx` dan `workflow.ts` (baris 502–510 & 1758–1762) secara otomatis:
    1. Meminta **Presensi Datang**
    2. Meminta **Laporan Piket** (jika `dailyState.isPiket` bernilai true)
    3. Mengalihkan pengisian jurnal ke **Jurnal Kegiatan** (`jadwalKBM.length === 0`)
    4. Membuka **Presensi Pulang** setelah Jurnal Kegiatan dan Piket (jika ada) selesai!

---

## 2. Logic Chain

1. **Akar Masalah "Bebas Presensi"**:
   - `workflow.ts`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, dan `attendanceAlpa.ts` mengevaluasi pembebasan presensi dengan logika:
     `isTeacherExempt && scheduledClasses.length === 0 && !hasPiketToday`.
   - Logika ini mengasumsikan siapa pun yang tidak mengajar hari ini dibebaskan jika berstatus `Hari_Mengajar_Saja`.
   - Namun, bagi pengguna yang **tidak memiliki jam KBM sama sekali** (Staf TU dan Guru tanpa jadwal KBM), penerapan status `Hari_Mengajar_Saja` mengakibatkan mereka dibebaskan selamanya dari presensi harian ("Bebas Presensi / Bebas Hadir"), padahal mereka adalah tenaga kependidikan/pendidik aktif yang wajib hadir setiap hari kerja.

2. **Dua Golongan Pengguna dalam Kebijakan Kehadiran**:
   - **Golongan 1: Guru yang Hadir Sesuai KBM**:
     - Memiliki jadwal KBM di `jadwal_pelajaran`.
     - Wajib hadir hanya pada hari mereka mengajar atau bertugas piket (`Hari_Mengajar_Saja`).
     - Pada hari tidak mengajar & tidak piket, mereka bebas presensi/alpa.
   - **Golongan 2: Guru & Staf TU yang Hadir Setiap Hari (termasuk Tanpa Jam KBM)**:
     - Wajib hadir setiap hari aktif sekolah (`Semua_Hari`).
     - Tidak boleh berstatus "Bebas Presensi".
     - Alur kewajiban harian mereka:
       1. Presensi Datang
       2. Laporan Piket (jika ditugaskan piket pada hari tersebut)
       3. Jurnal Kegiatan (mengisi aktivitas harian/administrasi non-KBM)
       4. Presensi Pulang (dibuka setelah jurnal kegiatan dan piket selesai)

3. **Kebutuhan Penyesuaian di Menu Pengaturan Admin (`AdminConfigView.tsx`)**:
   - Menu pengaturan Tab 4 "Kebijakan Guru" harus mengatur dan memperjelas regulasi ini secara visual dan operasional:
     1. Menampilkan panduan kebijakan yang jelas: membedakan antara "Guru Hadir Sesuai KBM", "Guru Hadir Setiap Hari", dan "Ketentuan Khusus Guru & Staf TU Tanpa Jam KBM".
     2. Menampilkan informasi/badge identifikasi pada daftar: membedakan akun "Staf Tata Usaha", "Tanpa Jam KBM", dan "Ada Jam KBM (N Jam)".
     3. Mengamankan tombol aksi massal `Set Semua Hanya Hari KBM`: tombol ini hanya boleh mengecualikan guru yang **benar-benar memiliki jam KBM** (`hasKbm && !isTuStaff`), serta tidak boleh mengecualikan Staf TU atau Guru tanpa jam KBM.
     4. Menjaga integritas data saat tombol simpan ditekan: akun Staf TU dan Guru tanpa jam KBM dipastikan berstatus non-exempt (`wajib_hadir_hanya_mengajar = false`).

4. **Kebutuhan Penyesuaian di Alur Sistem (Workflow & Dashboard)**:
   - Di `workflow.ts`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, dan `attendanceAlpa.ts`:
     - Pengguna dengan role `tata_usaha` / mata pelajaran TU, serta guru yang tidak memiliki alokasi jam KBM di sekolah, diproteksi agar `isTeacherExempt` selalu bernilai `false` (tidak terpengaruh oleh setting global `Hari_Mengajar_Saja`).
     - Dengan demikian, mereka tidak akan pernah diberi status `isNonTeachingDay = true` atau `isFreeFromPresence = true` pada hari kerja normal.
   - Di `HomeViewTU.tsx`:
     - Menambahkan verifikasi status piket hari ini (`isPiket`, `laporanPiket`) dari tabel `penugasan_piket` / `jadwal_piket` dan `laporan_piket`.
     - Jika staf TU dijadwalkan piket, tampilkan step "Laporan Piket" dan kunci `canPresensiPulang` hingga laporan piket diisi.

---

## 3. Caveats

1. **Definisi "Guru Tanpa Jam KBM"**:
   - Seorang guru dikategorikan sebagai "Tanpa Jam KBM" jika pada semester berjalan namanya tidak terdaftar pada baris aktif manapun di tabel `jadwal_pelajaran` untuk sekolah tersebut.
   - Jika di masa mendatang admin menambahkan jadwal pelajaran baru bagi guru tersebut, sistem harus secara dinamis mengenali bahwa guru tersebut kini memiliki jam KBM dan dapat diatur opsional ke "Hanya Hari KBM".
2. **Guru Bimbingan Konseling (BK)**:
   - Guru BK diatur dalam modul tersendiri (mengisi Jurnal BK lintas kelas via `BkJurnalView.tsx`). Guru BK yang tidak memiliki jam KBM tatap muka reguler juga wajib hadir setiap hari dan mengisi Jurnal BK / Jurnal Kegiatan.
3. **Piket Staf TU**:
   - Di banyak sekolah, penugasan piket pada umumnya diberikan kepada Guru (`tipe_petugas = 'Guru'`). Namun tabel `penugasan_piket` dan `jadwal_piket` memungkinkan staf TU ditugaskan piket. Penambahan pengecekan piket di `HomeViewTU.tsx` harus bersifat kondisional (hanya muncul jika staf TU tersebut memang tercatat dalam penugasan piket hari ini).

---

## 4. Conclusion

Investigasi Requirement R1 menemukan bahwa akar penyebab guru dan staf TU tanpa jam KBM terbaca "bebas presensi" adalah:
1. Pengaturan admin kebijakan guru (`AdminConfigView.tsx` Tab 4) belum memuat regulasi eksplisit bagi guru dan staf TU tanpa jam KBM, serta tombol massal `Set Semua Hanya Hari KBM` secara keliru mengecualikan seluruh staf TU dan guru tanpa jam KBM.
2. Logika `workflow.ts`, `AdminVerifView.tsx`, dan `HomeViewAdmin.tsx` menganggap setiap pengguna dengan 0 jam KBM di bawah mode `Hari_Mengajar_Saja` sebagai `isNonTeachingDay` / `isFreeFromPresence` ("Bebas Presensi"), sehingga mereka dibebaskan dari kewajiban presensi.
3. Antarmuka `HomeViewTU.tsx` belum mengintegrasikan deteksi penugasan piket (`isPiket`), berbeda dengan `HomeViewGuru.tsx` yang sudah mendukung alur piket dan jurnal kegiatan dengan baik.

### Rekomendasi Rencana Perubahan Minimal (Targeted Solution Plan)

1. **`src/components/AdminConfigView.tsx` (Tab 4 "Kebijakan Guru")**:
   - Muat data jadwal dari `jadwal_pelajaran` saat memuat data guru untuk menghitung alokasi jam KBM per guru.
   - Tambahkan banner regulasi kebijakan resmi di Tab 4:
     - Menjelaskan aturan "Guru Hadir Sesuai KBM" vs "Guru Hadir Setiap Hari".
     - Menegaskan aturan khusus: Guru dan Staf TU tanpa jam KBM wajib hadir setiap hari kerja (melakukan presensi datang, laporan piket jika bertugas, jurnal kegiatan, dan presensi pulang), dan sistem tidak memberlakukan bebas presensi bagi mereka.
   - Tambahkan badge visual pada daftar guru: `Staf Tata Usaha`, `Tanpa Jam KBM`, atau `Ada Jam KBM (N Jam)`.
   - Perbaiki tombol `Set Semua Hanya Hari KBM`: hanya menyetel guru yang memiliki jadwal KBM (`hasKbm && !isTuStaff`).
   - Kunci/cegah staf TU dan guru tanpa jam KBM dari pensaklaran ke "Hanya Hari KBM", serta pastikan saat simpan mereka tersimpan sebagai `wajib_hadir_hanya_mengajar = false`.

2. **`src/lib/workflow.ts` (`getGuruDailyState`)**:
   - Pastikan staf TU (`mata_pelajaran` memuat 'tata usaha' atau role `tata_usaha`) dan guru yang tidak memiliki jadwal KBM sama sekali di `jadwal_pelajaran` selalu memiliki `isTeacherExempt = false`.
   - Hal ini menjamin mereka tidak pernah masuk ke cabang `state.isNonTeachingDay = true` / `state.bebasAlpa = true` pada hari kerja aktif.
   - Ketika `state.jadwalKBM.length === 0` dan guru/staf non-exempt, alur mewajibkan `jurnalKegiatan` untuk membuka presensi pulang.

3. **`src/components/HomeViewTU.tsx`**:
   - Tambahkan deteksi tugas piket hari ini dari `penugasan_piket` / `jadwal_piket` dan laporan dari `laporan_piket`.
   - Jika staf TU ditugaskan piket (`isPiket`):
     - Tampilkan step `Laporan Piket` di workflow widget.
     - Syaratkan penyelesaian laporan piket pada perhitungan `canPresensiPulang`.

4. **`src/components/AdminVerifView.tsx`, `src/components/HomeViewAdmin.tsx`, & `src/lib/attendanceAlpa.ts`**:
   - Pertegas bahwa evaluasi `isTeacherExempt` / `isFreeFromPresence` ("Bebas Hadir") tidak berlaku untuk staf TU atau pengguna tanpa jam KBM, sehingga kehadiran mereka selalu dipantau harian.

---

## 5. Verification Method

### 5.1 Perintah Pengujian Regresi & Validasi
Jalankan seluruh rangkaian tes proyek untuk memastikan tidak ada efek samping yang merusak fungsionalitas yang ada:
```powershell
npm test
```

### 5.2 Pengujian Unit & Integrasi Khusus R1
Buat berkas uji verifikasi komprehensif, misalnya `tests/kebijakan_guru_dan_tu_tanpa_kbm.test.ts`, yang menguji:
1. **AdminConfigView Policy Display & Classification**:
   - Memastikan tab Kebijakan Guru menampilkan panduan kehadiran bagi guru sesuai KBM, guru hadir setiap hari, dan guru/staf TU tanpa jam KBM.
   - Memastikan staf TU dan guru tanpa jam KBM terklasifikasi jelas dengan badge yang sesuai.
   - Memastikan tombol massal `Set Semua Hanya Hari KBM` tidak mengecualikan staf TU atau guru tanpa jam KBM.
2. **Eliminasi Status Bebas Presensi**:
   - Menguji bahwa staf TU tidak pernah berstatus `isNonTeachingDay: true` atau `bebasAlpa: true` di hari aktif.
   - Menguji bahwa guru tanpa jam KBM di sekolah berstatus `Hari_Mengajar_Saja` tetap diwajibkan presensi (bukan Bebas Presensi).
3. **Alur Kerja 4 Langkah (Datang -> Piket -> Jurnal Kegiatan -> Pulang)**:
   - Presensi Datang terbuka untuk guru dan staf TU tanpa jam KBM.
   - Laporan Piket wajib diisi jika guru/staf TU ditugaskan piket.
   - Jurnal Kegiatan wajib diisi untuk membuka izin pulang.
   - Presensi Pulang berhasil terbuka hanya setelah tugas jurnal kegiatan (dan piket jika ada) terpenuhi.
4. **Verifikasi Admin & Dashboard**:
   - Memastikan staf TU dan guru tanpa jam KBM tidak lagi berstatus "Bebas Hadir" di `AdminVerifView.tsx` dan `HomeViewAdmin.tsx`.

### 5.3 Kondisi Kegagalan (Invalidation Conditions)
- Guru atau staf TU tanpa jam KBM masih memunculkan banner atau badge "Bebas Presensi" / "Bebas Hadir".
- Staf TU yang ditugaskan piket tidak melihat step "Laporan Piket" atau dapat melakukan presensi pulang tanpa mengisi laporan piket.
- Tombol `Set Semua Hanya Hari KBM` masih mengubah status staf TU menjadi `wajib_hadir_hanya_mengajar = true`.
- Tes regresi yang sudah ada mengalami kegagalan.

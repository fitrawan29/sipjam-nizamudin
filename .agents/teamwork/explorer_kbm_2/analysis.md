# Laporan Analisis Mendalam: Akar Penyebab Hilangnya Data Jurnal Guru pada Cetak Jurnal KBM

## Executive Summary
Data jurnal guru pada fitur "Cetak Jurnal KBM" hilang bukan karena data di database terhapus, melainkan akibat **kombinasi 4 filter query SQL yang terlalu kaku (rigid exact matching) dan mismatch skema/format pada fungsi `tarikRekap()` di `src/components/RekapJurnalView.tsx`**: (1) query SQL exact `.eq('mapel', mapel)` yang gagal mencocokkan nilai mapel di database yang memuat prefix kelas (misal `XI Merdeka_Matematika`) atau singkatan; (2) query SQL exact `.eq('kelas', activeKelas)` yang gagal mencocokkan relasi kelas paralel vs kelas umum (misal `XI Merdeka C` vs `XI Merdeka`); (3) filter multi-tenant `.eq('sekolah_id', user.sekolah_id)` yang secara sepihak mengeliminasi seluruh rekaman jurnal historis/warisan yang memiliki `sekolah_id IS NULL`; dan (4) auto-select mapel/kelas tunggal pada `fetchMaster()` yang secara otomatis memicu query kaku tersebut saat form dimuat. Solusi perbaikan minimal (/ponytail) adalah memindahkan pencocokan mapel dan kelas ke level in-memory menggunakan `isJurnalMatchJadwal()`, melonggarkan filter `sekolah_id` dengan klausa `.or('sekolah_id.eq...,sekolah_id.is.null')`, serta menambahkan fallback query identitas guru.

---

## 1. Problem Boundary & Scope

- **Fitur Terdampak**: Cetak Jurnal KBM (`view-guru-rekap-jurnal` dan tab `rekap-pribadi` pada `GuruJurnal.tsx` / `RekapJurnalView.tsx`).
- **Komponen Utama**:
  - `src/components/RekapJurnalView.tsx` (Fungsi `tarikRekap()`, hook `fetchMaster()`, filter `filteredJurnal`, dan tabel cetak 12 kolom mode `pribadi`).
  - `src/components/GuruJurnal.tsx` (Rendering panel `rekap-pribadi` pada lines 2783–2791).
  - `src/components/AppScreen.tsx` (Navigasi menu "Cetak Jurnal KBM" lines 1132–1149 & 1374).
  - `src/lib/workflow.ts` (Fungsi utilitas `isJurnalMatchJadwal`, `isTeacherRecordMatch`, `normalizeTeacherIdentityName`).
  - `src/lib/attendanceAlpa.ts` (Fungsi `isTeacherJournalMatch`).
  - Database Table: `public.jurnal_pembelajaran`.

---

## 2. Rantai Bukti & Kronologi Git History

Dari penelusuran git commit log:
1. **Commit `7e4cf9d`** (*feat(guru): add KBM journal print menu and filter by assigned subjects and classes*):
   - Menambahkan menu "Cetak Jurnal KBM" dan isolasi penugasan guru (`assignedMapelList`, `assignedKelasList`).
   - Memperkenalkan logika auto-select:
     ```tsx
     // lines 286-291:
     if (validAssignedMapels.length === 1) {
       setMapel(prev => prev || validAssignedMapels[0]);
     }
     if (validAssignedKelas.length === 1) {
       setKelas(prev => prev || validAssignedKelas[0]);
     }
     ```
   - Namun query SQL `tarikRekap()` menggunakan:
     ```tsx
     if (activeKelas) query = query.eq('kelas', activeKelas);
     if (mapel) query = query.eq('mapel', mapel);
     ```
     Hal ini menyebabkan guru yang hanya memiliki 1 penugasan mapel (misal "Matematika") langsung terfilter secara rigid pada database level.
2. **Commit `f012878`** (*fix(kbm): sinkronkan resolusi sesi guru, integrasikan INVAL pada attendanceAlpa & workflow, serta deduplikasi entri rekap jurnal*):
   - Mengubah query guru dari `.eq('nama_guru', user.nama)` menjadi `.or(user_id.eq.${user.id},nama_guru.ilike."%${firstToken}%"...)` dan menambahkan post-filter `isTeacherRecordMatch()`.
3. **Commit `a79793c`** s/d **`bece4f3`** (*pemisahan absensi siswa dan jurnal KBM serta perbaikan simpan jurnal*):
   - Memperbaiki pengisian dan penyimpanan jurnal pada `GuruJurnal.tsx` dengan menambahkan fallback tanpa filter `sekolah_id` (line 1609-1626) dan pencocokan sesi yang fleksibel.
   - Namun, perbaikan fleksibilitas query dan toleransi `sekolah_id IS NULL` pada `GuruJurnal.tsx` **TIDAK diimplementasikan pada `RekapJurnalView.tsx`**.

---

## 3. Investigasi Teknis Mendalam: 4 Titik Kegagalan (Root Causes)

### Root Cause 1: Exact SQL Equality pada `mapel` (`query.eq('mapel', mapel)`)
- **Lokasi Kode**: `src/components/RekapJurnalView.tsx:429`
  ```tsx
  if (mapel) query = query.eq('mapel', mapel);
  ```
- **Mekanisme Kegagalan**:
  1. Pada `data_mapel` atau penugasan kurikulum guru, mata pelajaran tercatat sebagai nama standar, misalnya `"Matematika"`, `"Kimia"`, `"Bahasa Indonesia"`.
  2. Pada database riil `jurnal_pembelajaran` (terkonfirmasi pada `csv/SIPJAM NIZAMUDIN - Jurnal_Pembelajaran (1).csv`), kolom `mapel` seringkali tersimpan dengan format gabungan kurikulum/kelas, misalnya:
     - `XI Merdeka_Matematika`
     - `X Merdeka_Matematika`
     - `X Merdeka_Bahasa Indonesia`
     - `XI Merdeka_Biologi`
     - atau singkatan seperti `B. Indonesia`, `PAI dan BP`.
  3. Ketika `mapel` terpilih (baik melalui auto-select `validAssignedMapels.length === 1` di baris 286 atau ketika guru memilih dropdown "Matematika" untuk mencetak jurnal mapel tersebut), query PostgREST mengirim:
     `SELECT * FROM jurnal_pembelajaran WHERE mapel = 'Matematika'`
  4. Hasilnya: PostgREST mengembalikan `0` baris karena `'XI Merdeka_Matematika' != 'Matematika'`. Seluruh data jurnal guru langsung lenyap.

### Root Cause 2: Exact SQL Equality pada `kelas` (`query.eq('kelas', activeKelas)`)
- **Lokasi Kode**: `src/components/RekapJurnalView.tsx:425`
  ```tsx
  } else if (activeKelas) {
    query = query.eq('kelas', activeKelas);
  }
  ```
- **Mekanisme Kegagalan**:
  1. Di sekolah dengan kelas paralel, penugasan guru di `data_siswa` / `jadwal_pelajaran` menggunakan kelas spesifik (misal `"XI Merdeka C"` atau `"X-A"`).
  2. Namun data jurnal guru di `jurnal_pembelajaran` tersimpan dengan tingkatan umum (misal `"XI Merdeka"` atau `"X Merdeka"` atau `"X A"`).
  3. Pencarian exact `.eq('kelas', 'XI Merdeka C')` menghasilkan `0` rekaman.
  4. Sementara di `src/lib/workflow.ts:893`, aplikasi sebenarnya sudah memiliki fungsi `isJurnalMatchJadwal()` yang mampu mencocokkan kelas romawi-arab dan kelas paralel secara cerdas, namun fungsi ini dilewati karena filter rigid dipaksakan di query SQL.

### Root Cause 3: Filter Multi-Tenant Rigid Mengeliminasi Jurnal Warisan (`sekolah_id IS NULL`)
- **Lokasi Kode**: `src/components/RekapJurnalView.tsx:404–406`
  ```tsx
  if (user?.sekolah_id) {
    query = query.eq('sekolah_id', user.sekolah_id);
  }
  ```
- **Mekanisme Kegagalan**:
  1. Jurnal guru yang diisi sebelum migrasi multi-tenant `20260912_multi_tenant_sekolah_rls.sql` atau yang diimpor dari CSV historis tidak memiliki nilai `sekolah_id` (`sekolah_id IS NULL`).
  2. Saat akun guru yang sedang login memiliki `user.sekolah_id`, klausa `query.eq('sekolah_id', user.sekolah_id)` mengeksekusi `WHERE sekolah_id = '...'`.
  3. Dalam logika SQL, evaluasi `NULL = 'uuid'` bernilai `NULL` (falsy). Seluruh jurnal pembelajaran lama milik guru tersebut langsung tereliminasi dan hilang dari tampilan cetak.
  4. Sebagai perbandingan, modul lain seperti `AdminRekapView.tsx:351` secara tepat menggunakan:
     `sekolah_id.eq.${user.sekolah_id},sekolah_id.is.null`
     dan `GuruJurnal.tsx:1609-1626` menyediakan query fallback tanpa batas `sekolah_id`.

### Root Cause 4: Auto-Sintesis "Tidak Masuk Kelas" Mengaburkan Tampilan
- **Lokasi Kode**: `src/components/RekapJurnalView.tsx:610–674`
  ```tsx
  const hasJournal = combined.some(j => 
    j.tanggal === dateStr &&
    isJurnalMatchJadwal(j, sched) &&
    (activeMode === 'pribadi'
      ? isTeacherJournalMatch({ nama_guru: user.nama, user_id: user.id, sekolah_id: user.sekolah_id }, j)
      : (sched.nama_guru ? isTeacherJournalMatch({ nama_guru: sched.nama_guru, sekolah_id: sched.sekolah_id }, j) : true))
  );

  if (!hasJournal) {
    missingEntries.push({
      id: `unfilled-kbm-${dateStr}-${sched.kelas}-${sched.mata_pelajaran || sched.mapel || 'kbm'}-${sched.nama_guru || 'guru'}`,
      materi: 'tidak masuk kelas',
      status_verifikasi: 'Tidak Masuk Kelas',
      ...
    });
  }
  ```
- **Mekanisme Kegagalan**:
  Karena `combined` kosong akibat Root Cause 1, 2, dan 3, loop kalender menganggap guru sama sekali belum mengisi jurnal untuk setiap jadwal KBM yang ada. Akibatnya, dokumen cetak dibanjiri oleh entri sintetis bertuliskan `"Tidak Masuk Kelas"` / `"Wajib Hadir KBM (tidak masuk kelas)"` menggantikan data jurnal riil guru yang seharusnya tercetak.

---

## 4. Rekomendasi Solusi Minimal & Tepat Sasaran (/ponytail)

Pendekatan perbaikan yang paling bersih, ringkas, dan minim risiko regresi:

### A. Longgarkan Query SQL di `tarikRekap()` (`src/components/RekapJurnalView.tsx`)
1. **Dukung Jurnal Warisan (`sekolah_id IS NULL`)**:
   Ubah filter `sekolah_id` agar menerima rekaman yang bertaut ke sekolah akun atau rekaman warisan `sekolah_id IS NULL`:
   ```tsx
   if (user?.sekolah_id) {
     query = query.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
   }
   ```
2. **Pindahkan Filter `mapel` dan `kelas` ke In-Memory Post-Processing**:
   Jangan filter `mapel` dan `kelas` dengan exact SQL `.eq()` pada level database. Biarkan database mengembalikan seluruh jurnal guru untuk rentang tanggal tersebut, lalu saring secara cerdas di JavaScript menggunakan `isJurnalMatchJadwal()` dan normalisasi substring:
   ```tsx
   // Gantikan: if (mapel) query = query.eq('mapel', mapel);
   // dengan pemfilteran pada variable combined setelah data didapat:
   if (mapel) {
     const targetMapelNorm = mapel.toLowerCase().trim();
     combined = combined.filter((j: any) => {
       const jMapel = (j.mapel || j.mata_pelajaran || '').toLowerCase().trim();
       return isJurnalMatchJadwal(j, { kelas: j.kelas, mata_pelajaran: mapel }) ||
              jMapel === targetMapelNorm ||
              jMapel.includes(`_${targetMapelNorm}`) ||
              jMapel.endsWith(`_${targetMapelNorm}`) ||
              jMapel.includes(targetMapelNorm);
     });
   }
   if (activeKelas) {
     combined = combined.filter((j: any) => {
       return isJurnalMatchJadwal(j, { kelas: activeKelas, mata_pelajaran: j.mapel }) ||
              (j.kelas && j.kelas.trim().toLowerCase() === activeKelas.trim().toLowerCase());
     });
   }
   ```
3. **Tambahkan Fallback Query Berbasis Token Nama Guru**:
   Jika query awal menghasilkan 0 baris pada mode pribadi, jalankan fallback query sederhana berbasis token nama depan guru (sama seperti implementasi di `src/lib/workflow.ts:2054` dan `GuruJurnal.tsx:1609`).

### B. Pertahankan Opsi "Semua Mapel Ditugaskan" & "Semua Kelas Ditugaskan"
Pastikan bahwa pada initial load, opsi default filter tidak membatasi rekaman jika guru mengajar di banyak kelas/mapel, sehingga saat guru pertama kali membuka "Cetak Jurnal KBM", seluruh riwayat jurnal guru pada bulan tersebut langsung muncul lengkap.

---

## 5. Rencana Pengujian & Verifikasi Objektif

1. **Unit & Invariant Tests**:
   - Jalankan `npx tsx tests/guru_cetak_jurnal_kbm.test.ts` (17 tests harus tetap PASS 100%).
   - Jalankan `npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts` (14 tests harus PASS 100%).
   - Jalankan `npx tsx tests/legacy_jurnal_backward_compatibility.test.ts` (7 tests harus PASS 100%).
   - Jalankan `npx tsx tests/jurnal_save_setelah_absensi_selesai.test.ts` (12 tests harus PASS 100%).
   - Jalankan `npx tsx tests/jurnal_edit_delete_r2.test.ts` (19 tests harus PASS 100%).
2. **Behavioral Simulation Test**:
   - Uji pemanggilan `tarikRekap()` dengan dataset jurnal historis yang memiliki:
     - `mapel: "XI Merdeka_Matematika"` saat filter mapel adalah `"Matematika"`.
     - `kelas: "XI Merdeka"` saat filter kelas adalah `"XI Merdeka C"`.
     - `sekolah_id: null` saat user memiliki `sekolah_id`.
     - Nama guru dengan variasi gelar akademik.
   - Buktikan bahwa seluruh rekaman tersebut lolos filter dan tampil pada tabel cetak 12 kolom (`#hasil-rekap-jurnal-guru`).

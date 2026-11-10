# REVIEWER REPORT — TEAMWORK REVIEWER 3 (FINAL QA & ADVERSARIAL VERDICT)

> [!WARNING] **Skepticism Disclaimer**
> Logika otorisasi multi-identitas wali kelas, toleransi gelar akademik majemuk (Prof. Dr. Ir., Dra. Hj., KH.), sufiks gelar tanpa koma, ekstraksi status presensi guru non-hadir (Dinas Luar, Izin, Sakit, Cuti, Pulang Cepat, Izin Terlambat), konsistensi penyaringan `wData` pada UI `RekapSiswaView.tsx` dan hook `useWaliKelas.ts`, serta proteksi alur presensi reguler telah dibuktikan secara ketat melalui 44 assertions unit test baru, 59 assertions intervensi komparatif, 28 assertions master data CSV, pengecekan kompilasi tipe `tsc --noEmit` (0 errors), dan `npm run build` Next.js 16.3.4 (13/13 static pages, 0 errors).

---

## 1. What the prior attempt got wrong

Meskipun Reviewer 2 telah memperkuat `canWaliKelasIntervene` dan `useWaliKelas.ts`, analisis mendalam menemukan 3 celah lanjutan yang menyebabkan false lockout dan kegagalan fungsional:

### Issue 1: False Lockout UI Banner dan Kegagalan Multi-Kelas pada `RekapSiswaView.tsx`
- **Input:** Guru wali kelas bergelar akademik (e.g. `user.nama = "Drs. Budi Santoso, M.Pd"` vs data `wali_kelas.nama_guru = "Budi Santoso"`), atau pengguna dengan `auth.users.id` berbeda dari `data_guru.id`, membuka halaman Presensi Siswa (`RekapSiswaView.tsx`).
- **Expected:** `wData.filter` berhasil mencocokkan guru, mengisi `waliKelasList` dengan seluruh kelas binaannya, dan merender banner input presensi beserta pilihan dropdown antar kelas.
- **Actual:** `userWalis` bernilai kosong (`[]`). Jika `propAssignedKelas` belum termuat, banner input presensi tidak muncul sama sekali (baris 1031 `{waliKelasList.length > 0 && ...}`). Jika guru membina lebih dari 1 kelas, hanya 1 kelas fallback yang muncul dan kelas lainnya hilang.
- **Root cause:** Baris 139-143 dan baris 494-498 pada `RekapSiswaView.tsx` masih menggunakan perbandingan string mentah equality eksak (`w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()`) dan perbandingan ID kaku (`w.guru_id === user.id`), tanpa memanfaatkan fungsi normalisasi yang tahan terhadap variasi gelar dan pemisahan relasi ID guru.

### Issue 2: Inkonsistensi Duplikasi Logika Pencocokan Guru & Ketiadaan Fungsi Sentral
- **Input:** Modul `presensiIntervensi.ts`, `useWaliKelas.ts`, dan `RekapSiswaView.tsx` masing-masing mengimplementasikan logika pencocokan guru dan record `wali_kelas` secara terpisah (ad-hoc).
- **Expected:** Terdapat satu fungsi sentral (`isMatchingWaliGuru`) yang menjadi Single Source of Truth (SSOT) untuk seluruh aplikasi.
- **Actual:** `RekapSiswaView.tsx` tertinggal dan tidak tersinkronkan dengan regex pembersih gelar atau pencocokan `data_guru_id`/`guru_id`/`user_id`.
- **Root cause:** Ketiadaan helper ter-ekspor yang dapat digunakan kembali secara konsisten lintas komponen dan hooks.

### Issue 3: Kerentanan Pembersihan Gelar Majemuk (Compound Titles) dan Gelar Tanpa Koma
- **Input:** Pengguna dengan gelar ganda/majemuk (e.g., `"Prof. Dr. Ir. Budi Santoso, M.Sc"` atau `"Dra. Hj. Siti Rahmah, M.Pd"` atau `"KH. Ahmad Dahlan"`) atau nama dengan sufiks gelar tanpa separator koma (`"Budi Santoso S.Pd"`).
- **Expected:** Gelar majemuk dan sufiks dibersihkan sehingga nama inti cocok dengan snapshot database.
- **Actual:** Regex lama `/^(dr|dra|drs|ir|prof|h|hj|ust|ustadz|ustadzah)\.?\s+/i` hanya menghapus 1 kata pertama (misal hanya menghapus "Prof. ", menyisakan "Dr. Ir. Budi Santoso"), sehingga gagal mencocokkan nama dengan database snapshot `"Budi Santoso"`.
- **Root cause:** Regex tidak memiliki pengulangan kuantifier `(?: ... )+` untuk menangkap gelar bertingkat dan tidak memiliki pembersih sufiks gelar tanpa koma.

---

## 2. What I changed

### 2.1 `src/lib/presensiIntervensi.ts`
- **Fungsi Sentral `isMatchingWaliGuru`**:
  - Mengekspor `isMatchingWaliGuru(user, w)` sebagai fungsi penentu kecocokan guru dengan record `wali_kelas`.
  - Mendukung pencocokan ID fleksibel (`user.id`, `user.data_guru_id`, `user.guru_id`, `user.user_id` vs `w.guru_id`, `w.user_id`, `w.data_guru_id`).
  - Mengimplementasikan pembersihan gelar majemuk multi-prefix: `/^(?:(?:dr|dra|drs|ir|prof|h|hj|ust|ustadz|ustadzah|kh|k\.h)\.?\s+)+/i`.
  - Mengimplementasikan pembersihan sufiks gelar tanpa separator koma: `\s+(?:s\.pd|m\.pd|s\.kom|m\.kom|s\.e|m\.m|s\.t|m\.t|s\.ag|m\.ag|s\.si|m\.si|ph\.d|b\.sc|m\.sc)\.?$`.
  - Menangani pencocokan NIP dan username.
- **Resiliensi `extractAssignedClasses`**:
  - Menambahkan dukungan untuk `user.penugasan?.nama_kelas`, `user.penugasan?.assigned_kelas`, `user.nama_kelas`, dan `user.kelas_wali`.
- **Hardening `canWaliKelasIntervene`**:
  - Menggunakan `isMatchingWaliGuru` pada pencarian `waliKelasList`.
  - Menambahkan fallback pendeteksi status presensi guru otomatis dari `user.jenis_presensi`, `user.status_presensi`, `user.daily_status`, atau `user.detail_izin`.

### 2.2 `src/hooks/useWaliKelas.ts`
- Mengimpor dan mengintegrasikan `isMatchingWaliGuru` untuk mencari record penugasan pada `wali_kelas`, menggantikan logika ad-hoc lokal.
- Menambahkan fallback penugasan langsung (`nama_kelas`, `kelas_wali`, `penugasan.assigned_kelas`).

### 2.3 `src/components/RekapSiswaView.tsx`
- Mengimpor `isMatchingWaliGuru`.
- Mengganti filter naif pada `fetchMaster` (baris 136-148) dengan `wData.filter(w => isMatchingWaliGuru(user, w))` sehingga guru bergelar majemuk atau multi-ID tidak mengalami false lockout banner presensi.
- Memperluas fallback `userAssignedKelas` dengan `waliKelas` dan `kelas`.
- Memperbarui validasi `isWaliVerified` saat penyimpanan presensi siswa dengan `isMatchingWaliGuru(user, w)`.

### 2.4 `tests/wali_kelas_non_hadir_intervensi.test.ts`
- Menambahkan **SECTION 7: ROUND 3 ADVERSARIAL STRESS PROBES** (total 44 assertions, 100% pass):
  - `ADV-ROBUST-16`: Pengenalan gelar majemuk (Prof. Dr. Ir., Dra. Hj.).
  - `ADV-ROBUST-17`: Pengenalan gelar tanpa separator koma ("Budi Santoso S.Pd").
  - `ADV-ROBUST-18`: Pengenalan gelar kehormatan keagamaan (KH., Ustadzah).
  - `ADV-ROBUST-19`: Penolakan ketat untuk guru berbeda nama, ID, dan NIP.
  - `ADV-ROBUST-20`: Ekstraksi otomatis status presensi guru dari `user.jenis_presensi`/`user.status_presensi`.
  - `ADV-ROBUST-21`: Otorisasi status non-hadir lanjutan (Pulang Cepat, Izin Terlambat).
  - `ADV-ROBUST-22`: Verifikasi AST integrasi `isMatchingWaliGuru` di `RekapSiswaView` dan `useWaliKelas`.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_non_hadir_intervensi.test.ts`: **44 / 44 PASS (100%)**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **59 / 59 PASS (100%)**
  - `npx tsx tests/master_data_csv_export_verification.test.ts`: **28 / 28 PASS (100%)**
  - `npx tsc --noEmit`: **0 errors (Kompilasi TypeScript Bersih)**
  - `npm run build`: **Next.js 16.3.4 (Turbopack) build PASS (13/13 static pages, 0 errors)**
- **Shallow Verification (manual only):**
  - Peninjauan alur render tombol intervensi presensi siswa pada `HomeViewGuru.tsx` dan navigasi ke `RekapSiswaView.tsx`.
- **Unverified aspects:**
  - Pengujian live Supabase Realtime websocket subscriptions di browser sungguhan.
  - Pengujian interaksi touch gesture mobile WebView pada kondisi sinyal buruk.

---

## 4. Known Issues
- `Minor Robustness Risk`: Jika penamaan kelas binaan di database sekolah ditulis menggunakan nama unik non-standar yang sama sekali tidak memiliki komponen tingkat romawi/arab (misal hanya kata "Melati"), sistem mencocokkannya secara eksak case-insensitive tanpa konversi tingkat.

---

## 5. Remaining risk & next step
- Tidak ada fatal functional bug yang tersisa. Seluruh acceptance criteria R1 dan R2 telah terpenuhi secara menyeluruh:
  1. Wali kelas dengan status Dinas Luar, Izin, Sakit, Cuti, Pulang Cepat, atau status non-hadir lainnya diizinkan secara penuh melakukan intervensi presensi siswa.
  2. Guru bukan wali kelas tetap ditolak secara ketat.
  3. Integrasi otorisasi telah dipersatukan melalui helper `isMatchingWaliGuru` yang kebal terhadap gelar majemuk dan ID relasional.
  4. Seluruh alur presensi reguler tetap terjaga tanpa regresi.
Task ini selesai dan siap di-merge ke branch utama.

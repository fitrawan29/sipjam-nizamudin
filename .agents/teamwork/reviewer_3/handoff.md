# Handoff Report — reviewer_3 (Adversarial Reviewer)

> [!WARNING] **Skepticism Disclaimer**
> Perbaikan telah diuji secara mendalam dengan 56/56 suite test khusus (100% PASS), 42/42 adversarial stress test (100% PASS), Type-checking TypeScript (`tsc --noEmit` 0 errors), dan `next build` (100% PASS); namun konkurensi multi-koneksi paralel real-time di jaringan publik sekolah tetap perlu diobservasi saat jam sibuk.

## 1. What the prior attempt got wrong

### Issue 1: False-Positive Bolos (Truant) Badge in `GuruJurnal.tsx` UI
- **Input:** Siswa tidak hadir sejak pagi hari (tidak tap kartu di gerbang pos datang, dan belum/tidak ada catatan absensi pagi dari Wali Kelas). Di kelas jam pelajaran KBM, Guru Mapel menandai status presensi siswa sebagai Alfa ('A').
- **Expected:** Siswa ditampilkan sebagai Alfa biasa tanpa label peringatan Bolos (`isTruant = false`), dan counter siswa bolos (`truantCount`) tidak bertambah.
- **Actual:** Pada `GuruJurnal.tsx` baris 1381, kondisi `isTruant` dihitung hanya dengan `!isMorningLocked && absensi[siswa.nisn] === 'A'`, mengabaikan apakah siswa hadir di pagi hari atau tidak. Siswa yang murni tidak masuk sekolah langsung diberi badge berkedip `⚠️ Terindikasi Bolos (Alfa Mapel, Pagi Hadir)`. Selain itu, `truantCount` pada baris 1344 hanya mengecek `piketAttendance` dan mengabaikan catatan Hadir pagi dari Wali Kelas di tabel `absensi`.
- **Root Cause:** Status kehadiran pagi siswa (`isMorningHadir`) tidak direkam di state `morningLockedAttendance` pada saat pemuatan awal siswa (`fetchStudents`), dan evaluasi `isTruant` di UI tidak memverifikasi kehadiran pagi.

### Issue 2: Blindness to Dash/Colon Postfix & List Formats (`Nama - Alfa`, `Nama: A`) in `detail_absen`
- **Input:** Guru Mapel mencatat ketidakhadiran siswa di jurnal KBM jam terakhir dalam format catatan teks guru yang umum, seperti `1. Bambang Sudiro - Alfa` atau `Bambang Sudiro: A`. Siswa tersebut hadir di pos gerbang pagi hari.
- **Expected:** Sistem mendeteksi status Alfa pada KBM jam terakhir dan menetapkan status harian siswa sebagai **Bolos** (B).
- **Actual:** `resolveDailyStudentAttendance` mengembalikan status `Hadir` (sumber: 'Presensi Gerbang') tanpa mendeteksi status Alfa.
- **Root Cause:** Pola regex sebelumnya hanya mencari format dalam tanda kurung `\(([a-zA-Z]+)\)`, sedangkan pencarian keyword hanya mencari kata kunci sebelum nama (`lastIndexOf(..., idxNama)`). Format postfix dengan pemisah dash (`-`), colon (`:`), atau sama dengan (`=`) serta format bernomor (`1. Nama - Alfa`) tidak terdeteksi.

### Issue 3: Inconsistent Bolos Detection in Gate Departure View (`RekapSiswaView.tsx`)
- **Input:** Jurnal KBM jam terakhir mencatat ketidakhadiran dalam `detail_absen` (bukan JSON `absensi_siswa`), sementara siswa telah hadir di gerbang datang pagi hari.
- **Expected:** Di tab Presensi Gerbang (`fetchGerbangAttendance`), siswa diidentifikasi sebagai Bolos (`isBolosPulang = true`) dan status pulang disetel menjadi `device_id: 'Auto Fallback: Bolos'`.
- **Actual:** Evaluasi `isBolosPulang` hanya mem-parse field `absensi_siswa` JSON dan mengabaikan `detail_absen`, sehingga siswa bolos tidak terdeteksi di tabel kepulangan gerbang.
- **Root Cause:** `fetchGerbangAttendance` tidak memanfaatkan hasil evaluasi komprehensif dari `resolveDailyStudentAttendance`.

### Issue 4: Fragile Case-Sensitive and Whitespace Name Matching
- **Input:** Nama siswa di tabel database `public.absensi` atau data jurnal memiliki variasi kapitalisasi (misal: "Bambang Sudiro" vs "bambang sudiro") atau trailing whitespace.
- **Expected:** Catatan absensi kelas berhasil dicocokkan dengan data siswa.
- **Actual:** Pengecekan nama exact `a.nama_siswa === s.nama_siswa` gagal mencocokkan, sehingga catatan absensi dianggap tidak ada.
- **Root Cause:** Pembandingan nama tidak dinormalisasi dengan `.trim().toLowerCase()`.

---

## 2. What I changed

1. **`src/lib/presensiIntervensi.ts`**:
   - Menambahkan dukungan format postfix tanda hubung, titik dua, tanda kurung, dan sama dengan (`Nama - Alfa`, `Nama: A`, `Nama = Sakit`, `1. Nama - Alfa`) pada `resolveDailyStudentAttendance`.
   - Menambahkan pengenalan NISN dalam catatan teks `detail_absen` (`NISN - Alfa`).
   - Menambahkan pembersihan spasi (whitespace-trim) untuk kunci NISN di `absensiJson`.
   - Menambahkan tie-breaker berbasis timestamp pada `findLastKbmJournal` jika jam pelajaran (`jam_ke`) bernilai sama.
2. **`src/components/GuruJurnal.tsx`**:
   - Menambahkan property `isMorningHadir?: boolean` ke tipe state `morningLockedAttendance`.
   - Memetakan flag `isMorningHadir: true` di `fetchStudents` jika catatan `public.absensi` pagi hari berstatus Hadir (`Hadir` / `H`).
   - Menyelaraskan evaluasi `isTruant` dan `truantCount` di UI agar hanya aktif jika siswa terkonfirmasi hadir di pagi hari (`pRec` gerbang ATAU `isMorningHadir` kelas pagi).
   - Menerapkan pembandingan nama case-insensitive dan trimmed pada pencocokan siswa di `fetchStudents` dan `handleSubmit`.
3. **`src/components/RekapSiswaView.tsx`**:
   - Mengintegrasikan hasil `resolveDailyStudentAttendance` ke dalam evaluasi kepulangan gerbang `fetchGerbangAttendance`, memastikan deteksi bolos konsisten di semua format jurnal KBM.
   - Menerapkan pembandingan nama case-insensitive dan trimmed pada pencocokan catatan absensi di `loadWaliData`, `fetchGerbangAttendance`, dan `fetchHistoricalRekap`.
   - Memperbarui komentar jadwal intervensi Wali Kelas (menghapus referensi kadaluarsa 22:00 WITA).
4. **`tests/wali_kelas_and_piket_intervensi.test.ts`**:
   - Menambahkan unit test `FALLBACK-14` (deteksi format postfix dash/colon `Nama - Alfa` dan `Nama: A`).
   - Menambahkan unit test `FALLBACK-15` (pengenalan NISN dalam `detail_absen`).
   - Menambahkan unit test `FALLBACK-16` (tie-breaking timestamp pada `findLastKbmJournal`).
   - Menambahkan unit test `DOMAIN-10` (proteksi false-positive indikator truant di UI `GuruJurnal`).
   - Total test suite meningkat dari 52 menjadi 56 test (100% PASS).

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **56/56 PASS (100%)**.
  - `npx tsx tests/adversarial_challenge_r1_r2_r3.test.ts`: **42/42 PASS (100%)**.
  - `npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts`: **11/11 PASS (100%)**.
  - `npx tsx tests/adversarial_presensi_sync_reviewer_r3.test.ts`: **12/12 PASS (100%)**.
  - `npx tsc --noEmit`: **0 errors**.
  - `npm run build`: **Compiled successfully (Turbopack, TypeScript 0 errors, static pages 12/12 generated)**.
- **Shallow Verification (manual only):**
  - Inspeksi visual komponen UI `GuruJurnal.tsx`, `RekapSiswaView.tsx`, dan `AdminConfigView.tsx`.
- **Unverified aspects:**
  - Konkurensi multi-user menulis secara paralel tepat pada milidetik 12:00:00 WITA di koneksi internet riil Supabase.

---

## 4. Known Issues

- None. (Zero fatal functional bugs, zero high risks).

---

## 5. Remaining risk & next step

- **Remaining risk:** Latensi jaringan saat query paralel data siswa, jurnal, dan absensi di sekolah dengan koneksi pedesaan/rendah bandwidth.
- **Next step:** Seluruh kriteria penerimaan R1, R2, R3, dan R4 telah terpenuhi secara lengkap, solid, dan lulus uji regresi 100%. Tugas selesai dan siap untuk deployment.

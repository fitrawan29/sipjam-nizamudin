# Handoff Report — reviewer_2 (Adversarial Reviewer)

> [!WARNING] **Skepticism Disclaimer**
> Perbaikan telah diuji secara mendalam dengan 52/52 suite test khusus (100% PASS), 42/42 adversarial stress test (100% PASS), Type-checking TypeScript (`tsc --noEmit` 0 errors), dan `next build` (100% PASS); namun konkurensi multi-koneksi pada latensi jaringan tinggi saat submit serentak tetap perlu diobservasi pada log produksi.

## 1. What the prior attempt got wrong

### Issue 1: Database Overwrite of Excused Absences (Sakit & Izin) in `GuruJurnal.tsx`
- **Input:** Siswa melakukan tap kartu di gerbang pos datang pagi (`Boolean(piketAttendance[s.nisn]) = true`). Kemudian Wali Kelas secara resmi mencatat status `Sakit` (atau `Izin`) pada `public.absensi` (karena siswa sakit/minta izin pulang). Di siang hari, Guru Mapel jam KBM membuka GuruJurnal dan mengisi absensi mapel dengan status Alfa ('A').
- **Expected:** Status resmi `Sakit` / `Izin` di tabel database `public.absensi` TIDAK ditimpa menjadi `Bolos`.
- **Actual:** Di `GuruJurnal.tsx` (baris 902-905), kondisi `isMorningHadir` dihitung dengan:
  `(classRec && (classRec.status === 'Hadir' || classRec.status === 'H')) || Boolean(piketAttendance[s.nisn] || ...)`.
  Karena siswa sempat tap gerbang datang, `Boolean(piketAttendance[...])` bernilai true. `isMorningHadir` menjadi true meski `classRec.status === 'Sakit'`, sehingga sistem menimpa catatan resmi `Sakit` / `Izin` menjadi `status: 'Bolos'` secara langsung di database Supabase melalui query upsert!
- **Root Cause:** `GuruJurnal.tsx` tidak memproteksi status izin resmi (`isExcused: Sakit/Izin`) dari `existingClassAbs` sebelum memicu sinkronisasi Bolos ke database.

### Issue 2: Blindness to Keyword-Formatted and Full-Word Attendance in `detail_absen`
- **Input:** Guru KBM jam terakhir mencatat ketidakhadiran siswa dalam format string keyword umum (seperti `detail_absen = 'Alpa: Ahmad Fauzi'` atau `detail_absen = 'Ahmad Fauzi (Alfa)'`), atau jurnal memiliki `absensi_siswa` JSON parsial `{ '999': 'H' }` untuk siswa lain sedangkan Ahmad Fauzi dicatat di `detail_absen`. Siswa Ahmad Fauzi tercatat hadir di gerbang pagi.
- **Expected:** Siswa Ahmad Fauzi teridentifikasi sebagai Alfa pada KBM terakhir dan otomatis ditetapkan sebagai **Bolos** (B).
- **Actual:** `resolveDailyStudentAttendance` mengembalikan status `Hadir` (sumber: 'Presensi Gerbang') tanpa mendeteksi status Alpa siswa.
- **Root Cause:**
  1. Regex `match` pada `detail_absen` hanya mencocokkan singkatan satu karakter `\(([HSIAhsia])\)`, sehingga mengabaikan nama status lengkap seperti `(Alfa)`, `(Alpa)`, `(Sakit)`, `(Izin)`.
  2. Format keyword string seperti `Alpa: Nama`, `Sakit: Nama`, `Izin: Nama`, `Bolos: Nama` sama sekali tidak didukung di `resolveDailyStudentAttendance`.
  3. Struktur percabangan `if (absensiJson) ... else if (detail_absen)` menyebabkan pemeriksaan `detail_absen` diabaikan jika JSON memuat data siswa lain.
  4. Status `'B'` atau `'BOLOS'` di JSON KBM belum dipetakan ke `'Bolos'`.

### Issue 3: Status Normalization Blind Spot in `RekapSiswaView.tsx` Gate Mapel Fallback
- **Input:** Jurnal KBM terakhir memiliki data `absensi_siswa` berupa kata lengkap seperti `'ALFA'`, `'ALPA'`, atau `'BOLOS'`.
- **Expected:** Tampilan status kepulangan gerbang mendeteksi status bolos siswa (`isBolosPulang = true`) dan menampilkan `device_id: 'Auto Fallback: Bolos'`.
- **Actual:** Logika evaluasi kepulangan hanya memeriksa exact string `lastMapelStatus === 'A'`, sehingga nilai `'ALFA'`, `'ALPA'`, atau `'BOLOS'` diabaikan dan siswa dianggap hadir.
- **Root Cause:** Nilai `lastMapelStatus` tidak dinormalisasi untuk menangani format kata lengkap (`ALFA`, `ALPA`, `BOLOS`).

### Issue 4: Exclusion of Bolos from Unexcused Absences in `RaporView.tsx`
- **Input:** Siswa memiliki catatan kehadiran harian dengan `status = 'Bolos'` atau `'B'` di tabel `absensi`.
- **Expected:** Pada Rapor Kurikulum Merdeka, jumlah hari Bolos terakumulasi ke dalam total ketidakhadiran tanpa keterangan (`alpa`).
- **Actual:** Penghitungan absensi pada `RaporView.tsx` hanya memeriksa `st === 'A' || st === 'ALPA'`, sehingga status `Bolos` diabaikan dan siswa mendapatkan 0 alpa pada laporan rapor.
- **Root Cause:** Status `Bolos` / `B` belum disertakan dalam akumulasi absensi `alpa` di `RaporView.tsx`.

---

## 2. What I changed

1. **`src/lib/presensiIntervensi.ts`**:
   - `resolveDailyStudentAttendance`:
     - Menambahkan dukungan format status lengkap dalam tanda kurung: `(Alfa)`, `(Alpa)`, `(Sakit)`, `(Izin)`, `(Bolos)`, `(Hadir)`.
     - Menambahkan dukungan format keyword prefix: `Alpa: Nama`, `Alfa: Nama`, `Sakit: Nama`, `Izin: Nama`, `Bolos: Nama`, `Hadir: Nama`.
     - Mengubah pengecekan `detail_absen` / `kehadiran_murid` menjadi cascading fallback (diperiksa jika siswa belum ditemukan di `absensiJson`).
     - Menambahkan pemetaan langsung untuk status `'B'` dan `'BOLOS'` dalam JSON absensi KBM.
2. **`src/components/GuruJurnal.tsx`**:
   - Menambahkan pengecualian `isExcused` (`Sakit` / `Izin`) pada `handleSubmit` auto-sync Bolos agar catatan resmi Wali Kelas di database Supabase tidak pernah tertimpa menjadi Bolos.
   - Menambahkan seleksi kolom `siswa_id` dan `nama_siswa` pada query `aQ` absensi.
   - Memperluas pencocokan siswa di `existingClassAbs` menggunakan `s.id`, `s.nisn`, dan `s.nama_siswa`.
   - Mengunci status siswa yang telah berstatus `Bolos` dari pagi hari pada `fetchStudents`.
3. **`src/components/RekapSiswaView.tsx`**:
   - Menambahkan normalisasi `normMapel` pada evaluasi kepulangan gerbang (`isMapelAlfa = normMapel === 'A' || 'ALFA' || 'ALPA' || 'BOLOS' || 'B'`).
   - Menambahkan fallback `siswa_id` (UUID) pada pencocokan `directAbsensi` dan `absensiLogs`.
   - Memperbarui komentar guard jendela waktu Wali Kelas (12:00 WITA pagi & 1 jam kepulangan).
4. **`src/components/RaporView.tsx`**:
   - Menambahkan status `BOLOS` dan `B` ke dalam akumulasi ketidakhadiran tanpa keterangan (`attRecord[row.nisn].alpa++`).
5. **`tests/wali_kelas_and_piket_intervensi.test.ts`**:
   - Menambahkan unit test `DOMAIN-08` (proteksi Sakit/Izin GuruJurnal di database).
   - Menambahkan unit test `DOMAIN-09` (akumulasi Bolos pada RaporView).
   - Menambahkan unit test `FALLBACK-10` (deteksi keyword prefix `Alpa: Nama`).
   - Menambahkan unit test `FALLBACK-11` (deteksi kata lengkap `Nama (Alfa)`).
   - Menambahkan unit test `FALLBACK-12` (cascading fallback ke `detail_absen`).
   - Menambahkan unit test `FALLBACK-13` (pemetaan status BOLOS/B dalam JSON jurnal).
   - Total test suite meningkat dari 46 menjadi 52 test (100% PASS).

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **52/52 PASS (100%)**.
  - `npx tsx tests/adversarial_challenge_r1_r2_r3.test.ts`: **42/42 PASS (100%)**.
  - `npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts`: **11/11 PASS (100%)**.
  - `npx tsx tests/adversarial_presensi_sync_reviewer_r3.test.ts`: **12/12 PASS (100%)**.
  - `npx tsc --noEmit`: **0 errors**.
  - `npm run build`: **Compiled successfully (Turbopack, TypeScript 0 errors, static pages 12/12 generated)**.
- **Shallow Verification (manual only):**
  - Pemeriksaan label teks dan komentar panduan jendela waktu di `RekapSiswaView` dan `AdminConfigView`.
- **Unverified aspects:**
  - Konkurensi multi-user menulis secara paralel tepat pada milidetik 12:00:00 WITA di koneksi internet riil Supabase.

---

## 4. Known Issues

- `None` (Seluruh 52 pengujian unit lulus 100%, seluruh adversarial stress tests lulus 100%, kompilasi Next.js dan TypeScript bersih tanpa error).

---

## 5. Remaining risk & next step

- **Remaining risk:** Latensi jaringan saat query paralel data siswa, jurnal, dan absensi di sekolah dengan koneksi pedesaan/rendah bandwith (telah dioptimalkan dengan query terfokus `(tanggal, kelas)`).
- **Next step:** Tugas telah selesai sepenuhnya dan memenuhi seluruh kriteria penerimaan R1, R2, R3, dan R4 secara menyeluruh, robust, dan tahan terhadap skenario adversarial. Siap untuk proses staging dan commit.

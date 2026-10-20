# Handoff Report — reviewer_1 (Adversarial Reviewer)

> [!WARNING] **Skepticism Disclaimer**
> Perbaikan telah diuji secara mendalam dengan 46 pengujian otomatis (100% PASS), type-checking TypeScript (0 errors), dan adversarial scenario test; namun konkurensi multi-client di jaringan Supabase produksi saat transisi detik 12:00:00 tetap perlu dimonitor secara berkala.

## 1. What the prior attempt got wrong

### Issue 1: False-Positive Bolos Overriding Excused Absences (Sakit & Izin)
- **Input:** Siswa tap kartu di gerbang pagi (`hasMorningPresence = true`). Wali Kelas mencatat secara resmi status `Sakit` (atau `Izin`) pada presensi kelas. Di siang hari, Guru Mapel jam KBM terakhir mengisi Alfa ('A').
- **Expected:** Status harian siswa tetap **Sakit** (atau **Izin**) sesuai rekap resmi Wali Kelas. Siswa yang berhalangan hadir dengan alasan sah/sakit tidak boleh dijadikan **Bolos**.
- **Actual:** `morningHadir` dihitung dari `hasMorningPresence || recordedStatus === 'Hadir'`. Karena `hasMorningPresence` bernilai true dan `lastKbmStatus === 'Alpa'`, sistem salah menimpa status siswa menjadi **Bolos**. Bug serupa juga terjadi di `RekapSiswaView.tsx` (baris 297: `isMorningHadir` pada fallback gerbang tidak mengecualikan siswa Sakit/Izin).
- **Root Cause:** Fungsi `resolveDailyStudentAttendance` tidak memprioritaskan dan memproteksi status izin resmi (`Sakit` / `Izin`) dari Wali Kelas sebelum memicu aturan Bolos.

### Issue 2: Window Overlap Bug on Early Dismissal Days (10:00 WITA Dismissal)
- **Input:** Hari kepulangan lebih awal (misal hari ujian/kegiatan khusus dengan `jamPulangMulai = '10:00'`). Pada pukul 11:15 WITA (`current = '11:15'`), alokasi 1 jam pulang (`10:00 - 11:00`) telah berakhir.
- **Expected:** Akses intervensi terkunci (`phase: 'malam_tutup'`, `allowed: false`).
- **Actual:** `isWaliKelasIntervensiAllowed` mengevaluasi `current <= pagi` ('11:15' <= '12:00') setelah jendela pulang, sehingga sistem salah membuka kembali jendela pagi (`phase: 'pagi'`, `allowed: true`) 15 menit setelah kepulangan selesai.
- **Root Cause:** Evaluasi `current <= pagi` tidak memvalidasi `current < pulangStart`, dan kondisi `current > pulangEnd` diletakkan setelah pemeriksaan pagi.

### Issue 3: Fallback Blind Spot on Empty Teaching Journals
- **Input:** Terdapat dua jurnal pada hari yang sama: Jam ke-5 dengan catatan presensi murid dan Jam ke-6 dengan `{}` kosong.
- **Expected:** `findLastKbmJournal` memilih Jam ke-5 (sesi KBM terakhir yang memiliki data absensi) agar siswa mewarisi status presensi.
- **Actual:** Pengurutan hanya berdasarkan angka `jam_ke`, sehingga memilih Jam ke-6 yang kosong. Akibatnya `lastKbmStatus` menjadi `''` dan fallback gagal mewariskan data.
- **Root Cause:** `findLastKbmJournal` tidak memprioritaskan jurnal yang memiliki data absensi murid.

### Issue 4: Student Lookup Blind to UUID (`student.id`) and Case Sensitivity
- **Input:** Data siswa yang dicatat dengan UUID (`student.id`) tanpa NISN, atau nama siswa di JSON jurnal memiliki perbedaan kapitalisasi/spasi.
- **Expected:** Siswa berhasil dicocokkan dan statusnya diwarisi.
- **Actual:** Mengembalikan status kosong `''` karena pencocokan hanya memeriksa `student.nisn` dan `student.nama_siswa` secara case-sensitive.
- **Root Cause:** Logika ekstraksi `absensiJson` di `resolveDailyStudentAttendance` dan `RekapSiswaView` tidak menyertakan fallback ke `student.id` dan case-insensitive name matching.

### Issue 5: `PiketView.tsx` Unwired Schedule Configuration
- **Input:** Admin mengubah konfigurasi waktu `jam_batas_intervensi_siswa` (misal 08:30) atau `jam_pulang_mulai` (misal 13:00).
- **Expected:** `PiketView` menggunakan parameter waktu dinamis dari tabel `pengaturan`.
- **Actual:** `PiketView` mengimpor fungsi `fetchBatasIntervensiSiswa` dan `fetchJadwalIntervensiWali` namun tidak pernah memanggilnya dalam `useEffect`, sehingga terkunci permanen pada default `'08:00'` dan `'11:00'`.
- **Root Cause:** Kurangnya hook `useEffect` untuk fetching konfigurasi jadwal di `PiketView.tsx`.

---

## 2. What I changed

1. **`src/lib/presensiIntervensi.ts`**:
   - `isWaliKelasIntervensiAllowed`: Memperbaiki partisi transisi jendela waktu: (1) Pulang (60m) -> (2) `malam_tutup` jika `current > pulangEnd` -> (3) `pagi` jika `current <= pagi && current < pulangStart` -> (4) `kbm` terkunci jika di antara pagi dan jam pulang.
   - `findLastKbmJournal`: Menambahkan helper `hasAttendanceData` untuk memprioritaskan sesi KBM yang memiliki catatan absensi murid sebelum mengurutkan berdasarkan `jam_ke` descending.
   - `resolveDailyStudentAttendance`:
     - Memproteksi status resmi `Sakit` dan `Izin` dari Wali Kelas agar tidak pernah diubah menjadi Bolos.
     - Mempertahankan status `Bolos` kanonikal jika sudah tercatat.
     - Menambahkan dukungan pencocokan berbasis `student.id` (UUID) dan case-insensitive `nama_siswa`.
2. **`src/components/RekapSiswaView.tsx`**:
   - Memperbaiki deteksi `isMorningHadir` pada fallback gerbang (`!isExcused && ...`) agar siswa berstatus Sakit/Izin tidak salah diklasifikasikan sebagai `isBolosPulang`.
   - Menambahkan pencocokan `siswa.id` dan case-insensitive name matching pada lookup `lastMapelStatus`.
3. **`src/components/PiketView.tsx`**:
   - Menambahkan hook `useEffect` untuk memanggil `fetchBatasIntervensiSiswa` dan `fetchJadwalIntervensiWali` dari database secara dinamis.
4. **`src/components/AdminConfigView.tsx`**:
   - Memperbarui teks keterangan `jam_batas_intervensi_siswa` agar secara akurat menjelaskan batas 08:00 WITA untuk Guru Piket dan 12:00 WITA untuk Wali Kelas.
5. **`tests/wali_kelas_and_piket_intervensi.test.ts`**:
   - Menambahkan test `WALI-WIN-05` (early dismissal window locking).
   - Menambahkan test `PIKET-05` (dynamic config fetch in PiketView).
   - Menambahkan test `FALLBACK-05` (preservasi Sakit saat tap gerbang + Alfa KBM).
   - Menambahkan test `FALLBACK-06` (preservasi Izin).
   - Menambahkan test `FALLBACK-07` (empty journal resilience).
   - Menambahkan test `FALLBACK-08` (UUID student.id matching).
   - Menambahkan test `FALLBACK-09` (case-insensitive name matching).
   - Total test suite meningkat dari 39 menjadi 46 test (100% PASS).

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **46/46 PASS (100%)**.
  - `npx tsx tests/adversarial_challenge_r1_r2_r3.test.ts`: **42/42 PASS (100%)**.
  - `npx tsc --noEmit`: **0 errors**.
- **Shallow Verification (manual only):**
  - Pemeriksaan teks label dan petunjuk konfigurasi di AdminConfigView.
- **Unverified aspects:**
  - Konkurensi multi-user menulis paralel tepat pada pergantian detik 12:00:00 WITA di koneksi internet riil.

---

## 4. Known Issues

- `None` (Seluruh 46 pengujian unit lulus 100%, kompilasi TypeScript bersih tanpa error).

---

## 5. Remaining risk & next step

- **Remaining risk:** Pengujian live di server produksi saat tahun ajaran baru atau pergantian jam sekolah khusus (seperti bulan Ramadhan dengan jam pulang non-standar) telah dicover oleh logika dinamis, namun data live Supabase perlu dipastikan memiliki indeks pada `(sekolah_id, kelas, tanggal)` untuk efisiensi kueri harian.
- **Next step:** Tugas telah selesai sepenuhnya dan memenuhi seluruh kriteria penerimaan R1, R2, R3, dan R4 secara menyeluruh dan robust. Siap dilakukan commit dan push ke origin main.

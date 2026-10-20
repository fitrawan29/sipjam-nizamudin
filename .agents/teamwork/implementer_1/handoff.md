# Handoff Report — implementer_1

> [!WARNING] **Skepticism Disclaimer**
> Perubahan telah diuji secara end-to-end melalui TypeScript type check (`tsc --noEmit`) dan suite 39 unit test otomatis (`tests/wali_kelas_and_piket_intervensi.test.ts`), namun integrasi real-time UI dengan Supabase live database tetap perlu dipantau saat jam operasional sekolah.

## 1. What I changed
1. **`src/lib/presensiIntervensi.ts`**:
   - `isPiketPulangAllowed`: Memperbarui alokasi waktu presensi pulang Guru Piket dari 30 menit menjadi tepat 60 menit (1 jam) sejak `jam_pulang_mulai`.
   - `isWaliKelasIntervensiAllowed`:
     - Memperpanjang batas input pagi Wali Kelas dari 08:00 ke 12:00 WITA (`batasPagi = '12:00'`).
     - Menyelaraskan alokasi presensi pulang Wali Kelas dengan Guru Piket selama tepat 60 menit sejak `jam_pulang_mulai` (bukan 20 atau 30 menit).
     - Menghapus/menutup akses malam (pk. 22:00 WITA) sehingga intervensi terkunci setelah batas 60 menit pasca jam pulang.
   - `fetchJadwalIntervensiWali`: Mengonfigurasi `batasPagi: '12:00'`, `jamPulangPiketAkhir` 60 menit, dan `jamBatasMalam` 60 menit pasca jam pulang.
   - Menambahkan helper fungsi:
     - `extractMaxJamKe(jamKeValue)`: Mengekstrak angka jam pelajaran terbesar.
     - `findLastKbmJournal(journals)`: Mencari sesi jurnal KBM jam terakhir pada hari tersebut.
     - `resolveDailyStudentAttendance(...)`: Menetapkan kehadiran harian siswa secara deterministik dengan prioritas rekap wali kelas, fallback dinamis ke jurnal KBM jam terakhir, serta preservasi aturan Bolos (Hadir pagi + Alfa di KBM terakhir = Bolos).
2. **`src/components/RekapSiswaView.tsx`**:
   - Mengintegrasikan `findLastKbmJournal` dan `resolveDailyStudentAttendance`.
   - Memperbarui initial state `jadwalWali` (`batasPagi: '12:00'`, batas pulang 60m).
   - Memperbarui `loadWaliData()` untuk mengambil jurnal KBM hari tersebut dan menyematkan fallback otomatis ke jurnal KBM jam terakhir jika Wali Kelas belum mengisi.
   - Memperbarui `fetchGerbangAttendance()` agar menggunakan `findLastKbmJournal`.
   - Memperbarui `calculateRekap()` (Domain 1: Rekap Absensi Kelas Harian) agar mengambil `jurnal_pembelajaran` dan `presensi_siswa`, lalu menjalankan `resolveDailyStudentAttendance` untuk setiap tanggal sehingga siswa tanpa data wali kelas otomatis mewarisi status dari sesi KBM jam terakhir dan status Bolos ditegakkan.
   - Memperbarui banner UI fase pulang (`Presensi Pulang Siswa (Alokasi 1 Jam)`).
3. **`src/components/HomeViewGuru.tsx`**:
   - Menyelaraskan default state `jadwalWali` (`batasPagi: '12:00'`, batas pulang 60m).
4. **`tests/wali_kelas_and_piket_intervensi.test.ts`**:
   - Memperbarui pengujian jendela waktu: pagi s.d. 12:00 WITA, alokasi pulang 60 menit untuk Piket & Wali Kelas, penguncian setelah 60 menit (22:00 terkunci).
   - Menambahkan suite pengujian unit untuk `findLastKbmJournal` dan `resolveDailyStudentAttendance` yang memvalidasi pewarisan status dari KBM jam terakhir dan penegakan aturan Bolos.

## 2. Why
Memenuhi persyaratan R1, R2, R3, dan R4:
- R1: Guru Piket pagi s.d. 08:00 WITA; Wali Kelas pagi diperpanjang s.d. 12:00 WITA bersamaan KBM tanpa memblokir Guru Mapel.
- R2: Alokasi jam pulang Piket & Wali Kelas selaras 60 menit (1 jam) pasca jam pulang dimulai, dan akses malam 22:00 ditutup.
- R3: Fallback dinamis status kehadiran dari jurnal KBM guru jam pelajaran terakhir jika Wali Kelas belum mengisi, dengan penegakan aturan Bolos jika Hadir pagi dan Alfa di mapel terakhir.
- R4: Suite pengujian diperbarui dan lulus 100% tanpa regresi.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: 39/39 PASS (100%).
  - `npx tsc --noEmit`: 0 TypeScript compiler errors.
- **Shallow Verification (manual run only):** UI rendering teks banner dan parameter dropdown form.
- **Unverified aspects:** Jaringan koneksi Supabase live production saat jam kepulangan sebenarnya (di-mock via unit tests).

## 4. Known Issues
- `None` (Semua 39 pengujian unit lulus 100% dan TypeScript valid).

## 5. Untested Edge Cases & Next Step
- Edge case: Jika terdapat multi-jurnal pada hari yang sama dengan format string `jam_ke` tidak standar (misal "Tambahan Sore"), fungsi `extractMaxJamKe` akan mengekstrak angka terbesar yang ditemukan atau fallback ke 0.

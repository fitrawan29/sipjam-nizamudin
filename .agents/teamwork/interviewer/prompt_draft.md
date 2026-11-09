This is a single self-contained fix; keep it small and focused.
Gunakan prinsip ponytail (solusi paling minimal, bersih, tanpa over-engineering): sesuaikan alur presensi agar petugas piket tidak lagi memiliki kewajiban melakukan presensi/rekap absensi kepada siswa di pagi hari, serta gantikan tulisan/label "presensi piket" untuk siswa menjadi "presensi datang" dan "presensi pulang". Perubahan ini wajib menjaga seluruh fitur dan logika lain yang tidak terdampak agar tetap stabil dan tidak berubah.

Integrity mode: development

## Requirements

### R1. Penyesuaian Alur Presensi Pagi Piket & Penghapusan Beban Rekap Absensi Siswa
- **Beban Rekap Ditiadakan**: Pada modul dan form Laporan Piket (`PiketView`), guru piket tidak lagi dibebani kewajiban 'Rekap Absensi Sekolah' (mengabsen siswa Hadir/Sakit/Izin/Alpa per kelas di pagi hari). Input absensi kelas manual pagi oleh piket ditiadakan kewajibannya sehingga guru piket fokus pada catatan kejadian dan foto dokumentasi piket.
- **Presensi Datang Murni**: Presensi siswa di pagi hari murni berfungsi sebagai "Presensi Datang" (melalui pemindaian barcode/QR gerbang atau pencatatan datang mandiri yang sudah ada), tanpa menuntut piket melakukan rekapitulasi absensi kelas pagi.
- **Penyesuaian Keterangan & Trigger Kewajiban**: Keterangan status terkait kewajiban piket pagi (seperti status "Anda bertugas mengisi Presensi Siswa", tombol "Simpan Presensi Siswa", atau peringatan batas waktu pengisian presensi pagi bagi piket) disesuaikan agar tidak lagi memicu kewajiban presensi pagi bagi guru piket.
- **Presensi Pulang**: Presensi pulang siswa tetap dapat dicatat sesuai jadwal kepulangan yang berlaku.

### R2. Pembaharuan Terminologi dan Teks Presensi Siswa
Gantikan seluruh teks dan label "Presensi Piket" yang merujuk pada presensi siswa menjadi "Presensi Datang" dan "Presensi Pulang" di seluruh antarmuka yang terdampak, termasuk tombol/badge status sinkronisasi pada Jurnal Guru (seperti penyesuaian istilah "Terapkan Presensi Piket" / "Belum Presensi Piket" menjadi istilah presensi datang/pulang), label kolom/tabel, catatan notifikasi/WhatsApp, dan teks status terkait.

### R3. Preservasi Fitur dan Logika yang Tidak Terdampak
Pastikan seluruh fitur dan logika lain di luar presensi siswa oleh piket (termasuk absensi guru piket, absensi wali kelas, jurnal pembelajaran KBM, catatan kejadian & dokumentasi foto piket harian, dan sistem rekapitulasi) tetap berfungsi normal dan tidak mengalami regresi perilaku.

## Verification Resources
- Existing test suites: `npm test` (Vitest) yang mencakup modul piket, jurnal guru, dan presensi gerbang/wali kelas (`tests/presensi_gerbang_dan_absensi_retensi.test.ts`, `tests/m4_wali_kelas_guru_sync.test.ts`, `tests/adversarial_challenger_2.test.ts`).

## Acceptance Criteria

### Alur Piket & Penyesuaian Presensi Siswa
- [ ] Pada form Laporan Piket (`PiketView`), guru piket tidak lagi diwajibkan melakukan input/rekap absensi siswa per kelas (H/S/I/A) di pagi hari.
- [ ] Presensi pagi siswa berjalan sebagai "Presensi Datang" (melalui pemindai QR/barcode gerbang atau log datang yang ada) tanpa mewajibkan rekap manual oleh guru piket.
- [ ] Status dan instruksi kewajiban piket pagi (seperti "Anda bertugas mengisi Presensi Siswa", tombol "Simpan Presensi Siswa", peringatan/banner kewajiban) telah disesuaikan agar tidak lagi membebani piket.
- [ ] Presensi Pulang siswa tetap dapat dicatat sesuai jadwal kepulangan normal.

### UI & Terminologi
- [ ] Tulisan dan label "Presensi Piket" untuk siswa di UI telah diganti menjadi istilah "Presensi Datang" dan "Presensi Pulang" yang konsisten di modul Piket dan Jurnal Guru.
- [ ] Tombol dan badge sinkronisasi di Jurnal Guru yang sebelumnya merujuk pada piket telah disesuaikan agar merefleksikan presensi datang/pulang.

### Preservasi Sistem & Kualitas Kode
- [ ] Modul Jurnal Guru, absensi wali kelas, catatan kejadian & dokumentasi piket tetap berjalan tanpa regresi logika.
- [ ] Test suite yang ada (`npm test`) berjalan sukses dan lulus.
- [ ] Implementasi mengikuti prinsip ponytail: minimal, bersih, tanpa penambahan dependensi atau over-engineering.

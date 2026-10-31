# Handoff Report: Implementasi Dokumen Kebijakan & SOP Konsekuensi Pelanggaran Administratif SIPJAM

## 1. Ringkasan Pekerjaan
Telah disusun dokumen kebijakan resmi dan Standar Operasional Prosedur (SOP) mengenai konsekuensi administratif bertingkat atas kelalaian pengisian tiket (piket, izin, penugasan), jurnal KBM (Kegiatan Belajar Mengajar), dan jurnal kegiatan dalam repositori SIPJAM.

## 2. Berkas yang Diubah / Ditambahkan
1. **`docs/KONSEKUENSI_PELANGGARAN.md`** (Dokumen Baru):
   - Landasan hukum, maksud, tujuan, dan ruang lingkup.
   - Definisi dan klasifikasi 3 kategori pelanggaran:
     * Kategori 1: Kelalaian Pengisian Tiket (Piket Harian, Izin/Sakit, Dinas Luar, Inval/Penugasan).
     * Kategori 2: Kelalaian Pengisian Jurnal KBM (Jadwal tatap muka Kurikulum Merdeka 10 field standar, indikasi pulang cepat/auto-checkout tanpa mengajar).
     * Kategori 3: Kelalaian Pengisian Jurnal Kegiatan (Masa Sistem Blok, non-reguler, penugasan kedinasan).
   - Batas waktu pelaporan (cut-off harian, toleransi maksimal, kunci data mingguan dan tutup buku bulanan).
   - Struktur peran dan wewenang berjenjang: Guru Piket, Wali Kelas, Tim Kurikulum / Waka Kurikulum, Koordinator Piket/Kesiswaan, Administrator Sistem, Kepala Sekolah, dan Yayasan / Dinas Pendidikan.
   - Skema sanksi administratif bertingkat 5 tahap:
     * Tahap I: Teguran Lisan & Pembinaan Internal (Kelalaian 1-2x).
     * Tahap II: Surat Peringatan Pertama (SP 1) Tertulis (Kelalaian 3x).
     * Tahap III: Surat Peringatan Kedua (SP 2) Tertulis & Evaluasi Beban Ajar (Kelalaian 4-5x).
     * Tahap IV: Surat Peringatan Ketiga (SP 3) & Penangguhan/Evaluasi Insentif/Honor/TPP (Kelalaian 6x / Akumulatif).
     * Tahap V: Pemanggilan Pimpinan Sekolah dan Yayasan / Dinas Pendidikan (Sidang Disiplin, penarikan jam mengajar, evaluasi ikatan kerja).
   - Tabel matriks komparatif sanksi spesifik untuk ketiga kategori pelanggaran.
   - Tata kelola finansial (*Zero Journal = Zero Teaching Credit*, penahanan honor piket, pemotongan poin leaderboard kedisiplinan).
   - Prosedur klarifikasi dan dispensasi darurat (*force majeure*, kendala teknis jaringan/server SIPJAM, darurat medis) dengan batas waktu pengajuan 2 x 24 jam kerja, verifikasi silang (cross-check), dan eksekusi fitur *Reset Status* di Pusat Verifikasi oleh Administrator.
   - Keterkaitan teknis dengan modul SIPJAM (`attendanceAlpa.ts`, `view-admin-verif`, `view-analitik`, `view-admin-rekap`, dan Push Reminders).
   - Lembar pengesahan resmi (Ketua Yayasan/Komite, Pengawas Pembina, dan Kepala Sekolah).

2. **`docs/PANDUAN_PENGGUNA.md`** (Pembaruan):
   - Menambahkan Bab 8 "Kebijakan Disiplin & Konsekuensi Administratif" di Daftar Isi dan bagian penutup yang menautkan langsung ke `docs/KONSEKUENSI_PELANGGARAN.md`.

3. **`tests/konsekuensi_pelanggaran_verification.test.ts`** (Unit Test Baru):
   - Menguji secara komprehensif ke-13 kriteria keberterimaan (file location, 3 kategori pelanggaran, tahapan sanksi bertingkat, cut-off toleransi, wewenang verifikasi, dan mekanisme klarifikasi/dispensasi).

4. **`package.json`** (Pembaruan):
   - Mendaftarkan `tests/konsekuensi_pelanggaran_verification.test.ts` ke dalam script pengujian `npm test`.

## 3. Verification Record
- **Deep Verification (Automated Test Execution):**
  - Menjalankan `npx tsx tests/konsekuensi_pelanggaran_verification.test.ts`: 13 skenario pengujian PASS (0 Fail).
  - Menjalankan keseluruhan test suite SIPJAM (`npm test`): Seluruh 44 file test suite PASS tanpa regresi.
- **Shallow Verification (Manual Review):**
  - Memeriksa konsistensi istilah teknis antara dokumen SOP dengan fitur aktual sistem SIPJAM (`attendanceAlpa.ts`, `AdminVerifView`, `Pusat Verifikasi`, `Sistem Blok`, `Guru Inval`).
- **Unverified Aspects:**
  - Penerapan fisik di lingkungan rapat dewan guru dan penandatanganan basah lembar pengesahan oleh pejabat sekolah/yayasan terkait.

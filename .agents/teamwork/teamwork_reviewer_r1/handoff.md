# Teamwork Reviewer R1 Handoff

> [!WARNING] **Skepticism Disclaimer**
> Dokumen kebijakan dan SOP di `docs/KONSEKUENSI_PELANGGARAN.md` kini telah diperkuat dengan klausul Extended Force Majeure, harmonisasi hukum ASN vs Yayasan, kelengkapan tiket izin terlambat, kode SOP-SIPJAM, dan formulir baku F-SIPJAM; namun efektivitas penegakannya di lapangan tetap menuntut kedisiplinan verifikator manusia (Waka Kurikulum dan Kepala Sekolah) dalam memproses berita acara tepat waktu.

## 1. What the prior attempt got wrong
1. **Typo Path Komponen Pusat Verifikasi Admin (`src/components/AdminVerifikasiView.tsx`)**
   - **Input:** Pengecekan referensi arsitektur kode SIPJAM pada Bab 10 baris 357.
   - **Expected:** Path merujuk ke komponen yang valid di sistem berkas (`src/components/AdminVerifView.tsx`).
   - **Actual:** Dokumen merujuk ke `src/components/AdminVerifikasiView.tsx` yang tidak ada di repositori.
   - **Root Cause:** Implementer salah mengetik nama file komponen tanpa memverifikasi keberadaannya di disk.

2. **Kerentanan Batas Dispensasi pada Pemadaman Listrik/Bencana Berkepanjangan (> 2x24 Jam)**
   - **Input:** Pemadaman listrik massal atau putusnya kabel optik internet regional selama lebih dari 48 jam pada hari kerja.
   - **Expected:** Terdapat klausul perpanjangan otomatis waktu dispensasi (*tolling period*) agar guru yang terdampak musibah tidak terblokir hak pembelaannya.
   - **Actual:** Bab 9.2 mengunci batas pengajuan secara kaku 2 x 24 jam dan langsung menyatakan gugur (*inkracht*), sehingga guru terkena sanksi sepihak tanpa perlindungan hukum.
   - **Root Cause:** Belum tersedianya klausul *Extended Force Majeure* untuk melindungi guru dalam kondisi bencana atau gangguan massal multi-hari.

3. **Celah Yuridis Kewenangan Sanksi Guru ASN/PPPK vs Guru Yayasan**
   - **Input:** Pemberlakuan sanksi berat dan pemotongan tunjangan profesi guru (TPG/TPP).
   - **Expected:** Pembedaan mekanisme eksekusi sanksi: Guru Yayasan dieksekusi langsung oleh Bendahara Sekolah/Yayasan, sedangkan Guru ASN/PPPK diselaraskan dengan UU No. 20 Tahun 2023, PP No. 94 Tahun 2021 tentang Disiplin PNS, pelaporan jam riil ke Dapodik/SIMPATIKA sesuai Permendikbudristek No. 45 Tahun 2023, serta penerusan berkas BAP ke BKD/Dinas Pendidikan.
   - **Actual:** Dokumen implementer sebelumnya mencantumkan "rekomendasi pencabutan tunjangan sertifikasi/TPG/TPP" secara unilateral seolah pihak sekolah dapat langsung mencabut tunjangan dari APBN/APBD.
   - **Root Cause:** Tidak adanya sub-bab harmonisasi hukum kepegawaian yang membedakan koridor hukum sekolah swasta/yayasan dan sekolah negeri/ASN.

4. **Kelalaian Tiket Izin Terlambat Tidak Terakomodir**
   - **Input:** Guru hadir terlambat karena kendala darurat perjalanan dan sistem memiliki fitur "Izin Terlambat".
   - **Expected:** Kategori 1 memuat definisi dan matriks sanksi untuk kelalaian pengajuan tiket Izin Terlambat.
   - **Actual:** Implementer hanya mencatat tiket piket, izin/sakit, dinas luar, dan inval.
   - **Root Cause:** Pengabaian fitur tiket Izin Terlambat yang ada pada aplikasi (`GuruPresensi.tsx` dan `PANDUAN_PENGGUNA.md`).

5. **Ketiadaan Dokumen SOP Baku dan Format Formulir Blangko**
   - **Input:** Tata laksana pengajuan klarifikasi dan audit trail di dunia nyata sekolah.
   - **Expected:** Dokumen memuat ringkasan kode SOP (SOP-SIPJAM-01 s.d. 04) dan format blangko formulir fisik resmi (Formulir F-SIPJAM-01 Pengajuan Klarifikasi & Formulir F-SIPJAM-02 Berita Acara Reset Status).
   - **Actual:** Hanya berupa narasi kebijakan tanpa lampiran formulir operasional baku.
   - **Root Cause:** Ketiadaan lampiran blangko standar yang siap dicetak dan ditandatangani.

## 2. What I changed
- `docs/KONSEKUENSI_PELANGGARAN.md`:
  - Menambahkan poin 5: **Kelalaian Tiket Izin Terlambat** pada Kategori 1 (Bab 3.1).
  - Menambahkan baris **Tiket Izin Terlambat** serta klausul spesifikasi zona waktu operasional sekolah (WITA/WIB/WIT) pada tabel cut-off (Bab 4).
  - Menambahkan baris sanksi **Tidak Mengisi Tiket Izin Terlambat** pada Tabel 7.1.
  - Memperbaiki formulasi hukum pada Tabel 7.2 (sanksi pemalsuan jurnal KBM) menjadi rekomendasi penangguhan/peninjauan TPG/TPP ke Dinas/Kemendikbudristek.
  - Menambahkan Sub-bab **8.4. Harmonisasi Hukum Kepegawaian (Status Yayasan vs Status ASN/PPPK)** yang merujuk UU No. 20 Tahun 2023, PP No. 94 Tahun 2021, Permendikbudristek No. 45 Tahun 2023, Dapodik/SIMPATIKA, dan BKD.
  - Menambahkan poin 3 pada Bab 9.2: **Klausul Perpanjangan Otomatis Waktu Dispensasi (*Extended Force Majeure*)** untuk gangguan massal > 2 x 24 jam.
  - Memperbaiki path file komponen Pusat Verifikasi Admin dari `src/components/AdminVerifikasiView.tsx` menjadi `src/components/AdminVerifView.tsx` (Bab 10.2).
  - Menambahkan **Bab 12: STANDAR OPERASIONAL PROSEDUR (SOP) BAKU DAN LAMPIRAN FORMULIR** lengkap dengan tabel kode SOP (SOP-SIPJAM-01 s.d. 04), template fisik **Formulir F-SIPJAM-01** (Klarifikasi/Dispensasi), dan template fisik **Formulir F-SIPJAM-02** (Berita Acara Rekomendasi Dispensasi & Reset Status).
- `tests/konsekuensi_pelanggaran_verification.test.ts`:
  - Memperluas cakupan test suite dari 13 menjadi **19 skenario tes otomatis (100% PASS)**, memverifikasi klausul Extended Force Majeure, harmonisasi ASN/Yayasan, kelalaian tiket izin terlambat, spesifikasi zona waktu, kevalidan path komponen, serta ketersediaan kode SOP dan blangko formulir.
- `.agents/teamwork/teamwork_reviewer_r1/handoff.md` & `progress.md`:
  - Mendokumentasikan temuan audit independen, perbaikan substantif, dan catatan verifikasi menyeluruh.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/konsekuensi_pelanggaran_verification.test.ts`: **19 / 19 PASS (100%)**
  - `npm test`: **45 / 45 test suites PASS (100% passing across the entire repository)**
  - `npm run lint`: **0 errors (167 pre-existing warnings, 0 blocking errors)**
  - `npm run build`: **Exit code 0 (Next.js 16.3.4 Turbopack build succeeded, 13/13 static routes)**
- **Shallow Verification (manual only):**
  - Memeriksa keselarasan format blangko F-SIPJAM-01 dan F-SIPJAM-02 agar ramah cetak dan dapat langsung digunakan oleh tata usaha/kurikulum sekolah.
- **Unverified aspects:**
  - Penandatanganan fisik/basah dokumen SOP oleh Kepala Sekolah dan Pengurus Yayasan/Komite di dunia nyata.

## 4. Known Issues
- `Minor Robustness Risk` — Pada kasus sekolah yang berada di wilayah terisolir (blank spot permanen), dispensasi pengisian tiket/jurnal harus dikombinasikan dengan pencatatan buku jurnal manual fisik yang direkapitulasi secara berkala saat koneksi tersedia.

## 5. Remaining risk & next step
Dokumen kebijakan regulasi dan Prosedur Operasional Baku (SOP) konsekuensi pelanggaran administratif SIPJAM telah diaudit, disempurnakan secara menyeluruh, dan diverifikasi terhadap seluruh edge cases, aspek hukum kepegawaian, toleransi kedaruratan, serta kompatibilitas teknis kode. Tugas telah selesai dan siap diajukan ke tahap victory audit / pengesahan.

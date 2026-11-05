# Handoff Report — explorer_o27_2

## 1. Observation
1. **Sub menu Piket di Pusat Verifikasi (`src/components/AdminVerifView.tsx`):**
   * Baris 79: `supabase.from('jadwal_piket').select('*')` — hanya memuat jadwal statis `jadwal_piket`, tidak membaca `penugasan_piket` harian.
   * Baris 525–558 (`unsubmittedPiket`): Guru piket yang belum melapor dikelompokkan sebagai `isUnsubmitted: true` dengan `pesan_belum: "Terjadwal sebagai petugas piket hari ${effectiveDayName}, belum melapor"`.
   * Baris 927–952: Tampilan kartu merender badge `"Belum Selesai"`, teks `"Belum Ada Data"`, dan footer `"Menunggu pengajuan dari guru"`.
   * Berbeda dengan `src/components/PiketView.tsx` (baris 1381–1391 & 4119–4148) dan `src/lib/attendanceAlpa.ts` (baris 1133–1152) yang menetapkan status `"tidak membuat laporan piket"`.
2. **Sub menu Perangkat Pembelajaran (`src/components/DokumenView.tsx`):**
   * Baris 13–20: `KURIKULUM_DOCS` mendefinisikan 6 jenis dokumen kurikulum merdeka (CP, ATP, RPE, Prota, Promes, RPM).
   * Baris 331–383: `submitDokumen` hanya memvalidasi `if (!jenis || !judul || !file)`. Tidak ada validasi pemblokiran dokumen yang sudah ada pada tingkat kelas yang sama untuk mata pelajaran yang sama.
   * Baris 429–456 & 579–726: `myTeacherSubjects` dan `teacherSubjectCards` membagi target dokumen per rombel kelas individu (`${teacher.id}-${sub.nama_mapel}-${sub.kelas}`), sehingga guru yang mengajar kelas paralel (misal: *X Merdeka 1* dan *X Merdeka 2*) dituntut mengunggah dua kali (12 dokumen total) dan kartu kelas kedua ditandai `"Belum Lengkap"`.
   * Di `src/components/NaikKelasModal.tsx` (baris 25–57), sudah tersedia pola regex baku untuk mengekstrak tingkat kelas (*grade level*).
3. **Otomasi Jurnal KBM Ketidakhadiran Guru (`src/lib/workflow.ts`, `src/components/GuruPresensi.tsx`, `src/lib/attendanceAlpa.ts`, `src/components/RekapJurnalView.tsx`):**
   * Di `src/lib/workflow.ts` (baris 895–907), guru berstatus Izin/Sakit dikunci dengan alasan: `"Anda sedang Izin/Sakit. Tidak perlu mengisi Jurnal/Piket/Pulang."`.
   * Di `src/components/GuruPresensi.tsx` (baris 626), pengisian otomatis jurnal kosong hanya dipicu pada presensi `Pulang`. Guru sakit/izin/dinas luar tidak melakukan checkout sehingga tidak terpicu.
   * Di `src/lib/attendanceAlpa.ts` (baris 1020–1069) dan `src/components/RekapJurnalView.tsx` (baris 303–328), jadwal KBM yang kosong tanpa jurnal langsung diisi atau disintesis menjadi status pelanggaran: `materi: "tidak masuk kelas"`, `status_verifikasi: "Tidak Masuk Kelas"`.
   * Di `src/components/AdminVerifView.tsx` (baris 476–523), guru yang sakit/izin/dinas luar masuk daftar `unsubmittedJurnal` dengan pesan kelalaian: `"Belum mengisi jurnal KBM untuk X kelas terjadwal pada hari..."`.

---

## 2. Logic Chain
1. Dari Observasi 1: Di `AdminVerifView.tsx`, guru terjadwal piket yang tidak membuat laporan saat ini tertahan dalam status ambigu `"Belum Selesai"` dan `"Menunggu pengajuan dari guru"`. Padahal persyaratan R2 secara eksplisit menetapkan bahwa guru piket yang tidak membuat laporan harus **langsung ditandai "tidak membuat laporan piket" tanpa perlu konfirmasi lagi dari admin maupun sistem**. Solusinya adalah menetapkan `status_verifikasi: 'tidak membuat laporan piket'` secara langsung pada pemetaan data dan merender badge oranye `"tidak membuat laporan piket"` tanpa popup konfirmasi atau tombol aksi gantung.
2. Dari Observasi 2: Di `DokumenView.tsx`, ketiadaan validasi tingkat kelas menyebabkan pengunggahan duplikat untuk kelas paralel dan mendistorsi persentase kelengkapan pada matriks verifikasi. Dengan menerapkan `extractTingkat(kelas)`, form `submitDokumen` dapat memeriksa keberadaan dokumen sejenis pada mata pelajaran dan tingkat kelas yang sama, memblokir pengunggahan ganda, dan memperlakukan satu dokumen yang sudah diunggah sebagai pemenuhan syarat untuk seluruh kelas paralel pada tingkat tersebut.
3. Dari Observasi 3: Guru yang telah berpresensi Sakit, Izin, atau Dinas Luar terhalang mengisi jurnal KBM, namun ketiadaan entri jurnal justru menghukum mereka dengan label pelanggaran `"tidak masuk kelas"` di rekapitulasi dan verifikasi admin. Oleh karena itu, sistem harus mengotomatiskan pembuatan entri jurnal KBM (`jurnal_pembelajaran`) atau penyelarasan rekapitulasi untuk seluruh jadwal KBM guru tersebut pada hari ketidakhadiran dengan status keterangan presensinya (`Sakit`, `Izin`, atau `Dinas Luar`), sehingga tercermin benar di `RekapJurnalView.tsx` dan `AdminVerifView.tsx`.

---

## 3. Caveats
1. **Multi-day Leave Range:** Untuk presensi Sakit atau Izin yang memiliki rentang tanggal multi-hari (`tanggal_mulai` s/d `tanggal_selesai`, `durasi_hari > 1`), pengisian otomatis jadwal KBM harus mencakup setiap hari kerja aktif dalam rentang tanggal tersebut, bukan hanya hari pertama.
2. **Jadwal Blok:** Jika tanggal ketidakhadiran bertepatan dengan Periode Sistem Blok aktif, guru tidak memiliki jadwal KBM reguler melainkan Jurnal Kegiatan. Entri otomatis harus menyesuaikan menjadi Jurnal Kegiatan berstatus presensi tersebut.
3. **Preservasi Catatan dan Bukti:** Bukti presensi (`link_bukti`) dan catatan izin/sakit/dinas luar dari guru sebaiknya diteruskan ke kolom `foto_kegiatan`/`link_bukti_foto` dan `kegiatan` pada jurnal KBM otomatis agar admin dapat meninjau konteksnya secara transparan.

---

## 4. Conclusion
1. **Piket:** Perlu memuat jadwal dari gabungan `jadwal_piket` dan `penugasan_piket` di `AdminVerifView.tsx`, dan langsung menyematkan status `'tidak membuat laporan piket'` pada data guru yang tidak menyetor laporan tanpa dialog konfirmasi atau status menunggu.
2. **Perangkat Pembelajaran:** Perlu menyematkan fungsi `extractTingkat(kelas)` di `DokumenView.tsx`, menambahkan validasi blokir unggah duplikat di `submitDokumen`, serta menyelaraskan matriks pemantauan agar satu unggahan mencakup seluruh kelas paralel bertingkat sama.
3. **Jurnal KBM Sakit/Izin/Dinas Luar:** Perlu menyediakan mekanisme otomasi `autoFillKbmJournalsForLeave` yang dijalankan saat presensi diajukan di `GuruPresensi.tsx` (dan `/api/attendance`), serta mengharmoniskan penanganan jadwal kosong di `attendanceAlpa.ts`, `RekapJurnalView.tsx`, dan `AdminVerifView.tsx` agar status `Sakit`, `Izin`, dan `Dinas Luar` otomatis tercatat pada jurnal KBM tanpa menghasilkan status kelalaian `"tidak masuk kelas"`.

Rincian arsitektural lengkap dan usulan kode tersedia di `report.md`.

---

## 5. Verification Method
Untuk memverifikasi secara independen ketika perubahan diimplementasikan:
1. **Lint dan Typecheck:**
   ```powershell
   npx tsc --noEmit
   npm run lint
   ```
   *Kondisi invalidasi:* Terdapat type error pada fungsi ekstraksi tingkat kelas atau parameter `autoFillKbmJournalsForLeave`.
2. **Rangkaian Automated Tests:**
   ```powershell
   npm test
   ```
   Pastikan seluruh test suites (termasuk `m6_4_piket_perangkat_broadcast.test.ts` dan `pulang_cepat_dan_jurnal_kosong_verification.test.ts`) tetap lulus 100%.
3. **Pemeriksaan File Terkait:**
   * `src/components/AdminVerifView.tsx`: pastikan sub menu Piket menampilkan status `"tidak membuat laporan piket"`.
   * `src/components/DokumenView.tsx`: pastikan validasi kelas paralel pada tingkat sama berfungsi di form unggah.
   * `src/components/GuruPresensi.tsx` & `src/lib/attendanceAlpa.ts`: pastikan presensi Sakit/Izin/Dinas Luar mengisikan jurnal KBM otomatis.

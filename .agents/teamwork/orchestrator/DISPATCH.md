## 2026-10-29T11:21:19Z
Implement the comprehensive consolidation of features and menus across all roles in sipjam-app according to the design and recommendations in docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md, while ensuring zero feature loss.

Integrity mode: development

## Requirements

### R1. Comprehensive Feature and Menu Consolidation
Consolidate all 7 feature clusters across all user roles (Guru Reguler, Wali Kelas, Guru Piket, Administrator, Kepala Sekolah, Pengawas Dinas, dan Superadmin) as specified in docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md, streamlining sidebar navigation, eliminating duplicate view rendering, and grouping related workflows into cohesive sub-tabs.

### R2. Zero Feature Loss Guarantee
Ensure all existing functionalities, forms, modals, action buttons, filters, exports, validations, and role-specific workflows across every user role remain 100% intact, fully accessible, and operative with zero regression.

### R3. Transparent Backward Compatibility and Aliasing
Provide transparent aliasing or route/view redirection for legacy view IDs and automated tour selectors (data-tour) so that existing links, bookmarks, and automated test selectors continue to function correctly alongside the consolidated sub-tab structure.

## Acceptance Criteria

### Menu Consolidation & Role Navigation
- [ ] All 7 clusters described in docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md are consolidated into their target menu structure for each role (Guru Reguler, Wali Kelas, Guru Piket, Administrator, Kepala Sekolah, Pengawas Dinas, dan Superadmin).
- [ ] Redundant top-level menu items are grouped into cohesive sub-tab views as specified in the recommendation document.

### Zero Feature Loss & Backward Compatibility
- [ ] All role-specific forms, modals, tables, actions, and features remain present and functional.
- [ ] Legacy view IDs and data-tour selectors resolve or alias seamlessly to their corresponding views or sub-tab without breaking existing references.

### Code Integrity & Verification
- [ ] TypeScript compilation (npx tsc --noEmit) completes with zero errors.
- [ ] Next.js production build (npm run build) completes successfully.
- [ ] Existing automated test suites (npm test) pass without failures.
- [ ] Regression tests covering the consolidated navigation and view transitions pass.

---
Working directory: .agents/teamwork/orchestrator/
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Parent Sentinel Conversation ID: 0759d8ae-8b5b-40f8-a4c3-fd7e7fee7312


## 2026-11-02T12:25:16Z
Sesuaikan fitur sistem blok pada aplikasi Sipjam untuk kebutuhan produksi agar lebih fleksibel, dengan menyediakan opsi target pemblokiran per aturan (keseluruhan sekolah, per angkatan, per kelas, atau per guru) serta opsi rentang hari dan rentang jam.

Integrity mode: development

## Requirements

### R1. Fleksibilitas Pilihan Target Pemblokiran
Menyediakan pilihan cakupan target pemblokiran pada setiap aturan sistem blok, di mana pengguna dapat memilih salah satu tipe target:
- Keseluruhan sekolah
- Angkatan tertentu
- Kelas tertentu
- Guru tertentu

### R2. Fleksibilitas Pengaturan Rentang Hari dan Jam
Mendukung pengaturan rentang tanggal (tanggal mulai s/d selesai) serta opsi pembatasan rentang jam tertentu pada pemblokiran. Apabila rentang jam tidak dibatasi, pemblokiran berlaku penuh sepanjang hari secara default.

### R3. Dampak Pemblokiran pada Jadwal dan Jurnal
Jadwal pelajaran yang berada dalam rentang target dan waktu yang diblok harus di-masking / ditandai sebagai kegiatan blok, dan guru yang terdampak mengisi jurnal kegiatan blok sesuai alur kerja sistem blok yang ada.

## Verification Resources
- Test suite yang sudah ada: `tests/sistem_blok_verification.test.ts`. Perluas dan jalankan test suite ini untuk memverifikasi fungsionalitas target (kelas, angkatan, guru, keseluruhan) dan rentang jam baru.

## Acceptance Criteria

### Konfigurasi Target Blok
- [ ] Pengguna dapat membuat dan memperbarui aturan blok dengan memilih salah satu tipe target: Keseluruhan Sekolah, per Angkatan, per Kelas, atau per Guru.
- [ ] Penyimpanan data sistem blok berhasil menyimpan atribut target pemblokiran yang dipilih.

### Pengaturan Waktu Pemblokiran
- [ ] Pengguna dapat menentukan tanggal mulai dan tanggal selesai pemblokiran.
- [ ] Pengguna dapat menentukan rentang jam pemblokiran tertentu.
- [ ] Pemblokiran tanpa batasan jam berlaku penuh sepanjang hari pada rentang tanggal tersebut.

### Integrasi Jadwal & Jurnal
- [ ] Jadwal pelajaran yang terdampak oleh pemblokiran (sesuai kelas, angkatan, guru, atau keseluruhan sekolah pada rentang hari dan jam yang aktif) tertutupi/di-masking sebagai kegiatan blok.
- [ ] Jadwal di luar target atau di luar rentang jam yang diblok tetap berjalan normal dan tidak terpengaruh.
- [ ] Guru yang terdampak oleh aturan blok dapat mengisi jurnal kegiatan blok.

### Verifikasi Otomatis
- [ ] Script pengujian `tests/sistem_blok_verification.test.ts` diperbarui untuk mencakup skenario pengujian baru (pemblokiran per kelas, per angkatan, per guru, keseluruhan, serta rentang jam).
- [ ] Seluruh skenario pengujian dalam `tests/sistem_blok_verification.test.ts` berjalan dan lulus tanpa kegagalan (0 failed).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\
Identity: Project Orchestrator
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Parent Sentinel Conversation ID: 34e9fcc0-0e2b-426b-b899-621289fdc022

## 2026-11-05T23:51:21Z
Menambahkan sub menu Kelas pada menu master data untuk role admin serta memusatkan penentuan/alokasi kelas siswa di menu ini. Menyelaraskan seluruh template master data (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, Wali Kelas) dengan skema database agar berkas CSV yang diunduh dan diunggah dapat terbaca serta tersimpan dengan tepat, tanpa mengubah logika atau fitur lain yang tidak terdampak.

Integrity mode: development

## Requirements

### R1. Sub Menu Kelas dan Pemusatan Penentuan Kelas Siswa
Pada role admin di menu master data, sediakan sub menu Kelas yang menampilkan daftar kelas dan memusatkan pengelolaan alokasi/penentuan kelas dari setiap siswa di menu ini. Pengguna admin dapat mengelola kelas serta menetapkan atau memindahkan siswa ke kelas tertentu secara terpusat dari sub menu ini.

### R2. Penyelarasan Template Master Data dengan Skema Database
Seluruh template master data yang memiliki fitur unduh dan unggah (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, dan Wali Kelas) harus diselaraskan secara presisi dengan skema database yang berlaku. Header kolom dan format data pada template harus sesuai dengan definisi kolom tabel target sehingga berkas hasil unduhan template siap diisi dan diunggah.

### R3. Pemrosesan dan Kompatibilitas Unggah CSV
Mekanisme pembacaan dan impor berkas CSV master data harus memproses berkas template yang diisi pengguna secara akurat ke database yang ada. Validasi data dan feedback proses unggah harus memastikan data tersimpan dengan benar tanpa ada kegagalan pembacaan kolom maupun kesalahan pemetaan field.

### R4. Batasan Non-Regresi (Preservasi Fitur Eksisting)
Penambahan fitur maupun perubahan kode pada master data tidak boleh mengubah atau merusak fitur dan logika lain yang tidak terdampak dalam aplikasi. Fungsionalitas eksisting pada modul admin, guru, jadwal, presensi, serta alur kerja yang sudah berjalan harus tetap berfungsi normal.

## Acceptance Criteria

### Sub Menu Kelas & Manajemen Siswa
- [ ] Sub menu Kelas dapat diakses oleh role admin pada menu master data.
- [ ] Daftar kelas ditampilkan dan terdapat mekanisme untuk menetapkan atau memperbarui kelas siswa langsung dari sub menu ini.
- [ ] Data penentuan kelas siswa yang diperbarui tersimpan dengan konsisten pada database dan terefleksi di aplikasi.

### Template Master Data & Impor CSV
- [ ] Tersedia opsi unduh template CSV untuk entitas Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, dan Wali Kelas yang strukturnya sesuai skema database.
- [ ] Berkas CSV dari seluruh template master data berhasil diunggah, diparsing, dan disimpan ke tabel database terkait tanpa kegagalan pemetaan kolom.
- [ ] Seluruh dataset uji / sampel CSV yang valid dapat terbaca dan terimpor dengan benar.

### Integritas Sistem & Preservasi Fitur (Zero Regression)
- [ ] Penambahan fitur dan perubahan yang dilakukan tidak merubah fitur lain dan logika lain yang tidak terdampak pada perubahan ini.
- [ ] Seluruh pengujian otomatis proyek yang ada (`npm test`) tetap lulus tanpa adanya kegagalan regresi (zero regression).

---
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\
Workspace directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Your Identity: Project Orchestrator
Parent Sentinel Conversation ID: 1cf2d098-0871-4486-acc7-a26d163e3931


## 2026-11-06T22:28:35Z
Melakukan penyesuaian fungsional pada role admin aplikasi sipjam-app untuk kebutuhan produksi pada modul pusat verifikasi data (termasuk cetak dokumen presensi dan jurnal), laporan dan analitik kerja, asesmen dan rapor, master data, serta pengaturan sistem, dengan memastikan seluruh perubahan tidak merusak atau mempengaruhi fitur dan logika yang sudah ada (zero regression).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Pusat Verifikasi Data & Cetak Dokumen Terkait
- Pada bagian presensi dan jurnal, jika guru dalam keadaan libur, izin, atau sakit, status tersebut harus terbaca dan diakomodasi dengan benar pada validasi presensi dan jurnal (tidak dianggap alpa/belum presensi/belum mengisi jurnal).
- Pada hasil cetak dokumen presensi dan jurnal, status izin dan sakit dicantumkan dengan benar, sedangkan keterangan libur tidak perlu dimasukkan pada cetak dokumen.
- Pada bagian perangkat, mata pelajaran untuk kelas X harus dituliskan dengan benar, bukan tertulis sebagai mata pelajaran umum.

### R2. Penyesuaian Laporan dan Analitik Kerja
- Menghilangkan sub menu cetak dokumen resmi dari modul laporan dan analitik kerja.

### R3. Penyesuaian Asesmen dan Rapor (Buku Nilai Mapel)
- Pada bagian buku nilai mapel, alur pemilihan harus dimulai dengan memilih guru pengampu terlebih dahulu.
- Setelah guru pengampu dipilih, sistem menyesuaikan daftar mata pelajaran dan kelas yang ditugaskan kepada guru tersebut secara berjenjang, di mana pilihan kelas mengikuti mata pelajaran yang dipilih (misalnya jika mata pelajaran berada di kelas XI, maka daftar kelas yang ditampilkan adalah kelas XI).

### R4. Penyesuaian Master Data (Alur Input, Template, Progress, dan Error Handling)
- Menata urutan navigasi menu dan panduan alur penginputan master data sesuai urutan: siswa, kelas, mapel, guru, jadwal, wali kelas, pengguna, kalender, dan periode sistem blok (opsional), dengan validasi dependensi saat proses upload.
- Memastikan template data pada masing-masing master data sesuai dengan format skema database agar tidak ada error saat pengunggahan.
- Menampilkan visualisasi progres unggah (progress bar / indikator) yang dapat dilihat pengguna saat proses upload berlangsung.
- Menampilkan keterangan error yang jelas dan spesifik jika terjadi kegagalan upload, baik yang bersumber dari database maupun validasi aplikasi.

### R5. Penyesuaian Pencadangan Data Sistem
- Fitur pencadangan pada pengaturan sistem harus mencadangkan seluruh data yang ada dan berhubungan pada aplikasi.
- Berkas cadangan dikemas dalam format ZIP dengan pemisahan folder data (berisi seluruh tabel/entitas database dalam format JSON terstruktur) dan folder foto/aset, namun tetap berada dalam satu berkas ZIP yang sama.
- Format data yang dicadangkan harus kompatibel dan dapat dibaca kembali oleh aplikasi di kemudian hari untuk proses pemulihan (restore).

### R6. Preservasi Fitur dan Logika Eksisting (Zero Regression)
- Seluruh penyesuaian tidak boleh mempengaruhi fitur, alur kerja, maupun logika bisnis lain di luar cakupan yang ditentukan, dan seluruh fungsi aplikasi yang sudah berjalan tetap beroperasi normal.

## Acceptance Criteria

### Pusat Verifikasi Data & Cetak Dokumen
- [ ] Validasi presensi dan jurnal membaca serta menampilkan status guru yang libur, izin, atau sakit dengan benar tanpa menandainya sebagai alpa atau kelalaian jurnal.
- [ ] Cetak dokumen presensi dan jurnal mencantumkan keterangan status izin dan sakit secara akurat dan terbaca jelas, serta tidak memasukkan keterangan libur pada hasil cetak dokumen.
- [ ] Tampilan mata pelajaran kelas X pada verifikasi perangkat menampilkan nama mata pelajaran yang spesifik/benar dan tidak tertulis "mata pelajaran umum".

### Laporan dan Analitik Kerja
- [ ] Sub menu cetak dokumen resmi telah dihilangkan dari navigasi menu dan routing antarmuka laporan dan analitik kerja.

### Asesmen dan Rapor (Buku Nilai Mapel)
- [ ] Alur filter buku nilai mapel mengharuskan pemilihan guru pengampu terlebih dahulu.
- [ ] Dropdown mata pelajaran terfilter hanya untuk mata pelajaran yang ditugaskan kepada guru yang dipilih.
- [ ] Dropdown kelas terfilter dinamis mengikuti kelas dari mata pelajaran yang dipilih untuk guru tersebut.

### Master Data
- [ ] Urutan menu navigasi master data tersusun sesuai: Siswa -> Kelas -> Mapel -> Guru -> Jadwal -> Wali Kelas -> Pengguna -> Kalender -> Periode Sistem Blok.
- [ ] Template unduhan untuk setiap entitas master data sesuai dengan skema database dan dapat diunggah ulang tanpa error format.
- [ ] Komponen upload master data menampilkan indikator progress yang bergerak saat proses pengunggahan berlangsung.
- [ ] Ketika upload data gagal atau tidak valid, sistem menampilkan rincian error yang jelas (berdasarkan error database maupun validasi aplikasi).

### Pencadangan Sistem
- [ ] Fitur pencadangan menghasilkan berkas ZIP yang memuat seluruh data aplikasi dengan struktur folder data (format JSON) dan folder foto yang terpisah.
- [ ] Format data JSON dan berkas foto dalam file cadangan terverifikasi dapat dibaca ulang oleh sistem aplikasi untuk pemulihan.

### Preservasi Sistem
- [ ] Fitur dan logika aplikasi yang sudah ada di luar 6 poin perubahan tetap berfungsi normal tanpa regresi fungsional.

---
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Sentinel conversation ID: 19734b9a-16be-48ba-9cb0-972d45634c0f

## 2026-11-07T17:06:12Z
Tambahkan role Tata Usaha (TU) serta susun perintilannya untuk aplikasi SIPJAM dengan pendekatan /ponytail (solusi paling ringkas, sederhana, dan tepat guna tanpa over-engineering) untuk kebutuhan operasional production.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penambahan Role Tata Usaha
Sistem mendukung role `tata_usaha` pada autentikasi, otorisasi, dan manajemen pengguna aplikasi.

### R2. Cakupan Akses dan Navigasi Tata Usaha
Role Tata Usaha memiliki akses operasional hanya untuk mengelola Data Siswa dan Data Guru, serta tidak memiliki akses ke Bank Dokumen / Persuratan, pengaturan konfigurasi sistem, maupun akun superadmin.

### R3. Pendekatan Sederhana dan Minimalis (/ponytail)
Implementasi perintilan dan alur kerja role Tata Usaha harus memanfaatkan struktur dan komponen yang sudah ada di basis kode, tanpa dependensi baru atau abstraksi berlebihan yang tidak perlu.

### R4. Preservasi Fitur dan Logika Eksisting
Perubahan ini tidak boleh mempengaruhi fitur dan logika yang ada pada aplikasi. Seluruh alur kerja untuk role lain (superadmin, admin, guru, dinas_pendidikan, siswa) harus tetap berfungsi secara normal tanpa regresi.

## Verification Resources
- Test suite otomatis yang ada di repository (`npm test` / Vitest).

## Acceptance Criteria

### Autentikasi dan Otorisasi Role
- [ ] Pengguna dengan role `tata_usaha` berhasil login dan diidentifikasi sesuai role dalam sesi aplikasi.
- [ ] Menu navigasi untuk role `tata_usaha` hanya menampilkan akses operasional ke Data Siswa dan Data Guru (tanpa Bank Dokumen / Persuratan).
- [ ] Pengguna dengan role `tata_usaha` ditolak atau dibatasi dari mengakses Bank Dokumen / Persuratan, pengaturan konfigurasi sistem, dan akun superadmin.

### Preservasi dan Integritas Sistem Eksisting
- [ ] Perubahan ini tidak mempengaruhi fitur dan logika yang ada pada aplikasi; seluruh alur kerja untuk role lain tetap berfungsi normal.
- [ ] Automated test suite di repository (`npm test`) berjalan sukses tanpa regresi.
- [ ] Terdapat automated test yang memverifikasi hak akses navigasi dan otorisasi role `tata_usaha`.

---
Execution context:
Working directory: .agents/teamwork/orchestrator/
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Identity: Project Orchestrator
Parent conversation ID: 98ace464-8491-4e0b-bfde-0d13fa400860


## 2026-11-07T21:46:19Z
Penyesuaian fungsionalitas dan navigasi pada role Tata Usaha (TU), pengelolaan penugasan/pembuatan akun TU oleh Admin, serta pemisahan rekapitulasi presensi per halaman antara Guru dan TU pada role Admin di sipjam-app untuk kebutuhan produksi, menggunakan pendekatan /ponytail (solusi paling ringkas, sederhana, dan tepat guna tanpa over-engineering).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Menu Navigasi Role TU
Menu navigasi untuk role Tata Usaha (TU) harus dibatasi dan hanya terdiri dari:
1. Presensi TU
2. Jurnal Kegiatan
3. Asesmen (mode read-only)
4. Rapor (mode read-only)
5. Informasi Sekolah
6. Pengaturan Akun
Menu navigasi lain di luar daftar tersebut tidak boleh ditampilkan untuk role TU.

### R2. Hak Akses Read-Only Asesmen dan Rapor untuk TU
Pengguna dengan role TU dapat melihat dan meninjau data asesmen dan rapor untuk semua tingkatan kelas dan semua guru. Seluruh elemen aksi yang memodifikasi, menambah, mengubah, atau menghapus nilai dan data rapor/asesmen dinonaktifkan atau disembunyikan bagi role TU sehingga murni read-only.

### R3. Pemisahan Halaman Rekap Presensi Guru dan TU pada Role Admin
Ketika Admin menarik atau mencetak rekapitulasi presensi:
1. Daftar presensi antara Guru dan TU disajikan terpisah pada tampilan tabel antarmuka.
2. Saat dokumen dicetak atau diekspor ke PDF/kertas, terdapat pemisah halaman (page-break) yang memastikan daftar Guru dan daftar TU tercetak pada halaman terpisah.

### R4. Pengelolaan dan Penugasan Akun TU oleh Admin
Admin dapat mengelola penugasan akun TU dengan dua mekanisme:
1. Menunjuk akun TU dari data guru yang sudah ada.
2. Membuat akun baru khusus role TU. Untuk pembuatan akun baru TU, formulir pendaftaran wajib mengisi data: NIP, nama lengkap, nomor HP, dan email aktif.

### R5. Preservasi Logika dan Fungsionalitas Eksisting
Perubahan pada role TU dan Admin tidak boleh mempengaruhi, merusak, atau mengubah fungsionalitas dan logika fitur lain yang sudah berjalan di aplikasi.

### R6. Pengujian dan Verifikasi Otomatis
Implementasi harus diverifikasi dengan pengujian otomatis (automated unit/integration tests) yang menguji batasan menu role TU, hak akses read-only asesmen/rapor, alur penunjukan/pembuatan akun baru TU, dan pemisahan rekap presensi guru dan TU.

## Acceptance Criteria

### Navigasi Role TU
- [ ] Pengguna login dengan role TU hanya melihat menu: Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, dan Pengaturan Akun di navigasi aplikasi.
- [ ] Menu yang diperuntukkan bagi peran lain tidak muncul pada akun TU.

### Hak Akses Read-Only Asesmen & Rapor Role TU
- [ ] Role TU dapat mengakses tampilan Asesmen untuk seluruh tingkatan kelas dan guru tanpa tombol simpan/edit nilai yang aktif.
- [ ] Role TU dapat mengakses tampilan Rapor untuk seluruh tingkatan kelas dan guru dalam mode lihat (read-only) tanpa tombol manipulasi data rapor.

### Pengelolaan Akun Role TU oleh Admin
- [ ] Admin dapat menunjuk TU dari data guru yang ada.
- [ ] Admin dapat membuat akun baru role TU dengan formulir yang mewajibkan input NIP, nama lengkap, nomor HP, dan email aktif.
- [ ] Validasi form pembuatan akun baru TU memastikan keempat field wajib terisi sebelum data tersimpan.

### Rekap Presensi Admin (Guru vs TU)
- [ ] Pada rekap presensi admin, data guru dan data TU terpisah secara visual dalam tabel atau seksi masing-masing.
- [ ] Saat rekap presensi dicetak (print view / print preview), daftar guru dan daftar TU tercetak pada halaman yang terpisah (terdapat page-break yang memisahkan kedua kelompok).

### Integritas dan Pengujian
- [ ] Automated test (misalnya skrip pengujian berbasis Vitest/Jest) dijalankan dan lulus 100%, memverifikasi struktur menu role TU, read-only mode, form/penugasan akun TU, dan pemisahan rekap admin.
- [ ] Fitur presensi, jurnal guru, dan alur aplikasi eksisting lainnya tetap berfungsi normal tanpa regresi.

---
Identity: Project Orchestrator
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\
Original request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Parent Sentinel Conversation ID: cb84033a-1c20-41e5-ba3f-bab2bf9fc4da

## 2026-11-09T05:09:12Z
Implementasikan role BK (Bimbingan Konseling) dan fitur jurnal khusus BK yang tidak terikat kelas ke dalam aplikasi SIPJAM untuk kebutuhan produksi, dengan memastikan integritas sistem dan tidak merubah fitur atau logika lain yang tidak terdampak.

Integrity mode: development

## Requirements

### R1. Role BK (Bimbingan Konseling) & Kontrol Akses
Sediakan role BK dalam sistem SIPJAM dengan hak akses khusus ke fitur bimbingan konseling. Akses terhadap data jurnal BK dibatasi hanya untuk role BK dan Admin / Kepala Sekolah, dan tidak dapat diakses oleh role guru reguler atau pengguna lain tanpa izin.

### R2. Fitur Jurnal Khusus BK (Tidak Terikat Kelas)
Sediakan fitur jurnal khusus untuk BK yang beroperasi secara independen tanpa terikat pada jadwal pelajaran, mata pelajaran, atau rombel kelas tertentu. Jurnal BK memungkinkan pencatatan aktivitas layanan konseling siswa sesuai alur standar BK sekolah (mencakup siswa terkait, tanggal/waktu kegiatan, jenis layanan/bimbingan, catatan, dan tindak lanjut).

### R3. Non-Regresi Fitur Eksisting
Pastikan penambahan role BK dan fitur jurnal BK ini tidak merubah fitur dan logika lain yang tidak terdampak oleh perubahan ini, termasuk fitur jurnal pembelajaran guru mapel, jadwal pelajaran, presensi/piket, dan otorisasi role lainnya.

## Acceptance Criteria

### Role BK & Akses Kontrol
- [ ] Pengguna dapat memiliki role BK dan dapat login serta mengakses modul atau menu khusus BK.
- [ ] Data jurnal BK hanya dapat diakses dan dikelola oleh role BK dan Admin / Kepala Sekolah, serta terlindungi dari akses oleh guru reguler atau akun lain.

### Fungsionalitas Jurnal BK
- [ ] Pengguna role BK dapat membuat, melihat, memperbarui, dan menghapus (CRUD) entri jurnal BK tanpa memerlukan relasi ke jadwal pelajaran atau jam kelas reguler.
- [ ] Entri jurnal BK dapat mencatat data konseling siswa dengan field informasi standar (identitas siswa, tanggal/waktu bimbingan, jenis/bidang layanan bimbingan, catatan kasus/konseling, dan rencana tindak lanjut).
- [ ] Daftar entri jurnal BK dapat ditampilkan dan dicari/difilter berdasarkan tanggal atau nama siswa.

### Non-Regresi & Kualitas Kode
- [ ] Fitur jurnal pembelajaran guru mapel yang sudah ada tetap berfungsi normal dan tetap terikat jadwal/kelas masing-masing tanpa gangguan.
- [ ] Alur dan fitur eksisting lainnya (jadwal pelajaran, presensi/piket, manajemen user/guru) tetap berjalan normal tanpa error fungsional.
- [ ] Seluruh proses verifikasi standar repo (lint, type-check, dan build) berhasil dijalankan tanpa error.

---
Identity: Project Orchestrator
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator
Original request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Parent conversation ID: 68b9bb7f-cdd0-4a24-afb1-7a1b9d79e1ca

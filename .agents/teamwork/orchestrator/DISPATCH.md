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

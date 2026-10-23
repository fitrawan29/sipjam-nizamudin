# Project Orchestrator Assignment (orchestrator_23)

## Identity & Workspace
- Identity: Project Orchestrator (orchestrator_23)
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_23
- Authoritative Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

## Mission & Requirements
Implementasi role baru `dinas_pendidikan` pada aplikasi SIPJAM untuk monitoring eksekutif kehadiran guru dan siswa lintas sekolah binaan, di mana wilayah binaan ditentukan oleh akun Superadmin sehingga Dinas Pendidikan hanya dapat melihat, merekap, dan mencetak laporan sekolah dalam daerah binaannya secara read-only tanpa hak mutasi data sekolah, dengan pengiriman akhir otomatis ter-push ke branch `dev`.

Working directory: c:/Users/Fitra/OneDrive/Documents/sipjam-app
Integrity mode: development

### Requirements

#### R1. Penugasan Wilayah oleh Superadmin & RBAC `dinas_pendidikan`
1. Tambahkan peran `dinas_pendidikan` pada autentikasi, manajemen pengguna, dan tenant context.
2. Akun Superadmin memiliki wewenang untuk mengatur/menugaskan daerah binaan (`kota_kabupaten` / wilayah tugas) ke setiap akun Dinas Pendidikan.
3. Akun Dinas Pendidikan secara ketat hanya dapat melihat dan mengakses data sekolah di wilayah yang telah ditugaskan kepadanya oleh Superadmin (wilayah di luar penugasan tidak dapat diakses).
4. Role `dinas_pendidikan` terisolasi sebagai read-only: dilarang menambah, mengedit, atau menghapus master data, akun pengguna, konfigurasi sekolah, maupun presensi.

#### R2. Executive Cross-School Monitoring Dashboard (Scoped to Assigned Region)
Sediakan dashboard pemantauan terpusat bagi akun dinas yang hanya mencakup sekolah-sekolah di wilayah binaannya:
1. Ringkasan agregat: total sekolah aktif binaan, persentase kehadiran guru & siswa hari ini, status koneksi/kesehatan satelit sekolah, dan sekolah yang memerlukan perhatian (alpa tinggi).
2. Kontrol pencarian dan filter intra-wilayah (misal filter per status/nama sekolah) yang tetap terkunci di dalam batas wilayah penugasan dinas tersebut.
3. Fitur cetak ringkasan rekapitulasi daerah binaan untuk keperluan pelaporan resmi dinas.

#### R3. Read-Only School Drilldown & Attendance Recap + Cetak Laporan
Sediakan fitur drilldown ke salah satu sekolah binaan di wilayahnya memanfaatkan infrastruktur `getActiveTargetSchool`:
1. Dinas dapat meninjau serta mencetak laporan rekapitulasi presensi guru, presensi siswa, dan jurnal kelas sekolah target.
2. Memanfaatkan sistem cetak standar SIPJAM (`PrintHeader` / dialog cetak dokumen resmi yang sudah ada).
3. Seluruh tampilan drilldown beroperasi dalam mode baca murni tanpa tombol aksi administratif/mutasi data.

#### R4. Automated Verification & Security Guard Test
Buat file pengujian otomatis (`tests/dinas_pendidikan_monitoring.test.ts`) yang memverifikasi:
1. Superadmin dapat menugaskan daerah (`kota_kabupaten`) ke akun dinas.
2. Akun dinas yang login hanya dapat melihat sekolah-sekolah dalam daerah yang ditugaskan kepadanya (data sekolah daerah lain tidak bocor).
3. Fitur cetak/rekap dapat diakses oleh role dinas, sedangkan seluruh endpoint/fungsi mutasi data terproteksi dan menolak aksi dari role dinas.
4. Agregasi metrik dan fitur drilldown sekolah binaan berjalan akurat.

#### R5. Build Verification & Git Delivery to `dev`
1. Pastikan kompilasi TypeScript (`npx tsc --noEmit`) dan build aplikasi (`npm run build`) sukses tanpa error.
2. Sesuai panduan `GEMINI.md`, lakukan staging (`git add .`), commit pesan deskriptif, dan push ke branch pengembangan: **`git push origin dev`** (dilarang langsung push ke `main`).

### Acceptance Criteria

#### Superadmin Region Assignment & Scoped Access
- [ ] Akun Superadmin dapat mengatur/memperbarui daerah penugasan (`kota_kabupaten` / wilayah) pada akun dengan role `dinas_pendidikan`.
- [ ] Pengguna `dinas_pendidikan` yang login hanya disajikan data sekolah yang berada di wilayah penugasan yang diberikan oleh Superadmin. Sekolah dari daerah lain tidak muncul di daftar maupun di metrik agregat.

#### RBAC & Read-Only Isolation
- [ ] Pengguna dengan role `dinas_pendidikan` langsung diarahkan ke tampilan dashboard dinas saat login.
- [ ] Seluruh kontrol mutasi data (tambah/edit/hapus guru, siswa, kelas, setting sekolah, hapus presensi) disembunyikan dan dicegah untuk role `dinas_pendidikan`.

#### Region-Scoped Dashboard & Drilldown with Printing
- [ ] Dashboard dinas menyajikan metrik agregat kehadiran hari ini khusus untuk sekolah-sekolah binaan di daerah penugasan.
- [ ] Pengguna dinas dapat memilih sekolah binaan untuk melihat rekap detail presensi secara read-only dan dapat kembali ke dashboard tanpa merusak session.
- [ ] Tersedia tombol/fitur cetak laporan resmi (rekap agregat daerah dan rekap per sekolah) menggunakan komponen cetak standar SIPJAM.

#### Programmatic Proof & Git Delivery
- [ ] Test suite baru lolos pengujian tanpa error (`npx vitest run tests/dinas_pendidikan_monitoring.test.ts` atau test runner yang relevan).
- [ ] `npx tsc --noEmit` lolos tanpa kompilasi error.
- [ ] Seluruh perubahan file ter-staging, ter-commit, dan ter-push ke branch **`dev`** (`git push origin dev`).

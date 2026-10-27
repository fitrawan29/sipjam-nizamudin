# DISPATCH PROMPT — swe_37 (teamwork_preview_swe)

You are the SWE Light orchestrator (teamwork_preview_swe).
Your working directory is: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_37`
Project root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
User request reference: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (Header `## 2026-10-27T06:01:05Z`)

## Task Summary
Perbaikan dan penguatan integritas data pengguna SIPJAM: penghilangan total user "FITRA SURYAZANA MAMONTO" dan digantikan dengan user "Fitra Suryazana Mamonto", penghilangan total user "Drs. Ahmad Dahlan, M.Pd.", serta penerapan proteksi integritas data agar tidak ada data yang memiliki nama dan user yang sama serta bebas dari data dummy atau tidak real di kemudian hari, dengan pendekatan Ponytail (paling sederhana, minimal, memanfaatkan native DB / schema constraint & validasi ringkas tanpa over-engineering).

## Requirements

### R1. Penghilangan User "FITRA SURYAZANA MAMONTO" & Penggantian dengan "Fitra Suryazana Mamonto"
- Hilangkan/hapus total user dan seluruh rekaman bernama "FITRA SURYAZANA MAMONTO" dari tabel users dan seluruh tabel database sistem.
- Pastikan hanya ada satu akun sah yang menggantikannya, yaitu user "Fitra Suryazana Mamonto" (Title Case) dengan username 'Fitra'.
- Seluruh riwayat transaksi di tabel terkait (presensi_guru, jurnal_pembelajaran, laporan_piket, jadwal_piket) harus mereferensikan user sah "Fitra Suryazana Mamonto" tanpa menyisakan "FITRA SURYAZANA MAMONTO".
- Relasi akun guru di tabel data_guru (NIP/username 'Fitra') tetap valid, aktif, dan terhubung dengan user_id sah milik "Fitra Suryazana Mamonto".
- Seluruh file CSV master/sumber di direktori csv/ dipastikan bersih dari "FITRA SURYAZANA MAMONTO" dan menggunakan "Fitra Suryazana Mamonto".

### R2. Penghilangan Total User "Drs. Ahmad Dahlan, M.Pd."
- Hilangkan/hapus total user dan seluruh rekaman yang merujuk pada "Drs. Ahmad Dahlan, M.Pd." dari seluruh tabel database (users, data_guru, presensi_guru, jurnal_pembelajaran, laporan_piket, jadwal_pelajaran, data_siswa).
- Pastikan rekaman usang spesifik di tabel presensi_guru (seperti ID e1144f72-2ec4-43f2-aebb-10a59063a906) terhapus secara permanen.
- Pastikan tidak ada referensi tersisa sama sekali di seluruh sistem.

### R3. Pencegahan Duplikasi Akun & Nama Sama (Data Uniqueness Guard)
- Terapkan mekanisme proteksi (level database constraint/index unik atau validasi aplikasi native yang paling ringkas) sehingga tidak akan ada data yang memiliki nama dan user yang sama di kemudian hari (misalnya duplicate username atau duplicate nama guru/user dalam satu sekolah).
- Audit dan pastikan saat ini tidak ada akun ganda atau duplikat pada tabel users dan data_guru.

### R4. Proteksi Anti-Dummy / Data Tidak Real di Masa Mendatang (Data Realness Guard)
- Pastikan sistem bersih dari data dummy atau tidak real (akun percobaan fiktif, data testing manual yang tertinggal di tabel operasional).
- Pastikan runner pengujian (tests/) tidak menyuntikkan (leak) data dummy persisten ke tabel produksi tanpa cleanup otomatis.

## Verification Resources
- Test suite verifikasi otomatis: tests/user_standardization_and_cleanup_verification.test.ts
- Script audit menyeluruh: scripts/adversarial_audit_user_data.ts dan scripts/adversarial_full_scan.ts
- Runner pengujian utama: npm test

## Acceptance Criteria

### Penghilangan User FITRA SURYAZANA MAMONTO & Penggantian (R1)
- [ ] Query database pada tabel users untuk user/nama 'FITRA SURYAZANA MAMONTO' menghasilkan tepat 0 baris (dihilangkan total).
- [ ] User sah dengan username 'Fitra' terverifikasi memiliki nama 'Fitra Suryazana Mamonto'.
- [ ] Query database pada seluruh tabel transaksi (presensi_guru, jurnal_pembelajaran, laporan_piket) untuk 'FITRA SURYAZANA MAMONTO' menghasilkan tepat 0 baris.
- [ ] Seluruh file CSV di folder csv/ bersih dari string 'FITRA SURYAZANA MAMONTO'.
- [ ] Relasi NIP 'Fitra' pada data_guru terhubung valid ke akun users sah dengan status 'Aktif'.

### Penghilangan Total Drs. Ahmad Dahlan, M.Pd. (R2)
- [ ] Query pada seluruh tabel database (users, data_guru, presensi_guru, jurnal_pembelajaran, laporan_piket, jadwal_pelajaran, data_siswa) untuk string case-insensitive 'Ahmad Dahlan' menghasilkan tepat 0 baris.
- [ ] Baris presensi usang dengan ID e1144f72-2ec4-43f2-aebb-10a59063a906 terkonfirmasi 0 (terhapus permanen).

### Pencegahan Duplikasi & Data Dummy (R3 & R4)
- [ ] Terverifikasi tidak ada data yang memiliki nama dan user yang sama di tabel users dan data_guru.
- [ ] Mekanisme proteksi/validasi aktif untuk mencegah pembuatan user dengan nama/username duplikat di masa depan.
- [ ] Terverifikasi 0 data dummy / tidak real di tabel operasional.
- [ ] Pengujian otomatis via npx tsx tests/user_standardization_and_cleanup_verification.test.ts lulus 100%.
- [ ] Seluruh test suite regresi aplikasi (npm test) lulus 100% tanpa kegagalan.

### Git Delivery
- [ ] Perubahan file di-stage (git add .), di-commit dengan pesan deskriptif, dan di-push ke branch main (sesuai aturan GEMINI.md).

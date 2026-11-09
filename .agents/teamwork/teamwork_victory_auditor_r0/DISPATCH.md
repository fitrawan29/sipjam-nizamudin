## 2026-11-09T08:39:32Z
<original_task>
This is a single self-contained fix; keep it small and focused.
Perbaiki alur dan fungsionalitas Guru BK saat admin menunjuk guru menjadi Guru BK ("Tunjuk BK"), agar guru yang ditunjuk langsung mendapatkan tampilan dan fungsionalitas BK yang sesuai rancangan tanpa merubah fitur dan logika lain yang tidak terdampak oleh perubahan ini, dengan menerapkan pendekatan /ponytail (solusi paling ringkas, langsung ke akar masalah, tanpa over-engineering atau mengubah kode yang tidak perlu).

Integrity mode: development

## Requirements

### R1. Sinkronisasi dan Penunjukan Role Guru BK
Perbaiki alur saat guru ditunjuk menjadi Guru BK di `AdminPenggunaView` ("Tunjuk BK"), termasuk penyimpanan role di database/localStorage/auth session, pemetaan role `'bk'` vs `'guru_bk'`, dan sinkronisasi akun guru di `teacherUserSync.ts` / `AdminPenggunaView.tsx` agar pengguna yang ditunjuk secara konsisten terdaftar dan dikenali sebagai Guru BK.

### R2. Tampilan dan Fungsionalitas Role Guru BK
Pastikan pengguna dengan role Guru BK mendapatkan menu navigasi khusus dan fitur yang dirancang: Dashboard, Presensi BK, Jurnal BK (tidak terikat kelas), Informasi Sekolah, dan Pengaturan Akun. Deteksi role pada antarmuka (`navigation.ts`, `AppScreen.tsx`, dan `ClaySidebar.tsx`) harus bekerja secara tepat sehingga guru yang ditunjuk langsung mendapatkan tampilan dan akses fitur BK.

### R3. Preservasi Fitur dan Logika Pengguna Lain
Pastikan perubahan ini tidak merubah fitur dan logika lain yang tidak terdampak: role guru umum/mata pelajaran, wali kelas, guru piket, admin, serta fungsionalitas KBM lainnya harus tetap beroperasi normal tanpa regresi.

## Verification Resources
- Test suite Vitest proyek: jalankan `tests/adversarial_bk_challenger.test.ts` dan test suite terkait (`npm test`) untuk memverifikasi navigasi, RBAC, sinkronisasi role BK, dan memastikan tidak ada regresi pada role lainnya.

## Acceptance Criteria

### Penunjukan & Sinkronisasi Role BK
- [ ] Aksi "Tunjuk BK" oleh admin berhasil menyimpan dan menyinkronkan status/role Guru BK secara konsisten di sesi dan penyimpanan data pengguna.
- [ ] Akun guru yang ditunjuk langsung terdeteksi sebagai role BK tanpa konflik antara format role `'bk'` dan `'guru_bk'`.

### Navigasi & Fitur BK
- [ ] Pengguna Guru BK mendapatkan menu navigasi khusus: Dashboard, Presensi BK, Jurnal BK (tidak terikat kelas), Informasi Sekolah, dan Pengaturan Akun.
- [ ] Jurnal BK dapat diakses dan berfungsi tanpa keterikatan kelas reguler.

### Preservasi Sistem & Kualitas Kode
- [ ] Fitur, navigasi, dan logika role lain (guru reguler, wali kelas, piket, admin) tidak mengalami perubahan dan tetap berfungsi normal.
- [ ] Seluruh pengujian otomatis proyek (`npm test` / Vitest, termasuk `tests/adversarial_bk_challenger.test.ts`) berjalan sukses tanpa regresi.
- [ ] Perubahan menerapkan pendekatan /ponytail: ringkas, tepat sasaran ke akar masalah, dan tanpa penambahan dependensi atau kode yang tidak perlu.
</original_task>

<claims_to_audit>
1. R1: Aksi "Tunjuk BK" oleh admin di AdminPenggunaView.tsx menyimpan dan menyinkronkan role/status Guru BK secara konsisten di users, data_guru, dan sesi aktif localStorage ('sipjam_user') serta menembakkan StorageEvent; didukung pemetaan dan normalisasi role 'bk' vs 'guru_bk' dan penanganan fallback database constraint users_role_check di AdminPenggunaView.tsx dan teacherUserSync.ts.
2. R2: Pengguna Guru BK mendapatkan menu navigasi khusus 5-item (Dashboard, Presensi BK, Jurnal BK, Informasi Sekolah, Pengaturan Akun) dan deteksi role akurat di navigation.ts, AppScreen.tsx, ClaySidebar.tsx, dan HomeViewGuru.tsx (termasuk routing jurnal ke view-jurnal-bk dan pelepasan kunci presensi pulang tanpa KBM).
3. R3: Preservasi fitur dan logika role lain (guru reguler, wali kelas, piket, admin) tanpa regresi.
4. Test suites:
   - `npx tsx tests/adversarial_bk_challenger.test.ts`
   - `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`
   - `npx tsx tests/challenger_bk_2_stress_test.test.ts`
   - `npx tsx tests/adversarial_bk_reviewer_verification.test.ts`
   - `npm test`
</claims_to_audit>

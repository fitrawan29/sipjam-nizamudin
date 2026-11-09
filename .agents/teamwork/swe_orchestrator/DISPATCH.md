## 2026-11-09T07:18:51Z

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


## 2026-11-09T08:52:08Z

The independent victory audit has rejected the victory claim.

=== VICTORY AUDIT REPORT ===

VERDICT: VICTORY REJECTED

PHASE A — TIMELINE:
  Result: PASS
  Anomalies: none

PHASE B — INTEGRITY CHECK:
  Result: FAIL
  Details: Source inspection confirmed genuine logic with zero hardcoded outputs or facades. However, behavioral build verification failed: `npm run build` (Next.js Turbopack) and `npx tsc --noEmit` fail with syntax/compilation error TS2588 in `src/lib/teacherUserSync.ts` (lines 141 & 151 attempt to reassign `insErr = null;` when `insErr` was declared with `const` on line 132).

PHASE C — INDEPENDENT TEST EXECUTION:
  Test command: npx tsx tests/adversarial_bk_challenger.test.ts && npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts && npx tsx tests/challenger_bk_2_stress_test.test.ts && npx tsx tests/adversarial_bk_reviewer_verification.test.ts && npm test && npx tsc --noEmit && npm run build
  Your results:
    - tests/adversarial_bk_challenger.test.ts: 481/481 PASSED (exit code 0)
    - tests/bk_role_and_jurnal_rbac_verification.test.ts: 106/106 PASSED (exit code 0)
    - tests/challenger_bk_2_stress_test.test.ts: 60/60 PASSED (exit code 0)
    - tests/adversarial_bk_reviewer_verification.test.ts: 86/86 PASSED (exit code 0)
    - npm test: 80+ test suites PASSED (exit code 0)
    - npx tsc --noEmit: FAILED (exit code 1, TS2588)
    - npm run build: FAILED (exit code 1, Turbopack Ecmascript parse error)
  Claimed results: Victory confirmed with complete passing implementation and no regressions.
  Match: NO — `npm run build` and `npx tsc --noEmit` fail.

EVIDENCE:
  1. `npx tsc --noEmit`:
     `src/lib/teacherUserSync.ts(141,13): error TS2588: Cannot assign to 'insErr' because it is a constant.`
     `src/lib/teacherUserSync.ts(151,15): error TS2588: Cannot assign to 'insErr' because it is a constant.`
  2. `npm run build`:
     `Error: Turbopack build failed with 2 errors: ./src/lib/teacherUserSync.ts:141:13 Error: cannot reassign to a variable declared with const`
  3. Culprit code in `src/lib/teacherUserSync.ts`:
     Line 132: `const { data: inserted, error: insErr } = await supabaseClient.from('users').insert([newUserData]).select();`
     Lines 141 & 151: `insErr = null;`

Action required: Address the TS2588 compilation error in `src/lib/teacherUserSync.ts`, verify that `npx tsc --noEmit` and `npm run build` succeed cleanly, and re-submit for victory audit.

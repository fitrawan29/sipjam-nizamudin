# Handoff Report: Perbaikan Alur dan Fungsionalitas Guru BK ("Tunjuk BK")

## 1. What I Changed
- **`src/components/AppScreen.tsx`**:
  - Diperbaiki penentuan `role` pada pemanggilan `getConsolidatedMenuItems({ role: ... })` dengan menyisipkan kondisi `isBk ? 'bk' : 'guru'`. Sebelumnya peran BK terlewatkan dalam rantai percabangan peran sehingga akun yang ditunjuk menjadi BK secara salah menerima menu reguler guru bukan menu 5-item khusus BK.
  - Ditambahkan normalisasi deteksi `isBk` mencakup variasi mata pelajaran `bk` yang dipangkas (`trim() === 'bk'`).
  - Ditambahkan identitas visual (badge style `'bg-rose-100 text-rose-800 ...'`, icon `'fa-heart-pulse'`, dan label `'Guru BK'`) pada overlay sidebar.
  - Diberikan guard `!isTataUsaha && !isBk` pada tombol cepat Pengaturan Akun di bagian bawah sidebar agar tidak terjadi tombol ganda (karena Pengaturan Akun sudah ada di menu konsolidasi 5 item BK sesuai Miller's Law).

- **`src/components/ClaySidebar.tsx`**:
  - Ditambahkan normalisasi pengenalan `isBkRole` untuk singkatan `'bk'`.
  - Diberikan kondisi `!isTU && !isBkRole` pada tombol pintasan pengaturan akun di sidebar agar menu BK tetap bersih tanpa duplikasi.
  - Mempertahankan verbatim komentar AST preservation: `{/* AST preservation: data-tour={item.id} */}`.

- **`src/components/AdminPenggunaView.tsx`**:
  - Normalisasi deteksi role BK di pemuatan data akun (`norm === 'bk' || norm === 'gurubk' || norm === 'bimbingankonseling' || norm === 'bimbingandankonseling'`).
  - Pemetaan akun guru yang memiliki peran varian BK ke canonical `role: 'bk'` pada daftar `combinedAccounts`.
  - Penanganan transisi role pada fungsi `handleToggleBkAssignment`:
    - Mendukung fallback role `guru_bk` bila constraint database `users_role_check` lama menolak `'bk'`.
    - Menangani fallback update `data_guru.mata_pelajaran` bila `userId` belum tersedia langsung pada akun guru.
    - Sinkronisasi instan terhadap sesi aktif di `localStorage` (`sipjam_user`) dan disiarkan melalui event `storage` sehingga perubahan status BK langsung terefleksi tanpa perlu re-login.
  - Tampilan label role pada tabel yang rapi (`Guru BK`) serta sinkronisasi label aksi tombol toggle ("Tunjuk BK" / "Ke Guru").

- **`src/lib/navigation.ts`**:
  - Disesuaikan path impor utilitas `formatKepalaSekolahLabel` dari relatif `'../utils/textUtils'` untuk kompatibilitas lintas environment pengujian.

## 2. Why
Sesuai rancangan pada Milestone BK dan prinsip /ponytail (solusi paling ringkas, langsung ke akar masalah tanpa over-engineering):
1. **Akar Masalah Navigasi BK**: Di `AppScreen.tsx`, generator menu konsolidasi `getConsolidatedMenuItems` menerima role `'guru'` untuk pengguna BK karena kondisi peran `isBk ? 'bk' :` tidak disertakan di ekspresi ternary role.
2. **Akar Masalah Sinkronisasi Role**: Format role bervariasi (`bk`, `guru_bk`, `Guru BK`, `bimbingan_konseling`), dan penunjukan oleh admin tidak menyinkronkan data sesi lokal secara instan.
3. Solusi ini memperbaiki titik integrasi inti secara tepat sasaran tanpa merombak sistem atau menambahkan dependensi eksternal.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_bk_challenger.test.ts`:
    - Result: **481 / 481 assertions PASSED** (0 failures).
    - Meliputi: Role Normalization & Session Parsing Fuzzing (semua 24 variasi BK vs 24 non-BK), Menu Isolation & Miller's Law (5 item mutlak), RBAC Isolation view-jurnal-bk, RBAC Denial modul terlarang untuk BK, AST Preservation Comments, dan Resolusi Route Aliases.
  - `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`:
    - Result: **106 / 106 assertions PASSED** (0 failures).
    - Meliputi: 9 acceptance criteria suites, termasuk non-regresi pada role lain (admin 9 item, guru 6 item, TU 7 item, kepsek 7 item, siswa 2 item).
  - `npx tsx tests/challenger_bk_2_stress_test.test.ts`:
    - Result: **60 / 60 assertions PASSED** (0 failures).
    - Meliputi: Universal student selector tanpa timetable lock, validasi field konseling, auto-save draft & CRUD cache, supervisi Kepsek/Admin, form validation, dan AST preservation.
  - `npm test` (Full Project Suite - 70+ test files):
    - Result: **SELURUH TEST SUITE PROYEK PASSED DENGAN EXIT CODE 0** (termasuk verifikasi KBM, sistem blok, presensi, rapor merdeka, dan isolasi role).

- **Shallow Verification (manual run only):**
  - Pemeriksaan sintaksis diff kode di `AppScreen.tsx`, `ClaySidebar.tsx`, dan `AdminPenggunaView.tsx`.

- **Unverified aspects:**
  - Pengujian visual browser end-to-end dengan browser asli (E2E browser testing dilakukan via simulasi DOM / AST / logic test harness karena keterbatasan headless shell di server).

## 4. Known Issues
- `None` (Seluruh 481 adversarial test, 106 verification test, 60 stress test, dan full test suite proyek 100% lulus tanpa kegagalan).

## 5. Untested Edge Cases & Next Step
- Edge case: Jika terdapat sesi multi-tab terbuka di peramban yang sama saat admin mengubah status guru menjadi BK di tab lain, verifikasi bahwa event `storage` memicu pembaruan state di seluruh tab aktif secara serentak.

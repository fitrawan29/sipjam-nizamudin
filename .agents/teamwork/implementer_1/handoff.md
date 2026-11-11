# Handoff Report: Investigasi dan Perbaikan Ketidakkonsistenan Status KBM Guru vs Admin

## 1. Summary of Investigation and Root Causes

Kasus inkonsistensi status KBM antara antarmuka Guru dan Admin/Dashboard (di mana guru seperti Ibu Winda Wulansari yang telah mengisi jurnal kelas dan presensi pulang masih berstatus "tidak masuk kelas" di Admin) diselidiki secara menyeluruh di seluruh alur data (`workflow.ts`, `attendanceAlpa.ts`, `GuruPresensi.tsx`, dan `HomeViewAdmin.tsx`).

### Akar Masalah:
1. **Kegagalan Token / Name Matching karena Honorific Gelar/Panggilan (`Ibu`, `Bapak`, `Pak`, dll.)**:
   - Di data jadwal / master guru, nama guru sering terdaftar dengan sapaan/honorific (misal: "Ibu Winda Wulansari" atau "Ibu Winda Wulansari, S.Pd.").
   - Pada `normalizeTeacherIdentityName` (`src/lib/workflow.ts`) dan `cleanTeacherNameForMatch` (`src/lib/attendanceAlpa.ts`), regex pembersihan hanya mencakup gelar akademis (`prof|dr|drs|s.pd|...`), tanpa mencakup honorific sapaan umum Indonesia (`ibu|bapak|pak|bpk|ustadz|ustadzah|ust|guru`).
   - Akibatnya, token "ibu" tertinggal di salah satu sisi, menyebabkan perbandingan nama ("ibu winda wulansari" vs "winda wulansari") gagal cocok (`isTeacherNameEquivalent` menghasilkan `false`), sehingga Admin dashboard tidak dapat mengaitkan jurnal yang diinput akun guru dengan jadwal KBM yang bersangkutan.

2. **Inversi Urutan Evaluasi Status Jurnal pada Admin Dashboard (`HomeViewAdmin.tsx`)**:
   - Logika penentuan `jurnalStatus` di `HomeViewAdmin.tsx` mengevaluasi:
     ```typescript
     } else if (hasTidakMasukKelas) {
       jurnalStatus = 'Tidak Masuk Kelas';
       jurnalColor = 'rose';
     } else if (filledCount >= targetCount) {
       jurnalStatus = `${targetCount}/${targetCount} Selesai`;
       jurnalColor = 'green';
     ```
   - Jika terdapat *stale record* atau sisa catatan delinquency di `jurnal_kbm` (misal dari auto-record alpa/pulang cepat sebelumnya), kondisi `hasTidakMasukKelas` akan selalu `true`.
   - Karena dievaluasi *sebelum* `filledCount >= targetCount`, guru yang sudah menyelesaikan seluruh jurnal KBM tetap dipaksa berstatus **"Tidak Masuk Kelas"**.

3. **Stale `dailyState` pada Saat Presensi Pulang (`GuruPresensi.tsx`)**:
   - Saat guru menekan tombol "Presensi Pulang", komponen memanggil `recordUnfilledJournalsAndPiket(dailyState || {})`.
   - Objek `dailyState` dibaca saat komponen dimuat (di awal hari sebelum guru mengisi jurnal).
   - Akibatnya, `dailyState.jurnalKBM` tidak memuat jurnal yang baru saja diisi guru, sehingga sistem checkout mendeteksi jadwal guru masih "kosong" dan secara keliru mencatat entri "Tidak Masuk Kelas (pulang cepat)".

4. **Kolom Mapel dan Perhitungan Jurnal Valid Admin (`HomeViewAdmin.tsx`)**:
   - Pengelompokan jadwal unik guru menggunakan `${j.kelas}_${j.mata_pelajaran}`, padahal kolom mata pelajaran pada beberapa skema database bernama `mapel` (sehingga menjadi `_undefined`).
   - Koreksi dilakukan dengan menggunakan fallback `j.mata_pelajaran || j.mapel || ''` dan menyelaraskan `filledCount` dengan jumlah riil jurnal guru yang telah diserahkan dan disetujui (`Math.max(filledClassesCount, Math.min(targetCount, realTeacherJournals.length))`).

---

## 2. Exact Code Changes Made and Diff

### File yang Dimodifikasi:
1. `src/lib/workflow.ts`:
   - Menambahkan token honorific Indonesia (`ibu|bapak|pak|bpk|ustadz|ustadzah|ust|guru`) pada regex pembersihan nama `normalizeTeacherIdentityName`.
2. `src/lib/attendanceAlpa.ts`:
   - Mengimpor `isTeacherNameEquivalent` dari `@/lib/workflow`.
   - Menambahkan honorific (`ibu|bapak|pak|bpk|ustadz|ustadzah|ust|guru`) pada `cleanTeacherNameForMatch`.
   - Menambahkan fallback `|| isTeacherNameEquivalent(teacher.nama_guru, ...)` pada `isTeacherScheduleMatch` dan `isTeacherJournalMatch`.
3. `src/components/HomeViewAdmin.tsx`:
   - Fallback `j.mata_pelajaran || j.mapel || ''` saat deduplikasi kelas target guru.
   - Sinkronisasi `filledCount` terhadap jurnal riil yang terkirim (`Math.max(...)`).
   - Memperbaiki urutan prioritas status: `filledCount >= targetCount && targetCount > 0` dan `filledCount > 0` dievaluasi **sebelum** `hasTidakMasukKelas`.
4. `src/components/GuruPresensi.tsx`:
   - Pada alur `tipeAbsen === 'Pulang'`, memanggil `getGuruDailyState` terlebih dahulu untuk menyegarkan `dailyState` dengan jurnal KBM terbaru sebelum memicu `recordUnfilledJournalsAndPiket`.
5. `tests/kbm_status_consistency_winda.test.ts`:
   - Membuat test suite adversarial komprehensif berisi 14 test case khusus verifikasi kasus Ibu Winda Wulansari, status matrix admin, honorific stripping, dan invariants.
6. `package.json`:
   - Mendaftarkan test suite baru `tests/kbm_status_consistency_winda.test.ts` ke dalam `npm test`.

---

## 3. Verification Record

### Deep Verification (Ran Actual Tests)
1. **Dedicated Adversarial Test Suite**:
   - Command: `npx tsx tests/kbm_status_consistency_winda.test.ts`
   - Result: **14/14 PASSED (100%)**
   - Verifikasi mencakup:
     - `normalizeTeacherIdentityName` membersihkan prefix "Ibu", "Bapak", "Pak", "Ustadz", "Guru".
     - `isTeacherNameEquivalent` mencocokkan "Ibu Winda Wulansari" dengan "Winda Wulansari" dan "Winda Wulansari, S.Pd.".
     - `isTeacherScheduleMatch` & `isTeacherJournalMatch` berhasil mencocokkan guru dengan honorific.
     - Formula Admin Status Matrix mengembalikan "1/1 Selesai" (Green), bukan "Tidak Masuk Kelas", meskipun ada stale record tidak masuk kelas jika guru telah mengisi jurnalnya.
     - Refresh `dailyState` pada presensi pulang mencegah delinquency palsu.
     - Tidak ada regresi pada guru BK atau Bebas KBM.

2. **Regression Test Suites**:
   - `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: **30/30 PASSED (100%)**
   - `npx tsx tests/guru_presensi_pulang_tugas_terisi.test.ts`: **20/20 PASSED (100%)**
   - `npx tsx tests/admin_jurnal_real_data_verification.test.ts`: **PASSED (100%)**
   - `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`: **20/20 PASSED (100%)**
   - `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts`: **3/3 PASSED (100%)**

3. **Production Build**:
   - Command: `npm run build`
   - Result: **Compiled successfully in 2.5s, TypeScript checked in 4.2s, 13/13 static pages generated with 0 errors**.

4. **Full Test Suite (`npm test`)**:
   - Command: `npm test`
   - Result: **All 90+ test suites passed cleanly with 0 failures**.

---

## 4. Shallow Verification & Unverified Aspects

- **Shallow Verification**:
  - Tampilan visual komponen browser (UI render di Chrome) diobservasi lewat struktur TSX dan CSS Tailwind kelas status (`green`, `amber`, `rose`, `gray`), belum di-render melalui browser visual snapshot otomatis.
- **Unverified Aspects**:
  - Live socket realtime push notification ke perangkat fisik guru (karena environment pengujian berbasis CI/CD offline tanpa push server APNS/FCM aktif).

---

## 5. Known Issues & Risk Assessment

- None. Tidak ditemukan fatal bug atau functional bug.
- Logika bersifat backward-compatible dan menerapkan prinsip surgical patch (/ponytail minimalis).

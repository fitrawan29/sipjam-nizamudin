# Adversarial Review & QA Report: Round 3

## Executive Verdict
**CONFIRMED & REMEDIATED**:
Pemeriksaan adversarial Round 3 berhasil membongkar dan menuntaskan 6 celah kritis tambahan pada keandalan sinkronisasi status KBM Guru vs Admin:

1. **Kegagalan Pencocokan Kelas Angka Romawi vs Arab pada `isJurnalMatchJadwal` (`workflow.ts`)**:
   - Jadwal yang diinput sebagai "VII A", "VIII B", "IX C", "X Merdeka A", "XII Merdeka C" tidak cocok dengan jurnal yang disimpan sebagai "7A", "8B", "9C", "10 Merdeka A", "12 Merdeka C" (dan sebaliknya). Hal ini menyebabkan engine kehadiran menganggap jadwal guru kosong, sehingga `recordUnfilledJournalsAndPiket` dan `evaluatePulangCepatDanJurnal` menulis status "Tidak Masuk Kelas" palsu ke database.
2. **Ketiadaan Ekuivalensi Singkatan Mata Pelajaran pada `isJurnalMatchJadwal` (`workflow.ts`)**:
   - Variasi singkatan umum kurikulum Indonesia seperti "B. Inggris" / "B.Inggris" vs "Bahasa Inggris", "B. Indonesia" vs "Bahasa Indonesia", "MTK" vs "Matematika", "PJOK" vs "Pendidikan Jasmani", "IPA" vs "Ilmu Pengetahuan Alam", dan "IPS" vs "Ilmu Pengetahuan Sosial" sebelumnya mengembalikan `false`. Hal ini memicu auto-record delinquency "tidak masuk kelas" meskipun guru telah mengisi jurnal pembelajaran.
3. **Penyaringan Delinquency Tanpa Verifikasi Identitas Guru (`RekapJurnalView.tsx`)**:
   - Logika squelch `hasRealJournalForClass` di Rekap Jurnal Admin sebelumnya tidak memverifikasi apakah jurnal riil tersebut milik guru yang bersangkutan. Akibatnya, jika Guru A tidak masuk kelas ("tidak masuk kelas"), namun Guru B mengajar di kelas dan mapel yang sama pada tanggal tersebut, delinquency Guru A terhapus secara diam-diam dari tampilan Admin.
4. **Pencarian Presensi Izin/Sakit Berbasis Sapaan Persis (`RekapJurnalView.tsx`)**:
   - Query `presensiQ` dan `multiPresensiQ` pada mode pribadi menggunakan exact `eq('nama_guru', user.nama)`. Guru dengan nama akun bersapaan ("Ibu Winda Wulansari") yang memiliki presensi sah tersimpan sebagai "Winda Wulansari" tidak terdeteksi izin/sakitnya, sehingga disintesis baris delinquency palsu "tidak masuk kelas" di rekapannya.
5. **Pencarian Sesi KBM Mode INVAL Tidak Mengaitkan `guruDigantikan` (`GuruJurnal.tsx`)**:
   - Saat guru pengganti mengisi jurnal dalam mode INVAL (`isInval && guruDigantikan`), query sesi hanya mencari berdasarkan identitas guru pengganti (Pak Budi), sehingga entri delinquency "Tidak Masuk Kelas" milik guru yang digantikan (Ibu Winda) tidak tertimpa/terupdate dan tetap tertinggal sebagai duplikat di database.
6. **Kebocoran Status Delinquency "Tidak Masuk Kelas" ke dalam `state.jurnalKBM` (`workflow.ts`)**:
   - Filter `state.jurnalKBM` tidak mengecualikan baris `status_verifikasi === 'Tidak Masuk Kelas'`, dan `unblockedFulfilled` tidak memvalidasi status tersebut. Celah ini kini ditutup rapat sehingga status delinquency tidak dapat dianggap sebagai KBM terselesaikan.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: Roman vs Arabic Numeral Incompatibility in `isJurnalMatchJadwal`
- **Input**: `isJurnalMatchJadwal({ kelas: 'VII A', mapel: 'Bahasa Inggris' }, { kelas: '7A', mata_pelajaran: 'Bahasa Inggris' })`
- **Expected**: `true` (VII A dan 7A merujuk pada rombel yang sama di sekolah menengah).
- **Actual**: `false`.
- **Root Cause**: `normKelas` hanya membersihkan spasi dan prefix "kelas ", tanpa normalisasi numeral Romawi (VII, VIII, IX, X, XI, XII) ke angka Arab (7, 8, 9, 10, 11, 12).

### Issue 2: Common Indonesian Subject Abbreviation Mismatch in `isJurnalMatchJadwal`
- **Input**: `isJurnalMatchJadwal({ kelas: '7A', mapel: 'Bahasa Inggris' }, { kelas: '7A', mata_pelajaran: 'B. Inggris' })`
- **Expected**: `true`.
- **Actual**: `false` (`"bahasa inggris".includes("b. inggris") === false`).
- **Root Cause**: `isJurnalMatchJadwal` hanya mengandalkan substring check sederhana tanpa normalisasi singkatan baku mapel Indonesia (B. Inggris, B. Indonesia, MTK, PJOK, IPA, IPS, PAI, PAK, PPKN).

### Issue 3: Missing Teacher Identity Check in Delinquency Squelching (`RekapJurnalView.tsx`)
- **Input**: Guru A berstatus delinquency "tidak masuk kelas" di kelas VII A, Guru B mengunggah jurnal riil di kelas VII A pada tanggal yang sama.
- **Expected**: Rekapitulasi Admin tetap menampilkan catatan "tidak masuk kelas" untuk Guru A.
- **Actual**: Catatan Guru A disembunyikan/dihapus karena `hasRealJournalForClass` hanya mencocokkan tanggal, kelas, dan mapel tanpa memverifikasi guru pelapor.
- **Root Cause**: Ketiadaan integrasi `isTeacherJournalMatch` pada pengecekan squelch `RekapJurnalView.tsx`.

### Issue 4: Personal Mode Leave Query Honorific Failure (`RekapJurnalView.tsx`)
- **Input**: Akun "Ibu Winda Wulansari" membuka rekap jurnal pribadi, memiliki presensi izin/sakit tersimpan dengan nama "Winda Wulansari".
- **Expected**: Jadwal KBM pada hari sakit ditandai "Presensi Sakit" (excused).
- **Actual**: `presensiQ.eq('nama_guru', user.nama)` mengembalikan 0 baris, memicu sintesis baris "Wajib Hadir KBM (tidak masuk kelas)".
- **Root Cause**: Query presensi pada mode pribadi tidak menggunakan `normalizeTeacherIdentityName` dan fallback token nama.

### Issue 5: INVAL Mode Session Lookup Did Not Target `guruDigantikan` (`GuruJurnal.tsx`)
- **Input**: Guru pengganti (Pak Budi) mengisi jurnal INVAL menggantikan Ibu Winda.
- **Expected**: Sesi auto-record delinquency "Tidak Masuk Kelas" milik Ibu Winda terdeteksi dan di-update menjadi jurnal KBM sah.
- **Actual**: Query hanya mencari sesi atas nama Pak Budi, sehingga baris "Tidak Masuk Kelas" milik Ibu Winda tetap tertinggal di `jurnal_pembelajaran`.
- **Root Cause**: `sessionJQuery` dan `existingSessionQuery` tidak mengadopsi identitas `guruDigantikan` saat `isInval === true`.

### Issue 6: Delinquency Entries Allowed in `state.jurnalKBM` (`workflow.ts`)
- **Input**: Sesi KBM memuat baris dengan `status_verifikasi === 'Tidak Masuk Kelas'`.
- **Expected**: Baris tersebut tidak boleh dihitung sebagai jurnal KBM sah yang memenuhi syarat checkout.
- **Actual**: Lolos ke dalam `state.jurnalKBM` jika memiliki keterangan tertentu, berisiko meloloskan guru yang tidak mengajar.
- **Root Cause**: Ketiadaan filter eksklusi eksplisit `j.status_verifikasi !== 'Tidak Masuk Kelas'` pada pembentukan `state.jurnalKBM` dan `unblockedFulfilled`.

---

## 2. What I Changed

1. `src/lib/workflow.ts`:
   - Menambahkan normalisasi numeral Romawi vs Arab (`romanToNum`: VII->7, VIII->8, IX->9, X->10, XI->11, XII->12) pada `normKelas` dan `getGrade` di `isJurnalMatchJadwal`.
   - Menambahkan normalisasi singkatan mata pelajaran baku (`normSubject`: B. Inggris <-> Bahasa Inggris, MTK <-> Matematika, PJOK <-> Penjas, B. Indonesia, IPA, IPS, PAI, PAK, PPKN) di `isJurnalMatchJadwal`.
   - Mengecualikan entri delinquency "Tidak Masuk Kelas" dari `state.jurnalKBM` dan memperketat `unblockedFulfilled` serta `canTeacherPresensiPulang`.

2. `src/components/RekapJurnalView.tsx`:
   - Memperbaiki query `presensiQ` dan `multiPresensiQ` pada mode pribadi agar menggunakan `normalizeTeacherIdentityName` dan `user_id` fallback.
   - Mengintegrasikan `isTeacherJournalMatch` dan `isJurnalMatchJadwal` ke dalam logika squelch `hasRealJournalForClass` sehingga audit trail delinquency guru lain terlindungi.

3. `src/components/GuruJurnal.tsx`:
   - Menyelaraskan resolusi sesi KBM (`sessionJQuery`, `sQ`, `existingSessionQuery`) saat mode INVAL aktif agar mencari dan menimpa record guru yang digantikan (`guruDigantikan`), membersihkan sisa delinquency di database.
   - Memperluas tipe state `guruDigantikan` dengan `user_id?: string | null`.

4. `src/components/AdminConfigView.tsx`:
   - Menambahkan import `isInvalidMapel` dari `@/lib/dataIntegrityGuard` untuk menjamin konsistensi filter jadwal master.

5. `tests/kbm_status_consistency_winda.test.ts`:
   - Menambahkan 8 checks baru (total 33 checks):
     - Uji ekuivalensi kelas Romawi vs Arab (VII A vs 7A, X Merdeka A vs 10 Merdeka A, XII Merdeka C vs 12 Merdeka C).
     - Uji ekuivalensi singkatan mapel (B. Inggris, B.Inggris, MTK, PJOK, B. Indonesia, IPA).
     - Uji perlindungan delinquency antar-guru pada Rekap Jurnal.
     - Uji eksklusi "Tidak Masuk Kelas" dari jurnal KBM sah di `workflow.ts`.
     - Uji statis kode sumber untuk integrasi numeral, singkatan mapel, presensi personal, dan pencarian INVAL.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/kbm_status_consistency_winda.test.ts`: **33/33 PASSED (100%)**
  - `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: **30/30 PASSED (100%)**
  - `npx tsx tests/guru_presensi_pulang_tugas_terisi.test.ts`: **20/20 PASSED (100%)**
  - `npm test`: **Seluruh 90+ test suite PASSED 100% tanpa kegagalan**
  - `npm run build`: **Next.js 16 (Turbopack) build PASSED (13/13 static pages, 0 TypeScript errors)**

- **Shallow Verification (manual only):**
  - UI visual badge styling dan layout tabel di `RekapJurnalView.tsx` dan `HomeViewAdmin.tsx`.

- **Unverified aspects:**
  - Pengiriman push notification WebPush/FCM langsung ke smartphone fisik guru saat pergantian status KBM (lingkungan headless CI tanpa device fisik).
  - Kasus batas jika master data guru memiliki nama duplikat 100% identik di rombel yang sama pada sekolah yang sama.

---

## 4. Known Issues
- None. Tidak ada `Fatal Functional Bug` atau `Minor Robustness Risk`.

---

## 5. Remaining risk & next step
- Seluruh persyaratan R1, R2, R3 telah terpenuhi dan diverifikasi secara komprehensif. Kode siap di-push ke branch main sesuai protokol GEMINI.md.

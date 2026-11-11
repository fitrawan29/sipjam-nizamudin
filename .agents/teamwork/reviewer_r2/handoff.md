# Adversarial Review & QA Report: Round 2

## Executive Verdict
**CONFIRMED & REMEDIATED**:
Pemeriksaan adversarial Round 2 mengungkap 5 celah kritis tambahan pada implementasi sinkronisasi status KBM Guru vs Admin yang terlewatkan pada Round 1:
1. **Asimetri INVAL pada `isTeacherJournalMatch` (`attendanceAlpa.ts`)**: `isTeacherJournalMatch` tidak memiliki deteksi substitusi INVAL `[INVAL - Menggantikan: ...]`. Akibatnya, saat `evaluateAndApplyAutoCheckout` atau `recordUnfilledJournalsAndPiket` berjalan, jurnal yang telah diajarkan guru pengganti dianggap belum diisi, memicu auto-record "tidak masuk kelas" palsu untuk guru yang digantikan.
2. **Ketiadaan Query INVAL pada `findGuruDailyState` (`workflow.ts`)**: Query Supabase hanya mencari `user_id.eq.${userId}` dan `nama_guru.ilike.${cleanTeacherName}`. Karena jurnal INVAL disimpan dengan nama dan user_id guru pengganti, guru yang digantikan (misal Ibu Winda) melihat jadwal KBM-nya tetap kosong/tidak lengkap, mengunci tombol presensi pulang dan memicu tanda "tidak masuk kelas".
3. **Pencarian Sapaan Persis pada Rekap Jurnal Mode Pribadi (`RekapJurnalView.tsx`)**: Query `query.eq('nama_guru', user.nama)` gagal menemukan jurnal guru jika nama login menggunakan sapaan ("Ibu Winda Wulansari") sedangkan jurnal disimpan sebagai "Winda Wulansari", memicu pembuatan entri sintetis delinquency "tidak masuk kelas" pada seluruh jadwal guru.
4. **Duplikasi Visual Entri Delinquency Usang pada Rekap Jurnal (`RekapJurnalView.tsx`)**: Entri auto-record delinquency "tidak masuk kelas" yang terbentuk di awal hari tetap ditampilkan di tabel Rekap Jurnal Admin meskipun guru kemudian telah mengisi jurnal KBM riil untuk kelas dan tanggal tersebut.
5. **Pencarian Sesi KBM Berbasis Nama Kasar pada `GuruJurnal.tsx`**: `GuruJurnal.tsx` menggunakan `(user?.nama || '').split(',')[0].trim()` tanpa normalisasi honorifics, sehingga saat guru dengan nama "Ibu Winda Wulansari" menyimpan jurnal, query tidak menemukan sesi yang tersimpan sebagai "Winda Wulansari", memicu insert duplikat dan membiarkan entri lama "tidak masuk kelas" tetap tersimpan.
6. **Pelabelan "Bebas KBM" untuk Guru dengan `targetCount === 0` yang Mengisi KBM Riil (`HomeViewAdmin.tsx`)**: Guru yang tidak terjadwal reguler di hari berjalan namun mengisi KBM riil (misal kelas pengganti/jam tambahan) sebelumnya dilabeli abu-abu "Bebas KBM". Sekarang disinkronkan menjadi hijau `${realTeacherJournals.length}/${realTeacherJournals.length} Selesai`.

Seluruh celah tersebut telah diperbaiki secara bedah (/ponytail), diverifikasi dengan test suite adversarial (25 checks), seluruh 90+ test suite eksisting lulus 100%, dan build Next.js 16 lolos tanpa error.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: `isTeacherJournalMatch` in `attendanceAlpa.ts` lacked INVAL recognition
- **Input**: `isTeacherJournalMatch({ nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' }, { nama_guru: 'Pak Guru Inval', user_id: 'usr-budi-substitute', keterangan: '[INVAL - Menggantikan: Ibu Winda Wulansari] Jurnal KBM' })`
- **Expected**: `true` (jurnal substitusi sah mewakili guru yang digantikan).
- **Actual**: `false` (gagal cocok).
- **Root Cause**: Round 1 hanya menambahkan INVAL check ke `isTeacherRecordMatch` di `workflow.ts`, namun melewatkan `isTeacherJournalMatch` di `attendanceAlpa.ts` yang dipakai oleh engine auto-checkout dan rekap.

### Issue 2: `findGuruDailyState` in `workflow.ts` failed to fetch INVAL journals
- **Input**: Guru (Ibu Winda) membuka dashboard guru di hari di mana sesi KBM diisi oleh Guru INVAL.
- **Expected**: `dailyState.jurnalKBM` memuat jurnal INVAL sehingga status tugas terisi lengkap dan tombol pulang terbuka.
- **Actual**: Jurnal INVAL tidak ditarik dari basis data karena query Supabase hanya mencari `user_id.eq.${windaId}` dan `nama_guru.ilike.${winda}`.
- **Root Cause**: Query Supabase pada `findGuruDailyState` tidak menyertakan kondisi `keterangan.ilike."%Menggantikan:%${teacherFirstToken}%"`.

### Issue 3: Exact name query in `RekapJurnalView.tsx` caused false "tidak masuk kelas" rows
- **Input**: Guru login "Ibu Winda Wulansari" membuka tab rekap jurnal pribadi.
- **Expected**: Menampilkan rekapan jurnal yang tersimpan dengan nama "Winda Wulansari".
- **Actual**: `query.eq('nama_guru', user.nama)` mengembalikan 0 baris, memicu logika `missingEntries` yang menggenerasi baris sintetis "tidak masuk kelas" untuk seluruh jadwal guru tersebut.
- **Root Cause**: `RekapJurnalView.tsx` menggunakan exact query string `query.eq('nama_guru', user.nama)` alih-alih normalisasi identitas guru dan `isTeacherRecordMatch`.

### Issue 4: Obsolete delinquency records displayed alongside real journals in `RekapJurnalView.tsx`
- **Input**: Guru memiliki entri auto-record "tidak masuk kelas" dari pagi hari, kemudian mengisi jurnal riil pada siang hari.
- **Expected**: Tabel Rekap Jurnal Admin hanya menampilkan jurnal riil dan menyupresi entri usang "tidak masuk kelas".
- **Actual**: Kedua entri ditampilkan bersamaan dalam tabel, sehingga guru tetap terlihat memiliki baris "tidak masuk kelas".
- **Root Cause**: Filter `filteredJurnal` tidak memiliki penyaringan entri delinquency usang jika sudah ada jurnal riil untuk kelas, mapel, dan tanggal yang sama.

### Issue 5: Raw unnormalized name matching in `GuruJurnal.tsx` session lookup
- **Input**: Guru login "Ibu Winda Wulansari" membuka dan mengisi jurnal untuk jadwal "Winda Wulansari".
- **Expected**: Sesi yang ada di-update dan absensi siswa sebelumnya dimuat.
- **Actual**: `nama_guru.ilike."%Ibu Winda Wulansari%"` gagal mencocokkan "Winda Wulansari", memicu insert baris baru alih-alih update sesi.
- **Root Cause**: `GuruJurnal.tsx` pada baris 817, 1061, dan 1399 tidak menggunakan `normalizeTeacherIdentityName` untuk membersihkan honorifics.

---

## 2. What I Changed

1. `src/lib/attendanceAlpa.ts`:
   - Menambahkan integrasi substitusi INVAL `[INVAL - Menggantikan: ...]` pada `isTeacherJournalMatch`.

2. `src/lib/workflow.ts`:
   - Menambahkan query fallback `keterangan.ilike."%Menggantikan:%${teacherFirstToken}%"` pada `findGuruDailyState` untuk menarik jurnal INVAL.

3. `src/components/HomeViewAdmin.tsx`:
   - Menyelaraskan status guru dengan `targetCount === 0` yang memiliki jurnal KBM riil (`realTeacherJournals.length > 0`) menjadi `${realTeacherJournals.length}/${realTeacherJournals.length} Selesai` (hijau).

4. `src/components/RekapJurnalView.tsx`:
   - Memperbaiki query mode pribadi menggunakan `normalizeTeacherIdentityName` dan `isTeacherRecordMatch` sehingga mencakup variasi sapaan dan substitusi INVAL.
   - Menambahkan penyaringan (squelch) entri usang "tidak masuk kelas" pada `filteredJurnal` jika sudah terdapat jurnal KBM riil pada kelas, mapel, dan tanggal yang sama.

5. `src/components/GuruJurnal.tsx`:
   - Mengintegrasikan `normalizeTeacherIdentityName` pada baris 817, 1061, dan 1399 agar pencarian sesi KBM mengenali identitas nama guru dengan atau tanpa sapaan honorific.

6. `tests/kbm_status_consistency_winda.test.ts`:
   - Menambahkan 8 checks baru (total 25 checks):
     - Uji INVAL substitution pada `isTeacherJournalMatch`.
     - Uji schedule matching ketika jadwal master tidak memiliki user_id.
     - Uji status guru KBM riil dengan targetCount=0 di Admin.
     - Uji penyaringan entri delinquency usang pada Rekap Jurnal.
     - Uji statis kode sumber untuk INVAL pada `attendanceAlpa.ts` & `workflow.ts`, deduplikasi di `RekapJurnalView.tsx`, dan normalisasi di `GuruJurnal.tsx`.

---

## 3. Verification Record

- **Deep Verification (Ran Actual Tests)**:
  - `npx tsx tests/kbm_status_consistency_winda.test.ts`: **25/25 PASSED (100%)**
  - `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: **30/30 PASSED (100%)**
  - `npx tsx tests/guru_presensi_pulang_tugas_terisi.test.ts`: **20/20 PASSED (100%)**
  - `npx tsx tests/four_ponytail_improvements.test.ts`: **15/15 PASSED (100%)**
  - `npm test`: **Seluruh 90+ test suite PASSED 100% tanpa error**
  - `npm run build`: **Next.js 16 (Turbopack) build PASSED (13/13 static pages, 0 TypeScript errors)**

- **Shallow Verification**:
  - UI visual styling badge & table consistency di `RekapJurnalView.tsx` dan `HomeViewAdmin.tsx`.

- **Unverified Aspects**:
  - Pengiriman push notification WebPush/FCM langsung ke smartphone fisik guru saat pergantian status KBM (lingkungan pengujian berbasis CI/dev tanpa device fisik).
  - Skenario ekstrem multi-school jika terdapat dua guru bernama persis sama di sekolah yang sama dengan jadwal bertabrakan.

---

## 4. Known Issues
- None. Tidak ada `Fatal Functional Bug` atau `Minor Robustness Risk`.

---

## 5. Remaining Risk & Next Step
- Tugas perbaikan ketidakkonsistenan status KBM Guru vs Admin telah selesai secara komprehensif, minimalis (/ponytail), dan lolos seluruh uji regresi.

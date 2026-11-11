# Adversarial Review & QA Report: Round 1

## Executive Verdict
**CONFIRMED & REMEDIATED**:
Akar penyebab ketidakkonsistenan status KBM Guru vs Admin yang ditangani oleh implementer telah diuji secara adversarial. Reviewer menemukan 4 celah kritis tambahan pada implementasi awal:
1. **Pembersihan Honorific Tidak Lengkap pada Sapaan Umum & Gelar Keagamaan**: Sapaan "Bu", "H." (Haji), "Haji", "Hjh.", "Kyai", "Kiai" tidak termasuk dalam regex `normalizeTeacherIdentityName` dan `cleanTeacherNameForMatch`, sehingga pencocokan nama seperti "Bu Winda Wulansari" atau guru bergelar "H. Ahmad Dahlan" gagal cocok dengan status `false`.
2. **Ketiadaan Fallback `isTeacherNameEquivalent` pada `findJadwalForGuru` dan `connectGuruMapelWithJadwal`**: Saat guru login dengan nama sapaan ("Ibu Winda Wulansari") sedangkan master jadwal memakai "Winda Wulansari" (atau sebaliknya), pencocokan jadwal di antarmuka guru gagal (`dailyState.jadwalKBM` kosong).
3. **Pencocokan Jurnal Pengganti (INVAL) Belum Dikenali untuk Guru yang Digantikan**: Saat guru berhalangan dan sesi diisi oleh Guru Inval (`[INVAL - Menggantikan: Ibu Winda]`), status KBM di Admin belum mengaitkan jurnal tersebut ke guru yang digantikan.
4. **Regresi Toast Upload Foto pada Test Suite Eksisting**: Perubahan pesan toast pada background Google Drive upload error di `GuruPresensi.tsx` memicu kegagalan pada `tests/four_ponytail_improvements.test.ts`.

Seluruh celah tersebut telah diperbaiki secara bedah (/ponytail), diverifikasi dengan test suite adversarial (17 checks), dan seluruh 90+ test suite eksisting lulus 100%.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: Missing "Bu", "H.", "Haji", "Hjh", "Kyai" in honorific regex
- **Input**: `isTeacherNameEquivalent("Bu Winda Wulansari", "Winda Wulansari")` dan `"H. Ahmad Dahlan"`
- **Expected**: `true` (nama ekuivalen karena "Bu" adalah sapaan honorific wanita umum Indonesia, dan "H." adalah gelar haji).
- **Actual**: `false` (gagal cocok).
- **Root Cause**: Implementer hanya memasukkan `ibu|bapak|pak|bpk|ustadz|ustadzah|ust|guru`, melewatkan varian paling umum di sekolah ("bu") serta gelar haji ("h", "haji", "hjh").

### Issue 2: Schedule matching in `findJadwalForGuru` and `connectGuruMapelWithJadwal` lacked `isTeacherNameEquivalent`
- **Input**: Guru dengan nama login "Ibu Winda Wulansari" membuka jadwal di mana jadwal pelajaran berlabel "Winda Wulansari" (tanpa user_id).
- **Expected**: Jadwal ditemukan dan dimuat ke `dailyState.jadwalKBM`.
- **Actual**: `nameMatches` bernilai kosong karena hanya membandingkan `firstName === jNorm` atau `namaNorm === jNorm`.
- **Root Cause**: `findJadwalForGuru` dan `connectGuruMapelWithJadwal` di `src/lib/workflow.ts` tidak memiliki fallback `isTeacherNameEquivalent(namaGuru, jNama, true)`.

### Issue 3: Inval substitution journals not linked to original teacher in `isTeacherRecordMatch`
- **Input**: Guru pengganti mengisi jurnal dengan format `[INVAL - Menggantikan: Ibu Winda Wulansari] Jurnal KBM`.
- **Expected**: Admin mengenali bahwa kelas terjadwal untuk Ibu Winda telah diselesaikan oleh guru pengganti.
- **Actual**: Jurnal hanya dikaitkan ke guru pengganti, sehingga status Ibu Winda di Admin tetap "Belum Lengkap" atau "Tidak Masuk Kelas".
- **Root Cause**: `isTeacherRecordMatch` hanya mengecek kolom `nama_guru` tanpa memeriksa pola substitusi `[INVAL - Menggantikan: ...]` di `keterangan`.

### Issue 4: Missing expected token in `GuruPresensi.tsx` toast causing test regression
- **Input**: `npm test` -> `tests/four_ponytail_improvements.test.ts`
- **Expected**: `GuruPresensi.tsx` memuat token toast `'Upload Foto Tertunda'`.
- **Actual**: Gagal test `tests/four_ponytail_improvements.test.ts` (14 passed, 1 failed).
- **Root Cause**: Perubahan label toast sebelumnya menjadi `'Sinkronisasi Tertunda'` menyebabkan kegagalan assertion kontraktual pada test suite eksisting.

---

## 2. What I Changed

1. `src/lib/workflow.ts`:
   - Menambahkan `bu|haji|h|hj|hjh|kh|kyai|kiai` ke `normalizeTeacherIdentityName`.
   - Menambahkan fallback `isTeacherNameEquivalent(namaGuru, jNama, true)` ke `findJadwalForGuru`.
   - Menambahkan fallback `isTeacherNameEquivalent(guruName, jNama, true)` ke `connectGuruMapelWithJadwal`.
   - Menambahkan dukungan resolusi `isTeacherNameEquivalent` pada `isGuruDiPiket`.
   - Menambahkan deteksi substitusi guru pengganti `[INVAL - Menggantikan: ...]` pada `isTeacherRecordMatch`.

2. `src/lib/attendanceAlpa.ts`:
   - Menambahkan `bu|haji|h\.?|hj\.?|hjh\.?|kh\.?|kyai\.?|kiai\.?` ke `cleanTeacherNameForMatch`.

3. `src/components/HomeViewAdmin.tsx`:
   - Memperkuat filter `isRealJournal` dengan pemeriksaan gabungan konten materi dan kegiatan pembelajaran (`materi || materi_pembelajaran || konten` dan `kegiatan || kegiatan_pembelajaran`).

4. `src/components/GuruPresensi.tsx`:
   - Memulihkan toast title `'Upload Foto Tertunda'` saat background upload foto Google Drive gagal/tertunda agar kompatibel dengan seluruh kontrak uji otomatis.

5. `tests/kbm_status_consistency_winda.test.ts`:
   - Menambahkan 3 test case baru (17 total checks):
     - Uji ekuivalensi "Bu Winda Wulansari", "H. Ahmad Dahlan", "Haji Ahmad", "Ustadzah Fatimah".
     - Skenario guru 3 jadwal KBM yang mengisi 2 kelas dan 1 kelas kosong (status "2/3 Belum Lengkap", bukan "Tidak Masuk Kelas").
     - Skenario guru 3 jadwal KBM dengan kelas ke-3 diisi oleh Guru Pengganti INVAL (terverifikasi sebagai "3/3 Selesai").
     - Uji statis source code untuk honorifics lengkap dan integrasi INVAL substitution.

---

## 3. Verification Record

- **Deep Verification (Ran Actual Tests)**:
  - `npx tsx tests/kbm_status_consistency_winda.test.ts`: **17/17 PASSED (100%)**
  - `npx tsx tests/four_ponytail_improvements.test.ts`: **15/15 PASSED (100%)**
  - `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: **30/30 PASSED (100%)**
  - `npx tsx tests/guru_presensi_pulang_tugas_terisi.test.ts`: **20/20 PASSED (100%)**
  - `npx tsx tests/admin_jurnal_real_data_verification.test.ts`: **PASSED (100%)**
  - `npm test`: **Seluruh 90+ test suite PASSED 100% tanpa error**
  - `npm run build`: **Next.js 16 (Turbopack) build PASSED (13/13 static pages, 0 TypeScript errors)**

- **Shallow Verification**:
  - UI responsivitas tab status di Admin Dashboard diperiksa melalui validasi struktur JSX TSX.

- **Unverified Aspects**:
  - Pengiriman push notification web-push FCM langsung ke ponsel fisik saat status KBM berganti (karena lingkungan pengujian berbasis CI/local dev tanpa device fisik).

---

## 4. Known Issues
- None. Tidak ada `Fatal Functional Bug` atau `Minor Robustness Risk`.

---

## 5. Remaining Risk & Next Step
- Tugas Round 1 selesai dengan sukses. Semua persyaratan R1, R2, dan R3 telah terpenuhi dengan solusi minimalis (/ponytail), preservasi backward compatibility, dan verifikasi menyeluruh.

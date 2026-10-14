# Reviewer 2 Handoff Report: Wajib Hadir Hari Mengajar & Pembersihan Kode Usang (Round 2)

> [!WARNING] **Skepticism Disclaimer**
> High confidence in multi-tenant isolation, database integrity, and workflow rule determinism; real-world client-side Web Push delivery remains dependent on end-user physical OS and device battery optimization.

---

## 1. What the prior attempt got wrong

### Issue 1 (Multi-Tenant Policy Contamination & Cross-School Schedule Leakage)
- **Input:** Sistem berjalan di lingkungan multi-sekolah di mana Sekolah A menetapkan kebijakan global `aturan_kehadiran_guru = 'Hari_Mengajar_Saja'`, sedangkan Sekolah B menetapkan `Semua_Hari`. Evaluasi `evaluateAndApplyAutoAlpa()` dipanggil tanpa argumen `sekolahId` (misal saat cron job auto-alpa dijalankan di server), atau `getGuruDailyState()` dieksekusi dengan `sekolahId`.
- **Expected:** Guru di Sekolah B tetap diwajibkan hadir setiap hari kerja dan dikenai Alpa otomatis jika mangkir, sesuai aturan Sekolah B. Jadwal pelajaran, penugasan piket, dan sistem blok hanya dicocokkan dengan entri sekolah masing-masing.
- **Actual:** Pada `attendanceAlpa.ts`, baris 236 memeriksa `isGlobalHariMengajarSaja` menggunakan `.some(...)` terhadap seluruh tabel `pengaturan`. Karena Sekolah A menyetel `Hari_Mengajar_Saja`, nilai boolean ini menjadi `true` untuk **seluruh** guru di semua sekolah. Akibatnya, guru di Sekolah B yang tidak mengajar dibebaskan dari Alpa otomatis secara keliru! Selain itu, jadwal dan penugasan piket tidak memfilter `guru.sekolah_id`, sehingga guru di Sekolah A dapat dicocokkan dengan jadwal di Sekolah B yang memiliki kesamaan nama. Pada `workflow.ts`, query `pengaturan` dan `data_guru` sama sekali tidak memfilter `sekolah_id`.
- **Root Cause:** Tidak adanya scoping `sekolah_id` pada evaluasi pengaturan per guru dan tidak adanya isolasi tenant pada pencocokan jadwal dan piket.

### Issue 2 (Visual Inconsistency & Premature Duty Completion pada Presensi Pulang Guru Hadir Sukarela di `HomeViewAdmin.tsx`)
- **Input:** Guru exempt pada hari tanpa jadwal mengajar dan tanpa tugas piket hadir ke sekolah secara sukarela dan melakukan Presensi Datang (`pDatang` ada, misal `Hadir [07:15]`), tetapi belum melakukan Presensi Pulang (`!pPulang`).
- **Expected:** Pada tabel Admin, kolom Presensi Pulang menampilkan status `Belum Pulang` (gray) karena guru sedang berada di sekolah dan belum checkout. Di filter "Tugas Lengkap" vs "Belum Lengkap", guru berstatus "Belum Lengkap" sampai mereka checkout. KPI `wajibPulang` menghitung guru tersebut sebagai wajib pulang dan belum pulang.
- **Actual:** Baris 314 di `HomeViewAdmin.tsx` mengevaluasi:
  `let presensiPulangStatus = isSchoolDayOff ? 'Libur' : isFreeFromPresence ? 'Bebas Hadir' : 'Belum Pulang';`
  Karena `isFreeFromPresence` bernilai `true`, kolom Presensi Pulang menampilkan `Bebas Hadir` (biru) saat guru **masih aktif** di sekolah! Begitu guru checkout, statusnya tiba-tiba melompat menjadi `Pulang [14:00]`. Di sisi filter, baris 395 mengevaluasi `isLiburOrExempt = true`, sehingga guru langsung dianggap `isTugasLengkap = true` (Tugas Lengkap) meskipun masih berada di sekolah dan belum absen pulang.
- **Root Cause:** Evaluasi `presensiPulangStatus`, `isLiburOrExempt`, dan `wajibPulang` mengabaikan keberadaan `pDatang` pada guru exempt.

### Issue 3 (Dead-End Notification: Reminder Presensi Pulang Terkirim ke Guru yang Tidak Masuk di `TeacherReminderManager.tsx`)
- **Input:** Guru (baik non-exempt maupun exempt dengan jadwal KBM) tidak hadir ke sekolah sama sekali (`dailyState.presensiDatang = null`). Waktu menunjukkan pukul 15:00 WITA (jendela jam pulang 14:00 - 18:00).
- **Expected:** Guru yang tidak masuk sekolah TIDAK dikirimi notifikasi "Pengingat Presensi Pulang" ("Jam pulang telah tiba. Harap lakukan presensi pulang sebelum meninggalkan sekolah"), karena mereka tidak berada di sekolah dan tidak dapat melakukan presensi pulang (sistem mengunci presensi pulang jika belum presensi datang).
- **Actual:** Kondisi 4 di `TeacherReminderManager.tsx` mengevaluasi:
  `if (needsPulang && (dailyState.presensiDatang || !isExempt || hasObligationToday))`
  Untuk guru non-exempt (`!isExempt = true`) atau guru yang punya jadwal (`hasObligationToday = true`), kondisi mengevaluasi ke `true` meskipun `dailyState.presensiDatang` bernilai `null`! Akibatnya, guru yang mangkir dikirimi notifikasi untuk absen pulang. Saat notifikasi diklik, presensi terkunci dengan pesan "Anda belum melakukan Presensi Datang hari ini".
- **Root Cause:** Presensi Pulang seharusnya mensyaratkan guru sudah melakukan presensi datang (`hasCheckedIn = Boolean(dailyState.presensiDatang && !dailyState.presensiDatangDitolak)`), selaras dengan logika backend pada `send-reminders/route.ts` (`if (hasCheckedIn && !hasCheckedOut)`).

### Issue 4 (Piket Coverage Gap & Unsafe Substring Matching pada `send-reminders/route.ts` Task 3)
- **Input:**
  1. Sekolah menetapkan jadwal piket pada tabel `jadwal_piket` (fallback resmi yang didukung `workflow.ts`, `attendanceAlpa.ts`, dan `HomeViewAdmin.tsx`).
  2. Guru piket di `penugasan_piket` dievaluasi saat `activeBlok` dengan baris 316-318 (`sName.includes(pNameLower) || pNameLower.includes(sName)`), atau Task 2 baris 282 (`tNameLower.includes(jName) || jName.includes(tNameLower)`).
- **Expected:**
  1. Guru yang bertugas piket hari ini melalui `jadwal_piket` tetap menerima reminder pengingat laporan piket jika belum membuat laporan.
  2. Pengecekan substring pada Task 2 & Task 3 terlindungi dari string kosong/placeholder dengan guard `length >= 3`.
- **Actual:**
  1. Task 3 hanya melakukan iterasi pada `assignedPiketList` (tabel `penugasan_piket`), sehingga guru piket dari `jadwal_piket` tidak pernah menerima pengingat laporan piket.
  2. Baris 282, 308, dan 317 tidak memiliki validasi panjang string (`length >= 3`), memungkinkan entri kosong / pendek memicu false-positive matching.
- **Root Cause:** Task 3 mengabaikan `jadwalPiketList` dan tidak menerapkan guard token length yang konsisten seperti Task 1.

---

## 2. What I changed

### File yang Dimodifikasi:
1. `src/lib/attendanceAlpa.ts`:
   - Menambahkan field `sekolah_id` pada query `pengaturan` dan `sistem_blok`.
   - Mengganti evaluasi boolean global menjadi scoping per-sekolah guru (`schoolPengaturan`).
   - Menerapkan isolasi multi-tenant pada pencocokan `allJadwalToday`, `penugasanList`, `jadwalPiketList`, dan `activeBloks` (`if (guru.sekolah_id && item.sekolah_id && item.sekolah_id !== guru.sekolah_id) return false;`).
2. `src/lib/workflow.ts`:
   - Menambahkan parameter `sekolahId` filtering pada query `pengaturan` dan `data_guru`.
3. `src/components/HomeViewAdmin.tsx`:
   - Memperbaiki `presensiPulangStatus`: `isSchoolDayOff ? 'Libur' : (isFreeFromPresence && !pDatang) ? 'Bebas Hadir' : 'Belum Pulang'`.
   - Memperbaiki `isLiburOrExempt`: `isSchoolDayOff || (isExemptNonTeaching && !hasPiketDuty && !pDatang)`.
   - Memperbaiki metrik KPI `wajibPulang`: mengecualikan guru berstatus `Libur` dan `Bebas Hadir`.
4. `src/components/TeacherReminderManager.tsx`:
   - Memperbarui Condition 4 (Presensi Pulang) menjadi:
     `const hasCheckedIn = Boolean(dailyState.presensiDatang && !dailyState.presensiDatangDitolak);`
     `if (needsPulang && hasCheckedIn)`
5. `src/app/api/push/send-reminders/route.ts`:
   - Memperbaiki Task 2 (Jurnal) dengan token length check `length >= 3` dan non-empty guard.
   - Mengembangkan Task 3 (Piket) untuk memeriksa seluruh guru yang ditugaskan piket baik via `penugasan_piket` maupun fallback `jadwal_piket`, dengan guard substring aman.
6. `tests/wajib_hadir_dan_pembersihan_usang.test.ts`:
   - Memperbarui assertion literal R1.8 agar selaras dengan evaluasi kehadiran sukarela.
   - Menambahkan skenario uji R1.15: Isolasi multi-tenant kebijakan sekolah (Sekolah A `Hari_Mengajar_Saja` vs Sekolah B `Semua_Hari`).
   - Menambahkan skenario uji R1.16: Konsistensi visual badge dan KPI presensi pulang guru sukarela di Admin.
   - Menambahkan skenario uji R1.17: Guru yang tidak masuk tidak menerima pengingat presensi pulang.
   - Menambahkan skenario uji R1.18: Dukungan `jadwal_piket` fallback dan hardening string matching pada `send-reminders/route.ts`.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`: 30/30 PASS (100%).
  - `npx tsx tests/three_fixes_verification.test.ts`: PASS (100%).
  - `npx tsc --noEmit`: 0 compiler error, exit code 0.
  - `npm test`: Seluruh test suites lulus (100% PASS, 0 error).
- **Shallow Verification (manual only):**
  - Pemeriksaan kelengkapan komponen UI dan status badge pada `HomeViewAdmin.tsx` dan `HomeViewGuru.tsx`.
- **Unverified aspects:**
  - Penerimaan Web Push Notification di perangkat browser fisik nyata dengan batasan OS power-saver mode.

---

## 4. Known Issues
- `[reviewer_2 - Shallow Verification]` Penerimaan Web Push Notification pada perangkat keras browser fisik nyata saat service worker dalam status terminated oleh OS.
- `[reviewer_2 - Minor Robustness Risk]` Jika database kalender pendidikan memiliki entri tanggal duplikat dengan tipe campuran (Libur vs Masuk), sistem mengambil entri pertama yang ditemukan.

---

## 5. Remaining risk & next step
Perbaikan pada Round 2 telah menyelesaikan celah multi-tenant, inkonsistensi visual & KPI presensi pulang, notifikasi false-positive presensi pulang pada guru mangkir, serta ketahanan query piket reminder. Seluruh pengujian otomatis dan typecheck 100% lulus. Tugas ini telah lengkap dan siap untuk dideploy.

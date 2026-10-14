# Reviewer 3 Final Adversarial Review Handoff Report: Wajib Hadir Hari Mengajar & Pembersihan Kode Usang

> [!WARNING] **Skepticism Disclaimer**
> Full deterministic confidence in multi-tenant calendar isolation, mixed-calendar type overrides, and holiday reminder protection; client-side push notification arrival remains dependent on physical hardware OS power-management states.

---

## 1. What the prior attempt got wrong

### Issue 1 (Multi-Tenant Kalender Pendidikan Cross-School Leakage & Premature Auto-Alpa Abort)
- **Input:** Sistem berjalan di lingkungan multi-sekolah di mana Sekolah A menetapkan hari libur lokal di `kalender_pendidikan` (misalnya Hari Ulang Tahun Sekolah A / Kegiatan Khusus dengan `sekolah_id = 'school-a'` dan `tipe = 'Libur'`). Sekolah B beroperasi normal (hari efektif KBM).
- **Expected:**
  1. Guru di Sekolah B yang membuka aplikasi/dashboard (`getGuruDailyState(..., sekolahId: 'school-b')`) tidak boleh terkunci dengan status "Hari ini Libur: Libur Sekolah A" dan bebas melakukan presensi datang/pulang.
  2. Ketika cron job server menjalankan `evaluateAndApplyAutoAlpa()` secara batch untuk semua sekolah, evaluasi tidak boleh langsung dihentikan secara global hanya karena Sekolah A memiliki entri `Libur`. Guru di Sekolah B yang mangkir harus tetap dievaluasi dan dikenai Alpa.
- **Actual:**
  1. Pada `workflow.ts` (baris 242), query `kalender_pendidikan` tidak memfilter `sekolah_id`. Akibatnya, `cal.find((c: any) => c.tipe === 'Libur')` mencocokkan libur lokal Sekolah A untuk guru di Sekolah B, mengunci kehadiran guru Sekolah B dengan status libur!
  2. Pada `attendanceAlpa.ts` (baris 210-220), query mencari `tipe = 'Libur'` dengan `.limit(1)` tanpa filter `sekolah_id` dan terdapat komentar `// ponytail: no sekolah_id filter here — libur nasional tidak perlu scope sekolah`. Begitu entri Sekolah A ditemukan, baris 219 langsung melakukan `return` keluar dari fungsi evaluasi secara keseluruhan! Seluruh guru di Sekolah B yang mangkir tidak pernah diproses Auto-Alpa.
- **Root Cause:** Hilangnya scoping `sekolah_id` pada query kalender di `workflow.ts` dan abort global prematur di `attendanceAlpa.ts`.

### Issue 2 (Mixed Calendar Types / Overwrite Collision pada `kalender_pendidikan`)
- **Input:** Database `kalender_pendidikan` memiliki entri bertipe campuran pada tanggal yang sama, misalnya entri `tipe: 'Libur'` (libur umum/terjadwal) tetapi admin menambahkan entri `tipe: 'Masuk'` atau `'Efektif'` (hari masuk pengganti KBM).
- **Expected:** Entri `Masuk` / `Efektif` meng-override status libur sehingga hari tersebut dianggap hari sekolah normal, guru wajib hadir, dan dashboard admin tidak menampilkan status 'Libur'.
- **Actual:** Pada `workflow.ts`, `attendanceAlpa.ts`, dan `HomeViewAdmin.tsx`, sistem hanya melakukan `.find(c => c.tipe === 'Libur')` atau `.some(c => c.tipe === 'Libur')`. Keberadaan entri `Masuk` / `Efektif` diabaikan sepenuhnya, sehingga hari tetap dikunci sebagai libur.
- **Root Cause:** Tidak adanya evaluasi prioritas tipe override (`isExplicitMasuk`) sebelum menyimpulkan status hari libur.

### Issue 3 (Spam Notification pada Hari Libur & Akhir Pekan di `send-reminders/route.ts`)
- **Input:** Server cron memanggil `GET /api/push/send-reminders` pada hari Minggu, hari Sabtu bagi sekolah 5 hari kerja, atau pada hari libur nasional / sekolah (yang tercatat di `kalender_pendidikan`).
- **Expected:** Guru tidak dikirimi push notification pengingat presensi datang, jurnal KBM, maupun laporan piket, karena sekolah sedang libur dan aplikasi presensi terkunci.
- **Actual:** `send-reminders/route.ts` tidak memeriksa hari Minggu, `hari_sekolah`, maupun `kalender_pendidikan`. Akibatnya, seluruh guru di sekolah tersebut dikirimi notifikasi "Halo Budi, Anda belum melakukan Presensi Datang untuk hari Minggu. Harap segera melakukan presensi selfie", serta tagihan jurnal KBM fiktif.
- **Root Cause:** Tidak adanya evaluasi `isSchoolDayOff` (`isHoliday || isWeekendOff`) pada Task 1 (Datang), Task 2 (Jurnal), dan Task 3 (Piket).

---

## 2. What I changed

### File yang Dimodifikasi:
1. `src/lib/workflow.ts`:
   - Menambahkan scoping filter `sekolah_id` pada query `kalender_pendidikan` (`calQuery.or('sekolah_id.eq.${sekolahId},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000')`).
   - Menambahkan in-memory tenant isolation filter `relevantCal`.
   - Mengimplementasikan deteksi override tipe `Masuk` / `Efektif` (`isExplicitMasuk`).
2. `src/lib/attendanceAlpa.ts`:
   - Menghapus abort global prematur pada `kalenderLibur`.
   - Menambahkan scoping per-sekolah jika parameter `sekolahId` disediakan, dan membatasi abort global hanya jika ada Libur Nasional universal (`!sekolah_id` atau default zero uuid).
   - Menambahkan evaluasi hari libur kalender per-guru di dalam perulangan `guruList` (`isGuruSchoolHoliday`), sehingga libur Sekolah A tidak menghentikan evaluasi Sekolah B.
   - Mendukung override tipe `Masuk` / `Efektif`.
3. `src/app/api/push/send-reminders/route.ts`:
   - Menambahkan deteksi `hari_sekolah` dan akhir pekan (`isWeekendOff = todayDay === 'Minggu' || (hariSekolah === 5 && todayDay === 'Sabtu')`).
   - Mengambil data `kalender_pendidikan` per-sekolah dengan dukungan override `Masuk`/`Efektif`.
   - Membungkus Task 1 (Datang), Task 2 (Jurnal), dan Task 3 (Piket) di dalam guard `if (!isSchoolDayOff)`.
   - Mempertahankan Task 4 (Pulang) hanya bagi guru yang telah melakukan presensi datang (`hasCheckedIn && !hasCheckedOut`).
4. `src/components/HomeViewAdmin.tsx`:
   - Memperbarui query `kalenderQ` agar mencakup entri global (`sekolah_id.is.null` atau default zero uuid).
   - Memperbarui evaluasi `isLiburKalender` dengan filtering relevansi sekolah dan override `Masuk`/`Efektif`.
5. `tests/wajib_hadir_dan_pembersihan_usang.test.ts`:
   - Menambahkan skenario uji R1.19: Isolasi multi-tenant kalender pendidikan (Libur Sekolah A vs Sekolah B).
   - Menambahkan skenario uji R1.20: Resolusi entri kalender campuran (Override Masuk/Efektif).
   - Menambahkan skenario uji R1.21: Proteksi hari libur dan akhir pekan pada `send-reminders/route.ts`.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`: 33/33 PASS (100%).
  - `npx tsc --noEmit`: 0 compiler error, exit code 0.
  - `npm test`: Seluruh 26 test suites lulus (100% PASS, 0 error).
- **Shallow Verification (manual only):**
  - Pemeriksaan kelengkapan UI guru dan admin untuk kasus override hari libur dan multi-tenant isolation.
- **Unverified aspects:**
  - Penerimaan Web Push Notification di hardware browser fisik nyata di luar test harness simulator saat background worker di-freeze oleh OS power-saver mode.

---

## 4. Known Issues
- `[reviewer_3 - Shallow Verification]` Penerimaan Web Push Notification pada perangkat fisik nyata dengan optimasi baterai OS agresif (misal vendor-specific background kill).

---

## 5. Remaining risk & next step
- Tidak ada functional bug atau open robustness risk yang tersisa.
- Seluruh kebutuhan R1 (aturan hadir hari mengajar), R2 (pembersihan komponen & file usang), dan R3 (automasi verifikasi pengujian) terpenuhi 100%.
- Task dinyatakan SELESAI (COMPLETE) dan siap digabungkan.

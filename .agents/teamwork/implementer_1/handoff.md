# Handoff Report: Implementer 1 - Wajib Hadir Hari Mengajar & Pembersihan Kode Usang

## 1. Ringkasan Pekerjaan (Summary of Changes)
Telah diselesaikan implementasi aturan kehadiran guru "Wajib Hadir Hanya Hari Mengajar" secara akurat dan konsisten di seluruh modul, serta eliminasi kode & komponen yatim yang sudah tidak dipakai.

### File yang Dihapus (R2)
1. `src/components/AdminMonitorView.tsx`: Komponen yatim tanpa rute navigasi dan tidak di-mount di aplikasi.
2. `src/components/NotificationPermissionModal.tsx`: Komponen modal izin notifikasi yatim yang tidak di-mount.
3. `src/components/PushNotificationPrompt.tsx`: Komponen prompt notifikasi push yatim yang tidak di-mount.

### File yang Dimodifikasi (R1 & R2)
1. `src/lib/workflow.ts`:
   - Penyelarasan loop iterasi pengecekan eksepsi `wajib_hadir_hanya_mengajar` pada seluruh record guru yang cocok.
   - Presensi Pulang: menambahkan `if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;` sehingga guru exempt yang hadir sukarela atau bertugas piket pada hari tanpa jam mengajar tidak terblokir oleh tagihan jurnal KBM fiktif.
2. `src/lib/attendanceAlpa.ts`:
   - Evaluasi Auto-Alpa: mengambil data penugasan piket (`penugasan_piket` & `jadwal_piket`) dan jadwal KBM hari ini.
   - Guru exempt dibebaskan dari Alpa hanya jika tidak memiliki jadwal mengajar DAN tidak memiliki tugas piket (`!hasTeachingToday && !hasPiketDuty`). Jika ditugaskan piket tapi mangkir, tetap dievaluasi untuk Alpa.
3. `src/components/HomeViewAdmin.tsx`:
   - Memajukan perhitungan kewajiban piket (`hasPiketDuty`) sebelum penentuan status Datang dan Pulang.
   - Status Presensi Datang dan Pulang guru exempt pada hari tanpa KBM & tanpa piket diset ke `'Bebas Hadir'`. Jika memiliki tugas piket, tetap diwajibkan hadir (`'Belum Datang'` / `'Belum Pulang'`).
   - `isLiburOrExempt` pada agregat tugas lengkap memperhitungkan `!hasPiketDuty`.
4. `src/components/HomeViewGuru.tsx`:
   - Menyelaraskan Step 3 (Jurnal) pada alur kerja guru: guru exempt pada hari tanpa jadwal mengajar diberikan status `'Bebas Jurnal'`.
5. `src/app/api/push/send-reminders/route.ts`:
   - Menambahkan pengecekan `hasPiketDuty` pada Task 1 (Pengingat Datang). Guru exempt hanya dilewati jika tidak memiliki jam mengajar DAN tidak bertugas piket hari ini.
6. `src/components/TeacherReminderManager.tsx`:
   - Menyelaraskan deteksi kewajiban (`hasObligationToday = hasClassesToday || hasPiketDuty`) untuk aktivasi pengingat datang in-app.
7. File Tes Terkait Pembersihan Komponen:
   - `tests/challenger_m2_empirical.test.ts`, `tests/m2_notifications_alpa_warning.test.ts`, `tests/m3_ui_ux_apple_compatibility.test.ts`, `tests/m3_adversarial_stress.test.ts`, `tests/adversarial_m3_challenger_2.test.ts`, `tests/m9_4_chat_and_notifications.test.ts`, `tests/m9_challenger2_e2e_verification.test.ts`: diupdate agar tidak crash akibat penghapusan file usang.
8. `package.json`:
   - Mendaftarkan suite tes baru `tests/wajib_hadir_dan_pembersihan_usang.test.ts` ke dalam script `"test"`.
9. `tests/wajib_hadir_dan_pembersihan_usang.test.ts`:
   - 18 pengujian komprehensif yang memvalidasi seluruh kondisi R1, R2, dan R3.

---

## 2. Catatan Verifikasi (Verification Record)

### Perintah Pengujian yang Dijalankan
```bash
npx tsc --noEmit
npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts
npm test
```

### Hasil Pengujian
1. `npx tsc --noEmit`: Exit code 0, 0 compiler error.
2. `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`: 18/18 PASS (100%).
3. `npm test`: 26 test suite, 100% PASS, 0 failure.

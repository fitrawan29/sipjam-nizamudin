# Sentinel Handoff Report — Milestone swe_24

## 1. Observation
Permintaan pengguna: Desain ulang sistem pengaturan kewajiban kehadiran guru di SIPJAM untuk memberikan penentuan eksplisit per guru antara 'Wajib Hadir Setiap Hari' dan 'Hanya Hari KBM', serta memastikan pembaruan pengaturan langsung berefek secara instan (real-time) pada akun guru tanpa perlu logout atau refresh manual.
- Rute yang dipilih: SWE Light (`teamwork_preview_swe`) sebagai single self-contained focused fix.
- Orchestrator `swe_24` mengelola 1 implementer dan 3 putaran review adversarial berurutan.
- Audit kemenangan independen dilakukan oleh `teamwork_preview_victory_auditor` (`victory_auditor_37`).
- Vonis audit: **VICTORY CONFIRMED**.

## 2. Logic Chain
1. **Desain Ulang UI Pengaturan Kehadiran Guru Model B (R1)**:
   - `AdminConfigView.tsx` menyediakan antarmuka eksplisit per guru dengan switch toggle individual (Wajib Hadir Setiap Hari vs Hanya Hari KBM / Piket).
   - Dilengkapi 3 tab filter cepat (Semua Guru, Wajib Setiap Hari, Hanya Hari KBM), tombol aksi massal (*Set Semua Hadir Setiap Hari* & *Set Semua Hanya Hari KBM*), serta filter pencarian responsif (nama, NIP, mapel) dengan penanganan aman terhadap numeric NIP.
   - Status tersimpan sinkron ke kolom `data_guru.wajib_hadir_hanya_mengajar` dan entri konfigurasi JSON kanonikal `pengaturan.guru_hanya_mengajar`.
2. **Evaluasi Aturan Kehadiran Dua Arah yang Konsisten (R2)**:
   - Menghilangkan hardcoded unconditional override pada kebijakan global `Hari_Mengajar_Saja` di seluruh sistem (`workflow.ts`, `attendanceAlpa.ts`, `HomeViewAdmin.tsx`, `TeacherReminderManager.tsx`, `send-reminders/route.ts`, dan `warningSystem.ts`).
   - Guru dengan status `wajib_hadir_hanya_mengajar = true`: Hanya wajib hadir jika ada jadwal KBM atau tugas piket hari itu; jika kosong, bebas presensi dan bebas alpa.
   - Guru dengan status `wajib_hadir_hanya_mengajar = false`: Wajib hadir setiap hari kerja sekolah terlepas dari jadwal KBM hari itu.
   - Normalisasi boolean aman dari kerentanan string (`"false"`, `"true"`, `0`, `1`).
   - Kompatibilitas mundur (backward compatibility) data guru lama tetap terjaga.
3. **Propagasi Real-time & Efek Langsung ke Akun Guru (R3)**:
   - `AdminConfigView` memancarkan sinkronisasi melalui update database, window event, storage event (`sipjam_config_sync`), dan Supabase Realtime Broadcast channel (`school-config-${targetSekolahId}`) non-blocking dengan timeout safeguard (1500ms).
   - `HomeViewGuru.tsx` dan `AppScreen.tsx` mendengarkan perubahan realtime (`postgres_changes` pada tabel `pengaturan` dan `data_guru`, custom/storage events, serta event `visibilitychange`, `focus`, dan `online` reconnect sync).
   - Layar guru langsung meng-update state kehadiran (`getGuruDailyState`), widget jadwal, timeline alur harian (Bebas Presensi vs Wajib Datang), dan pengingat secara otomatis tanpa reload browser atau logout.
   - Dilengkapi perlindungan debounce anti-storming (200ms) dan pembatalan timer unmount untuk mencegah memory leak.
4. **Verifikasi & Integritas Pengujian**:
   - `tests/guru_attendance_exemption_redesign.test.ts`: 21/21 PASS (100%).
   - `tests/wajib_hadir_dan_pembersihan_usang.test.ts`: 33/33 PASS (100%).
   - Seluruh 26 test suite di repository (`npm test`): 183/183 PASS (100%).
   - Typecheck `npx tsc --noEmit`: 0 errors.
   - Next.js production build (`npm run build`): Berhasil bersih (Exit code 0).
   - Git remote: Tersinkronisasi penuh ke branch `main` pada `origin/main` (`92d7e98`).

## 3. Caveats
- Bila perangkat guru mengalami putus koneksi jaringan total (offline pesawat), sinkronisasi otomatis akan dieksekusi begitu koneksi online kembali via listener `online` dan re-subscribe channel Supabase.
- Toggle massal berturut-turut dalam rentang sangat cepat (<200ms) dilindungi oleh trailing debounce untuk mencegah query storming ke Supabase.

## 4. Conclusion
Milestone `swe_24` tuntas 100% dan terverifikasi independen dengan vonis **VICTORY CONFIRMED**. Seluruh background crons dan subagents telah dibersihkan sesuai tata kelola Sentinel, dan repositori bersih tersinkronisasi.

## 5. Verification Method
- **Dedicated Redesign Suite**: `npx tsx tests/guru_attendance_exemption_redesign.test.ts` (21/21 PASS, 100%).
- **Regression Test Suite**: `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts` (33/33 PASS, 100%).
- **Full Test Suite**: `npm test` (26/26 suites, 183/183 tests PASS, 100%).
- **TypeScript Typecheck**: `npx tsc --noEmit` (0 errors).
- **Production Build**: `npm run build` (Next.js 16.3.4, 0 errors).
- **Git Sync**: Status bersih dan sinkron dengan `origin/main`.

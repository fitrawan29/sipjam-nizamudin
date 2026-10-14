# DISPATCH — swe_24

## Identity & Role
- **Agent Type**: `teamwork_preview_swe` (SWE Light Orchestrator)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_24`
- **Parent Sentinel**: Sentinel
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Desain ulang sistem pengaturan kewajiban kehadiran guru di SIPJAM untuk memberikan penentuan eksplisit per guru antara 'Wajib Hadir Setiap Hari' dan 'Hanya Hari KBM', serta memastikan pembaruan pengaturan langsung berefek secara instan (real-time) pada akun guru tanpa perlu logout atau refresh manual.

## Requirements

### R1. Desain Ulang UI Pengaturan Kehadiran Guru (Model B - Eksplisit per Guru)
- Di `AdminConfigView.tsx`, sediakan antarmuka manajemen kehadiran guru yang jelas dan eksplisit untuk setiap guru:
  - Setiap guru memiliki toggle / switch status yang jelas: **Wajib Hadir Setiap Hari** vs **Hanya Hari KBM / Piket**.
  - Sediakan tab filter cepat: **Semua Guru**, **Wajib Setiap Hari**, dan **Hanya Hari KBM**.
  - Sediakan tombol aksi cepat: *Set Semua Hadir Setiap Hari* dan *Set Semua Hanya Hari KBM*.
  - Sediakan input pencarian (nama guru, NIP, mapel) dengan debounce/filter yang responsif.
  - Simpan perubahan status secara sinkron ke kolom `data_guru.wajib_hadir_hanya_mengajar` dan entri konfigurasi `pengaturan.guru_hanya_mengajar` (JSON id).

### R2. Evaluasi Aturan Kehadiran Dua Arah yang Konsisten
- Perbaiki logika evaluasi kehadiran di `src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/components/HomeViewAdmin.tsx`, dan `src/components/TeacherReminderManager.tsx`:
  - Hilangkan hardcoded unconditional override (misal ketika aturan global `Hari_Mengajar_Saja` menimpa guru yang sebenarnya disetel wajib hadir setiap hari).
  - Status individual guru pada `data_guru.wajib_hadir_hanya_mengajar` (atau list pengecualian) harus dihormati secara konsisten:
    - Jika guru berstatus `wajib_hadir_hanya_mengajar = true`: Hanya wajib hadir jika ada jadwal KBM atau tugas piket hari itu. Jika tidak ada jadwal/piket, bebas presensi dan bebas alpa.
    - Jika guru berstatus `wajib_hadir_hanya_mengajar = false`: Wajib hadir setiap hari kerja sekolah terlepas dari jadwal KBM hari itu.
  - Pertahankan backward compatibility untuk sekolah dengan data yang sudah ada.

### R3. Propagasi Real-time & Efek Langsung ke Akun Guru
- Pastikan saat Admin menyimpan perubahan di `AdminConfigView`:
  - `AdminConfigView` memicu sinkronisasi (update database, window event, dan Supabase realtime broadcast channel).
  - Komponen guru (`HomeViewGuru.tsx` / `AppScreen.tsx`) mendengarkan perubahan realtime (`postgres_changes` pada tabel `pengaturan` dan `data_guru`, serta custom event / storage event).
  - Ketika terjadi pembaruan konfigurasi yang menyangkut akun guru yang sedang login, state kehadiran (`getGuruDailyState`) dan data terkait langsung di-refresh secara otomatis di layar guru tanpa reload browser atau logout.
  - Widget Jadwal, timeline alur harian (Bebas Presensi vs Wajib Datang), dan reminder langsung diperbarui sesuai status baru.

## Verification Resources
- Test suite regresi yang ada:
  `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`
- Buat test verifikasi baru (misalnya `tests/guru_attendance_exemption_redesign.test.ts`) yang memverifikasi:
  1. UI toggle & sinkronisasi state di `AdminConfigView`.
  2. Evaluasi konsisten `getGuruDailyState` di `workflow.ts` untuk guru 'Setiap Hari' vs 'Hanya Hari KBM'.
  3. Evaluasi bebas alpa di `attendanceAlpa.ts`.
  4. Mekanisme listener/broadcast realtime yang memicu re-fetch pada akun guru.

## Acceptance Criteria

### Antarmuka AdminConfigView
- [ ] Admin dapat melihat status kehadiran tiap guru dan mengubahnya langsung via toggle/switch (Setiap Hari vs Hanya Hari KBM).
- [ ] Tab filter (Semua / Setiap Hari / Hanya Hari KBM) dan pencarian guru berfungsi menyaring daftar guru dengan benar.
- [ ] Tombol aksi massal (Set Semua Setiap Hari / Set Semua Hanya KBM) bekerja dengan benar.
- [ ] Menyimpan pengaturan berhasil memperbarui data di `data_guru.wajib_hadir_hanya_mengajar` dan `pengaturan`.

### Logika Kehadiran & Alpa
- [ ] Guru dengan status 'Hanya Hari KBM' dibebaskan dari presensi dan alpa ketika tidak memiliki jadwal mengajar maupun tugas piket pada hari berjalan.
- [ ] Guru dengan status 'Setiap Hari' tetap diwajibkan hadir pada hari kerja sekolah meskipun tidak memiliki jadwal mengajar hari itu.
- [ ] Logika `workflow.ts` dan `attendanceAlpa.ts` tidak menimpa status guru secara sepihak jika aturan sekolah berbeda.

### Efek Langsung pada Akun Guru
- [ ] Perubahan status guru oleh Admin langsung terdeteksi oleh klien akun guru melalui realtime / event subscription.
- [ ] `HomeViewGuru` memperbarui tampilan widget kehadiran dan timeline secara otomatis (Bebas Presensi vs Wajib Presensi) tanpa memerlukan refresh halaman atau re-login.

### Verifikasi & Integritas
- [ ] Test regresi `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts` tetap PASS (100%).
- [ ] Test suite baru untuk verifikasi desain ulang lolos pengujian tanpa error.
- [ ] Kode mengikuti prinsip Ponytail: perubahan minimal, bersih, tanpa dependensi baru yang tidak perlu.
- [ ] Lolos typecheck `npx tsc --noEmit` dan `npm run build` jika diperlukan.
- [ ] Mematuhi aturan Git Workflow proyek per `GEMINI.md` (otomatis stage, commit deskriptif, dan push ke branch `main`).

## Execution Protocol
- Run the SWE Light loop: dispatch implementer, then run reviewer rounds.
- Maintain `progress.md` and `BRIEFING.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_24`.
- Once verified, write `handoff.md` and report completion back to the Sentinel.

# Handoff Report: Desain Ulang Sistem Pengaturan Kewajiban Kehadiran Guru & Realtime Sync

## 1. Executive Summary
Tugas ini mendesain ulang sistem pengaturan kewajiban kehadiran guru di SIPJAM untuk memberikan penentuan eksplisit per guru antara 'Wajib Hadir Setiap Hari' dan 'Hanya Hari KBM / Piket', menghilangkan hardcoded unconditional override pada aturan evaluasi kehadiran & alpa, serta mengimplementasikan propagasi realtime end-to-end agar akun guru langsung terupdate tanpa perlu logout atau me-refresh browser.

## 2. Rincian Modifikasi File & Solusi Teknis

### A. Desain Ulang UI AdminConfigView (`src/components/AdminConfigView.tsx`) - Model B Eksplisit
- **Toggle / Switch Status Eksplisit per Guru:** Setiap guru memiliki toggle switch interaktif (`role="switch"`) dengan status visual yang jelas: **Wajib Hadir Setiap Hari** (slate/blue) vs **Hanya Hari KBM / Piket** (emerald/green).
- **Tab Filter Cepat:** Menyediakan 3 tab filter cepat dengan indikator jumlah guru:
  - *Semua Guru* (`all`)
  - *Wajib Setiap Hari* (`setiap_hari`)
  - *Hanya Hari KBM* (`hanya_kbm`)
- **Tombol Aksi Cepat Massal:**
  - *Set Semua Hadir Setiap Hari* (mengatur seluruh guru menjadi non-exempt secara instan)
  - *Set Semua Hanya Hari KBM* (mengatur seluruh guru menjadi exempt secara instan)
- **Pencarian Guru Responsif:** Input pencarian yang menyaring nama guru, NIP, dan mata pelajaran secara responsif.
- **Sinkronisasi Penyimpanan Dua Arah:**
  - Kolom `data_guru.wajib_hadir_hanya_mengajar` diperbarui secara sinkron (`true` untuk Hanya Hari KBM, `false` untuk Wajib Setiap Hari).
  - Kolom `pengaturan.guru_hanya_mengajar` dan row `key = 'guru_hanya_mengajar'` disimpan dalam format JSON array ID.
  - State lokal `guruList` langsung diselaraskan di UI.
- **Pemicu Sinkronisasi Realtime:**
  - Memancarkan `window.dispatchEvent(new CustomEvent('sipjam:config_updated', ...))` dan `sipjam:guru_updated`.
  - Menyimpan penanda sinkronisasi ke `localStorage.setItem('sipjam_config_sync', ...)`.
  - Mengirim Supabase Realtime Broadcast melalui channel `school-config-${targetSekolahId}` dengan event `config_updated`.

### B. Evaluasi Konsisten Dua Arah (`workflow.ts`, `attendanceAlpa.ts`, `HomeViewAdmin.tsx`, `TeacherReminderManager.tsx`, `send-reminders/route.ts`)
- **Penghilangan Hardcoded Override:**
  - Sebelumnya: Jika sekolah menetapkan aturan global `Hari_Mengajar_Saja`, seluruh guru dipaksa exempt meskipun guru bersangkutan sebenarnya disetel `wajib_hadir_hanya_mengajar = false`.
  - Sesudahnya: Logika evaluasi dua arah memprioritaskan status individual eksplisit guru:
    - `wajib_hadir_hanya_mengajar === true`: Guru hanya wajib hadir jika ada jadwal KBM atau tugas piket hari itu. Jika tidak ada jadwal/piket, bebas presensi dan bebas alpa.
    - `wajib_hadir_hanya_mengajar === false`: Guru WAJIB hadir setiap hari kerja sekolah terlepas dari jadwal KBM hari itu. Aturan global `Hari_Mengajar_Saja` dilarang menimpa status ini.
    - `wajib_hadir_hanya_mengajar === null | undefined` (Backward compatibility): Menggunakan fallback legacy ke daftar `pengaturan.guru_hanya_mengajar` atau aturan global sekolah `Hari_Mengajar_Saja`.

### C. Propagasi Realtime & Efek Langsung ke Akun Guru (`HomeViewGuru.tsx` & `TeacherReminderManager.tsx`)
- Di `HomeViewGuru.tsx`:
  - Menambahkan listener Supabase Realtime `postgres_changes` untuk tabel `pengaturan` dan `data_guru`.
  - Menambahkan listener Supabase Broadcast channel `school-config-${schoolId}` untuk event `config_updated`.
  - Menambahkan listener window event `sipjam:config_updated`, `sipjam:guru_updated`, dan `storage` event (`sipjam_config_sync`).
  - Saat event diterima, otomatis memanggil `refreshDailyWorkflow()` (`getGuruDailyState(...)`) yang langsung memperbarui `dailyState` di state React.
  - Widget Jadwal, timeline alur harian (Bebas Presensi vs Wajib Datang), dan banner informasi langsung ter-render ulang secara otomatis tanpa reload browser atau logout.
- Di `TeacherReminderManager.tsx`:
  - Menambahkan listener window event `sipjam:config_updated` dan `sipjam:guru_updated` untuk mengevaluasi ulang reminder secara langsung.

## 3. Catatan Verifikasi & Testing
1. **Test Suite Regresi (`tests/wajib_hadir_dan_pembersihan_usang.test.ts`):**
   - Hasil: **33/33 LULUS (100% PASS)** tanpa regresi sama sekali.
2. **Test Suite Verifikasi Baru (`tests/guru_attendance_exemption_redesign.test.ts`):**
   - Hasil: **15/15 LULUS (100% PASS)**:
     - UI toggle status eksplisit per guru, tab filter cepat, aksi massal, & pencarian responsif.
     - Evaluasi konsisten dua arah di `workflow.ts`, `attendanceAlpa.ts`, `HomeViewAdmin.tsx`, dan `TeacherReminderManager.tsx`.
     - Propagasi sinyal realtime (broadcast, postgres_changes, window event, storage).
     - Simulasi skenario batas & edge cases.
3. **Typecheck (`npx tsc --noEmit`):**
   - Hasil: **Exit 0, 0 errors**.

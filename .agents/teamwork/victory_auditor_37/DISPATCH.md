# DISPATCH — victory_auditor_37

## Identity & Role
- **Agent Type**: `teamwork_preview_victory_auditor`
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_37`
- **Parent Sentinel**: Sentinel
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Orchestrator Handoff**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_24\handoff.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Conduct an independent, blocking 3-phase post-victory audit (Timeline, Cheating Detection, Independent Test Execution) on the implementation of the Redesigned Teacher Attendance Obligation Setting (Model B - Explicit Per-Teacher) and Realtime Instant Sync (R1, R2, R3).

## Requirements Under Audit

### R1. Desain Ulang UI Pengaturan Kehadiran Guru (Model B - Eksplisit per Guru)
- Di `AdminConfigView.tsx`, sediakan antarmuka manajemen kehadiran guru yang jelas dan eksplisit untuk setiap guru:
  - Setiap guru memiliki toggle / switch status yang jelas: **Wajib Hadir Setiap Hari** vs **Hanya Hari KBM / Piket**.
  - Sediakan tab filter cepat: **Semua Guru**, **Wajib Setiap Hari**, dan **Hanya Hari KBM**.
  - Sediakan tombol aksi cepat: *Set Semua Hadir Setiap Hari* dan *Set Semua Hanya Hari KBM*.
  - Sediakan input pencarian (nama guru, NIP, mapel) dengan debounce/filter yang responsif dan safe string handling.
  - Simpan perubahan status secara sinkron ke kolom `data_guru.wajib_hadir_hanya_mengajar` dan entri konfigurasi `pengaturan.guru_hanya_mengajar` (JSON id).

### R2. Evaluasi Aturan Kehadiran Dua Arah yang Konsisten
- Perbaiki logika evaluasi kehadiran di `src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/components/HomeViewAdmin.tsx`, `src/components/TeacherReminderManager.tsx`, dan `src/lib/warningSystem.ts`:
  - Hilangkan hardcoded unconditional override (misal ketika aturan global `Hari_Mengajar_Saja` menimpa guru yang sebenarnya disetel wajib hadir setiap hari).
  - Status individual guru pada `data_guru.wajib_hadir_hanya_mengajar` (atau list pengecualian) harus dihormati secara konsisten:
    - Jika guru berstatus `wajib_hadir_hanya_mengajar = true`: Hanya wajib hadir jika ada jadwal KBM atau tugas piket hari itu. Jika tidak ada jadwal/piket, bebas presensi dan bebas alpa.
    - Jika guru berstatus `wajib_hadir_hanya_mengajar = false`: Wajib hadir setiap hari kerja sekolah terlepas dari jadwal KBM hari itu.
  - Pertahankan backward compatibility untuk sekolah dengan data yang sudah ada.

### R3. Propagasi Real-time & Efek Langsung ke Akun Guru
- Pastikan saat Admin menyimpan perubahan di `AdminConfigView`:
  - `AdminConfigView` memicu sinkronisasi (update database, window event, storage event, dan Supabase realtime broadcast channel non-blocking).
  - Komponen guru (`HomeViewGuru.tsx` / `AppScreen.tsx`) mendengarkan perubahan realtime (`postgres_changes` pada tabel `pengaturan` dan `data_guru`, serta custom event / storage event, ditambah reconnect/resume handler).
  - Ketika terjadi pembaruan konfigurasi yang menyangkut akun guru yang sedang login, state kehadiran (`getGuruDailyState`) dan data terkait langsung di-refresh secara otomatis di layar guru tanpa reload browser atau logout.
  - Widget Jadwal, timeline alur harian (Bebas Presensi vs Wajib Datang), dan reminder langsung diperbarui sesuai status baru.

## Programmatic Verification Requirements
1. Run dedicated redesign verification test suite: `npx tsx tests/guru_attendance_exemption_redesign.test.ts`
2. Run regression test suite: `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`
3. Run full automated test suite: `npm test`
4. Run TypeScript typecheck: `npx tsc --noEmit`
5. Run Next.js production build: `npm run build`
6. Verify Git status is clean and commits pushed to origin `main` per `GEMINI.md`.

## Deliverable
Deliver `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_37\handoff.md` with explicit structured verdict:
`VICTORY CONFIRMED` or `VICTORY REJECTED`.
Send completion message to Sentinel.


## 2026-10-14T14:49:05Z
You are victory_auditor_37, the independent post-victory auditor for milestone swe_24.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_37
Dispatch instructions: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_37\DISPATCH.md
Authoritative request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Orchestrator handoff report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_24\handoff.md

Conduct the 3-phase post-victory audit:
1. Timeline verification: inspect commit history, branch continuity, and artifact creation sequence.
2. Cheating detection: check for mock bypasses, disabled tests, modified test runners, or hardcoded false positives.
3. Independent test execution:
   - Run npx tsx tests/guru_attendance_exemption_redesign.test.ts
   - Run npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts
   - Run npm test
   - Run npx tsc --noEmit
   - Run npm run build
   - Verify Git status and origin/main push status

Write your structured verdict in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_37\handoff.md:
VICTORY CONFIRMED or VICTORY REJECTED.
Send completion message to Sentinel.

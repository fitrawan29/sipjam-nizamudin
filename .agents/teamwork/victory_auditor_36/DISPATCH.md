# DISPATCH — victory_auditor_36

## Identity & Role
- **Agent Type**: `teamwork_preview_victory_auditor`
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_36`
- **Parent Sentinel**: Sentinel
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Orchestrator Handoff**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_23\handoff.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Conduct an independent, blocking 3-phase post-victory audit (Timeline, Cheating Detection, Independent Test Execution) on the implementation of the "Wajib Hadir Hanya Hari Mengajar" rule fix and obsolete code cleanup (R1, R2, R3).

## Requirements Under Audit

### R1. Keandalan Aturan Kehadiran Guru "Wajib Hadir Hanya Hari Mengajar"
- Menyelaraskan status guru pada hari tanpa jadwal mengajar di seluruh alur sistem (`src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/components/HomeViewAdmin.tsx`, `src/components/HomeViewGuru.tsx`, dan `src/app/api/push/send-reminders/route.ts`).
- Untuk guru dengan `wajib_hadir_hanya_mengajar = true` atau saat kebijakan global `aturan_kehadiran_guru = 'Hari_Mengajar_Saja'`:
  1. Pada hari tanpa jadwal mengajar dan tidak ada tugas piket: guru dibebaskan dari kewajiban presensi (`isNonTeachingDay: true`, `bebasAlpa: true`, `isAlpa: false`), tidak dikenai Alpa otomatis di `attendanceAlpa.ts`, dan tidak dikirimi notifikasi tagihan presensi/jurnal.
  2. Jika ditugaskan piket pada hari tanpa jam mengajar: guru tetap memiliki kewajiban hadir untuk menjalankan tugas piket.
  3. Jika guru hadir ke sekolah secara sukarela pada hari tanpa jadwal mengajar (melakukan Presensi Datang): guru dapat melakukan Presensi Pulang secara normal tanpa terblokir oleh tagihan jurnal KBM fiktif.
  4. Dashboard Admin (`HomeViewAdmin.tsx`) dan tampilan Guru (`HomeViewGuru.tsx`) konsisten menampilkan status bebas kehadiran/bebas mengajar tanpa anomali data.

### R2. Eliminasi File dan Fitur Usang (Dead & Obsolete Code Cleanup)
- Menghapus file komponen yatim yang sudah tidak di-mount dan tidak memiliki rute navigasi di aplikasi:
  - `src/components/AdminMonitorView.tsx`
  - `src/components/NotificationPermissionModal.tsx`
  - `src/components/PushNotificationPrompt.tsx`
- Membersihkan referensi/kode peninggalan usang (seperti antrean offline / sisa variabel legacy) secara bersih tanpa memengaruhi kestabilan transaksi cloud Supabase.
- Memperbarui file test terkait agar tidak gagal saat memverifikasi file yang telah dihapus.

### R3. Otomatisasi Verifikasi Pengujian
- Memverifikasi pengujian otomatis (`tests/wajib_hadir_dan_pembersihan_usang.test.ts`) yang memvalidasi seluruh kondisi R1 dan R2 secara menyeluruh.
- Seluruh suite tes yang terdaftar pada `package.json` (`npm test`) harus tetap berjalan 100% PASS.

## Programmatic Verification Requirements
1. Run dedicated verification test suite: `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`
2. Run full automated test suite: `npm test`
3. Run TypeScript typecheck: `npx tsc --noEmit`
4. Run Next.js production build: `npm run build`
5. Verify Git status is clean and commits pushed to origin `main` per `GEMINI.md`.

## Deliverable
Deliver `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_36\handoff.md` with explicit structured verdict:
`VICTORY CONFIRMED` or `VICTORY REJECTED`.
Send completion message to Sentinel.


## 2026-10-14T11:02:44Z
You are victory_auditor_36, the independent post-victory auditor for milestone swe_23.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_36
Dispatch instructions: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_36\DISPATCH.md
Authoritative request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Orchestrator handoff report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_23\handoff.md

Conduct the 3-phase post-victory audit:
1. Timeline verification: inspect commit history, branch continuity, and artifact creation sequence.
2. Cheating detection: check for mock bypasses, disabled tests, modified test runners, or hardcoded false positives.
3. Independent test execution:
   - Run npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts
   - Run npm test
   - Run npx tsc --noEmit
   - Run npm run build
   - Verify Git status and commit sync per GEMINI.md.

Deliver your audit report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_36\handoff.md with a clear verdict: VICTORY CONFIRMED or VICTORY REJECTED.
Send your verdict and summary back to the Sentinel.

# DISPATCH — swe_23

## Identity & Role
- **Agent Type**: `teamwork_preview_swe` (SWE Light Orchestrator)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_23`
- **Parent Sentinel**: Sentinel
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Perbaiki aturan kehadiran guru agar opsi wajib hadir hanya pada hari mengajar berfungsi secara akurat tanpa error maupun bug di seluruh modul (workflow, presensi, dashboard admin, kalkulasi alpa otomatis, dan notifikasi pengingat), serta lakukan eliminasi file dan kode komponen usang yang sudah tidak dipakai.

## Requirements

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
- Buat file tes verifikasi otomatis (misal `tests/wajib_hadir_dan_pembersihan_usang.test.ts`) yang memvalidasi seluruh kondisi R1 dan R2 secara menyeluruh.
- Seluruh suite tes yang terdaftar pada `package.json` (`npm test`) harus tetap berjalan 100% PASS.

## Acceptance Criteria

### Aturan Kehadiran Hari Mengajar (R1)
- [ ] Guru yang dikecualikan (exempt) pada hari tanpa jadwal KBM dan tanpa piket memperoleh status `isNonTeachingDay: true`, `bebasAlpa: true`, dan `isAlpa: false`.
- [ ] `attendanceAlpa.ts` tidak memasukkan record Alpa untuk guru exempt pada hari tanpa jadwal mengajar & tanpa piket.
- [ ] Guru exempt yang melakukan presensi datang sukarela dapat membuka dan mengirimkan presensi pulang tanpa terblokir oleh validasi jurnal KBM.
- [ ] Jika guru exempt memiliki tugas piket hari ini, sistem tetap mendeteksi kewajiban piket dan mengharuskan presensi datang.
- [ ] `send-reminders/route.ts` tidak mengirimkan push reminder pengingat presensi atau jurnal KBM ke guru exempt pada hari tanpa jadwal mengajar.

### Pembersihan Kode Usang (R2)
- [ ] File `src/components/AdminMonitorView.tsx`, `src/components/NotificationPermissionModal.tsx`, dan `src/components/PushNotificationPrompt.tsx` berhasil dihapus.
- [ ] Tidak ada broken import atau runtime error di seluruh aplikasi akibat penghapusan file tersebut.
- [ ] Kode antrean offline usang yang tidak terpakai dibersihkan dengan aman.

### Verifikasi & Integritas Pengujian (R3)
- [ ] Pengujian otomatis memverifikasi seluruh skenario batas (boundary conditions) untuk guru exempt dan non-exempt.
- [ ] Perintah `npm test` berjalan sukses dengan 0 error dan seluruh tes lulus (PASS).
- [ ] Lolos typecheck `npx tsc --noEmit` dan `npm run build` jika diperlukan.
- [ ] Mematuhi aturan Git Workflow proyek per `GEMINI.md` (otomatis stage, commit deskriptif, dan push ke branch `main`).

## Execution Protocol
- Run the SWE Light loop: dispatch implementer, then run reviewer rounds.
- Maintain `progress.md` and `BRIEFING.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_23`.
- Once verified, write `handoff.md` and report completion back to the Sentinel.

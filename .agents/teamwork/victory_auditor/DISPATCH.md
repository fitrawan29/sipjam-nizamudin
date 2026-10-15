## 2026-10-14T10:55:49Z
You are the independent post-victory auditor for this task.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor
Your parent orchestrator conversation ID is: cee80ad9-6743-4395-8d50-c686b97fb49d

<original_task>
Perbaiki aturan kehadiran guru agar opsi wajib hadir hanya pada hari mengajar berfungsi secara akurat tanpa error maupun bug di seluruh modul (workflow, presensi, dashboard admin, kalkulasi alpa otomatis, dan notifikasi pengingat), serta lakukan eliminasi file dan kode komponen usang yang sudah tidak dipakai.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

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
</original_task>

<instructions>
Conduct your 3-phase audit:
1. Timeline & requirements check: audit all requirements against commit history and current state.
2. Cheating detection & test integrity: ensure tests are genuine and tests were not weakened or cheated.
3. Independent test execution: run `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`, `npm test`, and `npx tsc --noEmit`. Verify git status and commits.

Write your final audit report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor\audit_report.md` with a structured verdict: CONFIRMED or REJECTED.
Send a message back to orchestrator `cee80ad9-6743-4395-8d50-c686b97fb49d` with your verdict and findings.
</instructions>
## 2026-10-15T22:57:30Z
You are victory_auditor with role teamwork_preview_victory_auditor.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor
Conduct a thorough independent post-victory audit (timeline audit, cheating/test manipulation detection, and independent test & build execution).
Write your structured audit report and verdict (CONFIRMED or REJECTED) to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor\handoff.md and report back to the orchestrator via send_message.

<original_task>
This is a single self-contained fix; keep it small and focused.

Sesuaikan tahun ajaran dan semester pada modul E-Rapor (`src/components/RaporView.tsx`) agar secara otomatis menyelaraskan diri dengan pengaturan aktif sekolah di tabel `pengaturan`, menyediakan dropdown pilihan dinamis yang memuat tahun ajaran yang diatur beserta arsip, serta mendengarkan update realtime.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Sinkronisasi Otomatis Tahun Ajaran & Semester dari Pengaturan Sekolah
- Ambil konfigurasi aktif `tahun_ajaran` dan `semester` dari tabel `pengaturan` untuk `sekolah_id` pengguna (atau default sekolah jika belum diset).
- Gunakan nilai yang diatur tersebut sebagai inisialisasi awal default pada `selectedTahunAjaran` dan `selectedSemester` di `RaporView.tsx`.
- Pasang event listener untuk `sipjam:config_updated` agar saat admin mengubah tahun ajaran atau semester di menu Sistem (`AdminConfigView`), `RaporView` langsung memperbarui state aktifnya secara otomatis.

### R2. Dropdown Pilihan Tahun Ajaran Dinamis & Fleksibel
- Jangan mengunci opsi tahun ajaran pada daftar statis hardcoded semata.
- Bangun opsi tahun ajaran secara dinamis: pastikan tahun ajaran yang sedang diatur selalu tersedia, digabungkan dengan tahun ajaran yang tercatat di database (dari `capaian_pembelajaran`, `tujuan_pembelajaran`, `wali_kelas`, `jadwal_pelajaran`) serta opsi tahun relevan (misal tahun sebelumnya dan sesudahnya).
- Berikan penanda visual yang jelas pada opsi tahun ajaran yang sedang aktif diatur (misal: "2024/2025 (Aktif)").
- Pengguna tetap dapat memilih tahun ajaran atau semester lain dari dropdown untuk meninjau rapor periode/arsip terdahulu.

### R3. Konsistensi Query dan Dokumen Cetak
- Seluruh pengambilan data rapor (data nilai siswa, capaian pembelajaran, tujuan pembelajaran, wali kelas, serta catatan/observasi) harus dieksekusi secara reaktif sesuai `selectedTahunAjaran` dan `selectedSemester` yang sedang dipilih/disinkronkan.
- Lembar cetak Laporan Hasil Belajar (E-Rapor) dan judul dokumen cetak wajib menampilkan teks Tahun Ajaran dan Semester yang akurat sesuai pilihan aktif.

## Verification Resources
- Test suites: `npm test` (termasuk `tests/e_rapor_real_data_pipeline.test.ts`, `tests/adversarial_rapor_wali_security.test.ts`, dan `tests/m4_academic_merdeka_rapor.test.ts`).
- Production build: `npm run build` harus 0 error.

## Acceptance Criteria

### Automatic Sync
- [ ] `RaporView.tsx` secara otomatis mengambil dan menerapkan `tahun_ajaran` dan `semester` dari tabel `pengaturan` saat dimuat.
- [ ] Perubahan tahun ajaran / semester di Pengaturan Sistem (`AdminConfigView`) memicu pembaruan otomatis di `RaporView` via realtime/event listener.

### Dynamic Select Options
- [ ] Dropdown Tahun Ajaran memuat tahun ajaran aktif yang diatur dan tidak membatasi pengguna hanya pada opsi statis lama.
- [ ] Dropdown tetap mengizinkan pengguna memilih tahun ajaran lain untuk mengakses data arsip.

### Document & Data Accuracy
- [ ] Nilai rapor dan narasi capaian pembelajaran yang dimuat sesuai dengan kombinasi Tahun Ajaran dan Semester yang aktif dipilih.
- [ ] Lembar cetak rapor mencantumkan Tahun Ajaran dan Semester yang benar.

### System Stability
- [ ] Seluruh unit dan adversarial test suites (`npm test`) lulus 100% tanpa regresi.
- [ ] Sesuai prinsip Ponytail: diff minimal, reuse helper dan mekanisme yang sudah ada di codebase.
</original_task>

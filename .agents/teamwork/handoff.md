# Handoff Report — Project Sentinel (Presensi Dinas Luar Kamera Foto Lokasi)

## Observation
Permintaan pengguna meminta penggantian mekanisme presensi Dinas Luar pada guru: dari upload file dokumen (Surat Tugas) menjadi pengambilan foto lokasi langsung melalui kamera (`CameraSelfieCapture`) lengkap dengan watermark waktu, nama guru, koordinat GPS, dan nama lokasi, tanpa batasan radius GPS dari sekolah.

Tugas dievaluasi dan diarahkan ke rute **SWE Light (`teamwork_preview_swe`)** sebagai perubahan kode mandiri yang fokus (single self-contained fix). Orchestrator `swe_21` ditugaskan dan menyelesaikan siklus implementasi bersama 3 putaran adversarial reviewer dan verifikasi internal. Pada klaim penyelesaian oleh `swe_21`, Sentinel secara blocking menugaskan auditor independen `victory_auditor_34` untuk melakukan 3-phase independent post-victory audit (Timeline, Anti-Cheating/Integrity, dan Independent Test Execution). Auditor memberikan hasil resmi: **VICTORY CONFIRMED**.

## Logic Chain
1. **R1 (Presensi Dinas Luar Kamera Foto Lokasi)**:
   - Pada `src/components/GuruPresensi.tsx`, tipe "Dinas Luar" dikelompokkan ke dalam `isSelfieRequired`, sehingga menampilkan `CameraSelfieCapture` mode portrait dan meniadakan elemen `<input type="file">`.
   - Foto kamera dilengkapi watermark dinamis: tanggal/waktu, nama guru, koordinat GPS, dan nama lokasi reverse-geocoding.
2. **R2 (Tanpa Batasan Radius Lokasi & Preservasi Koordinat)**:
   - Validasi radius jarak (`jarakAktual > gpsConfig.radius`) dikunci hanya untuk jenis presensi "Sekolah".
   - Guru yang memilih "Dinas Luar" dapat melakukan presensi dari lokasi manapun tanpa batasan jarak dan tanpa toast "Di Luar Jangkauan".
   - Status verifikasi langsung diset ke `'Diverifikasi'`.
   - Koordinat GPS (didukung operator `??` untuk preservasi koordinat 0.0 di khatulistiwa) dan nama alamat lokasi tetap tersimpan ke tabel database presensi dan server API fallback `/api/attendance/route.ts`.
3. **R3 (Transisi State Presensi Tanpa Hambatan)**:
   - Logika `togglePresensiFields` dan `handleTipeAbsenChange` diselaraskan agar perpindahan antara "Sekolah" dan "Dinas Luar" tidak memunculkan dialog konfirmasi penghapusan file.
   - Pergantian tipe presensi mempertahankan stream kamera maupun foto yang telah diambil.
   - Setelah presensi Datang Dinas Luar berhasil disubmit, form bertransisi mulus ke Pulang dan tetap mempertahankan pilihan "Dinas Luar".
4. **R4 (Folder Routing & Upload Google Drive)**:
   - Upload foto presensi Dinas Luar diarahkan secara konsisten ke folder Google Drive `Presensi_DinasLuar` dengan prefix `'Selfie'`.
5. **Adversarial Hardening**:
   - Reviewer R1: Memperbaiki mapping koordinat pada fallback direct insert dan API route, serta simetri state Datang/Pulang.
   - Reviewer R2: Menyelamatkan koordinat khatulistiwa dari falsy coercion `||`, mengeliminasi UI state flicker.
   - Reviewer R3: Menghubungkan callback pengambilan foto dari `CameraSelfieCapture` langsung ke state `userCoords` dan `lokasi` form, memastikan sinkronisasi 100% antara watermark foto dan data database.

## Caveats
- Pembacaan izin kamera (`navigator.mediaDevices.getUserMedia`) dan sensor GPS (`navigator.geolocation`) di browser perangkat fisik nyata bergantung pada persetujuan izin (permission grant) pengguna di browser/WebView perangkat masing-masing. Jika izin ditolak oleh pengguna, komponen menampilkan pesan informatif di antarmuka kamera.
- Integrasi Google Drive upload bergantung pada konektivitas jaringan dan Google Apps Script URL yang valid. Sistem telah dilengkapi background retry dan graceful fallback.

## Conclusion
Seluruh persyaratan (R1-R4) telah terpenuhi 100% dengan kode yang bersih, ringkas, dan mematuhi prinsip Ponytail.
Victory Auditor 34 telah menerbitkan putusan resmi **VICTORY CONFIRMED**.
Seluruh subagent dan background cron telah dibersihkan secara penuh (`manage_subagents(action="kill_all")` dan pembatalan task).
Repositori git berada dalam status bersih, ter-stage, ter-commit, dan tersinkronisasi ke branch `main`.

## Verification Method
1. `npm test`: 24/24 test suite lulus 100% (0 fail).
2. `npx tsx tests/dinas_luar_kamera_verification.test.ts`: 24/24 assertion verifikasi Dinas Luar lulus 100%.
3. `npx tsc --noEmit`: 0 error tipe TypeScript (Clean exit 0).
4. `npm run build`: Build produksi Next.js Turbopack sukses (12/12 rute statis terkompilasi bersih).
5. `git status`: Working tree bersih, seluruh commit tersinkronisasi dengan origin/main.

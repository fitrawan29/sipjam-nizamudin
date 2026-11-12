# DISPATCH — challenger_kbm_1

## Task Assignment
Adversarial verification & stress testing terhadap alur penyimpanan Jurnal KBM Guru (Requirement R1).

## Scope & References
- ORIGINAL_REQUEST: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- SCOPE: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md`
- Target Code: `src/components/GuruJurnal.tsx`, commit `f800a0f`

## Stress Scenarios
1. Runtime environment simulation: uji eksekusi ketika `window.crypto.randomUUID` tidak didefinisikan (HTTP / LAN context).
2. Resilient drive failure simulation: uji alur simpan ketika `uploadToDrive` melempar network exception / timeout / quota exceeded, pastikan database mutation tetap berhasil menyimpan teks materi dan absensi.
3. Schema compatibility simulation: uji respons terhadap error kode `42703` (undefined column), `PGRST204`, HTTP 400.
4. Tenant multi-sekolah fallback: verifikasi `sekolah_id` selalu terisi nilai default bila user session tidak memiliki `sekolah_id`.
5. Attendance data preservation: verifikasi data absensi murid di memori tidak terhapus saat transisi sub-mode.

Berikan verdict: **APPROVE** atau **REQUEST_CHANGES** di `handoff.md`.


## 2026-11-12T06:48:04Z
Anda bertugas sebagai challenger_kbm_1 (KBM Challenger 1 - Adversarial Save Verifier).
State folder Anda: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_kbm_1\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP:
Baca file ORIGINAL_REQUEST.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Baca SCOPE.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md
Baca DISPATCH.md di state folder Anda.

TUGAS ANDA:
1. Lakukan pengujian stres empiris dan verifikasi adversarial terhadap alur penyimpanan Jurnal KBM Guru (R1) di `src/components/GuruJurnal.tsx` (commit `f800a0f`).
2. Skenario stres yang harus diuji secara empiris via harness pengujian mandiri:
   - Eksekusi saat `window.crypto.randomUUID` tidak tersedia (simulasi HTTP / non-secure LAN).
   - Eksekusi saat `uploadToDrive` melempar exception (simulasi Google Drive offline / timeout), verifikasi data teks materi dan absensi tetap tersimpan ke database.
   - Respons terhadap error PostgREST / PostgreSQL kode `42703` (undefined column), `PGRST204`, dan HTTP 400.
   - Fallback `sekolah_id` jika user session tidak memiliki nilai `sekolah_id`.
   - Retensi data absensi murid di memori saat berpindah sub-mode absensi <-> jurnal.
3. Jalankan pengujian mandiri dan validasi hasil.
4. Tulis laporan komprehensif ke `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_kbm_1\analysis.md` dan `handoff.md` dengan verdict eksplisit: **APPROVE** atau **REQUEST_CHANGES**.
5. Kirim pesan ke parent saat selesai dengan format Handoff Protocol.

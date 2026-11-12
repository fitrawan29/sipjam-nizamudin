# DISPATCH — challenger_kbm_2

## Task Assignment
Adversarial verification & stress testing terhadap fitur Cetak Jurnal KBM (Requirement R2).

## Scope & References
- ORIGINAL_REQUEST: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- SCOPE: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md`
- Target Code: `src/components/RekapJurnalView.tsx`, commit `f800a0f`

## Stress Scenarios
1. Multi-class teacher stress test: guru mengajar di 3+ kelas berbeda (misal 7A, 7B, 8A) yang juga merupakan wali kelas 7A. Pastikan seluruh kelas tampil lengkap saat mencetak pada mode pribadi.
2. Curriculum naming variations: mapel di database memiliki prefix/suffix (misal "XI Merdeka_Matematika", "X Kurikulum Merdeka - Fisika"). Pastikan pencocokan in-memory via `isJurnalMatchJadwal` berhasil menarik data secara akurat.
3. Legacy records compatibility: rekaman dengan `sekolah_id IS NULL` berhasil ditarik oleh filter `.or()`.
4. Table integrity check: verifikasi tabel `#hasil-rekap-jurnal-guru` merender 12 kolom resmi tanpa data terpotong atau tertimpa placeholder palsu "Tidak Masuk Kelas".

Berikan verdict: **APPROVE** atau **REQUEST_CHANGES** di `handoff.md`.


## 2026-11-12T06:48:44Z
Anda bertugas sebagai challenger_kbm_2 (KBM Challenger 2 - Adversarial Print Verifier).
State folder Anda: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_kbm_2\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP:
Baca file ORIGINAL_REQUEST.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Baca SCOPE.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md
Baca DISPATCH.md di state folder Anda.

TUGAS ANDA:
1. Lakukan pengujian stres empiris dan verifikasi adversarial terhadap fitur Cetak Jurnal KBM (R2) di `src/components/RekapJurnalView.tsx` (commit `f800a0f`).
2. Skenario stres yang harus diuji secara empiris via harness pengujian mandiri:
   - Guru yang mengajar di banyak kelas (misal 7A, 7B, 8A) dan sekaligus menjadi wali kelas 7A: verifikasi SELURUH kelas tampil lengkap pada hasil cetak mode pribadi, tidak terpotong hanya ke kelas wali.
   - Variasi penamaan mata pelajaran di database (prefix kurikulum seperti `"XI Merdeka_Matematika"`, singkatan, atau case-insensitive): pastikan in-memory matching via `isJurnalMatchJadwal()` menarik data secara akurat.
   - Rekaman historis database dengan `sekolah_id IS NULL`: pastikan filter `.or()` berhasil menarik rekaman ini.
   - Preservasi tabel cetak 12-kolom: pastikan tabel `#hasil-rekap-jurnal-guru` merender data riil guru secara lengkap dan tidak tertimpa oleh placeholder palsu "Tidak Masuk Kelas".
3. Jalankan pengujian mandiri dan validasi hasil.
4. Tulis laporan komprehensif ke `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_kbm_2\analysis.md` dan `handoff.md` dengan verdict eksplisit: **APPROVE** atau **REQUEST_CHANGES**.
5. Kirim pesan ke parent saat selesai dengan format Handoff Protocol.

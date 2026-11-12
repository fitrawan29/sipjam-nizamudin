# DISPATCH — reviewer_kbm_2

## Task Assignment
Review independent untuk pemulihan tampilan data guru pada Cetak Jurnal KBM (Requirement R2) di `src/components/RekapJurnalView.tsx`.

## Scope & References
- ORIGINAL_REQUEST: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- SCOPE: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md`
- Worker Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_kbm\handoff.md`
- Commit: `f800a0f`

## Verification Areas
1. Tolerant multi-tenant query: filter `sekolah_id` menggunakan `.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')`.
2. Isolasi auto-select wali kelas: `assignedWalis[0]` hanya aktif pada `effectiveMode === 'kelas'`. Pada mode pribadi, default kelas dibiarkan kosong agar seluruh kelas yang diajar guru ditarik utuh.
3. In-memory matching: penghapusan filter SQL rigid `.eq('mapel')` dan `.eq('kelas')` di mode pribadi, pemfilteran di JavaScript menggunakan `isJurnalMatchJadwal()` untuk mencocokkan format kurikulum (misal "XI Merdeka_Matematika").
4. Fallback query identitas guru berbasis token jika hasil awal kosong pada mode pribadi.
5. Preservasi tabel cetak 12-kolom tanpa tertimpa placeholder sintetik "Tidak Masuk Kelas".
6. Jalankan build (`npx tsc --noEmit`) dan test suites terkait.

Berikan verdict: **APPROVE** atau **REQUEST_CHANGES** di `handoff.md`.


## 2026-11-12T06:47:24Z
Anda bertugas sebagai reviewer_kbm_2 (KBM Reviewer 2).
State folder Anda: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_kbm_2\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP:
Baca file ORIGINAL_REQUEST.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Baca SCOPE.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md
Baca DISPATCH.md di state folder Anda.
Baca Worker Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_kbm\handoff.md

TUGAS ANDA:
1. Lakukan review independen terhadap pemulihan tampilan data guru pada Cetak Jurnal KBM (R2) di `src/components/RekapJurnalView.tsx` (commit `f800a0f`).
2. Periksa kebenaran teknis, kelengkapan, robustnes, dan kesesuaian kontrak antarmuka:
   - Tolerant query multi-tenant (`.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')`).
   - Isolasi auto-select wali kelas (`assignedWalis[0]`) hanya ke mode `kelas`, membiarkan mode pribadi kosong secara default agar seluruh kelas yang diajar guru ditarik utuh.
   - In-memory matching: penghapusan filter SQL rigid `.eq('mapel')` dan `.eq('kelas')` di mode pribadi, pemfilteran di JavaScript menggunakan `isJurnalMatchJadwal()`.
   - Fallback query identitas guru berbasis token nama.
   - Preservasi tabel cetak 12-kolom tanpa tertimpa placeholder sintetik.
3. Jalankan pengujian mandiri:
   - `npx tsc --noEmit`
   - `npx tsx tests/guru_cetak_jurnal_kbm.test.ts`
   - `npx tsx tests/legacy_jurnal_backward_compatibility.test.ts`
4. Tulis laporan komprehensif ke `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_kbm_2\analysis.md` dan `handoff.md` dengan verdict eksplisit: **APPROVE** atau **REQUEST_CHANGES**.
5. Kirim pesan ke parent saat selesai dengan format Handoff Protocol.

PENTING: Anda adalah reviewer read-only. JANGAN memodifikasi kode sumber.

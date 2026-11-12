# Progress Tracker — worker_kbm

Last visited: 2026-11-12T06:37:00Z

- [x] Baca ORIGINAL_REQUEST.md, SCOPE.md, DISPATCH.md, dan 3 berkas handoff explorer.
- [x] Inisialisasi BRIEFING.md dan progress.md.
- [x] Investigasi langsung file `src/components/GuruJurnal.tsx` dan `src/components/RekapJurnalView.tsx`.
- [x] Implementasi R1 di `src/components/GuruJurnal.tsx`:
  - [x] Safe UUID generator function (`generateSafeId` dengan fallback `jrn_...` untuk HTTP/LAN non-SSL).
  - [x] Resilient Drive Upload: non-blocking try/catch, fallback preview foto, teks materi/absensi tetap disimpan ke DB.
  - [x] Robust Schema Retry (`isSchemaColumnError` menangani error `42703`, `PGRST204`, status 400).
  - [x] Dual-write payload contract lengkap: `kegiatan_pembelajaran: kegiatan` & tenant fallback `sekolah_id: user.sekolah_id || 'a0000000-0000-0000-0000-000000000001'`.
  - [x] Sub-mode unifikasi: state absensi siswa (`cleanAbsensiForSave` & `finalAbsensiJson`) dipertahankan saat submit jurnal KBM.
  - [x] Form lockout relaxation: `isLocked` tidak mengunci form jika kelas dan mapel sudah dipilih guru.
- [x] Implementasi R2 di `src/components/RekapJurnalView.tsx`:
  - [x] Tolerant `sekolah_id` filter: `.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')` untuk menarik data jurnal historis.
  - [x] Isolasi auto-select wali kelas dan mapel/kelas penugasan tunggal HANYA ke mode `kelas`, membiarkan filter kelas kosong pada mode `pribadi` sehingga seluruh kelas guru ditarik secara default.
  - [x] In-memory matching mapel & kelas: menghapus SQL rigid `.eq('mapel')` dan `.eq('kelas')` di mode pribadi, melakukan pencocokan di memori JS dengan `isJurnalMatchJadwal()` untuk mengakomodasi format kurikulum (misal "XI Merdeka_Matematika").
  - [x] Fallback query identitas guru: token-based search jika query awal menghasilkan 0 baris pada mode pribadi.
  - [x] Preservasi tabel cetak 12-kolom tanpa tertimpa placeholder sintetik saat data jurnal riil ada.
- [x] Verifikasi & Pengujian (R3):
  - [x] Perbarui test suite komprehensif `tests/jurnal_kbm_r1_r2_r3_verification.test.ts` (32 assertions PASS).
  - [x] Jalankan `npx tsc --noEmit` (0 error kompilasi).
  - [x] Jalankan `tests/guru_cetak_jurnal_kbm.test.ts` (17 PASS).
  - [x] Jalankan `tests/legacy_jurnal_backward_compatibility.test.ts` (7 PASS).
  - [x] Jalankan `tests/jurnal_save_setelah_absensi_selesai.test.ts` (12 PASS).
  - [x] Jalankan `tests/m1_resubmission_and_verif.test.ts` (23 PASS).
  - [ ] Konfirmasi hasil akhir `npm test` background task.
- [ ] Git Delivery (`git status`, `git add .`, `git commit`, `git push origin main`).
- [ ] Handoff report final di `handoff.md` dan kirim pesan ke orchestrator.

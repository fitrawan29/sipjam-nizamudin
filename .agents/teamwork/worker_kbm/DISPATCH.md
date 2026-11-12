## 2026-11-12T06:00:29Z
Anda bertugas sebagai worker_kbm (KBM Implementation Worker).
State folder Anda: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_kbm\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP:
Baca file-file berikut sebelum memulai pekerjaan:
1. ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
2. SCOPE: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator\SCOPE.md
3. DISPATCH: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_kbm\DISPATCH.md
4. Handoff Explorer 1 (Penyimpanan R1): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_1\handoff.md
5. Handoff Explorer 2 (Cetak R2): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_2\handoff.md
6. Handoff Explorer 3 (Arsitektur & Verifikasi R3): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

OWNERSHIP FILES:
Anda memiliki kepemilikan tulis eksklusif untuk:
- `src/components/GuruJurnal.tsx`
- `src/components/RekapJurnalView.tsx`
- `tests/` (test suites verifikasi)

TUGAS IMPLEMENTASI (/ponytail approach - ringkas, tepat sasaran, zero over-engineering):
1. **Perbaikan Penyimpanan Jurnal KBM Guru (R1) di `src/components/GuruJurnal.tsx`**:
   - Safe UUID generator: Ganti pemanggilan langsung `crypto.randomUUID()` (baris 1276 & 1527) dengan safe fallback yang berfungsi di insecure HTTP / LAN context:
     `const generateSafeId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'jrn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);`
   - Resilient Drive Upload: Di blok try/catch `uploadToDrive` (baris 1465–1476), tangani error agar kegagalan upload foto tidak menggugurkan penyimpanan ke database (`console.warn`, fallback `fileUrl = photoPreviewUrl || ''`), sehingga materi dan absensi tetap tersimpan.
   - Robust Schema Retry: Perluas kondisi retry skema (baris 1268, 1303, 1663, 1671) untuk menangkap error code `42703` (undefined column) dan HTTP 400.
   - Dual-Write Kontrak Lengkap: Pastikan `kegiatan_pembelajaran: kegiatan` ditulis pada objek `newJurnal`.
   - Fallback Tenant: Pastikan `sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001'` selalu ada pada `newJurnal` dan `newSession`.
   - Sub-mode unifikasi: Pastikan state absensi siswa di memori (`finalAbsensiJson`) tidak hilang saat submit jurnal KBM.
   - Guard `isLocked`: Pastikan tidak memblokir guru jika kelas dan mapel telah dipilih.

2. **Pemulihan Tampilan Data Jurnal Guru pada Cetak Jurnal KBM (R2) di `src/components/RekapJurnalView.tsx`**:
   - Tolerant `sekolah_id` query di `tarikRekap()`: Ubah filter kaku `.eq('sekolah_id', user.sekolah_id)` menjadi `.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')` agar data jurnal historis tetap terambil.
   - Isolasi Auto-Select Wali Kelas di `fetchMaster()`: Pastikan penetapan default kelas `assignedWalis[0]` HANYA berlaku jika `effectiveMode === 'kelas'`. Pada mode pribadi (`effectiveMode === 'pribadi'`), biarkan kelas kosong agar secara default SELURUH kelas yang diajar guru ditarik dan dicetak lengkap.
   - In-memory matching: Hapus SQL exact matching kaku `.eq('mapel', mapel)` dan `.eq('kelas', activeKelas)` dari query Supabase database; lakukan pemfilteran mapel dan kelas di memori JavaScript menggunakan `isJurnalMatchJadwal()` atau normalisasi substring.
   - Fallback query identitas guru: Jika query utama menghasilkan 0 baris pada mode pribadi, lakukan fallback query berbasis token nama guru.
   - Preservasi tabel cetak 12-kolom tanpa tertimpa placeholder sintetik saat data jurnal riil tersedia.

3. **Mekanisme Verifikasi Objektif (R3)**:
   - Buat/perbarui test suite otomatis di `tests/` yang memverifikasi:
     a) Operasi simpan jurnal KBM berhasil dan data dapat dimuat kembali.
     b) Dokumen cetak jurnal KBM menampilkan kembali data jurnal guru secara lengkap (termasuk guru yang mengajar di banyak kelas).
     c) Zero-regression pada presensi, checkout gate, dan alur kerja guru lainnya.
   - Jalankan `npx tsc --noEmit` untuk memastikan 0 error kompilasi TypeScript.
   - Jalankan test suites verifikasi:
     `npx tsx tests/guru_cetak_jurnal_kbm.test.ts`
     `npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts`
     `npx tsx tests/legacy_jurnal_backward_compatibility.test.ts`
     `npx tsx tests/jurnal_save_setelah_absensi_selesai.test.ts`
     `npm test`

4. **Git Delivery Sesuai GEMINI.md**:
   Setelah implementasi dan pengujian selesai:
   - `git status`
   - `git add .`
   - `git commit -m "fix(kbm): perbaiki alur simpan jurnal KBM guru dan pulihkan data cetak jurnal KBM"`
   - `git push origin main`

5. **Laporan Handoff**:
   Tulis laporan lengkap ke `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_kbm\handoff.md` mengikuti Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method) dan kirim pesan ke parent saat selesai.

## 2026-10-20T23:59:53Z
You are teamwork_preview_victory_auditor.
Your assigned working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1

<original_task>
This is a single self-contained fix; keep it small and focused.

Penyesuaian kontrol akses menu berbasis peran (Wali Kelas vs Guru biasa), konfigurasi penunjukan akun Kepala Sekolah dengan mode peninjauan/monitoring fitur Admin (read-only), serta penambahan opsi pembubuhan tanda tangan Pengawas Bina (dengan konfigurasi Nama dan NIP) yang berlaku untuk seluruh dokumen cetak jurnal dan rekap presensi tanpa memandang role.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Visibilitas Menu Berdasarkan Penugasan Peran (Wali Kelas vs Guru Biasa)
Menu dan fitur yang dikhususkan untuk tugas perwalian kelas (termasuk Presensi Siswa `view-rekap-siswa`, Jurnal Kelas `view-jurnal-kelas`, dan Rapor `view-rapor`) hanya boleh muncul di navigasi/sidebar untuk akun yang memiliki penugasan aktif sebagai Wali Kelas atau Admin. Bagi guru reguler yang tidak ditugaskan sebagai wali kelas, menu-menu tersebut harus disembunyikan.

### R2. Penunjukan Kepala Sekolah & Akses Monitoring Admin (Read-Only)
Menyediakan pengaturan pada Pengaturan Sistem (`AdminConfigView`) untuk menunjuk salah satu akun guru yang terdaftar sebagai Kepala Sekolah.
Akun guru yang ditunjuk sebagai Kepala Sekolah memperoleh akses navigasi pemantauan fitur Administrator (antara lain Rekap Presensi, Verifikasi, Analitik, Jurnal, dan Presensi Siswa) dalam mode peninjau (read-only/viewer), di mana aksi perubahan data (seperti tombol simpan, ubah, setujui, tolak, atau hapus) disembunyikan atau dinonaktifkan.

### R3. Opsi Tanda Tangan Pengawas Bina & Pengaturan Identitas
Menyediakan pengaturan di Pengaturan Sistem (`AdminConfigView`):
1. Opsi toggle/sakelar: Aktifkan/nonaktifkan pembubuhan tanda tangan Pengawas Bina pada laporan cetak (Jurnal Pembelajaran/KBM, Jurnal Kegiatan, dan Rekap Presensi).
2. Input data identitas Pengawas Bina (Nama Lengkap dan NIP/NIK).

Ketentuan format tanda tangan pada dokumen cetak:
- Jika opsi tanda tangan Pengawas Bina diaktifkan: seluruh cetak dokumen jurnal dan rekap presensi tanpa memandang role (baik milik guru biasa maupun kepala sekolah) membubuhkan tanda tangan pengesahan Pengawas Bina (misal tata letak 3 kolom tanda tangan atau blok pengesahan Mengetahui Pengawas Pembina/Bina).
- Jika opsi dinonaktifkan: dokumen menggunakan format standar (Guru dan Kepala Sekolah).

## Verification Resources

- Test suite yang sudah ada: `npm test -- --watchAll=false`
- Script pengujian otomatis untuk memvalidasi:
  - Filter visibilitas menu sidebar untuk Guru biasa vs Guru Wali Kelas vs Guru Kepala Sekolah.
  - Form input, toggle opsi pengawas, dan penyimpanan data Kepala Sekolah serta Pengawas Bina di Pengaturan.
  - Komponen cetak (`PrintHeader` dan layout tanda tangan jurnal/rekap) membubuhkan tanda tangan Pengawas Bina secara tepat saat opsi aktif untuk semua role, dan menyembunyikannya saat opsi nonaktif.
  - Mode read-only pada halaman administrasi saat diakses oleh akun peninjau Kepala Sekolah.

## Acceptance Criteria

### Menu Visibility
- [ ] Akun Guru yang bukan wali kelas tidak melihat menu Presensi Siswa (`view-rekap-siswa`), Jurnal Kelas (`view-jurnal-kelas`), dan Rapor (`view-rapor`) pada sidebar navigasi.
- [ ] Akun Guru yang ditugaskan sebagai wali kelas tetap melihat dan dapat mengakses seluruh menu perwalian tersebut.

### Penunjukan Kepala Sekolah & Akses Admin Viewer
- [ ] Pada `AdminConfigView`, tersedia pilihan dropdown untuk menunjuk guru sebagai Kepala Sekolah dan tersimpan ke konfigurasi sekolah.
- [ ] Akun guru yang ditunjuk sebagai Kepala Sekolah dapat mengakses menu monitoring admin.
- [ ] Pada tampilan admin saat diakses oleh Kepala Sekolah, elemen interaktif untuk memodifikasi/menghapus data dinonaktifkan atau disembunyikan (view-only).

### Opsi & Format Tanda Tangan Pengawas Bina
- [ ] Pada `AdminConfigView`, tersedia toggle opsi pembubuhan tanda tangan Pengawas Bina serta input Nama dan NIP Pengawas Bina.
- [ ] Saat opsi Pengawas Bina aktif: seluruh cetak dokumen jurnal pembelajaran, jurnal kegiatan, dan rekap presensi memuat tanda tangan pengesahan Pengawas Bina tanpa memandang role pembuat dokumen.
- [ ] Saat opsi Pengawas Bina nonaktif: format tanda tangan kembali ke format tanda tangan standar tanpa tanda tangan pengawas.
- [ ] Seluruh test suite eksisting (`npm test`) tetap lulus 100%.
</original_task>

<additional_context>
The implementation team completed 1 implementation round and 3 adversarial review rounds producing commits:
- eddee99 (implementer)
- 2b2d4f4 (reviewer 1)
- 8550016 (reviewer 2)
- ae4ffb4 (reviewer 3)

Conduct your independent 3-phase audit:
1. Timeline verification: inspect git log, commit lineage, files touched.
2. Cheating detection: verify no tests were weakened or faked, no false passes.
3. Independent test execution: run `npx tsx tests/kepsek_pengawas_rbac.test.ts` and `npm test` and verify actual output.

Report your structured audit verdict (CONFIRMED or REJECTED) with full evidence to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1\handoff.md
and send a summary message back.
</additional_context>

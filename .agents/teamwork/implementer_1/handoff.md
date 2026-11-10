# HANDOFF REPORT — IMPLEMENTER 1

> [!WARNING] **Skepticism Disclaimer**
> Perubahan logika otorisasi dan intervensi presensi siswa telah diverifikasi melalui 59 unit assertions pada suite utama dan 22 assertions pada suite mandiri non-hadir, tsc compile (0 errors), serta build Next.js (0 errors). Namun, pengujian pada koneksi internet terputus dan database RPC langsung di lingkungan produksi belum diuji secara end-to-end dengan browser riil.

## 1. What I changed

### 1.1 `src/lib/presensiIntervensi.ts`
- **Pembaruan `isWaliKelasIntervensiAllowed`**: Ditambahkan dukungan parameter opsional `teacherStatusOrPresensi` (string atau objek presensi guru) untuk memastikan bahwa status presensi guru seperti Dinas Luar, Izin, Sakit, Cuti, atau status non-hadir lainnya tetap mengizinkan jendela intervensi presensi siswa (pagi s.d. 12:00 WITA dan pulang 60 menit) tanpa memblokir akses wali kelas.
- **Implementasi `canWaliKelasIntervene`**: Fungsi otorisasi resmi untuk intervensi presensi siswa:
  - Memverifikasi apakah pengguna adalah Administrator/Superadmin (akses penuh seluruh kelas).
  - Memverifikasi otentikasi dan keterikatan penugasan pengguna sebagai wali kelas kelas binaan target (mencocokkan `penugasan.kelas_binaan` atau `wali_kelas`).
  - Menolak secara tegas pengguna yang bukan wali kelas dari kelas binaan terkait (`allowed: false`).
  - Mengizinkan wali kelas terverifikasi melakukan intervensi meskipun guru berstatus non-hadir (Dinas Luar, Izin, Sakit, Cuti, dll).
- **Ekspor alias `isWaliKelasIntervensiAuthorized` dan `validateWaliKelasIntervensi`** untuk kemudahan pemanggilan modular dan backward-compatibility.

### 1.2 `src/components/RekapSiswaView.tsx`
- Mengimpor `canWaliKelasIntervene` dari `@/lib/presensiIntervensi`.
- Menambahkan pemeriksaan otorisasi pada fungsi `handleSaveWaliAttendance` untuk memvalidasi hak intervensi terhadap kelas binaan target. Pengguna yang bukan wali kelas dari kelas tersebut akan ditolak dengan SweetAlert ("Anda bukan wali kelas dari kelas binaan ini sehingga tidak berhak melakukan intervensi presensi siswa.").
- Mempertahankan aturan dual-role `isReadOnly = isGlobalReadOnly && !isOwnHomeroomClass` agar Kepala Sekolah dan pengguna lain tetap mematuhi batasan mode monitoring.

### 1.3 `tests/wali_kelas_non_hadir_intervensi.test.ts`
- Membuat test suite automated mandiri (22 passing tests) yang menguji:
  - Wali kelas berstatus Dinas Luar, Izin, Sakit, Cuti, dan payload objek presensi guru.
  - Penolakan otorisasi pengguna bukan wali kelas, wali kelas lintas kelas, dan pengguna null/unauthenticated.
  - Verifikasi hak intervensi global admin dan superadmin.
  - Verifikasi jendela waktu presensi dengan status guru non-hadir.
  - Pemeriksaan integritas UI dan preservasi regresi logika eksisting.

### 1.4 `tests/wali_kelas_and_piket_intervensi.test.ts`
- Menambahkan **SECTION 9** untuk memvalidasi fungsionalitas wali kelas non-hadir dan penolakan non-wali langsung di test suite utama (total berkembang dari 56 menjadi 59 passing assertions).

## 2. Why
Sesuai kebutuhan **R1** dan **R2**:
1. Guru yang bertugas sebagai wali kelas sering kali harus mendata atau memperbarui status kehadiran siswa binaannya (misalnya ada orang tua murid yang mengabarkan izin/sakit melalui WhatsApp kepada wali kelas) meskipun pada hari tersebut wali kelas sedang bertugas dinas luar, mengambil cuti, izin, atau sedang sakit.
2. Fitur intervensi sebelumnya harus secara eksplisit mendukung status non-hadir tersebut tanpa mengorbankan keamanan otorisasi: pengguna yang bukan wali kelas dari siswa target tetap wajib ditolak.
3. Seluruh alur presensi harian guru reguler, presensi gerbang siswa, dan presensi mapel KBM harus tetap utuh tanpa modifikasi atau regresi.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_non_hadir_intervensi.test.ts`: **22 / 22 PASS (100%)**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **59 / 59 PASS (100%)**
  - `npx tsx tests/presensi_gerbang_dan_absensi_retensi.test.ts`: **22 / 22 PASS (100%)**
  - `npx tsx tests/kepsek_pengawas_rbac.test.ts`: **47 / 47 PASS (100%)**
  - `npx tsc --noEmit`: **0 error**
  - `npm run build`: **Next.js 16.3.4 (Turbopack) build PASS (13/13 static pages, 0 errors)**
- **Shallow Verification (manual run only):**
  - Pemeriksaan visual komponen JSX pada `RekapSiswaView.tsx` dan `HomeViewGuru.tsx`.
- **Unverified aspects:**
  - Pengujian live Supabase Realtime websocket subscriptions di browser sungguhan.
  - Pengujian interaksi offline mode di browser mobile saat jaringan terputus.

## 4. Known Issues
- `Minor Robustness Risk`: Jika penugasan wali kelas di tabel `wali_kelas` tidak sinkron dengan `data_guru.wali_kelas`, sistem menggunakan cascading fallback penugasan pada `user.penugasan` dan profile data yang ada untuk mencegah false lockout.

## 5. Untested Edge Cases & Next Step
- Menguji pengalihan kelas binaan darurat di pertengahan semester jika guru bertukar perwalian tanpa reload aplikasi.
- Reviewer dipersilakan menguji skenario adversarial di mana guru mencoba mengedit kelas paralel lain saat berstatus cuti.

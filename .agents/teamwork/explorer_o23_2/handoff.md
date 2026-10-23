# Handoff Report: Explorer 2 — Navigation, Cross-School Regional Querying & Executive Dashboard

**Role**: Explorer 2 (Navigation, Layout, Cross-School Data Fetching & Executive Dashboard)  
**Author**: Subagent `explorer_o23_2`  
**Parent Agent**: `b9c240a0-6ada-4834-ac97-9bf90cc14baf`  
**Date**: 2026-10-23  

---

## 1. Observation

1. **`src/components/AppScreen.tsx` (Lines 73–89)**:
   Peran pengguna saat ini hanya memeriksa Superadmin dan Admin lokal:
   ```typescript
   const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
   const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';

   const [activeTargetSchool, setActiveTargetSchoolState] = useState<SatelliteSchool | null>(() => {
     return isSuperadmin ? getActiveTargetSchool() : null;
   });
   ```
   Default view di baris 159–161 mengarahkan non-Superadmin ke `'view-home'` (Dasbor Guru/Admin):
   ```typescript
   if (isSuperadmin) return 'view-superadmin-overview';
   return 'view-home';
   ```

2. **`src/components/AppScreen.tsx` (Lines 442–514)**:
   Menu yang tersedia adalah `menuItemsSuperadmin`, `menuItemsGuru`, `menuItemsKepalaSekolah`, dan `menuItemsAdmin`. Belum ada kumpulan menu `menuItemsDinas` untuk peran `dinas_pendidikan`.

3. **`src/lib/supabaseClient.ts` (Lines 172–177)**:
   Fungsi `getActiveTargetSchool()` saat ini secara ketat hanya mengizinkan Superadmin:
   ```typescript
   export function getActiveTargetSchool(): SatelliteSchool | null {
     const tenant = getActiveTenantContext();
     const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
     if (roleNorm !== 'superadmin') {
       return null;
     }
     ...
   ```
   Jika akun `dinas_pendidikan` mencoba mengakses `getActiveTargetSchool()`, fungsi tersebut mengembalikan `null`, sehingga `dynamicTenantFetch` tidak menyuntikkan header `x-sekolah-id` target sekolah pada saat drilldown.

4. **`src/components/ClaySidebar.tsx` (Lines 14–33, 55–82)**:
   `ClaySidebarProps` belum memiliki prop `isDinas?: boolean`. `roleBadgeStyle`, `roleLabel`, dan `roleIcon` baru mendukung Superadmin, Admin, Kepala Sekolah, Wali Kelas, dan Guru. Belum ada badge untuk `Dinas Pendidikan` (misal dengan ikon `fa-building-columns` dan warna indigo).

5. **`public.sekolah` and `public.sekolah_registry` Schema**:
   Kedua tabel memiliki kolom `kota_kabupaten TEXT` dan `status TEXT DEFAULT 'aktif'` (dikonfirmasi dari `src/types/database.ts` baris 1294–1318 dan migrasi `20261013_portal_induk_jaringan_multi_sekolah.sql`).

6. **Printing Architecture (`PrintHeader.tsx` & `src/utils/printWithGps.ts`)**:
   Dokumen resmi di seluruh aplikasi menggunakan `<PrintHeader />`, `<PrintSignature />`, dan memanggil fungsi `triggerPrintWithGps()` (dikonfirmasi di `AdminRekapView.tsx:437`, `DokumenView.tsx:776`, `RekapSiswaView.tsx:1528`).

---

## 2. Logic Chain

1. **Dari Observasi 1 dan 2**: Karena `AppScreen.tsx` saat ini hanya mengarahkan ke `view-superadmin-overview` atau `view-home`, pengguna dengan role `dinas_pendidikan` yang login akan salah diarahkan ke dasbor guru (`view-home`). Oleh karena itu, perlu ditambahkan `isDinas = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'dinas_pendidikan'`, `defaultHomeView = 'view-dinas-overview'`, dan menu khusus `menuItemsDinas` yang memuat `'view-dinas-overview'` serta item drilldown kondisional saat `activeTargetSchool` terpilih.
2. **Dari Observasi 3**: Requirement R3 menuntut Dinas Pendidikan memanfaatkan infrastruktur `getActiveTargetSchool` untuk peninjauan rekapitulasi sekolah binaan. Karena `getActiveTargetSchool()` di `supabaseClient.ts:175` menolak semua peran selain `superadmin`, maka baris tersebut harus diperluas menjadi `if (roleNorm !== 'superadmin' && roleNorm !== 'dinas_pendidikan' && roleNorm !== 'dinas') return null;`. Hal ini memungkinkan `dynamicTenantFetch` bekerja mulus menginjeksi header `x-sekolah-id` sekolah target tanpa memerlukan penulisan ulang fetcher kustom.
3. **Dari Observasi 4**: Agar konsistensi Claymorphism terjaga di seluruh perangkat (mobile, tablet, desktop), `ClaySidebar.tsx` harus menerima prop `isDinas?: boolean` dan membatasi pilihan sekolah satelit pada dropdown sidebar hanya untuk sekolah yang memiliki nilai `kota_kabupaten` sesuai dengan akun dinas yang sedang login (`user.kota_kabupaten`).
4. **Dari Observasi 5**: Karena setiap sekolah memiliki field `kota_kabupaten`, kueri agregasi lintas sekolah dapat dilakukan secara akurat dan terisolasi menggunakan filter Supabase PostgREST `.ilike('kota_kabupaten', user.kota_kabupaten.trim())`. Hasil kueri menghasilkan array `schoolIds` yang kemudian digunakan untuk mengambil metrik presensi guru (`presensi_guru`), presensi siswa (`presensi_siswa`), absensi (`absensi`), dan jurnal (`jurnal_pembelajaran`) secara paralel (`Promise.all`).
5. **Dari Observasi 6**: Standar pelaporan resmi SIPJAM menuntut pencatatan geolokasi legal audit pada tanda tangan dokumen. Oleh karena itu, tombol cetak pada `DinasDashboard.tsx` harus mengintegrasikan `triggerPrintWithGps` dari `@/utils/printWithGps`, menggunakan layout tabel kedinasan berformat `@media print`, serta memanfaatkan `<PrintHeader />` dan `<PrintSignature />`.

---

## 3. Caveats

1. **Variasi Penulisan Nama Kota/Kabupaten**: Terkadang penulisan nama daerah dapat memiliki variasi format (contoh: "Kab. Bolaang Mongondow Timur" vs "Kabupaten Bolaang Mongondow Timur"). Disarankan kueri database menggunakan normalisasi `ilike` atau trim, dan saat Superadmin membuat/mengedit akun dinas, disediakan dropdown pilihan wilayah yang ditarik langsung dari nilai `DISTINCT kota_kabupaten` tabel `sekolah`.
2. **Koneksi Satelit Terpisah**: Jika sebagian sekolah menggunakan database Supabase satelit independen (memiliki `supabase_url` eksternal), ping koneksi harus menggunakan timeout proteksi 4 detik (seperti yang diimplementasikan pada `SuperadminView.tsx:215`) agar dasbor tidak mengalami *hang* jika salah satu satelit sekolah sedang *down* atau *paused*.
3. **Mode Demo / Mocking**: Pada lingkungan pengujian tanpa koneksi GPS hardware, `triggerPrintWithGps` memiliki mekanisme fallback alert yang tetap mengeksekusi `window.print()`.

---

## 4. Conclusion

1. Implementasi role `dinas_pendidikan` dapat diintegrasikan secara elegan dan terstruktur ke dalam basis kode SIPJAM yang ada tanpa merusak arsitektur multi-tenant.
2. Perubahan kunci yang diperlukan:
   - **`src/types/user.ts`**: Menambahkan kolom `kota_kabupaten?: string | null` ke tipe `AppUser`.
   - **`src/lib/supabaseClient.ts`**: Membuka izin `getActiveTargetSchool()` untuk role `dinas_pendidikan`.
   - **`src/components/AppScreen.tsx`**: Menambahkan deteksi `isDinas`, `menuItemsDinas`, routing ke `view-dinas-overview`, pemblokiran akses mutasi data via `handleNavigation`, dan mounting komponen `<DinasDashboard />`.
   - **`src/components/ClaySidebar.tsx`**: Menambahkan badge peran `Dinas Pendidikan` dan pembatasan intra-wilayah pada switcher sekolah.
   - **`src/components/DinasDashboard.tsx`**: Komponen baru bertema Claymorphism yang memuat 5 kartu agregat (Total Sekolah, % Guru Hadir, % Siswa Hadir, Kesehatan Satelit, Sekolah Butuh Perhatian), pencarian/filter strictly scoped, drilldown peninjauan per sekolah, dan fitur cetak rekapitulasi wilayah resmi.
3. Seluruh temuan, spesifikasi arsitektur, dan kode implementasi telah didokumentasikan secara rinci pada:  
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2\report.md`.

---

## 5. Verification Method

1. **Inspeksi Kode Statis**:
   - Periksa `src/lib/supabaseClient.ts` baris 172–177 untuk memastikan role `dinas_pendidikan` diizinkan pada `getActiveTargetSchool()`.
   - Periksa `src/components/AppScreen.tsx` untuk memastikan `isDinas` mengarahkan default view ke `view-dinas-overview` dan memblokir seluruh halaman mutasi (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`).
   - Periksa `src/components/DinasDashboard.tsx` untuk memastikan filter pencarian terkunci pada `user.kota_kabupaten`.
2. **Pengujian Kompilasi TypeScript**:
   Jalankan pemeriksaan kompilasi untuk memastikan tidak ada error tipe:
   ```powershell
   npx tsc --noEmit
   ```
3. **Pengujian Suite Otomatis**:
   Setelah implementasi selesai, jalankan file test khusus:
   ```powershell
   npx tsx tests/dinas_pendidikan_monitoring.test.ts
   ```
   Dan jalankan test suite lengkap proyek:
   ```powershell
   npm test
   ```
4. **Kondisi Invalidasi**:
   - Jika akun `dinas_pendidikan` dapat melihat data sekolah di luar nilai `user.kota_kabupaten`, verifikasi dianggap **GAGAL** (kebocoran batas isolasi tenant).
   - Jika akun `dinas_pendidikan` dapat melakukan mutasi data (POST/PUT/DELETE) pada tabel master atau presensi, verifikasi dianggap **GAGAL** (pelanggaran prinsip read-only).

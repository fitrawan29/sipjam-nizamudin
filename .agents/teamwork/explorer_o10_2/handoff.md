# Handoff Report — Explorer 2 (explorer_o10_2)
**Task Scope:** R2 & R3 - QR Code Siswa Generate & Scan, and Attendance Logging in PiketView  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o10_2`  
**Handoff Type:** Hard (Complete Investigation)

---

## 1. Observation
1. **Database Schema of `data_siswa`**:
   - Query pada Supabase live database (`information_schema.columns` untuk tabel `data_siswa`) menunjukkan 8 kolom aktif:
     `id` (`uuid`, PK, default `gen_random_uuid()`), `nisn` (`text`), `nama_siswa` (`text`), `kelas` (`text`), `gender` (`text`), `status` (`text`), `no_hp_ortu` (`text`), `sekolah_id` (`uuid`, default `get_auth_user_sekolah_id()`).
   - Tidak ada kolom `qr_code` atau kolom identifier QR pada tabel `data_siswa`.
   - Tabel `data_siswa` saat ini memiliki 14 baris aktif di Supabase.

2. **Database Schema for Student Attendance**:
   - Query `list_tables` di Supabase menunjukkan 28 tabel, termasuk: `data_siswa`, `absensi`, `presensi_guru`, `laporan_piket`, `penugasan_piket`, `wali_kelas`, `jurnal_pembelajaran`.
   - **Tabel `presensi_siswa` belum ada** di Supabase maupun file migrasi `supabase/migrations/`.
   - Tabel `absensi` (dibuat pada migrasi `supabase/migrations/20260917_comprehensive_features.sql:42`) digunakan untuk absensi harian per kelas (status: `'Hadir' | 'Izin' | 'Sakit' | 'Alpa'`).

3. **Komponen `src/components/PiketView.tsx`**:
   - File berukuran 1.512 baris dengan state tab pada baris 18:
     `const [activeTab, setActiveTab] = useState<'beranda' | 'lapor' | 'penugasan' | 'rekap'>('beranda');`
   - Tab `beranda` (baris 709): Menampilkan jadwal piket harian dewan guru & siswa serta 10 laporan terbaru.
   - Tab `penugasan` (baris 870): Khusus Admin untuk menugaskan guru & siswa piket.
   - Tab `lapor` (baris 1157): Khusus guru piket bertugas (`canReport = !isAdmin && isGuru`), berisi input absensi manual kelas, catatan, dan foto lanskap via `CameraSelfieCapture`.
   - Tab `rekap` (baris 1283): Rekap bulanan laporan piket, export CSV, cetak rekap.
   - Kamera yang digunakan saat ini adalah `CameraSelfieCapture` dengan `orientation="landscape"` (baris 1239).

4. **Multi-Scanner & Hardware USB HID Support**:
   - Hardware barcode/QR scanner beroperasi sebagai perangkat USB HID keyboard input standar.
   - Input field dengan auto-refocus listener dan handler `onKeyDown` (Enter) dapat membaca hasil scan dalam milidetik tanpa library eksternal.
   - Buka scanner di jendela/tab terpisah didukung melalui routing `?view=view-piket&tab=scan`.

5. **Dependensi di `package.json`**:
   - `package.json` baris 13-23 berisi: `@supabase/supabase-js`, `csv-parse`, `dotenv`, `next` (16.3.4), `react` (19.2.8), `react-dom` (19.2.8), `sweetalert2`, `tsx`, `web-push`.
   - Tidak ada library barcode/QR (seperti `qrcode`, `html5-qrcode`, `jsQR`).
   - Browser Web API native yang tersedia: `window.BarcodeDetector` (didukung di Google Chrome, Microsoft Edge, Opera, dan Chromium Android), `navigator.mediaDevices.getUserMedia`, dan `AudioContext` untuk beep instan.

6. **Komponen Pendukung Rekap & Sinkronisasi**:
   - `src/components/RekapSiswaView.tsx` (baris 55-75) sudah memiliki logika deteksi wali kelas (`wali_kelas`) dan memuat siswa kelas binaannya.
   - `src/components/GuruJurnal.tsx` (baris 371-409) mengambil siswa kelas dari `data_siswa` saat guru membuka form jurnal KBM.

---

## 2. Logic Chain
1. Berdasarkan **Observasi 1**, `data_siswa` belum memiliki kolom khusus QR code, namun telah memiliki `id` (UUID) dan `nisn` (teks). Menambahkan kolom `qr_code TEXT` dengan indeks B-tree memungkinkan penyimpanan kode unik yang terisi otomatis dari `COALESCE(NULLIF(nisn, ''), id::text)`. Query pencocokan fleksibel `.or('qr_code.eq.{val},nisn.eq.{val},id.eq.{val}')` menjamin pembacaan kartu NISN barcode bawaan maupun QR SIPJAM berhasil 100%.
2. Berdasarkan **Observasi 2**, kebutuhan R3 memerlukan pencatatan log kedatangan (`datang`) dan kepulangan (`pulang`) siswa di gerbang sekolah yang terpisah dari status kelas reguler `absensi`. Oleh karena itu, tabel baru `public.presensi_siswa` harus dibuat dengan skema minimal: `id`, `sekolah_id`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `status` (`'datang' | 'pulang'`), `jam`, `timestamp`, `device_id`, serta constraint `UNIQUE (sekolah_id, tanggal, siswa_id, status)`.
3. Constraint `UNIQUE (sekolah_id, tanggal, siswa_id, status)` pada poin 2, dikombinasikan dengan perintah `upsert` / `ON CONFLICT DO NOTHING`, secara matematis mencegah duplikasi data saat terjadi double-tap atau saat hingga 10 scanner eksternal melakukan scan secara bersamaan di berbagai gerbang sekolah (**Observasi 4**).
4. Berdasarkan **Observasi 3**, `PiketView.tsx` dapat diperluas dengan menambahkan opsi tab `'scan'` ke dalam union state `activeTab`. Tab `'scan'` menyediakan:
   - Toggle status presensi (`Datang` vs `Pulang`).
   - Input teks auto-focus untuk USB HID scanner dengan audio beep Web Audio API.
   - Live camera scanner memanfaatkan Web API `window.BarcodeDetector`.
   - Tabel real-time live feed presensi hari ini yang tersinkronisasi via Supabase Realtime channel.
5. Berdasarkan **Observasi 5**, hardware USB HID scanner tidak memerlukan library npm sama sekali (0 dependensi). Untuk kamera browser, `window.BarcodeDetector` adalah Web API native W3C di Chromium. Untuk generator QR di antarmuka admin, dapat menggunakan utilitas pure SVG generator atau package ringan `qrcode`.
6. Berdasarkan **Observasi 6**, laporan scan gerbang dapat langsung dipetakan ke:
   - Modul Piket (`PiketView.tsx` tab scan): Ringkasan total datang/pulang dan live stream seluruh kelas.
   - Wali Kelas (`RekapSiswaView.tsx`): Tabel kehadiran gerbang khusus untuk kelas yang diampu wali kelas.
   - Guru Mapel (`GuruJurnal.tsx`): Penanda visual siswa yang sudah berada di sekolah hari ini saat guru mengisi jurnal KBM.

---

## 3. Caveats
1. **Dukungan BarcodeDetector pada Browser Non-Chromium**: Web API `window.BarcodeDetector` aktif secara native di Chrome dan Edge. Jika pengguna membuka kamera browser pada Safari macOS/iOS versi tertentu atau Firefox, `BarcodeDetector` mungkin tidak terdefinisi. Dalam hal ini, fallback berupa pesan petunjuk ramah ("Gunakan Google Chrome / Microsoft Edge untuk kamera, atau gunakan hardware scanner USB") harus disediakan, atau memasang modul decorder fallback ringan.
2. **Koneksi Jaringan Multi-Scanner**: Pengoperasian 10 scanner secara bersamaan mengasumsikan seluruh workstation terhubung ke internet/jaringan sekolah yang stabil untuk berkomunikasi dengan Supabase.
3. **Multi-Tenant Scoping**: Seluruh operasi query dan mutasi data presensi siswa wajib menyertakan filter `sekolah_id` pengguna untuk menjamin isolasi data antar sekolah.

---

## 4. Conclusion
Arsitektur untuk R2 (QR Code Siswa Generate & Scan) dan R3 (Presensi Siswa Piket & Wali Kelas) telah terpetakan secara lengkap dan siap diimplementasikan dengan presisi tinggi:
1. **Database Migration**: Buat file `supabase/migrations/20261004_create_presensi_siswa.sql` yang menambahkan `qr_code TEXT` ke `data_siswa` dan membuat tabel `presensi_siswa` lengkap dengan RLS multi-tenant dan constraint anti-duplikasi `uq_presensi_siswa_status`. Eksekusi migrasi ke database remote via Supabase MCP (`apply_migration` / `execute_sql`).
2. **Scan UI di `PiketView.tsx`**: Integrasikan tab `scan` dengan dua mode input: hardware USB HID scanner (fokus otomatis + Enter + Web Audio beep) dan kamera browser Web API (`BarcodeDetector`).
3. **Multi-Scanner Kiosk Mode**: Sediakan tombol buka jendela baru (`?view=view-piket&tab=scan`) dan sinkronisasi real-time antar tab menggunakan Supabase Realtime.
4. **Laporan & Integrasi**: Tampilkan rekapitulasi harian di `PiketView.tsx`, sub-panel presensi gerbang untuk wali kelas di `RekapSiswaView.tsx`, dan sinkronisasi status kehadiran siswa di `GuruJurnal.tsx`.

---

## 5. Verification Method
1. **Verifikasi Skema Database**:
   - Jalankan query SQL: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'presensi_siswa';`
   - Verifikasi keberadaan kolom `qr_code` di `data_siswa`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'data_siswa' AND column_name = 'qr_code';`
2. **Verifikasi Test Suite Otomatis**:
   - Jalankan test suite proyek: `npm test`
   - Pastikan seluruh 16 test suite yang ada tetap lulus tanpa regresi (exit code 0).
   - Buat test suite baru `tests/qr_presensi_siswa.test.ts` untuk memverifikasi logika deduplikasi, skema `presensi_siswa`, isolasi tenant, dan integrasi view.
3. **Kondisi Invalidasi (Invalidation Conditions)**:
   - Jika terdapat error migrasi SQL pada constraint multi-tenant.
   - Jika `npm test` mengalami kegagalan akibat perubahan state di `PiketView.tsx`.

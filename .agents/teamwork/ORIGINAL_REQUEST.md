# Original User Request

## Initial Request — 2026-09-26T09:46:54Z

Investigate and fix a complex issue where admin and teacher (guru) accounts are unable to read their data following a recent update. This requires checking multiple parts of the application to resolve the issue.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

Requirements:
- R1. Root Cause Analysis: Identify the root cause of the issue preventing admin and teacher roles from retrieving or viewing their data (e.g., missing permissions, broken queries, or routing issues introduced in the recent update).
- R2. Implement Fix: Apply the necessary fixes across the application to restore data access for both admin and teacher accounts.
- R3. Regression Prevention: Ensure that the fix maintains data access security and does not break data retrieval for other existing roles (e.g., students/siswa).

Verification Resources:
No explicit test suite provided. The agent team must construct its own programmatic test or agent-as-judge verification based on the application's login and data retrieval flows.

Acceptance Criteria:
- An automated test or agent-judge verifies successful login as an Admin and subsequent successful data retrieval (e.g., dashboard data or user lists load without errors).
- An automated test or agent-judge verifies successful login as a Teacher (Guru) and subsequent successful data retrieval.
- Verification confirms that data access for other roles remains intact and unaffected by the fix.

Please also strictly respect the Git Workflow Rule defined in GEMINI.md:
Whenever completing file modifications/additions/deletions, check git status, stage changes (git add .), commit with a descriptive message, and push to the active origin branch automatically.

## 2026-09-27T11:26:31Z

This is a single self-contained fix; keep it small and focused.
Identifikasi dan perbaiki bug login untuk akun super admin dan guru, serta perbaiki masalah sinkronisasi data yang tidak update (tidak sesuai dengan database) setelah sesi dibiarkan idle/tidak login dalam waktu lama. Terapkan prinsip Ponytail (pilih solusi paling sederhana dan minimal, utamakan fitur bawaan framework tanpa dependensi baru).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Perbaikan Login (Super Admin & Guru)
Baca dan pahami alur autentikasi yang ada saat ini. Identifikasi penyebab gagal login untuk role 'super admin' dan 'guru', lalu terapkan perbaikan yang paling sederhana dan minimal (Ponytail mode).

### R2. Perbaikan Sinkronisasi Data (Stale Data)
Selidiki akar masalah mengapa data yang ditampilkan tidak sesuai dengan database setelah pengguna dibiarkan idle/tidak login dalam waktu lama. Terapkan mekanisme yang tepat (misalnya pembersihan cache, invalidasi state, atau penanganan token expired) dengan memanfaatkan fitur bawaan framework.

## Acceptance Criteria

### Verifikasi Fungsional (Agent-as-judge)
- [ ] Agen memverifikasi bahwa login sebagai 'super admin' berhasil dilakukan setelah perbaikan.
- [ ] Agen memverifikasi bahwa login sebagai 'guru' berhasil dilakukan setelah perbaikan.
- [ ] Agen memverifikasi bahwa setelah sesi berakhir atau di-simulate idle dalam waktu lama, aplikasi mengambil data terbaru dari database (tidak menampilkan data lama dari cache).
- [ ] Perbaikan dievaluasi berdasarkan kesederhanaan (tidak ada boilerplate berlebihan atau dependensi baru).

## 2026-09-27T14:28:20Z

Fitur Sistem Blok: Membuat fitur manajemen sistem blok waktu. Rentang waktu yang diblokir akan menandakan bahwa tidak ada jadwal mengajar reguler, melainkan digantikan oleh kegiatan khusus. Selama periode ini, guru hanya bertugas mengisi jurnal kegiatan.
Ini adalah tugas yang relatif terisolasi, gunakan tim kecil yang fokus.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Halaman Manajemen Sistem Blok (CRUD)
Buat halaman (UI) untuk mengelola (menambah, mengedit, menghapus) periode sistem blok. Data yang disimpan minimal mencakup tanggal mulai, tanggal selesai, dan nama/deskripsi kegiatan.

### R2. Penyesuaian Tampilan Jadwal
Modifikasi tampilan jadwal mengajar. Jika suatu rentang waktu masuk dalam periode sistem blok yang aktif, jadwal reguler di database tidak boleh dihapus, namun di UI jadwal tersebut harus disembunyikan/ditutupi dan diganti dengan informasi kegiatan blok.

### R3. Jurnal Kegiatan Guru
Selama rentang waktu sistem blok, alur pengisian jurnal guru harus disesuaikan. Guru hanya perlu/bisa mengisi "jurnal kegiatan" untuk periode tersebut, bukan jurnal absensi/mengajar kelas reguler.

### R4. Batasan Implementasi
Gunakan komponen UI dan styling yang sudah ada di dalam project (jangan install library eksternal baru). Ikuti prinsip minimalis (hanya buat apa yang benar-benar dibutuhkan agar fitur ini jalan).

## Acceptance Criteria

### Manajemen Blok (R1)
- [ ] Terdapat form untuk menambahkan periode blok baru yang menyimpan data ke database.
- [ ] Daftar periode blok yang sudah dibuat dapat dilihat dan dihapus/diedit.

### Tampilan Jadwal (R2)
- [ ] Jadwal mengajar reguler yang bertabrakan dengan tanggal blok tidak ditampilkan seperti biasa.
- [ ] Halaman jadwal menampilkan informasi kegiatan blok pada tanggal-tanggal yang terpengaruh.
- [ ] Data jadwal asli di database terbukti tidak terhapus.

### Jurnal Kegiatan (R3)
- [ ] Terdapat form atau penyesuaian UI agar guru dapat mengisi jurnal kegiatan (bukan jurnal reguler) pada hari yang masuk dalam periode blok.

## 2026-09-27T21:46:18Z

Tambahkan dua fitur ke aplikasi SIPJAM (Next.js 16 + Supabase, `c:\Users\Fitra\OneDrive\Documents\sipjam-app`):
1. **AI Assistant rule-based** — tombol chatbot terapung yang muncul di semua halaman setelah login, menjawab pertanyaan user berdasarkan halaman aktif dan kata kunci dengan jawaban statis (Bahasa Indonesia).
2. **Tutorial onboarding interaktif** — highlight overlay step-by-step yang muncul otomatis saat login pertama untuk akun admin dan akun guru (masing-masing punya alur berbeda). Status "sudah lihat" disimpan di `localStorage`. User bisa membuka ulang tutorial dari sidebar atau menu bantuan.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. AI Assistant (Chatbot FAQ Rule-Based)
Tambahkan komponen floating button (ikon tanda tanya / bintang AI) yang muncul di semua halaman setelah login. Saat diklik, muncul panel chat kecil. User mengetik pertanyaan; sistem mencocokkan kata kunci dengan basis pengetahuan statis (hard-coded) yang mencakup semua halaman utama aplikasi (Dashboard, Presensi, Jurnal, Piket, Dokumen, Daftar Nilai, Chat, Informasi, Rekap, Admin Verifikasi, Master Data, dll). Tidak boleh menggunakan API eksternal atau library AI — murni string matching / keyword lookup. Jawaban dalam Bahasa Indonesia. Jika tidak ada jawaban yang cocok, tampilkan pesan ramah dan daftar topik yang tersedia.

### R2. Tutorial Onboarding — Akun Guru
Saat guru pertama kali login (belum ada flag `sipjam_onboarding_guru_done` di localStorage), tampilkan tutorial overlay step-by-step yang menyoroti elemen UI nyata di layar: (1) tombol hamburger menu, (2) menu Presensi Datang, (3) menu Jurnal Mengajar, (4) menu Piket, (5) tombol AI Assistant. Setiap step memiliki tooltip/callout dengan teks penjelasan singkat. User bisa skip atau klik "Lanjut" antar step. Setelah selesai, set flag `sipjam_onboarding_guru_done = true` di localStorage. Ada tombol "Lihat Tutorial Lagi" di sidebar.

### R3. Tutorial Onboarding — Akun Admin
Saat admin pertama kali login (belum ada flag `sipjam_onboarding_admin_done` di localStorage), tampilkan tutorial overlay terpisah khusus admin yang menyoroti: (1) menu Verifikasi, (2) menu Sistem Blok, (3) menu Master Data, (4) menu Analitik, (5) menu Sistem (Konfigurasi), (6) tombol AI Assistant. Format dan behavior sama dengan tutorial guru (skip, lanjut, flag localStorage).

### R4. Integrasi Halus
Tidak boleh memodifikasi logika bisnis yang ada (workflow presensi, jurnal, dll). Komponen AI Assistant dan tutorial overlay ditambahkan sebagai lapisan UI baru di `AppScreen.tsx` atau sebagai komponen terpisah yang dimount di sana. Gunakan Tailwind CSS dan Font Awesome yang sudah ada — tidak boleh menambahkan dependency npm baru.

## Acceptance Criteria

### AI Assistant
- [ ] Floating button AI tampil di semua halaman setelah login (guru maupun admin)
- [ ] Panel chatbot terbuka saat button diklik dan bisa ditutup
- [ ] Setidaknya 30 pertanyaan/jawaban mencakup semua menu utama tersedia di knowledge base
- [ ] Jawaban berubah relevan sesuai konteks halaman aktif (misal: jika di halaman Presensi, topik presensi diprioritaskan)
- [ ] Jika tidak ada jawaban cocok, muncul pesan ramah + daftar topik tersedia
- [ ] Tidak ada API call eksternal sama sekali; bisa berjalan offline

### Tutorial Onboarding Guru
- [ ] Tutorial muncul otomatis saat guru pertama login (localStorage flag belum ada)
- [ ] Tutorial punya minimal 5 step dengan highlight overlay pada elemen UI nyata
- [ ] User bisa skip keseluruhan atau klik "Lanjut" per step
- [ ] Setelah selesai/skip, flag `sipjam_onboarding_guru_done` tersimpan di localStorage
- [ ] Tutorial bisa dibuka ulang melalui sidebar

### Tutorial Onboarding Admin
- [ ] Tutorial muncul otomatis saat admin pertama login (localStorage flag belum ada)
- [ ] Tutorial punya minimal 6 step dengan highlight overlay pada elemen UI nyata admin
- [ ] User bisa skip keseluruhan atau klik "Lanjut" per step
- [ ] Setelah selesai/skip, flag `sipjam_onboarding_admin_done` tersimpan di localStorage
- [ ] Tutorial bisa dibuka ulang melalui sidebar

### Integrasi & Kualitas
- [ ] Tidak ada dependency npm baru di package.json
- [ ] Tidak ada error TypeScript baru (tsc --noEmit lulus)
- [ ] Tidak ada regresi pada fitur yang sudah ada (build berhasil: npm run build)
- [ ] Semua teks UI dalam Bahasa Indonesia
- [ ] Tampilan responsif di mobile (lebar 320px-428px) dan desktop

## Konteks Teknis Penting

- Stack: Next.js 16.3.4, React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase
- Roles: superadmin, admin, guru. Superadmin tidak perlu tutorial.
- File kunci: `src/components/AppScreen.tsx` (848 baris) — orkestrasi utama, mount semua view, sidebar navigasi, header
- Menu guru: Dashboard, Presensi Datang/Pulang, Jurnal Mengajar, Piket, Perangkat Pembelajaran, Daftar Nilai, Chat Guru, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa
- Menu admin: semua menu guru + Verifikasi, Sistem Blok, Jurnal Kelas, Analitik, Rekap Akhir, Master Data, Akses Data/Backup, Sistem
- Sidebar di AppScreen sudah ada, pakai `data-tour` attribute untuk targeting elemen dari tutorial overlay
- Git workflow: setelah selesai, wajib `git add . && git commit -m "..." && git push origin main`
- AGENTS.md: baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js apapun
## 2026-09-29T04:04:50Z

# Teamwork Project Prompt — Draft

> Status: Step 9 — Ready for launch - awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: small focused team

This is a single self-contained feature; keep it small and focused.
Tambahkan fitur opsional "Guru Inval" (substitute teacher) pada form Jurnal Pembelajaran agar guru pengganti dapat mengajar di luar jadwalnya dengan memilih guru yang digantikan.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. UI Mode Guru Inval
Pada `src/components/GuruJurnal.tsx`, tambahkan toggle/checkbox "Saya sebagai Guru Inval". 

### R2. Pilihan Guru yang Digantikan & Data Dinamis
Jika mode Inval aktif, munculkan dropdown yang berisi daftar semua guru (diambil dari tabel `data_guru`). Ketika seorang guru dipilih, ambil jadwal mapel & kelas dari guru tersebut (melalui tabel `guru_mapel`) dan tampilkan di pilihan Mapel & Kelas, menimpa pilihan default guru yang sedang login.

### R3. Penyimpanan Tanpa Migrasi (Ponytail Style)
Saat form disubmit dalam mode Inval, sisipkan teks `[INVAL - Menggantikan: {Nama Guru}] ` di bagian awal kolom `keterangan` (atau di bagian deskripsi jika `keterangan` digabung). JANGAN membuat kolom baru di database atau melakukan migrasi skema.

## Acceptance Criteria

### Fungsionalitas
- [ ] Toggle Inval berhasil memunculkan dropdown berisi daftar nama guru dari sekolah yang sama.
- [ ] Memilih nama guru di dropdown akan mengubah opsi Mapel dan Kelas sesuai dengan jadwal guru yang dipilih.
- [ ] Jika mode Inval dimatikan, opsi Mapel dan Kelas kembali ke jadwal asli guru yang sedang login.
- [ ] Data berhasil tersimpan ke tabel `jurnal_pembelajaran` dengan format keterangan yang mengandung teks `[INVAL - Menggantikan: ...]`.

### Verifikasi Objektif (Forcing Function)
- [ ] Agen verifikator harus dapat login sebagai seorang Guru, mengaktifkan toggle Inval, memilih guru lain, mensubmit jurnal, dan memverifikasi secara langsung (lewat query Supabase atau UI) bahwa baris baru di `jurnal_pembelajaran` memiliki awalan `[INVAL - Menggantikan:` pada keterangannya.

## 2026-10-01T10:56:44Z

Implementasi perbaikan bug dan penambahan fitur pada aplikasi Sipjam, meliputi: perbaikan data pengguna ganda, perbaikan upload avatar, penambahan izin terlambat, opsi upload foto jurnal, pembatasan edit username, dan pengaturan fitur per-sekolah oleh superadmin. Menerapkan prinsip *Ponytail* (solusi paling sederhana dan efisien).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo
Verification Resources: Agent-as-judge (Gunakan Acceptance Criteria di bawah sebagai rubrik objektif)

## Requirements

### R1. Perbaikan Data Ganda (Merge Account)
Gunakan script SQL satu kali jalan (one-off) untuk menggabungkan data akun "Ade Fitrawan Ibrahim" dan "Ade Fitrawan Ibrahim, M.Pd., Gr" secara langsung di database. Pertahankan akun dengan riwayat transaksi (presensi, jurnal, dll) terbanyak, dan re-assign data dari akun duplikat ke akun utama sebelum menghapus akun duplikat.

### R2. Perbaikan Avatar
Pastikan fitur pemilihan avatar berfungsi dengan benar: saat avatar dipilih/diubah, gambar profil harus langsung diperbarui dan terlihat pada UI akun pengguna.

### R3. Izin Datang Terlambat (Guru)
Tambahkan opsi status "Izin Terlambat" pada pilihan/tombol absensi yang sudah ada di halaman presensi guru.

### R4. Upload Foto Jurnal Pembelajaran
Sediakan opsi tambahan pada Jurnal Pembelajaran untuk mengunggah foto dari file/galeri. Sistem harus menangkap lokasi dari GPS device (melalui browser) saat upload dilakukan, dan menyimpan data lokasi beserta waktu upload ke database untuk ditampilkan di UI.

### R5. Pembatasan Pengaturan Username
Kunci kemampuan untuk mengubah username milik guru di aplikasi; pastikan hanya pengguna dengan role Admin yang dapat melakukan perubahan ini.

### R6. Pengaturan Fitur Per-Sekolah (Superadmin)
Tambahkan opsi (checkbox/dropdown) langsung di halaman "Edit Sekolah" yang sudah ada, agar Superadmin dapat mengatur mode Jurnal Pembelajaran ("Live Camera Langsung" saja, atau "Live Camera + Upload Foto"). Pastikan pengaturan ini diaplikasikan saat guru di sekolah tersebut membuka halaman jurnal.

## Acceptance Criteria

### Verifikasi R1 (Merge Account)
- [ ] Terdapat file script SQL (misal: `merge_accounts.sql`) yang berisi query UPDATE untuk memindahkan foreign keys dan query DELETE untuk menghapus akun duplikat.

### Verifikasi R2 (Avatar)
- [ ] Terdapat kode di komponen profil yang memperbarui state (React/Vue dll) segera setelah respon sukses dari upload avatar, sehingga gambar langsung berubah tanpa reload halaman.

### Verifikasi R3 (Izin Terlambat)
- [ ] Tombol/opsi absensi memiliki pilihan bernilai "Izin Terlambat".
- [ ] Backend endpoint presensi dapat menerima dan menyimpan status "Izin Terlambat".

### Verifikasi R4 (Upload Jurnal GPS)
- [ ] Terdapat penggunaan API `navigator.geolocation.getCurrentPosition` pada fungsi upload jurnal via galeri.
- [ ] Payload request ke backend menyertakan latitude dan longitude.

### Verifikasi R5 (Username Edit Limit)
- [ ] Terdapat pengecekan kondisi `role === 'admin'` (atau setara) sebelum form edit username dirender di UI ATAU sebelum update dieksekusi di backend.

### Verifikasi R6 (Pengaturan Sekolah)
- [ ] UI form Edit Sekolah memiliki input untuk mode Jurnal (Live Camera / Camera + Upload).
- [ ] Halaman Jurnal membaca konfigurasi sekolah pengguna yang sedang login dan merender input file upload HANYA JIKA konfigurasinya mengizinkan.

## 2026-10-01T18:10:59Z

This is a single self-contained set of fixes; keep it small and focused.
Penyesuaian lanjutan pada aplikasi Sipjam: perhitungan dan penggabungan presisi untuk data ganda, pengubahan alur izin terlambat agar memerlukan konfirmasi admin, dan penghapusan kolom username pada profil guru.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo
Verification Resources: Agent-as-judge (Gunakan Acceptance Criteria di bawah sebagai rubrik objektif)

## Requirements

### R1. Penggabungan Data Ganda Terukur
Buatkan skrip TypeScript/Node.js (misal `scripts/merge_accounts.ts`) yang menggunakan Supabase Client untuk mengambil, menghitung, dan mencetak jumlah pasti riwayat (presensi, jurnal, piket) dari akun "Ade Fitrawan Ibrahim, M.Pd., Gr." di terminal. Setelah dihitung, skrip harus mengeksekusi perpindahan data ke akun "Ade Fitrawan Ibrahim" dan menghapus akun duplikat.

### R2. Alur Konfirmasi Izin Terlambat
Ubah logika presensi "Izin Terlambat". Saat guru memilih status ini, data tidak boleh langsung disahkan sebagai "Hadir". Data harus masuk ke halaman verifikasi Admin (`AdminVerifView` atau setara) dengan status awal "Menunggu Verifikasi" (sama seperti proses pengajuan Sakit/Izin), sehingga Admin dapat mengonfirmasi atau menolaknya.

### R3. Penghapusan Input Username Guru
Pada antarmuka pengaturan akun (`AccountSettingsModal`), hilangkan sepenuhnya elemen form input *username* jika pengguna yang login adalah *Guru*. Pastikan form untuk mengubah *password* tetap dipertahankan dan berfungsi normal tanpa *username*.

## Acceptance Criteria

### Verifikasi R1 (Merge Data Script)
- [ ] Terdapat file skrip `scripts/merge_accounts.ts` yang dapat dieksekusi.
- [ ] Skrip memiliki kode yang secara eksplisit melakukan query `COUNT` atau mengambil jumlah data dari tabel presensi, jurnal, dan piket, lalu mencetaknya ke konsol (`console.log`).
- [ ] Skrip memiliki logika perpindahan *foreign keys* dan penghapusan *user/data_guru* lama di Supabase.

### Verifikasi R2 (Izin Terlambat Verifikasi)
- [ ] Pengiriman presensi "Izin Terlambat" menghasilkan status database yang dikenali oleh UI Admin sebagai *pending* (misal: "Menunggu" atau masuk ke *tab* Verifikasi).
- [ ] Terdapat tombol persetujuan/penolakan (Terima/Tolak) untuk status "Izin Terlambat" di antarmuka verifikasi Admin.

### Verifikasi R3 (Hapus Input Username)
- [ ] Tidak ada elemen `<input>` atau teks untuk *username* yang dirender (atau dirender secara kasat mata) saat *state* `user.role` bernilai non-admin/Guru.
- [ ] Elemen form ganti *password* (input kata sandi lama & baru) tetap bisa diakses dan tidak mengalami *error* validasi meskipun input *username* dihilangkan.

## 2026-10-02T08:30:41Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.

Tiga perbaikan bug/fitur kecil: (1) Pengecualian presensi/jurnal/piket untuk guru saat sistem blok berdasarkan jadwal mengajar, (2) Penyesuaian ukuran foto pada hasil cetak dokumen agar memenuhi kolom, (3) Pembaruan format tanggal dashboard menjadi [hari, tanggal-bulan-tahun] yang responsif.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

## Requirements

### R1. Pengecualian Sistem Blok
Guru yang diatur wajib hadir hanya pada hari mengajar tidak perlu melakukan presensi, mengisi jurnal, dan laporan piket saat sistem blok aktif, kecuali jika mereka memang memiliki jadwal pada hari tersebut.

### R2. Ukuran Foto Dokumen Cetak
Foto kegiatan pada hasil cetak dokumen harus mengisi penuh kolom yang tersedia tanpa terdistorsi atau memiliki tinggi absolut (fixed height) yang merusak layout.

### R3. Format Tanggal Dashboard
Tanggal di dashboard harus berformat `[hari, tanggal-bulan-tahun]` (contoh: Jumat, 02-10-2026) dan tampilannya harus rapi (responsif) tanpa terpotong baik di desktop maupun mobile.

## Acceptance Criteria

### Verifikasi Fitur
- [ ] Sistem tidak memblokir atau memaksa presensi bagi guru pengecualian di hari tanpa jadwal, meskipun periode blok aktif (mereka akan terbaca bebas presensi, bebas jurnal, dan bebas piket).
- [ ] Foto di mode cetak (`print` CSS) memenuhi kolom (`w-full` dan `h-auto` atau setara) tanpa merusak baris.
- [ ] Tanggal di dashboard menampilkan hari dan tanggal penuh (misal: DD-MM-YYYY) dan menyesuaikan ruang di mobile (bisa wrap jika perlu, tapi tidak `truncate`).


## 2026-10-03T00:45:54Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: small focused team

This is a single self-contained fix; keep it small and focused.
Ubah `CameraSelfieCapture` agar menerima prop orientasi, lalu gunakan orientasi potret untuk fitur Presensi, dan lanskap untuk Jurnal serta Laporan Piket.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Prop Orientasi
Tambahkan prop `orientation` ('portrait' | 'landscape') opsional ke `src/components/CameraSelfieCapture.tsx`. Jika 'portrait', gunakan constraint tinggi > lebar (misal `width: 720, height: 1280`). Jika 'landscape', gunakan lebar > tinggi (misal `width: 1280, height: 720`).

### R2. Terapkan ke Komponen
Teruskan prop yang sesuai dari:
- `src/components/GuruPresensi.tsx` (portrait)
- `src/components/GuruJurnal.tsx` (landscape)
- `src/components/PiketView.tsx` (landscape)

## Acceptance Criteria

### Verifikasi Kode (Programmatic / Statis)
- [ ] File `CameraSelfieCapture.tsx` mengecek nilai prop `orientation` untuk mengatur `constraints.video`.
- [ ] File `GuruPresensi.tsx` meneruskan prop `orientation="portrait"`.
- [ ] File `GuruJurnal.tsx` meneruskan prop `orientation="landscape"`.
- [ ] File `PiketView.tsx` meneruskan prop `orientation="landscape"`.

## 2026-10-03T02:56:59Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: small focused team

This is a single self-contained fix; keep it small and focused.
Ubah logo Asisten AI menjadi robot dan pastikan fitur notifikasi push (Web Push) berfungsi dengan baik agar muncul di gawai pengguna.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Logo Robot AI
Ubah ikon Asisten AI dari `fa-wand-magic-sparkles` (atau ikon terkait) menjadi `fa-robot` di `src/components/AIAssistant/AIAssistant.tsx`.

### R2. Audit & Perbaikan Notifikasi
Sistem saat ini sudah memiliki `/sw.js` dan `src/lib/pushClient.ts`. Verifikasi dan pastikan bahwa notifikasi push (`push` event di service worker) tidak memiliki error logika yang mencegah notifikasi muncul ke perangkat. Perbaiki jika ditemukan bug.

## Acceptance Criteria

### Kode dan Fungsionalitas
- [ ] Di dalam `AIAssistant.tsx`, ikon yang digunakan adalah `fa-robot`.
- [ ] Logika `self.addEventListener('push')` dan `showNotification` pada `sw.js` telah diaudit/diperbaiki, dan tidak ada pemanggilan yang memblokir notifikasi tampil.


## 2026-10-03T04:24:17Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: small focused team

This is a single self-contained fix; keep it small and focused.
Pastikan kamera yang digunakan di aplikasi tidak terlihat men-zoom (terpotong atau membesar) saat mengambil gambar.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Nonaktifkan Zoom/Crop di Kamera
Periksa komponen `src/components/CameraSelfieCapture.tsx`. Kemungkinan besar masalah zoom disebabkan oleh CSS `object-fit: cover` yang memotong (crop) video stream sehingga terlihat membesar, atau batasan (constraints) resolusi yang memaksa crop dari sisi hardware. Sesuaikan styling CSS (misalnya menggunakan `object-contain` atau mencocokkan aspect-ratio container secara presisi) atau sesuaikan `MediaStreamConstraints` agar tampilan kamera pas dan tidak terpotong/zoom.

## Acceptance Criteria

### Verifikasi Kode (Programmatic / Statis)
- [ ] CSS atau constraints pada elemen `<video>` di `CameraSelfieCapture.tsx` telah disesuaikan untuk menghindari efek "zoom" atau crop yang berlebihan.
- [ ] Tampilan kamera tetap rapi dan proposional (tidak penyok/distorsi).
## 2026-10-03T05:27:01Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: full team

Proyek perbaikan komprehensif: Memperbaiki rasio kamera agar 1:1 tanpa zoom, menghilangkan notifikasi oranye pada AI, serta membangun sistem pengingat otomatis (notifikasi) setiap 5 menit untuk kelengkapan absensi dan jurnal.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Kamera Anti-Zoom dan Orientasi Akurat
Pastikan pengambilan gambar melalui `CameraSelfieCapture.tsx` tidak men-zoom (skala 1x). Jika kamera dalam mode potret, maka foto yang dihasilkan (baik di `<canvas>` maupun di data akhir) berorientasi potret. Jika lanskap, hasilkan gambar lanskap.

### R2. Penghapusan Indikator Oranye pada AI
Hilangkan elemen visual "tanda oranye bulat" (badge/dot notifikasi) yang menempel pada ikon robot AI di komponen `AIAssistant.tsx`.

### R3. Sistem Notifikasi Pengingat (Reminder) Otomatis
Buat mekanisme untuk mengirim notifikasi push (atau in-app jika push tidak memungkinkan secara interval) setiap 5 menit untuk mengingatkan guru apabila:
- Belum melakukan presensi datang (memperhatikan jam masuk/terlambat).
- Belum mengisi jurnal mengajar.
- Belum mengisi laporan piket (khusus bagi yang mendapat jadwal piket hari itu).
- Belum melakukan presensi pulang (memperhatikan jam pulang).

*Catatan implementasi: Gunakan mekanisme berbasis frontend / Service Worker (berjalan saat aplikasi dibuka di depan atau latar belakang) sesuai preferensi pengguna.*

## Acceptance Criteria

### Fungsional
- [ ] Pengambilan foto di mode potret menghasilkan gambar berdimensi vertikal (tinggi > lebar), tanpa cropping buatan/zoom.
- [ ] Ikon robot AI tampil bersih tanpa bulatan oranye di sudutnya.
- [ ] Terdapat logika yang mendeteksi kekurangan kelengkapan harian (presensi datang, pulang, jurnal, piket) berdasarkan waktu/jam sekolah, dan memicu notifikasi peringatan berulang.


## 2026-10-03T07:10:50Z

Modifikasi aplikasi SIPJAM (Next.js + Supabase) di `c:\Users\Fitra\OneDrive\Documents\sipjam-app` untuk menyesuaikan orientasi kamera per fitur dan merestrukturisasi form Jurnal KBM beserta dokumen cetaknya. Gunakan pendekatan minimal (ponytail): ubah hanya yang perlu, jangan tambahkan abstraksi baru, fewest files changed wins.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

ATENSI: Baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js apapun.

## Requirements

### R1. Orientasi Kamera per Fitur
Pastikan setiap fitur menggunakan orientasi kamera yang benar pada komponen `CameraSelfieCapture` (src/components/CameraSelfieCapture.tsx):
- **Presensi** (`src/components/GuruPresensi.tsx`): orientasi **potret** (`orientation="portrait"`, `initialFacingMode="user"`)
- **Jurnal KBM** (`src/components/GuruJurnal.tsx`): orientasi **lanskap** (`orientation="landscape"`, `initialFacingMode="environment"`)
- **Piket** (`src/components/PiketView.tsx`): orientasi **lanskap** (`orientation="landscape"`, `initialFacingMode="environment"`)

Sesuaikan juga tampilan thumbnail/preview foto di tabel cetak (`src/components/RekapJurnalView.tsx`) agar rasio gambar sesuai:
- Foto dari jurnal/piket: rasio lanskap (mis. `aspect-video` atau `w-full h-24 object-cover`)
- Foto dari presensi (jika ada di rekap): rasio potret

Catatan: Cek kondisi existing. GuruPresensi sudah portrait, GuruJurnal sudah landscape, PiketView sudah landscape. Jika sudah benar, skip — hanya sesuaikan yang belum benar.

### R2. Restrukturisasi Form Jurnal KBM
Ubah form pengisian Jurnal KBM di `src/components/GuruJurnal.tsx` (hanya section `tipeJurnal === 'Jurnal KBM'`) menggunakan urutan field berikut:

1. **No.** — nomor urut pertemuan (`pertemuan_ke`), terisi otomatis, bisa diedit manual
2. **Hari/Tanggal** — otomatis dari tanggal hari ini, ditampilkan dalam format "Sabtu, 4 Oktober 2026" (read-only display). Nilai `tanggal` tetap disimpan sebagai YYYY-MM-DD
3. **Tujuan Pembelajaran** — textarea, **wajib diisi**
4. **KKTP** (Kriteria Ketercapaian Tujuan Pembelajaran) — textarea, **wajib diisi**; simpan ke kolom `kktp` di tabel `jurnal_pembelajaran`
5. **Konten** — textarea, **wajib diisi**; ini TERPISAH dari Materi Pembelajaran dan Kegiatan Pembelajaran (keduanya tetap ada di form tapi bisa di-collapse atau dijadikan secondary). Simpan Konten ke kolom `konten` di tabel `jurnal_pembelajaran`. Materi dan Kegiatan tetap tersimpan ke kolom masing-masing untuk backward-compatibility.
6. **Kelas** — dropdown pilih kelas (pertahankan logika auto-fill bestehende)
7. **Absensi Murid** — tombol H/I/S/A per siswa (pertahankan live absensi + sync ke tabel `absensi`)
8. **Lokasi KBM** — text input, **wajib diisi** (contoh: "Ruang Kelas 7A", "Lab IPA"); simpan ke kolom `lokasi_kbm` di tabel `jurnal_pembelajaran`
9. **Dokumentasi KBM** — kamera lanskap (pertahankan komponen CameraSelfieCapture landscape)
10. **Catatan** — textarea opsional; simpan ke `catatan_refleksi`

Field Mapel, Jam ke- tetap ada (untuk logika dan penyimpanan data) tapi bisa diposisikan sebagai secondary/collapsed. Jangan hapus logika auto-fill yang sudah ada.

### R3. Restrukturisasi Dokumen Cetak Rekap Jurnal Pribadi
Sesuaikan tabel cetak di `src/components/RekapJurnalView.tsx` (mode `pribadi` / `tabMode === 'pribadi'`) agar kolomnya:

| No | Hari/Tanggal | Tujuan Pembelajaran | KKTP | Konten | Kelas | Absensi Murid (H/I/S/A) | Lokasi KBM | Foto Dokumentasi | Catatan |

- Kolom "Absensi Murid" menampilkan ringkasan H/I/S/A (gunakan fungsi `formatAbsensi` yang sudah ada atau `j.kehadiran_murid`)
- Kolom "Konten" menampilkan `j.konten || j.materi_pembelajaran || j.materi || '-'` (fallback untuk data lama)
- Kolom "KKTP" menampilkan `j.kktp || '-'`
- Kolom "Lokasi KBM" menampilkan `j.lokasi_kbm || j.lokasi || '-'`
- Kolom "Catatan" menampilkan `j.catatan_refleksi || j.refleksi || '-'`
- Foto ditampilkan dalam rasio lanskap (aspect-video)
- **Mode rekap per kelas** (`tabMode === 'kelas'`) TIDAK berubah

### R4. Migrasi Database (Supabase)
Tambahkan kolom baru ke tabel `jurnal_pembelajaran` menggunakan Supabase MCP (`apply_migration`):

```sql
ALTER TABLE jurnal_pembelajaran 
  ADD COLUMN IF NOT EXISTS kktp TEXT,
  ADD COLUMN IF NOT EXISTS konten TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
```

Pastikan kolom nullable agar tidak merusak data lama.

Project Supabase ID: lihat dari `src/lib/supabaseClient.ts` atau `.env.local`.

## Acceptance Criteria

### Orientasi Kamera
- [ ] `GuruPresensi.tsx` menggunakan `orientation="portrait"` pada `CameraSelfieCapture`
- [ ] `GuruJurnal.tsx` menggunakan `orientation="landscape"` pada `CameraSelfieCapture`
- [ ] `PiketView.tsx` menggunakan `orientation="landscape"` pada `CameraSelfieCapture`
- [ ] Foto di tabel rekap jurnal ditampilkan dalam rasio lanskap

### Form Jurnal KBM
- [ ] Form menampilkan 10 field sesuai urutan baru: No., Hari/Tanggal, Tujuan Pembelajaran, KKTP, Konten, Kelas, Absensi Murid, Lokasi KBM, Dokumentasi KBM, Catatan
- [ ] KKTP wajib diisi; tidak bisa submit tanpa KKTP
- [ ] Lokasi KBM wajib diisi; tidak bisa submit tanpa Lokasi KBM
- [ ] Field KKTP, Konten, Lokasi KBM tersimpan ke kolom yang sesuai di `jurnal_pembelajaran`
- [ ] Live absensi murid (H/I/S/A per siswa) tetap berfungsi dan tersinkronisasi ke tabel `absensi`
- [ ] Hari/Tanggal ditampilkan otomatis dalam format Indonesia ("Sabtu, 4 Oktober 2026")

### Dokumen Cetak Rekap Jurnal Pribadi
- [ ] Tabel rekap jurnal pribadi memiliki 10 kolom sesuai format baru
- [ ] Kolom baru (KKTP, Konten, Lokasi KBM) menampilkan data dari kolom baru, dengan fallback ke kolom lama untuk backward-compatibility
- [ ] Tabel rekap per kelas tidak berubah

### Database
- [ ] Kolom `kktp`, `konten`, `lokasi_kbm` tersedia di tabel `jurnal_pembelajaran` (nullable)
- [ ] Tidak ada runtime error saat menyimpan jurnal baru maupun membaca entri lama

## Setelah Selesai
Jalankan git workflow: `git status` → `git add .` → `git commit -m "feat: restrukturisasi form Jurnal KBM dan orientasi kamera"` → `git push origin main`


## 2026-10-03T07:17:31Z

KOREKSI REQUIREMENTS dari user — mohon terapkan sebelum melanjutkan implementasi:

1. **Format Hari/Tanggal**: Tampilkan dalam format `DD-MM-YYYY` (bukan format panjang "Sabtu, 4 Oktober 2026"). Field read-only display, nilai tersimpan tetap YYYY-MM-DD di database.

2. **Field "Konten"**: Menggantikan **Materi Pembelajaran** saja (bukan Kegiatan Pembelajaran). Field **Kegiatan Pembelajaran tetap ada dan wajib diisi terpisah**. Urutan form yang dikoreksi:
   1. No. (pertemuan_ke, otomatis)
   2. Hari/Tanggal (DD-MM-YYYY, read-only)
   3. Tujuan Pembelajaran (wajib)
   4. KKTP (wajib)
   5. **Konten** (menggantikan Materi Pembelajaran, wajib) — simpan ke kolom `konten` dan/atau `materi`
   6. **Kegiatan Pembelajaran** (tetap ada, wajib)
   7. Mapel (dropdown, tetap ada)
   8. Kelas (dropdown)
   9. Absensi Murid H/I/S/A
   10. Lokasi KBM (wajib)
   11. Dokumentasi KBM (kamera lanskap)
   12. Catatan (opsional)

3. **Field yang disisakan dari grup Mapel/Pertemuan/Jam**: Hanya **Mapel** yang tetap ditampilkan di form. **Pertemuan ke- dan Jam ke- dihapus dari tampilan form** (boleh tetap tersimpan/diisi internal secara otomatis jika diperlukan untuk backward-compat, tapi tidak perlu input dari user).

Sesuaikan juga kolom tabel cetak rekap jurnal pribadi agar mencerminkan koreksi ini (Konten menggantikan Materi Pembelajaran, Kegiatan Pembelajaran tetap ada sebagai kolom terpisah).
## 2026-10-03T12:37:11Z

Lakukan tiga perbaikan lanjutan pada form Jurnal KBM dan dokumen cetak rekap di aplikasi SIPJAM (Next.js + Supabase). Gunakan pendekatan minimalis (ponytail): fewest files changed wins, jangan tambahkan boilerplate.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

ATENSI: Baca node_modules/next/dist/docs/ sebelum menulis kode Next.js apapun.

## Requirements

### R1. Hilangkan Field "Pertemuan ke" dan "Jam ke"
- Di `src/components/GuruJurnal.tsx`: Hapus UI input "Pertemuan ke" dan "Jam ke". Hapus juga kewajiban/validasi untuk mengisinya (hapus dari requirement submit). Jika dibutuhkan internal, berikan default saja (misal `pertemuanKe` = '-' atau null) tapi pastikan tidak membuat submit error.
- Di `src/components/RekapJurnalView.tsx` (tabel cetak mode pribadi/guru): Hapus informasi pertemuan dan jam dari kolom header maupun sel datanya.

### R2. Format Kehadiran Murid
- Di `src/components/GuruJurnal.tsx`: Sesuaikan fungsi `calculateKehadiranSummary` agar persis menggunakan format:
  `Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}`
- Di `src/components/RekapJurnalView.tsx`: Sesuaikan fungsi `formatAbsensi` (untuk data historis) maupun pembacaan `j.kehadiran_murid` agar memunculkan format yang sama di tabel cetak.

### R3. Kelas dan Mata Pelajaran
- Di `src/components/GuruJurnal.tsx`: Pastikan input/dropdown untuk "Kelas" dan "Mata Pelajaran" sudah ada dan tampil (jangan disembunyikan). Logika auto-fill sesuai penugasan guru dipertahankan.
- Di `src/components/RekapJurnalView.tsx` (tabel cetak mode pribadi/guru): Pastikan di tabel tersebut terdapat header kolom terpisah/spesifik untuk menampilkan "Kelas" dan "Mata Pelajaran".

## Acceptance Criteria
- [ ] Tidak ada error validasi pertemuan/jam saat guru men-submit jurnal.
- [ ] Di layar cetak jurnal pribadi, teks kehadiran murid berbentuk persis `Total murid: X, Hadir: Y, Izin: Z, Sakit: A, Alpa: B`.
- [ ] Terdapat kolom Kelas dan Mata Pelajaran di tabel rekap cetak pribadi.
- [ ] Lulus pengecekan `npx tsc --noEmit` dan `npm run build`.
- [ ] Otomatis di commit dengan pesan deskriptif dan di push ke origin/main.

## 2026-10-03T20:06:51Z

Modifikasi aplikasi SIPJAM (Next.js + Supabase, multi-tenant, role-based): (1) hapus fitur Chat Guru sepenuhnya, (2) tambah fitur presensi siswa QR code yang dioperasikan guru piket, mendukung scan kamera browser maupun hardware scanner eksternal hingga 10 unit, dengan laporan ke piket & wali kelas dan sinkronisasi ke guru mapel hari tersebut.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

## Requirements

### R1. Hapus Fitur Chat Guru
Hapus `ChatView` component dan semua referensinya: import di `AppScreen.tsx`, menu item `view-chat` dari `menuItemsGuru` dan `menuItemsAdmin`, route render `{currentView === 'view-chat' && <ChatView .../>}`, dan file `src/components/ChatView.tsx`. Tabel `chat_messages` di Supabase tidak perlu dihapus (cukup dari UI). Pastikan tidak ada broken import atau dead reference yang tertinggal.

### R2. QR Code Siswa — Generate & Scan
Setiap siswa memiliki QR code unik yang di-generate sistem SIPJAM, disimpan di database Supabase (cek tabel yang sudah ada; jika belum ada kolom/tabel yang memadai, buat migration SQL yang sesuai). QR berisi identifier siswa (misal NIS atau UUID siswa). Guru piket dapat membuka halaman scan di modul Piket (`PiketView`) yang mendukung dua mode input: (a) kamera browser via Web API, (b) hardware QR/barcode scanner eksternal (USB HID — input teks otomatis ke input field, akhiri Enter). Maksimal 10 scanner eksternal dapat digunakan bersamaan (masing-masing buka tab/window halaman scan yang sama). Scan menghasilkan presensi `datang` atau `pulang` siswa sesuai pilihan mode yang dipilih guru piket.

### R3. Laporan Presensi ke Piket & Wali Kelas
Hasil scan QR tersimpan ke tabel presensi siswa di Supabase (buat migration jika belum ada: minimal kolom siswa_id, kelas, tanggal, status datang/pulang, timestamp, sekolah_id). Laporan presensi harian siswa tampil di modul Piket dan di tampilan Wali Kelas (jika sudah ada view Rekap Siswa `RekapSiswaView`, tambahkan data dari tabel baru ini; jika belum, cukup tampilkan di Piket). Data presensi ini melengkapi fitur yang sudah ada — tidak menggantikan alur lama.

### R4. Sinkronisasi ke Guru Mapel
Presensi datang siswa pada hari tersebut tersinkron ke tampilan guru mapel saat mereka membuka jurnal pembelajaran (`GuruJurnal`) — guru mapel dapat melihat daftar siswa yang sudah hadir di kelas mereka pada hari itu. Cek jadwal mengajar guru mapel untuk hari tersebut (cek tabel yang ada, misal `jadwal_pelajaran` atau serupa); tampilkan status hadir/tidak sesuai data presensi piket.

## Acceptance Criteria

### Hapus Chat
- [ ] File `src/components/ChatView.tsx` dihapus
- [ ] Tidak ada import `ChatView` yang tersisa di codebase
- [ ] Menu "Chat Guru" tidak muncul di sidebar guru maupun admin
- [ ] Build `next build` (atau `tsc --noEmit`) lulus tanpa error terkait ChatView

### QR Generate & Scan
- [ ] Ada mekanisme generate QR per siswa yang tersimpan di DB
- [ ] Halaman scan di PiketView dapat membaca QR via kamera browser
- [ ] Input hardware scanner (teks + Enter) juga memicu pencatatan presensi
- [ ] Scan berhasil mencatat presensi siswa (datang atau pulang) ke DB

### Laporan
- [ ] Daftar presensi siswa hari ini tampil di modul Piket
- [ ] Wali kelas dapat melihat laporan presensi siswa kelasnya
- [ ] Data multi-tenant terisolasi per `sekolah_id`

### Sinkronisasi Guru Mapel
- [ ] Guru mapel dapat melihat status hadir siswa di GuruJurnal pada hari mengajar mereka


## 2026-10-04T01:12:11Z

Tambahkan konfigurasi mode presensi siswa per-sekolah yang dapat diatur oleh Superadmin di SIPJAM (Next.js + Supabase, multi-tenant): setiap sekolah dapat memilih antara mode **QR Code** (scan QR piket seperti yang baru diimplementasikan) atau mode **Manual** (guru piket cek hadir/tidak satu per satu dari daftar siswa). Mode yang dipilih otomatis mengubah tampilan modul Piket dan seluruh alur presensi siswa sekolah tersebut.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

## Requirements

### R1. Kolom Konfigurasi di Tabel Sekolah
Tambahkan kolom `mode_presensi_siswa` (enum atau TEXT dengan constraint: `'qr'` atau `'manual'`, default `'qr'`) pada tabel `public.sekolah` di Supabase via migration SQL. Kolom ini adalah sumber kebenaran tunggal mode presensi untuk setiap sekolah.

### R2. UI Pengaturan di Superadmin
Superadmin dapat mengubah `mode_presensi_siswa` per sekolah melalui panel kelola sekolah di `SuperadminView.tsx` — berupa toggle atau dropdown "Mode Presensi Siswa: QR Code / Manual". Perubahan langsung tersimpan ke DB.

### R3. Mode Manual — Daftar Hadir Satu per Satu di Piket
Ketika sekolah menggunakan mode `'manual'`, modul Piket (`PiketView.tsx`) menampilkan daftar seluruh siswa (per kelas, dapat difilter) dengan tombol/checkbox hadir datang dan hadir pulang yang dicentang satu per satu oleh guru piket — menggantikan tampilan tab scanner QR. Data tetap disimpan ke tabel `presensi_siswa` yang sama dengan kolom yang sama.

### R4. Mode QR — Tetap Seperti Sekarang
Ketika sekolah menggunakan mode `'qr'`, modul Piket tetap menampilkan tab scanner QR (kamera + USB HID) seperti yang sudah diimplementasikan. Tidak ada perubahan perilaku untuk mode ini.

### R5. Propagasi Mode ke Seluruh Alur Terkait
Komponen lain yang membaca/menampilkan data presensi siswa (`RekapSiswaView.tsx`, `GuruJurnal.tsx`) tidak perlu berubah perilaku — keduanya hanya membaca tabel `presensi_siswa` yang sama. Cukup pastikan tidak ada hardcode asumsi mode QR di luar `PiketView`.

## Acceptance Criteria

### Konfigurasi DB & Superadmin
- [ ] Migration SQL menambahkan kolom `mode_presensi_siswa` ke `public.sekolah`
- [ ] Superadmin dapat mengubah mode sekolah A ke `'manual'` dan sekolah B ke `'qr'` — perubahan tersimpan di DB
- [ ] Nilai default `'qr'` berlaku untuk sekolah yang belum dikonfigurasi

### Mode Manual di Piket
- [ ] Sekolah dengan mode `'manual'`: PiketView menampilkan daftar siswa + tombol/checkbox hadir (bukan scanner QR)
- [ ] Guru piket bisa tandai datang/pulang satu per satu, data tersimpan ke `presensi_siswa`
- [ ] Filter per kelas berfungsi

### Mode QR di Piket
- [ ] Sekolah dengan mode `'qr'`: PiketView tetap menampilkan scanner seperti sebelumnya
- [ ] Scanner kamera dan USB HID tetap berfungsi

### Build & Isolasi
- [ ] `tsc --noEmit` 0 error
- [ ] `npm run build` lulus
- [ ] Data multi-tenant terisolasi per `sekolah_id` — sekolah A tidak bocor ke B


## 2026-10-04T07:00:45Z

Perbaikan aksesibilitas fitur presensi dan cetak dokumen (SIPJAM): batasi modul piket hanya untuk guru yang bertugas hari ini, batasi rekap presensi hanya untuk wali kelas, dan rapikan format cetak (hide UI buttons).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

This is a single self-contained fix; keep it small and focused.

## Requirements

### R1. Batasan Akses Modul Piket
Menu dan akses ke `PiketView.tsx` (baik presensi QR maupun Manual) hanya boleh muncul/bisa diakses jika guru yang sedang login memiliki jadwal piket pada hari ini (cek tabel database jadwal piket yang relevan). Jika bukan hari piketnya, sembunyikan menu/aksesnya.

### R2. Batasan Akses Rekapitulasi Presensi (Wali Kelas)
Rekapitulasi presensi (QR maupun Piket) hanya boleh diakses oleh Wali Kelas, dan data yang ditampilkan dikunci mutlak HANYA untuk kelas binaan wali kelas tersebut. Guru biasa yang bukan wali kelas tidak boleh melihat menu rekapitulasi presensi siswa. Pastikan view seperti `RekapSiswaView.tsx` (atau tab terkait) memberlakukan rule ini.

### R3. Format Cetak Dokumen Guru
Sesuaikan layout cetak dokumen pada view Guru agar formatnya identik dengan format di Admin. Tambahkan aturan CSS `@media print` untuk menyembunyikan tombol-tombol UI, sidebar, atau elemen interaktif (non-dokumen) saat dicetak, sehingga hasil print bersih (print-friendly).

## Acceptance Criteria

### Akses Piket
- [ ] Guru tanpa jadwal piket hari ini tidak melihat menu "Piket" atau "Scan QR".
- [ ] Guru dengan jadwal piket hari ini dapat mengakses `PiketView`.

### Akses Rekap Wali Kelas
- [ ] Guru biasa tidak memiliki akses ke tab/menu "Rekap Presensi Siswa".
- [ ] Wali Kelas dapat melihat rekap presensi, tetapi dropdown/filter kelas terkunci hanya pada kelas binaannya.

### Cetak Dokumen
- [ ] Saat fungsi print dipanggil pada dokumen di view Guru, tombol aksi (seperti "Print", "Simpan", dsb) dan UI aplikasi tidak ikut tercetak.
- [ ] Layout cetak dokumen guru sama persis dengan layout cetak dokumen admin.

### Build & Types
- [ ] `tsc --noEmit` 0 error.
- [ ] Build Next.js sukses.


## 2026-10-04T07:11:46Z

Sesuaikan hak akses modul Piket dan rekapitulasi presensi, serta perbaiki layout cetak (print) untuk modul Guru pada aplikasi SIPJAM (Next.js + Supabase).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

## Requirements

### R1. Akses Modul Piket Sesuai Jadwal
Modul Piket (termasuk fitur presensi QR & Manual) hanya boleh muncul di menu sidebar dan dapat diakses jika pengguna (Guru) memang bertugas piket pada hari ini. Anda perlu mengecek data jadwal piket/tugas tambahan guru dari database. Jika bukan hari piketnya, menu "Piket" harus disembunyikan dan routing ke view tersebut diblokir. Admin dan Superadmin tetap memiliki akses penuh.

### R2. Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel
Rekapitulasi kehadiran siswa secara menyeluruh (hasil QR maupun manual piket) HANYA boleh dilihat oleh Wali Kelas untuk kelas binaannya saja (pada modul rekapitulasi). Namun, untuk **daftar hadir siswa pada mata pelajaran yang diajar**, Guru Mapel tersebut TETAP BISA melihat status kehadiran siswa di kelas dan mapel yang sedang ia ampu (misalnya di `GuruJurnal`). Pastikan pemisahan privasi ini jelas: rekap utuh kelas hanya untuk Wali Kelas, presensi per sesi mapel terbuka untuk Guru Mapel terkait.

### R3. Penyesuaian Format Cetak Dokumen Guru & Hapus "Robot" (Kecuali Watermark)
Format cetak (print) dokumen pada modul Guru harus disesuaikan agar rapi dan sama persis strukturnya dengan format cetak dokumen di modul Admin (termasuk header, tabel, margin). Pastikan elemen "robot" (ikon bot, chat assist, atau elemen tombol UI melayang lainnya) dihilangkan secara otomatis saat proses cetak/print berlangsung (misal dengan CSS `@media print { display: none !important; }`). **CATATAN PENTING: Watermark sekolah pada setiap halaman dokumen TIDAK BOLEH dihilangkan dan harus tetap tercetak.**

### R4. Download Kartu Presensi QR Siswa (Admin)
Tambahkan fitur pada tampilan Admin (misal: di `AdminDataView`) untuk **mendownload kartu presensi** setiap siswa. Kartu ini harus memiliki desain identitas lengkap (Nama, NISN, Kelas, Nama Sekolah) dan memuat QR code unik siswa tersebut. Admin harus bisa mendownload kartu ini (misal dalam bentuk PDF atau format gambar) selain dari sekadar tombol print yang sudah ada.

## Acceptance Criteria

### Akses Piket
- [ ] Guru yang bertugas piket hari ini BISA melihat menu dan membuka modul Piket.
- [ ] Guru yang TIDAK bertugas piket hari ini TIDAK melihat menu Piket dan diblokir jika mencoba mengaksesnya secara langsung.
- [ ] Admin tetap dapat mengakses Piket kapan saja.

### Akses Rekap Presensi
- [ ] Wali Kelas bisa melihat data rekapitulasi presensi utuh khusus untuk kelas binaannya.
- [ ] Guru Mapel HANYA bisa melihat kehadiran siswa pada kelas dan mapel yang sedang ditugaskan kepadanya hari itu.
- [ ] Guru tidak bisa melihat rekapitulasi utuh dari kelas yang bukan binaannya.

### Cetak Dokumen Guru
- [ ] Saat halaman dokumen guru dicetak (`Ctrl+P` / `window.print()`), format tabel dan header sama rapinya dengan format dokumen admin.
- [ ] Tidak ada elemen "robot" atau tombol melayang yang ikut tercetak di kertas (hilang di preview cetak).
- [ ] Watermark sekolah tetap muncul dan ikut tercetak di background dokumen.

### Download Kartu Presensi (Admin)
- [ ] Admin memiliki tombol "Download Kartu" (PDF/Image) untuk setiap siswa.
- [ ] Kartu yang didownload berisi identitas lengkap siswa beserta QR code uniknya.
- [ ] Desain kartu rapi dan proporsional.

- [ ] `tsc --noEmit` lulus dengan 0 error dan `npm run build` berhasil.


## 2026-10-04T13:50:06Z

Analyze `sipjam-app` codebase. Map current application flow, menu hierarchy, and existing features. Provide actionable suggestions for improvement (UX, architecture, or missing capabilities).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Map Application Flow
Generate a Mermaid flowchart mapping all accessible routes, pages, and menu hierarchies found in the codebase.

### R2. Feature Inventory
Identify and document all major features and capabilities currently implemented.

### R3. Improvement Suggestions
Provide concrete, actionable suggestions for improving the architecture, codebase structure, or User Experience (UX).

## Acceptance Criteria

### Verification Rubric
- [ ] Report includes a syntactically valid Mermaid flowchart covering the full app flow.
- [ ] Feature inventory maps directly to existing codebase directories/files.
- [ ] Includes at least 3 distinct, actionable improvement suggestions.


## 2026-10-04T21:14:15Z

This is a single self-contained fix; keep it small and focused. Implement 4 minimal, Ponytail-style improvements to the `sipjam-app` codebase: dynamic imports in `AppScreen.tsx`, `localStorage` offline queue for Presensi, `localStorage` auto-save + canvas image compression for Jurnal KBM, and unified print CSS in `globals.css`. Do NOT add any new external dependencies.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. AppScreen Dynamic Imports
Wrap heavy views in `src/components/AppScreen.tsx` using `next/dynamic`. Do not rewrite the layout or context structure.

### R2. Presensi Offline Fallback
In `GuruPresensi.tsx`, catch network errors, save the payload + photo to `localStorage`, and use the `window.addEventListener('online', ...)` event to automatically retry sending when the connection returns. 

### R3. Jurnal Auto-Save & Compression
In `GuruJurnal.tsx`, save the form state to `localStorage` on change so it survives reloads. Use native HTML `<canvas>` to compress uploaded photos before sending.

### R4. Unified Print CSS
Move scattered print styles into `@media print` inside `globals.css` (e.g., `break-inside: avoid;`). Remove custom `<style>` blocks from print components. Do not create new wrapper components.

## Acceptance Criteria

### Verification Rubric
- [ ] No new dependencies are added to `package.json`.
- [ ] `AppScreen.tsx` uses `next/dynamic` for sub-views.
- [ ] Disconnecting the network and submitting Presensi saves data to `localStorage`; reconnecting triggers the sync logic.
- [ ] Refreshing the `GuruJurnal` page restores previously entered form data.
- [ ] The app builds successfully (`npm run build` or `tsc --noEmit`) without type errors.


## 2026-10-04T22:19:58Z

# Teamwork Project Prompt

> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
Guru presensi. Kamera khusus mode portrait. Gambar tidak auto-zoom saat diambil.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Kamera Portrait
Pastikan kamera hanya menggunakan mode portrait saat guru melakukan presensi.

### R2. Nonaktifkan Auto-zoom
Pastikan gambar yang diambil tidak mengalami auto-zoom secara otomatis.

## Acceptance Criteria

### Verifikasi Manual User
- [ ] Fitur presensi guru membuka kamera dalam orientasi portrait.
- [ ] Hasil jepretan kamera sama persis dengan preview, tanpa zoom atau pemotongan (crop) otomatis.


## 2026-10-04T23:42:41Z

# Teamwork Project Prompt

> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
Perbaikan sebelumnya gagal. Kamera presensi guru masih landscape dan masih auto-zoom. Perbaiki agar benar-benar portrait dan tidak zoom.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Kamera Benar-benar Portrait
Kamera harus dirender dan menangkap gambar dalam rasio portrait (tinggi > lebar) tanpa distorsi atau rotasi yang salah di perangkat sebenarnya, bukan sekadar set parameter `orientation` palsu.

### R2. Hentikan Auto-zoom/Crop di Level CSS dan Canvas
Gambar akhir yang diambil harus 100% identik dengan area yang terlihat di preview. Tidak boleh ada pemotongan (crop) atau zoom saat diproses.

## Acceptance Criteria

### Pengujian Bukti Kuat (Strong Verification)
- [ ] Terdapat bukti pengujian (seperti screenshot/log render dimensi) bahwa elemen video memiliki height > width.
- [ ] Terdapat script/tes UI yang memastikan kanvas hasil tangkapan memiliki rasio yang sama persis dengan elemen video.

## 2026-10-05T02:19:36Z

# Teamwork Project Prompt

> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
Presensi siswa. Mendukung QR code dan input manual. Sinkronisasi dua arah: jika QR discan, form manual terisi otomatis; jika diisi manual, form QR terupdate otomatis (jika relevan). Superadmin tidak lagi mengatur mode presensi siswa.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Sinkronisasi Dua Arah
Ketika kode QR discan, data harus otomatis mengisi form input manual. Sebaliknya, ketika pengguna mengetik data secara manual, sistem harus menyesuaikan state pencarian seolah-olah dipindai dari QR.

### R2. Hapus Pengaturan Mode Presensi oleh Superadmin
Superadmin tidak perlu lagi mengatur mode presensi siswa secara eksplisit, karena kedua mode (QR dan Manual) sekarang tersedia dan sinkron bersamaan. Hapus opsi konfigurasi ini dari UI superadmin dan logika terkait.

### R3. Pertahankan Logika Presensi Saat Ini
Mekanisme submit data presensi ke database tetap menggunakan flow yang sama, hanya pengisian field UI yang saling tersinkronisasi.

## Acceptance Criteria

### Verifikasi Manual User
- [ ] Scan QR akan membuat nama/ID siswa langsung tampil di form manual.
- [ ] Mengisi form manual akan memproses data seolah telah disubmit via QR, atau membatalkan state QR lama jika berbeda.
- [ ] Opsi pengaturan mode presensi siswa tidak lagi muncul di halaman pengaturan superadmin.


## 2026-10-05T09:55:29Z

# Teamwork Project Prompt

> Requested team: Full team

Perbaikan multi-fitur: UI piket, fix kamera QR, tambah info sidebar, dan buat tutorial lengkap.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. UI & State Modul Piket
1. Saat klik "Tandai Datang", daftar siswa tidak boleh terfilter otomatis menjadi 1 siswa saja; semua daftar harus tetap terlihat.
2. Tampilan modul piket harus dibedakan: tampilan ringkas untuk role Guru, dan tampilan detail untuk role Admin.

### R2. Perbaikan Kamera QR
Perbaiki bug kamera QR code yang tidak muncul, sehingga fitur scan QR dapat digunakan kembali.

### R3. Update Sidebar & Tutorial
1. Sidebar menu harus menampilkan nama dan role dari akun yang sedang login.
2. Sediakan tutorial yang lengkap (baik berupa panduan tertulis dalam app atau file dokumentasi) untuk semua menu dan fitur per role.

## Acceptance Criteria

### Verifikasi Manual User
- [ ] Daftar siswa tetap utuh setelah klik "Tandai Datang".
- [ ] Kamera QR berfungsi normal.
- [ ] Modul piket guru terlihat ringkas, admin terlihat detail.
- [ ] Sidebar menampilkan nama dan role.
- [ ] Terdapat tutorial lengkap yang dapat diakses.

## 2026-10-08T11:11:29Z

# Teamwork Project Prompt — Final

A comprehensive update to the teacher's account in sipjam-app, including reminder notifications, camera/storage standardizations, complex attendance flows with admin verification, student attendance synchronization, and academic calculations for Kurikulum Merdeka.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. UI/UX and Camera Updates
- Implement a 30-minute snooze for auto-notifications (toggleable by teacher).
- Remove print orientation settings (rely on browser print dialog).
- Lock camera ratios to 4:3 (portrait for attendance, landscape for KBM journal) and optimize/upload directly to Google Drive.
- Ensure seamless responsiveness across desktop and mobile.

### R2. Teacher Attendance & Admin Verification
- Implement multi-state arrival/departure flows ("Hadir di Sekolah" vs "Dinas Luar").
- Implement auto-checkout flagging for forgotten checkouts.
- Route sick (>=3 days) and leave (>3 days) requests to an Admin dashboard for pending approval.
- Auto-attach GPS coordinates to printed documents, with alerts if GPS is blocked.

### R3. Student Attendance & Piket Flow
- Enforce role-based access to student attendance (Mapel, Wali Kelas, Piket).
- Synchronize arrival attendance from Piket/Wali Kelas to Mapel, with truancy detection.
- Implement concurrency locks for Piket forms to prevent double data entry.

### R4. Academic Updates
- Implement Kurikulum Merdeka calculations, including Capaian Pembelajaran descriptions.
- Add a "Rapor" menu specifically for Wali Kelas.
- Update in-app tutorials to reflect all new flows.

## Acceptance Criteria

### E2E Testing & Verification
- [ ] Must write or update existing E2E tests (in `tests/e2e/`) to programmatically verify the 30-minute snooze functionality.
- [ ] Must write an E2E test verifying that the teacher attendance flow correctly transitions states (e.g., "Dinas Luar" check-in to check-out) and routes long-term sick/leave to the Admin dashboard.
- [ ] Must write a programmatic test to verify the concurrency lock: simulating two Piket users accessing the student attendance form simultaneously should lock one out.
- [ ] Must write a test asserting that student truancy is automatically flagged when Piket marks "Hadir" but Mapel marks "Alpa".
- [ ] Must write unit or integration tests validating the Kurikulum Merdeka calculation logic and verifying the Wali Kelas "Rapor" menu visibility.
- [ ] All new and existing tests must pass locally before the task is considered complete.

## 2026-10-09T23:03:55Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small focused team (This is a single self-contained fix; keep it small and focused.)

Tambahkan pengaturan khusus untuk fitur pengingat otomatis di halaman pengaturan akun, dan perbaiki bug di mana kotak pengingat (floating reminder) muncul terus-menerus meskipun sudah ditunda selama 30 menit.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Pengaturan Pengingat
Tambahkan antarmuka pengaturan untuk fitur pengingat otomatis di dalam halaman pengaturan akun.

### R2. Perbaikan Logika Tunda (Snooze)
Ubah logika penundaan (snooze) agar saat pengguna menunda selama 30 menit, kotak melayang (floating reminder) benar-benar tersembunyi dan tidak muncul kembali selama durasi tersebut.

## Acceptance Criteria

### Verifikasi Programmatik / Fungsional
- [ ] Pengaturan pengingat muncul di halaman akun dan state perubahannya tersimpan.
- [ ] Ketika tombol tunda (snooze) diklik, kotak melayang langsung hilang.
- [ ] Me-refresh halaman atau berpindah halaman di dalam durasi 30 menit setelah penundaan tidak akan memunculkan kembali kotak melayang.


## 2026-10-10T10:25:07Z

Aplikasi SIPJAM (Sistem Informasi Presensi & Jurnal Mengajar) adalah PWA berbasis Next.js 16 + Supabase untuk manajemen presensi guru dan jurnal mengajar di lingkungan multi-sekolah. Lakukan perbaikan yang telah diidentifikasi — dari isu keamanan kritis (hardcoded password, duplikasi auth) hingga bug korektif (isGuru check, realtime channel scoping) dan optimasi performa (preconnect CDN, connectivity test once-flag, pemecahan komponen besar) — menggunakan pendekatan ponytail: solusi paling minimal yang berfungsi, tanpa menambah dependency baru.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

---

## Konteks Aplikasi

- **Stack:** Next.js 16.3.4, React 19, TypeScript, Supabase JS v2, TailwindCSS v4, SweetAlert2, web-push
- **Autentikasi:** Custom session via RPC `verify_login` → `sipjam_user` di localStorage (bukan Supabase Auth built-in)
- **Multi-tenant:** Setiap sekolah punya `sekolah_id`; tenant context dikirim via custom request headers
- **Peran:** Superadmin, Admin (per-sekolah), Guru
- **Test runner:** `tsx` — jalankan dengan `npm test`

---

## Requirements

### R1. Keamanan: Hapus Hardcoded Credentials

File `src/app/api/attendance/route.ts` memiliki password Superadmin dalam plaintext sebagai fallback. Pindahkan ke environment variable `SUPERADMIN_API_PASSWORD` di `.env.local`. Jika env var tidak tersedia, fungsi `resolveSessionToken` cukup return `null` tanpa mencoba auto-login.

### R2. Hapus Duplikasi Auth State

Komponen `Home()` di `src/app/page.tsx` memanggil `supabase.auth.getSession()` dan mendengarkan `onAuthStateChange`, namun hasilnya tidak pernah digunakan — `MainApp` hanya membaca `sipjam_user` dari localStorage. Hapus seluruh auth check di `Home()` dan render `MainApp` langsung (dengan loading state minimal jika diperlukan).

### R3. Fix Bug isGuru di HomeView

Di `src/components/HomeView.tsx` baris 78, `const isGuru = user?.role !== 'Admin'` menyebabkan Superadmin (role === 'Superadmin') dianggap sebagai Guru, yang bisa menampilkan UI yang salah. Perbaiki agar `isGuru = !isAdmin`, konsisten dengan pola di `AppScreen.tsx`:
```ts
const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
const isSuperadmin = role === 'superadmin';
const isAdmin = isSuperadmin || role === 'admin';
const isGuru = !isAdmin;
```

### R4. Scope Realtime Channel per Sekolah di AdminVerifView

Di `src/components/AdminVerifView.tsx`, channel names `'verif-presensi'`, `'verif-jurnal'`, `'verif-piket'` tidak unik per sekolah. Admin dari dua sekolah berbeda yang membuka halaman ini secara bersamaan akan saling trigger reload. Perbaiki dengan menambahkan `sekolah_id` ke nama channel:
```ts
supabase.channel(`verif-presensi-${user?.sekolah_id || 'global'}`)
```
Lakukan untuk ketiga channel.

### R5. Tambah AppUser Interface

Buat file `src/types/user.ts` dengan interface `AppUser` yang mendefinisikan shape dari user object yang dipakai di seluruh komponen. Ganti `user: any` di setidaknya komponen utama: `AppScreen.tsx`, `HomeView.tsx`, `LoginScreen.tsx`, dan `GuruPresensi.tsx`. Jangan ganti semua sekaligus — prioritaskan komponen yang paling banyak mengakses field user.

```ts
// src/types/user.ts
export interface AppUser {
  id: string;
  username: string;
  nama: string;
  role: string;
  sekolah_id: string;
  session_token: string;
  avatar?: string | null;
  wali_kelas?: string | { kelas: string } | null;
}
```

### R6. Extract Hooks dari AppScreen.tsx

`AppScreen.tsx` (1101 baris) memiliki terlalu banyak concern. Extract logic berikut ke custom hooks di `src/hooks/`:

- `useSessionSync(user, onLogout, onUserUpdate)` — idle revalidation (baris 77–162)
- `useWaliKelas(user, isAdmin, syncKey)` — cek wali kelas (baris 210–264)
- `usePiket(user, isAdmin, isSuperadmin, syncKey)` — cek piket (baris 266–291)
- `useBroadcasts(user, isAdmin, isWaliKelas, syncKey)` — pengumuman realtime (baris 316–421)

`AppScreen.tsx` kemudian consume keempat hooks tersebut. **Jangan ubah behavior** — hanya pindahkan logic.

### R7. Split HomeView menjadi Dua Komponen

`HomeView.tsx` (1831 baris) mencakup dua dashboard berbeda dalam satu file. Pisahkan menjadi:
- `src/components/HomeViewGuru.tsx` — dashboard khusus Guru
- `src/components/HomeViewAdmin.tsx` — dashboard khusus Admin
- `src/components/HomeView.tsx` — wrapper kecil yang memilih komponen berdasarkan role

Import path yang ada tidak perlu berubah — hanya `HomeView.tsx` yang terlihat dari luar.

### R8. Tambah preconnect Font Awesome di layout.tsx

Di `src/app/layout.tsx`, tambahkan `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` sebelum tag `<link rel="stylesheet" ...>` Font Awesome, untuk mengurangi latency pertama kali Font Awesome dimuat.

### R9. Fix Connectivity Test Supabase — Once-Flag

Di `src/lib/supabaseClient.ts`, blok connectivity test di baris 214–227 dijalankan setiap kali module diimport. Tambahkan `once` flag:

```ts
let _connectivityChecked = false;
if (typeof window !== 'undefined' && !_connectivityChecked) {
  _connectivityChecked = true;
  supabase.from('sekolah').select('id').limit(1).then(...)
}
```

### R10. Investigasi dan Bersihkan Dead Code sync-spreadsheet

Direktori `src/app/api/sync-spreadsheet/` ada tapi tidak memiliki `route.ts`. Jika ini benar-benar dead code, hapus direktori-nya. Jika ada file route di dalamnya, pastikan tidak ada TypeScript error. Laporan temuan harus disebutkan dalam commit message.

---

## Acceptance Criteria

### Keamanan
- [ ] Tidak ada string literal password hardcoded di source code: `grep -r 'SipjamSuperAdmin' src/` harus return kosong
- [ ] File `.env.local` memiliki entry `SUPERADMIN_API_PASSWORD`

### Korektifitas
- [ ] `npm test` berhasil (exit code 0) setelah semua perubahan diterapkan
- [ ] `npm run build` berhasil tanpa TypeScript error
- [ ] `grep -n 'supabase.auth' src/app/page.tsx` harus kosong setelah R2
- [ ] Nama channel realtime di `AdminVerifView.tsx` mengandung `sekolah_id`: `grep "verif-presensi'" src/components/AdminVerifView.tsx` harus kosong

### Arsitektur
- [ ] File `src/types/user.ts` ada dan mengekspor `AppUser`
- [ ] Keempat hooks ada: `src/hooks/useSessionSync.ts`, `useWaliKelas.ts`, `usePiket.ts`, `useBroadcasts.ts`
- [ ] `AppScreen.tsx` mengimport keempat hooks tersebut
- [ ] `src/components/HomeViewGuru.tsx` dan `HomeViewAdmin.tsx` ada
- [ ] `HomeView.tsx` setelah split lebih kecil dari 200 baris

### Performa & Kebersihan
- [ ] `src/app/layout.tsx` memiliki `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />`
- [ ] `src/lib/supabaseClient.ts` memiliki once-flag untuk connectivity test
- [ ] Commit telah dilakukan: `git status` menunjukkan working tree clean

---

## Panduan Implementasi

- **Ponytail:** Minimal diff yang berfungsi. Jangan tambah abstraksi baru selain yang diminta.
- **Urutan yang disarankan:** R1 → R2 → R3 → R4 → R8 → R9 → R10 → R5 → R6 → R7
- **Test setelah setiap kelompok:** Jalankan `npm test` dan `npm run build` setelah R1-R4, kemudian lagi setelah R5-R7.
- **Commit setelah selesai:** `git add . && git commit -m "ponytail: security fix, bug fixes, refactor & perf improvements" && git push origin main`
- **Jangan install dependency baru** — gunakan hanya yang sudah ada di `package.json`

## 2026-10-10T22:56:05Z

Rombak ulang modul daftar nilai (GradebookView) pada aplikasi SIPJAM (Next.js + Supabase) agar mengikuti alur CP → TP → Asesmen (Diagnostik/Formatif/Sumatif) → Nilai Akhir. Hierarki: CP adalah payung di atas TP (tabel baru `capaian_pembelajaran`). Formula nilai akhir mapel = 40% kehadiran + 30% rata-rata formatif + 30% rata-rata sumatif; bobot ini bisa diubah oleh Admin dan berlaku per sekolah (disimpan di tabel `pengaturan`). Diagnostik tidak masuk perhitungan nilai, hanya sebagai catatan diagnostik guru.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Context Codebase

- Stack: Next.js 15 (App Router, `'use client'`), Supabase (PostgreSQL + RLS), Tailwind CSS, SweetAlert2
- File utama: `src/components/GradebookView.tsx` (2814 baris)
- Tabel DB yang sudah ada: `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`, `absensi`, `pengaturan`, `guru_mapel`
- Tabel yang perlu ditambah: `capaian_pembelajaran`
- Kolom yang perlu ditambah: `keterangan` di `asesmen_kolom`; bobot nilai di `pengaturan` (key: `bobot_nilai_mapel` → JSON `{ kehadiran: 40, formatif: 30, sumatif: 30 }`)
- Tipe yang sudah ada: `TujuanPembelajaran`, `AsesmenKolom`, `NilaiSiswa` di `src/types/database.ts`

## Requirements

### R1. Hierarki CP → TP di UI
Guru melihat dan mengelola CP (Capaian Pembelajaran) terlebih dahulu sebelum bisa menambahkan TP. Satu CP bisa memiliki banyak TP. CP tersimpan di tabel baru `capaian_pembelajaran` yang berelasi ke `guru_mapel`.

### R2. Asesmen per TP dengan tipe dan keterangan
Setiap TP memiliki tiga jenis asesmen: Diagnostik (dibatasi maks. 1 per TP — validasi di UI & DB), Formatif (min. 1), Sumatif (min. 1). Setiap asesmen memiliki field keterangan bebas yang tersimpan di kolom `keterangan` pada tabel `asesmen_kolom`.

### R3. Formula Nilai Akhir
Nilai akhir mapel = (bobot_kehadiran × rata kehadiran) + (bobot_formatif × rata formatif) + (bobot_sumatif × rata sumatif), di mana rata kehadiran dihitung dari data absensi siswa di mapel tersebut. Asesmen Diagnostik tidak masuk perhitungan. Rekap semester dan data rapor menggunakan formula ini.

### R4. Pengaturan Bobot (Admin Only)
Admin dapat mengubah persentase bobot (kehadiran/formatif/sumatif) melalui form pengaturan. Total harus selalu 100% (validasi). Bobot tersimpan di tabel `pengaturan` sebagai key `bobot_nilai_mapel` (value: JSON string) dan berlaku untuk seluruh sekolah.

### R5. Migrasi Database & Tipe
Sediakan SQL migration untuk tabel `capaian_pembelajaran` dan kolom baru `keterangan` di `asesmen_kolom`. Perbarui `src/types/database.ts` agar sinkron. Gunakan prinsip ponytail: sesedikit mungkin perubahan skema yang masih cukup untuk fitur ini.

## Acceptance Criteria

### Database
- [ ] Tabel `capaian_pembelajaran` tersedia dengan kolom: `id`, `sekolah_id`, `guru_mapel_id`, `kode_cp`, `deskripsi`, `semester`, `tahun_ajaran`, timestamps
- [ ] Kolom `keterangan` ada di `asesmen_kolom`
- [ ] Baris di `pengaturan` dengan key `bobot_nilai_mapel` dapat disimpan dan dibaca (value: JSON `{ kehadiran, formatif, sumatif }`)

### Alur Input Guru
- [ ] Guru dapat menambah/edit/hapus CP dari UI tanpa error
- [ ] Guru dapat menambah TP di bawah CP yang dipilih
- [ ] Untuk setiap TP: form asesmen menolak penambahan Diagnostik ke-2 (validasi di UI)
- [ ] Formatif dan Sumatif dapat ditambah lebih dari satu
- [ ] Field keterangan tersedia dan tersimpan untuk setiap asesmen

### Perhitungan Nilai Akhir
- [ ] Nilai akhir mapel = (bobot_kehadiran × rata kehadiran) + (bobot_formatif × rata formatif) + (bobot_sumatif × rata sumatif)
- [ ] Asesmen Diagnostik tidak masuk perhitungan nilai akhir
- [ ] Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan `-` / null (tidak error)

### Pengaturan Bobot (Admin)
- [ ] Form pengaturan bobot hanya tampil untuk role Admin/Superadmin
- [ ] Validasi: total bobot harus = 100% sebelum bisa disimpan
- [ ] Bobot yang tersimpan ter-load saat halaman dibuka kembali

### Rekap & Rapor
- [ ] Tab rekap semester menampilkan nilai akhir dari formula baru
- [ ] Tidak ada regresi: fitur print, analitik, dan rekap siswa tetap berfungsi

## 2026-10-12T11:02:49Z

This is a single self-contained fix; keep it small and focused.

Sesuaikan aplikasi SIPJAM agar seluruh lini transaksi data (presensi, jurnal, piket, nilai) beroperasi secara online langsung ke cloud Supabase tanpa antrean offline lokal, dengan pengecualian khusus: Asisten AI tetap dipertahankan dalam mode 100% offline (FAQ lokal & knowledge base statis tanpa dependensi API eksternal). Implementasi harus menerapkan prinsip Ponytail (solusi paling efisien, ringkas, tanpa over-engineering, diff seminimal mungkin).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Online-Only Cloud Transaction Enforcement
Seluruh pencatatan dan submission data operasional (khususnya Presensi Guru di `src/components/GuruPresensi.tsx`, Jurnal Pembelajaran, Presensi Siswa/Piket, Nilai) wajib terkirim langsung secara online ke Supabase. Hapus atau nonaktifkan mekanisme antrean offline lokal (`sipjam_offline_presensi`, `sipjam_offline_presensi_queue`). Jika perangkat terputus dari internet saat mencoba menyimpan/mengirim data, tampilkan peringatan interaktif kepada pengguna bahwa koneksi internet aktif diwajibkan untuk menyimpan transaksi.

### R2. Offline AI Assistant Preservation
Pertahankan arsitektur Asisten AI SIPJAM (`src/components/AIAssistant/`) tetap dalam mode 100% offline (menggunakan fuzzy matcher & knowledge base statis lokal, tanpa panggilan jaringan / API eksternal) sesuai indikator "100% Offline FAQ" yang sudah ada. Jaga agar tidak ada API network call yang ditambahkan ke modul AI.

### R3. Liveness, Network Status & Clean Error Handling
Pastikan deteksi status koneksi dan penanganan error jaringan berjalan konsisten dan jelas, memberikan feedback langsung kepada user tanpa meninggalkan data tertahan di antrean lokal yang berpotensi menimbulkan desinkronisasi.

## Acceptance Criteria

### Online Data Transactions
- [ ] Submisi presensi di `GuruPresensi.tsx` tidak lagi menyimpan antrean offline ke `localStorage` (`sipjam_offline_presensi` / `sipjam_offline_presensi_queue`) saat offline.
- [ ] Saat perangkat offline, aplikasi memberikan peringatan/pesan interaktif bahwa koneksi internet aktif diperlukan untuk menyimpan data.
- [ ] Seluruh data transaksi (presensi, jurnal, piket) langsung berkomunikasi ke Supabase cloud.

### AI Assistant Offline Purity
- [ ] Komponen Asisten AI tetap beroperasi 100% offline tanpa network call eksternal.
- [ ] Test suite `ai_assistant_faq.test.ts` tetap valid dan lulus 100%.

### Verification & Quality
- [ ] Disesuaikan test suite otomatis untuk memverifikasi penegakan mode online pada transaksi data dan retensi offline pada AI assistant.
- [ ] Seluruh pengujian automated test (`npm test`) berjalan dan lulus 100% tanpa regresi.


## 2026-10-13T06:37:36Z

This is a single self-contained feature; keep it small and focused.

Bangun fitur **Portal Induk Jaringan Multi-Sekolah dengan Akses Superadmin Tunggal (Single Sign-On / School Switcher)** pada aplikasi SIPJAM. Fitur ini memungkinkan 1 akun Superadmin (1 username & password master) untuk login satu kali dan langsung memantau serta mengelola seluruh sekolah satelit tanpa perlu login berulang kali.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Unified Master Superadmin Authentication
Satu akun kredensial Superadmin (username: `superadmin` dengan master password) dapat mengautentikasi dan mengelola seluruh database sekolah satelit:
- Di portal pusat, Superadmin login satu kali.
- Sistem menyediakan dropdown / tombol **"Ganti Sekolah yang Dipantau"** di dashboard Superadmin.
- Saat berganti sekolah, client secara dinamis beralih ke instance Supabase sekolah yang dipilih tanpa memaksa user login ulang.

### R2. Central School Registry Management
Superadmin dapat mendaftarkan dan mengelola daftar sekolah satelit (ID, Nama Sekolah, NPSN, Kota/Kabupaten, Vercel Web URL, Supabase URL, dan Supabase Anon Key) secara terpusat di tabel pengaturan atau database registry dengan RLS ketat (hanya Superadmin yang bisa mengakses).

### R3. Tab "Jaringan Sekolah" pada SuperadminView
Tambahkan tab/menu navigasi baru bernama **"Jaringan Sekolah"** pada src/components/SuperadminView.tsx:
- Tampilan kartu/tabel daftar seluruh sekolah satelit yang terdaftar.
- Indikator status live database (Online / Ter-pause).
- Ringkasan metrik real-time per sekolah (jumlah guru aktif, jumlah siswa).
- Tombol aksi: **"Kelola Sekolah Ini"** (mengaktifkan mode pemantauan aktif untuk sekolah tersebut) dan **"Buka Web Vercel"** (membuka web sekolah di tab baru).
- Form modal untuk Tambah, Edit, dan Hapus Sekolah dari jaringan monitoring.

### R4. Dynamic Client-Side Scope Switching
Buat helper pada src/lib/supabaseClient.ts yang memungkinkan Superadmin beralih target koneksi Supabase (`activeTargetSchool`) secara dinamis di level browser (localStorage/memory context), sehingga komponen dashboard admin, guru, dan siswa dapat membaca dan memanipulasi data sekolah yang sedang dipilih secara real-time.

## Acceptance Criteria

### Functional Verification
- [ ] Superadmin login 1 kali di halaman portal dengan username `superadmin` dan password master.
- [ ] Di dashboard Superadmin, tersedia tab "Jaringan Sekolah" dan dropdown pemilih sekolah aktif.
- [ ] Memilih sekolah X otomatis mengubah konteks data yang ditampilkan ke database sekolah X tanpa error autentikasi.
- [ ] Superadmin dapat menambah sekolah baru (Nama, NPSN, URL Vercel, Supabase URL, Anon Key) dan data langsung tersimpan.
- [ ] Terdapat tombol satu-klik untuk membuka website sekolah di tab baru.
- [ ] Guru dan Admin lokal tidak dapat melihat atau mengakses fitur pergantian sekolah satelit ini (isolasi RBAC terjaga).

### Programmatic & Quality Verification
- [ ] Lolos verifikasi tipe TypeScript tanpa error sama sekali (`npx tsc --noEmit`).
- [ ] Lolos build produksi Next.js secara bersih tanpa warning fatal (`npm run build`).
- [ ] Mematuhi aturan Git Workflow proyek per `GEMINI.md` (otomatis stage, commit deskriptif, dan push ke branch `main`).


## 2026-10-13T11:04:58Z

Server restarted. Please resume the workflow for swe_19 (Reviewer Round 3, Victory Auditor, final verification, and completion).


## 2026-10-13T12:15:08Z

This is a single self-contained cleanup and removal; keep it small and focused.

Hapus dan bersihkan seluruh fitur, tab, dan modal usang (*obsolete*) pada role Superadmin yang sudah tidak diperlukan lagi akibat transisi ke arsitektur **Jaringan Sekolah Satelit & Multi-School Switcher**.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Remove Obsolete "Kelola Sekolah" & "Admin Sekolah" Tabs
- Hapus tab **"Kelola Sekolah"** (`sekolah`) dan **"Admin Sekolah"** (`admins`) dari navigasi tab di src/components/SuperadminView.tsx.
- Hapus menu navigasi `view-superadmin-sekolah` dan `view-superadmin-admins` dari `menuItemsSuperadmin` di src/components/AppScreen.tsx.
- Struktur navigasi Superadmin disederhanakan menjadi 2 tampilan utama yang relevan:
  1. **Ringkasan Platform** (`overview`)
  2. **Jaringan Sekolah** (`jaringan`)

### R2. Strip Redundant Legacy Modals & Handlers
- Hapus modal dan handler pembuatan sekolah lokal lama (`showAddSchoolModal`, `showEditSchoolModal`, `handleToggleSchoolStatus`) yang menyisipkan data langsung ke `public.sekolah` lokal.
- Hapus modal dan handler pembuatan akun admin lokal lama (`showAddAdminModal`, `showEditAdminModal`, `handleResetAdminPassword`) yang memanipulasi `public.users` lokal.
- Hapus seluruh state dan filter yang tidak lagi digunakan (`adminList`, `adminSearch`, `cityFilter`, `statusFilter`).

### R3. Align Overview Tab to Jaringan Sekolah
- Sesuaikan kartu statistik dan widget aksi cepat pada tab **Overview** di src/components/SuperadminView.tsx agar merujuk ke data **Jaringan Sekolah Satelit** (`satelliteSchools`), status koneksi live database, serta total guru & siswa lintas jaringan.
- Ganti pintasan "Buat Akun Admin Sekolah" dan "Kelola Daftar Sekolah" dengan pintasan langsung ke "Tambah Sekolah Satelit" dan "Periksa Status Live Database".

## Acceptance Criteria

### Functional Verification
- [ ] Di dashboard Superadmin (`SuperadminView.tsx`), hanya terdapat 2 tab bersih: **Ringkasan Platform** dan **Jaringan Sekolah**.
- [ ] Di menu sidebar/drawer Superadmin (src/components/AppScreen.tsx), menu "Kelola Sekolah" dan "Admin Sekolah" sudah tidak ada lagi.
- [ ] Tab Overview menampilkan ringkasan data satelit yang akurat tanpa mengacu ke tabel admin/sekolah lokal lama.
- [ ] Pengelolaan sekolah satelit (tambah, edit, hapus, live ping, dan switch target) di tab "Jaringan Sekolah" tetap berfungsi 100% normal tanpa regresi.

### Programmatic & Quality Verification
- [ ] Seluruh suite pengujian otomatis lulus (`npm test`).
- [ ] Lolos verifikasi tipe TypeScript tanpa error (`npx tsc --noEmit`).
- [ ] Lolos build produksi Next.js secara bersih (`npm run build`).
- [ ] Perubahan di-stage, di-commit dengan pesan deskriptif, dan di-push ke branch `main` per `GEMINI.md`.


## 2026-10-13T18:24:08Z

This is a single self-contained fix; keep it small and focused.
Mengganti mekanisme presensi Dinas Luar pada guru: dari upload dokumen (Surat Tugas) menjadi pengambilan foto lokasi langsung melalui kamera lengkap dengan watermark waktu & koordinat GPS/lokasi, tanpa batasan radius lokasi dari sekolah.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Presensi Dinas Luar Menggunakan Kamera Foto Lokasi
Pada `src/components/GuruPresensi.tsx`, presensi tipe "Dinas Luar" (baik Datang maupun Pulang) tidak lagi menampilkan form upload dokumen (`<input type="file">`). Sebagai gantinya, gunakan `CameraSelfieCapture` yang mengambil foto kamera langsung dengan watermark waktu, nama guru, koordinat GPS, dan nama lokasi.

### R2. Tanpa Batasan Radius Lokasi
Presensi "Dinas Luar" bebas dari pembatasan radius GPS sekolah (`gps_radius`), sehingga guru dapat melakukan presensi dinas luar dari lokasi mana pun. Koordinat GPS dan alamat tetap tercatat dan ditampilkan pada data presensi. Status verifikasi langsung 'Diverifikasi' tanpa peringatan 'Di Luar Jangkauan'.

### R3. Transisi State Presensi Tanpa Hambatan
Sesuaikan logika `togglePresensiFields` dan `handleTipeAbsenChange` agar "Dinas Luar" dikategorikan sebagai presensi berbasis kamera (sama seperti "Sekolah"), sehingga perpindahan jenis presensi antara Sekolah dan Dinas Luar tidak memunculkan dialog peringatan pergantian foto/dokumen.

### R4. Folder Routing & Upload Google Drive
Pastikan foto Dinas Luar tetap diarahkan ke folder Google Drive `Presensi_DinasLuar` dengan penyimpanan link bukti yang tepat.

## Acceptance Criteria

### Fungsionalitas & Logika
- [ ] Memilih "Dinas Luar" memunculkan kamera `CameraSelfieCapture` (bukan input upload file surat tugas).
- [ ] Presensi Dinas Luar tidak dibatasi radius GPS (`gpsConfig.radius`) dan tidak memunculkan toast "Di Luar Jangkauan".
- [ ] Pergantian antara "Sekolah" dan "Dinas Luar" mempertahankan foto yang telah diambil tanpa peringatan salah tipe lampiran.
- [ ] Upload foto presensi Dinas Luar diarahkan ke folder `Presensi_DinasLuar`.

### Verifikasi & Integritas
- [ ] Seluruh automated test suite (`npm test`) lulus 100%.
- [ ] Kode ringkas, minimal, tepat sasaran (prinsip Ponytail) tanpa abstraksi tambahan.


## 2026-10-13T19:43:14Z

This is a single self-contained fix; keep it small and focused.

Otomatisasi verifikasi presensi guru, jurnal pembelajaran, dan laporan piket secara real-time saat pengajuan dibuat di aplikasi SIPJAM, dengan mempertahankan antrean persetujuan manual untuk pengajuan bersyarat khusus.

Working directory: c:/Users/Fitra/OneDrive/Documents/sipjam-app
Integrity mode: demo

## Requirements

### R1. Otomatisasi Verifikasi Presensi Guru
Sistem secara otomatis menetapkan status verifikasi `Disetujui` saat presensi diajukan jika memenuhi kriteria kehadiran normal (berada dalam radius sekolah atau dinas luar valid, serta izin/sakit singkat). Pengajuan yang memerlukan persetujuan admin (sakit >= 3 hari, izin > 3 hari, atau di luar radius) tetap berstatus `Menunggu`.

### R2. Otomatisasi Verifikasi Jurnal Pembelajaran
Sistem secara otomatis menetapkan status verifikasi `Disetujui` saat jurnal pembelajaran dikirim jika kelengkapan data wajib (materi, kegiatan, absensi siswa) terpenuhi dan bukti foto kegiatan terlampir. Jurnal yang tidak memenuhi kelengkapan tetap berstatus `Menunggu`.

### R3. Otomatisasi Verifikasi Laporan Piket
Sistem secara otomatis menetapkan status verifikasi `Disetujui` saat laporan piket diserahkan jika rekap absen kelas terisi dan bukti foto apel/kegiatan piket terlampir. Laporan yang belum lengkap tetap berstatus `Menunggu`.

### R4. Kompatibilitas Admin Dashboard & Penolakan Manual
Halaman Admin Verifikasi tetap dapat menampilkan filter pengajuan ('Semua', 'Menunggu', 'Disetujui', 'Ditolak') dan memberikan hak kepada Admin untuk membatalkan/menolak (`Ditolak`) dengan catatan alasan penolakan, serta menyetujui manual pengajuan yang berstatus `Menunggu`.

## Acceptance Criteria

### Automated Verification Logic
- [ ] Presensi kehadiran normal dalam radius atau izin/sakit singkat otomatis tersimpan dengan `status_verifikasi = 'Disetujui'`.
- [ ] Presensi izin > 3 hari atau sakit >= 3 hari (`memerlukan_persetujuan_admin = true`) tetap tersimpan dengan `status_verifikasi = 'Menunggu'`.
- [ ] Jurnal pembelajaran dengan materi, kegiatan, absensi siswa, dan bukti foto lengkap otomatis tersimpan dengan `status_verifikasi = 'Disetujui'`.
- [ ] Laporan piket dengan rekap absensi kelas dan bukti foto lengkap otomatis tersimpan dengan `status_verifikasi = 'Disetujui'`.
- [ ] Admin pada AdminVerifView tetap dapat meninjau, menyetujui manual pengajuan yang berstatus `Menunggu`, atau menolak pengajuan apa pun dengan alasan penolakan.
- [ ] Validasi build dan typecheck (`npx tsc --noEmit` & `npm run build`) berhasil tanpa error.

## 2026-10-14T09:47:40Z

This is a single self-contained fix; keep it small and focused.

Perbaiki aturan kehadiran guru agar opsi wajib hadir hanya pada hari mengajar berfungsi secara akurat tanpa error maupun bug di seluruh modul (workflow, presensi, dashboard admin, kalkulasi alpa otomatis, dan notifikasi pengingat), serta lakukan eliminasi file dan kode komponen usang yang sudah tidak dipakai.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Keandalan Aturan Kehadiran Guru "Wajib Hadir Hanya Hari Mengajar"
- Menyelaraskan status guru pada hari tanpa jadwal mengajar di seluruh alur sistem (`src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/components/HomeViewAdmin.tsx`, `src/components/HomeViewGuru.tsx`, dan `src/app/api/push/send-reminders/route.ts`).
- Untuk guru dengan `wajib_hadir_hanya_mengajar = true` atau saat kebijakan global `aturan_kehadiran_guru = 'Hari_Mengajar_Saja'`:
  1. Pada hari tanpa jadwal mengajar dan tidak ada tugas piket: guru dibebaskan dari kewajiban presensi (`isNonTeachingDay: true`, `bebasAlpa: true`, `isAlpa: false`), tidak dikenai Alpa otomatis di `attendanceAlpa.ts`, dan tidak dikirimi notifikasi tagihan presensi/jurnal.
  2. Jika ditugaskan piket pada hari tanpa jam mengajar: guru tetap memiliki kewajiban hadir untuk menjalankan tugas piket.
  3. Jika guru hadir ke sekolah secara sukarela pada hari tanpa jadwal mengajar (melakukan Presensi Datang): guru dapat melakukan Presensi Pulang secara normal tanpa terblokir oleh tagihan jurnal KBM fiktif.
  4. Dashboard Admin (`HomeViewAdmin.tsx`) dan tampilan Guru (`HomeViewGuru.tsx`) konsisten menampilkan status bebas kehadiran/bebas mengajar tanpa anomali data.

### R2. Eliminasi File dan Fitur Usang (Dead & Obsolete Code Cleanup)
- Menghapus file komponen yatim yang sudah tidak di-mount dan tidak memiliki rute navigasi di aplikasi:
  - `src/components/AdminMonitorView.tsx`
  - `src/components/NotificationPermissionModal.tsx`
  - `src/components/PushNotificationPrompt.tsx`
- Membersihkan referensi/kode peninggalan usang (seperti antrean offline / sisa variabel legacy) secara bersih tanpa memengaruhi kestabilan transaksi cloud Supabase.
- Memperbarui file test terkait agar tidak gagal saat memverifikasi file yang telah dihapus.

### R3. Otomatisasi Verifikasi Pengujian
- Buat file tes verifikasi otomatis (misal `tests/wajib_hadir_dan_pembersihan_usang.test.ts`) yang memvalidasi seluruh kondisi R1 dan R2 secara menyeluruh.
- Seluruh suite tes yang terdaftar pada `package.json` (`npm test`) harus tetap berjalan 100% PASS.

## Acceptance Criteria

### Aturan Kehadiran Hari Mengajar (R1)
- [ ] Guru yang dikecualikan (exempt) pada hari tanpa jadwal KBM dan tanpa piket memperoleh status `isNonTeachingDay: true`, `bebasAlpa: true`, dan `isAlpa: false`.
- [ ] `attendanceAlpa.ts` tidak memasukkan record Alpa untuk guru exempt pada hari tanpa jadwal mengajar & tanpa piket.
- [ ] Guru exempt yang melakukan presensi datang sukarela dapat membuka dan mengirimkan presensi pulang tanpa terblokir oleh validasi jurnal KBM.
- [ ] Jika guru exempt memiliki tugas piket hari ini, sistem tetap mendeteksi kewajiban piket dan mengharuskan presensi datang.
- [ ] `send-reminders/route.ts` tidak mengirimkan push reminder pengingat presensi atau jurnal KBM ke guru exempt pada hari tanpa jadwal mengajar.

### Pembersihan Kode Usang (R2)
- [ ] File `src/components/AdminMonitorView.tsx`, `src/components/NotificationPermissionModal.tsx`, dan `src/components/PushNotificationPrompt.tsx` berhasil dihapus.
- [ ] Tidak ada broken import atau runtime error di seluruh aplikasi akibat penghapusan file tersebut.
- [ ] Kode antrean offline usang yang tidak terpakai dibersihkan dengan aman.

### Verifikasi & Integritas Pengujian (R3)
- [ ] Pengujian otomatis memverifikasi seluruh skenario batas (boundary conditions) untuk guru exempt dan non-exempt.
- [ ] Perintah `npm test` berjalan sukses dengan 0 error dan seluruh tes lulus (PASS).


## 2026-10-14T13:29:08Z

This is a single self-contained fix; keep it small and focused.

Desain ulang sistem pengaturan kewajiban kehadiran guru di SIPJAM untuk memberikan penentuan eksplisit per guru antara 'Wajib Hadir Setiap Hari' dan 'Hanya Hari KBM', serta memastikan pembaruan pengaturan langsung berefek secara instan (real-time) pada akun guru tanpa perlu logout atau refresh manual.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Desain Ulang UI Pengaturan Kehadiran Guru (Model B - Eksplisit per Guru)
- Di `AdminConfigView.tsx`, sediakan antarmuka manajemen kehadiran guru yang jelas dan eksplisit untuk setiap guru:
  - Setiap guru memiliki toggle / switch status yang jelas: **Wajib Hadir Setiap Hari** vs **Hanya Hari KBM / Piket**.
  - Sediakan tab filter cepat: **Semua Guru**, **Wajib Setiap Hari**, dan **Hanya Hari KBM**.
  - Sediakan tombol aksi cepat: *Set Semua Hadir Setiap Hari* dan *Set Semua Hanya Hari KBM*.
  - Sediakan input pencarian (nama guru, NIP, mapel) dengan debounce/filter yang responsif.
  - Simpan perubahan status secara sinkron ke kolom `data_guru.wajib_hadir_hanya_mengajar` dan entri konfigurasi `pengaturan.guru_hanya_mengajar` (JSON id).

### R2. Evaluasi Aturan Kehadiran Dua Arah yang Konsisten
- Perbaiki logika evaluasi kehadiran di `src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/components/HomeViewAdmin.tsx`, dan `src/components/TeacherReminderManager.tsx`:
  - Hilangkan hardcoded unconditional override (misal ketika aturan global `Hari_Mengajar_Saja` menimpa guru yang sebenarnya disetel wajib hadir setiap hari).
  - Status individual guru pada `data_guru.wajib_hadir_hanya_mengajar` (atau list pengecualian) harus dihormati secara konsisten:
    - Jika guru berstatus `wajib_hadir_hanya_mengajar = true`: Hanya wajib hadir jika ada jadwal KBM atau tugas piket hari itu. Jika tidak ada jadwal/piket, bebas presensi dan bebas alpa.
    - Jika guru berstatus `wajib_hadir_hanya_mengajar = false`: Wajib hadir setiap hari kerja sekolah terlepas dari jadwal KBM hari itu.
  - Pertahankan backward compatibility untuk sekolah dengan data yang sudah ada.

### R3. Propagasi Real-time & Efek Langsung ke Akun Guru
- Pastikan saat Admin menyimpan perubahan di `AdminConfigView`:
  - `AdminConfigView` memicu sinkronisasi (update database, window event, dan Supabase realtime broadcast channel).
  - Komponen guru (`HomeViewGuru.tsx` / `AppScreen.tsx`) mendengarkan perubahan realtime (`postgres_changes` pada tabel `pengaturan` dan `data_guru`, serta custom event / storage event).
  - Ketika terjadi pembaruan konfigurasi yang menyangkut akun guru yang sedang login, state kehadiran (`getGuruDailyState`) dan data terkait langsung di-refresh secara otomatis di layar guru tanpa reload browser atau logout.
  - Widget Jadwal, timeline alur harian (Bebas Presensi vs Wajib Datang), dan reminder langsung diperbarui sesuai status baru.

## Verification Resources
- Test suite regresi yang ada:
  `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`
- Buat test verifikasi baru (misalnya `tests/guru_attendance_exemption_redesign.test.ts`) yang memverifikasi:
  1. UI toggle & sinkronisasi state di `AdminConfigView`.
  2. Evaluasi konsisten `getGuruDailyState` di `workflow.ts` untuk guru 'Setiap Hari' vs 'Hanya Hari KBM'.
  3. Evaluasi bebas alpa di `attendanceAlpa.ts`.
  4. Mekanisme listener/broadcast realtime yang memicu re-fetch pada akun guru.

## Acceptance Criteria

### Antarmuka AdminConfigView
- [ ] Admin dapat melihat status kehadiran tiap guru dan mengubahnya langsung via toggle/switch (Setiap Hari vs Hanya Hari KBM).
- [ ] Tab filter (Semua / Setiap Hari / Hanya Hari KBM) dan pencarian guru berfungsi menyaring daftar guru dengan benar.
- [ ] Tombol aksi massal (Set Semua Setiap Hari / Set Semua Hanya KBM) bekerja dengan benar.
- [ ] Menyimpan pengaturan berhasil memperbarui data di `data_guru.wajib_hadir_hanya_mengajar` dan `pengaturan`.

### Logika Kehadiran & Alpa
- [ ] Guru dengan status 'Hanya Hari KBM' dibebaskan dari presensi dan alpa ketika tidak memiliki jadwal mengajar maupun tugas piket pada hari berjalan.
- [ ] Guru dengan status 'Setiap Hari' tetap diwajibkan hadir pada hari kerja sekolah meskipun tidak memiliki jadwal mengajar hari itu.
- [ ] Logika `workflow.ts` dan `attendanceAlpa.ts` tidak menimpa status guru secara sepihak jika aturan sekolah berbeda.

### Efek Langsung pada Akun Guru
- [ ] Perubahan status guru oleh Admin langsung terdeteksi oleh klien akun guru melalui realtime / event subscription.
- [ ] `HomeViewGuru` memperbarui tampilan widget kehadiran dan timeline secara otomatis (Bebas Presensi vs Wajib Presensi) tanpa memerlukan refresh halaman atau re-login.

### Verifikasi & Integritas
- [ ] Test regresi `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts` tetap PASS (100%).
- [ ] Test suite baru untuk verifikasi desain ulang lolos pengujian tanpa error.
- [ ] Kode mengikuti prinsip Ponytail: perubahan minimal, bersih, tanpa dependensi baru yang tidak perlu.


## 2026-10-15T04:41:48Z

This is a single self-contained fix; keep it small and focused.

Perbaiki QR Scanner di HP guru (smartphone) agar dapat mendeteksi kode QR dari kartu presensi digital siswa secara otomatis dan mencatat presensi datang siswa dengan lancar di semua peramban mobile (iOS Safari, Android Chrome, WebView, dll).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Universal Client-Side QR Decoding (Mobile Fallback)
Integrasikan modul dekoder QR client-side (seperti `jsQR` via Canvas `getImageData` atau fallback sejenis) pada pemindaian kamera `PiketView.tsx`. Ketika `window.BarcodeDetector` bawaan tidak tersedia di perangkat HP guru (terutama iOS Safari dan sebagian Android Chrome), sistem otomatis beralih memproses frame video secara real-time via canvas decoding tanpa memblokir pengguna dengan pesan bahwa browser tidak mendukung.

### R2. Optimasi Kamera HP Guru & Stream Handling
Pastikan aktivasi kamera belakang (`facingMode: { ideal: 'environment' }`) berjalan mulus pada smartphone dengan atribut `playsInline` dan `webkit-playsinline`. Hilangkan pesan peringatan yang memblokir scanner mobile, serta sediakan indikator pemindaian yang responsif dan jernih pada layar HP.

### R3. Perekaman Presensi Datang & Umpan Balik Siswa
Hubungkan hasil pemindaian kode QR kartu presensi digital siswa secara langsung ke fungsi `resolveStudentByCode` dan `recordPresensiSiswa` dengan status `datang`. Berikan audio-visual feedback instan (kartu informasi siswa, bunyi notifikasi sukses/duplikat, dan sinkronisasi rekap harian).

## Verification Resources
- Test suite: `tests/qrSiswa.test.ts` dan `tests/m3_piket_scanner_kiosk.test.ts`
- Script build: `npm run build`

## Acceptance Criteria

### Kompatibilitas Mobile & Fallback Scanning
- [ ] Kamera pada HP Guru (termasuk iOS Safari & Android Chrome yang tidak memiliki `window.BarcodeDetector`) dapat mendeteksi kode QR kartu presensi siswa secara otomatis melalui fallback client-side canvas.
- [ ] Teks banner scanner di HP tidak lagi menginstruksikan pengguna untuk mencolokkan scanner USB HID ketika membuka di peramban tanpa native BarcodeDetector.

### Perekaman Presensi Datang
- [ ] Pemindaian kode QR kartu digital siswa berhasil menyelesaikan identitas siswa (`resolveStudentByCode`) dan mencatat kehadiran `datang` ke tabel `presensi_siswa`.
- [ ] Kondisi duplikat presensi datang pada hari yang sama tertangani dengan pesan informatif dan peringatan suara yang sesuai.

### Kualitas & Integritas Build
- [ ] Seluruh pengujian otomatis di `tests/` berjalan sukses (`PASS`).
- [ ] Perintah `npm run build` berhasil tanpa error TypeScript atau Turbopack.


## 2026-10-15T13:09:33Z

This is a single self-contained fix; keep it small and focused.

Redesign antarmuka dan alur modul Daftar Nilai (Gradebook Kurikulum Merdeka) pada SIPJAM agar alur persiapan CP (Capaian Pembelajaran), TP (Tujuan Pembelajaran), dan Kolom Asesmen menyatu dalam satu antarmuka terpadu yang ringkas tanpa modal bertingkat yang membingungkan, sehingga guru dapat langsung fokus mengisi nilai dengan cepat, jelas, dan nyaman.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyatuan Alur Persiapan Asesmen (Unified Setup Flow)
Gantikan hierarki modal pop-up terpisah yang berbelit-belit (modal tambah CP -> modal tambah TP -> modal tambah Kolom) dengan satu panel terintegrasi (misal: inline drawer, accordion terstruktur, atau tab setup ringkas). Guru harus dapat melihat dan mengelola hubungan CP, TP, serta kolom asesmen dalam satu tampilan yang terpadu tanpa harus membuka-tutup banyak dialog modal.

### R2. Akses Langsung & Inisialisasi Cepat Pengisian Nilai (Frictionless Grade Entry)
Pastikan guru dapat langsung masuk ke pengisian nilai begitu Mata Pelajaran dan Kelas dipilih:
- Jika belum ada data CP/TP, sediakan panduan inline bersahabat atau tombol "Inisialisasi Cepat / Buat Format Awal" (membuat 1 CP, 1 TP, dan kolom Formatif/Sumatif default dengan 1 klik) agar guru tidak terbentur pesan kosong yang kaku.
- Tampilkan matriks tabel input nilai secara jelas dengan navigasi yang mudah dan tombol aksi yang terlihat langsung.

### R3. Preservasi Integritas Data & Logika Kurikulum Merdeka
Pertahankan 100% kompatibilitas dengan:
- Skema database Supabase: capaian_pembelajaran, tujuan_pembelajaran, asesmen_kolom, nilai_siswa, dan pengaturan.
- Aturan validasi: tepat 1 asesmen Diagnostik per TP, asesmen Formatif, dan Sumatif dengan bobot masing-masing.
- Formula kalkulasi Kurikulum Merdeka (bobot Kehadiran, Formatif, Sumatif) serta fungsi generator narasi rapor generateKurikulumMerdekaDeskripsi.
- Mode Review Admin (hak akses read-only nilai siswa + pengelolaan bobot).

### R4. Kesederhanaan & Kerapian Kode (Ponytail Principle)
Gunakan komponen dan pustaka yang sudah tersedia di proyek. Hindari penambahan dependensi pihak ketiga baru atau abstraksi berlebihan yang tidak diminta. Pertahankan penanganan offline check (navigator.onLine), autosave/dirty indicator, export CSV, dan integrasi cetak GPS.

## Acceptance Criteria

### Pengalaman Pengguna (UX)
- [ ] Pengelolaan CP, TP, dan Kolom Asesmen tidak lagi memerlukan navigasi modal pop-up bertingkat yang terputus-putus
- [ ] Tersedia opsi inisialisasi awal cepat untuk kelas/mapel yang baru sehingga guru dapat langsung mengisi nilai
- [ ] Navigasi input nilai terasa mulus, jelas, dan tidak terhalang oleh banner peringatan yang bertumpuk

### Integritas Fungsional & Fungsionalitas Lengkap
- [ ] Operasi simpan nilai (batch upsert ke tabel nilai_siswa) berjalan normal dan terverifikasi di database
- [ ] Perhitungan otomatis nilai akhir per TP, nilai akhir semester, predikat, dan narasi deskripsi capaian pembelajaran bekerja akurat
- [ ] Fitur pendukung: Isi Nilai Cepat (Bulk Fill), Export CSV (TP & Semester), dan Cetak (PrintHeader / GPS) tetap berfungsi normal
- [ ] Mode admin tetap memiliki hak akses yang benar (hanya review nilai & ubah bobot)

### Verifikasi Teknis
- [ ] Build Next.js (npm run build) berhasil tanpa error TypeScript atau lint


## 2026-10-15T16:41:21Z

This is a single self-contained fix; keep it small and focused.

Sesuaikan menu E-Rapor pada akun Admin agar terhubung 100% dengan data real di database Supabase (menggantikan data mock dan skor pseudo-random seed), menyinkronkan catatan wali & observasi deep learning ke database, serta menyesuaikan UI dan tanda tangan wali kelas.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Real Data Pipeline Penilaian Kurikulum Merdeka
Gantikan kalkulasi dummy/mock di `src/components/RaporView.tsx` dengan data aktual dari Supabase:
- Ambil daftar mata pelajaran aktif untuk kelas terpilih dari `guru_mapel` / `data_mapel` yang terikat pada `sekolah_id`.
- Ambil capaian pembelajaran (`capaian_pembelajaran`), tujuan pembelajaran (`tujuan_pembelajaran`), kolom asesmen (`asesmen_kolom`), dan nilai siswa (`nilai_siswa`).
- Hitung nilai akhir semester per mapel secara konsisten dengan logika `GradebookView.tsx` menggunakan `generateKurikulumMerdekaDeskripsi`.
- Jika mata pelajaran belum memiliki nilai asesmen, tampilkan tanda `-` / status belum dinilai secara elegan tanpa nilai buatan/palsu.

### R2. Penyesuaian UI & Konteks Akun Admin
- Sesuaikan tampilan header Rapor ketika diakses oleh Admin atau Superadmin agar menampilkan badge konteks "Administrator" (bukan badge statis "Wali Kelas").
- Pastikan dropdown pemilih kelas memuat seluruh kelas aktif di sekolah yang sedang dikelola Admin.
- Pada lembar cetak rapor (Print Signature), otomatis tampilkan nama dan NIP Wali Kelas yang sebenarnya ditugaskan untuk kelas tersebut (diambil dari penugasan guru / wali kelas), mendampingi Kepala Sekolah dan Orang Tua Siswa.

### R3. Sinkronisasi Database untuk Catatan & Observasi Rapor
- Gantikan penyimpanan Catatan Wali Kelas dan Observasi Deep Learning (Mindful, Meaningful, Joyful) yang saat ini berbasis `localStorage` lokal agar tersimpan secara persisten ke database Supabase (tabel rapor / pengaturan terstruktur per `sekolah_id`, `kelas`, `semester`, `tahun_ajaran`, dan `nisn`).
- Sediakan mekanisme simpan/autosave yang dapat diakses oleh Wali Kelas maupun Admin pengelola.

## Verification Resources
- Test suite: `npm test` mencakup `tests/m4_academic_merdeka_rapor.test.ts` dan `tests/adversarial_rapor_wali_security.test.ts`.
- Build verification: `npm run build` harus bebas dari TypeScript/linter error.

## Acceptance Criteria

### Real Data & Calculation
- [ ] Kode kalkulasi acak/mock (`student.nisn.charCodeAt`, `DEFAULT_MAPEL_LIST` statis tanpa filter database) telah sepenuhnya dihapus dari `RaporView.tsx`.
- [ ] Nilai siswa dan capaian kompetensi yang ditampilkan pada Rapor bersumber langsung dari tabel `nilai_siswa`, `asesmen_kolom`, dan `tujuan_pembelajaran`.
- [ ] Mata pelajaran tanpa nilai asesmen menampilkan nilai `-` atau keterangan belum ada penilaian tanpa menghasilkan NaN atau error.

### Admin Experience & Signatures
- [ ] Akun Admin dapat memilih seluruh kelas sekolah tanpa error akses.
- [ ] Header UI Rapor menampilkan badge identitas Administrator saat dibuka oleh Admin.
- [ ] Tanda tangan wali kelas pada lembar cetak rapor mencantumkan nama dan NIP guru wali kelas yang sebenarnya dari kelas terpilih.

### Database Persistence
- [ ] Catatan wali kelas dan refleksi deep learning tersimpan ke Supabase sehingga dapat dibaca bersama oleh Admin dan Wali Kelas lintas peramban/perangkat.

### System Stability
- [ ] Seluruh unit dan adversarial test suite (`npm test`) lulus 100% tanpa regresi.
- [ ] Perubahan mematuhi kaidah Ponytail: diff minimal, tepat sasaran pada file yang relevan, tanpa scaffolding/abstraksi yang tidak diminta.


## 2026-10-15T22:12:41Z

This is a single self-contained fix; keep it small and focused.

Sesuaikan tahun ajaran dan semester pada modul E-Rapor (`src/components/RaporView.tsx`) agar secara otomatis menyelaraskan diri dengan pengaturan aktif sekolah di tabel `pengaturan`, menyediakan dropdown pilihan dinamis yang memuat tahun ajaran yang diatur beserta arsip, serta mendengarkan update realtime.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Sinkronisasi Otomatis Tahun Ajaran & Semester dari Pengaturan Sekolah
- Ambil konfigurasi aktif `tahun_ajaran` dan `semester` dari tabel `pengaturan` untuk `sekolah_id` pengguna (atau default sekolah jika belum diset).
- Gunakan nilai yang diatur tersebut sebagai inisialisasi awal default pada `selectedTahunAjaran` dan `selectedSemester` di `RaporView.tsx`.
- Pasang event listener untuk `sipjam:config_updated` agar saat admin mengubah tahun ajaran atau semester di menu Sistem (`AdminConfigView`), `RaporView` langsung memperbarui state aktifnya secara otomatis.

### R2. Dropdown Pilihan Tahun Ajaran Dinamis & Fleksibel
- Jangan mengunci opsi tahun ajaran pada daftar statis hardcoded semata.
- Bangun opsi tahun ajaran secara dinamis: pastikan tahun ajaran yang sedang diatur selalu tersedia, digabungkan dengan tahun ajaran yang tercatat di database (dari `capaian_pembelajaran`, `tujuan_pembelajaran`, `wali_kelas`, `jadwal_pelajaran`) serta opsi tahun relevan (misal tahun sebelumnya dan sesudahnya).
- Berikan penanda visual yang jelas pada opsi tahun ajaran yang sedang aktif diatur (misal: "2024/2025 (Aktif)").
- Pengguna tetap dapat memilih tahun ajaran atau semester lain dari dropdown untuk meninjau rapor periode/arsip terdahulu.

### R3. Konsistensi Query dan Dokumen Cetak
- Seluruh pengambilan data rapor (data nilai siswa, capaian pembelajaran, tujuan pembelajaran, wali kelas, serta catatan/observasi) harus dieksekusi secara reaktif sesuai `selectedTahunAjaran` dan `selectedSemester` yang sedang dipilih/disinkronkan.
- Lembar cetak Laporan Hasil Belajar (E-Rapor) dan judul dokumen cetak wajib menampilkan teks Tahun Ajaran dan Semester yang akurat sesuai pilihan aktif.

## Verification Resources
- Test suites: `npm test` (termasuk `tests/e_rapor_real_data_pipeline.test.ts`, `tests/adversarial_rapor_wali_security.test.ts`, dan `tests/m4_academic_merdeka_rapor.test.ts`).
- Production build: `npm run build` harus 0 error.

## Acceptance Criteria

### Automatic Sync
- [ ] `RaporView.tsx` secara otomatis mengambil dan menerapkan `tahun_ajaran` dan `semester` dari tabel `pengaturan` saat dimuat.
- [ ] Perubahan tahun ajaran / semester di Pengaturan Sistem (`AdminConfigView`) memicu pembaruan otomatis di `RaporView` via realtime/event listener.

### Dynamic Select Options
- [ ] Dropdown Tahun Ajaran memuat tahun ajaran aktif yang diatur dan tidak membatasi pengguna hanya pada opsi statis lama.
- [ ] Dropdown tetap mengizinkan pengguna memilih tahun ajaran lain untuk mengakses data arsip.

### Document & Data Accuracy
- [ ] Nilai rapor dan narasi capaian pembelajaran yang dimuat sesuai dengan kombinasi Tahun Ajaran dan Semester yang aktif dipilih.
- [ ] Lembar cetak rapor mencantumkan Tahun Ajaran dan Semester yang benar.

### System Stability
- [ ] Seluruh unit dan adversarial test suites (`npm test`) lulus 100% tanpa regresi.
- [ ] Sesuai prinsip Ponytail: diff minimal, reuse helper dan mekanisme yang sudah ada di codebase.


## 2026-10-16T05:04:45Z

This is a single self-contained fix; keep it small and focused.

Perbaiki error Supabase PostgREST `Could not find the table 'public.sekolah_registry' in the schema cache` pada portal multi-sekolah SIPJAM agar aplikasi tetap berfungsi secara tangguh baik ketika tabel `sekolah_registry` belum di-migrate maupun ketika sudah ada, serta sediakan script SQL perbaikan schema cache untuk database Supabase.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Graceful Fallback & Schema Resilience in Frontend
Ketika query, insert, update, atau delete ke `sekolah_registry` menghasilkan error missing table / schema cache (`PGRST205` atau pesan mengandung `Could not find the table 'public.sekolah_registry' in the schema cache`), operasi di `SuperadminView.tsx` dan `AppScreen.tsx` harus secara tangguh melakukan fallback langsung ke tabel `public.sekolah` tanpa memblokir operasi CRUD Superadmin dan tanpa menampilkan dialog error fatal ke pengguna.

### R2. Standalone Migration & Schema Cache Reload Script
Sediakan file SQL terisolasi dan instruksi eksekusi instan di Supabase SQL Editor (`CREATE TABLE IF NOT EXISTS public.sekolah_registry` beserta RLS dan `NOTIFY pgrst, 'reload schema';`) untuk menyelesaikan masalah schema cache langsung di sisi server Supabase.

### R3. Zero Regression & Test Preservation
Pertahankan seluruh fungsionalitas multi-tenant switcher dan pastikan seluruh test suite (`tests/portal_induk_jaringan_multi_sekolah.test.ts` dan test e-rapor) tetap 100% PASS (47/47 assertions passed).

## Acceptance Criteria

### Schema Cache Error Handling
- [ ] Operasi baca (read), tambah (add), ubah (edit), dan hapus (delete) sekolah satelit di `SuperadminView` tidak memunculkan dialog error `Could not find the table 'public.sekolah_registry' in the schema cache` ketika tabel belum ada di database.
- [ ] Operasi CRUD otomatis dialihkan (fallback) ke tabel `public.sekolah` jika `sekolah_registry` tidak tersedia di PostgREST schema cache.
- [ ] Jika tabel `sekolah_registry` tersedia, sinkronisasi dua arah antara `sekolah_registry` dan `sekolah` tetap berjalan normal.

### Database Migration & Cache Reload
- [ ] Tersedia file SQL migrasi / reload schema siap pakai yang aman dijalankan ulang (idempotent).

### Verification
- [ ] `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts` lulus 100% tanpa kegagalan.
- [ ] `npm test` lulus tanpa error regresi.


## 2026-10-16T08:25:22Z

User requested to continue (lanjutkan). Server restarted previously. Please revive the execution and proceed:
1. Finish R2: Create the standalone migration & schema cache reload script (e.g. `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql` with idempotent table creation, RLS, and `NOTIFY pgrst, 'reload schema';`).
2. Verify R1, R2, R3 by running `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts` and `npm test`.
3. Complete the review/auditor rounds and conclude.


## 2026-10-16T11:30:56Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Delegate to teamwork_preview
> Requested team: Full Team

Implementasi dua fitur operasional esensial berprinsip Ponytail (zero-bloat, minimal diff, native first) pada SIPJAM: (1) Notifikasi WhatsApp Orang Tua 1-Click via Native URI di Modul Piket dan Rekap Siswa, serta (2) Auto-Save Draft Lokal & Ketahanan Offline pada Jurnal KBM dan Daftar Nilai (Gradebook).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Notifikasi WhatsApp Orang Tua 1-Click (PiketView & RekapSiswaView)
- Manfaatkan data `no_hp_ortu` yang sudah tersedia pada tabel `data_siswa` (tanpa membuat skema atau tabel baru).
- Tambahkan aksi 1-klik "Kirim WA ke Orang Tua" pada setiap baris siswa di:
  1. `src/components/PiketView.tsx` (khususnya tab Rekap Harian / Hasil Scan / Daftar Hadir Siswa).
  2. `src/components/RekapSiswaView.tsx` (khususnya tab Presensi Gerbang & Rekap Absen).
- Normalisasi nomor telepon standar Indonesia (`08...`, `+62...`, `62...`) menjadi format internasional murni tanpa karakter non-digit (`628...`).
- Bangun tautan langsung menggunakan native URI WhatsApp (`https://wa.me/{nomor}?text={encodedText}`) dengan pesan informatif dan sopan mencakup: nama siswa, kelas, tanggal, status kehadiran (Alpa, Bolos, Terlambat, Izin, Sakit), nama sekolah, dan catatan waktu.
- Jika `no_hp_ortu` siswa belum terdaftar, tampilkan dialog ramah (SweetAlert) yang memungkinkan guru/piket menginput nomor manual sementara atau menyalin teks pesan ke clipboard.

### R2. Auto-Save Draft Lokal & Ketahanan Koneksi Lemah (GradebookView & GuruJurnal)
- **Daftar Nilai (`GradebookView.tsx`)**:
  - Terapkan mekanisme auto-save debounce ke `localStorage` untuk perubahan nilai (`localScores`) berdasarkan kunci scoped (`sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`).
  - Jika halaman termuat dan terdeteksi draft nilai lokal yang belum tersimpan ke database, berikan notifikasi atau pulihkan secara otomatis dengan indikator "Draft Lokal Tersimpan".
  - Saat guru berhasil menekan "Simpan Semua Nilai" ke database Supabase, bersihkan draft lokal terkait.
- **Jurnal KBM (`GuruJurnal.tsx`)**:
  - Pertahankan draft formulir di `localStorage` jika pengiriman gagal akibat kendala jaringan (`!navigator.onLine` atau network error timeout).
  - Tampilkan indikator status draft yang jelas agar guru tahu ketikan mereka aman dan tidak hilang saat sinyal terputus.

## Verification Resources
- Test suite verifikasi baru yang harus dibuat: `tests/whatsapp_parent_notify_and_autosave.test.ts`
  - Validasi normalisasi nomor HP (`0812...` -> `62812...`, spasi, strip, tanda kurung).
  - Validasi formatting pesan WhatsApp dan parameter encodeURIComponent.
  - Validasi siklus hidup storage draft (save, restore, clear on success) pada Gradebook dan Jurnal KBM.
- Verifikasi build & type safety: `npx tsc --noEmit` dan `npm run build`.
- Verifikasi git workflow sesuai `GEMINI.md` (git status, add, commit, push origin main).

## Acceptance Criteria

### Fungsionalitas Notifikasi WhatsApp (R1)
- [ ] Tombol aksi WhatsApp tersedia pada `PiketView` dan `RekapSiswaView` untuk setiap baris data siswa.
- [ ] Nomor telepon Indonesia dinormalisasi secara tepat ke format internasional WhatsApp (`628xxx`).
- [ ] Tautan membuka WhatsApp Web / Aplikasi WhatsApp dengan teks yang terformat rapi sesuai status kehadiran siswa (Hadir/Terlambat/Alpa/Bolos).
- [ ] Penanganan fallback ketika `no_hp_ortu` kosong menyediakan opsi input manual atau salin pesan.

### Fungsionalitas Auto-Save & Offline Resilience (R2)
- [ ] Input nilai di `GradebookView` otomatis tersimpan ke `localStorage` dan tidak hilang saat reload atau koneksi terputus mendak.
- [ ] Draft nilai di `GradebookView` dibersihkan secara bersih setelah data sukses di-upsert ke Supabase.
- [ ] Formulir di `GuruJurnal` tidak menghapus teks refleksi/kegiatan guru jika tombol kirim gagal akibat gangguan internet.

### Standar Teknis & Kualitas Ponytail
- [ ] Tidak ada dependensi eksternal baru yang ditambahkan ke `package.json` (100% menggunakan native browser feature & pustaka yang sudah ada).
- [ ] Test baru `tests/whatsapp_parent_notify_and_autosave.test.ts` lulus pengujian 100%.
- [ ] `npx tsc --noEmit` dan `npm run build` berhasil tanpa error.
- [ ] Perubahan di-commit dan di-push ke git sesuai aturan `GEMINI.md`.


## 2026-10-16T13:36:18Z

lanjutkan


## 2026-10-20T06:34:52Z

# Teamwork Project Prompt

Penyesuaian batas jendela waktu input absensi kelas (Piket pagi s.d. 08:00 WITA, Wali Kelas pagi s.d. 12:00 WITA bersamaan KBM mapel, alokasi jam pulang Piket & Wali Kelas 1 jam setelah jam pulang mulai) serta fallback dinamis absensi harian siswa dari jurnal mapel guru jam terakhir dengan preservasi aturan Bolos.

Working directory: c:/Users/Fitra/OneDrive/Documents/sipjam-app
Integrity mode: development

This is a single self-contained fix; keep it small and focused.

## Requirements

### R1. Jendela Waktu Input Absensi Siswa Pagi & KBM Independen
- Guru Piket: batas input presensi pagi siswa tetap hingga pk. 08:00 WITA.
- Wali Kelas: batas input absensi kelas pagi diperpanjang hingga pk. 12:00 WITA.
- Koeksistensi KBM: Selama periode pagi s.d. pk. 12:00 WITA, Guru Mapel yang masuk kelas tetap dapat mengisi presensi sesi KBM di jurnal pembelajaran secara independen tanpa saling bertabrakan atau terblokir oleh akses Wali Kelas.

### R2. Jendela Waktu Presensi Pulang (Piket & Wali Kelas Selaras 1 Jam)
- Guru Piket dan Wali Kelas memiliki alokasi waktu presensi pulang yang selaras: aktif sejak `jam_pulang_mulai` hingga tepat maksimal 1 jam (60 menit) setelah jam pulang dimulai (bukan 20 menit atau 30 menit).
- Akses penyesuaian malam (pk. 22:00 WITA) dihapus/ditutup setelah batas 1 jam kepulangan tersebut berakhir.

### R3. Fallback Dinamis Jurnal KBM Terakhir & Preservasi Aturan Bolos
- Jika Wali Kelas tidak ada atau belum mengisi absensi kelas, tampilan dan rekapitulasi harian kelas secara otomatis mengambil data status kehadiran dari jurnal KBM guru jam pelajaran terakhir pada hari tersebut (misal jam ke-3, ke-4, atau ke-5).
- Aturan Bolos tetap ditegakkan: jika siswa tercatat Hadir di awal (datang pagi / gerbang / kelas pagi) namun tercatat Alfa pada sesi KBM jam terakhir, sistem secara otomatis menetapkan status siswa sebagai **Bolos** (B).

### R4. Pembaruan dan Verifikasi Suite Pengujian
- Seluruh unit test dan suite pengujian terkait (termasuk `tests/wali_kelas_and_piket_intervensi.test.ts`) diperbarui agar mencerminkan parameter waktu baru (12:00 WITA pagi, alokasi pulang 60 menit / 1 jam untuk Piket & Wali Kelas, tidak saling bertabrakan dengan KBM, dan fallback bolos) serta lulus 100% tanpa regresi.

## Acceptance Criteria

### Verifikasi Jendela Waktu & Independensi
- [ ] Wali Kelas dapat menginput absensi kelas hingga pk. 12:00 WITA, dan Guru Mapel dapat menginput jurnal KBM tanpa saling memblokir.
- [ ] Fungsi validasi pulang untuk Guru Piket dan Wali Kelas mengizinkan input tepat dalam rentang 60 menit sejak `jam_pulang_mulai` (misal jam pulang 11:00 WITA, maka s.d. 12:00 WITA diizinkan; 12:01 WITA terkunci).
- [ ] Akses malam (pk. 22:00 WITA) telah dinonaktifkan sehingga intervensi terkunci setelah batas 60 menit pasca jam pulang.

### Verifikasi Logika Fallback & Bolos
- [ ] Siswa tanpa absensi kelas dari wali kelas otomatis mewarisi status dari jurnal KBM sesi jam terakhir hari itu.
- [ ] Siswa yang berstatus Hadir pagi dan Alfa di jurnal KBM jam terakhir diverifikasi berstatus Bolos (B) pada laporan/rekap.

### Verifikasi Kualitas & Regresi
- [ ] Pengujian `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts` berjalan dan lulus 100%.
- [ ] Perubahan file bersih dan siap di-commit ke Git sesuai aturan repositori.

## 2026-10-20T22:36:04Z

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


## 2026-10-23T06:06:50Z

This is a single self-contained fix; keep it small and focused.
Refactor the entire UI of the Next.js application to a Claymorphism / Soft Clay aesthetic with reusable components (ClayCard, ClayButton, ClaySidebar) while strictly preserving all existing database structures and business logic.
MANDATORY: All changes must be committed and pushed to the `dev` branch (`git push origin dev`). Never push to `main`. After pushing, provide the GitHub link to inspect the `dev` branch: https://github.com/fitrawan29/sipjam-nizamudin/tree/dev.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Reusable Claymorphism Design System Primitives
Implement modular, reusable components (`ClayCard`, `ClayButton`, `ClaySidebar`):
- Soft 3D clay aesthetic: rounded contours (`rounded-2xl` / `rounded-3xl`), thick light/white borders, layered inner highlight and soft diffused drop shadows.
- Pastel color palette with `#FDF6EC` as the primary background canvas and soft pastel accents for cards and buttons.
- Fully responsive across mobile, tablet, and desktop breakpoints.

### R2. Comprehensive UI Refactoring Across Screens
Refactor the application screens and components (`AppScreen`, `HomeViewAdmin`, `HomeViewGuru`, `PiketView`, `GuruPresensi`, `GuruJurnal`, Rekap views, modals, and navigation) to use the new Claymorphism style and components without altering any underlying state logic, hooks, database calls, API endpoints, or prop contracts.

### R3. Automated Quality & Non-Regression Verification
Verify that the codebase builds cleanly, TypeScript passes without errors, and the existing automated test suite (`npm test`) passes with zero logic or database regressions.

### R4. Development Server & Visual Verification
Run the dev server (`npm run dev`) and ensure the application boots cleanly on `http://localhost:3000` with visual confirmation of claymorphism aesthetics across dashboard screens.

### R5. Mandatory Git Workflow & Branch Link Delivery
Upon completion, the agent MUST automatically:
1. Run `git status` and stage changes (`git add .`).
2. Commit with a clear, descriptive message (`git commit -m "..."`).
3. Push directly to the development branch: `git push origin dev`.
4. STRICT RULE: DO NOT push or merge to `main`.
5. Provide the clickable link to the pushed branch: https://github.com/fitrawan29/sipjam-nizamudin/tree/dev

## Acceptance Criteria

### Component Design & Styling
- [ ] `ClayCard`, `ClayButton`, and `ClaySidebar` exist as clean, reusable TypeScript components.
- [ ] Application background uses `#FDF6EC` with consistent soft 3D clay aesthetic (dual shadow, rounded borders, pastel accents) applied across all views.
- [ ] Responsive navigation and layouts work seamlessly on mobile, tablet, and desktop.

### Logic Preservation & Stability
- [ ] Zero modifications to database schema, queries, authentication, or business logic.
- [ ] `npx tsc --noEmit` and `npm run build` pass with 0 errors.
- [ ] Existing automated test suite (`npm test`) passes with 0 failures.
- [ ] Local dev server (`npm run dev`) launches and loads pages without runtime crashes.

### Git Delivery & Link
- [ ] Changes committed and verified pushed to branch `dev` (`git push origin dev`).
- [ ] Branch `main` untouched.
- [ ] Clickable link to `dev` branch (https://github.com/fitrawan29/sipjam-nizamudin/tree/dev) presented in the final summary.

## 2026-10-23T19:45:33Z

Implementasi role baru `dinas_pendidikan` pada aplikasi SIPJAM untuk monitoring eksekutif kehadiran guru dan siswa lintas sekolah binaan, di mana wilayah binaan ditentukan oleh akun Superadmin sehingga Dinas Pendidikan hanya dapat melihat, merekap, dan mencetak laporan sekolah dalam daerah binaannya secara read-only tanpa hak mutasi data sekolah, dengan pengiriman akhir otomatis ter-push ke branch `dev`.

Working directory: c:/Users/Fitra/OneDrive/Documents/sipjam-app
Integrity mode: development

## Requirements

### R1. Penugasan Wilayah oleh Superadmin & RBAC `dinas_pendidikan`
1. Tambahkan peran `dinas_pendidikan` pada autentikasi, manajemen pengguna, dan tenant context.
2. Akun Superadmin memiliki wewenang untuk mengatur/menugaskan daerah binaan (`kota_kabupaten` / wilayah tugas) ke setiap akun Dinas Pendidikan.
3. Akun Dinas Pendidikan secara ketat hanya dapat melihat dan mengakses data sekolah di wilayah yang telah ditugaskan kepadanya oleh Superadmin (wilayah di luar penugasan tidak dapat diakses).
4. Role `dinas_pendidikan` terisolasi sebagai read-only: dilarang menambah, mengedit, atau menghapus master data, akun pengguna, konfigurasi sekolah, maupun presensi.

### R2. Executive Cross-School Monitoring Dashboard (Scoped to Assigned Region)
Sediakan dashboard pemantauan terpusat bagi akun dinas yang hanya mencakup sekolah-sekolah di wilayah binaannya:
1. Ringkasan agregat: total sekolah aktif binaan, persentase kehadiran guru & siswa hari ini, status koneksi/kesehatan satelit sekolah, dan sekolah yang memerlukan perhatian (alpa tinggi).
2. Kontrol pencarian dan filter intra-wilayah (misal filter per status/nama sekolah) yang tetap terkunci di dalam batas wilayah penugasan dinas tersebut.
3. Fitur cetak ringkasan rekapitulasi daerah binaan untuk keperluan pelaporan resmi dinas.

### R3. Read-Only School Drilldown & Attendance Recap + Cetak Laporan
Sediakan fitur drilldown ke salah satu sekolah binaan di wilayahnya memanfaatkan infrastruktur `getActiveTargetSchool`:
1. Dinas dapat meninjau serta mencetak laporan rekapitulasi presensi guru, presensi siswa, dan jurnal kelas sekolah target.
2. Memanfaatkan sistem cetak standar SIPJAM (`PrintHeader` / dialog cetak dokumen resmi yang sudah ada).
3. Seluruh tampilan drilldown beroperasi dalam mode baca murni tanpa tombol aksi administratif/mutasi data.

### R4. Automated Verification & Security Guard Test
Buat file pengujian otomatis (`tests/dinas_pendidikan_monitoring.test.ts`) yang memverifikasi:
1. Superadmin dapat menugaskan daerah (`kota_kabupaten`) ke akun dinas.
2. Akun dinas yang login hanya dapat melihat sekolah-sekolah dalam daerah yang ditugaskan kepadanya (data sekolah daerah lain tidak bocor).
3. Fitur cetak/rekap dapat diakses oleh role dinas, sedangkan seluruh endpoint/fungsi mutasi data terproteksi dan menolak aksi dari role dinas.
4. Agregasi metrik dan fitur drilldown sekolah binaan berjalan akurat.

### R5. Build Verification & Git Delivery to `dev`
1. Pastikan kompilasi TypeScript (`npx tsc --noEmit`) dan build aplikasi (`npm run build`) sukses tanpa error.
2. Sesuai panduan `GEMINI.md`, lakukan staging (`git add .`), commit pesan deskriptif, dan push ke branch pengembangan: **`git push origin dev`** (dilarang langsung push ke `main`).

## Acceptance Criteria

### Superadmin Region Assignment & Scoped Access
- [ ] Akun Superadmin dapat mengatur/memperbarui daerah penugasan (`kota_kabupaten` / wilayah) pada akun dengan role `dinas_pendidikan`.
- [ ] Pengguna `dinas_pendidikan` yang login hanya disajikan data sekolah yang berada di wilayah penugasan yang diberikan oleh Superadmin. Sekolah dari daerah lain tidak muncul di daftar maupun di metrik agregat.

### RBAC & Read-Only Isolation
- [ ] Pengguna dengan role `dinas_pendidikan` langsung diarahkan ke tampilan dashboard dinas saat login.
- [ ] Seluruh kontrol mutasi data (tambah/edit/hapus guru, siswa, kelas, setting sekolah, hapus presensi) disembunyikan dan dicegah untuk role `dinas_pendidikan`.

### Region-Scoped Dashboard & Drilldown with Printing
- [ ] Dashboard dinas menyajikan metrik agregat kehadiran hari ini khusus untuk sekolah-sekolah binaan di daerah penugasan.
- [ ] Pengguna dinas dapat memilih sekolah binaan untuk melihat rekap detail presensi secara read-only dan dapat kembali ke dashboard tanpa merusak session.
- [ ] Tersedia tombol/fitur cetak laporan resmi (rekap agregat daerah dan rekap per sekolah) menggunakan komponen cetak standar SIPJAM.

### Programmatic Proof & Git Delivery
- [ ] Test suite baru lolos pengujian tanpa error (`npx vitest run tests/dinas_pendidikan_monitoring.test.ts` atau test runner yang relevan).
- [ ] `npx tsc --noEmit` lolos tanpa kompilasi error.
- [ ] Seluruh perubahan file ter-staging, ter-commit, dan ter-push ke branch **`dev`** (`git push origin dev`).

## 2026-10-23T20:07:04Z

Server restart detected. Silakan lanjutkan (resume) proses orkestrasi dan eksekusi milestone implementasi fitur role Dinas Pendidikan. Periksa status terakhir orchestrator dan dispatch worker yang diperlukan.


## 2026-10-23T22:56:18Z

Restorasi layout, header, dan sidebar asli Superadmin (termasuk dropdown switcher satelit di navbar atas dan seluruh menu operasional sekolah) serta mempertahankan integrasi role `dinas_pendidikan` (manajemen wilayah oleh Superadmin & dashboard monitoring read-only) secara rapi dan non-destruktif, dengan pengiriman otomatis ke branch `dev`.

Working directory: c:/Users/Fitra/OneDrive/Documents/sipjam-app
Integrity mode: development

## Requirements

### R1. Restorasi Navbar & Header Asli Superadmin
Kembalikan navbar header asli SIPJAM yang bersih dan fungsional:
1. Label logo SIPJAM Superadmin / Sekolah.
2. Dropdown switcher satelit "Ganti Sekolah yang Dipantau" (`🌐 Master Platform` / daftar sekolah) langsung pada header navbar.
3. Tombol notifikasi pengumuman, avatar profil dengan popup, toggle tema, dan tombol merah "Keluar".
4. Menghilangkan styling asing (claymorphism `#FDF6EC`) pada header agar kembali selaras dengan tema asli SIPJAM.

### R2. Restorasi Sidebar Asli & Menu Operasional Superadmin
Kembalikan sidebar overlay asli SIPJAM yang menampilkan:
1. Header portal "Portal Superadmin" dengan ikon mahkota.
2. Kartu identitas pengguna (avatar, nama, badge role Superadmin).
3. Dropdown switcher sekolah satelit di dalam sidebar.
4. Menu navigasi lengkap:
   - `Ringkasan Platform` (`view-superadmin-overview`)
   - `Jaringan Sekolah` (`view-superadmin-jaringan`)
   - `Akun Dinas Pendidikan` (`view-superadmin-dinas`)
   - Menu operasional lengkap saat sekolah satelit dipilih: Master Data, Verifikasi, Rekap Presensi, Presensi Siswa, Analitik Satelit, dan Sistem Satelit.
5. Tombol Pengaturan Akun (`AccountSettingsModal`), Panduan & Tutorial Lengkap (`TutorialModal`), dan Tutorial Interaktif.

### R3. Harmonisasi Tab di SuperadminView
Pastikan komponen `SuperadminView` menyajikan 3 tab horizontal berdampingan secara rapi dan responsif:
1. `Ringkasan Platform` (Overview metrik platform satelit).
2. `Jaringan Sekolah` (Manajemen dan monitoring status instance satelit).
3. `Akun Dinas Pendidikan` (Pembuatan akun dinas dan penugasan `kota_kabupaten` daerah binaan).
Semua tab tersinkronisasi mulus dengan route `?view=view-superadmin-*`.

### R4. Preservasi Fungsionalitas Role Dinas Pendidikan
Pastikan penambahan fitur Dinas Pendidikan tetap stabil dan terisolasi:
1. User dengan role `dinas_pendidikan` login langsung ke `view-dinas-overview`.
2. Terkunci strictly read-only pada daerah binaan (`kota_kabupaten`) yang ditetapkan Superadmin.
3. Fitur drilldown detail sekolah binaan dan cetak dokumen resmi ber-GPS tetap berfungsi normal.
4. Tidak merusak atau mengubah hak akses akun Guru, Admin, maupun Superadmin.

### R5. Automated Verification, Clean Build & Git Delivery
1. Seluruh test suite otomatis lolos (`npx tsx tests/dinas_pendidikan_monitoring.test.ts` dan `npm test`).
2. Typecheck (`npx tsc --noEmit`) dan build (`npm run build`) sukses tanpa error.
3. Staging (`git add .`), commit pesan deskriptif, dan push ke branch pengembangan: **`git push origin dev`**.

## Acceptance Criteria

### Restored Superadmin UI & Features
- [ ] Dropdown switcher sekolah satelit muncul dan berfungsi di navbar atas Superadmin.
- [ ] Sidebar asli Superadmin kembali lengkap dengan kartu profil, pengaturan akun, tutorial, serta daftar menu operasional sekolah satelit saat target school aktif.
- [ ] Tab "Akun Dinas Pendidikan" hadir berdampingan rapi bersama tab "Ringkasan Platform" dan "Jaringan Sekolah" di SuperadminView.

### Intact Dinas Pendidikan Functionality
- [ ] Superadmin dapat mengelola akun dinas dan menetapkan wilayah penugasan tanpa error.
- [ ] Akun dinas dapat login, melihat agregat wilayahnya, drilldown, dan cetak laporan resmi secara read-only.

### Quality Verification & Git Delivery
- [ ] `tests/dinas_pendidikan_monitoring.test.ts` lolos 100% (25/25 assertions).
- [ ] `npx tsc --noEmit` & `npm run build` sukses 0 error.
- [ ] Seluruh perubahan ter-push ke branch **`dev`** (`git push origin dev`).


## 2026-10-26T06:26:42Z

# Teamwork Project Prompt

> Goal: Single self-contained fix — keep team small and focused
> Requested team: Small focused team (one self-contained change)

Hilangkan blok tanda tangan admin dari dokumen cetak di sipjam-app: ketika user yang sedang login memiliki role `admin` (atau `Admin`), komponen `PrintSignature` di `src/components/PrintHeader.tsx` tidak boleh merender blok tanda tangan sisi kiri (kolom admin/guru yang mencetak). Kolom tanda tangan Kepala Sekolah dan Pengawas tetap ditampilkan seperti biasa.

**This is a single self-contained fix; keep it small and focused.**

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

---

## Context

- Komponen utama: `PrintSignature` di `src/components/PrintHeader.tsx`
- Interface `PrintSignatureProps` sudah memiliki prop `user?: any`
- Pengecekan role admin yang sudah ada di codebase: `(user?.role || '').toLowerCase() === 'admin'` (lihat `AdminVerifView.tsx` L25)
- `PrintSignature` dipanggil dari: `AdminRekapView`, `DinasDashboard`, `DokumenView`, `GradebookView`, `PiketView`, `RaporView`, `RekapJurnalView`, `RekapSiswaView`
- Tanda tangan kiri adalah kolom pertama di layout flex `PrintSignature` — berisi jabatan + nama + NIP dari props `leftTitle/leftName/leftNip`

## Requirements

### R1. Sembunyikan tanda tangan kiri saat pencetak adalah admin

Jika `user?.role` (case-insensitive) adalah `'admin'`, `PrintSignature` tidak merender blok tanda tangan kiri (kolom `leftTitle`, `leftName`, `leftNip`, `leftSubtitle`). Kolom tanda tangan kanan (Kepala Sekolah) dan Pengawas tetap dirender normal.

Ubah hanya `PrintHeader.tsx`. Jangan ubah caller — prop `user` sudah diteruskan dari setiap caller.

### R2. Layout tidak rusak saat kolom kiri tidak ada

Ketika kolom kiri disembunyikan, kolom tanda tangan kanan (Kepala Sekolah) tetap terposisi rapi — tidak ada ruang kosong besar di kiri, tidak ada pergeseran layout yang aneh. Gunakan flag `singleColumn` yang sudah ada jika applicable, atau sesuaikan CSS minimal.

## Acceptance Criteria

### Logika role
- [ ] `user.role === 'admin'` → blok tanda tangan kiri tidak dirender sama sekali (tidak hanya invisible/hidden, benar-benar tidak ada di DOM)
- [ ] `user.role === 'Admin'` (kapital) → sama, tidak dirender
- [ ] `user.role === 'guru'` atau role lain → blok kiri tetap dirender seperti biasa
- [ ] `user` undefined/null → perilaku default tidak berubah (blok kiri tetap ada)

### Layout
- [ ] Saat role admin, kolom Kepala Sekolah masih terlihat dan posisinya tidak bergeser ekstrem
- [ ] Tidak ada TypeScript error baru

### Scope
- [ ] Hanya `PrintHeader.tsx` yang diubah
- [ ] Tidak ada prop baru yang ditambahkan ke caller manapun
- [ ] Commit dan push ke branch `dev` setelah selesai sesuai Git Workflow Rule

---
*Expecting this to run as one contained change on a small focused team — say so if you want it broken up.*

## 2026-10-26T09:13:14Z

This is a single self-contained fix; keep it small and focused. Resolve session auto-logout stability and remove lingering test guru data from teacher attendance recap reports.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Stabilitas Sesi & Pencegahan Auto-Logout
Aplikasi tidak boleh melakukan auto-logout atau melempar pengguna ke halaman login saat terjadi fluktuasi koneksi internet, timeout, respons server lambat, atau error non-fatal saat kembali dari idle/background. Cache sesi lokal harus dipertahankan secara resilien. Sesi hanya boleh di-logout jika database secara eksplisit mengonfirmasi bahwa sesi telah dirotasi/dicabut di tempat lain atau akun tidak lagi valid.

### R2. Pembersihan & Filtrasi "Test Guru" pada Rekap Presensi
Hilangkan entri "Test Guru" dari dokumen dan tabel rekapitulasi presensi guru (`AdminRekapView.tsx` dan database `presensi_guru`). Bersihkan record uji coba usang dari database dan pastikan logika agregasi rekapitulasi memfilter entri pengujian sehingga dokumen cetak resmi bersih dari data tiruan.

### R3. Keutuhan & Validitas Test Suite
Pastikan seluruh pengujian automated (`npm test`) tetap lulus 100% tanpa regresi.

## Acceptance Criteria

### Session Resilience
- [ ] Pengguna tidak terlempar ke halaman login saat koneksi internet lambat, terputus sejenak, atau setelah aplikasi ditinggal idle di latar belakang.
- [ ] Validasi sesi pada `useSessionSync.ts`, `page.tsx`, dan `superadmin/page.tsx` mempertahankan sesi saat terjadi network error / transient server error dan hanya logout saat `dbUser.session_token !== activeUser.session_token`.

### Clean Attendance Print
- [ ] Tabel Rekapitulasi Presensi dan dokumen cetak tidak memuat "Test Guru".
- [ ] Record "Test Guru" pada tabel `presensi_guru` di database bersih.

### Regression & Verification
- [ ] Semua automated tests pada `npm test` lulus tanpa kegagalan.

## 2026-10-26T14:27:41Z

This is a single self-contained fix; keep it small and focused.

Pembersihan dead code, orphaned utilities, dan dependensi usang pada aplikasi SIPJAM (Next.js) dengan prinsip Ponytail (minimalis, YAGNI, dan eliminasi kode mati tanpa regresi).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Audit and Removal of Dead Code and Orphaned Utilities
Lakukan audit komprehensif untuk mendeteksi dan menghapus modul/fungsi/file yang tidak pernah diimpor atau dipanggil dalam alur aplikasi (seperti `src/utils/textUtils.ts` jika terbukti unreferenced, dead exports, dan helper usang), serta rapikan import yang tidak terpakai.

### R2. Dependency & Configuration Pruning
Periksa dependensi pada `package.json` dan konfigurasi terkait untuk mengeliminasi package yang sudah usang atau tidak digunakan lagi di kode aplikasi (mengikuti prinsip Ponytail untuk meminimalkan beban ketergantungan eksternal), dengan tetap memastikan dependensi yang dibutuhkan oleh runner tes tetap terjaga.

### R3. Zero Regression & Test Suite Preservation
Pastikan seluruh alur fungsional inti (Presensi, Jurnal, Piket, Rapor, Superadmin, Dinas) tidak terganggu dan seluruh rangkaian pengujian otomatis (`npm test`) tetap lulus 100% tanpa kegagalan.

## Verification Resources
- Test suite resmi: `npm test`
- Type checker: `npx tsc --noEmit`
- Linter: `npm run lint`

## Acceptance Criteria

### Dead Code & Dependency Elimination
- [ ] File atau utilitas yang teridentifikasi unreferenced / dead code (termasuk orphaned utilities) telah dihapus dari codebase.
- [ ] Tidak ada dead imports, sisa deklarasi tak terpakai, atau broken references yang tertinggal.
- [ ] Dependensi `package.json` yang usang/tidak terpakai telah dibersihkan secara aman tanpa merusak build.

### Integrity & Stability
- [ ] `npx tsc --noEmit` berjalan dengan exit code 0 tanpa error tipe TypeScript.
- [ ] `npm run lint` berjalan sukses tanpa error import atau syntax.
- [ ] Seluruh test suite `npm test` lulus 100% (semua sub-suite lolos tanpa kegagalan).
- [ ] Fitur utama aplikasi berjalan normal tanpa kehilangan fungsionalitas.


## 2026-10-27T02:19:25Z

This is a single self-contained fix; keep it small and focused.

Perbaikan data user di sistem: menggantikan user "FITRA SURYAZANA MAMONTO" menjadi "Fitra Suryazana Mamonto" (standardisasi nama akun dan data transaksi terkait), serta menghapus seluruh data user / presensi tersisa milik "Drs. Ahmad Dahlan, M.Pd.".

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Standardisasi Akun & Riwayat Guru Fitra Suryazana Mamonto
- Di tabel `users`, perbarui nama pengguna dari `"FITRA SURYAZANA MAMONTO"` (huruf kapital semua) menjadi `"Fitra Suryazana Mamonto"` (Title Case).
- Di tabel transaksi (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`), selaraskan nama guru yang sebelumnya `"FITRA SURYAZANA MAMONTO"` menjadi `"Fitra Suryazana Mamonto"` sehingga konsisten dengan data guru dan akun user.
- Pastikan relasi akun di `data_guru` (NIP/username `'Fitra'`) tetap utuh dan aktif.
- Perbarui file CSV sumber (seperti di folder `csv/`) yang masih mencatat nama kapital `"FITRA SURYAZANA MAMONTO"` agar konsisten menjadi `"Fitra Suryazana Mamonto"`.

### R2. Pembersihan Total User & Data Usang Drs. Ahmad Dahlan, M.Pd.
- Hapus seluruh sisa rekaman yang memuat `"Drs. Ahmad Dahlan, M.Pd."` dari tabel database, termasuk rekaman presensi usang di tabel `presensi_guru` (misal ID `e1144f72-2ec4-43f2-aebb-10a59063a906`).
- Pastikan tidak ada data guru, user, presensi, jurnal, atau laporan piket yang masih mereferensikan `"Drs. Ahmad Dahlan, M.Pd."`.

## Acceptance Criteria

### Verifikasi Database & Konsistensi Data
- [ ] Query ke tabel `users` untuk nama `FITRA SURYAZANA MAMONTO` mengembalikan 0 baris, dan nama untuk username `'Fitra'` terverifikasi menjadi `'Fitra Suryazana Mamonto'`.
- [ ] Query ke tabel `presensi_guru`, `jurnal_pembelajaran`, dan `laporan_piket` untuk nama guru `FITRA SURYAZANA MAMONTO` mengembalikan 0 baris, seluruhnya telah terstandardisasi menjadi `'Fitra Suryazana Mamonto'`.
- [ ] Query ke seluruh tabel database (`users`, `data_guru`, `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `data_siswa`) untuk nama `"Drs. Ahmad Dahlan, M.Pd."` mengembalikan tepat 0 baris.
- [ ] Seluruh suite pengujian otomatis (`npm test`) tetap lulus 100% tanpa regresi.

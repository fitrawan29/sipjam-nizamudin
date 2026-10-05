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

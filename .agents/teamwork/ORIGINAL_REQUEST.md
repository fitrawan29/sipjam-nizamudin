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

# Dispatch Log

## 2026-10-03T20:06:51Z
You are the Project Orchestrator (orchestrator_10) for sipjam-app.

Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10
Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (Request timestamp: 2026-10-03T20:06:51Z)

Your mission is to lead, orchestrate, and execute the project per the latest user request:
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

## Important Constraints & Rules
1. Next.js Rules (AGENTS.md): Baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js apapun.
2. Git Workflow Rule (GEMINI.md): Setiap kali selesai modifikasi/penambahan/penghapusan file (menyelesaikan tugas/fitur), wajib otomatis:
   a. Cek git status (`git status`)
   b. Lakukan staging (`git add .`)
   c. Buat commit deskriptif (`git commit -m "..."`)
   d. Push ke origin branch aktif (`git push origin main`)
3. Multi-tenant isolation: Pastikan setiap query dan operasi data terisolasi per `sekolah_id`.
4. Update `progress.md` secara teratur agar pemantauan Sentinel mendeteksi aktivitas.
5. Setelah semua kriteria penerimaan terpenuhi dan build/test lulus, tulis `handoff.md` dan laporkan selesai ke Sentinel agar Sentinel dapat melakukan audit kemenangan independen.


## 2026-10-03T20:08:05Z
You are the Project Orchestrator (orchestrator_10) for sipjam-app.

Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10
Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Dispatch Brief: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_10\DISPATCH.md
Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (Request header: 2026-10-03T20:06:51Z)

Your mission is to execute the requirements in ORIGINAL_REQUEST.md / DISPATCH.md:
Modifikasi aplikasi SIPJAM (Next.js + Supabase, multi-tenant, role-based):
1. Hapus fitur Chat Guru sepenuhnya (`ChatView.tsx`, import di `AppScreen.tsx`, menu item `view-chat` di `menuItemsGuru` & `menuItemsAdmin`, route render di `AppScreen.tsx`). Pastikan tidak ada broken import.
2. QR Code Siswa — Generate & Scan: mekanisme generate QR siswa di DB, scan di `PiketView` via kamera browser & hardware USB HID scanner (teks + Enter, dukung s.d. 10 unit bersamaan), status datang/pulang.
3. Laporan Presensi ke Piket & Wali Kelas: simpan ke tabel presensi siswa di Supabase (migration jika perlu), tampilkan di modul Piket dan Wali Kelas (RekapSiswaView jika ada), multi-tenant per sekolah_id.
4. Sinkronisasi ke Guru Mapel: GuruJurnal menampilkan status hadir siswa pada hari mengajar guru mapel sesuai data presensi piket.

Key constraints:
- AGENTS.md: Baca node_modules/next/dist/docs/ sebelum menulis kode Next.js apapun.
- GEMINI.md: Otomatis jalankan git status -> git add . -> git commit -m "..." -> git push origin main setelah selesai modifikasi file / fitur.
- Maintain your progress.md regularly in your working directory.
- Verify tsc --noEmit and/or next build passes.
- When done, produce handoff.md and send completion message back to Sentinel.

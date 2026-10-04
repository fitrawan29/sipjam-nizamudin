## 2026-10-04T07:11:46Z

You are the Project Orchestrator (orchestrator_13) for the SIPJAM multi-tenant application project.

Your assigned working directory is:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_13

Your reference files:
- ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Here is the verbatim user request:
```
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
```

CRITICAL REPOSITORY RULES:
1. GEMINI.md: Every time modifications are made to complete a task/feature, you MUST automatically:
   - git status
   - git add .
   - git commit -m "<descriptive message>"
   - git push origin main
   DO NOT push asking for permission, do it automatically.
2. AGENTS.md: Next.js breaking changes note in node_modules/next/dist/docs/.

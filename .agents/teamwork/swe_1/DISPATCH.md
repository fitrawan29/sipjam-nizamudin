## 2026-11-10T00:45:46Z
This is a single self-contained fix; keep it small and focused. Sesuaikan fitur intervensi wali kelas pada presensi siswa agar tetap dapat dilakukan meskipun wali kelas tersebut berstatus presensi dinas luar, izin, sakit, cuti, atau status non-hadir lainnya, tanpa memengaruhi fitur dan logika aplikasi yang sudah ada.

Integrity mode: development

## Requirements

### R1. Intervensi Presensi Siswa oleh Wali Kelas Berstatus Non-Hadir
Izinkan wali kelas untuk melakukan intervensi presensi terhadap siswa binaannya meskipun presensi wali kelas pada hari tersebut berstatus dinas luar, izin, sakit, cuti, atau status non-hadir lainnya, selama pengguna terotentikasi dan terverifikasi sebagai wali kelas dari siswa terkait.

### R2. Preservasi Logika Eksisting dan Pencegahan Regresi
Perubahan aturan validasi tidak boleh mengubah alur presensi reguler, validasi untuk peran/guru selain wali kelas, atau logika presensi siswa lainnya. Semua aturan bisnis presensi yang sudah berjalan harus tetap berfungsi normal.

## Acceptance Criteria

### Fungsionalitas Intervensi
- [ ] Wali kelas dengan status presensi dinas luar dapat berhasil melakukan intervensi presensi siswa di kelas binaannya.
- [ ] Wali kelas dengan status presensi izin, sakit, atau cuti dapat berhasil melakukan intervensi presensi siswa di kelas binaannya.
- [ ] Pengguna yang bukan wali kelas dari siswa terkait tetap ditolak saat mencoba melakukan intervensi presensi siswa tersebut sesuai aturan otorisasi yang berlaku.

### Integritas Sistem & Regresi
- [ ] Logika presensi guru reguler dan pencatatan presensi siswa umum tetap berjalan tanpa error atau perubahan perilaku yang tidak diharapkan.
- [ ] Perubahan kode diverifikasi menggunakan automated test yang relevan atau skrip verifikasi programmatic mandiri yang membuktikan kondisi terpenuhi dan tidak ada regresi.


## 2026-11-11T06:12:53Z
This is a single self-contained fix; keep it small and focused. Sesuaikan pengisian absensi siswa pada mapel terkait agar dipisahkan dari pengisian jurnal KBM dengan tombol atau antarmuka terpisah, namun data kehadiran dan jurnal KBM tetap terhitung sekaligus untuk sesi KBM yang bersangkutan. Gunakan pendekatan /ponytail: solusi yang paling simpel, minimal, to-the-point, dan hindari over-engineering.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Pemisahan Antarmuka Pengisian Absensi Siswa dan Jurnal KBM
Sediakan tombol atau antarmuka terpisah untuk pengisian absensi siswa dan pengisian jurnal KBM pada halaman jadwal/mapel terkait. Pengguna guru dapat mengisi dan menyimpan absensi siswa secara terpisah tanpa harus langsung mengisi form jurnal KBM, dan sebaliknya.

### R2. Perhitungan Terpadu Sesi KBM
Meskipun pengisian absensi siswa dan pengisian jurnal KBM dipisahkan, data kehadiran siswa dan jurnal KBM harus tetap saling terhubung serta terhitung sekaligus dalam sesi/jam mengajar KBM mapel yang bersangkutan.

### R3. Pendekatan Minimalis (/ponytail) dan Prosedur Git
Terapkan solusi yang paling sederhana, minimal, to-the-point, dan hindari penambahan abstraksi atau dependensi yang tidak diperlukan. Setelah selesai memodifikasi kode dan memverifikasi fungsionalitas, patuhi aturan git di GEMINI.md: jalankan git status, git add ., git commit dengan pesan yang deskriptif, dan git push origin main.

## Acceptance Criteria

### Fungsional
- [ ] Tersedia tombol atau antarmuka terpisah untuk pengisian absensi siswa dan pengisian jurnal KBM pada halaman jadwal/mapel terkait.
- [ ] Pengguna guru dapat mengisi dan menyimpan data absensi siswa secara mandiri tanpa harus mengisi jurnal KBM pada saat yang sama.
- [ ] Pengguna guru dapat mengisi dan menyimpan data jurnal KBM secara mandiri tanpa merusak atau mereset data absensi siswa yang telah diisi.
- [ ] Data absensi siswa dan jurnal KBM tetap terhubung dan terhitung sekaligus untuk sesi/jam KBM mapel terkait.

### Verifikasi dan Git
- [ ] Fungsionalitas pemisahan alur absensi dan jurnal KBM terverifikasi berfungsi dengan baik tanpa regresi pada alur KBM yang ada.
- [ ] Seluruh perubahan kode telah di-commit dan di-push ke branch main sesuai aturan GEMINI.md.


## 2026-11-11T08:30:49Z
Server restart occurred. Please check your current status, revive or inspect your subagents, and continue execution of the SWE Light workflow: complete implementation, run verification tests, proceed with adversarial review rounds, ensure all criteria are satisfied, and perform git commit and push to main per GEMINI.md.

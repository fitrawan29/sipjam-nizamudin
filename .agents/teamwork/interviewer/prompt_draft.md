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

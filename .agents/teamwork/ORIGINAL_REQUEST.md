# Original User Request

## Initial Request — 2026-11-06T22:27:38Z

Melakukan penyesuaian fungsional pada role admin aplikasi sipjam-app untuk kebutuhan produksi pada modul pusat verifikasi data (termasuk cetak dokumen presensi dan jurnal), laporan dan analitik kerja, asesmen dan rapor, master data, serta pengaturan sistem, dengan memastikan seluruh perubahan tidak merusak atau mempengaruhi fitur dan logika yang sudah ada (zero regression).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyesuaian Pusat Verifikasi Data & Cetak Dokumen Terkait
- Pada bagian presensi dan jurnal, jika guru dalam keadaan libur, izin, atau sakit, status tersebut harus terbaca dan diakomodasi dengan benar pada validasi presensi dan jurnal (tidak dianggap alpa/belum presensi/belum mengisi jurnal).
- Pada hasil cetak dokumen presensi dan jurnal, status izin dan sakit dicantumkan dengan benar, sedangkan keterangan libur tidak perlu dimasukkan pada cetak dokumen.
- Pada bagian perangkat, mata pelajaran untuk kelas X harus dituliskan dengan benar, bukan tertulis sebagai mata pelajaran umum.

### R2. Penyesuaian Laporan dan Analitik Kerja
- Menghilangkan sub menu cetak dokumen resmi dari modul laporan dan analitik kerja.

### R3. Penyesuaian Asesmen dan Rapor (Buku Nilai Mapel)
- Pada bagian buku nilai mapel, alur pemilihan harus dimulai dengan memilih guru pengampu terlebih dahulu.
- Setelah guru pengampu dipilih, sistem menyesuaikan daftar mata pelajaran dan kelas yang ditugaskan kepada guru tersebut secara berjenjang, di mana pilihan kelas mengikuti mata pelajaran yang dipilih (misalnya jika mata pelajaran berada di kelas XI, maka daftar kelas yang ditampilkan adalah kelas XI).

### R4. Penyesuaian Master Data (Alur Input, Template, Progress, dan Error Handling)
- Menata urutan navigasi menu dan panduan alur penginputan master data sesuai urutan: siswa, kelas, mapel, guru, jadwal, wali kelas, pengguna, kalender, dan periode sistem blok (opsional), dengan validasi dependensi saat proses upload.
- Memastikan template data pada masing-masing master data sesuai dengan format skema database agar tidak ada error saat pengunggahan.
- Menampilkan visualisasi progres unggah (progress bar / indikator) yang dapat dilihat pengguna saat proses upload berlangsung.
- Menampilkan keterangan error yang jelas dan spesifik jika terjadi kegagalan upload, baik yang bersumber dari database maupun validasi aplikasi.

### R5. Penyesuaian Pencadangan Data Sistem
- Fitur pencadangan pada pengaturan sistem harus mencadangkan seluruh data yang ada dan berhubungan pada aplikasi.
- Berkas cadangan dikemas dalam format ZIP dengan pemisahan folder data (berisi seluruh tabel/entitas database dalam format JSON terstruktur) dan folder foto/aset, namun tetap berada dalam satu berkas ZIP yang sama.
- Format data yang dicadangkan harus kompatibel dan dapat dibaca kembali oleh aplikasi di kemudian hari untuk proses pemulihan (restore).

### R6. Preservasi Fitur dan Logika Eksisting (Zero Regression)
- Seluruh penyesuaian tidak boleh mempengaruhi fitur, alur kerja, maupun logika bisnis lain di luar cakupan yang ditentukan, dan seluruh fungsi aplikasi yang sudah berjalan tetap beroperasi normal.

## Acceptance Criteria

### Pusat Verifikasi Data & Cetak Dokumen
- [ ] Validasi presensi dan jurnal membaca serta menampilkan status guru yang libur, izin, atau sakit dengan benar tanpa menandainya sebagai alpa atau kelalaian jurnal.
- [ ] Cetak dokumen presensi dan jurnal mencantumkan keterangan status izin dan sakit secara akurat dan terbaca jelas, serta tidak memasukkan keterangan libur pada hasil cetak dokumen.
- [ ] Tampilan mata pelajaran kelas X pada verifikasi perangkat menampilkan nama mata pelajaran yang spesifik/benar dan tidak tertulis "mata pelajaran umum".

### Laporan dan Analitik Kerja
- [ ] Sub menu cetak dokumen resmi telah dihilangkan dari navigasi menu dan routing antarmuka laporan dan analitik kerja.

### Asesmen dan Rapor (Buku Nilai Mapel)
- [ ] Alur filter buku nilai mapel mengharuskan pemilihan guru pengampu terlebih dahulu.
- [ ] Dropdown mata pelajaran terfilter hanya untuk mata pelajaran yang ditugaskan kepada guru yang dipilih.
- [ ] Dropdown kelas terfilter dinamis mengikuti kelas dari mata pelajaran yang dipilih untuk guru tersebut.

### Master Data
- [ ] Urutan menu navigasi master data tersusun sesuai: Siswa -> Kelas -> Mapel -> Guru -> Jadwal -> Wali Kelas -> Pengguna -> Kalender -> Periode Sistem Blok.
- [ ] Template unduhan untuk setiap entitas master data sesuai dengan skema database dan dapat diunggah ulang tanpa error format.
- [ ] Komponen upload master data menampilkan indikator progress yang bergerak saat proses pengunggahan berlangsung.
- [ ] Ketika upload data gagal atau tidak valid, sistem menampilkan rincian error yang jelas (berdasarkan error database maupun validasi aplikasi).

### Pencadangan Sistem
- [ ] Fitur pencadangan menghasilkan berkas ZIP yang memuat seluruh data aplikasi dengan struktur folder data (format JSON) dan folder foto yang terpisah.
- [ ] Format data JSON dan berkas foto dalam file cadangan terverifikasi dapat dibaca ulang oleh sistem aplikasi untuk pemulihan.

### Preservasi Sistem
- [ ] Fitur dan logika aplikasi yang sudah ada di luar 6 poin perubahan tetap berfungsi normal tanpa regresi fungsional.

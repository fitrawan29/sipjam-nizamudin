## 2026-09-12T05:37:51+07:00

You are Project Orchestrator 5 (orchestrator_5).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5

The project repository root is: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Refer to the authoritative user request in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md (under section 2026-09-11T22:35:46Z).

## Core Task Summary (Milestone 5 - Full Team)
1. R1. Penyesuaian Format Cetak Kop Surat & Tanda Tangan:
   - Tambahkan input "Nama Kota/Kabupaten" pada halaman Pengaturan Admin dan simpan konfigurasinya ke Supabase (tabel pengaturan/sekolah).
   - Pada style cetak (print): set line-height ke 1 untuk jarak spasi.
   - Teks alamat kop surat wajib 1 baris. Gunakan teknik CSS (misal: white-space nowrap dan penyesuaian font-size otomatis) agar teks tidak terpotong atau membungkus (wrap) ke baris baru.
   - Letakkan logo yayasan (kiri) dan logo dinas (kanan) bersumber dari tabel pengaturan.
   - Format tanda tangan: Letakkan seluruh blok tanggal dan tanda tangan di rata kanan (align right / justify-end).
   - Baris pertama tanda tangan menggunakan format "[Kota/Kabupaten dari Pengaturan], [DD Bulan YYYY]". Diikuti dengan "Kepala Sekolah", nama, dan NIP.

2. R2. Modifikasi Struktur Database & Form Jurnal KBM:
   - Tambahkan kolom-kolom baru ke tabel `jurnal_pembelajaran` di Supabase untuk menampung data: pertemuan_ke, jam_ke, tujuan_pembelajaran, materi_pembelajaran, kehadiran_murid, catatan_refleksi, foto_kegiatan (sesuaikan kolom yang belum ada).
   - Perbarui UI `GuruJurnal.tsx` dengan field input baru agar guru dapat mengisi kelengkapan data tersebut.

3. R3. Rekonstruksi Tabel Rekap Jurnal Pembelajaran:
   - Pada tampilan `RekapJurnalView.tsx` dan saat dicetak, gunakan tata letak tabel dengan tepat 8 kolom ini:
     1. Hari, tanggal bulan tahun
     2. Kelas, pertemuan dan jam ke-
     3. Tujuan pembelajaran
     4. Materi pembelajaran
     5. Kegiatan pembelajaran
     6. Kehadiran murid
     7. Catatan refleksi
     8. Foto kegiatan

4. R4. Menampilkan Jadwal Mengajar Harian:
   - Tambahkan informasi/widget jadwal mata pelajaran khusus guru yang bersangkutan pada halaman dashboard utama mereka (HomeView), disesuaikan dengan hari berjalan.

5. R5. Bug Hunting & Stabilisasi:
   - Eksplorasi seluruh komponen aplikasi, perbaiki bug yang ditemukan (UI glitch, logic errors, null references).
   - Lakukan pengecekan ketat pada kode yang diubah.

## Acceptance Criteria:
- `npx tsc --noEmit` menghasilkan exit code 0 tanpa error tipe data baru.
- Kueri ke Supabase `information_schema.columns` memverifikasi kolom baru pada `jurnal_pembelajaran` telah berhasil ditambahkan.
- Komponen admin (Pengaturan) berhasil menyimpan data `kota_kabupaten`.
- Elemen alamat kop surat (print-only) dikonfigurasi dengan CSS agar tidak membungkus (`whitespace-nowrap`) dengan skala font yang dapat menyusut (jika menggunakan text-wrap styling).
- Blok tanda tangan (PrintSignature) memiliki CSS flex/grid yang memaksanya merapat ke kanan (`justify-end`).
- Tabel rekap jurnal menggunakan tag `<table>` yang secara eksplisit memiliki 8 header `<th>` sesuai urutan yang diminta.
- Halaman dashboard guru (HomeView) merender daftar mata pelajaran/jadwal spesifik untuk guru tersebut di hari itu berdasarkan tabel `jadwal_pelajaran`.

## Mandatory Project Rules:
- Git Workflow (GEMINI.md): Setiap kali selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini:
  1. git status
  2. git add .
  3. git commit -m "..."
  4. git push origin main (atau branch aktif)
- AGENTS.md: Heed Next.js breaking changes and conventions.
- Maintain your own `plan.md` and `progress.md` in `.agents/orchestrator_5/`. Update `progress.md` regularly for sentinel tracking.
- When all requirements are implemented and verified, submit your completion report to sentinel.

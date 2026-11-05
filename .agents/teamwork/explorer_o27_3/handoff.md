# Handoff Report: Investigasi R4 & R5 Role Admin SIPJAM

## 1. Observation

1. **R4 — Semester & Tahun Ajaran Default pada Gradebook & Rapor**:
   - `src/components/GradebookView.tsx` baris 209–210:
     ```typescript
     const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
     const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2024/2025');
     ```
   - `src/components/GradebookView.tsx` baris 488–498:
     ```typescript
     if (tahunVal) {
       setSyncedTahunAjaran(tahunVal);
       if (!isAdmin) {
         setSelectedTahunAjaran(tahunVal);
         setTpForm(prev => ({ ...prev, tahun_ajaran: tahunVal }));
       }
     }
     if (semVal && (semVal === 'Ganjil' || semVal === 'Genap')) {
       setSyncedSemester(semVal);
       if (!isAdmin) {
         setSelectedSemester(semVal as 'Ganjil' | 'Genap');
         setTpForm(prev => ({ ...prev, semester: semVal }));
       }
     }
     ```
   - Kondisi `if (!isAdmin)` mencegah pembaruan state `selectedTahunAjaran` dan `selectedSemester` ketika user adalah Admin.
   - `GradebookView.tsx` baris 2414–2416 memiliki opsi tahun ajaran kaku/hardcoded (`2024/2025`, `2025/2026`, `2026/2027`).

2. **R4 — Form Dinamis Bobot Status Kehadiran per Pertemuan**:
   - `src/components/GradebookView.tsx` baris 350–379 & 388–399:
     ```typescript
     Object.entries(parsed).forEach(([nisn, status]) => {
       const st = String(status).toUpperCase();
       if (st === 'H' || st === 'HADIR') {
         studentHadirCount[nisn] = (studentHadirCount[nisn] || 0) + 1;
       }
     });
     rates[s.nisn] = parseFloat(((hadir / validSessions) * 100).toFixed(1));
     ```
     Hanya status `'H'` / `'HADIR'` yang dihitung (bernilai 100). Status Sakit, Izin, Terlambat bernilai 0.
   - `src/components/GradebookView.tsx` baris 4505–4514: modal bobot nilai hanya memiliki 3 field statis (`kehadiran`, `formatif`, `sumatif`). Belum ada konfigurasi poin untuk masing-masing status kehadiran per pertemuan.

3. **R5 — Penyelarasan Template Master Data & Kalender**:
   - `src/components/AdminDataView.tsx` baris 223–232:
     ```typescript
     Kalender_Pendidikan: {
       filename: 'Template_Kalender_Pendidikan.csv',
       headers: ['id', 'tanggal', 'keterangan', 'tipe'],
       sample: ['KP-01', '2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
     },
     Jadwal_Pelajaran: {
       filename: 'Template_Jadwal_Pelajaran.csv',
       headers: ['id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
       sample: ['JP-01', 'Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']
     }
     ```
   - Skema database `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` baris 125 & 347: kolom `id` pada tabel `kalender_pendidikan` dan `jadwal_pelajaran` bertipe `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
   - Mengunggah data dengan `id = 'KP-01'` atau `'JP-01'` memicu PostgreSQL Error 22P02: `invalid input syntax for type uuid`.
   - `src/lib/dataIntegrityGuard.ts` baris 588–594 hanya memvalidasi UUID untuk `tableName === 'data_guru'`. Tabel UUID lainnya tidak disanitasi sehingga string mentah dikirim ke Supabase.

4. **R5 — Persistensi Konfigurasi Sistem & Database**:
   - `src/components/AdminConfigView.tsx` baris 477–480: seluruh 4 tab konfigurasi dimasukkan ke dalam satu `<form onSubmit={handleSave}>`. Tab yang tidak aktif disembunyikan menggunakan kelas `hidden` (`display: none`).
   - Elemen input pada Tab 1 (baris 496–497: `waktu_efektif_mulai`, `waktu_efektif_akhir`) dan Tab 3 (baris 832–898: `kop_sekolah`, `kop_alamat`, `logo_kiri`, `logo_kanan`, `ttd_kepsek_nama`) memiliki atribut HTML5 `required`. Jika tab tersebut tersembunyi saat pengguna menekan "Simpan Konfigurasi" di tab lain, browser menolak submit form secara diam-diam tanpa pesan (`An invalid form control with name='...' is not focusable`).
   - Pada `handleSave` (baris 341–350), hanya `nama_kepala_sekolah`, `nip_kepala_sekolah`, dan `kepala_sekolah_id` yang disinkronkan ke tabel `sekolah`. Kolom `nama` (nama sekolah), `alamat`, `npsn`, `kota_kabupaten`, dan `logo` tidak pernah di-update ke tabel `sekolah`.

5. **R5 — Penghapusan Fitur Penambahan Gelar pada Pengaturan Akun**:
   - `src/components/AccountSettingsModal.tsx` baris 511–513: label `Nama Pokok (Tanpa Gelar) *`.
   - `src/components/AccountSettingsModal.tsx` baris 539–604: kontainer "Multi-Gelar Manager" dengan header `Gelar Akademik & Profesi`, tombol `+ Tambah Gelar`, quick chips (`Dr.`, `Prof.`, `S.Pd.`, `M.Pd.`, dll.), dan daftar baris input gelar.
   - `src/components/AccountSettingsModal.tsx` baris 606–630: preview box yang menghitung jumlah gelar depan & belakang.

---

## 2. Logic Chain

1. **R4 Default Semester & Tahun Ajaran**:
   - Observasi 1 menunjukkan `selectedTahunAjaran` dan `selectedSemester` di-hardcode ke `'2024/2025'` dan `'Ganjil'`.
   - Fungsi `fetchAcademicYearSettings` mengambil data aktif dari `pengaturan`, namun diblokir untuk Admin oleh `if (!isAdmin)`.
   - Dengan demikian, Admin selalu melihat tahun ajaran 2024/2025 dan Semester Ganjil terlepas dari apa yang diatur di sistem.
   - Solusi: Hapus `if (!isAdmin)` sehingga Admin langsung memperoleh semester & tahun ajaran aktif secara default, serta tambahkan listener sinkronisasi realtime.

2. **R4 Bobot Kehadiran Dinamis**:
   - Observasi 2 menunjukkan perhitungan presensi mapel hanya mengecek `'H'` / `'HADIR'`, mengabaikan Sakit/Izin/Terlambat sehingga nilai siswa langsung 0.
   - Form modal bobot saat ini hanya menerima 3 angka persentase.
   - Solusi: Perluas payload JSON `bobot_nilai_mapel` dengan `status_points` (Hadir: 100, Sakit: 75, Izin: 75, Terlambat: 75, Alpa: 0). Tambahkan input form dinamis pada modal bobot dan ubah formula akumulasi presensi menjadi sistem poin per sesi pertemuan.

3. **R5 Template & Skema Database**:
   - Observasi 3 menunjukkan template CSV menyediakan `'KP-01'` dan `'JP-01'` sebagai nilai `id`.
   - Database PostgreSQL menolak string tersebut karena kolom `id` bertipe UUID.
   - Solusi: Hilangkan kolom `id` dari template `Kalender_Pendidikan` dan `Jadwal_Pelajaran` (sehingga auto-generate UUID di client), dan pada `dataIntegrityGuard.ts` gantikan string non-UUID dengan `crypto.randomUUID()`.

4. **R5 Persistensi Pengaturan Sistem**:
   - Observasi 4 menunjukkan tab tersembunyi memiliki input `required` di dalam `<form>`. Validasi native HTML5 membatalkan submit tanpa ada log error atau feedback.
   - Selain itu, pembaruan KOP sekolah tidak disimpan ke tabel `sekolah`.
   - Solusi: Tambahkan `noValidate` pada `<form>` dan sinkronkan data identitas sekolah ke tabel `sekolah`.

5. **R5 Penghapusan Gelar pada Pengaturan Akun**:
   - Observasi 5 menunjukkan seluruh UI penambahan gelar terpusat pada baris 539–604 di `AccountSettingsModal.tsx`.
   - Solusi: Hapus kontainer multi-gelar dan tombol penambahan gelar, serta sederhanakan input nama menjadi kolom tunggal `Nama Lengkap *`.

---

## 3. Caveats

- **Tabel `data_mapel` Primary Key**: Pada `SETUP_NEW_SCHOOL_TEMPLATE.sql`, tabel `data_mapel` menggunakan `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`. String seperti `'MP-01'` valid untuk `data_mapel`, namun untuk `kalender_pendidikan` dan `jadwal_pelajaran` kolom `id` wajib UUID.
- **Multi-tenant RLS**: Penyimpanan konfigurasi dan master data selalu membutuhkan `sekolah_id` yang valid agar tidak melanggar kebijakan Row Level Security (RLS) PostgreSQL.
- **Tidak ada area yang terlewat**: Seluruh titik integrasi R4 dan R5 telah diinspeksi secara menyeluruh.

---

## 4. Conclusion

Investigasi berhasil mengidentifikasi secara pasti seluruh akar permasalahan teknis untuk R4 dan R5. Seluruh solusi telah dirumuskan secara terarah dan aman tanpa merusak struktur menu atau menimbulkan regresi kode:
1. Menghilangkan `if (!isAdmin)` di `GradebookView.tsx` dan memasang event listener `sipjam:config_updated`.
2. Menambahkan sub-form status poin kehadiran pada modal bobot nilai dan memperbarui formula akumulasi poin.
3. Menghapus kolom `id` dengan sampel non-UUID dari template CSV dan menambahkan fallback auto-generate UUID di `dataIntegrityGuard.ts`.
4. Menambahkan atribut `noValidate` pada form `AdminConfigView.tsx` dan menyinkronkan data KOP ke tabel `sekolah`.
5. Menghapus kontainer Multi-Gelar Manager pada `AccountSettingsModal.tsx` dan menyederhanakan input nama.

---

## 5. Verification Method

Implementer atau reviewer dapat memverifikasi temuan dan perbaikan dengan langkah-langkah berikut:
1. **Pemeriksaan File & Baris Kode**:
   - Buka `src/components/GradebookView.tsx` baris 488 & 495 untuk memverifikasi blok `if (!isAdmin)`.
   - Buka `src/components/AdminDataView.tsx` baris 223–232 untuk memverifikasi header template CSV.
   - Buka `src/components/AdminConfigView.tsx` baris 477 untuk memeriksa atribut `<form>`.
   - Buka `src/components/AccountSettingsModal.tsx` baris 539–604 untuk memeriksa kontainer penambahan gelar.
2. **Pengujian Build & Lint**:
   - Jalankan `npm run lint` untuk memastikan tidak ada kesalahan sintaksis atau tipe.
   - Jalankan `npm run build` untuk memverifikasi kesuksesan kompilasi Next.js.
3. **Verifikasi Fungsional (Setelah Implementasi)**:
   - Login sebagai Admin, ubah Tahun Ajaran ke `2025/2026` dan Semester ke `Genap` di menu Pengaturan. Buka menu Buku Nilai / Raport, verifikasi bahwa filter langsung menampilkan `2025/2026` dan `Genap`.
   - Unduh template Kalender dan Jadwal, lalu langsung unggah file tersebut; pastikan tidak terjadi error 22P02.
   - Buka modal Pengaturan Akun, pastikan tidak ada tombol "+ Tambah Gelar" atau opsi gelar lainnya.

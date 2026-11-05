# LAPORAN INVESTIGASI LENGKAP: R4 & R5 ROLE ADMIN SIPJAM

**Tanggal**: 2026-11-05  
**Explorer**: explorer_o27_3  
**Fokus Investigasi**:  
1. **R4 (Asesmen dan Raport Sekolah)**:
   - Sinkronisasi Semester dan Tahun Pelajaran aktif default sesuai pengaturan Admin pada Gradebook & Rapor.
   - Konfigurasi form dinamis pada bobot nilai (khususnya bobot per status kehadiran pertemuan: Hadir, Sakit, Izin, Terlambat, Alpa) dan rumus kalkulasinya.
2. **R5 (Master Data, Kalender, Pengaturan Sistem & Database, Pengaturan Akun)**:
   - Penyesuaian seluruh file template master data dan kalender terhadap skema database Supabase PostgreSQL agar impor CSV bebas error.
   - Persistensi seluruh perubahan konfigurasi pada setiap sub menu pengaturan sistem & database ke database dan sistem.
   - Penghapusan fitur dan bidang penambahan gelar pada menu pengaturan akun.

---

## 1. R4 — ASESMEN DAN RAPORT SEKOLAH

### 1.1 Fokus 1: Default Semester dan Tahun Pelajaran Aktif Sesuai Pengaturan Admin

#### Temuan Investigasi:
1. **Penyimpanan Pengaturan Admin**:
   - Dikelola di `src/components/AdminConfigView.tsx` dan disimpan ke tabel `pengaturan` pada Supabase dengan struktur baris key-value:
     - `key = 'tahun_ajaran'`, contoh nilai: `'2024/2025'`
     - `key = 'semester'`, contoh nilai: `'Ganjil'` atau `'Genap'`
   - Saat Admin menekan tombol simpan, sistem melakukan:
     - `supabase.from('pengaturan').upsert(..., { onConflict: 'sekolah_id,key' })`
     - Mengirim event browser `window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: syncPayload }))`
     - Menyimpan cache sinkronisasi di `localStorage.setItem('sipjam_config_sync', JSON.stringify(syncPayload))`

2. **Kondisi di `RaporView.tsx` (`src/components/RaporView.tsx`)**:
   - `RaporView.tsx` telah mengimplementasikan pemuatan konfigurasi aktif melalui fungsi `fetchSchoolConfig` (baris 152–217) dan pendengar event `sipjam:config_updated` (baris 285–338).
   - Di baris 190–205:
     ```typescript
     if (isInitial || !hasInitializedConfig.current || selectedTahunAjaranRef.current === prevActiveTa) {
       selectedTahunAjaranRef.current = activeTa;
       setSelectedTahunAjaran(activeTa);
     }
     if (isInitial || !hasInitializedConfig.current || selectedSemesterRef.current === prevActiveSem) {
       selectedSemesterRef.current = normSem;
       setSelectedSemester(normSem);
     }
     ```
   - Namun, terdapat celah jika `pengaturan` belum memiliki baris `tahun_ajaran` atau format semester menggunakan variasi huruf besar/kecil, serta inisialisasi state awal di baris 48–51 yang masih bernilai statis `2024/2025` dan `Ganjil`.

3. **Akar Masalah Utama di `GradebookView.tsx` (`src/components/GradebookView.tsx`)**:
   - Pada baris 209–210:
     ```typescript
     const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
     const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2024/2025');
     ```
   - Pada `fetchAcademicYearSettings` (baris 470–504):
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
   - **BUG KRITIS**: Blok `if (!isAdmin)` secara sengaja **mengecualikan role Admin** dari penyesuaian state `selectedTahunAjaran` dan `selectedSemester`! Akibatnya:
     - Ketika Admin membuka menu Gradebook / Buku Nilai, tahun ajaran selalu terkunci pada nilai bawaan `'2024/2025'` dan semester `'Ganjil'`, meskipun Admin telah menyetel tahun berjalan misalnya `'2025/2026'` Semester `'Genap'` di pengaturan.
   - Selain itu, `GradebookView` **tidak memiliki listener** untuk event `sipjam:config_updated` maupun `storage`, sehingga perubahan konfigurasi di tab admin tidak otomatis memperbarui Gradebook tanpa hard reload.
   - Pilihan tahun ajaran di dropdown Admin (baris 2414–2416) masih di-hardcode secara kaku:
     ```tsx
     <option value="2024/2025">2024/2025</option>
     <option value="2025/2026">2025/2026</option>
     <option value="2026/2027">2026/2027</option>
     ```

#### Rekomendasi Solusi untuk Implementer:
1. Di `src/components/GradebookView.tsx`:
   - Hapus pembatasan `if (!isAdmin)` pada baris 488 dan 495, sehingga baik Admin maupun Guru langsung menggunakan nilai `tahunVal` dan `semVal` hasil query `pengaturan` sebagai nilai awal `selectedTahunAjaran` dan `selectedSemester`.
   - Tambahkan `useEffect` event listener untuk `sipjam:config_updated` dan event `storage` agar saat Admin mengubah semester/tahun di menu pengaturan, Gradebook langsung tersinkronisasi realtime.
   - Jadikan daftar opsi tahun ajaran dinamis (mengambil tahun aktif ±2 tahun atau daftar tahun dari database, seperti yang diterapkan pada `RaporView.tsx`).
2. Di `src/components/RaporView.tsx`:
   - Pastikan fallback `activeSchoolTahunAjaran` dan `activeSchoolSemester` langsung diaplikasikan tanpa jeda rendering.

---

### 1.2 Fokus 2: Konfigurasi Form Dinamis Bobot Nilai Kehadiran & Perhitungan Poin per Pertemuan

#### Temuan Investigasi:
1. **Penyimpanan Bobot Saat Ini**:
   - Disimpan pada tabel `pengaturan` dengan `key = 'bobot_nilai_mapel'`.
   - Saat ini hanya berupa JSON 3 angka persentase:
     ```json
     { "kehadiran": 40, "formatif": 30, "sumatif": 30 }
     ```
   - Diatur oleh Admin melalui modal di `GradebookView.tsx` (baris 4491–4536) yang dibuka melalui tombol di header (baris 2312).
   - Di baris 908–910, sistem memvalidasi `kehadiran + formatif + sumatif === 100`.

2. **Kelemahan Perhitungan Kehadiran Saat Ini**:
   - Diperiksa pada `GradebookView.tsx` fungsi `fetchMapelAttendance` (baris 350–379):
     ```typescript
     Object.entries(parsed).forEach(([nisn, status]) => {
       const st = String(status).toUpperCase();
       if (st === 'H' || st === 'HADIR') {
         studentHadirCount[nisn] = (studentHadirCount[nisn] || 0) + 1;
       }
     });
     // Formula:
     rates[s.nisn] = parseFloat(((hadir / validSessions) * 100).toFixed(1));
     ```
   - Begitu juga fallback di baris 392:
     ```typescript
     if (st === 'H' || st === 'HADIR') studentStats[row.nisn].hadir++;
     ```
   - **MASALAH**: Sistem saat ini **hanya memberikan nilai untuk status HADIR (100 poin)**. Semua status presensi lainnya:
     - **Sakit ('S' / 'SAKIT')** = 0 poin
     - **Izin ('I' / 'IZIN')** = 0 poin
     - **Terlambat ('T' / 'TERLAMBAT')** = 0 poin
     - **Alpa ('A' / 'ALPA')** = 0 poin
   - Hal ini merugikan siswa yang sakit atau berizin sah, karena nilai kehadiran mata pelajaran langsung jatuh ke 0 untuk pertemuan tersebut.

3. **Kebutuhan Form Dinamis Sesuai Request**:
   - Admin memerlukan form dinamis untuk mengatur nilai poin untuk setiap status kehadiran per pertemuan, dengan nilai default sesuai arahan:
     - **Hadir**: 100 poin
     - **Sakit**: 75 poin
     - **Izin**: 75 poin
     - **Terlambat**: 75 poin
     - **Alpa**: 0 poin

#### Rekomendasi Solusi untuk Implementer:
1. **Struktur Data Baru di `pengaturan` (`key = 'bobot_nilai_mapel'`)**:
   ```json
   {
     "kehadiran": 40,
     "formatif": 30,
     "sumatif": 30,
     "status_points": {
       "hadir": 100,
       "sakit": 75,
       "izin": 75,
       "terlambat": 75,
       "alpa": 0
     }
   }
   ```
2. **Form Dinamis pada Modal Bobot Nilai (`GradebookView.tsx`)**:
   - Tambahkan state `statusPoints` (default: `{ hadir: 100, sakit: 75, izin: 75, terlambat: 75, alpa: 0 }`).
   - Tampilkan sub-section baru di dalam `isBobotModalOpen`:
     - Input angka 0–100 untuk masing-masing status kehadiran: Hadir, Sakit, Izin, Terlambat, Alpa.
     - Simpan bersama payload bobot di `handleSaveBobot`.
3. **Rumus Akumulasi Nilai Kehadiran**:
   - Dalam `fetchMapelAttendance`, ganti perhitungan `studentHadirCount` menjadi akumulasi poin:
     ```typescript
     const pointsCfg = {
       H: statusPoints.hadir ?? 100,
       HADIR: statusPoints.hadir ?? 100,
       S: statusPoints.sakit ?? 75,
       SAKIT: statusPoints.sakit ?? 75,
       I: statusPoints.izin ?? 75,
       IZIN: statusPoints.izin ?? 75,
       T: statusPoints.terlambat ?? 75,
       TERLAMBAT: statusPoints.terlambat ?? 75,
       A: statusPoints.alpa ?? 0,
       ALPA: statusPoints.alpa ?? 0,
     };
     // Akumulasi poin per sesi KBM:
     const sessionPoint = pointsCfg[st] !== undefined ? pointsCfg[st] : 0;
     studentEarnedPoints[nisn] = (studentEarnedPoints[nisn] || 0) + sessionPoint;
     
     // Skor Akhir Kehadiran Siswa (0–100%):
     // Max points = validSessions * (statusPoints.hadir || 100)
     const maxPossiblePoints = validSessions * (statusPoints.hadir || 100);
     rates[s.nisn] = parseFloat(((studentEarnedPoints[s.nisn] / maxPossiblePoints) * 100).toFixed(1));
     ```
   - Terapkan logika yang sama pada fallback pembacaan tabel `absensi`.

---

## 2. R5 — MASTER DATA, KALENDER, PENGATURAN SISTEM & DATABASE, PENGATURAN AKUN

### 2.1 Fokus 1: Penyelarasan Template Master Data & Kalender dengan Skema Database

#### Temuan Investigasi:
Pemeriksaan menyeluruh dilakukan pada `handleDownloadTemplate` di `src/components/AdminDataView.tsx` (baris 206–238) dan modul parser validasi `src/lib/dataIntegrityGuard.ts` (baris 520–780) terhadap skema SQL di `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`.

| Nama Template | Header Template Saat Ini | Sample Data Saat Ini | Tipe Kolom Database (`SETUP_NEW_SCHOOL_TEMPLATE.sql`) | Akar Masalah & Error yang Terjadi |
|---|---|---|---|---|
| **Kalender_Pendidikan** | `['id', 'tanggal', 'keterangan', 'tipe']` | `['KP-01', '2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']` | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`<br>`sekolah_id UUID NOT NULL`<br>`tanggal DATE NOT NULL`<br>`keterangan TEXT NOT NULL`<br>`tipe TEXT DEFAULT 'libur'` | **CRITICAL BUG (Error 22P02)**:<br>Sampel `'KP-01'` bukan UUID valid. PostgreSQL langsung melempar error: `invalid input syntax for type uuid: "KP-01"`.<br>Selain itu, kolom `sekolah_id` tidak ada di template. |
| **Jadwal_Pelajaran** | `['id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas']` | `['JP-01', 'Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']` | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`<br>`sekolah_id UUID NOT NULL`<br>`hari TEXT NOT NULL`<br>`nama_guru TEXT NOT NULL`<br>`mata_pelajaran TEXT NOT NULL`<br>`kelas TEXT NOT NULL`<br>`jam_ke TEXT`<br>`jam_mulai TIME`<br>`jam_selesai TIME` | **CRITICAL BUG (Error 22P02)**:<br>Sampel `'JP-01'` bukan UUID valid. PostgreSQL melempar error `invalid input syntax for type uuid: "JP-01"`.<br>Kolom `sekolah_id` juga tidak tercantum di header template. |
| **Data_Mapel** | `['id', 'nama_mata_pelajaran', 'kategori']` | `['MP-01', 'Matematika Wajib', 'X Merdeka']` | `id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`<br>`sekolah_id UUID NOT NULL`<br>`nama_mata_pelajaran TEXT NOT NULL`<br>`kategori TEXT`<br>`kelompok TEXT`<br>`urutan INTEGER DEFAULT 1` | Sample `'X Merdeka'` di bawah `kategori` membingungkan pengguna (kategori semestinya 'Umum', 'Kejuruan', atau 'Pilihan'). Kolom `sekolah_id` tidak tercantum. |
| **Data_Siswa** | `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']` | `['114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']` | `id UUID PRIMARY KEY`<br>`sekolah_id UUID NOT NULL`<br>`nisn TEXT`<br>`nama_siswa TEXT NOT NULL`<br>`kelas TEXT NOT NULL`<br>`gender TEXT`<br>`status TEXT DEFAULT 'Aktif'`<br>`no_hp_ortu TEXT`<br>`qr_code TEXT` | Template tidak menyertakan `id` (benar, karena auto-generated UUID). Namun sebaiknya sediakan kolom `sekolah_id` opsional agar konsisten dengan `Data_Guru`. |
| **Data_Guru** | `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']` | UUID sekolah, NIP, Nama, Mapel, HP, 'Aktif', Email | `id UUID PRIMARY KEY`<br>`sekolah_id UUID NOT NULL`<br>`nip TEXT`<br>`nama_guru TEXT NOT NULL`<br>`mata_pelajaran TEXT`<br>`no_hp TEXT`<br>`status TEXT DEFAULT 'Aktif'`<br>`email TEXT` | Sudah sesuai dan berhasil diperbaiki pada patch sebelumnya. `id` di-generate otomatis via `crypto.randomUUID()`. |
| **Wali_Kelas** | `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']` | `['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', '2024/2025']` | `id UUID PRIMARY KEY`<br>`sekolah_id UUID NOT NULL`<br>`kelas TEXT NOT NULL`<br>`guru_id UUID`<br>`nama_guru TEXT NOT NULL`<br>`nip TEXT`<br>`tahun_ajaran TEXT DEFAULT '2024/2025'` | Sudah sesuai, upsert onConflict `'sekolah_id, kelas'`. |

#### Analisis di `dataIntegrityGuard.ts` (baris 580–595):
Saat pengguna mengunggah CSV dengan `id` non-UUID seperti `'KP-01'` atau `'JP-01'`:
```typescript
if (!row.id || String(row.id).trim().toLowerCase() === 'null') {
  row.id = crypto.randomUUID();
} else if (tableName === 'data_guru') {
  // Hanya data_guru yang divalidasi UUID
}
```
Karena pengecekan `UUID_REGEX` hanya diterapkan untuk `data_guru`, maka baris `kalender_pendidikan` dan `jadwal_pelajaran` tetap mengirimkan string mentah `'KP-01'` dan `'JP-01'` ke PostgreSQL, yang menyebabkan kegagalan transaksi seluruh batch (PostgreSQL Error 22P02).

#### Rekomendasi Solusi untuk Implementer:
1. **Di `AdminDataView.tsx` (`handleDownloadTemplate`)**:
   - `Kalender_Pendidikan`:
     - Hilangkan kolom `id` dari header (sama seperti `Data_Siswa` dan `Wali_Kelas`).
     - Header baru: `['tanggal', 'keterangan', 'tipe']`
     - Sample baru: `['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']`
   - `Jadwal_Pelajaran`:
     - Hilangkan kolom `id` dari header.
     - Header baru: `['hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'jam_mulai', 'jam_selesai']`
     - Sample baru: `['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka', '1-2', '07:30', '09:00']`
   - `Data_Mapel`:
     - Header baru: `['nama_mata_pelajaran', 'kategori', 'kelompok']`
     - Sample baru: `['Matematika Wajib', 'Umum', 'A']`
2. **Di `dataIntegrityGuard.ts` (`parseAndValidateMasterCsv`)**:
   - Untuk tabel dengan tipe primary key UUID (`kalender_pendidikan`, `jadwal_pelajaran`, `data_siswa`, `wali_kelas`, `sistem_blok`), jika `row.id` disediakan namun formatnya bukan UUID (seperti string warisan `KP-01`, `JP-01`), otomatis timpa dengan `crypto.randomUUID()` alih-alih melempar error fatal ke database.
   - Pastikan auto-inject `row.sekolah_id` berjalan mulus untuk semua tabel master.

---

### 2.2 Fokus 2: Persistensi Konfigurasi Sistem dan Database pada Semua Sub Menu

#### Temuan Investigasi:
1. **Daftar Sub Menu / Tab pada `AdminConfigView.tsx`**:
   - Tab 1: `umum` ("Umum & Kalender")
   - Tab 2: `jam_kerja` ("Jam Kerja & GPS")
   - Tab 3: `kop` ("KOP & Pejabat")
   - Tab 4: `kehadiran` ("Kebijakan Guru")
   - Tab 5: `backup` ("Pencadangan Database", merender `AdminBackupView`)

2. **AKAR MASALAH 1 — Validasi HTML5 Input Tersembunyi Membatalkan Submit Secara Diam-Diam**:
   - Seluruh tab 1–4 berada di dalam satu tag `<form onSubmit={handleSave}>` (baris 477).
   - Ketika pengguna berada di Tab 2 ("Jam Kerja & GPS"), kontainer Tab 1 dan Tab 3 diberikan kelas Tailwind `hidden` (`display: none`).
   - Namun, elemen input di Tab 1 (`waktu_efektif_mulai`, `waktu_efektif_akhir`) dan Tab 3 (`kop_sekolah`, `kop_alamat`, `logo_kiri`, `logo_kanan`, `ttd_kepsek_nama`) memiliki atribut HTML5 `required`!
   - **Efek di Browser**: Jika ada salah satu input di tab lain yang kosong (misal sekolah baru belum mengisi `waktu_efektif_mulai`), browser menolak submit form dengan pesan konsol:
     `An invalid form control with name='waktu_efektif_mulai' is not focusable.`
   - Tombol "Simpan Konfigurasi" diklik, tetapi **tidak ada reaksi apapun**, tidak ada toast error, dan **tidak ada data yang terkirim ke server**. Pengguna mengira aplikasi rusak atau data tidak tersimpan.

3. **AKAR MASALAH 2 — Perubahan Identitas Sekolah Tidak Disinkronkan ke Tabel `sekolah`**:
   - Pada `handleSave` (baris 341–350), hanya 3 kolom yang diupdate ke tabel `sekolah`:
     ```typescript
     const updatePayload = {
       nama_kepala_sekolah: saveConfig.ttd_kepsek_nama,
       nip_kepala_sekolah: saveConfig.ttd_kepsek_nip,
       kepala_sekolah_id: saveConfig.kepala_sekolah_id || null
     };
     await supabase.from('sekolah').update(updatePayload).eq('id', targetSekolahId);
     ```
   - Kolom inti tabel `sekolah` lainnya:
     - `nama` (dari `kop_sekolah`)
     - `alamat` (dari `kop_alamat`)
     - `npsn` (dari `kop_npsn`)
     - `kota_kabupaten` (dari `kota_kabupaten` / `kota_ttd`)
     - `logo_kiri_url` (dari `logo_kiri`)
     - `logo_kanan_url` (dari `logo_kanan`)
     - `logo_url` (dari `logo_kiri` atau `logo_kanan`)
     **SAMA SEKALI TIDAK DISINKRONKAN KE TABEL `sekolah`**!
   - Akibatnya, komponen lain yang mengambil nama sekolah dari tabel `sekolah` (seperti `AdminDataView.tsx` baris 82–89: `supabase.from('sekolah').select('nama')...`) tetap menampilkan nama lama yang tidak pernah berubah.

4. **AKAR MASALAH 3 — Kegagalan Parsial Tidak Menampilkan Error**:
   - Pemanggilan `supabase.from('pengaturan').update(...)` (baris 334) dan `supabase.from('data_guru').update(...)` (baris 364–367) tidak mengecek status error, sehingga jika gagal akibat batasan RLS atau koneksi, pengguna tetap mendapatkan notifikasi palsu `"Pengaturan berhasil disimpan!"`.

#### Rekomendasi Solusi untuk Implementer:
1. **Perbaikan Form Validation**:
   - Tambahkan atribut `noValidate` pada `<form onSubmit={handleSave} noValidate>` di `AdminConfigView.tsx` agar HTML5 tidak memblokir submit form saat tab disembunyikan.
   - Buat validasi manual terpusat di `handleSave` sebelum mengirim data.
2. **Sinkronisasi Lengkap ke Tabel `sekolah`**:
   - Perluas `updatePayload` di `handleSave`:
     ```typescript
     const updatePayload = {
       nama: saveConfig.kop_sekolah || undefined,
       alamat: saveConfig.kop_alamat || undefined,
       npsn: saveConfig.kop_npsn || undefined,
       kota_kabupaten: cityVal || undefined,
       logo_kiri_url: saveConfig.logo_kiri || undefined,
       logo_kanan_url: saveConfig.logo_kanan || undefined,
       logo_url: saveConfig.logo_kiri || saveConfig.logo_kanan || undefined,
       nama_kepala_sekolah: saveConfig.ttd_kepsek_nama,
       nip_kepala_sekolah: saveConfig.ttd_kepsek_nip,
       kepala_sekolah_id: saveConfig.kepala_sekolah_id || null
     };
     ```
3. **Penyimpanan Terpadu**:
   - Pastikan setiap operasi `update` dan `upsert` dicek error-nya dan rollback / notifikasi kegagalan secara transparan jika ada operasi yang gagal.
   - Berikan feedback visual yang jelas bahwa data tersimpan di `pengaturan`, `sekolah`, dan `data_guru`.

---

### 2.3 Fokus 3: Penghapusan Fitur dan Bidang Penambahan Gelar pada Menu Pengaturan Akun

#### Temuan Investigasi:
1. **Lokasi Menu Pengaturan Akun**:
   - Komponen utama: `src/components/AccountSettingsModal.tsx` (`AccountSettingsModal`).
   - Modal ini dipanggil dari:
     - Header aplikasi (`AppScreen.tsx` baris 1439).
     - Tombol "Pengaturan Akun & Profil" di menu Konfigurasi Sistem (`AdminConfigView.tsx` baris 458).

2. **Elemen yang Berkaitan dengan Penambahan Gelar**:
   - **Label Input Nama** (baris 511–513):
     `<label>Nama Pokok (Tanpa Gelar) *</label>`
   - **Kontainer Manajer Multi-Gelar** (baris 539–604):
     - Header: `<i className="fa-solid fa-graduation-cap"></i> Gelar Akademik & Profesi`
     - Tombol: `<button onClick={() => addTitle('suffix', '')}>+ Tambah Gelar</button>`
     - Pilihan cepat (Chips): `+ Dr. (Depan)`, `+ Prof. (Depan)`, `+ Ir. (Depan)`, `+ Hj. (Depan)`, `+ S.Pd. (Belakang)`, `+ M.Pd. (Belakang)`, `+ S.Kom. (Belakang)`, `+ Gr. (Belakang)`
     - Baris input gelar dinamis: Select posisi (Depan/Belakang), Input teks gelar, Tombol hapus gelar
   - **Preview Komposit Nama** (baris 606–630):
     - Menampilkan badge jumlah gelar depan & belakang dan string gabungan.
   - **Logika Internal & State** (baris 43–64, 88–91, 114–116, 283–290):
     - `const [coreNama, setCoreNama] = useState<string>('');`
     - `const [titles, setTitles] = useState<AcademicTitle[]>([]);`
     - `addTitle`, `updateTitle`, `removeTitle`
     - `parseNameAndTitles`, `formatFullName` dari `@/lib/academicTitles`
     - Di `handleSave`:
       ```typescript
       const formattedFullNama = formatFullName(effectiveCoreNama, titles);
       const cleanNama = normalizeName(formattedFullNama);
       ```
     - Validasi pesan error: `'Nama pokok (tanpa gelar) wajib diisi.'`

#### Rekomendasi Solusi untuk Implementer:
1. **Di `src/components/AccountSettingsModal.tsx`**:
   - **Hapus Seluruh Bagian Multi-Gelar Manager**: Hapus baris 539–604 (kontainer `Gelar Akademik & Profesi`, tombol `+ Tambah Gelar`, tombol pilihan cepat, dan daftar input gelar).
   - **Sederhanakan Input Nama**:
     - Ganti label `Nama Pokok (Tanpa Gelar) *` menjadi `Nama Lengkap *`.
     - Ikat input langsung ke state `nama` (atau gunakan `coreNama` sebagai input nama lengkap tunggal).
   - **Sederhanakan / Bersihkan Preview Box**:
     - Hapus badge hitungan gelar depan/belakang (baris 613–617).
   - **Hapus Fungsi dan State Gelar yang Tidak Digunakan**:
     - Hapus `titles`, `addTitle`, `updateTitle`, `removeTitle`.
     - Hapus `useEffect` sinkronisasi `formatFullName`.
   - **Sederhanakan `handleSave`**:
     - Langsung validasi `const cleanNama = normalizeName(nama.trim())`.
     - Ganti pesan toast validasi menjadi `'Nama lengkap wajib diisi.'`.
     - Simpan `cleanNama` langsung ke database tanpa embel-embel generator gelar.

---

## 3. RANGKUMAN DAFTAR FILE & TITIK PERUBAHAN UNTUK IMPLEMENTASI

| Komponen / File | Lokasi Kode | Kategori Perubahan | Rincian Tindakan |
|---|---|---|---|
| `src/components/GradebookView.tsx` | Baris 488, 495, 2414–2416 | R4 (Semester & TA Default) | Hapus blok `if (!isAdmin)` agar Admin otomatis mendapatkan tahun ajaran dan semester aktif. Tambahkan sync event `sipjam:config_updated`. |
| `src/components/GradebookView.tsx` | Baris 350–379, 390–400, 4491–4536 | R4 (Form Bobot Kehadiran Dinamis) | Sediakan form dinamis untuk nilai poin tiap status kehadiran (Hadir 100, Sakit 75, Izin 75, Terlambat 75, Alpa 0). Update kalkulasi nilai akumulasi kehadiran. |
| `src/components/AdminDataView.tsx` | Baris 223–232 | R5 (Template Master Data & Kalender) | Hapus kolom `id` berkode `'KP-01'` dan `'JP-01'` dari template kalender dan jadwal, serta rapikan kolom template data_mapel. |
| `src/lib/dataIntegrityGuard.ts` | Baris 580–595 | R5 (Validasi & Guard UUID CSV) | Ganti id non-UUID pada tabel UUID dengan `crypto.randomUUID()` agar tidak memicu error PostgreSQL 22P02. |
| `src/components/AdminConfigView.tsx` | Baris 477, 341–350 | R5 (Persistensi Konfigurasi Sistem) | Tambahkan `noValidate` pada form agar hidden tabs tidak memblokir submit. Sinkronkan `kop_sekolah`, `kop_alamat`, `logo`, dll. ke tabel `sekolah`. |
| `src/components/AccountSettingsModal.tsx` | Baris 48–65, 511–604, 283–290 | R5 (Hapus Bidang Penambahan Gelar) | Hapus Multi-Gelar Manager, tombol `+ Tambah Gelar`, quick chips, dan kembalikan input nama menjadi satu kolom `Nama Lengkap *`. |

---
*Laporan investigasi ini selesai dan siap diserahkan kepada caller agent / tim implementasi.*

# Laporan Survey Teknis: R1 (Akses Modul Piket) & R2 (Pembatasan Rekapitulasi Presensi Wali Kelas & Akses Guru Mapel)

**Tanggal:** 2026-10-04  
**Explorer Subagent:** `explorer_survey_1`  
**Target Proyek:** SIPJAM App (`c:\Users\Fitra\OneDrive\Documents\sipjam-app`)

---

## 1. Observation

### 1.1. R1: Akses Modul Piket Sesuai Jadwal

#### A. Skema Database Penugasan & Jadwal Piket
Di dalam Supabase (`src/types/database.ts`), terdapat dua tabel yang merepresentasikan piket guru:
1. **`penugasan_piket`** (`database.ts:986-1044`):
   - Kolom utama:
     - `id`: string (UUID)
     - `hari`: string (`'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'`)
     - `guru_id`: string | null (Foreign Key ke `data_guru.id`)
     - `guru_nama`: string | null
     - `guru_nip`: string | null
     - `tipe_petugas`: string (`'Guru'` atau `'Siswa'`)
     - `sekolah_id`: string (Multi-tenant ID)
     - `kelas`, `siswa_nama`, `siswa_nisn`: string | null (digunakan untuk petugas siswa)
     - `tahun_ajaran`: string | null
   - Tabel ini adalah tabel primer tempat Administrator menginput/mengelola penugasan piket per hari di `PiketView.tsx` (`lines 1032, 1095, 1128`).
2. **`jadwal_piket`** (`database.ts:482-510`):
   - Kolom utama:
     - `id`: string (UUID)
     - `hari`: string (`'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'`)
     - `daftar_guru`: string | null (Daftar nama guru dipisahkan tanda koma, contoh: `"Drs. Ahmad, Siti Rahma, S.Pd"`)
     - `sekolah_id`: string
   - Tabel ini merupakan tabel rekap/sinkronisasi. Di `PiketView.tsx` (`lines 653-679`), saat penugasan piket diperbarui, fungsi `syncJadwalPiketForDay(day)` melakukan sinkronisasi otomatis nama-nama guru dari `penugasan_piket` ke kolom `daftar_guru` di `jadwal_piket`.

#### B. Mekanisme Query Hari Ini
- Penentuan hari hari ini menggunakan utilitas timezone WITA: `getWitaDayName()` dari `src/lib/wita.ts:54-59` yang mengembalikan nama hari dalam bahasa Indonesia (`'Senin'`, `'Selasa'`, `'Rabu'`, `'Kamis'`, `'Jumat'`, `'Sabtu'`, `'Minggu'`).
- Di `src/components/HomeView.tsx:496-501`, pengecekan piket harian sudah menggunakan pendekatan gabungan yang sangat tangguh:
  ```ts
  const inPenugasan = assignedPiketTeachers.some((p: any) =>
    isTeacherMatch(p.guru_nama, p.guru_nip, nama, nip)
  );
  const inJadwalPiket = piketSchedule ? isGuruDiPiket(piketSchedule.daftar_guru, nama) : false;
  const isAssignedPiket = inPenugasan || inJadwalPiket;
  ```
- Di `src/lib/workflow.ts:349-357`, `getGuruDailyState()` saat ini hanya mengecek `jadwal_piket` via `isGuruDiPiket(piketHariIni.daftar_guru, namaGuru)` tanpa mengecek langsung tabel `penugasan_piket`. Jika tabel `jadwal_piket` belum tersinkronisasi, `state.isPiket` berisiko bernilai `false`.

#### C. Navigasi & Routing Menu Piket di `AppScreen.tsx`
- **Menu Sidebar Guru (`AppScreen.tsx:469-482`)**:
  ```tsx
  const menuItemsGuru = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
    { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
    ...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : []),
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }, // <-- MASALAH: dirender tanpa syarat untuk semua guru!
    ...
  ];
  ```
- **Menu Sidebar Admin (`AppScreen.tsx:483-498`)**:
  `{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' }` selalu ada untuk Admin/Superadmin.
- **Validasi Navigasi (`AppScreen.tsx:440-444`)**:
  ```tsx
  if (targetId === 'view-piket') {
    if (!state.presensiDatang) return Swal.fire('Akses Ditolak', 'Harap lakukan Presensi Datang terlebih dahulu.', 'warning');
    if (state.isIzinSakit) return Swal.fire('Akses Ditolak', state.lockedReason || '', 'info');
  }
  ```
  Fungsi `handleNavigation` HANYA memeriksa apakah guru sudah presensi datang atau izin sakit. Fungsi ini **TIDAK memeriksa** apakah guru tersebut bertugas piket hari ini (`state.isPiket`). Akibatnya, guru biasa yang bukan petugas piket tetap bisa masuk ke `view-piket` jika sudah absen datang!
- **Rendering View (`AppScreen.tsx:653`)**:
  ```tsx
  {currentView === 'view-piket' && <PiketView user={user} />}
  ```
  Langsung merender `<PiketView user={user} />` tanpa memeriksa jadwal piket jika diakses langsung lewat URL `?view=view-piket`.
- **Komponen `PiketView.tsx` (`lines 1144-1232`)**:
  Jika guru biasa membuka `PiketView`, mereka tetap dapat melihat Tab Beranda, Tab Scan QR Siswa (`activeTab === 'scan'`), dan Tab Rekap (`activeTab === 'rekap'`).

---

### 1.2. R2: Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel

#### A. Identifikasi Wali Kelas di Database
- Tabel `wali_kelas` (`database.ts:1534-1575`):
  - `id`: string (UUID)
  - `sekolah_id`: string
  - `kelas`: string (contoh: `'X Merdeka 1'`)
  - `nama_guru`: string
  - `guru_id`: string | null (FK ke `data_guru.id`)
  - `nip`: string | null
  - `tahun_ajaran`: string | null
- Field `wali_kelas` pada entitas guru:
  - `user.wali_kelas` (dari metadata user atau session login)
  - `data_guru.wali_kelas` (string nama kelas atau relasi)
- Di `AppScreen.tsx:194-259`, sudah ada state `isWaliKelas` dan `assignedKelas` yang mengidentifikasi wali kelas dari `user.wali_kelas`, query tabel `wali_kelas`, dan `data_guru.wali_kelas`.

#### B. Pembatasan Menu & Akses di `AppScreen.tsx`
- **Menu Sidebar Guru (`AppScreen.tsx:480`)**:
  ```tsx
  { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }
  ```
  Item ini saat ini **muncul untuk SEMUA guru**, bahkan guru biasa yang bukan wali kelas!
- **Validasi Navigasi (`AppScreen.tsx:393-461`)**:
  `handleNavigation` sama sekali tidak memeriksa batasan untuk `targetId === 'view-rekap-siswa'`, berbeda dengan `view-jurnal-kelas` yang sudah diblokir di line 406-416.
- **Rendering View (`AppScreen.tsx:681`)**:
  ```tsx
  {currentView === 'view-rekap-siswa' && <RekapSiswaView user={user} />}
  ```
  `AppScreen` tidak meneruskan prop `assignedKelas` ke `RekapSiswaView`, dan tidak memblokir akses jika user bukan Admin dan bukan Wali Kelas.

#### C. Celah Privasi di `RekapSiswaView.tsx`
1. **Tab 1: 'gerbang' (Presensi Gerbang Piket / Scan QR)**:
   - Di baris 858-880, jika role bukan Admin, komponen menampilkan pilihan kelas dari `waliKelasList` atau badge locked `Kelas {gerbangKelas}`. Namun jika user bukan wali kelas dan data siswa ada, komponen fallback ke kelas acak/pertama di sekolah (`lines 92-94`).
2. **Tab 2: 'rekap' (Rekap Absen Siswa)**:
   - Di baris 1136-1140:
     ```tsx
     <select value={kelas} onChange={e => setKelas(e.target.value)} className="...">
       <option value="" disabled>Pilih...</option>
       {kelasList.map((k, i) => <option key={i} value={k}>{k}</option>)}
     </select>
     ```
     **TEMUAN KRUSIAL:** Dropdown kelas di Tab 2 menampilkan SEMUA kelas yang ada di sekolah (`kelasList.map`) kepada siapa saja yang membuka view ini! Bahkan jika user adalah wali kelas, mereka saat ini bisa memilih dan melihat rekapitulasi kehadiran siswa dari kelas-kelas lain di seluruh sekolah.
   - Di fungsi `tarikRekap` (`lines 340-410`), tidak ada pengecekan/guard apakah kelas yang diminta adalah kelas binaan pengguna.

#### D. Verifikasi Akses Presensi Guru Mapel di `GuruJurnal.tsx`
- Di `GuruJurnal.tsx:396-440`:
  ```ts
  let aQuery = supabase.from('absensi').select('*').eq('tanggal', tgl).eq('kelas', kelas);
  let sQuery = supabase.from('data_siswa').select('*').eq('kelas', kelas);
  let pQuery = supabase.from('presensi_siswa').select('*').eq('tanggal', tgl).eq('kelas', kelas).eq('status', 'datang');
  ```
- Di baris 1066-1135, sesi jurnal mengajar Guru Mapel menampilkan section:
  `Absensi Murid (Tersinkronisasi Otomatis) Live Absensi Kelas {kelas}`
  Guru Mapel melihat status kehadiran murid (termasuk tag "✓ Hadir di Sekolah (Piket)" jika sudah scan QR gerbang) dan dapat mengisi status Hadir/Sakit/Izin/Alpa secara langsung untuk jam pelajarannya.
- **Kesimpulan Independensi:** Modul `GuruJurnal.tsx` bekerja secara mandiri per sesi KBM yang dijadwalkan (`jadwal_pelajaran`). Modul ini **TIDAK bergantung pada `RekapSiswaView`**. Pembatasan `view-rekap-siswa` khusus untuk Wali Kelas **sama sekali tidak mengganggu atau membatasi Guru Mapel** dalam mengelola presensi siswa pada jam pelajarannya hari itu.

---

## 2. Logic Chain

```
[Kebutuhan R1: Modul Piket Hanya untuk Guru Piket Hari Ini]
  ├── Database menyimpan penugasan di `penugasan_piket` & `jadwal_piket`
  ├── Hari ini dihitung via `getWitaDayName()`
  ├── Guru piket diidentifikasi dari penugasan_piket (tipe_petugas='Guru', hari=dayName, guru_id/nama/nip cocok) ATAU jadwal_piket (daftar_guru cocok)
  ├── Di AppScreen.tsx:
  │     ├── Tambahkan state `isPiketHariIni` (Admin & Superadmin = true; Guru dicek via query/getGuruDailyState)
  │     ├── menuItemsGuru: kondisionalkan `{ id: 'view-piket', ... }` hanya jika `isPiketHariIni === true`
  │     ├── handleNavigation: tolak jika targetId === 'view-piket' dan !isPiketHariIni
  │     └── render currentView === 'view-piket': tampilkan UI "Akses Terblokir" jika !isPiketHariIni
  └── Di PiketView.tsx:
        └── Jika user.role === 'Guru' dan !dailyState.isPiket, render card akses ditolak

[Kebutuhan R2: Rekap Siswa Utuh HANYA untuk Wali Kelas & Terkunci ke Kelas Binaan]
  ├── Identifikasi Wali Kelas sudah ada di AppScreen.tsx: `isWaliKelas` & `assignedKelas`
  ├── Di AppScreen.tsx:
  │     ├── menuItemsGuru: kondisionalkan `{ id: 'view-rekap-siswa', ... }` hanya jika `isWaliKelas === true`
  │     ├── handleNavigation: tolak targetId === 'view-rekap-siswa' jika !isAdmin && !isSuperadmin && !isWaliKelas
  │     └── render currentView === 'view-rekap-siswa': passing `assignedKelas={assignedKelas}` dan guard akses
  ├── Di RekapSiswaView.tsx:
  │     ├── Tangkap prop `assignedKelas`
  │     ├── Jika non-admin dan bukan wali kelas: render layar akses terblokir
  │     ├── Tab 1 ('gerbang'): kunci kelas ke assignedKelas (atau waliKelasList jika > 1)
  │     ├── Tab 2 ('rekap'): GANTI dropdown kelas! Jika bukan Admin, dropdown TERKUNCI hanya untuk kelas binaan
  │     └── tarikRekap: batasi query kelas agar hanya memproses kelas binaan jika bukan admin
  └── Guru Mapel di GuruJurnal.tsx:
        └── Bekerja berbasis sesi jadwal pelajaran; presensi per kelas di jurnal tetap 100% aktif dan utuh
```

---

## 3. Caveats

1. **Sinkronisasi Antara `penugasan_piket` dan `jadwal_piket`**:
   - Di masa lalu, beberapa fungsi hanya membaca `jadwal_piket` (string daftar guru), sedangkan form penugasan admin menulis ke `penugasan_piket`.
   - *Solusi Rekomendasi:* Pengecekan status piket harus memeriksa KEDUA tabel (`penugasan_piket` dan fallback `jadwal_piket`) sebagaimana pola yang sudah terbukti andal di `HomeView.tsx:496-501`. Update juga fungsi `getGuruDailyState` di `src/lib/workflow.ts` agar memeriksa `penugasan_piket`.
2. **Guru dengan Lebih dari Satu Kelas Binaan**:
   - Jarang terjadi tetapi memungkinkan: jika seorang guru menjadi wali kelas untuk 2 kelas, `waliKelasList` memiliki panjang > 1. Dropdown di `RekapSiswaView.tsx` harus menampilkan pilihan kelas yang terbatas hanya pada daftar kelas di `waliKelasList`, bukan seluruh kelas di sekolah (`kelasList`).
3. **Uji Otomatis `tests/app_screen_integration.test.ts`**:
   - Line 142 memeriksa `source.includes("id: 'view-piket'")`.
   - Memasukkan `{ id: 'view-piket' }` secara kondisional dalam array `menuItemsGuru` (`...(isPiketHariIni ? [{ id: 'view-piket', ... }] : [])`) tetap memenuhi string check test tersebut tanpa merusak suite pengujian yang ada.

---

## 4. Conclusion & Proposed Implementation Blueprint

### 4.1. Perubahan untuk R1 (Akses Modul Piket)
1. **`src/lib/workflow.ts`**:
   - Di dalam `getGuruDailyState()` (`line 345-358`), tambahkan pengecekan tabel `penugasan_piket`:
     Query `.from('penugasan_piket').select('*').eq('hari', selectedHari).eq('tipe_petugas', 'Guru')` (difilter `sekolah_id` jika ada).
     Cek apakah `userId`, `namaGuru`, atau `username` cocok.
     Jika cocok, set `state.isPiket = true;`.
     Tetap pertahankan fallback ke `jadwal_piket`.
2. **`src/components/AppScreen.tsx`**:
   - Tambahkan state:
     ```tsx
     const [isPiketHariIni, setIsPiketHariIni] = useState<boolean>(isAdmin);
     ```
   - Dalam `useEffect` (dependency: `user, isAdmin, isSuperadmin, syncKey`):
     Jika Admin atau Superadmin: `setIsPiketHariIni(true)`.
     Jika Guru: panggil `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)` dan set `setIsPiketHariIni(Boolean(state?.isPiket))`.
   - Modifikasi `menuItemsGuru`:
     ```tsx
     ...(isPiketHariIni ? [{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }] : [])
     ```
   - Modifikasi `handleNavigation`:
     ```tsx
     if (targetId === 'view-piket') {
       if (!isAdmin && !isSuperadmin && !isPiketHariIni) {
         Swal.fire({
           icon: 'warning',
           title: 'Akses Ditolak',
           text: 'Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.',
           confirmButtonColor: '#0B4619'
         });
         return;
       }
       if (!state.presensiDatang) return Swal.fire('Akses Ditolak', 'Harap lakukan Presensi Datang terlebih dahulu.', 'warning');
       if (state.isIzinSakit) return Swal.fire('Akses Ditolak', state.lockedReason || '', 'info');
     }
     ```
   - Modifikasi render `view-piket`:
     Jika `isAdmin || isSuperadmin || isPiketHariIni`, render `<PiketView user={user} />`.
     Jika tidak, render kartu "Akses Terblokir" dengan tombol kembali ke dashboard (identik dengan layout blokir `view-jurnal-kelas`).
3. **`src/components/PiketView.tsx`**:
   - Pada baris 1153 ke bawah, jika `isGuru && dailyState && !dailyState.isPiket && !isAdmin`:
     Render banner / UI terblokir yang menjelaskan bahwa modul piket hanya aktif pada hari penugasan guru.

### 4.2. Perubahan untuk R2 (Rekapitulasi Presensi Wali Kelas)
1. **`src/components/AppScreen.tsx`**:
   - Modifikasi `menuItemsGuru`:
     ```tsx
     ...(isWaliKelas ? [{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }] : [])
     ```
   - Modifikasi `handleNavigation`:
     ```tsx
     if (targetId === 'view-rekap-siswa') {
       if (!isAdmin && !isSuperadmin && !isWaliKelas) {
         Swal.fire({
           icon: 'warning',
           title: 'Akses Ditolak',
           text: 'Akses Terblokir: Halaman Presensi Siswa secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
           confirmButtonColor: '#0B4619'
         });
         return;
       }
     }
     ```
   - Modifikasi render `view-rekap-siswa`:
     Teruskan prop `assignedKelas`:
     ```tsx
     {currentView === 'view-rekap-siswa' && (
       isAdmin || isSuperadmin || isWaliKelas ? (
         <RekapSiswaView user={user} assignedKelas={assignedKelas} />
       ) : (
         <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
           ...
         </div>
       )
     )}
     ```
2. **`src/components/RekapSiswaView.tsx`**:
   - Update definisi props:
     ```tsx
     export default function RekapSiswaView({ 
       user, 
       assignedKelas: propAssignedKelas 
     }: { 
       user: any; 
       assignedKelas?: string | null; 
     })
     ```
   - Inisialisasi default kelas: jika `propAssignedKelas` ada, inisialisasi `kelas` dan `gerbangKelas` dengan nilai tersebut.
   - Guard rendering di root: jika `!isAdmin && !isWaliKelas && waliKelasList.length === 0 && !propAssignedKelas`, tampilkan layar "Akses Terblokir".
   - Kunci Filter Kelas di Tab 2 (Rekap Absen Siswa) pada baris 1136-1141:
     ```tsx
     <select 
       value={kelas} 
       onChange={e => setKelas(e.target.value)} 
       disabled={!isAdmin && (waliKelasList.length <= 1)}
       className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 disabled:opacity-80 font-semibold"
     >
       {isAdmin ? (
         <>
           <option value="" disabled>Pilih Kelas...</option>
           {kelasList.map((k, i) => <option key={i} value={k}>{k}</option>)}
         </>
       ) : waliKelasList.length > 1 ? (
         waliKelasList.map((w, i) => (
           <option key={i} value={w.kelas}>Kelas {w.kelas} (Binaan)</option>
         ))
       ) : (
         <option value={kelas || propAssignedKelas || waliKelasList[0]?.kelas}>
           Kelas {kelas || propAssignedKelas || waliKelasList[0]?.kelas} (Binaan Anda)
         </option>
       )}
     </select>
     ```
   - Di dalam `tarikRekap`: jika bukan Admin, pastikan `kelas` yang ditarik adalah salah satu dari kelas binaan (`[propAssignedKelas, ...waliKelasList.map(w => w.kelas)]`).
3. **`src/components/GuruJurnal.tsx`**:
   - Tidak memerlukan modifikasi kode karena sudah menggunakan query independen per sesi mengajar KBM (`jadwal_pelajaran` -> `absensi` & `data_siswa`). Konfirmasi bahwa alur jurnal guru mapel tetap berfungsi 100%.

---

## 5. Verification Method

### 5.1. Komando Pengujian Programatik
1. **Type Checking:**
   ```powershell
   npx tsc --noEmit
   ```
   *Kriteria Kelulusan:* Exit code 0, 0 errors.
2. **Regression Test Suite:**
   ```powershell
   npm test
   ```
   *Kriteria Kelulusan:* Seluruh 19 file uji lulus (termasuk `m4_wali_kelas_guru_sync.test.ts`, `app_screen_integration.test.ts`, `m3_piket_scanner_kiosk.test.ts`, dan `qrSiswa.test.ts`).
3. **Dedicated Test Verification:**
   Buat unit/integration test baru (contoh: `tests/piket_and_wali_access_isolation.test.ts`) yang memverifikasi:
   - Guru yang bukan piket hari ini tidak memiliki `'view-piket'` di `menuItems`.
   - Guru yang piket hari ini memiliki `'view-piket'` di `menuItems`.
   - Admin dan Superadmin memiliki `'view-piket'` di `menuItems` terlepas dari hari penugasan.
   - Guru biasa yang bukan wali kelas tidak memiliki `'view-rekap-siswa'` di `menuItems`.
   - Guru wali kelas memiliki `'view-rekap-siswa'` di `menuItems` dan dropdown kelasnya terkunci hanya ke kelas binaannya.

### 5.2. Verifikasi Manual / Persona Testing
1. **Login sebagai Admin (`admin` / `admin123`)**:
   - Menu "Kelola Piket" terlihat dan dapat dibuka kapan saja.
   - Menu "Presensi Siswa" terlihat dan dropdown kelas menampilkan semua kelas.
2. **Login sebagai Guru Piket Hari Ini**:
   - Menu "Modul Piket" muncul di sidebar.
   - Halaman `PiketView` dapat dibuka dan presensi QR/manual siswa berfungsi.
3. **Login sebagai Guru Bukan Piket Hari Ini**:
   - Menu "Modul Piket" TIDAK muncul di sidebar.
   - Mengakses URL `?view=view-piket` memunculkan pesan "Akses Terblokir" dan tidak menampilkan modul scanner / lapor.
4. **Login sebagai Guru Biasa (Bukan Wali Kelas)**:
   - Menu "Presensi Siswa" TIDAK muncul di sidebar.
   - Membuka menu "Jurnal Pembelajaran" (`GuruJurnal.tsx`): live absensi murid pada jadwal mengajar hari itu tetap tampil dan dapat diisi secara normal.
5. **Login sebagai Wali Kelas (contoh: Wali Kelas VII A)**:
   - Menu "Presensi Siswa" muncul di sidebar.
   - Di dalam tab "Presensi Gerbang Piket" dan tab "Rekap Absen Siswa", pilihan kelas terkunci hanya pada "Kelas VII A", tidak ada pilihan untuk mengintip rekap kelas VII B, VIII, dsb.

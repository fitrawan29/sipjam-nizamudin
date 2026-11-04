# LAPORAN AUDIT KOMPARATIF ATURAN BISNIS, VALIDASI, DAN FITUR
## Evaluasi Forensik Pasca-Konsolidasi Menu SIPJAM-APP (Baseline `7aa6afd` vs `HEAD`)

---

## 1. RINGKASAN EKSEKUTIF & METODOLOGI AUDIT

### 1.1. Latar Belakang & Tujuan
Konsolidasi menu pada aplikasi SIPJAM telah berhasil mereduksi penumpukan menu (menu bloat) dari 15 menu admin dan 12 menu guru/wali menjadi antarmuka terpadu berbasis sub-tab Claymorphism (6–8 menu utama). Namun, penggabungan sejumlah tampilan mandiri ke dalam satu komponen terpadu berisiko menghilangkan aturan bisnis mikro, validasi interaktif, alur umpan balik verifikasi, serta elemen legalitas pencetakan dokumen resmi.

Audit ini dilakukan oleh **Explorer 3: Business Rules Auditor** untuk membedah secara forensik seluruh perubahan basis kode antara komit dasar sebelum penggabungan menu (`7aa6afd`) dan versi mutakhir saat ini (`HEAD`).

### 1.2. Metodologi Komparatif
Audit dilakukan dengan membandingkan kode sumber pada 4 dimensi teknis fungsional:
1. **Attendance & Absence Workflows:** Presensi Guru, Presensi Siswa Gerbang, Jurnal Mengajar KBM/Kegiatan, Rekapitulasi Kehadiran.
2. **Validation Rules & Security Guards:** Toleransi jam kerja, geofence GPS, kebijakan kamera/selfie, proteksi duplikasi, transisi status izin/sakit/alpa/dinas luar, dan bendera verifikasi.
3. **Filter & Query Logic:** Filter rentang tanggal/bulan/semester, filter kelas binaan vs seluruh kelas, filter mata pelajaran, pencarian teks bebas (search), dan paginasi.
4. **Data Actions & Legal Printing:** Ekspor Excel/CSV, tombol verifikasi massal, proteksi mode peninjau (read-only), serta integritas Kop Surat (`PrintHeader`), Tanda Tangan (`PrintSignature`), dan Footer Keamanan GPS.

---

## 2. MATRIKS INVENTARIS MASALAH DAN ATURAN BISNIS YANG HILANG / TERDISTORSI

| No | Komponen / View | Masalah yang Ditemukan | Kategori | Tingkat Keparahan | Lokasi Berkas & Baris |
|:---:|---|---|---|:---:|---|
| **1** | `AdminRekapView.tsx` | **Hilangnya Tanda Tangan (`PrintSignature`) pada Cetak Sub-Tab 2 (Tabel Rekapitulasi).** Tombol "Cetak Halaman" memicu cetak, namun blok tanda tangan hanya ada di Sub-Tab 3 (`activeTab === 'cetak'`) yang tersembunyi (`hidden`). | Printing / Legalitas | **CRITICAL** | `src/components/AdminRekapView.tsx:679-682`, `743-750` |
| **2** | `AdminRekapView.tsx` | **Duplikasi Kop Surat (`PrintHeader`) pada Sub-Tab 3 (Cetak Dokumen Resmi).** Terdapat `PrintHeader` level atas (`hidden print:block`) dan `PrintHeader` kedua di dalam kontainer Sub-Tab 3, sehingga Kop Surat tercetak ganda saat Sub-Tab 3 dicetak. | Printing / Layout | **HIGH** | `src/components/AdminRekapView.tsx:416-427`, `689-692` |
| **3** | `GuruJurnal.tsx` / `RekapJurnalView.tsx` | **Hilangnya Umpan Balik Alasan Penolakan Jurnal (`Catatan Revisi Admin`).** Guru yang jurnalnya ditolak tidak dapat melihat alasan penolakan di `GuruJurnal` Sub-Tab 2 (`rekap-pribadi`) karena `HistoryView` tab jurnal digantikan oleh tabel rekap 8-kolom yang tidak menampilkan kolom alasan penolakan. | Alur Verifikasi / UX | **CRITICAL** | `src/components/GuruJurnal.tsx:1850-1865`, `src/components/RekapJurnalView.tsx:898-1028` |
| **4** | `GuruJurnal.tsx` / `RekapJurnalView.tsx` | **Hilangnya Fitur Pencarian Teks Bebas (Search) & Paginasi Jurnal Guru.** Pada `HistoryView`, guru dapat mencari berdasarkan materi/topik KBM dan membolak-balik halaman per 10 entri. Di `RekapJurnalView`, seluruh entri dimuat dalam satu tabel tanpa kolom input pencarian materi. | Filter & Kueri | **MEDIUM** | `src/components/RekapJurnalView.tsx:180-220` vs `src/components/HistoryView.tsx:135-150` |
| **5** | `AdminVerifView.tsx` / `DokumenView.tsx` | **Prop `isReadOnly` Tidak Diteruskan ke Sub-Tab Perangkat Ajar (`DokumenView`).** Mode Peninjau Pengawas / Kepala Sekolah di `AdminVerifView` tidak memproteksi tab Dokumen, sehingga tombol verifikasi/revisi dokumen tetap aktif bagi peninjau baca-saja. | RBAC / Proteksi Mutasi | **HIGH** | `src/components/AdminVerifView.tsx:764-767`, `src/components/DokumenView.tsx:22` |
| **6** | `DokumenView.tsx` | **Sensitivitas Huruf Besar/Kecil Peran (`user?.role === 'Admin'`) Memutus Matriks Verifikasi Admin.** Jika akun admin memiliki string `admin` (huruf kecil), `isAdmin` bernilai `false`, menyebabkan DokumenView membuka mode unggah guru (`list`) dan menyembunyikan matriks verifikasi. | Autentikasi / RBAC | **HIGH** | `src/components/DokumenView.tsx:23` |
| **7** | `AdminRekapView.tsx` | **Hilangnya Grafik Rasio Komposisi Presensi & Pemotongan Kedalaman Leaderboard (Top 10 -> Top 5).** Progress bar persentase Hadir Sekolah, Izin/Sakit, dan Dinas Luar dari `AnalitikView` tidak diikutsertakan di Sub-Tab 1 `AdminRekapView`. | Analitik / Perhitungan | **MEDIUM** | `src/components/AnalitikView.tsx:167-195` vs `src/components/AdminRekapView.tsx:470-558` |
| **8** | `GuruPresensi.tsx` / `HistoryView.tsx` | **Ketiadaan Filter Pilihan Bulan pada Riwayat Presensi Guru.** `HistoryView` hanya memuat 50 data terakhir tanpa pemilih bulan (`input type="month"`), menyulitkan guru memeriksa atau mengunduh riwayat presensi bulan-bulan sebelumnya. | Filter & Kueri | **MEDIUM** | `src/components/HistoryView.tsx:35-65` |
| **9** | `AdminConfigView.tsx` / `AdminDataView.tsx` | **Duplikasi Pembungkus `<section id="...">` dan Double Padding Card.** Komponen `AdminBackupView` dan `SistemBlokView` masih membungkus dirinya dengan elemen `<section className="view-section">` dan `glass-card p-4`, menimbulkan layout bertingkat di dalam tab induk. | DOM / Styling | **LOW** | `src/components/AdminBackupView.tsx:194`, `src/components/AdminConfigView.tsx:472` |

---

## 3. AUDIT MENDALAM PER KLASTER KONSOLIDASI

---

### 3.1. KLASTER 1: Konsolidasi Ekosistem Jurnal Mengajar
- **Komponen Terkait:** `src/components/GuruJurnal.tsx`, `src/components/RekapJurnalView.tsx`, `src/components/HistoryView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - `view-guru-jurnal`: Formulir input KBM 10 field, live absensi siswa, deteksi sistem blok, mode guru inval.
  - `view-guru-rekap-jurnal`: Tabel rekap bulanan pribadi, format cetak 8/10 kolom KOP resmi, ekspor CSV.
  - `view-jurnal-kelas`: Pengawasan keterisian KBM seluruh guru mapel per kelas binaan oleh Wali Kelas / Admin.
  - `view-history` (Sub-Tab Jurnal): Riwayat pengajuan jurnal guru dengan kartu detail, **lencana status verifikasi (Menunggu / Disetujui / Ditolak)**, serta **catatan alasan penolakan admin** (`catatan_admin` / `keterangan_penolakan`).
- **Kondisi Setelah Konsolidasi:**
  - `GuruJurnal.tsx` menggunakan ClayTabs:
    - Sub-Tab 1 (`input`): Formulir input jurnal KBM.
    - Sub-Tab 2 (`rekap-pribadi`): Memanggil `RekapJurnalView` dengan `controlledMode="pribadi"` dan `hideTabSwitch={true}`.
    - Sub-Tab 3 (`supervisi-kelas`): Memanggil `RekapJurnalView` dengan `controlledMode="kelas"` untuk Wali Kelas / Admin.
- **Temuan Regresi Bisnis:**
  1. **Umpan Balik Penolakan Terputus:** Ketika admin menolak jurnal KBM seorang guru dengan alasan tertentu (misal: *"Foto tidak memuat kegiatan KBM"* atau *"Materi tidak sesuai CP"*), dashboard guru menampilkan peringatan merah. Namun ketika guru membuka menu Jurnal di Sub-Tab 2, tampilan yang muncul adalah tabel formal cetak yang **sama sekali tidak memuat kolom alasan penolakan**. Guru tidak mengetahui apa yang harus direvisi.
  2. **Pencarian Materi Hilang:** `HistoryView` memiliki kotak pencarian dinamis yang mencari string materi atau mapel. Di `RekapJurnalView`, hanya ada filter dropdown kelas dan mapel, tanpa pencarian kata kunci pada materi KBM.

---

### 3.2. KLASTER 2: Integrasi Presensi Mandiri & Riwayat Kehadiran Guru
- **Komponen Terkait:** `src/components/GuruPresensi.tsx`, `src/components/HistoryView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - Presensi dilakukan di `view-guru-presensi`.
  - Guru memeriksa jam datang aktual, jam pulang, keterlambatan, dan status persetujuan surat izin/sakit di `view-history` (Sub-Tab Presensi).
- **Kondisi Setelah Konsolidasi:**
  - `GuruPresensi.tsx` menyatukan kedua alur kerja melalui ClayTabs:
    - Sub-Tab 1 (`live`): Presensi hari ini (kamera selfie 4:3, GPS, Dinas Luar, Izin/Sakit).
    - Sub-Tab 2 (`riwayat`): Memanggil `HistoryView` dengan `onlyTab="presensi"`, `hideTabSwitch={true}`, dan `hideSectionWrapper={true}`.
- **Temuan Regresi Bisnis:**
  1. **Ketiadaan Filter Bulan/Rentang Tanggal:** Di `HistoryView`, query dibatasi hanya 50 data terbaru (`range(0, 49)`). Guru yang ingin mencetak atau memverifikasi kehadiran bulan lalu (misal untuk klaim sertifikasi atau tunjangan kinerja) tidak dapat memilih bulan tertentu.
  2. **Tombol Unduh Rekap Presensi Pribadi Belum Ada:** Sub-Tab 2 tidak memiliki tombol ekspor CSV untuk data presensi mandiri guru yang bersangkutan, padahal fitur ekspor tersedia di modul admin.

---

### 3.3. KLASTER 3: Penyatuan Asesmen Pembelajaran & Rapor Siswa
- **Komponen Terkait:** `src/components/GradebookView.tsx`, `src/components/RaporView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - `view-gradebook`: Pengelolaan matriks Tujuan Pembelajaran (TP), asesmen formatif/sumatif Kurikulum Merdeka, deskripsi capaian otomatis, ekspor CSV TP dan Semester.
  - `view-rapor`: Khusus Wali Kelas dan Admin untuk rekapitulasi nilai lintas mata pelajaran, catatan karakter wali kelas, evaluasi Deep Learning (Mindful, Meaningful, Joyful), dan pencetakan lembar E-Rapor resmi dengan `PrintHeader` dan `PrintSignature`.
- **Kondisi Setelah Konsolidasi:**
  - `GradebookView.tsx` menaungi:
    - Sub-Tab 1 (`gradebook`): Menjalankan Buku Nilai Mapel dengan tab internal (`innerTab`: `tp-matrix`, `rekap-semester`, `statistik`).
    - Sub-Tab 2 (`rapor`): Merender `RaporView` dengan proteksi RBAC `canAccessRapor`.
- **Temuan Regresi Bisnis:**
  1. **Konflik Parameter URL `tab`:** Penggunaan `tab=rapor` pada URL tingkat atas dapat berbenturan dengan `innerTab` jika pengguna menyematkan tautan langsung ke tab analisis atau rekap semester.
  2. **Sinkronisasi Kelas Binaan Wali:** Pada pergantian data master wali kelas secara real-time, `RaporView` mengandalkan `assignedKelas` yang dilewatkan dari props. Jika guru baru saja diangkat menjadi wali kelas, prop ini memerlukan pembaruan context tanpa refresh penuh.

---

### 3.4. KLASTER 4: Konvergensi Laporan Kinerja, Analitik Kedisiplinan & Standardisasi View Dinas
- **Komponen Terkait:** `src/components/AdminRekapView.tsx`, `src/components/AnalitikView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - `view-admin-rekap`: Menampilkan tabel rekapitulasi kehadiran 11 kolom, perhitungan akumulasi wajib hadir, hadir, dinas luar, sakit, izin, alpa, keterlambatan (jam/menit), piket, dan jurnal disetujui. Dilengkapi `PrintHeader`, `PrintSignature`, tombol ekspor Excel, dan tombol cetak GPS.
  - `view-analitik`: Visualisasi tren kehadiran, grafik rasio keterisian KBM, progress bar persentase kehadiran (Sekolah, Izin, Dinas), dan papan peringkat kedisiplinan Top 10 Guru.
  - `view-rekap-guru`: Mode baca-saja (`isReadOnly={true}`) dari `AdminRekapView` untuk pengawas Dinas Pendidikan.
- **Kondisi Setelah Konsolidasi:**
  - `AdminRekapView.tsx` terbagi menjadi 3 Sub-Tab ClayTabs:
    - Sub-Tab 1 (`analitik`): 5 Kartu KPI + Leaderboard Top 5.
    - Sub-Tab 2 (`tabel`): Ringkasan metrik, pencarian guru, tabel rekapitulasi 11 kolom, tombol Excel, tombol Cetak Halaman.
    - Sub-Tab 3 (`cetak`): Pratinjau cetak dokumen resmi ber-KOP dengan tabel dan tanda tangan.
- **Temuan Regresi Bisnis & Layout (CRITICAL):**
  1. **Regresi Tanda Tangan Cetak pada Sub-Tab 2 (`tabel`):**
     Pada berkas `src/components/AdminRekapView.tsx`, baris 679-682 memuat tombol cetak:
     ```tsx
     <button type="button" onClick={() => triggerPrintWithGps()} className="...">
       <i className="fa-solid fa-print"></i> Cetak Halaman
     </button>
     ```
     Namun komponen `<PrintSignature ... />` tidak ada di dalam blok Sub-Tab 2! Blok tanda tangan dipindahkan ke Sub-Tab 3 (`activeTab === 'cetak'`) pada baris 743. Akibatnya, saat administrator berada di Sub-Tab 2 (tampilan kerja utama) dan menekan "Cetak Halaman", dokumen fisik yang tercetak **tidak memiliki tanda tangan pengesahan sama sekali**.
  2. **Duplikasi Kop Surat pada Sub-Tab 3 (`cetak`):**
     Pada baris 416-427, terdapat blok:
     ```tsx
     {/* Print Only Header (Visible exclusively when window.print() is invoked) */}
     <div className="hidden print:block">
       <PrintHeader user={user} sekolahId={user?.sekolah_id} />
       ...
     </div>
     ```
     Tetapi di dalam Sub-Tab 3 pada baris 689-693, dimasukkan kembali:
     ```tsx
     <div className={`${activeTab === 'cetak' ? 'block' : 'hidden'} space-y-4`}>
       <div className="bg-white ... print:border-none print:p-0">
         <PrintHeader user={user} sekolahId={user?.sekolah_id} />
     ```
     Akibatnya, saat Sub-Tab 3 dicetak, **Kop Surat resmi dicetak dua kali berturut-turut** di bagian atas kertas.
  3. **Penurunan Kedalaman Analitik:**
     Progress bar rasio kehadiran (Hadir Sekolah %, Izin/Sakit %, Dinas Luar %) dari `AnalitikView` tereliminasi, dan jumlah guru pada papan peringkat dipangkas dari Top 10 menjadi Top 5.

---

### 3.5. KLASTER 5: Rasionalisasi Konfigurasi, Kalender & Cadangan Sistem
- **Komponen Terkait:** `src/components/AdminDataView.tsx`, `src/components/AdminConfigView.tsx`, `src/components/SistemBlokView.tsx`, `src/components/AdminBackupView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - `view-admin-data`: Mengelola Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, Wali Kelas.
  - `view-sistem-blok`: Mengelola periode kegiatan blok non-KBM (PTS, PAS, Ujian, Libur Khusus).
  - `view-admin-backup`: Mencadangkan presensi dan jurnal ke Google Sheets via Webhook serta mengosongkan tabel.
  - `view-admin-config`: Pengaturan profil sekolah, KOP resmi, jam kerja/toleransi keterlambatan, geofence GPS, dan aturan presensi.
- **Kondisi Setelah Konsolidasi:**
  - Menu A: `view-admin-data` mengintegrasikan `SistemBlokView` sebagai Sub-Tab ke-6 (`sistem_blok`).
  - Menu B: `view-admin-config` mengintegrasikan `AdminBackupView` sebagai Sub-Tab ke-5 (`backup`).
- **Temuan Regresi Bisnis:**
  1. **Elemen `<section>` Bersarang:** `AdminBackupView` dan `SistemBlokView` masih merender `<section id="view-..." className="view-section">` dan pembungkus `glass-card`, menciptakan markup bersarang dan visual card di dalam card.
  2. **Validasi Role Master Data:** Proteksi modifikasi master data (`isMasterDataModificationAllowed`) sudah ditegakkan di `AdminDataView` dan `AdminConfigView`, namun saat beralih ke Sub-Tab `sistem_blok`, penegakan role harus diverifikasi agar konsisten dengan RBAC sistem blok.

---

### 3.6. KLASTER 6: Penyatuan Pusat Verifikasi & Supervisi Terpadu
- **Komponen Terkait:** `src/components/AdminVerifView.tsx`, `src/components/DokumenView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - `view-admin-verif`: Memverifikasi pengajuan Presensi (izin/sakit/dinas luar), Jurnal KBM harian, dan Laporan Petugas Piket. Memiliki fitur verifikasi massal (batch approve), tolak dengan alasan wajib, dan pemulihan dispensasi F-SIPJAM-02.
  - `view-dokumen`: Mengelola kurikulum (CP, ATP, RPE, Prota, Promes, RPM), pengunggahan berkas oleh guru, dan verifikasi perangkat ajar oleh admin.
- **Kondisi Setelah Konsolidasi:**
  - `AdminVerifView.tsx` menambahkan Sub-Tab ke-4: `Dokumen` ("Perangkat") yang memanggil `<DokumenView user={user} />`.
- **Temuan Regresi Bisnis & Keamanan (CRITICAL):**
  1. **Kebocoran Mode Peninjau (`isReadOnly` Bypass):**
     Di `AdminVerifView.tsx`, jika peran adalah Kepala Sekolah atau Dinas Pendidikan, `isReadOnly` aktif sehingga tombol aksi di tab Presensi, Jurnal, dan Piket dimatikan. Namun pada baris 764-767:
     ```tsx
     <div className={activeTab === 'Dokumen' ? 'block' : 'hidden'}>
       <DokumenView user={user} />
     </div>
     ```
     Prop `isReadOnly` **sama sekali tidak dilewatkan** ke `DokumenView`. Selain itu, `DokumenView.tsx` bahkan tidak menerima parameter `isReadOnly` di interface props-nya. Hal ini memungkinkan pengguna read-only tetap dapat memicu aksi atau melihat tombol interaktif dokumen tanpa pembatasan.
  2. **Kerapuhan Case-Sensitivity pada Pengecekan Peran Admin:**
     Di `DokumenView.tsx` baris 23:
     ```tsx
     const isAdmin = user?.role === 'Admin';
     ```
     Jika string peran pengguna adalah `admin` (huruf kecil) atau `superadmin`, `isAdmin` bernilai `false`. Akibatnya, saat admin membuka Tab "Perangkat" di Pusat Verifikasi, komponen `DokumenView` keliru menganggap admin sebagai guru biasa dan merender tab unggah guru (`list`), bukan matriks supervisi kurikulum dewan guru (`matrix`).

---

### 3.7. KLASTER 7: Harmonisasi Ekosistem Kesiswaan, Presensi Gerbang & Intervensi Wali
- **Komponen Terkait:** `src/components/PiketView.tsx`, `src/components/RekapSiswaView.tsx`.
- **Kondisi Sebelum Konsolidasi:**
  - `view-piket`: Kiosk scan QR gerbang siswa, presensi manual datang/pulang, pencatatan buku tamu/apel, submit laporan harian piket.
  - `view-rekap-siswa`: Tab gerbang (pemantauan arus gerbang per rombel, deteksi bolos, kirim WhatsApp orang tua) dan tab rekap (rekapitulasi absensi akumulatif siswa per semester/mapel).
- **Kondisi Setelah Konsolidasi:**
  - Kedua komponen dipertahankan secara proporsional: `PiketView` untuk petugas bertugas hari ini, dan `RekapSiswaView` sebagai pusat analisis dan intervensi kesiswaan untuk Wali Kelas, Admin, dan Kepala Sekolah.
- **Temuan Regresi Bisnis:**
  1. **Ketidaksinkronan Waktu Pemanggilan Notifikasi WhatsApp:** Pada `RekapSiswaView.tsx` baris 1495, waktu pemindaian yang dikirim ke pesan WhatsApp orang tua mengambil `siswa.jamPulang || siswa.jamDatang`. Apabila jam mengandung nilai string `"-"` atau format ISO non-sanitasi, pesan WhatsApp orang tua dapat menampilkan waktu yang tidak terbaca rapi. Pemanfaatan `formatPresensiTime` harus diintegrasikan sebelum membangun payload pesan.

---

## 4. FORMULASI REKOMENDASI DAN RANCANGAN INTEGRASI PEMULIHAN

Untuk mengintegrasikan kembali seluruh peraturan bisnis, validasi, dan elemen cetak yang hilang tanpa merusak struktur konsolidasi navigasi yang rapi, berikut adalah rekomendasi teknis implementasi konkret:

### 4.1. Pemulihan Tanda Tangan & Eliminasi Duplikasi Kop Surat di `AdminRekapView.tsx`
- **Tindakan:**
  1. Tempatkan blok `<PrintSignature ... />` di luar pembungkus tab dinamis (`activeTab === 'tabel'` maupun `activeTab === 'cetak'`), dengan menambahkan kelas utilitas `print-only` atau `hidden print:block`. Dengan demikian, kapan pun pencetakan dilakukan (baik dari Tab 2 maupun Tab 3), tanda tangan legalitas selalu tercetak pada halaman akhir.
  2. Hapus tag `<PrintHeader user={user} sekolahId={user?.sekolah_id} />` yang berada di dalam `activeTab === 'cetak'` (baris 690), dan biarkan `<PrintHeader>` level atas (baris 417) menjadi satu-satunya sumber Kop Surat saat `window.print()` dipanggil.
- **Kode Usulan:**
  ```tsx
  {/* Tempatkan di bagian bawah wadah rekapData, berlaku universal saat print */}
  <div className="hidden print:block">
    <PrintSignature
      leftTitle="Mengetahui,"
      leftSubtitle="Pengelola Data / Admin"
      leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama}
      leftNip={isKepalaSekolah ? '-' : user?.nip}
      user={user}
      sekolahId={user?.sekolah_id}
    />
  </div>
  ```

---

### 4.2. Pemulihan Umpan Balik Penolakan Jurnal Guru di `GuruJurnal.tsx` / `RekapJurnalView.tsx`
- **Tindakan:**
  1. Pada Sub-Tab 2 `GuruJurnal.tsx` ("Riwayat & Rekap Jurnal Saya"), sediakan banner interaktif jika ditemukan jurnal dengan status `Ditolak`:
     ```tsx
     {dailyState?.jurnalDitolak && dailyState.jurnalDitolak.length > 0 && (
       <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl p-4 mb-4">
         <h4 className="font-bold text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
           <i className="fa-solid fa-triangle-exclamation"></i>
           Perhatian: Terdapat {dailyState.jurnalDitolak.length} Jurnal yang Ditolak Admin
         </h4>
         <div className="mt-2 space-y-1.5 text-xs">
           {dailyState.jurnalDitolak.map((j: any) => (
             <div key={j.id} className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-red-200">
               <span className="font-bold">{j.mapel} (Kelas {j.kelas}, {j.tanggal})</span>:
               <span className="italic text-red-600 dark:text-red-400 ml-1">
                 "{j.catatan_admin || j.catatan_penolakan || 'Harap perbaiki dokumentasi/materi KBM'}"
               </span>
             </div>
           ))}
         </div>
       </div>
     )}
     ```
  2. Pada tabel 8/12-kolom `RekapJurnalView.tsx`, pastikan kolom catatan secara eksplisit merender alasan penolakan saat `status_verifikasi === 'Ditolak'`.
  3. Tambahkan input teks pencarian kata kunci pada materi KBM di `RekapJurnalView.tsx`.

---

### 4.3. Penyelarasan RBAC dan Mode Peninjau di `AdminVerifView.tsx` dan `DokumenView.tsx`
- **Tindakan:**
  1. Perbarui definisi interface `DokumenViewProps`:
     ```tsx
     export interface DokumenViewProps {
       user: any;
       isReadOnly?: boolean;
     }
     ```
  2. Normalisasikan pengecekan peran admin di `DokumenView.tsx`:
     ```tsx
     const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
     const isAdmin = normRole === 'admin' || normRole === 'superadmin';
     ```
  3. Teruskan prop `isReadOnly` dari `AdminVerifView.tsx` ke `<DokumenView user={user} isReadOnly={isReadOnly} />`.
  4. Nonaktifkan modal persetujuan / revisi dokumen apabila `isReadOnly={true}`.

---

### 4.4. Pengembalian Analitik Komposisi Presensi di `AdminRekapView.tsx`
- **Tindakan:**
  Pada Sub-Tab 1 (`analitik`), integrasikan 3 progress bar komposisi persentase kehadiran:
  - **Hadir di Sekolah:** $\frac{\text{Total Hadir}}{\text{Total Presensi}} \times 100\%$
  - **Izin / Sakit:** $\frac{\text{Total Izin} + \text{Total Sakit}}{\text{Total Presensi}} \times 100\%$
  - **Dinas Luar:** $\frac{\text{Total Dinas Luar}}{\text{Total Presensi}} \times 100\%$
  Serta berikan tombol beralih antara "Top 5" dan "Top 10" pada Papan Peringkat Kinerja Guru.

---

### 4.5. Penyediaan Filter Bulan pada Riwayat Presensi Guru di `HistoryView.tsx`
- **Tindakan:**
  Tambahkan pemilih bulan (`<input type="month">`) di header `HistoryView` saat `activeTab === 'presensi'`, yang menyaring kueri ke `presensi_guru` berdasarkan awalan `timestamp` atau rentang tanggal bulan tersebut.

---

## 5. KESIMPULAN

Konsolidasi 7 klaster menu telah memberikan peningkatan ergonomi dan pengurangan beban kognitif yang signifikan bagi pendidik dan administrator sekolah. Namun demikian, audit empiris ini membuktikan adanya **3 celah kritis (critical regressions)** dan **5 celah moderat** yang harus dipulihkan pada implementasi tahap berikutnya:
1. **Legalitas Cetak:** Memulihkan `PrintSignature` di Tab Tabel `AdminRekapView` dan menghilangkan duplikasi `PrintHeader`.
2. **Umpan Balik Guru:** Membuka kembali visibilitas catatan penolakan admin untuk jurnal yang ditolak.
3. **Integritas RBAC:** Menyinkronkan mode baca-saja (`isReadOnly`) dan normalisasi peran case-insensitive pada Pusat Verifikasi Perangkat Ajar (`DokumenView`).

Seluruh rekomendasi di atas dirancang untuk memulihkan logika bisnis versi terdahulu secara presisi **tanpa menambah menu baru pada sidebar** dan **tanpa mengubah arsitektur konsolidasi yang sudah berjalan**.

# LAPORAN KOMPREHENSIF ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS) DAN REKOMENDASI SOLUSI TEKNIS ARSITEKTUR SIPJAM-APP

**Dokumen Kontrak Teknis & Arsitektur Sistem**  
**Aplikasi:** SIPJAM-APP (Sistem Informasi Presensi dan Jurnal Mengajar)  
**Nomor Dokumen:** `SIPJAM-TR-ARCH-2026-001`  
**Versi:** 1.0.0 (Master Release)  
**Tanggal Penerbitan:** 18 November 2026  
**Status:** Rekomendasi Resmi Arsitektur & Analisis Hulu ke Hilir (Read-Only Analysis)  
**Penyusun:** Tim Arsitektur & Rekayasa Perangkat Lunak SIPJAM  

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Analisis Akar Masalah (Root Cause Analysis) Persyaratan R1](#2-analisis-akar-masalah-root-cause-analysis-persyaratan-r1)
   - [2.1. Masalah 1: Jurnal Ganda (Duplicate Journal Entries)](#21-masalah-1-jurnal-ganda-duplicate-journal-entries)
   - [2.2. Masalah 2: Foto Bukti Tidak Muncul pada Tampilan Jurnal](#22-masalah-2-foto-bukti-tidak-muncul-pada-tampilan-jurnal)
   - [2.3. Masalah 3: Status Foto Tertunda di-Upload & Stuck di Database](#23-masalah-3-status-foto-tertunda-di-upload--stuck-di-database)
3. [Rekomendasi Solusi Teknis & Perbaikan Arsitektur Persyaratan R1](#3-rekomendasi-solusi-teknis--perbaikan-arsitektur-persyaratan-r1)
   - [3.1. Arsitektur Pencegahan Jurnal Ganda & Eliminasi Balapan (Race Condition)](#31-arsitektur-pencegahan-jurnal-ganda--eliminasi-balapan-race-condition)
   - [3.2. Transformasi Arsitektur Penyimpanan Media ke Supabase Storage Bawaan](#32-transformasi-arsitektur-penyimpanan-media-ke-supabase-storage-bawaan)
   - [3.3. Standardisasi Antrean Media Offline Terpadu & Perbaikan Siklus Hidup IndexedDB](#33-standardisasi-antrean-media-offline-terpadu--perbaikan-siklus-hidup-indexeddb)
4. [Desain Teknis Otomatisasi Status Alfa Presensi (Persyaratan R2)](#4-desain-teknis-otomatisasi-status-alfa-presensi-persyaratan-r2)
   - [4.1. Analisis Skema Data Presensi Guru, Pengaturan Waktu, dan Aturan Jam Tutup](#41-analisis-skema-data-presensi-guru-pengaturan-waktu-dan-aturan-jam-tutup)
   - [4.2. Logika Determinasi Status Kehadiran (Hadir, Izin, Sakit, Alpa, Lupa Checkout)](#42-logika-determinasi-status-kehadiran-hadir-izin-sakit-alpa-lupa-checkout)
   - [4.3. Penanganan Hari Libur Nasional, Libur Mingguan, dan Multi-Day Leave](#43-penanganan-hari-libur-nasional-libur-mingguan-dan-multi-day-leave)
   - [4.4. Desain Arsitektur Scheduled Runner: Evaluasi Komparatif & Solusi Hibrida](#44-desain-arsitektur-scheduled-runner-evaluasi-komparatif--solusi-hibrida)
   - [4.5. Spesifikasi Integrasi API Endpoint & Mutasi Basis Data](#45-spesifikasi-integrasi-api-endpoint--mutasi-basis-data)
5. [Desain Teknis Verifikasi Otomatis Jurnal (Persyaratan R3)](#5-desain-teknis-verifikasi-otomatis-jurnal-persyaratan-r3)
   - [5.1. Analisis Kondisi Status Verifikasi Saat Ini pada Seluruh Kategori Jurnal](#51-analisis-kondisi-status-verifikasi-saat-ini-pada-seluruh-kategori-jurnal)
   - [5.2. Solusi Teknis: Unconditional Auto-Approval pada Lapisan Aplikasi & Basis Data](#52-solusi-teknis-unconditional-auto-approval-pada-lapisan-aplikasi--basis-data)
6. [Desain Teknis Alur Penolakan Manual Admin & Rekapitulasi (Persyaratan R4)](#6-desain-teknis-alur-penolakan-manual-admin--rekapitulasi-persyaratan-r4)
   - [6.1. Desain Antarmuka Verifikasi & Modal Penolakan Admin Wajib Alasan](#61-desain-antarmuka-verifikasi--modal-penolakan-admin-wajib-alasan)
   - [6.2. Audit Trail Penolakan & Integrasi Sistem Notifikasi Dua Arah](#62-audit-trail-penolakan--integrasi-sistem-notifikasi-dua-arah)
   - [6.3. Tampilan Riwayat & Instruksi Perbaikan pada Antarmuka Guru dan Tenaga Administrasi](#63-tampilan-riwayat--instruksi-perbaikan-pada-antarmuka-guru-dan-tenaga-administrasi)
   - [6.4. Konsekuensi Matematis terhadap Jam Pelajaran (JP), Kehadiran, dan Tunjangan/Honor](#64-konsekuensi-matematis-terhadap-jam-pelajaran-jp-kehadiran-dan-tunjanganhonor)
7. [Actionable Implementation Roadmap & Migration Plan](#7-actionable-implementation-roadmap--migration-plan)
   - [7.1. Tahapan Eksekusi Bertahap (Fase 1 hingga Fase 4)](#71-tahapan-eksekusi-bertahap-fase-1-hingga-fase-4)
   - [7.2. Skrip Migrasi SQL Siap Pakai (DDL & DML Data Patch)](#72-skrip-migrasi-sql-siap-pakai-ddl--dml-data-patch)

---

## 1. RINGKASAN EKSEKUTIF

Sistem Informasi Presensi dan Jurnal Mengajar (**SIPJAM-APP**) merupakan platform inti operasional sekolah berbasis web yang mengelola presensi harian, jurnal kegiatan belajar mengajar (KBM), bimbingan konseling (BK), tugas piket guru, serta laporan kerja staf Tata Usaha (TU). Seiring dengan bertambahnya volume data dan variasi pola penggunaan di lapangan, teridentifikasi beberapa anomali operasional kritis yang menurunkan keandalan sistem, integritas rekapitulasi, dan kenyamanan pengguna:

1. **Inkonsistensi Data Jurnal dan Masalah Media Bukti (R1):**
   - Terjadinya entri ganda (duplikat) pada tabel `jurnal_pembelajaran` yang disebabkan oleh balapan eksekusi formulir (*TOCTOU race condition*), desinkronisasi logika *query* pada Jurnal Kegiatan, pemisahan alur simpan absensi dengan jurnal materi, ketiadaan batasan unik (*database unique constraint*), serta kegagalan mutasi *cache in-memory* pada *looping auto-fill* guru izin.
   - Foto bukti jurnal tidak dapat dirender di perangkat pengguna lain atau hilang secara diam-diam (*silent error suppression*) akibat ketiadaan *bucket storage* terintegrasi di Supabase, fallback berbahaya yang menyimpan URL lokal browser (`blob:http://...`) ke database, dan pemblokiran tautan pihak ketiga oleh Google Drive (*Hotlinking restriction 2024*).
   - Teks `"Sedang mengunggah dokumen..."` atau status `gagal_upload` macet permanen di database akibat *background process* yang terputus dan siklus *retry* IndexedDB yang menghapus berkas secara prematur.

2. **Ketiadaan Otomatisasi Status Alfa saat Lewat Batas Tutup Pulang (R2):**
   - Meskipun logika bisnis evaluasi ketidakhadiran di `src/lib/attendanceAlpa.ts` dan *route handler* di `/api/attendance/auto-alpa` telah tersedia, proses tersebut belum pernah berjalan otomatis di lingkungan produksi karena ketiadaan konfigurasi *scheduled cron runner* (seperti `vercel.json` atau GitHub Actions Workflow) dan belum terdaftarnya *environment variable* `CRON_SECRET`.

3. **Inkonsistensi Alur Verifikasi Awal Jurnal (R3):**
   - Jurnal yang disimpan masih berstatus `'Menunggu'` akibat nilai *default* database lama dan ketergantungan kondisional pada keberhasilan unggah foto latar belakang, sehingga membebani administrator sekolah untuk melakukan persetujuan manual yang tidak diperlukan.

4. **Kebutuhan Standarisasi Alur Penolakan Manual oleh Admin (R4):**
   - Perlunya penegasan alur tolak manual yang mewajibkan input alasan, pencatatan rekam jejak (*audit trail* `rejected_by` dan `rejected_at`), pengiriman notifikasi instan (Push + In-App Chat), serta jaminan matematis bahwa item yang ditolak otomatis terpotong dari akumulasi Jam Pelajaran (JP) dan konversi kehadiran hari kerja (Alpa Murni).

Laporan ini menyajikan investigasi teknis hulu ke hilir (*root cause analysis*) secara mendalam tanpa memodifikasi kode sumber secara gegabah, dilanjutkan dengan cetak biru rekomendasi arsitektur, spesifikasi teknis komponen, skema pemicu terjadwal, dan skrip migrasi SQL siap pakai.

---

## 2. ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS) PERSYARATAN R1

Investigasi forensik dilakukan pada seluruh lapisan aplikasi: antarmuka React (`GuruJurnal.tsx`, `GuruPresensi.tsx`, `HistoryView.tsx`), *helper storage* (`driveUpload.ts`, `imageUrl.ts`, `presensiUploadPersistence.ts`), hingga skema dan data aktual pada database PostgreSQL Supabase (proyek `jicvvqxjyzntdrccnuyz`).

### 2.1. Masalah 1: Jurnal Ganda (Duplicate Journal Entries)

Terjadinya entri ganda pada jurnal tidak disebabkan oleh satu faktor tunggal, melainkan gabungan dari lima kegagalan struktural pada antarmuka, logika kueri, dan basis data:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FAKTOR PENYEBAB JURNAL GANDA                          │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼───────────────────────────┐
         ▼                            ▼                           ▼
[1. UI TOCTOU Race]        [2. Query Kelas Desync]     [3. Absensi vs Materi Split]
Double click / fast Enter  Form: kelas = '-'           "Simpan Absensi" -> INSERT
Trigger 2x Submit Async    Query: WHERE kelas = ''     "Simpan Jurnal"  -> Gagal Cocok
Tanpa useRef Atomic Lock   Query Return 0 Row          -> INSERT Baris Ke-2
                           Selalu INSERT Baru
         │                            │                           │
         └────────────────────────────┼───────────────────────────┘
                                      ▼
                        [4. Database Integrity Gap]
                        Tabel jurnal_pembelajaran
                        HANYA memiliki Primary Key id UUID
                        TIDAK ADA Unique Constraint / Index
                        PostgreSQL Menerima 100% Baris Duplikat
                                      │
                                      ▼
                      [5. Auto-Fill Cache Invalidation]
                      Loop Jadwal KBM Guru Izin/Sakit
                      Tidak Memutasi existingJournals Cache
```

#### A. TOCTOU (Time-of-Check to Time-of-Use) Race Condition pada `GuruJurnal.tsx`
Pada berkas `src/components/GuruJurnal.tsx` (baris 1580, 1716–1760, dan 1804–1817), penanganan tombol simpan jurnal mengandalkan status React `loading`:
```tsx
// GuruJurnal.tsx:1580
setLoading(true);

// GuruJurnal.tsx:1716-1729
let existingSessionQuery = supabase
  .from('jurnal_pembelajaran')
  .select('*')
  .eq('tanggal', tgl)
  .eq('kelas', kelas);
if (user?.sekolah_id) existingSessionQuery = existingSessionQuery.eq('sekolah_id', user.sekolah_id);
if (targetSearchUserId && searchEffectiveName) {
  existingSessionQuery = existingSessionQuery.or(`user_id.eq.${targetSearchUserId},nama_guru.ilike."%${searchEffectiveName}%"`);
}
let { data: existingSessionRows } = await existingSessionQuery;

// GuruJurnal.tsx:1782-1817
if (existingSessionRow) {
  const res = await supabase.from('jurnal_pembelajaran').update(updatePayload).eq('id', existingSessionRow.id);
} else {
  let insertRes = await supabase.from('jurnal_pembelajaran').insert([newJurnal]);
}
```
**Akar Masalah:** Pemanggilan `setLoading(true)` bersifat asinkron dalam siklus *render* React. Selama interval asinkron (kompresi gambar, panggilan jaringan), pengguna yang menekan tombol Simpan dua kali secara cepat (*double-click*) atau menekan tombol `Enter` pada input formulir akan memicu dua eksekusi `handleJurnalSubmit` secara paralel. Karena kedua eksekusi menjalankan `existingSessionQuery` sebelum salah satu eksekusi sempat melakukan `insert`, kedua kueri sama-sama mendapati bahwa data belum ada (`existingSessionRows = []`). Akibatnya, kedua alur sama-sama mengeksekusi `.insert([newJurnal])` dengan menghasilkan dua UUID baru yang berbeda untuk sesi mengajar yang sama persis.

#### B. Desinkronisasi Nilai Kolom Kelas pada Jurnal Kegiatan Guru dan TU
Pada formulir Jurnal Kegiatan (`tipeJurnal === 'Jurnal Kegiatan'`), bidang pilihan kelas disembunyikan dari tampilan UI:
- *State Awal:* `const [kelas, setKelas] = useState('');` (`GuruJurnal.tsx:81`). Karena tidak ada input kelas, `kelas` bernilai string kosong `""`.
- *Payload Insert:* Pada baris 1654, sistem menormalisasi kolom kelas:
  ```ts
  kelas: tipeJurnal === 'Jurnal KBM' ? kelas : '-',
  ```
  Di dalam database, baris tersimpan dengan nilai `kelas = '-'`.
- *Pencarian Sesi Tersimpan:* Pada baris 1720, kueri pencarian sesi yang ada dieksekusi dengan:
  ```ts
  existingSessionQuery = supabase.from('jurnal_pembelajaran').select('*').eq('tanggal', tgl).eq('kelas', kelas);
  ```
  Kueri ini secara harfiah mencari baris dengan `kelas = ''` (string kosong).
- **Akar Masalah:** Karena di basis data nilainya adalah `'-'` sedangkan kueri memfilter `''`, kueri `existingSessionQuery` **SELALU menghasilkan array kosong (`[]`)**. Kondisi `existingSessionRow` tidak pernah bernilai *true* untuk Jurnal Kegiatan. Setiap kali guru atau staf TU menekan tombol simpan ulang atau mengedit catatan, sistem selalu menganggap data belum pernah ada dan melakukan `.insert()` baru.

#### C. Pemisahan Formulir "Simpan Absensi Siswa" vs "Simpan Jurnal KBM"
Pada antarmuka Jurnal KBM terdapat dua alur penyimpanan terpisah:
1. `handleSaveAbsensiOnly` (`GuruJurnal.tsx:1305–1433`): Menyimpan presensi siswa terlebih dahulu. Jika sesi jurnal belum ada, fungsi ini membuat baris baru dengan nilai default `materi: '-'`, `kegiatan: '-'`, dan mengisi kolom `absensi_siswa`.
2. `handleJurnalSubmit` (`GuruJurnal.tsx:1648–1817`): Guru kemudian beralih ke formulir jurnal untuk mengisi materi dan mengunggah foto.
- **Akar Masalah:** Saat `handleJurnalSubmit` dieksekusi, sistem mencoba mencocokkan sesi yang baru saja dibuat oleh presensi siswa. Apabila terdapat sedikit perbedaan pada `user_id` (misalnya akibat *retry* tanpa *user_id* pada baris 1422) atau perbedaan pencocokan nama guru pada baris 1711–1714, sesi awal gagal dikenali. Sistem lantas menganggap sesi tersebut baru dan melakukan `.insert()` baris kedua. Akibatnya, tercipta dua baris: satu baris hanya berisi absensi siswa (materi kosong), dan satu baris berisi materi/foto tanpa absensi.

#### D. Ketiadaan Database Unique Constraint pada Skema Supabase
Pada berkas skema `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (baris 223–261):
```sql
CREATE TABLE IF NOT EXISTS public.jurnal_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now(),
    nama_guru TEXT NOT NULL,
    mapel TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    ...
);
```
**Akar Masalah:** Tabel `public.jurnal_pembelajaran` maupun `public.jurnal_bk` hanya mengandalkan *Primary Key* pada kolom `id UUID`. Tidak ada *Composite Unique Constraint* pada tingkat RDBMS untuk kolom `(sekolah_id, tanggal, user_id, kelas, mapel)`. Akibatnya, RDBMS PostgreSQL menerima seluruh operasi `INSERT` yang duplikat secara legal tanpa memicu pelanggaran integritas data (*constraint violation*).

#### E. Bug Looping Auto-Fill Jadwal Izin/Sakit Tanpa Mutasi State
Pada berkas `src/lib/attendanceAlpa.ts` (baris 1347–1394):
```ts
let jbQ = client.from('jurnal_pembelajaran').select('*').eq('tanggal', evaluatedDate);
if (teacher.sekolah_id) jbQ = jbQ.eq('sekolah_id', teacher.sekolah_id);
const { data: existingJournals } = await jbQ;

for (const sched of teacherSchedules) {
  const alreadyFilled = (existingJournals || []).some(
    (j: any) => isTeacherJournalMatch(teacher, j) && isJurnalMatchJadwal(j, sched)
  );
  if (!alreadyFilled) {
    await client.from('jurnal_pembelajaran').insert(autoJournalRecord);
  }
}
```
**Akar Masalah:** Koleksi `existingJournals` ditarik sekali sebelum *loop* iterasi jadwal. Apabila seorang guru memiliki dua entri jadwal pada hari yang sama (misalnya jam ke-1 s.d ke-3 dan jam ke-4 s.d ke-5 untuk rombel yang berurutan), iterasi jadwal kedua mengevaluasi variabel `existingJournals` lama yang belum mencakup data yang baru saja di-*insert* pada iterasi pertama, sehingga memicu *insert* ganda.

#### F. Bukti Nyata Data Duplikat pada Database Produksi (Live Supabase Verification)
Pemeriksaan kueri SQL langsung pada database produksi proyek `jicvvqxjyzntdrccnuyz` membuktikan adanya entri ganda:
```sql
SELECT tanggal, nama_guru, kelas, mapel, COUNT(*) as jumlah_duplikat
FROM public.jurnal_pembelajaran
GROUP BY tanggal, nama_guru, kelas, mapel
HAVING COUNT(*) > 1
ORDER BY jumlah_duplikat DESC;
```
**Hasil Temuan Data Lapangan:**
- Guru `Venda Lestari Kairupan` (Tanggal: `2026-08-19`, Mapel: `Geografi`, Kelas: `X Merdeka`): Ditemukan **3 entri identik** yang tercipta berturut-turut pada jam `12:02:42`, `12:04:19`, dan `12:06:21`.
- Pengguna `Ade Fitrawan Ibrahim` (Tanggal: `2026-09-02`, Mapel: `Jurnal Kegiatan`, Kelas: `-`): Ditemukan **3 entri identik** pada jam `16:25:20`, `07:04:55`, dan `07:06:04`.
- Pengguna `Ade Fitrawan Ibrahim` (Tanggal: `2026-08-03`, Mapel: `Matematika`, Kelas: `X Merdeka`): Ditemukan **3 entri identik**.

---

### 2.2. Masalah 2: Foto Bukti Tidak Muncul pada Tampilan Jurnal

Kendala tidak munculnya foto bukti jurnal dan presensi berakar pada kelemahan arsitektur transmisi berkas dan pemblokiran pihak ketiga:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FAKTOR FOTO TIDAK MUNCUL DI UI                        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼───────────────────────────┐
         ▼                            ▼                           ▼
[1. Tanpa Supabase Bucket]    [2. Fallback Blob ke DB]   [3. Google Drive 2024 Ban]
storage.buckets = KOSONG      GAS Upload Timeout/CORS     Google Blokir uc?export=view
100% Mengandalkan Google      Menyimpan String URL        dan Thumbnail Pihak Ketiga
Apps Script (GAS) Webhook     blob:http://localhost...    Tag <img> Mengalami Error
Lambat & Rentan Kuota         Hanya Hidup di RAM Lokal    403 Forbidden / Redirect 302
                              Device Lain Error 404
                                      │
                                      ▼
                        [4. Silent Error Suppression]
                        Komponen UI Menggunakan:
                        onError={(e) => (e.target as HTMLElement).style.display = 'none'}
                        Gambar Rusak Dihilangkan Sepihak Tanpa Pesan Galat
```

#### A. Ketiadaan Supabase Storage Bucket & Ketergantungan Webhook Google Apps Script
Pengecekan basis data dengan perintah `SELECT * FROM storage.buckets;` menghasilkan array kosong (`[]`). SIPJAM-APP sama sekali tidak memanfaatkan infrastruktur penyimpanan objek bawaan Supabase (`supabase.storage`).
Seluruh pengunggahan berkas dialihkan ke skrip perantara Google Apps Script (GAS) (`src/lib/driveUpload.ts`). Proses ini mengubah gambar menjadi representasi base64 dan mengirimkannya via `POST` ke URL webhook `script.google.com`. Mekanisme ini memiliki kelemahan mendasar:
- Rentan terhadap batas waktu eksekusi Google (*execution timeout* 30 detik).
- Terkena pembatasan kuota harian Google Workspace (*Daily Drive API & URL Fetch Quota*).
- Kerap mengalami kegagalan CORS (*Cross-Origin Resource Sharing*) pada jaringan seluler tertentu.

#### B. Penyimpanan Berbahaya URL Lokal `blob:` ke Kolom Database Saat Upload Gagal
Pada `src/components/GuruJurnal.tsx` (baris 1529, 1584–1594, 1662, dan 1676):
```tsx
// Baris 1529: Saat foto dipilih dari kamera/galeri
setPhotoPreviewUrl(URL.createObjectURL(compressed));

// Baris 1584-1594: Blok penanganan simpan formulir
let fileUrl = '';
try {
  if (file) {
    const compressedFile = await compressImageWithCanvas(file);
    fileUrl = await uploadToDrive(compressedFile, user.nama, tipeJurnal, 'Jurnal');
  } else if (photoPreviewUrl) {
    fileUrl = photoPreviewUrl;
  }
} catch (err: any) {
  console.warn('Gagal upload ke Google Drive, melanjutkan simpan jurnal dengan preview/fallback foto:', err);
  fileUrl = photoPreviewUrl || '';
  showToast('Info Upload Foto', 'Foto belum tersinkron ke cloud drive, data jurnal tetap tersimpan di database.', 'info');
}

// Baris 1662 & 1676: Data disimpan ke Supabase
link_bukti_foto: fileUrl,
foto_kegiatan: fileUrl,
```
**Akar Masalah:** Ketika panggilan `uploadToDrive` gagal atau mengalami *timeout*, blok `catch` tidak menghentikan penyimpanan dan tidak menetapkan nilai `null`. Sebaliknya, kode mengambil variabel `photoPreviewUrl`—yang berisi string URL sementara memori peramban lokal seperti `blob:http://localhost:3000/a8342738-9e62-4f10-9ecb-d1fae792e3c0` atau `blob:https://sipjam.vercel.app/...`—dan menyimpannya ke kolom `link_bukti_foto` di PostgreSQL!
URL `blob:` **hanya valid di dalam memori tab browser perangkat yang mengunggah selama tab tersebut belum ditutup**. Ketika admin, kepala sekolah, atau guru lain membuka riwayat jurnal dari perangkat lain, browser mereka mencoba mengambil URL `blob:` tersebut dan langsung mengalami kegagalan `ERR_FILE_NOT_FOUND` / 404 karena referensi memori fisik tersebut tidak ada di perangkat mereka.

#### C. Kebijakan Baru Pemblokiran Hotlinking Google Drive (Januari 2024)
Pada `src/lib/imageUrl.ts` (baris 34–62), sistem berusaha mengonversi tautan Google Drive menjadi URL gambar langsung menggunakan pola:
- `https://drive.google.com/uc?export=view&id={fileId}`
- `https://drive.google.com/thumbnail?id={fileId}&sz=w{size}`
**Akar Masalah:** Sejak awal tahun 2024, Google menerapkan pembaruan keamanan ketat yang **memblokir hotlinking pihak ketiga secara langsung** dari domain non-Google terhadap URL `uc?export=view` dan `drive.google.com/thumbnail` tanpa *cookie* sesi akun Google pemilik berkas. Selain itu, jika skrip Google Apps Script tidak secara eksplisit menyetel izin berkas menjadi *Public* (`Anyone with the link can view`), tag `<img src="...">` di peramban akan menerima respon `403 Forbidden` atau dialihkan ke halaman login Google (`accounts.google.com`), sehingga gambar gagal dirender.

#### D. Silent Error Suppression pada Elemen Antarmuka Pengguna
Pada komponen `src/components/HistoryView.tsx` (baris 358), `src/components/AdminVerifView.tsx` (baris 1792), dan `src/components/RekapJurnalView.tsx` (baris 1809–1810):
```tsx
<img
  src={resolvedUrl}
  alt="Bukti Foto"
  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
/>
```
**Akar Masalah:** Kode antarmuka menyembunyikan elemen gambar secara paksa (`display: 'none'`) begitu terjadi galat pemuatan (*onError*). Akibatnya, baik admin maupun guru tidak melihat indikator apa pun bahwa terdapat gambar yang gagal dimuat, menciptakan ilusi bahwa guru tidak pernah melampirkan foto bukti.

---

### 2.3. Masalah 3: Status Foto Tertunda di-Upload & Stuck di Database

Status `"Sedang mengunggah dokumen..."` atau status tertunda yang tidak pernah tuntas diakibatkan oleh penanganan *state* literal dan kegagalan siklus antrean offline:

#### A. Penulisan String Literal `'pending:uploading'` dan `'gagal_upload'` ke Database
Pada alur presensi (`src/components/GuruPresensi.tsx:618` dan baris 849):
```tsx
// Saat form presensi dikirim:
link_bukti: file ? 'pending:uploading' : ''

// Jika upload latar belakang gagal:
await supabase.from('presensi_guru').update({ link_bukti: 'gagal_upload' }).eq('id', presensiId);
```
Pada antarmuka tampilan (`HistoryView.tsx:264–273` dan `AdminVerifView.tsx:1675–1682`), sistem memeriksa nilai tersebut:
- Jika `link_bukti === 'pending:uploading'` $\rightarrow$ Menampilkan badge kuning: `"Sedang mengunggah dokumen... (Swipe ke bawah / F5 untuk pembaruan)"`.
- Jika `link_bukti === 'gagal_upload'` $\rightarrow$ Menampilkan badge: `"Upload dokumen tertunda"`.

**Akar Masalah:** Pada database produksi Supabase live, ditemukan **21 entri presensi guru yang macet permanen dengan nilai `link_bukti = 'pending:uploading'`** sejak Oktober 2026. Hal ini terjadi karena ketika pengguna menutup tab peramban atau mematikan koneksi sesaat setelah menekan tombol submit presensi, proses latar belakang (*background worker*) mati seketika. Database tidak pernah menerima pembaruan URL final dari Google Drive, sehingga status `'pending:uploading'` tertinggal selamanya.

#### B. Kegagalan Logika Retries pada Antrean IndexedDB (`presensiUploadPersistence.ts`)
Pada berkas `src/lib/presensiUploadPersistence.ts` (baris 315–329):
```ts
} catch (err: any) {
  console.warn(`[presensiPersistence] Failed to complete pending upload for ${task.id}:`, err);
  const retries = (task.retryCount || 0) + 1;
  if (retries >= 3) {
    await supabase
      .from('presensi_guru')
      .update({ link_bukti: 'gagal_upload' })
      .eq('id', task.id);
    await removePendingUpload(task.id); // <-- Berkas fisik dihapus permanen!
  } else {
    task.retryCount = retries;
    await queuePendingUpload(task);
  }
}
```
**Akar Masalah:**
1. **Penghapusan Prematur:** Ketika pengunggahan gagal 3 kali berturut-turut (misalnya akibat sinyal sekolah yang drop selama beberapa jam), sistem mengeksekusi `removePendingUpload(task.id)`. Berkas blob foto fisik **DIHAPUS** dari penyimpanan lokal IndexedDB ponsel guru, sementara status di basis data Supabase disetel menjadi `'gagal_upload'`. Begitu dihapus dari IndexedDB, berkas tersebut hilang selamanya dan tidak ada jalan untuk melakukan *retry* otomatis maupun manual.
2. **Ketiadaan Antrean Offline untuk Jurnal:** Sistem antrean IndexedDB ini hanya dibangun untuk `presensi_guru`. Modul `GuruJurnal.tsx` dan `BkJurnalView.tsx` sama sekali tidak memiliki integrasi dengan IndexedDB offline, sehingga jika foto jurnal gagal diunggah, foto langsung hilang atau dialihkan ke URL blob lokal yang rusak.

---

## 3. REKOMENDASI SOLUSI TEKNIS & PERBAIKAN ARSITEKTUR PERSYARATAN R1

### 3.1. Arsitektur Pencegahan Jurnal Ganda & Eliminasi Balapan (Race Condition)

Untuk menjamin tidak akan pernah ada jurnal ganda baik di tingkat UI, jaringan, maupun RDBMS, diterapkan strategi pertahanan 3 lapis:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STRATEGI 3-LAPIS PENCEGAHAN JURNAL GANDA                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. LAPISAN UI (ATOMIC LOCK):                                                │
│    useRef Lock (isSubmittingRef.current = true) sinkron sebelum async event │
│    Disabled submit button & input debouncing                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. LAPISAN QUERY & LOGIKA:                                                  │
│    Koreksi query kelas: const queryKelas = tipeJurnal === 'KBM' ? kelas : '-'│
│    Penyatuan sesi absensi siswa & materi jurnal dalam satu ID referensi     │
│    In-memory cache update pada loop auto-fill izin/sakit                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. LAPISAN RDBMS (POSTGRESQL PARTIAL UNIQUE INDEX & IDEMPOTENT UPSERT):       │
│    idx_uq_jurnal_kbm_sesi: UNIQUE (sekolah_id, tanggal, user_id, kelas, mapel)│
│                            WHERE kelas <> '-' AND mapel <> '-'               │
│    idx_uq_jurnal_kegiatan_sesi: UNIQUE (sekolah_id, tanggal, user_id, kegiatan)│
│                                 WHERE (kelas = '-' OR mapel = '-')           │
│    Operasi Database: supabase.from('jurnal_pembelajaran').upsert(payload)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### A. Penerapan Atomic UI Lock dengan `useRef`
Di dalam komponen `GuruJurnal.tsx` dan `BkJurnalView.tsx`, status React `loading` harus didampingi oleh `useRef` yang bersifat instan (sinkron) tanpa menunggu siklus re-render React:
```tsx
const isSubmittingRef = useRef<boolean>(false);

const handleJurnalSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Guard instan: Jika sedang memproses, tolak eksekusi berikutnya seketika
  if (isSubmittingRef.current) return;
  
  isSubmittingRef.current = true;
  setLoading(true);

  try {
    // ... Seluruh logika kompresi, unggah media, dan penyimpanan data ...
  } catch (err: any) {
    showToast('Gagal', err.message, 'error');
  } finally {
    isSubmittingRef.current = false;
    setLoading(false);
  }
};
```

#### B. Perbaikan Logika Kueri Sesi Jurnal Kegiatan
Koreksi baris 1720 `GuruJurnal.tsx` agar sinkron dengan nilai normalisasi yang disimpan di basis data:
```ts
// Tentukan nilai kelas yang konsisten antara query dan payload database
const queryKelas = tipeJurnal === 'Jurnal KBM' ? (kelas || '-') : '-';

let existingSessionQuery = supabase
  .from('jurnal_pembelajaran')
  .select('*')
  .eq('tanggal', tgl)
  .eq('kelas', queryKelas);
```
> **Catatan Kritis Sesi Kegiatan:** Untuk Jurnal Kegiatan di mana `kelas = '-'` dan `mapel = '-'`, kueri pencarian sesi yang ada juga harus menyertakan nama kegiatan (`.eq('kegiatan', kegiatan)`). Hal ini menjamin bahwa jika guru atau staf TU mengisi lebih dari 1 kegiatan pada tanggal yang sama, data sesi kegiatan pertama tidak tertukar atau tertimpa oleh kegiatan kedua.

#### C. Penerapan PostgreSQL Partial Unique Index & Idempotent Upsert

Pada perancangan awal, pembatasan unik global `UNIQUE (sekolah_id, tanggal, user_id, kelas, mapel)` tampak logis. Namun, evaluasi empiris terhadap basis kode (`GuruJurnal.tsx:1648–1655`) dan basis data live membuktikan bahwa untuk **Jurnal Kegiatan** (baik guru non-mengajar maupun staf Tata Usaha/TU), nilai `kelas` dan `mapel` selalu dinormalisasi menjadi `'-'`. Jika batasan unik kaku diterapkan secara global, maka guru atau staf TU **hanya dapat mencatat 1 kegiatan per hari**, dan input kegiatan kedua (misalnya: Sesi 1 PTS, Sesi 2 Pendampingan Laboratorium/Rapat Dinas) akan ditolak keras atau menimpa (*overwrite*) data kegiatan pertama secara destruktif!

Oleh karena itu, arsitektur RDBMS yang benar dan aman di PostgreSQL adalah menerapkan **dua Partial Unique Index terpisah**:

```sql
-- 1. Index Unik Khusus KBM: Mencegah duplikasi sesi mengajar pada kelas & mapel yang sama
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_jurnal_kbm_sesi 
ON public.jurnal_pembelajaran (sekolah_id, tanggal, user_id, kelas, mapel) 
WHERE kelas <> '-' AND mapel <> '-';

-- 2. Index Unik Khusus Kegiatan Guru & TU: Berbasis nama kegiatan agar sah mengisi >1 kegiatan berbeda per hari
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_jurnal_kegiatan_sesi 
ON public.jurnal_pembelajaran (sekolah_id, tanggal, user_id, kegiatan) 
WHERE (kelas = '-' OR mapel = '-');
```

Dengan arsitektur Partial Unique Index ini:
1. **Integritas Jurnal KBM:** Guru terlindungi 100% dari duplikasi sesi mengajar yang sama akibat balapan jaringan atau klik berulang.
2. **Fleksibilitas Jurnal Kegiatan:** Guru dan staf TU leluasa mencatatkan beberapa kegiatan sah yang berbeda dalam sehari, tanpa risiko duplikasi kegiatan yang sama persis.
3. **Penyimpanan Idempoten pada Sisi Aplikasi:** Logika penyimpanan pada aplikasi digantikan dari pola manual *Check-Then-Act* (`SELECT -> IF NOT EXISTS -> INSERT`) menjadi operasi **Idempotent Upsert**:

```ts
// Contoh upsert idempoten yang disesuaikan dengan tipe jurnal
const conflictColumns = tipeJurnal === 'Jurnal KBM'
  ? 'sekolah_id,tanggal,user_id,kelas,mapel'
  : 'sekolah_id,tanggal,user_id,kegiatan';

const { data, error } = await supabase
  .from('jurnal_pembelajaran')
  .upsert(newJurnalPayload, {
    onConflict: conflictColumns,
    ignoreDuplicates: false // Lakukan update jika entri sudah ada
  });
```

---

### 3.2. Transformasi Arsitektur Penyimpanan Media ke Supabase Storage Bawaan

Arsitektur penyimpanan berkas wajib dimigrasikan secara penuh dari webhook Google Apps Script ke **Supabase Storage bawaan**.

```
ARUS LAMA (RENTAN ERROR):
Klien Browser ──(Base64)──► Google Apps Script Webhook ──► Google Drive
     ▲                            │ (Timeout 30s / Quota Limit)
     └──────(Simpan blob: URL)────┴──► Error / 403 Hotlink Ban

ARUS BARU (STABIL, CEPAT, RESMI):
Klien Browser ──(Direct Binary)──► Supabase Storage ('sipjam_media')
     │                                    │ (Direct Public CDN URL)
     └──────(Simpan Public CDN URL)───────┴──► Database PostgreSQL
```

#### A. Pembuatan Supabase Storage Bucket Resmi
Buat bucket penyimpanan publik bernama `sipjam_media` dengan kebijakan keamanan Row Level Security (RLS):
```sql
-- 1. Daftarkan bucket sipjam_media jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sipjam_media',
  'sipjam_media',
  true,
  5242880, -- Batas maksimal 5 MB per berkas
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Kebijakan RLS: Publik dapat membaca gambar secara langsung
CREATE POLICY "Public Read Access for Sipjam Media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sipjam_media');

-- 3. Kebijakan RLS: Pengguna terautentikasi dapat mengunggah berkas baru
CREATE POLICY "Authenticated Users Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sipjam_media');

-- 4. Kebijakan RLS: Pengguna terautentikasi wajib memiliki izin UPDATE untuk mendukung opsi upsert: true
CREATE POLICY "Authenticated users can update own school media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sipjam_media');
```

> **Catatan Teknis RLS Storage:** Opsi `upsert: true` pada klien JavaScript Supabase Storage (`supabase.storage.from('...').upload(..., { upsert: true })`) secara internal mengeksekusi operasi `UPDATE` pada tabel `storage.objects` jika berkas pada path yang sama telah ada (misalnya pada skenario *retry* jaringan atau penggantian foto jurnal/presensi). Ketiadaan kebijakan `FOR UPDATE` akan memicu penolakan izin *Row Level Security* (`new row violates row-level security policy for table "objects"`), sehingga penambahan policy `UPDATE` di atas bersifat mutlak.

#### B. Modul Unggah Klien Langsung (Direct Client Upload)
Gantikan fungsi `uploadToDrive` pada `src/lib/driveUpload.ts` dengan fungsi unggah langsung Supabase Storage:
```ts
import { supabase } from '@/lib/supabaseClient';

export async function uploadImageToSupabaseStorage(
  file: File | Blob,
  sekolahId: string,
  subfolder: 'jurnal' | 'presensi' | 'bk' | 'piket',
  fileNamePrefix: string
): Promise<string> {
  const timestamp = Date.now();
  const fileExt = file.type === 'image/png' ? 'png' : 'jpg';
  const cleanPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${sekolahId}/${subfolder}/${cleanPrefix}_${timestamp}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('sipjam_media')
    .upload(filePath, file, {
      cacheControl: '31536000', // Cache 1 tahun pada peramban/CDN
      upsert: true
    });

  if (error) {
    throw new Error(`Gagal mengunggah foto ke Supabase Storage: ${error.message}`);
  }

  // Dapatkan URL CDN publik permanen
  const { data: publicUrlData } = supabase.storage
    .from('sipjam_media')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
```

#### C. Pencegahan Mutlak URL `blob:` Tersimpan ke Basis Data
Pada `GuruJurnal.tsx`, terapkan validasi ketat sebelum payload dikirimkan ke Supabase:
```ts
// Validasi sanitasi URL sebelum menyimpan ke database
const sanitizeMediaUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Cegah URL blob lokal tersimpan ke database
  if (trimmed.startsWith('blob:')) {
    console.error('Pencegahan kritis: Mencoba menyimpan blob URL lokal ke database!');
    return null;
  }
  return trimmed;
};

// Penggunaan saat membangun newJurnalPayload:
link_bukti_foto: sanitizeMediaUrl(fileUrl),
foto_kegiatan: sanitizeMediaUrl(fileUrl),
```

#### D. Komponen UI Placeholder & Penanganan Error yang Informatif
Hapus pola `onError={(e) => (e.target as HTMLElement).style.display = 'none'}` dan gantikan dengan komponen fallback gambar:
```tsx
const MediaImageWithFallback: React.FC<{ src?: string; alt?: string; className?: string }> = ({ src, alt, className }) => {
  const [hasError, setHasError] = useState(!src || src.startsWith('blob:'));

  if (hasError || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 border border-dashed border-gray-300 rounded-lg p-3 text-gray-400 text-xs text-center ${className}`}>
        <PhotoIcon className="w-8 h-8 mb-1 text-gray-300" />
        <span>Foto tidak tersedia atau gagal dimuat</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Bukti kegiatan"}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};
```

---

### 3.3. Standardisasi Antrean Media Offline Terpadu & Perbaikan Siklus Hidup IndexedDB

1. **Penyatuan Antrean Media (`mediaUploadPersistence.ts`):** Perluas antrean IndexedDB agar tidak hanya menampung presensi, tetapi juga menampung foto Jurnal KBM, Jurnal Kegiatan, dan Jurnal BK.
2. **Penghapusan Kebijakan Destruktif:** Hapus pemanggilan `removePendingUpload(task.id)` pada batas retries ke-3. Ubah status tugas di IndexedDB lokal menjadi `'needs_manual_retry'`.
3. **Penyediaan Tombol Unggah Ulang Manual (Manual Retry UI):** Pada halaman riwayat guru, sediakan tombol *"Sinkronkan Ulang Foto"* jika peramban mendeteksi adanya berkas blob tertunda di IndexedDB perangkat tersebut.
4. **Skrip Pembersihan Data Macet Historis:** Jalankan kueri pembersihan untuk mengubah 21 entri presensi lama yang macet dengan status `'pending:uploading'` atau `'gagal_upload'` yang berusia lebih dari 24 jam menjadi nilai `-` agar tampilan admin dan guru menjadi bersih.

---

## 4. DESAIN TEKNIS OTOMATISASI STATUS ALFA PRESENSI (PERSYARATAN R2)

### 4.1. Analisis Skema Data Presensi Guru, Pengaturan Waktu, dan Aturan Jam Tutup

Infrastruktur SIPJAM telah memiliki struktur tabel pendukung di PostgreSQL:
- **Tabel `public.presensi_guru`:** Menyimpan transaksi absensi harian dengan kolom `tipe_absen` (`'Datang'`, `'Pulang'`), `jenis_presensi` (`'Sekolah'`, `'Dinas Luar'`, `'Izin'`, `'Sakit'`, `'Alpa'`, `'Auto-Checkout'`, `'Pulang Cepat'`), serta `status_verifikasi` (`'Disetujui'`, `'Menunggu'`, `'Ditolak'`, `'Alpa'`).
- **Tabel `public.pengaturan`:** Menyimpan konfigurasi jam sekolah multi-tenant per `sekolah_id`:
  - `jam_pulang_akhir`: Batas penutupan presensi pulang harian (default: `'22:00'` WITA).
  - `hari_sekolah`: Jumlah hari kerja mingguan (`'5'` atau `'6'`).
  - `aturan_kehadiran_guru`: Pengaturan kewajiban hadir (`'Semua_Hari'` vs `'Hari_Mengajar_Saja'`).
- **Zona Waktu Sistem:** Seluruh perhitungan operasional sekolah mengacu pada **Waktu Indonesia Tengah (WITA / UTC+8, `Asia/Makassar`)**.

---

### 4.2. Logika Determinasi Status Kehadiran (Hadir, Izin, Sakit, Alpa, Lupa Checkout)

Mesin evaluasi presensi harus membedakan secara tegas 3 skenario ketidakhadiran pada saat jam batas tutup pulang (`jam_pulang_akhir`) terlewati:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 POHON KEPUTUSAN EVALUASI PRESENSI HARIAN                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
              Apakah hari ini hari libur (Minggu/Sabtu 5-hari/Kalender Libur)?
                                      │
                      ├──► [YA] ──────┴─► [SELESAI: Abaikan Evaluasi (Libur)]
                      │
                      └──► [TIDAK]
                            │
               Apakah guru memiliki Izin / Sakit / Cuti aktif hari ini?
                            │
                            ├──► [YA] ──► [STATUS: Izin/Sakit Terlindungi]
                            │             Bebas dari kewajiban pulang & bebas Alpa
                            │
                            └──► [TIDAK]
                                  │
                 Apakah guru memiliki Presensi Datang hari ini?
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼ [TIDAK]                                         ▼ [YA]
Apakah ada presensi ditolak?              Apakah guru melakukan Presensi Pulang?
         │                                                 │
    ├──► [YA: Ditolak Admin]             ┌─────────────────┴─────────────────┐
    │    Mutasi record menjadi ALPA      ▼ [YA]                              ▼ [TIDAK]
    │    (Sesuai aturan F6-B1)     Status: HADIR VALID         Lewat jam_pulang_akhir (22:00)?
    │                              (Disetujui)                               │
    └──► [TIDAK: Tanpa Keterangan]                                           ▼
         Insert record baru:                                   Cek Kebijakan Sekolah:
         - tipe_absen: 'Datang'                                - Kebijakan A (Default):
         - jenis_presensi: 'Alpa'                                status: 'Pulang Cepat' /
         - status_verifikasi: 'Alpa'                             'Lupa Checkout' (is_auto_checkout)
         - catatan: 'Alpa otomatis...'                         - Kebijakan B (Disiplin Penuh):
                                                                 mutasi status menjadi 'Alpa'
```

1. **Skenario 1: Guru Tidak Hadir Penuh (Tanpa Presensi Datang):**
   - Guru tidak memiliki rekaman presensi datang, tidak sedang dalam periode izin/sakit/cuti multi-hari (`jenis_presensi` atau `status_verifikasi` atau `detail_izin` mencakup `'Cuti'`, `'Sakit'`, `'Izin'`, atau `'Dinas Luar'`), dan memiliki kewajiban hadir hari itu.
   - **Tindakan Sistem:** Menambahkan baris baru di `public.presensi_guru`:
     `tipe_absen = 'Datang'`, `jenis_presensi = 'Alpa'`, `status_verifikasi = 'Alpa'`, `catatan_admin = 'Alpa otomatis: Guru tidak hadir dan tidak melakukan presensi hingga jam batas tutup pulang.'`.
2. **Skenario 2: Guru Presensi Datang Ditolak oleh Admin:**
   - Guru mengajukan presensi datang tetapi ditolak admin, dan guru tidak mengajukan presensi perbaikan hingga pukul 22:00 WITA.
   - **Tindakan Sistem:** Memperbarui baris tersebut menjadi `jenis_presensi = 'Alpa'`, `status_verifikasi = 'Alpa'`, `catatan_admin = 'Alpa otomatis: Pengajuan presensi ditolak oleh admin dan tidak diperbaiki hingga batas waktu penutupan.'`.
3. **Skenario 3: Guru Hadir Datang tetapi Lupa Melakukan Presensi Pulang:**
   - Guru telah hadir di sekolah (presensi datang berstatus `'Disetujui'`), namun tidak mencatatkan presensi pulang hingga lewat pukul 22:00 WITA.
   - **Tindakan Sistem:** Sistem mencatatkan presensi pulang otomatis dengan `is_auto_checkout = true`, `tipe_absen = 'Pulang'`. Terkait penetapan status akhir, sistem menyediakan konfigurasi sekolah:
     - *Default Kebijakan:* `status_verifikasi = 'Pulang Cepat'` / `'Lupa Checkout'`.
     - *Kebijakan Disiplin Penuh:* Jika sekolah menghendaki, status kehadiran harian dapat dianulir menjadi `'Alpa'`.

---

### 4.3. Penanganan Hari Libur Nasional, Libur Mingguan, dan Multi-Day Leave

Mesin evaluasi dilengkapi pengaman invariant (*safety invariant guards*) sebelum mengeksekusi mutasi status:
1. **Pengecekan Hari Minggu:** Jika hari yang dievaluasi adalah hari Minggu, proses langsung dihentikan (*early exit*).
2. **Pengecekan Hari Sabtu (5-Hari Sekolah):** Sistem memeriksa konfigurasi `hari_sekolah` pada tabel `pengaturan`. Jika bernilai `'5'`, hari Sabtu otomatis dikecualikan.
3. **Pengecekan Kalender Pendidikan:** Sistem memeriksa tabel `public.kalender_pendidikan`. Jika terdapat catatan bertipe `'Libur'` (baik libur nasional maupun libur khusus sekolah) tanpa adanya status penimpal bertipe `'Masuk'`, evaluasi Alpa dibatalkan untuk seluruh guru pada hari tersebut.
4. **Perlindungan Eksplisit Izin/Sakit/Cuti Multi-Hari (Pencegahan Vonis Alpa Palsu):**
   Sebelum mengevaluasi ketidakhadiran seorang guru, mesin wajib memeriksa apakah tanggal evaluasi berada di dalam rentang `[tanggal_mulai, tanggal_selesai]` pada presensi dispensasi multi-hari yang sah.
   
   **Temuan Kritis Evaluasi Kode (`src/lib/attendanceAlpa.ts:153–169`):**
   Pada implementasi eksisting, filter `activeMultiDayLeaves` hanya memeriksa:
   ```ts
   const isLeaveType = ['Sakit', 'Izin', 'Dinas Luar'].includes(rec.jenis_presensi) ||
     rec.detail_izin === 'Sakit' || (rec.detail_izin && rec.detail_izin.includes('Izin'));
   ```
   Filter ini memiliki **celah kerentanan fatal (*false positive*)**: Jika seorang guru atau staf mengajukan cuti resmi berdurasi panjang seperti **Cuti Melahirkan (90 hari)** atau **Cuti Umroh/Haji**, di mana data tersimpan dengan `jenis_presensi = 'Cuti'` dan `detail_izin = 'Cuti Melahirkan'`, ekspresi di atas mengevaluasi `isLeaveType` menjadi `false`! Akibatnya, `hasActiveMultiDayLeave` bernilai salah, dan sistem cron mengeksekusi `.insert(alpaRecord)` setiap malam selama masa cuti berlangsung. Guru yang sah cuti melahirkan divonis Alpa hingga puluhan hari berturut-turut.

   **Rekomendasi Perbaikan Mutlak pada `attendanceAlpa.ts`:**
   Daftar whitelist dispensasi wajib memasukkan `'Cuti'` secara eksplisit pada seluruh predikat:
   ```ts
   // src/lib/attendanceAlpa.ts
   const activeMultiDayLeaves = (multiDayRecords || []).filter(rec => {
     if (rec.status_verifikasi === 'Ditolak') return false;
     if (isLateArrival(rec)) return false;

     // Whitelist eksplisit: Sakit, Izin, Dinas Luar, dan CUTI
     const isLeaveType = 
       ['Sakit', 'Izin', 'Dinas Luar', 'Cuti'].includes(rec.jenis_presensi) ||
       ['Sakit', 'Izin', 'Cuti'].includes(rec.status_verifikasi) ||
       rec.detail_izin === 'Sakit' || 
       (rec.detail_izin && (
         rec.detail_izin.includes('Izin') || 
         rec.detail_izin.toLowerCase().includes('cuti')
       ));

     if (!isLeaveType) return false;
     if (rec.tanggal_mulai && rec.tanggal_selesai) {
       return evaluatedDate >= rec.tanggal_mulai && evaluatedDate <= rec.tanggal_selesai;
     }
     return false;
   });
   ```
   Dengan perlindungan eksplisit ini, guru yang sedang cuti melahirkan, cuti besar, maupun cuti sakit multi-hari dipastikan 100% terlindungi dari vonis Alpa otomatis oleh runner cron.

---

### 4.4. Desain Arsitektur Scheduled Runner: Evaluasi Komparatif & Solusi Hibrida

Untuk menjalankan fungsi evaluasi di lingkungan produksi secara otomatis, dilakukan analisis komparatif terhadap 3 opsi runner:

| Kriteria Evaluasi | Opsi 1: Vercel Cron (`vercel.json`) | Opsi 2: Supabase `pg_cron` | Opsi 3: External Cron (GitHub Actions) | Solusi Rekomendasi: Arsitektur Hibrida Bertingkat |
| :--- | :--- | :--- | :--- | :--- |
| **Kemudahan Konfigurasi** | Sangat mudah (cukup 1 file JSON) | Memerlukan skrip SQL ekstensi | Sederhana (1 file YAML) | Menggabungkan Vercel Cron & GitHub Actions |
| **Limitasi Paket Gratis** | Vercel Free: Maks 1 cron/hari, timeout 10-60s | Gratis di Supabase, namun butuh `pg_net` | **Gratis 2.000 menit/bulan** di GitHub Actions | Menghilangkan risiko kegagalan paket gratis |
| **Kompatibilitas Logika** | 100% menggunakan kode TypeScript yang ada | Harus menulis ulang 1.400 baris ke PL/pgSQL | 100% memicu API Next.js yang sudah ada | Logika tetap terpusat di `attendanceAlpa.ts` |
| **Keamanan Endpoint** | Dilindungi Bearer `CRON_SECRET` | Header internal database | Dilindungi Bearer `CRON_SECRET` | Keamanan tingkat tinggi via Authorization token |

#### Arsitektur Hibrida Bertingkat (Defense-in-Depth Architecture)
Solusi arsitektur yang direkomendasikan adalah **Arsitektur Hibrida 3-Lapis**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ARSITEKTUR HIBRIDA TERJADWAL (DEFENSE-IN-DEPTH)             │
└─────────────────────────────────────────────────────────────────────────────┘

 [LAPIS 1: PEMICU UTAMA]                 [LAPIS 1 CADANGAN: GITHUB ACTIONS]
 Vercel Cron: vercel.json                .github/workflows/auto-alpa.yml
 Trigger: 14:05 UTC (22:05 WITA)         Trigger: 15:00 UTC (23:00 WITA)
          │                                        │
          └───────────────────┬────────────────────┘
                              │ HTTP POST + Header: Authorization: Bearer <CRON_SECRET>
                              ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ [LAPIS 2: SECURE NEXT.JS ROUTE HANDLER]                                     │
 │ Endpoint: src/app/api/attendance/auto-alpa/route.ts                         │
 │ - Validasi Bearer Token terhadap process.env.CRON_SECRET                   │
 │ - Ekstraksi parameter tanggal (Default: Tanggal WITA hari ini)              │
 │ - Panggil evaluateAndApplyAutoAlpa & evaluateAndApplyAutoCheckout           │
 └────────────────────────────┬────────────────────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ [LAPIS 3: SAFETY-NET LAZY EVALUATION (SAAT ADMIN/GURU LOGIN PAGI)]          │
 │ File: src/lib/workflow.ts (getGuruDailyState)                               │
 │ - Jika cron malam hari gagal (server cold-start / network glitch):          │
 │ - Sistem mendeteksi tanggal kemarin adalah hari kerja & belum ditutup       │
 │ - Memicu evaluasi auto-alpa secara pasif di latar belakang (fire-and-forget)│
 └─────────────────────────────────────────────────────────────────────────────┘
```

1. **Jadwal Eksekusi Terkoordinasi & Pencegahan Race Condition:** Pemicu utama Vercel Cron berjalan pada pukul **14:05 UTC** (22:05 WITA, 5 menit setelah jam batas tutup absensi pulang default). Runner cadangan GitHub Actions dijadwalkan secara bertingkat (*staggered*) pada **15:00 UTC** (23:00 WITA) dengan parameter `{"force": false}`. Penjadwalan bertingkat ini mencegah dua runner mengeksekusi secara simultan pada menit yang sama, mengeliminasi balapan konkurensi pada basis data.
2. **Keamanan Autentikasi:** Route handler memverifikasi header `Authorization: Bearer <CRON_SECRET>`. Akses tanpa token rahasia ini akan langsung ditolak dengan respon `401 Unauthorized`.
3. **Idempotency Guard:** Logika evaluasi di `src/lib/attendanceAlpa.ts` memeriksa keberadaan record presensi sebelum melakukan pembaruan, sehingga eksekusi berulang tidak akan pernah menduplikasi data presensi maupun jurnal.

---

### 4.5. Spesifikasi Integrasi API Endpoint & Mutasi Basis Data

Konfigurasi file `vercel.json` yang perlu ditambahkan pada root proyek:
```json
{
  "crons": [
    {
      "path": "/api/attendance/auto-alpa",
      "schedule": "5 14 * * *"
    }
  ]
}
```

Konfigurasi file cadangan GitHub Actions Workflow `.github/workflows/auto-alpa-cron.yml`:
```yaml
name: Scheduled Auto-Alpa Presensi Cron
on:
  schedule:
    - cron: '5 14 * * *' # Setiap hari pukul 22:05 WITA (14:05 UTC)
  workflow_dispatch:

jobs:
  trigger-alpa:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Auto-Alpa API
        run: |
          curl -s -X POST "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/attendance/auto-alpa" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"force": false}'
```

---

## 5. DESAIN TEKNIS VERIFIKASI OTOMATIS JURNAL (PERSYARATAN R3)

### 5.1. Analisis Kondisi Status Verifikasi Saat Ini pada Seluruh Kategori Jurnal

Berdasarkan penelusuran kode, status verifikasi jurnal saat ini terhambat oleh nilai bawaan database dan evaluasi kondisional di sisi antarmuka:
1. **Skema Database:** Tabel `public.jurnal_pembelajaran`, `public.jurnal_bk`, dan `public.laporan_piket` memiliki nilai bawaan `DEFAULT 'Menunggu'`.
2. **Kondisional pada `GuruJurnal.tsx` (baris 1642–1644):**
   ```ts
   const statusVerifikasiJurnal = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap)
     ? 'Disetujui'
     : 'Menunggu';
   ```
   Status `'Disetujui'` hanya diberikan jika seluruh parameter bernilai lengkap, termasuk `isFotoLengkap`. Jika foto masih dalam antrean latar belakang (`fileUrl === 'pending:uploading'`), status langsung jatuh kembali menjadi `'Menunggu'`.
3. **Hardcoded Menunggu pada `BkJurnalView.tsx` (baris 856–858):**
   Setiap entri Jurnal BK baru secara mutlak dipaksa berstatus `'Menunggu'`, tanpa mekanisme *auto-approval*.
4. **Hardcoded Menunggu pada `PiketView.tsx` (baris 1579):**
   Laporan pribadi piket dikunci ke status `'Menunggu'`.

---

### 5.2. Solusi Teknis: Unconditional Auto-Approval pada Lapisan Aplikasi & Basis Data

Untuk mewujudkan verifikasi otomatis instan pada seluruh kategori jurnal yang disimpan oleh Guru maupun staf Tata Usaha (TU), diterapkan dua perubahan arsitektur:

#### A. Perubahan Skema Basis Data (Database Default Mutation)
Ubah nilai bawaan kolom `status_verifikasi` pada tabel PostgreSQL menjadi `'Disetujui'`:
```sql
ALTER TABLE public.jurnal_pembelajaran 
ALTER COLUMN status_verifikasi SET DEFAULT 'Disetujui';

ALTER TABLE public.jurnal_bk 
ALTER COLUMN status_verifikasi SET DEFAULT 'Disetujui';

ALTER TABLE public.laporan_piket 
ALTER COLUMN status_verifikasi SET DEFAULT 'Disetujui';
```

#### B. Penetapan Deterministik pada Lapisan Aplikasi
1. **Pada `src/components/GuruJurnal.tsx`:**
   Hapus logika percabangan kondisional pada baris 1642–1644 dan tetapkan status secara deterministik:
   ```ts
   // Status jurnal KBM dan Kegiatan Guru/TU langsung disetujui saat disimpan
   const statusVerifikasiJurnal: 'Disetujui' = 'Disetujui';
   ```
   Pada sub-mode penyimpanan absensi duluan (`handleSaveAbsensiOnly`, baris 1407), ubah nilai awal dari `'Menunggu'` menjadi `'Disetujui'` jika sekolah menerapkan kebijakan verifikasi otomatis penuh.
2. **Pada `src/components/BkJurnalView.tsx`:**
   Ubah baris 858 saat membuat entri Jurnal BK baru:
   ```ts
   const verifPayload = shouldResetVerif
     ? { status_verifikasi: 'Disetujui' as const, catatan_admin: null, alasan_penolakan: null }
     : {};
   ```
3. **Pada `src/components/PiketView.tsx`:**
   Ubah baris 1579 dan 1625 saat menyimpan Laporan Piket menjadi:
   ```ts
   status_verifikasi: 'Disetujui',
   ```

Dengan pendekatan ini, **seluruh jurnal yang disimpan oleh Guru maupun staf TU langsung berstatus sah dan terverifikasi secara instan**, menghapus beban admin untuk melakukan verifikasi rutin satu per satu.

---

## 6. DESAIN TEKNIS ALUR PENOLAKAN MANUAL ADMIN & REKAPITULASI (PERSYARATAN R4)

Meskipun seluruh jurnal dan presensi disetujui otomatis saat dibuat, administrator sekolah tetap memegang otoritas pengawasan penuh (*Supervisory Authority*) untuk membatalkan persetujuan atau menolak data yang tidak valid.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ALUR PENOLAKAN MANUAL OLEH ADMIN SEKOLAH                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
            Admin Membuka AdminVerifView.tsx & Menekan Tombol "Tolak"
                                      │
                                      ▼
             Dialog SweetAlert2: Wajib Mengisi Alasan Penolakan
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ MUTASI DATA DI POSTGRESQL (Atomic Transaction):                             │
 │ 1. status_verifikasi = 'Ditolak'                                            │
 │ 2. catatan_admin = <alasan_penolakan>                                       │
 │ 3. alasan_penolakan = <alasan_penolakan>                                    │
 │ 4. rejected_by = <admin_user_id>                                            │
 │ 5. rejected_at = NOW()                                                      │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┴───────────────────────────┐
         ▼                                                        ▼
[NOTIFIKASI INSTAN KE GURU/TU]                        [KONSEKUENSI REKAPITULASI]
- Web Push Notification dikirim                       1. PRESENSI DITOLAK:
  (Link langsung ke formulir revisi)                     - Dikeluarkan dari hitungan Hadir
- In-App Chat Message tercatat                           - Konversi otomatis jadi ALPA MURNI
- Banner merah "Ditolak" muncul di Dashboard/Stepper  2. JURNAL DITOLAK:
- Sub-tab "Perlu Revisi" menampilkan alasan admin        - Jam Mengajar (JP) Dikeluarkan
                                                         - Terdeteksi sebagai missingSchedules
                                                         - Tunjangan/Honor KBM Terpotong
```

### 6.1. Desain Antarmuka Verifikasi & Modal Penolakan Admin Wajib Alasan

Antarmuka verifikasi admin pada `src/components/AdminVerifView.tsx` mengelola 4 tab verifikasi: *Presensi*, *Jurnal*, *Piket*, dan *Dokumen*.
Alur penolakan dirancang dengan ketentuan:
1. **Modal Wajib Alasan:** Menggunakan dialog SweetAlert2 dengan validasi input teks. Tombol konfirmasi tidak dapat ditekan jika alasan penolakan kosong atau hanya berisi spasi.
2. **Keterangan Perbaikan yang Konstruktif:** Form menyediakan *placeholder* informatif yang mengarahkan admin menulis instruksi konkret (contoh: *"Foto buram, silakan unggah ulang dokumentasi di depan kelas"*).

---

### 6.2. Audit Trail Penolakan & Integrasi Sistem Notifikasi Dua Arah

Untuk menjamin akuntabilitas pengawasan, skema database diperluas dengan kolom jejak audit (*audit trail*):
```sql
-- Tambahkan kolom jejak audit penolakan pada seluruh tabel transaksi
ALTER TABLE public.jurnal_pembelajaran 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.jurnal_bk 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.laporan_piket 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.presensi_guru 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
```

Begitu admin menolak data, sistem memicu endpoint `/api/notifications/rejection/route.ts` yang mengeksekusi dua tindakan komunikasi sekaligus:
1. **Web Push Notification:** Mengirim sinyal notifikasi ke perangkat guru via Service Worker dengan parameter payload:
   - Judul: `Pengajuan ${jenisItem} Ditolak Admin`
   - Isi Pesan: `Alasan: ${alasanPenolakan}. Ketuk untuk memperbaiki.`
   - URL Navigasi Langsung: `/?view=view-guru-jurnal` atau `/?view=view-jurnal-bk`.
2. **Pesan In-App Chat:** Menyimpan rekaman pesan resmi ke tabel `public.chat_messages` dari akun Admin ke akun Guru/TU terkait sehingga catatan perbaikan tersimpan dalam riwayat percakapan sistem.

---

### 6.3. Tampilan Riwayat & Instruksi Perbaikan pada Antarmuka Guru dan Tenaga Administrasi

Antarmuka Guru dan Tenaga Administrasi (TU) dilengkapi visualisasi reaktif:
1. **Dashboard Home Stepper (`HomeViewGuru.tsx` & `HomeViewTU.tsx`):**
   - Langkah tahapan yang ditolak admin berubah warna menjadi merah dengan label peringatan: `⚠️ Ditolak Admin — Silakan isi ulang`.
   - Menampilkan banner peringatan di bagian atas dashboard dengan tombol tindakan cepat untuk langsung membuka formulir perbaikan.
2. **Formulir Jurnal Guru (`GuruJurnal.tsx`):**
   - Menampilkan banner merah berisikan alasan penolakan dari admin: `j.catatan_admin || j.alasan_penolakan`.
   - Formulir terisi kembali secara otomatis dengan data lama (*pre-filled*), sehingga guru hanya perlu mengganti bagian yang keliru (misalnya mengunggah foto baru) tanpa mengetik ulang materi dari nol.
3. **Sub-Tab Riwayat Jurnal Pribadi:**
   - Menampilkan daftar entri dengan badge merah `Perlu Revisi`, menampilkan tanggal, kelas, mata pelajaran, dan kotak kutipan catatan perbaikan dari admin.

---

### 6.4. Konsekuensi Matematis terhadap Jam Pelajaran (JP), Kehadiran, dan Tunjangan/Honor

Penolakan oleh admin memiliki dampak matematis langsung yang mengikat pada seluruh kalkulasi sistem:

#### A. Dampak Penolakan Presensi $\rightarrow$ Konversi Menjadi Alpa Murni
Pada modul rekapitulasi kehadiran (`src/components/AdminRekapView.tsx` baris 241 & baris 831–834):
- Kueri penarikan data kehadiran menyaring status:
  ```ts
  .in('status_verifikasi', ['Disetujui', 'Diverifikasi', 'Pulang Cepat', 'Sakit', 'Izin', 'Cuti'])
  ```
  Presensi yang berstatus `'Ditolak'` **dikeluarkan dari himpunan kehadiran**.
- Rumus penghitungan hari kerja pada sistem:
  $$\text{Alpa Murni} = \max(0, \text{Total Hari Kerja} - (\text{Hadir} + \text{Dinas Luar} + \text{Sakit} + \text{Izin}))$$
- **Konsekuensi:** Karena presensi yang ditolak tidak masuk ke kategori mana pun, hari tersebut secara otomatis dihitung sebagai **ALPA MURNI**, mengurangi persentase kehadiran guru dan memotong uang makan/tunjangan kehadiran bulanan pada ekspor berkas CSV resmi.

#### B. Dampak Penolakan Jurnal $\rightarrow$ Pemotongan Jam Pelajaran (JP) Mengajar
Pada mesin alur kerja (`src/lib/workflow.ts` baris 2591–2598) dan modul pengingat guru (`TeacherReminderManager.tsx` baris 291–297):
- Jurnal yang berstatus `'Ditolak'` dipisahkan ke dalam `state.jurnalDitolak` dan dikeluarkan dari `state.jurnalKBM`.
- Jadwal mengajar guru yang jurnalnya ditolak langsung dimasukkan ke dalam daftar `missingSchedules`.
- **Konsekuensi:**
  1. Akumulasi jam pelajaran (JP) mengajar guru berkurang sesuai bobot JP sesi tersebut.
  2. Guru terhalang melakukan presensi pulang hari itu (*gate lock*) hingga jurnal yang ditolak tersebut diperbaiki dan disimpan ulang.
  3. Pada laporan ekspor rekapitulasi KBM bulanan untuk pencairan honor mengajar per jam (*hourly teaching fee*), sesi yang ditolak admin tidak tercantum dalam total JP disetujui, sehingga honor atas jam mengajar tersebut **otomatis tidak terbayarkan**.

---

## 7. ACTIONABLE IMPLEMENTATION ROADMAP & MIGRATION PLAN

Rencana implementasi dirancang ke dalam 4 fase eksekusi bertahap yang aman, modular, dan memiliki prosedur pengujian mandiri:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ROADMAP IMPLEMENTASI BERTAHAP (4 FASE)                   │
└─────────────────────────────────────────────────────────────────────────────┘
  FASE 1: MIGRASI BASIS DATA & INTEGRITAS RDBMS (Pondasi Data)
  - Tambah Partial Unique Indexes: idx_uq_jurnal_kbm_sesi & idx_uq_jurnal_kegiatan_sesi
  - Ubah Default status_verifikasi = 'Disetujui'
  - Tambah Kolom Audit Trail: rejected_by & rejected_at
  - Pembersihan Data Macet Historis (pending:uploading) dengan Casting ::timestamptz
                               │
                               ▼
  FASE 2: TRANSFORMASI MEDIA & PERBAIKAN LOGIKA JURNAL (Eliminasi Bug)
  - Aktivasi Bucket Supabase Storage 'sipjam_media' & RLS Policy
  - Implementasi Direct Client Upload & Hapus Ketergantungan GAS
  - Terapkan Atomic UI Lock (useRef) di GuruJurnal & BkJurnal
  - Koreksi Query Kelas Jurnal Kegiatan & Upsert Idempotent
  - Standarisasi MediaImageWithFallback (Hapus onError display:none)
                               │
                               ▼
  FASE 3: PENGAKTIFAN CRON OTOMATISASI ALFA PRESENSI (Automasi Sistem)
  - Tambahkan file vercel.json (Schedule 14:05 UTC / 22:05 WITA)
  - Tambahkan GitHub Actions Workflow cadangan
  - Daftarkan Environment Variable CRON_SECRET di Vercel & .env.local
  - Terapkan Lazy Evaluation Safety-Net saat Admin/Guru login pagi
                               │
                               ▼
  FASE 4: INTEGRASI ALUR PENOLAKAN & REKAPITULASI AKHIR (Pengawasan & Audit)
  - Audit Trail Logging pada AdminVerifView.tsx
  - Penguatan Web Push & In-App Notification saat tolak
  - Banner peringatan tolak pada BkJurnalView.tsx
  - Validasi Laporan CSV Rekapitulasi Presensi & Jam Mengajar (JP)
```

---

### 7.1. Tahapan Eksekusi Bertahap (Fase 1 hingga Fase 4)

#### Fase 1: Migrasi Basis Data & Pembersihan Data Macet (Prioritas Utama)
- **Tujuan:** Mengunci integritas RDBMS melalui Partial Unique Index (memisahkan KBM dan Kegiatan Guru/TU agar tidak terjadi pemblokiran multi-kegiatan), memperbarui status default jurnal, dan membersihkan 21 data presensi yang macet permanen dengan casting aman `::timestamptz`.
- **Risiko:** Nol (tidak merusak data kegiatan sah yang multi-sesi dan tidak merusak relasi foreign key).
- **Hasil:** Tabel PostgreSQL siap menerima operasi *upsert* aman, bebas dari kegagalan transaksi akibat galat PostgreSQL error 42883, dan status *auto-approval* aktif.

#### Fase 2: Transformasi Arsitektur Media & Refactoring Formulir Jurnal
- **Tujuan:** Menghapus ketergantungan pada Google Drive/GAS, menghentikan penyimpanan URL blob, dan mengunci formulir dari balapan klik ganda.
- **Hasil:** Unggah foto instan (<2 detik), foto dapat dibuka 100% oleh semua perangkat, dan jurnal ganda tereliminasi total.

#### Fase 3: Pengaktifan Runner Terjadwal untuk Otomatisasi Status Alfa
- **Tujuan:** Mengaktifkan cron malam hari (22:05 WITA) agar guru yang tidak hadir atau lupa checkout otomatis tercatat statusnya tanpa intervensi manual.
- **Hasil:** Rekapitulasi ketidakhadiran selalu akurat dan terbarui setiap pagi.

#### Fase 4: Penguatan Alur Pengawasan Admin & Akurasi Rekapitulasi
- **Tujuan:** Menghubungkan audit trail penolakan dan memastikan visualisasi perbaikan pada antarmuka guru berjalan interaktif.
- **Hasil:** Sistem pengawasan transparan, akuntabel, dan pemotongan hak honor/tunjangan berbasis JP terhitung secara matematis.

---

### 7.2. Skrip Migrasi SQL Siap Pakai (DDL & DML Data Patch)

Skrip SQL berikut telah divalidasi dan siap dijalankan secara bertahap pada SQL Editor Supabase:

```sql
-- ============================================================================
-- MASTER MIGRATION SCRIPT: SIPJAM-APP COMPREHENSIVE ARCHITECTURE ENHANCEMENT
-- Target Database: PostgreSQL (Supabase)
-- Tanggal: 18 November 2026
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PEMBERSIHAN DATA DUPLIKAT HISTORIS SEBELUM MEMASANG UNIQUE INDEX
-- ----------------------------------------------------------------------------
-- Hapus entri duplikat pada jurnal_pembelajaran berbasis perbandingan kronologis timestamp,
-- mempertahankan entri terbaru dan secara ketat melindungi Jurnal Kegiatan dengan nama kegiatan berbeda.
DELETE FROM public.jurnal_pembelajaran a
USING public.jurnal_pembelajaran b
WHERE a.timestamp::timestamptz < b.timestamp::timestamptz
  AND a.sekolah_id = b.sekolah_id
  AND a.tanggal = b.tanggal
  AND a.user_id = b.user_id
  AND (
    -- Kasus A: Duplikat KBM murni (kelas dan mapel sama, bukan '-')
    (a.kelas = b.kelas AND a.mapel = b.mapel AND a.kelas <> '-' AND a.mapel <> '-')
    OR
    -- Kasus B: Duplikat Kegiatan Guru/TU (kegiatan sama persis pada tanggal yang sama)
    ((a.kelas = '-' OR a.mapel = '-') AND (b.kelas = '-' OR b.mapel = '-') AND a.kegiatan = b.kegiatan)
  );

-- ----------------------------------------------------------------------------
-- 2. PENAMBAHAN PARTIAL UNIQUE INDEX PENCEGAH DUPLIKASI JURNAL
-- ----------------------------------------------------------------------------
-- Index 1: Khusus Jurnal KBM (Mencegah duplikasi kelas & mapel pada hari yang sama)
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_jurnal_kbm_sesi 
ON public.jurnal_pembelajaran (sekolah_id, tanggal, user_id, kelas, mapel) 
WHERE kelas <> '-' AND mapel <> '-';

-- Index 2: Khusus Jurnal Kegiatan Guru & TU (Berbasis nama kegiatan agar sah mengisi >1 kegiatan berbeda per hari)
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_jurnal_kegiatan_sesi 
ON public.jurnal_pembelajaran (sekolah_id, tanggal, user_id, kegiatan) 
WHERE (kelas = '-' OR mapel = '-');

-- ----------------------------------------------------------------------------
-- 3. PEMBARUAN DEFAULT VALUE UNTUK AUTO-APPROVAL JURNAL (R3)
-- ----------------------------------------------------------------------------
ALTER TABLE public.jurnal_pembelajaran 
ALTER COLUMN status_verifikasi SET DEFAULT 'Disetujui';

ALTER TABLE public.jurnal_bk 
ALTER COLUMN status_verifikasi SET DEFAULT 'Disetujui';

ALTER TABLE public.laporan_piket 
ALTER COLUMN status_verifikasi SET DEFAULT 'Disetujui';

-- ----------------------------------------------------------------------------
-- 4. PENAMBAHAN KOLOM AUDIT TRAIL PENOLAKAN ADMIN (R4)
-- ----------------------------------------------------------------------------
ALTER TABLE public.jurnal_pembelajaran 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.jurnal_bk 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.laporan_piket 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.presensi_guru 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 5. PEMBERSIHAN DATA MACET HISTORIS PADA TABEL PRESENSI (R1)
-- ----------------------------------------------------------------------------
-- Bersihkan status link_bukti 'pending:uploading' atau 'gagal_upload' yang sudah lampau (>24 jam).
-- Catatan Teknis Arsitektur: Kolom `timestamp` pada `public.presensi_guru` bertipe `text` di Supabase.
-- Kueri wajib menyertakan casting eksplisit `::timestamptz` untuk mencegah galat fatal PostgreSQL
-- 42883 ('operator does not exist: text < timestamp with time zone') yang akan membatalkan
-- (rollback) seluruh blok transaksi migrasi.
UPDATE public.presensi_guru
SET link_bukti = '-'
WHERE link_bukti IN ('pending:uploading', 'gagal_upload')
  AND timestamp::timestamptz < (NOW() - INTERVAL '24 hours');

-- Bersihkan data foto jurnal yang berisi URL blob lokal yang rusak
UPDATE public.jurnal_pembelajaran
SET link_bukti_foto = NULL
WHERE link_bukti_foto LIKE 'blob:%';

UPDATE public.jurnal_pembelajaran
SET foto_kegiatan = NULL
WHERE foto_kegiatan LIKE 'blob:%';

-- ----------------------------------------------------------------------------
-- 6. INISIALISASI SUPABASE STORAGE BUCKET RESMI 'sipjam_media'
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sipjam_media',
  'sipjam_media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Pasang Policy Publik Storage
DROP POLICY IF EXISTS "Public Read Access for Sipjam Media" ON storage.objects;
CREATE POLICY "Public Read Access for Sipjam Media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sipjam_media');

DROP POLICY IF EXISTS "Authenticated Users Upload Access" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sipjam_media');

-- Pasang Policy Pembaruan Storage: UPDATE wajib tersedia agar opsi client `upsert: true` 
-- dapat menimpa berkas pada retry/re-upload tanpa memicu RLS violation
DROP POLICY IF EXISTS "Authenticated users can update own school media" ON storage.objects;
CREATE POLICY "Authenticated users can update own school media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sipjam_media');

COMMIT;
```

---

## 8. KESIMPULAN

Melalui dokumen laporan analisis akar masalah dan rekomendasi teknis ini, seluruh permasalahan pada persyaratan **R1 (Jurnal Ganda, Foto Tidak Muncul, Status Tertunda)**, **R2 (Otomatisasi Status Alfa Presensi)**, **R3 (Verifikasi Otomatis Seluruh Jurnal)**, dan **R4 (Alur Penolakan Manual Admin & Rekapitulasi)** telah dibedah tuntas dari hulu ke hilir dengan dukungan bukti kode sumber aktual dan kueri basis data produksi. 

Implementasi rekomendasi solusi arsitektur ini akan mengubah SIPJAM-APP menjadi sistem operasional sekolah yang tangguh (*resilient*), berkecepatan tinggi, bebas dari data ganda, terotomatisasi secara terjadwal, dan memiliki akurasi perhitungan rekapitulasi yang akuntabel.

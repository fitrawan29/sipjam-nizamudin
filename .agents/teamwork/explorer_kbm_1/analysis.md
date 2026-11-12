# Laporan Investigasi Mendalam: Akar Masalah Kegagalan Penyimpanan Jurnal KBM Guru (R1)

**Investigator**: `explorer_kbm_1` (KBM Save Failure Investigator)  
**Parent Orchestrator ID**: `f8423969-31b1-4c71-9bae-1480d343ca6a`  
**Target Modul**: `src/components/GuruJurnal.tsx`, `src/lib/workflow.ts`, `src/components/RekapJurnalView.tsx`  
**Database Table**: `public.jurnal_pembelajaran`, `public.absensi`  
**Status**: Read-Only Forensic Analysis Complete  
**Tanggal**: 2026-11-12  

---

## 1. Executive Summary

Investigasi mendalam terhadap alur penyimpanan Jurnal KBM Guru pada `sipjam-app` mengidentifikasi **tujuh (7) titik rentan utama** yang menyebabkan guru gagal menyimpan jurnal atau menyebabkan data jurnal KBM tampak "hilang / tidak tersimpan":

1. **Sub-Mode Splitting & Placeholder Trap**: Form Jurnal KBM memecah alur menjadi dua sub-mode: `'absensi'` dan `'jurnal'`. Saat guru menekan tombol simpan di sub-mode `'absensi'`, handler `handleSaveAbsensiOnly()` menyimpan record placeholder dengan `materi: '-'`, `kegiatan: '-'`. Guru mengira jurnal telah tersimpan, padahal materi KBM belum diinput.
2. **Crash Runtime `crypto.randomUUID()` di Lingkungan Non-HTTPS / IP Lokal**: Pemanggilan `crypto.randomUUID()` tanpa proteksi konteks aman (`isSecureContext`) menyebabkan runtime error fatal (`TypeError: crypto.randomUUID is not a function`) saat diakses lewat IP lokal atau jaringan sekolah non-SSL.
3. **Hard Failure Dependency pada Upload Google Drive**: Jika webhook Google Apps Script timeout (60 detik), kuota penuh, atau terjadi kendala jaringan saat upload foto, exception langsung melempar error dan membatalkan seluruh penyimpanan ke database. Seluruh teks jurnal guru yang sudah diketik hilang.
4. **Mismatch Skema Kolom PostgREST & Kelemahan Filter Retry**: Payload mutasi menyertakan kolom yang tidak ada pada skema PostgreSQL di beberapa tenant (seperti `catatan_khusus_siswa`). Meskipun ada retry pada error `PGRST204`, error dengan kode PostgreSQL `42703` (undefined column) atau pesan error yang tidak memuat kata kunci tertentu gagal ditangkap retry, sehingga mutasi dibatalkan.
5. **Kegagalan Resolusi Sesi Eksisting (Dual Record / Split Session)**: Pencarian sesi eksisting (`existingSessionQuery`) menggunakan PostgREST `.or()` dengan format nama guru yang kaku. Jika pencocokan gagal, sistem mengeksekusi `insert` baru alih-alih `update`, menghasilkan dua baris terpisah (satu baris absensi dengan materi kosong, satu baris materi dengan absensi kosong).
6. **Inkonsistensi Nilai Fallback Multi-Tenant `sekolah_id`**: Objek `newJurnal` mengabaikan fallback nilai default tenant jika `user.sekolah_id` bernilai null/undefined, berbeda dengan sinkronisasi bolos yang memiliki fallback `'a0000000-0000-0000-0000-000000000001'`. Pada database dengan constraint `NOT NULL` atau RLS tenant, operasi `insert` ditolak.
7. **Form UI Lockout Trap (`isLocked`)**: Kondisi `isLocked` memblokir interaksi form dan menonaktifkan tombol submit apabila data penugasan (`mapelList`) belum selesai dimuat, atau presensi datang guru belum terverifikasi oleh `getGuruDailyState()`.

---

## 2. Peta Arsitektur & Alur Data (Data Flow Architecture)

### 2.1 Alur Transaksi Penyimpanan Jurnal KBM

```
[Guru Buka Form Jurnal KBM]
           │
           ▼
[Cek Gatekeeper: isLocked, checkState, getGuruDailyState]
           │
           ├── JIKA TERKUNCI ──► Form Disabled (opacity-50 pointer-events-none)
           │
           ▼ TERBUKA
[Sub-Mode: absensi (default)] ◄──► [Sub-Mode: jurnal]
           │                                 │
   Tekan Simpan / Enter              Tekan Simpan Jurnal
           │                                 │
           ▼                                 ▼
   handleSaveAbsensiOnly()            handleJurnalSubmit()
           │                                 │
           │                          Validasi Input Form
           │                                 │
           │                          Compress & Upload Foto
           │                          (uploadToDrive: TITIK GAGAL #3)
           │                                 │
           │                          Generate UUID
           │                          (crypto.randomUUID: TITIK GAGAL #2)
           │                                 │
           ▼                                 ▼
Lookup existingSessionRow ◄───────── Lookup existingSessionRow
(Cari baris sesi KBM hari ini)       (Match: tanggal + kelas + mapel + nama_guru)
           │                                 │
     JIKA DITEMUKAN:                   JIKA DITEMUKAN:
     Update absensi_siswa              Update materi, kegiatan, KKTP, TP,
     & kehadiran_murid                 pertahankan absensi_siswa sebelumnya
           │                                 │
     JIKA TIDAK DITEMUKAN:             JIKA TIDAK DITEMUKAN:
     Insert newSession                 Insert newJurnal
     (materi: '-', kegiatan: '-')      (TITIK GAGAL #5: Sesi Terbelah / Duplikat)
           │                                 │
           ▼                                 ▼
  Supabase Mutation                 Supabase Mutation
  (Tabel: jurnal_pembelajaran)       (Tabel: jurnal_pembelajaran)
  (TITIK GAGAL #4: Kolom Hilang)     (TITIK GAGAL #4 & #6)
           │                                 │
           ▼                                 ▼
  Auto-sync Siswa Bolos             Auto-sync Siswa Bolos
  (Tabel: absensi)                  (Tabel: absensi)
           │                                 │
           ▼                                 ▼
  Toast Berhasil                    Toast Berhasil & Reset Draft
```

---

## 3. Investigasi Forensik Baris Kode (Code Forensics)

### 3.1 Kerentanan 1: Sub-Mode Splitting & Placeholder Trap
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 100**:
  ```tsx
  const [kbmSubMode, setKbmSubMode] = useState<'absensi' | 'jurnal'>('absensi');
  ```
- **Baris 1412–1415**:
  ```tsx
  // Guard: Jika pengguna menekan submit/Enter saat berada di sub-mode absensi, alihkan ke penyimpanan absensi mandiri
  if (tipeJurnal === 'Jurnal KBM' && kbmSubMode === 'absensi') {
    await handleSaveAbsensiOnly();
    return;
  }
  ```
- **Baris 1283–1284 (`handleSaveAbsensiOnly`)**:
  ```tsx
  materi: '-',
  kegiatan: '-',
  absensi_siswa: JSON.stringify(cleanAbsensiForSave),
  ```
- **Analisis**:
  Saat pertama kali membuka form Jurnal KBM, guru berada di sub-mode `'absensi'`. Tombol di bawah daftar absensi siswa bertuliskan "Simpan Presensi / Ke Jurnal KBM" atau tombol submit utama form ditekan. Handler `handleSaveAbsensiOnly()` dieksekusi dan menyimpan rekaman ke `jurnal_pembelajaran` dengan `materi: '-'` dan `kegiatan: '-'`.
  Jika guru tidak menyadari bahwa ia harus berpindah ke sub-mode `'jurnal'` untuk mengisi materi, tujuan pembelajaran, dan foto, sesi pembelajaran tertinggal dengan status placeholder. Modul cetak jurnal (`RekapJurnalView.tsx`) dan verifikasi admin (`AdminVerifView.tsx`) mendeteksi bahwa materi adalah `'-'`, sehingga dianggap belum mengisi jurnal pembelajaran riil.

---

### 3.2 Kerentanan 2: Crash `crypto.randomUUID()` di Jaringan Lokal / Non-HTTPS
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 1276**:
  ```tsx
  const newSession = {
    id: crypto.randomUUID(),
  ```
- **Baris 1527**:
  ```tsx
  const newJurnal = {
    id: crypto.randomUUID(),
  ```
- **Analisis**:
  Spesifikasi W3C Web Cryptography API menyatakan bahwa `crypto.randomUUID()` **hanya tersedia di Secure Context** (`https://` atau `localhost`).
  Ketika aplikasi diakses oleh guru melalui IP lokal sekolah (misalnya `http://192.168.1.100:3000`) atau domain staging tanpa sertifikat SSL aktif, objek `crypto.randomUUID` bernilai `undefined`.
  Pengeksekusian kode ini langsung melempar:
  ```
  TypeError: crypto.randomUUID is not a function
  ```
  Exception ini ditangkap oleh blok `catch (err: any)` di baris 1782–1785:
  ```tsx
  } catch (err: any) {
    setLoading(false);
    return showToast('Gagal Menyimpan Jurnal', 'Perangkat Anda sedang offline / terjadi kendala jaringan: ' + (err?.message || 'Silakan periksa koneksi Anda dan coba lagi.') + ' Draft formulir tetap tersimpan aman di perangkat.', 'error');
  }
  ```
  Guru menerima notifikasi keliru bahwa "perangkat sedang offline / kendala jaringan", padahal kegagalan disebabkan oleh runtime error JavaScript akibat ketiadaan method `randomUUID`.

---

### 3.3 Kerentanan 3: Hard Failure Upload Foto Google Drive
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 1465–1476**:
  ```tsx
  let fileUrl = '';
  try {
    if (file) {
      const compressedFile = await compressImageWithCanvas(file);
      fileUrl = await uploadToDrive(compressedFile, user.nama, tipeJurnal, 'Jurnal');
    } else if (photoPreviewUrl) {
      fileUrl = photoPreviewUrl;
    }
  } catch (err: any) {
    setLoading(false);
    return showToast('Gagal Upload', err.message, 'error');
  }
  ```
- **Analisis**:
  Fungsi `uploadToDrive` bergantung pada Google Apps Script Webhook eksternal. Webhook ini rentan mengalami:
  - Timeout jaringan (konfigurasi fetch timeout 60 detik).
  - Pembatasan kuota harian Google Drive API.
  - Hambatan koneksi internet sekolah yang lambat saat mengunggah payload base64.
  Saat `uploadToDrive` gagal, handler langsung mengembalikan `return showToast('Gagal Upload', err.message, 'error')` dan menghentikan seluruh proses. Database mutation tidak pernah dipanggil. Semua data teks (materi, KKTP, TP, kehadiran) gagal disimpan ke database.

---

### 3.4 Kerentanan 4: Schema Mismatch & Keterbatasan Regex Retry
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 1542 & 1657**: Kolom `catatan_khusus_siswa`
- **Baris 1663–1667**:
  ```tsx
  if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
    const { user_id: _u, latitude: _lat, longitude: _lng, lokasi: _lok, waktu_upload: _wu, kktp: _k, konten: _ko, lokasi_kbm: _lk, catatan_khusus_siswa: _ck, ...compatiblePayload } = updatePayload;
    const retry = await supabase.from('jurnal_pembelajaran').update(compatiblePayload).eq('id', existingSessionRow.id);
    error = retry.error;
  }
  ```
- **Analisis**:
  Kolom `catatan_khusus_siswa` tercatat di definisi TypeScript (`src/types/database.ts`), namun tidak ada di migrasi tabel `public.jurnal_pembelajaran` pada template sekolah dasar (`supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`).
  Meskipun commit `bece4f3` menambahkan penanganan retry untuk error PostgREST `PGRST204`, beberapa respons error PostgreSQL mengembalikan kode `42703` (undefined column) atau HTTP 400 dengan pesan ringkas `Bad Request`. Jika pesan error tidak memuat substring `'schema cache'`, `'column'`, atau `'Could not find the'`, blok retry dilewati dan operasi simpan dibatalkan dengan menampilkan notifikasi error ke guru.
  Selain itu, pada `newJurnal`, field `kegiatan_pembelajaran` tidak di-dual-write (hanya field `kegiatan` yang diisi).

---

### 3.5 Kerentanan 5: Resolusi Sesi Eksisting & Sesi Terbelah (Split Session)
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 1583–1606**:
  ```tsx
  const targetSearchName = (isInval && guruDigantikan?.nama) ? guruDigantikan.nama : (user?.nama || '');
  const targetSearchUserId = (isInval && guruDigantikan) ? (guruDigantikan.user_id || null) : (user?.id || null);
  const normName = normalizeTeacherIdentityName(targetSearchName);
  const cleanNama = (user?.nama || '').split(',')[0].trim();
  const firstToken = normName.split(' ')[0] || targetSearchName.split(',')[0].trim();
  const searchEffectiveName = (isInval && guruDigantikan?.nama)
    ? (normName.split(' ')[0] || targetSearchName.split(',')[0].trim())
    : (firstToken || cleanNama);

  let existingSessionQuery = supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .eq('tanggal', tgl)
    .eq('kelas', kelas);
  if (user?.sekolah_id) existingSessionQuery = existingSessionQuery.eq('sekolah_id', user.sekolah_id);
  if (targetSearchUserId && searchEffectiveName) {
    existingSessionQuery = existingSessionQuery.or(`user_id.eq.${targetSearchUserId},nama_guru.ilike."%${searchEffectiveName}%"`);
  }
  ```
- **Analisis**:
  Ketika guru menginput absensi di sub-mode `'absensi'`, record tersimpan dengan nama guru dan kelas.
  Saat guru beralih ke sub-mode `'jurnal'` dan menekan simpan:
  1. Jika `targetSearchUserId` tidak cocok (misal entri absensi tersimpan dengan `user_id` null atau berbeda format UUID), dan `searchEffectiveName` memiliki variasi gelar / karakter khusus, PostgREST query `.or()` menghasilkan 0 baris.
  2. Saat `existingSessionRow` tidak ditemukan, `handleJurnalSubmit` mengeksekusi `insert([newJurnal])` di baris 1669, alih-alih `update`.
  3. Akibatnya, tercipta **dua baris terpisah** di `jurnal_pembelajaran`:
     - Baris 1: Memiliki `absensi_siswa` lengkap, namun `materi: '-'`.
     - Baris 2: Memiliki materi/tujuan pembelajaran lengkap, namun `absensi_siswa: '{}'`.
  4. Konsumen hilir seperti `RekapJurnalView.tsx` yang mencocokkan record pertama akan mendapati baris dengan materi kosong atau absensi kosong, memicu keluhan bahwa data jurnal guru hilang atau tidak tersimpan lengkap.

---

### 3.6 Kerentanan 6: Inkonsistensi Multi-Tenant `sekolah_id`
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 1300**: `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})`
- **Baris 1558**: `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})`
- **Bandingkan dengan Baris 1705**:
  ```tsx
  sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
  ```
- **Analisis**:
  Jika objek sesi user di frontend belum memuat properti `sekolah_id` (misalnya akun guru lama hasil migrasi awal), objek payload `newJurnal` sama sekali tidak menyertakan key `sekolah_id`.
  Pada tenant database Supabase dengan skema modern yang menerapkan constraint `sekolah_id UUID NOT NULL` atau RLS policy berbasis `auth.jwt() -> sekolah_id`, ketiadaan `sekolah_id` memicu error pelanggaran integritas data (`violates not-null constraint`), menggagalkan penyimpanan jurnal.

---

### 3.7 Kerentanan 7: Form UI Lockout Trap (`isLocked`)
- **File**: `src/components/GuruJurnal.tsx`
- **Baris 1904–1908**:
  ```tsx
  const hasNoKbmAssignments = tipeJurnal === 'Jurnal KBM' && !isFetchingAssignments && mapelList.length === 0 && !kelas && !mapel && user?.role !== 'Admin';
  const isLocked = !hasRejectedJurnal && !!(dailyState?.isLibur || (dailyState && !dailyState.canOpenJurnal && !hasRejectedJurnal) || hasNoKbmAssignments);
  ```
- **Baris 2085 & 2703**:
  ```tsx
  <div className={`p-4 md:p-6 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
  ...
  <button ... disabled={isLocked || loading}>
  ```
- **Analisis**:
  Jika guru belum melakukan presensi datang di pagi hari, `dailyState.canOpenJurnal` bernilai `false`. Seluruh form KBM otomatis terkunci dengan class CSS `pointer-events-none` dan tombol submit berstatus `disabled`.
  Jika guru sedang mengajar di kelas dan ingin mencatat jurnal terlebih dahulu karena presensi datang gerbang terkendala GPS, sistem mencegah guru menginput jurnal KBM sama sekali.

---

## 4. Rekomendasi Solusi Minimalis (/ponytail Remediation Strategy)

Mengikuti prinsip **/ponytail** (solusi paling sederhana, ringkas, langsung mengatasi akar masalah, tanpa redundansi dan tanpa risiko regresi):

### Solusi 1: Safe UUID Generator Fallback
Ganti pemanggilan langsung `crypto.randomUUID()` dengan helper safe UUID yang kebal terhadap konteks non-HTTPS:
```tsx
const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'jrn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
};
```
*Terapkan pada baris 1276 dan baris 1527 di `GuruJurnal.tsx`.*

### Solusi 2: Resilient Drive Upload (Graceful Degradation)
Jangan batalkan mutasi jurnal database jika upload foto ke Drive gagal. Jika upload gagal, simpan jurnal dengan data lokal (data URL preview atau string foto tertunda) dan berikan peringatan non-fatal:
```tsx
try {
  if (file) {
    const compressedFile = await compressImageWithCanvas(file);
    fileUrl = await uploadToDrive(compressedFile, user.nama, tipeJurnal, 'Jurnal');
  } else if (photoPreviewUrl) {
    fileUrl = photoPreviewUrl;
  }
} catch (uploadErr: any) {
  console.warn('Upload foto ke Drive gagal, melanjutkan simpan jurnal:', uploadErr);
  fileUrl = photoPreviewUrl || ''; // Tetap simpan jurnal teks meskipun foto Drive pending
}
```

### Solusi 3: Robust Error Retry & Toleransi Skema Kolom
Perluas kondisi deteksi error skema di baris 1268, 1303, 1663, dan 1671 agar mencakup kode `42703` dan status HTTP 400:
```tsx
const isSchemaColumnError = (err: any) => Boolean(
  err && (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    err.status === 400 ||
    err.message?.includes('schema cache') ||
    err.message?.includes('column') ||
    err.message?.includes('Could not find the')
  )
);
```

### Solusi 4: Dual-Write Kontrak Data Lengkap & Default `sekolah_id`
Lengkapi payload `newJurnal` agar memiliki field kanonikal lengkap:
```tsx
kegiatan_pembelajaran: kegiatan, // Pastikan dual-write kegiatan_pembelajaran
sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
```

### Solusi 5: Unifikasi Penyimpanan Sub-Mode
Pada sub-mode `'absensi'`, sediakan tombol yang jelas: "Simpan Presensi Saja" vs "Lanjut ke Isi Jurnal KBM".
Saat beralih ke sub-mode `'jurnal'`, pastikan state `absensi` yang baru diinput di memori tetap terikat langsung ke payload `newJurnal`, sehingga jika query lookup sesi eksisting gagal menemukan record absensi lama, payload baru tetap membawa data absensi siswa yang valid (`finalAbsensiJson`).

---

## 5. Matriks Risiko & Dampak Konsumen Hilir

| Modul Konsumen | Dependensi Kolom | Risiko Regresi | Mitigasi |
|---|---|---|---|
| `RekapJurnalView.tsx` | `materi`, `kegiatan`, `absensi_siswa`, `sekolah_id` | Sangat Rendah | Dual-write menjamin field lama dan baru terisi identik. |
| `AdminVerifView.tsx` | `materi`, `kegiatan`, `status_verifikasi` | Nol | Fungsi `isRealSubmittedJournal` tetap memvalidasi kelengkapan jurnal. |
| `workflow.ts` (`canTeacherPresensiPulang`) | `hasJournalContent(j)` | Nol | Jurnal yang tersimpan dengan materi riil langsung membuka gatekeeper presensi pulang. |
| `absensi` (Auto-sync Bolos) | `sekolah_id`, `tanggal`, `nisn` | Nol | Tetap mempertahankan logika sinkronisasi otomatis status bolos siswa. |

---
*Laporan disusun oleh `explorer_kbm_1` untuk diserahkan kepada parent orchestrator dan implementer.*

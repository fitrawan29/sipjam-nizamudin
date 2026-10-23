# Technical Investigation Report: Navigation, Cross-School Data Fetching & Executive Dashboard for `dinas_pendidikan`

**Investigator**: Explorer 2 (Navigation, Queries & Executive Dashboard)  
**Target Role**: `dinas_pendidikan` (Dinas Pendidikan Regional Monitoring)  
**Scope**: `AppScreen.tsx`, `ClaySidebar.tsx`, `supabaseClient.ts`, Cross-School Regional Querying, `DinasDashboard.tsx`, Print System  
**Date**: 2026-10-23  

---

## 1. Executive Summary

Role baru `dinas_pendidikan` bertindak sebagai pengawas eksekutif regional tingkat Kota/Kabupaten pada platform SIPJAM. Karakteristik utama peran ini adalah:
1. **Region-Scoped**: Terikat secara ketat hanya pada satu daerah binaan (`kota_kabupaten`) yang ditentukan dan ditugaskan oleh Superadmin. Data di luar wilayah binaan tidak boleh bocor maupun dipilih pada filter UI.
2. **Read-Only Enforced**: Bertujuan murni untuk monitoring, supervisi, rekapitulasi, dan pelaporan cetak resmi. Segala mutasi data (tambah/edit/hapus guru, siswa, kelas, presensi, konfigurasi) diblokir total baik pada UI maupun level RLS database.
3. **Cross-School Aggregation & Drilldown**: Memiliki kemampuan melihat ringkasan agregat kehadiran harian lintas seluruh sekolah di wilayahnya, sekaligus dapat melakukan peninjauan mendalam (*drilldown*) ke salah satu sekolah binaan memanfaatkan infrastruktur `getActiveTargetSchool` yang sudah ada di SIPJAM.

Laporan ini membedah secara menyeluruh tiga domain teknis: navigasi antarmuka (`AppScreen.tsx` dan `ClaySidebar.tsx`), pola kueri agregasi lintas sekolah berbasis Supabase, dan desain komponen dasbor eksekutif (`DinasDashboard.tsx`) beserta tata letak cetak dokumen resminya.

---

## 2. Navigation & Layout Architecture

### 2.1. Pemeriksaan `AppScreen.tsx`

`src/components/AppScreen.tsx` (1.218 baris) adalah komponen orkestrasi sentral yang mengelola:
- Sesi aktif pengguna (`useSessionSync`)
- Peran pengguna (`isSuperadmin`, `isAdmin`, `isKepalaSekolah`, `isWaliKelas`, `isPiketHariIni`)
- Navigasi view aktif (`currentView`, disinkronkan dengan URL query `?view=...` dan browser history via `window.history.pushState`)
- Navigasi sidebar (`sidebarOpen`)
- Switcher sekolah satelit yang sedang dipantau (`activeTargetSchool`, `setActiveTargetSchool`)
- Mounting view dinamis (menggunakan `next/dynamic` dengan React 19)

#### Temuan Kunci pada `AppScreen.tsx`:
1. **Deteksi Peran**:
   Saat ini, deteksi peran di baris 73–75:
   ```typescript
   const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
   const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
   ```
   **Rekomendasi Penyesuaian**:
   Tambahkan deteksi untuk `dinas_pendidikan`:
   ```typescript
   const isDinas = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'dinas_pendidikan' ||
                   (baseUser?.role || '').toLowerCase() === 'dinas pendidikan';
   ```
   Penting: Pastikan `isAdmin` tetap `false` untuk `dinas_pendidikan` agar tidak membuka menu atau aksi administratif sekolah.

2. **Default Home View**:
   Saat ini (baris 159–161):
   ```typescript
   if (isSuperadmin) return 'view-superadmin-overview';
   return 'view-home';
   ```
   Untuk pengguna `dinas_pendidikan`, tampilan default harus langsung diarahkan ke dasbor eksekutif dinas:
   ```typescript
   if (isSuperadmin) return 'view-superadmin-overview';
   if (isDinas) return 'view-dinas-overview';
   return 'view-home';
   ```
   Begitu pula pada inisialisasi `defaultHomeView`:
   ```typescript
   const defaultHomeView = isSuperadmin 
     ? 'view-superadmin-overview' 
     : isDinas 
     ? 'view-dinas-overview' 
     : 'view-home';
   ```

3. **Menu Navigasi (`menuItemsDinas`)**:
   Dinas membutuhkan menu terpisah yang berorientasi monitoring wilayah:
   ```typescript
   const menuItemsDinas = [
     { id: 'view-dinas-overview', icon: 'fa-gauge-high', label: 'Dasbor Wilayah' },
     ...(activeTargetSchool ? [
       { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: `Rekap Guru (${activeTargetSchool.nama})` },
       { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: `Presensi Siswa (${activeTargetSchool.nama})` },
       { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: `Jurnal Kelas (${activeTargetSchool.nama})` },
     ] : [])
   ];
   ```
   Pada logika penentuan `menuItems`:
   ```typescript
   let menuItems = menuItemsGuru;
   if (isSuperadmin) {
     menuItems = menuItemsSuperadmin;
   } else if (isDinas) {
     menuItems = menuItemsDinas;
   } else if (isAdmin) {
     menuItems = menuItemsAdmin;
   } else if (isKepalaSekolah) {
     menuItems = menuItemsKepalaSekolah;
   }
   ```

4. **Guarding pada `handleNavigation`**:
   Saat pengguna `dinas_pendidikan` mencoba berpindah view via `handleNavigation(targetId)`:
   - View yang diizinkan untuk Dinas: `['view-dinas-overview', 'view-admin-rekap', 'view-rekap-siswa', 'view-jurnal-kelas']`.
   - Jika mencoba mengakses view administratif (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`) atau view guru (`view-guru-presensi`, `view-guru-jurnal`, `view-piket`), sistem harus langsung memblokir dan menampilkan SweetAlert2:
     ```typescript
     if (isDinas && !['view-dinas-overview', 'view-admin-rekap', 'view-rekap-siswa', 'view-jurnal-kelas'].includes(targetId)) {
       Swal.fire({
         icon: 'warning',
         title: 'Akses Ditolak',
         text: 'Akses Terblokir: Akun Dinas Pendidikan hanya memiliki wewenang monitoring read-only pada wilayah binaan.',
         confirmButtonColor: '#0B4619'
       });
       return;
     }
     ```

5. **Mounting View di Main Container**:
   Di dalam `<main>` pada `AppScreen.tsx`:
   ```tsx
   {currentView === 'view-dinas-overview' && (
     <DinasDashboard 
       user={user} 
       setView={handleNavigation}
       onSelectTargetSchool={(sch) => {
         setActiveTargetSchool(sch);
         setActiveTargetSchoolState(sch);
       }}
     />
   )}
   ```
   Dan ketika membuka view drilldown (`view-admin-rekap`, `view-rekap-siswa`, `view-jurnal-kelas`), teruskan prop `isReadOnly={true}`:
   ```tsx
   {currentView === 'view-admin-rekap' && (
     (isAdmin || isSuperadmin || isKepalaSekolah || isDinas) ? (
       <AdminRekapView 
         user={user} 
         isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin}
         isReadOnly={isDinas} 
       />
     ) : (
       <AccessBlockedCard defaultHomeView={defaultHomeView} />
     )
   )}
   ```

---

### 2.2. Integrasi `ClaySidebar.tsx`

Komponen `src/components/ClaySidebar.tsx` (263 baris) telah mengadopsi estetika Claymorphism (`ClayCard`, dual inner highlight, soft diffused shadow).

#### Penyesuaian `ClaySidebar`:
1. **Interface Props**:
   Tambahkan `isDinas?: boolean` ke dalam `ClaySidebarProps`:
   ```typescript
   export interface ClaySidebarProps {
     isOpen: boolean;
     onClose: () => void;
     user: AppUser;
     currentView: string;
     onNavigate: (viewId: string) => void;
     menuItems: MenuItem[];
     isSuperadmin?: boolean;
     isDinas?: boolean;
     isAdmin?: boolean;
     isKepalaSekolah?: boolean;
     isWaliKelas?: boolean;
     satelliteSchools?: any[];
     activeTargetSchool?: any;
     onTargetSchoolChange?: (schoolId: string) => void;
     ...
   }
   ```
2. **Role Badge & Label Styling**:
   ```typescript
   const roleBadgeStyle = isSuperadmin
     ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300/60'
     : isDinas
     ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-300/60'
     : isAdmin
     ...
   
   const roleLabel = isSuperadmin
     ? 'Superadmin'
     : isDinas
     ? 'Dinas Pendidikan'
     : isAdmin
     ...

   const roleIcon = isSuperadmin
     ? 'fa-crown'
     : isDinas
     ? 'fa-building-columns'
     : isAdmin
     ...
   ```
3. **Region Scoping pada School Switcher di Sidebar**:
   Jika `isDinas` aktif, dropdown switcher sekolah di sidebar hanya memunculkan sekolah-sekolah yang berada dalam wilayah binaannya:
   ```tsx
   const availableSchools = isDinas
     ? satelliteSchools.filter(s => (s.kota_kabupaten || '').trim().toLowerCase() === (user.kota_kabupaten || '').trim().toLowerCase())
     : satelliteSchools;
   ```

---

## 3. Cross-School Data Fetching by Region (`kota_kabupaten`)

### 3.1. Struktur Data Multi-Sekolah Eksisting

Di dalam Supabase database:
1. **Tabel `sekolah`**:
   Memiliki kolom: `id (UUID)`, `nama`, `npsn`, `kota_kabupaten`, `provinsi`, `status ('aktif' | 'nonaktif')`, `vercel_url`, `supabase_url`, `supabase_anon_key`.
2. **Tabel `sekolah_registry`**:
   Tabel katalog satelit pusat dengan kolom identik (`id`, `nama`, `npsn`, `kota_kabupaten`, `status`, `supabase_url`, `supabase_anon_key`).
3. **Tabel Transaksional**:
   - `data_guru`: memiliki `id`, `nama_guru`, `nip`, `sekolah_id`.
   - `data_siswa`: memiliki `id`, `nama_siswa`, `nisn`, `kelas`, `sekolah_id`.
   - `presensi_guru`: memiliki `id`, `nama_guru`, `sekolah_id`, `jenis_presensi`, `status_verifikasi`, `timestamp`.
   - `presensi_siswa`: memiliki `id`, `siswa_id`, `nisn`, `sekolah_id`, `status ('datang' | 'pulang')`, `tanggal`.
   - `absensi`: memiliki `id`, `siswa_id`, `sekolah_id`, `status ('Hadir' | 'Izin' | 'Sakit' | 'Alpa')`, `tanggal`.
   - `jurnal_pembelajaran`: memiliki `id`, `nama_guru`, `kelas`, `mapel`, `sekolah_id`, `status_verifikasi`, `tanggal`.

### 3.2. Temuan Kritis pada `src/lib/supabaseClient.ts`

Di `src/lib/supabaseClient.ts` baris 172–177:
```typescript
export function getActiveTargetSchool(): SatelliteSchool | null {
  const tenant = getActiveTenantContext();
  const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
  if (roleNorm !== 'superadmin') {
    return null;
  }
  ...
```
**Analisis Kritis**:
Fungsi `getActiveTargetSchool()` saat ini **hanya mengizinkan Superadmin**. Jika pengguna dengan role `dinas_pendidikan` mencoba melakukan drilldown ke sekolah binaan, fungsi ini akan mengembalikan `null` dan header `x-sekolah-id` tidak akan terinjeksi ke request Supabase!
**Solusi**:
Ubah batas autorisasi pada `getActiveTargetSchool()` agar mencakup `dinas_pendidikan`:
```typescript
export function getActiveTargetSchool(): SatelliteSchool | null {
  const tenant = getActiveTenantContext();
  const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
  if (roleNorm !== 'superadmin' && roleNorm !== 'dinas_pendidikan' && roleNorm !== 'dinas') {
    return null;
  }
  ...
```
Dengan perubahan satu baris ini:
- `dynamicTenantFetch` otomatis menyuntikkan `x-sekolah-id: activeTargetSchool.id`.
- Jika sekolah target adalah instance satelit mandiri (`supabase_url` eksternal), request otomatis ter-route ke instance tersebut tanpa re-autentikasi.
- Saat kembali ke dasbor wilayah (`activeTargetSchool` = `null`), koneksi kembali ke database pusat master.

### 3.3. Strategi Kueri Lintas Sekolah yang Efisien

Untuk dasbor pemantauan eksekutif wilayah binaan, proses pengambilan data berlangsung dalam 3 tahap:

#### Tahap 1: Resolusi Sekolah Binaan (Scoped to `kota_kabupaten`)
```typescript
// Ambil daftar sekolah di wilayah binaan pengguna
const assignedRegion = (user.kota_kabupaten || '').trim();

let regionSchools: SatelliteSchool[] = [];
try {
  const { data: regData, error: regErr } = await masterSupabase
    .from('sekolah_registry')
    .select('*')
    .ilike('kota_kabupaten', assignedRegion)
    .order('nama', { ascending: true });

  if (!regErr && regData && regData.length > 0) {
    regionSchools = regData as SatelliteSchool[];
  }
} catch (_) {}

// Fallback ke tabel public.sekolah
if (regionSchools.length === 0) {
  const { data: schData } = await masterSupabase
    .from('sekolah')
    .select('*')
    .ilike('kota_kabupaten', assignedRegion)
    .order('nama', { ascending: true });

  if (schData && schData.length > 0) {
    regionSchools = schData.map(s => ({
      id: s.id,
      nama: s.nama,
      npsn: s.npsn,
      kota_kabupaten: s.kota_kabupaten,
      provinsi: s.provinsi,
      status: s.status || 'aktif',
      supabase_url: (s as any).supabase_url || null,
      supabase_anon_key: (s as any).supabase_anon_key || null,
      vercel_url: (s as any).vercel_url || null
    }));
  }
}

// Security guard di sisi client: pastikan 100% data terfilter hanya pada wilayah tugas
const scopedSchools = regionSchools.filter(
  s => (s.kota_kabupaten || '').trim().toLowerCase() === assignedRegion.toLowerCase()
);
const schoolIds = scopedSchools.map(s => s.id);
```

#### Tahap 2: Pengambilan Metrik Kehadiran Hari Ini (WITA)
Rentang waktu WITA (Asia/Makassar, UTC+8):
```typescript
const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); // YYYY-MM-DD
const todayStart = `${todayStr}T00:00:00+08:00`;
const todayEnd = `${todayStr}T23:59:59+08:00`;
```

Eksekusi kueri paralel batch untuk seluruh sekolah di `schoolIds`:
```typescript
const [
  guruRes,
  siswaRes,
  presensiGuruRes,
  presensiSiswaRes,
  absensiSiswaRes,
  jurnalRes
] = await Promise.all([
  // 1. Total guru per sekolah
  masterSupabase.from('data_guru').select('id, nama_guru, sekolah_id').in('sekolah_id', schoolIds),
  
  // 2. Total siswa per sekolah
  masterSupabase.from('data_siswa').select('id, sekolah_id').in('sekolah_id', schoolIds),
  
  // 3. Presensi guru hari ini
  masterSupabase.from('presensi_guru')
    .select('id, nama_guru, sekolah_id, jenis_presensi, status_verifikasi')
    .in('sekolah_id', schoolIds)
    .gte('timestamp', todayStart)
    .lte('timestamp', todayEnd)
    .in('status_verifikasi', ['Disetujui', 'Diverifikasi']),
    
  // 4. Presensi gerbang siswa hari ini (status datang)
  masterSupabase.from('presensi_siswa')
    .select('id, siswa_id, nisn, sekolah_id, status')
    .in('sekolah_id', schoolIds)
    .eq('tanggal', todayStr)
    .eq('status', 'datang'),

  // 5. Absensi kelas siswa hari ini (untuk mendeteksi alpa/bolos)
  masterSupabase.from('absensi')
    .select('id, siswa_id, sekolah_id, status')
    .in('sekolah_id', schoolIds)
    .eq('tanggal', todayStr),

  // 6. Jurnal KBM yang terisi hari ini
  masterSupabase.from('jurnal_pembelajaran')
    .select('id, sekolah_id, kelas')
    .in('sekolah_id', schoolIds)
    .eq('tanggal', todayStr)
]);
```

#### Tahap 3: Pemrosesan Agregasi & Penilaian "Sekolah Butuh Perhatian"
```typescript
// Peta agregat per sekolah
const schoolMetrics: Record<string, {
  totalGuru: number;
  hadirGuru: number;
  totalSiswa: number;
  hadirSiswa: number;
  alpaSiswa: number;
  jurnalCount: number;
  guruPct: number;
  siswaPct: number;
  needsAttention: boolean;
  attentionReason?: string;
}> = {};

scopedSchools.forEach(sch => {
  const gList = guruRes.data?.filter(g => g.sekolah_id === sch.id) || [];
  const sList = siswaRes.data?.filter(s => s.sekolah_id === sch.id) || [];
  
  const gPresensi = presensiGuruRes.data?.filter(p => p.sekolah_id === sch.id) || [];
  const distinctHadirGuru = new Set(
    gPresensi.filter(p => ['Sekolah', 'Hadir', 'Dinas Luar'].includes(p.jenis_presensi)).map(p => p.nama_guru)
  ).size;

  const sGate = presensiSiswaRes.data?.filter(p => p.sekolah_id === sch.id) || [];
  const sAbsen = absensiSiswaRes.data?.filter(a => a.sekolah_id === sch.id) || [];
  
  const distinctHadirSiswa = new Set(sGate.map(p => p.siswa_id || p.nisn)).size;
  const countAlpaSiswa = sAbsen.filter(a => a.status === 'Alpa' || a.status === 'Bolos').length;
  
  const jList = jurnalRes.data?.filter(j => j.sekolah_id === sch.id) || [];

  const totalG = gList.length;
  const totalS = sList.length;
  const guruPct = totalG > 0 ? Math.round((distinctHadirGuru / totalG) * 100) : 0;
  const siswaPct = totalS > 0 ? Math.round((distinctHadirSiswa / totalS) * 100) : 0;
  const alpaPct = totalS > 0 ? (countAlpaSiswa / totalS) * 100 : 0;

  // Kriteria "Sekolah Butuh Perhatian":
  // - Siswa Alpa > 15%
  // - Kehadiran Guru < 70% pada hari efektif
  // - Status sekolah nonaktif
  const needsAttention = (alpaPct >= 15) || (totalG > 0 && guruPct < 70) || (sch.status === 'nonaktif');
  let attentionReason = '';
  if (sch.status === 'nonaktif') attentionReason = 'Sekolah Nonaktif';
  else if (alpaPct >= 15) attentionReason = `Alpa Siswa Tinggi (${Math.round(alpaPct)}%)`;
  else if (totalG > 0 && guruPct < 70) attentionReason = `Kehadiran Guru Rendah (${guruPct}%)`;

  schoolMetrics[sch.id] = {
    totalGuru: totalG,
    hadirGuru: distinctHadirGuru,
    totalSiswa: totalS,
    hadirSiswa: distinctHadirSiswa,
    alpaSiswa: countAlpaSiswa,
    jurnalCount: jList.length,
    guruPct,
    siswaPct,
    needsAttention,
    attentionReason
  };
});
```

---

## 4. Executive Dashboard Design for `dinas_pendidikan` (`DinasDashboard.tsx`)

Komponen `src/components/DinasDashboard.tsx` dirancang dengan arsitektur modular yang mengintegrasikan:
1. **Claymorphism Aesthetic System**: Menggunakan `ClayCard`, `ClayButton`, dual inner highlight, soft diffused drop shadow, dan palet warna pastel.
2. **Top Executive Header Banner**:
   - Menampilkan identitas wilayah binaan dengan lambang garuda/gedung dinas (`fa-building-columns`).
   - Badge status: `🔒 Wilayah Binaan: Kabupaten Bolaang Mongondow Timur`.
   - Tanggal resmi: format lokal Indonesia `Sabtu, 24 Oktober 2026`.
   - Tombol aksi cepat: Cetak Rekapitulasi Wilayah & Refresh Data.
3. **5 Aggregate Cards Grid**:
   - **Card 1: Total Sekolah Binaan** (`ClayCard variant="mint"`)
     - Nilai: Jumlah total sekolah (misal: `12 Sekolah`).
     - Subtitle: `11 Sekolah Aktif • 1 Nonaktif`.
     - Icon: `fa-school`.
   - **Card 2: Kehadiran Guru Hari Ini** (`ClayCard variant="blue"`)
     - Nilai: Persentase kehadiran agregat (misal: `94%`).
     - Subtitle: `142 / 151 Guru Hadir`.
     - Visual: Mini progress bar clay.
     - Icon: `fa-chalkboard-user`.
   - **Card 3: Kehadiran Siswa Hari Ini** (`ClayCard variant="purple"`)
     - Nilai: Persentase kehadiran agregat (misal: `89%`).
     - Subtitle: `1.820 / 2.045 Siswa Hadir`.
     - Visual: Mini progress bar clay.
     - Icon: `fa-user-graduate`.
   - **Card 4: Kesehatan Satelit / Jaringan** (`ClayCard variant="peach"`)
     - Nilai: `11 / 12 Online`.
     - Subtitle: `Semua Satelit Terhubung Normal`.
     - Visual: Status dot pulsasi hijau.
     - Icon: `fa-satellite-dish`.
   - **Card 5: Sekolah Butuh Perhatian** (`ClayCard variant="rose"`)
     - Nilai: `2 Sekolah`.
     - Subtitle: `Alpa Siswa > 15% / Guru < 70%`.
     - Visual: Alert pill merah/oranye.
     - Icon: `fa-triangle-exclamation`.
4. **Filter & Search Controls (Strictly Region-Scoped)**:
   - Pencarian real-time berdasarkan Nama Sekolah atau NPSN.
   - Filter Status: `Semua Status`, `Hanya Aktif`, `Perlu Perhatian`, `Satelit Online`.
   - **Strict Enclosure**: Tidak ada dropdown pemilihan kabupaten/kota lain. Daerah binaan terkunci mutlak sesuai data login akun dinas.
5. **School Breakdown List / Table**:
   - Tabel responsif dengan kartu fallback pada layar mobile.
   - Kolom:
     1. No
     2. Nama Sekolah & NPSN
     3. Status Jaringan Satelit (Badge Online / Offline / Checking)
     4. Presensi Guru (Angka Hadir/Total & Bar Persentase)
     5. Presensi Siswa (Angka Hadir/Total & Bar Persentase)
     6. Jurnal Kelas Terisi
     7. Status Perhatian (Aman / Badge Perlu Perhatian beserta alasan)
     8. Aksi: Tombol `Tinjau / Drilldown`
6. **Drilldown Mechanism**:
   - Saat pengguna mengklik tombol `Tinjau / Drilldown`:
     1. Panggil `setActiveTargetSchool(sch)`.
     2. Arahkan view ke `view-admin-rekap` (atau sediakan sub-tab drilldown langsung di dasbor).
     3. Tampilkan bilah navigasi persisten: `Kembali ke Dasbor Wilayah` (`setActiveTargetSchool(null)`).
     4. Seluruh interaksi di halaman drilldown berjalan dalam mode `isReadOnly={true}`: tombol "Tambah Guru", "Edit", "Hapus Presensi", "Verifikasi/Tolak", dan form input otomatis disembunyikan.

---

## 5. Print Summary Layout Architecture

Pelaporan resmi Dinas Pendidikan membutuhkan dokumen cetak standar kedinasan yang mematuhi format pelaporan pemerintah daerah.

### 5.1. Komponen Cetak: `PrintHeader` & `PrintSignature`

Komponen `src/components/PrintHeader.tsx` menyediakan dua elemen fundamental:
1. `<PrintHeader />`:
   - Menampilkan logo yayasan/daerah di sisi kiri, logo tut wuri handayani / dinas di sisi kanan.
   - Menampilkan Kop Surat resmi: Nama Instansi Dinas, Nama Wilayah Kabupaten/Kota, Alamat Kantor, dan Garis Ganda (*double border*).
2. `<PrintSignature />`:
   - Menampilkan blok pengesahan resmi berorientasi kanan atau kiri-tengah-kanan.
   - Memuat nama pejabat penandatangan, NIP, pangkat/jabatan kedinasan, dan stempel digital.
   - Menampilkan footer hukum audit jejak digital (*digital audit stamp*): waktu cetak WITA presisi dan koordinat GPS perangkat pencetak dari `window.__SIPJAM_PRINT_GPS__`.

### 5.2. Eksekusi Cetak dengan GPS Geolokasi (`triggerPrintWithGps`)

Tombol cetak pada dasbor dinas menggunakan utility bawaan `@/utils/printWithGps`:
```typescript
import { triggerPrintWithGps } from '@/utils/printWithGps';

const handlePrintSummary = async () => {
  await triggerPrintWithGps({
    onErrorAlert: (msg) => {
      // Jika GPS ditolak atau offline, tetap izinkan cetak fallback
      window.print();
    }
  });
};
```

### 5.3. Struktur Tata Letak Cetak Dokumen Rekapitulasi Wilayah

Dokumen cetak dirancang secara print-friendly (`@media print`):
- Elemen non-dokumen (header navigasi, sidebar, tombol cetak, filter pencarian, tombol aksi) diberi kelas `no-print` atau `print:hidden`.
- Lembar dokumen otomatis berorientasi Lanskap (`landscape`) atau Potret (`portrait`) rapi tanpa terpotong di kertas A4 / F4.
- Tabel rekapitulasi sekolah dicetak dengan border hitam tegas (`border-collapse border-black text-[9pt]`), mencantumkan:
  - Header: `LAPORAN EKSEKUTIF PEMANTAUAN KEHADIRAN SATUAN PENDIDIKAN`
  - Subheader: `Daerah Penugasan: ${user.kota_kabupaten} • Periode: ${tanggalCetakWita}`
  - Kolom Tabel: `No | NPSN | Nama Satuan Pendidikan | Total Guru | Hadir | % Guru | Total Siswa | Hadir | % Siswa | Jurnal KBM | Keterangan`
  - Baris Ringkasan Total Akumulasi Wilayah di bagian bawah tabel.
  - Tanda tangan pengesahan pejabat dinas di bagian kanan bawah.

---

## 6. Matrix Rekomendasi Modifikasi File

| No | File Path | Scope Perubahan |
|----|-----------|-----------------|
| 1 | `src/types/user.ts` | Tambahkan field `kota_kabupaten?: string \| null` pada `AppUser`. |
| 2 | `src/lib/supabaseClient.ts` | Perbarui `getActiveTargetSchool()` untuk mengizinkan role `dinas_pendidikan`. |
| 3 | `src/components/AppScreen.tsx` | Tambahkan deteksi `isDinas`, `menuItemsDinas`, default home view `view-dinas-overview`, permission guard pada `handleNavigation`, dan mounting `<DinasDashboard />`. |
| 4 | `src/components/ClaySidebar.tsx` | Tambahkan prop `isDinas`, badge ungu/indigo dengan ikon `fa-building-columns`, dan batasi school switcher pada `user.kota_kabupaten`. |
| 5 | `src/components/DinasDashboard.tsx` *(File Baru)* | Komponen dasbor eksekutif lengkap dengan 5 aggregate cards, intra-region filter, drilldown trigger, dan print summary layout. |
| 6 | `tests/dinas_pendidikan_monitoring.test.ts` *(File Baru)* | Pengujian otomatis komprehensif memvalidasi RBAC, isolasi wilayah, kalkulasi agregat, dan penolakan mutasi. |

---

## 7. Kesimpulan & Langkah Lanjut

Arsitektur multi-tenant SIPJAM yang sudah ada (`getActiveTargetSchool`, `dynamicTenantFetch`, `PrintHeader`, `ClayCard`, `ClayButton`) sangat ideal dan siap untuk mengakomodasi peran `dinas_pendidikan`. Kunci keberhasilan implementasi terletak pada penguncian ketat batas wilayah `kota_kabupaten` pada tingkat kueri database dan autorisasi sesi pengguna, serta pembatasan seluruh halaman drilldown ke status baca murni (`isReadOnly`).

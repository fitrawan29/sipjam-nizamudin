# Blueprint Arsitektur Sub-Tab Klaster 1 (Jurnal) & Klaster 2 (Presensi)
### Handoff Report: Milestone 1 Technical Strategy & Implementation Specification

**Explorer Agent**: `explorer_m1_jurnal_presensi`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_jurnal_presensi\`  
**Orchestrator ID**: `095792d8-1a85-4945-889d-abf25d3c7740`  
**Target Milestone**: Milestone 1 — Sub-Tab Component Normalization & Foundation  

---

## 1. OBSERVATION

Berdasarkan audit empiris menyeluruh terhadap basis kode (`src/components/`, `src/lib/`, `tests/`), dokumen rekomendasi arsitektur (`docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`), dan baseline tes (`npm test` 41 suites PASS, `npx tsc --noEmit` 0 error), diperoleh temuan fakta teknis verbatim berikut:

### 1.1. Status dan Karakteristik Komponen Klaster 1: Jurnal Mengajar
1. **`src/components/GuruJurnal.tsx` (1.699 baris):**
   - Komponen entry-point untuk pencatatan Jurnal KBM harian oleh guru mata pelajaran.
   - Mengelola **10 Field Kurikulum Merdeka** (baris 15–34):
     1. Tanggal (`tanggal`)
     2. Mata Pelajaran (`mapel`)
     3. Kelas (`kelas`)
     4. Pertemuan Ke (`pertemuanKe`)
     5. Jam Ke (`jamKe`)
     6. Tujuan Pembelajaran (`tujuanPembelajaran`)
     7. KKTP (`kktp`)
     8. Konten / Lingkup Materi (`konten` & `materi`)
     9. Kegiatan Pembelajaran (`kegiatan`)
     10. Lokasi KBM (`lokasiKbm`)
   - Mengelola **Live Student Roll-Call** (baris 39–52):
     - `students`, `absensi` (H/I/S/A), deteksi siswa bolos (sinkronisasi dengan pemindaian gerbang via `piketAttendance`), dan penguncian status pagi via `morningLockedAttendance`.
   - Mengelola **Dokumentasi Kamera & Galeri** (baris 56–73, 1580–1679):
     - Kamera lanskap via `CameraSelfieCapture` dengan watermark GPS, atau mode galeri via `compressImageWithCanvas` (HTML5 `<canvas>` native tanpa external library).
   - Mengelola **Mode Guru Inval** (baris 59–64):
     - `isInval`, `guruDigantikan`, penugasan jadwal guru yang digantikan, dan pengembalian jadwal asli guru via `myAssignments`.
   - Mengelola **Auto-Save & In-Memory Draft** (baris 153–234):
     - Auto-restore dari `localStorage.getItem('sipjam_jurnal_autosave')` dan `loadJurnalDraft()`.
     - Auto-save reaktif via `useEffect` yang memanggil `saveJurnalDraft(draft)` dan menyimpan JSON ke `localStorage`.
   - Saat ini, `GuruJurnal.tsx` hanya menerima prop `{ user }: { user: any }` (baris 13) dan merender satu form tunggal tanpa sub-tab.

2. **`src/components/RekapJurnalView.tsx` (993 baris):**
   - Menerima props (baris 12–24):
     ```typescript
     export default function RekapJurnalView({ 
       user,
       initialMode = 'pribadi',
       assignedKelas: propAssignedKelas = null,
       isKepalaSekolah: propIsKepalaSekolah,
       isReadOnly = false
     }: { ... })
     ```
   - Memiliki state internal `tabMode` (baris 30): `const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>(initialMode);`.
   - Mode `'pribadi'`: Memfilter `nama_guru = user.nama`, menampilkan metrik status persetujuan (Total, Disetujui, Menunggu, Ditolak), tabel riwayat jurnal, cetak pratinjau lembar 10 kolom ber-KOP resmi dan bertanda tangan Kepala Sekolah via `triggerPrintWithGps`, serta ekspor ke file Excel.
   - Mode `'kelas'`: Memantau pengisian jurnal seluruh guru mata pelajaran untuk kelas binaan Wali Kelas (`isWaliKelas`), dengan filter tanggal, pencarian, dan deteksi jam pelajaran kosong.
   - Memiliki mini tab-switcher (baris 375–397) yang hanya muncul jika `isWaliKelas` bernilai true.

3. **`src/components/HistoryView.tsx` (275 baris) — Tab Jurnal:**
   - Menampilkan kartu riwayat `jurnal_pembelajaran` guru yang login (baris 35–40, 194–244).
   - Data yang ditampilkan (Tanggal, Kelas, Mapel/Jurnal Kegiatan, Materi, Catatan Admin, Bukti Foto, Status Verifikasi) merupakan subset dari tabel data yang disajikan oleh `RekapJurnalView.tsx` mode `pribadi`.

---

### 1.2. Status dan Karakteristik Komponen Klaster 2: Presensi Guru
1. **`src/components/GuruPresensi.tsx` (1.052 baris):**
   - Mengelola presensi mandiri datang dan pulang guru dengan prop `{ user }: { user: AppUser }` (baris 14).
   - Fitur-fitur vital:
     - **Mode Presensi Multi-State** (baris 25–32): Datang vs Pulang, Hadir di Sekolah vs Dinas Luar vs Izin Terlambat vs Izin / Sakit.
     - **Formulir Cuti / Sakit Multi-Hari** (baris 61–79): Kalkulasi tanggal mulai, tanggal selesai, durasi hari, routing verifikasi admin otomatis jika sakit $\ge 3$ hari atau izin $> 3$ hari (baris 80–81).
     - **Validasi Geofence GPS** (baris 84–134): Formula Haversine menghitung `jarakAktual` terhadap koordinat sekolah (`gpsConfig`), toleransi radius, dan tombol refresh API GPS.
     - **Kamera Selfie Portrait 4:3** (baris 947–984): `CameraSelfieCapture` dengan watermark GPS & timestamp WITA, validasi selfie wajib untuk datang/pulang Hadir Sekolah dan foto lokasi untuk Dinas Luar.
     - **Penanganan Penolakan & Peringatan** (baris 665–714): Banner peringatan Lupa Checkout (`lastAutoCheckout`), banner penolakan presensi datang (`presensiDatangDitolak`), banner penolakan presensi pulang (`presensiPulangDitolak`) dengan catatan alasan admin dan tombol pengisian ulang.
     - **Transaksi Online Cloud & Upload GAS di Latar Belakang** (baris 500–642): Penyimpanan langsung ke Supabase dengan fallback `/api/attendance`, diikuti pembersihan queue offline lama dan pengunggahan asinkron file selfie ke Google Drive.
   - Saat ini, `GuruPresensi.tsx` merender formulir di dalam `<section id="view-guru-presensi">` tanpa kemampuan menampilkan riwayat presensi sebelumnya secara langsung.

2. **`src/components/HistoryView.tsx` (275 baris) — Tab Presensi:**
   - Menampilkan log transaksi `presensi_guru` untuk `nama_guru = user.nama` (baris 28–34).
   - Menyediakan pencarian teks (`search`), tombol `Reset`, status kosong bersahabat, status badge (Disetujui/Ditolak/Menunggu), waktu WITA, keterangan/detail izin, catatan admin, thumbnail foto selfie/lampiran, dan link pratinjau bukti presensi (baris 148–192).

---

### 1.3. Dependensi Kritis Test Suite Eksisting terhadap AST & File
Berdasarkan audit regex dan string containment pada 41 file test:
1. `tests/sistem_blok_verification.test.ts`:
   - Baris 75: `assert(fs.existsSync(historyPath), 'HistoryView.tsx exists');` -> **`HistoryView.tsx` TIDAK BOLEH DIHAPUS**.
   - Baris 578: `assert(historyContent.includes("(item.keterangan || '').toLowerCase().includes(search.toLowerCase())"))`
   - Baris 582: `assert(historyContent.includes("item.keterangan === 'Jurnal Kegiatan' || item.mapel === 'Jurnal Kegiatan'") && historyContent.includes('Jurnal Kegiatan (Sistem Blok)'))`
2. `tests/dailyScheduleAndFixes.test.ts`:
   - Baris 119: `if (historyContent.includes('[activeTab, page]')) { console.error('FAIL: HistoryView.tsx still has page in useEffect dependency array'); process.exit(1); }`
3. `tests/qolAudit.test.ts`:
   - Baris 71: `if (!historyContent.includes('Reset pencarian') || !historyContent.includes('Tidak ada riwayat')) { process.exit(1); }`
4. `tests/kepsek_pengawas_rbac.test.ts`:
   - Baris 427: `assert(appScreenCode.includes("{currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}"))` -> **Baris render ini di `AppScreen.tsx` wajib dipertahankan verbatim sebagai alias / fallback kompatibilitas**.

---

## 2. LOGIC CHAIN

1. **Premis 1 (Penyatuan Ranah Data & Pengurangan Fragmentasi):**
   - Guru yang sedang mengajar membutuhkan akses satu pintu untuk mengisi jurnal harian, memeriksa status persetujuan jurnal sebelumnya, dan mencetak rekap bulanan tanpa harus berpindah halaman antara 3 menu berbeda (`view-guru-jurnal`, `view-guru-rekap-jurnal`, `view-history`).
   - Demikian pula, setelah melakukan presensi datang/pulang, guru sering kali perlu segera memverifikasi apakah presensinya tercatat, melihat menit keterlambatan, atau memeriksa apakah permohonan izinnya telah disetujui admin.

2. **Premis 2 (Prinsip Keep-Alive In-Memory via CSS Toggling):**
   - Jika sub-tab diimplementasikan menggunakan kondisional rendering standar React (`{activeTab === 'input' && <InputForm />}`), maka saat pengguna berpindah ke sub-tab 'rekap-pribadi' lalu kembali lagi ke 'input', komponen `InputForm` akan di-*unmount* dan di-*remount*.
   - Akibat *unmounting*, seluruh state komponen yang belum tersimpan ke database (misalnya teks draft 10 field yang sedang diketik, status centang absensi murid 30 orang, dan file foto yang baru dijepret kamera) berisiko terhapus dari memori.
   - Dengan membungkus masing-masing konten tab dalam kontainer DOM yang dikontrol oleh kelas CSS:
     `className={activeTab === 'input' ? 'block' : 'hidden'}`
     komponen tetap hidup (*mounted*) di dalam React Fiber tree. State, event listener, dan elemen form tetap utuh di memori tanpa memicu render ulang yang merusak draft (*zero draft loss*).

3. **Premis 3 (Kompatibilitas Komponen Bersama & Anti-Duplikasi):**
   - `RekapJurnalView.tsx` telah memiliki logika lengkap untuk mode pribadi dan mode supervisi kelas. Dengan menambahkan prop kontrol opsional (`controlledMode?: 'pribadi' | 'kelas'` dan `hideTabSwitch?: boolean`), `RekapJurnalView` dapat disematkan ke dalam sub-tab `GuruJurnal.tsx` secara elegan tanpa menduplikasi kode tabel, filter, atau fungsi cetak GPS.
   - `HistoryView.tsx` telah memiliki implementasi presensi history yang stabil. Dengan menambahkan prop opsional (`onlyTab="presensi"`, `hideTabSwitch={true}`, dan `hideSectionWrapper={true}`), tampilan riwayat presensi dapat langsung disematkan ke dalam Sub-Tab 2 `GuruPresensi.tsx` tanpa duplikasi kode dan tanpa merusak file fisik yang diperiksa oleh test suite AST.

4. **Premis 4 (Dual-Layer Backward Compatibility):**
   - Rute warisan `view-guru-rekap-jurnal`, `view-jurnal-kelas`, dan `view-history` tetap didukung melalui dua lapisan:
     1. Lapisan Router: Parameter URL diselesaikan ke canonical view + target sub-tab (`view-guru-jurnal` + `tab=rekap-pribadi`, `view-guru-presensi` + `tab=riwayat`).
     2. Lapisan Fallback AST: Blok render JSX warisan tetap dipertahankan di `AppScreen.tsx` sehingga asersi string pada test suite otomatis (`tests/kepsek_pengawas_rbac.test.ts:427`) tetap lulus 100%.

---

## 3. CAVEATS

1. **State Kamera Saat Tab Disembunyikan (`hidden`):**
   - Ketika elemen video kamera dibungkus dalam CSS `hidden` (`display: none`), browser modern mempertahankan stream kamera di memori tanpa mematikan hardware stream secara paksa. Namun, jika pengguna beralih sub-tab cukup lama, disarankan agar UI membiarkan stream berjalan atau mempertahankan foto hasil jepretan (`photoPreviewUrl`) agar tidak membebani baterai perangkat mobile secara berlebihan.
2. **Kueri Database Bersamaan pada Mount Awal:**
   - Karena sub-tab menggunakan keep-alive, komponen `RekapJurnalView` dan `GuruPresensi` akan me-mount `useEffect` awal saat pertama kali dimuat. Hal ini menguntungkan karena data riwayat sudah terambil (*pre-fetched*) sehingga ketika guru mengklik tab riwayat, tampilan langsung tersedia instan (*zero layout shift*).
3. **Rigiditas Asersi String Test Suite:**
   - Pengembang dilarang mengubah nama file `HistoryView.tsx` atau menghapus string `appScreenCode.includes("{currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}"` dari `AppScreen.tsx`.

---

## 4. CONCLUSION & DETAILED BLUEPRINT

### 4.1. Spesifikasi Komponen Reusable `src/components/ClayTabs.tsx`
Komponen sub-navigasi Claymorphism modular yang akan menjadi fondasi seluruh klaster.

```typescript
// src/components/ClayTabs.tsx
'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
  disabled?: boolean;
}

export interface ClayTabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function ClayTabs({ items, activeTab, onTabChange, className = '' }: ClayTabsProps) {
  const getBadgeClasses = (variant: TabItem['badgeVariant'] = 'blue') => {
    switch (variant) {
      case 'mint':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'amber':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
      case 'blue':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sub navigasi"
      className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700/80 shadow-inner overflow-x-auto no-scrollbar ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            className={`btn-click flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'clay-card bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm border border-white/80 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            {tab.icon && (
              <i className={`fa-solid ${tab.icon} ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} text-xs`}></i>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${getBadgeClasses(tab.badgeVariant)}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

---

### 4.2. Blueprint Klaster 1: Normalisasi Ekosistem Jurnal Mengajar

#### 1. Perubahan Props & State pada `src/components/GuruJurnal.tsx`
```typescript
// Interface props baru yang kompatibel penuh
export interface GuruJurnalProps {
  user: any;
  initialTab?: 'input' | 'rekap-pribadi' | 'supervisi-kelas';
  onTabChange?: (tab: string) => void;
  assignedKelas?: string | null;
  isKepalaSekolah?: boolean;
  isReadOnly?: boolean;
}

export default function GuruJurnal({
  user,
  initialTab = 'input',
  onTabChange,
  assignedKelas: propAssignedKelas = null,
  isKepalaSekolah: propIsKepalaSekolah,
  isReadOnly = false
}: GuruJurnalProps) {
  // 1. State tab aktif
  const [activeTab, setActiveTab] = useState<'input' | 'rekap-pribadi' | 'supervisi-kelas'>(initialTab);

  // 2. Evaluasi hak akses supervisi kelas binaan (Wali Kelas / Admin / Kepala Sekolah)
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin' || user?.role === 'Admin';
  const isKepalaSekolah = propIsKepalaSekolah !== undefined ? propIsKepalaSekolah : checkIsKepalaSekolah(user);
  
  // Deteksi kelas wali
  const assignedKelas = propAssignedKelas || (user?.wali_kelas ? (typeof user.wali_kelas === 'string' ? user.wali_kelas : user.wali_kelas.kelas) : null);
  const canAccessSupervisi = isAdmin || isKepalaSekolah || Boolean(assignedKelas) || Boolean(isReadOnly);

  // 3. Sinkronisasi dengan initialTab jika berubah dari luar (URL router)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 4. Handler pergantian tab dengan URL deep-linking
  const handleTabChange = (newTabId: string) => {
    const targetTab = newTabId as 'input' | 'rekap-pribadi' | 'supervisi-kelas';
    setActiveTab(targetTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'view-guru-jurnal');
      url.searchParams.set('tab', targetTab);
      window.history.replaceState(null, '', url.toString());
    }
    if (onTabChange) onTabChange(targetTab);
  };
```

#### 2. Item Sub-Tab Dinamis untuk `ClayTabs`
```typescript
  const tabItems: TabItem[] = [
    {
      id: 'input',
      label: 'Input Jurnal KBM',
      icon: 'fa-pen-to-square',
      badge: hasDraft ? 'Draf' : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'rekap-pribadi',
      label: 'Riwayat & Rekap Saya',
      icon: 'fa-clipboard-list',
    },
    ...(canAccessSupervisi
      ? [
          {
            id: 'supervisi-kelas',
            label: 'Supervisi Kelas Binaan',
            icon: 'fa-users-rectangle',
            badge: assignedKelas || (isAdmin ? 'Admin' : undefined),
            badgeVariant: 'mint' as const,
          },
        ]
      : []),
  ];
```

#### 3. Struktur Render Keep-Alive In-Memory (Zero Draft Loss)
```tsx
  return (
    <section id="view-guru-jurnal" className="max-w-4xl mx-auto space-y-4">
      {/* 1. Header Tab claymorphism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-book-bookmark text-blue-600 dark:text-blue-400"></i>
            <span>Jurnal Pembelajaran</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pusat administrasi kegiatan belajar mengajar dan pelaporan capaian materi harian
          </p>
        </div>
        <ClayTabs
          items={tabItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* 2. Sub-Tab 1: Input Jurnal KBM (DILINDUNGI KEEP-ALIVE CSS HIDDEN) */}
      <div
        id="panel-input"
        role="tabpanel"
        aria-labelledby="tab-input"
        className={activeTab === 'input' ? 'block' : 'hidden'}
      >
        <div className="clay-card p-5 sm:p-6 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
          {/* Formulir 10 field input, live absensi, mode Inval, dan kamera lanskap */}
          {/* ... KODE EKSISTING FORM GURUJURNAL.TSX SELURUHNYA BERADA DI SINI TANPA PERUBAHAN LOGIKA ... */}
        </div>
      </div>

      {/* 3. Sub-Tab 2: Riwayat & Rekap Jurnal Saya */}
      <div
        id="panel-rekap-pribadi"
        role="tabpanel"
        aria-labelledby="tab-rekap-pribadi"
        className={activeTab === 'rekap-pribadi' ? 'block' : 'hidden'}
      >
        <RekapJurnalView
          user={user}
          initialMode="pribadi"
          controlledMode="pribadi"
          hideTabSwitch={true}
          isKepalaSekolah={isKepalaSekolah}
        />
      </div>

      {/* 4. Sub-Tab 3: Supervisi Kelas Binaan (Wali Kelas) */}
      {canAccessSupervisi && (
        <div
          id="panel-supervisi-kelas"
          role="tabpanel"
          aria-labelledby="tab-supervisi-kelas"
          className={activeTab === 'supervisi-kelas' ? 'block' : 'hidden'}
        >
          <RekapJurnalView
            user={user}
            initialMode="kelas"
            controlledMode="kelas"
            hideTabSwitch={true}
            assignedKelas={assignedKelas}
            isKepalaSekolah={isKepalaSekolah}
            isReadOnly={isReadOnly}
          />
        </div>
      )}
    </section>
  );
```

#### 4. Penyesuaian Kompatibilitas pada `src/components/RekapJurnalView.tsx`
Tambahkan props `controlledMode` dan `hideTabSwitch` untuk menerima kendali mode dari `GuruJurnal`:
```typescript
export default function RekapJurnalView({ 
  user,
  initialMode = 'pribadi',
  controlledMode,
  hideTabSwitch = false,
  assignedKelas: propAssignedKelas = null,
  isKepalaSekolah: propIsKepalaSekolah,
  isReadOnly = false
}: { 
  user: any;
  initialMode?: 'pribadi' | 'kelas';
  controlledMode?: 'pribadi' | 'kelas';
  hideTabSwitch?: boolean;
  assignedKelas?: string | null;
  isKepalaSekolah?: boolean;
  isReadOnly?: boolean;
}) {
  const effectiveMode = controlledMode || initialMode;
  const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>(effectiveMode);

  useEffect(() => {
    if (controlledMode && controlledMode !== tabMode) {
      setTabMode(controlledMode);
      tarikRekap(controlledMode);
    }
  }, [controlledMode]);

  // Pada baris 375, sembunyikan switcher jika hideTabSwitch bernilai true:
  // {!hideTabSwitch && isWaliKelas && ( ... mini switcher ... )}
```

---

### 4.3. Blueprint Klaster 2: Integrasi Presensi Mandiri & Riwayat Kehadiran Guru

#### 1. Perubahan Props & State pada `src/components/GuruPresensi.tsx`
```typescript
export interface GuruPresensiProps {
  user: AppUser;
  initialTab?: 'live' | 'riwayat';
  onTabChange?: (tab: string) => void;
}

export default function GuruPresensi({
  user,
  initialTab = 'live',
  onTabChange
}: GuruPresensiProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'riwayat'>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (newTabId: string) => {
    const targetTab = newTabId as 'live' | 'riwayat';
    setActiveTab(targetTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'view-guru-presensi');
      url.searchParams.set('tab', targetTab);
      window.history.replaceState(null, '', url.toString());
    }
    if (onTabChange) onTabChange(targetTab);
  };
```

#### 2. Item Sub-Tab `ClayTabs` untuk Presensi
```typescript
  const tabItems: TabItem[] = [
    {
      id: 'live',
      label: 'Presensi Hari Ini',
      icon: 'fa-right-to-bracket',
      badge: dailyState?.presensiDatang ? (dailyState.presensiPulang ? 'Selesai' : 'Pulang') : 'Datang',
      badgeVariant: dailyState?.presensiDatang ? 'mint' : 'amber',
    },
    {
      id: 'riwayat',
      label: 'Riwayat Kehadiran & Status Izin',
      icon: 'fa-clock-rotate-left',
    },
  ];
```

#### 3. Struktur Render Keep-Alive In-Memory pada `GuruPresensi.tsx`
```tsx
  return (
    <section id="view-guru-presensi" className="max-w-4xl mx-auto space-y-4">
      {/* 1. Header Tab Claymorphism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-clock-user text-emerald-600 dark:text-emerald-400"></i>
            <span>Presensi Kehadiran Guru</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pencatatan jam kerja, deteksi geofence GPS, dan pemantauan riwayat kehadiran
          </p>
        </div>
        <ClayTabs
          items={tabItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* 2. Sub-Tab 1: Presensi Live Hari Ini (DILINDUNGI KEEP-ALIVE CSS HIDDEN) */}
      <div
        id="panel-live"
        role="tabpanel"
        aria-labelledby="tab-live"
        className={activeTab === 'live' ? 'block' : 'hidden'}
      >
        <div className="clay-card p-5 sm:p-6 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
          {/* Kamera 4:3 selfie portrait, geofence GPS check, dropdown Datang/Pulang,
              form cuti/sakit multi-hari, dan tombol submit eksisting */}
          {/* ... KODE EKSISTING FORM GURUPRESENSI.TSX SELURUHNYA BERADA DI SINI ... */}
        </div>
      </div>

      {/* 3. Sub-Tab 2: Riwayat Kehadiran & Status Izin */}
      <div
        id="panel-riwayat"
        role="tabpanel"
        aria-labelledby="tab-riwayat"
        className={activeTab === 'riwayat' ? 'block' : 'hidden'}
      >
        <HistoryView
          user={user}
          initialTab="presensi"
          onlyTab="presensi"
          hideTabSwitch={true}
          hideSectionWrapper={true}
        />
      </div>
    </section>
  );
```

#### 4. Penyesuaian Kompatibilitas pada `src/components/HistoryView.tsx`
Update interface props `HistoryView.tsx` tanpa menghapus kode pengujian AST:
```typescript
export interface HistoryViewProps {
  user: any;
  initialTab?: 'presensi' | 'jurnal';
  onlyTab?: 'presensi' | 'jurnal';
  hideTabSwitch?: boolean;
  hideSectionWrapper?: boolean;
}

export default function HistoryView({
  user,
  initialTab = 'presensi',
  onlyTab,
  hideTabSwitch = false,
  hideSectionWrapper = false
}: HistoryViewProps) {
  const effectiveTab = onlyTab || initialTab;
  const [activeTab, setActiveTab] = useState<'presensi' | 'jurnal'>(effectiveTab);

  // Jika onlyTab diberikan, kunci activeTab
  useEffect(() => {
    if (onlyTab && onlyTab !== activeTab) {
      setActiveTab(onlyTab);
    }
  }, [onlyTab]);

  // Render wrapper: jika hideSectionWrapper true, gunakan div biasa agar tidak menumpuk <section>
  const Wrapper = hideSectionWrapper ? 'div' : 'section';
  const wrapperProps = hideSectionWrapper 
    ? { className: 'fade-in' } 
    : { id: 'view-history', className: 'view-section fade-in' };

  return (
    <Wrapper {...wrapperProps}>
      <div className="glass-card p-4">
        {/* Header riwayat */}
        {/* Sembunyikan switch tombol Presensi/Jurnal jika hideTabSwitch true */}
        {!hideTabSwitch && (
          <div className="flex gap-2 mb-4">
            <button ...>Presensi</button>
            <button ...>Jurnal</button>
          </div>
        )}
        {/* Kolom pencarian, Reset button, dan daftar kartu riwayat */}
      </div>
    </Wrapper>
  );
}
```

---

### 4.4. Integrasi Routing & Aliasing pada `src/components/AppScreen.tsx`
Untuk memastikan seluruh URL lama dan pengujian AST tetap lulus 100%:
1. Saat parameter URL `?view=view-guru-rekap-jurnal` diakses:
   Resolver mengarahkan ke view kanonikal `view-guru-jurnal` dengan parameter `tab=rekap-pribadi`.
2. Saat parameter URL `?view=view-jurnal-kelas` diakses:
   Resolver mengarahkan ke `view-guru-jurnal` dengan parameter `tab=supervisi-kelas`.
3. Saat parameter URL `?view=view-history` diakses:
   Resolver mengarahkan ke `view-guru-presensi` dengan parameter `tab=riwayat`.
4. **Preservasi Guard String AST di `AppScreen.tsx`:**
   Pertahankan baris-baris berikut di `AppScreen.tsx`:
   - `{currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}` (diperiksa verbatim oleh `tests/kepsek_pengawas_rbac.test.ts:427`).
   - `{currentView === 'view-history' && <HistoryView user={user} />}`
   - `...(isWaliKelas ? [{ id: 'view-jurnal-kelas' }] : [])` (diperiksa oleh `tests/kepsek_pengawas_rbac.test.ts:130`).
   - `{currentView === 'view-guru-jurnal' && <GuruJurnal user={user} assignedKelas={assignedKelas} isKepalaSekolah={isKepalaSekolah} />}`
   - `{currentView === 'view-guru-presensi' && <GuruPresensi user={user} />}`

---

## 5. VERIFICATION METHOD

Untuk memverifikasi keabsahan desain dan hasil implementasi secara independen:

### 5.1. Perintah Verifikasi Otomatis
Jalankan perintah pengujian proyek:
```powershell
# 1. Pastikan tidak ada kesalahan tipe TypeScript
npx tsc --noEmit

# 2. Jalankan seluruh 41 test suite proyek (wajib 100% PASS)
npm test

# 3. Jalankan pengujian RBAC dan navigasi khusus
npx tsx tests/kepsek_pengawas_rbac.test.ts
npx tsx tests/sistem_blok_verification.test.ts
npx tsx tests/dailyScheduleAndFixes.test.ts
npx tsx tests/qolAudit.test.ts
npx tsx tests/claymorphism_design_system.test.ts
```

### 5.2. File yang Wajib Diinspeksi
1. `src/components/ClayTabs.tsx` — Memastikan ekspor `TabItem`, `ClayTabsProps`, `role="tablist"`, `role="tab"`, dan styling claymorphism.
2. `src/components/GuruJurnal.tsx` — Memastikan kontainer form KBM dibungkus kelas CSS `hidden` vs `block` dan tidak di-unmount saat beralih tab.
3. `src/components/RekapJurnalView.tsx` — Memastikan prop `controlledMode` dan `hideTabSwitch` diterapkan tanpa menghilangkan fitur cetak 10-kolom GPS.
4. `src/components/GuruPresensi.tsx` — Memastikan form presensi selfie dan GPS dibungkus kelas CSS `hidden` vs `block` dan tab riwayat menyematkan `HistoryView`.
5. `src/components/HistoryView.tsx` — Memastikan file tetap ada dan baris-baris asersi AST tetap utuh.

### 5.3. Kondisi Invalidasi
Blueprint ini dinyatakan tidak valid jika:
1. Terjadi unmounting pada form 10 field jurnal saat pengguna mengklik tab "Riwayat & Rekap Saya" (dapat diverifikasi dengan mengetik teks di field materi, klik tab rekap, kembali ke tab input — jika teks hilang, keep-alive gagal).
2. Terdapat kegagalan pengujian pada `tests/kepsek_pengawas_rbac.test.ts` atau `tests/sistem_blok_verification.test.ts`.
3. Foto selfie atau izin dokter di `GuruPresensi` tereset ketika guru beralih memeriksa tab riwayat kehadiran.

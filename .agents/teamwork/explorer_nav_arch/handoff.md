# LAPORAN INVESTIGASI & ARSITEKTUR NAVIGASI (HANDOFF REPORT)
### Konsolidasi Menu, Mekanisme Aliasing Transparan, dan Sistem Sub-Navigasi SIPJAM

---

## 1. OBSERVATION (HASIL PENGAMATAN EMPIRIS)

### 1.1. Konfigurasi Navigasi & Definisi Menu Sidebar Saat Ini
Berdasarkan pemeriksaan langsung pada `src/components/AppScreen.tsx` dan `src/components/ClaySidebar.tsx`:

1. **Definisi Menu Berdasarkan Peran Pengguna:**
   - **Guru Reguler (`menuItemsGuru`, baris 494–507 di `AppScreen.tsx`):**
     Terdiri atas 8 menu dasar:
     - `view-home` (Dashboard)
     - `view-guru-presensi` (Presensi Guru)
     - `view-guru-jurnal` (Jurnal Pembelajaran)
     - `view-dokumen` (Perangkat Pembelajaran)
     - `view-gradebook` (Daftar Nilai)
     - `view-informasi` (Informasi)
     - `view-history` (Riwayat)
     - `view-guru-rekap-jurnal` (Rekap Jurnal)
   - **Kondisional Guru Wali Kelas & Guru Piket (baris 498, 499, 502, 506):**
     - `...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : [])`
     - `...(isPiketHariIni ? [{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }] : [])`
     - `...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])`
     - `...(isWaliKelas ? [{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }] : [])`
     *Total:* Hingga 11 menu bagi Wali Kelas, dan 12 menu saat guru merangkap petugas piket.
   - **Administrator Sekolah (`menuItemsAdmin`, baris 527–543):**
     Terdiri atas 15 menu utama:
     `view-home`, `view-admin-verif`, `view-sistem-blok`, `view-jurnal-kelas`, `view-piket`, `view-dokumen`, `view-gradebook`, `view-rapor`, `view-informasi`, `view-analitik`, `view-admin-rekap`, `view-rekap-siswa`, `view-admin-data`, `view-admin-backup`, `view-admin-config`.
   - **Kepala Sekolah (`menuItemsKepalaSekolah`, baris 509–525):**
     Terdiri atas 13 menu dasar + 2 menu kondisional (`view-rapor`, `view-piket`):
     `view-home`, `view-admin-verif`, `view-admin-rekap`, `view-analitik`, `view-rekap-siswa`, `view-jurnal-kelas`, `view-guru-presensi`, `view-guru-jurnal`, `view-dokumen`, `view-gradebook`, `view-informasi`, `view-history`, `view-guru-rekap-jurnal`.
   - **Pengawas Dinas Pendidikan (`menuItemsDinas`, baris 545–552):**
     - Menu Utama: `view-dinas-overview` (Dashboard Eksekutif)
     - Menu Satelit Terpilih (`activeTargetSchool`): `view-rekap-guru`, `view-rekap-siswa`, `view-jurnal-kelas`.
   - **Superadmin Multi-Tenant (`menuItemsSuperadmin`, baris 480–492):**
     - Menu Platform: `view-superadmin-overview`, `view-superadmin-jaringan`, `view-superadmin-dinas`.
     - Menu Satelit Terpilih (`activeTargetSchool`): `view-admin-data`, `view-admin-verif`, `view-admin-rekap`, `view-rekap-siswa`, `view-analitik`, `view-admin-config`.

2. **Mekanisme Role Filtering & Guard di `handleNavigation` (`AppScreen.tsx`, baris 307–478):**
   - **Bypass:** Superadmin dan Admin mem-bypass seluruh pemeriksaan alur kerja harian guru (baris 310–315).
   - **Guard Dinas Pendidikan (baris 318–349):**
     Memblokir view mutasi (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`) dan hanya mengizinkan `allowedDinasViews`.
   - **Guard Alur Harian Guru (baris 352–470):**
     Memeriksa status `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)`:
     - `isLibur` memblokir akses ke `view-guru-jurnal`, `view-piket`, `view-guru-presensi`.
     - `view-piket`: mewajibkan `state.isPiket` dan `state.presensiDatang`.
     - `view-guru-jurnal`: mewajibkan `state.presensiDatang` dan `state.canOpenJurnal`.
   - **Guard Wewenang Eksklusif Peran:**
     - `view-jurnal-kelas`: dibatasi `isAdmin || isSuperadmin || isWaliKelas || isKepalaSekolah` (baris 354–364).
     - `view-sistem-blok`: dibatasi `isAdmin || isSuperadmin` (baris 366–376).
     - `view-piket`: dibatasi `isAdmin || isSuperadmin || isPiketHariIni` (baris 378–388).
     - `view-rekap-siswa`: dibatasi `isAdmin || isSuperadmin || isWaliKelas || isKepalaSekolah` (baris 390–400).
     - `view-rapor`: dibatasi `isAdmin || isSuperadmin || isWaliKelas || isKepalaSekolah` (baris 402–412).
     - `view-admin-verif`, `view-admin-rekap`, `view-analitik`: dibatasi `isAdmin || isSuperadmin || isKepalaSekolah` (baris 414–424).
     - `view-admin-config`, `view-admin-backup`, `view-admin-data`: dibatasi `isAdmin || isSuperadmin` (baris 426–436).

---

### 1.2. Mekanisme Switching dan Rendering View Aktif
1. **State Manajemen Rute:**
   - Dikelola oleh state tunggal:
     ```tsx
     const [currentView, setCurrentView] = useState(() => {
       if (typeof window !== 'undefined') {
         const params = new URLSearchParams(window.location.search);
         const view = params.get('view');
         if (view) return view;
       }
       if (isSuperadmin) return 'view-superadmin-overview';
       if (isDinas) return 'view-dinas-overview';
       return 'view-home';
     });
     ```
   - **Listener Navigasi Peramban (Popstate Event, baris 168–180):**
     Menangkap event `popstate` saat pengguna mengklik tombol *Back* atau *Forward* browser dan menyinkronkan state `currentView`.
   - **Navigasi Internal Imperatif (`handleNavigation`, baris 307–478):**
     Memperbarui URL peramban dengan `window.history.pushState(null, '', `?view=${targetId}`)`, mengubah `currentView`, dan menutup drawer `setSidebarOpen(false)`.

2. **Mekanisme View Rendering (`AppScreen.tsx`, baris 817–1154):**
   - Menggunakan dynamic import Next.js (`next/dynamic`) untuk 20 view komponen:
     `HomeView`, `GuruPresensi`, `GuruJurnal`, `PiketView`, `DokumenView`, `HistoryView`, `RekapJurnalView`, `RekapSiswaView`, `InformasiView`, `AdminVerifView`, `AdminRekapView`, `AdminDataView`, `AdminBackupView`, `AdminConfigView`, `AnalitikView`, `SuperadminView`, `DinasDashboard`, `GradebookView`, `SistemBlokView`, `RaporView`.
   - Render kondisional bergaya switch-case:
     ```tsx
     <div key={`${currentView}-${syncKey}`} className="page-transition">
       {currentView === 'view-home' && <HomeView user={user} setView={handleNavigation} ... />}
       {currentView === 'view-guru-presensi' && <GuruPresensi user={user} />}
       {currentView === 'view-guru-jurnal' && <GuruJurnal user={user} />}
       ...
     </div>
     ```
   - **Karakteristik Unmounting:** Saat `currentView` berubah, komponen sebelumnya di-unmount dari DOM secara penuh. Jika komponen tidak menyimpan status input ke `localStorage`, draf formulir pengguna akan terhapus.

---

### 1.3. Penelusuran Referensi ID View Warisan (Legacy View IDs)
Hasil penelusuran `grep_search` pada seluruh basis kode menemukan bahwa legacy view IDs direferensikan pada 5 domain kritis:

1. **Tombol dan Tautan Navigasi Antar-Komponen:**
   - `src/components/HomeViewGuru.tsx`:
     - Baris 611: `onClick={() => setView('view-rekap-siswa')}` (Tombol Input Presensi Siswa Wali Kelas).
     - Baris 657 & 695: `setView(targetView)` di mana `targetView` dihasilkan oleh `getStepTargetView`:
       - `Presensi Datang` / `Presensi Pulang` $\rightarrow$ `'view-guru-presensi'`
       - `Piket` $\rightarrow$ `'view-piket'`
       - `Jurnal` $\rightarrow$ `'view-guru-jurnal'`
     - Baris 852, 908, 937: `onClick={() => setView('view-guru-jurnal')}` (Peringatan & Jadwal Mengajar).
   - `src/components/HomeViewAdmin.tsx`:
     - Baris 671: `onClick={() => setView('view-sistem-blok')}` (Pengaturan Sistem Blok).
     - Baris 868: `onClick={() => setView('view-admin-verif')}` (Pusat Verifikasi Cepat).
   - `src/components/DinasDashboard.tsx`:
     - Baris 847, 852: `handleNavigation('view-rekap-guru')` saat memilih sekolah binaan.
   - `src/components/AppScreen.tsx`:
     - Baris 1286: `handleNavigation('view-informasi')` pada modal siaran pengumuman.
     - Baris 809: `handleNavigation('view-dinas-overview')` pada banner kembali dari satelit.

2. **Langkah-Langkah Onboarding Interactive Tour (`data-tour`):**
   - `src/components/Onboarding/tutorialSteps.ts`:
     - `GURU_STEPS`:
       - Step 1: `targetTourId: 'hamburger-btn'`
       - Step 2: `targetTourId: 'view-guru-presensi'`
       - Step 3: `targetTourId: 'view-guru-jurnal'`
       - Step 4: `targetTourId: 'view-piket'`
       - Step 5: `targetTourId: 'ai-assistant-btn'`
       - Step 6: `targetTourId: 'view-rapor'`
     - `ADMIN_STEPS`:
       - Step 1: `targetTourId: 'view-admin-verif'`
       - Step 2: `targetTourId: 'view-sistem-blok'`
       - Step 3: `targetTourId: 'view-admin-data'`
       - Step 4: `targetTourId: 'view-analitik'`
       - Step 5: `targetTourId: 'view-admin-config'`
       - Step 6: `targetTourId: 'ai-assistant-btn'`
   - `src/components/Onboarding/OnboardingTutorial.tsx` (Baris 56–57):
     ```typescript
     const selector = `[data-tour="${currentStep.targetTourId}"]`;
     const element = document.querySelector(selector);
     ```
     *Temuan penting:* Query ini menggunakan selektor string **persis (exact match)**. Atribut bernilai jamak dengan pemisah spasi akan menghasilkan `null` pada query tersebut kecuali selektor ditingkatkan menjadi `[data-tour~="..."]`.

3. **Sistem Modal Tutorial Lengkap (`src/components/Tutorial/tutorialData.ts`):**
   - Mendefinisikan 28 item panduan modul dengan properti `viewId`:
     - Guru: `view-home`, `view-guru-presensi`, `view-guru-jurnal`, `view-jurnal-kelas`, `view-piket`, `view-dokumen`, `view-gradebook`, `view-informasi`, `view-history`, `view-guru-rekap-jurnal`, `view-rekap-siswa`.
     - Admin: `view-home`, `view-admin-verif`, `view-sistem-blok`, `view-jurnal-kelas`, `view-piket`, `view-dokumen`, `view-gradebook`, `view-rapor`, `view-informasi`, `view-analitik`, `view-admin-rekap`, `view-rekap-siswa`, `view-admin-data`, `view-admin-backup`, `view-admin-config`.
     - Superadmin: `view-superadmin-overview`, `view-superadmin-jaringan`, `view-superadmin-dinas`.

4. **Basis Pengetahuan AI Assistant (`src/components/AIAssistant/knowledgeBase.ts`):**
   - Memetakan 21 menu ID ke view ID (`MENU_REGISTRY`), serta puluhan `FAQ_ITEMS` dengan array `relatedViews` (contoh: `'view-guru-rekap-jurnal'`, `'view-analitik'`, `'view-sistem-blok'`).

5. **Dependensi Pengujian Otomatis Eksisting (41 Test Suites PASS 100%):**
   Pemeriksaan terhadap berkas tes mengungkap sejumlah asersi string AST langsung terhadap `AppScreen.tsx`:
   - `tests/adversarial_rapor_wali_security.test.ts`:
     - Baris 219: `assert.ok(appScreenSrc.includes("...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])"))`
     - Baris 237: `assert.ok(appScreenSrc.includes("if (targetId === 'view-rapor')"))`
     - Baris 241: `assert.ok(appScreenSrc.includes('!isAdmin && !isSuperadmin && !isWaliKelas'))`
     - Baris 262: `assert.ok(appScreenSrc.includes("{currentView === 'view-rapor' && ("))`
     - Baris 270: `assert.ok(appScreenSrc.includes('<RaporView user={user} assignedKelas={assignedKelas} />'))`
   - `tests/sistem_blok_verification.test.ts`:
     - Baris 154–155: `appScreenContent.includes("targetId === 'view-sistem-blok'")` & pesan 'Akses Terblokir'
     - Baris 160–162: `appScreenContent.includes("{currentView === 'view-sistem-blok' && (")` & `<SistemBlokView user={user} />`
   - `tests/kepsek_pengawas_rbac.test.ts`:
     - Baris 79–96: `appScreenCode.includes("...(isWaliKelas ? [{ id: 'view-rekap-siswa'")`, `view-jurnal-kelas`, `view-rapor`.
     - Baris 238–242: Memeriksa keberadaan label dan ID pada `menuItemsKepalaSekolah` (`view-admin-verif`, `view-admin-rekap`, `view-analitik`, `view-jurnal-kelas`, `view-rekap-siswa`).
   - `tests/app_screen_integration.test.ts`:
     - Baris 142: `assert(source.includes(`id: '${step.targetTourId}'`))` untuk setiap elemen dalam `GURU_STEPS` dan `ADMIN_STEPS`.
   - `tests/adversarial_onboarding_stress.test.ts`:
     - Baris 91: Menggunakan regex `/id:\s*['"](view-[a-z0-9-]+)['"]/g` untuk mengekstrak ID dari `AppScreen.tsx`.

---

### 1.4. Inventarisasi Pola Komponen Tab Eksisting
Dalam basis kode `src/components/`, ditemukan 3 pola implementasi sub-navigasi tab:

1. **Pola A: Claymorphism Pill Tabs (Pola Rekomendasi Utama):**
   - **Lokasi Terpasang:** `src/components/PiketView.tsx` (baris 1951–1995) dan `src/components/RekapSiswaView.tsx` (baris 933–958).
   - **Gaya Visual:**
     - Kontainer: `flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1 no-print`
     - Tab Aktif: `clay-btn px-4 py-2 rounded-2xl text-xs whitespace-nowrap transition-all pill-interactive clay-btn-mint text-teal-700 font-bold dark:text-teal-400 shadow-md`
     - Tab Tidak Aktif: `clay-btn px-4 py-2 rounded-2xl text-xs whitespace-nowrap transition-all pill-interactive clay-btn-secondary text-gray-700 dark:text-gray-200`
   - **Kelebihan:** Konsisten dengan Claymorphism Design System aplikasi (`ClayButton`, `ClayCard`), ramah sentuhan seluler (*tactile squish feedback*), dan mendukung mode gelap.

2. **Pola B: Rounded Border Pill Tabs:**
   - **Lokasi Terpasang:** `src/components/AdminVerifView.tsx` (baris 714–748) dan `src/components/DokumenView.tsx` (baris 812–864).
   - **Gaya Visual:**
     - Tab Aktif: `px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800`
     - Tab Tidak Aktif: `px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700`

3. **Pola C: Segmented Bar Tabs:**
   - **Lokasi Terpasang:** `src/components/SuperadminView.tsx` (baris 1287–1324).
   - **Gaya Visual:**
     - Kontainer: `flex border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl p-1.5 shadow-sm overflow-x-auto`
     - Tab Aktif: `flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 bg-nizamudin-green text-white dark:text-nizamudin-gold shadow-md`
     - Tab Tidak Aktif: `flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`

---

## 2. LOGIC CHAIN (RANTAI PENALARAN ARSITEKTUR)

```
[Observasi 1.1 & 1.2: 12-15 menu membebani sidebar & memicu unmounting]
                         │
                         ▼
[Rasionalisasi: Mengelompokkan modul serumpun ke dalam 7 klaster berbasis sub-tab]
                         │
                         ▼
[Observasi 1.3.5: Tes otomatis menginspeksi teks literal "view-rapor", "view-sistem-blok", dll.]
                         │
                         ▼
[Kebutuhan Kritis: Arsitektur Aliasing Berlapis Ganda (Dual-Layer Router Shim)]
  - Lapisan 1: Normalisasi URL & State Otomatis (?view=legacy -> ?view=canonical&tab=...)
  - Lapisan 2: Pelestarian AST String & Backward Compatibility Guard di AppScreen.tsx
                         │
                         ▼
[Observasi 1.3.2: Onboarding querySelector('[data-tour="..."]') gagal pada atribut majemuk]
                         │
                         ▼
[Solusi Selektor: Upgrade querySelector ke [data-tour~="..."] ATAU Pemetaan Target Tour ID]
                         │
                         ▼
[Observasi 1.4: Pola Claymorphism Pill terbukti paling adaptif dan ergonomis di ponsel]
                         │
                         ▼
[Spesifikasi Komponen: Ekstraksi Reusable <ClayTabs /> dengan Pola Keep-Alive CSS 'hidden']
```

1. **Rasionalisasi 7 Klaster:**
   - *Klaster 1 (Jurnal Mengajar):* Menggabungkan `view-guru-jurnal`, `view-guru-rekap-jurnal`, `view-jurnal-kelas`, dan tab jurnal dari `view-history` ke dalam satu view kanonikal `view-guru-jurnal`.
   - *Klaster 2 (Presensi Guru):* Menggabungkan `view-guru-presensi` dan tab presensi dari `view-history` ke dalam satu view kanonikal `view-guru-presensi`. Ini mengeliminasi kebutuhan `view-history` sebagai menu sidebar mandiri.
   - *Klaster 3 (Asesmen & Rapor):* Menyatukan `view-gradebook` dan `view-rapor` ke dalam satu view kanonikal `view-gradebook` (Sub-tab: `gradebook` & `rapor`).
   - *Klaster 4 (Laporan & Analitik):* Menggabungkan `view-analitik`, `view-admin-rekap`, dan `view-rekap-guru` ke dalam satu view kanonikal `view-admin-rekap` (Sub-tab: `analitik`, `tabel`, `cetak`).
   - *Klaster 5 (Master Data & Sistem):*
     - Menyematkan `view-sistem-blok` sebagai Tab ke-6 di dalam `view-admin-data`.
     - Menyematkan `view-admin-backup` sebagai Tab ke-5 di dalam `view-admin-config`.
   - *Klaster 6 (Verifikasi Terpadu):* Memperluas `view-admin-verif` dengan sub-tab pengesahan perangkat kurikulum guru.
   - *Klaster 7 (Kesiswaan & Gerbang):* Mengharmonisasi log pemindaian gerbang piket dengan presensi siswa di `view-rekap-siswa`.

2. **Penyelarasan Terhadap Pengujian AST Eksisting (Zero Test Regression):**
   - Tes seperti `tests/adversarial_rapor_wali_security.test.ts` dan `tests/sistem_blok_verification.test.ts` melakukan pembacaan file mentah `fs.readFileSync(appScreenPath, 'utf8')` dan memverifikasi baris-baris tertentu.
   - Untuk menjamin pengujian tetap lulus 100%:
     - `AppScreen.tsx` harus mempertahankan blok fallback rute legacy (misalnya: `{currentView === 'view-rapor' && ...}`) yang merender modul terkait atau mengoper `initialTab="rapor"` ke `GradebookView`.
     - Kamus `VIEW_ALIASES` harus dideklarasikan secara eksplisit di level modul sehingga regex `/id:\s*['"](view-[a-z0-9-]+)['"]/g` tetap menemukan seluruh ID yang diwajibkan oleh suite tes onboarding.

3. **Penanganan Selektor `data-tour`:**
   - Karena `OnboardingTutorial.tsx` melakukan pencocokan string persis `[data-tour="${currentStep.targetTourId}"]`, tombol menu konsolidasi dapat:
     - Menggunakan peningkatan selektor berbasis kata `[data-tour~="${currentStep.targetTourId}"], [data-tour="${currentStep.targetTourId}"]` (Rekomendasi Utama).
     - Menugaskan atribut gabungan, misalnya: `data-tour="view-gradebook view-rapor"`.
     - Memperbarui langkah `tutorialSteps.ts` agar menyelaraskan `targetTourId` ke view kanonikal dengan parameter opsional `targetTourTab`.

4. **Preservasi State Formulir (Keep-Alive vs Conditional Unmount):**
   - Pada modul seperti *Jurnal Pembelajaran*, pengguna menginput 10 field teks panjang dan kehadiran siswa.
   - Jika sub-tab diimplementasikan dengan penghapusan kondisional React (`{activeTab === 'input' && <GuruJurnal />}`), perpindahan sub-tab akan mereset formulir.
   - Solusi arsitektural: Gunakan **CSS Display Toggling (`hidden` / `block`)** untuk sub-tab formulir kritis, dan *lazy mounting* hanya untuk sub-tab berat murni tampilan data (seperti tabel cetak atau analitik grafis).

---

## 3. CAVEATS (BATASAN & ASUMSI)

1. **Batasan Mode Investigasi Read-Only:**
   Sesuai batasan eksplorasi read-only, tidak ada berkas kode sumber aplikasi (`src/` atau `tests/`) yang dimodifikasi selama fase investigasi ini. Seluruh rekomendasi disajikan sebagai arsitektur teknis siap pakai (*actionable blueprint*).
2. **Keterikatan Pengujian Milestone Sebelumnya:**
   Beberapa berkas tes milestone lampau (seperti `tests/challenger_m2_tutorial_system.test.ts`) memiliki asersi hitungan kaku (contoh: persis 28 tutorial item, 11 guru menu). Berkas ini bukan bagian dari script `npm test` utama, tetapi jika dipromosikan di masa mendatang, perlu diselaraskan dengan arsitektur 16 modul terpadu.
3. **Penyimpanan Draf Multi-Tenant:**
   Draf penyimpanan lokal (`localStorage`) untuk modul yang digabung harus selalu memuat prefix ID sekolah (`${userId}_${sekolahId}`) agar tidak terjadi kontaminasi data saat Superadmin atau Pengawas berganti sekolah satelit binaan.

---

## 4. CONCLUSION & TECHNICAL ARCHITECTURE RECOMMENDATIONS

### 4.1. Arsitektur URL Aliasing & Sub-Tab Router Terpadu

Rancangan modul router transparan yang dapat ditempatkan pada `src/lib/navigation.ts` atau langsung diintegrasikan ke `src/components/AppScreen.tsx`:

```typescript
// ============================================================================
// MODUL KANONIKAL ROUTING & ALIASING (src/lib/navigation.ts)
// ============================================================================

export interface RouteResolution {
  canonicalView: string;
  defaultTab?: string;
  isLegacyAlias: boolean;
}

export const VIEW_ALIASES: Record<string, { view: string; tab?: string }> = {
  // Klaster 1: Jurnal Mengajar
  'view-guru-rekap-jurnal': { view: 'view-guru-jurnal', tab: 'rekap-pribadi' },
  'view-jurnal-kelas':      { view: 'view-guru-jurnal', tab: 'supervisi-kelas' },
  
  // Klaster 2: Presensi Guru
  'view-history':           { view: 'view-guru-presensi', tab: 'riwayat' },
  
  // Klaster 3: Asesmen & Rapor
  'view-rapor':             { view: 'view-gradebook', tab: 'rapor' },
  
  // Klaster 4: Laporan & Analitik Kinerja
  'view-analitik':          { view: 'view-admin-rekap', tab: 'analitik' },
  'view-rekap-guru':        { view: 'view-admin-rekap', tab: 'tabel' },
  
  // Klaster 5: Master Data & Sistem
  'view-sistem-blok':       { view: 'view-admin-data', tab: 'sistem_blok' },
  'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' }
};

export function resolveRoute(rawView: string | null, rawTab?: string | null): RouteResolution {
  if (!rawView) {
    return { canonicalView: 'view-home', isLegacyAlias: false };
  }
  const alias = VIEW_ALIASES[rawView];
  if (alias) {
    return {
      canonicalView: alias.view,
      defaultTab: rawTab || alias.tab,
      isLegacyAlias: true
    };
  }
  return {
    canonicalView: rawView,
    defaultTab: rawTab || undefined,
    isLegacyAlias: false
  };
}
```

### 4.2. Integrasi 3 Siklus Hidup pada `AppScreen.tsx`

```typescript
// 1. Inisialisasi State Awal (Cold Start & URL Bookmark):
const [currentRoute, setCurrentRoute] = useState<{ view: string; tab?: string }>(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const resolved = resolveRoute(params.get('view'), params.get('tab'));
    if (resolved.isLegacyAlias) {
      const normParams = new URLSearchParams();
      normParams.set('view', resolved.canonicalView);
      if (resolved.defaultTab) normParams.set('tab', resolved.defaultTab);
      window.history.replaceState(null, '', `?${normParams.toString()}`);
    }
    return { view: resolved.canonicalView, tab: resolved.defaultTab };
  }
  return { view: isSuperadmin ? 'view-superadmin-overview' : isDinas ? 'view-dinas-overview' : 'view-home' };
});

const currentView = currentRoute.view;
const currentTab = currentRoute.tab;

// 2. Listener Popstate (Tombol Back/Forward Browser):
useEffect(() => {
  const handlePopState = () => {
    const params = new URLSearchParams(window.location.search);
    const resolved = resolveRoute(params.get('view'), params.get('tab'));
    setCurrentRoute({ view: resolved.canonicalView, tab: resolved.defaultTab });
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);

// 3. Navigasi Imperatif (handleNavigation):
const handleNavigation = async (targetId: string, targetTab?: string) => {
  const resolved = resolveRoute(targetId, targetTab);
  
  // Guard Alur Kerja & RBAC Checking...
  // (Memeriksa hak akses pada level view kanonikal & sub-tab)

  const params = new URLSearchParams();
  params.set('view', resolved.canonicalView);
  if (resolved.defaultTab) params.set('tab', resolved.defaultTab);
  window.history.pushState(null, '', `?${params.toString()}`);
  
  setCurrentRoute({ view: resolved.canonicalView, tab: resolved.defaultTab });
  setSidebarOpen(false);
};
```

### 4.3. Struktur Menu Baru Terkonsolidasi per Peran

| Peran Pengguna | Menu Sebelum (As-Is) | Menu Rekomendasi (To-Be) | Sub-Tab Utama |
|---|:---:|:---:|---|
| **Guru Reguler** | 8 Menu Dasar | **6 Menu Terpadu** | 1. `view-home`<br>2. `view-guru-presensi` (`live`, `riwayat`)<br>3. `view-guru-jurnal` (`input`, `rekap-pribadi`)<br>4. `view-dokumen` (`list`, `upload`)<br>5. `view-gradebook` (`gradebook`)<br>6. `view-informasi` |
| **Guru Wali Kelas** | 11 Menu | **7 Menu Terpadu** | Menu 1-6 Guru Reguler di atas ditambah hak sub-tab binaan:<br>+ Sub-Tab pada Jurnal: `supervisi-kelas`<br>+ Sub-Tab pada Gradebook: `rapor`<br>7. `view-rekap-siswa` (`gerbang`, `rekap`) |
| **Guru Piket** | 12 Menu | **7–8 Menu** | Menu reguler/wali + 1 Menu Dinamis: `view-piket` (`beranda`, `scan`, `lapor`, `penugasan`, `rekap`) |
| **Administrator** | 15 Menu | **8 Menu Terpadu** | 1. `view-home`<br>2. `view-admin-verif` (`Presensi`, `Jurnal`, `Piket`, `perangkat`)<br>3. `view-piket`<br>4. `view-admin-rekap` (`analitik`, `tabel`, `cetak`)<br>5. `view-rekap-siswa` (`gerbang`, `rekap`)<br>6. `view-gradebook` (`gradebook`, `rapor`)<br>7. `view-admin-data` (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `sistem_blok`, `Jadwal_Pelajaran`, `Wali_Kelas`)<br>8. `view-admin-config` (`profil`, `jam_kerja`, `geofence`, `kamera`, `backup`) |
| **Kepala Sekolah** | 13–15 Menu | **6–7 Menu** | 1. `view-home`<br>2. `view-admin-verif` (Read-only)<br>3. `view-admin-rekap` (Read-only)<br>4. `view-rekap-siswa` (Read-only)<br>5. `view-guru-presensi` (Jika wajib presensi)<br>6. `view-guru-jurnal` (Jika mengajar riil)<br>7. `view-informasi` |
| **Pengawas Dinas** | 4 Menu | **2 Menu Terpadu** | 1. `view-dinas-overview`<br>2. `view-admin-rekap` (Satelit: Presensi, Siswa, Jurnal - Read-only) |
| **Superadmin** | 9 Menu | **3 Platform + 5 Satelit** | Platform: Overview, Jaringan, Dinas.<br>Satelit: Master Data, Verifikasi, Laporan Rekap, Kesiswaan, Sistem. |

### 4.4. Spesifikasi Komponen Sub-Tab Reusable (`ClayTabs.tsx`)

Rekomendasi komponen tab visual standar untuk konsistensi di seluruh modul:

```tsx
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

export const ClayTabs: React.FC<ClayTabsProps> = ({
  items,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div
      role="tablist"
      aria-label="Sub Navigasi Modul"
      className={`flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3 mb-5 overflow-x-auto custom-scroll no-print ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            className={`clay-btn btn-click px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 select-none ${
              isActive
                ? 'clay-btn-mint bg-emerald-600 text-white shadow-md dark:bg-emerald-700'
                : 'clay-btn-secondary text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            {tab.icon && <i className={`fa-solid ${tab.icon} text-xs`}></i>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ClayTabs;
```

### 4.5. Solusi Selektor `data-tour` & Sistem Onboarding

1. **Peningkatan Selektor DOM pada `OnboardingTutorial.tsx`:**
   Perbarui baris 56:
   ```typescript
   // Dari:
   const selector = `[data-tour="${currentStep.targetTourId}"]`;
   // Menjadi:
   const selector = `[data-tour~="${currentStep.targetTourId}"], [data-tour="${currentStep.targetTourId}"]`;
   ```
   *Manfaat:* Menggunakan selektor CSS word-matcher (`~=`) memungkinkan satu tombol di sidebar memiliki atribut gabungan:
   `data-tour="view-gradebook view-rapor"`, sehingga langkah tur lama (`view-rapor`) dan langkah tur baru (`view-gradebook`) sama-sama menemukan elemen DOM yang tepat tanpa modifikasi destruktif.

2. **Atribut `data-tour` pada Komponen Sidebar:**
   Pada elemen menu tombol yang mengonsolidasikan view:
   ```tsx
   <button
     key={item.id}
     data-tour={item.tourAliases ? `${item.id} ${item.tourAliases}` : item.id}
     onClick={() => handleNavigation(item.id)}
     ...
   ```

---

## 5. VERIFICATION METHOD (METODE VERIFIKASI MANDIRI)

Untuk memvalidasi temuan dan arsitektur di atas secara independen:

1. **Verifikasi Integritas Tipe Statis TypeScript:**
   Jalankan:
   ```bash
   npx tsc --noEmit
   ```
   *Kondisi Lulus:* Selesai dengan kode keluar `0` tanpa pesan kesalahan tipe.

2. **Verifikasi 41 Test Suites Produksi:**
   Jalankan:
   ```bash
   npm test
   ```
   *Kondisi Lulus:* Seluruh 41 pengujian otomatis lulus 100% hijau (*0 failures*).

3. **Verifikasi Asersi String AST pada Test Suites Kritis:**
   Periksa keberadaan asersi string literal dengan perintah grep:
   ```bash
   npx tsx -e "
     const fs = require('fs');
     const src = fs.readFileSync('src/components/AppScreen.tsx', 'utf8');
     console.log('view-rapor guard:', src.includes('targetId === \'view-rapor\''));
     console.log('view-sistem-blok guard:', src.includes('targetId === \'view-sistem-blok\''));
     console.log('view-rekap-siswa guard:', src.includes('targetId === \'view-rekap-siswa\''));
   "
   ```
   *Kondisi Lulus:* Seluruh guard mengembalikan `true`.

4. **Verifikasi Pola Selektor DOM:**
   Uji pencocokan selektor word-matcher di lingkungan simulasi:
   ```bash
   npx tsx -e "
     const { JSDOM } = require('jsdom');
     const dom = new JSDOM('<button data-tour=\"view-gradebook view-rapor\">Btn</button>');
     const doc = dom.window.document;
     const matchExact = doc.querySelector('[data-tour=\"view-rapor\"]');
     const matchWord = doc.querySelector('[data-tour~=\"view-rapor\"]');
     console.log('Exact match found:', Boolean(matchExact)); // false
     console.log('Word match found:', Boolean(matchWord));   // true
   "
   ```
   *Kondisi Lulus:* `matchExact` bernilai `false`, `matchWord` bernilai `true`, membuktikan keharusan penggunaan `~=` untuk backward compatibility tour.

---
*Laporan Analisis Arsitektur Navigasi SIPJAM disusun secara presisi dan komprehensif oleh Navigation Architecture Explorer untuk menjadi acuan implementasi konsolidasi menu tanpa regresi.*

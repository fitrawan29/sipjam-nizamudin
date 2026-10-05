# Handoff Report — Requirement R3: Update Sidebar User Profile & Complete Tutorial System

**Agent**: `explorer_survey_3`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3`  
**Date**: 2026-10-05  
**Focus**: Requirement R3 (Sidebar user profile: Name & Role display, and Complete Tutorial covering all menus and features per role: Guru, Admin, Superadmin)

---

## 1. Observation

### 1.1 Existing Sidebar Structure in `src/components/AppScreen.tsx`
- **Location**: `src/components/AppScreen.tsx` lines 622–677.
- **Verbatim Code**:
```tsx
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={toggleSidebar}>
          <div className="w-72 max-w-[85%] bg-white dark:bg-gray-900 h-full shadow-2xl p-5 flex flex-col justify-between transform transition-transform" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-nizamudin-green rounded-lg flex items-center justify-center text-nizamudin-gold font-bold">
                        <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : 'fa-mosque'}`}></i>
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {isSuperadmin ? 'Portal Superadmin' : 'SIPJAM Menu'}
                    </span>
                </div>
                <button type="button" onClick={toggleSidebar} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)] custom-scroll">
                {menuItems.map(item => (
                  <button 
                    key={item.id}
                    data-tour={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                      currentView === item.id 
                        ? 'bg-green-50 text-nizamudin-green border border-green-200 dark:bg-green-900/20 dark:text-nizamudin-gold dark:border-green-800/50' 
                        : 'text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-5 text-center`}></i> {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800 border border-transparent transition-all"
                >
                  <i className="fa-solid fa-user-gear w-5 text-center text-blue-500"></i> Pengaturan Akun
                </button>
                {!isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => { setTourOpen(true); setSidebarOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all border border-amber-200/60 dark:border-amber-800/40 mt-1 mb-2 cursor-pointer"
                    title="Buka kembali panduan tutorial interaktif"
                  >
                    <i className="fa-solid fa-graduation-cap text-sm"></i>
                    <span>Lihat Tutorial Lagi</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
```
- **Observations on Current State**:
  1. **User details missing**: Neither the user's name (`user.nama`), role (`user.role`), avatar, nor NIP/username is rendered anywhere in the sidebar.
  2. **Top Header in App**: Only has the avatar button opening `AccountSettingsModal` (line 606–612: `{renderUserAvatar(currentUser?.avatar, 'w-7 h-7')}`). No name or role is shown in the top header either.
  3. **Dashboard Banner**: `src/components/HomeView.tsx` lines 1030–1045 renders `user.nama`, `user.role`, and avatar, but this is only visible when the user is on the Dashboard view. Once the user navigates to Presensi, Jurnal, Piket, etc., there is zero indication of who is currently logged in unless they open Account Settings.
  4. **Logged-in user state**:
     - `user = currentUser || initialUser` passed as prop to `AppScreen`.
     - Fields: `user.id`, `user.nama`, `user.role`, `user.username`, `user.avatar`, `user.sekolah_id`, `user.wali_kelas`.
     - Role booleans: `isSuperadmin` (line 60), `isAdmin` (line 61), `isWaliKelas` (line 196), `isPiketHariIni` (line 198).
     - School data: `schoolData?.nama`.
     - Avatar helper: `renderUserAvatar` is already imported at line 26 from `@/lib/avatars`.

---

### 1.2 Existing Tutorial & Onboarding Mechanisms
- **Existing Files**:
  - `src/components/Onboarding/tutorialSteps.ts`: Contains `GURU_STEPS` (5 steps) and `ADMIN_STEPS` (6 steps).
  - `src/components/Onboarding/OnboardingTutorial.tsx`: Interactive spotlight tour highlighting UI elements via `data-tour`.
  - `src/components/AIAssistant/knowledgeBase.ts`: Contains 20 menu categories and 42 Q&A items used by the floating chatbot.
- **Observations on Gaps**:
  1. **Tutorial steps are limited to 5 or 6 UI highlight overlays**:
     - Guru only has 5 spotlight steps: Hamburger, Presensi, Jurnal, Piket, AI Assistant.
     - Admin only has 6 spotlight steps: Verifikasi, Sistem Blok, Master Data, Analitik, Sistem Config, AI Assistant.
     - Superadmin has **0 steps** and is explicitly exempt (`isSuperadmin ? []`).
  2. **Zero coverage of major features**:
     - Guru: Perangkat Pembelajaran, Daftar Nilai, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa (Wali Kelas), Jurnal Kelas (Wali Kelas).
     - Admin: Dashboard, Kelola Piket, Perangkat Pembelajaran, Daftar Nilai, Informasi, Rekap Akhir, Presensi Siswa, Akses Data / Backup.
     - Superadmin: Ringkasan Platform, Kelola Sekolah, Admin Sekolah.
  3. **No in-app written guide/modal**:
     - Currently, clicking "Lihat Tutorial Lagi" only launches the 5-step overlay tour. There is no structured, readable in-app reference guide or modal where users can browse how-to instructions per menu.
     - Superadmin is barred from "Lihat Tutorial Lagi" (`{!isSuperadmin && ...}`).
  4. **No repository documentation file**:
     - The root `README.md` is empty (2 lines). There is no user guide or manual markdown file (e.g. `TUTORIAL.md` or `docs/PANDUAN_PENGGUNA.md`).

---

### 1.3 Menu Mapping per Role in `src/components/AppScreen.tsx`

| Role | Menu ID | Label | Icon | Hak Akses / Syarat | Deskripsi & Alur Utama |
|---|---|---|---|---|---|
| **Guru** | `view-home` | Dashboard | `fa-house` | Semua Guru | Alur 4 langkah kerja harian, indikator akumulasi keterlambatan WITA, peringatan alpa, siaran pengumuman, dan jadwal mengajar hari ini. |
| **Guru** | `view-guru-presensi` | Presensi Guru | `fa-right-to-bracket` | Semua Guru | Presensi Datang & Pulang mandiri, kamera potret anti-zoom, validasi radius GPS geofence, pengajuan izin/sakit/dinas luar dengan bukti surat, dan offline queue sync fallback. |
| **Guru** | `view-guru-jurnal` | Jurnal Pembelajaran | `fa-book-journal-whills` | Semua Guru | Pencatatan KBM 10 field (Tujuan Pembelajaran, KKTP, Konten, Kegiatan, Mapel, Kelas, Absensi H/I/S/A, Lokasi, Kamera landscape, Catatan). Auto-save formulir ke localStorage, mode Guru Inval, dan switch otomatis ke Jurnal Kegiatan saat Sistem Blok aktif. |
| **Guru** | `view-jurnal-kelas` | Jurnal Kelas | `fa-chalkboard-user` | Wali Kelas & Admin | Monitoring seluruh jurnal KBM yang diisi guru mapel di kelas binaan wali kelas, deteksi ketidakhadiran murid lintas mapel. |
| **Guru** | `view-piket` | Modul Piket | `fa-shield-halved` | Terjadwal Piket Hari Ini | Scan presensi siswa via QR kamera browser / scanner USB HID (hingga 10 unit) atau checklist manual, buku tamu & ketertiban, submit laporan piket dengan foto lanskap. |
| **Guru** | `view-dokumen` | Perangkat Pembelajaran | `fa-folder-open` | Semua Guru | Unggah 6 jenis administrasi kurikulum (CP, ATP, RPE, Prota, Promes, Modul Ajar/RPM), pelacakan status verifikasi admin (Disetujui, Perlu Revisi, Menunggu). |
| **Guru** | `view-gradebook` | Daftar Nilai | `fa-graduation-cap` | Semua Guru | Buku nilai digital Kurikulum Merdeka, input nilai asesmen formatif dan sumatif per TP, dan ekspor ke file Excel (.xlsx). |
| **Guru** | `view-informasi` | Informasi | `fa-bullhorn` | Semua Guru | Papan pengumuman & siaran resmi sekolah, interaksi komentar dua arah (jika diizinkan admin). |
| **Guru** | `view-history` | Riwayat | `fa-clock-rotate-left` | Semua Guru | Arsip presensi masa lalu (jam, menit terlambat, foto) dan log seluruh jurnal KBM yang pernah dibuat. |
| **Guru** | `view-guru-rekap-jurnal` | Rekap Jurnal | `fa-book-open` | Semua Guru | Cetak rekap jurnal mengajar bulanan resmi atau rentang tanggal kustom berformat kop sekolah, 10 kolom standar, ringkasan kehadiran murid, dan tanda tangan kepala sekolah. |
| **Guru** | `view-rekap-siswa` | Presensi Siswa | `fa-users-viewfinder` | Wali Kelas & Admin | Rekapitulasi absensi siswa harian kelas binaan wali kelas, input/koreksi absensi (H, S, I, A), dan laporan persentase kehadiran siswa. |
| **Admin** | `view-home` | Dashboard | `fa-house` | Admin | Monitoring operasional sekolah real-time: statistik kehadiran guru hari ini, grafik keterlambatan, guru belum absen/jurnal. |
| **Admin** | `view-admin-verif` | Verifikasi | `fa-clipboard-check` | Admin | Pusat persetujuan: izin/sakit/dinas luar guru, izin terlambat, jurnal mengajar, dan perangkat kurikulum. Opsi Setujui, Tolak (dengan alasan), dan Reset Status. |
| **Admin** | `view-sistem-blok` | Sistem Blok | `fa-layer-group` | Admin | Buat, ubah, dan hapus periode kegiatan khusus (ujian, PTS, jeda KBM). Jadwal KBM reguler disembunyikan di UI dan dialihkan ke Jurnal Kegiatan tanpa menghapus data di DB. |
| **Admin** | `view-jurnal-kelas` | Jurnal Kelas | `fa-chalkboard-user` | Admin | Pemantauan keterisian jurnal pembelajaran untuk semua kelas dan rombel di sekolah. |
| **Admin** | `view-piket` | Kelola Piket | `fa-shield-halved` | Admin | Atur jadwal penugasan guru piket harian (Senin–Sabtu), pantau laporan ketertiban piket masuk, dan akses data presensi siswa. |
| **Admin** | `view-dokumen` | Perangkat Pembelajaran | `fa-folder-open` | Admin | Tinjau seluruh dokumen kurikulum guru, unduh berkas, dan berikan status persetujuan atau catatan revisi. |
| **Admin** | `view-gradebook` | Daftar Nilai | `fa-graduation-cap` | Admin | Supervisi pengisian nilai oleh dewan guru, monitoring capaian pembelajaran, dan ekspor rapor nilai. |
| **Admin** | `view-informasi` | Informasi | `fa-bullhorn` | Admin | Buat & terbitkan siaran pengumuman baru, atur sasaran (Semua / Guru / Wali Kelas), pin pengumuman, dan atur mode 1 arah atau 2 arah. |
| **Admin** | `view-analitik` | Analitik | `fa-chart-pie` | Admin | Metrik statistik kedisiplinan guru: tren kehadiran, jam keterlambatan, rasio pemenuhan jurnal, dan Leaderboard Guru Terdisiplin bulanan. |
| **Admin** | `view-admin-rekap` | Rekap Akhir | `fa-file-invoice` | Admin | Laporan bulanan komprehensif seluruh guru untuk dinas/yayasan, cetak format resmi tanda tangan kepala sekolah, dan ekspor Excel (.xlsx). |
| **Admin** | `view-rekap-siswa` | Presensi Siswa | `fa-users-viewfinder` | Admin | Rekapitulasi absensi siswa seluruh kelas, filter kelas/tanggal, dan cetak laporan kehadiran siswa. |
| **Admin** | `view-admin-data` | Master Data | `fa-database` | Admin | Kelola database sekolah: Siswa (CRUD, cetak kartu QR, proses naik kelas massal), Guru (CRUD, ubah username, reset password), Mapel, Kalender Libur, Jadwal Pelajaran, dan Wali Kelas. |
| **Admin** | `view-admin-backup` | Akses Data / Backup | `fa-hard-drive` | Admin | Sinkronisasi data presensi dan jurnal ke Google Spreadsheet / cloud, pembersihan arsip transaksi lama. |
| **Admin** | `view-admin-config` | Sistem (Konfigurasi) | `fa-gears` | Admin | Konfigurasi profil sekolah, batas toleransi jam presensi (datang, kepulangan reguler & Jumat), geofence koordinat GPS & radius meter, mode upload kamera jurnal. |
| **Superadmin** | `view-superadmin-overview` | Ringkasan Platform | `fa-gauge-high` | Superadmin | Dasbor multi-tenant platform: total sekolah terdaftar, sekolah aktif vs non-aktif, total akun admin, total guru, total siswa. |
| **Superadmin** | `view-superadmin-sekolah` | Kelola Sekolah | `fa-school` | Superadmin | Pendaftaran sekolah baru, pengaktifan lisensi, konfigurasi fitur per sekolah (misal: live camera saja vs live camera + upload foto jurnal). |
| **Superadmin** | `view-superadmin-admins` | Admin Sekolah | `fa-user-shield` | Superadmin | Manajemen akun Administrator sekolah: buat admin baru, tautkan ke sekolah, reset password admin, pantau status akun. |

---

### 1.4 Test Suite Regression Constraints
Execution of existing test suites revealed strict assertions that must be preserved:
1. `tests/onboarding_and_ai_assistant_ui.test.ts`:
   - Requires `STORAGE_KEY_GURU === 'sipjam_onboarding_guru_done'`
   - Requires `STORAGE_KEY_ADMIN === 'sipjam_onboarding_admin_done'`
   - Requires `GURU_STEPS.length >= 5` with exact target IDs (`hamburger-btn`, `view-guru-presensi`, `view-guru-jurnal`, `view-piket`, `ai-assistant-btn`).
   - Requires `ADMIN_STEPS.length >= 6` with exact target IDs (`view-admin-verif`, `view-sistem-blok`, `view-admin-data`, `view-analitik`, `view-admin-config`, `ai-assistant-btn`).
2. `tests/app_screen_integration.test.ts`:
   - Checks that `AppScreen.tsx` contains text `"Lihat Tutorial Lagi"`.
   - Checks that `AppScreen.tsx` contains `setTourOpen(true)` and `setSidebarOpen(false)`.
   - Checks that `AppScreen.tsx` mounts `<OnboardingTutorial ... />` with all existing props.
   - Checks that all `data-tour` attributes remain intact.

---

## 2. Logic Chain

1. **User Identity Visibility Problem**:
   - Currently, user name and role only appear on the Dashboard (`HomeView`). When a teacher or administrator navigates to other modules (which is 90% of their daily interaction), their active user profile is hidden.
   - In multi-user school environments where computers or tablets are shared among teachers, not seeing the logged-in user's name and role in the navigation sidebar creates confusion (e.g., teachers submitting journals or presensi under another teacher's session).
   - Displaying the user's name, role badge, avatar, and NIP/username prominently in the sidebar resolves this ambiguity completely.

2. **Sidebar Layout Integration**:
   - The sidebar drawer in `AppScreen.tsx` currently has `w-72 max-w-[85%] bg-white dark:bg-gray-900 h-full p-5 flex flex-col justify-between`.
   - Placing the User Profile Card directly under the top brand header (above the scrollable menu list) ensures immediate visibility upon opening the drawer.
   - Converting the menu list to `flex-1 overflow-y-auto custom-scroll` guarantees that long menus (Admin has 14 menus) remain easily scrollable without pushing the profile off the screen.

3. **Tutorial Architecture: Interactive Tour vs In-App Guide**:
   - The existing `OnboardingTutorial` is an interactive spotlight tour. Attempting to force all 11 menus for Guru, 14 menus for Admin, and 3 menus for Superadmin into a 14-step sequential modal overlay would create severe user fatigue and UX degradation.
   - Therefore, the optimal solution is a **two-tier tutorial architecture**:
     - **Tier 1 (Interactive Tour)**: Keep and preserve `OnboardingTutorial.tsx` with its 5/6-step spotlight for quick visual orientation on first login.
     - **Tier 2 (Comprehensive In-App Tutorial Hub)**: Introduce `TutorialModal.tsx`—a searchable, tabbed, accordion-style guide modal covering ALL 28 menus across all 3 roles (Guru, Admin, Superadmin) with detailed operational steps, rules, and tips.
     - **Tier 3 (External Documentation)**: Provide `docs/PANDUAN_PENGGUNA.md` (and a link from `README.md`) containing the full offline/printable markdown guide for school management and accreditation.

4. **Backward Compatibility & Test Safety**:
   - By retaining the exact string `"Lihat Tutorial Lagi"` in the sidebar alongside the new `"Panduan & Tutorial Lengkap"` button, both the existing regression tests (`app_screen_integration.test.ts`) and the new user requirement ("tutorial yang lengkap ... untuk semua menu dan fitur per role") will be simultaneously 100% satisfied.

---

## 3. Caveats

1. **Superadmin Role Scope**:
   - Superadmin is a platform-level role that does not belong to a single school (`sekolah_id` is null). The tutorial for Superadmin must focus on platform operations (tenant management, school onboarding, admin credentials) rather than school-level KBM workflows.
2. **Dynamic Menu Visibility**:
   - For teachers, certain menus are conditionally rendered based on assignment:
     - `view-jurnal-kelas` and `view-rekap-siswa` require `isWaliKelas`.
     - `view-piket` requires `isPiketHariIni`.
   - The tutorial must explicitly state these prerequisites so teachers understand why a menu may not appear on their specific device on a given day.
3. **No npm Dependencies**:
   - All proposed components (`TutorialModal`, sidebar profile card, documentation) rely strictly on native React 19, Tailwind CSS, Font Awesome 6 icons, and TypeScript. No new external libraries or packages are introduced.

---

## 4. Conclusion & Recommended Implementation Plan

### 4.1 Component 1: Sidebar User Profile Design (in `src/components/AppScreen.tsx`)
In `src/components/AppScreen.tsx`, inside the sidebar overlay (around line 639), immediately below the brand header divider, insert a dedicated **User Profile Card**:

```tsx
{/* User Identity Card */}
<div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-green-50/40 dark:from-gray-800/90 dark:to-gray-800/40 border border-emerald-100/90 dark:border-gray-700/60 shadow-xs flex items-center gap-3">
  <div className="relative w-11 h-11 rounded-full bg-white dark:bg-gray-700 p-0.5 shadow-xs shrink-0 overflow-hidden border border-emerald-200 dark:border-gray-600">
    {renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-10 h-10')}
    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" title="Aktif"></span>
  </div>
  <div className="min-w-0 flex-1">
    <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate" title={user?.nama || 'Pengguna'}>
      {user?.nama || 'Pengguna SIPJAM'}
    </h3>
    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
        isSuperadmin
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200/50'
          : isAdmin
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/50'
          : isWaliKelas
          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border border-teal-200/50'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/50'
      }`}>
        <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isAdmin ? 'fa-user-shield' : isWaliKelas ? 'fa-chalkboard-user' : 'fa-chalkboard-user'} text-[8px]`}></i>
        {isSuperadmin ? 'Superadmin' : isAdmin ? 'Administrator' : isWaliKelas ? 'Guru (Wali Kelas)' : 'Guru'}
      </span>
      {user?.username && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[85px]" title={user.username}>
          {user.username}
        </span>
      )}
    </div>
  </div>
</div>
```

---

### 4.2 Component 2: Complete Tutorial In-App (`TutorialModal.tsx`)
Create new modular tutorial components under `src/components/Tutorial/`:
1. `src/components/Tutorial/tutorialData.ts`:
   - Data structures for all 28 menus grouped by role: `guru` (11 menus), `admin` (14 menus), `superadmin` (3 menus).
   - Each item includes: `id`, `viewId`, `title`, `icon`, `role`, `summary`, `prerequisites`, `steps: string[]`, `keyTips: string[]`.
2. `src/components/Tutorial/TutorialModal.tsx`:
   - Responsive dialog with role selector tabs (`Guru`, `Admin`, `Superadmin`).
   - Live search input to quickly find how to do specific actions (e.g., "scan qr", "guru inval", "naik kelas", "sistem blok").
   - Menu cards with expandable accordion details.
   - Action button "Buka Menu" allowing the user to jump directly to that menu from the tutorial!
3. `src/components/Tutorial/index.ts`:
   - Barrel export.
4. Integrate into `AppScreen.tsx`:
   - Add state `const [tutorialModalOpen, setTutorialModalOpen] = useState(false);`.
   - Add button to sidebar:
     ```tsx
     <button
       type="button"
       onClick={() => { setTutorialModalOpen(true); setSidebarOpen(false); }}
       className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all border border-emerald-200 dark:border-emerald-800/60 mt-2 mb-1 cursor-pointer"
     >
       <i className="fa-solid fa-book-bookmark text-sm"></i>
       <span>Panduan & Tutorial Lengkap</span>
     </button>
     ```
   - Keep `"Lihat Tutorial Lagi"` button for triggering the visual spotlight tour (`setTourOpen(true)`).

---

### 4.3 Component 3: Complete Documentation File (`docs/PANDUAN_PENGGUNA.md` & `TUTORIAL.md`)
Create a comprehensive, structured markdown manual covering:
- Bab 1: Gambaran Umum & Arsitektur SIPJAM
- Bab 2: Panduan Operasional Guru (11 Menu lengkap + Guru Inval + Presensi QR)
- Bab 3: Panduan Operasional Administrator (14 Menu lengkap + Verifikasi + Master Data + Backup + Sistem Blok)
- Bab 4: Panduan Operasional Superadmin (Ringkasan Platform, Kelola Sekolah, Admin Sekolah)
- Bab 5: Pemecahan Masalah & Solusi Kendala Teknis (GPS, Kamera, Offline Mode, dll.)

---

## 5. Verification Method

To verify the implementation independently:

1. **Static Analysis & TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exits with code 0.

2. **Existing Regression Test Verification**:
   ```powershell
   npx tsx tests/onboarding_and_ai_assistant_ui.test.ts
   npx tsx tests/app_screen_integration.test.ts
   ```
   *Expected*: All 24 assertions in `app_screen_integration.test.ts` and all 8 sections in `onboarding_and_ai_assistant_ui.test.ts` pass 100%.

3. **New Verification Test Suite**:
   Create a dedicated test `tests/sidebar_user_profile_and_tutorial.test.ts`:
   - Verifies `AppScreen.tsx` renders user name, role badge, and avatar in the sidebar.
   - Verifies `TutorialModal` contains all 11 menus for Guru, 14 menus for Admin, and 3 menus for Superadmin.
   - Verifies search/filter functionality in `tutorialData.ts`.
   - Verifies existence of `docs/PANDUAN_PENGGUNA.md` or `TUTORIAL.md`.
   Run with:
   ```powershell
   npx tsx tests/sidebar_user_profile_and_tutorial.test.ts
   ```

4. **Production Build Gate**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js build succeeds with 0 errors.

---
*Report compiled by explorer_survey_3.*

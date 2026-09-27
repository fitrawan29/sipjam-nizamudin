# Handoff Report: AppScreen Architecture & Onboarding/AI Assistant Integration Survey

**Agent**: `explorer_survey_1`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1`  
**Date**: 2026-09-28T05:50:00+08:00 (UTC: 2026-09-27T21:50:00Z)  
**Target File Analyzed**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AppScreen.tsx` (848 lines)  
**Parent / Caller**: `orchestrator_5` (`3b364431-4af8-4ed9-9a8c-b79b77d58fbe`)  

---

## 1. Observation

Direct observations from examining `src/components/AppScreen.tsx`:

### 1.1 Root Layout and Outer DOM Hierarchy
- **File & Line**: `src/components/AppScreen.tsx:486-845`
- **Outer Shell**:
  ```tsx
  return (
    <div className="flex-col h-full w-full flex">
      {/* 1. Fixed Header (lines 487-533) */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px] print:hidden no-print">
        ...
      </header>

      {/* 2. Sidebar Modal/Drawer Overlay (lines 536-578) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={toggleSidebar}>
          <div className="w-72 max-w-[85%] bg-white dark:bg-gray-900 h-full shadow-2xl p-5 flex flex-col justify-between transform transition-transform" onClick={e => e.stopPropagation()}>
            ...
          </div>
        </div>
      )}

      {/* 3. Main View Container (lines 580-678) */}
      <main className="flex-grow overflow-y-auto custom-scroll w-full relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 z-10 max-w-7xl mx-auto">
        <div key={`${currentView}-${syncKey}`} className="page-transition">
          {/* View rendering */}
        </div>
      </main>

      {/* 4. Peripheral Modals & Prompts (lines 680-843) */}
      <PushNotificationPrompt user={user} />
      <PWAInstallPrompt />
      {broadcastModalOpen && ( ... )}
      <AccountSettingsModal ... />
    </div>
  );
  ```

### 1.2 Active View State Management & Role Handling
- **State Definition** (`lines 51-59`):
  ```tsx
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view) return view;
    }
    if (isSuperadmin) return 'view-superadmin-overview';
    return 'view-home';
  });
  ```
- **Navigation Handler** (`lines 367-435`):
  `handleNavigation = async (targetId: string)`:
  - If `isSuperadmin` or `isAdmin`, pushes URL state `window.history.pushState(null, '', '?view=' + targetId); setCurrentView(targetId); setSidebarOpen(false);`.
  - For Guru, checks permissions against daily state (`getGuruDailyState`), then executes `window.history.pushState(null, '', '?view=' + targetId); setCurrentView(targetId); setSidebarOpen(false);`.
- **Browser History Integration** (`lines 151-163`):
  Listens to window `popstate` to update `currentView` when the user navigates back/forward in browser history.
- **Role Detection** (`lines 48-50`):
  ```tsx
  const user = currentUser || initialUser;
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
  ```
  - `user.role` values: `'Superadmin'`, `'Admin'`, `'Guru'`.
  - Teacher is identified when `!isAdmin && !isSuperadmin` (or `user?.role?.toLowerCase() === 'guru'`).
  - School Admin is identified when `isAdmin && !isSuperadmin` (or `user?.role?.toLowerCase() === 'admin'`).
  - Per specifications, Superadmin is exempt from onboarding tutorials.

### 1.3 Sidebar Open/Close State (Mobile vs Desktop)
- **State Definition** (`line 164`):
  ```tsx
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  ```
- **Drawer Behavior** (`lines 536-578`):
  - Notice: In `AppScreen.tsx`, there is **no persistent/split desktop sidebar**. On both desktop and mobile, navigation is hidden by default and opens as an off-canvas drawer overlay (`fixed inset-0 bg-black/60 z-50`) when `sidebarOpen === true`.
  - Clicking any navigation item executes `setSidebarOpen(false)` inside `handleNavigation`.
  - Clicking the backdrop executes `toggleSidebar()` (`line 537`).
  - **Critical DOM Lifecycle Detail**: The sidebar is conditionally rendered: `{sidebarOpen && ( <div className="fixed inset-0 ..."> ... </div> )}` (`line 536`). When `sidebarOpen` is `false`, sidebar menu items do **not** exist in the DOM!

### 1.4 Header Bar & Hamburger Button Structure
- **File & Line**: `src/components/AppScreen.tsx:487-497`
- **Verbatim Code**:
  ```tsx
  <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px] print:hidden no-print">
    <div className="flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={toggleSidebar} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
            <i className="fa-solid fa-bars text-sm"></i>
        </button>
        <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => handleNavigation(defaultHomeView)}>
          SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">
            {isSuperadmin ? 'Superadmin' : (schoolData?.nama || 'Sekolah')}
          </span>
        </div>
    </div>
  ```
- **Hamburger Button Attributes**:
  - `type="button"`
  - `onClick={toggleSidebar}`
  - `className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"`
  - Icon: `<i className="fa-solid fa-bars text-sm"></i>`
  - Current identifier: **None**.
  - Target identifier recommendation: `data-tour="hamburger-btn"`.

### 1.5 Sidebar Navigation Menu Items & View Keys
- **Menu Array Definitions** (`lines 437-481`):
  ```tsx
  const menuItemsGuru = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
    { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
    ...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : []),
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-history', icon: 'fa-clock-rotate-left', label: 'Riwayat' },
    { id: 'view-guru-rekap-jurnal', icon: 'fa-book-open', label: 'Rekap Jurnal' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }
  ];

  const menuItemsAdmin = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
    { id: 'view-sistem-blok', icon: 'fa-layer-group', label: 'Sistem Blok' },
    { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' },
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' },
    { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Akhir' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
    { id: 'view-admin-data', icon: 'fa-database', label: 'Master' },
    { id: 'view-admin-backup', icon: 'fa-hard-drive', label: 'Akses Data / Backup' },
    { id: 'view-admin-config', icon: 'fa-gears', label: 'Sistem' }
  ];
  ```

- **Exact View Keys Required for Onboarding**:
  | Role | Menu Item Name | Label in Sidebar | Exact `id` (View Key) | Icon |
  |---|---|---|---|---|
  | **Guru** | Presensi Datang | Presensi Guru | `view-guru-presensi` | `fa-right-to-bracket` |
  | **Guru** | Jurnal Mengajar | Jurnal Pembelajaran | `view-guru-jurnal` | `fa-book-journal-whills` |
  | **Guru** | Piket | Modul Piket | `view-piket` | `fa-shield-halved` |
  | **Admin** | Verifikasi | Verifikasi | `view-admin-verif` | `fa-clipboard-check` |
  | **Admin** | Sistem Blok | Sistem Blok | `view-sistem-blok` | `fa-layer-group` |
  | **Admin** | Master Data | Master | `view-admin-data` | `fa-database` |
  | **Admin** | Analitik | Analitik | `view-analitik` | `fa-chart-pie` |
  | **Admin** | Sistem (Konfigurasi) | Sistem | `view-admin-config` | `fa-gears` |

- **Sidebar Rendering Loop** (`lines 554-566`):
  ```tsx
  {menuItems.map(item => (
    <button 
      key={item.id}
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
  ```
  - **Key Finding**: Adding `data-tour={item.id}` onto this `<button>` effortlessly tags each menu item with `data-tour="view-guru-presensi"`, `data-tour="view-guru-jurnal"`, `data-tour="view-piket"`, `data-tour="view-admin-verif"`, `data-tour="view-sistem-blok"`, `data-tour="view-admin-data"`, `data-tour="view-analitik"`, `data-tour="view-admin-config"`.

---

## 2. Logic Chain

### 2.1 Logic Step 1: Sidebar Lifecycle & Tutorial Target Visibility
1. In Step 1 of Guru Tutorial, the target is `data-tour="hamburger-btn"` on the header. The sidebar is closed.
2. In Step 2 of Guru Tutorial, the target is `data-tour="view-guru-presensi"`. If `sidebarOpen` remains `false`, this element does not exist in the DOM (Observation 1.3: `{sidebarOpen && ...}`).
3. Therefore, the tutorial controller (`OnboardingTutorial`) must interact with `sidebarOpen`:
   - Either `AppScreen` passes `onEnsureSidebarOpen: (open: boolean) => void` or `isSidebarOpen: boolean, setSidebarOpen: (v: boolean) => void`.
   - When advancing to steps targeting sidebar menu items (Steps 2-4 for Guru, Steps 1-5 for Admin), the tutorial calls `setSidebarOpen(true)`.
   - When advancing to the final step (AI Assistant button at bottom-right), the tutorial calls `setSidebarOpen(false)` so the sidebar drawer does not obscure the floating AI Assistant button.

### 2.2 Logic Step 2: Placement of "Lihat Tutorial Lagi" Button
1. Look at lines 538-577:
   The sidebar drawer has `className="w-72 max-w-[85%] bg-white dark:bg-gray-900 h-full shadow-2xl p-5 flex flex-col justify-between transform transition-transform"`.
   Currently, all items are enclosed in a single top `<div>`.
   Inside this `<div>`, lines 567-574 render the "Pengaturan Akun" button right after `{menuItems.map(...)}`.
2. Directly below "Pengaturan Akun" (or in a dedicated bottom footer container of the drawer):
   ```tsx
   {!isSuperadmin && (
     <button
       type="button"
       data-tour="restart-tutorial-btn"
       onClick={() => {
         setSidebarOpen(false);
         setShowTutorial(true);
       }}
       className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border border-transparent transition-all"
     >
       <i className="fa-solid fa-circle-question w-5 text-center text-emerald-600 dark:text-emerald-400"></i> Lihat Tutorial Lagi
     </button>
   )}
   ```
3. This is clean, intuitive, matches the visual hierarchy of the sidebar, and hides itself for `isSuperadmin`.

### 2.3 Logic Step 3: Placement & Mounting of AIAssistant & OnboardingTutorial
1. In `src/components/AppScreen.tsx`, bottom overlays are mounted at lines 680-843:
   - `<PushNotificationPrompt user={user} />`
   - `<PWAInstallPrompt />`
   - Broadcast Modal (`{broadcastModalOpen && ...}`)
   - `<AccountSettingsModal ... />`
2. Mounting `AIAssistant` and `OnboardingTutorial` directly after `<AccountSettingsModal ... />` (lines 843-844) keeps them at the top-level of `AppScreen`'s render tree.
3. Component Props & Signatures:
   ```tsx
   {/* Rule-Based AI Chatbot Assistant */}
   <AIAssistant
     currentView={currentView}
     userRole={user?.role}
   />

   {/* Interactive Onboarding Spotlight Tutorial */}
   {!isSuperadmin && (
     <OnboardingTutorial
       userRole={user?.role}
       isOpen={showTutorial}
       onClose={() => setShowTutorial(false)}
       onEnsureSidebarOpen={(open) => setSidebarOpen(open)}
     />
   )}
   ```
4. Layering and Z-Index Hierarchy:
   - View content in `<main>`: `z-10`
   - Fixed Header: `z-40`
   - Floating AI Trigger Button: `fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6` (or `z-[45]`)
   - AI Chatbot Expanded Window: `z-50`
   - Sidebar Drawer & Overlay: `z-50`
   - Onboarding Tutorial Backdrop & Spotlight: `z-[60]`
   - Onboarding Tutorial Tooltip Box: `z-[70]`
   - This ensures the onboarding highlight and tooltip box always float above both the header and the sidebar without being clipped or hidden.

### 2.4 Logic Step 4: First-Login Detection & LocalStorage Flags
1. Keys required:
   - Guru: `'sipjam_onboarding_guru_done'`
   - Admin: `'sipjam_onboarding_admin_done'`
2. Automatic check on mount:
   ```tsx
   const isGuruRole = !isAdmin && !isSuperadmin;
   const isAdminRole = isAdmin && !isSuperadmin;
   const [showTutorial, setShowTutorial] = useState(false);

   useEffect(() => {
     if (typeof window === 'undefined') return;
     if (isGuruRole) {
       const done = localStorage.getItem('sipjam_onboarding_guru_done');
       if (!done) setShowTutorial(true);
     } else if (isAdminRole) {
       const done = localStorage.getItem('sipjam_onboarding_admin_done');
       if (!done) setShowTutorial(true);
     }
   }, [isGuruRole, isAdminRole]);
   ```
3. When user completes or clicks "Lewati" (Skip):
   - Set corresponding localStorage flag to `'true'`.
   - Set `showTutorial(false)`.
4. When user clicks "Lihat Tutorial Lagi":
   - Set `showTutorial(true)`. (Does not require clearing localStorage unless desired, but setting `showTutorial(true)` opens it immediately).

### 2.5 Logic Step 5: Mobile Responsiveness Considerations
1. Mobile viewport widths in scope: 320px – 428px (iPhone SE, iPhone 14/15, Android standard).
2. Floating AI Button:
   - Size: `w-12 h-12` or `w-13 h-13` (48px - 52px). Meets WCAG minimum touch target (44x44px).
   - Position: `fixed bottom-5 right-5 z-40`.
3. AI Chatbot Dialog Box on Mobile:
   - Instead of fixed 400px width (which would overflow 320px screens), use:
     `fixed inset-x-4 bottom-20 sm:inset-auto sm:right-6 sm:bottom-20 sm:w-96 max-h-[75vh] h-[480px]`.
   - On mobile, it stays centered with 16px horizontal margins (`inset-x-4`) and comfortable height.
4. Onboarding Spotlight on Mobile:
   - Sidebar scroll: The sidebar menu list has `max-h-[calc(100vh-180px)] overflow-y-auto custom-scroll`.
   - Elements near the bottom of the list (e.g. `view-admin-config`) are scrolled offscreen on smaller devices.
   - **Crucial Rule**: Before reading `getBoundingClientRect()` to position the highlight box and tooltip, the tutorial code must call:
     ```ts
     targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
     ```
   - Tooltip width and clamping: Tooltip card should have `max-w-[calc(100vw-32px)]` and horizontal clamping:
     ```ts
     const left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, targetRect.left));
     ```
     This prevents tooltips from overflowing offscreen to the right or left.

---

## 3. Caveats

1. **Superadmin Scope**:
   Superadmin (`isSuperadmin === true`) uses a completely different view structure (`SuperadminView`) and different sidebar menu items (`menuItemsSuperadmin`). Per specifications and requirements, Superadmin does not participate in the onboarding tutorial. The "Lihat Tutorial Lagi" button and automatic tutorial launch must be guarded by `!isSuperadmin`.
2. **Offline Keyword Matching in AIAssistant**:
   The requirement strictly states: "Tidak boleh menggunakan API eksternal atau library AI — murni string matching / keyword lookup. Jawaban dalam Bahasa Indonesia. Jika tidak ada jawaban yang cocok, tampilkan pesan ramah dan daftar topik yang tersedia."
   This means the FAQ knowledge base (at least 30 Q&A items) should be cleanly defined in a separate data/utility file (e.g. `src/data/aiAssistantKnowledge.ts` or `src/lib/aiAssistantKnowledge.ts`), keeping `AppScreen.tsx` uncluttered.
3. **No External Library for Tour/Overlay**:
   Requirements state: "Gunakan Tailwind CSS dan Font Awesome yang sudah ada — tidak boleh menambahkan dependency npm baru."
   Do NOT install `shepherd.js`, `driver.js`, or `intro.js`. The tutorial overlay must be a lightweight custom React component utilizing SVG cutout / CSS spotlight with Tailwind classes.
4. **DOM Rendering Asynchrony during Tour**:
   When toggling `sidebarOpen = true` between steps, allow a brief delay (e.g., `setTimeout(..., 100)` or `requestAnimationFrame`) before querying `document.querySelector('[data-tour="..."]')` to ensure the sidebar transition has mounted and laid out in the DOM.

---

## 4. Conclusion

1. **Architecture Ready for Integration**:
   `src/components/AppScreen.tsx` is cleanly architected. The active view is tracked via `currentView` (default `'view-home'` for non-superadmin, with URL query string sync). Role detection cleanly distinguishes Guru (`!isAdmin && !isSuperadmin`), Admin (`isAdmin && !isSuperadmin`), and Superadmin (`isSuperadmin`).
2. **Identification of UI Targets**:
   - Header Hamburger Button (`lines 489-491`): Add `data-tour="hamburger-btn"`.
   - Sidebar Navigation Items (`lines 554-566`): Add `data-tour={item.id}` in the `.map()`.
   - Floating AI Button: Add `data-tour="ai-assistant-btn"`.
3. **Exact View Keys Confirmed**:
   - Guru: `view-guru-presensi`, `view-guru-jurnal`, `view-piket`
   - Admin: `view-admin-verif`, `view-sistem-blok`, `view-admin-data`, `view-analitik`, `view-admin-config`
4. **Placement of "Lihat Tutorial Lagi"**:
   Placed directly below "Pengaturan Akun" in the sidebar menu list (around line 574) and conditioned on `!isSuperadmin`.
5. **Mounting Strategy**:
   Both `AIAssistant` and `OnboardingTutorial` should be mounted at the end of `AppScreen.tsx` (adjacent to `AccountSettingsModal`), passing `currentView`, `userRole`, and sidebar open/close controllers.
6. **Mobile Support**:
   Full support for mobile (320px–428px) requires auto-scrolling (`scrollIntoView`), dynamic viewport clamping for tooltips, and responsive width for the chat window (`inset-x-4 sm:inset-auto sm:w-96`).

---

## 5. Verification Method

To verify these findings and any future implementation:

1. **DOM Attribute Verification**:
   Inspect `src/components/AppScreen.tsx` to verify:
   - Header button contains `data-tour="hamburger-btn"`.
   - Sidebar buttons contain `data-tour={item.id}`.
   - Sidebar contains "Lihat Tutorial Lagi" button with `data-tour="restart-tutorial-btn"`.
   - Bottom of `AppScreen` mounts `<AIAssistant ... />` and `<OnboardingTutorial ... />`.

2. **TypeScript & Build Checks**:
   Run the following terminal commands:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   Both must pass without errors or regressions.

3. **Step Mapping Verification**:
   - Guru Steps (5 steps):
     1. `[data-tour="hamburger-btn"]`
     2. `[data-tour="view-guru-presensi"]`
     3. `[data-tour="view-guru-jurnal"]`
     4. `[data-tour="view-piket"]`
     5. `[data-tour="ai-assistant-btn"]`
   - Admin Steps (6 steps):
     1. `[data-tour="view-admin-verif"]`
     2. `[data-tour="view-sistem-blok"]`
     3. `[data-tour="view-admin-data"]`
     4. `[data-tour="view-analitik"]`
     5. `[data-tour="view-admin-config"]`
     6. `[data-tour="ai-assistant-btn"]`

4. **Automated Unit / Integration Test**:
   Execute the project test command:
   ```bash
   npm test
   ```

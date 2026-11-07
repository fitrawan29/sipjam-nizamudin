# Handoff Report: Milestone 3 (Requirement R4) — Master Data Navigation Order & Panduan Alur (Visual Workflow Stepper)

**Author**: `explorer_m3_nov_1` (Teamwork Explorer)  
**Target Milestone**: Milestone 3 (Requirement R4 — Master Data Navigation & Visual Workflow Stepper)  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_1`  
**Date**: 2026-11-07  

---

## 1. Observation

### 1.1 Baseline System Health
- Ran `npm test` across the full project test suite:
  - Total test files executed: 61 test suites.
  - Test result: **61 passed, 0 failed**.
- Ran `npx tsc --noEmit`:
  - Static type check result: **0 errors** (exit code 0).
- This establishes that the current codebase is 100% healthy, clean, and free of syntax or type regressions.

### 1.2 Inspection of `src/components/AdminDataView.tsx`

1. **Current `tabs` Array (Lines 206–216)**:
   ```tsx
   const tabs = [
     { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
     { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' },
     { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
     { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
     { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
     { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
     { id: 'Pengguna', label: 'Pengguna', table: 'users' },
     { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
     { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
   ];
   ```
   - **Observation**: The 9 tabs already correspond exactly to the required sequential master data entities:
     1. `Data_Siswa` (Siswa)
     2. `Data_Kelas` (Kelas)
     3. `Data_Mapel` (Mapel)
     4. `Data_Guru` (Guru)
     5. `Jadwal_Pelajaran` (Jadwal)
     6. `Wali_Kelas` (Wali Kelas)
     7. `Pengguna` (Pengguna)
     8. `Kalender_Pendidikan` (Kalender)
     9. `sistem_blok` (Periode Sistem Blok - opsional)
   - The array currently only defines `{ id, label, table }`, lacking semantic icons, step numbers, descriptions, or visual pipeline connectors.

2. **Tab Normalization & Aliasing (Lines 40–53)**:
   ```tsx
   export function normalizeAdminTab(tab?: string): string {
     if (!tab) return 'Data_Siswa';
     const clean = tab.trim().toLowerCase();
     if (clean === 'blok' || clean === 'sistem_blok' || clean === 'periode_blok') return 'sistem_blok';
     if (clean === 'pengguna' || clean === 'users' || clean === 'user') return 'Pengguna';
     if (clean === 'data_kelas' || clean === 'kelas' || clean === 'classes' || clean === 'class') return 'Data_Kelas';
     if (clean === 'data_siswa' || clean === 'siswa' || clean === 'students' || clean === 'student') return 'Data_Siswa';
     if (clean === 'data_guru' || clean === 'guru' || clean === 'teachers' || clean === 'teacher') return 'Data_Guru';
     if (clean === 'data_mapel' || clean === 'mapel' || clean === 'mata_pelajaran' || clean === 'subjects') return 'Data_Mapel';
     if (clean === 'kalender_pendidikan' || clean === 'kalender' || clean === 'calendar') return 'Kalender_Pendidikan';
     if (clean === 'jadwal_pelajaran' || clean === 'jadwal' || clean === 'schedule') return 'Jadwal_Pelajaran';
     if (clean === 'wali_kelas' || clean === 'wali' || clean === 'homeroom') return 'Wali_Kelas';
     return tab;
   }
   ```
   - All 9 tab aliases are normalized properly to canonical keys: `'Data_Siswa'`, `'Data_Kelas'`, `'Data_Mapel'`, `'Data_Guru'`, `'Jadwal_Pelajaran'`, `'Wali_Kelas'`, `'Pengguna'`, `'Kalender_Pendidikan'`, `'sistem_blok'`.

3. **Current Tab Navigation UI (Lines 2319–2346)**:
   ```tsx
   <div className="glass-card p-4 w-full max-w-full overflow-hidden">
       <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
         <i className="fa-solid fa-database text-purple-500 dark:text-purple-400"></i> Master Data
       </h2>
       
       {/* TABS */}
       <div className="flex overflow-x-auto custom-scroll gap-2 mb-4 pb-1 max-w-full">
           {tabs.map(tab => (
             <button 
               key={tab.id}
               type="button" 
               onClick={() => {
                 setActiveTab(tab.id);
                 setSelectedStudentIds([]);
                 setSearch('');
                 setFilter1('ALL');
                 setFilter2('ALL');
                 setPage(0);
                 if (typeof window !== 'undefined' && window.history?.replaceState) {
                   window.history.replaceState(null, '', `?view=view-admin-data&tab=${tab.id}`);
                 }
               }} 
               className={`btn-click master-tab-btn px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition ${activeTab === tab.id ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : 'border-gray-200 text-gray-700 dark:text-gray-300 dark:border-gray-700'}`}
             >
               {tab.label}
             </button>
           ))}
       </div>
   ```
   - **Observation**: Currently, there is NO visual workflow stepper or guidance pipeline card above the tabs. Users see only plain pill buttons with labels, without indication of the recommended sequence of data entry, dependency hierarchy, step numbers, or descriptions.

4. **Component Mounting & Tab Content Separation (Lines 2348–2360)**:
   ```tsx
   {(activeTab === 'sistem_blok' || activeTab === 'blok') ? (
     <div className="mt-2">
       <SistemBlokView user={user} />
     </div>
   ) : activeTab === 'Pengguna' ? (
     <div className="mt-2">
       <AdminPenggunaView user={user} />
     </div>
   ) : activeTab === 'Data_Kelas' ? (
     <div className="mt-2">
       <AdminKelasView user={user} />
     </div>
   ) : (
     <>
       {/* Error message, CSV import controls, table filters, pagination, table rows */}
     </>
   )}
   ```
   - When switching tabs, `AdminKelasView`, `AdminPenggunaView`, and `SistemBlokView` are conditionally mounted. All other 6 tabs render table data through the unified table view inside `AdminDataView.tsx`.
   - Modals (`NaikKelasModal`, QR cards, SweetAlert2 edit modals) and query params (`?view=view-admin-data&tab=...`) are tied to `activeTab` and state variables (`isNaikKelasOpen`, `selectedStudentIds`, `search`, etc.).

### 1.3 AST and Test Invariants
1. **`tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` (Lines 338–353)**:
   ```ts
   const tabsMatch = adminDataSrc.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\];/);
   assert.ok(tabsMatch, 'AdminDataView.tsx must define a tabs array');
   const tabsContent = tabsMatch[1];

   assert.ok(tabsContent.includes("id: 'Data_Kelas'"), "tabs must contain id 'Data_Kelas'");
   assert.ok(tabsContent.includes("label: 'Kelas'"), "Data_Kelas tab must have label 'Kelas'");
   assert.ok(tabsContent.includes("table: 'data_kelas'"), "Data_Kelas tab must map to table 'data_kelas'");

   const siswaIndex = tabsContent.indexOf("id: 'Data_Siswa'");
   const kelasIndex = tabsContent.indexOf("id: 'Data_Kelas'");
   const guruIndex = tabsContent.indexOf("id: 'Data_Guru'");

   assert.ok(siswaIndex !== -1 && kelasIndex !== -1 && guruIndex !== -1, 'All core tabs must be present');
   assert.ok(siswaIndex < kelasIndex, 'Data_Kelas must be positioned after Data_Siswa');
   assert.ok(kelasIndex < guruIndex, 'Data_Kelas must be positioned before Data_Guru');
   ```
   - **Invariant**: The `const tabs = [...]` array literal MUST remain defined with `id`, `label`, and `table` matching these exact strings and relative order.
   - Additional fields (e.g. `icon`, `step`, `desc`, `optional`) can be safely added to each object in `tabs` without violating this regex or assertion.

2. **Clay Design System Invariants (`src/app/globals.css`, `tests/claymorphism_design_system.test.ts`)**:
   - Clay components utilize classes such as `clay-card`, `rounded-2xl` / `rounded-3xl`, subtle borders (`border-2 border-white/90 dark:border-gray-700/80`), tactile shadows, and pastel badge tints (`clay-card-purple`, `bg-[#FAF7F2]`, etc.).

---

## 2. Logic Chain

1. **Relational Data Dependency Rationale**:
   - Master data cannot be uploaded haphazardly in a relational database without triggering foreign key or logical prerequisite conflicts:
     * **Step 1 (Siswa)**: Primary student entity.
     * **Step 2 (Kelas)**: Classes/Rombel. Required to group students and schedule learning activities.
     * **Step 3 (Mapel)**: Subjects. Required before assigning teaching assignments.
     * **Step 4 (Guru)**: Educators. Assigned to subjects and homeroom roles.
     * **Step 5 (Jadwal)**: KBM timetable. Depends on Guru, Mapel, and Kelas existing.
     * **Step 6 (Wali Kelas)**: Homeroom teacher assignments. Depends on Guru and Kelas existing.
     * **Step 7 (Pengguna)**: User credentials and role access for teachers and staff.
     * **Step 8 (Kalender)**: Academic calendar (holidays, exams, active teaching days).
     * **Step 9 (Periode Sistem Blok)**: Optional block schedule rotation configuration (primarily used by vocational schools/SMK).
   - Therefore, introducing a prominent **Visual Workflow Stepper Card ("Panduan Alur Penginputan Master Data")** above the tab bar provides vital guidance to administrative users, reducing upload confusion and prerequisite errors.

2. **Unified Tab State Synchronization**:
   - Both the new **Visual Workflow Stepper** and the existing **Tab Navigation Bar** must control the identical state: `activeTab` via `normalizeAdminTab()`.
   - When a user clicks any step in the stepper card:
     * `setActiveTab(tabId)` is triggered.
     * State resets are executed (`setSelectedStudentIds([])`, `setSearch('')`, `setFilter1('ALL')`, `setFilter2('ALL')`, `setPage(0)`).
     * URL query parameters are synchronized via `window.history.replaceState(null, '', ?view=view-admin-data&tab=${tabId})`.
   - When a user clicks a tab button in the tab bar, or when CSV upload auto-detection redirects to another tab, the stepper card immediately reacts and updates its highlighted active step.

3. **Active Step Highlighting & State Distinction**:
   - Using the normalized tab index, we calculate:
     * `currentStepIndex`: index of the currently active step (0 to 8).
     * `isActive = (currentStepIndex === idx)`: Highlights the step with a vivid gradient (`bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md ring-2 ring-purple-400/40`), white badge with purple number, and active status indicator.
     * `isPast = (currentStepIndex > idx)`: Preceding steps display a subtle success state (`bg-white/90 dark:bg-gray-800/90 border-purple-200 dark:border-purple-900/40`), with a checkmark badge (`✓`) to indicate that prerequisite data in this stage can be assumed complete.
     * `isUpcoming = (currentStepIndex < idx)`: Upcoming steps display a neutral, semi-transparent card (`bg-white/60 dark:bg-gray-800/60 border-gray-200/80 text-gray-500`).
     * `optional`: Step 9 (`sistem_blok`) clearly displays an `(Opsional)` badge.

4. **Responsive Layout Architecture**:
   - 9 steps cannot fit comfortably side-by-side on mobile (360px–640px) without either extreme squashing or excessive vertical stacking.
   - An `overflow-x-auto custom-scroll` flex row container with `shrink-0` step cards:
     * Prevents text clipping and maintains visual elegance across all viewports.
     * Allows smooth horizontal swipe gesture on mobile/tablet.
     * Displays connected chevron arrows (`fa-chevron-right`) between steps.
     * Keeps vertical page height compact so the underlying data table and action buttons remain immediately visible above the fold.

5. **Zero Regression Guarantee**:
   - Preserves all 9 tab items in `const tabs = [...]` with verbatim `id`, `label`, `table` properties to satisfy AST regex tests in `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`.
   - Preserves all conditional component mountings (`AdminKelasView`, `AdminPenggunaView`, `SistemBlokView`).
   - Preserves all modal dialogs (`NaikKelasModal`, SweetAlert2 forms, QR student card downloads).

---

## 3. Caveats

- **Read-Only Investigation Scope**: In accordance with the Explorer archetype instructions, no source code files (`src/` or `tests/`) were modified during this investigation.
- **AST Pattern Preservation**: Automated tests inspect `AdminDataView.tsx` with regular expressions like `/const\s+tabs\s*=\s*\[([\s\S]*?)\];/`. Implementers MUST NOT rename or replace `const tabs = [...]` with an external import or different variable name; enrich the existing array in place.
- **Sistem Blok Optionality**: Step 9 (`sistem_blok`) is optional for regular curriculum schools. The stepper card must visually distinguish this with an `Opsional` badge so administrators know it is not mandatory for regular semester setups.

---

## 4. Conclusion & Concrete Blueprint for Implementer

### 4.1 Interface and Metadata Enrichment in `src/components/AdminDataView.tsx`

Extend the tab definitions with icons, step ordering, concise descriptions, and the optional flag:

```tsx
export interface MasterDataTabItem {
  id: string;
  label: string;
  table: string;
  step: number;
  icon: string;
  desc: string;
  optional?: boolean;
}

const tabs: MasterDataTabItem[] = [
  { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa', step: 1, icon: 'fa-user-graduate', desc: 'Identitas Siswa' },
  { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas', step: 2, icon: 'fa-chalkboard', desc: 'Rombel & Tingkat' },
  { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel', step: 3, icon: 'fa-book', desc: 'Mata Pelajaran' },
  { id: 'Data_Guru', label: 'Guru', table: 'data_guru', step: 4, icon: 'fa-chalkboard-user', desc: 'Data Pendidik' },
  { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran', step: 5, icon: 'fa-calendar-days', desc: 'Jadwal KBM' },
  { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas', step: 6, icon: 'fa-user-tie', desc: 'Penugasan Wali' },
  { id: 'Pengguna', label: 'Pengguna', table: 'users', step: 7, icon: 'fa-users-gear', desc: 'Akun Login' },
  { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan', step: 8, icon: 'fa-calendar-check', desc: 'Hari Efektif & Libur' },
  { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok', step: 9, icon: 'fa-cubes', desc: 'Rotasi Blok KBM', optional: true },
];
```

### 4.2 Tab Switch Helper Function
Define a reusable `handleSwitchTab` handler (or inline in JSX) that unifies both Stepper clicks and Tab Button clicks:

```tsx
const handleSwitchTab = (tabId: string) => {
  setActiveTab(tabId);
  setSelectedStudentIds([]);
  setSearch('');
  setFilter1('ALL');
  setFilter2('ALL');
  setPage(0);
  if (typeof window !== 'undefined' && window.history?.replaceState) {
    window.history.replaceState(null, '', `?view=view-admin-data&tab=${tabId}`);
  }
};
```

### 4.3 Visual Workflow Stepper JSX Component
Place this card immediately above the `{/* TABS */}` navigation in `AdminDataView.tsx` (around line 2323):

```tsx
{/* PANDUAN ALUR PENGINPUTAN MASTER DATA (VISUAL WORKFLOW STEPPER) */}
<div className="clay-card p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-sm bg-[#FAF7F2]/90 dark:bg-gray-800/80 mb-4 overflow-hidden">
  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm shrink-0">
        <i className="fa-solid fa-diagram-project"></i>
      </div>
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
          <span>Panduan Alur Penginputan Master Data</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            9 Tahap Terstruktur
          </span>
        </h3>
        <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
          Urutan penginputan & dependensi data master untuk menjamin integritas relasi antar-tabel.
        </p>
      </div>
    </div>
    <div className="text-[10px] text-gray-500 dark:text-gray-400 hidden lg:flex items-center gap-1.5 bg-white/70 dark:bg-gray-900/50 px-2.5 py-1 rounded-xl border border-gray-200/80 dark:border-gray-700">
      <i className="fa-solid fa-hand-pointer text-purple-500"></i>
      <span>Klik tahap untuk berpindah menu</span>
    </div>
  </div>

  {/* Stepper Pipeline */}
  {(() => {
    const currentNormTab = normalizeAdminTab(activeTab);
    const activeIndex = tabs.findIndex(t => normalizeAdminTab(t.id) === currentNormTab);

    return (
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scroll pb-1.5 pt-0.5 max-w-full">
        {tabs.map((step, idx) => {
          const isActive = idx === activeIndex;
          const isPast = activeIndex !== -1 && idx < activeIndex;

          return (
            <div key={step.id} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchTab(step.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-2xl text-left transition-all duration-200 shrink-0 border cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-500/25 ring-2 ring-purple-400/50 ring-offset-1 dark:ring-offset-gray-900'
                    : isPast
                    ? 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border-purple-200/80 dark:border-purple-900/50 hover:bg-purple-50/60 dark:hover:bg-purple-900/30'
                    : 'bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:border-gray-300'
                }`}
                title={`Tahap ${step.step}: ${step.label} (${step.desc})`}
              >
                {/* Step Circle */}
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white text-purple-700 shadow-sm'
                      : isPast
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {isPast ? <i className="fa-solid fa-check text-[9px] sm:text-[10px]"></i> : step.step}
                </div>

                {/* Step Info */}
                <div className="flex flex-col pr-0.5">
                  <div className="flex items-center gap-1.5">
                    <i className={`fa-solid ${step.icon} text-[11px] ${
                      isActive ? 'text-purple-100' : isPast ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-purple-500'
                    }`}></i>
                    <span className={`text-xs font-bold whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {step.label}
                    </span>
                    {step.optional && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        Opsional
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] sm:text-[10px] whitespace-nowrap ${
                    isActive ? 'text-purple-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.desc}
                  </span>
                </div>
              </button>

              {/* Connecting Chevron between steps */}
              {idx < tabs.length - 1 && (
                <i className="fa-solid fa-chevron-right text-[9px] text-gray-300 dark:text-gray-600 shrink-0"></i>
              )}
            </div>
          );
        })}
      </div>
    );
  })()}
</div>
```

### 4.4 Tab Bar Icon Polish (Lines 2325–2346)
Polish the tab buttons below the stepper by incorporating the icons defined in `tabs`:

```tsx
{/* TABS */}
<div className="flex overflow-x-auto custom-scroll gap-2 mb-4 pb-1 max-w-full">
    {tabs.map(tab => {
      const isTabActive = normalizeAdminTab(activeTab) === normalizeAdminTab(tab.id);
      return (
        <button 
          key={tab.id}
          type="button" 
          onClick={() => handleSwitchTab(tab.id)} 
          className={`btn-click master-tab-btn px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition flex items-center gap-1.5 ${
            isTabActive 
              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
              : 'border-gray-200 text-gray-700 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <i className={`fa-solid ${tab.icon} text-[11px]`}></i>
          <span>{tab.label}</span>
          {tab.optional && (
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-normal">(Opsional)</span>
          )}
        </button>
      );
    })}
</div>
```

---

## 5. Verification Method

### 5.1 Automated Test Suites
Run the following commands to ensure zero regressions and AST compliance:

1. **Verify Class Submenu and Master Tab Placement AST Invariants**:
   ```bash
   npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
   ```
   *Expectation*: Passes all checks, including `1.9: Data_Kelas exists in AdminDataView.tsx tabs and is positioned right after Data_Siswa`.

2. **Verify Role Restrictions and Master Data Integrity**:
   ```bash
   npx tsx tests/master_data_admin_role_restriction.test.ts
   ```
   *Expectation*: Passes with 100% success rate.

3. **Verify Master Data Polish & Edit Modals**:
   ```bash
   npx tsx tests/m6_master_data_polish.test.ts
   ```
   *Expectation*: All modal assertions pass.

4. **Verify TypeScript Strict Compilation**:
   ```bash
   npx tsc --noEmit
   ```
   *Expectation*: 0 errors.

5. **Verify Full Automated Suite**:
   ```bash
   npm test
   ```
   *Expectation*: All 61 test files pass with exit code 0.

### 5.2 Manual Browser Verification
1. Log in as an Administrator (`admin`).
2. Open the **Master Data** page (`?view=view-admin-data`).
3. Observe the **Panduan Alur Penginputan Master Data** card at the top:
   - Contains exactly 9 steps in order: `1. Siswa` -> `2. Kelas` -> `3. Mapel` -> `4. Guru` -> `5. Jadwal` -> `6. Wali Kelas` -> `7. Pengguna` -> `8. Kalender` -> `9. Periode Sistem Blok (Opsional)`.
   - Each step features a numbered badge, icon, and description.
   - Stepper cards are connected by chevron arrows.
4. Click on `2. Kelas`:
   - Active step shifts immediately to `2. Kelas` with vibrant purple highlight.
   - Step `1. Siswa` turns to checked `✓` state.
   - URL updates to `?view=view-admin-data&tab=Data_Kelas`.
   - `AdminKelasView` mounts smoothly.
5. Click on `5. Jadwal`:
   - Schedule table view mounts cleanly with filters and action buttons.
6. Click on `9. Periode Sistem Blok`:
   - `SistemBlokView` mounts cleanly.
7. Test mobile viewport (e.g. 375px in DevTools):
   - Stepper scrolls horizontally with touch/swipe without horizontal page overflow or broken layout.

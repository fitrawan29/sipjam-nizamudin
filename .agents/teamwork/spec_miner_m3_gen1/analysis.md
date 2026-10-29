# Specification Mining Report: Milestone 3 Navigation Restructuring, URL Aliasing & Onboarding

## Executive Overview
This report provides exhaustive specification extraction and test requirement documentation for **Milestone 3: Navigation Restructuring, URL Aliasing & Onboarding** in `sipjam-app`. The investigation probes authoritative specifications:
- `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` (Architectural Blueprint)
- `tests/navigation_consolidation_verification.test.ts` (150-assertion E2E verification test suite)
- `PROJECT.md` & `TEST_READY.md` (System Architecture & Verification Status)
- `src/lib/navigation.ts`, `src/components/ClaySidebar.tsx`, `src/components/Onboarding/OnboardingTutorial.tsx`, `src/components/Onboarding/tutorialSteps.ts`, and `src/components/AppScreen.tsx`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | URL Aliasing | `VIEW_ALIASES` Dictionary | 8 legacy view IDs mapped to canonical view IDs and default sub-tabs | Legacy view ID string | `{ view: string, tab?: string }` | Unmapped IDs return original input without alias flag | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:730`, `src/lib/navigation.ts:21` |
| 2 | URL Aliasing | `resolveRoute` / `resolveCanonicalRoute` | Three-lifecycle URL query resolver handling cold start, popstate, and imperative navigation | `rawView: string \| null \| undefined`, `rawTab?: string \| null` | `RouteResolution { canonicalView, defaultTab?, isLegacyAlias }` | Falsy/undefined/null view falls back to `view-home` | `tests/navigation_consolidation_verification.test.ts:108`, `src/lib/navigation.ts:48` |
| 3 | Navigation | Guru Reguler Sidebar | 6 consolidated menus (25% reduction from 8) | `role: 'Guru', isWaliKelas: false, isPiketHariIni: false` | 6 MenuItem array (`view-home`, `view-guru-presensi`, `view-guru-jurnal`, `view-dokumen`, `view-gradebook`, `view-informasi`) | N/A | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:416`, `src/lib/navigation.ts:138` |
| 4 | Navigation | Wali Kelas Sidebar | 7 consolidated menus (36.4% reduction from 11) | `role: 'Guru', isWaliKelas: true, isPiketHariIni: false` | 7 MenuItem array (Guru Reguler 6 + `view-rekap-siswa`) | Sub-tab RBAC guard on `tab=rapor` and `tab=supervisi-kelas` | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:431`, `src/lib/navigation.ts:148` |
| 5 | Navigation | Guru Piket Sidebar | Dynamic on-duty menu (7 or 8 menus) | `isPiketHariIni: true` | Dynamically appends `view-piket` (`fa-shield-halved`) | Hidden when `isPiketHariIni: false` | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:439`, `src/lib/navigation.ts:151` |
| 6 | Navigation | Administrator Sidebar | 8 consolidated menus with zero-scroll geometry (46.7% reduction from 15) | `role: 'Admin'` | 8 MenuItem array (`view-home`, `view-admin-verif`, `view-piket`, `view-admin-rekap`, `view-rekap-siswa`, `view-gradebook`, `view-admin-data`, `view-admin-config`) | Heights <= 550px fit standard 600px net viewport | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:451`, `src/lib/navigation.ts:125` |
| 7 | Navigation | Kepala Sekolah Sidebar | 7 consolidated menus (46.2% reduction from 13) | `role: 'Kepala Sekolah', isKepalaSekolah: true` | 7 MenuItem array (`view-home`, `view-admin-verif`, `view-admin-rekap`, `view-rekap-siswa`, `view-guru-presensi`, `view-guru-jurnal`, `view-informasi`) | Executive supervision focus | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:495`, `src/lib/navigation.ts:113` |
| 8 | Navigation | Pengawas Dinas Sidebar | 2 consolidated menus (1 in overview, 2 in satellite mode; 50% reduction) | `role: 'Dinas Pendidikan'`, `activeTargetSchool?: any` | 1 menu (`view-dinas-overview`) or 2 menus (`view-dinas-overview`, `view-admin-rekap` read-only) | Mutative admin views blocked | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:525`, `src/lib/navigation.ts:101` |
| 9 | Navigation | Superadmin Sidebar | 3 platform menus + 5 satellite drilldown menus | `role: 'Superadmin'`, `activeTargetSchool?: any` | Global: 3 items (`overview`, `jaringan`, `dinas`); Satellite: 5 items (`data`, `verif`, `rekap`, `siswa`, `config`) | Switching satellite school scopes data | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:538`, `src/lib/navigation.ts:85` |
| 10 | Onboarding | Tour Selector Word-Matching | Multi-id selector matching `[data-tour~="..."], [data-tour="..."]` | `targetTourId: string` | Matched DOM element | Returns null if target element absent; no false substring positives | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:867`, `OnboardingTutorial.tsx:56` |
| 11 | Onboarding | Sidebar Multi-ID Tour Aliases | `dataTour` property on sidebar buttons combining canonical & legacy IDs | `item.dataTour \|\| item.id` | Multi-token `data-tour` attribute on button | Whitespace-separated tokens match existing tour steps | `src/lib/navigation.ts:39`, `ClaySidebar.tsx:209` |
| 12 | State Preservation | In-Memory Keep-Alive | Form draft persistence across sub-tab switching via CSS display toggling (`hidden`) | Active tab ID state | DOM retained in memory; input field values preserved | Conditional unmounting avoided for form-heavy views | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:605`, `tests:330` |
| 13 | Security / RBAC | Defense-in-Depth Sub-Tab Guard | URL tampering guard rendering access denied fallback when unprivileged role targets sub-tab | `viewId`, `tabId`, `user` object | `{ allowed: boolean, fallbackTab?, reason? }` | Graceful fallback tab rendered with alert | `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:626`, `src/lib/navigation.ts:158` |
| 14 | Security / RBAC | AST Guard Strings Invariant | Verbatim SweetAlert error strings required by existing automated test suites | Restricted view IDs in `handleNavigation` | Explicit warning dialogs with exact string copy | Halts unauthorized navigation | `AppScreen.tsx:364`, `PROJECT.md:12` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `resolveRoute` | `rawView: ''`, `null`, `undefined`, `'null'`, `'undefined'` | Safely resolves to `{ canonicalView: 'view-home', isLegacyAlias: false }` without throwing. |
| 2 | `resolveRoute` | `rawView: "view-home' OR '1'='1"` | Preserved as literal canonical candidate without SQL/XSS evaluation or crash. |
| 3 | `resolveRoute` | `view-history` with no `tab` parameter | Automatically injects `defaultTab: 'riwayat'` and `isLegacyAlias: true`. |
| 4 | `resolveRoute` | `view-history` with explicit `tab: 'riwayat'` | Preserves explicit tab without collision: `{ canonicalView: 'view-guru-presensi', defaultTab: 'riwayat', isLegacyAlias: true }`. |
| 5 | `resolveRoute` | `view-sistem-blok` | Maps to `{ canonicalView: 'view-admin-data', defaultTab: 'blok', isLegacyAlias: true }`. Component `AdminDataView` normalizes both `'blok'` and `'sistem_blok'` to `'sistem_blok'`. |
| 6 | Sub-Tab RBAC | Regular Teacher accessing `?view=view-gradebook&tab=rapor` | Rejected by `evaluateTabRBAC` (`allowed: false`, `fallbackTab: 'gradebook'`). |
| 7 | Sub-Tab RBAC | Regular Teacher accessing `?view=view-guru-jurnal&tab=supervisi-kelas` | Rejected (`allowed: false`, `fallbackTab: 'input'`). |
| 8 | Sub-Tab RBAC | Teacher accessing `?view=view-admin-data&tab=blok` | Rejected (`allowed: false`, `fallbackTab: 'Data_Siswa'`). |
| 9 | Sub-Tab RBAC | Teacher accessing `?view=view-admin-config&tab=backup` | Rejected (`allowed: false`, `fallbackTab: 'profil'`). |
| 10 | Sub-Tab Sanitize | Unknown tab (e.g. `nonexistent_tab` on `view-guru-jurnal`) | Sanitizes to component primary tab `'input'`. |
| 11 | Rapid Switching | 50 rapid alternating tab switches (`input` <-> `rekap-pribadi`) | Concludes in consistent activeTab state; history stack contains 0 undefined transitions; redundant switches ignored. |
| 12 | User Props | Incomplete session or empty user role (`role: ''`) | `getConsolidatedMenuItems` produces safe fallback menu array without exception. |
| 13 | Cross-Tenant Storage | Local storage keys for journal autosave | Partitioned by user and school ID: `sipjam_jurnal_autosave_${userId}_${sekolahId}` preventing cross-school / cross-user data bleeding. |
| 14 | Tour Selector | Partial substring match `data-tour="view-guru-jurnal view-guru-rekap-jurnal"` against target `'view-guru'` | Word-matching prevents false positive substring matching (`view-guru` is rejected). |
| 15 | Tour Selector | Whitespace padding `data-tour="btn-nav view-guru-jurnal view-guru-rekap-jurnal active-glow"` | Correctly matches both `view-guru-jurnal` and legacy `view-guru-rekap-jurnal`. |
| 16 | ClayTabs Badge | Numeric count `> 99` | Formatted as `'99+'` preventing badge clipping and layout deformation. Count `0` formatted as `'0'`. |
| 17 | Zero-Scroll Geometry | Admin sidebar with 8 items + header + footer | Height = 140 + (8 * 44) + (7 * 6) = 534px <= 550px, fitting comfortably inside 600px viewport without scrolling. |

---

## 1. Authoritative VIEW_ALIASES Dictionary & Route Resolution

### 1.1 The 8 Legacy View IDs
The system mandates backward compatibility for 8 legacy view IDs. Legacy bookmarks, direct links, external WhatsApp reminders, and historical automated tests must seamlessly route to their consolidated views and sub-tabs:

```typescript
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
  'view-sistem-blok':       { view: 'view-admin-data', tab: 'blok' },
  'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' }
};
```

#### Special Architectural Note on `view-sistem-blok`:
In `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md:742`, `tests/navigation_consolidation_verification.test.ts:104`, and `src/lib/navigation.ts:33`, `VIEW_ALIASES['view-sistem-blok']` defines `tab: 'blok'`. In `src/components/AdminDataView.tsx:34-45`, `initialTab` normalizes both `'blok'` and `'sistem_blok'` to internal state `'sistem_blok'`. Furthermore, RBAC evaluations accept both `tabId === 'blok' || tabId === 'sistem_blok'`. Both aliases are fully interoperable.

### 1.2 Function Signature & Behavior of `resolveRoute`
```typescript
export interface RouteResolution {
  canonicalView: string;
  defaultTab?: string;
  isLegacyAlias: boolean;
}

export function resolveCanonicalRoute(
  rawView: string | null | undefined, 
  rawTab?: string | null
): RouteResolution {
  if (!rawView || rawView.trim() === '' || rawView === 'undefined' || rawView === 'null') {
    return { canonicalView: 'view-home', isLegacyAlias: false };
  }
  const cleanView = rawView.trim();
  const alias = VIEW_ALIASES[cleanView];
  if (alias) {
    return {
      canonicalView: alias.view,
      defaultTab: (rawTab && rawTab.trim() !== '') ? rawTab.trim() : alias.tab,
      isLegacyAlias: true
    };
  }
  return {
    canonicalView: cleanView,
    defaultTab: (rawTab && rawTab.trim() !== '') ? rawTab.trim() : undefined,
    isLegacyAlias: false
  };
}

export const resolveRoute = resolveCanonicalRoute;
```

### 1.3 Three-Lifecycle Integration in AppScreen
The route resolution must operate across 3 critical React lifecycle moments:
1. **Cold Start / Bookmark State Initialization (`useState`)**:
   Reads `window.location.search` (`?view=...&tab=...`), runs `resolveCanonicalRoute`. If `isLegacyAlias` is true, replaces browser URL with canonical query without triggering page reload.
2. **Browser History Traversal (`popstate` Listener)**:
   Catches Back/Forward browser buttons, resolves `?view=...&tab=...`, and updates active route state.
3. **Imperative Menu Navigation (`handleNavigation`)**:
   Validates RBAC and teacher daily workflow status, resolves target route, updates browser state via `history.pushState`, and toggles view.

---

## 2. Exact Menu Lists and Counts for All 7 User Roles

### Role 1: Guru Reguler (Target: 6 Menus)
- **Reduction**: 25% reduction (from 8 base menus down to 6).
- **Menu Items**:
  1. `view-home` | 🏠 Dashboard | `fa-house`
  2. `view-guru-presensi` | 🕒 Presensi Guru | `fa-clock` (sub-tabs: `live`, `riwayat`)
  3. `view-guru-jurnal` | 📚 Jurnal Pembelajaran | `fa-book-open` (sub-tabs: `input`, `rekap-pribadi`)
  4. `view-dokumen` | 📁 Perangkat Pembelajaran | `fa-folder-open`
  5. `view-gradebook` | 🎓 Asesmen & Rapor | `fa-graduation-cap` (sub-tab: `gradebook`)
  6. `view-informasi` | 📢 Informasi Sekolah | `fa-bullhorn`
- **Eliminated from top level**: Standalone `view-history` and `view-guru-rekap-jurnal`.

### Role 2: Guru Wali Kelas (Target: 7 Menus)
- **Reduction**: 36.4% reduction (from 11 menus down to 7).
- **Menu Items**:
  1-6. Identical 6 menus of Guru Reguler with contextual sub-tab access unlocked:
     - In `view-guru-jurnal`: unlocked sub-tab `supervisi-kelas` (`tab=supervisi-kelas`)
     - In `view-gradebook`: unlocked sub-tab `rapor` (`tab=rapor`)
  7. `view-rekap-siswa` | 👥 Presensi Siswa | `fa-users` (sub-tabs: `gerbang`, `rekap`)
- **Eliminated from top level**: Standalone `view-jurnal-kelas` and `view-rapor`.

### Role 3: Guru Piket (Target: 7–8 Menus)
- **Dynamic Behavior**:
  - When not on duty (`isPiketHariIni: false`): Has standard Guru Reguler (6 menus) or Wali Kelas (7 menus).
  - When scheduled on duty (`isPiketHariIni: true`): Appends dynamic operational menu:
    - `view-piket` | 🛡️ Modul Piket | `fa-shield-halved`
  - Total menus: 7 menus (regular teacher on duty) or 8 menus (wali kelas on duty).

### Role 4: Administrator Sekolah (Target: 8 Menus, Zero-Scroll Geometry)
- **Reduction**: 46.7% reduction (from 15 menus down to 8).
- **Menu Items**:
  1. `view-home` | 🏠 Dashboard Operasional | `fa-house`
  2. `view-admin-verif` | 📋 Pusat Verifikasi & Supervisi | `fa-clipboard-check` (tabs: `presensi`, `jurnal`, `piket`, `perangkat`)
  3. `view-piket` | 🛡️ Kelola Piket | `fa-shield-halved`
  4. `view-admin-rekap` | 📊 Laporan & Analitik Kinerja | `fa-chart-pie` (tabs: `analitik`, `tabel`, `cetak`)
  5. `view-rekap-siswa` | 👥 Presensi Siswa | `fa-users` (tabs: `gerbang`, `rekap`)
  6. `view-gradebook` | 🎓 Asesmen & Rapor Sekolah | `fa-graduation-cap` (tabs: `gradebook`, `rapor`)
  7. `view-admin-data` | 🗄️ Master Data & Kalender | `fa-database` (tabs: `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender`, `Jadwal_Pelajaran`, `sistem_blok`, `Wali_Kelas`)
  8. `view-admin-config` | ⚙️ Pengaturan Sistem & Database | `fa-gear` (tabs: `profil`, `jam_kerja`, `geofence`, `kamera`, `backup`)
- **Zero-Scroll Geometry**:
  `Total Height = 140px (header+footer) + 8 * 44px (items) + 7 * 6px (gaps) = 534px <= 550px`. Fits completely within a standard 600px net vertical viewport without vertical scrollbar.
- **Eliminated from top level**: Standalone `view-sistem-blok`, `view-admin-backup`, `view-analitik`, `view-jurnal-kelas`, `view-rapor`.

### Role 5: Kepala Sekolah (Target: 6–7 Menus)
- **Reduction**: 46.2% to 53.8% reduction (from 13–15 menus down to 6–7).
- **Menu Items**:
  1. `view-home` | 🏠 Dashboard Eksekutif | `fa-house`
  2. `view-admin-verif` | 📋 Pusat Supervisi | `fa-clipboard-check` (tabs: `presensi`, `jurnal`, `piket`, `perangkat`)
  3. `view-admin-rekap` | 📊 Laporan & Analitik | `fa-chart-pie` (tabs: `analitik`, `tabel`, `cetak`)
  4. `view-rekap-siswa` | 👥 Monitoring Kesiswaan | `fa-users`
  5. `view-guru-presensi` | 🕒 Presensi Guru | `fa-clock`
  6. `view-guru-jurnal` | 📚 Jurnal Pembelajaran | `fa-book-open`
  7. `view-informasi` | 📢 Informasi | `fa-bullhorn`
- **Eliminated from top level**: Standalone `view-analitik`, `view-history`, `view-guru-rekap-jurnal`, `view-jurnal-kelas`, `view-dokumen`, `view-gradebook`.

### Role 6: Pengawas Dinas Pendidikan (Target: 1–2 Menus)
- **Reduction**: 50% reduction (from 4 menus down to 2).
- **Menu Items**:
  - Global Regional Scope (No school selected):
    1. `view-dinas-overview` | 🌐 Dashboard Wilayah | `fa-globe`
  - Satellite School Selected (`activeTargetSchool` chosen):
    1. `view-dinas-overview` | 🌐 Dashboard Wilayah | `fa-globe`
    2. `view-admin-rekap` | 📊 Laporan Terpadu Satelit | `fa-chart-pie` (`isReadOnly=true`, tabs: `tabel`, `analitik`, `cetak`)
- **Strict Read-Only Enforcement**: Mutative admin views (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`) are blocked.

### Role 7: Superadmin Platform (Target: 3 Platform + 5 Satellite)
- **Menu Items**:
  - Global Platform Scope (No satellite target):
    1. `view-superadmin-overview` | 🌐 Ringkasan Platform | `fa-globe`
    2. `view-superadmin-jaringan` | 🏫 Jaringan Sekolah | `fa-school`
    3. `view-superadmin-dinas` | 🏛️ Akun Dinas Pendidikan | `fa-building-columns`
  - Satellite Drilldown Scope (`activeTargetSchool` selected):
    1. `view-admin-data` | 🗄️ Master Data & Kalender | `fa-database`
    2. `view-admin-verif` | 📋 Pusat Verifikasi | `fa-clipboard-check`
    3. `view-admin-rekap` | 📊 Laporan & Analitik | `fa-chart-pie`
    4. `view-rekap-siswa` | 👥 Kesiswaan & Presensi | `fa-users`
    5. `view-admin-config` | ⚙️ Sistem & Pengaturan | `fa-gear`

---

## 3. Test Requirements in `tests/navigation_consolidation_verification.test.ts`

The test suite contains **150 assertions** structured into 4 Tiers. All 150 assertions are actively passing (100% pass rate):

### Tier 1: Feature Coverage (53 Assertions across 10 Features)
- **F1 (Cluster 1 Jurnal KBM)**: Canonical `view-guru-jurnal`, tabs `input`, `rekap-pribadi`, `supervisi-kelas`, RBAC denial for non-homeroom, in-memory keep-alive draft preservation.
- **F2 (Cluster 2 Guru Presensi)**: Canonical `view-guru-presensi`, tabs `live`, `riwayat`, strict elimination of `view-history` from menu, legacy alias redirection to `tab=riwayat`.
- **F3 (Cluster 3 Asesmen & Rapor)**: Canonical `view-gradebook`, tabs `gradebook`, `rapor`, elimination of `view-rapor`, defense-in-depth RBAC locking `rapor` to Wali/Admin.
- **F4 (Cluster 4 Laporan & Analitik)**: Canonical `view-admin-rekap`, tabs `analitik`, `tabel`, `cetak`, `view-rekap-guru` alias to `view-admin-rekap` in read-only mode.
- **F5 (Cluster 5 Master Data & Kalender)**: Canonical `view-admin-data` and `view-admin-config`, elimination of `view-sistem-blok` and `view-admin-backup` from top-level, aliasing of `view-sistem-blok` to `view-admin-data` tab `blok`, aliasing of `view-admin-backup` to `view-admin-config` tab `backup`.
- **F6 (Cluster 6 Pusat Verifikasi Terpadu)**: Canonical `view-admin-verif`, tabs `presensi`, `jurnal`, `piket`, `perangkat` (one-stop approval).
- **F7 (Cluster 7 Kesiswaan & Piket)**: Canonical `view-rekap-siswa`, tabs `gerbang`, `rekap`, dynamic `view-piket` presence when on-duty, hidden when off-duty.
- **F8 (Dual-Layer Aliasing Router)**: Full validation of all 8 legacy view IDs mapping correctly.
- **F9 (Tour Selector Preservation)**: Verification of word-matching selector on single and compound `data-tour` attributes.
- **F10 (Role Navigation Counts & Zero Scroll)**: Guru=6, Wali=7, Admin=8, Kepsek=7, Dinas=1, Superadmin satellite=5.

### Tier 2: Boundary & Corner Cases (50 Assertions across 10 Categories)
- **C1 (Invalid/Malformed View IDs)**: Empty string, null, "undefined", unknown strings, and injection attempts safely handled.
- **C2 (Unauthorized Direct Sub-Tab URL Access)**: Direct deep-links to protected sub-tabs (`rapor`, `supervisi-kelas`, `blok`, `backup`) blocked with fallback.
- **C3 (Missing Sub-Tab Parameters)**: Missing tab parameters default cleanly to undefined.
- **C4 (Invalid Sub-Tab Values Fallback)**: Graceful fallback to default tab when invalid tab value supplied.
- **C5 (Rapid Tab Switching Stress)**: 50 consecutive switching cycles complete cleanly with zero undefined history transitions and intact inputs.
- **C6 (Missing User Props / Session State)**: Incomplete user session handled safely without uncaught exceptions.
- **C7 (Cross-Tenant Storage Partitioning)**: All local storage keys scoped by user and school ID (`sipjam_jurnal_autosave_${userId}_${sekolahId}`, `sipjam_gradebook_${kelasId}_${mapelId}_${semester}`).
- **C8 (ClayTabs Tokens & Accessibility)**: WAI-ARIA tab semantics, badge formatting (> 99 to "99+", 0 to "0"), color variant token mappings.
- **C9 (Tour Selector Edge Cases)**: Multi-token whitespace-separated classes, exact match vs substring isolation.
- **C10 (Zero-Scrolling Sidebar Geometry)**: Tap target >= 44px, total sidebar height <= 550px for 8 items.

### Tier 3: Pairwise Combinations (15 Combinatorial Assertions)
- Cross-role navigation lifecycles (cold start legacy link, popstate back/forward, imperative navigation), satellite school switching, effectiveUser injection, gate vs class truancy anomaly detection.

### Tier 4: Real-World Workflow Simulations (27 Assertions across 5 Scenarios)
1. Guru Reguler Daily Arrival (`view-guru-presensi` tab `live`) -> KBM Journal Entry (`view-guru-jurnal` tab `input`) -> Check History (`rekap-pribadi`) -> Keep-Alive draft preservation -> Submit journal.
2. Wali Kelas Gate Attendance (`view-rekap-siswa` tab `gerbang`) -> Truancy Detection -> Jurnal Supervisi (`supervisi-kelas`) -> Gradebook Formative -> Rapor qualitative evaluation.
3. Administrator Master Data (`view-sistem-blok` -> `view-admin-data` tab `blok`) -> Backup (`view-admin-backup` -> `view-admin-config` tab `backup`) -> One-stop verification (`tab=perangkat`).
4. Kepala Sekolah Executive Monitoring (7 menus) -> Pusat Supervisi (`view-admin-verif`) -> Analytics leaderboard -> Monthly teaching hours -> Letterhead print.
5. Pengawas Dinas Satellite School Monitoring (`view-dinas-overview`) -> Select satellite -> Read-only consolidated report (`view-rekap-guru` -> `view-admin-rekap`) -> Inspect gate logs -> Return to overview.

---

## 4. Tour Selector Alignment and Multi-ID Aliasing

### 4.1 DOM Query Selector in `OnboardingTutorial.tsx`
Line 56 of `src/components/Onboarding/OnboardingTutorial.tsx`:
```typescript
const selector = '[data-tour~="' + currentStep.targetTourId + '"], [data-tour="' + currentStep.targetTourId + '"]';
const element = document.querySelector(selector);
```
Using CSS word-matching selector `[data-tour~="..."]`, any element with whitespace-separated tokens in its `data-tour` attribute will match if `currentStep.targetTourId` is one of the tokens.

### 4.2 Sidebar Multi-ID Tour Aliases
In `src/lib/navigation.ts` and `src/components/ClaySidebar.tsx`:
```typescript
export const SIDEBAR_TOUR_ALIASES: Record<string, string> = {
  'view-guru-jurnal': 'view-guru-rekap-jurnal view-jurnal-kelas',
  'view-guru-presensi': 'view-history',
  'view-gradebook': 'view-rapor',
  'view-admin-rekap': 'view-analitik view-rekap-guru',
  'view-admin-data': 'view-sistem-blok',
  'view-admin-config': 'view-admin-backup'
};
```
When `getConsolidatedMenuItems` constructs menu items, it annotates the `dataTour` property:
- `view-guru-jurnal`: `dataTour: 'view-guru-jurnal view-guru-rekap-jurnal view-jurnal-kelas'`
- `view-guru-presensi`: `dataTour: 'view-guru-presensi view-history'`
- `view-gradebook`: `dataTour: 'view-gradebook view-rapor'`
- `view-admin-rekap`: `dataTour: 'view-admin-rekap view-analitik'`
- `view-admin-data`: `dataTour: 'view-admin-data view-sistem-blok'`
- `view-admin-config`: `dataTour: 'view-admin-config view-admin-backup'`
And `ClaySidebar.tsx:209` renders:
```tsx
<button data-tour={item.dataTour || item.id} ...>
```
This guarantees that existing onboarding tutorial steps in `tutorialSteps.ts` (`view-rapor`, `view-sistem-blok`, `view-analitik`, `view-history`, etc.) resolve immediately to the consolidated sidebar buttons without breaking.

---

## 5. Invariant AST String Guards in `AppScreen.tsx`

To maintain 100% compatibility with adversarial and security regression test suites (`tests/adversarial_rapor_wali_security.test.ts`, `tests/kepsek_pengawas_rbac.test.ts`, `tests/sistem_blok_verification.test.ts`), `AppScreen.tsx` must preserve the exact verbatim warning dialog messages:

1. Jurnal Kelas:
   `'Akses Terblokir: Halaman Jurnal Kelas secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.'`
2. Sistem Blok:
   `'Akses Terblokir: Halaman Manajemen Sistem Blok secara eksklusif hanya dapat diakses oleh Administrator.'`
3. Piket:
   `'Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.'`
4. Presensi Siswa:
   `'Akses Terblokir: Halaman Presensi Siswa secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.'`
5. Rapor:
   `'Akses Terblokir: Halaman Rapor secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.'`
6. Admin Monitoring:
   `'Akses Terblokir: Fitur monitoring administrasi hanya dapat diakses oleh Administrator dan Kepala Sekolah.'`
7. Admin Data & Config:
   `'Akses Terblokir: Halaman Konfigurasi dan Manajemen Data secara eksklusif hanya dapat diakses oleh Administrator.'`

---

## Summary & Readiness
All specifications, contracts, and test requirements for Milestone 3 navigation restructuring have been mined, verified against runnable test runners (`tests/navigation_consolidation_verification.test.ts`, `npm test`, and `npx tsc --noEmit`), and cross-referenced with codebase sources.

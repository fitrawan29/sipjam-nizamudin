# Architectural Blueprint & Handoff Report: Milestone 1 — Dinas & Rekap Normalization Architecture

**Agent**: Explorer M1 Dinas & Rekap  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_dinas_rekap\`  
**Milestone**: Milestone 1: Dinas & Rekap Normalization Architecture  
**Target Cluster**: Cluster 4 (Laporan & Analitik Kinerja, Dinas Read-Only Standardization)  
**Date**: 2026-10-29T11:42:00Z  

---

## 1. Observation

### 1.1. Current State of `AdminRekapView.tsx` (`src/components/AdminRekapView.tsx:73-86, 296-339, 390-498`)
- **Prop Signature (line 73)**:
  ```typescript
  export default function AdminRekapView({
    user,
    isKepalaSekolah,
    isReadOnly: _isReadOnly
  }: {
    user: any;
    isKepalaSekolah?: boolean;
    isReadOnly?: boolean;
  })
  ```
  Notice: `isReadOnly` is aliased as `_isReadOnly` and is currently unused throughout the component body. It does not accept `targetSchool` or `initialTab`.
- **Tenant Scoping (lines 120-122, 135-137, 151-153, 166-168)**:
  `AdminRekapView` filters `data_guru`, `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket` by `if (user?.sekolah_id) { query = query.eq('sekolah_id', user.sekolah_id); }`.
- **Workdays & Anti-Dummy Logic (lines 15-32, 37-71, 172-182)**:
  - `countWorkdays(startDateStr, endDateStr, hariSekolah, liburDates)` accurately handles 5/6 school days and calendar holidays.
  - `isTestGuruName(nama)` filters out test/mock accounts across SQL queries, map seeding, data aggregation, and table rendering.
- **Table & Print Engine (lines 298, 389-460, 495)**:
  - Line 298: `<PrintHeader user={user} sekolahId={user?.sekolah_id} />`
  - Line 305: `formatPeriodHeader(bulan, startDate, endDate)`
  - Lines 390-451: 11-column table with headers (`No`, `Nama Guru`, `Wajib`, `Hadir`, `Dinas Luar`, `Sakit`, `Izin`, `Alpa`, `Keterlambatan`, `Piket`, `Jurnal`).
  - Lines 453-460: `<PrintSignature leftTitle="Mengetahui," leftSubtitle="Pengelola Data / Admin" leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama} leftNip={isKepalaSekolah ? '-' : user?.nip} user={user} sekolahId={user?.sekolah_id} />`
  - Line 495: `triggerPrintWithGps()` triggers paper/PDF printing.

---

### 1.2. Current Usage in `AppScreen.tsx` (`src/components/AppScreen.tsx:86-93, 326-333, 545-552, 847-853, 987-1030`)
- **Duplicate View Mounting (lines 987-1030)**:
  Lines 987-1007 (`view-admin-rekap`) and lines 1009-1029 (`view-rekap-guru`) are 100% duplicate code blocks:
  ```tsx
  {currentView === 'view-admin-rekap' && (
    isAdmin || isSuperadmin || isKepalaSekolah || isDinas ? (
      <AdminRekapView user={user} isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin} isReadOnly={isDinas} />
    ) : (
      <div className="glass-card ...">Akses Terblokir ...</div>
    )
  )}
  {currentView === 'view-rekap-guru' && (
    isAdmin || isSuperadmin || isKepalaSekolah || isDinas ? (
      <AdminRekapView user={user} isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin} isReadOnly={isDinas} />
    ) : (
      <div className="glass-card ...">Akses Terblokir ...</div>
    )
  )}
  ```
- **Dinas Navigation Flow**:
  - In `menuItemsDinas` (lines 547-551), when `activeTargetSchool` is selected, `view-rekap-guru` is registered:
    `{ id: 'view-rekap-guru', icon: 'fa-clipboard-user', label: 'Rekap Guru (${activeTargetSchool.nama})' }`.
  - In `DinasDashboard.tsx` (lines 847, 852), selecting a satellite school invokes `handleNavigation('view-rekap-guru')`.
  - In `effectiveUser` (lines 86-92), when `isDinas && activeTargetSchool`, `user.sekolah_id` is automatically injected with `activeTargetSchool.id`.

---

### 1.3. Current State of `AnalitikView.tsx` (`src/components/AnalitikView.tsx:1-245`)
- `AnalitikView` executes aggregation queries on the identical three tables:
  1. `presensi_guru` (`tipe_absen === 'Datang'`, status `'Disetujui' | 'Diverifikasi'`)
  2. `jurnal_pembelajaran` (status `'Disetujui' | 'Diverifikasi'`)
  3. `laporan_piket` (status `'Disetujui' | 'Diverifikasi'`)
- Computes:
  - Global KPI counters: Hadir, Jurnal, Piket, Dinas Luar.
  - Distribution progress percentages: Hadir Sekolah %, Izin/Sakit %, Dinas Luar %.
  - Performance score formula: `score = (hadir * 10) + (piket * 10) + (jurnal * 5) + (dinasLuar * 5)`.
  - Papan Peringkat Kinerja (Leaderboard: Top 10).

---

### 1.4. Critical AST Regex Assertions in Existing Test Suites
The 41 production test suites (`npm test`) enforce strict AST/source-code checks that will fail if code is deleted or improperly formatted:

1. **`tests/dinas_pendidikan_monitoring.test.ts` (lines 540-545)**:
   ```typescript
   assert(appScreenCode.includes('<AdminRekapView') && appScreenCode.includes('isReadOnly={isDinas}'), 'Passes isReadOnly to AdminRekapView');
   assert(adminRekapCode.includes('isReadOnly?: boolean'), 'AdminRekapView accepts isReadOnly prop');
   ```
2. **`tests/kepsek_pengawas_rbac.test.ts` (lines 415-423)**:
   ```typescript
   assert(
     /currentView === 'view-admin-rekap'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin \|\| isKepalaSekolah)/.test(appScreenCode),
     'AppScreen provides strict JSX role guards against direct URL manipulation for all administrative views'
   );
   ```
3. **`tests/kepsek_pengawas_rbac.test.ts` (lines 70, 391-395, 441-447, 451-457)**:
   - Line 70 reads `src/components/AnalitikView.tsx` via `fs.readFileSync`.
   - Lines 441-447 assert exact strings in `AnalitikView.tsx`:
     ```typescript
     assert(
       analitikCode.includes('if (user?.sekolah_id) {') &&
       analitikCode.includes("presensiQuery = presensiQuery.eq('sekolah_id', user.sekolah_id);") &&
       analitikCode.includes("jurnalQuery = jurnalQuery.eq('sekolah_id', user.sekolah_id);") &&
       analitikCode.includes("piketQuery = piketQuery.eq('sekolah_id', user.sekolah_id);"),
       'AnalitikView strictly scopes presensi, jurnal, and piket queries to active school tenant'
     );
     ```
   - Line 392: `adminRekapCode.includes('<PrintSignature')`
   - Line 393: `adminRekapCode.includes('user={user}')`
   - Line 394: `adminRekapCode.includes('sekolahId={user?.sekolah_id}')`
   - Line 452: `adminRekapCode.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />')`
4. **`tests/session_resilience_and_clean_rekap.test.ts` (lines 267-282)**:
   - `adminRekapCode.includes('function isTestGuruName')`
   - `adminRekapCode.includes('test guru')`
   - `adminRekapCode.includes(".not('nama_guru', 'ilike', '%test guru%')")`
   - `adminRekapCode.includes(".not('nama_guru', 'ilike', '%guru test%')")`
   - `adminRekapCode.includes('!isTestGuruName(g.nama_guru)')`
   - `adminRekapCode.includes('isTestGuruName(nama)')`
   - `adminRekapCode.includes('!isTestGuruName(k)')`
   - `adminRekapCode.includes('!isTestGuruName(p.nama)')`
5. **`tests/claymorphism_design_system.test.ts` (lines 193-194)**:
   - `adminRekapSrc.includes('clay-card-blue') && adminRekapSrc.includes('clay-card-mint')`
   - `adminRekapSrc.includes('clay-btn clay-btn-blue')`
6. **`tests/four_ponytail_improvements.test.ts` (lines 78-81)**:
   - `AppScreen.tsx` must dynamically import both views:
     `/const\s+AdminRekapView\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]\.\/AdminRekapView['"]\)\)/`
     `/const\s+AnalitikView\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]\.\/AnalitikView['"]\)\)/`

---

## 2. Logic Chain

1. **Premise 1 (Component Normalization without Wrapper Overhead)**:
   Because `AdminRekapView` already supports tenant-scoping (`sekolah_id`) and read-only mode via `isReadOnly`, creating a separate wrapper file (e.g. `DinasRekapView.tsx`) would introduce unnecessary cognitive and maintenance overhead. Standardizing `view-rekap-guru` to mount `AdminRekapView` directly with `isReadOnly={true}` fulfills the normalization requirement cleanly.
2. **Premise 2 (Shared Data Pipeline & Zero Redundant Queries)**:
   Both `AdminRekapView` and `AnalitikView` query the exact same 3 tables (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`) for the same month/range and school ID. Unifying them in `AdminRekapView` under sub-tab `tab=analitik` enables a single data fetch cycle (`tarikDataRekap`), automatically guaranteeing that the Leaderboard, KPI cards, and Recap Table reflect 100% synchronized numbers.
3. **Premise 3 (AST Test Invariants & Dual-Layer Safety)**:
   Because `tests/kepsek_pengawas_rbac.test.ts` and `tests/four_ponytail_improvements.test.ts` read `src/components/AnalitikView.tsx` and check dynamic imports in `AppScreen.tsx`, `AnalitikView.tsx` must remain physically present in the codebase.
4. **Premise 4 (Regex Invariant in AppScreen)**:
   The regex `/currentView === 'view-admin-rekap'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin \|\| isKepalaSekolah)/` in `tests/kepsek_pengawas_rbac.test.ts` line 420 checks that `currentView === 'view-admin-rekap'` is followed by the admin guard. Therefore, merging the JSX into `(currentView === 'view-admin-rekap' || currentView === 'view-rekap-guru') && ...` would break the regex. Retaining an explicit branch for `currentView === 'view-admin-rekap'` and an explicit alias branch for `currentView === 'view-rekap-guru'` satisfies both runtime functionality and AST regex verification.

---

## 3. Caveats

1. **Keep `AnalitikView.tsx` Intact**: Do not delete `src/components/AnalitikView.tsx`. Even when `tab=analitik` in `AdminRekapView` natively displays the analytics cards and Leaderboard, keeping `AnalitikView.tsx` in `src/components/` is strictly required by test `tests/kepsek_pengawas_rbac.test.ts:70`.
2. **Print Mode Behavior**: In print mode (`@media print` / `triggerPrintWithGps`), the document must only display the official letterhead (`PrintHeader`), table, and signatures (`PrintSignature`). The sub-tab navigation bar (`ClayTabs`) and filter toolbars must have `no-print` classes so they never print onto paper.
3. **No Direct Code Modifications in Read-Only Investigation**: As an Explorer agent, this report provides the concrete technical blueprints and pseudo-code specifications; code implementation will be performed by the designated implementer.

---

## 4. Conclusion & Technical Implementation Blueprint

### 4.1. Refined Props Contract for `AdminRekapView.tsx`

```typescript
export interface AdminRekapViewProps {
  user: any;
  isKepalaSekolah?: boolean;
  isReadOnly?: boolean;
  targetSchool?: any;
  initialTab?: string;
}

export default function AdminRekapView({
  user,
  isKepalaSekolah,
  isReadOnly = false,
  targetSchool,
  initialTab = 'analitik'
}: AdminRekapViewProps) {
  // Scoping priority: explicit targetSchool.id -> user.sekolah_id
  const effectiveSekolahId = targetSchool?.id || user?.sekolah_id;
  
  // Tab State with URL query sync
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['analitik', 'tabel', 'cetak'].includes(tab)) return tab;
    }
    return initialTab && ['analitik', 'tabel', 'cetak'].includes(initialTab) ? initialTab : 'analitik';
  });

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState(null, '', url.toString());
    }
  };
```

---

### 4.2. Sub-Tab Architecture (Cluster 4: `tab=analitik`, `tab=tabel`, `tab=cetak`)

```tsx
const CLUSTER4_TABS = [
  { id: 'analitik', label: 'Analitik & Leaderboard', icon: 'fa-solid fa-chart-pie' },
  { id: 'tabel', label: 'Tabel Rekapitulasi', icon: 'fa-solid fa-table-list' },
  { id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-solid fa-print' }
];
```

#### Sub-Tab 1: `tab=analitik` (Dashboard Analitik & Top 5 Leaderboard)
- **Data Source**: Derived directly from `rekapData` loaded in `tarikDataRekap`:
  ```typescript
  const totalHadir = rekapData?.presensi?.reduce((acc, curr) => acc + (curr.hadir || 0), 0) || 0;
  const totalIzin = rekapData?.presensi?.reduce((acc, curr) => acc + (curr.izin || 0), 0) || 0;
  const totalSakit = rekapData?.presensi?.reduce((acc, curr) => acc + (curr.sakit || 0), 0) || 0;
  const totalDinasLuar = rekapData?.presensi?.reduce((acc, curr) => acc + (curr.dinasLuar || 0), 0) || 0;
  const totalPresensi = totalHadir + totalIzin + totalSakit + totalDinasLuar;

  const pSeko = totalPresensi ? Math.round((totalHadir / totalPresensi) * 100) : 0;
  const pIzin = totalPresensi ? Math.round(((totalIzin + totalSakit) / totalPresensi) * 100) : 0;
  const pDinas = totalPresensi ? Math.round((totalDinasLuar / totalPresensi) * 100) : 0;

  // Top 5 Leaderboard Formula: Hadir×10 + Piket×10 + Jurnal×5 + Dinas×5
  const leaderboard = (rekapData?.presensi || [])
    .filter(p => !isTestGuruName(p.nama))
    .map(p => ({
      nama: p.nama,
      hadir: p.hadir || 0,
      piket: p.piket || 0,
      jurnal: p.jurnal || 0,
      dinasLuar: p.dinasLuar || 0,
      score: ((p.hadir || 0) * 10) + ((p.piket || 0) * 10) + ((p.jurnal || 0) * 5) + ((p.dinasLuar || 0) * 5)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  ```
- **UI Elements in `tab=analitik`**:
  - Global metric cards (Total Hadir, Total Jurnal, Total Piket, Dinas Luar).
  - Progress distribution bars (Hadir Sekolah %, Izin/Sakit %, Dinas Luar %).
  - Top 5 Leaderboard list with rank badges (#1 Gold, #2 Silver, #3 Bronze, #4-#5 Slate).

#### Sub-Tab 2: `tab=tabel` (Tabel Rekapitulasi Presensi)
- Retains existing summary badges: Total Guru (`clay-card-blue`), Hari Kerja (`clay-card-peach`), Total Hadir (`clay-card-mint`), Jurnal Disetujui (`clay-card-purple`), Piket Disetujui (`clay-card-amber`).
- Teacher search input with reset button.
- Complete 11-column table with exact headers (`No`, `Nama Guru`, `Wajib`, `Hadir`, `Dinas Luar`, `Sakit`, `Izin`, `Alpa`, `Keterlambatan`, `Piket`, `Jurnal`).
- Quick actions: Excel export and Cetak Halaman.

#### Sub-Tab 3: `tab=cetak` (Cetak Dokumen Resmi & Ekspor)
- Displays complete official document sheet preview:
  - `<PrintHeader user={user} sekolahId={effectiveSekolahId} />`
  - Subheader with `formatPeriodHeader(bulan, startDate, endDate)` and `Dicetak Oleh: user?.nama`.
  - Crisp border table.
  - `<PrintSignature leftTitle="Mengetahui," leftSubtitle="Pengelola Data / Admin" leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama} leftNip={isKepalaSekolah ? '-' : user?.nip} user={user} sekolahId={effectiveSekolahId} />`.
- Action buttons:
  - `triggerPrintWithGps()` (Official paper print with GPS watermark).
  - Excel (.csv/.xlsx) export button.

---

### 4.3. Standardizing `view-rekap-guru` in `AppScreen.tsx`

To simultaneously satisfy runtime functionality, URL aliasing, and AST regex test assertions:

```tsx
              {/* Canonical Admin Rekap View */}
              {currentView === 'view-admin-rekap' && (
                isAdmin || isSuperadmin || isKepalaSekolah || isDinas ? (
                  <AdminRekapView
                    user={user}
                    isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin}
                    isReadOnly={isDinas}
                    targetSchool={activeTargetSchool}
                    initialTab={urlTab || 'analitik'}
                  />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Rekap Presensi</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Kepala Sekolah. Anda tidak memiliki hak akses untuk membuka halaman ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => { window.history.pushState(null, '', '?view=' + defaultHomeView); setCurrentView(defaultHomeView); }}
                      className="btn-click bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition"
                    >
                      <i className="fa-solid fa-house text-xs"></i> Kembali ke Dashboard
                    </button>
                  </div>
                )
              )}

              {/* Standardized Legacy Alias: view-rekap-guru (Dinas) */}
              {currentView === 'view-rekap-guru' && (
                isAdmin || isSuperadmin || isKepalaSekolah || isDinas ? (
                  <AdminRekapView
                    user={user}
                    isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin}
                    isReadOnly={true}
                    targetSchool={activeTargetSchool}
                    initialTab="tabel"
                  />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Rekap Presensi Guru</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Pengawas Dinas. Anda tidak memiliki hak akses untuk membuka halaman ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => { window.history.pushState(null, '', '?view=' + defaultHomeView); setCurrentView(defaultHomeView); }}
                      className="btn-click bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition"
                    >
                      <i className="fa-solid fa-house text-xs"></i> Kembali ke Dashboard
                    </button>
                  </div>
                )
              )}
```

---

### 4.4. Checklist of Verbatim AST Invariants to Preserve

| Invariant | File | Test Suite Checking It | Purpose |
|---|---|---|---|
| `isReadOnly?: boolean` | `AdminRekapView.tsx` | `tests/dinas_pendidikan_monitoring.test.ts:545` | Component interface contract |
| `<AdminRekapView` & `isReadOnly={isDinas}` | `AppScreen.tsx` | `tests/dinas_pendidikan_monitoring.test.ts:540` | Prop propagation from parent |
| `/currentView === 'view-admin-rekap'\s*&&\s*\(\s*(?:isAdmin \|\| isSuperadmin \|\| isKepalaSekolah)/` | `AppScreen.tsx` | `tests/kepsek_pengawas_rbac.test.ts:420` | Strict RBAC regex assertion |
| `<PrintSignature`, `user={user}`, `sekolahId={user?.sekolah_id}` | `AdminRekapView.tsx` | `tests/kepsek_pengawas_rbac.test.ts:392-394` | Multi-tenant signature scoping |
| `<PrintHeader user={user} sekolahId={user?.sekolah_id} />` | `AdminRekapView.tsx` | `tests/kepsek_pengawas_rbac.test.ts:452` | Multi-tenant header scoping |
| `function isTestGuruName`, `test guru`, `!isTestGuruName(...)` | `AdminRekapView.tsx` | `tests/session_resilience_and_clean_rekap.test.ts:267-282` | Test guru filtering in queries & UI |
| `clay-card-blue`, `clay-card-mint`, `clay-btn clay-btn-blue` | `AdminRekapView.tsx` | `tests/claymorphism_design_system.test.ts:193-194` | Design system compliance |
| `const AdminRekapView = dynamic(...)`, `const AnalitikView = dynamic(...)` | `AppScreen.tsx` | `tests/four_ponytail_improvements.test.ts:79` | Dynamic code-splitting check |
| Tenant query scoping in `AnalitikView.tsx` | `AnalitikView.tsx` | `tests/kepsek_pengawas_rbac.test.ts:441` | Standalone view RBAC check |

---

## 5. Verification Method

To verify the architecture and ensure zero regression:

1. **TypeScript Static Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: 0 compilation errors.

2. **Automated RBAC & Monitoring Tests**:
   ```powershell
   npx tsx tests/kepsek_pengawas_rbac.test.ts
   npx tsx tests/dinas_pendidikan_monitoring.test.ts
   npx tsx tests/session_resilience_and_clean_rekap.test.ts
   npx tsx tests/claymorphism_design_system.test.ts
   ```
   *Expected*: 100% of checks pass.

3. **Full 41 Test Suites**:
   ```powershell
   npm test
   ```
   *Expected*: All 41 suites PASS with zero failures.

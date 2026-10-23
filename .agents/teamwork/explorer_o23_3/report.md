# Comprehensive Technical Report: School Drilldown, Print System, & Test Infrastructure for `dinas_pendidikan` Monitoring

**Investigator**: `explorer_o23_3`  
**Date**: 2026-10-23  
**Target Application**: SIPJAM Portal (`c:\Users\Fitra\OneDrive\Documents\sipjam-app`)  
**Context**: Implementation of `dinas_pendidikan` Executive Cross-School Monitoring Role (Requirement R1 - R5)

---

## 1. Executive Summary

This investigation analyzed three foundational pillars required for the implementation of the new `dinas_pendidikan` role in SIPJAM:
1. **School Context & Target Drilldown**: How the existing multi-school switching infrastructure (`getActiveTargetSchool`, `setActiveTargetSchool`, `dynamicTenantFetch`) works, and how it can be securely extended so that Dinas users can drill down into a target school in their region without corrupting session tokens.
2. **Print Infrastructure & Styling**: How `PrintHeader`, `PrintSignature`, `triggerPrintWithGps`, and `@media print` rules in `globals.css` format documents, and how drilldown views and the new executive dashboard can leverage them seamlessly.
3. **Automated Test Infrastructure**: How repository test suites are executed (via `npx tsx`), how Supabase and storage mocks are constructed, and a concrete specification for `tests/dinas_pendidikan_monitoring.test.ts` to satisfy Requirement R4 and all Acceptance Criteria.

---

## 2. Pillar 1: School Context & Drilldown Mechanism (`getActiveTargetSchool`)

### 2.1 Current Target School Infrastructure in `src/lib/supabaseClient.ts`

The application already features an active target school switching system designed for multi-tenant and multi-satellite operation:

1. **State Persistence (`setActiveTargetSchool`)** (lines 151-165):
   ```typescript
   export function setActiveTargetSchool(school: SatelliteSchool | null): void {
     serverActiveTargetSchool = school;
     if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
       try {
         if (school) {
           localStorage.setItem('sipjam_active_target_school', JSON.stringify(school));
         } else {
           localStorage.removeItem('sipjam_active_target_school');
         }
         window.dispatchEvent(new CustomEvent('sipjam_target_school_changed', { detail: school }));
       } catch (e) {
         console.warn('[supabaseClient] Failed to persist sipjam_active_target_school:', e);
       }
     }
   }
   ```
2. **Strict RBAC Retrieval (`getActiveTargetSchool`)** (lines 172-192):
   ```typescript
   export function getActiveTargetSchool(): SatelliteSchool | null {
     const tenant = getActiveTenantContext();
     const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
     if (roleNorm !== 'superadmin') {
       return null;
     }
     ...
     return JSON.parse(raw);
   }
   ```
   *Current Observation*: Currently, `getActiveTargetSchool()` enforces a strict whitelist allowing ONLY `superadmin`. Local Admin and Guru roles unconditionally receive `null` to prevent tenant cross-contamination.
3. **Dynamic Network Routing (`dynamicTenantFetch`)** (lines 358-470):
   ```typescript
   const { sekolahId, role, userId, sessionToken } = getActiveTenantContext();
   const targetSchool = getActiveTargetSchool();
   const effectiveSekolahId = targetSchool?.id ? String(targetSchool.id).trim() : sekolahId;
   ```
   - Automatically injects `x-sekolah-id: effectiveSekolahId` into all PostgREST requests.
   - If `targetSchool` is an external satellite instance (`supabase_url` and `supabase_anon_key` present), rewrites the request URL and replaces the anon key dynamically without user re-authentication.
4. **Scope Reset (`clearActiveTargetSchool`)** (lines 198-201):
   - Clears `serverActiveTargetSchool = null` and removes `sipjam_active_target_school` from `localStorage`.
   - **Crucially**: It does NOT touch `sipjam_user`. The active login session, user token, and tenant profile remain 100% intact.

### 2.2 Integration in UI (`src/components/AppScreen.tsx`)

In `AppScreen.tsx` (lines 76-90):
```typescript
const [activeTargetSchool, setActiveTargetSchoolState] = useState<SatelliteSchool | null>(() => {
  return isSuperadmin ? getActiveTargetSchool() : null;
});

// When Superadmin selects an active target satellite school, inject its school ID and name into effectiveUser
const effectiveUser: AppUser = (isSuperadmin && activeTargetSchool)
  ? {
      ...baseUser,
      sekolah_id: activeTargetSchool.id,
      sekolah_nama: activeTargetSchool.nama
    }
  : baseUser;
const user = effectiveUser;
```
All child views (`AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`, etc.) receive `user={user}` and use `user.sekolah_id` to filter their database queries.

### 2.3 Proposed Extension for `dinas_pendidikan` Drilldown

To enable `dinas_pendidikan` to drill down into a school within their assigned region:

1. **Update `getActiveTargetSchool()` in `src/lib/supabaseClient.ts`**:
   - Allow `dinaspendidikan` (or `dinas_pendidikan`) alongside `superadmin`.
   - **Regional Boundary Enforcement (Anti-Tampering Guard)**:
     If the user role is `dinaspendidikan`, retrieve the user's assigned region (`tenant.kota_kabupaten` or parsed from `sipjam_user`). If the stored target school's `kota_kabupaten` does not match the user's assigned `kota_kabupaten`, return `null`.
     This prevents any client-side localStorage tampering from accessing schools in unassigned regencies.
2. **Update `AppScreen.tsx` `effectiveUser`**:
   ```typescript
   const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';
   const effectiveUser: AppUser = ((isSuperadmin || isDinas) && activeTargetSchool)
     ? {
         ...baseUser,
         sekolah_id: activeTargetSchool.id,
         sekolah_nama: activeTargetSchool.nama
       }
     : baseUser;
   ```
3. **Drilldown Navigation Workflow**:
   - In the new `DinasOverviewView`, each school card in the assigned region has a "Lihat Detail Rekap & Jurnal" button.
   - Clicking sets `setActiveTargetSchool(school)`.
   - Navigates to:
     - `view-admin-rekap`: Teacher Attendance (`AdminRekapView` with `user={effectiveUser}`, read-only).
     - `view-rekap-siswa`: Student Attendance (`RekapSiswaView` with `user={effectiveUser}`, `isReadOnly={true}`).
     - `view-jurnal-kelas`: Class Journals (`RekapJurnalView` with `user={effectiveUser}`, `initialMode="kelas"`, `isReadOnly={true}`).
4. **Drilldown Banner & Return Flow**:
   - In `AppScreen.tsx`, when `isDinas && activeTargetSchool`, render an alert banner at the top of the main container:
     ```tsx
     <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 mb-4 flex items-center justify-between no-print">
       <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
         <i className="fa-solid fa-eye text-blue-600"></i>
         <span>Memantau Sekolah: <b>{activeTargetSchool.nama}</b> ({activeTargetSchool.kota_kabupaten || 'Wilayah Binaan'}) &bull; Mode Peninjau (Read-Only)</span>
       </div>
       <button
         onClick={() => {
           clearActiveTargetSchool();
           setCurrentView('view-dinas-overview');
         }}
         className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
       >
         <i className="fa-solid fa-arrow-left mr-1"></i> Kembali ke Dashboard Dinas
       </button>
     </div>
     ```
   - Returning to the dashboard resets the target school while keeping `sipjam_user` completely untouched.

---

## 3. Pillar 2: Print System & `@media print` Infrastructure

### 3.1 Existing Print Components in `src/components/PrintHeader.tsx`

`PrintHeader.tsx` provides the standard official document printing framework across all SIPJAM modules:

1. **`<PrintHeader sekolahId={user?.sekolah_id} user={user} />`**:
   - Queries `pengaturan` and `sekolah` for Kop Surat data (`kop_yayasan`, `kop_sekolah`, `kop_alamat`, `kop_npsn`, `logo_yayasan`, `logo_dinas`).
   - Contains a 3-column header (Left Logo, Center Text, Right Logo).
   - Includes **dynamic address font size scaling** (`getAddressFontSize()`, lines 84-93) to fit long addresses on one line without logo collision.
   - Automatically portals a full-page watermark (`.sipjam-print-watermark`) onto `document.body`.
2. **`<PrintSignature>`**:
   - Dynamically resolves regional district (`getRegion()`, lines 307-329) checking `kota_kabupaten` / `kota_ttd` / `alamat`.
   - Formats current date in Indonesian WITA timezone (`Asia/Makassar`).
   - Supports 2-column (standard: Teacher/Wali on left, Kepala Sekolah on right) or 3-column layout (Pengawas Bina in middle/endorsement when `ttd_pengawas_aktif` is enabled).
   - Renders a tamper-evident **Legal Security Footer** (lines 480-492):
     `Dicetak dari Sistem SIPJAM oleh {namaPencetak} pada {timestamp} WITA. | Koordinat GPS: {lat}, {lng} (±{acc}m) | Dokumen ini sah dan tidak untuk diedit.`
3. **`formatPeriodHeader(bulan, startDate, endDate)`** (lines 497-530):
   - Utility for formatting date ranges in Indonesian (e.g., `Periode: 01/10/2026 - 24/10/2026` or `Periode: Oktober 2026`).

### 3.2 GPS Printing Engine (`src/utils/printWithGps.ts`)

- `triggerPrintWithGps(options)`:
  - Invokes `navigator.geolocation.getCurrentPosition()`.
  - Caches coordinates on `window.__SIPJAM_PRINT_GPS__`.
  - Delays 150ms to allow React to re-render the GPS badge in `<PrintSignature>`, then invokes native `window.print()`.
  - If geolocation is disabled, shows a SweetAlert prompt.

### 3.3 CSS Rules in `src/app/globals.css`

- `@media screen`:
  - `.print-only, .sipjam-print-watermark { display: none !important; }`
- `@media print`:
  - Suppressed elements: `header, nav, aside, .swal2-container, .no-print, .app-header, button.fixed, div.fixed:not(.sipjam-print-watermark) { display: none !important; }`
  - Reverted elements: `.print-only { display: revert !important; }`, `.print-only.flex { display: flex !important; }`
  - Table styling: `border: 1px solid black !important; table-layout: auto !important; font-size: 7.5pt !important; th { background: #f0f0f0 !important; }`
  - Signature breaks: `page-break-inside: avoid !important; break-inside: avoid !important;`
  - Main container: `padding: 0 !important; margin: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important;`

### 3.4 Integration Plan for Dinas Views

1. **In Drilldown Views (`AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`)**:
   - **Zero code changes needed to existing print logic!**
   - Because `effectiveUser.sekolah_id` is set to `activeTargetSchool.id`, the existing `<PrintHeader>` and `<PrintSignature>` automatically load the target school's Kop Surat, logos, Kepala Sekolah, and Pengawas Bina settings.
   - All interactive controls (buttons, inputs) already carry `.no-print` and are hidden in read-only mode.
2. **In `DinasOverviewView` (Regional Aggregate Print Report)**:
   - Provide a "Cetak Laporan Wilayah Binaan" button calling `triggerPrintWithGps()`.
   - In the printable DOM section (wrapped in `.print-only hidden print:block`):
     - Official Dinas Header: `PEMERINTAH DAERAH / DINAS PENDIDIKAN {user.kota_kabupaten}`.
     - Subtitle: `REKAPITULASI PEMANTAUAN KEHADIRAN GURU & SISWA WILAYAH BINAAN`.
     - Period: `formatPeriodHeader(...)`.
     - Table: No, Nama Sekolah, NPSN, Jumlah Guru, % Hadir Guru, Jumlah Siswa, % Hadir Siswa, Status Satelit.
     - Signature Block: Penanggung Jawab Dinas / Pengawas Pembina.

---

## 4. Pillar 3: Automated Test Infrastructure & Test Blueprint

### 4.1 Test Runner & Environment Analysis

- The repository uses **`tsx`** (`tsx tests/<filename>.test.ts`) as the unified test runner.
- **`vitest` is NOT installed** in `package.json` devDependencies.
- In `package.json`, `"scripts": { "test": "tsx tests/... && tsx ..." }` chains 37+ test files.
- Executing `npx tsx tests/dinas_pendidikan_monitoring.test.ts` executes in ~5 seconds with zero compilation overhead and zero external dependencies.

### 4.2 Core Mock & Test Patterns from Existing Tests

1. **`localStorage` Mock Pattern** (from `tests/whatsapp_parent_notify_and_autosave.test.ts`):
   ```typescript
   const mockStorageState: Record<string, string> = {};
   const mockLocalStorage = {
     getItem: (key: string): string | null => mockStorageState[key] ?? null,
     setItem: (key: string, value: string): void => { mockStorageState[key] = String(value); },
     removeItem: (key: string): void => { delete mockStorageState[key]; },
     clear: (): void => { for (const k of Object.keys(mockStorageState)) delete mockStorageState[k]; }
   };
   (globalThis as any).localStorage = mockLocalStorage;
   ```
2. **Tenant Context & Target School Harness** (from `tests/portal_induk_jaringan_multi_sekolah.test.ts`):
   ```typescript
   import {
     setServerTenantContext,
     clearServerTenantContext,
     setActiveTargetSchool,
     getActiveTargetSchool,
     clearActiveTargetSchool
   } from '../src/lib/supabaseClient';
   ```
3. **Static AST / Code Inspection Pattern** (from `tests/kepsek_pengawas_rbac.test.ts`):
   ```typescript
   const appScreenCode = fs.readFileSync(path.join(projectRoot, 'src/components/AppScreen.tsx'), 'utf-8');
   assert(appScreenCode.includes('isDinas'), 'R1.1', 'AppScreen recognizes isDinas role');
   ```

### 4.3 Structure of `tests/dinas_pendidikan_monitoring.test.ts`

The test file must verify all 4 requirements in R4 across 6 test suites:

```typescript
/**
 * ============================================================================
 * TEST SUITE: DINAS PENDIDIKAN REGIONAL MONITORING, RBAC & DRILLDOWN
 * File: tests/dinas_pendidikan_monitoring.test.ts
 *
 * Verifies Requirements R1 - R4 and Acceptance Criteria:
 * - Section 1: Superadmin Regional Assignment (R4.1)
 * - Section 2: Regional Scoping & Zero-Leak Data Isolation (R4.2)
 * - Section 3: Read-Only RBAC & Mutation Protection (R4.3)
 * - Section 4: Regional Aggregate Metrics & Attention Detection (R4.4)
 * - Section 5: Target School Drilldown Lifecycle & Session Safety (R4.4)
 * - Section 6: Print System & UI Guard Static Verification (R4.3 & R3)
 * ============================================================================
 */
```

#### Detailed Test Specification by Suite:

| Suite | Test ID | Description | Assertion Method |
|---|---|---|---|
| **Suite 1: Regional Assignment** | `R4.1-1` | Superadmin assigns `kota_kabupaten` to `dinas_pendidikan` account | Model/Object assignment validation |
| | `R4.1-2` | Superadmin updates assigned region (e.g. Boltim -> Kotamobagu) | Update propagation validation |
| | `R4.1-3` | Static check: SuperadminView contains UI controls for assigning `kota_kabupaten` to dinas users | `fs.readFileSync` token check |
| **Suite 2: Regional Scoping** | `R4.2-1` | Dinas assigned to "Kab. Boltim" queries schools -> only returns Boltim schools | Filter function on mock school registry |
| | `R4.2-2` | Schools from other regions ("Kota Kotamobagu", "Kota Manado") are strictly excluded (0 leakage) | `assert(!result.some(s => s.kota_kabupaten !== 'Kab. Boltim'))` |
| | `R4.2-3` | Regional string normalization (handles whitespace, uppercase, prefix variations like "Kab." vs "Kabupaten") | Normalization helper check |
| **Suite 3: Read-Only RBAC** | `R4.3-1` | Role `dinas_pendidikan` mutation rejection on `data_guru`, `data_siswa`, `sekolah` | Mutation guard validation |
| | `R4.3-2` | `AppScreen.tsx` blocks `view-admin-data`, `view-admin-backup`, `view-admin-config` for dinas role | Static route guard check in `AppScreen.tsx` |
| | `R4.3-3` | `RekapSiswaView.tsx` enforces `isReadOnly` (disables save attendance and notes inputs) | Static prop & condition check |
| | `R4.3-4` | `AdminVerifView.tsx` disables approval/rejection actions | Static prop check |
| **Suite 4: Aggregate Metrics** | `R4.4-1` | Aggregate teacher attendance % calculated accurately across assigned schools | Mathematical precision check |
| | `R4.4-2` | Aggregate student attendance % calculated accurately | Mathematical precision check |
| | `R4.4-3` | Flag schools requiring attention (alpa rate > threshold) | Filter logic validation |
| | `R4.4-4` | Satellite school status count (online vs paused) | Aggregation validation |
| **Suite 5: Drilldown Lifecycle** | `R4.5-1` | `setActiveTargetSchool` with assigned-region school -> `getActiveTargetSchool()` returns target | Supabase client target scope check |
| | `R4.5-2` | Anti-tampering check: Target school outside assigned region -> `getActiveTargetSchool()` returns `null` | Cross-region spoofing prevention test |
| | `R4.5-3` | `clearActiveTargetSchool()` resets scope without modifying `sipjam_user` or session token | `localStorage` state integrity check |
| **Suite 6: Print System** | `R4.6-1` | `PrintHeader` and `PrintSignature` accept dinas user and target `sekolah_id` | Prop contract validation |
| | `R4.6-2` | `triggerPrintWithGps` is accessible to dinas role without administrative mutation permissions | Function export & permission check |
| | `R4.6-3` | `globals.css` `@media print` rules ensure clean print layout (buttons hidden, tables formatted) | CSS inspection |

---

## 5. Architectural Recommendations for Implementers

1. **In `src/lib/supabaseClient.ts`**:
   - Update `getActiveTargetSchool()`:
     - Check `roleNorm === 'superadmin' || roleNorm === 'dinaspendidikan' || roleNorm === 'dinas_pendidikan'`.
     - When `roleNorm` is dinas, verify `targetSchool.kota_kabupaten === user.kota_kabupaten`.
2. **In `src/components/AppScreen.tsx`**:
   - Add `isDinas` flag: `const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';`
   - Set `defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : isDinas ? 'view-dinas-overview' : 'view-home';`
   - Define `menuItemsDinas`:
     - Dashboard Pemantauan (`view-dinas-overview`, icon `fa-chart-pie`)
     - If `activeTargetSchool`:
       - Rekap Guru (`view-admin-rekap`, icon `fa-clipboard-user`)
       - Presensi Siswa (`view-rekap-siswa`, icon `fa-users-viewfinder`)
       - Jurnal Kelas (`view-jurnal-kelas`, icon `fa-book-bookmark`)
   - Route guards:
     - Route `view-dinas-overview` to `<DinasOverviewView user={user} />`.
     - Allow `view-admin-rekap`, `view-rekap-siswa`, and `view-jurnal-kelas` when `isDinas` with `isReadOnly={true}`.
     - Block mutative admin views (`view-admin-data`, `view-admin-backup`, `view-admin-config`).
3. **In `src/components/DinasOverviewView.tsx` (New Component)**:
   - Soft clay aesthetic (`ClayCard`, `ClayButton`).
   - Cards: Total Sekolah, % Hadir Guru, % Hadir Siswa, Perlu Perhatian, Satelit Online.
   - Search by school name and filter by status.
   - School cards with "Lihat Detail Rekap & Jurnal" calling `setActiveTargetSchool(sch)`.
   - "Cetak Laporan Wilayah Binaan" button calling `triggerPrintWithGps()`.
4. **In `tests/dinas_pendidikan_monitoring.test.ts` (New Test Suite)**:
   - Self-contained, runnable with `npx tsx tests/dinas_pendidikan_monitoring.test.ts`.
   - Add to `package.json` `"test"` script.

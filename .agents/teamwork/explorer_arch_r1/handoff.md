# Handoff Report — Explorer 3 (explorer_arch_r1)

## 1. Observation

1. **`src/components/AppScreen.tsx` Monolith**:
   - Total length: 1,016 lines (`src/components/AppScreen.tsx:1-1016`).
   - Synchronously imports 18 view components (`HomeView`, `GuruPresensi`, `GuruJurnal`, `PiketView`, `DokumenView`, `HistoryView`, `RekapJurnalView`, `RekapSiswaView`, `InformasiView`, `AdminVerifView`, `AdminRekapView`, `AdminDataView`, `AdminBackupView`, `AdminConfigView`, `AnalitikView`, `SuperadminView`, `GradebookView`, `SistemBlokView`).
   - Maintains ~15 root state variables (`currentUser`, `currentView`, `syncKey`, `sidebarOpen`, `tourOpen`, `schoolData`, `isWaliKelas`, `assignedKelas`, `isPiketHariIni`, `unreadCount`, `broadcastModalOpen`, `allAnnouncements`, `unreadAnnouncements`, `readMap`, `isAccountModalOpen`).
   - Lines 483-485 in `handleNavigation`: blocks UI with `Swal.fire({ title: 'Memeriksa Akses...', didOpen: () => Swal.showLoading() })` and awaits `getGuruDailyState()` on tab clicks.

2. **Next.js App Router Bypassed**:
   - `src/app/page.tsx:1` and `src/app/superadmin/page.tsx:1` are marked `'use client'`.
   - Routing is controlled by React state `currentView` and `window.history.pushState(null, '', '?view=...')`. Zero server components or Next.js route segments (`/dashboard`, `/presensi`, `/jurnal`, etc.) are used.
   - Component line counts: `PiketView.tsx` (2,753 lines), `GradebookView.tsx` (2,691 lines), `AdminDataView.tsx` (2,097 lines), `DokumenView.tsx` (1,869 lines), `HomeView.tsx` (1,831 lines), `SuperadminView.tsx` (1,446 lines), `RekapSiswaView.tsx` (1,375 lines), `GuruJurnal.tsx` (1,369 lines). All are included in the primary client bundle on first page load.

3. **Database Client & Query Waterfall**:
   - `src/lib/supabaseClient.ts:110-114`: `cache: 'no-store'` is hardcoded on every fetch call through `dynamicTenantFetch`.
   - `src/lib/workflow.ts:176-370`: `getGuruDailyState` executes 9 sequential PostgREST queries against `sistem_blok`, `kalender_pendidikan`, `pengaturan`, `data_guru`, `jadwal_pelajaran`, `penugasan_piket`, `presensi_guru`, `laporan_piket`, and `jurnal_pembelajaran`.
   - `src/app/api/attendance/route.ts:27-30`: hardcoded credentials `p_password: 'SipjamSuperAdmin2026!'` for fallback superadmin token generation.

4. **UX & Offline Resilience**:
   - `src/components/GuruPresensi.tsx:353-388`: if direct PostgREST insert and fallback `fetch('/api/attendance')` fail (e.g. offline dead zone), the record is discarded with an error toast: `'Gagal menyimpan data presensi. Periksa koneksi internet Anda'`. No IndexedDB queue exists.
   - `src/components/GuruJurnal.tsx:528-620`: 12-field Jurnal KBM form has zero auto-save mechanism (`localStorage`/`sessionStorage`). Validation failures trigger top-right SweetAlert2 toasts without scrolling to the field or displaying inline error indicators.
   - `public/sw.js:63`: caches only same-origin responses (`response.type === 'basic'`). Cross-origin Supabase requests (`response.type === 'cors'`) are ignored by the service worker.
   - Codebase wide: 143 direct calls to `Swal.fire` used across 16 components for modal loading indicators, toasts, and alerts.

5. **Test Suite Baseline**:
   - `npm test` runs 19 tsx test files and passes cleanly with 0 errors.
   - `npx tsc --noEmit` completes with 0 errors.

---

## 2. Logic Chain

1. **Premise (from Obs 1 & 2)**: Importing 18 heavy views (>15,000 lines of code) synchronously in a single `'use client'` component (`AppScreen.tsx`) without `next/dynamic` or `React.lazy` forces the browser to download and parse the entire administrative and educational codebase before any view can render.
2. **Premise (from Obs 1 & 4)**: Because `AppScreen` manages ~15 root states and uses `key={`${currentView}-${syncKey}`}`, any state update (e.g. idle re-sync, real-time announcement arrival) triggers a re-render and re-mount of the active view. Furthermore, calling `getGuruDailyState` during tab clicks locks UI navigation behind network roundtrips.
3. **Premise (from Obs 3 & 4)**: The combination of `cache: 'no-store'` in `supabaseClient.ts`, a 9-query sequential waterfall in `workflow.ts`, and the absence of an IndexedDB queue means that when teachers are in school dead zones (such as parking lots, basement labs, or rural areas), attendance submissions fail permanently and data is lost.
4. **Premise (from Obs 4)**: The Jurnal KBM form in `GuruJurnal.tsx` requires extensive data entry (12 fields, attendance for 30+ students, reflection notes). Without an auto-save draft engine, any tab switch, phone call, or memory flush results in catastrophic data loss for teachers. Overuse of SweetAlert2 (143 calls) creates modal fatigue and degrades mobile accessibility.
5. **Conclusion**: The codebase urgently requires:
   - Proposal 1: Modularizing `AppScreen` and implementing dynamic code-splitting.
   - Proposal 2: Adding an IndexedDB offline queue and background sync for attendance.
   - Proposal 3: Modernizing the Jurnal KBM form with debounced auto-save drafts and inline validation.
   - Proposal 4: Centralizing print styles and removing duplicate CSS.

---

## 3. Caveats

- **No Caveats**: The entire codebase, including all components, library utilities, API routes, types, service worker, and tests, was inspected directly via tool execution.
- Assumptions made: Supabase database schema and RLS policies remain in place; proposed architectural refactors maintain backward compatibility with existing tests.

---

## 4. Conclusion

The application architecture exhibits severe god-component coupling in `AppScreen.tsx`, lacks route-level code splitting, suffers from network waterfall latency in `workflow.ts`, and lacks offline persistence for school dead zones. 

Four distinct, actionable proposals have been formulated and documented in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_arch_r1\report.md`:
1. **Proposal 1 (Architecture & Performance)**: AppScreen Modularization & Dynamic Code-Splitting via `next/dynamic` + `AuthContext` + `BroadcastContext`.
2. **Proposal 2 (UX & Reliability)**: Resilient Offline-First Attendance Queueing via IndexedDB and background reconnection sync.
3. **Proposal 3 (UX & Usability)**: Jurnal KBM UX Modernization with Debounced Auto-Save Draft System (`useFormDraft`) and Inline Validation.
4. **Proposal 4 (Code Quality)**: Centralized Print Architecture & Layout Engine.

---

## 5. Verification Method

To independently verify the observations and baseline health:

1. **Verify Line Counts & Structure**:
   ```powershell
   node -e "const fs = require('fs'); console.log('AppScreen lines:', fs.readFileSync('src/components/AppScreen.tsx', 'utf8').split('\n').length);"
   ```
   *Expected*: ~1016 lines.

2. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exits with code 0.

3. **Verify Existing Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: All 19 test suites pass cleanly with code 0.

4. **Verify Report Artifact**:
   Inspect `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_arch_r1\report.md` to review the Mermaid application flow diagram, feature inventory table, bottleneck analysis, and the 4 improvement proposals.

# Handoff Report: Views and Testing Architecture Investigation

**Agent**: Views and Testing Explorer  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_views_tests\`  
**Milestone**: M1 - Architectural Investigation & Testing Strategy  
**Date**: 2026-10-29T11:29:00Z  

---

## 1. Observation

### 1.1. Application Routing & View Mounting Architecture
- **Root Entry Point (`src/app/page.tsx:9-15, 220-231`)**:
  SIPJAM is a Single Page Application (SPA). `page.tsx` renders `<MainApp />`, which loads user session from `localStorage` (`sipjam_user`), validates the session token against `masterSupabase.from('users')`, and conditionally renders `<AppScreen user={user} onLogout={handleLogout} onUserUpdate={setUser} />`.
- **View Navigation Router (`src/components/AppScreen.tsx:157-180, 307-478, 817-1155`)**:
  - `AppScreen.tsx` (1,345 lines) manages the active view using React state:
    ```typescript
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
  - Browser history sync is maintained via `window.history.pushState(null, '', ?view=${targetId})` on navigation and a `popstate` event listener.
  - All view components are dynamically imported using `next/dynamic` (`AppScreen.tsx:7-27`):
    `HomeView`, `GuruPresensi`, `GuruJurnal`, `PiketView`, `DokumenView`, `HistoryView`, `RekapJurnalView`, `RekapSiswaView`, `InformasiView`, `AdminVerifView`, `AdminRekapView`, `AdminDataView`, `AdminBackupView`, `AdminConfigView`, `AnalitikView`, `SuperadminView`, `DinasDashboard`, `GradebookView`, `SistemBlokView`, `RaporView`.
  - Views are rendered conditionally via JSX checks: `{currentView === 'view-guru-presensi' && <GuruPresensi user={user} />}`, accompanied by RBAC authorization guards and fallback `<div className="glass-card">` access-denied cards.

---

### 1.2. View Component Inventory by Recommendation Cluster

| Cluster | Existing Menu & View ID | React Component File | LOC | Internal State / Tabs | Forms, Modals & Actions |
|---|---|---|---|---|---|
| **Cluster 1: Ekosistem Jurnal Mengajar** | 1. `view-guru-jurnal`<br>2. `view-guru-rekap-jurnal`<br>3. `view-jurnal-kelas`<br>4. `view-history` (tab Jurnal) | • `src/components/GuruJurnal.tsx`<br>• `src/components/RekapJurnalView.tsx`<br>• `src/components/HistoryView.tsx` | • 1,699<br>• 993<br>• 275 | • `GuruJurnal`: 10 KBM fields, live student roll-call, Inval mode, Sistem Blok adapter.<br>• `RekapJurnalView`: `tabMode` ('pribadi' vs 'kelas'), month/date filters.<br>• `HistoryView`: `activeTab` ('presensi' vs 'jurnal'). | • Forms: 10 fields KBM, Inval teacher picker, photo camera/upload.<br>• Storage: `saveJurnalDraft`, `loadJurnalDraft`, `clearJurnalDraft`.<br>• Modals: Print preview with KOP 10 columns, Excel export, SweetAlert2 alerts. |
| **Cluster 2: Presensi & Riwayat Guru** | 1. `view-guru-presensi`<br>2. `view-history` (tab Presensi) | • `src/components/GuruPresensi.tsx`<br>• `src/components/HistoryView.tsx` | • 1,052<br>• 275 | • `GuruPresensi`: `tipeAbsen` ('Datang'/'Pulang'), `jenisPresensi` ('Sekolah'/'Dinas Luar'/'Izin'/'Sakit'), GPS coordinates, geofence status.<br>• `HistoryView`: `activeTab === 'presensi'`. | • Camera selfie capture (4:3), GPS radius validation, 30-min reminder snooze.<br>• Leave application form (duration, start/end dates, medical cert upload).<br>• Direct verification status badge display. |
| **Cluster 3: Asesmen & Rapor Siswa** | 1. `view-gradebook`<br>2. `view-rapor` | • `src/components/GradebookView.tsx`<br>• `src/components/RaporView.tsx` | • 4,506<br>• 1,545 | • `GradebookView`: Class, subject, semester, TP/CP assessments, formative/summative columns.<br>• `RaporView`: `activeTab` ('ringkasan' vs 'cetak-individu'), year/semester selector, class homeroom filter. | • Exports `generateKurikulumMerdekaDeskripsi()`.<br>• Gradebook draft autosave (`getGradebookDraftKey`, `saveGradebookDraft`).<br>• Homeroom teacher notes (catatan wali kelas, deep learning dimensions: mindful, meaningful, joyful).<br>• Official report card printing (`triggerPrintWithGps`). |
| **Cluster 4: Laporan & Analitik Kinerja** | 1. `view-admin-rekap`<br>2. `view-rekap-guru`<br>3. `view-analitik`<br>4. `view-dinas-overview` | • `src/components/AdminRekapView.tsx`<br>• `src/components/AnalitikView.tsx`<br>• `src/components/DinasDashboard.tsx` | • 509<br>• 245<br>• 525 | • `AdminRekapView`: Month/custom date range, teacher search, workdays computation, teaching hours calculation.<br>• `AnalitikView`: Discipline leaderboard, arrival graph, journal completion ratio.<br>• `DinasDashboard`: Satellite school compliance matrix. | • Table: Realtime attendance aggregations, dummy teacher filter (`isTestGuruName`).<br>• Actions: Official report print with Kop and Pengawas Bina endorsement, export Excel.<br>• Note: `view-rekap-guru` is a clone rendering `AdminRekapView` with `isReadOnly={true}`. |
| **Cluster 5: Master Data, Kalender & Sistem** | 1. `view-admin-data`<br>2. `view-sistem-blok`<br>3. `view-admin-config`<br>4. `view-admin-backup` | • `src/components/AdminDataView.tsx`<br>• `src/components/SistemBlokView.tsx`<br>• `src/components/AdminConfigView.tsx`<br>• `src/components/AdminBackupView.tsx` | • 2,330<br>• 680<br>• 950<br>• 276 | • `AdminDataView`: Tabs: `'Data_Siswa'`, `'Data_Guru'`, `'Data_Mapel'`, `'Kalender_Pendidikan'`, `'Jadwal_Pelajaran'`, `'Wali_Kelas'`.<br>• `SistemBlokView`: Event periods (PTS/PAS/Pesantren), status ('Aktif'/'Akan Datang'/'Selesai').<br>• `AdminConfigView`: School profile, work hours, GPS geofence, camera policy, teacher exemptions.<br>• `AdminBackupView`: Year filter, backup log. | • Modals: Student mass promotion (`NaikKelasModal.tsx`), Student QR card generator (`printStudentQrCardWithSchool`), Academic titles manager (`setupSwalTitleManager`).<br>• Actions: Spreadsheet webhook sync & database purge, school logo upload. |
| **Cluster 6: Pusat Verifikasi & Supervisi** | 1. `view-admin-verif`<br>2. `view-dokumen` (Matrix Tab) | • `src/components/AdminVerifView.tsx`<br>• `src/components/DokumenView.tsx` | • 1,043<br>• 1,868 | • `AdminVerifView`: Tabs: `'Presensi'`, `'Jurnal'`, `'Piket'`. Filters: Task ('Semua'/'Sudah'/'Belum'), Verif ('Semua'/'Menunggu'/'Disetujui'/'Ditolak').<br>• `DokumenView`: Tabs: `'matrix'`, `'syarat'`, `'list'`, `'upload'`. | • Realtime subscriptions on `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`.<br>• Action modals: Approval, rejection with mandatory reason, batch approvals.<br>• Document verification modal: PDF preview, verify/reject curriculum documents. |
| **Cluster 7: Presensi Kesiswaan & Piket** | 1. `view-piket`<br>2. `view-rekap-siswa` | • `src/components/PiketView.tsx`<br>• `src/components/RekapSiswaView.tsx` | • 4,116<br>• 1,796 | • `PiketView`: Tabs: `'beranda'`, `'scan'`, `'lapor'`, `'penugasan'`, `'rekap'`. Concurrency lease lock (`piketLockInfo`).<br>• `RekapSiswaView`: Tabs: `'gerbang'` (gate log), `'rekap'` (attendance aggregate & truancy detection). | • QR Kiosk scanner (USB barcode scanner + camera via `jsqr`).<br>• Truancy resolution (student scanned at gate but absent in class journal).<br>• Automated WhatsApp notifications to parents (`triggerParentWhatsApp`). |

---

### 1.3. Test Runner & Framework Audit
- **Test Framework (`package.json:10-11, 21`)**:
  - No Jest, Vitest, Cypress, Playwright, or React Testing Library packages exist in `package.json`.
  - Test runner is **`tsx`** executing TypeScript test scripts directly via Node.js runtime.
  - Test suites utilize Node.js built-ins (`assert`, `fs`, `path`) and React SSR primitives (`renderToStaticMarkup`, `renderToString` from `react-dom/server`).
- **Baseline Verification Run Results**:
  1. `npx tsc --noEmit`: Exited with code `0` (Zero TypeScript compilation errors).
  2. `npm test`: Runs 41 chained test suites sequentially. Exited with code `0` (**41 / 41 suites passed 100%**).
  3. `npm run test:e2e` (`tests/e2e/run_all_e2e.ts`): Tiers 2, 3, 4 passed; Tier 1 and M5 had pre-existing assertions expecting student truancy badges in `GuruJurnal`.
  4. `npx tsx tests/challenger_m2_tutorial_system.test.ts`: Exited with code 1 (79 passed, 10 failed) due to historic drift in `TUTORIAL_DATA` menu counts (12 Guru vs expected 11, 2 Superadmin vs expected 3), exactly as documented in `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` lines 889-893.

---

### 1.4. Existing Tests Asserting Navigation, Sidebar, Roles, or View IDs
A grep search revealed over 40 test files directly asserting on view IDs, navigation guards, and `AppScreen.tsx` source code:
1. `tests/kepsek_pengawas_rbac.test.ts` (lines 78-98):
   - Asserts that `AppScreen.tsx` includes `...(isWaliKelas ? [{ id: 'view-rekap-siswa'`
   - Asserts that `AppScreen.tsx` includes `...(isWaliKelas ? [{ id: 'view-jurnal-kelas'`
   - Asserts that `AppScreen.tsx` includes `...(isWaliKelas ? [{ id: 'view-rapor'`
2. `tests/adversarial_rapor_wali_security.test.ts` (lines 260-276):
   - Asserts `appScreenSrc.includes("{currentView === 'view-rapor' && (")`
   - Asserts `appScreenSrc.includes('isAdmin || isSuperadmin || isWaliKelas ? (')`
   - Asserts `appScreenSrc.includes('<RaporView user={user} assignedKelas={assignedKelas} />')`
   - Asserts fallback text `Halaman <strong>Rapor</strong> secara eksklusif hanya dapat diakses oleh Administrator`
3. `tests/app_screen_integration.test.ts` (lines 72-84):
   - Asserts `data-tour="hamburger-btn"`
   - Asserts `data-tour={item.id}`
4. `tests/claymorphism_design_system.test.ts` (lines 42-70):
   - Asserts `ClaySidebar` exports `ClaySidebarProps` and renders `data-tour={item.id}`
5. `src/components/Onboarding/OnboardingTutorial.tsx` (line 56):
   - DOM query selector: `const selector = `[data-tour="${currentStep.targetTourId}"]`;`
   - Strict exact-match selector on `[data-tour="..."]`.

---

## 2. Logic Chain

1. **Premise 1**: The application uses a single state-driven view router in `AppScreen.tsx` where each view is rendered according to `currentView` and initialized from the URL parameter `?view=`.
2. **Premise 2**: Multiple existing test suites in the primary test command (`npm test`) verify RBAC and view rendering by reading the raw source code of `AppScreen.tsx` using `fs.readFileSync` and asserting string containment (`includes`) for exact view IDs (`view-rapor`, `view-jurnal-kelas`, `view-rekap-siswa`, `view-sistem-blok`).
3. **Premise 3**: If top-level menus are consolidated into sub-tabs without backward-compatible view aliasing and source code guard preservation, those existing tests will break, violating R2 (Zero Feature Loss) and AC Code Integrity (`npm test` must pass).
4. **Premise 4**: The tour tutorial DOM engine in `OnboardingTutorial.tsx` uses exact attribute matching `[data-tour="${currentStep.targetTourId}"]`. If target IDs change without updating the step definitions or query selector, onboarding popovers will point to `null` and fail.
5. **Deduction 1**: Consolidating views into sub-tabs must preserve all existing view IDs as first-class aliases. When an alias is passed to `AppScreen` or the browser URL (`?view=view-rapor`), the router must resolve it to the canonical view and activate the matching sub-tab (`view-gradebook` with `tab=rapor`).
6. **Deduction 2**: For JSX render guards in `AppScreen.tsx`, rendering blocks should retain support for both the canonical view and legacy view IDs (e.g. `(currentView === 'view-rapor' || (currentView === 'view-gradebook' && activeTab === 'rapor'))`), thereby fulfilling both runtime functionality and AST/source code string assertions in test suites.
7. **Deduction 3**: For form inputs with draft states (e.g., KBM 10-field journal and gradebook scores), sub-tabs must be rendered using CSS display toggling (`hidden`) rather than conditional component unmounting (`{activeTab === 'input' && <InputForm />}`). This ensures that form draft state is preserved in-memory when users switch between sub-tabs.

---

## 3. Caveats

1. **Offline & Remote Sync**: The investigation did not perform live mutations against the remote Supabase database because this is a read-only investigation task. All evaluations were conducted locally via source audit and existing test runners.
2. **E2E Suite Baseline**: While `npm test` (41 production suites) passes 100%, `npm run test:e2e` has 2 pre-existing failures in truancy assertion checks (`GuruJurnal` truancy badge). This was verified to be a pre-existing condition unrelated to menu consolidation.
3. **Challenger M2 Tutorial Suite**: The standalone test `tests/challenger_m2_tutorial_system.test.ts` has 10 pre-existing failed assertions due to historic changes in menu counts (Guru menus expanded from 11 to 12). Refactoring `TUTORIAL_DATA` to 16 unified modules in Phase 4 will resolve these historic failures.

---

## 4. Conclusion

1. **Feasibility Confirmed**: All 7 clusters proposed in `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` are architecturally feasible and can be consolidated without any feature loss.
2. **Sub-Tab Component Pattern**: 
   - Cluster 1 (Jurnal): `GuruJurnal.tsx` absorbs personal history and class supervision as sub-tabs (`tab=input`, `tab=rekap-pribadi`, `tab=supervisi-kelas`).
   - Cluster 2 (Presensi): `GuruPresensi.tsx` absorbs attendance history (`tab=live`, `tab=riwayat`).
   - Cluster 3 (Asesmen & Rapor): `GradebookView.tsx` wraps Gradebook and Rapor as sub-tabs (`tab=gradebook`, `tab=rapor`).
   - Cluster 4 (Laporan & Analitik): `AdminRekapView.tsx` incorporates `AnalitikView` as sub-tabs (`tab=analitik`, `tab=tabel`, `tab=cetak`).
   - Cluster 5 (Master Data & Sistem): `AdminDataView.tsx` absorbs `SistemBlokView` as Tab 6 (`tab=blok`), and `AdminConfigView.tsx` absorbs `AdminBackupView` (`tab=backup`).
   - Cluster 6 (Verifikasi): `AdminVerifView.tsx` adds a 4th tab for Perangkat Pembelajaran verification.
   - Cluster 7 (Kesiswaan & Piket): `PiketView.tsx` remains dedicated to on-duty kiosk scanning and reporting; `RekapSiswaView.tsx` handles homeroom class gate attendance and truancy intervention.
3. **Keep-Alive State Management**: In-memory keep-alive via CSS class `hidden` must be used for active form views to protect teachers against draft loss during sub-tab toggling.
4. **Test Architecture Recommendation**:
   A dedicated automated test suite (`tests/navigation_consolidation_verification.test.ts`) must be created to verify:
   - Sidebar menu counts per role (Guru Reguler = 6, Wali Kelas = 7, Admin = 8, Kepala Sekolah = 7, Dinas = 2, Superadmin = 3 + 5 satelit).
   - Transparent URL aliasing from all 8 legacy view IDs to their canonical view + sub-tab.
   - Sub-tab switching and URL deep-linking synchronization (`?view=...&tab=...`).
   - In-memory state retention across tab switches.
   - Defense-in-depth RBAC on sub-tabs (blocking unauthorized users attempting URL manipulation).
   - 100% pass rate preservation for all 41 existing test suites.

---

## 5. Verification Method

### 5.1. Independent Verification Commands
To verify the baseline health of the codebase:
```powershell
# 1. Verify TypeScript types compile cleanly with 0 errors
npx tsc --noEmit

# 2. Run all 41 production test suites
npm test

# 3. Check specific RBAC and navigation test suites
npx tsx tests/kepsek_pengawas_rbac.test.ts
npx tsx tests/adversarial_rapor_wali_security.test.ts
npx tsx tests/dinas_pendidikan_monitoring.test.ts
npx tsx tests/app_screen_integration.test.ts
```

### 5.2. Files to Inspect
1. `src/components/AppScreen.tsx` — Router, navigation handlers, dynamic imports, and conditional view mounts.
2. `src/components/ClaySidebar.tsx` — Modular claymorphism sidebar menu rendering.
3. `src/components/Onboarding/tutorialSteps.ts` — Onboarding tour target tour selectors.
4. `src/components/Tutorial/tutorialData.ts` — Menu registry for interactive guide and search.
5. `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` — Full architectural specification.

### 5.3. Invalidation Conditions
The recommendations and conclusions in this report would be invalidated if:
- Next.js is upgraded to a version with incompatible dynamic import semantics.
- A test in `npm test` fails after implementing URL aliasing.
- Any existing form input (e.g. 10 fields in `GuruJurnal` or gradebook scores) loses unsubmitted draft values when switching sub-tabs.

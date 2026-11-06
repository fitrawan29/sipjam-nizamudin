## 2026-11-06T22:52:46Z
You are worker_m1_nov.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1_nov\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

Read ORIGINAL_REQUEST.md and PROJECT.md first.

Read the 3 detailed implementation blueprints provided by our explorers:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_1\handoff.md (Holiday & excused handling in AdminVerifView & attendanceAlpa)
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_2\handoff.md (Accurate print documents for presensi & jurnal, removal of Cetak Dokumen Resmi sub-menu)
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_3\handoff.md (Verifikasi perangkat Class X subjects resolution, TypeScript & Turbopack build fixes)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your scope of implementation (Files you own exclusively):
- `src/components/AdminVerifView.tsx`
- `src/components/AdminRekapView.tsx`
- `src/components/DokumenView.tsx`
- `src/components/RekapJurnalView.tsx`
- `src/components/HomeViewAdmin.tsx`
- `src/lib/attendanceAlpa.ts`
- `src/components/Onboarding/tutorialSteps.ts`
- `tests/navigation_consolidation_verification.test.ts`

Detailed Tasks to implement:
1. **AdminVerifView.tsx & attendanceAlpa.ts**:
   - Move `export function isRealSubmittedJournal(j: any)` and helper functions outside `AdminVerifView` component to resolve `TS1184`.
   - In `loadAuxData`, load `kalender_pendidikan` (scoped by `sekolah_id`) and `hari_sekolah` from `pengaturan`.
   - Build `holidayInfo` checking Sunday, Saturday (when `hariSekolah === 5`), and calendar holiday events.
   - On holidays, prevent false delinquencies: `unsubmittedPresensi`, `unsubmittedJurnal`, and `unsubmittedPiket` must return `[]` so teachers are not marked unsubmitted/alpa on holidays. Render `<div data-testid="holiday-banner">Hari Libur: ...</div>`.
   - In `loadData`, support multi-day leaves (`tanggal_mulai` to `tanggal_selesai` or `durasi_hari`).
   - In Jurnal tab, preserve excused teachers (`Sakit`, `Izin`, `Dinas Luar`) and display them with badge `data-testid="badge-excused-leave"` and label `"Dikecualikan (Izin / Sakit)"`.
   - In `src/lib/attendanceAlpa.ts`, in `recordUnfilledJournalsAndPiket`, detect active multi-day leaves spanning evaluatedDate (Day 2+ of leave) so they auto-close as `status_verifikasi = leaveType` ('Sakit' or 'Izin') rather than 'Tidak Masuk Kelas'. Export `autoCloseOrMarkDelinquentJournals`.

2. **Accurate Document Printing & Sub-Tab Removal**:
   - In `src/components/AdminRekapView.tsx`: Add proper aggregation for `jenis_presensi === 'Sakit'` (and detail_izin containing sakit) to credit `sakit++` so sick teachers are not falsely marked as Alpa. Ensure `Sakit` and `Izin` columns display and print accurately with zero false Alpa.
   - In `src/components/RekapJurnalView.tsx`: Exclude holiday dates (Sunday, Saturday on 5-day week, and kalender_pendidikan) when simulating missing entries, ensuring NO "Libur" rows appear in the print document while clearly and accurately displaying `Izin` and `Sakit` statuses.
   - In `src/components/AdminRekapView.tsx`: Remove `{ id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-print' }` from `tabItems` and remove Sub-Tab 3 JSX block (lines 853-933). Ensure Sub-Tab 2 retains the full print view, universal KOP (`PrintHeader`), GPS security authentication (`triggerPrintWithGps`), signature (`PrintSignature`), and Excel export (`handleExportCsv`).
   - Legacy route redirection: If `initialTab === 'cetak'`, redirect or default to `'tabel'`.
   - In `src/components/Onboarding/tutorialSteps.ts`: Update `subTabs` for `view-admin-rekap` by removing 'Cetak Dokumen Resmi'.
   - In `tests/navigation_consolidation_verification.test.ts`: Adapt assertions (T1.4.4, validTabs) to reflect the removal of `cetak` subtab.

3. **Verifikasi Perangkat Kelas X & TypeScript Compilation Fix**:
   - In `src/components/HomeViewAdmin.tsx`: Update `TeacherStatusRow.pengisianJurnal.color` and `jurnalColor` union type to include `'blue'`, resolving TS2322.
   - In `src/components/DokumenView.tsx`: Load `jadwal_pelajaran` and `data_mapel` in `loadAllData()`; implement tokenized fuzzy teacher matching (`Ade` <-> `Ade Fitrawan Ibrahim`, `Ambar` <-> `Setia Ambar Ningsih Mamonto`, `Susan` <-> `Susana Muliono`, `Rizki` <-> `Riski Candra Mamangkai`); resolve Class X subjects specifically (`Matematika • Kelas X Merdeka`, `Informatika • Kelas X Merdeka`, etc.) with acronym expansion (`MTK` -> `Matematika`); and completely eliminate default fallback to `'Mata Pelajaran Umum'`.

Verification requirements:
- Run `npx tsc --noEmit` and ensure ZERO errors.
- Run `npx tsx tests/m6_3_dashboards_and_verif.test.ts`.
- Run `npx tsx tests/m10_r2_r3.test.ts`.
- Run `npx tsx tests/navigation_consolidation_verification.test.ts`.
- Run `npx tsx tests/admin_jurnal_real_data_verification.test.ts`.
- Run `git status`, `git add .`, `git commit -m "feat(admin): penyesuaian verifikasi data, cetak dokumen, perangkat kelas x, dan laporan analitik"`, and `git push origin main`.

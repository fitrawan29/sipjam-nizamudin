# Dispatch for Worker M2 (Executive Scoped Dashboard & Navigation)

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m2`

## Authoritative User Request
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read latest request at 2026-10-23T19:45:33Z)

## Project Scope
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_23\PROJECT.md`

## Input Reports
- Explorer 2 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_2\report.md`
- Explorer 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o23_3\report.md`
- Worker M1 Handoff: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o23_m1_remediation\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective & Files Owned
Files exclusively owned for M2:
1. `src/components/DinasDashboard.tsx` (NEW FILE):
   - Executive cross-school monitoring dashboard component with Claymorphism aesthetic (`ClayCard`, `ClayButton`, rounded contours, `#FDF6EC` canvas).
   - Props: `user: AppUser`, `onSelectSchool: (school: SatelliteSchool) => void`, `satelliteSchools?: SatelliteSchool[]`.
   - Data Fetching: Scoped strictly to `user.kota_kabupaten`. Queries schools in `sekolah` / `sekolah_registry` matching `user.kota_kabupaten`.
   - Batch queries attendance for today across these schools (`presensi_guru`, `presensi_siswa`, `jurnal_pembelajaran`).
   - 5 Key Aggregate Metric Cards:
     1. Total Sekolah Binaan
     2. Kehadiran Guru Hari Ini (%)
     3. Kehadiran Siswa Hari Ini (%)
     4. Status Koneksi Satelit (X/Y Terhubung)
     5. Sekolah Memerlukan Perhatian (sekolah dengan alpa siswa tinggi > 10% atau kehadiran guru < 70%)
   - Search & Filter: Filter schools within assigned region by name, status, or attendance.
   - School Table: List of schools with details and "Tinjau Sekolah" (drilldown) button calling `onSelectSchool(school)`.
   - Official Regional Summary Print: Button calling `triggerPrintWithGps()` from `@/utils/printWithGps`, with `.print-only` container rendering official Dinas Kop Surat (`PrintHeader`) and signature block (`PrintSignature`).
2. `src/components/ClaySidebar.tsx`:
   - Add `isDinas?: boolean` to `ClaySidebarProps`.
   - Add role badge styling for `Dinas Pendidikan`:
     - Label: `'Dinas Pendidikan'`
     - Icon: `'fa-building-columns'`
     - Badge style: Soft indigo clay style (`bg-[#EDE9FE] border-[#C4B5FD] text-[#5B21B6]`).
     - Region subtitle: `user.kota_kabupaten` (e.g. `Wilayah: Kota Kotamobagu`).
   - Target School Switcher Dropdown: If `isDinas` is true, filter the satellite school dropdown to display ONLY schools whose `kota_kabupaten` matches `user.kota_kabupaten` (trimmed, case-insensitive).
3. `src/components/AppScreen.tsx`:
   - Role detection: `const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';`
   - Default view on login: If `isDinas`, set initial view to `'view-dinas-overview'`.
   - Navigation menu: Define `menuItemsDinas` containing `'view-dinas-overview'` ("Dashboard Eksekutif", icon "fa-chart-pie"). When `activeTargetSchool` is selected, include school drilldown menu items (`view-rekap-guru`, `view-rekap-siswa`, `view-jurnal-kelas`).
   - Navigation Gating (`handleNavigation`): If `isDinas`, block access to mutation views (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`).
   - Mount `<DinasDashboard />` when `currentView === 'view-dinas-overview'`.
   - Handle target school selection from `DinasDashboard`: call `handleSwitchTargetSchool(school)` and switch view to `'view-rekap-guru'` or target school overview.

## Verification Commands
- `npx tsc --noEmit`
- `npm run build`
- `npm test`
Deliver complete report in `handoff.md` and commit to `origin/dev`.

## 2026-10-23T20:54:46Z
Implement Milestone 2:
1. Create `src/components/DinasDashboard.tsx`:
   - Executive dashboard component styled with Claymorphism (ClayCard, ClayButton, #FDF6EC background, rounded-2xl/3xl, pastel accents).
   - Display assigned region badge (`user.kota_kabupaten`).
   - 5 Metric Cards: Total Sekolah Binaan, Kehadiran Guru Hari Ini (%), Kehadiran Siswa Hari Ini (%), Kesehatan Satelit, Sekolah Perlu Perhatian (Alpa Tinggi).
   - Search & filters scoped strictly to `user.kota_kabupaten`.
   - School list with "Tinjau Sekolah" (drilldown) button calling `onSelectSchool(school)`.
   - Official summary print button utilizing `triggerPrintWithGps()` and official table format with `PrintHeader` & `PrintSignature` (.print-only).
2. Update `src/components/ClaySidebar.tsx`:
   - Add `isDinas?: boolean` to props.
   - Add role badge for `Dinas Pendidikan` (icon `fa-building-columns`, indigo pastel styling, region subtitle).
   - Filter target school switcher to ONLY show schools matching `user.kota_kabupaten` when `isDinas` is true.
3. Update `src/components/AppScreen.tsx`:
   - Role detection `isDinas` (`role === 'dinas_pendidikan'`).
   - Default view on login for dinas: `'view-dinas-overview'`.
   - Menu items `menuItemsDinas`: Executive Dashboard, plus drilldown items when target school is active (`view-rekap-guru`, `view-rekap-siswa`, `view-jurnal-kelas`).
   - Navigation guard in `handleNavigation`: block mutation views (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`) for dinas role.
   - Mount `<DinasDashboard />` when `currentView === 'view-dinas-overview'`.
4. Verify with `npx tsc --noEmit`, `npm test`, and `npm run build`.
5. Stage, commit, and push to origin dev (`git push origin dev`).
6. Write full report in `handoff.md` and notify me via send_message when done.

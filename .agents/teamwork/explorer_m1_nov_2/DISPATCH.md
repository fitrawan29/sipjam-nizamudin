## 2026-11-06T22:42:11Z
You are explorer_m1_nov_2.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Prior Survey Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_1\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to produce an exact, actionable technical implementation blueprint for:
1. **Accurate Document Printing for Presensi & Jurnal**:
   - In `src/components/AdminRekapView.tsx:297`: Add proper aggregation for `jenis_presensi === 'Sakit'` (and `detail_izin` containing sakit) to credit `sakit++` so sick teachers are not falsely marked as Alpa. Ensure `Sakit` and `Izin` columns display and print accurately with zero false Alpa.
   - In `src/components/RekapJurnalView.tsx`: Integrate `kalender_pendidikan` and 5-day week rules to exclude holiday dates from synthesized missing entries, ensuring NO "Libur" rows appear in the print document while clearly and accurately displaying `Izin` and `Sakit` statuses.
2. **Clean Removal of Sub Menu "Cetak Dokumen Resmi" (Requirement R2)**:
   - In `src/components/AdminRekapView.tsx`: Remove `{ id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-print' }` from `tabItems`.
   - Remove the duplicate Sub-Tab 3 JSX block (lines 853-933). Ensure Sub-Tab 2 retains the full print view, KOP, GPS authentication, and export functionality.
   - Handle legacy route redirection: If `initialTab === 'cetak'`, redirect or default to `'tabel'` so bookmarks/links do not break.
   - Update `src/components/Onboarding/tutorialSteps.ts:132` to remove 'Cetak Dokumen Resmi' from subTabs.
   - Review and adapt `tests/navigation_consolidation_verification.test.ts` so tests reflect the removal of `cetak` subtab.

Detail the exact functions, line numbers, TypeScript types, and code diff blueprint in your report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_2\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify the orchestrator via send_message.

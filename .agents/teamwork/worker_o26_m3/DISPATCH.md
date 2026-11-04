## 2026-11-04T03:12:15Z

You are Worker M3: RBAC & Navigation Harmonization Worker.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o26_m3\
Your parent orchestrator is: orchestrator_26 (conversation ID: a0d39936-19bf-45f3-ba40-79e8616fff08)

MANDATORY READING:
First, read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Read PROJECT.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md

Read Explorer 1's report at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o26_survey_git\report.md
and Explorer 3's report at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o26_survey_rules\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `src/lib/navigation.ts`
- `src/components/AdminVerifView.tsx`
- `src/components/DokumenView.tsx`
- `src/components/AdminRekapView.tsx`
- `src/components/HomeViewAdmin.tsx`
- `src/components/AdminBackupView.tsx`
- `src/components/SistemBlokView.tsx`
DO NOT modify files outside your assigned ownership.

MILESTONE 3 TASKS:
1. `src/lib/navigation.ts`:
   - In `evaluateTabRBAC`: Unblock Kepala Sekolah! In cluster 1 check (`view-guru-jurnal` with `tabId === 'supervisi-kelas'`), allow `isKepalaSekolah` (`userContext.role?.toLowerCase() === 'kepalasekolah'` or `'kepala sekolah'`) along with `isWali` and `isAdmin`.
   - In `getConsolidatedMenuItems` for Admin (`isAdmin`): Re-add `view-informasi` with id `'view-informasi'`, label `'Informasi'`, icon `'fa-bullhorn'`.
   - In `getConsolidatedMenuItems` for Dinas (`isDinas`): Ensure Dinas has access to satellite school student attendance (`view-rekap-siswa`, label `'Presensi Siswa'`, icon `'fa-user-graduate'`) and class journals (`view-jurnal-kelas`, label `'Jurnal Kelas'`, icon `'fa-book-open'`) in read-only mode.
2. `src/components/AdminVerifView.tsx` & `src/components/DokumenView.tsx`:
   - In `AdminVerifView.tsx`: Forward `isReadOnly={isReadOnly}` to `<DokumenView user={user} isReadOnly={isReadOnly} />`.
   - In `DokumenView.tsx`:
     - Update interface `DokumenViewProps` to accept `isReadOnly?: boolean`.
     - Normalize role check: `const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, ''); const isAdmin = normRole === 'admin' || normRole === 'superadmin';`.
     - When `isReadOnly === true`, disable/hide approval and revision actions.
3. `src/components/AdminRekapView.tsx`:
   - In Tab 1 (`activeTab === 'analitik'`):
     Restore attendance composition progress bars (Hadir Sekolah %, Izin/Sakit %, Dinas Luar %) from `AnalitikView`.
     Add a toggle to view Top 5 or Top 10 in the Teacher Discipline Leaderboard.
4. `src/components/HomeViewAdmin.tsx`:
   - Add a direct link/card to `view-informasi` so Admin can quickly publish announcements.
5. `src/components/AdminBackupView.tsx` & `src/components/SistemBlokView.tsx`:
   - Clean up redundant nested `<section className="view-section">` tags and excessive double padding containers when rendered inside embedded sub-tabs.
6. Verification:
   - Run `npx tsc --noEmit` and `npm test`. Ensure all tests pass with 0 errors.

OUTPUT:
Document all your changes, verification commands, and test results in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o26_m3\handoff.md`
Update `progress.md` in your working directory as you work.
When done, send a message to orchestrator_26 (`a0d39936-19bf-45f3-ba40-79e8616fff08`) with a summary and the path to your handoff.

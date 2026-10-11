# Dispatch for worker_m2

- **Role**: Worker for Milestone 2 — UI & Logic Layer (`src/components/GradebookView.tsx`)
- **Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2
- **Authoritative Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)
- **Project Blueprint**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- **Reference Explorations**:
  - `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md` (UI Hierarchy)
  - `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md` (Schema & Admin Settings)
  - `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md` (Grading Logic & Attendance)
- **Exclusive Write Ownership**:
  `src/components/GradebookView.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks in `src/components/GradebookView.tsx`
1. **Fix Syntax Blocker Immediately**:
   Remove lines 3056–3058 (the duplicate premature `</section>\n );\n}`) so `Modal Bulk Fill Grades` remains cleanly inside the component function return statement.
2. **CP → TP UI Hierarchy (R1)**:
   - Add `cp_id: string` to `tpForm` state.
   - When `cpList.length === 0`: render an educational guidance banner in the TP section stating CP must be added first, and disable/guard the "Tambah TP Baru" button until at least 1 CP exists.
   - In `isTpModalOpen`: Add a `<select>` dropdown populated with `cpList` (`kode_cp` + `deskripsi`) so teacher can assign TP to CP. Pre-select `selectedCpId`.
   - In `handleOpenAddTpModal`: set `cp_id: selectedCpId || (cpList[0]?.id ?? '')`.
   - In `handleOpenEditTpModal`: populate `tpForm.cp_id` from `tp.cp_id`.
   - In `handleSaveTp`: persist `cp_id: tpForm.cp_id || null` in both insert and update queries.
   - In `handleSaveCp`: set `guru_mapel_id` by matching `selectedMapel` & `selectedKelas` in `mapelList`.
   - In TP pills toolbar: clicking a CP selects it (`selectedCpId`); filter visible TP pills by `selectedCpId` (support "Semua TP" or filter to active CP).
3. **Asesmen per TP & Keterangan (R2)**:
   - Diagnostik Rule: auto-create exactly 1 Diagnostik column if missing; block adding a 2nd Diagnostik column in `handleSaveCol` with warning toast; block deleting Diagnostik column in `handleDeleteCol`.
   - Formatif & Sumatif: allow adding multiple Formatif and multiple Sumatif columns.
   - Field `keterangan`: add textarea/input `keterangan` in `isColModalOpen`, save to `asesmen_kolom.keterangan`, load into `colForm` when editing, and display in column headers/tooltips.
4. **Admin Bobot Settings UI & Persistence (R4)**:
   - Admin Bobot button in toolbar visible only for `isAdmin`.
   - Modal allows adjusting `kehadiran`, `formatif`, `sumatif`.
   - Validate `kehadiran + formatif + sumatif === 100` before saving.
   - Persist to table `pengaturan` using key `'bobot_nilai_mapel'`.
   - Load saved weights on mount per `sekolah_id` (fallback to 40, 30, 30).
5. **Nilai Akhir Formula & Attendance Integration (R3)**:
   - Query subject attendance per student from `jurnal_pembelajaran` for `selectedMapel` & `selectedKelas`; fallback to `absensi` table per class; default 100% if no sessions recorded yet.
   - In `calculateStudentSemesterStats`:
     Nilai Akhir = `(kehadiranScore * bobotKehadiran / 100) + (avgFormatifAll * bobotFormatif / 100) + (avgSumatifAll * bobotSumatif / 100)`.
   - Diagnostik is excluded from Nilai Akhir calculation.
   - If either `avgFormatifAll === null` or `avgSumatifAll === null`: return `null` (displays `'-'`).
   - Preserve `generateKurikulumMerdekaDeskripsi` and `CapaianDeskripsiResult` exports with 0 regressions.
6. **Verification**:
   - Run `npx tsc --noEmit` — must pass with 0 errors.
   - Run existing academic tests:
     `npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts`
     `npx tsx tests/adversarial_kurikulum_merdeka_cp_permutations.test.ts`
     `npx tsx tests/m4_gradebook.test.ts`
   - Run full `npm test` to verify zero regressions.
7. Write complete handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md`.


## 2026-10-11T01:03:52Z
You are Worker for Milestone 2 (UI & Logic Layer: GradebookView.tsx).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2
Read instructions in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\DISPATCH.md
Authoritative request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see entry at 2026-10-10T22:56:05Z)
Project Blueprint: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
Survey findings:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md

Exclusive Write Ownership:
`src/components/GradebookView.tsx`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement all Milestone 2 requirements:
1. Fix syntax error at lines 3056–3058.
2. CP → TP UI hierarchy (CP first before TP, CP assignment dropdown in TP modal, filter TP pills by CP, link guru_mapel_id).
3. Asesmen per TP (Diagnostik max 1 guard, Formatif & Sumatif multi-column, keterangan field in modal & table).
4. Admin Bobot Settings modal with total = 100% validation, save to pengaturan table, load on mount.
5. Nilai Akhir formula: (bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif), attendance per mapel query from jurnal_pembelajaran/absensi, null fallback if formatif or sumatif is missing, Diagnostik excluded from final score.
6. Verify with `npx tsc --noEmit` and `npm test`.

Write your full handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md` and message the orchestrator when finished.

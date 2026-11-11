## 2026-11-06T00:14:10Z
You are a Teamwork Worker for Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.
You MUST also read the Explorer handoff reports for Milestone 1:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_1\handoff.md (AdminKelasView component blueprint)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_2\handoff.md (Navigation & route aliasing blueprint)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_3\handoff.md (Data mutations & state sync blueprint)

File ownership:
You have exclusive write ownership of:
1. `src/components/AdminKelasView.tsx` (new component)
2. `src/components/AdminDataView.tsx`
3. `src/lib/navigation.ts`

Your task:
1. Implement `src/components/AdminKelasView.tsx`:
   - Follow the detailed component structure from `explorer_m1_1` and data mutation rules from `explorer_m1_3`.
   - Executive statistics header: Total Kelas, Total Siswa Teralokasi, Siswa Tanpa Kelas (with warning banner if unallocated students exist).
   - Search bar and Tingkat filter (10/X, 11/XI, 12/XII), "+ Tambah Kelas Baru" button, and "Naik Kelas" button triggering `NaikKelasModal.tsx`.
   - Responsive Grid of Class Directory Cards:
     * Shows Class Name, Tingkat, Homeroom teacher (from `wali_kelas`), and student count with male/female breakdown.
     * Actions: "Kelola Siswa" / "Lihat Roster", "Ubah Nama Kelas" (cascading rename on `data_siswa.kelas`, `wali_kelas.kelas`, `jadwal_pelajaran.kelas`), "Hapus Kelas" (validated: only if class has 0 students).
   - Centralized Allocation Workspace Slide-over Drawer / Modal:
     * Tab 1: Interactive class roster with multi-selection checkboxes and batch "Pindahkan Siswa" to another class.
     * Tab 2: Inbound student allocation ("Alokasikan Siswa Masuk") with filter for unallocated students and students from other classes.
   - Quick "Siswa Tanpa Kelas" drawer launcher.
   - Strict RBAC using `isMasterDataModificationAllowed(user?.role)`, defensive schema-cache fallbacks (`isSchemaCacheOrMissingTableError`), SweetAlert2 confirmations and toast notifications.
2. Integrate in `src/components/AdminDataView.tsx`:
   - Follow `explorer_m1_2`:
     * Insert `{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }` right after `Data_Siswa` in `tabs`.
     * Normalize `initialTab` for `Data_Kelas`, `data_kelas`, `Kelas`, `kelas`.
     * In `loadData()`: short-circuit if `activeTab === 'Data_Kelas'`.
     * Hide generic table search/action bars when `activeTab === 'Data_Kelas'` and render `<AdminKelasView user={user} />`.
3. Register route aliases in `src/lib/navigation.ts`:
   - In `VIEW_ALIASES`, register:
     `'view-admin-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' }`,
     `'view-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' }`.
4. Run verification commands:
   - `npx tsc --noEmit` (ensure 0 TypeScript compilation errors).
   - `npm test` (ensure all existing tests pass 100%).
5. Follow the Git workflow rule in GEMINI.md:
   - `git status`
   - `git add .`
   - `git commit -m "feat: tambahkan sub menu kelas dan pemusatan penentuan kelas siswa pada master data"`
   - `git push origin main`
6. Write a complete handoff report to:
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md`
   and notify the orchestrator with `send_message`.


## 2026-11-11T03:29:10Z
You are a Worker subagent for Milestone 1 in SIPJAM app.
Your state folder is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read these reference files before starting:
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Explorer 1 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1\handoff.md
- Explorer 3 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3\handoff.md

Your exclusive write ownership is restricted to these files:
- src/components/AdminConfigView.tsx
- src/lib/workflow.ts
- src/components/HomeViewTU.tsx
- src/components/HomeViewGuru.tsx
- src/components/AdminVerifView.tsx
- src/components/HomeViewAdmin.tsx
- src/lib/attendanceAlpa.ts

DO NOT modify `src/components/RekapJurnalView.tsx` or `src/components/GuruJurnal.tsx` (owned by Milestone 2).

Objective: Implement Milestone 1 (Requirement R1):
1. In `AdminConfigView.tsx` (Tab Kebijakan Guru):
   - Provide clear guidelines and explanation of the attendance policies:
     * Guru Hadir Sesuai KBM (`Hari_Mengajar_Saja`): hanya wajib hadir di hari mengajar atau ada tugas piket; hari tanpa KBM/piket bebas kehadiran.
     * Guru Hadir Setiap Hari & Staf TU/Guru Tanpa Jam KBM: wajib hadir setiap hari kerja sekolah.
   - On the teacher list, clearly identify and display badges/labels: Staf Tata Usaha, Guru Tanpa Jam KBM, or Guru dengan Jam KBM.
   - Fix the mass action button "Set Semua Hanya Hari KBM": it MUST NOT set TU staff or teachers without KBM hours to `wajib_hadir_hanya_mengajar = true`. Only teachers with actual KBM hours can be set to exempt.
   - On saving, guarantee that TU staff and teachers without KBM remain non-exempt (`wajib_hadir_hanya_mengajar = false`).
2. In `src/lib/workflow.ts`, `src/components/AdminVerifView.tsx`, `src/components/HomeViewAdmin.tsx`, and `src/lib/attendanceAlpa.ts`:
   - Protect Staf TU and teachers without KBM from being evaluated as `isTeacherExempt` or `isNonTeachingDay` / `isFreeFromPresence`.
   - On active school days, they must NOT be marked or displayed as "Bebas Presensi" / "Bebas Hadir".
   - Their workflow must strictly require:
     (1) Presensi Datang
     (2) Laporan Piket (if assigned piket on that day)
     (3) Jurnal Kegiatan (using Jurnal Kegiatan)
     (4) Presensi Pulang (unlocked only after Jurnal Kegiatan and Piket report if assigned are completed).
3. In `src/components/HomeViewTU.tsx`:
   - Add piket duty check (`isPiket` & `laporanPiket`). If assigned piket today, include "Laporan Piket" in workflow steps and require it before `canPresensiPulang`.
4. In `src/components/HomeViewGuru.tsx`:
   - For teachers without KBM on active school days, do NOT display false "Bebas Presensi" hero banner. Instead show their active workflow steps: Presensi Datang, Piket (if assigned), Jurnal Kegiatan, Presensi Pulang.
5. Verification:
   - Run typecheck: `npx tsc --noEmit`
   - Run existing relevant unit tests: `npx tsx tests/tu_refinements_and_admin_rekap.test.ts`, `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts`
   - Verify that all builds and tests pass cleanly.

Write your complete implementation report and test output to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\handoff.md
Update your progress in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\progress.md.
When finished, send a brief completion message to the orchestrator.

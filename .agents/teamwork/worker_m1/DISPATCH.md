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

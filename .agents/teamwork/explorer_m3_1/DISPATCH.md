## 2026-11-06T01:05:27Z
You are a Teamwork Explorer for Milestone 3 (Automated Test Suite & Non-Regression Gate).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.

Your task:
Plan and design the test scenarios for Sub-Menu Kelas & Centralized Student Class Allocation in the upcoming test suite `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`:
1. Sub-menu access & placement:
   - Verify `Data_Kelas` exists in `AdminDataView.tsx` `tabs` and is positioned right after `Data_Siswa`.
   - Verify `AdminKelasView` component mounts cleanly when `activeTab === 'Data_Kelas'`.
2. Class directory & aggregation logic:
   - Aggregating classes from `data_siswa` and `wali_kelas`.
   - Calculating male, female, and total student counts per class.
   - Deriving grade levels (10, 11, 12).
   - Homeroom teacher binding.
3. Centralized student allocation mutations:
   - Moving students between classes (`data_siswa.update` with `sekolah_id` filter).
   - Inbound allocation of unassigned students into a target class.
   - Cascading class rename across `data_siswa`, `wali_kelas`, `jadwal_pelajaran`.
   - Guard against deleting classes with enrolled students.
4. Formulate the exact runnable test cases with assertions.
Write your complete test blueprint to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_1\handoff.md
Send a brief message back to the orchestrator when done.

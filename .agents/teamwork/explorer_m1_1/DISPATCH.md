## 2026-11-06T00:07:31Z
Sender: 77685953-a979-46b9-9e32-e6b24ab55eb5
Content:
You are a Teamwork Explorer for Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.

Your task:
Focus on the UI/UX architecture and component blueprint for `src/components/AdminKelasView.tsx`:
1. Study how modern sub-view components in sipjam-app are built (e.g. `src/components/AdminPenggunaView.tsx`, `src/components/SistemBlokView.tsx`, and `src/components/NaikKelasModal.tsx`).
   - Notice styling patterns (Tailwind, FontAwesome, Claymorphism / glass cards, responsive grid).
   - Notice state handling, loading indicators, empty states, and SweetAlert2 confirmation dialogs / toast notifications.
2. Produce a detailed implementation blueprint for `src/components/AdminKelasView.tsx`:
   - Header with statistics: Total Kelas, Total Siswa Teralokasi, Siswa Tanpa Kelas.
   - Search bar, filter by Tingkat (10/X, 11/XI, 12/XII), "+ Tambah Kelas Baru", and "Naik Kelas" modal launcher button.
   - Grid of Class Directory Cards:
     * Card displays: Class Name, Tingkat, Student count (breakdown L / P), Homeroom teacher (from `wali_kelas`).
     * Primary action: "Kelola Siswa" / "Lihat Roster" to open the Centralized Allocation Workspace.
     * Quick actions: Ubah Nama Kelas, Hapus Kelas (with validation that class has 0 students).
   - "Siswa Tanpa Kelas" Card / Drawer:
     * Highlights unallocated students so admins can quickly allocate them into a class.
   - Centralized Allocation Workspace Drawer / Modal:
     * Roster table of students in the selected class.
     * Checkbox selection (Select all / individual).
     * Action "Pindahkan Siswa" (select destination class dropdown and move).
     * Action "+ Masukkan Siswa" (pick from unassigned or other classes to move here).
3. Write your complete design, exact component props, interfaces, and code blueprint to:
   c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_1\handoff.md
4. Send a brief message back to the orchestrator when done.

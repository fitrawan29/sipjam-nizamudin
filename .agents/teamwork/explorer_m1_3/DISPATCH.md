## 2026-11-06T00:07:44Z
You are a Teamwork Explorer for Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_3\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.

Your task:
Focus on the Data Mutations, Database Scoping, and State Synchronization for Centralized Student Class Allocation:
1. Examine how student data and class assignments are structured in the database:
   - `data_siswa`: `id`, `sekolah_id`, `nisn`, `nama_siswa`, `kelas`, `gender`, `status`.
   - `wali_kelas`: `sekolah_id`, `kelas`, `nama_guru`, `nip`, `tahun_ajaran`.
   - `jadwal_pelajaran`: `sekolah_id`, `kelas`, `hari`, `nama_guru`, `mata_pelajaran`.
2. Detail the exact mutation operations required for centralized class allocation:
   - Moving single/multiple students to a new class:
     `supabase.from('data_siswa').update({ kelas: targetKelas, updated_at: new Date().toISOString() }).in('id', studentIds).eq('sekolah_id', sekolahId)`
   - Allocating unassigned students (`kelas = null` or `kelas = ''`) into a designated class.
   - Renaming a class (cascading rename):
     When an admin renames e.g. "X-1" to "X Merdeka 1", what tables need updating? (`data_siswa`, `wali_kelas`, and optionally `jadwal_pelajaran`).
   - Multi-tenant safety: Ensure all queries strictly enforce `sekolah_id = user.sekolah_id`.
   - Local state reactivity: How `AdminKelasView` updates its local cache immediately without requiring full page reload.
3. Edge cases and guardrails:
   - Prevent moving to an empty target class name.
   - Prevent deleting a class that still contains enrolled students.
   - Handling students with duplicate names or null NISN.
   - Integration with `NaikKelasModal.tsx` for bulk cohort advancement.
4. Write your complete state synchronization design and mutation specification to:
   c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_3\handoff.md
5. Send a brief message back to the orchestrator when done.

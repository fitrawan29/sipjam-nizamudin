# Dispatch for Explorer 1 (Milestone 9 - Survey R1 & R3)

## Identity
- Role: Explorer
- Agent Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_1
- Parent: orchestrator_10

## Assigned Scope: R1 & R3
1. **R1: Pengaturan Tahun Ajaran & Daftar Nilai**
   - Trace how `tahun_ajaran` (Academic Year) is defined in admin settings/database tables and how it is currently retrieved/used by teacher components.
   - Trace Gradebook / Daftar Nilai components (`DaftarNilaiView.tsx` or similar):
     - Identify where edit/input actions exist for Admin vs Teacher.
     - Determine how to lock Admin to view-only with only a "Cetak" button.
     - Trace Tujuan Pembelajaran (TP) management: ensure input/edit of TP is strictly restricted to the assigned teacher (`guru_id` / guru pengampu).
2. **R3: Hak Akses Jurnal Kelas**
   - Identify all routes, pages, and components related to "Jurnal Kelas" (e.g. `RekapJurnalPerKelas` or class journal views).
   - Investigate how navigation/routing/middleware checks user role:
     - Admin can access.
     - Wali Kelas can access only for their assigned class (`kelas_id`).
     - Regular teachers (guru biasa) must be blocked/hidden from accessing Jurnal Kelas.
   - Report exact files, lines of code, database tables/columns involved, and recommend implementation details.

## Required Output
Write your findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_1\handoff.md`.
Report back when finished.

## 2026-09-18T07:42:05Z
User / Parent Request:
You are Explorer 1 for Milestone 9.
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_1\DISPATCH.md.
Your scope:
1. R1: Pengaturan Tahun Ajaran & Daftar Nilai
   - How tahun_ajaran is configured in admin settings and database tables, and how it is fetched/used in Guru views.
   - Trace Daftar Nilai / Gradebook view: how admin view is locked to view-only with only a 'Cetak' button.
   - Trace Tujuan Pembelajaran (TP) management: ensure input/edit of TP is strictly restricted to the assigned teacher (guru pengampu).
2. R3: Hak Akses Jurnal Kelas
   - Identify all routes, pages, and components for Jurnal Kelas.
   - Investigate how navigation/routing/middleware checks user role: Admin can access, Wali Kelas can access only for their assigned class, Regular teachers (guru biasa) must be blocked or have the menu hidden.

Perform thorough code exploration. Find exact files, component names, lines of code, and database schema.
Write your complete findings and implementation plan to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_1\handoff.md.
Send a message when completed with your summary.


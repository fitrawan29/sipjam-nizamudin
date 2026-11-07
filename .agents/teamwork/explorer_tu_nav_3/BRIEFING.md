# BRIEFING — 2026-11-07T21:58:30Z

## Mission
Survey and investigate R3 (Pemisahan Halaman Rekap Presensi Guru dan TU pada Role Admin) and R4 (Pengelolaan dan Penugasan Akun TU oleh Admin) in sipjam-app.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_nav_3\
- Original parent: de917fec-7436-4fa2-9853-bd1bea951980
- Milestone: M1 - Exploration & Architectural Survey for R3 & R4

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Follow Ponytail principles (simplest, most minimal, no bloat/over-engineering)
- Follow 5-component handoff protocol

## Current Parent
- Conversation ID: de917fec-7436-4fa2-9853-bd1bea951980
- Updated: 2026-11-07T21:58:30Z

## Investigation State
- **Explored paths**:
  - `src/components/AdminRekapView.tsx` (Presensi recap, print view, GPS header & signatures, CSV export)
  - `src/components/AdminPenggunaView.tsx` (Teacher & TU account management, SweetAlert modals, pagination)
  - `src/lib/teacherUserSync.ts` (Automatic syncing between `data_guru` and `users`)
  - `src/types/database.ts` and `src/types/user.ts` (Schema definitions for `users` and `data_guru`)
  - `src/components/GuruPresensi.tsx` (Attendance submission into `presensi_guru`)
  - `tests/admin_submenu_pengguna_kredensial_guru.test.ts` & `tests/tata_usaha_role_rbac_and_isolation.test.ts`
- **Key findings**:
  - For R3: In `AdminRekapView.tsx`, presensi is currently aggregated in a single `rekapData.presensi` table seeded from `data_guru`. Guru and TU can be distinguished by querying `users` role (`role === 'tata_usaha'`) and `data_guru.mata_pelajaran`. UI requires 2 separate tables under "Tabel Rekapitulasi". Printed output requires `<div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>` between Guru and TU sections, with separate Kop Sekolah (`PrintHeader`) and `PrintSignature`.
  - For R4: In `AdminPenggunaView.tsx`, Mechanism 1 ("Menunjuk akun TU dari data guru yang sudah ada") can be implemented with a "Tunjuk TU" / "Ke Guru" toggle button in the table row updating `users.role`. Mechanism 2 ("Membuat akun baru khusus role TU") can be implemented by updating `handleCreateTuUser` modal to require all 4 fields (NIP, nama lengkap, nomor HP, email aktif) with regex validation, inserting into `users` (`role: 'tata_usaha'`) and `data_guru` (`mata_pelajaran: 'Tata Usaha (Administrasi)'`).
- **Unexplored areas**: None. Both R3 and R4 have been traced end-to-end.

## Key Decisions Made
- Use native CSS print page break (`page-break-before: always; break-before: page;`) for R3.
- In R4, store TU account credentials in `users` (`role = 'tata_usaha'`) and personnel details (NIP, nama, no_hp, email) in `data_guru` with `mata_pelajaran = 'Tata Usaha (Administrasi)'`. This fits existing multi-table integrity guards.

## Artifact Index
- DISPATCH.md — incoming dispatch instructions
- progress.md — liveness heartbeat
- BRIEFING.md — working memory
- handoff.md — comprehensive 5-component survey report

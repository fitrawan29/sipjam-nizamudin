# BRIEFING — 2026-10-04T05:27:00Z

## Mission
Implement Milestone 4 (M4): Laporan Wali Kelas in RekapSiswaView.tsx and gate attendance synchronization in GuruJurnal.tsx with strict multi-tenant isolation, automated test verification, and automated git push.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m4
- Original parent: 149f0279-6b23-4179-9bd4-edcb251f34f1
- Milestone: Milestone 4 (M4) — Laporan Wali Kelas & Sinkronisasi Guru Mapel

## 🔒 Key Constraints
- Multi-tenant isolation: strictly scope all queries by `sekolah_id = user.sekolah_id`.
- Follow minimal change principle; do not break existing functionality or schemas.
- Full verification: `npx tsc --noEmit`, `npm test`, and `npm run build` must pass.
- Per GEMINI.md: perform `git status`, `git add .`, `git commit -m "feat(attendance): add Wali Kelas gate attendance report and sync to GuruJurnal"`, and `git push origin main` automatically without prompting.

## Current Parent
- Conversation ID: 149f0279-6b23-4179-9bd4-edcb251f34f1
- Updated: 2026-10-04T05:27:00Z

## Task Summary
- **What to build**:
  1. `src/components/RekapSiswaView.tsx`: Add dedicated panel/tab for "Presensi Gerbang Piket" displaying daily gate check-in records from `presensi_siswa`. Automatic filter for Wali Kelas (`penugasan.kelas_binaan` or `wali_kelas`), class selector dropdown for Admin, date picker (default today), summary cards (Total Siswa, Hadir Datang, Pulang, Belum Scan), and table of students with NISN, Nama, Jam Datang, Jam Pulang, and status badges.
  2. `src/components/GuruJurnal.tsx`: When teacher opens journal and selects a class for today's teaching schedule, query `presensi_siswa` where `sekolah_id = user.sekolah_id`, `tanggal = today`, `kelas = selectedKelas`, `status = 'datang'`. In "Live Absensi Murid", display gate attendance indicator badge next to each student (`✓ Hadir di Sekolah (Piket ${jam})` green badge vs `Belum Scan Piket` gray/amber badge). Add helper button "Terapkan Presensi Piket" so teachers can quickly mark gate-present students as 'Hadir' in lesson attendance with manual adjustment support.
  3. Multi-tenant isolation: all queries filter by `sekolah_id = user.sekolah_id`.
- **Interface contracts**: `.agents/teamwork/PROJECT.md`
- **Code layout**: `.agents/teamwork/PROJECT.md`

## Key Decisions Made
- `RekapSiswaView.tsx`: Added tab navigation between "Rekapitulasi Bulanan" and "Presensi Gerbang Piket". Wali kelas auto-selects their assigned class (`penugasan.kelas_binaan` or `profile.wali_kelas`). Admin has class selection dropdown. Preserved all existing print layout, table styles, and signature blocks.
- `GuruJurnal.tsx`: Added `piketAttendance` state, fetching gate check-ins on class/date selection filtered by `sekolah_id`, `tanggal`, and `kelas`. Added "Terapkan Presensi Piket" button with auto-mark logic while retaining teacher manual edits. Scoped all queries (`data_siswa`, `data_mapel`, `jadwal_pelajaran`, `guru_mapel`) with `sekolah_id`.
- `workflow.ts`: Enhanced `findJadwalForGuru` to accept optional `sekolahId` parameter and scoped `jadwal_piket`, `presensi_guru`, `laporan_piket`, `jurnal_pembelajaran`.
- `tests/m4_wali_kelas_guru_sync.test.ts`: Added 31 unit and integration checks verifying components, queries, multi-tenant isolation, and UI synchronization.

## Artifact Index
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m4\DISPATCH.md` — Dispatch instructions
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m4\progress.md` — Liveness and progress tracking
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m4\handoff.md` — Handoff report
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\m4_wali_kelas_guru_sync.test.ts` — M4 automated tests

## Change Tracker
- **Files modified**:
  - `src/components/RekapSiswaView.tsx` — Presensi Gerbang Piket tab, summary cards, student gate attendance table, modal gate badge
  - `src/components/GuruJurnal.tsx` — Gate attendance indicators, Terapkan Presensi Piket button, multi-tenant scoping
  - `src/lib/workflow.ts` — Multi-tenant `sekolahId` filtering
  - `package.json` — Added M4 test suite to `npm test`
  - `tests/m4_wali_kelas_guru_sync.test.ts` — Comprehensive test suite
- **Build status**: Pass (tsc clean, tests pass, build successful)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (19 test suites, 0 tsc errors, turbopack build clean)
- **Lint status**: 0 errors
- **Tests added/modified**: `tests/m4_wali_kelas_guru_sync.test.ts` (31 assertions)

## Loaded Skills
- None

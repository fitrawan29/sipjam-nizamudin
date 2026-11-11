# Progress — Milestone 1: Kebijakan Presensi Guru & TU Tanpa KBM

Last visited: 2026-11-11T03:47:00Z

## Status
- [x] Initialized DISPATCH.md and BRIEFING.md
- [x] Reviewed requirements and explorer handoffs
- [x] Inspected files in scope:
  - `src/components/AdminConfigView.tsx`
  - `src/lib/workflow.ts`
  - `src/components/HomeViewTU.tsx`
  - `src/components/HomeViewGuru.tsx`
  - `src/components/AdminVerifView.tsx`
  - `src/components/HomeViewAdmin.tsx`
  - `src/lib/attendanceAlpa.ts`
- [x] Implemented changes in `AdminConfigView.tsx`:
  - Added policy guideline cards explaining "Guru Hadir Sesuai KBM" vs "Guru Hadir Setiap Hari & Staf TU/Tanpa Jam KBM"
  - Displayed visual category badges (`Staf Tata Usaha`, `Guru Tanpa Jam KBM`, `Guru KBM (N Jadwal)`)
  - Fixed mass action button "Set Semua Hanya Hari KBM" to strictly exempt only teachers with active KBM hours (excluding TU staff and 0-KBM teachers)
  - Enforced `wajib_hadir_hanya_mengajar = false` on save for all TU staff and non-KBM teachers
  - Disabled manual toggle to exempt for TU staff and non-KBM teachers with informative warning
- [x] Implemented changes in `src/lib/workflow.ts`:
  - Identified TU staff and teachers with 0 KBM hours (`isNonKbmOrTu = true`)
  - Enforced `isTeacherExempt = false` for TU staff and non-KBM teachers regardless of global policy
  - Enforced requirement for `state.jurnalKegiatan` before unlocking `canPresensiPulang`
- [x] Implemented changes in `src/components/AdminVerifView.tsx` & `src/components/HomeViewAdmin.tsx`:
  - Protected Staf TU and non-KBM teachers from `isTeacherExempt` and `isFreeFromPresence`
  - Prevented false "Bebas Hadir" status on active school days
- [x] Implemented changes in `src/lib/attendanceAlpa.ts`:
  - Prevented Staf TU and non-KBM teachers from being skipped under `isTeacherExempt`
- [x] Implemented changes in `src/components/HomeViewTU.tsx`:
  - Added piket duty detection (`isPiket`, `laporanPiket`, `laporanPiketDitolak`)
  - Included "Laporan Piket" step in workflow when assigned
  - Required both Jurnal Kegiatan and Laporan Piket for `canPresensiPulang`
- [x] Implemented changes in `src/components/HomeViewGuru.tsx`:
  - Suppressed false "Bebas Presensi" hero banner for non-exempt / non-KBM teachers
  - Rendered active workflow steps and interactive Jurnal Kegiatan card when 0 KBM today
- [x] Ran verification tests and typecheck:
  - `npx tsc --noEmit` -> PASS (0 errors)
  - `npx tsx tests/tu_refinements_and_admin_rekap.test.ts` -> PASS (82/82)
  - `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts` -> PASS (3/3)
  - `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts` -> PASS (20/20)
  - `npx tsx tests/jurnal_edit_delete_r2.test.ts` -> PASS (19/19)
- [x] Write handoff report and notify orchestrator

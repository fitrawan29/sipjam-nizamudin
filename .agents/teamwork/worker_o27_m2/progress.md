# Progress - worker_o27_m2

- **Status**: Completed Milestone M2 Implementation & Verification
- **Last visited**: 2026-11-05T15:54:00Z
- **Tasks**:
  1. [x] Read ORIGINAL_REQUEST.md, PROJECT.md, and investigation reports from explorer_o27_1 and explorer_o27_2.
  2. [x] Inspect target files: `src/components/AdminVerifView.tsx`, `src/components/DokumenView.tsx`, `src/components/GuruPresensi.tsx`, `src/lib/attendanceAlpa.ts`, `src/components/RekapJurnalView.tsx`.
  3. [x] Implement AdminVerifView changes:
     - Removed "Pedoman Kebijakan & SOP SIPJAM" button from header.
     - Presensi history list (`displayList`) explicitly sorted from newest to oldest.
     - "Bebas Hadir" displayed for teachers with `wajib_hadir_hanya_mengajar` / `Hari_Mengajar_Saja` when having 0 KBM classes and 0 piket duties.
     - Distinct category badge pills for Sakit, Izin, Dinas Luar, Hadir di Sekolah.
     - Piket unsubmitted teachers directly marked "tidak membuat laporan piket" without requiring manual/modal confirmation.
     - Jurnal verification excludes teachers with Sakit, Izin, or Dinas Luar attendance from delinquency.
  4. [x] Implement DokumenView changes:
     - Added `extractTingkat(kelas)`.
     - Limited document upload per subject to once for parallel classes at the same grade level with informative duplicate block warning.
     - Updated teacher subject cards and completion matrix to count grade-level document uploads across parallel classes.
  5. [x] Implement auto-fill KBM journal on absence (Sakit, Izin, Dinas Luar):
     - `src/lib/attendanceAlpa.ts`: added `autoFillKbmJournalsForLeave`, updated `recordUnfilledJournalsAndPiket` to record excused KBM instead of "tidak masuk kelas" when absent with leave.
     - `src/components/GuruPresensi.tsx`: automatically triggers `autoFillKbmJournalsForLeave` across leave dates upon attendance submission.
     - `src/components/RekapJurnalView.tsx`: queries presensi to recognize excused leave when synthesizing missing KBM entries, formatting table cells and CSV rows accordingly.
     - `src/components/AdminVerifView.tsx`: displays auto-filled leave journal tags and preserves excused status.
  6. [x] Run `npx tsc --noEmit` -> 0 errors.
  7. [x] Run `npm test` -> 100% test suites passed (0 failures).
  8. [x] Write handoff.md, git commit/push per rules, notify parent.

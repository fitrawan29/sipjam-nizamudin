# Handoff Report: Pemisahan Siswa Berdasarkan Status Agama pada PAI dan PAK

## 1. Observation
- **Original User Request**: Penambahan fitur pemisahan siswa berdasarkan status agama untuk mata pelajaran Pendidikan Agama Islam (PAI) dan Pendidikan Agama Kristen (PAK) dalam satu kelas, di mana siswa yang terbaca di PAI hanya yang berstatus agama Islam dan di PAK hanya yang berstatus agama Kristen, tanpa merubah fitur dan logika lain yang tidak terdampak.
- **Execution Route**: SWE Light (`teamwork_swe`), running sequential refinement across 1 implementation round, 3 adversarial review rounds, and an independent Sentinel Victory Auditor.
- **Codebase Artifacts Created / Modified**:
  - `src/lib/agamaFilter.ts`: Core subject detection (`isPaiSubject`, `isPakSubject`) and student religion validation (`isIslamStudent`, `isKristenStudent`, `filterStudentsBySubject`).
  - `src/lib/presensiIntervensi.ts`: Scoped KBM journal resolution (`findLastKbmJournal`, `resolveDailyStudentAttendance`) by student subject eligibility to eliminate multi-religion fallback leakage.
  - `src/components/GuruJurnal.tsx`: Strict attendance state pruning and payload serialization preventing non-eligible students from polluting KBM attendance records.
  - `src/components/GradebookView.tsx`: Assessment student roster filtering for PAI and PAK classes.
  - `src/components/RaporView.tsx`: Student eligibility filtering for academic report generation.
  - `src/components/RekapSiswaView.tsx`: Student-bound daily journal lookups for attendance recap.
  - `src/components/AdminKelasView.tsx`: Class roster directory and subject filter support.
  - `src/components/AdminDataView.tsx` & `src/lib/dataIntegrityGuard.ts`: Master student data modal, CSV template, and import validation support for `agama`.
  - `supabase/migrations/20261109_add_agama_to_data_siswa.sql`: Database migration adding `agama` to `data_siswa`.
  - `tests/agama_pai_pak_isolation.test.ts`: Dedicated 29-assertion test suite.

## 2. Logic Chain
1. **R1 — Pemisahan Siswa Berdasarkan Agama pada PAI dan PAK**:
   - `normalizeSubject` canonicalizes subject names across punctuation, whitespace, and case variants, accurately matching acronyms (`PAI`, `PAK`, `P.A.I.`, `P.A.K.`, `PAIBP`, `PAK10`, `PAIX`).
   - `isStudentEligibleForSubject` checks student religious affiliation against required subject religion:
     * PAI requires Islam (accepts aliases `Islam`, `Muslim`, `Moslem`).
     * PAK requires Kristen (accepts aliases `Kristen`, `Katolik`, `Christian`).
   - Components consuming class student rosters (`GuruJurnal`, `GradebookView`, `RaporView`, `RekapSiswaView`, `AdminKelasView`) invoke `filterStudentsBySubject` whenever PAI or PAK is active.
   - Journal attendance saves prune non-eligible student keys from `absensi_siswa` JSON.
2. **R2 — Non-Regresi Mata Pelajaran Lain**:
   - For all general subjects (Matematika, Bahasa Indonesia, dsb.), `getRequiredReligionForSubject` returns `null` and `filterStudentsBySubject` preserves the complete class roster without modification.
   - Word boundary checks (`\bpaket\b`) prevent false positive classifications on subjects like "Paket Keahlian".
   - Existing master data schemas, CSV templates, and authentication flows remain fully backward-compatible.

## 3. Caveats
- Students with unpopulated/NULL `agama` in the database will be excluded from PAI and PAK classes until an administrator sets their religion in Master Data or re-imports via CSV. They remain fully included in all general subjects. This is deliberate design to enforce strict religious isolation.
- Remote Supabase PostgreSQL instance requires running the provided migration script `supabase/migrations/20261109_add_agama_to_data_siswa.sql` to persist the column in cloud storage.

## 4. Conclusion
All requirements and acceptance criteria have been fully implemented and independently verified:
- `tests/agama_pai_pak_isolation.test.ts`: 29 / 29 checks passed.
- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm test`: 77 / 77 test suites passed.
- `npm run build`: Production build succeeded.
- Independent Sentinel Victory Audit verdict: **VICTORY CONFIRMED**.

## 5. Verification Method
To reproduce the independent verification:
```powershell
npx tsx tests/agama_pai_pak_isolation.test.ts
npx tsc --noEmit
npm test
npm run build
```
Verify exit code 0 across all commands.

# BRIEFING — 2026-11-06T00:57:00Z

## Mission
Penyelarasan Template Master Data & Impor CSV (Milestone 2)

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 2 (Penyelarasan Template Master Data & Impor CSV)

## 🔒 Key Constraints
- Exclusive write ownership: `src/components/AdminDataView.tsx`, `src/lib/dataIntegrityGuard.ts`, `src/components/AdminKelasView.tsx`.
- DO NOT CHEAT. All implementations must be genuine. No dummy implementations or hardcoded values.
- Strictly preserve existing invariants:
  * `Template_Kalender_Pendidikan.csv` MUST NOT contain `'id'` (tests/production_admin_adjustments.test.ts:688).
  * `Template_Jadwal_Pelajaran.csv` MUST NOT contain `'id'` (tests/production_admin_adjustments.test.ts:696).
  * `Template_Data_Guru.csv` MUST contain `'sekolah_id'` (tests/data_guru_csv_import_sekolah_id_validation.test.ts:834).
  * Preserve toast `showToast('Unggah Berhasil', ...)` for test invariant compliance (tests/ui_ux_improvements_audit.test.ts:84).
- Dispatch `window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'))` upon successful import when `tabObj.id === 'Data_Kelas' || tabObj.id === 'Data_Siswa'`.
- Provide clear row-level feedback if error occurs (`Baris ${i}`).
- Follow Git workflow rule in `GEMINI.md`: git status, git add ., git commit, git push origin main.

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: 2026-11-06T00:57:00Z

## Task Summary
- **What to build**: Harmonize CSV templates across all 7 master data entities, enhance `dataIntegrityGuard.ts` for header normalization, row-level validation, student deduplication by `(sekolah_id, nisn)`, and `data_kelas` upsert with fallback. Add CSV actions and live refresh listener to `AdminKelasView.tsx`.
- **Success criteria**: Static typecheck (`npx tsc --noEmit`) passes, full regression suite (`npm test`, 54 test files) passes, dedicated M2 test suite (16 tests) passes, git pushed to origin main.
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: `src/components/AdminDataView.tsx`, `src/lib/dataIntegrityGuard.ts`, `src/components/AdminKelasView.tsx`

## Key Decisions Made
- Added `Data_Kelas` template to `AdminDataView.tsx` with headers `['nama_kelas', 'tingkat', 'jurusan']` and sample `['X Merdeka', '10', 'Umum']`.
- Preserved existing invariants for Kalender & Jadwal templates (omitting 'id' to prevent 22P02 and comply with existing regression tests) and Guru template (retaining 'sekolah_id').
- In `dataIntegrityGuard.ts`, expanded `normalizeCsvHeaders` to handle BOM, trim spaces, aliases for class (`nama_kelas`, `tingkat`, `jurusan`), and scoped `nama` to prevent cross-entity collisions.
- In `parseAndValidateMasterCsv`, added pre-validation of required headers, row-level checks for `data_kelas`, auto-derivation of `tingkat` (10, 11, 12, Lainnya), Excel apostrophe sanitization for numbers, and conversion of legacy string IDs to UUIDs.
- In `importMasterDataFromCsv`, implemented student idempotency matching by `(sekolah_id, nisn)` so re-uploading students updates their class allocations without duplicate rows, and targeted `(sekolah_id, nama_kelas)` for class upserts with fallback on PGRST205.
- In `AdminKelasView.tsx`, added "Template CSV" download and "Impor CSV" upload buttons in the toolbar and wired an event listener for `sipjam:kelas-updated`.

## Artifact Index
- `.agents/teamwork/worker_m2/DISPATCH.md` — Dispatch requirements
- `.agents/teamwork/worker_m2/progress.md` — Progress tracker and liveness heartbeat
- `.agents/teamwork/worker_m2/BRIEFING.md` — Persistent briefing
- `.agents/teamwork/worker_m2/handoff.md` — Final handoff report
- `tests/m2_csv_templates_and_import_harmonization.test.ts` — Comprehensive Milestone 2 verification suite

## Change Tracker
- **Files modified**:
  * `src/components/AdminDataView.tsx`: Harmonized templates (added `Data_Kelas`), added event dispatch `sipjam:kelas-updated`, preserved `showToast('Unggah Berhasil')` and modal error details.
  * `src/lib/dataIntegrityGuard.ts`: Added `isSchemaCacheError`, robust `normalizeCsvHeaders`, pre-validation required headers check, `data_kelas` validation, student idempotency by `(sekolah_id, nisn)`, and class upsert with fallback.
  * `src/components/AdminKelasView.tsx`: Added Template CSV and Impor CSV buttons, wired `importMasterDataFromCsv`, and added `sipjam:kelas-updated` listener.
  * `tests/m2_csv_templates_and_import_harmonization.test.ts`: Dedicated test suite covering all M2 requirements.
- **Build status**: `npx tsc --noEmit` PASS (0 errors), `npm test` PASS (54 suites, 0 failures), M2 suite PASS (16/16).
- **Pending issues**: None

## Quality Status
- **Build/test result**: Passed 100%
- **Lint status**: Clean
- **Tests added/modified**: `tests/m2_csv_templates_and_import_harmonization.test.ts` (16 automated tests)

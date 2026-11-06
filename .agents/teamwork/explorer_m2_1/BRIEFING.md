# BRIEFING — 2026-11-06T00:43:30Z

## Mission
Analyze and harmonize CSV templates for all 7 master data entities in `src/components/AdminDataView.tsx` against table schemas and invariant tests, producing a precise blueprint.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_1
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 2 (Penyelarasan Template Master Data & Impor CSV)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Focus on harmonization of CSV templates for all 7 master data entities in `src/components/AdminDataView.tsx`
- Invariant guardrails:
  * `Kalender_Pendidikan` MUST NOT have `id` (asserted by tests/production_admin_adjustments.test.ts:688)
  * `Jadwal_Pelajaran` MUST NOT have `id` (asserted by tests/production_admin_adjustments.test.ts:696)
  * `Data_Guru` MUST have `sekolah_id` (asserted by tests/data_guru_csv_import_sekolah_id_validation.test.ts)

## Current Parent
- Conversation ID: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Updated: 2026-11-06T00:35:13Z

## Investigation State
- **Explored paths**:
  * `src/components/AdminDataView.tsx`: lines 35–50 (`normalizeAdminTab`), lines 228–285 (`handleDownloadTemplate`), lines 288–322 (`handleFileUpload`), lines 1900–1980 (tabs and "Impor & Kelola Data" toolbar rendering).
  * `src/components/AdminKelasView.tsx`: class directory data structures, action buttons, dynamic schema fallback.
  * `src/types/database.ts`: table definitions for `data_siswa`, `data_guru`, `data_mapel`, `jadwal_pelajaran`, `kalender_pendidikan`, `wali_kelas`.
  * `src/lib/dataIntegrityGuard.ts`: `normalizeCsvHeaders`, `parseAndValidateMasterCsv`, `importMasterDataFromCsv`.
  * `tests/production_admin_adjustments.test.ts`: lines 674–730 (invariants for Kalender & Jadwal templates).
  * `tests/data_guru_csv_import_sekolah_id_validation.test.ts`: lines 820–845 (invariant for Data_Guru `sekolah_id`).
  * `tests/adversarial_r1_r5_stress_test.ts`: lines 500–540 (template assertions).
- **Key findings**:
  * `templates` record in `AdminDataView.tsx` currently only contains 6 entities (`Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`). `Data_Kelas` is missing.
  * All 6 existing templates are precisely aligned with database schemas and satisfy existing invariant test regexes.
  * When `activeTab === 'Data_Kelas'`, the "Impor & Kelola Data" section in `AdminDataView.tsx` is currently excluded in the JSX condition (`activeTab === 'Data_Kelas' ? <AdminKelasView /> : ...`). Adding the toolbar above `AdminKelasView` or integrating download/upload enables users to directly download and upload `Template_Data_Kelas.csv`.
  * The blueprint for `AdminDataView.tsx:templates` must include `Data_Kelas` with `Template_Data_Kelas.csv`, headers `['nama_kelas', 'tingkat', 'jurusan']`, sample `['X Merdeka', '10', 'Umum']`.
- **Unexplored areas**: Milestone 3 test suite implementation (`tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`), which is out of scope for M2 Explorer.

## Key Decisions Made
- Confirmed exact schema alignment for all 7 entities.
- Validated that `Kalender_Pendidikan` and `Jadwal_Pelajaran` strictly omit `id` and legacy strings.
- Validated that `Data_Guru` strictly includes `sekolah_id`.
- Designed exact blueprint for `AdminDataView.tsx:templates` and recommendations for UI wiring and `dataIntegrityGuard.ts`.

## Artifact Index
- `DISPATCH.md` — Incoming message record
- `BRIEFING.md` — Persistent identity and situational awareness
- `progress.md` — Liveness heartbeat
- `handoff.md` — Final handoff report

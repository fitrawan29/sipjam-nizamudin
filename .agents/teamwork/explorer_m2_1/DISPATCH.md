## 2026-11-06T00:35:13Z
From: 77685953-a979-46b9-9e32-e6b24ab55eb5 (parent)
Content:
You are a Teamwork Explorer for Milestone 2 (Penyelarasan Template Master Data & Impor CSV).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.

Your task:
Focus on the harmonization of CSV templates for all 7 master data entities in `src/components/AdminDataView.tsx`:
1. Kelas
2. Siswa
3. Guru
4. Mapel
5. Kalender Pendidikan
6. Jadwal Pelajaran
7. Wali Kelas

Detailed analysis:
- Check lines 228–285 in `src/components/AdminDataView.tsx` (`handleDownloadTemplate` and `templates` record).
- Add template for `Data_Kelas` (`Template_Data_Kelas.csv`, headers: `['nama_kelas', 'tingkat', 'jurusan']`, sample: `['X Merdeka', '10', 'Umum']`).
- Check all 6 other templates. Are they precisely aligned with target table schemas?
- Invariant guardrails:
  * `Kalender_Pendidikan` MUST NOT have `id` (asserted by tests/production_admin_adjustments.test.ts:688).
  * `Jadwal_Pelajaran` MUST NOT have `id` (asserted by tests/production_admin_adjustments.test.ts:696).
  * `Data_Guru` MUST have `sekolah_id` (asserted by tests/data_guru_csv_import_sekolah_id_validation.test.ts).
- Produce the exact code blueprint for `AdminDataView.tsx:templates`.
Write your complete findings and blueprint to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_1\handoff.md
Send a brief message back to the orchestrator when done.

## 2026-11-06T00:44:32Z
You are a Teamwork Worker for Milestone 2 (Penyelarasan Template Master Data & Impor CSV).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.
You MUST also read the Explorer handoff reports for Milestone 2:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_1\handoff.md (CSV templates harmonization)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\handoff.md (CSV parsing, validation & upsert engine)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_3\handoff.md (CSV upload feedback & robustness)

File ownership:
You have exclusive write ownership of:
1. `src/components/AdminDataView.tsx`
2. `src/lib/dataIntegrityGuard.ts`
3. `src/components/AdminKelasView.tsx`

Your task:
1. In `src/components/AdminDataView.tsx`:
   - In `templates` record (lines 228–285), add `Data_Kelas`:
     ```ts
     Data_Kelas: {
       filename: 'Template_Data_Kelas.csv',
       headers: ['nama_kelas', 'tingkat', 'jurusan'],
       sample: ['X Merdeka', '10', 'Umum']
     }
     ```
   - Ensure all 7 entity templates (`Data_Kelas`, `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `Wali_Kelas`) are harmonized with target table schemas.
   - Strictly preserve existing invariants:
     * `Template_Kalender_Pendidikan.csv` MUST NOT contain `'id'` (asserted by tests/production_admin_adjustments.test.ts:688).
     * `Template_Jadwal_Pelajaran.csv` MUST NOT contain `'id'` (asserted by tests/production_admin_adjustments.test.ts:696).
     * `Template_Data_Guru.csv` MUST contain `'sekolah_id'` (asserted by tests/data_guru_csv_import_sekolah_id_validation.test.ts:834).
   - In `handleFileUpload`:
     * Preserve toast `showToast('Unggah Berhasil', ...)` for test invariant compliance (`tests/ui_ux_improvements_audit.test.ts:84`).
     * Dispatch `window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'))` upon successful import when `tabObj.id === 'Data_Kelas' || tabObj.id === 'Data_Siswa'`.
     * Provide clear row-level feedback if error occurs (`Baris ${i}`).
2. In `src/lib/dataIntegrityGuard.ts`:
   - `normalizeCsvHeaders`:
     * Add normalization mappings for `data_kelas` / `kelas`: `nama_kelas`, `tingkat`, `jurusan`, `kelas`, `rombel`.
     * Clean BOM, trim spaces, handle case-insensitivity.
   - `parseAndValidateMasterCsv`:
     * Add validation for `data_kelas`: validate `nama_kelas` is non-empty, auto-generate UUID `id`.
     * Check required headers pre-validation (fail early with row error if required columns are missing).
     * Clean Excel apostrophes on NISN, phone, NIP.
     * Ensure legacy non-UUID IDs are replaced with valid UUIDs to prevent Postgres error 22P02.
   - `importMasterDataFromCsv`:
     * Add `data_kelas` upsert: upsert to `data_kelas` with `onConflict: 'sekolah_id, nama_kelas'`; if PGRST205 or schema cache missing, gracefully fallback to updating classes in `data_siswa` / `wali_kelas`.
     * For `data_siswa`: fetch existing students in `data_siswa` by `(sekolah_id, nisn)` and map their existing UUID `id`, so re-uploading students with updated classes updates existing rows instead of creating duplicate student rows!
3. In `src/components/AdminKelasView.tsx`:
   - Add "Template CSV" and "Impor CSV" buttons in `AdminKelasView` toolbar for administrative convenience, allowing admins to download `Template_Data_Kelas.csv` and upload class CSV directly from the sub-menu.
   - Listen to `sipjam:kelas-updated` event to refresh class directory cards and rosters.
4. Run verification commands:
   - `npx tsc --noEmit`
   - `npm test`
5. Follow the Git workflow rule in GEMINI.md:
   - `git status`
   - `git add .`
   - `git commit -m "feat: selaraskan seluruh template master data dan mekanisme impor CSV dengan skema database"`
   - `git push origin main`
6. Write a complete handoff report to:
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md`
   and notify the orchestrator with `send_message`.

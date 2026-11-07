## 2026-11-07T00:10:19Z
You are worker_m3_nov.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_nov\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Explorer Reports to read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_1\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_3\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first before writing code.

## File Ownership
You exclusively own and will modify:
- `src/components/AdminDataView.tsx`
- `src/lib/dataIntegrityGuard.ts`
- `src/components/AdminKelasView.tsx`
- `tests/master_data_workflow_stepper_and_relational_validation.test.ts` (new verification test suite)

## Implementation Scope: Milestone 3 (Requirement R4)
Implement the unified blueprints produced by the three explorers:

1. **Master Data Navigation Order & Panduan Alur (Visual Workflow Stepper)** in `src/components/AdminDataView.tsx`:
   - Keep the exact tab order in `const tabs = [...]`:
     1. Siswa (`Data_Siswa`)
     2. Kelas (`Data_Kelas`)
     3. Mapel (`Data_Mapel`)
     4. Guru (`Data_Guru`)
     5. Jadwal (`Jadwal_Pelajaran`)
     6. Wali Kelas (`Wali_Kelas`)
     7. Pengguna (`Pengguna`)
     8. Kalender (`Kalender_Pendidikan`)
     9. Periode Sistem Blok (`sistem_blok` - opsional)
   - Enrich `tabs` items with `step`, `icon`, `desc`, and `optional: true` on `sistem_blok`, while strictly preserving the literal `id`, `label`, `table` properties to satisfy AST regex tests in `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`.
   - Render the Clay-styled **Panduan Alur Penginputan Master Data** visual workflow stepper card immediately above the tabs bar:
     * 9 step cards with numbered circle badge, icon, title, description, and optional tag for step 9.
     * Connecting chevron arrows (`fa-chevron-right`) between steps.
     * Active step highlighted with vibrant purple gradient (`bg-gradient-to-r from-purple-600 to-indigo-600 text-white`).
     * Completed/past steps marked with checkmark `✓`.
     * Clicking any step triggers unified `handleSwitchTab(tabId)`, updating `activeTab`, URL query parameter `?view=view-admin-data&tab=${tabId}`, and resetting filter/page states.
     * Responsive container with `overflow-x-auto custom-scroll` and `shrink-0` cards.
   - Add icons to the pill tab buttons below the stepper.

2. **Master Data CSV Templates Harmony** in `AdminDataView.tsx`:
   - Verify and harmonize all 9 template downloads:
     * Siswa: `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']`
     * Kelas: `['nama_kelas', 'tingkat', 'jurusan']`
     * Mapel: `['nama_mata_pelajaran', 'kategori', 'kelompok']` (or optional id)
     * Guru: `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']` (must contain `sekolah_id` to satisfy tests)
     * Jadwal: `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` (must NOT contain `id`)
     * Wali Kelas: `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']`
     * Pengguna: `['username', 'nama', 'role', 'password']` (add template)
     * Kalender: `['tanggal', 'keterangan', 'tipe']` (must NOT contain `id`)
     * Periode Blok: `['nama_kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'tipe_target', 'target_kelas', 'deskripsi']` (add template)

3. **Pre-Upload Relational Dependency Validation** in `src/lib/dataIntegrityGuard.ts`:
   - Implement `validateRelationalDependencies` in `dataIntegrityGuard.ts` called inside `importMasterDataFromCsv` before DB batch upserts:
     * For `data_siswa`: verify that `kelas` exists in `data_kelas` (or `wali_kelas` or cached school classes).
     * For `jadwal_pelajaran`: verify that `nama_guru` exists in `data_guru`, `mata_pelajaran` exists in `data_mapel`, and `kelas` exists in `data_kelas`.
     * For `wali_kelas`: verify that `nama_guru` exists in `data_guru` and `kelas` exists in `data_kelas`, and auto-populate `guru_id`.
   - Use single-query batch lookups with O(1) Sets/Maps.
   - Defensive checks: check `typeof supabase?.from === 'function'` and catch errors so unit test mocks without prerequisite tables don't crash.
   - Abort with descriptive error containing row number (`Baris ${rowNum}: ...`) if prerequisites are missing.

4. **Upload Progress Bar & Granular Error Diagnostics**:
   - Add optional 5th parameter `onProgress?: UploadProgressCallback` to `importMasterDataFromCsv` in `src/lib/dataIntegrityGuard.ts` emitting 6 distinct stages (0% to 100%):
     1. `Membaca berkas CSV...` (5%)
     2. `Memvalidasi skema data...` (15%)
     3. `Memeriksa dependensi relasional...` (30%)
     4. `Mengunggah baris X dari Y...` (40% to 90%)
     5. `Sinkronisasi akun & data lokal...` (95%)
     6. `Selesai` (100%)
     Include a micro-yield `await new Promise(r => setTimeout(r, 10))` after each progress call for smooth UI rendering.
   - Tag parsed CSV rows in `parseAndValidateMasterCsv` with non-enumerable property `_csvRowNumber` so original CSV line numbers are preserved through batching without leaking into Postgres payloads.
   - Implement `translateDatabaseError` in `dataIntegrityGuard.ts` translating Postgres constraint codes:
     * `23503`: Foreign Key Violation -> Row number, column, received value, reference table, and actionable remediation advice.
     * `23502`: Not-Null Violation -> Row number, column, missing value warning, and remediation advice.
     * `23505`: Unique Violation -> Row number, column, duplicate value, and remediation advice.
     * `42501`: RLS Security -> Tenant isolation guidance.
     * Preserves `Baris ${rowNumber}` prefix in messages to maintain 100% backward test compatibility!
   - In `AdminDataView.tsx` and `AdminKelasView.tsx`:
     * State: `isUploading`, `uploadProgress`, `uploadStage`, `uploadBatchInfo`.
     * Render animated gradient progress bar with percentage, stage text, and batch counters while uploading.
     * Render rich SweetAlert2 modal on error displaying the diagnostic metadata grid and remediation advice.

5. **Author Automated Verification Test Suite**:
   Create `tests/master_data_workflow_stepper_and_relational_validation.test.ts` verifying:
   - Stepper card exists, has all 9 steps in correct sequence, and step switching works.
   - All 9 CSV templates download with valid headers and data.
   - Pre-upload relational validation blocks unfulfilled dependencies (`data_siswa` missing class, `jadwal_pelajaran` missing teacher/mapel/class, `wali_kelas` missing teacher/class) with row-level messages.
   - When prerequisites exist, upload succeeds and auto-enriches `guru_id`.
   - `onProgress` callback receives increasing percentages from 0 to 100.
   - PostgreSQL error translation produces structured diagnostics with row number, column, and advice.

## Verification Requirements
Run:
1. `npx tsc --noEmit` -> Must be 0 errors.
2. `npx tsx tests/master_data_workflow_stepper_and_relational_validation.test.ts` -> All tests pass.
3. `npm test` -> All 61+ test suites must pass.
4. `npm run build` -> Next.js Turbopack build must succeed (exit code 0).

## Git Workflow Rule (MANDATORY)
Upon completing your work:
1. `git status`
2. `git add .`
3. `git commit -m "feat(master-data): implement workflow stepper, relational validation, progress bar and granular error diagnostics"`
4. `git push origin main`

# Handoff Report — Reviewer 1 (Code Reviewer & UI Hierarchy Auditor)

- **Verdict**: **APPROVE**
- **Date**: 2026-10-11T01:22:30Z
- **Reviewer**: Reviewer 1 (`reviewer_gradebook_1`)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_gradebook_1`
- **Scope**:
  - `src/components/GradebookView.tsx`
  - `src/types/database.ts`
  - `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`

---

## 1. Observation

### 1.1 Compilation and Test Execution
- Executed `npx tsc --noEmit`: Exited with code `0`, output clean (0 type errors, 0 syntax blockers).
- Executed `npm test`: Background task completed with exit code `0`. All 19 active test suites passed cleanly with 0 failures.

### 1.2 Syntax Fix in `GradebookView.tsx`
- Located at lines 3056–3065:
  ```tsx
  3056:                   type="submit"
  3057:                   className="btn-click px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md"
  3058:                 >
  3059:                   {editingTp ? 'Simpan Perubahan' : 'Buat TP'}
  3060:                 </button>
  3061:               </div>
  3062:             </form>
  3063:           </div>
  3064:         </div>
  3065:       )}
  ```
- Followed cleanly by `isColModalOpen` (lines 3068–3156), `isCpModalOpen` (lines 3159–3208), `isBobotModalOpen` (lines 3211–3256), and `isBulkFillModalOpen` (lines 3259–3340).
- Premature closing tags that previously broke the file have been cleanly resolved.

### 1.3 Database Migration (`20261011_capaian_pembelajaran_and_gradebook_v2.sql`)
- Table `capaian_pembelajaran` defined with columns: `id`, `sekolah_id`, `guru_mapel_id`, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`, `kode_cp`, `deskripsi`, `urutan`, `created_at`, `updated_at`.
- Relationship: `ALTER TABLE public.tujuan_pembelajaran ADD COLUMN IF NOT EXISTS cp_id UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL;`.
- Assessment notes: `ALTER TABLE public.asesmen_kolom ADD COLUMN IF NOT EXISTS keterangan TEXT;`.
- Diagnostik constraint: `CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik ON public.asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik');`.
- RLS policies and grants enabled.
- Default bobot seeded: `{"kehadiran":40,"formatif":30,"sumatif":30}` into `pengaturan`.

### 1.4 TypeScript Typings (`src/types/database.ts`)
- `capaian_pembelajaran` is declared in `Database['public']['Tables']` at line 1451 with matching `Row`, `Insert`, `Update`, and `Relationships`.
- `tujuan_pembelajaran` includes `cp_id: string | null` and relationship to `capaian_pembelajaran` at line 1514 and 1566.
- `asesmen_kolom` includes `keterangan: string | null` at line 82, 94, 106.
- Type exports at lines 2013–2028: `CapaianPembelajaran`, `CapaianPembelajaranInsert`, `CapaianPembelajaranUpdate`, `BobotNilaiMapel`, and `DEFAULT_BOBOT_NILAI_MAPEL`.

### 1.5 CP → TP Hierarchy in `GradebookView.tsx`
- **CP required before adding TP**:
  - Educational warning banner appears when `cpList.length === 0` (lines 2056–2061).
  - "Tambah TP Baru" button has `disabled={cpList.length === 0}` (line 2090).
  - `handleOpenAddTpModal` rejects TP creation if `cpList.length === 0` (lines 1053–1056).
- **TP Modal requires & populates `cp_id`**:
  - Modal form renders `<select required value={tpForm.cp_id}>` (lines 2952–2964).
  - Populates default `cp_id` from `selectedCpId` or `cpList[0].id` (line 1064).
  - `handleSaveTp` persists `cp_id` to `tujuan_pembelajaran` (lines 1103, 1120).
- **TP pills filter by active CP**:
  - `displayedTpList` useMemo filters `tpList.filter(tp => tp.cp_id === selectedCpId || !tp.cp_id)` (lines 923–926).
  - Allows toggle via `showAllTp` button (lines 2073–2084).
- **Saving CP links `guru_mapel_id`**:
  - `matchingGuruMapel = mapelList.find(m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === selectedKelas))?.id || null` (line 720).
  - Saved to `capaian_pembelajaran.guru_mapel_id` on insert/update (lines 726, 734).

### 1.6 Asesmen Constraints & `keterangan` Field
- **Diagnostik capped at max 1 per TP**:
  - UI `handleOpenAddColModal` only accepts `'Formatif' | 'Sumatif'` (line 1219).
  - UI `handleSaveCol` rejects adding a 2nd Diagnostik (lines 1265–1271).
  - UI `handleDeleteCol` blocks deleting Diagnostik (lines 1320–1323).
  - UI `fetchColumnsForActiveTP` auto-heals by inserting the single Diagnostik if absent (lines 816–835).
  - DB partial unique index enforces uniqueness at database layer.
- **Multiple Formatif & Sumatif**:
  - Unlimited additions supported with custom `bobot`.
- **Field `keterangan`**:
  - Editable via `colForm.keterangan` in `isColModalOpen` (lines 3110–3119).
  - Persisted in `asesmen_kolom.keterangan` (lines 1280, 1295).
  - Displayed as a subtitle under the column header and via `title={col.keterangan ? ... : undefined}` tooltip (lines 2302–2315, 2330–2361, 2376–2407).

### 1.7 Admin Bobot Settings
- **Role visibility**:
  - Button to open bobot modal only rendered for `{isAdmin && (...)}` (lines 1769–1778).
  - Modal only rendered for `{isBobotModalOpen && isAdmin && (...)}` (lines 3211–3256).
- **Strict 100% sum validation**:
  - Validated in `handleSaveBobot`: `if (total !== 100) { showToast('Validasi', 'Total bobot harus 100%...', 'warning'); return; }` (lines 770–773).
  - Live total badge turns green if 100%, red if not (lines 3235–3242).
- **Persistence and Loading**:
  - Persisted as JSON string `{"kehadiran": X, "formatif": Y, "sumatif": Z}` in `pengaturan` (lines 775–784).
  - Loaded on mount scoped to `sekolahId` in `useEffect` (lines 197–219).

### 1.8 Nilai Akhir Formula & Integrity
- Evaluated in `calculateStudentSemesterStats`:
  ```tsx
  semesterFinalRaw = parseFloat((
    kehadiranScore * (bobotKehadiran / 100) +
    avgFormatifAll * (bobotFormatif / 100) +
    avgSumatifAll * (bobotSumatif / 100)
  ).toFixed(1));
  ```
- Diagnostik is excluded from final grade calculation.
- Missing Formatif or Sumatif results in `semesterFinalRaw = null` and displays `-` in the UI (line 2752).
- Kehadiran is calculated from real KBM sessions in `jurnal_pembelajaran` (lines 228–271) with fallback to `absensi`.
- Kurikulum Merdeka description generation preserved for `RaporView.tsx`.
- **Integrity Check**:
  - No hardcoded test outputs or mock bypasses found.
  - No dummy/facade implementations.
  - Genuine Supabase data layer integrations.

---

## 2. Logic Chain

1. **Premise**: If `npx tsc --noEmit` and all project unit tests pass, the codebase has no syntax blockers, type regressions, or broken component imports.
   - **Verification**: `npx tsc --noEmit` produced 0 errors; `npm test` executed 19 test suites successfully with 0 failures.
2. **Premise**: If Capaian Pembelajaran is required before TP and cannot be bypassed in UI, the CP → TP hierarchy is strictly maintained.
   - **Verification**: UI disables the "Tambah TP Baru" button when `cpList.length === 0`, displays an educational guide banner, and programmatic validation in `handleOpenAddTpModal` rejects submissions without CP.
3. **Premise**: If Diagnostik is auto-healed to exactly 1, blocked from deletion, blocked from duplication in UI, and backed by a DB unique index, the assessment constraint of max 1 Diagnostik is robust across UI and DB layers.
   - **Verification**: `handleOpenAddColModal` restricts category choice to Formatif/Sumatif, `handleSaveCol` validates single Diagnostik, `handleDeleteCol` denies deletion, and `uq_asesmen_tp_diagnostik` enforces it at DB level.
4. **Premise**: If Bobot form is restricted to `isAdmin`, strictly validates `total === 100`, and dynamically loads from `pengaturan`, the administrative requirement is complete and tamper-resistant.
   - **Verification**: Guarded by `isAdmin`, rejects non-100% totals, updates `pengaturan` table, and recalculates grades dynamically.

---

## 3. Caveats

- Migration execution: The migration script `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql` is ready and verified syntactically. Its live application in the production Supabase project requires standard database migration runner execution.
- Older legacy test `tests/m4_gradebook.test.ts` contains a stale string assertion (`import GradebookView from './GradebookView'`), which was superseded by Next.js dynamic import (`dynamic(() => import('./GradebookView'))`) in earlier performance milestones; it is not part of `npm test`.

---

## 4. Conclusion

The implementation in `src/components/GradebookView.tsx`, `src/types/database.ts`, and `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql` completely, accurately, and cleanly fulfills all requirements (R1–R5) with zero syntax errors, robust UI validation, strict database constraints, accurate mathematical formulas, and full integrity compliance.

**Explicit Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce this verification:
1. Run TypeScript Compiler:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected: Exit code 0, 0 errors.*
2. Run Test Suite:
   ```powershell
   npm test
   ```
   *Expected: All 19 active suites pass.*
3. Inspect Schema & Types:
   - Check `capaian_pembelajaran` in `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`
   - Check `src/types/database.ts` lines 1451–1575 and 2013–2028
4. Inspect UI Hierarchy & Constraints:
   - Check `src/components/GradebookView.tsx` lines 714–751 (`handleSaveCp`), lines 1048–1173 (`handleSaveTp`), lines 1219–1308 (`handleSaveCol`), lines 768–793 (`handleSaveBobot`), and lines 1484–1560 (`calculateStudentSemesterStats`).

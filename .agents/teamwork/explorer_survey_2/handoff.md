# Handoff Report — Explorer 2: Database Schema, Migrations, Types & Admin Settings

- **Project**: orchestrator_21
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2`
- **Role**: Explorer 2 (Database & Admin Settings Explorer)
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (2026-10-10T22:56:05Z)
- **Date**: 2026-10-11

---

## 1. Observation

### 1.1 Existing Database Architecture & Migrations
- **Migration Directory**: `supabase/migrations/` contains 23 migration files (from `20260911_guru_mapel_relational.sql` to `20261009_delete_ahmad_dahlan.sql`).
- **Existing Gradebook Tables** in `supabase/migrations/20260917_comprehensive_features.sql`:
  - `public.tujuan_pembelajaran` (lines 97–113):
    ```sql
    CREATE TABLE IF NOT EXISTS public.tujuan_pembelajaran (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
        guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
        nama_guru TEXT NOT NULL,
        mapel_id TEXT,
        nama_mapel TEXT NOT NULL,
        kelas TEXT NOT NULL,
        kode_tp TEXT NOT NULL,
        deskripsi TEXT NOT NULL,
        semester TEXT NOT NULL DEFAULT 'Ganjil',
        tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025',
        urutan INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_tp_guru_mapel_kelas_kode UNIQUE (sekolah_id, nama_guru, nama_mapel, kelas, kode_tp, semester, tahun_ajaran)
    );
    ```
  - `public.asesmen_kolom` (lines 119–129):
    ```sql
    CREATE TABLE IF NOT EXISTS public.asesmen_kolom (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
        tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE,
        kategori TEXT NOT NULL CHECK (kategori IN ('Diagnostik', 'Formatif', 'Sumatif')),
        nama TEXT NOT NULL,
        bobot NUMERIC DEFAULT 1,
        urutan INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    ```
    *Note*: `asesmen_kolom` in `20260917_comprehensive_features.sql` does NOT have column `keterangan`.
  - `public.nilai_siswa` (lines 135–151): contains `tp_id`, `asesmen_id`, `nisn`, `nilai`, etc.
  - `public.pengaturan` in `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql` (lines 124–191):
    Columns: `id`, `sekolah_id`, `key`, `value`, with unique constraint:
    `CONSTRAINT uq_pengaturan_sekolah_key UNIQUE (sekolah_id, key)`

### 1.2 Untracked & Working Directory Draft Migration
- An untracked file exists at `migrations/add_cp_and_gradebook_v2.sql` (lines 1–54):
  - Defines `public.capaian_pembelajaran` with columns: `id`, `sekolah_id`, `guru_mapel_id`, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`, `kode_cp`, `deskripsi`, `urutan`, timestamps.
  - Adds `cp_id uuid REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL` to `public.tujuan_pembelajaran`.
  - Adds `keterangan text` to `public.asesmen_kolom`.
  - Documents storing JSON `bobot_nilai_mapel` in `public.pengaturan`.

### 1.3 TypeScript Definitions in `src/types/database.ts`
- `src/types/database.ts` already has draft additions (git diff shows modified status):
  - Line 82, 94, 106: `keterangan: string | null` added to `asesmen_kolom` Row, Insert, and Update.
  - Lines 1451–1510: `capaian_pembelajaran` table defined with `sekolah_id`, `guru_mapel_id`, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`, `kode_cp`, `deskripsi`, `urutan`, `created_at`, `updated_at`.
  - Lines 1514, 1531, 1548: `cp_id: string | null` added to `tujuan_pembelajaran` Row, Insert, and Update.
  - Lines 2006–2008: `CapaianPembelajaran`, `CapaianPembelajaranInsert`, `CapaianPembelajaranUpdate` exported.
  - *Missing in Relationships*: In `tujuan_pembelajaran.Relationships`, the foreign key `tujuan_pembelajaran_cp_id_fkey` referencing `capaian_pembelajaran` is currently missing.

### 1.4 Admin Bobot Logic & Premature Syntax Error in `src/components/GradebookView.tsx`
- **State & Loading** (`GradebookView.tsx:182-212`):
  - `bobotKehadiran` (default 40), `bobotFormatif` (default 30), `bobotSumatif` (default 30).
  - Loaded via `supabase.from('pengaturan').select('value').eq('sekolah_id', sekolahId).eq('key', 'bobot_nilai_mapel').maybeSingle()`.
- **UI Button for Admin** (`GradebookView.tsx:1645-1654`):
  ```tsx
  {isAdmin && (
    <button
      type="button"
      onClick={() => { setBobotForm({ kehadiran: bobotKehadiran, formatif: bobotFormatif, sumatif: bobotSumatif }); setIsBobotModalOpen(true); }}
      className="btn-click px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ..."
    >
      <i className="fa-solid fa-scale-balanced"></i>
      Bobot: H {bobotKehadiran}% / F {bobotFormatif}% / S {bobotSumatif}%
    </button>
  )}
  ```
- **Save Handler with Validation** (`GradebookView.tsx:667-692`):
  ```ts
  const total = bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif;
  if (total !== 100) {
    showToast('Validasi', `Total bobot harus 100%. Saat ini: ${total}%.`, 'warning'); return;
  }
  ```
- **Syntax Bug Discovered in `GradebookView.tsx`**:
  At lines 3056–3058, the component closing tags `</section>);}` were placed immediately after `{isBobotModalOpen && isAdmin && (...)}`, BEFORE the subsequent modal `{/* Modal Bulk Fill Grades */}`.
  Consequently, TypeScript compilation fails with:
  `src/components/GradebookView.tsx(3144,5): error TS1128: Declaration or statement expected.`
  Deleting lines 3056–3058 instantly fixes the TS syntax error so `Modal Bulk Fill Grades` resides cleanly within the component return statement.

---

## 2. Logic Chain

1. **Hierarchy CP → TP**:
   - *Observation*: `tujuan_pembelajaran` has `id`, `sekolah_id`, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`.
   - *Requirement*: CP is the umbrella above TP. One CP has many TPs.
   - *Inference*: `capaian_pembelajaran` must share the scope (`sekolah_id`, `guru_mapel_id` nullable, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`, `kode_cp`, `deskripsi`, `urutan`).
   - *Inference on Foreign Key*: `tujuan_pembelajaran` must have a foreign key to `capaian_pembelajaran`.
   - *Column Name*: `cp_id` is chosen over `capaian_pembelajaran_id` because:
     1. It directly parallels `tp_id` on `asesmen_kolom` and `nilai_siswa`.
     2. It is already written in `src/types/database.ts` line 1514 and `src/components/GradebookView.tsx` line 1003.
     3. It is shorter and adheres to Ponytail minimalism.
   - *Nullability*: `cp_id` MUST BE NULLABLE (`UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL`). If it were `NOT NULL`, adding the column to an existing database containing TPs would immediately throw a constraint violation on all pre-existing records. Furthermore, `ON DELETE SET NULL` ensures that deleting a CP does not wipe out teacher TP assessments unexpectedly.

2. **Column `keterangan` in `asesmen_kolom`**:
   - *Observation*: `asesmen_kolom` currently has `id`, `sekolah_id`, `tp_id`, `kategori`, `nama`, `bobot`, `urutan`.
   - *Requirement*: Each assessment has a free-text notes field stored in `keterangan` on `asesmen_kolom`.
   - *Inference*: `ALTER TABLE public.asesmen_kolom ADD COLUMN IF NOT EXISTS keterangan TEXT;` is non-destructive, nullable, and 100% backward-compatible.

3. **Diagnostik Max 1 per TP Database Constraint**:
   - *Requirement R2*: "Diagnostik (dibatasi maks. 1 per TP — validasi di UI & DB)".
   - *Inference*: In PostgreSQL, this can be enforced using a partial unique index:
     `CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik ON public.asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik');`
     This strictly guarantees at the database engine level that no TP can ever have more than 1 Diagnostik column, while allowing arbitrary numbers of Formatif and Sumatif columns.

4. **Settings Key `bobot_nilai_mapel` in `pengaturan`**:
   - *Observation*: Table `pengaturan` has unique constraint `uq_pengaturan_sekolah_key UNIQUE (sekolah_id, key)`.
   - *Requirement R4*: Store weights as JSON string `{ kehadiran, formatif, sumatif }` per school.
   - *Inference*: No new schema columns are required in `pengaturan`. The migration should provide an idempotent seed query populating default weights (`{"kehadiran":40,"formatif":30,"sumatif":30}`) for all existing schools:
     ```sql
     INSERT INTO public.pengaturan (sekolah_id, key, value)
     SELECT id, 'bobot_nilai_mapel', '{"kehadiran":40,"formatif":30,"sumatif":30}'
     FROM public.sekolah
     ON CONFLICT (sekolah_id, key) DO NOTHING;
     ```
   - In code, saving is best done via `upsert`:
     ```ts
     await supabase.from('pengaturan').upsert({
       sekolah_id: sekolahId,
       key: 'bobot_nilai_mapel',
       value: JSON.stringify(bobotForm)
     }, { onConflict: 'sekolah_id,key' });
     ```

5. **Admin Settings Placement & Validation**:
   - *Observation*: Gradebook calculations occur in `GradebookView.tsx`.
   - *Evaluation*: Placing the weight settings button in the top action bar of `GradebookView` for `isAdmin` gives administrators immediate visual feedback and control over the exact gradebook they are viewing. It can also be added into `AdminConfigView.tsx` under a "Konfigurasi Bobot Nilai" card.
   - *Validation*: Total must equal 100% (`bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif === 100`). The UI displays real-time green/red badge indicators before submitting.

---

## 3. Caveats

1. **Migration Location Convention**:
   The project has `supabase/migrations/` as its official Supabase migration directory (23 files). The draft file `migrations/add_cp_and_gradebook_v2.sql` was placed in a root `migrations/` folder. For official migration tracking, the canonical migration should be placed in `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`.
2. **Session Authentication & RLS**:
   SIPJAM utilizes custom session authentication (`verify_login` storing `sipjam_user` in `localStorage`), with client queries filtering `sekolah_id`. When Supabase Auth JWT is not active, strict RLS policies requiring `auth.uid()` will block anon client queries. Therefore, RLS policies for `capaian_pembelajaran` must either permit anon reads/writes or use `USING (true)` / tenant helper policies consistent with other recent tables (such as `piket_form_lock` and `guru_mapel`).
3. **Existing CP Data**:
   There is currently no existing data in `capaian_pembelajaran`. Any existing TP records will have `cp_id = NULL`, which is fully supported by the nullable design.

---

## 4. Conclusion

### 4.1 Canonical SQL Migration Design
File path: `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`

```sql
-- ==============================================================================
-- Migration: 20261011_capaian_pembelajaran_and_gradebook_v2.sql
-- Description: CP -> TP Hierarchy, Asesmen Keterangan, DB Diagnostik Limit, Bobot Pengaturan
-- Principle: Ponytail Minimal Schema Diff & Backward Compatibility
-- ==============================================================================

-- 1. Create capaian_pembelajaran table
CREATE TABLE IF NOT EXISTS public.capaian_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    guru_mapel_id UUID REFERENCES public.guru_mapel(id) ON DELETE SET NULL,
    nama_mapel TEXT NOT NULL,
    kelas TEXT NOT NULL,
    semester TEXT NOT NULL DEFAULT 'Ganjil',
    tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025',
    kode_cp TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for CP queries
CREATE INDEX IF NOT EXISTS idx_cp_sekolah_mapel_kelas 
    ON public.capaian_pembelajaran(sekolah_id, nama_mapel, kelas);
CREATE INDEX IF NOT EXISTS idx_cp_guru_mapel_id 
    ON public.capaian_pembelajaran(guru_mapel_id);
CREATE INDEX IF NOT EXISTS idx_cp_semester_tahun 
    ON public.capaian_pembelajaran(sekolah_id, semester, tahun_ajaran);

-- 2. Add cp_id to tujuan_pembelajaran (NULLABLE for full backward-compatibility)
ALTER TABLE public.tujuan_pembelajaran
    ADD COLUMN IF NOT EXISTS cp_id UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tp_cp_id 
    ON public.tujuan_pembelajaran(cp_id);

-- 3. Add keterangan to asesmen_kolom
ALTER TABLE public.asesmen_kolom
    ADD COLUMN IF NOT EXISTS keterangan TEXT;

-- 4. Enforce max 1 Diagnostik assessment per TP at the Database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik 
    ON public.asesmen_kolom(tp_id) 
    WHERE (kategori = 'Diagnostik');

-- 5. Row Level Security for capaian_pembelajaran
ALTER TABLE public.capaian_pembelajaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "capaian_pembelajaran_select_policy" ON public.capaian_pembelajaran;
CREATE POLICY "capaian_pembelajaran_select_policy" ON public.capaian_pembelajaran
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "capaian_pembelajaran_modify_policy" ON public.capaian_pembelajaran;
CREATE POLICY "capaian_pembelajaran_modify_policy" ON public.capaian_pembelajaran
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.capaian_pembelajaran TO anon, authenticated, service_role;

-- 6. Seed default bobot_nilai_mapel for all schools in pengaturan
INSERT INTO public.pengaturan (sekolah_id, key, value)
SELECT id, 'bobot_nilai_mapel', '{"kehadiran":40,"formatif":30,"sumatif":30}'
FROM public.sekolah
ON CONFLICT (sekolah_id, key) DO NOTHING;
```

### 4.2 TypeScript Type Changes in `src/types/database.ts`

1. **Under `Database['public']['Tables']`**:
   ```ts
   capaian_pembelajaran: {
     Row: {
       created_at: string | null
       deskripsi: string
       guru_mapel_id: string | null
       id: string
       kelas: string
       kode_cp: string
       nama_mapel: string
       sekolah_id: string
       semester: string
       tahun_ajaran: string
       updated_at: string | null
       urutan: number
     }
     Insert: {
       created_at?: string | null
       deskripsi: string
       guru_mapel_id?: string | null
       id?: string
       kelas: string
       kode_cp: string
       nama_mapel: string
       sekolah_id?: string
       semester?: string
       tahun_ajaran?: string
       updated_at?: string | null
       urutan?: number
     }
     Update: {
       created_at?: string | null
       deskripsi?: string
       guru_mapel_id?: string | null
       id?: string
       kelas?: string
       kode_cp?: string
       nama_mapel?: string
       sekolah_id?: string
       semester?: string
       tahun_ajaran?: string
       updated_at?: string | null
       urutan?: number
     }
     Relationships: [
       {
         foreignKeyName: "capaian_pembelajaran_guru_mapel_id_fkey"
         columns: ["guru_mapel_id"]
         isOneToOne: false
         referencedRelation: "guru_mapel"
         referencedColumns: ["id"]
       },
       {
         foreignKeyName: "capaian_pembelajaran_sekolah_id_fkey"
         columns: ["sekolah_id"]
         isOneToOne: false
         referencedRelation: "sekolah"
         referencedColumns: ["id"]
       },
     ]
   }
   ```

2. **In `tujuan_pembelajaran`**:
   - `Row`: `cp_id: string | null`
   - `Insert`: `cp_id?: string | null`
   - `Update`: `cp_id?: string | null`
   - `Relationships`:
     ```ts
     {
       foreignKeyName: "tujuan_pembelajaran_cp_id_fkey"
       columns: ["cp_id"]
       isOneToOne: false
       referencedRelation: "capaian_pembelajaran"
       referencedColumns: ["id"]
     }
     ```

3. **In `asesmen_kolom`**:
   - `Row`: `keterangan: string | null`
   - `Insert`: `keterangan?: string | null`
   - `Update`: `keterangan?: string | null`

4. **Convenience Type Aliases & Constants (at bottom of `src/types/database.ts`)**:
   ```ts
   export type CapaianPembelajaran = Tables<"capaian_pembelajaran">;
   export type CapaianPembelajaranInsert = TablesInsert<"capaian_pembelajaran">;
   export type CapaianPembelajaranUpdate = TablesUpdate<"capaian_pembelajaran">;

   export interface BobotNilaiMapel {
     kehadiran: number;
     formatif: number;
     sumatif: number;
   }

   export const DEFAULT_BOBOT_NILAI_MAPEL: BobotNilaiMapel = {
     kehadiran: 40,
     formatif: 30,
     sumatif: 30,
   };
   ```

### 4.3 Actionable Recommendation for the Implementer (Builder)
- Remove the premature closing tags `</section>);}` at lines 3056–3058 in `src/components/GradebookView.tsx`. This immediately resolves the TypeScript compile failure.
- Ensure the save logic for `bobot_nilai_mapel` uses `supabase.from('pengaturan').upsert(..., { onConflict: 'sekolah_id,key' })`.

---

## 5. Verification Method

To independently verify all findings and proposals:

1. **Verify TypeScript Definitions**:
   Inspect `src/types/database.ts` lines 80–110, lines 1451–1579, and lines 2006–2010.
   Command:
   ```bash
   npx tsc --noEmit
   ```
   *(Note: Will pass once premature closing tags at lines 3056–3058 in `GradebookView.tsx` are removed)*.

2. **Verify SQL Migration Syntax**:
   Inspect `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql` (or `migrations/add_cp_and_gradebook_v2.sql`).
   Verify with PostgreSQL query validator or Supabase CLI.

3. **Verify Existing Tests**:
   Command:
   ```bash
   npm test
   ```
   Expected: 100% PASS (Total 11 + 12 + 10 + 12 tests passed).

4. **Verify Weight Validation**:
   - Total must equal 100%: Sum validation formula `kehadiran + formatif + sumatif === 100`.
   - Rejection condition: Any total != 100 yields `'Validasi: Total bobot harus 100%'`.

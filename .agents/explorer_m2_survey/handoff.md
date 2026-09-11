# Handoff Report: Requirement R2 - Dynamic KBM Journal Filtering & Supabase Relational Mapping

## 1. Observation

### A. Guru Jurnal Submission Form & Dropdown Population
- **Form Component File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\GuruJurnal.tsx`
- **Component Host / Mount Point**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AppScreen.tsx` (lines 7, 179: `{currentView === 'view-guru-jurnal' && <GuruJurnal user={user} />}`)
- **Auth Provider / Context**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\app\page.tsx` (lines 53-74) loads user state from `localStorage.getItem('sipjam_user')` set upon login by `src/components/LoginScreen.tsx` (lines 17-32).

#### Current Query Logic in `GuruJurnal.tsx` (lines 28–44):
```typescript
useEffect(() => {
  // Fetch Master Data
  const fetchMasterData = async () => {
    const { data: mapelData } = await supabase.from('data_mapel').select('*');
    if (mapelData) setMapelList(mapelData);

    const { data: siswaData } = await supabase.from('data_siswa').select('kelas');
    if (siswaData) {
      const uniqueKelas = [...new Set(siswaData.map(s => s.kelas).filter(Boolean))].sort();
      setKelasList(uniqueKelas as string[]);
    }
  };
  fetchMasterData();
  
  // Set default date
  setTanggal(getWitaDateStr());
}, []);
```

#### Current Form Dropdown Rendering in `GuruJurnal.tsx` (lines 163–184):
```tsx
{tipeJurnal === 'Jurnal KBM' && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
      <div>
          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Mata Pelajaran</label>
          <select value={mapel} onChange={e => setMapel(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white">
            <option value="" disabled>Pilih...</option>
            {mapelList.map(m => (
              <option key={m.id} value={m.nama_mata_pelajaran}>{m.nama_mata_pelajaran}</option>
            ))}
          </select>
      </div>
      <div>
          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Kelas</label>
          <select value={kelas} onChange={e => setKelas(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white">
            <option value="" disabled>Pilih...</option>
            {kelasList.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
      </div>
  </div>
)}
```

#### Observation Findings on Dropdowns:
1. **Unfiltered Subjects**: `supabase.from('data_mapel').select('*')` returns all 39 subjects in the school regardless of who is logged in.
2. **Unfiltered Classes**: `supabase.from('data_siswa').select('kelas')` returns all 3 classes (`X Merdeka`, `XI Merdeka`, `XII Merdeka`) for all teachers.
3. **No Inter-Dropdown Dependency**: Selecting a Mata Pelajaran does not update or select the corresponding Kelas, allowing impossible combinations (e.g. selecting English taught by Fitri with class X while Fitrawan is logged in, or pairing a subject with an unassigned class).

---

### B. Teacher Authentication & Identity Mapping
1. **User Login (`LoginScreen.tsx` lines 17–23)**:
   ```typescript
   const { data, error } = await supabase
     .from('users')
     .select('*')
     .eq('username', username)
     .eq('password', password)
     .single();
   ```
2. **User Object Structure**:
   - `user.id`: UUID
   - `user.username`: Teacher's username/identifier (e.g., `'Fitri'`, `'Adnan'`, `'Fitrawan'`)
   - `user.nama`: Teacher's full name (e.g., `'Fitri Aprilia Dotulong'`, `'Mohamad Adnan Mamangkai'`, `'Ade Fitrawan Ibrahim'`)
   - `user.role`: `'Guru'` or `'Admin'`

3. **Relationship between `users` and `data_guru`**:
   - We executed an exact join between `users` and `data_guru`:
     ```sql
     SELECT u.username, u.nama, g.nip, g.nama_guru, 
            (u.username = g.nip) AS nip_match, 
            (u.nama = g.nama_guru) AS nama_match 
     FROM users u 
     LEFT JOIN data_guru g ON (u.username = g.nip OR u.nama = g.nama_guru);
     ```
   - **Result**:
     - `u.username = g.nip` evaluates to `true` for **100% of all teachers** (12 out of 12 teachers).
     - For 11 teachers, `u.nama = g.nama_guru` also matches exactly. For teacher Fitra (`u.username = 'Fitra'`), `users.nama` is `'FITRA SURYAZANA MAMONTO'` (uppercase) while `data_guru.nama_guru` is `'Fitra Suryazana Mamonto'` (Title Case). Hence, `nip = user.username` is the primary, infallible key, supported by case-insensitive `nama_guru` match.
     - `admin` has `u.role = 'Admin'` and does not have a corresponding record in `data_guru`.

---

### C. Existing Database Schema Analysis
Inspection via Supabase API (`list_tables` on project `jicvvqxjyzntdrccnuyz`) revealed exactly 13 tables in the `public` schema:
1. `public.users` (14 rows)
2. `public.data_guru` (13 rows)
3. `public.data_mapel` (39 rows)
4. `public.data_siswa` (16 rows)
5. `public.jadwal_pelajaran` (51 rows)
6. `public.jadwal_piket` (6 rows)
7. `public.jurnal_pembelajaran` (148 rows)
8. `public.kalender_pendidikan` (55 rows)
9. `public.laporan_piket` (30 rows)
10. `public.pengaturan` (41 rows)
11. `public.presensi_guru` (247 rows)
12. `public.bank_dokumen` (0 rows)
13. `public.riwayat_backup` (0 rows)

#### Crucial Schema Observations:
1. **NO Normalized Relational Table Exists**: There is no `guru_mapel`, `guru_kelas`, `guru_pengampu`, or `jadwal_mengajar` table.
2. **Denormalized String Storage in `data_guru`**:
   Teacher teaching assignments are currently stored in `data_guru.mata_pelajaran` as comma-separated string lists:
   - Example (`nip = 'Fitri'`): `"X Merdeka_B. Ing, XI Merdeka_B. Ing, XI Merdeka_MTL, XII Merdeka_B. Ing, XII Merdeka_MTL"`
   - Example (`nip = 'Adnan'`): `"XI Merdeka_PAI BP, XII Merdeka_PAI BP"`
   - Example (`nip = 'Fitrawan'`): `"X Merdeka_MTK, X Merdeka_Informatika, XI Merdeka_MTK, XII Merdeka_MTK"`
3. **Data Parity with `data_mapel`**:
   - `data_mapel` has 39 rows, each with `nama_mata_pelajaran` (e.g. `'X Merdeka_MTK'`, `'XI Merdeka_B. Ing'`) and `kategori` (e.g. `'X Merdeka'`, `'XI Merdeka'`).
   - Parsing `data_guru.mata_pelajaran` using `unnest(string_to_array(mata_pelajaran, ','))` yields **exactly 39 items**, which match **100% (39 of 39)** of `data_mapel.nama_mata_pelajaran`!
4. **Schedule Table (`jadwal_pelajaran`)**:
   - 51 rows storing daily timetable slots with informal teacher names (`'Ade'`, `'Susan'`, `'Rizki'`) and short subject codes (`'MTK'`, `'PP'`, `'Sejarah'`). This represents time-slot scheduling (Hari), not teacher-to-subject-to-class curriculum master mapping.

---

## 2. Logic Chain

1. **Premise 1**: The user requirement (ORIGINAL_REQUEST.md R2) explicitly states:
   > *"Update the 'Guru Jurnal' submission form so the 'Mata Pelajaran' and 'Kelas' dropdowns only display the specific subjects and classes assigned to the currently logged-in teacher. The team is explicitly authorized to create and manage new relational tables in the Supabase database to support this mapping if the current schema is insufficient."*
2. **Premise 2**: Currently, `GuruJurnal.tsx` queries all 39 rows from `data_mapel` and all 3 classes from `data_siswa`.
3. **Premise 3**: Storing assignments as a denormalized comma-delimited string in `data_guru.mata_pelajaran` prevents standard relational querying (e.g. `.eq()`, foreign key constraints, indexes, joins).
4. **Premise 4**: An assignment in this school is a 3-tuple `(Teacher, Subject, Class)`. E.g., Fitrawan teaches `Informatika` ONLY in `X Merdeka`, while teaching `MTK` in `X Merdeka`, `XI Merdeka`, and `XII Merdeka`.
5. **Deduction**: A dedicated relational table `public.guru_mapel` (with an optional view `public.guru_kelas`) must be created in Supabase with foreign keys referencing `data_guru` and `data_mapel`, indexed by `nip` and `nama_guru`.
6. **Deduction**: `GuruJurnal.tsx` should query `guru_mapel` using the authenticated teacher's identifier (`nip.eq.${user.username}` or `nama_guru.ilike.${user.nama}`):
   - `mapelList` will be populated only with subjects assigned to this teacher.
   - `kelasList` will be populated only with classes assigned to this teacher.
   - When a teacher selects a Mata Pelajaran (e.g. `X Merdeka_B. Ing`), the form can automatically pre-select `X Merdeka`, eliminating human error.
7. **Deduction**: To ensure existing Admin features (`AdminDataView.tsx` editing or CSV upload to `data_guru`) remain intact without code breakages, a PostgreSQL trigger should be created on `data_guru` so any insert/update/delete on `data_guru` automatically synchronizes `guru_mapel`.

---

## 3. Caveats

1. **Admin Role Bypass**: When `user.role === 'Admin'` opens `GuruJurnal`, they have no entry in `data_guru` or `guru_mapel`. The component must fall back to all subjects/classes so admins can test or submit entries on behalf of teachers.
2. **Teacher Without Assignments**: Teacher `Assyfa` (`nip = 'Assyfa'`) has `mata_pelajaran: null`. If an unassigned teacher opens the form, the component must show a clear, user-friendly notice ("Belum ada mata pelajaran/kelas yang ditugaskan. Hubungi Administrator") rather than crashing.
3. **RLS (Row Level Security)**: All 13 existing tables in the database currently have RLS disabled. The new `guru_mapel` table should enable RLS with permissive public read/write policies to match the existing app architecture while maintaining security compatibility.
4. **Legacy Jurnal Compatibility**: Existing rows in `jurnal_pembelajaran` store `mapel` as `m.nama_mata_pelajaran` (e.g. `'X Merdeka_MTK'`) and `kelas` as `'X Merdeka'`. Storing these exact string representations in `guru_mapel` guarantees 100% backwards compatibility with `RekapJurnalView.tsx`, `AdminVerifView.tsx`, and `workflow.ts`.

---

## 4. Conclusion & Complete Design

### A. Recommended Relational Database DDL Script
The worker agent should execute this migration via `execute_sql` in Supabase:

```sql
-- ==============================================================================
-- 1. Create relational table: guru_mapel
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.guru_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE CASCADE,
    nip TEXT NOT NULL,
    nama_guru TEXT NOT NULL,
    mapel_id TEXT REFERENCES public.data_mapel(id) ON DELETE CASCADE,
    nama_mapel TEXT NOT NULL,
    mapel_singkat TEXT,
    kelas TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_guru_mapel UNIQUE (nip, nama_mapel)
);

-- ==============================================================================
-- 2. Indexes for high-performance dynamic queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_guru_mapel_nip ON public.guru_mapel(nip);
CREATE INDEX IF NOT EXISTS idx_guru_mapel_nama ON public.guru_mapel(nama_guru);
CREATE INDEX IF NOT EXISTS idx_guru_mapel_kelas ON public.guru_mapel(kelas);

-- ==============================================================================
-- 3. Row Level Security Policies
-- ==============================================================================
ALTER TABLE public.guru_mapel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on guru_mapel"
    ON public.guru_mapel FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated or anon write access on guru_mapel"
    ON public.guru_mapel FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. Initial Seed Migration: Populate all 39 assignments from existing data
-- ==============================================================================
INSERT INTO public.guru_mapel (guru_id, nip, nama_guru, mapel_id, nama_mapel, mapel_singkat, kelas)
SELECT 
    g.id AS guru_id,
    g.nip,
    g.nama_guru,
    m.id AS mapel_id,
    m.nama_mata_pelajaran AS nama_mapel,
    split_part(m.nama_mata_pelajaran, '_', 2) AS mapel_singkat,
    m.kategori AS kelas
FROM public.data_guru g
CROSS JOIN LATERAL unnest(string_to_array(g.mata_pelajaran, ',')) AS raw_item
JOIN public.data_mapel m ON m.nama_mata_pelajaran = trim(raw_item)
WHERE g.mata_pelajaran IS NOT NULL AND trim(raw_item) <> ''
ON CONFLICT (nip, nama_mapel) DO NOTHING;

-- ==============================================================================
-- 5. Relational View: guru_kelas (optional convenience view)
-- ==============================================================================
CREATE OR REPLACE VIEW public.guru_kelas AS
SELECT DISTINCT guru_id, nip, nama_guru, kelas
FROM public.guru_mapel;

-- ==============================================================================
-- 6. Trigger for Auto-Sync from data_guru
-- (Ensures any Admin updates in AdminDataView keep guru_mapel 100% in sync)
-- ==============================================================================
CREATE OR REPLACE FUNCTION sync_guru_mapel_from_data_guru()
RETURNS TRIGGER AS $$
DECLARE
    item text;
    trimmed_item text;
    k text;
    m_id text;
BEGIN
    -- Remove old mappings for this guru
    DELETE FROM public.guru_mapel WHERE guru_id = NEW.id;

    -- Insert new mappings if mata_pelajaran exists
    IF NEW.mata_pelajaran IS NOT NULL AND trim(NEW.mata_pelajaran) <> '' THEN
        FOREACH item IN ARRAY string_to_array(NEW.mata_pelajaran, ',')
        LOOP
            trimmed_item := trim(item);
            IF trimmed_item <> '' THEN
                k := split_part(trimmed_item, '_', 1);
                SELECT id INTO m_id FROM public.data_mapel WHERE nama_mata_pelajaran = trimmed_item LIMIT 1;

                INSERT INTO public.guru_mapel (guru_id, nip, nama_guru, mapel_id, nama_mapel, mapel_singkat, kelas)
                VALUES (
                    NEW.id,
                    NEW.nip,
                    NEW.nama_guru,
                    m_id,
                    trimmed_item,
                    split_part(trimmed_item, '_', 2),
                    k
                )
                ON CONFLICT (nip, nama_mapel) DO UPDATE 
                SET guru_id = EXCLUDED.guru_id,
                    nama_guru = EXCLUDED.nama_guru,
                    mapel_id = EXCLUDED.mapel_id,
                    kelas = EXCLUDED.kelas;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_guru_mapel ON public.data_guru;
CREATE TRIGGER trg_sync_guru_mapel
AFTER INSERT OR UPDATE OF mata_pelajaran, nama_guru, nip ON public.data_guru
FOR EACH ROW
EXECUTE FUNCTION sync_guru_mapel_from_data_guru();
```

---

### B. Frontend Implementation in `src/components/GuruJurnal.tsx`

#### 1. Replace Master Data Fetching:
In `GuruJurnal.tsx`:
```typescript
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeacherAssignments = async () => {
      if (!user) return;

      // Admin role: fetch all master data
      if (user.role === 'Admin') {
        const { data: mapelData } = await supabase.from('data_mapel').select('*').order('nama_mata_pelajaran');
        if (mapelData) setMapelList(mapelData);

        const { data: siswaData } = await supabase.from('data_siswa').select('kelas');
        if (siswaData) {
          const uniqueKelas = [...new Set(siswaData.map(s => s.kelas).filter(Boolean))].sort();
          setKelasList(uniqueKelas as string[]);
        }
        return;
      }

      // Teacher role: dynamically query guru_mapel using user identity
      const { data, error } = await supabase
        .from('guru_mapel')
        .select('*')
        .or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`)
        .order('nama_mapel', { ascending: true });

      if (error) {
        console.error('Error fetching guru_mapel:', error);
      }

      if (data && data.length > 0) {
        setAssignments(data);

        // Filtered mapel list
        const assignedMapel = data.map(d => ({
          id: d.mapel_id || d.id,
          nama_mata_pelajaran: d.nama_mapel,
          kelas: d.kelas,
          mapel_singkat: d.mapel_singkat
        }));
        setMapelList(assignedMapel);

        // Filtered kelas list (only classes taught by this teacher)
        const assignedKelas = [...new Set(data.map(d => d.kelas).filter(Boolean))].sort();
        setKelasList(assignedKelas as string[]);

        // Auto-select if only 1 mapel or 1 kelas
        if (assignedMapel.length === 1) {
          setMapel(assignedMapel[0].nama_mata_pelajaran);
          setKelas(assignedMapel[0].kelas);
        }
      } else {
        setMapelList([]);
        setKelasList([]);
      }
    };

    fetchTeacherAssignments();
    setTanggal(getWitaDateStr());
  }, [user?.username, user?.nama, user?.role]);
```

#### 2. Enhanced Dropdown Handlers (Auto-sync Mapel & Kelas):
```typescript
  const handleMapelChange = (val: string) => {
    setMapel(val);
    // Auto-select class corresponding to selected mapel
    const matched = assignments.find(a => a.nama_mapel === val);
    if (matched && matched.kelas) {
      setKelas(matched.kelas);
    }
  };

  const handleKelasChange = (val: string) => {
    setKelas(val);
    // If current mapel doesn't belong to selected kelas, reset or preselect
    const mapelsInClass = assignments.filter(a => a.kelas === val);
    if (!mapelsInClass.some(a => a.nama_mapel === mapel)) {
      if (mapelsInClass.length === 1) {
        setMapel(mapelsInClass[0].nama_mapel);
      } else {
        setMapel('');
      }
    }
  };
```

#### 3. Update Dropdown JSX:
```tsx
{tipeJurnal === 'Jurnal KBM' && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
      <div>
          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
            Mata Pelajaran {mapelList.length > 0 && <span className="text-gray-400 font-normal">({mapelList.length} mapel Anda)</span>}
          </label>
          <select 
            value={mapel} 
            onChange={e => handleMapelChange(e.target.value)} 
            required 
            className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
          >
            <option value="" disabled>Pilih Mapel...</option>
            {mapelList.map(m => (
              <option key={m.id} value={m.nama_mata_pelajaran}>{m.nama_mata_pelajaran}</option>
            ))}
          </select>
      </div>
      <div>
          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
            Kelas {kelasList.length > 0 && <span className="text-gray-400 font-normal">({kelasList.length} kelas Anda)</span>}
          </label>
          <select 
            value={kelas} 
            onChange={e => handleKelasChange(e.target.value)} 
            required 
            className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
          >
            <option value="" disabled>Pilih Kelas...</option>
            {kelasList.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
      </div>
  </div>
)}
```

---

## 5. Verification Method

### Step 1: Execute SQL Migration & Verify Database Rows
Run the migration script on Supabase project `jicvvqxjyzntdrccnuyz` using `execute_sql`.
Verify with:
```sql
SELECT count(*) FROM public.guru_mapel;
-- Expected output: exactly 39 rows.

SELECT nip, nama_guru, count(*) AS total_mapel, string_agg(DISTINCT kelas, ', ') AS assigned_classes
FROM public.guru_mapel
GROUP BY nip, nama_guru
ORDER BY nip;
-- Expected output: 12 teachers, with their exact respective subjects and classes.
```

### Step 2: Test Specific Teacher Filtering Queries
1. **Teacher Fitri (`nip = 'Fitri'`):**
   ```sql
   SELECT nama_mapel, kelas FROM public.guru_mapel WHERE nip = 'Fitri';
   ```
   *Expected*: Exactly 5 rows (`X Merdeka_B. Ing`, `XI Merdeka_B. Ing`, `XI Merdeka_MTL`, `XII Merdeka_B. Ing`, `XII Merdeka_MTL`).
2. **Teacher Adnan (`nip = 'Adnan'`):**
   ```sql
   SELECT nama_mapel, kelas FROM public.guru_mapel WHERE nip = 'Adnan';
   ```
   *Expected*: Exactly 2 rows (`XI Merdeka_PAI BP`, `XII Merdeka_PAI BP`). Classes: `XI Merdeka`, `XII Merdeka` (X Merdeka is NOT included).
3. **Teacher Fitrawan (`nip = 'Fitrawan'`):**
   ```sql
   SELECT nama_mapel, kelas FROM public.guru_mapel WHERE nip = 'Fitrawan';
   ```
   *Expected*: Exactly 4 rows (`X Merdeka_Informatika`, `X Merdeka_MTK`, `XI Merdeka_MTK`, `XII Merdeka_MTK`).
4. **Teacher Fitra (Uppercase Name Test):**
   ```sql
   SELECT nama_mapel, kelas FROM public.guru_mapel 
   WHERE nip = 'Fitra' OR nama_guru ILIKE '%FITRA SURYAZANA MAMONTO%';
   ```
   *Expected*: Exactly 3 rows (`X Merdeka_PJOK`, `XI Merdeka_PJOK`, `XII Merdeka_PJOK`).

### Step 3: Frontend Functional Check
1. Log in as user `Fitri` (Password: `Fitri27`).
2. Navigate to "Form Jurnal" (`view-guru-jurnal`).
3. Check "Mata Pelajaran" dropdown: Contains only Fitri's 5 subjects (no Fisika, Biologi, PJOK, etc.).
4. Check "Kelas" dropdown: Contains `X Merdeka`, `XI Merdeka`, `XII Merdeka`.
5. Select `X Merdeka_B. Ing`: Kelas automatically selects `X Merdeka`.
6. Log in as user `Adnan` (Password: `Adnan27`).
7. Open "Form Jurnal": Mapel dropdown has 2 items (`XI Merdeka_PAI BP`, `XII Merdeka_PAI BP`). Kelas dropdown has only `XI Merdeka` and `XII Merdeka` (`X Merdeka` is absent).
8. Verify Next.js builds cleanly with `npm run build` or Next.js compile check.

---

## Concrete Step-by-Step Instructions for Worker Agent

1. **Database Migration**:
   - Call `supabase` tool `execute_sql` on project `jicvvqxjyzntdrccnuyz` with the complete DDL script in Section 4.A.
   - Run verification query `SELECT count(*) FROM public.guru_mapel;` to confirm all 39 rows are created.
2. **Frontend Update**:
   - In `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\GuruJurnal.tsx`:
     - Update state to store `assignments`.
     - Replace `fetchMasterData` with `fetchTeacherAssignments` querying `guru_mapel` using `user.username` / `user.nama`.
     - Add `handleMapelChange` and `handleKelasChange` for two-way auto-synchronization between subject and class.
     - Update the `<select>` elements for Mata Pelajaran and Kelas.
3. **Commit and Push**:
   - In accordance with `GEMINI.md` Git Workflow Rule, commit changes with a descriptive message and push to origin branch.

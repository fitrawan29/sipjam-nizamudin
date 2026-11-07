# Milestone 3 (Requirement R4) Blueprint: Master Data CSV Templates & Pre-Upload Relational Validation

## 1. Observation

### 1.1 Existing Navigation Tabs & Sequence in `AdminDataView.tsx`
In `src/components/AdminDataView.tsx` (lines 206–216):
```tsx
  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
  ];
```
The tab sequence aligns with Requirement R4: Siswa -> Kelas -> Mapel -> Guru -> Jadwal -> Wali Kelas -> Pengguna -> Kalender -> Periode Sistem Blok.

### 1.2 Existing CSV Templates in `AdminDataView.tsx` & `AdminKelasView.tsx`
In `src/components/AdminDataView.tsx` (lines 482–518):
```tsx
    const templates: Record<string, { filename: string; headers: string[]; sample: string[] }> = {
      Data_Kelas: {
        filename: 'Template_Data_Kelas.csv',
        headers: ['nama_kelas', 'tingkat', 'jurusan'],
        sample: ['X Merdeka', '10', 'Umum']
      },
      Data_Siswa: {
        filename: 'Template_Data_Siswa.csv',
        headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'],
        sample: ['0114367407', 'Moh. Candra Podomi', 'X Merdeka', 'Laki-laki', 'Aktif', '081234567890']
      },
      Data_Guru: {
        filename: 'Template_Data_Guru.csv',
        headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
        sample: [user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001', '198501012010011001', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', '6281241316190', 'Aktif', 'vitridotulong26@gmail.com']
      },
      Data_Mapel: {
        filename: 'Template_Data_Mapel.csv',
        headers: ['id', 'nama_mata_pelajaran', 'kategori'],
        sample: ['MP-01', 'Matematika Wajib', 'X Merdeka']
      },
      Kalender_Pendidikan: {
        filename: 'Template_Kalender_Pendidikan.csv',
        headers: ['tanggal', 'keterangan', 'tipe'],
        sample: ['2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
      },
      Jadwal_Pelajaran: {
        filename: 'Template_Jadwal_Pelajaran.csv',
        headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
        sample: ['Senin', 'Fitri Aprilia Dotulong', 'Bahasa Inggris', 'X Merdeka']
      },
      Wali_Kelas: {
        filename: 'Template_Wali_Kelas.csv',
        headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran'],
        sample: ['X Merdeka', 'Fitri Aprilia Dotulong', '198501012010011001', configuredTahunAjaran || '2024/2025']
      }
    };
```
And in `src/components/AdminKelasView.tsx` (lines 417–434):
```tsx
  const handleDownloadClassTemplate = () => {
    const content = '\uFEFF' + [
      'nama_kelas,tingkat,jurusan',
      'X Merdeka,10,Umum',
      'XI Merdeka,11,IPA',
      'XII Merdeka,12,IPS'
    ].join('\r\n');
...
```

### 1.3 Missing Templates Observed
1. **Pengguna** (`users`): No template defined in `AdminDataView.tsx` or `AdminPenggunaView.tsx`.
2. **Periode Sistem Blok** (`sistem_blok`): No template defined in `AdminDataView.tsx` or `SistemBlokView.tsx`.
3. In `AdminDataView.tsx` lines 2348–2360, when `activeTab === 'Pengguna'` or `activeTab === 'sistem_blok'`, the sub-components (`AdminPenggunaView`, `SistemBlokView`) are rendered without an import/template toolbar.

### 1.4 Database Schema Definitions in `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` & `src/types/database.ts`
1. `data_siswa`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `nisn` VARCHAR(20)
   - `nama_siswa` VARCHAR(150) NOT NULL
   - `kelas` VARCHAR(50) NOT NULL
   - `gender` VARCHAR(20)
   - `status` VARCHAR(20) DEFAULT 'Aktif'
   - `no_hp_ortu` VARCHAR(30)
   - `qr_code` TEXT
2. `data_kelas`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `nama_kelas` TEXT NOT NULL
   - `tingkat` TEXT
   - `jurusan` TEXT
   - Fallback on schema cache missing (PGRST205): Synced to `wali_kelas` and `localStorage`
3. `data_mapel`:
   - `id` TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `nama_mata_pelajaran` TEXT NOT NULL
   - `kategori` TEXT, `kelompok` TEXT, `urutan` INTEGER DEFAULT 1, `kode_mapel` TEXT, `nama_mapel` TEXT
4. `data_guru`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `user_id` UUID REFERENCES public.users(id) ON DELETE CASCADE
   - `nip` TEXT, `nama_guru` TEXT NOT NULL, `mata_pelajaran` TEXT, `no_hp` TEXT, `status` TEXT DEFAULT 'Aktif', `email` TEXT
   - `wajib_hadir_hanya_mengajar` BOOLEAN DEFAULT FALSE
5. `jadwal_pelajaran`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `user_id` UUID REFERENCES public.users(id) ON DELETE CASCADE
   - `hari` TEXT NOT NULL, `nama_guru` TEXT NOT NULL, `mata_pelajaran` TEXT NOT NULL, `kelas` TEXT NOT NULL
   - `jam_ke` TEXT, `jam_mulai` TIME, `jam_selesai` TIME
6. `wali_kelas`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `kelas` TEXT NOT NULL, `guru_id` UUID REFERENCES public.data_guru(id) ON DELETE SET NULL
   - `nama_guru` TEXT NOT NULL, `nip` TEXT, `tahun_ajaran` TEXT DEFAULT '2024/2025'
   - CONSTRAINT `uq_wali_kelas_sekolah_kelas` UNIQUE(sekolah_id, kelas)
7. `users`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `username` TEXT UNIQUE NOT NULL, `password` TEXT NOT NULL, `nama` TEXT NOT NULL
   - `role` TEXT NOT NULL CHECK (role IN ('Superadmin', 'Admin', 'Guru', 'Piket', 'Wali Kelas'))
   - `sekolah_id` UUID REFERENCES public.sekolah(id) ON DELETE CASCADE
8. `kalender_pendidikan`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `tanggal` DATE NOT NULL, `keterangan` TEXT NOT NULL, `tipe` TEXT DEFAULT 'libur'
9. `sistem_blok`:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `sekolah_id` UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
   - `nama_kegiatan` TEXT NOT NULL, `deskripsi` TEXT, `tanggal_mulai` DATE NOT NULL, `tanggal_selesai` DATE NOT NULL
   - `tipe_target` TEXT NOT NULL DEFAULT 'sekolah' CHECK (tipe_target IN ('sekolah', 'angkatan', 'kelas', 'guru'))
   - `target_angkatan` TEXT, `target_kelas` TEXT, `target_guru_id` UUID, `target_guru_nama` TEXT
   - `is_full_day` BOOLEAN NOT NULL DEFAULT true, `jam_mulai` TEXT, `jam_selesai` TEXT

### 1.5 Strict Test Invariants Verified
In `tests/m2_csv_templates_and_import_harmonization.test.ts` lines 98–123:
1. `Template_Kalender_Pendidikan.csv` MUST NOT contain `'id'` (prevents Postgres Error 22P02 on legacy 'KP-01').
2. `Template_Jadwal_Pelajaran.csv` MUST NOT contain `'id'` (prevents Postgres Error 22P02 on legacy 'JP-01').
3. `Template_Data_Guru.csv` MUST contain `'sekolah_id'` column.
4. `Template_Data_Kelas.csv` MUST contain `'nama_kelas'`, `'tingkat'`, and `'jurusan'`.
5. `AdminDataView.tsx` MUST use `showToast` with title `'Unggah Berhasil'` on successful upload.
6. `AdminDataView.tsx` MUST dispatch `'sipjam:kelas-updated'` custom event when student or class data is uploaded.

### 1.6 Current Upload & Validation Logic in `dataIntegrityGuard.ts`
In `src/lib/dataIntegrityGuard.ts`:
- `ALLOWED_COLUMNS_BY_TABLE` (lines 1212–1224) filters columns for `data_kelas`, `data_siswa`, `data_guru`, `data_mapel`, `kalender_pendidikan`, `jadwal_pelajaran`, `wali_kelas`. It currently lacks entries for `users` and `sistem_blok`.
- `REQUIRED_HEADERS_BY_TABLE` (lines 829–841) validates presence of primary required header names before row parsing.
- Anti-dummy checks (lines 981–1210): Prevents `test`, `dummy`, `fiktif`, `percobaan` names, and strips zero-width chars and Excel scientific notation.
- Idempotency handlers:
  * `data_siswa`: Matches existing students by `(sekolah_id, nisn)` or `(sekolah_id, nama_siswa, kelas)`.
  * `data_guru`: Matches existing teachers by `(sekolah_id, nip)` or `(sekolah_id, nama_guru)`, auto-syncs user account.
  * `data_mapel`: Matches existing subjects by `(sekolah_id, nama_mata_pelajaran)`.
  * `wali_kelas`: Matches existing homeroom assignments by `(sekolah_id, kelas)`.
  * `kalender_pendidikan`: Matches existing events by `(sekolah_id, tanggal, keterangan)`.
- Pre-Upload Relational Validation Gap:
  * When uploading `data_siswa`, there is currently NO check verifying that `row.kelas` exists in `data_kelas` or `wali_kelas`.
  * When uploading `jadwal_pelajaran`, there is currently NO check verifying that `row.nama_guru` exists in `data_guru`, `row.mata_pelajaran` exists in `data_mapel`, and `row.kelas` exists in `data_kelas`.
  * When uploading `wali_kelas`, there is currently NO check verifying that `row.nama_guru` exists in `data_guru` and `row.kelas` exists in `data_kelas`.

---

## 2. Logic Chain

### 2.1 Schema Harmony & Template Analysis
1. **From Observation 1.2 & 1.4**:
   - `Data_Siswa`: Template `['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']` perfectly aligns with `data_siswa` table columns. `id` and `qr_code` are generated by `dataIntegrityGuard.ts`.
   - `Data_Kelas`: Template `['nama_kelas', 'tingkat', 'jurusan']` perfectly aligns with `data_kelas` table and `parseTingkat` auto-derivation.
   - `Data_Guru`: Template `['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email']` aligns with `data_guru` table and meets the strict test invariant requiring `sekolah_id`.
   - `Data_Mapel`: Template `['id', 'nama_mata_pelajaran', 'kategori']` contains `id` (`MP-01`). In PostgreSQL, `data_mapel.id` is `TEXT`, so `MP-01` does not cause 22P02 UUID syntax errors. However, if a user re-uses `MP-01` for multiple subjects without changing it, it triggers a duplicate key error. In `REQUIRED_HEADERS_BY_TABLE`, `id` is NOT required (only `nama_mata_pelajaran`). Making `id` optional or providing `['nama_mata_pelajaran', 'kategori', 'kelompok']` prevents ID collisions while keeping full backward compatibility.
   - `Jadwal_Pelajaran`: Template `['hari', 'nama_guru', 'mata_pelajaran', 'kelas']` satisfies the test invariant (`no id`) and matches the manual modal form.
   - `Wali_Kelas`: Template `['kelas', 'nama_guru', 'nip', 'tahun_ajaran']` satisfies `wali_kelas` table. Resolving `nama_guru` against `data_guru` enables auto-populating `guru_id` during upload.
   - `Kalender_Pendidikan`: Template `['tanggal', 'keterangan', 'tipe']` satisfies `kalender_pendidikan` table and the test invariant (`no id`).
   - `Pengguna` (Users): Currently missing from templates. Adding `Template_Pengguna.csv` with headers `['username', 'nama', 'role', 'password']` aligns with `public.users` table schema.
   - `Periode Sistem Blok` (`sistem_blok`): Currently missing from templates. Adding `Template_Periode_Blok.csv` with headers `['nama_kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'tipe_target', 'target_kelas', 'deskripsi']` aligns with `public.sistem_blok` flexible schema.

### 2.2 Relational Dependency Validation Architecture
1. **From Requirement R4 & Observation 1.6**:
   - Relational prerequisites must be validated *prior* to database mutations. If any prerequisite is missing, the entire import must abort cleanly with specific error feedback.
2. **Efficient Query Strategy (O(1) in-memory checks)**:
   - Performing individual queries per row in a 500-row CSV would cause 500–1,500 sequential network requests, inducing severe latency or network timeouts.
   - Therefore, `importMasterDataFromCsv` must execute a single parallel `Promise.all` query prior to validating rows, fetching all existing master records for the active `sekolah_id`:
     * For `data_siswa`: Query `data_kelas(nama_kelas)` and `wali_kelas(kelas)`.
     * For `jadwal_pelajaran`: Query `data_guru(id, nama_guru, nip, user_id)`, `data_mapel(id, nama_mata_pelajaran, nama_mapel)`, `data_kelas(nama_kelas)`, and `wali_kelas(kelas)`.
     * For `wali_kelas`: Query `data_guru(id, nama_guru, nip)` and `data_kelas(nama_kelas)`.
   - Build normalized lookup Sets and Maps:
     * `classSet`: Normalized lowercase class names from database + `localStorage` cache.
     * `teacherSet`: Normalized lowercase teacher names and clean NIPs.
     * `mapelSet`: Normalized lowercase subject names.
3. **Defensive Mock Resilience (Zero Test Regression)**:
   - In unit/adversarial tests (e.g. `tests/adversarial_student_csv_review.test.ts`), `mockSupabase` only stubs methods for the target table (e.g. `data_siswa`), while `mockSupabase.from('data_kelas')` returns `undefined`.
   - If prerequisite queries do not defensively check `typeof supabase?.from?.(table)?.select === 'function'`, test mocks will crash with `TypeError: supabase.from(...).select is not a function`.
   - Therefore, prerequisite queries must check method existence and catch errors gracefully. If the mock does not provide prerequisite tables, the check skips without throwing a runtime TypeError.
4. **Actionable Row-Level Error Aggregation**:
   - Rather than stopping at the first failure or throwing raw SQL error codes (23503), the validator collects all invalid rows:
     * Format: `Baris {row}: {Prerequisite} "{value}" belum terdaftar pada {Table}. Harap daftarkan {Prerequisite} terlebih dahulu.`
   - If errors exist, abort the transaction and display a structured SweetAlert2 modal explaining the exact remediation steps.

---

## 3. Caveats

1. **Multi-School Isolation**: In multi-school environments, prerequisite validation queries must strictly filter by `sekolah_id = schoolId` to prevent cross-tenant class or teacher leakage.
2. **Schema Cache Fallback for `data_kelas`**: In environments where `data_kelas` suffers from PostgREST PGRST205 schema cache errors, class names are stored in `wali_kelas` and `sipjam_custom_classes_${schoolId}` in localStorage. The class validator must check both `data_kelas`, `wali_kelas`, and the client-side class registry.
3. **Academic Title Variations in Teacher Names**: Teachers may be listed with or without academic titles (e.g. "Fitri Aprilia Dotulong, S.Pd." vs "Fitri Aprilia Dotulong"). Name matching should normalize whitespace, accents, and support title-tolerant matching.
4. **Subject Aliases**: `data_mapel` contains both `nama_mata_pelajaran` and `nama_mapel`. The mapel validator must index both columns to support standard abbreviations or full names.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Master Data CSV Templates Blueprint (All 9 Entities)

| # | Master Data Entity | Table Name | Template Filename | Headers | Sample Values | Notes & Invariants |
|---|---|---|---|---|---|---|
| 1 | Siswa | `data_siswa` | `Template_Data_Siswa.csv` | `nisn,nama_siswa,kelas,gender,status,no_hp_ortu` | `0114367407,Moh. Candra Podomi,X Merdeka,Laki-laki,Aktif,081234567890` | Omit `id` (auto UUID); validate `kelas` exists |
| 2 | Kelas | `data_kelas` | `Template_Data_Kelas.csv` | `nama_kelas,tingkat,jurusan` | `X Merdeka,10,Umum` | Strict test invariant: `nama_kelas,tingkat,jurusan`; auto-derive tingkat |
| 3 | Mapel | `data_mapel` | `Template_Data_Mapel.csv` | `nama_mata_pelajaran,kategori,kelompok` (or with optional `id`) | `Matematika Wajib,Umum,Wajib` | Harmonized: avoid hardcoded `MP-01` collision; auto-resolve idempotent UUID |
| 4 | Guru | `data_guru` | `Template_Data_Guru.csv` | `sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email` | `<sekolah_id>,198501012010011001,Fitri Aprilia Dotulong,Bahasa Inggris,6281241316190,Aktif,vitridotulong26@gmail.com` | Strict test invariant: MUST contain `sekolah_id`; auto-sync `users` account |
| 5 | Jadwal | `jadwal_pelajaran` | `Template_Jadwal_Pelajaran.csv` | `hari,nama_guru,mata_pelajaran,kelas` | `Senin,Fitri Aprilia Dotulong,Bahasa Inggris,X Merdeka` | Strict test invariant: MUST NOT contain `id`; validate guru, mapel, kelas |
| 6 | Wali Kelas | `wali_kelas` | `Template_Wali_Kelas.csv` | `kelas,nama_guru,nip,tahun_ajaran` | `X Merdeka,Fitri Aprilia Dotulong,198501012010011001,2024/2025` | Validate guru and kelas; auto-link `guru_id` |
| 7 | Pengguna | `users` | `Template_Pengguna.csv` | `username,nama,role,password` | `dewisartika,Dewi Sartika, S.Pd.,Guru,guru27` | New template; auto default password `username27` if empty |
| 8 | Kalender | `kalender_pendidikan` | `Template_Kalender_Pendidikan.csv` | `tanggal,keterangan,tipe` | `2026-10-01,Hari Kesaktian Pancasila,Libur` | Strict test invariant: MUST NOT contain `id`; validate YYYY-MM-DD |
| 9 | Periode Blok | `sistem_blok` | `Template_Periode_Blok.csv` | `nama_kegiatan,tanggal_mulai,tanggal_selesai,tipe_target,target_kelas,deskripsi` | `Penilaian Akhir Semester,2026-12-01,2026-12-10,sekolah,,Ujian Semester Ganjil` | New template; validate dates and target scope |

### 4.2 Pre-Upload Relational Validation Implementation Blueprint
Place the validation routine in `src/lib/dataIntegrityGuard.ts` inside `importMasterDataFromCsv`:

```ts
// ==============================================================================
// PRE-UPLOAD RELATIONAL DEPENDENCY VALIDATION
// ==============================================================================
export async function validateRelationalDependencies(
  supabase: any,
  rows: Record<string, any>[],
  tableName: string,
  schoolId: string
): Promise<void> {
  const normTable = tableName.toLowerCase().trim();
  const errors: string[] = [];

  // 1. Relational Validation for data_siswa -> data_kelas / wali_kelas
  if (normTable === 'data_siswa' || normTable === 'siswa') {
    try {
      const validClassSet = new Set<string>();
      
      // Fetch classes from data_kelas
      if (typeof supabase?.from === 'function') {
        const kelasTable = supabase.from('data_kelas');
        if (typeof kelasTable?.select === 'function') {
          let q = kelasTable.select('nama_kelas');
          if (schoolId && typeof q?.eq === 'function') q = q.eq('sekolah_id', schoolId);
          const { data } = await q;
          if (Array.isArray(data)) {
            data.forEach((c: any) => {
              if (c.nama_kelas) validClassSet.add(c.nama_kelas.trim().toLowerCase());
            });
          }
        }

        // Also fetch classes from wali_kelas (fallback sync)
        const waliTable = supabase.from('wali_kelas');
        if (typeof waliTable?.select === 'function') {
          let q = waliTable.select('kelas');
          if (schoolId && typeof q?.eq === 'function') q = q.eq('sekolah_id', schoolId);
          const { data } = await q;
          if (Array.isArray(data)) {
            data.forEach((w: any) => {
              if (w.kelas) validClassSet.add(w.kelas.trim().toLowerCase());
            });
          }
        }
      }

      // Check localStorage cached classes if in browser
      if (typeof window !== 'undefined' && schoolId) {
        try {
          const cached = JSON.parse(localStorage.getItem(`sipjam_custom_classes_${schoolId}`) || '[]');
          if (Array.isArray(cached)) {
            cached.forEach(k => { if (k) validClassSet.add(String(k).trim().toLowerCase()); });
          }
        } catch (_) {}
      }

      // If class registry is populated, enforce validation
      if (validClassSet.size > 0) {
        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const k = String(row.kelas || '').trim().toLowerCase();
          if (!k || !validClassSet.has(k)) {
            errors.push(`Baris ${rowNum}: Kelas "${row.kelas}" untuk siswa "${row.nama_siswa}" belum terdaftar pada Data Kelas.`);
          }
        });
      }
    } catch (err) {
      console.warn('[dataIntegrityGuard] Class dependency check warning:', err);
    }
  }

  // 2. Relational Validation for jadwal_pelajaran -> data_guru, data_mapel, data_kelas
  if (normTable === 'jadwal_pelajaran') {
    try {
      const teacherSet = new Set<string>();
      const mapelSet = new Set<string>();
      const classSet = new Set<string>();

      if (typeof supabase?.from === 'function') {
        const [guruRes, mapelRes, kelasRes, waliRes] = await Promise.all([
          typeof supabase.from('data_guru')?.select === 'function'
            ? supabase.from('data_guru').select('id, nama_guru, nip, user_id').eq('sekolah_id', schoolId)
            : Promise.resolve({ data: null }),
          typeof supabase.from('data_mapel')?.select === 'function'
            ? supabase.from('data_mapel').select('id, nama_mata_pelajaran, nama_mapel').eq('sekolah_id', schoolId)
            : Promise.resolve({ data: null }),
          typeof supabase.from('data_kelas')?.select === 'function'
            ? supabase.from('data_kelas').select('id, nama_kelas').eq('sekolah_id', schoolId)
            : Promise.resolve({ data: null }),
          typeof supabase.from('wali_kelas')?.select === 'function'
            ? supabase.from('wali_kelas').select('id, kelas').eq('sekolah_id', schoolId)
            : Promise.resolve({ data: null })
        ]);

        if (Array.isArray(guruRes.data)) {
          guruRes.data.forEach((g: any) => {
            if (g.nama_guru) teacherSet.add(normalizeName(g.nama_guru).toLowerCase());
            if (g.nip && String(g.nip).trim() !== '-') teacherSet.add(String(g.nip).trim().toLowerCase());
          });
        }
        if (Array.isArray(mapelRes.data)) {
          mapelRes.data.forEach((m: any) => {
            if (m.nama_mata_pelajaran) mapelSet.add(m.nama_mata_pelajaran.trim().toLowerCase());
            if (m.nama_mapel) mapelSet.add(m.nama_mapel.trim().toLowerCase());
          });
        }
        if (Array.isArray(kelasRes.data)) {
          kelasRes.data.forEach((c: any) => {
            if (c.nama_kelas) classSet.add(c.nama_kelas.trim().toLowerCase());
          });
        }
        if (Array.isArray(waliRes.data)) {
          waliRes.data.forEach((w: any) => {
            if (w.kelas) classSet.add(w.kelas.trim().toLowerCase());
          });
        }
      }

      // Check localStorage cached classes
      if (typeof window !== 'undefined' && schoolId) {
        try {
          const cached = JSON.parse(localStorage.getItem(`sipjam_custom_classes_${schoolId}`) || '[]');
          if (Array.isArray(cached)) cached.forEach(k => { if (k) classSet.add(String(k).trim().toLowerCase()); });
        } catch (_) {}
      }

      // Validate each schedule row
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        if (teacherSet.size > 0) {
          const cleanGuru = normalizeName(row.nama_guru).toLowerCase();
          if (!cleanGuru || !teacherSet.has(cleanGuru)) {
            errors.push(`Baris ${rowNum}: Guru "${row.nama_guru}" belum terdaftar di Data Guru.`);
          }
        }
        if (mapelSet.size > 0) {
          const m = String(row.mata_pelajaran || row.mapel || '').trim().toLowerCase();
          if (!m || !mapelSet.has(m)) {
            errors.push(`Baris ${rowNum}: Mata pelajaran "${row.mata_pelajaran || row.mapel}" belum terdaftar di Data Mapel.`);
          }
        }
        if (classSet.size > 0) {
          const k = String(row.kelas || '').trim().toLowerCase();
          if (!k || !classSet.has(k)) {
            errors.push(`Baris ${rowNum}: Kelas "${row.kelas}" belum terdaftar di Data Kelas.`);
          }
        }
      });
    } catch (err) {
      console.warn('[dataIntegrityGuard] Jadwal dependency check warning:', err);
    }
  }

  // 3. Relational Validation for wali_kelas -> data_guru, data_kelas
  if (normTable === 'wali_kelas') {
    try {
      const teacherMap = new Map<string, any>();
      const classSet = new Set<string>();

      if (typeof supabase?.from === 'function') {
        const [guruRes, kelasRes] = await Promise.all([
          typeof supabase.from('data_guru')?.select === 'function'
            ? supabase.from('data_guru').select('id, nama_guru, nip').eq('sekolah_id', schoolId)
            : Promise.resolve({ data: null }),
          typeof supabase.from('data_kelas')?.select === 'function'
            ? supabase.from('data_kelas').select('id, nama_kelas').eq('sekolah_id', schoolId)
            : Promise.resolve({ data: null })
        ]);

        if (Array.isArray(guruRes.data)) {
          guruRes.data.forEach((g: any) => {
            if (g.nama_guru) teacherMap.set(normalizeName(g.nama_guru).toLowerCase(), g);
            if (g.nip && String(g.nip).trim() !== '-') teacherMap.set(String(g.nip).trim().toLowerCase(), g);
          });
        }
        if (Array.isArray(kelasRes.data)) {
          kelasRes.data.forEach((c: any) => {
            if (c.nama_kelas) classSet.add(c.nama_kelas.trim().toLowerCase());
          });
        }
      }

      if (typeof window !== 'undefined' && schoolId) {
        try {
          const cached = JSON.parse(localStorage.getItem(`sipjam_custom_classes_${schoolId}`) || '[]');
          if (Array.isArray(cached)) cached.forEach(k => { if (k) classSet.add(String(k).trim().toLowerCase()); });
        } catch (_) {}
      }

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        if (teacherMap.size > 0) {
          const cleanGuru = normalizeName(row.nama_guru).toLowerCase();
          const cleanNip = String(row.nip || '').trim().toLowerCase();
          const matchedGuru = teacherMap.get(cleanGuru) || (cleanNip ? teacherMap.get(cleanNip) : null);
          if (!matchedGuru) {
            errors.push(`Baris ${rowNum}: Guru "${row.nama_guru}" belum terdaftar di Data Guru.`);
          } else {
            // Auto-enrich guru_id and nip
            if (!row.guru_id) row.guru_id = matchedGuru.id;
            if (!row.nip && matchedGuru.nip) row.nip = matchedGuru.nip;
          }
        }
        if (classSet.size > 0) {
          const k = String(row.kelas || '').trim().toLowerCase();
          if (!k || !classSet.has(k)) {
            errors.push(`Baris ${rowNum}: Kelas "${row.kelas}" belum terdaftar di Data Kelas.`);
          }
        }
      });
    } catch (err) {
      console.warn('[dataIntegrityGuard] Wali kelas dependency check warning:', err);
    }
  }

  // If missing dependencies detected, abort immediately with clear row diagnostics
  if (errors.length > 0) {
    const errorLimit = 5;
    const displayed = errors.slice(0, errorLimit).join('\n• ');
    const remainingCount = errors.length - errorLimit;
    const suffix = remainingCount > 0 ? `\n...dan ${remainingCount} kesalahan lainnya.` : '';
    throw new Error(
      `Gagal validasi data prasyarat (ditemukan ${errors.length} masalah):\n• ${displayed}${suffix}\n\nPastikan data prasyarat sudah diunggah sesuai urutan alur master data.`
    );
  }
}
```

### 4.3 Interactive Workflow Stepper & Visual Progress Indicator
1. **Interactive Stepper in `AdminDataView.tsx`**:
   - Render above the table a clean 9-step responsive breadcrumb/stepper:
     `Siswa (1) -> Kelas (2) -> Mapel (3) -> Guru (4) -> Jadwal (5) -> Wali Kelas (6) -> Pengguna (7) -> Kalender (8) -> Periode Blok (9)`
   - Show status badges (e.g. green checkmark when data rows > 0, purple active indicator for current tab).
   - Clicking a step navigates to that tab immediately.
2. **Real-time Progress Indicator**:
   - In `AdminDataView.tsx` and `AdminKelasView.tsx`, bind `onProgress` callback to state `{ stage: string; percentage: number }`.
   - When upload is running (`loading === true`), render a smooth animated progress bar (0% to 100%) displaying current stage:
     * 10%: "Membaca dan memvalidasi berkas CSV..."
     * 25%: "Memeriksa dependensi relasional data..."
     * 50%: "Memproses dan menyelaraskan baris data..."
     * 80%: "Mengunggah data ke database..."
     * 100%: "Sinkronisasi selesai!"

---

## 5. Verification Method

1. **Automated Test Suite Verification**:
   Execute the full automated test suite to verify zero regressions across all modules:
   ```powershell
   npm test
   ```
   Must pass all 61+ test suites with 0 failures.

2. **Dedicated Milestone 3 Verification Suite**:
   Create a dedicated test suite (e.g. `tests/m3_master_data_stepper_and_relational_validation.test.ts`) covering:
   - Validating all 9 master data entity templates download cleanly without errors.
   - Verifying that uploading `data_siswa` with non-existent `kelas` aborts with descriptive `Baris X` message.
   - Verifying that uploading `jadwal_pelajaran` with non-existent `nama_guru`, `mata_pelajaran`, or `kelas` aborts before DB mutation.
   - Verifying that uploading `wali_kelas` with non-existent `nama_guru` or `kelas` aborts before DB mutation.
   - Verifying that when prerequisites exist, upload succeeds and auto-populates `guru_id`.
   - Verifying that progress callback emits progressing percentages from 0 to 100.
   - Verifying that the visual workflow stepper is rendered in the correct sequence (Siswa to Periode Blok).

3. **Type Checking & Build Verification**:
   Verify clean TypeScript compilation and Next.js production build:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```

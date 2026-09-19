# Survey & Architecture Report: R2. Admin - Perangkat Pembelajaran & UI Fixes

**Agent ID**: `explorer_m10_survey_r2`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r2`  
**Timestamp**: 2026-09-19T01:21:00Z  
**Target Milestone**: Milestone 10 - Requirement R2  

---

## Executive Summary

This report delivers a thorough investigation and architectural blueprint for **Requirement R2 (Admin - Perangkat Pembelajaran & UI Fixes)**, divided into two primary subsystems:
1. **Perangkat Pembelajaran**: Transforming the hardcoded 6-document Kurikulum Merdeka system into a dynamic, subject-specific document requirements management system with full Admin CRUD, teacher upload alignment, teacher-by-subject completeness tracking, and a sleek minimalist card UI with click-to-expand details.
2. **Admin Daily Status Matrix**: Diagnosing and providing exact fixes for the severe data mismatch bugs in the Admin Dashboard daily matrix (`HomeView.tsx`), where attendance, teaching journals, picket duty, and schedule tracking currently show false negatives and inaccurate counts due to flawed lexicographical string timestamp queries, bypassing canonical tables (`penugasan_piket`), asymmetric name matching, and unhandled business rules (Dinas Luar, holiday calendar, 5-day school week, and attendance exemptions).

---

## 1. Perangkat Pembelajaran: Deep-Dive Analysis & Architecture

### 1.1 Existing Database Schema Investigation

#### Direct Codebase Observations
1. **`bank_dokumen` Table**:
   - Location: Defined in `src/types/database.ts` (lines 127–175) and modified in migrations:
     - `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql` (lines 133–136, 456, 588)
     - `supabase/migrations/20260912_fix_rls_integrity.sql` (lines 384, 406)
     - `supabase/migrations/20260912_m6_overhaul.sql` (lines 6, 72–75)
   - Current Column Definitions:
     ```typescript
     bank_dokumen: {
       id: string; // UUID primary key
       sekolah_id: string; // UUID references sekolah(id)
       nama_guru: string | null; // Teacher name
       mapel: string | null; // Subject name (added in m6_overhaul)
       kelas: string | null; // Class name (added in m6_overhaul)
       judul: string | null; // Document title / description
       jenis_dokumen: string | null; // Document type label
       link_file: string | null; // Google Drive URL
       status_verifikasi: string | null; // 'Menunggu' | 'Disetujui' | 'Ditolak'
       catatan_admin: string | null; // Admin review notes / rejection reason
       timestamp: string | null; // WITA timestamp string
     }
     ```
2. **Absence of Master / Requirement Tables**:
   - Grep search across `supabase/migrations` and `src/types/database.ts` revealed **no tables** defining document types, permitted format extensions, or subject requirements.
   - All document types are currently hardcoded in client code:
     - `src/components/DokumenView.tsx` (lines 10–17):
       ```typescript
       export const KURIKULUM_DOCS = [
         { id: 'CP', code: 'CP', name: 'Analisis Capaian Pembelajaran', short: 'CP' },
         { id: 'ATP', code: 'ATP', name: 'Alur Tujuan Pembelajaran', short: 'ATP' },
         { id: 'RPE', code: 'RPE', name: 'Rencana Pekan Efektif', short: 'RPE' },
         { id: 'Prota', code: 'Prota', name: 'Program Tahunan', short: 'Prota' },
         { id: 'Promes', code: 'Promes', name: 'Program Semester', short: 'Promes' },
         { id: 'RPM', code: 'RPM', name: 'Rencana Pembelajaran Mendalam', short: 'RPM' }
       ] as const;
       ```
     - `src/types/database.ts` (lines 1599–1606):
       ```typescript
       export type JenisDokumenKurikulum =
         | "Analisis Capaian Pembelajaran (CP)"
         | "Alur Tujuan Pembelajaran (ATP)"
         | "Rencana Pekan Efektif (RPE)"
         | "Program Tahunan (Prota)"
         | "Program Semester (Promes)"
         | "Rencana Pembelajaran Mendalam / Modul Ajar (RPM)"
         | string;
       ```

### 1.2 Current Teacher Upload & Management Workflow

1. **Subject Resolution**:
   - In `DokumenView.tsx` (lines 281–307), the teacher's assigned subjects are dynamically resolved into `myTeacherSubjects` by querying `guru_mapel` matching `user.nama`. If `guru_mapel` is empty, it falls back to `jadwal_pelajaran` or `data_guru.mata_pelajaran`.
2. **Upload Form (`activeTab === 'upload'`)**:
   - The teacher selects:
     - `jenis`: Pulled from the static `KURIKULUM_DOCS` dropdown.
     - `selectedMapel`: Text input with HTML `<datalist>` populated from `availableMapels`.
     - `selectedKelas`: Text input with HTML `<datalist>` from student classes.
     - `judul`: Text input for title.
     - `file`: `<input type="file" accept=".pdf,image/*,.docx,.doc">`.
   - On submit, `uploadToDrive(file, user.nama, 'Perangkat_Pembelajaran', 'Dokumen')` sends the file to Google Apps Script (GAS) webhook and returns the Google Drive view URL.
   - Record is inserted into `bank_dokumen` with `status_verifikasi = 'Menunggu'`.
3. **Teacher View (`activeTab === 'list'`)**:
   - Groups cards by subject (`myTeacherSubjects.map(...)`).
   - For each subject, checks the 6 hardcoded `KURIKULUM_DOCS` using `matchDocToTypeForSubject(...)`.
   - Displays 6 status chips ("Sudah Diunggah" vs "Belum Diunggah") with an individual progress badge `(completed / 6) * 100%`.

### 1.3 Proposed Schema Additions for Admin CRUD

To allow Admins to configure document types and formats per subject (or global defaults across all subjects), we design a relational table in Supabase.

#### New Table: `public.syarat_perangkat_pembelajaran`
```sql
-- Migration: Create syarat_perangkat_pembelajaran
CREATE TABLE IF NOT EXISTS public.syarat_perangkat_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    nama_mapel TEXT NOT NULL, -- Subject name, e.g., 'Matematika', 'PJOK', or 'Semua Mapel'
    kode_dokumen TEXT NOT NULL, -- Short code, e.g., 'CP', 'ATP', 'MA', 'PROTA', 'PROMES'
    nama_dokumen TEXT NOT NULL, -- Full name, e.g., 'Modul Ajar / RPM', 'Alur Tujuan Pembelajaran'
    format_dokumen TEXT NOT NULL DEFAULT 'PDF, DOCX', -- Allowed formats, e.g., 'PDF, DOCX, XLSX'
    deskripsi TEXT, -- Guidance notes / instructions for teachers
    wajib BOOLEAN NOT NULL DEFAULT true, -- Whether required for 100% completion
    urutan INTEGER NOT NULL DEFAULT 0, -- Display order
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_syarat_perangkat_sekolah_mapel 
    ON public.syarat_perangkat_pembelajaran(sekolah_id, nama_mapel);

-- Row Level Security (RLS)
ALTER TABLE public.syarat_perangkat_pembelajaran ENABLE ROW LEVEL SECURITY;

-- Multi-tenant policies via existing setup_tenant_table_policies
CALL public.setup_tenant_table_policies('syarat_perangkat_pembelajaran');
ALTER TABLE public.syarat_perangkat_pembelajaran 
    ALTER COLUMN sekolah_id SET DEFAULT public.get_auth_user_sekolah_id();
```

#### Modifications to `public.bank_dokumen`
```sql
-- Link bank_dokumen directly to syarat_perangkat_pembelajaran (optional FK for strict referential integrity)
ALTER TABLE public.bank_dokumen 
    ADD COLUMN IF NOT EXISTS syarat_id UUID REFERENCES public.syarat_perangkat_pembelajaran(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_dokumen_syarat_id ON public.bank_dokumen(syarat_id);
```

#### Seed Migration Data
To maintain zero breakage with existing data, seed standard Kurikulum Merdeka documents under `'Semua Mapel'` for existing schools:
```sql
INSERT INTO public.syarat_perangkat_pembelajaran (sekolah_id, nama_mapel, kode_dokumen, nama_dokumen, format_dokumen, urutan)
SELECT s.id, 'Semua Mapel', item.kode, item.nama, 'PDF, DOCX', item.urutan
FROM public.sekolah s
CROSS JOIN (
  VALUES 
    ('CP', 'Analisis Capaian Pembelajaran (CP)', 1),
    ('ATP', 'Alur Tujuan Pembelajaran (ATP)', 2),
    ('RPE', 'Rencana Pekan Efektif (RPE)', 3),
    ('Prota', 'Program Tahunan (Prota)', 4),
    ('Promes', 'Program Semester (Promes)', 5),
    ('RPM', 'Rencana Pembelajaran Mendalam / Modul Ajar (RPM)', 6)
) AS item(kode, nama, urutan)
ON CONFLICT DO NOTHING;
```

### 1.4 Admin CRUD UI Components Design

Within `src/components/DokumenView.tsx`:

1. **Tab Structure**:
   - `Matriks Guru` (`activeTab === 'matrix'`): Viewing document progress per teacher per subject.
   - `Kelola Syarat Dokumen` (`activeTab === 'syarat'`): **New Tab for Admins**.
   - `Dokumen Saya` (`activeTab === 'list'`): For teachers.
   - `Upload Baru` (`activeTab === 'upload'`): For teachers.

2. **Admin CRUD View (`activeTab === 'syarat'`)**:
   - **Header & Filter Toolbar**:
     - Subject Filter Dropdown: Loaded from `data_mapel` plus an option for `"Semua Mapel (Standar Global)"`.
     - Search Input: Filter by document code or name.
     - Button: `+ Tambah Dokumen Wajib` (opens SweetAlert2 modal or clean dialog form).
   - **Requirements Table / Card Grid**:
     - Columns:
       1. `No` & `Urutan`
       2. `Mata Pelajaran` (Badge: specific mapel vs "Semua Mapel")
       3. `Kode` (e.g., `ATP`, `MA`, `KISI`)
       4. `Nama Dokumen` & `Deskripsi`
       5. `Format File` (Badges: `.pdf`, `.docx`, etc.)
       6. `Status Wajib` (Pill: Wajib vs Opsional)
       7. `Aksi` (Edit button, Delete button)
   - **Modal Form Fields**:
     - `Mata Pelajaran`: Dropdown select (`Semua Mapel` or specific subject from `data_mapel`).
     - `Kode Dokumen`: Text input (uppercase, e.g., `MODUL`, `ATP`).
     - `Nama Dokumen`: Text input (e.g., `Modul Ajar Bab 1-5`).
     - `Format Diizinkan`: Checkbox group or multi-select (`PDF`, `Word (.docx)`, `Excel (.xlsx)`, `Link Drive`).
     - `Wajib Diunggah`: Switch toggle (`true` / `false`).
     - `Deskripsi / Petunjuk`: Textarea for admin instructions to teachers.

### 1.5 Admin Tracking: Viewing Documents Per Teacher Per Subject

Currently, the admin matrix only checks documents globally per teacher, completely missing whether the teacher uploaded documents for *Subject A* vs *Subject B*.

#### Target Aggregation Logic
1. Fetch all `data_guru`.
2. Fetch all `guru_mapel` (mapping each teacher to their assigned subjects & classes).
3. Fetch all `syarat_perangkat_pembelajaran`.
4. Fetch all `bank_dokumen`.
5. Group by `(Teacher, Subject)`:
   - For each teacher and each subject they teach:
     - Determine the applicable requirements:
       - Match `syarat_perangkat_pembelajaran` where `nama_mapel === subject.nama_mapel`.
       - If no subject-specific requirements exist, fallback to requirements where `nama_mapel === 'Semua Mapel'`.
     - Let $R$ be the list of required documents for this subject ($N_{\text{req}} = |R|$).
     - Find matching documents uploaded by this teacher for this specific subject in `bank_dokumen`:
       - Match by `syarat_id` OR fuzzy match by `jenis_dokumen` and `mapel`.
     - Count uploaded documents: $N_{\text{up}}$.
     - Completion percentage:
       $$\text{Progress} = N_{\text{req}} > 0 ? \text{round}\left(\frac{N_{\text{up}}}{N_{\text{req}}} \times 100\right) : 100\%$$
     - Determine verification status: Has pending verifications? Any rejected? All approved?

### 1.6 Design of Minimalist Cards with Expand-on-Click

#### Visual Structure (Tailwind CSS - Mobile-First & Dark/Light Compliant)
The minimalist card avoids visual clutter while delivering instant situational awareness:

```tsx
<div 
  onClick={() => setExpandedCardId(isExpanded ? null : cardId)}
  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer card-interactive"
>
  {/* Header: Teacher Name, Subject Badge, & Progress Pill */}
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/40">
        {teacher.nama_guru.charAt(0)}
      </div>
      <div className="min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
          {teacher.nama_guru}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md truncate">
            {subject.nama_mapel} {subject.kelas ? `• Kelas ${subject.kelas}` : ''}
          </span>
        </div>
      </div>
    </div>

    {/* Status Badge & Percentage */}
    <div className="text-right shrink-0">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block ${
        isComplete
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
          : hasPending
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      }`}>
        {completedCount}/{totalRequired} ({completionRate}%)
      </span>
    </div>
  </div>

  {/* Slim Minimalist Progress Bar */}
  <div className="mt-3">
    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-300 ${
          isComplete ? 'bg-emerald-500' : completionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
        }`}
        style={{ width: `${completionRate}%` }}
      />
    </div>
  </div>

  {/* Click prompt indicator */}
  <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
    <span>{isExpanded ? 'Klik untuk menutup' : 'Klik untuk rincian dokumen'}</span>
    <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-600 dark:text-amber-400' : ''}`}></i>
  </div>

  {/* Expandable Accordion Drawer */}
  {isExpanded && (
    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/80 space-y-2.5 animate-fadeIn">
      {requiredDocs.map(req => {
        const uploadedDoc = matchUploaded(req);
        return (
          <div key={req.id} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{req.kode_dokumen}</span>
                <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate">{req.nama_dokumen}</span>
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">Format: {req.format_dokumen}</div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {uploadedDoc ? (
                <>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    uploadedDoc.status_verifikasi === 'Disetujui' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : uploadedDoc.status_verifikasi === 'Ditolak'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {uploadedDoc.status_verifikasi || 'Menunggu'}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPreviewDoc(uploadedDoc); }}
                    className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center text-xs"
                    title="Buka / Verifikasi"
                  >
                    <i className="fa-solid fa-eye"></i>
                  </button>
                </>
              ) : (
                <span className="text-[9px] font-semibold text-gray-400 bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded">
                  Belum Diunggah
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
```

---

## 2. Admin Daily Status Matrix: Diagnosis & Required Fixes

### 2.1 Implementation Location in the Codebase

- Primary Component: `src/components/HomeView.tsx`
  - Fetching & Transformation function: `loadAdminMatrix` (lines 235–432)
  - Data structures: `matrixList`, `filteredMatrix`, `adminKPIs` (lines 434–463)
  - KPI Dashboard Cards: lines 1350–1406
  - Table Rendering: lines 1408–1600
- Supporting Logic: `src/lib/workflow.ts` (`getGuruDailyState`, `findJadwalForGuru`, `isGuruDiPiket`, `isJurnalMatchJadwal`) and `src/lib/wita.ts`.

---

### 2.2 Root Causes of Inaccurate / Incorrect Matrix Data

A forensic inspection of `loadAdminMatrix` in `HomeView.tsx` revealed **six critical discrepancies** that cause the matrix to display inaccurate or completely false data:

#### Discrepancy 1: Broken Timestamp Range Query on Postgres TEXT Column
In `HomeView.tsx` lines 238–252:
```typescript
const startOfDay = getWitaStartOfDay(); // e.g. "2026-09-18T16:00:00.000Z" (UTC string)
const endOfDay = getWitaEndOfDay();     // e.g. "2026-09-19T15:59:59.999Z" (UTC string)

supabase.from('presensi_guru').select('*').gte('timestamp', startOfDay).lte('timestamp', endOfDay)
```
- In `presensi_guru`, `timestamp` is a Postgres `TEXT` (or `VARCHAR`) column, NOT `TIMESTAMPTZ`.
- In `GuruPresensi.tsx` (line 243), the app writes `getWitaTimestamp()`: `"2026-09-19T07:15:00+08:00"`.
- In legacy seed data, timestamps were stored as `"2026-09-19 07:15:00"` (space separator) or `"9/19/2026 07:15:00"`.
- When PostgreSQL performs `.gte()` and `.lte()` on text columns, it uses lexicographical ASCII order:
  - For `"2026-09-19 07:15:00"` vs `"2026-09-18T16:00:00.000Z"`: At index 10, space `' '` (ASCII 32) is compared to `'T'` (ASCII 84). Because `32 < 84`, `"2026-09-19 "` evaluates as **LESS THAN** `"2026-09-18T"`.
  - Result: **All attendance rows formatted with space separators are completely dropped from the query result!**
  - Notice that in `src/lib/workflow.ts` (lines 272–298), the developer previously noted this exact issue:
    `// Ambil SEMUA presensi guru ini (tanpa filter timestamp range yang bisa gagal karena format campuran) Lalu filter manual berdasarkan tanggal`
    However, `HomeView.tsx` was never updated with this fix!

#### Discrepancy 2: Missing Multi-Tenant (`sekolah_id`) Query Filtering
In `HomeView.tsx` lines 251–257:
```typescript
const [teachersRes, presensiRes, jurnalRes, jadwalRes, piketScheduleRes, piketLaporanRes] = await Promise.all([
  supabase.from('data_guru').select('*').order('nama_guru', { ascending: true }),
  supabase.from('presensi_guru').select('*').gte('timestamp', startOfDay).lte('timestamp', endOfDay),
  supabase.from('jurnal_pembelajaran').select('*').eq('tanggal', todayStr),
  supabase.from('jadwal_pelajaran').select('*').eq('hari', dayName),
  supabase.from('jadwal_piket').select('*').eq('hari', dayName),
  supabase.from('laporan_piket').select('*').eq('tanggal', todayStr),
]);
```
- None of these queries filter by `user.sekolah_id`.
- If an admin is logged in or RLS default falls back, records from other schools or unbound rows are mixed in.
- In particular, `piketSchedule = (piketScheduleRes.data && piketScheduleRes.data[0]) || null`. If another school has a row in `jadwal_piket` for that day, `data[0]` takes the first random school's schedule, leaving the current school with zero picket teachers!

#### Discrepancy 3: Bypassing `penugasan_piket` (The Real Picket Table)
- In Milestone 6, `penugasan_piket` was created as the master table for assigning picket teachers.
- In `PiketView.tsx`, the admin assigns picket staff in `penugasan_piket`.
- But `HomeView.tsx` only queries `jadwal_piket`:
  ```typescript
  const isPiket = piketSchedule ? isGuruDiPiket(piketSchedule.daftar_guru, nama) : false;
  ```
  If `jadwal_piket` was not synced, or if teachers were assigned in `penugasan_piket`, `isPiket` returns `false` for every single teacher.
  Furthermore, `piketReports` matching:
  ```typescript
  const hasReport = piketReports.some((lp: any) => 
    lp.guru_pelapor === nama || (lp.guru_pelapor && nama.includes(lp.guru_pelapor))
  );
  ```
  uses raw case-sensitive comparisons and does not trim whitespace or match against NIP/username.

#### Discrepancy 4: Asymmetric and Brittle Name Matching
- In Presensi:
  `const pDatang = presensiList.find((p: any) => p.nama_guru === nama && p.tipe_absen === 'Datang');`
  Strict equality `p.nama_guru === nama` fails if a teacher's name in `data_guru` has an academic title (e.g., `Dra. Nurhayati, M.Pd`) while the presensi entry stored `Nurhayati`, or vice versa.
- In Jurnal:
  `const teacherJournals = jurnalList.filter((j: any) => j.nama_guru === nama || (j.nama_guru && nama.includes(j.nama_guru)));`
  If `j.nama_guru` is `"Ade Fitrawan Ibrahim"` and `nama` in `data_guru` is `"Ade"`, then `nama.includes(j.nama_guru)` evaluates to `false` (`"Ade".includes("Ade Fitrawan Ibrahim")` is false). Thus, their filled journals are ignored, and `filledCount` stays `0`.

#### Discrepancy 5: Dinas Luar & Jurnal Kegiatan False Failures
- In `HomeView.tsx` lines 386–394:
  `const isIzinSakit = presensiDatangStatus === 'Izin' || presensiDatangStatus === 'Sakit';`
  `const jurnalDone = targetCount === 0 || filledCount >= targetCount || isIzinSakit;`
- When a teacher checks in with status `Dinas Luar`:
  - `isIzinSakit` is `false`.
  - The teacher does not conduct regular in-class KBM (`targetClasses`).
  - As a result, `jurnalDone` is marked `false`, `jurnalStatus` is marked `"Belum Mengisi"`, and `isTugasLengkap` is marked `false`!
  - In reality, a teacher on Dinas Luar submits a `Jurnal Kegiatan`, not KBM classes.

#### Discrepancy 6: Absence of Calendar Holiday, Weekend & Attendance Policy Checks
- `workflow.ts` checks:
  1. `kalender_pendidikan` (`tipe === 'Libur'`)
  2. Sunday / 5-day school week Saturday
  3. `wajib_hadir_hanya_mengajar` in `data_guru`
- `HomeView.tsx` has **none** of these checks. On a Saturday in a 5-day school or on an official national holiday, every teacher is shown as `"Belum Datang"`, `"Belum Pulang"`, and `isTugasLengkap = false`.
- Any teacher flagged as `wajib_hadir_hanya_mengajar = true` on a day they do not teach is incorrectly penalized as `"Belum Datang"`.

---

### 2.3 Exact Query and Aggregation Fixes Needed

#### Fix A: Resilient Multi-Format Presensi Query & Date Matcher
Instead of lexicographical range filtering on a TEXT column, query `presensi_guru` by tenant and filter using a robust multi-format date parser:

```typescript
// Query presensi for the school
let presensiQuery = supabase.from('presensi_guru').select('*');
if (user?.sekolah_id) presensiQuery = presensiQuery.eq('sekolah_id', user.sekolah_id);
const { data: rawPresensi } = await presensiQuery.order('timestamp', { ascending: false }).limit(200);

// Robust date matcher supporting:
// 1. "YYYY-MM-DD..." (ISO / WITA timestamp)
// 2. "YYYY-MM-DD HH:mm:ss"
// 3. "M/D/YYYY HH:mm:ss"
const presensiList = (rawPresensi || []).filter((p: any) => {
  const ts = (p.timestamp || '').trim();
  if (!ts) return false;
  if (ts.startsWith(todayStr)) return true;
  if (ts.includes('T') && ts.substring(0, 10) === todayStr) return true;
  const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    if (`${year}-${month}-${day}` === todayStr) return true;
  }
  return false;
});
```

#### Fix B: Multi-Tenant & Direct `penugasan_piket` Query
Query `penugasan_piket` directly to get the authoritative list of picket teachers:

```typescript
let piketPenugasanQuery = supabase
  .from('penugasan_piket')
  .select('*')
  .eq('hari', dayName)
  .eq('tipe_petugas', 'Guru');
if (user?.sekolah_id) piketPenugasanQuery = piketPenugasanQuery.eq('sekolah_id', user.sekolah_id);

const { data: assignedPiketTeachers } = await piketPenugasanQuery;
const assignedPiketNames = new Set((assignedPiketTeachers || []).map((p: any) => (p.guru_nama || '').toLowerCase().trim()));
const assignedPiketNips = new Set((assignedPiketTeachers || []).map((p: any) => (p.guru_nip || '').trim()).filter(Boolean));
```

#### Fix C: Bidirectional Normalized Name Matching
Create a helper function to safely match teacher names across all tables:

```typescript
function isTeacherMatch(recordName?: string, recordNip?: string, targetName?: string, targetNip?: string): boolean {
  if (recordNip && targetNip && recordNip === targetNip) return true;
  if (!recordName || !targetName) return false;
  
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const c1 = clean(recordName);
  const c2 = clean(targetName);
  
  if (c1 === c2) return true;
  if (c1.includes(c2) || c2.includes(c1)) return true;
  
  const t1 = c1.split(/\s+/).filter(w => w.length > 2);
  const t2 = c2.split(/\s+/).filter(w => w.length > 2);
  if (t1.length > 0 && t2.length > 0 && t1[0] === t2[0]) return true; // Match primary first name
  
  return false;
}
```

#### Fix D: Calendar Holiday & Attendance Exemption Handling
Incorporate school calendar and exemption logic:

```typescript
// Check holiday in kalender_pendidikan
let calQuery = supabase.from('kalender_pendidikan').select('*').eq('tanggal', todayStr);
if (user?.sekolah_id) calQuery = calQuery.eq('sekolah_id', user.sekolah_id);
const { data: calData } = await calQuery;
const isLiburKalender = Boolean(calData?.some((c: any) => c.tipe === 'Libur'));

// Check 5-day school week
let pengQuery = supabase.from('pengaturan').select('key, value');
if (user?.sekolah_id) pengQuery = pengQuery.eq('sekolah_id', user.sekolah_id);
const { data: pengData } = await pengQuery;
const hariSekolah = parseInt(pengData?.find((p: any) => p.key === 'hari_sekolah')?.value || '6', 10);
const isWeekendOff = dayName === 'Minggu' || (hariSekolah === 5 && dayName === 'Sabtu');
const isDayOff = isLiburKalender || isWeekendOff;

// Per-teacher exemption
const isExemptNonTeaching = teacher.wajib_hadir_hanya_mengajar && targetCount === 0;
```

#### Fix E: Dinas Luar & Jurnal Kegiatan Status Resolution
```typescript
const isDinasLuar = presensiDatangStatus === 'Dinas Luar';
const hasJurnalKegiatan = jurnalList.some((j: any) => 
  isTeacherMatch(j.nama_guru, undefined, nama, nip) && j.keterangan === 'Jurnal Kegiatan'
);

if (isDinasLuar) {
  jurnalStatus = hasJurnalKegiatan ? 'Jurnal Kegiatan Selesai' : 'Perlu Jurnal Kegiatan';
  jurnalColor = hasJurnalKegiatan ? 'green' : 'amber';
}
const jurnalDone = isDinasLuar 
  ? hasJurnalKegiatan 
  : (targetCount === 0 || filledCount >= targetCount || isIzinSakit);
```

#### Fix F: Accurate KPI Metric Calculations
```typescript
const adminKPIs = useMemo(() => {
  const totalGuru = matrixList.length;
  // Teachers who physically checked in (Hadir, Terlambat, or Dinas Luar)
  const sudahDatang = matrixList.filter(r => 
    r.presensiDatang.status.startsWith('Hadir') || 
    r.presensiDatang.status.startsWith('Terlambat') || 
    r.presensiDatang.status === 'Dinas Luar'
  ).length;

  // Jurnal complete (either completed target KBM or submitted required Jurnal Kegiatan)
  const jurnalLengkap = matrixList.filter(r => 
    r.pengisianJurnal.color === 'green' || r.pengisianJurnal.status === 'Bebas KBM'
  ).length;

  const totalPiket = matrixList.filter(r => r.laporanPiket.isPiket).length;
  const piketSelesai = matrixList.filter(r => r.laporanPiket.isPiket && r.laporanPiket.status === 'Sudah Lapor').length;
  const sudahPulang = matrixList.filter(r => r.presensiPulang.status.startsWith('Pulang')).length;

  return { totalGuru, sudahDatang, jurnalLengkap, totalPiket, piketSelesai, sudahPulang };
}, [matrixList]);
```

---

## 3. Implementation Roadmap & Verification Plan

### 3.1 Sequence of Changes

| Order | Subsystem | Action | Files Modified |
|---|---|---|---|
| 1 | Database | Create SQL migration for `syarat_perangkat_pembelajaran` table, RLS policies, and seed data. Update `src/types/database.ts`. | `supabase/migrations/20260919_syarat_perangkat.sql`, `src/types/database.ts` |
| 2 | Perangkat Pembelajaran UI | In `DokumenView.tsx`: Add Admin CRUD tab (`Kelola Syarat Dokumen`), connect to `syarat_perangkat_pembelajaran`, implement create/edit/delete modals. | `src/components/DokumenView.tsx` |
| 3 | Perangkat Tracking UI | In `DokumenView.tsx`: Replace global teacher matrix with teacher-by-subject minimalist card grid with click-to-expand document details and completion rates. | `src/components/DokumenView.tsx` |
| 4 | Admin Dashboard Matrix | In `HomeView.tsx`: Fix `loadAdminMatrix` with resilient multi-format presensi query, multi-tenant `sekolah_id` filtering, direct `penugasan_piket` integration, bidirectional normalized name matching, and Dinas Luar/holiday support. | `src/components/HomeView.tsx` |
| 5 | Automated Verification | Add automated Jest/ts-node test verifying CRUD operations, matrix calculations, and status consistency. | `tests/m10_r2_perangkat_and_matrix.test.ts` |

### 3.2 Verification Command
Run TypeScript verification and testing:
```bash
npx tsc --noEmit
npx ts-node tests/m10_r2_perangkat_and_matrix.test.ts
```

---

## 4. Conclusion
The survey reveals clear, solvable architectural paths for both R2 requirements. Implementing the dynamic `syarat_perangkat_pembelajaran` table modernizes the hardcoded curriculum system into an administrative tool supporting subject-specific requirements and minimalist inspection cards. Simultaneously, resolving the lexicographical string query bugs, tenant isolation gaps, and missing table lookups (`penugasan_piket`) in `HomeView.tsx` restores 100% accuracy to the teacher daily status matrix.

# Handoff Report: R2 Fitur Jurnal Khusus BK (Tidak Terikat Kelas)

**Agent**: `explorer_bk_2`  
**Milestone**: BK Integration — R2 Jurnal Khusus BK Survey  
**Date**: 2026-11-09T05:35:00Z  
**Status**: Completed (Hard Handoff)

---

## 1. Observation

### 1.1 Existing Teaching Journal Architecture (`GuruJurnal.tsx` & `RekapJurnalView.tsx`)
1. **Coupling to Timetables & Assigned Subjects**:
   - In `src/components/GuruJurnal.tsx` (lines 335–488), `fetchMasterData` connects the user to four interrelated tables: `guru_mapel`, `jadwal_pelajaran`, `data_mapel`, and `data_guru`.
   - Line 451 invokes `connectGuruMapelWithJadwal(...)`, which filters the teacher's accessible subjects and classes strictly against the day's timetable via `filterGuruMapelByHari(connectedAll, activeHari)` (lines 463–471, lines 622–640).
   - Lines 643–679 auto-populate `mapel` and `kelas` directly from `dailyState.jadwalKBM`.
2. **Coupling to Full Classroom Attendance Rosters**:
   - In `src/components/GuruJurnal.tsx` (lines 738–851), selecting a class triggers `fetchStudents`, which queries `data_siswa` strictly where `.eq('kelas', kelas)`.
   - Every student in that classroom is assigned an attendance status (`absensi`, defaulting to 'H' for Hadir).
   - In `handleJurnalSubmit` (lines 1107–1150), marking any student as absent in `jurnal_pembelajaran` cross-references gate attendance (`presensi_siswa`) and morning class attendance (`absensi`). If a student was present at the gate/morning but marked 'A' (Alfa) in the subject, the system triggers an automatic status change to `'Bolos'` in `public.absensi`.
3. **Coupling to Teacher Daily State & Checkout Gate**:
   - In `src/lib/workflow.ts` (lines 1380–1417), `getGuruDailyState` gates teacher checkout (`canPresensiPulang`). Every unblocked schedule in `jadwalKBM` MUST match a journal entry in `jurnal_pembelajaran` via `isJurnalMatchJadwal`.
4. **Supervision & Confidentiality Issues in `RekapJurnalView.tsx`**:
   - In `src/components/RekapJurnalView.tsx` (lines 201–241), journals are retrieved from `jurnal_pembelajaran`.
   - Lines 57–67 and lines 183–198 allow any teacher assigned as `Wali Kelas` to access `supervisi-kelas` mode, displaying all teaching journals for that class across all teachers.
   - If counseling notes were inserted into `jurnal_pembelajaran`, sensitive psychological, behavioral, and personal family notes would be visible to Wali Kelas and mapel teachers.

### 1.2 Database Schema & Storage Examination
1. **Existing Tables**:
   - Inspected `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (31 tables: `sekolah`, `users`, `data_guru`, `data_mapel`, `data_siswa`, `guru_mapel`, `wali_kelas`, `jadwal_pelajaran`, `laporan_piket`, `presensi_guru`, `jurnal_pembelajaran`, `absensi`, `presensi_siswa`, `capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`, `kalender_pendidikan`, `bank_dokumen`, `pengaturan`, `sistem_blok`, etc.).
   - Verified that **NO** table named `jurnal_bk`, `bimbingan_konseling`, or similar currently exists in any migration file or template.
2. **Client-Side Interception & Master Data Guards**:
   - In `src/lib/supabaseClient.ts` (lines 132–150), `MASTER_DATA_TABLES` lists tables protected from non-admin mutation (`data_siswa`, `data_guru`, `jadwal_pelajaran`, `data_mapel`, etc.).
   - `jurnal_bk` is an operational journal table (like `jurnal_pembelajaran`, `laporan_piket`, and `presensi_guru`). It **MUST NOT** be included in `MASTER_DATA_TABLES` so that users with role `bk` can perform CRUD operations on their own counseling entries.
   - Lines 43–120 define `isSchemaCacheOrMissingTableError(...)` (catching `PGRST205`, `42P01`, `PGRST204`, etc.), which enables client-side resilience and fallback handling.
3. **Draft & Offline Resilience**:
   - `src/utils/draftStorage.ts` provides scoped localStorage draft persistence (`saveJurnalDraft`, `loadJurnalDraft`, `getJurnalDraftKey`). A similar lightweight helper for BK drafts ensures zero data loss during counseling notes entry.

### 1.3 Student Roster & Selection Patterns
1. **Data Model in `data_siswa`**:
   - `data_siswa` fields: `id` (UUID), `sekolah_id` (UUID), `nisn` (TEXT), `nama_siswa` (TEXT), `kelas` (TEXT), `gender` (TEXT), `status` (TEXT), `no_hp_ortu` (TEXT).
2. **Current Query Patterns**:
   - In `src/components/PiketView.tsx` (lines 1156–1165):
     ```ts
     let query = supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });
     if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
     const { data } = await query;
     ```
   - Across a typical school, `data_siswa` contains 100 to 1,500 active records. Fetching this once per view or caching via `getStorageCache` (`src/lib/dataIntegrityGuard.ts`, lines 50–60) takes < 150ms and < 100KB in memory.

### 1.4 Routing & App Layout Architecture
1. **App Layout in `src/components/AppScreen.tsx`**:
   - Lines 7–28: Views are imported dynamically (`dynamic(() => import('./...'))`).
   - Lines 1116–1420: View switching renders based on `currentView` (e.g. `view-home`, `view-guru-jurnal`, `view-piket`, `view-gradebook`).
   - Lines 1184–1201 & 1243–1260: Strict access gates show an "Akses Terblokir" screen if an unauthorized role attempts to access a protected view.
2. **Route Resolution in `src/lib/navigation.ts`**:
   - `getConsolidatedMenuItems(params)` generates sidebar items based on user role.
   - `evaluateTabRBAC(viewId, tabId, user)` enforces RBAC before rendering or tab transitions.

---

## 2. Logic Chain

### 2.1 Why BK Journals MUST Be Completely Decoupled from KBM Journals
1. **Non-Regression Requirement (R3)**:
   - Existing automated tests (`tests/jurnal_r1_r2_r3_verification.test.ts`, `tests/adversarial_challenge_r1_r2_r3.test.ts`) inspect AST tokens and exact function signatures in `GuruJurnal.tsx` and `RekapJurnalView.tsx`.
   - Modifying `GuruJurnal.tsx` to handle BK journals would risk breaking regex-based assertions, schedule verification (`isJurnalMatchJadwal`), and truancy detection (`Bolos`).
2. **Fundamental Workflow Differences**:
   - **KBM Journal**: 1 Teacher $\to$ 1 Scheduled Class Period $\to$ 30+ Students attendance marked $\to$ Curriculum contents (Materi, KKTP, Tujuan Pembelajaran).
   - **BK Counseling Journal**: 1 Counselor $\to$ Event/Demand Driven (No Schedule) $\to$ 1 Specific Student (or small group) $\to$ Psychological / Guidance Domain (Pribadi, Sosial, Belajar, Karir) $\to$ Sensitive Case Notes & Action Plans.
3. **Counseling Ethics & Data Privacy (Confidentiality)**:
   - Counseling notes involve private student issues (family conflicts, emotional distress, peer bullying, behavioral interventions).
   - Subject teachers and Wali Kelas must NOT have access to these private notes. Decoupling BK into a separate table (`jurnal_bk`) and view (`BkJurnalView.tsx`) allows strict RBAC where only BK counselors, Administrators, and the Principal (Kepala Sekolah) can access the data.

### 2.2 Data Modeling: Recommended Schema for `public.jurnal_bk`
To fulfill Indonesian school BK counseling standards (Permendikbud No. 111/2014) and the user request:

```sql
CREATE TABLE IF NOT EXISTS public.jurnal_bk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    guru_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    nama_guru TEXT NOT NULL,
    siswa_id UUID REFERENCES public.data_siswa(id) ON DELETE SET NULL,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TEXT NOT NULL,
    bidang_bimbingan TEXT NOT NULL CHECK (bidang_bimbingan IN ('Pribadi', 'Sosial', 'Belajar', 'Karir')),
    jenis_layanan TEXT NOT NULL,
    sasaran TEXT DEFAULT 'Individu',
    tempat_layanan TEXT DEFAULT 'Ruang BK',
    catatan TEXT NOT NULL,
    tindak_lanjut TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Dalam Penanganan' CHECK (status IN ('Dalam Penanganan', 'Selesai', 'Alih Tangan Kasus')),
    link_dokumen TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_sekolah_id ON public.jurnal_bk(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_tanggal ON public.jurnal_bk(sekolah_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_siswa_id ON public.jurnal_bk(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_bk_status ON public.jurnal_bk(sekolah_id, status);

-- Row Level Security (RLS)
ALTER TABLE public.jurnal_bk ENABLE ROW LEVEL SECURITY;
```

**Field Rationale**:
- `id`: Standard UUID primary key.
- `sekolah_id`: Multi-tenant isolation constraint.
- `guru_id` / `user_id` / `nama_guru`: Identifies the counselor author.
- `siswa_id`, `nisn`, `nama_siswa`, `kelas`: Full denormalized student identification. Retains student historical record even if student data is later updated.
- `tanggal` & `waktu`: Date (YYYY-MM-DD) and time (e.g., "09:30" or "09:30 - 10:15").
- `bidang_bimbingan`: 4 standard BK areas: `Pribadi`, `Sosial`, `Belajar`, `Karir`.
- `jenis_layanan`: Specific counseling service type: `Konseling Individual`, `Konseling Kelompok`, `Bimbingan Kelompok`, `Konsultasi`, `Mediasi`, `Konferensi Kasus`, `Kunjungan Rumah (Home Visit)`, `Alih Tangan Kasus (Referral)`, `Lainnya`.
- `sasaran`: `Individu` or `Kelompok`.
- `catatan` / `uraian_kasus`: Detailed notes on the case/consultation.
- `tindak_lanjut`: Concrete agreements, homework, or follow-up schedule.
- `status`: Lifecycle tracking (`Dalam Penanganan`, `Selesai`, `Alih Tangan Kasus`).
- `link_dokumen`: Optional attachment (evidence photo / signed agreement).

### 2.3 Client Fallback & Schema Cache Resilience
In accordance with `supabaseClient.ts`:
- If the table `jurnal_bk` is pending PostgREST schema reload, queries will catch `isSchemaCacheOrMissingTableError`.
- The client component maintains an in-memory & `localStorage` cache: `sipjam_jurnal_bk_cache_${sekolah_id}`.
- Formulir drafts use `localStorage.getItem('sipjam_jurnal_bk_draft_' + user.id)`.

### 2.4 Student Selection Workflow
1. **Query**:
   - Fetch active students on mount:
     ```ts
     supabase.from('data_siswa')
       .select('id, nisn, nama_siswa, kelas, gender, status')
       .eq('sekolah_id', user.sekolah_id)
       .order('kelas', { ascending: true })
       .order('nama_siswa', { ascending: true });
     ```
2. **UI Implementation**:
   - **Filter Kelas**: Dropdown ("Semua Kelas", "X Merdeka 1", "XI Merdeka 2", ...).
   - **Live Student Search Input**: Allows searching by student name or NISN.
   - **Selected Student Card**: When selected, displays student badge:
     `[👤 Ahmad Fauzi | NISN: 0012345678 | Kelas: X Merdeka 1] [✖ Ganti Siswa]`
   - No schedule restriction: The counselor can pick ANY student across all classes freely.

### 2.5 CRUD Operations & UI Design in `BkJurnalView.tsx`
1. **Tabs Structure (ClayTabs)**:
   - `input`: Formulir Catat Bimbingan (Create new entry / Edit active entry).
   - `riwayat`: Riwayat & Rekapitulasi (List of counseling journals with search/filter, status badges, expandable detail, and print/export).
   - `statistik`: Summary metrics (Total counseling sessions, active cases, resolved cases, referral cases, breakdown by Bidang Bimbingan).
2. **Operations**:
   - **Create**: Validates student, date, time, bidang, layanan, catatan, and tindak_lanjut. Inserts into `jurnal_bk`. Resets form and clears auto-saved draft.
   - **Read**: Renders list sorted by `tanggal DESC, waktu DESC`. Searchable by student name, NISN, or case keywords. Filterable by date range, class, bidang, and status.
   - **Update**: Clicking "Edit" populates form with existing entry and switches to edit mode. Saves updates with `updated_at: new Date().toISOString()`.
   - **Delete**: SweetAlert2 confirmation dialog. Deletes record from `jurnal_bk` and refreshes list.
   - **Print**: Integrates with `PrintHeader` and `triggerPrintWithGps` to produce an official report signed by Guru BK and Kepala Sekolah.
3. **AppScreen Integration**:
   - Register view alias and route: `view-bk-jurnal`.
   - Dynamic import in `src/components/AppScreen.tsx`:
     ```tsx
     const BkJurnalView = dynamic(() => import('./BkJurnalView'));
     ```
   - Menu item in `src/lib/navigation.ts`:
     - Visible to role `bk`, `admin`, and `kepala_sekolah`.
   - RBAC check in `evaluateTabRBAC` and `AppScreen.tsx`:
     - Regular teachers and students are strictly blocked with an access-denied screen.

---

## 3. Caveats

1. **Multiple Students in Group Counseling**:
   - Most counseling sessions are individual (1 student). However, for group counseling (`Konseling Kelompok`) or mediation (`Mediasi`), 2 or more students may participate.
   - **Recommendation**: To keep the database relational schema clean and simple (Ponytail principle), the primary record stores the main student (`siswa_id`, `nama_siswa`, `kelas`, `nisn`), while an optional text field `siswa_tambahan` or tagging can record other participating students, avoiding complex many-to-many junction tables for initial production.
2. **Daily State Checkout Gate (`workflow.ts`)**:
   - In `workflow.ts`, teachers without `jadwalKBM` (e.g. non-teaching days or exempt teachers) are already allowed to checkout if `state.jadwalKBM.length === 0`.
   - For a user with role `bk`, they will not have entries in `jadwal_pelajaran`. Thus, their `state.jadwalKBM` will be empty (`[]`), ensuring they can checkout normally without being blocked by missing KBM journals.

---

## 4. Conclusion

1. **Decoupling is Mandatory**: BK counseling MUST NOT be merged into `jurnal_pembelajaran` or `GuruJurnal.tsx`. Decoupling is essential for workflow compatibility, non-regression, and ethical confidentiality.
2. **Dedicated Table**: Implement `public.jurnal_bk` with the 18 standard fields detailed above, supported by RLS policies restricting access to role `bk`, `admin`, and `kepala_sekolah`.
3. **Dedicated View**: Implement `src/components/BkJurnalView.tsx` with `ClayTabs` ('input' & 'riwayat'), universal student search across all classes, full CRUD with SweetAlert2 confirmation, auto-save draft resilience, and official printable summary.
4. **AppScreen Wiring**: Wire `view-bk-jurnal` into `src/components/AppScreen.tsx` and `src/lib/navigation.ts` with RBAC protection.

---

## 5. Verification Method

### 5.1 Independent Code Inspection
Inspect the following files to verify the architectural findings:
- `src/components/GuruJurnal.tsx` (lines 335–488, 738–851, 935–1150) — Confirm schedule/class/mapel coupling.
- `src/components/RekapJurnalView.tsx` (lines 201–285) — Confirm KBM journal querying and Wali Kelas supervisi access.
- `src/lib/workflow.ts` (lines 1350–1423) — Confirm `isJurnalMatchJadwal` checkout gate for teachers.
- `src/lib/supabaseClient.ts` (lines 132–150) — Confirm `MASTER_DATA_TABLES` mutation guard.
- `src/components/AppScreen.tsx` (lines 1140–1420) — Confirm view rendering and RBAC boundary patterns.

### 5.2 Test & Build Commands
After subsequent implementation:
- Run test suite: `npm test`
- Run typecheck & build: `npm run build`
- Run lint: `npm run lint`

### 5.3 Invalidation Conditions
This survey and recommendation would be invalidated if:
- BK counselors are required by school policy to teach weekly classroom subject lessons with mandatory student grades in `gradebook` and `data_mapel` (contrary to standard Indonesian BK practice).
- The user specifically requests counseling notes to be public to all subject teachers and students.

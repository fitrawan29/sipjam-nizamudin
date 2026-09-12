# Handoff Report: Milestone 7 — Recap Views, Data Fetching & Ascending Date Sorting

**Agent:** Explorer Subagent (`explorer_m7_recap_sorting`)  
**Milestone:** Milestone 7 (Multi-Tenant Architecture, RLS & Ascending Date Sorting)  
**Target Focus:** R3 Ascending Date Sorting & Tenant Scoping for All Recap and Print Views  
**Date:** 2026-09-12  

---

## 1. Observation

### 1.1 Scope of Investigation
A comprehensive inspection was conducted across all pages, components, data fetch operations, and reporting features in `sipjam-app` related to:
1. **Rekap Jurnal**: `src/components/RekapJurnalView.tsx`
2. **Rekap Siswa (Presensi Siswa)**: `src/components/RekapSiswaView.tsx`
3. **Rekap Akhir Presensi**: `src/components/AdminRekapView.tsx`
4. **Rekap Piket**: `src/components/PiketView.tsx` (Tab 3: Rekap)
5. **Cetak Dokumen Architecture**: `src/components/PrintHeader.tsx` (Headers, Signatures, Period Formatting, Orientation Injections)
6. **Auxiliary Views**: `src/components/HistoryView.tsx`, `src/components/AdminVerifView.tsx`, and `src/components/HomeView.tsx`

---

### 1.2 Direct Code Observations by Component

#### A. Rekap Jurnal (`src/components/RekapJurnalView.tsx`)
- **Location**: `src/components/RekapJurnalView.tsx`, lines 52–82:
  ```typescript
  55: let query = supabase
  56:   .from('jurnal_pembelajaran')
  57:   .select('*')
  58:   .eq('nama_guru', user.nama)
  59:   .order('tanggal', { ascending: false }); // <-- VERBATIM OBSERVATION: DESCENDING ORDER
  ```
- **Display Structure** (lines 297–404):
  - Renders an 8-column standard table:
    1. `Hari, tanggal bulan tahun` (`formatHariTanggal(j.tanggal)`)
    2. `Kelas, pertemuan dan jam ke-`
    3. `Tujuan pembelajaran`
    4. `Materi pembelajaran`
    5. `Kegiatan pembelajaran`
    6. `Kehadiran murid`
    7. `Catatan refleksi`
    8. `Foto kegiatan`
- **Current Behavior**:
  - Because `order('tanggal', { ascending: false })` is used, the table and printed document (`window.print()` line 463) display entries starting from the **latest date (end of the month)** down to the **earliest date (start of the month)**.
  - Furthermore, when a teacher enters multiple classes on the same date, their relative order is either unspecified or reverse creation order.
  - In addition, lines 29 and 35 fetch master `data_siswa` and `data_mapel` without filtering by `sekolah_id`.
  - Line 58 filters only by `nama_guru`, without `sekolah_id`.

#### B. Rekap Siswa / Presensi Siswa (`src/components/RekapSiswaView.tsx`)
- **Location**: `src/components/RekapSiswaView.tsx`, lines 67–76:
  ```typescript
  67: let query = supabase
  68:   .from('jurnal_pembelajaran')
  69:   .select('absensi_siswa, detail_absen, tanggal')
  70:   .eq('kelas', kelas);
  71: 
  72: if (mapel) query = query.eq('mapel', mapel);
  73: if (startDate) query = query.gte('tanggal', startDate);
  74: if (endDate) query = query.lte('tanggal', endDate);
  75: 
  76: const { data: jurnal } = await query;
  ```
- **Current Behavior**:
  - The `jurnal_pembelajaran` query is completely **UNORDERED** (missing any `.order('tanggal', { ascending: true })`).
  - Lines 25 and 61 fetch `data_siswa` without `sekolah_id`.
  - Line 34 fetches `data_mapel` without `sekolah_id`.
  - Line 67 fetches `jurnal_pembelajaran` without `sekolah_id`.

#### C. Rekap Akhir Presensi, Jurnal & Piket (`src/components/AdminRekapView.tsx`)
- **Location**: `src/components/AdminRekapView.tsx`, lines 50–78:
  ```typescript
  50: const { data: guruList } = await supabase
  51:   .from('data_guru')
  52:   .select('nama_guru')
  53:   .order('nama_guru', { ascending: true });
  55: // 2. Fetch presensi_guru
  57:   .from('presensi_guru')
  58:   .select('*')
  59:   .gte('timestamp', start)
  60:   .lte('timestamp', end)
  61:   .eq('status_verifikasi', 'Disetujui');
  63: // 3. Fetch jurnal_pembelajaran
  65:   .from('jurnal_pembelajaran')
  66:   .select('*')
  67:   .gte('timestamp', start)
  68:   .lte('timestamp', end)
  69:   .eq('status_verifikasi', 'Disetujui');
  71: // 4. Fetch laporan_piket
  73:   .from('laporan_piket')
  74:   .select('guru_pelapor, tanggal, status_verifikasi')
  75:   .gte('tanggal', startDateStr)
  76:   .lte('tanggal', endDateStr)
  77:   .eq('status_verifikasi', 'Disetujui');
  ```
- **Current Behavior**:
  - `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket` queries lack date/timestamp ordering (`order('timestamp', { ascending: true })` or `order('tanggal', { ascending: true })`).
  - None of the 4 queries scope by `sekolah_id`.

#### D. Rekap Piket (`src/components/PiketView.tsx` - Tab 3)
- **Location**: `src/components/PiketView.tsx`, line 139:
  ```typescript
  139: let query = supabase
  140:   .from('laporan_piket')
  141:   .select('*')
  142:   .order('tanggal', { ascending: false })     // <-- VERBATIM: DESCENDING
  143:   .order('timestamp', { ascending: false });   // <-- VERBATIM: DESCENDING
  ```
- **Current Behavior**:
  - The Rekap Piket query explicitly orders records in reverse chronological order (`descending: false`).
  - Both on screen and when printed (`window.print()` line 1253), picket records appear newest first down to oldest.
  - Queries lack `sekolah_id` filtering.

#### E. Print Header & Multi-Tenant Settings (`src/components/PrintHeader.tsx`)
- **Location**: `src/components/PrintHeader.tsx`, lines 13 and 126:
  ```typescript
  13: const { data } = await supabase.from('pengaturan').select('*');
  ...
  126: const { data } = await supabase.from('pengaturan').select('*');
  ```
- **Current Behavior**:
  - `PrintHeader` and `PrintSignature` query `pengaturan` table globally.
  - In a multi-tenant database where `pengaturan` holds configurations for multiple schools with `sekolah_id`, an unscoped query will either fetch arbitrary records, conflict, or fail to load the specific school's Kop, logos, address, and Principal signature.

---

## 2. Logic Chain

1. **Root Cause of Descending Rows in Cetak Dokumen**:
   - In `RekapJurnalView.tsx`, line 59 explicitly specifies `.order('tanggal', { ascending: false })`.
   - The React state `jurnalData` directly stores this array. The rendered table maps over `filteredJurnal`, and the print stylesheet prints the rendered DOM table.
   - Consequently, when printed, row 1 is always the end of the month (e.g. 30 September), and the bottom row is the start of the month (e.g. 1 September).
   - In `PiketView.tsx`, line 139 similarly enforces `.order('tanggal', { ascending: false }).order('timestamp', { ascending: false })`.

2. **Inference for Ascending Date Sorting Requirement (R3)**:
   - To satisfy Requirement R3 ("selalu mengurutkan (sorting) berdasarkan data tanggal dari yang terkecil (terlama) ke yang terbesar (terbaru)") and its Acceptance Criteria ("Hasil pencetakan (Cetak Dokumen) pada Rekap Jurnal dan Rekap Presensi secara visual menampilkan baris tabel dari tanggal awal bulan hingga tanggal akhir bulan (ascending)"):
     - In `RekapJurnalView.tsx`: Line 59 must be changed from `{ ascending: false }` to `{ ascending: true }`.
     - To ensure secondary determinism when multiple journals are held on the same day, secondary sort clauses `.order('jam_ke', { ascending: true })` and `.order('pertemuan_ke', { ascending: true })` (or `.order('timestamp', { ascending: true })`) must be applied.
     - A client-side JavaScript comparator should also be applied to `filteredJurnal` to guarantee ascending date sorting even if cached or raw records arrive without ordering:
       ```typescript
       (a, b) => (a.tanggal || '').localeCompare(b.tanggal || '')
       ```
     - In `RekapSiswaView.tsx`: The `jurnal_pembelajaran` query must include `.order('tanggal', { ascending: true })`.
     - In `AdminRekapView.tsx`: The raw queries for `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket` should be ordered ascending by timestamp/tanggal (`.order('timestamp', { ascending: true })`).
     - In `PiketView.tsx`: The `fetchRekapPiket` query must be changed to `.order('tanggal', { ascending: true }).order('timestamp', { ascending: true })`.

3. **Inference for Multi-Tenancy (`sekolah_id`) Scoping**:
   - In Milestone 7, native Supabase RLS is introduced at the database level. However, application-level queries must also explicitly pass `.eq('sekolah_id', user.sekolah_id)` wherever `user?.sekolah_id` is available.
   - In `PrintHeader.tsx`: Neither `PrintHeader` nor `PrintSignature` receives props in existing caller views.
   - To prevent breaking changes across all views while achieving tenant scoping, `PrintHeader` and `PrintSignature` can accept optional props (`sekolahId?: string` or `user?: any`) with an automatic fallback:
     ```typescript
     let activeSekolahId = sekolahId || user?.sekolah_id;
     if (!activeSekolahId && typeof window !== 'undefined') {
       try {
         const u = JSON.parse(localStorage.getItem('sipjam_user') || '{}');
         activeSekolahId = u.sekolah_id;
       } catch (_) {}
     }
     let query = supabase.from('pengaturan').select('*');
     if (activeSekolahId) {
       query = query.eq('sekolah_id', activeSekolahId);
     }
     ```
   - This guarantees that each school's printed document uses their own letterhead and signature block.

---

## 3. Caveats

1. **Supabase RLS vs Query Filtering**:
   - While Supabase RLS policies will automatically restrict rows at the database level once active, explicit query filters `.eq('sekolah_id', user.sekolah_id)` provide defense-in-depth and ensure optimal index usage on PostgreSQL.
2. **Same-Date Session Ordering**:
   - Teachers may submit 2–4 journals on the same date (e.g. Jam ke-1 to Jam ke-4 across different classes). Sorting solely by `tanggal` produces non-deterministic order among same-day sessions. Incorporating `jam_ke` (or `timestamp`) as a secondary order clause is essential for a clean chronological sequence.
3. **Date Format Variations**:
   - In `jurnal_pembelajaran`, `tanggal` is stored as an ISO date string (`YYYY-MM-DD`). Lexicographical string comparison (`a.tanggal.localeCompare(b.tanggal)`) and SQL `order('tanggal', { ascending: true })` both naturally yield chronological ordering for `YYYY-MM-DD`.

---

## 4. Conclusion & Proposed Code Modifications

### Summary Matrix of Required Changes

| File | Current Sorting | Target Sorting | Multi-Tenant Filter (`sekolah_id`) |
|---|---|---|---|
| `src/components/RekapJurnalView.tsx` | `order('tanggal', { ascending: false })` (DESCENDING) | `order('tanggal', { ascending: true }).order('jam_ke', { ascending: true })` (ASCENDING) | Add `eq('sekolah_id', user.sekolah_id)` to master queries and `jurnal_pembelajaran` |
| `src/components/RekapSiswaView.tsx` | Unsorted | `order('tanggal', { ascending: true })` (ASCENDING) | Add `eq('sekolah_id', user.sekolah_id)` to `data_siswa`, `data_mapel`, and `jurnal_pembelajaran` |
| `src/components/AdminRekapView.tsx` | Unsorted | Add `order('timestamp', { ascending: true })` to presensi and jurnal; `order('tanggal', { ascending: true })` to piket | Add `eq('sekolah_id', user.sekolah_id)` to `data_guru`, `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` |
| `src/components/PiketView.tsx` | `order('tanggal', { ascending: false })` (DESCENDING) | `order('tanggal', { ascending: true }).order('timestamp', { ascending: true })` (ASCENDING) | Add `eq('sekolah_id', user.sekolah_id)` to `laporan_piket` and `penugasan_piket` |
| `src/components/PrintHeader.tsx` | Unscoped `pengaturan` fetch | N/A | Add `sekolahId` resolution via prop or `localStorage.getItem('sipjam_user')` |

---

### Concrete Implementation Proposals (Snippets)

#### 1. `src/components/RekapJurnalView.tsx`
```diff
@@ -29,11 +29,15 @@ export default function RekapJurnalView({ user }: { user: any }) {
   useEffect(() => {
     const fetchMaster = async () => {
       try {
-        const { data: siswa } = await supabase.from('data_siswa').select('kelas');
+        let siswaQuery = supabase.from('data_siswa').select('kelas');
+        if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
+        const { data: siswa } = await siswaQuery;
         if (siswa) {
           const uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas).filter(Boolean))) as string[];
           setKelasList(uniqueKelas);
         }
 
-        const { data: mData } = await supabase.from('data_mapel').select('nama_mata_pelajaran');
+        let mapelQuery = supabase.from('data_mapel').select('nama_mata_pelajaran');
+        if (user?.sekolah_id) mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);
+        const { data: mData } = await mapelQuery;
         if (mData) {
@@ -58,3 +62,5 @@ export default function RekapJurnalView({ user }: { user: any }) {
         let query = supabase
           .from('jurnal_pembelajaran')
           .select('*')
           .eq('nama_guru', user.nama)
-         .order('tanggal', { ascending: false });
+         .order('tanggal', { ascending: true })
+         .order('jam_ke', { ascending: true });
+
+        if (user?.sekolah_id) {
+          query = query.eq('sekolah_id', user.sekolah_id);
+        }
```

#### 2. `src/components/RekapSiswaView.tsx`
```diff
@@ -67,5 +67,6 @@ export default function RekapSiswaView({ user }: { user: any }) {
       let query = supabase
         .from('jurnal_pembelajaran')
         .select('absensi_siswa, detail_absen, tanggal')
-        .eq('kelas', kelas);
+        .eq('kelas', kelas)
+        .order('tanggal', { ascending: true });
+
+      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
```

#### 3. `src/components/AdminRekapView.tsx`
```diff
@@ -53,3 +53,4 @@ export default function AdminRekapView({ user }: { user: any }) {
       let guruQuery = supabase.from('data_guru').select('nama_guru').order('nama_guru', { ascending: true });
+      if (user?.sekolah_id) guruQuery = guruQuery.eq('sekolah_id', user.sekolah_id);
       const { data: guruList } = await guruQuery;

@@ -60,2 +61,4 @@ export default function AdminRekapView({ user }: { user: any }) {
       let presensiQuery = supabase.from('presensi_guru').select('*').gte('timestamp', start).lte('timestamp', end).eq('status_verifikasi', 'Disetujui').order('timestamp', { ascending: true });
+      if (user?.sekolah_id) presensiQuery = presensiQuery.eq('sekolah_id', user.sekolah_id);
       const { data: presensi } = await presensiQuery;

@@ -68,2 +71,4 @@ export default function AdminRekapView({ user }: { user: any }) {
       let jurnalQuery = supabase.from('jurnal_pembelajaran').select('*').gte('timestamp', start).lte('timestamp', end).eq('status_verifikasi', 'Disetujui').order('timestamp', { ascending: true });
+      if (user?.sekolah_id) jurnalQuery = jurnalQuery.eq('sekolah_id', user.sekolah_id);
       const { data: jurnal } = await jurnalQuery;

@@ -76,2 +81,4 @@ export default function AdminRekapView({ user }: { user: any }) {
       let piketQuery = supabase.from('laporan_piket').select('guru_pelapor, tanggal, status_verifikasi').gte('tanggal', startDateStr).lte('tanggal', endDateStr).eq('status_verifikasi', 'Disetujui').order('tanggal', { ascending: true });
+      if (user?.sekolah_id) piketQuery = piketQuery.eq('sekolah_id', user.sekolah_id);
       const { data: piket } = await piketQuery;
```

#### 4. `src/components/PiketView.tsx`
```diff
@@ -139,2 +139,4 @@ export default function PiketView({ user }: { user: any }) {
-      let query = supabase.from('laporan_piket').select('*').order('tanggal', { ascending: false }).order('timestamp', { ascending: false });
+      let query = supabase.from('laporan_piket').select('*').order('tanggal', { ascending: true }).order('timestamp', { ascending: true });
+      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
```

#### 5. `src/components/PrintHeader.tsx`
```typescript
// Support optional sekolahId/user prop, with localStorage fallback:
let activeSekolahId = sekolahId || user?.sekolah_id;
if (!activeSekolahId && typeof window !== 'undefined') {
  try {
    const u = JSON.parse(localStorage.getItem('sipjam_user') || '{}');
    activeSekolahId = u.sekolah_id;
  } catch (_) {}
}
let query = supabase.from('pengaturan').select('*');
if (activeSekolahId) {
  query = query.eq('sekolah_id', activeSekolahId);
}
```

---

## 5. Verification Method

To independently verify these conclusions and validate subsequent implementation:

1. **Code Inspection**:
   - In `src/components/RekapJurnalView.tsx`: verify line 59 contains `.order('tanggal', { ascending: true })` rather than `false`.
   - In `src/components/PiketView.tsx`: verify line 139 contains `.order('tanggal', { ascending: true })` rather than `false`.
   - In `src/components/RekapSiswaView.tsx`: verify `jurnal_pembelajaran` query contains `.order('tanggal', { ascending: true })`.

2. **Automated Unit / Invariant Test**:
   - Create and run `tests/m7_recap_ascending_sorting.test.ts` to assert:
     - `RekapJurnalView.tsx` contains `.order('tanggal', { ascending: true })`.
     - `RekapJurnalView.tsx` does NOT contain `.order('tanggal', { ascending: false })`.
     - `PiketView.tsx` does NOT contain `.order('tanggal', { ascending: false })`.
     - `RekapSiswaView.tsx` contains `.order('tanggal', { ascending: true })`.
     - Dummy seed journal data spanning across month days `2026-09-02`, `2026-09-10`, `2026-09-25` renders in strict ascending row index.

3. **Build Health Check**:
   - Command: `npm run build`
   - Must exit with code 0.

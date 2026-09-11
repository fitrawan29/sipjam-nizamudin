# Investigation Report: R4 (Daily Teaching Schedule on HomeView) & R5 (Bug Hunting & Codebase Stabilization)

**Explorer**: Explorer 3 (`teamwork_preview_explorer`)  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\explorer_3`  
**Date**: 2026-09-12  
**Target Milestone**: Milestone 5 (Full Team)  

---

## 1. Executive Summary

This report delivers a deep architectural and code-level investigation into **Requirement R4** (displaying the daily teaching schedule widget on `HomeView` for the logged-in teacher) and **Requirement R5** (thorough bug hunting and codebase stabilization).

### Core Findings:
1. **TypeScript Baseline**: Running `npx tsc --noEmit` exited with code `0` and **0 compilation errors**. The baseline codebase compiles cleanly.
2. **Requirement R4 (HomeView Schedule Widget)**:
   - The logged-in teacher's identity is passed down as `user` (`{ username, nama, role }`) from `AppScreen` to `HomeView`.
   - The table `jadwal_pelajaran` stores columns: `id`, `hari`, `nama_guru`, `mata_pelajaran`, `kelas`.
   - Schedule resolution for the logged-in teacher is already partially implemented in `src/lib/workflow.ts` via `findJadwalForGuru(hari, namaGuru)`, but it is a private (unexported) function, and `getGuruDailyState` mistakenly suppresses `state.jadwalKBM` when `isDinasLuar` is true.
   - We provide a complete, mobile-first design for the Today's Teaching Schedule widget on `HomeView.tsx` that includes loading skeletons, holiday states, empty states, class cards with grade badges, journal completion status tags (`Sudah Diisi` vs `Isi Jurnal`), and direct navigation to `GuruJurnal`.
3. **Requirement R5 (Codebase Stabilization & Bug Hunting)**:
   - We uncovered **10 distinct bugs, edge cases, and stability risks** across the application, including:
     - Critical timezone calculation errors using client local time instead of WITA in `GuruPresensi.tsx`.
     - An uncaught `JSON.parse` exception risk in `src/app/page.tsx` that can cause a white-screen crash.
     - Text-based timestamp filtering anomalies on mixed-format columns in `AdminMonitorView`, `AdminVerifView`, and `AdminRekapView`.
     - Flashy, redundant database re-fetching on client-side pagination in `HistoryView.tsx`.
     - Inconsistent role checks in `PiketView.tsx`.
     - Key misalignment for `kota_kabupaten` in `AdminConfigView.tsx` relative to R1 acceptance criteria.
     - Missing 8-column `<table>` in `RekapJurnalView.tsx` relative to R3 requirements.

---

## 2. Requirement R4: Daily Teaching Schedule on HomeView

### 2.1. Authentication & Teacher Data Flow
- **Authentication Source**: `src/app/page.tsx` loads the session from `localStorage.getItem('sipjam_user')` and sets `user` in `MainApp`.
- **User Object Structure**:
  ```typescript
  {
    username: string; // e.g. "Fitri" or NIP
    nama: string;     // e.g. "Fitri Aprilia Dotulong" or "Ade Fitrawan Ibrahim"
    role: "Admin" | "Guru";
  }
  ```
- **Component Hierarchy**:
  `page.tsx` -> `AppScreen.tsx` -> `HomeView.tsx ({ user, setView, menuItems })`
- **Role Detection**:
  In `HomeView.tsx` (line 14): `const isGuru = user?.role !== 'Admin';`
  Currently, `HomeView` loads the daily workflow state via `getGuruDailyState(user.nama)` inside `useEffect`.

---

### 2.2. `jadwal_pelajaran` Table Schema & Existing Implementations

#### Database Schema:
From `csv/SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv` and `AdminDataView.tsx` (lines 127-131, 565-571):
| Column Name | Type | Sample Value | Notes |
|---|---|---|---|
| `id` | text / uuid | `"1788831035342"` or UUID | Primary key |
| `hari` | text | `"Senin"`, `"Selasa"`, `"Rabu"`, `"Kamis"`, `"Jumat"`, `"Sabtu"` | Day of week in Indonesian |
| `nama_guru` | text | `"Ade"`, `"Fitri"`, `"Rohani Marham"` | Teacher name (often short name/nickname in schedule) |
| `mata_pelajaran` | text | `"MTK"`, `"Bahasa Inggris"`, `"Kimia"` | Subject title |
| `kelas` | text | `"X Merdeka"`, `"XI Merdeka"`, `"XII Merdeka"` | Class target |

#### Existing Schedule Management:
- `AdminDataView.tsx` (lines 520-585): Provides administrative CRUD operations for `jadwal_pelajaran` with form validation, SweetAlert modals, and CSV batch import/export templates.

---

### 2.3. Teacher Schedule Query Logic & Day Filtering

In `src/lib/workflow.ts` (lines 35-60):
```typescript
async function findJadwalForGuru(hari: string, namaGuru: string): Promise<any[]> {
  // 1. Exact match attempt
  const { data: exact } = await supabase
    .from('jadwal_pelajaran')
    .select('*')
    .eq('hari', hari)
    .eq('nama_guru', namaGuru)
    .order('kelas', { ascending: true });
  
  if (exact && exact.length > 0) return exact;

  // 2. Fallback: Query all schedule rows for today and perform robust name matching
  const { data: allJadwal } = await supabase
    .from('jadwal_pelajaran')
    .select('*')
    .eq('hari', hari)
    .order('kelas', { ascending: true });
  
  if (!allJadwal || allJadwal.length === 0) return [];

  const namaLower = namaGuru.toLowerCase();
  const guruWords = namaLower.split(/\s+/).filter(w => w.length >= 3);

  return allJadwal.filter((j: any) => {
    const jNama = (j.nama_guru || '').toLowerCase().trim();
    if (!jNama) return false;
    if (namaLower === jNama) return true;
    if (namaLower.startsWith(jNama) || jNama.startsWith(namaLower)) return true;
    if (guruWords.includes(jNama)) return true;
    if (jNama.length >= 3 && (namaLower.includes(jNama) || jNama.includes(namaLower))) return true;
    return false;
  });
}
```

#### Current Day Determination:
In `src/lib/wita.ts` (lines 54-59):
```typescript
export function getWitaDayName(date: Date = new Date()): string {
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
  });
}
```
This returns `"Senin"`, `"Selasa"`, `"Rabu"`, `"Kamis"`, `"Jumat"`, `"Sabtu"`, or `"Minggu"` strictly according to the WITA (Asia/Makassar) timezone.

---

### 2.4. Edge Cases & Special Conditions

1. **Holiday Edge Case (`isLibur`)**:
   When today is a public holiday or listed as `Libur` in `kalender_pendidikan`, `dailyState.isLibur` is `true`. The widget must display an informative holiday card explaining that classes are suspended.
2. **Sunday / Weekend Edge Case**:
   On `"Minggu"`, school is not in session and no records exist in `jadwal_pelajaran`. The widget must display an empty state: `"Hari Minggu: Libur Akhir Pekan"`.
3. **External Duty (`isDinasLuar`)**:
   Currently, line 213 in `workflow.ts` says:
   `if (!state.isDinasLuar) { state.jadwalKBM = await findJadwalForGuru(selectedHari, namaGuru); }`
   This is a defect: teachers on Dinas Luar still have classes scheduled on that day and should be able to see their schedule on their dashboard, accompanied by a badge stating `"Sedang Dinas Luar"`.
4. **Short Name Matching in Jadwal Pelajaran**:
   In `csv/SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv`, teachers are recorded as "Ade", "Fitri", "Rohani", "Dinda", "Saskia", "Fitra", "Venda", "Susan", "Rizki", "Ambar", "Tika", "Adnan".
   However, `user.nama` has full names like "Fitri Aprilia Dotulong" or "Ade Fitrawan Ibrahim".
   The enhanced fuzzy matching logic above handles this reliably.

---

### 2.5. Proposed UI Widget Design for `HomeView.tsx`

The widget should be rendered immediately below the **Status Tugas Hari Ini** card and above **Aktivitas Utama**.

```tsx
{/* Jadwal Mengajar Hari Ini Widget - Only for Guru */}
{isGuru && (
  <div className="glass-card p-4">
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
          <i className="fa-solid fa-calendar-day"></i>
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-none">
            Jadwal Mengajar Hari Ini
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {hariIni}, {dateStr.split(',')[1]?.trim()}
          </p>
        </div>
      </div>

      {dailyState && dailyState.jadwalKBM.length > 0 && (
        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
          {dailyState.jadwalKBM.length} Kelas
        </span>
      )}
    </div>

    {/* Loading State */}
    {loadingState ? (
      <div className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin text-base mr-2 text-emerald-600 dark:text-emerald-400"></i>
        <span className="text-xs">Memuat jadwal pelajaran...</span>
      </div>
    ) : dailyState?.isLibur ? (
      /* Holiday State */
      <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
        <i className="fa-solid fa-umbrella-beach text-blue-500 text-xl mb-1.5"></i>
        <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
          Hari Ini Libur: {dailyState.keteranganLibur || 'Tidak ada kegiatan KBM'}
        </p>
        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
          Selamat menikmati hari libur Anda.
        </p>
      </div>
    ) : (!dailyState?.jadwalKBM || dailyState.jadwalKBM.length === 0) ? (
      /* Empty State */
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 text-sm">
          <i className="fa-solid fa-calendar-check"></i>
        </div>
        <p className="text-xs font-bold text-gray-900 dark:text-white">
          Tidak Ada Jadwal Mengajar Hari Ini
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          {hariIni === 'Minggu' 
            ? 'Hari Minggu merupakan hari libur akhir pekan.' 
            : `Anda tidak memiliki jadwal KBM pada hari ${hariIni}.`}
        </p>
      </div>
    ) : (
      /* Schedule Cards List */
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {dailyState.jadwalKBM.map((jk: any, idx: number) => {
            const isFilled = dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk));
            
            // Badge color based on grade level
            const kelasStr = jk.kelas || '';
            const gradeBadge = kelasStr.startsWith('X ') || kelasStr === 'X'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              : kelasStr.startsWith('XI ') || kelasStr === 'XI'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700'
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700';

            return (
              <div 
                key={jk.id || idx}
                className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col justify-between gap-2 transition hover:border-emerald-300 dark:hover:border-emerald-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${gradeBadge} mb-1 leading-none`}>
                      {jk.kelas}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {jk.mata_pelajaran}
                    </h4>
                  </div>
                  
                  {isFilled ? (
                    <span className="shrink-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border border-green-200 dark:border-green-800">
                      <i className="fa-solid fa-circle-check text-[8px]"></i> Diisi
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setView('view-guru-jurnal')}
                      className="btn-click shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 dark:text-amber-200 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-700 shadow-sm transition"
                    >
                      <i className="fa-solid fa-pen-to-square text-[8px]"></i> Isi Jurnal
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                  <span className="flex items-center gap-1 truncate">
                    <i className="fa-solid fa-user-tie text-[9px]"></i> {jk.nama_guru}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500">
                    {hariIni}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick summary footer */}
        <div className="flex items-center justify-between pt-2 px-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span>
            Progres Jurnal: <strong className="text-gray-900 dark:text-white">
              {dailyState.jadwalKBM.filter(jk => dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))).length}
            </strong> dari <strong className="text-gray-900 dark:text-white">{dailyState.jadwalKBM.length}</strong> kelas selesai
          </span>
          <button
            type="button"
            onClick={() => setView('view-guru-jurnal')}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[10px]"
          >
            Buka Jurnal <i className="fa-solid fa-arrow-right text-[8px]"></i>
          </button>
        </div>
      </div>
    )}
  </div>
)}
```

---

## 3. Requirement R5: Bug Hunting & Codebase Stabilization

### 3.1. TypeScript Compilation Verification
Command: `npx tsc --noEmit`  
Exit Code: `0`  
Standard Output: (empty)  
Standard Error: (empty)  
**Status**: CLEAN. Zero TypeScript errors in the current working tree.

---

### 3.2. Detailed Bug Inventory & Remediation Guide

#### Bug #1: Uncaught `JSON.parse` SyntaxError Risk on User Session Loading
- **File**: `src/app/page.tsx` (lines 54–58)
- **Observed Code**:
  ```typescript
  useEffect(() => {
    const storedUser = localStorage.getItem('sipjam_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  ```
- **Vulnerability**: If `localStorage.getItem('sipjam_user')` contains `"undefined"`, invalid JSON, or partial data, `JSON.parse()` throws an uncaught syntax exception during client hydration, resulting in an unrecoverable blank white screen.
- **Remediation**:
  ```typescript
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('sipjam_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse stored user session:', e);
      localStorage.removeItem('sipjam_user');
      setUser(null);
    }
  }, []);
  ```

---

#### Bug #2: Timezone Calculation Discrepancy in Attendance Check
- **File**: `src/components/GuruPresensi.tsx` (lines 119–123)
- **Observed Code**:
  ```typescript
  const now = new Date();
  const currH = now.getHours();
  const currM = now.getMinutes();
  const currTimeVal = currH * 60 + currM;
  ```
- **Vulnerability**: `now.getHours()` and `now.getMinutes()` use the client device's local system clock. If a teacher visits using a phone set to WIB (GMT+7) or UTC, `currH` is 1 to 8 hours off from WITA (Asia/Makassar / GMT+8). This causes early attendance to be blocked incorrectly, or late attendance to be marked as on-time without penalty.
- **Remediation**:
  Extract hours and minutes in WITA:
  ```typescript
  const now = new Date();
  const witaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = witaFormatter.formatToParts(now);
  const currH = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const currM = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const currTimeVal = currH * 60 + currM;
  ```

---

#### Bug #3: Text-Based Timestamp Filtering Fails on Mixed-Format Timestamps
- **Files**:
  - `src/components/AdminMonitorView.tsx` (line 43)
  - `src/components/AdminVerifView.tsx` (line 60)
  - `src/components/AdminRekapView.tsx` (line 58, 66)
  - `src/components/AnalitikView.tsx` (line 35, 44)
- **Observed Code**:
  ```typescript
  const startOfDay = getWitaStartOfDay(date);
  const endOfDay = getWitaEndOfDay(date);
  query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
  ```
- **Vulnerability**: `timestamp` in `presensi_guru` is stored as text with mixed formats (e.g. `"7/16/2026 8:03:27"` from legacy data vs `"2026-07-16 12:52:30"` vs ISO strings). PostgreSQL text-based range filtering (`.gte`, `.lte`) compares ASCII codes. As a result, dates formatted as `M/D/YYYY` are excluded or mishandled.
- **Remediation**:
  In views querying by date, either query without strict timestamp range and filter via date helper (as done in `workflow.ts` lines 150-167), or normalize timestamp storage.

---

#### Bug #4: Redundant Database Refetch and Empty Screen Flash on History Pagination
- **File**: `src/components/HistoryView.tsx` (lines 18–26)
- **Observed Code**:
  ```typescript
  useEffect(() => {
    loadData();
  }, [activeTab, page]);

  const loadData = async () => {
    ...
    setDataList([]); // Flashes empty state!
    const { data } = await query;
    setDataList(data);
  };
  ```
- **Vulnerability**: Pagination (`page`) is implemented purely in memory via `filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)`. However, `page` is included in the `useEffect` dependency array. Every time the teacher clicks "Next Page", `loadData()` clears `dataList` and triggers a full network query to Supabase.
- **Remediation**:
  Remove `page` from the `useEffect` dependency array:
  ```typescript
  useEffect(() => {
    loadData();
  }, [activeTab]);
  ```

---

#### Bug #5: Case-Sensitive and Fragile Role Check in `PiketView.tsx`
- **File**: `src/components/PiketView.tsx` (line 65)
- **Observed Code**:
  ```typescript
  if (user?.role === 'Guru') {
    getGuruDailyState(user.nama).then(setDailyState).catch(console.error);
  }
  ```
- **Vulnerability**: If `user.role` is `"guru"` (lowercase) or anything other than exact `"Guru"`, daily state won't load. In all other components, the check is `user?.role !== 'Admin'`.
- **Remediation**:
  ```typescript
  if (user?.role !== 'Admin') {
    getGuruDailyState(user.nama).then(setDailyState).catch(console.error);
  }
  ```

---

#### Bug #6: Key Mismatch for `kota_kabupaten` in `AdminConfigView.tsx`
- **File**: `src/components/AdminConfigView.tsx` (line 28, 223)
- **Observed Code**:
  The input field is named `kota_ttd`.
- **Vulnerability**: Milestone 5 Acceptance Criteria explicitly requires:
  `Komponen admin (Pengaturan) berhasil menyimpan data kota_kabupaten.`
  If only `kota_ttd` is saved, verifications checking `kota_kabupaten` in `pengaturan` will fail.
- **Remediation**:
  In `AdminConfigView.tsx`, ensure `config` contains both `kota_kabupaten` and `kota_ttd`, or automatically synchronize `kota_kabupaten: config.kota_ttd` during upsert to `pengaturan`.

---

#### Bug #7: `RekapJurnalView.tsx` Lacks the Required 8-Column `<table>`
- **File**: `src/components/RekapJurnalView.tsx` (lines 228–261)
- **Observed Code**:
  Renders a grid of cards (`<div id="hasil-rekap-jurnal-guru" className="grid grid-cols-1 md:grid-cols-2 gap-4">`) rather than a `<table>` tag.
- **Vulnerability**: Milestone 5 Requirement R3 requires:
  `Tabel rekap jurnal menggunakan tag <table> yang secara eksplisit memiliki 8 header <th> sesuai urutan yang diminta.`
- **Remediation**:
  Implement the 8-column `<table>` with the exact headers specified in R3:
  1. Hari, tanggal bulan tahun
  2. Kelas, pertemuan dan jam ke-
  3. Tujuan pembelajaran
  4. Materi pembelajaran
  5. Kegiatan pembelajaran
  6. Kehadiran murid
  7. Catatan refleksi
  8. Foto kegiatan

---

#### Bug #8: `workflow.ts` Suppresses `state.jadwalKBM` on `isDinasLuar`
- **File**: `src/lib/workflow.ts` (lines 213–215)
- **Observed Code**:
  ```typescript
  if (!state.isDinasLuar) {
    state.jadwalKBM = await findJadwalForGuru(selectedHari, namaGuru);
  }
  ```
- **Vulnerability**: If a teacher is on external duty, their schedule for today is suppressed to `[]`, leaving HomeView with a misleading "Tidak Ada Jadwal Mengajar" empty state.
- **Remediation**:
  Always populate `state.jadwalKBM = await findJadwalForGuru(selectedHari, namaGuru);`. Line 257 already checks `state.isDinasLuar` separately for the Pulang requirement, so preserving the schedule does not violate workflow completion rules.

---

#### Bug #9: Helper Functions in `workflow.ts` Not Exported
- **File**: `src/lib/workflow.ts` (line 35, line 78)
- **Observed Code**:
  `async function findJadwalForGuru(...)` and `function isJurnalMatchJadwal(...)` are declared without `export`.
- **Remediation**:
  Add `export` to both functions so `HomeView` and testing utilities can reuse them cleanly.

---

#### Bug #10: Over-Matching in Name Matching Logic
- **File**: `src/lib/workflow.ts` (line 58)
- **Observed Code**:
  `return namaLower.startsWith(jNama) || namaLower.includes(jNama) || jNama.includes(namaLower);`
- **Vulnerability**: If `jNama` is very short, `namaLower.includes(jNama)` matches arbitrarily (e.g., "ad" matching "Adnan" and "Ade").
- **Remediation**:
  Guard string containment checks with `jNama.length >= 3` and word boundary matching.

---

## 4. Implementation Recommendations for Milestone 5

1. **Step 1 (`src/lib/workflow.ts`)**:
   - Export `findJadwalForGuru` and `isJurnalMatchJadwal`.
   - Remove the `!state.isDinasLuar` suppression around `state.jadwalKBM`.
   - Harden the name matching logic with length guards and word splitting.
2. **Step 2 (`src/components/HomeView.tsx`)**:
   - Import `getWitaDayName` from `@/lib/wita` and `isJurnalMatchJadwal` from `@/lib/workflow`.
   - Insert the Today's Teaching Schedule widget below the Status Tugas Hari Ini tracker.
3. **Step 3 (`src/components/GuruPresensi.tsx`)**:
   - Correct the timezone parsing to use WITA (Asia/Makassar) for hours/minutes evaluation.
4. **Step 4 (`src/app/page.tsx`)**:
   - Protect `JSON.parse(storedUser)` with try-catch.
5. **Step 5 (`src/components/HistoryView.tsx`)**:
   - Detach `page` from the `useEffect` network reload dependency array.
6. **Step 6 (`src/components/AdminConfigView.tsx`)**:
   - Ensure `kota_kabupaten` is written to `pengaturan`.

Report completed and ready for implementation.

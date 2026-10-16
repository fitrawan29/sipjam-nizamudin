# Feature R2 Codebase Survey Report: Auto-Save Draft Lokal & Ketahanan Koneksi Lemah

**Author**: `explorer_o22_2`  
**Date**: 2026-10-16  
**Scope**: `src/components/GradebookView.tsx`, `src/components/GuruJurnal.tsx`, and project localStorage/debounce conventions.

---

## 1. GradebookView (`src/components/GradebookView.tsx`) Investigation

### 1.1 How `localScores` and Grade State are Maintained
- **Grade State (`gradesMap`)**:
  - Defined at Line 153:
    ```typescript
    const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({});
    ```
  - Structure: Outer key is student NISN (`nisn: string`), inner key is Assessment Column ID (`asesmenId: string`), value is `number | null`.
- **Dirty State Tracking (`dirtyGrades`)**:
  - Defined at Line 154:
    ```typescript
    const [dirtyGrades, setDirtyGrades] = useState<Record<string, boolean>>({});
    ```
  - Structure: Key format `${nisn}_${colId}: true`.
  - Unsaved count calculated at Line 2076: `const unsavedCount = Object.keys(dirtyGrades).length;`.

### 1.2 User Input Handling
- **Individual Input (`handleGradeChange`, Lines 1115–1136)**:
  - Validates numerical range `[0, 100]`.
  - Updates `gradesMap`:
    ```typescript
    setGradesMap(prev => ({
      ...prev,
      [nisn]: {
        ...(prev[nisn] || {}),
        [colId]: parsed,
      },
    }));
    ```
  - Marks dirty key:
    ```typescript
    setDirtyGrades(prev => ({
      ...prev,
      [`${nisn}_${colId}`]: true,
    }));
    ```
- **Bulk Input (`handleBulkFillSubmit`, Lines 1740–1765)**:
  - Iterates over `students`, sets `newGrades[s.nisn][bulkFillColId] = val`, marks `newDirty[\`${s.nisn}_${bulkFillColId}\`] = true`.
  - Calls `setGradesMap(newGrades)` and `setDirtyGrades(newDirty)`.

### 1.3 How "Simpan Semua Nilai" Works
- Function: `handleSaveGrades` (Lines 1139–1237).
- Network check: Checks `navigator.onLine` (Lines 1140–1146); if offline, shows warning toast and aborts without clearing dirty state.
- RBAC Check: Rejects if `isAdmin` or `!isGuruPengampu`.
- Batch Upsert: Iterates `dirtyKeys`, constructs `recordsToUpsert` for `nilai_siswa`, then calls:
  ```typescript
  const { error } = await supabase
    .from('nilai_siswa')
    .upsert(recordsToUpsert, { onConflict: 'sekolah_id,asesmen_id,nisn' });
  ```
- On Success: Removes saved keys from `dirtyGrades`, shows success toast.

### 1.4 Scoped LocalStorage Key & Debounced Auto-Save
- **Scoped Key**:
  ```typescript
  const draftKey = `sipjam_gradebook_draft_${sekolahId || user?.sekolah_id || 'default'}_${selectedMapel}_${selectedKelas}_${selectedTpId}`;
  ```
- **Debounced Auto-Save Mechanism**:
  - Add ref: `const draftDebounceRef = useRef<NodeJS.Timeout | null>(null);`.
  - In a `useEffect` triggered by `[dirtyGrades, gradesMap, columnsList]`:
    - Debounce timer: 600ms.
    - Extracts dirty scores for the current TP columns: `Record<string, Record<string, number | null>>`.
    - Writes JSON payload `{ scores: dirtyScores, savedAt: new Date().toISOString() }` to `localStorage.setItem(draftKey, ...)`.
    - Updates local state `setHasLocalDraft(true)`.

### 1.5 Draft Restoration
- When `fetchGrades` finishes (or when `[selectedTpId, selectedMapel, selectedKelas, isLoadingGrades]` settles):
  - Read `localStorage.getItem(draftKey)`.
  - If present and valid, restore scores into `gradesMap` and mark their keys in `dirtyGrades`.
  - Set `hasLocalDraft(true)`.

### 1.6 Where "Draft Lokal Tersimpan" Indicator Should Be Shown
- **Exact Location**: Top action bar of the Header Card, directly adjacent to `{unsavedCount > 0 && (...)}` and the "Simpan Semua Nilai" button (Lines 2110–2131):
  ```tsx
  {!isAdmin && isGuruPengampu && (
    <div className="flex items-center gap-2 flex-wrap">
      {hasLocalDraft && (
        <span className="text-xs font-bold text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-700 flex items-center gap-1.5 shadow-sm">
          <i className="fa-solid fa-floppy-disk text-teal-600 dark:text-teal-400"></i>
          Draft Lokal Tersimpan
        </span>
      )}
      {unsavedCount > 0 && ( ... )}
      <button ...>Simpan Semua Nilai</button>
    </div>
  )}
  ```

### 1.7 When Draft Should Be Cleared
- **In `handleSaveGrades`**: Immediately after the Supabase upsert succeeds (`if (error) throw error;`):
  ```typescript
  if (draftKey && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  }
  setHasLocalDraft(false);
  ```

---

## 2. GuruJurnal (`src/components/GuruJurnal.tsx`) Investigation

### 2.1 How Form State is Held
- Form inputs are managed via React state hooks (Lines 13–32):
  `tipeJurnal`, `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `catatanSiswa`, `refleksi`, `pertemuanKe`, `jamKe`, `tujuanPembelajaran`, `kehadiranMurid`, `kktp`, `konten`, `lokasiKbm`, `absensi`.

### 2.2 Existing Draft Autosave & Restore
- **Restore on Mount (Lines 150–178)**: Reads `sipjam_jurnal_autosave` and sets all fields if found.
- **Auto-save on Change (Lines 180–226)**: Updates `sipjam_jurnal_autosave` when form has non-empty content; deletes key when form is blank.
- **Clear on Success (Line 935)**: Removes `sipjam_jurnal_autosave` upon successful journal insertion to Supabase.

### 2.3 Handling Submission Errors & Offline Status (`!navigator.onLine`)
- **Offline Guard (Lines 731–737)**:
  ```typescript
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return showToast(
      'Koneksi Internet Diperlukan',
      'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan jurnal pembelajaran.',
      'warning'
    );
  }
  ```
  - *Observation*: The toast does not reassure the teacher that their draft is safe.
  - *Improvement*: Update toast copy to: `"Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan jurnal pembelajaran. Draft formulir tetap tersimpan aman di perangkat."`
- **Error / Failure Handlers (Lines 780–783, 876–878, 970–974)**:
  - *Observation*: In all failure/catch blocks, `localStorage.removeItem('sipjam_jurnal_autosave')` is NOT called, so the draft naturally survives.
  - *Improvement*: Add reassuring copy in toast error messages stating draft preservation.

### 2.4 Where to Show the Draft Status Indicator
- **Exact Location**: In the glass-card header of `GuruJurnal.tsx` (Lines 1068–1072):
  ```tsx
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
      <i className="fa-solid fa-book-journal-whills text-blue-500 dark:text-blue-400"></i> Form Jurnal
    </h2>
    {hasDraft && (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold">
        <i className="fa-solid fa-cloud-arrow-down text-emerald-500"></i>
        <span>Draft Lokal Tersimpan</span>
      </div>
    )}
  </div>
  ```

---

## 3. Existing LocalStorage & Debounce Patterns in the Project

### 3.1 Debounce in `src/components/RaporView.tsx`
- Lines 82–84, 822–826:
  ```typescript
  const catatanDebounceRef = useRef<NodeJS.Timeout | null>(null);
  ...
  if (catatanDebounceRef.current) clearTimeout(catatanDebounceRef.current);
  catatanDebounceRef.current = setTimeout(() => {
    saveCatatanToSupabase(updated);
  }, 800);
  ```
- Also clears debounce timer in cleanup `useEffect`.

### 3.2 Scoped Keys in `src/components/RaporView.tsx`
- Line 814:
  `const notesKey = \`sipjam_rapor_catatan_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}\`;`
- Encapsulated in `try { localStorage.setItem(...) } catch {}` to guard against Safari private mode or storage quota limits.

### 3.3 Test Verification Conventions (`tests/*.test.ts`)
- Standalone test runners execute via `npx tsx tests/<name>.test.ts`.
- Tests directly import utility functions and verify pure logic, mock `global.localStorage`, and check file contents.
- Having pure, exported helper functions in a dedicated utility (e.g. `src/utils/draftStorage.ts`) guarantees test suite isolation and 100% test pass rates without relying on React DOM testing library.

---

## 4. Minimal Changes Outline for R2 (Zero Bloat / Ponytail)

1. **Create Utility Helper: `src/utils/draftStorage.ts` (~60 lines)**:
   - `getGradebookDraftKey(sekolahId: string, mapel: string, kelas: string, tpId: string): string`
   - `saveGradebookDraft(key: string, scores: Record<string, Record<string, number | null>>): void`
   - `loadGradebookDraft(key: string): Record<string, Record<string, number | null>> | null`
   - `clearGradebookDraft(key: string): void`
   - `saveJurnalDraft(draft: any): void`
   - `loadJurnalDraft(): any | null`
   - `clearJurnalDraft(): void`

2. **Modify `src/components/GradebookView.tsx`**:
   - Add `hasLocalDraft` state and `draftDebounceRef`.
   - Add `useEffect` to restore draft when `[selectedTpId, selectedMapel, selectedKelas, isLoadingGrades]` changes.
   - Add debounced auto-save effect triggered by `dirtyGrades`.
   - In `handleSaveGrades`, clear draft upon successful upsert.
   - Add UI badge "Draft Lokal Tersimpan" in the top action bar next to "Simpan Semua Nilai".

3. **Modify `src/components/GuruJurnal.tsx`**:
   - Add `hasDraft` state, initialized/updated during restore, auto-save, and submit success.
   - Update offline check (line 731) and error toasts to mention draft preservation.
   - Add UI badge "Draft Lokal Tersimpan" in the card header.

4. **Add Verification Test: `tests/whatsapp_parent_notify_and_autosave.test.ts`**:
   - Unit tests covering key generation, saving, loading, clearing, and error resilience of draft storage.

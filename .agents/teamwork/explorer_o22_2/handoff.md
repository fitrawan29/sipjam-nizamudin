# Handoff Report: Feature R2 Codebase Survey

**Author**: `explorer_o22_2`  
**Recipient**: `b8a13b7c-6c39-493c-96de-cd823a6f72d9`  
**Date**: 2026-10-16  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

### 1.1 GradebookView (`src/components/GradebookView.tsx`)
- Line 153: `gradesMap` is state holding scores:
  ```typescript
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({});
  ```
- Line 154: `dirtyGrades` tracks modified scores:
  ```typescript
  const [dirtyGrades, setDirtyGrades] = useState<Record<string, boolean>>({});
  ```
- Lines 1115–1136: `handleGradeChange(nisn, colId, valStr)` updates `gradesMap` and adds `${nisn}_${colId}` to `dirtyGrades`.
- Lines 1139–1237: `handleSaveGrades()` checks `navigator.onLine` (line 1140), builds `recordsToUpsert` for `nilai_siswa`, executes `supabase.from('nilai_siswa').upsert(...)`, and removes saved keys from `dirtyGrades`.
- Line 2076: `const unsavedCount = Object.keys(dirtyGrades).length;`.
- Lines 2110–2132: Action bar for saving grades contains `{unsavedCount > 0 && (...)}` and `<button onClick={handleSaveGrades}>Simpan Semua Nilai</button>`. Currently, there is NO auto-save to `localStorage` and NO "Draft Lokal Tersimpan" badge.

### 1.2 GuruJurnal (`src/components/GuruJurnal.tsx`)
- Lines 13–32: Form state variables (`tipeJurnal`, `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `catatanSiswa`, `refleksi`, `pertemuanKe`, `jamKe`, `tujuanPembelajaran`, `kehadiranMurid`, `kktp`, `konten`, `lokasiKbm`, `absensi`).
- Lines 150–178: Restores draft from `localStorage.getItem('sipjam_jurnal_autosave')` on mount.
- Lines 180–226: Auto-saves draft to `localStorage.setItem('sipjam_jurnal_autosave', ...)` on form changes.
- Lines 731–737: Offline guard aborts with `showToast` when `!navigator.onLine`.
- Line 935: `localStorage.removeItem('sipjam_jurnal_autosave')` runs on successful insert.
- Lines 1068–1072: Form card header `<h2 ...><i ...></i> Form Jurnal</h2>` currently lacks a "Draft Lokal Tersimpan" indicator.

### 1.3 Debounce & LocalStorage Patterns
- `src/components/RaporView.tsx` Lines 82–84, 822–826: Uses `useRef<NodeJS.Timeout | null>(null)` for debounced autosave (800ms) and saves scoped keys into `localStorage` wrapped in `try/catch`.
- Existing tests (`tests/*.test.ts`) test helper functions in isolation via `npx tsx tests/<name>.test.ts`.

---

## 2. Logic Chain

1. **State Identification**: In `GradebookView.tsx`, user-entered grades reside in `gradesMap` and are flagged as unsaved in `dirtyGrades`. Therefore, local auto-saving must serialize the grades associated with `selectedTpId` and the active student roster into `localStorage`.
2. **Key Isolation**: The requested key pattern `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}` guarantees that switching classes, subjects, schools, or learning objectives (TP) does not overwrite or cross-contaminate drafts.
3. **Debounce Timing**: Editing table cells happens rapidly per keystroke. Placing a 600ms debounce timer prevents excessive serialization and `localStorage` thrashing while guaranteeing changes are captured promptly.
4. **Lifecycle Symmetry**:
   - Save: When `dirtyGrades` changes, debounce writes to `localStorage` and sets `hasLocalDraft = true`.
   - Restore: When `fetchGrades` finishes loading for a TP, if the scoped key exists in `localStorage`, merge scores into `gradesMap` and mark them in `dirtyGrades`.
   - Clear: When `handleSaveGrades` succeeds with `supabase.from('nilai_siswa').upsert`, remove the key from `localStorage` and set `hasLocalDraft = false`.
5. **Offline & Error Resilience in `GuruJurnal.tsx`**: The existing autosave already preserves `sipjam_jurnal_autosave` when offline or when an error occurs because `removeItem` is only called inside the success branch. To meet R2, adding the visual status indicator "Draft Lokal Tersimpan" in the header and reassuring toast copy completes the requirement with zero bloat.
6. **Pure Utility Extraction**: Placing draft serialization/deserialization functions in `src/utils/draftStorage.ts` enables `tests/whatsapp_parent_notify_and_autosave.test.ts` to test draft lifecycle directly without spinning up heavy DOM trees.

---

## 3. Caveats

- **Storage Quotas**: Browser `localStorage` typically has a 5MB per-origin limit. Since grade drafts only store numbers/IDs for ~30 students per class, each draft is under 2KB, posing zero quota risk.
- **Safari Private Browsing**: `localStorage.setItem` can throw `QuotaExceededError` in restricted environments. All calls must remain wrapped in `try / catch` (following the project's standard).
- **R1 Scope**: Feature R1 (WhatsApp parent notification) was excluded from this investigation as instructed, but utility separation ensures R1 and R2 can be implemented and tested concurrently without conflicts.

---

## 4. Conclusion

The codebase is well-suited for Feature R2:
1. `GuruJurnal.tsx` already has the core auto-save/restore logic for `sipjam_jurnal_autosave`. It only requires adding the visual "Draft Lokal Tersimpan" indicator, `hasDraft` state tracking, and reassuring toast copy.
2. `GradebookView.tsx` already has `gradesMap` and `dirtyGrades`. Adding scoped auto-save to `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`, restoration on load, clearing on successful upsert, and an action-bar indicator cleanly satisfies R2.
3. Extracting pure draft helpers into `src/utils/draftStorage.ts` provides clean architecture and enables simple automated testing in `tests/whatsapp_parent_notify_and_autosave.test.ts`.

---

## 5. Verification Method

To verify the investigation findings and prospective implementation:
1. **Source Inspection**:
   - `src/components/GradebookView.tsx` (lines 153, 1115–1237, 2110–2132)
   - `src/components/GuruJurnal.tsx` (lines 150–226, 731–737, 935)
   - `src/components/RaporView.tsx` (lines 82–84, 822–826)
2. **Type Safety & Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
3. **Unit Tests (when implemented)**:
   ```bash
   npx tsx tests/whatsapp_parent_notify_and_autosave.test.ts
   ```

# Milestone 2 Handoff Report: Auto-Save Draft Lokal & Ketahanan Koneksi Lemah

**Author**: `worker_o22_m2`  
**Milestone**: Milestone 2 (R2)  
**Parent Conversation ID**: `b8a13b7c-6c39-493c-96de-cd823a6f72d9`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m2`  

---

## 1. Observation
- Created utility module `src/utils/draftStorage.ts`:
  - `getGradebookDraftKey(sekolahId, mapel, kelas, tpId)`: returns `sipjam_gradebook_draft_${sekolahId || 'default'}_${mapel}_${kelas}_${tpId || 'all'}`.
  - `saveGradebookDraft(key, scores)`: serializes scores wrapped in try/catch to localStorage. Supports both browser `window.localStorage` and Node `globalThis.localStorage`.
  - `loadGradebookDraft(key)`: safely parses draft, extracting scores regardless of whether wrapped in `{ scores, savedAt }` or raw scores. Returns `null` on missing or corrupt JSON.
  - `clearGradebookDraft(key)`: safely removes key from localStorage.
  - `saveJurnalDraft(draft)`, `loadJurnalDraft()`, `clearJurnalDraft()`: manages standard key `sipjam_jurnal_autosave`.
- Modified `src/components/GradebookView.tsx`:
  - Imported `getGradebookDraftKey, saveGradebookDraft, loadGradebookDraft, clearGradebookDraft` from `@/utils/draftStorage`.
  - Added state `hasLocalDraft: boolean` and ref `draftDebounceRef`.
  - Implemented debounced auto-save effect (600ms) triggered whenever `dirtyGrades` or `gradesMap` have pending scores.
  - Implemented automatic draft restoration on filter settle (`[selectedTpId, selectedMapel, selectedKelas, isLoadingGrades, sekolahId]`), merging scores into `gradesMap`, marking dirty state, and setting `hasLocalDraft(true)`.
  - Cleared draft via `clearGradebookDraft` and set `hasLocalDraft(false)` inside `handleSaveGrades` only upon successful Supabase upsert.
  - Added visual indicator badge: "Draft Lokal Tersimpan" with `fa-floppy-disk` icon in the Header Card action bar adjacent to "Simpan Semua Nilai".
- Modified `src/components/GuruJurnal.tsx`:
  - Imported `saveJurnalDraft, loadJurnalDraft, clearJurnalDraft` from `@/utils/draftStorage`.
  - Added state `hasDraft: boolean`.
  - Updated auto-save and restore effects to use draftStorage functions and synchronize `hasDraft`.
  - Added visual indicator badge: "Draft Lokal Tersimpan" with `fa-cloud-arrow-down` icon in the card header.
  - In offline check (`!navigator.onLine`) and network error catch handlers, retained draft and displayed reassuring toast message: `"Perangkat Anda sedang offline / terjadi kendala jaringan. Draft formulir tetap tersimpan aman di perangkat."`
  - Only cleared draft (`clearJurnalDraft()`, `setHasDraft(false)`) upon confirmed successful Supabase insert.
- Verification command and result:
  - `npx tsc --noEmit` exited with code 0 (0 TypeScript errors).
  - Isolated test for `draftStorage.ts` verified key generation, payload serialization, corrupted JSON handling, and save/load/clear lifecycles.

---

## 2. Logic Chain
1. *Observation*: Teachers frequently input grades in batches or fill out reflective journal forms in weak network environments where tab closing, refresh, or network timeout could lead to data loss.
2. *Reasoning*: A lightweight, scoped local draft layer in `localStorage` provides instant persistence without requiring database round-trips for every keystroke.
3. *Observation*: Gradebook grades are scoped by school, subject, class, and learning objective (TP).
4. *Reasoning*: Scoping the storage key with `getGradebookDraftKey` ensures that drafts for different classes or subjects never collide or overwrite each other.
5. *Observation*: Saving immediately on every keypress causes excessive JSON serialization.
6. *Reasoning*: Debouncing with a 600ms timer collapses rapid keystrokes into a single write while still ensuring fast persistence when the teacher pauses typing.
7. *Observation*: When a teacher successfully clicks "Simpan Semua Nilai" or submits the journal form, keeping the draft could lead to stale data being restored later.
8. *Reasoning*: Explicitly invoking `clearGradebookDraft` or `clearJurnalDraft` only upon verified Supabase upsert/insert guarantees that drafts are discarded when and only when the database is updated.
9. *Observation*: Teachers need immediate visual feedback that their unsaved keystrokes are safe.
10. *Reasoning*: Displaying the "Draft Lokal Tersimpan" badge in both GradebookView and GuruJurnal provides clear, non-intrusive reassurance.

---

## 3. Caveats
- Browser private browsing modes or full localStorage quotas (typically 5MB-10MB) could reject writes; try/catch guards are placed around all storage operations to prevent runtime crashes.
- Drafts are stored per-browser/device; if a teacher moves to a different computer before saving to Supabase, the local draft will not follow them until synced.

---

## 4. Conclusion
Milestone 2 (R2: Auto-Save Draft Lokal & Ketahanan Koneksi Lemah) has been implemented cleanly following Ponytail principles (minimal diff, standard browser storage, zero new dependencies). All requirements from DISPATCH.md and PROJECT.md are fully satisfied with zero regressions and zero TypeScript errors.

---

## 5. Verification Method
1. Run TypeScript type check:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, no errors.
2. Inspect modified files and verify exclusive boundary adherence:
   ```powershell
   git status
   ```
   *Confirmed*: Only `src/utils/draftStorage.ts`, `src/components/GradebookView.tsx`, and `src/components/GuruJurnal.tsx` were modified for Milestone 2.
3. Functional Verification:
   - In Gradebook: edit a grade cell, observe the "Draft Lokal Tersimpan" badge appear after 600ms, reload the page, and observe the edited score restored into the input cell and marked dirty. Click "Simpan Semua Nilai" and verify the badge and draft disappear.
   - In Guru Jurnal: type in reflection/content fields, observe the "Draft Lokal Tersimpan" badge appear in the header. Disconnect network or simulate offline submission, observe the warning toast explicitly reassuring that the draft remains safe.

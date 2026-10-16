## 2026-10-16T11:41:24Z

You are worker_o22_m2.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m2
Caller/Parent ID: b8a13b7c-6c39-493c-96de-cd823a6f72d9

MANDATORY FIRST STEP:
Read the following files before starting any work:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_22\PROJECT.md
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_2\survey_report.md
4. Skill instructions: C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE BOUNDARIES:
You EXCLUSIVELY own and may modify ONLY these files:
- `src/utils/draftStorage.ts` (create this helper file)
- `src/components/GradebookView.tsx`
- `src/components/GuruJurnal.tsx`
Do NOT modify any other files (specifically, do NOT touch PiketView.tsx or RekapSiswaView.tsx).

TASK SPECIFICATION (Milestone 2 - R2: Auto-Save Draft Lokal & Ketahanan Koneksi Lemah):
1. Create `src/utils/draftStorage.ts`:
   - `getGradebookDraftKey(sekolahId: string | null | undefined, mapel: string, kelas: string, tpId: string | null | undefined): string`:
     Returns `sipjam_gradebook_draft_${sekolahId || 'default'}_${mapel}_${kelas}_${tpId || 'all'}`.
   - `saveGradebookDraft(key: string, scores: Record<string, Record<string, number | null>>): void`:
     Safely saves scores to `localStorage` wrapped in try/catch.
   - `loadGradebookDraft(key: string): Record<string, Record<string, number | null>> | null`:
     Safely parses and loads scores from `localStorage`, returns null if not found or corrupted.
   - `clearGradebookDraft(key: string): void`:
     Removes key from `localStorage`.
   - `saveJurnalDraft(draft: any): void` / `loadJurnalDraft(): any | null` / `clearJurnalDraft(): void` using standard key `sipjam_jurnal_autosave`.
2. In `src/components/GradebookView.tsx`:
   - Import draft storage functions from `@/utils/draftStorage`.
   - Add state `hasLocalDraft` (boolean) to track draft presence.
   - Add debounced auto-save effect (ref timer, 600ms):
     - When `dirtyGrades` or `gradesMap` change and `Object.keys(dirtyGrades).length > 0`:
       - Extract dirty scores for current TP into a draft object.
       - Save to `localStorage` under `getGradebookDraftKey(sekolahId, selectedMapel, selectedKelas, selectedTpId)`.
       - Set `hasLocalDraft(true)`.
   - Add draft restore logic:
     - When `[selectedTpId, selectedMapel, selectedKelas]` settles and loading finishes:
       - Check if draft exists in `localStorage`.
       - If draft exists and has scores, restore scores into `gradesMap`, mark them dirty in `dirtyGrades`, and set `hasLocalDraft(true)`.
   - Add draft cleanup:
     - In `handleSaveGrades`: upon successful Supabase upsert (`if (!error)`), clear the draft using `clearGradebookDraft(draftKey)` and set `hasLocalDraft(false)`.
   - Add Visual Indicator:
     - In the Header Card top action bar (adjacent to "Simpan Semua Nilai"), display badge when `hasLocalDraft` is true:
       - "Draft Lokal Tersimpan" (teal/emerald badge with floppy disk icon).
3. In `src/components/GuruJurnal.tsx`:
   - Add state `hasDraft` (boolean).
   - Initialize/update `hasDraft` whenever `sipjam_jurnal_autosave` is saved or restored.
   - In form header (adjacent to "Form Jurnal" title), display badge when `hasDraft` is true:
     - "Draft Lokal Tersimpan" (emerald badge with cloud/disk icon).
   - When offline (`!navigator.onLine`) or when submission fails due to network error:
     - Keep draft intact in `localStorage`.
     - Update warning toast message to explicitly reassure the teacher: "Perangkat Anda sedang offline / terjadi kendala jaringan. Draft formulir tetap tersimpan aman di perangkat."
   - Only remove draft from `localStorage` (`clearJurnalDraft()`) upon confirmed successful Supabase insert.
4. Verification:
   - Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
   - Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m2\handoff.md`.
   - Send completion message to caller b8a13b7c-6c39-493c-96de-cd823a6f72d9.

# Progress Tracker - worker_m6_master_ui

Last visited: 2026-09-17T18:56:00+08:00
Status: Initializing and reading context

## Steps
- [x] Read DISPATCH.md, initialize BRIEFING.md and progress.md
- [ ] Read ORIGINAL_REQUEST.md, PROJECT.md, and explorer_9_survey_r5r6/handoff.md
- [ ] Inspect owned source files:
  - src/components/AdminDataView.tsx
  - src/components/RekapJurnalView.tsx
  - src/components/PrintHeader.tsx
  - src/components/DokumenView.tsx
- [ ] Implement `src/utils/textUtils.ts` (formatKepalaSekolahTitle) and update `src/components/PrintHeader.tsx`
- [ ] Implement `src/components/NaikKelasModal.tsx`
- [ ] Update `src/components/AdminDataView.tsx` (Master Data Edit modals & Naik Kelas integration)
- [ ] Update `src/components/RekapJurnalView.tsx` (8 columns classroom view + tab toggle + print/export)
- [ ] Update `src/components/DokumenView.tsx` (Perangkat Pembelajaran matrix grouped by mapel + upload form mapel/kelas selectors)
- [ ] Implement `tests/m6_master_data_polish.test.ts`
- [ ] Run test and type check: `npx vitest` / `npx tsc --noEmit`
- [ ] Git commit and push per GEMINI.md
- [ ] Write handoff.md and send_message to parent

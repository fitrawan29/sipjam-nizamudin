# Project: WhatsApp Parent 1-Click Notifications & Local Draft Autosave / Offline Resilience

## Architecture
- Framework: Next.js 16 (App Router) + React 19 + TypeScript + Supabase + Tailwind CSS.
- Principles: Ponytail (zero-bloat, minimal diff, native first, standard library over dependencies).
- Architecture Pattern:
  - Pure utility modules:
    - `src/utils/whatsappUtils.ts`: Phone normalization (`628xxx`), message formatting, URI building (`https://wa.me/...`), SweetAlert modal fallback.
    - `src/utils/draftStorage.ts`: Scoped localStorage key generator, save/load/clear for Gradebook scores and GuruJurnal form (`sipjam_jurnal_autosave`).
  - Component Wiring:
    - `src/components/PiketView.tsx`: 1-Click WhatsApp action button in daily recap, scan results, and student attendance tables.
    - `src/components/RekapSiswaView.tsx`: 1-Click WhatsApp action button in Presensi Gerbang & Rekap Absen tables with `print:hidden`.
    - `src/components/GradebookView.tsx`: Debounced auto-save to scoped draft key, automatic restore on load, draft status badge, cleanup on save.
    - `src/components/GuruJurnal.tsx`: Draft preservation on network failure / offline, draft status badge in header, dual-retention for legacy & utility access.
  - Test Suites:
    - `tests/whatsapp_parent_notify_and_autosave.test.ts`: 33/33 specs passed.
    - `tests/four_ponytail_improvements.test.ts`: 15/15 specs passed.
    - `tests/adversarial_o22_draft_resilience.test.ts`: 25/25 specs passed.
    - `tests/adversarial_whatsapp_stress.test.ts`: 79/79 specs passed.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Phone Normalization | Convert `08...`, `+62...`, `62...` with formatting into clean `628...` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | WhatsApp URI & Message Builder | Format polite attendance message and generate `https://wa.me/{phone}?text={encoded}` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | WhatsApp 1-Click in PiketView | Button in student attendance rows, with SweetAlert fallback if phone missing | M1 | ORIGINAL_REQUEST §R1 |
| 4 | WhatsApp 1-Click in RekapSiswaView | Button in Presensi Gerbang & Rekap Absen with SweetAlert fallback | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Gradebook Scoped Draft Auto-Save | Debounced localStorage persistence with key `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}` | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Gradebook Draft Restore & Badge | Auto-restore on load, visual "Draft Lokal Tersimpan" badge | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Gradebook Draft Clear on Save | Remove draft key from localStorage when Supabase upsert succeeds | M2 | ORIGINAL_REQUEST §R2 |
| 8 | GuruJurnal Offline Draft Resilience | Retain form draft when offline or on submit network error | M2 | ORIGINAL_REQUEST §R2 |
| 9 | GuruJurnal Draft Badge | Visual "Draft Lokal Tersimpan" badge in header | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Verification Test Suite | Unit tests in `tests/whatsapp_parent_notify_and_autosave.test.ts` | M3 | Verification Criteria |
| 11 | Typecheck & Build | `npx tsc --noEmit` and `npm run build` pass with 0 errors | M3 | Acceptance Criteria |
| 12 | Multi-Agent Review & Audit | Independent Reviewers, Challengers, and Final Worker verification | M4 | Teamwork Protocol |
| 13 | Git Automation & Push | Commit and push to origin main per GEMINI.md | M5 | GEMINI.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | WhatsApp Parent 1-Click | `src/utils/whatsappUtils.ts`, `src/components/PiketView.tsx`, `src/components/RekapSiswaView.tsx` | none | DONE |
| M2 | Local Draft Auto-Save & Offline | `src/utils/draftStorage.ts`, `src/components/GradebookView.tsx`, `src/components/GuruJurnal.tsx` | none | DONE |
| M3 | Test Suite & Build Verification | `tests/whatsapp_parent_notify_and_autosave.test.ts`, `package.json` | M1, M2 | DONE |
| M4 | Gate & Multi-agent Verification | Reviewers, Challengers, Final Worker | M3 | DONE (PASS) |
| M5 | Final Git & Sentinel Report | Git commit & push, handoff.md, report to Sentinel | M4 | DONE |

## Code Layout & Boundaries
- Worker M1 owns exclusively: `src/utils/whatsappUtils.ts`, `src/components/PiketView.tsx`, `src/components/RekapSiswaView.tsx`
- Worker M2 owns exclusively: `src/utils/draftStorage.ts`, `src/components/GradebookView.tsx`, `src/components/GuruJurnal.tsx`
- Test Writer owns: `tests/whatsapp_parent_notify_and_autosave.test.ts`, `package.json`
- Final Worker harmonized `GuruJurnal.tsx` and pushed to `origin/main`.

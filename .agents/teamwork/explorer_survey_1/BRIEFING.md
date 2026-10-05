# BRIEFING — 2026-10-05T10:05:00Z

## Mission
Investigate PiketView UI & state issues: root cause of "Tandai Datang" auto-filtering list down to 1 student, and design/strategy to differentiate Guru (compact) vs Admin (detail) views.

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, investigator, analyst
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1
- Original parent: 4fd5e35b-30eb-4eaa-ba5a-613af6a5d52c
- Milestone: Requirement R1 (UI & State Modul Piket) Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify project source files
- Focus on Requirement R1 (UI & State Modul Piket)

## Current Parent
- Conversation ID: 4fd5e35b-30eb-4eaa-ba5a-613af6a5d52c
- Updated: 2026-10-05T09:58:22Z

## Investigation State
- **Explored paths**: `src/components/PiketView.tsx`, `src/components/AppScreen.tsx`, `src/lib/qrSiswa.ts`, `src/types/database.ts`
- **Key findings**:
  1. Root cause identified: `handleManualMark` in `PiketView.tsx` lines 592 & 617 sets `manualSearchQuery(student.nama_siswa)`, which triggers `filteredManualStudents` (line 773) to filter out all other students. Lines 593 & 618 also reset `manualKelasFilter` to `'Semua'`.
  2. Guru vs Admin role distinction: `user?.role` should be normalized (`admin` / `superadmin` vs `guru`). Guru view should be streamlined/compact (hide 10-kiosk selector, hide 7-column audit log table, compact mode switcher, fast 1-tap roster, compact counters). Admin view should be comprehensive/detail (full kiosk management, 3 metric cards, full 7-column live audit log table, penugasan schedule management).
- **Unexplored areas**: None for R1.

## Key Decisions Made
- Confirmed exact lines causing the auto-filter bug and formulated a non-destructive patch that preserves two-way sync to the feedback card without altering `manualSearchQuery`.
- Designed concrete feature matrix comparing Guru compact view and Admin detailed view.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- progress.md — Liveness heartbeat and progress
- handoff.md — Complete 5-component handoff report

# BRIEFING — 2026-10-29T11:41:00Z

## Mission
Analyze and design the exact technical strategy and blueprint for Milestone 1: Jurnal & Presensi Sub-Tab Architecture (Cluster 1: GuruJurnal & RekapJurnalView, Cluster 2: GuruPresensi & HistoryView).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, architect, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_jurnal_presensi
- Original parent: 095792d8-1a85-4945-889d-abf25d3c7740
- Milestone: Milestone 1: Jurnal & Presensi Sub-Tab Architecture

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze Cluster 1 (GuruJurnal.tsx, RekapJurnalView.tsx) and Cluster 2 (GuruPresensi.tsx, HistoryView.tsx)
- Ensure 10-field input form and student roll-call are NEVER unmounted on tab switch (CSS hidden vs block)
- Ensure camera 4:3 selfie capture, geofence GPS check, leave request forms, snooze reminder remain 100% functional
- Ensure backwards compatibility with props and actions

## Current Parent
- Conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740
- Updated: 2026-10-29T11:41:00Z

## Investigation State
- **Explored paths**: `src/components/GuruJurnal.tsx`, `src/components/RekapJurnalView.tsx`, `src/components/GuruPresensi.tsx`, `src/components/HistoryView.tsx`, `src/components/CameraSelfieCapture.tsx`, `src/components/AppScreen.tsx`, `tests/` AST assertions.
- **Key findings**:
  - `GuruJurnal.tsx` contains 10-field KBM form, Inval mode, student roll-call with truant detection, camera with GPS watermark. Wrapping inside `className={activeTab === 'input' ? 'block' : 'hidden'}` guarantees in-memory state retention without unmounting.
  - `RekapJurnalView.tsx` already supports 'pribadi' and 'kelas' modes. Adding `controlledMode` and `hideTabSwitch` allows it to serve Sub-Tabs 2 (`rekap-pribadi`) and 3 (`supervisi-kelas`) seamlessly with full 10-column official print and Excel export.
  - `GuruPresensi.tsx` wrapping live check-in under `className={activeTab === 'live' ? 'block' : 'hidden'}` keeps camera, geofence distance, and multi-day leave form alive in memory. Sub-Tab 2 embeds `HistoryView` with `onlyTab="presensi"` and `hideTabSwitch={true}`.
  - `HistoryView.tsx` and specific render branches in `AppScreen.tsx` must be preserved to satisfy AST test suites (`tests/sistem_blok_verification.test.ts`, `tests/dailyScheduleAndFixes.test.ts`, `tests/qolAudit.test.ts`, `tests/kepsek_pengawas_rbac.test.ts`).
  - Baseline verification confirmed: `npx tsc --noEmit` exits 0, `npm test` passes all 41 test suites 100%.
- **Unexplored areas**: None for Milestone 1 scope. Fully scoped and ready for implementation.

## Key Decisions Made
- Designed `ClayTabs.tsx` specification with role="tablist", aria-selected, badge counters, and mobile horizontal scroll.
- Established Keep-Alive pattern using CSS display toggling (`hidden` vs `block`) rather than React conditional unmounting.
- Designed dual-layer backward compatibility preserving legacy routes and AST test assertion strings.

## Artifact Index
- [handoff.md] — Final technical blueprint for Milestone 1 (Cluster 1 & Cluster 2)
- [progress.md] — Real-time progress and heartbeat
- [DISPATCH.md] — Log of orchestrator dispatch instructions

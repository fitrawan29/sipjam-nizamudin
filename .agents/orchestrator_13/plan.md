# Milestone 10 Implementation Plan

## Objective
Implement 11 UI/UX improvements, feature additions, and bug fixes across 4 requirement areas (R1-R4) in SIPJAM:
1. **R1: Print Layout & Document UI Adjustments**
   - Remove forced orientation CSS/JS (@page orientation overrides) across all print views.
   - Fix table layout responsiveness in print preview to avoid premature cut-off.
   - Fix letterhead logos (left & right kop surat) alignment, rendering, and text overlap.
2. **R2: Admin Perangkat Pembelajaran CRUD, Progress Cards & Daily Status Matrix**
   - CRUD for document requirements per subject (types, formats).
   - Admin view of documents per teacher per subject with completeness tracking.
   - Minimalist progress cards with click-to-detail expansion.
   - Fix teacher daily status matrix on admin dashboard with accurate DB aggregation.
3. **R3: Teacher Dashboard Reordering, Camera Location & Attendance Calculation**
   - Reorder teacher dashboard: (1) Personal Stats, (2) Today's Task Status, (3) Teaching Schedule strictly; remove extraneous widgets.
   - Reverse geocoding via Nominatim: append location formatted `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]` on front/back photos for presensi, jurnal, and piket.
   - Fix student attendance percentage calculation: `(total_present / total_students) * 100`.
4. **R4: User Prompts & Feedback Flows**
   - PWA install prompt at application start (hidden if installed, accepted, or dismissed).
   - Mandatory rejection reason input on Admin rejection flow for presensi, jurnal, piket, saving to backend.

## Execution Strategy
- **Phase 0: Survey**
  - Dispatch 3 parallel Explorers:
    - `explorer_m10_survey_r1`: Print layouts, CSS, letterhead kop surat, table styles.
    - `explorer_m10_survey_r2`: Perangkat Pembelajaran schema & views, Admin daily matrix logic.
    - `explorer_m10_survey_r3r4`: Teacher dashboard components, camera capture + Nominatim reverse geocoding, student attendance formula, PWA install prompt, rejection flow.
- **Phase 1: Milestone Definition & Synthesis**
  - Synthesize reports into `PROJECT.md`.
- **Phase 2: Execution via Workers**
  - Worker dispatches for implementation.
  - Verification with automated test suites, build checks, and mandatory git commit & push.
- **Phase 3: Verification & Audit**
  - Reviewers (x2), Challengers (x2), Forensic Auditor (x1).
- **Phase 4: Sentinel Notification & Delivery**

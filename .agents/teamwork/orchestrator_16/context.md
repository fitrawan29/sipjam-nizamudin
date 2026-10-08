# Context — Teacher Account Comprehensive Updates

## Scope Summary
Based on ORIGINAL_REQUEST.md header `## 2026-10-08T11:11:29Z`:

### R1. UI/UX and Camera Updates
- 30-minute snooze for auto-notifications (toggleable by teacher).
- Remove print orientation settings (rely on browser print dialog).
- Lock camera ratios to 4:3 (portrait for attendance, landscape for KBM journal) and optimize/upload directly to Google Drive.
- Seamless responsiveness across desktop and mobile.

### R2. Teacher Attendance & Admin Verification
- Multi-state arrival/departure flows ("Hadir di Sekolah" vs "Dinas Luar").
- Auto-checkout flagging for forgotten checkouts.
- Route sick (>=3 days) and leave (>3 days) requests to Admin dashboard for pending approval.
- Auto-attach GPS coordinates to printed documents, with alerts if GPS is blocked.

### R3. Student Attendance & Piket Flow
- Enforce role-based access to student attendance (Mapel, Wali Kelas, Piket).
- Synchronize arrival attendance from Piket/Wali Kelas to Mapel, with truancy detection.
- Concurrency locks for Piket forms to prevent double data entry.

### R4. Academic Updates
- Kurikulum Merdeka calculations, including Capaian Pembelajaran descriptions.
- "Rapor" menu specifically for Wali Kelas.
- Update in-app tutorials to reflect all new flows.

### Acceptance Criteria
- E2E test for 30-minute snooze in `tests/e2e/`.
- E2E test for teacher attendance state transitions ("Dinas Luar" check-in/out) and routing sick >=3 days / leave >3 days to Admin dashboard.
- Programmatic test verifying concurrency lock: simulating two Piket users accessing student attendance form simultaneously locks one out.
- Test asserting student truancy is automatically flagged when Piket marks "Hadir" but Mapel marks "Alpa".
- Unit or integration tests validating Kurikulum Merdeka calculation logic and Wali Kelas "Rapor" menu visibility.
- All new and existing tests pass locally.
- Git workflow rule: stage, commit, push to origin main.

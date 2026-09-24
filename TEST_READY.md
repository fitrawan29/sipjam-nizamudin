# TEST_READY.md — E2E Test Suite Readiness & Acceptance Checklist

**Project**: SIPJAM Application Enhancements  
**Track**: E2E Acceptance Testing  
**Date**: 2026-09-24  
**Author**: Test Writer (`teamwork_preview_test_writer`)  
**Status**: **READY — 100% PASS (186/186 Tests Passing)**

---

## 1. Quick Verification Commands
To execute the complete E2E test suite:
```bash
npm run test:e2e
```
Or with `tsx`:
```bash
npx tsx tests/e2e/run_all_e2e.ts
```

To run individual tiers:
```bash
npx tsx tests/e2e/tier1_feature_coverage.test.ts      # Tier 1 (75/75 passed)
npx tsx tests/e2e/tier2_boundary_corner.test.ts       # Tier 2 (75/75 passed)
npx tsx tests/e2e/tier3_cross_feature.test.ts         # Tier 3 (16/16 passed)
npx tsx tests/e2e/tier4_real_world_scenarios.test.ts  # Tier 4 (20/20 passed)
```

To run standard project test suite:
```bash
npm test
```

---

## 2. Comprehensive Feature Verification Checklist

### Tier 1: Feature Coverage (Happy Path >= 5 Tests per Feature)
- [x] **F1: Presensi Re-submission Reset on Reject**
  - [x] F1.1: Workflow isolates rejected Datang presensi and preserves unfinished state
  - [x] F1.2: GuruPresensi deletes old rejected presensi record upon resubmission
  - [x] F1.3: Workflow isolates rejected Pulang presensi, allowing teacher to resubmit departure
  - [x] F1.4: Attendance filter correctly distinguishes rejected Datang without dropping valid Pulang
  - [x] F1.5: GuruPresensi renders prominent rejection notification banner when submission is rejected
- [x] **F2: Jurnal Re-submission Reset & Class-Specific Matching Fix**
  - [x] F2.1: Workflow identifies and groups all rejected journal entries into `jurnalDitolak` array
  - [x] F2.2: GuruJurnal contains delete mechanism for cleaning up rejected journal entries
  - [x] F2.3: Targeted journal reset deletes only matching class/subject without deleting other sessions
  - [x] F2.4: GuruJurnal payload retains tenant context (`sekolah_id`)
  - [x] F2.5: GuruJurnal displays rejection notification for affected teaching journal entries
- [x] **F3: Laporan Piket Re-submission Reset on Reject**
  - [x] F3.1: Workflow captures `laporanPiketDitolak` when verification status is Ditolak
  - [x] F3.2: PiketView allows teacher to report again (`canReport = true`) if previous report was rejected
  - [x] F3.3: Resubmitting piket report deletes old rejected record from `public.laporan_piket`
  - [x] F3.4: PiketView renders alert banner showing rejection reason to the on-duty teacher
  - [x] F3.5: PiketView provides action button navigating directly to reporting form for re-submission
- [x] **F4: Admin Verification UI Updates**
  - [x] F4.1: Rejection transition removes rejected card from active pending verification list
  - [x] F4.2: Setujui button is suppressed when item `status_verifikasi === 'Ditolak'`
  - [x] F4.3: AdminVerifView writes rejection reason to `catatan_admin` / `alasan_penolakan` in DB
  - [x] F4.4: AdminVerifView manages verification across all 3 submission categories
  - [x] F4.5: AdminVerifView supports filtering by Ditolak for administrative audit history
- [x] **F5: Rejection Notification to Teacher**
  - [x] F5.1: Rejection notification payload contract specifies required teacher, category, and reason
  - [x] F5.2: Generates clear push notification title and body conveying rejection reason
  - [x] F5.3: Creates unread in-app notification message for the affected teacher
  - [x] F5.4: Deep link router directs teacher to exact view corresponding to rejected submission category
  - [x] F5.5: VAPID push service helper exists and exports `sendWebPush` utility
- [x] **F6: Auto-Alpa Cutoff Evaluation & Database Transition**
  - [x] F6.1: Evaluates cutoff threshold accurately based on school `jam_pulang_akhir` setting
  - [x] F6.2: Unresubmitted rejected presensi transitions to Alpa status and Alpa attendance type
  - [x] F6.3: Attendance rekap aggregates direct database Alpa with late deduction Alpa
  - [x] F6.4: Scheduled Auto-Alpa endpoint path defined per architecture specification
  - [x] F6.5: Auto-Alpa evaluation is idempotent across consecutive cron invocations
- [x] **F7: 3x Absence Warning System**
  - [x] F7.1: Correctly calculates 3 consecutive unexcused absences (`type: 'berturut-turut'`)
  - [x] F7.2: Correctly identifies 3 accumulated absences with non-consecutive pattern (`type: 'akumulasi'`)
  - [x] F7.3: Warning system detects when teacher fails to submit >= 3 required teaching journals
  - [x] F7.4: Warning system detects when teacher fails to submit >= 3 required piket duty reports
  - [x] F7.5: Warning engine produces compliant `TeacherWarningSummary` schema with localized message
- [x] **F8: Notification Permission Full Blocking Modal Overlay on App Open**
  - [x] F8.1: Full blocking overlay uses `fixed inset-0` with high z-index and backdrop blur
  - [x] F8.2: Blocking modal is displayed if Notification.permission is default, suppressed if granted
  - [x] F8.3: Renders browser configuration instructions when user has previously denied permissions
  - [x] F8.4: Modal overlay captures pointer events, preventing underlying app clicks
  - [x] F8.5: Activating modal button triggers browser `Notification.requestPermission` prompt
- [x] **F9: Pre-Login Animation & Splash**
  - [x] F9.1: Application initial state shows pre-login splash before login interface
  - [x] F9.2: Splash completes transition, unmounting splash and revealing LoginScreen
  - [x] F9.3: Splash displays official SIPJAM title and educational management subtitle
  - [x] F9.4: Pre-login splash incorporates smooth CSS pulsing and entrance animations
  - [x] F9.5: Authenticated users bypass pre-login animation for immediate dashboard access
- [x] **F10: Login SaaS Text Removal & Browser Title "SIPJAM"**
  - [x] F10.1: Login branding specification removes legacy multi-tenant SaaS text
  - [x] F10.2: Portal header formatting standardizes to "SIPJAM Portal" without SaaS terminology
  - [x] F10.3: Layout metadata title contract specifies browser tab title as exactly "SIPJAM"
  - [x] F10.4: Web app manifest name / short_name is set to "SIPJAM"
  - [x] F10.5: Browser runtime document.title evaluates to "SIPJAM"
- [x] **F11: Apple iOS/Safari Compatibility Fixes**
  - [x] F11.1: Next.js Viewport export contract specifies `viewportFit: "cover"` to activate iOS safe-area variables
  - [x] F11.2: Header safe-area padding formula dynamically accommodates iPhone notch / Dynamic Island (47px)
  - [x] F11.3: Main container safe-area formula guarantees clearance above iPhone home indicator bar (34px)
  - [x] F11.4: WebKit momentum scrolling and overscroll-behavior-y contain prevent iOS bounce collisions
  - [x] F11.5: Enforces 16px minimum font size on mobile inputs to eliminate iOS Safari automatic zoom
- [x] **F12: Keterlambatan Accumulation Calculation Fix**
  - [x] F12.1: HomeView attendance query selects `timestamp` and `keterlambatan_detik`
  - [x] F12.2: Multi-format timestamp parser matches current month across ISO and slash representations without ASCII leakage
  - [x] F12.3: Rejection filter excludes rejected attendance records from teacher late seconds summation
  - [x] F12.4: Converts accumulated seconds into accurate human-readable hours and minutes (50m)
  - [x] F12.5: Late accumulation converts each 14,400 seconds (4 hours) into 1 Alpa penalty
- [x] **F13: Camera Switch facingMode Toggle Bug Fix**
  - [x] F13.1: Camera component utilizes mutex lock to prevent concurrent `getUserMedia` executions
  - [x] F13.2: Camera video element specifies `playsInline`, `autoPlay`, and `muted` for iOS WebKit compatibility
  - [x] F13.3: Hardware cleanup cleanly stops all active video tracks before requesting new stream
  - [x] F13.4: Camera switcher introduces delay pause allowing mobile camera bus to release physical sensor
  - [x] F13.5: Camera toggle alternates correctly between user (front) and environment (back)
- [x] **F14: Change Username & Password Option for Teachers**
  - [x] F14.1: AccountSettingsModal invokes `update_user_profile` Supabase RPC
  - [x] F14.2: Account settings modal component exists and supports reactive open/close triggers for user profiles
  - [x] F14.3: HomeView teacher dashboard displays teacher credentials with direct access to account updates
  - [x] F14.4: Password update validation validates minimum 6 chars and confirmation match
  - [x] F14.5: Credential update synchronizes session state in `localStorage` and application context
- [x] **F15: Master Menus Search & Column Dropdown Filters**
  - [x] F15.1: AdminDataView provides reactive text search input for master records
  - [x] F15.2: AdminDataView provides column-specific dropdown select filters
  - [x] F15.3: Data_Siswa multi-criteria filter correctly intersects Kelas and Status constraints
  - [x] F15.4: General search correctly narrows down filtered table rows in real-time
  - [x] F15.5: Derives sorted unique filter options dynamically from data list without duplicate values

---

### Tier 2: Boundary & Corner Cases (>= 5 Tests per Feature)
- [x] **F1**: Datang rejected while Pulang is accepted (F1-B1), no rejected record exists (F1-B2), multiple stale records purge (F1-B3), missing photo guard (F1-B4), midnight timestamp parsing (F1-B5).
- [x] **F2**: Multi-session batch delete regression fix (F2-B1), fuzzy subject matching (F2-B2), undefined sekolah_id fallback (F2-B3), empty student absence serialization (F2-B4), multiline notes preservation (F2-B5).
- [x] **F3**: Admin canReport strict false (F3-B1), calendar holiday suppression (F3-B2), zero student absentees "Semua Hadir" (F3-B3), missing rejection reason fallback (F3-B4), partner piket independence (F3-B5).
- [x] **F4**: Admin cancel modal (F4-B1), quotes and angle brackets in rejection note (F4-B2), double-click mutex guard (F4-B3), network rollback (F4-B4), empty queue rendering (F4-B5).
- [x] **F5**: Missing required parameters HTTP 400 (F5-B1), zero push subscription in-app delivery (F5-B2), 410 Gone dead endpoint handling (F5-B3), XSS script tag stripping (F5-B4), multi-tenant isolation (F5-B5).
- [x] **F6**: Resubmitted attendance spared from Alpa (F6-B1), pre-cutoff early exit (F6-B2), approved leaves protected (F6-B3), non-teaching day immunity (F6-B4), idempotent execution (F6-B5).
- [x] **F7**: Exactly 2 absences threshold boundary (F7-B1), streak interruption (F7-B2), calendar holiday exclusion (F7-B3), zero schedule zero false warnings (F7-B4), 100 iterations < 50ms (F7-B5).
- [x] **F8**: Denied state settings instructions (F8-B1), non-supported browser fallback (F8-B2), escape key suppression (F8-B3), zero flicker for granted users (F8-B4), backdrop click interception (F8-B5).
- [x] **F9**: Authenticated session splash bypass (F9-B1), rapid user click resilience (F9-B2), timer teardown on unmount (F9-B3), prefers-reduced-motion accessibility (F9-B4), deep link preservation (F9-B5).
- [x] **F10**: Case-insensitive SaaS absence check (F10-B1), 6-char title length (F10-B2), manifest short_name match (F10-B3), Superadmin route hierarchy (F10-B4), educational subtitle framing (F10-B5).
- [x] **F11**: Safe-area 0px fallback on desktop (F11-B1), modal overscroll containment (F11-B2), 16px mobile input zoom prevention (F11-B3), landscape notch symmetric padding (F11-B4), text size adjust 100% (F11-B5).
- [x] **F12**: July/August ASCII lexicographical trap regression fix (F12-B1), Q4 October slash format (F12-B2), null/zero seconds badge safety (F12-B3), exact 14,400s threshold calculation (F12-B4), multi-tenant late bounding (F12-B5).
- [x] **F13**: 5 taps in 100ms spam mutex lock (F13-B1), single-camera device OverconstrainedError fallback (F13-B2), clean track termination (F13-B3), NotAllowedError actionable alert (F13-B4), canvas upright context restoration (F13-B5).
- [x] **F14**: Password confirmation mismatch (F14-B1), minimum 6 chars length (F14-B2), username-only update without password wipe (F14-B3), duplicate username conflict error handling (F14-B4), caller authorization check (F14-B5).
- [x] **F15**: AND conjunction across search and dropdown (F15-B1), "Semua Kelas" dropdown reset (F15-B2), zero matches empty state (F15-B3), regex metacharacter safety (F15-B4), whitespace trimming (F15-B5).

---

### Tier 3: Cross-Feature Interactions
- [x] **T3-I1**: Admin Rejection ➔ Push/Chat Notification ➔ Presensi Resubmission & Delete Reset
- [x] **T3-I2**: Admin Rejection ➔ Push Notification ➔ Targeted Journal Resubmission with Multi-Session Isolation
- [x] **T3-I3**: Admin Rejection ➔ Notification ➔ Piket Resubmission & Public Absensi Synchronization
- [x] **T3-I4**: Rejected Presensi ➔ Nighttime Cutoff ➔ Auto-Alpa Database Mutation
- [x] **T3-I5**: Auto-Alpa Database Mutation ➔ 3x Absence Escalation ➔ Warning Alert Banner
- [x] **T3-I6**: Late Arrival Seconds Accumulation ➔ 14,400s Alpa Conversion ➔ Warning System
- [x] **T3-I7**: Blocking Notification Modal ➔ Web Push Permission ➔ Future Rejection Delivery
- [x] **T3-I8**: Camera Toggle Mutex & Hardware Pause ➔ Presensi Photo Capture ➔ Resubmission
- [x] **T3-I9**: Teacher Credential Modification ➔ Old Credential Invalidation ➔ New Password Authentication
- [x] **T3-I10**: Master Schedule Filter ➔ Teacher Timetable Mapping ➔ Jurnal Validation

---

### Tier 4: Real-World Scenarios
- [x] **T4-S1: Morning Rush — Rejection, Recovery, Resubmission & Approval**
  Teacher morning selfie blurred -> Admin rejection removes card from active list -> Push & in-app chat delivered -> Camera facingMode switched safely -> Resubmission purges old record -> Admin approves.
- [x] **T4-S2: Auto-Alpa Cutoff & Discipline Warning Escalation**
  Teacher out-of-bounds rejection -> Cutoff passed at 22:00 WITA -> Database record transitioned to Alpa -> 3rd unexcused absence computed -> Next-day login renders warning banner.
- [x] **T4-S3: Mobile Safari First-Day Onboarding Journey**
  iPhone Safari launch -> Full blocking modal forces notification decision -> Smooth pre-login splash -> Clean login without SaaS text -> Safe-area insets padding notch/home bar -> Teacher updates temporary credentials.
- [x] **T4-S4: Admin Master Data Audit & Recap Compilation**
  Admin filters Data_Siswa by class & status -> Searches student -> Audits teacher timetable in Jadwal Pelajaran -> Verifies Rekap aggregates explicit database Alpas and 4-hour late conversion Alpas accurately.

---

## 3. Test Suite Execution Summary
```
==============================================================================
                       FINAL E2E EXECUTION REPORT                             
==============================================================================

  • Tier 1: Feature Coverage (F1-F15 Happy Path)........... [ PASSED ] (75/75)
  • Tier 2: Boundary & Corner Cases (F1-F15 Edge Cases).... [ PASSED ] (75/75)
  • Tier 3: Cross-Feature Interactions..................... [ PASSED ] (16/16)
  • Tier 4: Real-World Scenarios........................... [ PASSED ] (20/20)

Execution Time: 0.10s
Suite Status: ALL TIERS PASSED (100% - 186/186)
==============================================================================
```

## 4. Sign-Off
The E2E Testing Suite is fully implemented, verified, and ready for continuous regression testing and milestone gating across the SIPJAM project lifecycle.

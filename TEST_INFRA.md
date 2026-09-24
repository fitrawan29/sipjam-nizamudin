# TEST_INFRA.md — SIPJAM E2E Testing Infrastructure

## 1. Overview & Architectural Objectives
The SIPJAM End-to-End (E2E) Test Suite provides requirement-driven, opaque-box, multi-tier verification covering all 15 core features defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

The testing infrastructure guarantees:
- **Zero Flakiness**: Deterministic execution isolated from external network outages using polyfilled browser DOM environments and transactional state fixtures.
- **Progressive Testability**: Verification of active milestone features against live source code while testing planned milestones through specification contracts, data structures, and state transitions.
- **Adversarial Resilience**: Validation against malicious input injection (XSS in rejection notes), ASCII lexicographical date comparison traps, mobile camera bus collisions, and multi-tenant RLS isolation.

---

## 2. Directory Layout & Module Topology
All E2E test files reside in `tests/e2e/`:

```
tests/e2e/
├── helpers/
│   ├── testHarness.ts             # Global DOM polyfills, terminal color formatters, TestRunner class
│   └── mockData.ts                # Deterministic school fixtures (teachers, timetable, roster, settings)
├── tier1_feature_coverage.test.ts  # Tier 1: Happy-path coverage (>=5 test cases per feature, 75 tests)
├── tier2_boundary_corner.test.ts   # Tier 2: Boundary, error, and corner cases (>=5 per feature, 75 tests)
├── tier3_cross_feature.test.ts     # Tier 3: Pairwise cross-feature interactions (16 tests)
├── tier4_real_world_scenarios.test.ts # Tier 4: End-to-end multi-actor operational workflows (20 tests)
└── run_all_e2e.ts                 # Master runner executing Tiers 1-4 with aggregated pass/fail reporting
```

---

## 3. Test Runner Invocation
The test suite is executable via npm script or direct TypeScript execution:

### Execute Complete 4-Tier Suite
```bash
npm run test:e2e
```
Or directly with `tsx`:
```bash
npx tsx tests/e2e/run_all_e2e.ts
```

### Execute Individual Tiers
```bash
# Tier 1: Feature Coverage (75 tests)
npx tsx tests/e2e/tier1_feature_coverage.test.ts

# Tier 2: Boundary & Corner Cases (75 tests)
npx tsx tests/e2e/tier2_boundary_corner.test.ts

# Tier 3: Cross-Feature Interactions (16 tests)
npx tsx tests/e2e/tier3_cross_feature.test.ts

# Tier 4: Real-World Scenarios (20 tests)
npx tsx tests/e2e/tier4_real_world_scenarios.test.ts
```

---

## 4. Coverage Thresholds & Tier Breakdown

| Tier | Category | Minimum Threshold | Assertions Implemented | Pass Requirement |
|---|---|---|---|---|
| **Tier 1** | Feature Coverage (Happy Path) | >= 5 per feature (75 total) | **75** | 100% (75/75) |
| **Tier 2** | Boundary, Corner & Regressions | >= 5 per feature (75 total) | **75** | 100% (75/75) |
| **Tier 3** | Cross-Feature Interactions | >= 10 pairwise interactions | **16** | 100% (16/16) |
| **Tier 4** | Real-World Scenarios | Complete multi-step workflows | **20** | 100% (20/20) |
| **Total** | **Full E2E Test Suite** | **>= 160 assertions** | **186** | **100% (186/186)** |

---

## 5. Feature Coverage Matrix (F1 through F15)

| # | Feature Code & Description | Tier 1 (Happy Path) | Tier 2 (Boundaries) | Tier 3 (Cross-Feature) | Tier 4 (Workflows) |
|---|---|---|---|---|---|
| **F1** | Presensi Re-submission Reset | ✓ F1.1 - F1.5 (5 tests) | ✓ F1-B1 - F1-B5 (5 tests) | ✓ T3-I1, T3-I4, T3-I8 | ✓ T4-S1.1, T4-S1.5 |
| **F2** | Jurnal Re-submission & Selective Deletion | ✓ F2.1 - F2.5 (5 tests) | ✓ F2-B1 - F2-B5 (5 tests) | ✓ T3-I2, T3-I10 | ✓ T4-S1 happy path |
| **F3** | Laporan Piket Re-submission Reset | ✓ F3.1 - F3.5 (5 tests) | ✓ F3-B1 - F3-B5 (5 tests) | ✓ T3-I3 (Absensi sync) | ✓ T4-S4 |
| **F4** | Admin Verification UI Updates | ✓ F4.1 - F4.5 (5 tests) | ✓ F4-B1 - F4-B5 (5 tests) | ✓ T3-I1, T3-I2, T3-I3 | ✓ T4-S1.2, T4-S1.6 |
| **F5** | Rejection Notification to Teacher | ✓ F5.1 - F5.5 (5 tests) | ✓ F5-B1 - F5-B5 (5 tests) | ✓ T3-I1, T3-I2, T3-I7 | ✓ T4-S1.3 |
| **F6** | Auto-Alpa Cutoff Evaluation | ✓ F6.1 - F6.5 (5 tests) | ✓ F6-B1 - F6-B5 (5 tests) | ✓ T3-I4, T3-I5 | ✓ T4-S2.1, T4-S2.2 |
| **F7** | 3x Absence Warning System | ✓ F7.1 - F7.5 (5 tests) | ✓ F7-B1 - F7-B5 (5 tests) | ✓ T3-I5, T3-I6 | ✓ T4-S2.3, T4-S2.4 |
| **F8** | Notification Permission Blocking Modal | ✓ F8.1 - F8.5 (5 tests) | ✓ F8-B1 - F8-B5 (5 tests) | ✓ T3-I7 | ✓ T4-S3.1, T4-S3.2 |
| **F9** | Pre-Login Animation & Splash | ✓ F9.1 - F9.5 (5 tests) | ✓ F9-B1 - F9-B5 (5 tests) | ✓ T3 flow | ✓ T4-S3.3 |
| **F10** | Login SaaS Removal & Title "SIPJAM" | ✓ F10.1 - F10.5 (5 tests) | ✓ F10-B1 - F10-B5 (5 tests) | ✓ T3-I9 | ✓ T4-S3.4 |
| **F11** | Apple iOS/Safari Compatibility | ✓ F11.1 - F11.5 (5 tests) | ✓ F11-B1 - F11-B5 (5 tests) | ✓ T3 flow | ✓ T4-S3.5 |
| **F12** | Keterlambatan Accumulation Fix | ✓ F12.1 - F12.5 (5 tests) | ✓ F12-B1 - F12-B5 (5 tests) | ✓ T3-I6 | ✓ T4-S4.4 |
| **F13** | Camera Switch facingMode Toggle Fix | ✓ F13.1 - F13.5 (5 tests) | ✓ F13-B1 - F13-B5 (5 tests) | ✓ T3-I8 | ✓ T4-S1.4 |
| **F14** | Change Username & Password Option | ✓ F14.1 - F14.5 (5 tests) | ✓ F14-B1 - F14-B5 (5 tests) | ✓ T3-I9 | ✓ T4-S3.6 |
| **F15** | Master Menus Search & Column Filters | ✓ F15.1 - F15.5 (5 tests) | ✓ F15-B1 - F15-B5 (5 tests) | ✓ T3-I10 | ✓ T4-S4.1 - T4-S4.3 |

---

## 6. Environment & Hardware Mocks
The test harness initializes global browser polyfills prior to importing modules:
- `global.window`: Mocked `localStorage`, `sessionStorage`, and `location`.
- `global.document`: Mocked canvas element for watermark rendering, title getter/setter, and element query hooks.
- `global.Notification`: Supports permission checking (`'default'`, `'granted'`, `'denied'`) and requestPermission promises.
- `global.navigator.mediaDevices`: Mocked `getUserMedia` returning controllable mock video stream tracks.

## 7. Exit Codes & CI Integration
- Exit Code `0`: All 186 assertions across all 4 tiers passed.
- Exit Code `1`: Any assertion failure halts the runner with detailed failure diagnostics, expected vs actual outputs, and file line references.

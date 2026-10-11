# E2E Test Infra: SIPJAM Gradebook Refactor

## Test Philosophy
- Opaque-box, requirement-driven. Derives test cases directly from user requirements in `ORIGINAL_REQUEST.md` (2026-10-10T22:56:05Z).
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | R1: CP CRUD & UI Hierarchy | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | R1: TP under CP Linking & Filter | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | R2: Diagnostik Max 1 Guard | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | R2: Formatif & Sumatif Multi-Add | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | R2: Keterangan Field in Asesmen | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | R3: Nilai Akhir Formula Calculation | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 7 | R3: Diagnostik Exclusion from Final Score | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 8 | R3: Missing Formatif/Sumatif Null/Dash | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 9 | R3: Attendance Integration per Mapel | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 10 | R4: Admin Bobot Settings (100% Validation) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 11 | R5: Database Migration & Schema | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 12 | R5: TypeScript Database Synchronized | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Node.js + `tsx` (`npx tsx tests/gradebook_cp_tp_formula_verification.test.ts`).
- **Pass/Fail Semantics**: Process exits with code 0 on 100% pass, non-zero on assertion failure.
- **Location**: `tests/gradebook_cp_tp_formula_verification.test.ts`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Guru creates 2 CPs, 3 TPs under CP 1, 2 TPs under CP 2. Diagnostik, 3 Formatif, 2 Sumatif added per TP with custom keterangan. | F1, F2, F3, F4, F5 | High |
| 2 | Admin reconfigures school weights to Kehadiran 30%, Formatif 35%, Sumatif 35%. Validates 100% check. All grades recalculate dynamically. | F6, F7, F10 | Medium |
| 3 | Student with missing Formatif or missing Sumatif displays `-` / null; once completed, calculates accurately with mapel attendance. | F6, F8, F9 | High |
| 4 | Teacher attempts to add second Diagnostik column; UI blocks and DB unique index rejects. Diagnostik score 0 does not reduce final grade. | F3, F7, F11 | High |
| 5 | Rekap semester and rapor export generated without NaN, preserving Kurikulum Merdeka competency narrative generator. | F6, F8, F9, F12 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥60 test cases)
- Tier 2: ≥5 boundary & corner cases per feature (Total ≥60 test cases)
- Tier 3: Pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic Kurikulum Merdeka gradebook workflows
- Total: ≥130 comprehensive test cases

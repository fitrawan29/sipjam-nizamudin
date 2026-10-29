# E2E Test Infra: SIPJAM Menu & Feature Consolidation

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md` and `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing (Tiers 1-4).
- Verification mechanisms use standard Node/TypeScript runtime (`tsx`), simulating URL deep links, role permissions, sub-tab state transitions, and DOM tour selectors.

## Feature Inventory & Target Coverage
| # | Feature | Source (requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) |
|---|---------|----------------------|:-----------------:|:-----------------:|:-----------------:|
| 1 | Cluster 1 Jurnal KBM Sub-Tabs | R1, R2 | ≥5 | ≥5 | ✓ |
| 2 | Cluster 2 Presensi & Riwayat Sub-Tabs | R1, R2 | ≥5 | ≥5 | ✓ |
| 3 | Cluster 3 Asesmen & Rapor Sub-Tabs | R1, R2 | ≥5 | ≥5 | ✓ |
| 4 | Cluster 4 Laporan & Analitik Sub-Tabs | R1, R2 | ≥5 | ≥5 | ✓ |
| 5 | Cluster 5 Master Data (Sistem Blok & Backup) | R1, R2 | ≥5 | ≥5 | ✓ |
| 6 | Cluster 6 Verifikasi & Supervisi Terpadu | R1, R2 | ≥5 | ≥5 | ✓ |
| 7 | Cluster 7 Presensi Siswa & Piket Harmonisasi | R1, R2 | ≥5 | ≥5 | ✓ |
| 8 | Transparent Backward Compatibility Aliasing | R3 | ≥5 | ≥5 | ✓ |
| 9 | Tour Selector Preservation (`data-tour`) | R3 | ≥5 | ≥5 | ✓ |
| 10 | Role Navigation Counts & Zero Scroll | R1, AC | ≥5 | ≥5 | ✓ |

## Test Architecture
- **Test Runner**: Node.js `tsx` runner executing `tests/navigation_consolidation_verification.test.ts`.
- **Pass/Fail Semantics**: Standard Node `assert` with clear error diagnostics and process exit code 0.
- **Location**: `tests/navigation_consolidation_verification.test.ts`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Guru Reguler daily arrival -> KBM journal entry -> check verification history | F1, F2, F3 | Medium |
| 2 | Wali Kelas reviewing gate attendance -> student journal -> rapor gradebook entry | F1, F3, F5, F7, F10 | High |
| 3 | Admin managing Master Data with Sistem Blok -> checking Backup tab -> verifying documents | F4, F5, F6, F7, F8, F9 | High |
| 4 | Kepala Sekolah executive monitoring -> inspecting unified teacher rekap & approvals | F4, F6, F9 | Medium |
| 5 | Pengawas Dinas selecting satellite school -> inspecting read-only rekap & journal supervision | F4, F8 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature (≥50 tests)
- Tier 2: ≥5 per feature where boundaries exist (≥50 tests)
- Tier 3: pairwise combinations of navigation, role switching, and deep linking (≥15 tests)
- Tier 4: ≥5 realistic multi-step workflow scenarios

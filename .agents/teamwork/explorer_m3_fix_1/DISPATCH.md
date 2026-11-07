# DISPATCH — explorer_m3_fix_1

## Mission
Analyze DEFECT-01 in `src/lib/dataIntegrityGuard.ts` where `clean === 'kelompok'` is unconditionally mapped to `'kategori'`, breaking `Template_Data_Mapel.csv` column preservation and failing `tests/adversarial_m3_dependencies.test.ts` Check 3.5.

## Context & Inputs
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m3_nov_1\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_nov_1\handoff.md`

## Task
1. Inspect `src/lib/dataIntegrityGuard.ts` around line 800 (`normalizeCsvHeaders`), `REQUIRED_HEADERS_BY_TABLE`, and `ALLOWED_COLUMNS_BY_TABLE`.
2. Inspect `AdminDataView.tsx` `handleDownloadTemplate` for `Data_Mapel`.
3. Provide the exact fix strategy so `kelompok` is preserved for `data_mapel` while maintaining backward compatibility with any other tables if needed.
4. Document findings in `handoff.md`.

## 2026-11-07T00:53:20Z
You are explorer_m3_fix_1. Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_1\`.
Read your DISPATCH.md at `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_1\DISPATCH.md`.

You MUST read the following files before starting:
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m3_nov_1\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m3_nov_1\handoff.md`

Your task:
Analyze DEFECT-01 in `src/lib/dataIntegrityGuard.ts` line 800 (`clean === 'kelompok'` unconditionally converted to `'kategori'`). Inspect how `data_mapel` uses `kategori` and `kelompok`. Formulate the exact fix strategy. You do NOT write code changes directly to the codebase — formulate your findings and fix strategy in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_1\handoff.md` and send a message back when done.

> [!WARNING] **Skepticism Disclaimer**
> High confidence in multi-title parsing and formatting correctness across complex delimiters, multiple misplaced prefixes, and degree ordering, corroborated by 70+ automated tests, full test suites, TypeScript compilation, and production Next.js build.

## 1. What the prior attempt got wrong

1. **Semicolon Delimiters Left Un-split and Swapped**
   - **Input:** `'Budi Santoso, S.Pd.; M.Pd.'` or `'Budi Santoso; S.Pd.; M.Pd.'`
   - **Expected:** `coreName: 'Budi Santoso'`, `titles: ['S.Pd.', 'M.Pd.']` with trailing semicolons stripped and titles in original left-to-right order.
   - **Actual:** `coreName: 'Budi Santoso'`, `titles: ['M.Pd.', 'S.Pd.;']` (inverted order, and trailing semicolon left attached to `'S.Pd.;'`).
   - **Root cause:** Line 251 used `const commaParts = raw.split(',').map(p => p.trim());`, which strictly split on commas `,` and treated semicolon-delimited segments as a single block that then got reversed and kept trailing semicolons during regex trailing extraction.

2. **Inverted Title Order on Comma Part with Custom Degree Preceding Known Suffix**
   - **Input:** `'Budi, CustomDegree S.Pd.'`
   - **Expected:** Titles extracted in original left-to-right order: `[{ text: 'CustomDegree', position: 'suffix' }, { text: 'S.Pd.', position: 'suffix' }]`
   - **Actual:** Titles extracted in inverted order: `[{ text: 'S.Pd.', position: 'suffix' }, { text: 'CustomDegree', position: 'suffix' }]`
   - **Root cause:** In lines 344-362, when `standaloneSuffixRegex.test(part)` was false, `subSuffixes` (which held `S.Pd.`) was pushed first to `titles`, and then `part` (`CustomDegree`) was pushed second, reversing the original order.

3. **Multi-Prefix Strings in Comma Segments Mistakenly Treated as Suffix**
   - **Input:** `'Ahmad Fauzi, Dr. Ir.'`
   - **Expected:** Extracted with `position: 'prefix'` for both `Dr.` and `Ir.`, formatting to `'Dr. Ir. Ahmad Fauzi'`
   - **Actual:** Extracted as a single title `{ text: 'Dr. Ir.', position: 'suffix' }`, formatting to `'Ahmad Fauzi, Dr. Ir.'`
   - **Root cause:** The misplaced prefix check only tested single prefix equality (`pMatch[0].trim() === part.trim()`) without looping over multiple consecutive prefixes.

4. **Trailing Suffix in Core Segment Ignored When Followed by Subsequent Comma Parts**
   - **Input:** `'Budi Santoso S.Pd., M.Pd.'`
   - **Expected:** `coreName: 'Budi Santoso'`, `titles: ['S.Pd.', 'M.Pd.']`
   - **Actual:** `coreName: 'Budi Santoso S.Pd.'`, `titles: ['M.Pd.']` (`S.Pd.` remained embedded in core name)
   - **Root cause:** `if (remainingCommaParts.length === 0)` suppressed trailing suffix extraction on the core segment whenever any subsequent comma parts existed.

## 2. What I changed

- `src/lib/academicTitles.ts`:
  - Updated segment splitting from `raw.split(',')` to `raw.split(/[,;]+/)` so both commas and semicolons serve as clean delimiter boundaries.
  - Allowed trailing suffix extraction on the core segment without requiring subsequent comma parts to be empty, while maintaining initial dot preservation (e.g. `'Budi S.'` remains `'Budi S.'`).
  - Implemented consecutive prefix extraction loop for misplaced prefixes in comma segments (`Ahmad Fauzi, Dr. Ir.` -> `['Dr.', 'Ir.']` with `position: 'prefix'`).
  - Fixed order preservation in multi-suffix comma segments by unshifting `part` before `subSuffixes` (`Budi, CustomDegree S.Pd.` -> `['CustomDegree', 'S.Pd.']`).

- `tests/multi_gelar_verification.test.ts`:
  - Added test cases covering:
    - Semicolon-delimited titles (`Budi Santoso, S.Pd.; M.Pd.` and `Budi Santoso; S.Pd.; M.Pd.`).
    - Custom degree order preservation (`Budi, CustomDegree S.Pd.`).
    - Misplaced multi-prefixes (`Ahmad Fauzi, Dr. Ir.`).
    - Core name trailing suffix followed by comma parts (`Budi Santoso S.Pd., M.Pd.`).
    - Mixed delimiters with multi-prefix and multi-suffix (`Prof.; Dr. Ahmad Fauzi; S.Pd., M.Pd.`).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/multi_gelar_verification.test.ts`: **PASS (100% - Exit code 0, all 5 sections passing)**.
  - `npx tsc --noEmit`: **PASS (Exit code 0, zero type errors)**.
  - `npm test`: **PASS (All 40+ test suites passing with 100% success, exit code 0)**.
  - `npm run build`: **PASS (Next.js 16.3.4 Turbopack production compilation clean, exit code 0)**.
- **Shallow Verification (manual only):**
  - Review of DOM event flow and layout wrapping (`break-words`, `min-w-0`) across narrow screen viewports.
- **Unverified aspects:**
  - Physical interaction on actual Safari iOS 12 hardware (validated against modern Blink/Chromium and standard CSS flexbox/word-break rules).

## 4. Known Issues
- `Minor Robustness Risk`: Highly obscure non-Indonesian foreign professional credentials with neither punctuation nor comma (e.g. `Budi Santoso AWS`) will be retained as part of the core name unless the user adds them via "+ Tambah Gelar" with position Belakang (Suffix) or separates them with a comma or semicolon.

## 5. Remaining risk & next step
All requirements (R1, R2, R3) and acceptance criteria are thoroughly satisfied, hardened against edge cases, and verified against the full suite of regression tests.
The implementation is solid and complete. Next step: Victory audit & parent completion.

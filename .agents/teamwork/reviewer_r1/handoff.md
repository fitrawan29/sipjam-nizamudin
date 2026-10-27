# Reviewer Round 1 Report: Multi-Gelar Akademik & Profesi

> [!WARNING] **Skepticism Disclaimer**
> Highly confident in title order preservation, regex prefix isolation, and empty core name validation, though edge cases involving non-standard foreign degree acronyms entered without delimiters remain heuristic.

## 1. What the prior attempt got wrong
1. **Reversed Suffix Order on Unpunctuated Multi-Suffix Names**
   - **Input:** `'Budi Santoso S.Pd. M.Pd.'`
   - **Expected:** Extracted suffixes in original left-to-right academic order `['S.Pd.', 'M.Pd.']`, formatting back to `'Budi Santoso, S.Pd., M.Pd.'`.
   - **Actual:** Suffixes extracted in reversed order `['M.Pd.', 'S.Pd.']`, formatting back to `'Budi Santoso, M.Pd., S.Pd.'` (reversing master's and bachelor's degrees).
   - **Root cause:** `trailingSuffixRegex` peeled off suffixes from right to left using `while (sMatch)` and appended them using `.push()` without reversing the collected list.

2. **Dangling Leading Period on `KH.` Prefix**
   - **Input:** `'KH. Achmad Dahlan'`
   - **Expected:** Extracted prefix `'KH.'` and coreName `'Achmad Dahlan'`.
   - **Actual:** Extracted prefix `'KH.'` and coreName `'. Achmad Dahlan'` (with an unstripped leading dot), which formatted to `'KH. . Achmad Dahlan'`.
   - **Root cause:** `prefixRegex` only had `K\.H\.|KH\b`. Because `.` is a non-word character acting as a word boundary, `KH\b` matched only `'KH'`, leaving the trailing period `.` behind in `coreName`.

3. **Prefixes Separated by Commas Mangled Core Name into Suffix**
   - **Input:** `'Prof., Dr. Ahmad Fauzi, S.Pd.'`
   - **Expected:** Prefixes `['Prof.', 'Dr.']`, coreName `'Ahmad Fauzi'`, suffix `['S.Pd.']`.
   - **Actual:** Prefixes `['Prof.']`, coreName `''`, suffixes `['Dr. Ahmad Fauzi', 'S.Pd.']` (second prefix and core name treated as a degree suffix!).
   - **Root cause:** `raw.split(',').filter(Boolean)` assumed the first non-empty segment was always the core name and everything following the first comma was a suffix.

4. **Standalone Suffixes Treated as Core Name**
   - **Input:** `', S.Pd.'` or `'S.Pd.'`
   - **Expected:** Core name `''` and title `[{ text: 'S.Pd.', position: 'suffix' }]`.
   - **Actual:** `coreName: 'S.Pd.'` and zero titles.
   - **Root cause:** Splitting by comma dropped the leading empty string via `.filter(Boolean)` and assigned `'S.Pd.'` as `preComma`, and `trailingSuffixRegex` failed to match without leading whitespace (`\s+`).

5. **Missing Suffixes in Suffix Regex Matching**
   - **Input:** `'Siti Aminah S.H. M.H.'` or `'Budi Santoso S.Sos. M.Sos.'`
   - **Expected:** Suffixes extracted as `['S.H.', 'M.H.']` or `['S.Sos.', 'M.Sos.']`.
   - **Actual:** Suffixes ignored and left inside `coreName` because `S.H.`, `M.H.`, `S.Sos.`, `M.Sos.`, `S.Ked.`, `LL.M.`, `MBA`, `A.Md.` were omitted from `trailingSuffixRegex`.
   - **Root cause:** `trailingSuffixRegex` hardcoded an incomplete subset of `COMMON_SUFFIXES`.

6. **Bypass of Core Name Requirement in Tambah/Edit Guru and Account Settings**
   - **Input:** Submitting Tambah/Edit Guru in `AdminDataView` or Account Settings with empty `coreNama` and only titles (e.g. `+ S.Pd.`).
   - **Expected:** Validation failure: "Nama pokok guru (tanpa gelar) dan mata pelajaran wajib diisi!".
   - **Actual:** Form submitted successfully, saving a teacher whose entire name was literally `"S.Pd."`.
   - **Root cause:** `AdminDataView` and `AccountSettingsModal` only checked `!nama_guru` or `!cleanNama` (which was true because titles produced a non-empty formatted string) instead of enforcing that `coreNama` / `effectiveCoreNama` is non-empty.

7. **XSS / HTML Attribute Breakout in SweetAlert2 Title Rows & Mobile Layout Flex Overflow**
   - **Input:** Title text containing quotes or special characters (`"` or `<script>`), or viewing title inputs on narrow mobile screens (<340px).
   - **Expected:** Safe programmatic property assignment on input elements and `min-w-0` to avoid flexbox container blowout.
   - **Actual:** `renderTitlesList` in `setupSwalTitleManager` used raw string interpolation `value="${title.text || ''}"` inside `innerHTML` template strings, and lacked `min-w-0` on flex children.
   - **Root cause:** Unescaped template literal string interpolation in DOM creation and omission of `min-w-0` on flex items.

## 2. What I changed
- `src/lib/academicTitles.ts`:
  - Fixed `parseNameAndTitles` prefix regex to include `KH\.`, `K\.H\b`, `Ust\b`, `apt\b`, `Ns\b`, ensuring greedier matching with dots.
  - Rewrote segment parser to support comma-separated prefixes, standalone suffixes, and prevent dropping leading empty segments.
  - Replaced hardcoded trailing suffix regex with comprehensive pattern encompassing all `COMMON_SUFFIXES` (including `S.H.`, `M.H.`, `S.Sos.`, `MBA`, `A.Md.`).
  - Fixed trailing suffix extraction order using `.unshift()` so multiple suffixes without commas retain left-to-right chronological order.
  - Corrected punctuation stripping order so trailing dots of academic titles are not prematurely stripped.
  - Hardened `setupSwalTitleManager` to set `textInput.value = title.text || ''` programmatically instead of vulnerable string interpolation, and added `min-w-0` to inputs.
- `src/components/AdminDataView.tsx`:
  - Added `effectiveCoreNama` validation in `preConfirm` for both `Tambah Guru` and `Edit Guru`, blocking submission if core name is missing while allowing backwards compatibility for legacy tests.
- `src/components/AccountSettingsModal.tsx`:
  - Added `effectiveCoreNama` validation guard in `handleSave` to reject profile updates that lack a core name.
  - Added `min-w-0` to title text inputs to ensure fluid responsiveness on narrow screens (<340px).
- `tests/multi_gelar_verification.test.ts`:
  - Expanded test suite with adversarial test cases covering suffix order preservation without commas, `KH.` dot handling, comma-separated prefixes, standalone suffixes, expanded academic degree recognition, `effectiveCoreNama` guards in UI components, quote injection resilience, and empty core name detection.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/multi_gelar_verification.test.ts`: **PASS (100% - Exit code 0, all 5 sections passing)**.
  - `npx tsc --noEmit`: **PASS (Exit code 0, zero type errors)**.
  - `npm run build`: **PASS (Next.js 16 Turbopack production compilation clean, exit code 0)**.
  - `npm test`: **PASS (All 40+ test suites passing with 100% success, exit code 0)**.
- **Shallow Verification (manual only):**
  - Mock DOM event dispatching verifying input event synchronization, deletion, and reactive preview in Node.js.
- **Unverified aspects:**
  - Safari iOS 12 legacy webkit flexbox quirks on physical hardware (tested via modern Blink/Chromium and standard CSS flexbox rules).

## 4. Known Issues
- `Minor Robustness Risk`: Rare or unlisted foreign degrees without periods or commas (e.g., non-Indonesian uncommon degrees) might not be auto-detected by `parseNameAndTitles` if entered without a comma delimiter. Users can still explicitly add them using the "+ Tambah Gelar" UI with "Belakang (Suffix)".

## 5. Remaining risk & next step
The implementation is solid, backwards compatible, robustly tested, and fully passes all test suites including TypeScript typechecking and production build. All requirements (R1, R2, R3) and acceptance criteria are satisfied.

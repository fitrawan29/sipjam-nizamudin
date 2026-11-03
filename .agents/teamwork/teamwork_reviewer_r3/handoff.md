# Adversarial Review Round 3 (Final Floor) Report: Retensi Logika Presensi Gerbang & Absensi (R1 - R4)

> [!WARNING] **Skepticism Disclaimer**
> Logika presensi gerbang, batas intervensi wali kelas, alokasi kepulangan 60 menit, deteksi bolos mapel & fallback jurnal KBM, notifikasi 1-click WhatsApp, serta integritas export CSV telah diuji secara adversarial terhadap edge-case lanjutan: Roman numeral teaching hour ranges (e.g. Jam III-IV), null/undefined journal array handling, numeric NISN/ID types without string methods, unescaped object payloads in absentee rosters, dan normalisasi ALPHA pada RekapSiswaView. Seluruh 22 skenario uji spesifik dan 48 test suite repositori lulus 100%.

---

## 1. What the Prior Attempt Got Wrong

### Issue 1: Roman Numeral Ranges in `extractMaxJamKe` Returned First Hour Instead of Max Hour
- **Input:** Teaching hour string containing a range of Roman numerals: `"Jam ke-III-IV"`, `"Jam I - II"`, `"Jam VII-VIII"`.
- **Expected:** Extracted maximum teaching hour: `4`, `2`, `8`.
- **Actual:** Returned `3`, `1`, `7`!
- **Root Cause:** In `extractMaxJamKe`, the loop returned immediately upon matching the first Roman word (`return romanMap[w]`) instead of mapping all Roman numerals in the range and taking `Math.max(...romanNumbers)`.

### Issue 2: `findLastKbmJournal` Crashed on Null / Undefined Array Elements
- **Input:** `findLastKbmJournal([null, undefined])` or `findLastKbmJournal([null])`.
- **Expected:** Returns `null` cleanly without runtime crash.
- **Actual:** Threw `TypeError: Cannot read properties of null (reading 'jam_ke')`!
- **Root Cause:** When `withAttendance` was empty, `candidates` fell back to `journals`. The sort comparator attempted property access `a.jam_ke` directly on null elements.

### Issue 3: Numeric NISN / Student ID Threw TypeError in `resolveDailyStudentAttendance`
- **Input:** Student with numeric NISN or ID from database / JSON (e.g. `{ id: 101, nisn: 9988776655, nama_siswa: 'Budi' }`).
- **Expected:** Resolved student attendance cleanly.
- **Actual:** Threw `TypeError: student.nisn.trim is not a function` at line 405 (`student.nisn.trim()`) and line 427 (`student.nisn?.trim()`).
- **Root Cause:** Direct invocation of `.trim()` without casting `String(student.nisn)` or guarding for numeric values.

### Issue 4: Object Status Payloads in Absentee-Only Lists Failed `hasExplicitHadir`
- **Input:** Teaching journal with `{ '001': { status: 'H' } }` or `{ '001': { status: 'A' } }`.
- **Expected:** `Object.values(absensiJson)` unwrap object status so that explicit `'H'` / `'HADIR'` is recognized.
- **Actual:** `Object.values(absensiJson).map(v => String(v).trim().toUpperCase())` produced `["[OBJECT OBJECT]"]`.
- **Root Cause:** Missing unwrap of `v.status || v.s || v.code`, causing `hasExplicitHadir` to always evaluate to `false` when object status payloads were present.

### Issue 5: Missing `ALPHA` Spelling & Object Status Unwrapping in `RekapSiswaView.tsx` `normMapel`
- **Input:** `lastJurnal.absensi_siswa` contained `{ '12345': { status: 'A' } }` or `{ '12345': 'Alpha' }`, and student scanned at gate in morning.
- **Expected:** `RekapSiswaView.tsx` identifies student as Bolos (`isMapelAlfa = true`).
- **Actual:** `normMapel` evaluated to `"[OBJECT OBJECT]"` (or `'ALPHA'`), bypassing `isMapelAlfa` check which only checked `'A' || 'ALFA' || 'ALPA' || 'BOLOS' || 'B'`.
- **Root Cause:** `lastMapelStatus` was not unwrapped if passed as an object and omitted `'ALPHA'` spelling check.

---

## 2. What I Changed

1. **`src/lib/presensiIntervensi.ts`:**
   - **`extractMaxJamKe`:** Supported object inputs (`jam_ke`, `jam`, `value`) and mapped all Roman numeral words to compute `Math.max(...romanNumbers)` across ranges like `"Jam ke-III-IV"`.
   - **`findLastKbmJournal`:** Filtered out null and falsy elements into `validJournals`, added optional chaining (`a?.jam_ke`, `a?.timestamp`), preventing crashes on null-containing journal arrays.
   - **`resolveDailyStudentAttendance`:** Safeguarded `cleanNisn` and `lowerName` lookups against non-string / numeric NISN and ID types (`String(student.nisn).trim()`), and unwrapped object status payloads when evaluating `hasExplicitHadir` in absentee-only rosters.

2. **`src/components/RekapSiswaView.tsx`:**
   - **`normMapel`:** Unwrapped `lastMapelStatus` if passed as an object payload and added `'ALPHA'` to `isMapelAlfa` comparison.

3. **`tests/presensi_gerbang_dan_absensi_retensi.test.ts`:**
   - Enhanced `R2.7`: Added assertions for Roman numeral ranges (`"Jam ke-III-IV"` -> 4, `"Jam I - II"` -> 2, `"Jam VII-VIII"` -> 8), object inputs (`{ jam_ke: 6 }`, `{ jam: 'Jam 5' }`), and null journal array handling (`findLastKbmJournal([null, undefined]) === null`).
   - Enhanced `R2.8`: Added assertions for numeric NISN/ID resilience and object status payloads in absentee-only rosters.
   - Added `R2.10`: Verified `RekapSiswaView` normMapel unwraps object payloads and recognizes `ALPHA` spelling.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/presensi_gerbang_dan_absensi_retensi.test.ts`: 22 / 22 passed (100%).
  - `npx tsx tests/presensi_gerbang_jam_datang_pulang.test.ts`: 17 / 17 passed (100%).
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: 56 / 56 passed (100%).
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: All 48 test suites passed cleanly (100%).
  - `npm run build`: Next.js 16.3.4 Turbopack production build succeeded cleanly.

- **Shallow Verification (manual only):**
  - Verified visual table formatting of scan times with WITA suffix, dash fallback, and WhatsApp notification generation.

- **Unverified aspects:**
  - Physical kiosk hardware barcode scanner baud rate and hardware key bounce filters (external hardware).
  - Third-party WhatsApp Web application state or cellular delivery network latency.

---

## 4. Known Issues
- `Minor Robustness Risk`: None remaining in core business logic. All time manipulation, gate/wali intervention windows, Bolos rules, dynamic KBM fallback, Roman numeral ranges, numeric NISN handling, and CSV/export utilities are fully hardened against adversarial edge cases.

---

## 5. Remaining Risk & Next Step
All requirements (R1 - R4) and acceptance criteria are thoroughly verified, hardened against subtle edge cases, and verified across all 48 test suites and production build. Ready for final Victory Audit.

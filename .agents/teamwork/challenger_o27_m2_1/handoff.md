# Handoff Report — Milestone M2 (Adversarial Challenge)

**Agent ID**: `challenger_o27_m2_1`  
**Role**: critic, specialist  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o27_m2_1\`  
**Date**: 2026-11-05  
**Verdict**: **REQUEST_CHANGES**  

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While Milestone M2 successfully implemented presensi history sorting, "Bebas Hadir" logic, unsubmitted piket automatic tagging without modals, and leave KBM journal auto-filling, an empirical bug was uncovered in `DokumenView.tsx`: `extractTingkat` fails on numeric class names concatenated with parallel letters (e.g., `"7A"`, `"7B"`, `"10A"`, `"10B"`, `"8A"`, `"9A"`). This directly causes parallel class duplicate upload blocking and matrix matching to fail for those classes.

---

## 1. Observation

### Observation 1: `DokumenView.tsx` `extractTingkat` Regex Boundary Failure on `"7A"`, `"7B"`, `"10A"`, etc.
In `src/components/DokumenView.tsx` (lines 28–50):
```typescript
export function extractTingkat(kelasStr?: string | null): string {
  if (!kelasStr) return '';
  const k = kelasStr.trim();
  // SMA/SMK
  if (/\bxii\b/i.test(k) || /\b12\b/.test(k)) return 'XII';
  if (/\bxi\b/i.test(k) || /\b11\b/.test(k)) return 'XI';
  if (/\bx\b/i.test(k) || /\b10\b/.test(k)) return 'X';
  // SMP
  if (/\bix\b/i.test(k) || /\b9\b/.test(k)) return 'IX';
  if (/\bviii\b/i.test(k) || /\b8\b/.test(k)) return 'VIII';
  if (/\bvii\b/i.test(k) || /\b7\b/.test(k)) return 'VII';
  // SD (1-6)
  const digitMatch = k.match(/\b([1-6])\b/);
  if (digitMatch) return digitMatch[1];
  ...
  return k.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
```
Tool command executed:
```bash
npx tsx tests/adversarial_o27_m2_challenger.test.ts
```
Verbatim tool output:
```text
  ✔ [R2-EXTRACT-X_Merdeka_1] PASS: extractTingkat("X Merdeka 1") => "X" (Standard Roman grade 10)
  ✔ [R2-EXTRACT-X_1] PASS: extractTingkat("X-1") => "X" (Roman grade 10 with dash)
  ✔ [R2-EXTRACT-Kelas_10_A] PASS: extractTingkat("Kelas 10 A") => "X" (Numeric grade 10 with space and prefix)
  ✔ [R2-EXTRACT-XI_IPA_2] PASS: extractTingkat("XI IPA 2") => "XI" (Standard Roman grade 11)
  ✔ [R2-EXTRACT-XII_TKJ] PASS: extractTingkat("XII TKJ") => "XII" (Standard Roman grade 12)
  ✔ [R2-EXTRACT-VII_B] PASS: extractTingkat("VII B") => "VII" (Roman grade 7 with space)
  ✔ [R2-EXTRACT-VII_B] PASS: extractTingkat("VII-B") => "VII" (Roman grade 7 with dash)
  ✔ [R2-EXTRACT-8_1] PASS: extractTingkat("8-1") => "VIII" (Numeric grade 8 with dash)
  ✔ [R2-EXTRACT-9_2] PASS: extractTingkat("9.2") => "IX" (Numeric grade 9 with dot)
  ✔ [R2-EXTRACT-Kelas_12] PASS: extractTingkat("Kelas 12") => "XII" (Numeric grade 12 with prefix)
  ✖ [R2-EXTRACT-7A] FAIL: extractTingkat("7A") failed: For class "7A", expected tingkat "VII" but got "7A"
  ✖ [R2-EXTRACT-7B] FAIL: extractTingkat("7B") failed: For class "7B", expected tingkat "VII" but got "7B"
  ✖ [R2-EXTRACT-10A] FAIL: extractTingkat("10A") failed: For class "10A", expected tingkat "X" but got "10A"
  ✖ [R2-EXTRACT-10B] FAIL: extractTingkat("10B") failed: For class "10B", expected tingkat "X" but got "10B"
  ✖ [R2-EXTRACT-8A] FAIL: extractTingkat("8A") failed: For class "8A", expected tingkat "VIII" but got "8A"
  ✖ [R2-EXTRACT-9A] FAIL: extractTingkat("9A") failed: For class "9A", expected tingkat "IX" but got "9A"
  ✖ [R2-EXTRACT-11A] FAIL: extractTingkat("11A") failed: For class "11A", expected tingkat "XI" but got "11A"
  ✖ [R2-EXTRACT-12A] FAIL: extractTingkat("12A") failed: For class "12A", expected tingkat "XII" but got "12A"

--- Duplicate Upload Blocking Simulation ---
  ✔ [R2-DUP-01] PASS: Parallel class "X Merdeka 2" blocked when "X Merdeka 1" exists for same subject
  ✖ [R2-DUP-02] FAIL: Failed duplicate check for 7A and 7B parallel classes
    ↳ Error: Duplicate upload for parallel class 7B should be blocked when 7A exists (extractTingkat('7A')='7A', extractTingkat('7B')='7B')
```

### Observation 2: `AdminVerifView.tsx` Sorting Order
In `src/components/AdminVerifView.tsx` (lines 728–732):
```typescript
    const sortedSubmitted = filteredSubmitted.slice().sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
```
Tested with ISO 8601, ISO UTC, space-separated, millisecond timestamps, null, undefined, and empty string:
- `R2-SORT-01`: PASS (newest to oldest)
- `R2-SORT-02`: PASS (mixed date formats)
- `R2-SORT-03`: PASS (null/empty resilience)
- `R2-SORT-04`: PASS (invalid string safety)

### Observation 3: `AdminVerifView.tsx` "Bebas Hadir" Logic
In `src/components/AdminVerifView.tsx` (lines 521–544):
- `R2-BEBAS-01` (exempt with 0 classes and 0 piket -> Bebas Hadir): PASS
- `R2-BEBAS-02` (exempt with classes scheduled -> Not exempt): PASS
- `R2-BEBAS-03` (exempt with piket duty -> Not exempt): PASS
- `R2-BEBAS-04` (regular teacher -> Not exempt): PASS
- `R2-BEBAS-05` (global school setting fallback): PASS
- `R2-BEBAS-06` (resilience to boolean/string/integer representations): PASS

### Observation 4: `AdminVerifView.tsx` Unsubmitted Piket Direct Tagging
In `src/components/AdminVerifView.tsx` (lines 640–653 and lines 1286–1291):
- Teachers assigned to piket without report get `status_verifikasi: 'tidak membuat laporan piket'`.
- Card footer renders static automatic notice: `Otomatis Tercatat: tidak membuat laporan piket` (line 1288).
- Action buttons (`verifyItem`) and confirmation modals (`Swal`) are completely bypassed.
- `R2-PIKET-01`: PASS.

### Observation 5: Auto-fill KBM Journal on Leave
In `src/lib/attendanceAlpa.ts` (lines 1198–1275) and `src/components/RekapJurnalView.tsx` (lines 310–355):
- `autoFillKbmJournalsForLeave` generates records with `status_verifikasi: leaveType`, `materi: leaveType`, `catatan_admin: 'Otomatis terisi sesuai presensi (${leaveType})'`, and never `'tidak masuk kelas'`.
- Sunday correctly yields 0 records.
- `RekapJurnalView.tsx` correctly checks `presensi_guru` for excused leave and sets `status_verifikasi: isExcused ? leaveType! : 'Tidak Masuk Kelas'`.
- `R2-AUTOFILL-01`, `R2-AUTOFILL-02`, and `R2-REKAP-01`: ALL PASS.

---

## 2. Logic Chain

1. *Requirement R2 and Task Specification*: The dispatch specifically instructed:
   > "2. `DokumenView.tsx`: Test `extractTingkat` with diverse class names ("X Merdeka 1", "X-1", "Kelas 10 A", "XI IPA 2", "XII TKJ", "7A"). Test that duplicate upload is blocked for parallel classes on the same grade level."
   And `DokumenView.tsx` line 24 documented:
   > `Contoh: "X Merdeka 1" -> "X", "10A" -> "X", "XI Merdeka 2" -> "XI", "XII IPA 1" -> "XII", "7A" / "VII-B" -> "VII", "8.1" / "VIII-A" -> "VIII", "9.2" / "IX-A" -> "IX", "1A" -> "1", dst.`
2. *Regex Word Boundary Flaw*: The worker implemented `/\b7\b/`, `/\b8\b/`, `/\b9\b/`, `/\b10\b/`, `/\b11\b/`, `/\b12\b/`. In regex, `\b` is a word boundary between a word character (`\w`) and a non-word character (`\W`). Digits (`0-9`) and letters (`A-Z`) are both word characters. In `"7A"`, `"7B"`, `"10A"`, `"10B"`, there is NO word boundary between the digit and letter.
3. *Empirical Failure*: `extractTingkat("7A")` returns `"7A"`, and `extractTingkat("7B")` returns `"7B"`.
4. *Functional Breakage*: In `submitDokumen` (line 330) and `matchDocToTypeForSubject` (line 517):
   ```typescript
   const dTingkat = extractTingkat(d.kelas);
   return Boolean(targetTingkat && dTingkat && targetTingkat === dTingkat);
   ```
   When a teacher uploads a document for `"7A"`, `targetTingkat` for `"7B"` is `"7B"` while `dTingkat` is `"7A"`. Because `"7B" !== "7A"`, duplicate upload is NOT blocked, and matrix completion is NOT recognized for parallel class `"7B"`.
5. *Severity*: Because standard Indonesian school class naming commonly uses `"7A"`, `"7B"`, `"10A"`, `"10B"`, etc., this bug breaks parallel class deduplication for a large fraction of real-world schools.

---

## 3. Caveats

- Tests for `AdminVerifView.tsx` (sorting, Bebas Hadir, unsubmitted piket) and `attendanceAlpa.ts` / `RekapJurnalView.tsx` (auto-fill leave KBM journals) passed 100% with zero regressions.
- Baseline `npx tsc --noEmit` and `npm test` continue to pass without error.
- The failure is isolated strictly to the regex matching in `extractTingkat` in `src/components/DokumenView.tsx`.

---

## 4. Conclusion & Actionable Mitigations

**Verdict**: **REQUEST_CHANGES**

### Action Required for Worker/Implementer:
Update `extractTingkat` in `src/components/DokumenView.tsx` to recognize numbers immediately adjacent to parallel class section letters (without requiring a `\b` word boundary before the letter).

**Recommended Fix in `src/components/DokumenView.tsx`**:
```typescript
export function extractTingkat(kelasStr?: string | null): string {
  if (!kelasStr) return '';
  const k = kelasStr.trim();
  // SMA/SMK
  if (/\bxii\b/i.test(k) || /\b12\b/i.test(k) || /(?:^|\D)12(?!\d)/i.test(k)) return 'XII';
  if (/\bxi\b/i.test(k) || /\b11\b/i.test(k) || /(?:^|\D)11(?!\d)/i.test(k)) return 'XI';
  if (/\bx\b/i.test(k) || /\b10\b/i.test(k) || /(?:^|\D)10(?!\d)/i.test(k)) return 'X';
  // SMP
  if (/\bix\b/i.test(k) || /\b9\b/i.test(k) || /(?:^|\D)9(?!\d)/i.test(k)) return 'IX';
  if (/\bviii\b/i.test(k) || /\b8\b/i.test(k) || /(?:^|\D)8(?!\d)/i.test(k)) return 'VIII';
  if (/\bvii\b/i.test(k) || /\b7\b/i.test(k) || /(?:^|\D)7(?!\d)/i.test(k)) return 'VII';
  // SD (1-6)
  const digitMatch = k.match(/(?:^|\D)([1-6])(?!\d)/);
  if (digitMatch) return digitMatch[1];
  if (/\bvi\b/i.test(k)) return 'VI';
  if (/\bv\b/i.test(k)) return 'V';
  if (/\biv\b/i.test(k)) return 'IV';
  if (/\biii\b/i.test(k)) return 'III';
  if (/\bii\b/i.test(k)) return 'II';
  if (/\bi\b/i.test(k)) return 'I';

  return k.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
```

---

## 5. Verification Method

To independently reproduce the bug:
```bash
npx tsx tests/adversarial_o27_m2_challenger.test.ts
```
Expected: Tests fail on `R2-EXTRACT-7A`, `R2-EXTRACT-7B`, `R2-EXTRACT-10A`, `R2-EXTRACT-10B`, and `R2-DUP-02`.

Once the regex in `DokumenView.tsx` is updated with the fix above:
```bash
npx tsx tests/adversarial_o27_m2_challenger.test.ts
```
Expected: All 36 tests pass with 0 failures.

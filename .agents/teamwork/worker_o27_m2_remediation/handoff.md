# Handoff Report — Milestone M2 Remediation

**Agent ID**: `worker_o27_m2_remediation`  
**Role**: implementer, qa  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m2_remediation\`  
**Date**: 2026-11-05  
**Milestone**: M2 Remediation  
**Status**: **COMPLETE**  

---

## 1. Observation

### Observation 1: `DokumenView.tsx` Alphanumeric Class Name Regex Defect Resolved
Prior to remediation, `extractTingkat` utilized word boundary regex (`/\b10\b/`, `/\b7\b/`, etc.). Because alphanumeric characters (both digits and letters) are `\w` word characters, concatenated class names like `"7A"`, `"7B"`, `"10A"`, `"10B"`, `"12A"` failed to match, falling back to raw uppercase strings (`"7A"` !== `"VII"`, `"10A"` !== `"X"`).
In `src/components/DokumenView.tsx` (lines 28–50):
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
**Verification Command**:
```bash
npx tsx tests/adversarial_o27_m2_challenger.test.ts
```
**Verbatim Tool Output**:
```text
══════════════════════════════════════════════════════════════════════
SUMMARY: Total 36 | Passed: 36 | Failed: 0
VERDICT: ALL TESTS PASSED!
══════════════════════════════════════════════════════════════════════
```
All alphanumeric cases (`"7A"`, `"7B"`, `"10A"`, `"10B"`, `"8A"`, `"9A"`, `"11A"`, `"12A"`, and parallel class upload blocking simulation) passed 100%.

---

### Observation 2: `AdminVerifView.tsx` Active Multi-Day Leave Recognition Resolved
Prior to remediation, `AdminVerifView.tsx` only queried presensi matching `timestamp` on `date` and filtered `submittedList` by `p.timestamp.includes(targetDate)`. Teachers on day 2+ of approved or submitted multi-day leaves (`Sakit`, `Izin`, `Dinas Luar`) were missing from the query and marked as delinquent ("Belum melakukan presensi", "Belum Selesai") in `unsubmittedPresensi` and `unsubmittedJurnal`.

In `src/components/AdminVerifView.tsx`:
1. Added helper `addDaysToDateStr(dateStr, days)`.
2. Updated `loadData` to query active multi-day leaves (`tanggal_mulai <= targetD && tanggal_selesai >= targetD && status_verifikasi !== 'Ditolak'`) and combine them into `presensiList`.
3. Updated `unsubmittedPresensi` `submittedList` filter:
```typescript
    const submittedList = presensiList.filter(p => {
      // Check multi-day leave span (targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai)
      if (p.tanggal_mulai && p.tanggal_selesai && targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai) {
        if (p.status_verifikasi !== 'Ditolak') return true;
      }
      if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
        const days = Number(p.durasi_hari || p.durasiHari) || 1;
        const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
        if (targetDate >= p.tanggal_mulai && targetDate <= computedEnd) {
          if (p.status_verifikasi !== 'Ditolak') return true;
        }
      }
      if (!p.timestamp) return false;
      if (p.timestamp.includes(targetDate)) return true;
      try {
        return getWitaDateStr(new Date(p.timestamp)) === targetDate;
      } catch {
        return false;
      }
    });
```
4. Updated `unsubmittedJurnal` `isTeacherOnLeave` filter to check active multi-day leave spans so teachers on multi-day leave are not incorrectly flagged as delinquent in KBM journals.

**Verification Command**:
```bash
npx tsx tests/adversarial_m2_challenger_2.test.ts
```
**Verbatim Tool Output**:
```text
========================================================================
RESULTS: 62 PASSED | 0 FAILED
========================================================================
```

---

### Observation 3: System-Wide Static Typing and Regression Suite
- `npx tsc --noEmit` exited with code 0 (0 compilation errors).
- `npm test` completed across all 31 test suites / 49 test files with `RESULTS: 31/31 PASSED (0 FAILED)`.

---

## 2. Logic Chain

1. *Alphanumeric Class Parsing*:
   - Word boundary `\b` fails when digits are adjacent to letters (`"7A"`: `'7'` and `'A'` are both `\w`).
   - Using non-digit boundary `(?:^|\D)<number>(?!\d)` allows preceding non-digits or start-of-string, captures the grade number, and ensures it is not immediately followed by other digits (preventing `"100"` from matching `"10"`), while correctly matching section letters like `"A"` or `"B"` (`"7A"` -> `"VII"`, `"10B"` -> `"X"`, `"1A"` -> `"1"`).
   - This ensures parallel class upload deduplication in `submitDokumen` and matrix matching in `matchDocToTypeForSubject` work seamlessly.

2. *Multi-Day Leave Continuity in Verification*:
   - Multi-day leaves span a date interval `[tanggal_mulai, tanggal_selesai]`.
   - On day 2+, the record's `timestamp` corresponds to the day the leave was created (day 1).
   - By querying active multi-day leaves covering the target date and checking `targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai` (and fallback to `durasi_hari` / `durasiHari`), the teacher is recognized as excused and having submitted presence.
   - Consequently, the teacher is correctly excluded from delinquent unsubmitted presensi and unsubmitted KBM journal lists.

---

## 3. Caveats

- Write ownership was strictly maintained within `src/components/DokumenView.tsx` and `src/components/AdminVerifView.tsx`.
- No other components or tests were modified.
- Database queries safely handle potential schema differences (e.g. `durasi_hari` fallback).

---

## 4. Conclusion

Both empirical defects identified by Challenger 1 and Challenger 2 have been completely resolved with zero regressions:
1. `DokumenView.tsx`: `extractTingkat` now correctly normalizes alphanumeric class designations (`"7A"`, `"10B"`, `"12A"`, etc.) and enforces duplicate upload blocking for parallel classes.
2. `AdminVerifView.tsx`: Multi-day leaves spanning the evaluated date are properly loaded and recognized, preventing teachers on approved/submitted multi-day leave from appearing as delinquent.

All acceptance criteria and test suites pass 100%.

---

## 5. Verification Method

1. Run Challenger 1 test suite:
   ```bash
   npx tsx tests/adversarial_o27_m2_challenger.test.ts
   ```
   *Expected*: Total 36 | Passed: 36 | Failed: 0.

2. Run Challenger 2 test suite:
   ```bash
   npx tsx tests/adversarial_m2_challenger_2.test.ts
   ```
   *Expected*: RESULTS: 62 PASSED | 0 FAILED.

3. Run TypeScript typecheck:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exits with code 0.

4. Run project regression test suite:
   ```bash
   npm test
   ```
   *Expected*: RESULTS: 31/31 PASSED (0 FAILED).

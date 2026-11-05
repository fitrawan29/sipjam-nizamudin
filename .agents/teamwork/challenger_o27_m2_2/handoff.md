# Handoff Report - Adversarial Challenge Milestone M2

**Agent ID**: `challenger_o27_m2_2`  
**Role**: critic, specialist (empirical challenger)  
**Date**: 2026-11-06  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o27_m2_2\`  
**Milestone**: M2  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

1. **Task 1: `DokumenView.tsx` `isReadOnly` & RBAC Preservation**
   - In `src/components/DokumenView.tsx`, lines 52–57:
     ```tsx
     export interface DokumenViewProps {
       user: any;
       isReadOnly?: boolean;
     }
     export default function DokumenView({ user, isReadOnly = false }: DokumenViewProps) {
     ```
   - In mutative operations:
     - `handleOpenAddSyarat` (line 195): `if (isReadOnly) return;`
     - `handleOpenEditSyarat` (line 208): `if (isReadOnly) return;`
     - `handleSaveSyarat` (line 222): `if (isReadOnly) return;`
     - `handleDeleteSyarat` (line 267): `if (isReadOnly) return;`
     - `handleVerifyDokumen` (line 299): `if (isReadOnly) { Swal.fire('Mode Peninjau', ...); return; }`
   - In RBAC logic:
     - Lines 58–59: `normRole` and `isAdmin` strictly partition `admin` and `superadmin`.
     - Line 60: Tab assignment defaults to `matrix` for admin and `list` for non-admin.
     - Lines 110–112: `if (!isAdmin && user?.nama) { docQuery = docQuery.eq('nama_guru', user.nama); }` ensures teachers only see their own documents.
   - Result: `isReadOnly` and RBAC are completely preserved and functional.

2. **Task 2: Existing Presensi, Piket, and Journal Tests (`npm test`)**
   - Executed `npm test` synchronously across all 31 test suites / 49 test files.
   - Verbatim terminal output:
     ```
     ========================================================================
     RESULTS: 31/31 PASSED (0 FAILED)
     ========================================================================
     ```
   - All pre-existing test suites for presensi, piket, and journal passed with 0 regressions.

3. **Task 3: Teacher Multi-Day Leave vs Single-Day Leave Edge Case**
   - In `src/components/GuruPresensi.tsx` (lines 635–648):
     ```tsx
     if (tipeAbsen === 'Datang' && (currentJenis === 'Sakit' || currentJenis === 'Izin' || currentJenis === 'Dinas Luar' || detailIzin === 'Sakit')) {
       const leaveType = (currentJenis === 'Sakit' || detailIzin === 'Sakit') ? 'Sakit' : (currentJenis === 'Dinas Luar') ? 'Dinas Luar' : 'Izin';
       const daysCount = durasiHari || 1;
       const startD = tanggalMulai || getWitaDateStr();
       for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {
         const targetD = addDaysToDateStr(startD, dayOffset);
         autoFillKbmJournalsForLeave(
           { nama_guru: user.nama, user_id: user.id, sekolah_id: user.sekolah_id },
           targetD,
           leaveType,
           { detail_izin: detailIzin, keterangan: keterangan, link_bukti: fileToUpload ? undefined : '-' }
         ).catch(e => console.warn('[GuruPresensi] Auto-fill KBM journal on leave error:', e));
       }
     }
     ```
   - In `src/lib/attendanceAlpa.ts` (lines 1208–1209):
     `if (dayName === 'Minggu') return 0;` ensures Sunday is cleanly skipped.
   - In `src/lib/attendanceAlpa.ts` (lines 140–149 & 170–175):
     Active multi-day leaves (`evaluatedDate >= rec.tanggal_mulai && evaluatedDate <= rec.tanggal_selesai`) correctly protect the teacher from being marked Alpa.
   - **FLAW OBSERVED**: In `src/components/AdminVerifView.tsx`:
     - Line 165: Data loading query for presensi restricts records strictly to timestamps on `date`:
       `query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);`
       This fails to retrieve active multi-day leaves that were submitted on Day 1 when viewing Day 2 or Day 3.
     - Lines 475–483: `submittedList` checks:
       `if (p.timestamp.includes(targetDate)) return true;`
       It does NOT check `p.tanggal_mulai` and `p.tanggal_selesai`.
     - Lines 488–493 & 539–540: As a result, on Day 2 and Day 3 of an approved multi-day leave, `hasSubmitted` is `false`, and the teacher is flagged in `unsubmittedPresensi` as delinquent:
       `pesan_belum: 'Belum melakukan presensi datang maupun pulang'`, `status_label: 'Belum Selesai'`.

4. **Task 4: Absence of SOP Button in `AdminVerifView.tsx` DOM**
   - In `src/components/AdminVerifView.tsx`, lines 770–780:
     ```tsx
     <div className="flex items-center gap-2">
       {/* Eliminasi tampilan tombol Pedoman Kebijakan & SOP SIPJAM (SOP Disiplin, docs/KONSEKUENSI_PELANGGARAN.md) per spesifikasi R2 Pusat Verifikasi */}
       <button 
         type="button" 
         onClick={loadData} 
         className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
         title="Muat ulang data"
       >
         <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
       </button>
     </div>
     ```
   - There are zero `<button>` elements containing "SOP", "Disiplin", or "Pedoman" in the JSX/DOM tree. The header contains exactly 1 reload button.

5. **ADDITIONAL FLAW OBSERVED: `extractTingkat` Regex Word Boundary Flaw**
   - In `src/components/DokumenView.tsx`, lines 28–50:
     ```ts
     /**
      * Normalisasi dan ekstraksi tingkat/jenjang kelas dari string kelas.
      * Contoh: "X Merdeka 1" -> "X", "10A" -> "X", "XI Merdeka 2" -> "XI", "XII IPA 1" -> "XII",
      *         "7A" / "VII-B" -> "VII", "8.1" / "VIII-A" -> "VIII", "9.2" / "IX-A" -> "IX",
      *         "1A" -> "1", dst.
      */
     export function extractTingkat(kelasStr?: string | null): string {
       if (!kelasStr) return '';
       const k = kelasStr.trim();
       if (/\bxii\b/i.test(k) || /\b12\b/.test(k)) return 'XII';
       if (/\bxi\b/i.test(k) || /\b11\b/.test(k)) return 'XI';
       if (/\bx\b/i.test(k) || /\b10\b/.test(k)) return 'X';
       if (/\bix\b/i.test(k) || /\b9\b/.test(k)) return 'IX';
       if (/\bviii\b/i.test(k) || /\b8\b/.test(k)) return 'VIII';
       if (/\bvii\b/i.test(k) || /\b7\b/.test(k)) return 'VII';
       const digitMatch = k.match(/\b([1-6])\b/);
       if (digitMatch) return digitMatch[1];
       ...
       return k.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
     }
     ```
   - When given compact alphanumeric class names common in Indonesian schools (e.g. `"10A"`, `"10B"`, `"7A"`, `"7B"`, `"11A"`, `"12A"`, `"1A"`):
     - `\b10\b` fails because `'A'` is an alphanumeric word character (`\w`), meaning there is NO `\b` boundary between `'0'` and `'A'`.
     - `extractTingkat("10A")` returns `"10A"` and `extractTingkat("10B")` returns `"10B"`.
     - In `submitDokumen` (line 395) and `matchDocToTypeForSubject` (line 518):
       `targetTingkat === dTingkat` evaluates `"10A" === "10B"` -> `false`!
     - As a result, duplicate upload prevention and matrix sharing fail completely for parallel classes named `"10A"` / `"10B"`, directly violating Requirement R2 despite explicit claims in the JSDoc.

---

## 2. Logic Chain

1. *Preservation of RBAC & ReadOnly*: Line-by-line inspection and AST analysis of `src/components/DokumenView.tsx` confirm that `isReadOnly` guards all mutative operations (`handleOpenAddSyarat`, `handleOpenEditSyarat`, `handleSaveSyarat`, `handleDeleteSyarat`, `handleVerifyDokumen`), and `normRole` / `isAdmin` partition admin views from teacher views without regression.
2. *Absence of SOP Button*: AST analysis of `src/components/AdminVerifView.tsx` confirms the button has been removed from the header and replaced with a JSX comment. No button or link in the DOM renders or routes to the SOP.
3. *Test Suite Health*: Running `npm test` verified that all 31 existing test suites pass cleanly.
4. *Multi-Day Leave Gap*: In `AdminVerifView.tsx`, filtering `presensiList` strictly by `p.timestamp.includes(targetDate)` (Observation 3) breaks multi-day leaves on Day 2 and Day 3. Because the timestamp reflects the submission date (Day 1), teachers on approved multi-day leaves are erroneously rendered as unsubmitted/delinquent on subsequent days of their leave.
5. *Regex Word Boundary Gap*: In `extractTingkat`, using `\b` around digits immediately adjacent to letters (Observation 5) causes standard compact class names (e.g., "10A", "10B") to fall through to literal uppercase strings rather than their normalized grade level ("X"). This causes parallel class matching to fail for unspaced class names.

---

## 3. Caveats

- For class names with spaces or hyphens (e.g., "X Merdeka 1", "X-1", "VII-A", "Kelas 10 Merdeka"), `extractTingkat` works correctly. The issue is restricted to unspaced digit+letter names (e.g., "10A", "7B").
- The multi-day leave KBM journal auto-fill (`autoFillKbmJournalsForLeave`) works correctly across the multi-day span and prevents delinquency in the KBM journal. The issue is specifically in the Presensi verification tab of `AdminVerifView.tsx`.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone M2 cannot be approved in its current state due to two empirical issues:
1. **Fix `extractTingkat` regex in `src/components/DokumenView.tsx`**: Update the regex so that digits followed by letters (e.g. `10A`, `11A`, `12A`, `7A`, `8A`, `9A`, `1A`) correctly match their grade level (e.g. `/(?:\b|(?<=\D))(?:10|x)(?=[A-Za-z]|\b)/i` or similar lookahead/lookbehind patterns).
2. **Fix multi-day leave recognition in `src/components/AdminVerifView.tsx`**: In `loadData` and `unsubmittedPresensi` (`submittedList`), include active multi-day leaves where `p.tanggal_mulai <= targetDate && p.tanggal_selesai >= targetDate` so teachers on Day 2+ of approved leaves are not shown as delinquent in `unsubmittedPresensi`.

---

## 5. Verification Method

To independently verify the empirical findings:
1. Run the empirical adversarial test harness:
   ```bash
   npx tsx tests/adversarial_m2_challenger_2.test.ts
   ```
   Inspect the test failure logs demonstrating both the `extractTingkat` failure on "10A"/"10B" and the `AdminVerifView` multi-day date span filter omission.
2. Run standard project tests:
   ```bash
   npm test
   ```
3. Inspect `src/components/DokumenView.tsx` line 28–50 and `src/components/AdminVerifView.tsx` line 475–483.

**Invalidation conditions**:
- `extractTingkat("10A")` returns `"X"` and `extractTingkat("10B")` returns `"X"`.
- `AdminVerifView.tsx` recognizes multi-day leaves across their full date span in `submittedList`.
- All tests in `tests/adversarial_m2_challenger_2.test.ts` pass with 0 failures.

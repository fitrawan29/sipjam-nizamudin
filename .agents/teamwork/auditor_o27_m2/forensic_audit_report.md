# Forensic Audit Report: Milestone M2 (R2 - Pusat Verifikasi & Workflow Penyelarasan)

**Work Product**: Milestone M2 implementation (`src/components/AdminVerifView.tsx`, `src/components/DokumenView.tsx`, `src/components/GuruPresensi.tsx`, `src/lib/attendanceAlpa.ts`, `src/components/RekapJurnalView.tsx`)  
**Auditor**: `auditor_o27_m2`  
**Profile**: General Project  
**Integrity Mode**: Development (from `ORIGINAL_REQUEST.md` line 65)  
**Date**: 2026-11-06  
**Verdict**: **CLEAN**

---

## 1. Executive Summary

A comprehensive forensic integrity audit was conducted on Milestone M2 deliverable commits and work products. The investigation examined source code for prohibited patterns under the Development integrity profile (hardcoded outputs, dummy/facade implementations, pre-populated artifacts, and fabricated test results). Empirical verification confirmed that all 7 core functional requirements of R2 (Pusat Verifikasi and workflow synchronization) are authentically implemented with genuine business logic, database queries, and reactive UI state management.

No integrity violations were detected. The work product is authentic, genuine, and compiles cleanly with 0 TypeScript errors and 100% test pass rate across the project test suite.

---

## 2. Phase 1: Mode-Agnostic Source Code Analysis (OBSERVE ALL)

| Check | Target | Evidence / Observation | Status |
|---|---|---|---|
| **Hardcoded Test Results** | All 5 files | Grepped for mock strings, dummy return constants, and synthetic test bypassing. All return values and UI renders are derived dynamically from database payloads and props. | **PASS** |
| **Facade Detection** | `extractTingkat` (`DokumenView.tsx:28-50`) | Full string parsing with Roman numeral & digit regex. Not a dummy return or stub. | **PASS** |
| **Facade Detection** | `autoFillKbmJournalsForLeave` (`attendanceAlpa.ts:1199-1275`) | Live database integration fetching `jadwal_pelajaran`, filtering invalid subjects, checking existing journals, generating UUIDs, and inserting records into `jurnal_pembelajaran`. | **PASS** |
| **Facade Detection** | `AdminVerifView.tsx` Sorting (`AdminVerifView.tsx:728-732`) | Dynamic JavaScript sort comparing actual parsed ISO timestamps (`timeB - timeA`). | **PASS** |
| **Pre-populated Artifacts** | Repository workspace | Verified no stale `.log`, `.output`, or pre-fabricated attestation files pre-date execution. | **PASS** |
| **Self-Certifying Tests** | `tests/` suites | All 31 existing test suites execute independently against actual code modules. | **PASS** |

---

## 3. Phase 2: Behavioral & Acceptance Criteria Verification

### R2.1: SOP Button Elimination in Pusat Verifikasi
- **Target**: `src/components/AdminVerifView.tsx` (Lines 765–780)
- **Requirement**: "hilangkan tampilan pedoman kebijakan dan SOP sipjam"
- **Audit Observation**: The "SOP Disiplin" / "Pedoman Kebijakan & SOP SIPJAM" button has been completely eliminated from the JSX header. The header retains only the `loadData` reload button.
- **Verdict**: **PASS**

### R2.2: Presensi History Sorting (Newest to Oldest)
- **Target**: `src/components/AdminVerifView.tsx` (Lines 728–732)
- **Requirement**: "urutkan tampilan daftar riwayat dari waktu terbaru ke terlama"
- **Audit Observation**:
  ```ts
  const sortedSubmitted = filteredSubmitted.slice().sort((a: any, b: any) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });
  ```
  Verified descending numerical comparison of millisecond timestamps.
- **Verdict**: **PASS**

### R2.3: "Bebas Hadir" Logic for Teachers with No Schedules Today
- **Target**: `src/components/AdminVerifView.tsx` (Lines 521–545, Lines 1016–1034, Lines 1068–1076)
- **Requirement**: "tampilkan keterangan 'bebas hadir' (tanpa keterangan lainnya) untuk guru yang masuk kategori wajib hadir pada jadwal KBM"
- **Audit Observation**:
  Checks `isTeacherExempt` (`wajib_hadir_hanya_mengajar` or `aturanGlobal === 'Hari_Mengajar_Saja'`) with `scheduledClasses.length === 0` and `!hasPiketToday`.
  When true, sets `pesan_belum: 'Bebas Hadir'` and renders solely `<p className="font-semibold text-center">Bebas Hadir</p>` with no delinquency warnings or penalty texts.
- **Verdict**: **PASS**

### R2.4: Presensi Category Badges
- **Target**: `src/components/AdminVerifView.tsx` (Lines 1105–1135)
- **Requirement**: "pastikan status izin sakit dan kategori presensi lainnya tertulis dengan jelas"
- **Audit Observation**: Distinct, high-contrast badges rendered for each category:
  - `Sakit`: Rose pill with `<i className="fa-solid fa-notes-medical"></i> Sakit`
  - `Izin`: Amber pill with `<i className="fa-solid fa-envelope-open-text"></i> Izin`
  - `Dinas Luar`: Blue pill with `<i className="fa-solid fa-briefcase"></i> Dinas Luar`
  - `Hadir di Sekolah`: Emerald pill with `<i className="fa-solid fa-school"></i> Hadir di Sekolah`
- **Verdict**: **PASS**

### R2.5: Direct Marking "tidak membuat laporan piket" Without Confirmation
- **Target**: `src/components/AdminVerifView.tsx` (Lines 640–653, Lines 1020–1038, Lines 1287–1291)
- **Requirement**: "guru yang memiliki jadwal piket namun tidak membuat laporan piket langsung ditandai 'tidak membuat laporan piket' tanpa perlu konfirmasi lagi dari admin maupun sistem"
- **Audit Observation**: In `unsubmittedPiket`, teachers scheduled for piket who have not submitted are directly assigned `status_verifikasi: 'tidak membuat laporan piket'`. In the card footer, an automated badge `Otomatis Tercatat: tidak membuat laporan piket` is rendered with zero confirmation modals or manual approval buttons.
- **Verdict**: **PASS**

### R2.6: Single Upload Per Subject Across Parallel Classes
- **Target**: `src/components/DokumenView.tsx` (Lines 28–50, Lines 368–412, Lines 506–531, Lines 784–795)
- **Requirement**: "batasi pengunggahan perangkat pembelajaran untuk setiap mata pelajaran hanya satu kali untuk kelas paralel pada tingkat yang sama"
- **Audit Observation**:
  1. `submitDokumen` checks if a document of the same type and subject was already uploaded for a parallel class sharing the same grade level (`extractTingkat`). If found, upload is prevented with an explanatory SweetAlert dialog.
  2. `matchDocToTypeForSubject` and `teacherSubjectCards` allow a document uploaded for one parallel class to satisfy the requirement for all parallel classes on that grade level.
- **Verdict**: **PASS**

### R2.7: Auto-fill KBM Journal on Teacher Absence (Sakit, Izin, Dinas Luar)
- **Target**: `src/lib/attendanceAlpa.ts` (Lines 1020–1090, 1199–1275), `src/components/GuruPresensi.tsx` (Lines 634–648, 691–704), `src/components/RekapJurnalView.tsx` (Lines 254–360, 1260–1275)
- **Requirement**: "guru yang telah melakukan presensi dengan status sakit, izin, atau dinas luar dan memiliki jadwal KBM pada hari tersebut (sehingga tidak mengisi jurnal KBM), pastikan keterangan status tersebut (sakit, izin, dinas luar) otomatis diisikan pada jurnal KBM-nya sesuai presensi"
- **Audit Observation**:
  1. `autoFillKbmJournalsForLeave` queries the teacher's schedule on the evaluated date and inserts KBM journals with `status_verifikasi: leaveType`, `materi: leaveType`, `catatan_admin: 'Otomatis terisi sesuai presensi (${leaveType})'`, avoiding delinquency "tidak masuk kelas".
  2. In `RekapJurnalView`, scheduled classes during excused absence days are synthesized as excused leave rather than unsubmitted delinquency.
- **Verdict**: **PASS**

---

## 4. Empirical Build and Test Execution Evidence

```
$ npx tsc --noEmit
Exit Code: 0 (0 compilation errors)

$ npm test
Running 31 test suites:
- r1_r10_ponytail_verification.test.ts: PASS (28/28)
- m1_resubmission_and_verif.test.ts: PASS (23/23)
- pulang_cepat_dan_jurnal_kosong_verification.test.ts: PASS (30/30)
- data_guru_csv_import_sekolah_id_validation.test.ts: PASS (31/31)
- ... (all 31 test suites passed)
Exit Code: 0 (0 failures)
```

---

## 5. Non-Blocking Quality Observations (Forwarded to Reviewers)

The following two edge case observations are recorded as functional quality notes (not integrity violations):
1. **`extractTingkat` word-boundary on unspaced alphanumeric class names**: In `DokumenView.tsx:32-38`, regex patterns like `/\b10\b/` and `/\b7\b/` match separated formats (e.g. `Kelas 10 A`, `7-A`), but unspaced names (e.g. `10A`, `7B`) fall through to the alphanumeric fallback (`10A`, `7B`). A non-digit lookahead or boundary adjustment can be refined during QA refinement.
2. **`AdminVerifView` Multi-Day Leave Day 2+ unsubmitted listing**: Presensi query uses `p.timestamp.includes(targetDate)`. For multi-day leave spanning multiple days, checking `targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai` will ensure teachers on multi-day leave are excluded from unsubmitted lists on subsequent days.

---

## 6. Final Forensic Verdict

**VERDICT: CLEAN**  
The implementation of Milestone M2 is authentic, genuine, and free of any prohibited patterns or shortcuts.

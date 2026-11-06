# Milestone M1 Adversarial Challenger Report (Nov 2)

**Agent**: `challenger_m1_nov_2`  
**Roles**: critic, specialist  
**Date**: 2026-11-06T23:23:00Z  
**Verdict**: **APPROVE**  
**Milestone**: M1 (Verifikasi Perangkat Kelas X Subject Resolution & Sub Menu Cetak Dokumen Resmi Removal & Route Aliasing)

---

## 1. Observation

1. **Class X Subject Resolution Implementation (`src/components/DokumenView.tsx`)**:
   - Lines 55–65: `normalizeTeacherToken(s)` strips academic titles (`dr`, `drs`, `dra`, `ir`, `prof`, `s.pd`, `m.pd`, `s.kom`, `gr`, etc.) and performs phonetic normalization (e.g. `z` -> `s` to unify `Rizki` and `Riski`).
   - Lines 71–96: `isTeacherNameMatch` implements tokenized prefix and multi-token matching, matching `Ade` <-> `Ade Fitrawan Ibrahim, S.Pd.`, `Susan` <-> `Susana Muliono, S.Pd.`, `Ambar` <-> `Setia Ambar Ningsih Mamonto, S.Pd.`, and `Rizki` <-> `Riski Candra Mamangkai`.
   - Lines 123–146: `MAPEL_EXPANSIONS` maps acronyms to formal subject names (`mtk` -> `'Matematika'`, `b. ing` -> `'Bahasa Inggris'`, `pp`/`pkn` -> `'Pendidikan Pancasila'`, `pjok` -> `'PJOK'`).
   - Lines 183–268: `resolveTeacherSubjects` aggregates assignments across `jadwal_pelajaran`, `guru_mapel`, and `data_guru.mata_pelajaran`, expands prefixes like `"X Merdeka_MTK"`, and sorts Class X subjects first.
   - Line 181: Documented invariant `"Guarantees zero fallback to 'Mata Pelajaran Umum'"`.
   - Lines 33–34 in `tests/m1_verif_and_dokumen_verification.test.ts`: AST code scan confirms 0 occurrences of `'Mata Pelajaran Umum'` in `DokumenView.tsx`.
   - Line 1277 in `DokumenView.tsx`: Card UI formats Class X subjects as:
     ```tsx
     {card.subject.nama_mapel} {card.subject.kelas ? `• Kelas ${card.subject.kelas}` : ''}
     ```
     Producing `"Matematika • Kelas X Merdeka"`.

2. **Sub Menu Cetak Dokumen Resmi Removal & Route Aliasing (`src/components/AdminRekapView.tsx`, `src/lib/navigation.ts`, `src/components/Onboarding/tutorialSteps.ts`)**:
   - In `src/components/AdminRekapView.tsx:570-573`:
     ```tsx
     const tabItems: TabItem[] = [
       { id: 'analitik', label: 'Analitik & Leaderboard', icon: 'fa-chart-pie' },
       { id: 'tabel', label: 'Tabel Rekapitulasi', icon: 'fa-table-list' },
     ];
     ```
     `tabItems` contains exactly `['analitik', 'tabel']` and strictly zero references to `id: 'cetak'`.
   - In `src/components/AdminRekapView.tsx:118`:
     ```tsx
     const normalizedInitialTab = initialTab === 'cetak' ? 'tabel' : initialTab;
     const [activeTab, setActiveTab] = useState<string>(normalizedInitialTab);
     ```
     And lines 122–127 dynamically redirect incoming `initialTab === 'cetak'` to `'tabel'`.
   - In `src/lib/navigation.ts:71-74`:
     ```ts
     if (canonicalView === 'view-admin-rekap' && defaultTab === 'cetak') {
       defaultTab = 'tabel';
     }
     ```
   - In `src/components/Onboarding/tutorialSteps.ts:132`:
     `subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi']` eliminates `'Cetak Dokumen Resmi'`.

3. **Sub-Tab 2 Feature Preservation (`src/components/AdminRekapView.tsx:858-995`)**:
   - Print Headers: `<PrintHeader user={user} sekolahId={user?.sekolah_id} />` in `<div className="hidden print:block">` (lines 629–640).
   - Signatures: `<PrintSignature leftTitle="Mengetahui," leftSubtitle="Pengelola Data / Admin" user={user} sekolahId={user?.sekolah_id} />` (lines 973–985).
   - GPS Watermark: `<button type="button" onClick={() => triggerPrintWithGps()} ...> Cetak Halaman </button>` (line 991).
   - CSV / Excel Export: `<button type="button" onClick={handleExportCsv} ...> Excel </button>` (line 988).
   - Table: Full 11-column table structure intact (No, Nama Guru, Wajib, Hadir, Dinas Luar, Sakit, Izin, Alpa, Pulang Cepat, Keterlambatan, Piket, Jurnal).

4. **Empirical Test Suite Execution Results**:
   - `npx tsx tests/challenger_m1_nov_2_stress.test.ts`:
     Executed 94 assertions across 6 test suites; **94 PASSED, 0 FAILED (100% Pass Rate)**.
   - `npx tsx tests/navigation_consolidation_verification.test.ts`:
     Executed 150 assertions; **150 PASSED, 0 FAILED (100% Pass Rate)**.
   - `npx tsx tests/m1_verif_and_dokumen_verification.test.ts`:
     Executed all checks; **100% PASS**.
   - `npx tsx tests/adversarial_m1_print_verification.test.ts`:
     Executed 37 assertions; **37 PASSED, 0 FAILED (100% Pass Rate)**.
   - `npx tsc --noEmit`: Exited with code 0 (0 compilation errors).
   - `npm run build`: Exited with code 0 (Production Turbopack build succeeded, 13/13 static routes generated).

---

## 2. Logic Chain

1. **Empirical Validation of Subject Resolution**:
   - Observation 1 demonstrates that `normalizeTeacherToken` strips degrees and handles phonetic normalization (`Rizki` <-> `Riski`), and `isTeacherNameMatch` successfully resolves all mandated short name variations (`Ade`, `Susan`, `Ambar`, `Rizki`) against their respective full names and academic credentials.
   - Observation 1 and Suite 2 in `tests/challenger_m1_nov_2_stress.test.ts` prove that acronyms (`MTK`, `b. ing`, `pp`, `pkn`, `pjok`, `mtl`, etc.) expand to formal Indonesian subject titles.
   - Suite 4 in `tests/challenger_m1_nov_2_stress.test.ts` stress-tested 50 distinct teacher/schedule configurations for Class X: in 100% of cases, specific subjects were resolved and zero instances of `'Mata Pelajaran Umum'` were generated.
   - Observation 1 line 1277 proves that Class X cards format to `"Matematika • Kelas X Merdeka"`.

2. **Empirical Validation of Sub Menu Cetak Removal & Route Aliasing**:
   - Observation 2 demonstrates that `tabItems` in `AdminRekapView.tsx` defines strictly `['analitik', 'tabel']`.
   - Direct execution in Suite 5 confirms that passing `initialTab === 'cetak'` in `AdminRekapView` or calling `resolveCanonicalRoute('view-admin-rekap', 'cetak')` maps directly and cleanly to `'tabel'`.
   - Legacy routes `view-analitik` and `view-rekap-guru` with subtab `cetak` likewise redirect cleanly to `tabel`.
   - Tutorial steps are aligned with 2 subtabs, avoiding tour failure.

3. **Empirical Validation of Zero Feature Loss in Sub-Tab 2**:
   - Observation 3 confirms that all capabilities formerly attributed to Sub-Tab 3 (`PrintHeader`, `PrintSignature`, `triggerPrintWithGps`, `handleExportCsv`, 11-column data table) reside directly in Sub-Tab 2. No print or export capability was lost.

4. **Compiler and Build Invariance**:
   - Observation 4 confirms that typechecking (`tsc`) and Next.js production build (`next build`) pass cleanly with 0 errors and 0 warnings.

---

## 3. Caveats

No caveats. All targets have been empirically tested via executed code, automated AST code inspections, and full production build verification.

---

## 4. Conclusion

The implementation for Milestone M1 satisfies all requirements of R1 and R2 with zero regressions.
- Verifikasi Perangkat accurately resolves Class X teacher assignments with robust tokenized matching and acronym expansion.
- `'Mata Pelajaran Umum'` is completely eliminated.
- Sub Menu `Cetak Dokumen Resmi` is cleanly removed from navigation with 100% transparent route aliasing to `'tabel'`.
- Sub-Tab 2 preserves all official print headers, signatures, GPS watermark security, and Excel export tools.

**Final Verdict: APPROVE**.

---

## 5. Verification Method

To independently reproduce and verify this challenger assessment:

1. **Run Static Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected output*: 0 errors, exit code 0.

2. **Run Challenger Stress-Test Suite**:
   ```powershell
   npx tsx tests/challenger_m1_nov_2_stress.test.ts
   ```
   *Expected output*: 94 passed, 0 failed, 100% pass rate.

3. **Run Navigation & M1 Verification Suites**:
   ```powershell
   npx tsx tests/navigation_consolidation_verification.test.ts
   npx tsx tests/m1_verif_and_dokumen_verification.test.ts
   npx tsx tests/adversarial_m1_print_verification.test.ts
   ```
   *Expected output*: All suites pass with 100% pass rate.

4. **Run Production Build**:
   ```powershell
   npm run build
   ```
   *Expected output*: Compiled successfully, generating static pages (13/13) with exit code 0.

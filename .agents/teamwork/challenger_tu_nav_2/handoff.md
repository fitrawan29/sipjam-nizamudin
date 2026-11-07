# Empirical Adversarial Challenge Report — Milestone 2 (R3 & R4)

**Agent ID**: challenger_tu_nav_2  
**Role**: Empirical Challenger (critic, specialist)  
**Target Milestone**: Milestone 2 (Admin Presensi Separation [R3] & Admin TU Account Management [R4])  
**Target Commit**: `9a68fcd`  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Admin Presensi Separation & Partitioning Algorithm (R3)
- **File**: `src/components/AdminRekapView.tsx`, lines 313–372 and lines 558–568.
- Presensi data is partitioned into two distinct arrays:
  ```typescript
  const guruPresensiList = useMemo(() => {
    return filteredPresensi.filter(p => !p.isTU);
  }, [filteredPresensi]);

  const tuPresensiList = useMemo(() => {
    return filteredPresensi.filter(p => Boolean(p.isTU));
  }, [filteredPresensi]);
  ```
- TU identification logic (`tuIdentifiers` Set) incorporates:
  1. Users with normalized role `tatausaha` from `users` (`id`, `username`, `nama`, and canonical name via `canonicalizeTeacherRekapName`).
  2. Staff from `data_guru` where `mata_pelajaran.toLowerCase().includes('tata usaha')` (`nama_guru`, `nip`, `user_id`).
  3. `isStaffTU(person)` checks: `tuIdentifiers.has(n) || tuIdentifiers.has(c) || (nip && tuIdentifiers.has(nip)) || (uid && tuIdentifiers.has(uid)) || mapel.includes('tata usaha')`.
- In UI, lines 993–1052 render Section 1 ("Rekapitulasi Presensi Dewan Guru", 12 columns including Piket & Jurnal), and lines 1070–1140 render Section 2 ("Rekapitulasi Presensi Tenaga Tata Usaha (TU)", 10 columns omitting Piket & Jurnal).
- In empirical test `tests/adversarial_tu_presensi_and_account_m2.test.ts` (Suite 1):
  - 10 diverse teacher/staff accounts (appointed TU, direct TU, zero-attendance, degree-bearing names, test dummy) were evaluated:
    - Zero overlap: `guruPresensiList ∩ tuPresensiList == ∅` (Assertion `ADV-1.2` passed).
    - Zero attendance records preserved with `hadir = 0` and calculated `alpa = 20` (Assertions `ADV-1.8.1` & `ADV-1.8.2` passed).
    - Academic titles ("Ade Fitrawan Ibrahim, M.Pd., Gr.") consolidated into one single canonical entry without duplicates (Assertion `ADV-1.9` passed).
    - Test accounts ("Test Guru Dummy") strictly excluded (Assertion `ADV-1.1` passed).

### 1.2 Print Layout & CSS Page-Break Contract (R3)
- **File**: `src/components/AdminRekapView.tsx`, line 1070:
  ```tsx
  <div className="mt-8 print:mt-0" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
  ```
- Both `breakBefore: 'page'` and `pageBreakBefore: 'always'` are strictly defined in inline styles, ensuring cross-browser engine support across Chromium, Firefox, and WebKit (Assertion `ADV-2.1` passed).
- Dual `PrintHeader` components are rendered:
  - Dewan Guru: Line 716 (`<PrintHeader user={user} sekolahId={user?.sekolah_id} />`)
  - Tenaga TU: Line 1073 (`<PrintHeader user={user} sekolahId={user?.sekolah_id} />`)
- Dual `PrintSignature` components are rendered:
  - Dewan Guru: Line 1059 (`<PrintSignature ... />`) with note regarding Pulang Cepat.
  - Tenaga TU: Line 1144 (`<PrintSignature ... />`)
  (Assertions `ADV-2.2` & `ADV-2.3` passed).

### 1.3 CSV Export Layout & Formatting (R3)
- **File**: `src/components/AdminRekapView.tsx`, lines 635–691 (`handleExportCsv`).
- Line 684 begins with UTF-8 BOM: `new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })` (Assertion `ADV-3.1` passed).
- Distinct section headers and empty separator:
  - Line 640: `'=== REKAPITULASI PRESENSI DEWAN GURU ==='` (12 columns)
  - Line 663: `''`
  - Line 664: `'=== REKAPITULASI PRESENSI TENAGA TATA USAHA (TU) ==='` (10 columns)
- In empirical execution (Suite 3):
  - TU staff (Sri Wahyuni) appears strictly under TU CSV lines; Guru (Budi Santoso) appears strictly under Guru CSV lines (Assertions `ADV-3.5.1` & `ADV-3.5.2` passed).
  - Quotes escaping around names containing commas prevents CSV column corruption.

### 1.4 Admin TU Account Creation Modal Form Validation (R4)
- **File**: `src/components/AdminPenggunaView.tsx`, lines 198–285 (`handleCreateTuUser`).
- Pre-submission validation (`preConfirm`, lines 228–242):
  ```typescript
  preConfirm: () => {
    const nip = (document.getElementById('swal-tu-nip') as HTMLInputElement)?.value?.trim();
    const nama = (document.getElementById('swal-tu-nama') as HTMLInputElement)?.value?.trim();
    const no_hp = (document.getElementById('swal-tu-hp') as HTMLInputElement)?.value?.trim();
    const email = (document.getElementById('swal-tu-email') as HTMLInputElement)?.value?.trim();
    if (!nip || !nama || !no_hp || !email) {
      Swal.showValidationMessage('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!');
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.showValidationMessage('Format email aktif tidak valid (contoh: user@sekolah.sch.id)!');
      return null;
    }
    return { nip, nama, no_hp, email };
  }
  ```
- In empirical stress testing (Suite 4):
  - Missing field matrix (10 variations: empty string, whitespace only, null for each of NIP, Nama, HP, Email, and all 4 empty): 10/10 rejected with message `'Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!'` (Assertions `ADV-4.1.1` to `ADV-4.1.10` passed).
  - Invalid email matrix (9 variants: `plainaddress`, `missingatsign.com`, `@missingusername.com`, `username@.com`, `username@domain`, `username@domain.`, `user name@domain.com`, `username@ domain.com`, `username@domain. com`): 9/9 rejected with message `'Format email aktif tidak valid (contoh: user@sekolah.sch.id)!'` (Assertions `ADV-4.2.1` to `ADV-4.2.9` passed).
  - Valid emails (4 variants: standard, kemenag, sub-domain, plus addressing): 4/4 accepted (Assertions `ADV-4.3.1` to `ADV-4.3.4` passed).
  - Valid submission trims whitespace and provisions:
    - `users`: `{ role: 'tata_usaha', username: nip, password: `${nip}27` }`
    - `data_guru`: `{ mata_pelajaran: 'Tata Usaha (Administrasi)', no_hp, email, status: 'Aktif' }`
    (Assertions `ADV-4.4` to `ADV-4.5.4` passed).

### 1.5 Role Assignment Toggle ("Tunjuk TU" / "Ke Guru") (R4)
- **File**: `src/components/AdminPenggunaView.tsx`, lines 159–195 (`handleToggleTuAssignment`).
- Role toggling logic:
  - If `item.role` normalizes to `tatausaha` -> switches `targetRole` to `'Guru'` (Action: "Kembalikan ke Guru").
  - If `item.role` is `'Guru'` or other -> switches `targetRole` to `'tata_usaha'` (Action: "Tunjuk sebagai Tata Usaha (TU)").
- Persists via `supabase.from('users').update({ role: targetRole }).eq('id', item.userId)`.
- In empirical testing (Suite 5): all 6 role variants toggled accurately and targeted `users` table (Assertions `ADV-5.1.1` to `ADV-5.3` passed).

### 1.6 teacherUserSync Auto-Sync Resilience (R4)
- **File**: `src/lib/teacherUserSync.ts`, lines 66–71 and line 168:
  ```typescript
  let userQuery = supabaseClient.from('users').select('*');
  if (typeof (userQuery as any).in === 'function') {
    userQuery = (userQuery as any).in('role', ['Guru', 'tata_usaha', 'Tata Usaha']);
  }
  ...
  role: matchedUser?.role || 'Guru'
  ```
- In empirical simulation with `MockSupabaseDB` (Suite 6):
  - Existing user with `role: 'tata_usaha'` was NOT reverted or modified when `syncTeacherAccounts` ran (Assertion `ADV-6.3` passed).
  - Returned account list retained `role: 'tata_usaha'` (Assertion `ADV-6.4` passed).
  - Repeated sync execution was completely idempotent (`createdCount = 0`, Assertion `ADV-6.6` passed).

### 1.7 Test Execution Results
- `npx tsc --noEmit`: Exit code 0 (clean, no type errors).
- `npx tsx tests/tu_refinements_and_admin_rekap.test.ts`: 81/81 passed (Exit code 0).
- `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`: 87/87 passed (Exit code 0).
- `npx tsx tests/adversarial_tu_presensi_and_account_m2.test.ts`: 62/62 passed (Exit code 0).
- Full application test suite (`npm test`): 69 suites, hundreds of assertions passed (Exit code 0).

---

## 2. Logic Chain

1. *From Observation 1.1*: The presensi partitioning algorithm cross-indexes `users.role` and `data_guru.mata_pelajaran` using `tuIdentifiers` and `canonicalizeTeacherRekapName`. This guarantees that whether a user was appointed via "Tunjuk TU" (where `users.role = 'tata_usaha'`) or created as dedicated staff (where `mata_pelajaran = 'Tata Usaha (Administrasi)'`), they are reliably routed to `tuPresensiList`. The two output lists are provably mutually exclusive (`guruPresensiList ∩ tuPresensiList == ∅`), satisfying R3.1.
2. *From Observation 1.2*: For print output, Chromium and WebKit print engines can exhibit inconsistent pagination when only modern `breakBefore: 'page'` or legacy `pageBreakBefore: 'always'` is used alone. By specifying both in inline CSS (`style={{ breakBefore: 'page', pageBreakBefore: 'always' }}`) and duplicating `<PrintHeader>` and `<PrintSignature>` in each section, clean, separate physical page rendering is guaranteed across all browsers, satisfying R3.2.
3. *From Observation 1.3*: In `handleExportCsv`, separate section headers, a clean empty row delimiter, and section-specific column counts (12 for Guru vs 10 for TU) ensure exported spreadsheets mirror the segregated interface and prevent confusion regarding teaching-specific duties (piket/jurnal).
4. *From Observation 1.4*: In `AdminPenggunaView.tsx`, the `preConfirm` hook performs synchronous trim and validation on all 4 required fields prior to any asynchronous database calls. The regular expression `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` strictly catches missing `@`, missing domains, missing users, trailing dots, and internal spaces. Invalid inputs are rejected immediately with SweetAlert validation messages before database mutation occurs, satisfying R4.2.
5. *From Observation 1.5 & 1.6*: When an existing teacher is appointed via "Tunjuk TU", only `users.role` is updated to `'tata_usaha'`. In `teacherUserSync.ts`, query lookups explicitly include `'tata_usaha'`, and account resolution uses `matchedUser?.role || 'Guru'`. Because the sync engine never issues an `UPDATE` on existing user records, appointed TU accounts are completely resilient against regression during automated sync cycles, satisfying R4.1 and R5.
6. *From Observation 1.7*: All empirical stress tests, static type checks, and regression suites passed with 100% success and 0 failures.

---

## 3. Caveats

1. **Email Format Regex Tradeoff**: The validation regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` follows `/ponytail` simplicity. It strictly meets all prompt requirements (rejecting missing `@`, missing domains, and spaces), but allows double dots (`..`) or angle brackets (`<script>`) in the local part if intentionally typed. In React JSX, strings are automatically HTML-escaped during rendering, so this does not pose an XSS vulnerability. A future hardening could adopt `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`, but this is not a blocker for Milestone 2.
2. **Physical Print Emulation**: Print pagination was empirically verified through CSS style inspection, AST parsing, and DOM structure verification. Physical print spooling depends on user hardware margins, though the page-break container enforces new sheet generation.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 changes for Admin Presensi Separation (R3) and Admin TU Account Management (R4) are robust, correct, and resilient against adversarial inputs.
- Presensi partitioning cleanly isolates Dewan Guru and Tenaga TU with 0 account overlap or dropped records.
- Print layouts enforce universal page breaks with independent headers and signature blocks.
- CSV exports cleanly format both cohorts.
- New TU account registration mandates all 4 fields (NIP, Nama, HP, Email) and strictly enforces email structure.
- Role toggling and auto-sync preserve appointed TU roles across repeated executions.
- Zero regressions across the entire codebase.

---

## 5. Verification Method

To independently verify all claims:

```bash
# 1. Static Typecheck
npx tsc --noEmit

# 2. Worker Dedicated Milestone 2 Test Suite
npx tsx tests/tu_refinements_and_admin_rekap.test.ts

# 3. Challenger Empirical Adversarial Test Harness (62 assertions)
npx tsx tests/adversarial_tu_presensi_and_account_m2.test.ts

# 4. Full Application Test Suite
npm test
```

**Invalidation Conditions**:
- Any non-zero exit code on the commands above.
- Any overlap between `guruPresensiList` and `tuPresensiList` (`guruPresensiList.some(g => tuPresensiList.includes(g))`).
- Failure of `AdminRekapView` print layout to include `pageBreakBefore: 'always'`.
- Any reversion of an appointed TU user's role to `'Guru'` when `syncTeacherAccounts` is executed.

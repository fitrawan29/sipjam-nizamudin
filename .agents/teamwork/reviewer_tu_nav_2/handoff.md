# Independent Review & Adversarial Stress Test Report: Milestone 2 (R3 & R4)

## Review Summary

**Verdict**: APPROVE

**Integrity Verification**: PASS (Zero integrity violations; no hardcoded test outputs, no facade implementations, no bypassed validations, genuine verification runs).

---

## 1. Observation

Direct code inspections, test execution, and behavior verification:

1. **Admin Presensi Partitioning (`src/components/AdminRekapView.tsx:313-372, 558-568`)**:
   - `tuIdentifiers` collects staff identifiers by querying `users` (`role === 'tata_usaha'` / normalized `'tatausaha'`) and `data_guru` (`mata_pelajaran.includes('tata usaha')`).
   - `isStaffTU` checks user ID, username, NIP, name (including canonicalized name), and subject.
   - Presensi entries are partitioned into two reactive lists:
     ```ts
     const guruPresensiList = useMemo(() => {
       return filteredPresensi.filter(p => !p.isTU);
     }, [filteredPresensi]);

     const tuPresensiList = useMemo(() => {
       return filteredPresensi.filter(p => Boolean(p.isTU));
     }, [filteredPresensi]);
     ```
   - Partitioning ensures every record belongs to exactly one section; no duplication or dropping.

2. **Distinct Table Layout in UI (`src/components/AdminRekapView.tsx:993-1051, 1070-1153`)**:
   - Section 1: "Rekapitulasi Presensi Dewan Guru" (lines 993-1051) renders standard 12-column table (including Piket and Jurnal) with badge count `Total: {guruPresensiList.length} Guru`.
   - Section 2: "Rekapitulasi Presensi Tenaga Tata Usaha (TU)" (lines 1070-1153) renders 10-column table (excluding teaching-specific Piket and Jurnal) with badge count `Total: {tuPresensiList.length} Staf TU`.

3. **Print Layout, Page-Break & Dual Signatures (`src/components/AdminRekapView.tsx:715-726, 1055-1083, 1143-1152`)**:
   - TU container explicitly enforces CSS page-break separation:
     ```tsx
     <div className="mt-8 print:mt-0" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
     ```
   - Section 1 (Dewan Guru) has its own `PrintHeader` (lines 715-726) and `PrintSignature` (lines 1059-1066).
   - Section 2 (Tenaga TU) has its own independent `PrintHeader` (lines 1072-1083) and independent `PrintSignature` (lines 1144-1152).

4. **CSV Export (`src/components/AdminRekapView.tsx:635-691`)**:
   - `handleExportCsv` outputs two explicit sections separated by header lines:
     - `=== REKAPITULASI PRESENSI DEWAN GURU ===` with columns `No, Nama Guru, Wajib, Hadir, Dinas Luar, Sakit, Izin, Alpa, Pulang Cepat, Keterlambatan (Jam/Menit), Piket Disetujui, Jurnal Disetujui`
     - `=== REKAPITULASI PRESENSI TENAGA TATA USAHA (TU) ===` with columns `No, Nama Staf TU, Wajib, Hadir, Dinas Luar, Sakit, Izin, Alpa, Pulang Cepat, Keterlambatan (Jam/Menit)`
   - Prepend with UTF-8 BOM (`\uFEFF`) ensures proper Excel opening.

5. **Mekanisme 1: Row Action "Tunjuk TU" / "Ke Guru" (`src/components/AdminPenggunaView.tsx:158-195, 782-798`)**:
   - Table row includes action button displaying "Tunjuk TU" (teal badge) for Guru and "Ke Guru" (blue badge) for TU.
   - On click, SweetAlert2 confirmation dialog prompts:
     `Akun "${item.nama}" akan dialihkan ke role Tata Usaha (TU). Hak akses akan disesuaikan ke modul TU.`
   - On confirmation, updates `users` table: `.update({ role: targetRole }).eq('id', item.userId)` and reloads data via `handleLoadAndSync(false)`.

6. **Mekanisme 2: Form Akun Baru TU (`src/components/AdminPenggunaView.tsx:198-285`)**:
   - Modal contains all 4 required fields:
     - NIP (Nomor Induk Pegawai)
     - Nama Lengkap
     - Nomor HP (WhatsApp)
     - Email Aktif
   - Pre-submission validation (`preConfirm`):
     - Validates non-empty check: `if (!nip || !nama || !no_hp || !email) Swal.showValidationMessage('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!');`
     - Validates email regex: `if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) Swal.showValidationMessage('Format email aktif tidak valid (contoh: user@sekolah.sch.id)!');`
   - Persistence:
     - Inserts into `users` (`role: 'tata_usaha'`, `username: nip`, `password: defaultPassword`).
     - Inserts into `data_guru` (`mata_pelajaran: 'Tata Usaha (Administrasi)'`, `no_hp`, `email`, `status: 'Aktif'`).

7. **Auto-sync Role Preservation (`src/lib/teacherUserSync.ts:65-71, 168`)**:
   - User query incorporates role `tata_usaha`: `userQuery.in('role', ['Guru', 'tata_usaha', 'Tata Usaha'])`.
   - When building account items: `role: matchedUser?.role || 'Guru'`, which preserves `tata_usaha` without reverting to `Guru`.

8. **Automated Test Results**:
   - `npx tsc --noEmit`: Exit code 0 (0 type errors).
   - `npx tsx tests/tu_refinements_and_admin_rekap.test.ts`: 81 passed, 0 failed.
   - `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`: 87 passed, 0 failed.
   - `npm test`: Full test suite passed (over 65 suites, hundreds of assertions, exit code 0).

---

## 2. Logic Chain

1. *Observation 1 & 2*: Requirements state that Admin presensi must present Guru and TU attendance in distinct tables. By determining TU status through `users.role` and `data_guru.mata_pelajaran` and partitioning into `guruPresensiList` and `tuPresensiList`, the UI renders two isolated tables with custom badge counters and tailored column sets.
2. *Observation 3*: Printing requirements mandate page separation between Guru and TU. By styling the TU wrapper with `{ breakBefore: 'page', pageBreakBefore: 'always' }` and embedding dedicated `PrintHeader` and `PrintSignature` components into each section, printed output generates clean, independent multi-page documents.
3. *Observation 4*: Export requirements demand clean separation. By structuring the CSV into distinct titled blocks with respective headers, spreadsheet exports are clearly organized and non-ambiguous.
4. *Observation 5 & 6*: Admin TU account management requires both appointing existing teachers and creating new staff with 4 mandatory fields. Mekanisme 1 cleanly mutates `users.role` with explicit SweetAlert2 confirmation. Mekanisme 2 enforces strict client-side validation for NIP, Nama Lengkap, Nomor HP, and Email Aktif prior to dual-table persistence.
5. *Observation 7*: System stability requires that auto-syncing does not wipe out manual TU appointments. Querying for `tata_usaha` and preserving `matchedUser?.role` satisfies this without adding unneeded schema migrations (/ponytail).
6. *Observation 8*: Running `tsc`, dedicated test suites, and the entire application test suite confirms zero syntax, typing, logical, or regression errors.

---

## 3. Caveats

No caveats. All requirements (R3 and R4) and associated non-regression constraints (R5 and R6) were verified with authentic evidence.

---

## 4. Conclusion

The Milestone 2 work product for R3 and R4 fully implements the approved requirements with clean, defensive, and minimalist code conforming to the /ponytail philosophy. There are zero integrity violations, zero regressions, and full test suite passes.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce verification:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Milestone 2 dedicated TU & Admin Rekap verification
npx tsx tests/tu_refinements_and_admin_rekap.test.ts

# 3. Dedicated RBAC & Menu Isolation suite
npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts

# 4. Full project test suite
npm test
```

Expected output: All commands terminate with exit code 0 and 0 failures.

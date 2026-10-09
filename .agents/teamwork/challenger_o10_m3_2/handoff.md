# Empirical Handoff Report — Milestone 3 (M3): Challenger 2 (challenger_o10_m3_2)

**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Mode Toggling ("Datang" vs "Pulang") & Status Logging
- In `src/components/PiketView.tsx` line 68:
  ```typescript
  const [scanMode, setScanMode] = useState<'datang' | 'pulang'>('datang');
  ```
- Lines 1309-1358: Mode toggle UI buttons render side-by-side with distinct styles and icons:
  - "PRESENSI DATANG": button with `onClick={() => setScanMode('datang')}`, active theme `bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/50`.
  - "PRESENSI PULANG": button with `onClick={() => setScanMode('pulang')}`, active theme `bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50`.
- Lines 378-383: `handleProcessScan` directly passes active `scanMode` to `recordPresensiSiswa`:
  ```typescript
  const res = await recordPresensiSiswa(supabase, {
    siswa: student,
    status: scanMode,
    sekolahId: user?.sekolah_id,
    deviceId: deviceId
  });
  ```
- Line 350: Barcode detector useEffect includes `[cameraActive, scanMode]` as dependencies, ensuring video frame detection uses the up-to-date scan mode.
- Lines 1526-1532 & 1715-1724: Visual feedback cards and table rows dynamically display green badges for "Datang" and blue badges for "Pulang".
- In `src/lib/qrSiswa.ts` lines 472-535: `recordPresensiSiswa` executes duplicate prevention scoped by `(sekolah_id, tanggal, siswa_id, status)`:
  - Allows both a `'datang'` and a `'pulang'` record for the same student on the same date.
  - Rejects duplicate `'datang'` scans on the same day (`alreadyExists: true`), returning message: `"${siswa.nama_siswa} (${siswa.kelas}) sudah tercatat presensi datang hari ini pada pk. ${jamDisplay}."`.
  - Rejects duplicate `'pulang'` scans on the same day (`alreadyExists: true`).
  - Handles database unique constraint race conditions (`23505`) gracefully without throwing unhandled exceptions.

### 1.2 Filter and Search Operations on Today's Attendance Log
- In `src/components/PiketView.tsx` lines 95-96:
  ```typescript
  const [scanFilterKelas, setScanFilterKelas] = useState('Semua');
  const [scanSearchQuery, setScanSearchQuery] = useState('');
  ```
- Lines 436-442: Filter and search predicate:
  ```typescript
  const filteredTodayScans = todayScans.filter(item => {
    const matchKelas = scanFilterKelas === 'Semua' || item.kelas === scanFilterKelas;
    const matchSearch = !scanSearchQuery.trim() || 
      (item.nama_siswa?.toLowerCase() || '').includes(scanSearchQuery.toLowerCase()) ||
      (item.nisn?.toLowerCase() || '').includes(scanSearchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });
  ```
- Lines 1642-1663: UI controls for class filter dropdown (`<select value={scanFilterKelas} ...>`) and student search input (`<input value={scanSearchQuery} ...>`).
- Lines 1676-1735: Responsive table rendering `filteredTodayScans` with columns No, Waktu, Nama Siswa, Kelas, NISN, Status, and Kios.

### 1.3 Empirical Execution Results
- Executed `npx tsx tests/challenger_o10_m3_2_empirical.test.ts`:
  - 53/53 tests passed:
    - 10 static component & contract checks passed.
    - 21 mode toggling, duplicate check, and 50-student interleaved concurrency checks passed.
    - 22 filter and search checks passed (case-insensitivity, NISN partial match, regex character injection resistance, null/undefined safety, combined filter + search, 5,000-record performance in 1ms).
- Executed `npm test`:
  - All test suites passed cleanly with 0 failures.
- Executed `npx tsc --noEmit`:
  - Exited with code 0 (no type errors).
- Executed `npm run build`:
  - Turbopack Next.js 16.3.4 build compiled and optimized all static and dynamic pages with 0 errors.

---

## 2. Logic Chain

1. *Premise 1*: Mode toggling must reliably switch between "Datang" and "Pulang" in both UI presentation and database persistence without interfering with one another.
2. *Empirical Verification 1*: Test suite `tests/challenger_o10_m3_2_empirical.test.ts` simulated:
   - Student A scanning "Datang" -> saved with `status: 'datang'`, `totalDatang: 1`.
   - Student A scanning "Datang" again -> rejected (`alreadyExists: true`, counts unchanged).
   - Mode switched to "Pulang" -> Student A scans "Pulang" -> saved with `status: 'pulang'`, `totalPulang: 1`, `totalUnik: 1`.
   - Student A scanning "Pulang" again -> rejected (`alreadyExists: true`).
   - Out-of-order check (Student B scans "Pulang" first, then "Datang" later) -> both accepted without crash or blockage.
   - 50 interleaved concurrent scans across 10 kiosks -> zero crosstalk, all 27 Datang, 27 Pulang, 52 unique students accounted for.
3. *Premise 2*: Today's attendance log must allow instant filtering by class and fuzzy searching by student name or NISN without crashing on special characters or missing data.
4. *Empirical Verification 2*:
   - Class filtering with `'Semua'` returns full dataset; specific classes (e.g. `'VII-A'`) return exclusively matching records; non-existent classes return empty arrays without throwing.
   - Search by name is case-insensitive (`'budi'` matches `'Budi Santoso'`, `'BUDI'` matches `'Budi Santoso'`).
   - Search by NISN supports exact and partial substrings (`'002001'` matches Citra Kirana, `'003'` matches VIII-A students).
   - Regex/SQL special characters (`.`, `*`, `+`, `?`, `^`, `$`, `{}`, `()`, `|`, `[]`, `\`, `<script>`, `' OR 1=1 --`) do not crash the app because `.includes()` is used rather than `RegExp`.
   - Missing fields (`nama_siswa: null` or `nisn: null`) are guarded with `?.toLowerCase() || ''`, preventing runtime `TypeError`.
   - Filter and search operations across 5,000 records completed in 1ms, well within interactive UI budget (< 50ms).
5. *Premise 3*: The codebase must compile cleanly under TypeScript and generate a valid production Next.js build.
6. *Empirical Verification 3*: `npx tsc --noEmit` and `npm run build` completed with return code 0.

---

## 3. Caveats

- **Search Whitespace Handling**: In `PiketView.tsx` line 439, `scanSearchQuery.toLowerCase()` preserves leading or trailing whitespace typed by the user. If an operator types `"  Ahmad  "`, `.includes('  ahmad  ')` will not match `"Ahmad Hidayat"`. While not causing any crash or error, trimming the search token before comparison (`const q = scanSearchQuery.trim().toLowerCase()`) is a recommended future ergonomic polish.
- **Hardware USB HID**: Tested via synthetic keyboard Enter and programmatic invocation; physical USB electrical handshake depends on standard OS HID driver behavior.

---

## 4. Conclusion

**VERDICT: APPROVE**

Milestone 3 (M3) PiketView Scanner UI & Laporan Piket successfully satisfies all requirements:
1. Mode toggling between "Datang" and "Pulang" correctly adjusts state, visual themes, and persisted attendance statuses without data conflict.
2. Duplicate attendance scans on the same day are cleanly rejected with informative messages while allowing legitimate check-in and check-out pairs.
3. Filter by class and search by student name/NISN are robust, safe against special character injection, resilient to null fields, and highly performant.
4. Both `npx tsc --noEmit` and `npm run build` pass with zero errors.

---

## 5. Verification Method

Run the following commands in `c:\Users\Fitra\OneDrive\Documents\sipjam-app`:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Run Challenger 2 empirical test suite
npx tsx tests/challenger_o10_m3_2_empirical.test.ts

# 3. Run all unit and integration tests
npm test

# 4. Production build verification
npm run build
```

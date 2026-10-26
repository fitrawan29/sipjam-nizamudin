> [!WARNING] **Skepticism Disclaimer**
> Moderate-to-high confidence on session resilience and recap data hygiene in standard browser lifecycle; low-level mobile OS power management (aggressive WebView task freezing > 12h) remains unsimulated on physical hardware.

## 1. What the prior attempt got wrong
1. **Flawed `isTestGuruName` exact-matching on `"guru test"` variants**:
   - **Input:** `nama_guru = "Guru Test 1"`, `"Guru Test SD"`, or `"Akun Guru Test"`.
   - **Expected:** `isTestGuruName(nama_guru) === true` (identified as test data and filtered from recap views and official prints).
   - **Actual:** `isTestGuruName(nama_guru) === false`. The teacher leaked into attendance table, summary cards, and printed report.
   - **Root Cause:** Prior implementation checked `n === 'guru test'` with strict equality instead of substring inclusion `n.includes('guru test')`, failing on all suffixed or prefixed variations.
2. **Whitespace-only teacher names escaped filtration**:
   - **Input:** `nama = "   "` (whitespace string).
   - **Expected:** `isTestGuruName("   ") === true` (filtered as empty/invalid dummy record).
   - **Actual:** `isTestGuruName("   ") === false`.
   - **Root Cause:** `if (!nama)` checked truthiness without `.trim()`, allowing non-empty whitespace strings to pass through.
3. **Database query filter gap for `"guru test"`**:
   - **Input:** Records in `presensi_guru`, `data_guru`, `jurnal_pembelajaran`, `laporan_piket` with `nama_guru ILIKE '%guru test%'`.
   - **Expected:** Filtered at SQL query level to minimize network transfer.
   - **Actual:** Only `.not('nama_guru', 'ilike', '%test guru%')` was present in SQL queries.
   - **Root Cause:** Incomplete pattern coverage at the PostgREST query layer.
4. **Unsanitized teacher name whitespace causing duplicate ghost rows**:
   - **Input:** Teacher `Drs. H. Ahmad Fauzi` in `data_guru` vs `Drs. H. Ahmad Fauzi ` (with trailing space) in `presensi_guru`.
   - **Expected:** Unified under a single row in the recap map.
   - **Actual:** Created two separate rows in `pMap`, duplicating the teacher in table and print view.
   - **Root Cause:** Aggregation logic did not invoke `.trim()` when indexing into `pMap`, `jMap`, and `pkMap`.
5. **Superadmin session invalidation leaked satellite target school scope**:
   - **Input:** Superadmin session expired or revoked while viewing a target satellite school (`sipjam_active_target_school`).
   - **Expected:** Clean purge of user credentials AND active target school state.
   - **Actual:** `sipjam_active_target_school` lingered in localStorage because `superadmin/page.tsx` called raw `localStorage.removeItem('sipjam_user')` instead of `clearAllClientSessionState()`.
   - **Root Cause:** `superadmin/page.tsx` did not import or use `clearAllClientSessionState()`.
6. **Incomplete migration cleanup scope**:
   - **Input:** Test records in `jurnal_pembelajaran` or `laporan_piket`.
   - **Expected:** Cleaned across all attendance/recap tables.
   - **Actual:** Prior migration only deleted from `presensi_guru` and `data_guru`.
   - **Root Cause:** Omission of `jurnal_pembelajaran` and `laporan_piket` from `20261026_cleanup_test_guru_presensi.sql`.

## 2. What I changed
- `src/components/AdminRekapView.tsx`:
  - Updated `isTestGuruName` with whitespace safety (`!nama || !nama.trim()`) and substring matching across `guru test`, `guru uji`, `guru tester`, `guru testing`, `testing guru`, `guru dummy`, and `dummy guru`.
  - Added `.not('nama_guru', 'ilike', '%guru test%')` and `.not('guru_pelapor', 'ilike', '%guru test%')` to SQL queries.
  - Sanitized and trimmed teacher names (`.trim()`) across `guruList`, `presensi`, `jurnal`, and `piket` to prevent whitespace-induced duplication.
- `src/app/superadmin/page.tsx`:
  - Imported and applied `clearAllClientSessionState()` uniformly across token mismatch, missing token, unauthorized event, and logout handlers to prevent satellite target scope leaks.
- `supabase/migrations/20261026_cleanup_test_guru_presensi.sql`:
  - Added DELETE statements for `jurnal_pembelajaran` and `laporan_piket`, plus `%guru test%` coverage.
- `tests/session_resilience_and_clean_rekap.test.ts`:
  - Upgraded verification suite from shallow static text matching to deep behavioral unit testing:
    - 13-condition error classification matrix (network blips, 5xx server drops, rate limits, timeouts, and PGRST116 account deletion).
    - 26-permutation boundary test for `isTestGuruName`.
    - End-to-end recap aggregation simulation proving zero-attendance retention, whitespace deduplication, and zero test leakage.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/session_resilience_and_clean_rekap.test.ts`: 10 / 10 passed (100% success rate).
  - `npm test`: 39 / 39 test suites passed with 0 failures across the entire repository.
  - `npm run build`: Next.js 16.3.4 (Turbopack) successfully compiled, type-checked, and statically generated 12 routes with 0 errors.
- **Shallow Verification (manual only):**
  - Inspected SQL queries in `AdminRekapView.tsx` and Supabase migration script.
  - Verified live database query confirms 0 records matching `test guru` or `guru test` in `presensi_guru`.
- **Unverified aspects:**
  - Physical mobile device hardware lock screen transitions exceeding 12 hours during cellular tower handover.
  - Physical thermal printer / laser printer spooler driver rendering via browser print dialog.

## 4. Known Issues
- `Minor Robustness Risk`: If an administrator purges a user record directly in the database while the user is offline, the client continues using cached session state until the device reconnects and receives an explicit PGRST116 response.
- `Shallow Verification`: Background tab suspension behavior across non-Chromium browsers (Safari iOS WebKit memory pruning) relies on standard visibilitychange / focus events.

## 5. Remaining risk & next step
- No functional regressions detected. All requirements (R1, R2, R3) are fully addressed and verified.
- The task is complete and ready for handoff.

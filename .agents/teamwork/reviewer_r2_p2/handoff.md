# Adversarial Review & Handoff Report: Master Data Guru CSV Import `sekolah_id` Validation (Round 2)

> [!WARNING] **Skepticism Disclaimer**
> Confidence is high in CSV format resilience, UUID handling, tenant scoping, and PostgreSQL constraint protection (23502, 23503, 22P02, 42501); unverified aspects remain multi-thousand row memory profiling in browser and cross-school data migrations by external scripts.

---

## 1. What the prior attempt got wrong

### Issue 1: Headers with whitespace inside quotes (e.g., `'" sekolah_id "'`) caused false validation rejections
- **Input:** CSV containing quoted headers with leading/trailing spaces, e.g. `'" sekolah_id ",nip,nama_guru'`.
- **Expected:** Header normalized cleanly to `'sekolah_id'` and accepted.
- **Actual:** `normalizeCsvHeaders` converted leading/trailing whitespace into underscores, transforming `'" sekolah_id "'` into `'_sekolah_id_'`. As a result, `row.sekolah_id` was undefined, throwing false validation error `Baris 1: Kolom "sekolah_id" wajib diisi...`.
- **Root cause:** `normalizeCsvHeaders` ran `.replace(/[\s-]+/g, '_')` before trimming quotes and without stripping leading/trailing underscores.

### Issue 2: Windows GUIDs with curly braces (`{...}`) were rejected
- **Input:** Standard Windows/Excel/ADO export format containing GUID with braces, e.g. `{a0000000-0000-0000-0000-000000000001}`.
- **Expected:** Braces stripped and UUID canonicalized to standard lowercase UUID.
- **Actual:** Rejected with `Format "sekolah_id" ("{a0000000-0000-0000-0000-000000000001}") tidak valid. Harus berupa format UUID`.
- **Root cause:** `UUID_REGEX` did not strip enclosing braces or parentheses prior to regex validation.

### Issue 3: Bare carriage-return line breaks (`\r`) failed line splitting
- **Input:** Legacy spreadsheet or Mac CSV exported with bare carriage-returns (`\r`) without `\n`.
- **Expected:** Lines correctly split and parsed.
- **Actual:** `text.split(/\r?\n/)` treated entire file as a single line and threw `File CSV kosong atau tidak memiliki baris data.`.
- **Root cause:** Regex `/\r?\n/` only matches CRLF and LF, missing standalone CR line breaks (`/\r\n|\r|\n/`).

### Issue 4: Tab-delimited (TSV) format failed autodetection
- **Input:** Excel "Text (Tab delimited) (*.txt/*.tsv)" files with tab `\t` delimiters.
- **Expected:** Tab delimiter autodetected and parsed seamlessly.
- **Actual:** Delimiter autodetector only checked `,` and `;`, defaulting to `,`, causing the whole line to be parsed as a single column and throwing `Baris 1: Kolom "sekolah_id" wajib diisi...`.
- **Root cause:** Missing tab `\t` delimiter frequency comparison in delimiter autodetection.

### Issue 5: Missing `nama_guru` in `data_guru` bypassed pre-validation and crashed DB with Error 23502
- **Input:** CSV row with valid `sekolah_id` but empty string for `nama_guru`.
- **Expected:** Caught in pre-validation with clear error `Baris X: Kolom "nama_guru" wajib diisi...`.
- **Actual:** Accepted by pre-validation and submitted to Supabase upsert, crashing PostgreSQL with error `23502: null value in column "nama_guru" of relation "data_guru" violates not-null constraint`.
- **Root cause:** `parseAndValidateMasterCsv` only guarded against dummy names if `row.nama_guru` was truthy, never validating mandatory presence for `data_guru`.

### Issue 6: Cross-tenant `sekolah_id` injection bypassed client validation and crashed DB with RLS 42501
- **Input:** Admin of school A uploaded a CSV containing `sekolah_id` belonging to school B.
- **Expected:** Pre-validation catches tenant mismatch with clear localized error message.
- **Actual:** Passed to database upsert, triggering unhandled PostgreSQL RLS error `42501: new row violates row-level security policy for table "data_guru"`.
- **Root cause:** `parseAndValidateMasterCsv` never verified that `cleanSekolahId` matched `user.sekolah_id` for tenant-scoped users.

### Issue 7: Unregistered school UUID triggered raw PostgreSQL 23503 error
- **Input:** CSV containing syntactically valid UUID not present in `public.sekolah`.
- **Expected:** Human-readable localized error toast.
- **Actual:** Raw database foreign key error `23503: insert or update on table "data_guru" violates foreign key constraint "data_guru_sekolah_id_fkey"`.
- **Root cause:** `importMasterDataFromCsv` lacked error code translation for PostgreSQL 23503 and 42501.

---

## 2. What I changed

1. **`src/lib/dataIntegrityGuard.ts`**:
   - Enhanced `normalizeCsvHeaders` with double trimming (`.trim()`), quote stripping, and trailing underscore stripping (`.replace(/^_+|_+$/g, '')`), plus English aliases (`id_school`, `idschool`).
   - Extended delimiter autodetection to support Tab (`\t`), Semicolon (`;`), and Comma (`,`).
   - Updated line splitting to handle CRLF, LF, and bare CR (`text.split(/\r\n|\r|\n/)`).
   - Added brace and parenthesis stripping (`.replace(/^[{(]+|[})]+$/g, '').trim().toLowerCase()`) for Windows/COM GUIDs.
   - Added mandatory `nama_guru` presence validation for `data_guru` to prevent PostgreSQL 23502.
   - Added cross-tenant isolation enforcement (`user?.sekolah_id && user?.role !== 'superadmin' && cleanSekolahId !== user.sekolah_id.toLowerCase()`).
   - Added PostgreSQL error translation in `importMasterDataFromCsv` for error codes 23503 (FK violation), 23502 (Not-null violation), and 42501 (RLS policy violation).

2. **`tests/data_guru_csv_import_sekolah_id_validation.test.ts`**:
   - Added Test 1.8: Missing `nama_guru` pre-validation rejection.
   - Added Test 1.9: Cross-tenant `sekolah_id` mismatch detection.
   - Added Test 2.3: PostgreSQL 23503 foreign key violation friendly translation.
   - Added Test 3.2d: Windows GUID with braces `{...}` canonicalization.
   - Added Test 3.2e: Tab-delimited (TSV) CSV parsing.
   - Added Test 3.2f: Bare CR line break support.
   - Added Test 3.2g: Quoted headers with spacing and `id_school` alias normalization.
   - Hardened Test 3.3 live database import with canonical admin authentication and tenant headers.
   - Expanded test suite from 15 to 22 passing tests.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  1. `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`
     - **Result:** 22/22 passed (0 failed).
     - Verified: Missing `sekolah_id` (Postgres 23502 prevention), non-UUID `sekolah_id` (Postgres 22P02 prevention), empty delimiter rows, missing `nama_guru` (Postgres 23502 prevention), cross-tenant spoofing, foreign key 23503 translation, semicolon CSV, tab-delimited TSV, bare CR, Windows braces `{...}`, aliases (`id_school`), BOM, and live DB import + cleanup.
  2. `npx tsc --noEmit`
     - **Result:** Exit code 0 (clean TypeScript type check, 0 errors).
  3. `npm run build`
     - **Result:** Exit code 0 (Next.js 16.3.4 Turbopack build succeeded, all 13 static pages generated).
  4. Regression suite: `npx tsx tests/adversarial_multitenant_role_isolation.test.ts`
     - **Result:** 33/33 passed (0 failed).
  5. Regression suite: `npx tsx tests/adversarial_m1_print_verification.test.ts`
     - **Result:** 37/37 passed (0 failed).

- **Shallow Verification (manual only):**
  - Inspected `AdminDataView.tsx` `handleFileUpload` and `handleDownloadTemplate` template payload consistency.

- **Unverified aspects:**
  - Multi-thousand row CSV memory overhead in low-end browser clients (batch size is 50, but client FileReader loads entire string).
  - External headless browser file drag-and-drop simulated via AST and unit tests rather than Cypress/Playwright.

---

## 4. Known Issues
- `Minor Robustness Risk`: Very large CSV files (>10,000 rows) read entirely into browser memory via `file.text()` before chunking could cause brief UI thread hitching on low-end mobile hardware.
- `Shallow Verification`: Headless browser file drag-and-drop verified via React AST and mocked event handlers rather than live E2E browser runner.

---

## 5. Remaining risk & next step
The implementation is now robust against null/missing `sekolah_id` (23502), missing `nama_guru` (23502), non-UUID strings (22P02), unregistered schools (23503), cross-tenant spoofing (42501), Windows GUID braces, tab-separated values, legacy CR line breaks, and Excel header spacing quirks. The task is fully complete and verified.

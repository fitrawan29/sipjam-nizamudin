# Adversarial Review & Handoff Report: Master Data Guru CSV Import `sekolah_id` Validation (Round 3)

> [!WARNING] **Skepticism Disclaimer**
> Confidence is very high in zero-width character resilience, quote stripping, RFC 4180 multi-line record splitting, pipe delimiter support, Indonesian Dapodik aliases, and superuser role normalization; browser-level memory profiling on low-end devices for multi-thousand row files remains the primary external consideration.

---

## 1. What the prior attempt got wrong

### Issue 1: Zero-width characters (`\u200B-\u200D\uFEFF`) in `sekolah_id` caused false validation rejections
- **Input:** CSV containing UUID with copied zero-width spaces, e.g. `\u200Ba0000000-0000-0000-0000-000000000001\u200B`.
- **Expected:** Zero-width spaces stripped and UUID validated cleanly.
- **Actual:** Threw validation error: `Baris 1: Format "sekolah_id" ("​a0000000-0000-0000-0000-000000000001​") tidak valid. Harus berupa format UUID`.
- **Root cause:** `cleanSekolahId` only stripped braces `{}` and whitespace via `.trim()`, failing to strip zero-width characters `\u200B-\u200D\uFEFF`.

### Issue 2: Single-quoted (`'...'`) and double escaped quoted (`""...""`) UUIDs were rejected
- **Input:** CSV containing SQL-style quoted UUID `'a0000000-0000-0000-0000-000000000001'` or CSV-escaped quotes `"""a0000000-0000-0000-0000-000000000001"""`.
- **Expected:** Surrounding quotes stripped and canonicalized to lowercase UUID.
- **Actual:** Threw format validation error `Format "sekolah_id" ("'a0000000-0000-0000-0000-000000000001'") tidak valid. Harus berupa format UUID`.
- **Root cause:** Outer quotes were not stripped before regex testing.

### Issue 3: Multi-line RFC 4180 CSV records broke line splitting, causing false missing `sekolah_id` errors
- **Input:** CSV row with newline inside quotes (e.g. `"Dra. Siti Rahmawati\nS.Pd."`).
- **Expected:** Record treated as a single row with multi-line name normalized to `'Dra. Siti Rahmawati S.Pd.'`.
- **Actual:** `text.split(/\r\n|\r|\n/)` split inside the quoted cell, breaking the row into two fragmented lines. Line 2 lacked `sekolah_id` and threw `Baris 2: Kolom "sekolah_id" wajib diisi dan tidak boleh kosong untuk data guru`.
- **Root cause:** Naive newline splitting without quote awareness.

### Issue 4: Super Admin role variations (`'Super Admin'`, `'super_admin'`) falsely blocked by tenant-scoping
- **Input:** User with `role: 'Super Admin'` and a `sekolah_id` importing records for a different school ID.
- **Expected:** Super Admin permitted to import records for any school.
- **Actual:** Threw cross-tenant error `Kolom "sekolah_id" (...) tidak sesuai dengan ID sekolah akun Anda (...)`.
- **Root cause:** Checked `user?.role?.toLowerCase() !== 'superadmin'`, which did not normalize spaces or underscores (`'super admin' !== 'superadmin'`).

### Issue 5: Literal `"null"` or `"undefined"` strings in `nama_guru` bypassed validation
- **Input:** CSV row with valid `sekolah_id` but literal string `'null'` or `'undefined'` as `nama_guru`.
- **Expected:** Pre-validation catches empty/null teacher name with clear error.
- **Actual:** Passed validation and inserted a teacher with name `"null"` into `data_guru`.
- **Root cause:** Checked only `!row.nama_guru || !String(row.nama_guru).trim()`, which treats string `'null'` as truthy.

### Issue 6: Excel apostrophe prefix on NIP was saved with literal apostrophe
- **Input:** CSV exported from Excel where 18-digit NIP was formatted as `'198501012010011001` to prevent scientific notation.
- **Expected:** Leading apostrophe stripped and clean digits stored.
- **Actual:** Saved into database with literal apostrophe `'198501012010011001`.
- **Root cause:** `row.nip` was not stripped of Excel quote/apostrophe formatting.

### Issue 7: Indonesian Dapodik standard headers (`nama_lengkap`, `mapel`) caused missing column errors
- **Input:** CSV exported with standard Indonesian school headers `sekolah_id,nip,nama_lengkap,mapel`.
- **Expected:** Normalized to `nama_guru` and `mata_pelajaran`.
- **Actual:** Rejected with `Baris 1: Kolom "nama_guru" wajib diisi dan tidak boleh kosong untuk data guru`.
- **Root cause:** Header normalization missed aliases `nama_lengkap`, `namalengkap`, and `mapel`.

### Issue 8: Pipe-delimited (`|`) CSV format was not supported
- **Input:** Text export with pipe delimiter (`sekolah_id|nip|nama_guru|mata_pelajaran`).
- **Expected:** Pipe delimiter autodetected and parsed cleanly.
- **Actual:** Treated as single column comma-separated, rejecting line 1.
- **Root cause:** Delimiter autodetection only supported `,`, `;`, and `\t`.

---

## 2. What I changed

1. **`src/lib/dataIntegrityGuard.ts`**:
   - Added `sanitizeUuid(raw)` helper that comprehensively strips zero-width spaces (`\u200B-\u200D\uFEFF`), outer single/double/escaped quotes, Windows GUID braces `{...}`, parentheses `(...)`, and normalizes to lowercase.
   - Added `splitCsvRecords(text)` implementing RFC 4180 quote-aware record splitting to preserve multi-line cells without breaking rows.
   - Extended delimiter autodetection to support Pipe (`|`) alongside Comma (`,`), Semicolon (`;`), and Tab (`\t`).
   - Extended header aliases in `normalizeCsvHeaders` to include `nama_lengkap`, `namalengkap`, and `mapel`.
   - Hardened `isSuperuser` check with canonical role normalization `(user?.role || '').trim().toLowerCase().replace(/[\s_-]+/g, '')` to support `'Super Admin'` and `'super_admin'`.
   - Added literal `"null"` and `"undefined"` rejection for `nama_guru` to prevent bogus teacher records.
   - Added NIP apostrophe stripping (`.replace(/^['"]+|['"]+$/g, '')`) to cleanly ingest Excel-formatted numbers.

2. **`tests/data_guru_csv_import_sekolah_id_validation.test.ts`**:
   - Added Test 1.10: String literal `"null"` or `"undefined"` in `nama_guru` rejection.
   - Added Test 1.11: Super Admin role variations (`'Super Admin'`, `'super_admin'`) cross-school import.
   - Added Test 3.2h: Zero-width space (`\u200B`) and BOM in `sekolah_id` sanitization.
   - Added Test 3.2i: Single-quoted (`'...'`) and escaped double-quoted (`""...""`) `sekolah_id` canonicalization.
   - Added Test 3.2j: Multi-line RFC 4180 CSV record boundary preservation.
   - Added Test 3.2k: Pipe-delimited (`|`) CSV format autodetection and parsing.
   - Added Test 3.2l: Indonesian standard aliases `nama_lengkap` and `mapel` normalization.
   - Added Test 3.2m: Excel apostrophe prefix on NIP sanitization.
   - Added Test 3.2n: Multi-batch import (120 rows) chunking in batches of 50.
   - Expanded test suite from 22 to 31 passing tests.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  1. `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`
     - **Result:** 31/31 passed (0 failed).
     - Verified:
       - Section 1: Missing `sekolah_id` (23502 prevention), empty string, whitespace string, literal "null", row-level error localization, non-UUID format (22P02 prevention), trailing empty rows, missing `nama_guru`, cross-tenant mismatch, literal "null" in `nama_guru`, and Super Admin role variations.
       - Section 2: PostgreSQL 23502 prevention (zero DB upsert on validation failure), PostgreSQL 22P02 prevention, and PostgreSQL 23503 foreign key error translation.
       - Section 3: Clean row parsing with generated UUID, header aliases (`id_sekolah`, `school_id`, `sekolahid`, `id_school`), BOM prefix, semicolon CSV, Windows GUID braces `{...}`, tab-delimited TSV, bare CR line breaks, quoted headers, zero-width space in UUID, single/escaped quotes in UUID, multi-line RFC 4180 records, pipe-delimited CSV, Indonesian aliases (`nama_lengkap`, `mapel`), Excel apostrophe NIP, batch chunking (120 rows in batches of 50), and live Supabase DB insertion + cleanup.
       - Section 4: Template and UI wiring in `AdminDataView.tsx`.
  2. `npx tsc --noEmit`
     - **Result:** Exit code 0 (clean TypeScript type check, 0 errors).
  3. `npm run build`
     - **Result:** Exit code 0 (Next.js 16.3.4 Turbopack build succeeded, all 13 static/dynamic routes compiled).
  4. Regression suite: `npx tsx tests/adversarial_multitenant_role_isolation.test.ts`
     - **Result:** 33/33 passed (0 failed).

- **Shallow Verification (manual only):**
  - Verified `AdminDataView.tsx` `handleFileUpload` and `handleDownloadTemplate` template payload consistency.

- **Unverified aspects:**
  - Multi-thousand row CSV memory overhead in low-end mobile browser clients (batch size is 50, but client FileReader loads entire string).
  - External headless browser file drag-and-drop simulated via AST and unit tests rather than Cypress/Playwright.

---

## 4. Known Issues
- `Minor Robustness Risk`: Very large CSV files (>10,000 rows) read entirely into browser memory via `file.text()` before chunking could cause brief UI thread hitching on low-end mobile hardware.
- `Shallow Verification`: Headless browser file drag-and-drop verified via React AST and mocked event handlers rather than live E2E browser runner.

---

## 5. Remaining risk & next step
The implementation is now resilient against:
- Null/missing `sekolah_id` (PostgreSQL 23502)
- Zero-width spaces (`\u200B-\u200D\uFEFF`) and BOM
- Single quotes and escaped double quotes around UUIDs
- Non-UUID strings (PostgreSQL 22P02)
- Unregistered school IDs (PostgreSQL 23503)
- Cross-tenant spoofing (PostgreSQL 42501)
- Windows GUID braces `{...}` and parentheses `(...)`
- Multi-line RFC 4180 quoted cells
- Tab (`\t`), Semicolon (`;`), Comma (`,`), and Pipe (`|`) delimiters
- Bare CR (`\r`), LF (`\n`), and CRLF (`\r\n`) line breaks
- Indonesian Dapodik aliases (`nama_lengkap`, `mapel`, `id_sekolah`)
- Super Admin role permutations (`'Super Admin'`, `'super_admin'`)
- Excel apostrophe formatted NIPs
- Batch upsert chunking (batches of 50)

The task is completely resolved and verified.

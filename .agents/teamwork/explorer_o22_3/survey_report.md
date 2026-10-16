# Survey Report: Test Setup, Build Tools, Project Structure & Utilities

**Date**: 2026-10-16  
**Investigator**: `explorer_o22_3`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_3`  
**Project**: SIPJAM (Next.js 16 + React 19 + TypeScript + Supabase + Tailwind CSS)

---

## Executive Summary

A comprehensive survey of the test harness, build infrastructure, utility library layout, and component integration points was performed. 

Key finding: **SIPJAM does not use Jest or Vitest**. Instead, it uses a lightweight, zero-dependency test runner pattern powered directly by `tsx` (`tsx tests/<file>.test.ts`) utilizing Node.js's native `assert` module and in-memory mock environments. Per Ponytail guidelines and `package.json` configuration, **no external test runners or mock libraries (e.g. jsdom, vitest) should be added**.

Both `npx tsc --noEmit` and `npm run build` (Next.js 16.3.4 with Turbopack) currently compile cleanly with 0 errors.

---

## 1. Package Configuration & Dependencies (`package.json`)

### 1.1 Test Runner & Scripts
From `package.json`:
- **Runner**: `tsx` (v4.23.13) — TypeScript Execution engine for Node.js.
- **Test Scripts**:
  - `"test"`: Chains 34 test suites together using `&&`:
    ```json
    "test": "tsx tests/r1_r10_ponytail_verification.test.ts && tsx tests/imageUrl.test.ts && ... && tsx tests/sekolah_registry_schema_cache_resilience.test.ts"
    ```
  - `"test:e2e"`: `"tsx tests/e2e/run_all_e2e.ts"`
- **Build Scripts**:
  - `"dev"`: `"next dev"`
  - `"build"`: `"next build"`
  - `"start"`: `"next start"`
  - `"lint"`: `"eslint"`

### 1.2 Dependencies Audit
- **Runtime Dependencies**:
  - `@supabase/supabase-js`: `^2.116.0`
  - `csv-parse`: `^7.0.2`
  - `dotenv`: `^17.4.2`
  - `next`: `16.3.4`
  - `react`: `19.2.8`
  - `react-dom`: `19.2.8`
  - `sweetalert2`: `^11.26.25`
  - `tsx`: `^4.23.13`
  - `web-push`: `^3.6.7`
- **Dev Dependencies**:
  - `@tailwindcss/postcss`: `^4`
  - `@types/node`: `^20`
  - `@types/react`: `^19`
  - `@types/react-dom`: `^19`
  - `@types/web-push`: `^3.6.4`
  - `eslint`: `^9`
  - `eslint-config-next`: `16.3.4`
  - `jsqr`: `^1.4.0`
  - `tailwindcss`: `^4`
  - `typescript`: `^5`

**Takeaway**: Zero test frameworks installed (no Jest, Vitest, Cypress, Mocha, or Playwright). Adding new test dependencies to `package.json` is strictly prohibited by project constraints (Ponytail principle: zero-bloat).

---

## 2. Existing Test Idioms, Imports, and Mocking Patterns

Analysis of existing suites (e.g. `tests/sekolah_registry_schema_cache_resilience.test.ts`, `tests/adversarial_onboarding_stress.test.ts`, `tests/imageUrl.test.ts`):

### 2.1 File Location & Execution
- All tests reside flat inside `tests/` (111 test files found).
- Individual execution command:
  ```bash
  npx tsx tests/<test_name>.test.ts
  ```

### 2.2 Standard Imports
```typescript
import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
```

### 2.3 Test Assertion & Output Convention
Suites typically define a clean console reporter with pass/fail tracking:
```typescript
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
}

function fail(desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
  if (err) console.error(`    ↳ Error:`, err);
}
```
At the end of `runTests()`, if `failedTests > 0`, the process exits with non-zero exit code:
```typescript
if (failedTests > 0) {
  process.exitCode = 1;
}
```

### 2.4 Mocking Patterns

#### In-Memory `localStorage` Mock:
Seen in `adversarial_onboarding_stress.test.ts` and `challenger_m1_iter2_2_comprehensive_stress.test.ts`:
```typescript
const storage: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = String(v); },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { for (const k of Object.keys(storage)) delete storage[k]; },
};

(global as any).localStorage = mockStorage;
(global as any).window = global;
```

#### In-Memory `window` & `navigator` Mock:
```typescript
(global as any).navigator = {
  onLine: true,
  clipboard: {
    writeText: async (text: string) => { /* mock */ }
  }
};
(global as any).window.open = (url: string, target: string) => { /* track opened url */ };
```

#### Static Source Code Verification:
Tests verify UI and structural wiring without needing full DOM rendering by reading files with `fs.readFileSync` and asserting patterns:
```typescript
const piketContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/PiketView.tsx'), 'utf8');
assert.ok(piketContent.includes('handleSendWhatsAppParent'), 'PiketView must wire WhatsApp notification button');
```

---

## 3. Existing Utilities & Helper Libraries (`src/lib/`, `src/utils/`)

### 3.1 Existing Utilities Survey
- `src/utils/textUtils.ts`:
  - `capitalizeEachWord(input: string)`
  - `formatKepalaSekolahTitle(schoolName?: string | null)`
  - `EDUCATIONAL_ACRONYMS`
- `src/utils/printWithGps.ts`:
  - `triggerPrintWithGps(callback, options)`
- `src/lib/wita.ts`:
  - `getWitaNow()`, `getWitaDateStr()`, `getWitaDateLong()`, `getWitaTimeStr()`, `formatDateWita()`, `formatTimestampWita()`
- `src/lib/toast.ts`:
  - `showToast(title, text, icon, options)` using SweetAlert2
- `src/lib/supabaseClient.ts`:
  - PostgREST client, schema cache error detection helper (`isSchemaCacheOrMissingTableError`)

### 3.2 Gaps Identified for Requirements R1 & R2
1. **Phone / WhatsApp Helpers (R1)**:
   - **Current State**: No dedicated phone normalization or WhatsApp URI generator exists. Only `InformasiView.tsx` line 233 has an ad-hoc inline `https://wa.me/?text=...` call for general broadcast announcements.
   - **Database Field**: `data_siswa.no_hp_ortu` (string | null) is already in the database schema (`src/types/database.ts:333`) and managed in `AdminDataView.tsx`.
   - **Recommendation**: Create `src/utils/whatsappUtils.ts` providing:
     - `normalizeIndonesianPhoneNumber(raw: string | null | undefined): string | null`
       - Strips all non-digit characters (`+`, `-`, spaces, parentheses).
       - Converts `08xxx` -> `628xxx`.
       - Converts `+628xxx` or `628xxx` -> `628xxx`.
       - Rejects invalid formats (e.g. too short `< 9` digits, non-Indonesian invalid prefixes).
     - `generateParentWhatsAppUrl(params: { phone: string; studentName: string; kelas: string; tanggal: string; status: string; schoolName?: string; note?: string; timeStr?: string }): string`
       - Builds standard `https://wa.me/{phone}?text={encodedText}`.
       - Clean, polite Indonesian notification message.
       - Full URI safety via `encodeURIComponent`.
     - `formatWhatsAppAttendanceMessage(params: ...): string`
       - Returns the raw formatted message (for clipboard copy fallback when `no_hp_ortu` is missing).

2. **Storage / Autosave Helpers (R2)**:
   - **Current State in `GuruJurnal.tsx`**:
     - Has partial draft restoration and saving via `localStorage.getItem('sipjam_jurnal_autosave')` and `localStorage.setItem(...)` (lines 150-226).
     - Clears storage on successful submission (`localStorage.removeItem('sipjam_jurnal_autosave')` lines 934-936).
     - **Deficiency**: Does not maintain the draft if submission fails due to network outage / `!navigator.onLine`, and does not show an explicit draft status indicator in the UI.
   - **Current State in `GradebookView.tsx`**:
     - Tracks changes in `gradesMap` and `dirtyGrades`, with `beforeunload` warning (lines 152-166).
     - **Deficiency**: Does NOT save debounced drafts to `localStorage`. Does not restore drafts on mount, and does not have draft cleanup upon successful upsert.
   - **Recommendation**: Add helper functions in `src/utils/storageUtils.ts` (or `src/utils/gradebookDraftUtils.ts`):
     - `getGradebookDraftKey(sekolahId: string | null, mapel: string, kelas: string, tpId: string | null): string`:
       Returns `sipjam_gradebook_draft_${sekolahId || 'default'}_${mapel}_${kelas}_${tpId || 'all'}`.
     - `saveGradebookDraft(key: string, data: Record<string, Record<string, number | null>>): void`
     - `loadGradebookDraft(key: string): Record<string, Record<string, number | null>> | null`
     - `clearGradebookDraft(key: string): void`

---

## 4. TypeScript Configuration & Build Health

### 4.1 `tsconfig.json` Configuration
- `target`: `ES2017`
- `lib`: `["dom", "dom.iterable", "esnext"]`
- `strict`: `true`
- `noEmit`: `true`
- `moduleResolution`: `bundler`
- `module`: `esnext`
- `paths`: `{ "@/*": ["./src/*"] }`
- `exclude`: `["node_modules", "tests"]`

*Note*: `tests` is excluded from the standard Next.js build compilation (`tsconfig.json`), allowing `tsx` to run tests independently while `npx tsc --noEmit` and `npm run build` strictly check application code.

### 4.2 Build Verification
- **Typecheck**: `npx tsc --noEmit` -> **PASSED** (Exit code 0).
- **Next.js Turbopack Build**: `npm run build` -> **PASSED** (Exit code 0, 12 static/dynamic routes compiled in 27s).

---

## 5. Blueprint & Recommendations for `tests/whatsapp_parent_notify_and_autosave.test.ts`

The test file should be structured with the standard pattern and cover the following 5 rigorous test sections:

### Section 1: Indonesian Phone Number Normalization
- Formats to test:
  - Standard national format: `081234567890` -> `6281234567890`
  - International format with plus: `+6281234567890` -> `6281234567890`
  - International format without plus: `6281234567890` -> `6281234567890`
  - Formatted with dashes: `0812-3456-7890` -> `6281234567890`
  - Formatted with spaces: `0812 3456 7890` -> `6281234567890`
  - Formatted with brackets/spaces: `(0812) 3456-7890` -> `6281234567890`
  - Edge cases / invalid numbers: `""`, `null`, `undefined`, `"12345"` (too short), `"abc"` -> returns `null` or empty.

### Section 2: Parent WhatsApp Message & URI Generation
- Output structure verification:
  - Must start with `https://wa.me/628...`
  - Must contain `?text=` with `encodeURIComponent` encoding (no unescaped spaces or newlines in the URI query).
  - Message content must include:
    - Student name (`nama_siswa`)
    - Class (`kelas`)
    - Date (`tanggal`)
    - Attendance status (`status`: Hadir, Terlambat, Alpa, Bolos, Izin, Sakit)
    - School name (or default school label)
  - Verify message formatting for different attendance statuses (e.g. specific note for Alpa/Bolos vs Terlambat).

### Section 3: Gradebook Autosave & Storage Lifecycle (Mock `localStorage`)
- Setup mock `localStorage`.
- Test scoped key generation: `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`.
- Test debounced draft persistence when grade input changes.
- Test automatic restoration of draft on load when draft exists.
- Test cleanup of draft key upon successful database upsert (`clearGradebookDraft`).
- Test isolation between different classes, subjects, and TPs (draft for Class 7A does not leak to Class 7B).

### Section 4: GuruJurnal Offline Draft Retention & Indicator
- Test that when network is offline (`navigator.onLine = false` or submission fails with network error), the draft in `localStorage` (`sipjam_jurnal_autosave`) is **preserved** and not deleted.
- Test that `localStorage.removeItem('sipjam_jurnal_autosave')` only runs on confirmed Supabase success (`!error`).
- Test draft indicator state evaluation.

### Section 5: Static Code Inspection & Wiring Verification
- Read `PiketView.tsx` and assert:
  - WhatsApp action button rendered in table/rows.
  - Integration with `no_hp_ortu` and fallback SweetAlert modal for manual number entry / copy message to clipboard.
- Read `RekapSiswaView.tsx` and assert:
  - WhatsApp action button rendered in Presensi Gerbang & Rekap Absen.
- Read `GradebookView.tsx` and assert:
  - Local draft saving/restoring hooks, scoped storage keys, and cleanup on `saveAllGrades`.
  - Draft status indicator in UI.
- Read `GuruJurnal.tsx` and assert:
  - Safe error handling on submit failure preserving form state and draft in `localStorage`.
  - Offline/draft status indicator.

---

## 6. Registration in `package.json`

Once `tests/whatsapp_parent_notify_and_autosave.test.ts` is created by the team:
Append `&& tsx tests/whatsapp_parent_notify_and_autosave.test.ts` to the `"test"` script in `package.json` so that `npm test` runs it automatically as part of the continuous suite.

# Handoff Report: Survey of Test Setup, Build Tools & Utilities

**Agent**: `explorer_o22_3`  
**Parent / Caller**: `b8a13b7c-6c39-493c-96de-cd823a6f72d9`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_3`  
**Date**: 2026-10-16  
**Type**: Hard Handoff (Investigation & Survey Complete)

---

## 1. Observation

1. **Package Test Runner & Scripts (`package.json:5-12`)**:
   - `"test"` script executes:
     `"tsx tests/r1_r10_ponytail_verification.test.ts && tsx tests/imageUrl.test.ts && ... && tsx tests/sekolah_registry_schema_cache_resilience.test.ts"`
   - `"test:e2e"` script executes: `"tsx tests/e2e/run_all_e2e.ts"`
   - Neither `jest`, `vitest`, `mocha`, nor `jsdom` exists in `"dependencies"` or `"devDependencies"`.
   - `tsx` version is `^4.23.13`.
2. **Existing Test Idioms & Patterns (`tests/*.test.ts`)**:
   - 111 test files exist in `tests/`.
   - Tests are plain TypeScript files using Node's standard `assert` module (`import assert from 'assert'`), `import * as fs from 'fs'`, and `import * as path from 'path'`.
   - In-memory mock patterns for browser globals:
     - In `tests/adversarial_onboarding_stress.test.ts:121-131`:
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
   - Running tests directly via `npx tsx tests/sekolah_registry_schema_cache_resilience.test.ts` passed 40/40 assertions with code 0 in ~3 seconds.
3. **TypeScript Configuration & Build Command**:
   - `tsconfig.json:33`: `"exclude": ["node_modules", "tests"]`
   - `tsconfig.json:21-23`: `"paths": { "@/*": ["./src/*"] }`
   - Command `npx tsc --noEmit` executed and passed cleanly with exit code 0.
   - Command `npm run build` executed and passed cleanly with exit code 0 (Next.js 16.3.4 with Turbopack, 12 static/dynamic routes compiled).
4. **Existing Codebase Utilities**:
   - `src/utils/textUtils.ts`: Provides `capitalizeEachWord` and `formatKepalaSekolahTitle`.
   - `src/lib/wita.ts`: Provides `getWitaDateStr`, `formatDateWita`, and timezone utilities.
   - `src/lib/toast.ts`: Provides SweetAlert2 `showToast`.
   - `src/types/database.ts:333`: `data_siswa` table already includes `no_hp_ortu: string | null`.
   - `src/components/GuruJurnal.tsx:150-226`: Uses `sipjam_jurnal_autosave` in `localStorage` for form state, and removes it on success at lines 934-936. However, does not handle offline retention or explicit draft status indication.
   - `src/components/GradebookView.tsx:152-166`: Uses `gradesMap` and `dirtyGrades` state with `beforeunload` warning, but lacks localStorage auto-save draft persistence, draft recovery, and draft cleanup on `saveAllGrades` (lines 1225-1230).
   - No phone number normalization or WhatsApp parent notification utility currently exists in `src/utils/` or `src/lib/`.

---

## 2. Logic Chain

1. **Test Runner Selection**:
   - Because `package.json` contains no Jest or Vitest, and the Ponytail principle strictly prohibits unnecessary new dependencies, the new test suite `tests/whatsapp_parent_notify_and_autosave.test.ts` must be written as a standalone TypeScript script executed with `npx tsx`.
2. **Environment Simulation Strategy**:
   - Because tests run in Node.js without jsdom, testing `localStorage`, `window.open`, and `navigator.onLine` requires setting up lightweight in-memory mocks on `globalThis` / `global`, matching the proven pattern in `tests/adversarial_onboarding_stress.test.ts`.
3. **Component Verification Strategy**:
   - To verify UI wiring in React components (`PiketView.tsx`, `RekapSiswaView.tsx`, `GradebookView.tsx`, `GuruJurnal.tsx`) without rendering heavy DOM trees, tests should use static AST/source inspection via `fs.readFileSync(filePath, 'utf8')` combined with unit test verification of extracted helper utilities.
4. **Utility Architecture**:
   - Building WhatsApp URIs and normalising Indonesian phone numbers directly inside components would lead to duplicate code and test difficulty across `PiketView.tsx` and `RekapSiswaView.tsx`.
   - Therefore, creating a pure utility `src/utils/whatsappUtils.ts` (handling normalization to `628xxx`, message generation, and URI creation) allows 100% test coverage via pure unit tests, while components simply consume the utility.
   - Similarly, providing pure helper functions for Gradebook draft key generation (`sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`) ensures clean testability and prevents storage key mismatches.

---

## 3. Caveats

- Database tests: The local test environment runs without a live Supabase database connection (as seen in `[supabaseClient] MISSING ENV VARS! Falling back to placeholder client`). Unit tests must rely on in-memory mocks and pure function logic rather than live Supabase network calls.
- Browser behavior: `window.open` and clipboard access (`navigator.clipboard.writeText`) will be tested via mocks; actual OS WhatsApp app launching relies on native browser URI handler dispatching `https://wa.me/...`.

---

## 4. Conclusion

1. The test runner for SIPJAM is `tsx`. The new test `tests/whatsapp_parent_notify_and_autosave.test.ts` must use native Node `assert`, run via `npx tsx`, and be registered in `package.json`'s `"test"` script.
2. Implementers should create `src/utils/whatsappUtils.ts` to cleanly isolate phone normalization (`08...`/`+62...` -> `628...`) and URI creation (`https://wa.me/{phone}?text=...`).
3. In `GradebookView.tsx`, implement debounced auto-save to `localStorage` using key `sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`, restore on mount, and clear upon successful upsert.
4. In `GuruJurnal.tsx`, preserve the local draft when submission encounters network errors or `!navigator.onLine`, and expose a visible draft status indicator.
5. In `PiketView.tsx` and `RekapSiswaView.tsx`, wire the 1-click WhatsApp parent button for each student row with SweetAlert modal fallback for missing phone numbers.

---

## 5. Verification Method

To verify the findings and the proposed test environment:
```bash
# 1. Verify TypeScript type safety
npx tsc --noEmit

# 2. Verify production Next.js build
npm run build

# 3. Verify representative existing test execution
npx tsx tests/sekolah_registry_schema_cache_resilience.test.ts

# 4. Verify future new test file once created
npx tsx tests/whatsapp_parent_notify_and_autosave.test.ts
```

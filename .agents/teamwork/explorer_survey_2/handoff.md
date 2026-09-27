# Handoff Report: Testing and Build Setup Investigation

## 1. Observation

### 1.1 Test Runner & Framework Configuration (`package.json`)
- In `package.json` lines 10–11:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "tsx tests/imageUrl.test.ts && tsx tests/printHeader.test.ts && tsx tests/qolAudit.test.ts && tsx tests/m6_1_database_and_types.test.ts && tsx tests/m6_2_print_redesign.test.ts && tsx tests/m6_3_dashboards_and_verif.test.ts && tsx tests/m6_4_piket_perangkat_broadcast.test.ts && tsx tests/m10_r2_r3.test.ts && tsx tests/m1_resubmission_and_verif.test.ts && tsx tests/m4_features_verification.test.ts && tsx tests/ui_ux_improvements_audit.test.ts && tsx tests/sistem_blok_verification.test.ts",
    "test:e2e": "tsx tests/e2e/run_all_e2e.ts"
  }
  ```
- Packages inspected via `node -e`:
  - `vitest`: NOT FOUND
  - `jest`: NOT FOUND
  - `@testing-library/react`: NOT FOUND
  - `jsdom`: NOT FOUND
- Installed runner: `tsx` (`"^4.23.13"`) under `dependencies` in `package.json` line 21.
- Existing tests location:
  - `tests/` contains 62 `.ts` test files plus `tests/e2e/`.
  - `src/` contains 0 test files (no `*.test.*` or `*.spec.*` inside `src/`).
  - No root-level `__tests__/` directory exists (only 4 nested inside `node_modules`).

### 1.2 Test Execution Model
- Tests in `tests/` are executable standalone TypeScript scripts utilizing Node.js (v24.15.0) and `tsx`:
  - E.g., `npx tsx tests/imageUrl.test.ts` completed with exit code 0 (`ALL 11 TESTS PASSED!`).
  - E.g., `npx tsx tests/printHeader.test.ts` completed with exit code 0 (`ALL PRINT HEADER, GURU JURNAL & REKAP TESTS PASSED!`).
- Path aliases: `tsx` natively resolves `@/*` mapped to `./src/*` configured in `tsconfig.json`. Tested and verified:
  - Command: `npx tsx -e "import { isGoogleDriveUrl } from '@/lib/imageUrl'; console.log('@/ alias works:', typeof isGoogleDriveUrl);"`
  - Output: `@/ alias works: function` (Exit code: 0).
- Existing test patterns:
  - Tests define custom assertion helpers (`function assert(condition: boolean, label: string) { if (!condition) { process.exit(1); } }`).
  - Tests perform module function calls, database verification queries, and source code AST/DOM contract assertions via `fs.readFileSync`.

### 1.3 TypeScript Configuration (`tsconfig.json`)
- In `tsconfig.json` lines 1–35:
  ```json
  {
    "compilerOptions": {
      "target": "ES2017",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "react-jsx",
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      ".next/dev/types/**/*.ts",
      "**/*.mts"
    ],
    "exclude": ["node_modules", "tests"]
  }
  ```
- Command to run type checking: `npx tsc --noEmit`.
  - Executed tool command: `npx tsc --noEmit`.
  - Result: Exit code 0 (Finished with 0 errors).
  - Note: `"tests"` is excluded from the main `tsconfig.json` compiler check so that test scripts do not interfere with Next.js type generation or production builds.

### 1.4 Production Build & Next.js 16 Conventions
- Production build command: `npm run build` (executing `next build`).
- Tool execution result:
  - Command `npm run build` ran with Next.js 16.3.4 (Turbopack).
  - Result: Exit code 0.
  - Compilation: `Compiled successfully in 1603ms`.
  - TypeScript validation: `Finished TypeScript in 5.4s`.
  - Static page generation: `Generating static pages using 12 workers (11/11) in 766ms`.
- Next.js 16 conventions observed:
  1. `AGENTS.md` highlights breaking changes in Next.js 16 and notes `node_modules/next/dist/docs/`.
  2. Static prerendering: `next build` prerenders `/` (App Router). Any top-level evaluation of `window`, `localStorage`, or `document` during module evaluation or initial server-side rendering will throw `ReferenceError` and break the build.
  3. Client components: Interactive components (`OnboardingTutorial.tsx`, `AIAssistant.tsx`) must declare `'use client';` at the top of the file.

### 1.5 Constraints from `ORIGINAL_REQUEST.md` and `orchestrator_5/DISPATCH.md`
- `ORIGINAL_REQUEST.md` (lines 107, 134):
  - "Gunakan Tailwind CSS dan Font Awesome yang sudah ada — tidak boleh menambahkan dependency npm baru."
  - "Tidak ada dependency npm baru di package.json"
- `orchestrator_5/DISPATCH.md` (lines 48–51):
  - "No new npm packages/dependencies. Use existing Tailwind CSS and Font Awesome."
  - "Build automated tests (e.g. Vitest / Jest) verifying the AI Assistant keyword matching, context awareness, fallback behavior, onboarding steps, and localStorage persistence."

---

## 2. Logic Chain

1. **Test Runner Selection**:
   - `ORIGINAL_REQUEST.md` strictly bans new npm dependencies ("Tidak ada dependency npm baru di package.json").
   - Neither Vitest nor Jest is installed. Installing Vitest, Jest, or React Testing Library would violate R4.
   - `tsx` (`^4.23.13`) is already installed and powers all 62 existing test suites in `tests/`.
   - Therefore, new tests for the AI Assistant and Onboarding Tutorial MUST be created as TypeScript test scripts executed via `tsx` (e.g., `npx tsx tests/ai_assistant_faq.test.ts` and `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`).

2. **React Component Testing Without New Packages**:
   - React 19 and `react-dom/server` (`renderToString`) are already available in `node_modules`.
   - Tested and verified: `node -e "const { renderToString } = require('react-dom/server'); console.log(typeof renderToString);"` outputs `function`.
   - By combining `renderToString` with Node.js assertions and simulated `global.localStorage` / `global.window`, we can test component output HTML, step transitions, and localStorage persistence purely with existing tools without needing jsdom or @testing-library.

3. **Build & Typecheck Resilience**:
   - Next.js 16 prerenders `/` during `npm run build`.
   - In `AppScreen.tsx`, client state uses `typeof window !== 'undefined'` guards.
   - Any new component touching `localStorage` (such as `sipjam_onboarding_guru_done` and `sipjam_onboarding_admin_done`) must either access `localStorage` inside `useEffect()` or guard with `typeof window !== 'undefined'`.

---

## 3. Caveats

1. **`npm test` vs Individual Test Suites**:
   - `npm test` chains 12 legacy test suites sequentially. The 12th suite (`sistem_blok_verification.test.ts`) currently attempts a live query against `jadwal_pelajaran` expecting `> 0` records, but the remote database currently has 0 schedules, causing that specific assertion to fail.
   - New test suites for the AI Assistant and Onboarding Tutorial should be standalone, offline-friendly, and executable independently via `npx tsx tests/<test_name>.test.ts`.
2. **Interactive Event Simulation in Node**:
   - Because `@testing-library/react` and `jsdom` are not installed, click events cannot be triggered via synthetic DOM events in a headless node process unless a lightweight mock DOM or state controller unit test is used. The recommended architecture separates pure state logic (e.g. `getTutorialSteps`, `shouldShowTutorial`, `markTutorialDone`) from JSX rendering, enabling 100% unit test coverage of transitions and persistence, complemented by `renderToString` and DOM contract checks.

---

## 4. Conclusion & Recommendations

### 4.1 Test Execution Architecture
Do NOT install Vitest or Jest. Implement tests in `tests/` using TypeScript, executed via `tsx`.

Create two dedicated test files:
1. `tests/ai_assistant_faq.test.ts`
2. `tests/onboarding_and_ai_assistant_ui.test.ts`

Both can be run individually:
```bash
npx tsx tests/ai_assistant_faq.test.ts
npx tsx tests/onboarding_and_ai_assistant_ui.test.ts
```

### 4.2 Detailed Test Structure Recommendations

#### A. For `knowledgeBase.ts` and `faqMatcher.ts` (`tests/ai_assistant_faq.test.ts`)
- **Knowledge Base Verification**:
  - Assert `FAQ_ITEMS.length >= 30` (requirement calls for at least 30 Q&As).
  - Verify every entry contains: `id` (unique string), `question` (Bahasa Indonesia string), `answer` (Bahasa Indonesia string), `keywords` (array of >= 2 keywords), and `category`.
  - Verify coverage of all 19+ views: Dashboard, Presensi Datang/Pulang, Jurnal Mengajar, Piket, Dokumen/Perangkat, Daftar Nilai, Chat Guru, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa, Verifikasi, Sistem Blok, Jurnal Kelas, Analitik, Rekap Akhir, Master Data, Akses Data/Backup, Sistem.
- **Keyword Scoring & Search Matching**:
  - Test exact keyword matching (e.g. "presensi", "jurnal", "piket").
  - Test natural language phrases (e.g. "bagaimana cara mengajukan presensi", "cara input jurnal mengajar").
  - Test case-insensitivity and whitespace normalization (e.g. `"  JURNAL MENGAJAR  "`).
- **Context-Aware Prioritization**:
  - Execute a query with generic terms like "jadwal" or "panduan".
  - Pass `currentView = 'view-sistem-blok'` vs `currentView = 'view-guru-presensi'`.
  - Assert that the matcher assigns a priority/score boost to FAQ items matching the active view.
- **Fallback Mechanism**:
  - Test unmatched queries (e.g. "resep martabak telur", nonsense strings, empty string).
  - Assert that the matcher returns a friendly fallback message in Bahasa Indonesia and lists available topic categories with suggested prompt chips.
- **Offline / No-API Guarantee**:
  - Verify the matching function is synchronous or purely local with zero network calls.

#### B. For `OnboardingTutorial.tsx` and `AIAssistant.tsx` (`tests/onboarding_and_ai_assistant_ui.test.ts`)
- **Step Configuration & Role Targeting**:
  - Export `GURU_STEPS` and `ADMIN_STEPS` configurations.
  - Verify `GURU_STEPS.length >= 5` covering:
    1. Hamburger menu button (`[data-tour="hamburger-btn"]`)
    2. Menu Presensi Datang (`[data-tour="view-guru-presensi"]`)
    3. Menu Jurnal Mengajar (`[data-tour="view-guru-jurnal"]`)
    4. Menu Piket (`[data-tour="view-piket"]`)
    5. Floating AI Assistant button (`[data-tour="ai-assistant-btn"]`)
  - Verify `ADMIN_STEPS.length >= 6` covering:
    1. Menu Verifikasi (`[data-tour="view-admin-verif"]`)
    2. Menu Sistem Blok (`[data-tour="view-sistem-blok"]`)
    3. Menu Master Data (`[data-tour="view-admin-data"]`)
    4. Menu Analitik (`[data-tour="view-analitik"]`)
    5. Menu Sistem (`[data-tour="view-admin-config"]`)
    6. Floating AI Assistant button (`[data-tour="ai-assistant-btn"]`)
- **LocalStorage Persistence Logic**:
  - Mock `localStorage` in the test runner.
  - Test initial state: keys `sipjam_onboarding_guru_done` and `sipjam_onboarding_admin_done` are missing -> tutorial triggers (`shouldShowTutorial` returns `true`).
  - Test completion/skip: after completion, key is set to `'true'` -> `shouldShowTutorial` returns `false`.
  - Test reset: calling reset helper removes or sets key to `'false'`, allowing restart from sidebar.
  - Test superadmin exemption: superadmin role always returns `false`.
- **Component SSR Rendering (`react-dom/server`)**:
  - Render `<OnboardingTutorial role="guru" isOpen={true} ... />` via `renderToString`:
    - Assert output HTML contains step 1 title, step explanation text, "Lewati", "Lanjut", and step indicator ("1 / 5").
  - Render `<AIAssistant currentView="view-home" ... />` via `renderToString`:
    - Assert output HTML contains floating trigger button with icon and `data-tour="ai-assistant-btn"`.
- **AppScreen Integration Contract**:
  - Use `fs.readFileSync` on `src/components/AppScreen.tsx` to assert:
    - Imports `AIAssistant` and `OnboardingTutorial`.
    - Renders `<AIAssistant currentView={currentView} user={user} />`.
    - Renders `<OnboardingTutorial ... />`.
    - All `data-tour` target attributes are present on respective header/sidebar/floating elements.
    - Sidebar includes a button to trigger tutorial replay ("Lihat Tutorial Lagi").

### 4.3 Build & Typecheck Verification Commands
Prior to committing and delivering changes:
1. `npx tsc --noEmit` — must exit with code 0.
2. `npm run build` — must exit with code 0 and compile all static routes without SSR errors.
3. `npx tsx tests/ai_assistant_faq.test.ts` — must pass 100%.
4. `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts` — must pass 100%.

---

## 5. Verification Method

To independently verify these findings, run the following commands in powershell:

1. **Verify No Vitest/Jest installed**:
   ```powershell
   node -e "['vitest', 'jest', '@testing-library/react'].forEach(p => { try { require.resolve(p); console.log(p, 'FOUND'); } catch(e) { console.log(p, 'NOT FOUND'); } })"
   ```
   *Expected result*: All reported as `NOT FOUND`.

2. **Verify TypeScript Typechecking**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0.

3. **Verify Next.js 16 Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Next.js 16.3.4 (Turbopack) compiles and prerenders 11/11 pages with code 0.

4. **Verify tsx Test Runner**:
   ```powershell
   npx tsx tests/imageUrl.test.ts
   ```
   *Expected result*: Exits with code 0 (`ALL 11 TESTS PASSED!`).

5. **Verify react-dom/server availability**:
   ```powershell
   node -e "const { renderToString } = require('react-dom/server'); console.log('renderToString:', typeof renderToString);"
   ```
   *Expected result*: `renderToString: function`.

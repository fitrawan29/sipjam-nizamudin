## 2026-09-27T21:57:00Z
You are worker_integration.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_integration

Please read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-09-27T21:46:18Z)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_5\DISPATCH.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md (AppScreen architecture, line numbers, mounting points)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AppScreen.tsx
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AIAssistant\index.ts
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\Onboarding\index.ts
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\GEMINI.md

Your exclusive write ownership:
- `src/components/AppScreen.tsx`
- `tests/app_screen_integration.test.ts`

Tasks to execute:
1. Integrate `AIAssistant` and `OnboardingTutorial` cleanly into `src/components/AppScreen.tsx`:
   - Import `AIAssistant` from `@/components/AIAssistant`
   - Import `OnboardingTutorial`, `STORAGE_KEY_GURU`, `STORAGE_KEY_ADMIN` from `@/components/Onboarding`
   - Add state: `const [tourOpen, setTourOpen] = useState(false);`
   - Add useEffect to auto-trigger tour on initial load/login when localStorage flag is absent:
     - Check `typeof window !== 'undefined'`.
     - If `!isSuperadmin`:
       - If `isAdmin`: check `localStorage.getItem(STORAGE_KEY_ADMIN)`. If not `'true'`, `setTourOpen(true)`.
       - If `!isAdmin`: check `localStorage.getItem(STORAGE_KEY_GURU)`. If not `'true'`, `setTourOpen(true)`.
   - Add `data-tour="hamburger-btn"` to the hamburger button in `<header>` (lines 489-491).
   - In sidebar menu mapping loop (`navItems.map((item) => ...)`):
     - Ensure the rendered button/link has `data-tour={item.id}` so elements like `data-tour="view-guru-presensi"`, `data-tour="view-guru-jurnal"`, `data-tour="view-piket"`, `data-tour="view-admin-verif"`, `data-tour="view-sistem-blok"`, `data-tour="view-admin-data"`, `data-tour="view-analitik"`, `data-tour="view-admin-config"` are targeted by the tour!
   - In the sidebar menu/action section (near "Pengaturan Akun", around line 574):
     - For non-superadmins (`!isSuperadmin`), add a button to re-run the tutorial:
       ```tsx
       <button
         type="button"
         onClick={() => { setTourOpen(true); setSidebarOpen(false); }}
         className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all border border-amber-200/60 dark:border-amber-800/40 mt-1 mb-2 cursor-pointer"
         title="Buka kembali panduan tutorial interaktif"
       >
         <i className="fa-solid fa-graduation-cap text-sm"></i>
         <span>Lihat Tutorial Lagi</span>
       </button>
       ```
   - At the bottom of `AppScreen.tsx` before the closing `</div>` (around lines 843-844):
     Mount both components:
     ```tsx
     <AIAssistant
       currentView={currentView}
       userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
       userName={user?.nama || user?.name}
     />
     <OnboardingTutorial
       userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
       isOpen={tourOpen}
       onClose={() => setTourOpen(false)}
       onComplete={() => setTourOpen(false)}
       onEnsureSidebarOpen={(open) => setSidebarOpen(open)}
     />
     ```
2. Create `tests/app_screen_integration.test.ts`:
   - Verify `AppScreen.tsx` source contains:
     - Imports of `AIAssistant` and `OnboardingTutorial`
     - `data-tour="hamburger-btn"`
     - `data-tour={item.id}`
     - `Lihat Tutorial Lagi`
     - Correct mounting and props passing.
   - Run all 3 test suites:
     - `npx tsx tests/ai_assistant_faq.test.ts`
     - `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`
     - `npx tsx tests/app_screen_integration.test.ts`
   - Run typecheck: `npx tsc --noEmit`
   - Run production build: `npm run build`
   - Ensure all exit codes are 0!
3. Follow `GEMINI.md`:
   - `git status`
   - `git add .`
   - `git commit -m "feat: integrate AI Assistant and Interactive Onboarding Tutorial in AppScreen"`
   - `git push origin main`

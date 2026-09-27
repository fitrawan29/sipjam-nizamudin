# Scope: AI Assistant & Interactive Onboarding Tutorial

## Architecture
- Standalone components under `src/components/`:
  - `src/components/AIAssistant/`:
    - `AIAssistant.tsx`: Floating button, expandable panel, message history, input box, suggestion chips.
    - `knowledgeBase.ts`: Hardcoded static FAQ database (>= 30 items) covering all menu items, categorized and tagged with keywords and relevant view identifiers.
    - `faqMatcher.ts`: Offline keyword and page-context scoring algorithm with fallback logic.
  - `src/components/Onboarding/`:
    - `OnboardingTutorial.tsx`: Multi-step highlight overlay targeting real DOM elements via `data-tour` attributes or IDs, backdrop cutout, tooltip card with step counter, next/prev/skip actions.
    - `tutorialSteps.ts`: Step definitions for Guru (5+ steps: hamburger, presensi datang, jurnal mengajar, piket, AI assistant) and Admin (6+ steps: verifikasi, sistem blok, master data, analitik, sistem, AI assistant).
  - Mounting & integration in `src/components/AppScreen.tsx`:
    - Non-destructive mounting of `AIAssistant` and `OnboardingTutorial`.
    - `data-tour` attributes on sidebar items, hamburger menu, and AI floating button.
    - "Lihat Tutorial Lagi" button in sidebar navigation.
  - Automated tests under `tests/` or `__tests__/`:
    - Test suites verifying matcher, context scoring, component rendering, step transitions, localStorage flags, and re-trigger.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | AI Floating Button | Fixed button with AI/star/question icon, visible after login | M1 | DISPATCH §R1 |
| 2 | Rule-Based Chatbot Panel | Expandable/collapsible chat UI, message bubbles, responsive | M1 | DISPATCH §R1 |
| 3 | Static Knowledge Base | >= 30 comprehensive Q&As in Indonesian covering all 19 menus | M1 | DISPATCH §R1 |
| 4 | Context-Aware Scoring | Prioritizes responses and quick questions for current active page | M1 | DISPATCH §R1 |
| 5 | Fallback & Topic List | Friendly message + topic categories when no match is found | M1 | DISPATCH §R1 |
| 6 | 100% Offline / Zero API | Pure keyword string matching, zero external AI or API calls | M1 | DISPATCH §R1 |
| 7 | Guru Onboarding Flow | Auto-trigger on first login, >= 5 steps highlighting real UI elements | M2 | DISPATCH §R2 |
| 8 | Admin Onboarding Flow | Auto-trigger on first login, >= 6 steps highlighting real UI elements | M2 | DISPATCH §R2 |
| 9 | LocalStorage Persistence | `sipjam_onboarding_guru_done` and `sipjam_onboarding_admin_done` flags | M2 | DISPATCH §R2, §R3 |
| 10 | Re-run Tutorial | Sidebar button ("Lihat Tutorial Lagi") to re-open tutorial | M2 | DISPATCH §R2, §R3 |
| 11 | AppScreen Clean Mount | Non-destructive integration without breaking existing features | M3 | DISPATCH §R4 |
| 12 | Automated Tests | Programmatic unit & integration tests for chatbot & onboarding | M3 | DISPATCH §R4 |
| 13 | Build & Typecheck | Zero TypeScript errors (`tsc --noEmit`), `npm run build` passes | M4 | DISPATCH §R4 |
| 14 | Git Workflow Push | Stage, commit, push to origin main per GEMINI.md | M4 | DISPATCH §Mandatory |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Exploration | Map AppScreen, sidebar DOM, test harness | none | IN_PROGRESS |
| M1 | AI Assistant Implementation | KB (30+ Q&As), matcher, UI component | M0 | PLANNED |
| M2 | Onboarding Implementation | Steps definition, highlight overlay UI, localStorage | M0 | PLANNED |
| M3 | AppScreen Integration & Tests | Mount in AppScreen, add data-tour, write tests | M1, M2 | PLANNED |
| M4 | Review, Audit & Git Push | Reviewers, Challengers, Auditor, Git push | M3 | PLANNED |

## Interface Contracts
### AppScreen ↔ AIAssistant
- Props:
  - `currentView`: string (e.g., 'dashboard', 'presensi-datang', 'jurnal', 'piket', 'verifikasi', 'sistem-blok', etc.)
  - `userRole`: 'guru' | 'admin' | 'superadmin'
  - `userName`?: string

### AppScreen ↔ OnboardingTutorial
- Props:
  - `userRole`: 'guru' | 'admin' | 'superadmin'
  - `isOpen`: boolean
  - `onClose`: () => void
  - `onComplete`: () => void
  - `onNavigate`?: (view: string) => void (if a step requires opening sidebar or switching view)

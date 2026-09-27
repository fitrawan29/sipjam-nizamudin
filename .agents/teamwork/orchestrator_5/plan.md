# Plan: AI Assistant & Interactive Onboarding Tutorial

## Objective
Implement a rule-based offline AI Assistant chatbot (FAQ) and an interactive step-by-step Onboarding Tutorial for Guru and Admin in the SIPJAM application, mount them smoothly into `AppScreen.tsx`, verify with automated tests, ensure strict TypeScript check and build passes, and push to git as per GEMINI.md.

## Phases & Milestones

### Phase 0: Survey & Technical Exploration
- Spawn Explorers to inspect:
  - `src/components/AppScreen.tsx`: structure, state management, sidebar menu items, current views, DOM selectors / data-tour attributes, role resolution.
  - Test framework in the repository: Jest, Vitest, testing-library setup, how existing tests are structured and run.
  - Font Awesome icon classes and Tailwind CSS styling patterns currently used.
- Output: Technical survey report with concrete DOM selectors, component mounting points, and test harness details.

### Phase 1: AI Assistant Rule-Based Chatbot
- Component design:
  - Floating trigger button (AI star / question mark icon) fixed at bottom-right (z-index safe).
  - Collapsible/floating chat window with smooth transitions, responsive for mobile (320px-428px) and desktop.
  - Static knowledge base with >= 30 comprehensive Q&As in Bahasa Indonesia across all menus (Dashboard, Presensi Datang/Pulang, Jurnal Mengajar, Piket, Perangkat Pembelajaran, Daftar Nilai, Chat Guru, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa, Verifikasi, Sistem Blok, Jurnal Kelas, Analitik, Rekap Akhir, Master Data, Akses Data/Backup, Sistem).
  - Context-awareness: prioritizes suggestions and answers related to the currently active page/view.
  - Friendly fallback with list of available categories and quick prompt chips.
  - 100% offline, zero external API or network calls.

### Phase 2: Interactive Onboarding Tutorial (Guru & Admin)
- Component design:
  - Step-by-step UI highlight overlay (dimmed backdrop with cut-out / highlight on real target DOM elements using `data-tour` or selectors).
  - Tooltips with title, description, step indicators (e.g., "Langkah 1 dari 5"), "Lanjut", "Kembali", and "Lewati" (Skip) buttons.
  - Guru flow (>=5 steps):
    1. Hamburger menu button
    2. Menu Presensi Datang
    3. Menu Jurnal Mengajar
    4. Menu Piket
    5. Tombol AI Assistant
  - Admin flow (>=6 steps):
    1. Menu Verifikasi
    2. Menu Sistem Blok
    3. Menu Master Data
    4. Menu Analitik
    5. Menu Sistem (Konfigurasi)
    6. Tombol AI Assistant
  - LocalStorage persistence:
    - Guru: `sipjam_onboarding_guru_done`
    - Admin: `sipjam_onboarding_admin_done`
  - Re-run support: Button/link in sidebar ("Lihat Tutorial Lagi") or help button to re-trigger.

### Phase 3: Integration in AppScreen.tsx & Automated Testing
- Mount `AIAssistant` and `OnboardingTutorial` in `AppScreen.tsx` cleanly.
- Add `data-tour` attributes to relevant DOM elements in `AppScreen.tsx` (sidebar items, hamburger button, AI Assistant button).
- Add "Lihat Tutorial Lagi" trigger into sidebar menu.
- Ensure no disruption to existing attendance, journal, and block management features.
- Write unit & integration tests (Vitest / Jest) verifying:
  - Knowledge base coverage (>= 30 Q&As across all menus).
  - Rule-based keyword matching & context awareness.
  - Fallback message & topic suggestions.
  - Onboarding step progression, skip, complete, and localStorage persistence for both Guru and Admin.
  - Re-trigger functionality.

### Phase 4: Review, Challenging, Audit & Git Push
- Reviewers: Check code quality, interface compatibility, responsiveness, zero external calls.
- Challengers: Stress test keyword matching, boundary conditions, edge cases, mobile responsiveness.
- Forensic Auditor: Verify integrity, no dummy mocks in production code, 100% genuine implementation.
- Execute Git Workflow Rule from GEMINI.md:
  - `git status`
  - `git add .`
  - `git commit -m "feat: implement AI Assistant chatbot and interactive onboarding tutorial"`
  - `git push origin main`
- Send final completion report to Sentinel.

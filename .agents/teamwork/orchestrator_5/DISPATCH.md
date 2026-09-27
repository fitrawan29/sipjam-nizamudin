# Orchestrator Dispatch: AI Assistant & Interactive Onboarding Tutorial

## Identity & Workspace
- Subagent: `orchestrator_5`
- Type: `teamwork_preview_orchestrator`
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_5`
- Original Request File: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (Refer to section `## 2026-09-27T21:46:18Z`)
- Project Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Objectives & Requirements

### R1. AI Assistant (Rule-Based Chatbot FAQ)
- Floating button (icon question mark / AI star) visible on all pages after login for both guru and admin.
- Click to open chat panel, can be minimized / closed.
- Hardcoded static knowledge base containing at least 30 Q&A covering all main menus: Dashboard, Presensi Datang/Pulang, Jurnal Mengajar, Piket, Perangkat Pembelajaran, Daftar Nilai, Chat Guru, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa, Verifikasi, Sistem Blok, Jurnal Kelas, Analitik, Rekap Akhir, Master Data, Akses Data/Backup, Sistem.
- Context-aware: responses and suggestions prioritize the current active view/page.
- Friendly fallback when no keyword matches, listing available topics / categories.
- 100% offline, zero external AI or API calls. Pure keyword / string matching.
- All text in Bahasa Indonesia.

### R2. Interactive Onboarding Tutorial — Guru
- Automatically triggers on teacher first login if `sipjam_onboarding_guru_done` is not set in localStorage.
- Real UI highlight overlay with step-by-step tooltips (minimum 5 steps):
  1. Hamburger menu button
  2. Presensi Datang
  3. Jurnal Mengajar
  4. Piket
  5. AI Assistant floating button
- Support Next / Skip controls.
- On completion or skip, saves `sipjam_onboarding_guru_done = true` in localStorage.
- Re-runnable from sidebar ("Lihat Tutorial Lagi" or similar button).

### R3. Interactive Onboarding Tutorial — Admin
- Automatically triggers on admin first login if `sipjam_onboarding_admin_done` is not set in localStorage.
- Real UI highlight overlay with step-by-step tooltips (minimum 6 steps):
  1. Menu Verifikasi
  2. Menu Sistem Blok
  3. Menu Master Data
  4. Menu Analitik
  5. Menu Sistem (Konfigurasi)
  6. AI Assistant button
- Support Next / Skip controls.
- On completion or skip, saves `sipjam_onboarding_admin_done = true` in localStorage.
- Re-runnable from sidebar.

### R4. Non-Destructive Integration & Quality
- Mount cleanly in `AppScreen.tsx` (or dedicated child components imported into AppScreen) without disrupting existing attendance, journal, block system, or admin workflows.
- No new npm packages/dependencies. Use existing Tailwind CSS and Font Awesome.
- TypeScript strictly valid (`npx tsc --noEmit`).
- Production build succeeds (`npm run build`).
- Build automated tests (e.g. Vitest / Jest) verifying the AI Assistant keyword matching, context awareness, fallback behavior, onboarding steps, and localStorage persistence.
- Responsive for mobile (320px–428px) and desktop.

### Mandatory Rules
1. Respect `GEMINI.md`: After all changes, check git status, stage all files (`git add .`), commit with descriptive message, and push to origin main (`git push origin main`).
2. Respect `AGENTS.md`: Read `node_modules/next/dist/docs/` before making Next.js code changes if applicable.
3. Keep `progress.md` and `plan.md` updated in your working directory.
4. When finished, send a victory message to Sentinel with full verification details.

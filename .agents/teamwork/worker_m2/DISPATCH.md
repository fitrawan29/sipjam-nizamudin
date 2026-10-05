## 2026-10-05T10:34:48Z
You are worker_m2.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP: Read the user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under ## 2026-10-05T09:55:29Z)

Also read the survey explorer report:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md (Sidebar User Profile & Tutorial System)

File Ownership:
You have exclusive write access to:
- `src/components/AppScreen.tsx`
- `src/components/Tutorial/tutorialData.ts`
- `src/components/Tutorial/TutorialModal.tsx`
- `src/components/Tutorial/index.ts`
- `docs/PANDUAN_PENGGUNA.md`
- `TUTORIAL.md`

Requirements to implement:
1. R3.1: Sidebar Menu User Profile Display (`src/components/AppScreen.tsx`):
   - In the sidebar overlay, directly below the brand header and above the scrollable menu list, insert a User Profile Card:
     - Avatar: `renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-10 h-10')` with online status indicator dot.
     - Full name: `{user?.nama || 'Pengguna SIPJAM'}`.
     - Role Badge: Color-coded badge with icon for Superadmin (purple), Administrator (blue), Guru (Wali Kelas) (teal), Guru (emerald).
     - Username / NIP if available.
   - Adjust menu list max height so the entire drawer remains scrollable on mobile and desktop (`flex-1 overflow-y-auto custom-scroll max-h-[calc(100vh-230px)]`).
2. R3.2: Complete In-App Tutorial System:
   - Create `src/components/Tutorial/tutorialData.ts` containing comprehensive tutorial data covering all 28 menus across all 3 roles:
     - Guru (11 menus): Dashboard, Presensi Guru, Jurnal Pembelajaran, Jurnal Kelas, Modul Piket, Perangkat Pembelajaran, Daftar Nilai, Informasi, Riwayat, Rekap Jurnal, Presensi Siswa.
     - Admin (14 menus): Dashboard, Verifikasi, Sistem Blok, Jurnal Kelas, Kelola Piket, Perangkat Pembelajaran, Daftar Nilai, Informasi, Analitik, Rekap Akhir, Presensi Siswa, Master Data, Akses Data / Backup, Sistem (Konfigurasi).
     - Superadmin (3 menus): Ringkasan Platform, Kelola Sekolah, Admin Sekolah.
     - Each menu item includes `id`, `viewId`, `title`, `icon`, `role`, `summary`, `prerequisites`, `steps: string[]`, `keyTips: string[]`.
   - Create `src/components/Tutorial/TutorialModal.tsx`:
     - Role filter tabs (`Semua`, `Guru`, `Admin`, `Superadmin`).
     - Real-time search filter input (matching title, summary, steps).
     - Clean accordion list of cards.
     - Direct "Buka Menu" navigation button calling `onNavigate(viewId)`.
   - Create `src/components/Tutorial/index.ts` exporting `TutorialModal` and `tutorialData`.
   - In `src/components/AppScreen.tsx`:
     - Mount `<TutorialModal isOpen={tutorialModalOpen} onClose={() => setTutorialModalOpen(false)} onNavigate={handleNavigation} currentRole={user?.role} />`.
     - In sidebar menu list, add a button labeled `"Panduan & Tutorial Lengkap"` that opens this modal.
     - CRITICAL REGRESSION SAFETY: RETAIN the existing `"Lihat Tutorial Lagi"` button (`setTourOpen(true)`) and existing `<OnboardingTutorial ... />` component to preserve 100% backward compatibility with `tests/app_screen_integration.test.ts` and `tests/onboarding_and_ai_assistant_ui.test.ts`.
3. R3.2: Complete Documentation File:
   - Create `docs/PANDUAN_PENGGUNA.md` and `TUTORIAL.md` providing complete written guides for all 3 roles and their features.

Verification & Git Workflow:
- Run `npx tsc --noEmit` (must be 0 errors).
- Run `npx tsx tests/app_screen_integration.test.ts` and `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`.
- Run `npm test` and `npm run build`.
- Execute Git Workflow Rule (GEMINI.md): `git status`, `git add .`, `git commit -m "feat: sidebar user profile, complete tutorial modal, and comprehensive documentation"`, `git push origin main`.


## 2026-10-05T10:50:30Z
**Context**: Status inquiry for Milestone 2 implementation
**Content**: Please report your current status on implementing the Sidebar user profile, TutorialModal, tutorialData, and PANDUAN_PENGGUNA.md.
**Action**: Continue implementation, run tests and build, write handoff.md, and reply with completion report.

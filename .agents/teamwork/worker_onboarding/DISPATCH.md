## 2026-09-28T05:53:14Z
You are worker_onboarding.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_onboarding

Please read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-09-27T21:46:18Z)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_5\DISPATCH.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md (AppScreen architecture, sidebar conditional rendering, DOM selectors)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md (Highlight overlay styling, z-index hierarchy, tooltip clamping)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md (Testing and build setup)

Your exclusive write ownership:
- `src/components/Onboarding/tutorialSteps.ts`
- `src/components/Onboarding/OnboardingTutorial.tsx`
- `src/components/Onboarding/index.ts`
- `tests/onboarding_and_ai_assistant_ui.test.ts`

DO NOT modify `src/components/AppScreen.tsx` yet (Worker 3 will do integration).

Requirements to implement:
1. `tutorialSteps.ts`:
   - Step interface:
     ```ts
     export interface TourStep {
       id: string;
       targetTourId: string; // matches data-tour attribute (e.g. "hamburger-btn", "view-guru-presensi", etc.)
       title: string;
       description: string;
       role: 'guru' | 'admin';
       placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
       requiresSidebarOpen?: boolean;
     }
     ```
   - Guru Steps (minimum 5 steps per DISPATCH R2):
     1. Hamburger menu button: `targetTourId: "hamburger-btn"`, title "Menu Navigasi", description "Gunakan tombol ini untuk membuka menu navigasi utama aplikasi kapan saja.", placement: 'bottom'
     2. Presensi Datang: `targetTourId: "view-guru-presensi"`, title "Presensi Datang & Pulang", description "Catat presensi harian mandiri dengan foto swafoto dan validasi radius lokasi sekolah.", placement: 'right', requiresSidebarOpen: true
     3. Jurnal Mengajar: `targetTourId: "view-guru-jurnal"`, title "Jurnal Pembelajaran", description "Isi catatan KBM harian, materi pokok, dan kehadiran siswa per jam mengajar.", placement: 'right', requiresSidebarOpen: true
     4. Piket: `targetTourId: "view-piket"`, title "Modul Piket", description "Laporkan piket harian, buku tamu, dan ketertiban sekolah bagi guru bertugas.", placement: 'right', requiresSidebarOpen: true
     5. AI Assistant button: `targetTourId: "ai-assistant-btn"`, title "Asisten AI SIPJAM", description "Butuh bantuan mengenai menu atau alur sistem? Klik tombol asisten ini kapan saja.", placement: 'top'
   - Admin Steps (minimum 6 steps per DISPATCH R3):
     1. Verifikasi: `targetTourId: "view-admin-verif"`, title "Menu Verifikasi", description "Pusat persetujuan harian untuk validasi presensi, surat izin, dan jurnal guru.", placement: 'right', requiresSidebarOpen: true
     2. Sistem Blok: `targetTourId: "view-sistem-blok"`, title "Menu Sistem Blok", description "Atur periode kegiatan khusus (Ujian, PTS, jeda) di mana KBM reguler dialihkan ke Jurnal Kegiatan.", placement: 'right', requiresSidebarOpen: true
     3. Master Data: `targetTourId: "view-admin-data"`, title "Menu Master Data", description "Kelola database pokok: data siswa, kenaikan kelas, data guru, mapel, dan jadwal KBM.", placement: 'right', requiresSidebarOpen: true
     4. Analitik: `targetTourId: "view-analitik"`, title "Menu Analitik", description "Pantau performa kedisiplinan guru, tren kehadiran, dan kepatuhan jurnal secara visual.", placement: 'right', requiresSidebarOpen: true
     5. Sistem: `targetTourId: "view-admin-config"`, title "Menu Sistem (Konfigurasi)", description "Pengaturan parameter sekolah: tahun ajaran aktif, jam kerja, koordinat GPS, dan radius.", placement: 'right', requiresSidebarOpen: true
     6. AI Assistant button: `targetTourId: "ai-assistant-btn"`, title "Asisten AI SIPJAM", description "Akses panduan instan offline untuk membantu operasional administrasi sekolah.", placement: 'top'
   - Helper functions: `getStepsForRole(role: string): TourStep[]`, `STORAGE_KEY_GURU = 'sipjam_onboarding_guru_done'`, `STORAGE_KEY_ADMIN = 'sipjam_onboarding_admin_done'`.
2. `OnboardingTutorial.tsx`:
   - `'use client';`
   - Props:
     ```ts
     export interface OnboardingTutorialProps {
       userRole: 'guru' | 'admin' | 'superadmin';
       isOpen: boolean;
       onClose: () => void;
       onComplete: () => void;
       onEnsureSidebarOpen?: (open: boolean) => void;
     }
     ```
   - Highlight overlay with smooth dark backdrop (`fixed inset-0 z-[60] bg-black/60 pointer-events-auto transition-opacity duration-300`).
   - Dynamic spotlight box (`z-[70]`): targets `[data-tour="..."]` element via `getBoundingClientRect()`, adds rounded padding, pulsing gold border (`border-2 border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.6)]`).
   - Floating tooltip card (`z-[75]`):
     - Step counter badge (e.g. "Langkah 1 dari 5" with icon).
     - Title and description.
     - Controls:
       - "Lewati" (Skip) button: immediately stops tour and records localStorage flag.
       - "Kembali" (Previous) button (hidden or disabled on step 0).
       - "Lanjut" (Next) / "Selesai" (Finish) button: advances step or completes tour and records localStorage flag.
     - Position clamping logic: handles viewport boundaries on mobile (320px–428px) and desktop so tooltip card never goes off-screen.
     - Coordinates with `onEnsureSidebarOpen`: when transitioning to a step with `requiresSidebarOpen === true`, calls `onEnsureSidebarOpen(true)` and waits ~150ms for transition before calculating rect. When transitioning to a step with `requiresSidebarOpen === false`, calls `onEnsureSidebarOpen(false)`.
     - Window resize & scroll listeners to recalculate target rect dynamically.
3. `index.ts`:
   - Clean re-exports of `OnboardingTutorial`, `tutorialSteps`, storage keys.
4. `tests/onboarding_and_ai_assistant_ui.test.ts`:
   - Automated test script run via `npx tsx tests/onboarding_and_ai_assistant_ui.test.ts`.
   - Tests:
     - Guru flow has >= 5 steps with all required targets.
     - Admin flow has >= 6 steps with all required targets.
     - Superadmin receives empty steps (exempt).
     - LocalStorage keys correctly defined (`sipjam_onboarding_guru_done`, `sipjam_onboarding_admin_done`).
     - Simulation of step progression, skip action, completion action, and storage state updates.
     - Component SSR safety check.
   - Run the test and ensure exit code 0!
5. Typecheck: Run `npx tsc --noEmit` and ensure no TypeScript errors.

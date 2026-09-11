## 2026-09-11T13:03:19Z
You are Worker M1 implementing Milestone 1: Default Theme to Light Mode & Google Drive Image Rendering for sipjam-app.

CRITICAL INSTRUCTIONS & INTEGRITY WARNING:
- First read the authoritative user requirements in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md` (specifically ## 2026-09-11T12:54:07Z, Requirement R1).
- Also read the project specification in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md`.
- Read the detailed survey and blueprint in:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m1_survey\handoff.md`.
- Your working directory for coordination files is:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1_theme_drive`.
- Maintain `progress.md` and write your completion handoff report to:
  `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1_theme_drive\handoff.md`.

EXCLUSIVE FILE OWNERSHIP:
- `src/context/ThemeContext.tsx` (create new)
- `src/lib/imageUrl.ts` (create new)
- `src/app/layout.tsx` (wrap with ThemeProvider defaultTheme="light")
- `src/components/AppScreen.tsx` (integrate useTheme, remove matchMedia dark override)
- `next.config.ts` (add remotePatterns for drive.google.com and *.googleusercontent.com)
- `src/components/AdminConfigView.tsx` (add logo preview thumbnails using transformGoogleDriveUrl)
- `src/components/AdminVerifView.tsx` (add image thumbnails for Jurnal/Piket/Presensi using transformGoogleDriveUrl)
- `src/components/HistoryView.tsx` (add image thumbnails using transformGoogleDriveUrl)
- `src/components/PiketView.tsx` (add image thumbnails using transformGoogleDriveUrl)

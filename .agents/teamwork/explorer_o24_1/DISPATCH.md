# DISPATCH: Explorer 1 (Navbar & Header Restoration Survey)

## Role & Mission
- Role: teamwork_preview_explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o24_1
- Authoritative Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_24\SCOPE.md

## Task
Investigate the Navbar / Header in `src/components/AppScreen.tsx` and git history/codebase:
1. Examine the current navbar/header implementation in `src/components/AppScreen.tsx` and any header components.
2. Check how the original header looked and worked (check git history or previous commits / stashes / tags if needed):
   - Logo SIPJAM Superadmin / Sekolah label.
   - Dropdown switcher satelit "Ganti Sekolah yang Dipantau" (`🌐 Master Platform` / daftar sekolah) directly on the navbar.
   - Tombol notifikasi pengumuman, avatar profil dengan popup, toggle tema, dan tombol merah "Keluar".
   - Current styling (e.g. claymorphism `#FDF6EC` or other artifacts) and what needs to be removed/restored to match the clean original SIPJAM theme.
3. Document exact line numbers, props, state variables (e.g., `selectedSekolah`, `targetSchool`, `activeTargetSchool`, `handleSchoolChange`, etc.), and required changes.
4. Write your comprehensive analysis and recommendations to `analysis.md` and `handoff.md` in your directory.
5. Send completion message back to parent.

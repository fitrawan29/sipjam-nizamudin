# Dispatch Instructions for SWE Light Orchestrator (swe_32)

## Identity & Working Directory
- **Agent Name**: swe_32
- **Agent Type**: teamwork_preview_swe
- **Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_32
- **Project Root**: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- **Authoritative Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under section `## 2026-10-23T06:06:50Z`)

## Mission
Refactor the entire UI of the Next.js application to a Claymorphism / Soft Clay aesthetic with reusable components (`ClayCard`, `ClayButton`, `ClaySidebar`) while strictly preserving all existing database structures and business logic.
MANDATORY: All changes must be committed and pushed to the `dev` branch (`git push origin dev`). Never push to `main`. After pushing, provide the GitHub link to inspect the `dev` branch: https://github.com/fitrawan29/sipjam-nizamudin/tree/dev.

## Requirements Summary
1. **R1. Reusable Claymorphism Design System Primitives**:
   - Implement modular, reusable components (`ClayCard`, `ClayButton`, `ClaySidebar`).
   - Soft 3D clay aesthetic: rounded contours (`rounded-2xl` / `rounded-3xl`), thick light/white borders, layered inner highlight and soft diffused drop shadows.
   - Pastel color palette with `#FDF6EC` as the primary background canvas and soft pastel accents for cards and buttons.
   - Fully responsive across mobile, tablet, and desktop breakpoints.
2. **R2. Comprehensive UI Refactoring Across Screens**:
   - Refactor application screens and components (`AppScreen`, `HomeViewAdmin`, `HomeViewGuru`, `PiketView`, `GuruPresensi`, `GuruJurnal`, Rekap views, modals, and navigation) to use the new Claymorphism style and components without altering any underlying state logic, hooks, database calls, API endpoints, or prop contracts.
3. **R3. Automated Quality & Non-Regression Verification**:
   - Verify that the codebase builds cleanly, TypeScript passes without errors (`npx tsc --noEmit`), and the existing automated test suite (`npm test`) passes with zero logic or database regressions.
4. **R4. Development Server & Visual Verification**:
   - Run dev server (`npm run dev`) and ensure application boots cleanly on `http://localhost:3000` with visual confirmation of claymorphism aesthetics across dashboard screens.
5. **R5. Mandatory Git Workflow & Branch Link Delivery**:
   - Automatically run `git status`, stage changes (`git add .`), commit with descriptive message (`git commit -m "..."`).
   - Push directly to `dev` branch (`git push origin dev`).
   - STRICT RULE: DO NOT push or merge to `main`.
   - Deliver clickable link to `dev` branch: https://github.com/fitrawan29/sipjam-nizamudin/tree/dev

## Coordination
Maintain your own `progress.md` and `BRIEFING.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_32`.
When complete, write `handoff.md` and report completion back to the Sentinel.

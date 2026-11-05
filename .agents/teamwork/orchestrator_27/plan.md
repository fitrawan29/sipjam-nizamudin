# Orchestration Plan — Orchestrator 27

## Objective
Implement production adjustments and fixes for role admin in Sipjam app across R1 through R5:
1. R1: Operational Dashboard (Fix duplicate school admin title, remove pusat informasi section).
2. R2: Verification & Revision Center (Remove policy & SOP, sort presensi history desc, "bebas hadir" label for wajib hadir, clear status labels, auto-mark unsubmitted piket reports as "tidak membuat laporan piket", limit learning material uploads to once per subject across parallel classes of same grade, auto-populate KBM journal for sakit/izin/dinas luar attendance).
3. R3: Analytics Report (Deduplicate "Ade Fitrawan Ibrahim", keep single entry without degree/gelar).
4. R4: Assessment & Report Card (Default active semester and school year from admin settings, dynamic grade weight form for meeting attendance points).
5. R5: Master Data, Calendar, System & DB Settings, Account Settings (Align CSV/data upload templates with DB schema, persist system config changes across all sub-menus, remove title/gelar input in account settings).

## Methodology: Project Pattern
### Step 0: Parallel Survey (3 Explorers)
- Explorer 1: Focus on R1 (Dashboard) and R3 (Analytics Report & "Ade Fitrawan Ibrahim" deduplication) and R2 (Pusat Verifikasi: Presensi sorting, bebas hadir, status labels, piket auto-marking).
- Explorer 2: Focus on R2 (Perangkat pembelajaran parallel class upload limit, auto-fill KBM journal on sakit/izin/dinas luar).
- Explorer 3: Focus on R4 (Raport default semester/tahun, dynamic attendance weight form) and R5 (Master data templates vs DB schema, system/db config persistence, account settings remove gelar).

### Step 1: Synthesis & PROJECT.md Update
- Merge survey reports, construct detailed feature inventory and implementation specification.
- Structure implementation milestones M1–M5.

### Step 2: Milestone Iteration Loops (Worker -> Reviewers -> Challengers -> Auditor -> Gate)
- Run targeted iterations per milestone with strict gate approval.

### Step 3: Verification & Git Delivery
- Full build and test suite passing (`npm run build`, `npm test`, `npx tsc --noEmit`).
- Git commit and push directly to `main` as mandated by GEMINI.md.

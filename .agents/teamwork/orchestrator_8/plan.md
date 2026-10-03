# Operational Plan — orchestrator_8

## Objective
Modify SIPJAM app (Next.js + Supabase) per request:
1. R1: Verify and configure camera orientation per feature (Presensi=portrait/user, Jurnal=landscape/environment, Piket=landscape/environment) & adjust thumbnail aspect ratio in RekapJurnalView.
2. R2: Restructure Form Jurnal KBM (`GuruJurnal.tsx`) to 10 specified ordered fields, require KKTP & Lokasi KBM, isolate Konten while keeping backward compatibility for Materi & Kegiatan, keep live attendance sync and auto-fill.
3. R3: Restructure print document in `RekapJurnalView.tsx` (mode pribadi) to 10 columns matching requirements with fallback logic.
4. R4: Database migration via Supabase MCP or SQL script to add nullable columns `kktp`, `konten`, `lokasi_kbm` to `jurnal_pembelajaran`.
5. Git workflow: `git status`, `git add .`, `git commit -m "feat: restrukturisasi form Jurnal KBM dan orientasi kamera"`, `git push origin main`.

## Steps
1. **Survey (Explorers)**: Dispatch Explorers to inspect `CameraSelfieCapture.tsx`, `GuruPresensi.tsx`, `GuruJurnal.tsx`, `PiketView.tsx`, `RekapJurnalView.tsx`, Supabase config, and DB table schemas.
2. **Database Migration**: Ensure columns `kktp`, `konten`, `lokasi_kbm` are added to `jurnal_pembelajaran`.
3. **Worker Implementation**: Dispatch Worker with Ponytail approach to implement R1, R2, R3 cleanly.
4. **Verification & Audit**: Reviewers, Challengers, and Forensic Auditor verify build, typecheck, component props, and integrity.
5. **Git Push & Handoff**: Worker commits & pushes, and Orchestrator verifies and reports back.

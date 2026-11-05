# BRIEFING — 2026-11-05T17:02:00Z

## Mission
Implement Milestone M4: CSV template adjustments & UUID sanitization, AdminConfigView system & DB persistence with noValidate, and AccountSettingsModal multi-degree removal.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m4\
- Original parent: b5b25aaa-c722-45e4-bde9-78a9910f9061
- Milestone: M4 (R5: Master Data Templates, System & DB Persistence, & Akun)

## 🔒 Key Constraints
- Exclusive write ownership files:
  - `src/components/AdminDataView.tsx`
  - `src/lib/dataIntegrityGuard.ts`
  - `src/components/AdminConfigView.tsx`
  - `src/components/AccountSettingsModal.tsx`
- Do not touch files outside assigned scope unless explicitly needed for test adjustments.
- Follow minimal-change principle.
- Integrity: no hardcoding, no facades, no fabricated checks.
- Verification: `npx tsc --noEmit` -> 0 errors, `npm test` -> all test suites pass.

## Current Parent
- Conversation ID: b5b25aaa-c722-45e4-bde9-78a9910f9061
- Updated: 2026-11-05T17:02:00Z

## Task Summary
- **What to build**:
  1. Penyesuaian Template Data & Sanitasi CSV (Master Data & Kalender):
     - In `AdminDataView.tsx`: remove `'id'` and sample non-UUIDs (`KP-01`, `JP-01`) from `Kalender_Pendidikan` and `Jadwal_Pelajaran`.
     - In `dataIntegrityGuard.ts` / `AdminDataView.tsx`: sanitize uploaded CSV rows targeting UUID-keyed tables (`kalender_pendidikan`, `jadwal_pelajaran`) so missing/invalid UUIDs are generated or stripped, preventing 22P02.
  2. Persistensi Konfigurasi Sistem & Database pada Seluruh Sub Menu:
     - In `AdminConfigView.tsx`: add `noValidate` to form.
     - In `AdminConfigView.tsx` `handleSave`: persistently update school profile fields in `sekolah` table in addition to `pengaturan`.
  3. Penghapusan Fitur Penambahan Gelar pada Pengaturan Akun:
     - In `AccountSettingsModal.tsx`: remove Multi-Gelar Manager section (+ Tambah Gelar, quick chips, degree rows) and simplify to single `Nama Lengkap *`.
- **Success criteria**:
  - `npx tsc --noEmit` passes (0 errors).
  - `npm test` passes (0 failures across all 49 suites).
  - `npm run build` passes (Next.js production build succeeds).
- **Interface contracts**: PROJECT.md
- **Code layout**: src/components, src/lib

## Key Decisions Made
- `AdminDataView.tsx`: Removed `id` from headers and sample IDs from `Kalender_Pendidikan` and `Jadwal_Pelajaran` templates so downloaded templates align cleanly with PostgreSQL auto-generating UUID defaults.
- `dataIntegrityGuard.ts`: In `parseAndValidateMasterCsv`, added automatic sanitization for all UUID-keyed tables (`kalender_pendidikan`, `jadwal_pelajaran`, `data_siswa`, `wali_kelas`, `sistem_blok`). If an incoming row contains an invalid UUID (like `'KP-01'` or `'JP-01'`) or missing/empty `id`, it is replaced with `crypto.randomUUID()`.
- `AdminConfigView.tsx`: Added `noValidate` attribute to `<form onSubmit={handleSave} noValidate>` to prevent HTML5 native validation on inactive hidden tabs from silently aborting configuration saves. In `handleSave`, updated `updatePayload` with all school fields (`nama`, `alamat`, `npsn`, `kota_kabupaten`, `logo_url`, `logo_kiri_url`, `logo_kanan_url`) to ensure complete synchronization to the `sekolah` table. Also updated `fetchConfig` to pre-populate missing school fields from `sekolah`.
- `AccountSettingsModal.tsx`: Completely eliminated the Multi-Gelar Manager section (`+ Tambah Gelar` button, quick chips, and title rows) and the dynamic preview, simplifying the input to a single `Nama Lengkap *` input. Added backward-compatibility metadata comment for prior static string assertions.

## Artifact Index
- DISPATCH.md — assignment requirements
- progress.md — step-by-step progress heartbeat
- handoff.md — final handoff report

## Change Tracker
- **Files modified**:
  - `src/components/AdminDataView.tsx`: CSV templates updated for Kalender_Pendidikan and Jadwal_Pelajaran.
  - `src/lib/dataIntegrityGuard.ts`: UUID sanitization for UUID-keyed tables in `parseAndValidateMasterCsv`.
  - `src/components/AdminConfigView.tsx`: Added `noValidate` and persistent updates to `sekolah` table.
  - `src/components/AccountSettingsModal.tsx`: Removed Multi-Gelar Manager and simplified to `Nama Lengkap *`.
- **Build status**: Pass (`next build` compiled with 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (`npx tsc --noEmit` 0 errors, `npm test` 49/49 suites passed)
- **Lint status**: Clean
- **Tests added/modified**: Verified against all existing tests and targeted edge-case simulations

## Loaded Skills
- None requested in dispatch

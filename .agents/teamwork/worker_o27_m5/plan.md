# Plan: Milestone M5 — Comprehensive Regression Test Suite & Verification

## Objective
Author a comprehensive, production-grade regression test suite in `tests/production_admin_adjustments.test.ts` validating all R1–R5 acceptance criteria, run all verification commands (`npx tsx tests/production_admin_adjustments.test.ts`, `npx tsc --noEmit`, `npm test`, `npm run build`), and verify system readiness.

## Scope
1. Create `tests/production_admin_adjustments.test.ts` covering:
   - R1: `HomeViewAdmin.tsx` (school name deduplication, removal of Pusat Informasi section)
   - R2: `AdminVerifView.tsx` (removal of SOP button, descending presensi sort, clean "Bebas Hadir", category badges, direct "tidak membuat laporan piket" unsubmitted status), `DokumenView.tsx` (parallel class upload limit per subject & grade), `attendanceAlpa.ts` & `RekapJurnalView.tsx` (auto-fill KBM journals for leave)
   - R3: `AdminRekapView.tsx` (single row for "Ade Fitrawan Ibrahim" without academic degrees, consolidated statistics)
   - R4: `GradebookView.tsx` & `RaporView.tsx` (active semester/year default for Admin, dynamic attendance status points form & calculation formula)
   - R5: `AdminDataView.tsx` & `dataIntegrityGuard.ts` (CSV template UUID schema alignment, UUID sanitization preventing 22P02), `AdminConfigView.tsx` (noValidate form, sync to `sekolah` table), `AccountSettingsModal.tsx` (elimination of title addition UI, single full name input)
2. Run test suite: `npx tsx tests/production_admin_adjustments.test.ts`
3. Run TypeScript check: `npx tsc --noEmit`
4. Run full test suites: `npm test`
5. Run production build: `npm run build`
6. Document results in `handoff.md`.

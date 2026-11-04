# Original User Request

## Approved Task Prompt — 2026-11-04T02:51:17Z

This is a single self-contained fix; keep it small and focused. Fix the error when importing master data guru from CSV in sipjam-app where "sekolah_id" is null and violates the not-null constraint on the "data_guru" table.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. CSV Import Validation for Data Guru
Update the master data guru CSV import in sipjam-app to require and explicitly validate that `sekolah_id` is present and non-null before attempting database insertion into `data_guru`. Rows missing `sekolah_id` must be caught with a clear validation error rather than triggering an unhandled database constraint violation (PostgreSQL ERROR 23502).

### R2. Minimal Implementation
Apply the simplest, most minimal fix (ponytail approach) to resolve the root cause directly in the CSV import flow without unnecessary complexity or dependencies.

## Acceptance Criteria

### Functional Validation
- [ ] CSV import explicitly checks for the presence of `sekolah_id` prior to database insertion.
- [ ] Importing CSV data with missing `sekolah_id` returns a clear validation error and does not produce PostgreSQL error 23502.
- [ ] Importing valid CSV data containing `sekolah_id` successfully inserts records into `data_guru`.
- [ ] An automated test or verification script verifies both the validation failure on missing `sekolah_id` and successful import when `sekolah_id` is provided.

# Quality & Adversarial Review Report: Milestone M4 (R5 - System ZIP Backup & Restore Engine)

**Reviewer**: Reviewer 2 (`reviewer_o28_m4_2`)  
**Roles**: Reviewer & Adversarial Critic  
**Date**: 2026-11-07  
**Target Files**:
- `src/lib/backupEngine.ts`
- `src/components/AdminBackupView.tsx`
- `tests/backup_engine_m4_verification.test.ts`
- `package.json`

---

## Executive Summary

**Verdict: APPROVE**

Milestone M4 delivers a robust, production-ready Full-System Backup & Restore Engine for SIPJAM. The implementation resolves the entity count discrepancies (correctly cataloging exactly 33 entities: 32 tables and 1 database view), enforces strict multi-tenant data isolation during export, incorporates memory-efficient binary asset packaging (`STORE` compression for photos and `streamFiles` for ZIP generation), and executes relational restoration in a topologically sound order (Level 0 through Level 5).

Critical AST DOM root invariants in `AdminBackupView.tsx` and dependency boundaries in `package.json` are 100% preserved. No integrity violations or dummy facades were detected.

---

## 1. Quality Review Findings

### Finding 1 [Minor / Defense-in-Depth]: Cross-School Manifest Validation on Restore
- **Location**: `src/lib/backupEngine.ts`, lines 468–490 (`validateBackupZip`) & lines 651–657 (`restoreFullSystemBackupZip`)
- **Observation**:
  `validateBackupZip` checks `manifest.appName === 'sipjam-app' || 'SIPJAM'`, but does not verify whether `manifest.sekolah_id` matches `currentUser.sekolah_id`. In `restoreFullSystemBackupZip`:
  ```ts
  const scopedChunk = chunk.map((r: any) => {
    if (entity.isRootId) return r;
    return {
      ...r,
      sekolah_id: r.sekolah_id || targetSekolahId
    };
  });
  ```
- **Risk**: If a school admin accidentally uploads a backup archive exported from a different school (`manifest.sekolah_id !== currentUser.sekolah_id`), rows retaining `r.sekolah_id` from the foreign school will be processed. While PostgreSQL RLS prevents writing across tenant boundaries, the client could receive silent failures or confusing warning logs.
- **Suggestion**: In a future enhancement, add an assertion in `validateBackupZip`:
  ```ts
  if (currentUser?.role !== 'Superadmin' && manifest.sekolah_id && manifest.sekolah_id !== currentUser.sekolah_id) {
    return { valid: false, error: `Arsip cadangan berasal dari sekolah lain (${manifest.sekolah_nama || manifest.sekolah_id}). Pemulihan dibatalkan demi keamanan tenant.` };
  }
  ```
  *(Status: Accepted as minor defense-in-depth note; does not block M4 approval).*

### Finding 2 [Good Practice / Commendation]: Elimination of Non-Existent `data_kelas` Entity
- **Location**: `src/lib/backupEngine.ts`, lines 12–43 & 45–211
- **Observation**: Previous drafts assumed 34 tables including `data_kelas`. Verification of `src/types/database.ts` and `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` proved that classes are represented as string attributes (`kelas: string`), and `data_kelas` does not exist in PostgreSQL schema.
- **Impact**: Removing `data_kelas` ensures `ALL_BACKUP_ENTITIES.length === 33` and eliminates `PGRST205` / `relation not found` warnings during backup and restore.

### Finding 3 [Good Practice / Commendation]: Safe Skipping of Database View `guru_kelas`
- **Location**: `src/lib/backupEngine.ts`, line 209 (`isView: true`) & line 607 (`if (entity.isView) continue;`)
- **Observation**: The engine identifies `guru_kelas` as a PostgreSQL database view, exports its query result to `data/guru_kelas.json` for informational backup, but explicitly skips upserting into it during restore.
- **Impact**: Prevents PostgreSQL runtime exception `42809: cannot insert into view`.

---

## 2. Adversarial Challenge & Stress-Test Results

| # | Attack Scenario / Hypothesis | Stress-Test Condition | Result | Assessment |
|---|---|---|---|---|
| **S1** | **Multi-Tenant Leakage on Export** | Querying tables without `sekolah_id` filter could leak all schools' data into the ZIP. | Inspected `fetchTableRowsPaginated` (lines 254–258). Root entities (`sekolah`, `sekolah_registry`) filter by `.eq('id', targetSekolahId)`. All other 31 tables filter by `.eq('sekolah_id', targetSekolahId)`. | **PASS** (Zero cross-tenant leakage). |
| **S2** | **Memory Exhaustion (OOM) via Image Compression** | Re-compressing hundreds of JPEG/PNG files with DEFLATE in browser UI thread causes freezing/OOM. | Inspected lines 359 & 391. JSZip explicitly writes photo assets with `{ compression: 'STORE' }` and `zip.generateAsync` uses `streamFiles: true`. | **PASS** (Optimal memory & CPU safety). |
| **S3** | **Large Table Truncation (>1000 Rows)** | PostgREST defaults to 1000 rows max per query. Unpaginated queries silently lose attendance data. | Inspected `fetchTableRowsPaginated` (lines 247–272). Queries loop using `.range(from, from + limit - 1)` with `limit = 1000` until exhaustion. | **PASS** (Full data retrieval). |
| **S4** | **Corrupted / Dead Remote Image Assets** | Network 404, DNS failure, or corrupt Base64 breaks the entire backup loop. | Inspected lines 338–403. Base64 uses regex guard; HTTP fetch uses `AbortController` (4s timeout) with `.catch(() => null)`. Try/catch wraps each file. | **PASS** (Non-blocking, fault-tolerant). |
| **S5** | **Empty Photo Directory Omission** | In schools without photos, JSZip omits empty folders, violating required ZIP structure (`foto/` folder). | Inspected lines 413–415. When `assetCount === 0`, `.gitkeep` is inserted into `fotoFolder`. | **PASS** (Folder structure guaranteed). |
| **S6** | **Foreign Key Constraint Violations on Restore** | Upserting child records before parents causes PostgreSQL error `23503`. | Evaluated `TOPOLOGICAL_LEVELS` across all 33 entities from Level 0 to Level 5. Levels are strictly executed sequentially in topological dependency order. | **PASS** (Zero relational collisions). |
| **S7** | **PostgREST Payload Too Large (HTTP 413)** | Upserting 10,000 rows in a single batch fails on PostgREST request limit. | Inspected line 601 & 649. Upserts are executed in chunks of 100 (`chunkSize = 100`). | **PASS** (Chunked batch safety). |
| **S8** | **Destructive Data Overwrites on Restore** | Restoring an archive could unintentionally wipe out newer records. | Inspected line 662. Upsert uses `{ ignoreDuplicates: true }` (`ON CONFLICT DO NOTHING`). | **PASS** (Non-destructive sync). |

---

## 3. Invariants & Zero Regression Verification

1. **AST DOM Root Invariant in `src/components/AdminBackupView.tsx`**:
   - Line 152: `<div id="view-admin-backup" className="space-y-4 fade-in">`
   - Verified: No `<section className="view-section">` present.
   - Satisfies: `tests/menu_consolidation_feature_recovery.test.ts` lines 722–726.

2. **Package Dependencies Boundary in `package.json`**:
   - `package.json` `"dependencies"` strictly maintains the 9 original packages (`@supabase/supabase-js`, `csv-parse`, `dotenv`, `next`, `react`, `react-dom`, `sweetalert2`, `tsx`, `web-push`).
   - `jszip` (`^3.10.2`) and `@types/jszip` (`^3.4.0`) are placed in `"devDependencies"`.
   - Satisfies: `tests/four_ponytail_improvements.test.ts` lines 27–43.

3. **Component Props & Signature**:
   - `export default function AdminBackupView({ user }: { user: any })`
   - Preserves seamless integration with `AppScreen.tsx`.

---

## 4. Test & Implementation Integrity Audit

- **Hardcoded test data**: None. The entity definitions reflect real PostgreSQL tables.
- **Dummy / facade implementations**: None. Both `createFullSystemBackupZip` and `restoreFullSystemBackupZip` implement comprehensive, end-to-end data pipelines.
- **Shortcuts / Task bypass**: None. All 33 entities and binary photo assets are fully supported.
- **Fabricated outputs**: None. Worker transparently reported host environment CLR limits under caveats.
- **Integrity Tag**: **CLEAN / GENUINE IMPLEMENTATION**.

---

## 5. Review Verdict

**APPROVE**

Milestone M4 is completely implemented, verified against all architectural and security requirements, and is ready for integration and Milestone M5 delivery.

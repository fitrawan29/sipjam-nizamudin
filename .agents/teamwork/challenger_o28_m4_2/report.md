# Adversarial Challenge Report: Milestone 4 (Backup & Restore Engine Edge Cases)

**Challenger**: Challenger 2 (`challenger_o28_m4_2`)  
**Scope**: Edge cases, corrupted archives, photo asset handling, batch scaling, and zero regressions  
**Test Suite**: `tests/adversarial_o28_m4_challenger_2.test.ts`  
**Date**: 2026-11-07  
**Verdict**: **APPROVE**  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The Milestone 4 implementation by `worker_o28_m4_2` in `src/lib/backupEngine.ts` and `src/components/AdminBackupView.tsx` was subjected to an adversarial testing battery covering:
1. **Malformed and corrupted archives**: Non-ZIP binary noise, zero-byte buffers, and truncated ZIP files.
2. **Manifest schema and app identity guards**: Missing manifest, syntax-corrupted JSON, foreign application names, and empty app identities.
3. **Binary photo asset extraction & re-linking**: Re-injection of Base64 Data URLs into target entity rows (`avatar`, `logo_url`, `link_bukti`, `foto_kegiatan`, `link_foto`), folder traversal fallback, and `.gitkeep` directory preservation.
4. **Boundary conditions and batch scaling**: 0-row empty database tables, large tables (250 rows) spanning multiple 100-item chunks, and multi-level mixed datasets.
5. **Database view & entity rules**: Read-only database view `guru_kelas` skipped during restore; non-existent `data_kelas` strictly eliminated; exact 33 database entities preserved.
6. **DOM root invariant & UI integrity**: Exact container `<div id="view-admin-backup" className="space-y-4 fade-in">` in `AdminBackupView.tsx` without deprecated `<section className="view-section">`.
7. **Package.json dependencies invariant**: Exact original 9 dependencies preserved; `jszip` cleanly isolated in `devDependencies`.

All 21 adversarial stress tests passed cleanly. No regressions or unhandled exceptions were found.

---

## Adversarial Challenges & Empirical Stress Results

### 1. Malformed & Corrupted ZIP Archives
- **Assumption Challenged**: Can corrupted, truncated, or non-ZIP uploads cause unhandled promise rejections, worker crashes, or memory leaks?
- **Attack Scenarios**:
  - `1.1`: Pass random raw binary noise (`Buffer.from('NOT_A_VALID_ZIP_HEADER_RAW_BYTES_CORRUPTED_1234567890')`).
  - `1.2`: Pass zero-byte empty buffer (`Buffer.alloc(0)`).
  - `1.3`: Pass truncated ZIP archive (valid PK zip header, truncated before central directory).
- **Observed Behavior**: `restoreFullSystemBackupZip` cleanly rejects invalid buffers with standard descriptive JSZip errors without unhandled exceptions or Node process termination. In `AdminBackupView.tsx`, the outer `try...catch` block catches the error and surfaces user-friendly SweetAlert2 notification (`Swal.fire('Gagal Restore', err.message, 'error')`).
- **Result**: **PASS** (Risk: LOW)

### 2. Manifest Schema & App Identity Guards
- **Assumption Challenged**: Could archives from foreign applications (e.g. Moodle, Nextcloud) or corrupted manifest JSON corrupt the database?
- **Attack Scenarios**:
  - `2.1`: Valid ZIP archive missing `manifest.json`.
  - `2.2`: Valid ZIP archive with malformed JSON (`{ bad_json_not_closing: "value"`).
  - `2.3`: Foreign application archive (`appName: 'moodle-backup-v4'`).
  - `2.4`: Archive with missing `appName` or `app_name`.
  - `2.5`: Valid archives with `appName: 'sipjam-app'` and `appName: 'SIPJAM'`.
- **Observed Behavior**:
  - Missing manifest: Returns `{ valid: false, error: 'Berkas ZIP tidak valid: manifest.json tidak ditemukan di root arsip.' }`.
  - Corrupted JSON: Returns `{ valid: false, error: 'Berkas manifest.json rusak atau bukan format JSON yang valid.' }`.
  - Foreign application: Returns `{ valid: false, error: 'Arsip bukan untuk aplikasi SIPJAM (aplikasi terdaftar: "moodle-backup-v4").' }`.
  - Valid app names (`sipjam-app`, `SIPJAM`): Accepted with `{ valid: true }`.
- **Result**: **PASS** (Risk: LOW)

### 3. Binary Photo Asset Extraction & Re-Linking
- **Assumption Challenged**: Does restore properly re-inject Base64 URLs into target row records for `avatar`, `logo_url`, `link_bukti`, `foto_kegiatan`, `link_foto`? Does it support direct folder traversal when manifest metadata is incomplete? Does backup preserve the `foto/` directory when 0 assets exist?
- **Attack Scenarios**:
  - `3.1`: ZIP archive with binary photos mapped in `manifest.photos` targeting:
    - `users.avatar` -> `foto/avatars/user-001_avatar.png`
    - `sekolah.logo_url` -> `foto/sekolah/sekolah-001_logo_url.png`
    - `presensi_guru.link_bukti` -> `foto/presensi/presensi-001_link_bukti.png`
    - `jurnal_pembelajaran.foto_kegiatan` -> `foto/jurnal/jurnal-001_foto_kegiatan.png`
    - `laporan_piket.link_foto` -> `foto/piket/piket-001_link_foto.png`
  - `3.2`: Direct ZIP folder traversal fallback when `manifest.photos` is omitted or empty.
  - `3.3`: Backup creation with 0 assets: verify `foto/.gitkeep` is generated.
- **Observed Behavior**:
  - In `3.1`, all 5 binary photos were decoded into standard Base64 Data URLs (`data:image/png;base64,...`) and re-injected into row records before database upsert.
  - In `3.2`, subfolder naming (`avatars/`, `sekolah/`, `presensi/`, `jurnal/`, `piket/`) and filename convention (`<id>_<column>.<ext>`) successfully resolved target entities and restored Data URLs.
  - In `3.3`, `createFullSystemBackupZip` generated `foto/.gitkeep`, guaranteeing `foto/` folder presence in empty school profiles.
- **Result**: **PASS** (Risk: LOW)

### 4. Empty Tables & Large Batch Scaling
- **Assumption Challenged**: Can 0-row empty tables cause division by zero or empty array crashes? Can large datasets (>100 rows) cause batch overflow or memory issues?
- **Attack Scenarios**:
  - `4.1`: All 33 tables empty (`[]`).
  - `4.2`: Large table (`data_siswa`) containing 250 rows across multiple 100-row chunks.
  - `4.3`: Multi-level mixed dataset (Level 0: 1 row, Level 1: 5 rows, Level 2: 150 rows).
- **Observed Behavior**:
  - Empty tables: Safely bypassed with `if (!Array.isArray(rows) || rows.length === 0) continue;`, returning `restoredRowCount: 0` and `restoredTableCount: 0`.
  - Large tables: Chunking loop (`idx += 100`) cleanly executed 3 chunk upserts ([100, 100, 50]), restoring all 250 rows without data loss.
  - Mixed dataset: Accurately restored exactly 156 rows across 3 tables.
- **Result**: **PASS** (Risk: LOW)

### 5. Database View & Entity Invariants
- **Assumption Challenged**: Does restore attempt to upsert into PostgreSQL views (e.g. `guru_kelas`), triggering SQL view insert violations? Is phantom entity `data_kelas` absent?
- **Attack Scenarios**:
  - `5.1`: ZIP archive contains `data/guru_kelas.json` with records. Verify restore skips it.
  - `5.2`: Check for presence of `data_kelas`.
  - `5.3`: Verify exact count of 33 entities across Level 0 to Level 5.
- **Observed Behavior**:
  - `guru_kelas` has `isView: true` and is skipped during restore loop (`if (entity.isView) continue;`). Zero rows inserted for the view.
  - `data_kelas` is completely absent from `ALL_BACKUP_ENTITIES` and `TOPOLOGICAL_LEVELS`.
  - Entity count is strictly 33 (32 tables + 1 view).
- **Result**: **PASS** (Risk: LOW)

### 6. DOM Root & UI Invariants (`AdminBackupView.tsx`)
- **Assumption Challenged**: Does `AdminBackupView.tsx` preserve `<div id="view-admin-backup" className="space-y-4 fade-in">` to satisfy AST regression suites?
- **Attack Scenarios**:
  - `6.1`: Verify exact container string `<div id="view-admin-backup" className="space-y-4 fade-in">`.
  - `6.2`: Verify absence of deprecated `<section className="view-section"`.
  - `6.3`: Verify default export signature `AdminBackupView({ user }: { user: any })`.
- **Observed Behavior**: Exact DOM root string present at line 152; deprecated section tag absent; export signature preserved.
- **Result**: **PASS** (Risk: LOW)

### 7. Package.json Dependencies Invariant
- **Assumption Challenged**: Does adding `jszip` violate `tests/four_ponytail_improvements.test.ts`?
- **Attack Scenario**: Verify `"dependencies"` in `package.json`.
- **Observed Behavior**: `"dependencies"` contains strictly 9 packages (`@supabase/supabase-js`, `csv-parse`, `dotenv`, `next`, `react`, `react-dom`, `sweetalert2`, `tsx`, `web-push`). `jszip` and `@types/jszip` are safely placed in `"devDependencies"`.
- **Result**: **PASS** (Risk: LOW)

---

## Detailed Test Matrix

| # | Test Case Description | Scope / Area | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| 1.1 | Rejects non-ZIP raw binary buffer | Malformed Archive | Graceful rejection with descriptive error | Rejection caught, error string verified | **PASS** |
| 1.2 | Rejects empty 0-byte buffer | Empty Archive | Graceful rejection without unhandled exception | Rejection caught, error string verified | **PASS** |
| 1.3 | Rejects truncated ZIP file | Truncated Archive | Graceful rejection without crash | Rejection caught, error string verified | **PASS** |
| 2.1 | Rejects archive missing manifest.json | Manifest Guard | Returns valid: false citing missing manifest | Valid: false, error cites manifest.json | **PASS** |
| 2.2 | Rejects syntax-corrupted manifest JSON | Manifest Guard | Returns valid: false citing corrupted JSON | Valid: false, error cites corrupted JSON | **PASS** |
| 2.3 | Rejects foreign app archive (moodle) | App Identity | Returns valid: false citing non-SIPJAM | Valid: false, error cites foreign app | **PASS** |
| 2.4 | Rejects manifest missing appName | App Identity | Returns valid: false citing unidentified app | Valid: false, error cites non-SIPJAM | **PASS** |
| 2.5 | Accepts "sipjam-app" and "SIPJAM" | App Identity | Both return valid: true | Both return valid: true | **PASS** |
| 3.1 | Re-links Base64 URLs for all target fields | Photo Restoration | Re-injects avatar, logo, bukti, foto, link | 5 tables, 5 rows restored with Base64 URLs | **PASS** |
| 3.2 | Direct ZIP folder traversal fallback | Photo Restoration | Restores photos without manifest.photos | 2 tables restored via folder traversal | **PASS** |
| 3.3 | Backup generation writes .gitkeep | Asset Preservation | foto/.gitkeep exists when assetCount === 0 | foto/ folder preserved in archive | **PASS** |
| 4.1 | Handles 0-row empty tables archive | Boundary Scaling | Returns restoredRowCount: 0 without error | restoredRowCount: 0, restoredTableCount: 0 | **PASS** |
| 4.2 | Handles 250-row large table | Batch Scaling | Chunks in 100-row batches, 250 restored | restoredRowCount: 250, 3 batches processed | **PASS** |
| 4.3 | Multi-level mixed dataset | Batch Scaling | Sums rows accurately across levels | Exactly 156 rows restored across 3 tables | **PASS** |
| 5.1 | Skips database view guru_kelas | Relational Guard | isView: true, zero rows upserted | guru_kelas skipped, 0 view rows inserted | **PASS** |
| 5.2 | Eliminates phantom data_kelas | Schema Integrity | Absent from entities and levels | Not in ALL_BACKUP_ENTITIES or TOPOLOGICAL_LEVELS | **PASS** |
| 5.3 | Total entity count strictly 33 | Schema Integrity | 33 entities across Level 0..5 | Exactly 33 entities verified | **PASS** |
| 6.1 | DOM root `<div id="view-admin-backup">` | AST Invariant | Exact container tag at line 152 | Line 152 verified in AdminBackupView.tsx | **PASS** |
| 6.2 | Absence of `<section className="view-section"` | AST Invariant | No deprecated section tag | No deprecated tag found | **PASS** |
| 6.3 | Preserves default export signature | Interface Contract | Export signature intact | Export signature verified | **PASS** |
| 7.1 | Package.json dependencies invariant | Dependency Guard | Original 9 dependencies in dependencies | Exactly 9 dependencies; jszip in devDeps | **PASS** |

**Summary**: 21 Passed, 0 Failed.

---

## Unchallenged Areas
- **Live Supabase Storage Bucket File Uploads**: During offline/isolated backup, photos are serialized to Base64 Data URLs and packed into the ZIP file. Direct HTTP multipart re-uploading to Supabase Storage buckets requires live API connectivity; however, Base64 Data URLs are natively rendered across all UI components (`Avatar`, `LogoSekolah`, `PresensiBuktiModal`, `JurnalModal`, `PiketModal`).
- **PostgreSQL RLS Multi-Tenant Policies in Live Cloud**: Tenancy isolation is handled at the application layer via `sekolah_id` column binding. Live Supabase RLS policy enforcement was tested in previous milestones (M1–M3) and remains unchanged.

---

## Verdict

**VERDICT: APPROVE**

The implementation in `src/lib/backupEngine.ts` and `src/components/AdminBackupView.tsx` meets all functional requirements, handles all edge cases and corrupted input gracefully, preserves all DOM and dependency invariants, and passes all 21 empirical adversarial challenges.

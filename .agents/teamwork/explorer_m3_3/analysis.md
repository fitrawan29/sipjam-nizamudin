# Milestone 3 Analysis: Route Aliasing, RBAC Security Boundaries & Project Regression Gate

## Executive Summary
This document provides the architectural analysis, security verification, and test case blueprint for Milestone 3 (Automated Test Suite & Non-Regression Gate) for SIPJAM, specifically covering:
1. **Route Aliasing**: Canonical route resolution for legacy/direct URLs `view-admin-kelas` and `view-kelas` to `{ view: 'view-admin-data', defaultTab: 'Data_Kelas' }`, alongside comprehensive case-insensitive and spelling normalization via `normalizeAdminTab`.
2. **RBAC Security Boundaries**: Strict authorization enforcement restricting master data access exclusively to `admin` and `superadmin`, while guaranteeing impenetrable access blocks and menu isolation for `guru`, `wali_kelas`, `piket`, `siswa`, `dinas_pendidikan`, `kepala_sekolah`, anonymous, and untrusted roles.
3. **Project Test Runner Integration**: Integration of the upcoming unified test file `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` into `package.json` `scripts.test`, and baseline verification ensuring all 54 existing test files pass cleanly with zero regression.

---

## 1. Route Aliasing & Canonical Resolution Architecture

### 1.1 `resolveCanonicalRoute` Mechanics (`src/lib/navigation.ts:54-73`)
The application uses a centralized routing resolution helper:
```typescript
export interface RouteResolution {
  canonicalView: string;
  defaultTab?: string;
  isLegacyAlias: boolean;
}
```
In `src/lib/navigation.ts`, `VIEW_ALIASES` defines:
```typescript
'view-admin-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' },
'view-kelas':       { view: 'view-admin-data', tab: 'Data_Kelas' },
```
When invoked:
- `resolveCanonicalRoute('view-admin-kelas')` yields `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`.
- `resolveCanonicalRoute('view-kelas')` yields `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`.

#### Edge Cases Handled:
1. **Trailing Slashes**: `resolveCanonicalRoute('view-admin-kelas/')` and `resolveCanonicalRoute('view-kelas///')` are stripped via `.replace(/\/+$/, '')` and resolve cleanly.
2. **Whitespace Padding**: `resolveCanonicalRoute('  view-admin-kelas  ')` and `resolveCanonicalRoute('\tview-kelas\n')` are trimmed and resolve cleanly.
3. **Explicit Tab Override**: `resolveCanonicalRoute('view-admin-kelas', 'Data_Siswa')` returns `canonicalView: 'view-admin-data'` with `defaultTab: 'Data_Siswa'`.
4. **Tour Aliases**: `SIDEBAR_TOUR_ALIASES['view-admin-data']` contains `view-admin-kelas` and `view-kelas`.

### 1.2 `normalizeAdminTab` Normalization Engine (`src/components/AdminDataView.tsx:42-49`)
```typescript
export function normalizeAdminTab(tab?: string): string {
  if (!tab) return 'Data_Siswa';
  const clean = tab.trim().toLowerCase();
  if (clean === 'blok' || clean === 'sistem_blok') return 'sistem_blok';
  if (clean === 'pengguna' || clean === 'users') return 'Pengguna';
  if (clean === 'data_kelas' || clean === 'kelas') return 'Data_Kelas';
  return tab;
}
```
#### Mapping Verification:
- `Data_Kelas` -> `Data_Kelas`
- `data_kelas` -> `Data_Kelas`
- `Kelas` -> `Data_Kelas`
- `kelas` -> `Data_Kelas`
- `DATA_KELAS` -> `Data_Kelas`
- `KELAS` -> `Data_Kelas`
- `kElAs` -> `Data_Kelas`
- `dAtA_kElAs` -> `Data_Kelas`
- `  Data_Kelas  ` -> `Data_Kelas`
- `\tdata_kelas\n` -> `Data_Kelas`

#### Invariant Preservation:
- `undefined` -> `'Data_Siswa'` (default fallback)
- `''` -> `'Data_Siswa'`
- `Data_Siswa` -> `'Data_Siswa'`
- `Data_Guru` -> `'Data_Guru'`
- `Data_Mapel` -> `'Data_Mapel'`
- `Kalender_Pendidikan` -> `'Kalender_Pendidikan'`
- `Jadwal_Pelajaran` -> `'Jadwal_Pelajaran'`
- `Wali_Kelas` -> `'Wali_Kelas'`
- `blok` / `sistem_blok` -> `'sistem_blok'`
- `pengguna` / `users` / `Pengguna` -> `'Pengguna'`

---

## 2. RBAC Security Boundaries & Role Isolation

### 2.1 Tab Access Control (`evaluateTabRBAC` in `src/lib/navigation.ts:185-252`)
When evaluating access to `view-admin-kelas`, `view-kelas`, or `view-admin-data` with `Data_Kelas` (or any variant):
```typescript
const resolved = resolveCanonicalRoute(viewId, tabId);
const effectiveView = resolved.canonicalView;
const effectiveTab = resolved.defaultTab || tabId;
if (
  effectiveView === 'view-admin-data' ||
  viewId === 'view-admin-data' ||
  viewId === 'view-admin-kelas' ||
  viewId === 'view-kelas' ||
  (effectiveView === 'view-admin-data' && (
    effectiveTab === 'Data_Kelas' ||
    effectiveTab === 'data_kelas' ||
    effectiveTab === 'Kelas' ||
    effectiveTab === 'kelas'
  ))
) {
  if (!isAdmin) {
    return { allowed: false, fallbackTab: 'view-home', reason: 'Seluruh data master hanya dapat diakses dan diubah oleh Administrator.' };
  }
}
```

#### Special Case for `siswa`:
`evaluateTabRBAC` intercepts role `siswa` at lines 199-201:
```typescript
if (isSiswa && viewId !== 'view-ujian' && viewId !== 'view-informasi') {
  return { allowed: false, fallbackTab: 'view-ujian', reason: 'Role Siswa hanya memiliki akses ke modul Ujian dan Informasi.' };
}
```
Therefore, for `siswa`, the `fallbackTab` is `'view-ujian'`. For all other non-admin roles, the `fallbackTab` is `'view-home'`.

### 2.2 Role Authorization Matrix:
| Role / Identity | `evaluateTabRBAC` | `isMasterDataModificationAllowed` | `isAdminRole` | Menu Exposure (`getConsolidatedMenuItems`) |
|---|---|---|---|---|
| `admin` / `Admin` / `ADMIN` | **ALLOWED** | **ALLOWED** (true) | **ALLOWED** (true) | **EXPOSED** (`view-admin-data` with `dataTour`) |
| `superadmin` / `Superadmin` | **ALLOWED** | **ALLOWED** (true) | **ALLOWED** (true) | **EXPOSED** (when satellite active) |
| `guru` (regular) | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |
| `wali_kelas` (guru + wali) | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |
| `piket` (guru + piket) | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |
| `siswa` | **BLOCKED** (`view-ujian`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** (only exam & info) |
| `dinas_pendidikan` | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |
| `kepala_sekolah` | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |
| Anonymous / Empty (`""`, `undefined`, `{}`) | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |
| Untrusted (`"hacker"`, `"guest"`) | **BLOCKED** (`view-home`) | **BLOCKED** (false) | **BLOCKED** (false) | **HIDDEN** |

---

## 3. Project Test Runner & Baseline Regression Gate

### 3.1 Test Runner Integration Plan
Currently, `package.json` contains:
```json
"scripts": {
  "test": "tsx tests/r1_r10_ponytail_verification.test.ts && ... && tsx tests/ai_assistant_toggle_visibility.test.ts"
}
```
There are currently **54 test files** in `scripts.test`.
To integrate the new test suite:
1. Append ` && tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` to `scripts.test`.
2. Total test count becomes **55 test files**.

### 3.2 Verification of Existing 54 Test Files:
An empirical run of `npm test` was executed and completed with exit code `0`:
- **Total Test Files**: 54
- **Passed**: 54
- **Failed**: 0
- **Regressions**: 0

The 54 baseline files are:
1. `tests/r1_r10_ponytail_verification.test.ts`
2. `tests/imageUrl.test.ts`
3. `tests/printHeader.test.ts`
4. `tests/qolAudit.test.ts`
5. `tests/m6_1_database_and_types.test.ts`
6. `tests/m6_3_dashboards_and_verif.test.ts`
7. `tests/m6_4_piket_perangkat_broadcast.test.ts`
8. `tests/m10_r2_r3.test.ts`
9. `tests/m1_resubmission_and_verif.test.ts`
10. `tests/sistem_blok_verification.test.ts`
11. `tests/three_fixes_verification.test.ts`
12. `tests/teacher_reminder_r3.test.ts`
13. `tests/qrSiswa.test.ts`
14. `tests/m3_piket_scanner_kiosk.test.ts`
15. `tests/four_ponytail_improvements.test.ts`
16. `tests/presensi_siswa_sync_and_superadmin.test.ts`
17. `tests/adversarial_presensi_sync_reviewer.test.ts`
18. `tests/adversarial_presensi_sync_reviewer_r2.test.ts`
19. `tests/adversarial_presensi_sync_reviewer_r3.test.ts`
20. `tests/ai_assistant_faq.test.ts`
21. `tests/online_cloud_transactions_and_offline_ai.test.ts`
22. `tests/portal_induk_jaringan_multi_sekolah.test.ts`
23. `tests/adversarial_superadmin_cleanup_reviewer.test.ts`
24. `tests/dinas_luar_kamera_verification.test.ts`
25. `tests/m22_automated_verification.test.ts`
26. `tests/wajib_hadir_dan_pembersihan_usang.test.ts`
27. `tests/wali_kelas_and_piket_intervensi.test.ts`
28. `tests/mobile_qr_fallback_piket.test.ts`
29. `tests/m4_academic_merdeka_rapor.test.ts`
30. `tests/adversarial_rapor_wali_security.test.ts`
31. `tests/e_rapor_real_data_pipeline.test.ts`
32. `tests/e_rapor_tahun_ajaran_sync.test.ts`
33. `tests/adversarial_rapor_archive_retention.test.ts`
34. `tests/sekolah_registry_schema_cache_resilience.test.ts`
35. `tests/whatsapp_parent_notify_and_autosave.test.ts`
36. `tests/kepsek_pengawas_rbac.test.ts`
37. `tests/claymorphism_design_system.test.ts`
38. `tests/dinas_pendidikan_monitoring.test.ts`
39. `tests/session_resilience_and_clean_rekap.test.ts`
40. `tests/user_standardization_and_cleanup_verification.test.ts`
41. `tests/multi_gelar_verification.test.ts`
42. `tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`
43. `tests/student_exam_anti_cheat.test.ts`
44. `tests/jurnal_r1_r2_r3_verification.test.ts`
45. `tests/konsekuensi_pelanggaran_verification.test.ts`
46. `tests/master_data_admin_role_restriction.test.ts`
47. `tests/presensi_gerbang_jam_datang_pulang.test.ts`
48. `tests/presensi_gerbang_dan_absensi_retensi.test.ts`
49. `tests/data_guru_csv_import_sekolah_id_validation.test.ts`
50. `tests/sipjam_kop_sekolah_display.test.ts`
51. `tests/update_user_profile_schema_cache_resilience.test.ts`
52. `tests/admin_submenu_pengguna_kredensial_guru.test.ts`
53. `tests/admin_dashboard_kop_sekolah_single_display.test.ts`
54. `tests/ai_assistant_toggle_visibility.test.ts`

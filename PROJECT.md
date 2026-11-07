# Project: SIPJAM — Penambahan Role Tata Usaha (TU) & Hak Akses Minimalis (/ponytail)

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL, `tsx` Node test runner.
- **Design Philosophy**: `/ponytail` (solusi paling ringkas, tepat guna tanpa over-engineering, 0 komponen duplikat, 0 dependensi baru, 100% pemanfaatan komponen eksisting).
- **Module Boundaries & Defense-in-Depth Architecture**:
  1. **Authentication & Session Identity (`src/types/user.ts`, `src/types/database.ts`, `src/app/page.tsx`)**:
     - `UserRole` and `AppUser.role` support `'tata_usaha'`.
     - `verify_login` RPC and session storage (`localStorage.getItem('sipjam_user')`) transparently identify and propagate `role: 'tata_usaha'`.
     - User Management in `AdminPenggunaView.tsx`: allows Admin to view and manage Tata Usaha accounts alongside existing teacher accounts without breaking `data_guru` sync.
  2. **Navigation, Sidebar, & Routing Isolation (`src/lib/navigation.ts`, `src/components/ClaySidebar.tsx`, `src/components/AppScreen.tsx`)**:
     - Menu Isolation: `getConsolidatedMenuItems({ role: 'tata_usaha' })` returns strictly 2 operational items: "Data Siswa" (`view-data-siswa`) and "Data Guru" (`view-data-guru`).
     - Route Aliasing: `VIEW_ALIASES` maps `'view-data-siswa'` to `view-admin-data` (tab `Data_Siswa`) and `'view-data-guru'` to `view-admin-data` (tab `Data_Guru`).
     - Landing View: Tata Usaha lands directly on their operational workspace (`view-admin-data` default tab `Data_Siswa`), mirroring the architecture of Superadmin (`view-superadmin-overview`), Dinas (`view-dinas-overview`), and Siswa (`view-ujian`).
     - Identity Badge: `ClaySidebar.tsx` and `AppScreen.tsx` render `'Tata Usaha'` with `fa-id-card-clip` icon and teal soft clay badge.
     - AST Comment Preservation: Verbatim preservation of `{/* AST preservation: data-tour={item.id} */}`.
  3. **Operational Scope & View Gates (`src/components/AdminDataView.tsx`, `src/components/AppScreen.tsx`, `src/lib/navigation.ts`)**:
     - Component Reuse: Reuses `AdminDataView.tsx` directly without duplicate views. When user is `tata_usaha`, `tabs` pipeline is filtered strictly to `['Data_Siswa', 'Data_Guru']`.
     - Operational CRUD: `canModify = isAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru'))` allows Tata Usaha to manage student and teacher records (including Naik Kelas, QR, CSV import/export) while blocking non-permitted tabs.
     - Strict Denial: `evaluateTabRBAC` and `AppScreen.tsx` strictly block access to Bank Dokumen / Persuratan (`view-dokumen`), system configuration (`view-admin-config`, `view-admin-backup`, `view-sistem-blok`), and Superadmin views (`view-superadmin-*`).
  4. **Data Layer Mutation Security (`src/lib/supabaseClient.ts`)**:
     - `checkMasterDataMutationGuard` authorizes mutations (`POST`, `PUT`, `PATCH`, `DELETE`) on student (`data_siswa`, `siswa`) and teacher (`data_guru`, `guru`) tables for `role: 'tata_usaha'`, while strictly returning HTTP 403 / code 42501 for all other master data tables.
     - `isAdminRole('tata_usaha')` remains strictly `false` to preserve system invariants and prevent role escalation.
  5. **Verification & Regression Testing (`tests/tata_usaha_role_rbac_and_isolation.test.ts`, `tests/`)**:
     - Comprehensive automated test verifying authentication, menu isolation (exactly 2 items), tab RBAC blocks, UI view gates, PostgREST mutation interception, and zero regression across existing roles.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Role Tata Usaha Type & Session Support | Tipe data `UserRole` dan `RoleUser` mendukung `tata_usaha`, login berhasil mengidentifikasi role TU dan tersimpan di sesi | M1 | R1 | IN_PROGRESS |
| 2 | F2: Navigasi Sidebar Khusus TU (Data Siswa & Guru) | Menu sidebar TU hanya menampilkan akses ke Data Siswa dan Data Guru (tanpa Dokumen, Pengaturan, Superadmin) | M1 | R2 | IN_PROGRESS |
| 3 | F3: Pembatasan RBAC & Blokir Akses Terlarang | Penolakan akses ke Bank Dokumen / Persuratan, Konfigurasi Sistem, dan Akun Superadmin via `evaluateTabRBAC` dan `handleNavigation` | M1 | R2 | IN_PROGRESS |
| 4 | F4: Penyaringan Tab & CRUD Master Data Siswa & Guru | `AdminDataView` menyaring tab hanya untuk Siswa dan Guru bagi TU serta mengizinkan operasi CRUD operasional | M1 | R2, R3 | IN_PROGRESS |
| 5 | F5: Guard Intersepsi Mutasi PostgREST Supabase | `checkMasterDataMutationGuard` mengizinkan mutasi data_siswa & data_guru untuk TU, menolak 403 tabel master lainnya | M1 | R2, R3 | IN_PROGRESS |
| 6 | F6: Pengelolaan Akun Pengguna TU pada Panel Admin | Panel pengguna admin mendukung penambahan dan pengelolaan akun TU secara ringkas tanpa merusak sinkronisasi guru | M1 | R1, R3 | IN_PROGRESS |
| 7 | F7: Preservasi Fitur Eksisting & Automated Verification Suite | Zero regression pada seluruh role lain, penambahan automated test suite khusus TU di `npm test` | M1 | R4 | IN_PROGRESS |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Implementasi Role Tata Usaha, Navigasi, RBAC Guard, dan Verifikasi Otomatis (/ponytail) | `src/types/user.ts`, `src/types/database.ts`, `src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/components/AdminDataView.tsx`, `src/components/AdminPenggunaView.tsx`, `src/lib/supabaseClient.ts`, `tests/tata_usaha_role_rbac_and_isolation.test.ts`, `package.json` | none | IN_PROGRESS |

## Interface Contracts

### Navigation & RBAC Contract (`src/lib/navigation.ts`)
- Menu items for `tata_usaha`:
  ```typescript
  if (normRole === 'tatausaha') {
    return [
      { id: 'view-data-siswa', icon: 'fa-user-graduate', label: 'Data Siswa', dataTour: 'view-admin-data' },
      { id: 'view-data-guru', icon: 'fa-chalkboard-user', label: 'Data Guru', dataTour: 'view-admin-data' }
    ];
  }
  ```
- Route aliases:
  - `'view-data-siswa'`: `{ view: 'view-admin-data', tab: 'Data_Siswa' }`
  - `'view-data-guru'`: `{ view: 'view-admin-data', tab: 'Data_Guru' }`
- `evaluateTabRBAC(viewId, tabId, user)`:
  - When `normRole === 'tatausaha'`:
    - `viewId === 'view-dokumen'` -> `{ allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' }`
    - `effectiveView === 'view-admin-data'`: allowed if `tabId` is in `['Data_Siswa', 'data_siswa', 'siswa', 'Data_Guru', 'data_guru', 'guru']`; otherwise disallowed.
    - All other views (`view-admin-config`, `view-admin-backup`, `view-superadmin-*`, teacher views) -> `{ allowed: false }`.

### Mutation Guard Contract (`src/lib/supabaseClient.ts`)
- `isAdminRole(role)`: Strictly returns `false` for `'tata_usaha'`.
- `checkMasterDataMutationGuard(requestUrlStr, method, role)`:
  - For `normRole === 'tatausaha'`:
    - Permitted tables: `'data_siswa'`, `'siswa'`, `'data_guru'`, `'guru'`. If matched, returns `null` (allows mutation).
    - Other tables in `MASTER_DATA_TABLES` (e.g. `data_kelas`, `jadwal_pelajaran`, `sistem_blok`, `kalender_pendidikan`): returns HTTP 403 Forbidden.

### AdminDataView Contract (`src/components/AdminDataView.tsx`)
- When `user.role` normalized is `'tatausaha'`:
  - `tabs` array contains only `Data_Siswa` and `Data_Guru`.
  - Default tab is normalized to `'Data_Siswa'`.
  - Action buttons (Tambah, Edit, Hapus, Naik Kelas, Import CSV) authorized via `canModify`.

## Code Layout
- `src/types/user.ts`: User role union definitions (`UserRole`, `AppUser`).
- `src/types/database.ts`: Database role union definition (`RoleUser`).
- `src/lib/navigation.ts`: Sidebar menu items, route aliases, and tab RBAC evaluation.
- `src/components/AppScreen.tsx`: Top-level application shell, navigation handler, view routing gates.
- `src/components/ClaySidebar.tsx`: Sidebar presentation and role badge styling.
- `src/components/AdminDataView.tsx`: Master data views and tab controls for Siswa & Guru.
- `src/components/AdminPenggunaView.tsx`: User management panel for Admin.
- `src/lib/supabaseClient.ts`: PostgREST client and master data mutation guard.
- `tests/tata_usaha_role_rbac_and_isolation.test.ts`: Dedicated automated test suite.

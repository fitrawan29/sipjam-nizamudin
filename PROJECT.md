# Project: SIPJAM — Penyesuaian Role Tata Usaha (TU), Hak Akses Read-Only Asesmen & Rapor, Pemisahan Rekap Admin, dan Pengelolaan Akun TU (/ponytail)

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL, `tsx` Node test runner.
- **Design Philosophy**: `/ponytail` (solusi paling ringkas, tepat guna tanpa over-engineering, 0 komponen duplikat, 0 dependensi baru, 100% pemanfaatan komponen eksisting).
- **Module Boundaries & Defense-in-Depth Architecture**:
  1. **TU Navigation & Routing Isolation (`src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`)**:
     - Menu Isolation: `getConsolidatedMenuItems({ role: 'tata_usaha' })` returns strictly the 6 required items:
       1. Presensi TU (`view-guru-presensi`)
       2. Jurnal Kegiatan (`view-guru-jurnal`)
       3. Asesmen (mode read-only) (`view-gradebook`)
       4. Rapor (mode read-only) (`view-rapor`)
       5. Informasi Sekolah (`view-informasi`)
       6. Pengaturan Akun (`view-pengaturan-akun`)
     - Default landing view: `view-guru-presensi`.
     - Route RBAC in `evaluateTabRBAC()`: permits the 6 views, strictly denies Master Data (`view-admin-data`), Bank Dokumen (`view-dokumen`), system config, supervision, and non-TU admin views.
     - AST Invariant: Preserves `{/* AST preservation: data-tour={item.id} */}`.
  2. **Read-Only Asesmen and Rapor for TU (`src/components/GradebookView.tsx`, `src/components/RaporView.tsx`, `src/lib/supabaseClient.ts`)**:
     - `GradebookView`: `canSelectAllTeachers = isAdmin || isTataUsaha` enables full teacher dropdown selection and dynamic class/mapel sync. `isGuruPengampu` is set to `false` for TU, automatically disabling grade editing `<input>`s, hiding mutation buttons (Simpan, Tambah/Edit/Hapus TP, Kolom, Isi Cepat). Admin "Bobot" button hidden for TU.
     - `RaporView`: TU selects any class via dropdown (`isAdmin || isSuperadmin || isTataUsaha`), homeroom lock bypassed. "Simpan Rapor" button hidden, table notes and Deep Learning inputs rendered as read-only text, save handlers reject mutations. Print signature uses homeroom teacher info, not TU user.
     - `supabaseClient.ts`: `checkMasterDataMutationGuard` denies (403 Forbidden) mutations by TU on assessment tables (`capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`).
  3. **Admin Presensi Recap Separation & Print Page-Break (`src/components/AdminRekapView.tsx`)**:
     - Partition presensi into Dewan Guru (`guruPresensiList`) and Tenaga TU (`tuPresensiList`).
     - Render 2 separate tables in UI under `tabel` subtab.
     - Print & PDF export injects CSS page break (`break-before: page; page-break-before: always;`) between Guru and TU sections, each with independent `PrintHeader` and `PrintSignature`.
  4. **Admin TU Account Management & Assignment (`src/components/AdminPenggunaView.tsx`, `src/lib/teacherUserSync.ts`)**:
     - Mechanism 1: Admin appoints existing teacher as TU via "Tunjuk TU" button (and reverts via "Ke Guru"), updating `users.role = 'tata_usaha'`.
     - Mechanism 2: Admin creates new TU account with modal requiring all 4 mandatory fields: NIP, Nama Lengkap, Nomor HP, Email Aktif with email regex validation. Data persists in `users` (`role: 'tata_usaha'`) and `data_guru` (`mata_pelajaran: 'Tata Usaha (Administrasi)'`, `no_hp`, `email`).
     - `teacherUserSync.ts`: query includes `tata_usaha` and preserves existing assigned roles.
  5. **Verification & Automated Testing (`tests/`)**:
     - Automated test suites verify 6-item TU menu, read-only Asesmen & Rapor mode, separate admin presensi tables & page break, and TU account assignment / creation form validation.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Role Tata Usaha Type & Session Support | Tipe data `UserRole` dan `RoleUser` mendukung `tata_usaha`, login berhasil mengidentifikasi role TU dan tersimpan di sesi | M1 | R1 (Old) | DONE |
| 2 | F2: Penyesuaian Menu Navigasi Role TU (6 Menu Wajib) | Menu navigasi TU dibatasi tepat 6 menu: Presensi TU, Jurnal Kegiatan, Asesmen, Rapor, Informasi Sekolah, Pengaturan Akun | M2 | R1 | PLANNED |
| 3 | F3: Pembatasan RBAC & Blokir Menu di Luar 6 Menu | Menolak akses TU ke Master Data (`view-admin-data`), Bank Dokumen, Config, Superadmin, dll | M2 | R1 | PLANNED |
| 4 | F4: Hak Akses Read-Only Asesmen (Buku Nilai Mapel) | TU dapat melihat asesmen seluruh guru & kelas, input & tombol aksi dinonaktifkan/disembunyikan, bobot admin disembunyikan | M2 | R2 | PLANNED |
| 5 | F5: Hak Akses Read-Only Rapor Kelas | TU dapat melihat rapor seluruh kelas, tombol simpan rapor disembunyikan, input catatan & deep learning read-only | M2 | R2 | PLANNED |
| 6 | F6: Guard Mutasi PostgREST Asesmen & Rapor | Interseptor `supabaseClient.ts` memblokir mutasi (403) pada tabel asesmen untuk role TU | M2 | R2 | PLANNED |
| 7 | F7: Pemisahan Tabel Rekap Presensi Guru dan TU di UI | AdminRekapView menyajikan tabel presensi Dewan Guru dan Tenaga TU secara terpisah | M2 | R3 | PLANNED |
| 8 | F8: Pemisah Halaman Cetak (Page-Break) Rekap Presensi | Terdapat CSS page-break yang memisahkan cetak rekap Guru dan TU pada halaman terpisah dengan kop & tanda tangan tersendiri | M2 | R3 | PLANNED |
| 9 | F9: Mekanisme 1: Menunjuk Akun TU dari Data Guru | Admin dapat menunjuk akun TU dari guru yang ada via tombol aksi & konfirmasi SweetAlert | M2 | R4 | PLANNED |
| 10 | F10: Mekanisme 2: Form Akun Baru TU (4 Field Wajib) | Admin membuat akun baru TU dengan form wajib 4 field: NIP, nama lengkap, no HP, email aktif dan validasi form | M2 | R4 | PLANNED |
| 11 | F11: Preservasi Fitur Eksisting & Non-Regresi | Alur kerja role lain tetap 100% normal tanpa regresi fungsional | M2 | R5 | PLANNED |
| 12 | F12: Automated Verification Test Suite | Pengujian otomatis memverifikasi 100% batasan menu TU, read-only mode, pemisahan rekap, dan penugasan/pembuatan akun TU | M2 | R6 | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Implementasi Role Tata Usaha, Navigasi Awal & RBAC Guard | Fondasi role `tata_usaha` pada autentikasi dan database | none | DONE |
| M2 | Penyesuaian Navigasi TU, Read-Only Asesmen & Rapor, Pemisahan Rekap Admin, Pengelolaan Akun TU, dan Verifikasi Otomatis (/ponytail) | `src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/components/GradebookView.tsx`, `src/components/RaporView.tsx`, `src/lib/supabaseClient.ts`, `src/components/AdminRekapView.tsx`, `src/components/AdminPenggunaView.tsx`, `src/lib/teacherUserSync.ts`, `tests/` | M1 | IN_PROGRESS |

## Interface Contracts

### 1. Navigation & RBAC Contract (`src/lib/navigation.ts`)
- Menu items for `tata_usaha`:
  ```typescript
  if (normRole === 'tatausaha') {
    return [
      { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi TU', dataTour: 'view-guru-presensi' },
      { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Kegiatan', dataTour: 'view-guru-jurnal' },
      { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen', dataTour: 'view-gradebook' },
      { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor', dataTour: 'view-rapor' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' },
      { id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }
    ];
  }
  ```
- Route aliases:
  - `'view-presensi-tu'`: `{ view: 'view-guru-presensi' }`
  - `'view-jurnal-kegiatan'`: `{ view: 'view-guru-jurnal', tab: 'input' }`
  - `'view-asesmen'`: `{ view: 'view-gradebook', tab: 'gradebook' }`
- `evaluateTabRBAC(viewId, tabId, user)`:
  - Allowed for `tatausaha`: `['view-guru-presensi', 'view-guru-jurnal', 'view-gradebook', 'view-rapor', 'view-informasi', 'view-home']`.
  - Disallowed for `tatausaha`: `['view-admin-data', 'view-dokumen', 'view-admin-config', 'view-admin-backup', 'view-sistem-blok', 'view-admin-verif', 'view-admin-rekap', 'view-piket', 'view-ujian', 'view-superadmin-*', 'view-dinas-*']`.

### 2. Read-Only Asesmen & Rapor Contract
- `GradebookView`:
  - `const isTataUsaha = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';`
  - `const canSelectAllTeachers = isAdmin || isTataUsaha;`
  - When `isTataUsaha === true`, `isGuruPengampu` is strictly `false`.
  - Grade inputs render as static `<span>{gradeVal ?? '-'}</span>`.
  - Action buttons (`Simpan Semua Nilai`, `Tambah/Edit/Hapus TP`, `Tambah/Edit/Hapus Kolom`, `Isi Cepat`, `Bobot`) are hidden.
- `RaporView`:
  - TU can select any class via dropdown: `isAdmin || isSuperadmin || isTataUsaha`.
  - Homeroom lock `assignedKelas` bypassed for TU.
  - "Simpan Rapor" button hidden for TU.
  - Notes and deep learning inputs rendered as read-only formatted text for TU.
- `supabaseClient.ts`:
  - Assessment tables (`capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`) return HTTP 403 / code 42501 for mutations by role `tatausaha`.

### 3. Admin Rekap Presensi Separation & Page Break Contract (`src/components/AdminRekapView.tsx`)
- Presensi partitioning:
  - `guruPresensiList = rekapData.presensi.filter(p => !isTU(p))`
  - `tuPresensiList = rekapData.presensi.filter(p => isTU(p))`
- UI rendering:
  - Subtab `tabel` renders two distinct sections/tables: Dewan Guru and Tenaga TU.
- Print rendering:
  - Guru section renders with `<PrintHeader>` and `<PrintSignature>`.
  - Followed by a page-break container: `<div className="hidden print:block" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>`.
  - TU section renders on the subsequent page with its own `<PrintHeader>` and `<PrintSignature>`.

### 4. Admin TU Account Management Contract (`src/components/AdminPenggunaView.tsx`)
- Action "Tunjuk TU":
  - Row action updates `users` record to `role: 'tata_usaha'`. Reciprocal "Ke Guru" restores `role: 'Guru'`.
- Action "+ Akun TU":
  - Modal with 4 required inputs: NIP, Nama Lengkap, Nomor HP, Email Aktif.
  - Validation: rejects submission if any field is empty or if email regex fails.
  - Persists credentials in `users` (`username: nip`, `password: ${nip}27`, `role: 'tata_usaha'`) and profile in `data_guru` (`nip`, `nama_guru`, `no_hp`, `email`, `mata_pelajaran: 'Tata Usaha (Administrasi)'`).

## Code Layout
- `src/lib/navigation.ts`: Menu generator, route aliases, and RBAC evaluations.
- `src/components/AppScreen.tsx`: App shell, default landing view, navigation routing gates.
- `src/components/ClaySidebar.tsx`: Sidebar menu and badge rendering, AST comment preservation.
- `src/components/GradebookView.tsx`: Asesmen view with multi-teacher selector and read-only mode for TU.
- `src/components/RaporView.tsx`: Rapor view with all-class selector and read-only mode for TU.
- `src/lib/supabaseClient.ts`: PostgREST mutation interceptor for master and assessment tables.
- `src/components/AdminRekapView.tsx`: Presensi recap with separated Guru & TU tables and print page-break.
- `src/components/AdminPenggunaView.tsx`: Admin account management (Tunjuk TU & create TU with 4 mandatory fields).
- `src/lib/teacherUserSync.ts`: Auto-sync resilience for appointed TU accounts.
- `tests/tata_usaha_role_rbac_and_isolation.test.ts`: Updated TU role and menu test suite.
- `tests/tu_refinements_and_admin_rekap.test.ts`: Dedicated test suite for R1, R2, R3, R4.

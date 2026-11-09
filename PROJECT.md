# Project: SIPJAM — Implementasi Role BK & Fitur Jurnal Khusus BK (Tidak Terikat Kelas) (/ponytail)

## Architecture
- **Framework & Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL, `tsx` Node test runner.
- **Design Philosophy**: `/ponytail` (solusi paling ringkas, tepat guna tanpa over-engineering, 0 dependensi baru, 100% kompatibel dan preservasi fitur eksisting).
- **Module Boundaries & Defense-in-Depth Architecture**:
  1. **Role BK Definition & Navigation Isolation (`src/types/`, `src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`)**:
     - Role Type: Add `'bk' | 'guru_bk'` to `UserRole` (`src/types/user.ts`) and `RoleUser` (`src/types/database.ts`). Canonical DB role is `'bk'`.
     - Normalization: `normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling'`.
     - Menu Isolation (Miller's Law 5 items):
       1. `view-home` (Dashboard)
       2. `view-guru-presensi` (Presensi BK)
       3. `view-jurnal-bk` (Jurnal BK)
       4. `view-informasi` (Informasi Sekolah)
       5. `view-pengaturan-akun` (Pengaturan Akun)
     - Default landing view: `'view-home'`.
     - AST Invariant: Verbatim preservation of `{/* AST preservation: data-tour={item.id} */}` in `AppScreen.tsx` and `ClaySidebar.tsx`.
  2. **Access Control & RBAC Protection (`src/lib/navigation.ts`, `src/components/AppScreen.tsx`)**:
     - `evaluateTabRBAC()`: strictly limits `view-jurnal-bk` to role `bk`, `admin`, and `kepala_sekolah`.
     - Strictly blocks regular teachers (`guru`), wali kelas, piket, tata usaha, siswa, and dinas from accessing BK journals.
     - Dual-layer defense: navigation handler SweetAlert2 warning + JSX view renderer "Akses Terblokir" screen if URL is tampered.
     - Restricts role BK from accessing classroom KBM journals (`view-guru-jurnal`), master data, and backups.
  3. **Fitur Jurnal Khusus BK (`src/components/BkJurnalView.tsx`, `supabase/migrations/`)**:
     - Complete decoupling from `jadwal_pelajaran`, `data_mapel`, and regular class timetables.
     - Universal student selector: Counselor can select ANY student across all classes via live search (Name/NISN) and class filter.
     - Data Model (`public.jurnal_bk`): `id`, `sekolah_id`, `guru_id`/`user_id`, `nama_guru`, `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `waktu`, `bidang_bimbingan` (Pribadi, Sosial, Belajar, Karir), `jenis_layanan` (Konseling Individual, Konseling Kelompok, Mediasi, dll.), `tempat_layanan`, `catatan`, `tindak_lanjut`, `status` (Dalam Penanganan, Selesai, Alih Tangan Kasus), `created_at`, `updated_at`.
     - Full CRUD: Create, Read with search & filters (by date range/single date, student name/NISN, status, bidang), Update, Delete with SweetAlert2 confirmation.
     - Client Resilience: In-memory & `localStorage` caching (`isSchemaCacheOrMissingTableError` handling) and form draft auto-save.
     - Multi-Role Support:
       - Role BK: Full CRUD on counseling entries.
       - Admin: Supervision and management across all counselors.
       - Kepala Sekolah: Read-only monitoring with standard notice banner (`data-testid="readonly-notice"`).
     - Official printable layout with `PrintHeader` and `triggerPrintWithGps`.
  4. **Admin BK Account Management (`src/components/AdminPenggunaView.tsx`, `src/lib/teacherUserSync.ts`)**:
     - Mechanism 1: Admin appoints existing teacher as BK via "Tunjuk BK" / "Ke Guru" toggle in `AdminPenggunaView.tsx` (`users.role = 'bk'`, `data_guru.mata_pelajaran = 'Bimbingan Konseling (BK)'`).
     - Mechanism 2: Admin creates new BK account via "+ Akun BK" modal requiring 4 mandatory fields: NIP, Nama Lengkap, Nomor HP, Email Aktif (default password `${nip}27`).
     - Auto-sync resilience: `teacherUserSync.ts` includes `'bk'`, `'guru_bk'`, `'Guru BK'` in query filter and preserves assigned role.
  5. **Verification & Automated Testing (`tests/`)**:
     - Automated test suite in `tests/bk_role_and_jurnal_rbac_verification.test.ts` verifying all requirements and zero regression.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Role BK Type & Session Normalization | Dukungan role `bk` pada `UserRole`, `RoleUser`, normalisasi role string (`bk`, `gurubk`, `bimbingankonseling`), dan identifikasi sesi login | M1 | R1 | PLANNED |
| 2 | F2: Navigasi Menu Role BK (Miller's Law 5 Menu) | Menu navigasi khusus BK: Dashboard, Presensi BK, Jurnal BK, Informasi Sekolah, Pengaturan Akun, dengan default landing view `view-home` | M1 | R1 | PLANNED |
| 3 | F3: Preservasi Invarian AST Data-Tour | Memastikan komentar `{/* AST preservation: data-tour={item.id} */}` tetap utuh di `AppScreen.tsx` dan `ClaySidebar.tsx` | M1 | R1, R3 | PLANNED |
| 4 | F4: Kontrol Akses & Proteksi RBAC Jurnal BK | `evaluateTabRBAC` & proteksi JSX membatasi akses Jurnal BK HANYA untuk role BK, Admin, dan Kepala Sekolah; menolak guru reguler, wali kelas, piket, TU, siswa, dinas | M1 | R1 | PLANNED |
| 5 | F5: Isolasi Navigasi Role BK dari Menu Terlarang | Role BK ditolak dari mengakses jurnal KBM kelas (`view-guru-jurnal`), master data admin, pusat verifikasi, dan backup | M1 | R1 | PLANNED |
| 6 | F6: Skema Database & Penyimpanan Jurnal BK | Tabel `public.jurnal_bk` (atau client-resilient storage) dengan field standar bimbingan konseling dan RLS terproteksi | M1 | R2 | PLANNED |
| 7 | F7: Independensi Jurnal BK (Tidak Terikat Jadwal/Kelas) | Jurnal BK beroperasi mandiri tanpa dependensi pada `jadwal_pelajaran`, jam mengajar, atau rombel kelas tertentu | M1 | R2 | PLANNED |
| 8 | F8: Universal Student Selector Bebas Rombel | Guru BK dapat memilih siswa manapun dari seluruh kelas melalui pencarian nama/NISN dan filter kelas | M1 | R2 | PLANNED |
| 9 | F9: Fungsionalitas CRUD Jurnal BK & Auto-Save Draft | Implementasi Create, Read, Update, Delete (SweetAlert2) dan penyimpanan draft otomatis di `BkJurnalView.tsx` | M1 | R2 | PLANNED |
| 10 | F10: Pencarian & Filter Jurnal BK | Tampilan riwayat jurnal BK dapat difilter berdasarkan tanggal/rentang tanggal, nama siswa, status kasus, dan bidang bimbingan | M1 | R2 | PLANNED |
| 11 | F11: Cetak Dokumen Resmi Jurnal BK | Format cetak resmi jurnal konseling dengan kop sekolah (`PrintHeader`) dan tanda tangan Guru BK & Kepala Sekolah | M1 | R2 | PLANNED |
| 12 | F12: Akses Supervisi Admin & Read-Only Kepala Sekolah | Admin dapat memantau/mengelola seluruh jurnal BK; Kepala Sekolah memiliki akses monitoring mode read-only dengan banner `data-testid="readonly-notice"` | M1 | R1 | PLANNED |
| 13 | F13: Mekanisme 1: Tunjuk BK dari Data Guru | Admin dapat menunjuk Guru BK dari data guru yang ada via tombol aksi & konfirmasi di `AdminPenggunaView.tsx` | M1 | R1 | PLANNED |
| 14 | F14: Mekanisme 2: Form Akun Baru BK (4 Field Wajib) | Admin dapat membuat akun baru BK dengan modal wajib 4 field: NIP, Nama Lengkap, Nomor HP, Email Aktif | M1 | R1 | PLANNED |
| 15 | F15: Sinkronisasi Akun Guru/BK Resilien | `teacherUserSync.ts` memperhitungkan role `bk` agar penugasan role BK tidak ter-reset | M1 | R1 | PLANNED |
| 16 | F16: Preservasi Fitur Eksisting & Zero Regression | Jurnal KBM guru mapel, jadwal pelajaran, presensi/piket, checkout gate, dan alur role lain tetap 100% normal tanpa regresi | M1 | R3 | PLANNED |
| 17 | F17: Automated Verification Test Suite | Test suite komprehensif di `tests/bk_role_and_jurnal_rbac_verification.test.ts` memverifikasi seluruh acceptance criteria | M1 | R1, R2, R3 | PLANNED |
| 18 | F18: Mandatory Git Delivery ke `main` | Eksekusi `git status`, `git add .`, `git commit -m "..."`, dan `git push origin main` sesuai `GEMINI.md` | M1 | GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Implementasi Role BK, Fitur Jurnal Khusus BK (Tidak Terikat Kelas), Pengelolaan Akun BK oleh Admin, & Verifikasi Otomatis (/ponytail) | `src/types/user.ts`, `src/types/database.ts`, `src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/components/BkJurnalView.tsx`, `src/components/AdminPenggunaView.tsx`, `src/lib/teacherUserSync.ts`, `supabase/migrations/`, `tests/` | none | IN_PROGRESS |

## Interface Contracts

### 1. Role BK Navigation & RBAC Contract (`src/lib/navigation.ts`)
- Menu items for `bk`:
  ```typescript
  if (normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling') {
    return [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard', dataTour: 'view-home' },
      { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi BK', dataTour: 'view-guru-presensi' },
      { id: 'view-jurnal-bk', icon: 'fa-heart-pulse', label: 'Jurnal BK', dataTour: 'view-jurnal-bk' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' },
      { id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }
    ];
  }
  ```
- Route aliases:
  - `'view-jurnal-bk'`: `{ view: 'view-jurnal-bk' }`
  - `'view-bk-jurnal'`: `{ view: 'view-jurnal-bk' }`
- `evaluateTabRBAC(viewId, tabId, user)`:
  - Allowed for `view-jurnal-bk`: role `bk`, `admin`, `kepala_sekolah`.
  - Disallowed for `view-jurnal-bk`: role `guru`, `wali_kelas`, `piket`, `tata_usaha`, `siswa`, `dinas_pendidikan`.
  - Disallowed for role `bk`: `view-guru-jurnal`, `view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-admin-verif`, `view-superadmin-*`, `view-dinas-*`.

### 2. Jurnal BK Data & Component Contract (`src/components/BkJurnalView.tsx`)
- Props:
  ```typescript
  interface BkJurnalViewProps {
    user: any;
    isReadOnly?: boolean;
    initialTab?: string;
  }
  ```
- Required Fields:
  - `id`: string (UUID)
  - `sekolah_id`: string (UUID)
  - `guru_id`: string (UUID)
  - `nama_guru`: string
  - `siswa_id`: string (UUID)
  - `nisn`: string
  - `nama_siswa`: string
  - `kelas`: string
  - `tanggal`: string (YYYY-MM-DD)
  - `waktu`: string (HH:MM or range)
  - `bidang_bimbingan`: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir'
  - `jenis_layanan`: string (Konseling Individual, Konseling Kelompok, Mediasi, dll.)
  - `tempat_layanan`: string (e.g. 'Ruang BK', 'Kelas', 'Lainnya')
  - `catatan`: string (uraian permasalahan/kasus)
  - `tindak_lanjut`: string (rencana tindak lanjut)
  - `status`: 'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus'

### 3. Admin BK Account Management Contract (`src/components/AdminPenggunaView.tsx`)
- Quick toggle: "Tunjuk BK" updates `users.role = 'bk'` and `data_guru.mata_pelajaran = 'Bimbingan Konseling (BK)'`. Reciprocal "Ke Guru" reverts to `'Guru'` and `'-'`.
- Modal "+ Akun BK": 4 mandatory fields (NIP, Nama Lengkap, Nomor HP, Email Aktif). Form validation ensures all 4 are non-empty and email regex passes. Default password: `${nip}27`.
- `teacherUserSync.ts`: query filter includes `'bk'`, `'guru_bk'`, `'Guru BK'`, `'tata_usaha'`, `'Tata Usaha'`, `'Guru'`.

## Code Layout
- `src/types/user.ts`: Update `UserRole` union with `'bk' | 'guru_bk'`.
- `src/types/database.ts`: Update `RoleUser` union with `'bk' | 'guru_bk'`.
- `src/lib/navigation.ts`: Menu generator, route aliases, and RBAC evaluations for BK.
- `src/components/AppScreen.tsx`: App shell, default landing view, navigation routing gates, and `BkJurnalView` dynamic import.
- `src/components/ClaySidebar.tsx`: Sidebar menu and badge rendering, preserving AST comment invariant.
- `src/components/BkJurnalView.tsx`: Classless counseling journal component with CRUD, student selector, filters, print preview, and read-only mode.
- `src/components/AdminPenggunaView.tsx`: Admin account management (Tunjuk BK & create BK with 4 mandatory fields).
- `src/lib/teacherUserSync.ts`: Auto-sync resilience for appointed BK accounts.
- `supabase/migrations/20261109_create_jurnal_bk.sql`: SQL migration for `public.jurnal_bk` with RLS.
- `tests/bk_role_and_jurnal_rbac_verification.test.ts`: Dedicated automated test suite.

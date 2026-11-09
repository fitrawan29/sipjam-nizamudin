## 2026-11-09T05:22:19Z
You are worker_bk, an implementation worker agent.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_bk
You MUST read the original user request before starting work:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Also read the following architecture and survey files:
- Project Plan & Interface Contracts: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- Survey 1 (Role BK & RBAC): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_bk_1\handoff.md
- Survey 2 (Jurnal BK Architecture & CRUD): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_bk_2\handoff.md
- Survey 3 (Admin/Kepsek & Non-Regression): c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_bk_3\handoff.md

Your Mission:
Implement Milestone 1: Role BK (Bimbingan Konseling) and independent classless counseling journal (`jurnal_bk`) into SIPJAM for production needs, with strict access control and zero regression.
Follow the `/ponytail` design philosophy (solusi paling ringkas, tepat guna tanpa over-engineering, 0 dependensi baru, memanfaatkan komponen eksisting).

### MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Exclusive File Write Ownership:
You own and may edit the following files:
- `src/types/user.ts`: add `'bk' | 'guru_bk'` to `UserRole` union.
- `src/types/database.ts`: add `'bk' | 'guru_bk'` to `RoleUser` union.
- `src/lib/navigation.ts`:
  - BK consolidated menu items (strictly 5 items): `view-home` (Dashboard), `view-guru-presensi` (Presensi BK), `view-jurnal-bk` (Jurnal BK), `view-informasi` (Informasi Sekolah), `view-pengaturan-akun` (Pengaturan Akun).
  - Aliases for `view-jurnal-bk` and `view-bk-jurnal`.
  - `evaluateTabRBAC`: allow `view-jurnal-bk` ONLY for role `bk`, `admin`, and `kepala_sekolah`. Strictly deny regular `guru`, `wali_kelas`, `piket`, `tata_usaha`, `siswa`, `dinas_pendidikan`.
  - Deny role `bk` from accessing `view-guru-jurnal`, `view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-admin-verif`, `view-superadmin-*`, `view-dinas-*`.
- `src/components/AppScreen.tsx`:
  - Dynamic import `BkJurnalView`.
  - Wire `view-jurnal-bk` route.
  - Set default landing view for BK to `'view-home'`.
  - RBAC view protection gate for `view-jurnal-bk`.
  - CRITICAL INVARIANT: You MUST preserve `{/* AST preservation: data-tour={item.id} */}` verbatim! Do NOT remove or modify this comment.
- `src/components/ClaySidebar.tsx`:
  - Ensure BK role renders its consolidated menu items properly.
  - CRITICAL INVARIANT: You MUST preserve `{/* AST preservation: data-tour={item.id} */}` verbatim!
- `src/components/BkJurnalView.tsx` (create new component):
  - Independent classless counseling journal.
  - Universal student selector from `data_siswa`: filter by class or live search by Name/NISN, no schedule restrictions.
  - Form fields: `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal` (defaults to today), `waktu` (defaults to current time), `bidang_bimbingan` ('Pribadi' | 'Sosial' | 'Belajar' | 'Karir'), `jenis_layanan` ('Konseling Individual', 'Konseling Kelompok', 'Bimbingan Kelompok', 'Konsultasi', 'Mediasi', 'Konferensi Kasus', 'Kunjungan Rumah (Home Visit)', 'Alih Tangan Kasus (Referral)', 'Lainnya'), `tempat_layanan`, `catatan`, `tindak_lanjut`, `status` ('Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus').
  - Full CRUD: Create, Read (filter by date range/date, student name/NISN, status, bidang), Update, Delete with SweetAlert2 confirmation.
  - Client resilience: handle `isSchemaCacheOrMissingTableError` with localStorage/in-memory cache (`sipjam_jurnal_bk_cache_${sekolahId}`), auto-save form draft (`sipjam_jurnal_bk_draft_${userId}`).
  - Multi-role support:
    - Role BK: full CRUD on counseling entries.
    - Admin: can view and manage all counselor entries.
    - Kepala Sekolah: read-only monitoring mode (`isReadOnly={true}`) with standard notice banner `data-testid="readonly-notice"`.
  - Printable layout with `PrintHeader` and `triggerPrintWithGps`.
- `src/components/AdminPenggunaView.tsx`:
  - Action button "Tunjuk BK" / "Ke Guru" on table rows (toggle `users.role` between `'bk'` and `'Guru'`, `data_guru.mata_pelajaran` between `'Bimbingan Konseling (BK)'` and `'-'`).
  - Banner button `+ Akun BK` opening modal with 4 required fields: NIP, Nama Lengkap, Nomor HP, Email Aktif (default password `${nip}27`).
- `src/lib/teacherUserSync.ts`:
  - Include `'bk'`, `'guru_bk'`, `'Guru BK'` in user query filter and preserve assigned role.
- `supabase/migrations/20261109_create_jurnal_bk.sql`:
  - Create table `public.jurnal_bk` with indexes and RLS policies.
- `tests/bk_role_and_jurnal_rbac_verification.test.ts`:
  - Comprehensive automated tests running via `npx tsx` verifying all acceptance criteria:
    1. Role normalization and types.
    2. Menu isolation (strictly 5 items for BK).
    3. RBAC isolation: `view-jurnal-bk` accessible by BK, Admin, Kepsek; strictly denied for Guru, Wali Kelas, Piket, TU, Siswa, Dinas.
    4. RBAC denial for BK trying to access classroom KBM journals (`view-guru-jurnal`) or master data.
    5. Jurnal BK independent classless CRUD logic, student selection, filtering, and schema resilience.
    6. Admin & Kepala Sekolah supervision & read-only access.
    7. Admin BK account toggle and creation validation.
    8. AST preservation comment invariants.
    9. Zero regression on existing roles.

### Strict Non-Regression Rules:
- DO NOT touch or alter `src/components/GuruJurnal.tsx`.
- DO NOT touch or alter `src/lib/workflow.ts`.
- DO NOT alter classroom teaching journals, schedules, attendance, or piket.

### Verification Steps:
1. Run test suite: `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`
2. Run existing regression tests:
   `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`
   `npx tsx tests/adversarial_tu_nav_m2_challenger.test.ts`
   `npx tsx tests/adversarial_m3_coldstart_rbac_popstate_challenger.test.ts`
3. Run TypeScript check: `npx tsc --noEmit`
4. Run Next.js build: `npm run build`

### Git Delivery:
In accordance with `GEMINI.md`:
1. `git status`
2. `git add .`
3. `git commit -m "feat(bk): implement role BK and independent classless counseling journal"`
4. `git push origin main`

Write your comprehensive completion report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_bk\handoff.md` and send a message when done.

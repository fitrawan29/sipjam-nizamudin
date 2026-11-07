# Handoff Report: Survey & Architecture for R3 (Pemisahan Rekap Presensi Guru dan TU) & R4 (Pengelolaan Akun TU oleh Admin)

**Agent**: `explorer_tu_nav_3`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_tu_nav_3\`  
**Target Milestone**: Survey & Technical Specification for R3 and R4  
**Date**: 2026-11-07  

---

## 1. Observation

### 1.1 Architecture of Admin Presensi Recap & Export (`AdminRekapView.tsx`)
- **File location**: `src/components/AdminRekapView.tsx` (Lines 1–1006)
- **Data Seeding & Fetching**:
  - `AdminRekapView.tsx` (Lines 168–179):
    ```typescript
    let guruQuery = supabase
      .from('data_guru')
      .select('nama_guru')
      .not('nama_guru', 'ilike', '%test guru%')
      .not('nama_guru', 'ilike', '%guru test%')
      .order('nama_guru', { ascending: true });
    if (user?.sekolah_id) {
      guruQuery = guruQuery.eq('sekolah_id', user.sekolah_id);
    }
    const { data: guruList } = await guruQuery;
    ```
  - Presensi records are fetched from `presensi_guru` (Lines 181–216) and aggregated in `pMap` (Lines 305–448).
  - Jurnal records are fetched from `jurnal_pembelajaran` (Lines 219–233).
  - Piket records are fetched from `laporan_piket` (Lines 235–247).
  - Currently, all personnel records are bundled into a single array:
    `rekapData.presensi` (Line 498) and rendered as a single unified table (Lines 907–970).
- **Print View & Export**:
  - `AdminRekapView.tsx` (Lines 629–640) displays `<PrintHeader user={user} sekolahId={user?.sekolah_id} />` with `className="hidden print:block"`.
  - Lines 972–985 render `<PrintSignature ... />` under the table with `className="hidden print:block mt-8"`.
  - Line 991: Button "Cetak Halaman" invokes `triggerPrintWithGps()`, which calls standard browser `window.print()`.
  - Line 988: Button "Excel" invokes `handleExportCsv()`, which generates a CSV file `Rekap_Guru_${bulan || 'custom'}.csv`.
  - Currently, there is no separation between Guru and TU, and no CSS print page break separating them.

### 1.2 User and Personnel Data Schemas (`users` vs `data_guru`)
- **`public.users` table schema** (verified via `src/types/database.ts` lines 2050–2110 & `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` lines 42–53):
  - Columns: `id` (UUID), `username` (TEXT), `password` (TEXT), `nama` (TEXT), `role` (TEXT), `sekolah_id` (UUID), `session_token` (UUID), `avatar` (TEXT), `kota_kabupaten` (TEXT).
  - Roles currently supported in types: `'Superadmin'`, `'Admin'`, `'Guru'`, `'dinas_pendidikan'`, `'siswa'`, `'tata_usaha'`.
- **`public.data_guru` table schema** (verified via `src/types/database.ts` lines 235–280 & `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` lines 56–66):
  - Columns: `id` (UUID), `sekolah_id` (UUID), `user_id` (UUID references `users.id`), `nip` (TEXT), `nama_guru` (TEXT), `mata_pelajaran` (TEXT), `no_hp` (TEXT), `status` (TEXT), `email` (TEXT), `wajib_hadir_hanya_mengajar` (BOOLEAN).
  - Notice that `no_hp` and `email` are native columns in `data_guru`, while `users` holds authentication credentials (`id`, `username`, `password`, `role`, `sekolah_id`).
- **`public.presensi_guru` table schema** (`SETUP_NEW_SCHOOL_TEMPLATE.sql` lines 194–218):
  - Columns: `id`, `sekolah_id`, `user_id`, `timestamp`, `nama_guru`, `tipe_absen`, `jenis_presensi`, `detail_izin`, `lokasi`, `jarak`, `link_bukti`, `status_verifikasi`, `keterlambatan_detik`, etc.
  - Both teachers and TU staff record attendance in `presensi_guru` via `GuruPresensi.tsx` (where `user.role` determines the navigation title: "Presensi Guru" for teachers, "Presensi TU" for TU).

### 1.3 Admin User Management (`AdminPenggunaView.tsx` & `teacherUserSync.ts`)
- **File location**: `src/components/AdminPenggunaView.tsx` (Lines 1–785)
- **Automatic Sync**:
  - `AdminPenggunaView.tsx` calls `syncTeacherAccounts(supabase, sekolahId)` from `src/lib/teacherUserSync.ts`.
  - In `src/lib/teacherUserSync.ts`:
    - Line 66: Currently selects `users` with `eq('role', 'Guru')`.
    - Line 163: Accounts are built with hardcoded `role: 'Guru'`.
  - In `AdminPenggunaView.tsx` (Lines 50–72):
    - Extra query selects `users` with `role = 'tata_usaha'` (or normalized `'tatausaha'`) and appends them as `tuAccounts`.
- **Existing TU Account Creation**:
  - `AdminPenggunaView.tsx` lines 159–215 contains an initial `handleCreateTuUser` modal.
  - However, the current modal only prompts for 3 fields: `nama`, `username`, and `password`.
  - Requirement R4 explicitly mandates:
    `"Untuk pembuatan akun baru TU, formulir pendaftaran wajib mengisi data: NIP, nama lengkap, nomor HP, dan email aktif. Form validation memastikan keempat field wajib terisi sebelum data tersimpan."`
- **Existing Teacher Actions**:
  - `AdminPenggunaView.tsx` lines 712–743 render action buttons:
    - `Atur` (modifies username and password)
    - `NIP27` (quick resets teacher password to NIP27 format)
    - `Hapus` (only shown if `item.role === 'tata_usaha'`)
  - There is currently no direct button or mechanism for Admin to designate an existing teacher as TU ("Menunjuk akun TU dari data guru yang sudah ada" - R4 Mekanisme 1).

### 1.4 Test Framework and Suite
- Running tests uses `tsx` directly as defined in `package.json` line 10:
  `"test": "tsx tests/r1_r10_ponytail_verification.test.ts && ..."`
- `tests/tata_usaha_role_rbac_and_isolation.test.ts` (Lines 1–453):
  Contains 81 empirical unit/integration assertions on RBAC, `isAdminRole`, `checkMasterDataMutationGuard`, `getConsolidatedMenuItems`, and `evaluateTabRBAC`.
  Command executed: `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts` exited with code 0 (81 passed, 0 failed).
- `tests/admin_submenu_pengguna_kredensial_guru.test.ts`:
  Verifies `AdminPenggunaView` route resolution and credential generation.

---

## 2. Logic Chain

### 2.1 Logic Chain for R3 (Pemisahan Halaman Rekap Presensi Guru dan TU)

1. **Premise 1 (Data Segregation)**:
   - When Admin pulls attendance recap, both Guru and TU records exist in `presensi_guru`.
   - In `data_guru`, teachers have instructional mapel (e.g. `Matematika`, `Bahasa Indonesia`), while TU staff have `mata_pelajaran: 'Tata Usaha (Administrasi)'` or are linked to a user in `users` with `role: 'tata_usaha'`.
   - In `users`, teachers have `role = 'Guru'` and TU staff have `role = 'tata_usaha'`.
   - Therefore, by querying `users` (`role`) and `data_guru` during `tarikDataRekap`, every person in `pArr` can be categorized into `guruPresensiList` or `tuPresensiList`:
     ```typescript
     const isTU = (nama: string) => tuNamesSet.has(nama) || tuUserIdsSet.has(person.userId);
     const guruRekap = pArr.filter(p => !isTU(p.nama));
     const tuRekap = pArr.filter(p => isTU(p.nama));
     ```

2. **Premise 2 (UI Presentation - R3.1)**:
   - In `AdminRekapView.tsx` under the `tabel` subtab, rendering two separate tables:
     - **Tabel 1: Rekapitulasi Presensi Dewan Guru** (shows `filteredPresensiGuru`, including columns for Piket and Jurnal KBM).
     - **Tabel 2: Rekapitulasi Presensi Tenaga Tata Usaha (TU)** (shows `filteredPresensiTU`, with non-instructional presentation where Jurnal KBM displays `-` or is tailored to administrative duties).
   - Each table has its own summary badge count (e.g., "Total Guru: X", "Total Staf TU: Y").
   - This directly satisfies R3.1: "Daftar presensi antara Guru dan TU disajikan terpisah pada tampilan tabel antarmuka."

3. **Premise 3 (CSS Print Page-Break Separation - R3.2)**:
   - Modern browser printing honors CSS `break-before: page;` and `page-break-before: always;`.
   - Between the Guru section and the TU section in `AdminRekapView.tsx`, inserting:
     ```tsx
     <div className="hidden print:block" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
       <PrintHeader user={user} sekolahId={user?.sekolah_id} />
       <div className="text-center my-3 print:my-2">
         <h3 className="text-sm font-bold uppercase tracking-wider">
           Rekapitulasi Presensi Tenaga Kependidikan / Tata Usaha (TU)
         </h3>
         ...
       </div>
       {/* Tabel TU */}
       {/* PrintSignature TU */}
     </div>
     ```
   - When the user clicks "Cetak Halaman" or presses `Ctrl+P`, the browser strictly prints the Guru recap and its signature on the first page(s), and forces a clean page break so that the TU recap starts on its own separate page with its own official Kop Sekolah (`PrintHeader`) and signature footer (`PrintSignature`).
   - This directly satisfies R3.2.

4. **Premise 4 (CSV Export)**:
   - In `handleExportCsv`, the generated CSV should include separate sections with explicit section headers (`=== REKAPITULASI PRESENSI DEWAN GURU ===` and `=== REKAPITULASI PRESENSI TATA USAHA (TU) ===`), ensuring complete clarity on exported spreadsheets.

---

### 2.2 Logic Chain for R4 (Pengelolaan dan Penugasan Akun TU oleh Admin)

1. **Premise 1 (Mekanisme 1: Menunjuk Akun TU dari Data Guru yang Ada)**:
   - In `AdminPenggunaView.tsx`, each row represents an account from `accounts`.
   - For an existing teacher (`item.role !== 'tata_usaha'`), Admin needs a mechanism to appoint them as TU.
   - Minimal `/ponytail` design:
     - Add a dedicated action button in the table row:
       `<button onClick={() => handleAssignTuRole(item, 'tata_usaha')}>Tunjuk TU</button>`.
     - When clicked, a SweetAlert2 confirmation dialog appears:
       *"Tunjuk [Nama Guru] sebagai Staf Tata Usaha (TU)? Pengguna akan dialihkan ke hak akses Tata Usaha."*
     - Upon confirmation:
       - Update `users` table: `await supabase.from('users').update({ role: 'tata_usaha' }).eq('id', item.userId)`.
       - If the teacher did not yet have an account in `users`, create the account with `role: 'tata_usaha'`.
       - Update `data_guru` if desired (linking `user_id` and setting `mata_pelajaran: 'Tata Usaha (Administrasi)'`).
       - If the user is already TU, offer a reciprocal button: `"Kembalikan ke Guru"` (`handleAssignTuRole(item, 'Guru')`).
     - This requires zero complex forms or backend changes and takes effect immediately.

2. **Premise 2 (Mekanisme 2: Membuat Akun Baru Khusus Role TU dengan 4 Field Wajib)**:
   - In `AdminPenggunaView.tsx`, the existing `+ Akun TU` button invokes `handleCreateTuUser`.
   - Update `handleCreateTuUser` to present a 4-field SweetAlert2 form:
     1. **NIP** (`<input id="swal-tu-nip" placeholder="NIP staf TU...">`)
     2. **Nama Lengkap** (`<input id="swal-tu-nama" placeholder="Nama lengkap...">`)
     3. **Nomor HP** (`<input id="swal-tu-hp" placeholder="Contoh: 081234567890...">`)
     4. **Email Aktif** (`<input id="swal-tu-email" type="email" placeholder="email@sekolah.sch.id...">`)
   - **Form Validation (`preConfirm`)**:
     ```typescript
     preConfirm: () => {
       const nip = (document.getElementById('swal-tu-nip') as HTMLInputElement)?.value?.trim();
       const nama = (document.getElementById('swal-tu-nama') as HTMLInputElement)?.value?.trim();
       const no_hp = (document.getElementById('swal-tu-hp') as HTMLInputElement)?.value?.trim();
       const email = (document.getElementById('swal-tu-email') as HTMLInputElement)?.value?.trim();

       if (!nip || !nama || !no_hp || !email) {
         Swal.showValidationMessage('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!');
         return null;
       }
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
         Swal.showValidationMessage('Format email aktif tidak valid (contoh: user@sekolah.sch.id)!');
         return null;
       }
       return { nip, nama, no_hp, email };
     }
     ```
   - **Persistence Strategy**:
     - `userId = crypto.randomUUID()`
     - Default password = `${nip}27` (standard SIPJAM format, consistent with teacher credentials)
     - Username = `nip` (or clean NIP)
     - Insert into `users`:
       `{ id: userId, username: nip, password: defaultPassword, nama, role: 'tata_usaha', sekolah_id: sekolahId }`
     - Insert into `data_guru`:
       `{ id: crypto.randomUUID(), sekolah_id: sekolahId, user_id: userId, nip, nama_guru: nama, mata_pelajaran: 'Tata Usaha (Administrasi)', no_hp, email, status: 'Aktif' }`
     - This stores all 4 fields cleanly in the database: NIP, Nama, and Role in `users`, and NIP, Nama, Nomor HP, and Email in `data_guru`.
     - It avoids any custom schema modifications or table migrations because `data_guru` already natively includes `no_hp` and `email` columns!

3. **Premise 3 (Sync Resilience in `teacherUserSync.ts`)**:
   - In `src/lib/teacherUserSync.ts`:
     - Line 66: Change `eq('role', 'Guru')` to `.in('role', ['Guru', 'tata_usaha', 'Tata Usaha'])`.
     - Line 163: Change `role: 'Guru'` to `role: matchedUser?.role || 'Guru'`.
   - This ensures that when a teacher is assigned as TU, subsequent auto-syncs do not overwrite their `role` back to `'Guru'`.

---

## 3. Caveats

1. **Jurnal & Piket for TU**:
   - In Indonesian secondary schools, Tata Usaha staff typically manage administrative affairs rather than teaching subject lessons (KBM). In `AdminRekapView.tsx`, the TU table should display `-` for Jurnal Pembelajaran, or calculate attendance strictly based on workdays and timestamps.
2. **Double Appointing**:
   - If a teacher is appointed as TU, they retain their `data_guru` record but their login role is `tata_usaha`. If Admin wishes to revert them to regular teacher duties, the "Kembalikan ke Guru" action should restore `users.role = 'Guru'`.
3. **Print Header CSS Compatibility**:
   - Ensure the CSS print style uses both `breakBefore: 'page'` and `pageBreakBefore: 'always'` to support both modern Chromium/WebKit engines and legacy print rendering engines.

---

## 4. Conclusion & Minimal Implementation Plan

### 4.1 Summary of Changes

| Target File | Change Needed | Ponytail Justification |
|-------------|---------------|------------------------|
| `src/components/AdminRekapView.tsx` | Split `rekapData.presensi` into `guruPresensiList` and `tuPresensiList`. Render two distinct tables in UI. Inject CSS page-break (`breakBefore: 'page'`) between Guru and TU print sections with independent `PrintHeader` and `PrintSignature`. Update CSV export. | Purely UI & presentation separation; reuses existing calculation loop and print components without altering database models. |
| `src/components/AdminPenggunaView.tsx` | 1) Add "Tunjuk TU" / "Ke Guru" action button in table rows to assign/revert TU role.<br>2) Update `handleCreateTuUser` modal to require all 4 fields (NIP, Nama Lengkap, Nomor HP, Email) with strict regex validation.<br>3) On submit, insert into `users` (`role: 'tata_usaha'`) and `data_guru` (`mata_pelajaran: 'Tata Usaha (Administrasi)'`). | Leverages native `data_guru` columns (`no_hp`, `email`) and SweetAlert2 already installed. Shortest working diff. |
| `src/lib/teacherUserSync.ts` | Adjust `syncTeacherAccounts` user query to include `tata_usaha` and preserve `matchedUser?.role`. | Prevents auto-sync from resetting appointed TU users back to Guru. |
| `tests/admin_rekap_and_tu_management.test.ts` | Automated unit/integration test verifying R3 (table separation, page break existence, CSV formatting) and R4 (Mekanisme 1 assignment, Mekanisme 2 form validation of 4 fields). | Direct runnable verification via `tsx`. |

---

## 5. Verification Method

To independently verify the implementation once coded:

1. **Automated Verification Command**:
   ```powershell
   npx tsx tests/admin_rekap_and_tu_management.test.ts
   ```
   *Expected result*: All assertions pass 100% with exit code 0.

2. **Non-Regression Existing Tests Command**:
   ```powershell
   npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
   npx tsx tests/admin_submenu_pengguna_kredensial_guru.test.ts
   ```
   *Expected result*: Zero regressions on existing TU RBAC and Admin Pengguna suites.

3. **Static AST & Invariant Checks**:
   - Inspect `AdminRekapView.tsx` to confirm presence of `pageBreakBefore: 'always'` or `breakBefore: 'page'`.
   - Inspect `AdminPenggunaView.tsx` to confirm all 4 fields (`nip`, `nama`, `no_hp`, `email`) are validated before `supabase.from('users').insert` and `supabase.from('data_guru').insert`.

# Scope: Perbaikan Penyimpanan Jurnal KBM Guru & Pemulihan Cetak Jurnal KBM (/ponytail)

## Architecture
- **Framework & Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, `tsx` Node test runner.
- **Design Philosophy**: `/ponytail` (solusi paling ringkas, sederhana, tepat guna tanpa over-engineering, 0 dependensi baru, 100% kompatibel dan preservasi fitur eksisting).
- **Core Entities**:
  - `public.jurnal_pembelajaran`: Satu-satunya tabel kanonikal penyimpan seluruh data Jurnal KBM dan Jurnal Kegiatan guru.
  - `src/components/GuruJurnal.tsx`: Komponen input form, absensi, dan handler penyimpanan Jurnal KBM guru (`handleJurnalSubmit`, `handleSaveAbsensiOnly`).
  - `src/components/RekapJurnalView.tsx`: Komponen tampilan, filter, rekap, dan cetak dokumen resmi Jurnal KBM (`initialMode="pribadi" controlledMode="pribadi"`).
  - `src/lib/workflow.ts`: Helper pencocokan jadwal, verifikasi checkout pulang guru (`hasJournalContent`), dan normalisasi identitas guru.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Safe UUID Generation Fallback | Mengganti pemanggilan langsung `crypto.randomUUID()` di `GuruJurnal.tsx` (baris 1292 & 1549) dengan `generateSafeId()` yang resilien di insecure HTTP / LAN non-SSL | M1 | explorer_kbm_1 | DONE |
| 2 | F2: Resilient Drive Upload (Non-Blocking) | Mengubah penanganan error `uploadToDrive` di `GuruJurnal.tsx` agar kegagalan upload foto tidak menggugurkan penyimpanan teks materi dan absensi KBM ke database | M1 | explorer_kbm_1 | DONE |
| 3 | F3: Robust Database Error Retry & Schema Tolerance | Memperluas penanganan retry skema database di `GuruJurnal.tsx` via `isSchemaColumnError` mencakup error code `42703` (undefined column), `PGRST204`, dan status HTTP 400 | M1 | explorer_kbm_1 | DONE |
| 4 | F4: Dual-Write Kontrak Data & Fallback Tenant `sekolah_id` | Menambahkan `kegiatan_pembelajaran: kegiatan` pada `newJurnal` dan menyediakan fallback tenant `sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001'` | M1 | explorer_kbm_1, explorer_kbm_3 | DONE |
| 5 | F5: Harmonisasi Sub-Mode Absensi & Jurnal KBM | Menjamin data absensi murid di memori (`finalAbsensiJson`) terikat dan dipertahankan saat submit jurnal materi, mencegah hilangnya absensi atau terbelahnya sesi | M1 | explorer_kbm_1 | DONE |
| 6 | F6: Form Lockout Guard Relaxation | Memastikan kondisi `isLocked` tidak mengunci form jika kelas dan mata pelajaran telah dipilih guru | M1 | explorer_kbm_1, explorer_kbm_3 | DONE |
| 7 | F7: Pelonggaran Filter Multi-Tenant `sekolah_id` pada Cetak Jurnal | Mengubah filter rigid `.eq('sekolah_id', user.sekolah_id)` di `RekapJurnalView.tsx` menjadi `.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')` agar data historis tetap termuat | M1 | explorer_kbm_2 | DONE |
| 8 | F8: Isolasi Auto-Select Wali Kelas ke Mode Kelas | Mengubah `fetchMaster` di `RekapJurnalView.tsx` agar auto-select `assignedWalis[0]` HANYA berlaku jika `effectiveMode === 'kelas'`, sehingga mode pribadi menampilkan seluruh kelas yang diajar guru | M1 | explorer_kbm_3 | DONE |
| 9 | F9: In-Memory Matching & Normalisasi Mapel/Kelas | Menghapus SQL exact matching kaku `.eq('mapel')` dan `.eq('kelas')` di `tarikRekap()` `RekapJurnalView.tsx`, memindahkan filtering ke JavaScript in-memory dengan `isJurnalMatchJadwal()` untuk mengakomodasi format kurikulum (misal "XI Merdeka_Matematika") | M1 | explorer_kbm_2 | DONE |
| 10 | F10: Fallback Query Rekonsiliasi Identitas Guru | Menambahkan fallback query berbasis token nama guru di `tarikRekap()` jika query awal menghasilkan 0 baris pada mode pribadi | M1 | explorer_kbm_2 | DONE |
| 11 | F11: Preservasi Format Cetak 12-Kolom & Kop Resmi | Memastikan tabel cetak pribadi `#hasil-rekap-jurnal-guru` merender 12 kolom resmi lengkap dan akurat tanpa tertimpa placeholder sintetik | M1 | explorer_kbm_2, explorer_kbm_3 | DONE |
| 12 | F12: Automated Verification Test Suite & Zero Regression | Menjalankan dan menambah test suite otomatis di `tests/` membuktikan simpan KBM berhasil, cetak KBM tampil utuh, dan 15 modul konsumen hilir bebas regresi | M1 | explorer_kbm_3, R3 | DONE |
| 13 | F13: Mandatory Git Delivery ke `main` | Eksekusi `git status`, `git add .`, `git commit -m "..."`, dan `git push origin main` sesuai aturan `GEMINI.md` (commit `f800a0f`) | M1 | GEMINI.md | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Perbaikan Alur Penyimpanan Jurnal KBM Guru (R1) & Pemulihan Tampilan Data Guru pada Cetak Jurnal KBM (R2) serta Verifikasi Objektif (R3) | `src/components/GuruJurnal.tsx`, `src/components/RekapJurnalView.tsx`, `tests/` | none | DONE |

## Interface Contracts

### 1. GuruJurnal.tsx Storage & Mutation Contract
- Safe UUID generation:
  ```typescript
  const generateSafeId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'jrn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  ```
- Resilient Drive Upload:
  Non-blocking try/catch block with fallback to `photoPreviewUrl || ''` ensuring text content and student attendance persist to Supabase database.
- Database Schema Error Detection:
  ```typescript
  const isSchemaColumnError = (err: any) => Boolean(
    err && (
      err.code === 'PGRST204' ||
      err.code === '42703' ||
      err.status === 400 ||
      err.message?.includes('schema cache') ||
      err.message?.includes('column') ||
      err.message?.includes('Could not find the')
    )
  );
  ```
- Dual-Write Payload:
  ```typescript
  {
    ...
    materi: finalKonten,
    materi_pembelajaran: finalKonten,
    konten: finalKonten,
    kegiatan: kegiatan,
    kegiatan_pembelajaran: kegiatan,
    sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
    ...
  }
  ```

### 2. RekapJurnalView.tsx Query & Filtering Contract
- Tolerant `sekolah_id` query:
  ```typescript
  if (user?.sekolah_id) {
    query = query.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
  }
  ```
- Wali kelas auto-select isolation:
  Only default `setKelas(assignedWalis[0])` if `effectiveMode === 'kelas'`. In `pribadi` mode, default `kelas` remains empty so all classes taught by the teacher are retrieved.
- In-memory matching:
  Instead of rigid SQL `.eq('mapel', mapel)` and `.eq('kelas', activeKelas)`, query broadly for the teacher's date range, then filter in-memory using `isJurnalMatchJadwal()` or normalized substring matching.

## Code Layout
- `src/components/GuruJurnal.tsx`: Form input, sub-mode handling, resilient save mutation, safe UUID, schema retry.
- `src/components/RekapJurnalView.tsx`: Master data fetch, tolerant query, in-memory matching, print table rendering.
- `tests/`: Automated unit & regression test suites verifying save and print.

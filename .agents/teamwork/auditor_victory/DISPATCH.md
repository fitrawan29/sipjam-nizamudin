## 2026-10-16T09:15:01Z
You are teamwork_preview_victory_auditor for swe_29.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_victory
Your parent orchestrator conversation ID is: 6f4c24c7-d929-4b55-9d56-319b3896ebaa

<original_task>
Perbaiki error Supabase PostgREST `Could not find the table 'public.sekolah_registry' in the schema cache` pada portal multi-sekolah SIPJAM agar aplikasi tetap berfungsi secara tangguh baik ketika tabel `sekolah_registry` belum di-migrate maupun ketika sudah ada, serta sediakan script SQL perbaikan schema cache untuk database Supabase.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Graceful Fallback & Schema Resilience in Frontend
Ketika query, insert, update, atau delete ke `sekolah_registry` menghasilkan error missing table / schema cache (`PGRST205` atau pesan mengandung `Could not find the table 'public.sekolah_registry' in the schema cache`), operasi di `SuperadminView.tsx` dan `AppScreen.tsx` harus secara tangguh melakukan fallback langsung ke tabel `public.sekolah` tanpa memblokir operasi CRUD Superadmin dan tanpa menampilkan dialog error fatal ke pengguna.

### R2. Standalone Migration & Schema Cache Reload Script
Sediakan file SQL terisolasi dan instruksi eksekusi instan di Supabase SQL Editor (`CREATE TABLE IF NOT EXISTS public.sekolah_registry` beserta RLS dan `NOTIFY pgrst, 'reload schema';`) untuk menyelesaikan masalah schema cache langsung di sisi server Supabase.

### R3. Zero Regression & Test Preservation
Pertahankan seluruh fungsionalitas multi-tenant switcher dan pastikan seluruh test suite (`tests/portal_induk_jaringan_multi_sekolah.test.ts` dan test e-rapor) tetap 100% PASS (47/47 assertions passed).

## Acceptance Criteria

### Schema Cache Error Handling
- [ ] Operasi baca (read), tambah (add), ubah (edit), dan hapus (delete) sekolah satelit di `SuperadminView` tidak memunculkan dialog error `Could not find the table 'public.sekolah_registry' in the schema cache` ketika tabel belum ada di database.
- [ ] Operasi CRUD otomatis dialihkan (fallback) ke tabel `public.sekolah` jika `sekolah_registry` tidak tersedia di PostgREST schema cache.
- [ ] Jika tabel `sekolah_registry` tersedia, sinkronisasi dua arah antara `sekolah_registry` dan `sekolah` tetap berjalan normal.

### Database Migration & Cache Reload
- [ ] Tersedia file SQL migrasi / reload schema siap pakai yang aman dijalankan ulang (idempotent).

### Verification
- [ ] `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts` lulus 100% tanpa kegagalan.
- [ ] `npm test` lulus tanpa error regresi.

## Mandatory Git Workflow
Setiap kali selesai modifikasi/perbaikan, secara otomatis:
1. `git status`
2. `git add .`
3. `git commit -m "..."`
4. `git push origin main` (atau branch terkait)

When done, write handoff.md in your working directory and notify the sentinel.
</original_task>

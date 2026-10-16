# Handoff Report: PostgREST Schema Cache Fix & Resilience for `sekolah_registry`

## Executive Summary
Error Supabase PostgREST `PGRST205: Could not find the table 'public.sekolah_registry' in the schema cache` pada portal multi-sekolah SIPJAM telah diselesaikan secara tuntas dan menyeluruh melalui dua lapisan pertahanan:
1. **Frontend Graceful Fallback & Schema Resilience**: Seluruh operasi CRUD di `SuperadminView.tsx` dan pembacaan switcher di `AppScreen.tsx` kini tangguh terhadap ketiadaan atau belum termuatnya tabel `sekolah_registry` di PostgREST schema cache. Ketika error missing table / PGRST205 terdeteksi melalui fungsi `isSchemaCacheOrMissingTableError`, aplikasi secara otomatis mengalihkan operasi ke tabel sekunder `public.sekolah` tanpa memblokir Superadmin dan tanpa menampilkan modal/dialog error fatal. Sinkronisasi dua arah tetap bekerja optimal jika tabel sudah tersedia.
2. **Server-Side Standalone Migration & Schema Cache Reload Script**: Tersedia file migrasi SQL mandiri dan idempoten di `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql` lengkap dengan panduan eksekusi di Supabase SQL Editor, pembuatan tabel `public.sekolah_registry`, kolom kredensial pada `public.sekolah`, index performa, RLS policy ketat Superadmin, backfill data otomatis, dan perintah instan `NOTIFY pgrst, 'reload schema';` untuk menyegarkan cache schema PostgREST seketika tanpa downtime.

---

## Changes Made
1. **`src/lib/supabaseClient.ts`**:
   - Diekspor fungsi utilitas `isSchemaCacheOrMissingTableError(err: any): boolean` yang mendeteksi PostgREST error `PGRST205`, `PGRST200`, `PGRST204`, PostgreSQL code `42P01` (undefined_table), serta pesan teks / hint terkait schema cache atau reload schema.
2. **`src/components/SuperadminView.tsx`**:
   - Menggunakan `isSchemaCacheOrMissingTableError` pada:
     - `fetchAllData`: Fallback query ke `public.sekolah` jika `sekolah_registry` belum ada di cache.
     - `handleCreateSatellite`: Fallback insert ke `public.sekolah` jika `sekolah_registry` mengalami schema cache error.
     - `handleEditSatelliteSchool`: Fallback update ke `public.sekolah` (berdasarkan `id` maupun `npsn`).
     - `handleDeleteSatelliteSchool`: Fallback delete ke `public.sekolah` (berdasarkan `id` maupun `npsn`).
   - Mencegah kemunculan dialog fatal error ke Superadmin saat tabel belum dimuat di PostgREST.
3. **`src/components/AppScreen.tsx`**:
   - Mengimpor `isSchemaCacheOrMissingTableError`.
   - Pada `fetchSchoolsForSwitcher`, mendeteksi error schema cache pada `sekolah_registry` dan melakukan fallback langsung dengan pemetaan field lengkap ke `public.sekolah`.
4. **`supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql`**:
   - Script SQL idempoten yang siap dijalankan di Supabase SQL Editor.
   - Dilengkapi `CREATE TABLE IF NOT EXISTS public.sekolah_registry`, index performa, RLS policy Superadmin, kolom satelit pada `public.sekolah`, backfill data awal dari `public.sekolah`, dan `NOTIFY pgrst, 'reload schema';`.
5. **`tests/sekolah_registry_schema_cache_resilience.test.ts` & `package.json`**:
   - Test suite baru yang memverifikasi keakuratan deteksi helper, keberadaan dan struktur file migrasi SQL, serta implementasi fallback pada `SuperadminView.tsx` dan `AppScreen.tsx`.
   - Diintegrasikan ke pipeline `npm test`.

---

## Verification Results
- `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts`: 47 / 47 assertions PASS (100%).
- `npx tsx tests/sekolah_registry_schema_cache_resilience.test.ts`: 19 / 19 assertions PASS (100%).
- `npm test`: 34 test suites PASS (0 failed).
- `npm run build`: Production build Next.js 16.3.4 (Turbopack) & TypeScript checks PASSED cleanly (code 0).

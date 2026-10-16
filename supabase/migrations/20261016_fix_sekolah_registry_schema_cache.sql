-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE SUPABASE POSTGREST
-- File: supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST205: "Could not find the table 'public.sekolah_registry' in the schema cache"
-- Terjadi ketika tabel `sekolah_registry` belum dibuat atau PostgREST belum memuat
-- ulang skema database ke memori cache PostgREST.
--
-- PANDUAN EKSEKUSI DI SUPABASE SQL EDITOR:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard/project/<project-ref>).
-- 2. Pada panel navigasi sebelah kiri, klik menu "SQL Editor".
-- 3. Klik tombol "+ New Query".
-- 4. Salin (copy) seluruh isi file script SQL ini dan tempel (paste) ke editor.
-- 5. Klik tombol "Run" (atau tekan Ctrl + Enter).
-- 6. Pastikan status menunjukkan "Success. No rows returned" atau hasil query selesai.
-- 7. Perintah NOTIFY pgrst, 'reload schema' di baris terakhir akan secara otomatis
--    merefresh PostgREST schema cache tanpa perlu me-restart instance database.
-- ============================================================================

-- 1. Pastikan ekstensi pgcrypto tersedia untuk fungsi gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat tabel public.sekolah_registry jika belum ada (idempotent)
CREATE TABLE IF NOT EXISTS public.sekolah_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    npsn TEXT UNIQUE,
    kota_kabupaten TEXT,
    provinsi TEXT DEFAULT 'Sulawesi Utara',
    vercel_url TEXT,
    supabase_url TEXT,
    supabase_anon_key TEXT,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tambahkan kolom vercel_url, supabase_url, dan supabase_anon_key ke public.sekolah jika ada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS vercel_url TEXT;
        ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS supabase_url TEXT;
        ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;
        ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aktif';
    END IF;
END $$;

-- 4. Buat index performa pencarian (idempotent)
CREATE INDEX IF NOT EXISTS idx_sekolah_registry_npsn ON public.sekolah_registry (npsn);
CREATE INDEX IF NOT EXISTS idx_sekolah_registry_status ON public.sekolah_registry (status);

-- 5. Terapkan Row Level Security (RLS) ketat hanya untuk peran Superadmin
ALTER TABLE public.sekolah_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access to sekolah_registry" ON public.sekolah_registry;
CREATE POLICY "Superadmin full access to sekolah_registry"
ON public.sekolah_registry
FOR ALL
TO authenticated, anon
USING (
  COALESCE(current_setting('request.headers', true)::json->>'x-user-role', '') ILIKE 'Superadmin'
)
WITH CHECK (
  COALESCE(current_setting('request.headers', true)::json->>'x-user-role', '') ILIKE 'Superadmin'
);

-- 6. Sinkronisasi data awal (backfill) dari public.sekolah ke public.sekolah_registry jika tabel sekolah sudah berisi data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sekolah') THEN
        -- 6a. Insert sekolah yang belum ada di sekolah_registry (aman terhadap npsn null, duplicate id, dan duplicate npsn di tabel sumber)
        INSERT INTO public.sekolah_registry (id, nama, npsn, kota_kabupaten, provinsi, vercel_url, supabase_url, supabase_anon_key, status)
        SELECT 
            s.id,
            s.nama,
            s.npsn,
            s.kota_kabupaten,
            COALESCE(s.provinsi, 'Sulawesi Utara'),
            s.vercel_url,
            s.supabase_url,
            s.supabase_anon_key,
            CASE WHEN lower(COALESCE(s.status, 'aktif')) = 'nonaktif' THEN 'nonaktif' ELSE 'aktif' END
        FROM (
            SELECT DISTINCT ON (COALESCE(s_inner.npsn, s_inner.id::text)) s_inner.*
            FROM public.sekolah s_inner
            ORDER BY COALESCE(s_inner.npsn, s_inner.id::text), s_inner.id
        ) s
        WHERE NOT EXISTS (
            SELECT 1 FROM public.sekolah_registry r 
            WHERE r.id = s.id OR (s.npsn IS NOT NULL AND r.npsn = s.npsn)
        );

        -- 6b. Sinkronisasikan kredensial satelit untuk sekolah yang sudah terdaftar
        UPDATE public.sekolah_registry r
        SET 
            vercel_url = COALESCE(r.vercel_url, s.vercel_url),
            supabase_url = COALESCE(r.supabase_url, s.supabase_url),
            supabase_anon_key = COALESCE(r.supabase_anon_key, s.supabase_anon_key),
            status = CASE WHEN lower(COALESCE(s.status, 'aktif')) = 'nonaktif' THEN 'nonaktif' ELSE 'aktif' END,
            updated_at = now()
        FROM (
            SELECT DISTINCT ON (COALESCE(s_inner.npsn, s_inner.id::text)) s_inner.*
            FROM public.sekolah s_inner
            ORDER BY COALESCE(s_inner.npsn, s_inner.id::text), s_inner.id
        ) s
        WHERE r.id = s.id OR (s.npsn IS NOT NULL AND r.npsn = s.npsn);
    END IF;
END $$;

-- 7. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
-- Mengirimkan signal NOTIFY ke listener internal PostgREST Supabase
-- agar schema cache dimuat ulang segera tanpa downtime atau restart instance.
NOTIFY pgrst, 'reload schema';

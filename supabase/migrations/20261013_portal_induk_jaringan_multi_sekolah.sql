-- Migration: 20261013_portal_induk_jaringan_multi_sekolah
-- Description:
-- Portal Induk Jaringan Multi-Sekolah dengan Akses Superadmin Tunggal (Single Sign-On / School Switcher)
-- Central school registry table with strict Superadmin RLS & satellite credentials columns.

-- 1. Create table sekolah_registry for Central Monitoring
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

-- 2. Add satellite columns to public.sekolah to ensure 100% synchronization
ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS vercel_url TEXT;
ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS supabase_url TEXT;
ALTER TABLE public.sekolah ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;

-- 3. Strict Row Level Security (RLS) for sekolah_registry
ALTER TABLE public.sekolah_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access to sekolah_registry" ON public.sekolah_registry;
CREATE POLICY "Superadmin full access to sekolah_registry"
ON public.sekolah_registry
FOR ALL
TO authenticated, anon
USING (
  COALESCE(current_setting('request.headers', true)::json->>'x-user-role', '') = 'Superadmin'
)
WITH CHECK (
  COALESCE(current_setting('request.headers', true)::json->>'x-user-role', '') = 'Superadmin'
);

-- 4. Initial seed for satellite schools (if table empty)
INSERT INTO public.sekolah_registry (nama, npsn, kota_kabupaten, provinsi, vercel_url, supabase_url, supabase_anon_key, status)
SELECT 
  'SMA Negeri 1 Modayag',
  '40102031',
  'Kab. Bolaang Mongondow Timur',
  'Sulawesi Utara',
  'https://sipjam-sman1modayag.vercel.app',
  NULL,
  NULL,
  'aktif'
WHERE NOT EXISTS (SELECT 1 FROM public.sekolah_registry WHERE npsn = '40102031');

INSERT INTO public.sekolah_registry (nama, npsn, kota_kabupaten, provinsi, vercel_url, supabase_url, supabase_anon_key, status)
SELECT 
  'SMA Negeri 2 Kotamobagu',
  '40102032',
  'Kota Kotamobagu',
  'Sulawesi Utara',
  'https://sipjam-sman2kotamobagu.vercel.app',
  NULL,
  NULL,
  'aktif'
WHERE NOT EXISTS (SELECT 1 FROM public.sekolah_registry WHERE npsn = '40102032');

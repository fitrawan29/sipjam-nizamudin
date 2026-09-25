
-- Add user_id foreign keys to tables to replace fuzzy string matching

ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.laporan_piket ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Backfill
UPDATE public.jadwal_pelajaran jp SET user_id = u.id FROM public.users u WHERE jp.nama_guru = u.nama AND jp.sekolah_id = u.sekolah_id;
UPDATE public.jurnal_pembelajaran jp SET user_id = u.id FROM public.users u WHERE jp.nama_guru = u.nama AND jp.sekolah_id = u.sekolah_id;
UPDATE public.presensi_guru jp SET user_id = u.id FROM public.users u WHERE jp.nama_guru = u.nama AND jp.sekolah_id = u.sekolah_id;
UPDATE public.laporan_piket jp SET user_id = u.id FROM public.users u WHERE jp.nama_guru = u.nama AND jp.sekolah_id = u.sekolah_id;
UPDATE public.data_guru dg SET user_id = u.id FROM public.users u WHERE dg.nama_guru = u.nama AND dg.sekolah_id = u.sekolah_id;

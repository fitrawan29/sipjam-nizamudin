-- Add user_id foreign keys to tables to replace fuzzy string matching

ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.laporan_piket ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Backfill
UPDATE public.jadwal_pelajaran jp 
SET user_id = u.id 
FROM public.users u 
WHERE jp.user_id IS NULL
  AND (
    jp.nama_guru = u.nama 
    OR jp.nama_guru = u.username 
    OR (jp.nama_guru = 'Susan' AND u.username = 'Susana')
    OR (jp.nama_guru = 'Ade' AND (u.username = 'Fitrawan' OR u.nama ILIKE 'Ade%'))
  );

UPDATE public.jurnal_pembelajaran jp 
SET user_id = u.id 
FROM public.users u 
WHERE jp.user_id IS NULL
  AND (
    jp.nama_guru = u.nama
    OR jp.nama_guru ILIKE (u.nama || '%')
    OR u.nama ILIKE (split_part(jp.nama_guru, ',', 1) || '%')
  );

UPDATE public.presensi_guru pg 
SET user_id = u.id 
FROM public.users u 
WHERE pg.user_id IS NULL
  AND (
    pg.nama_guru = u.nama
    OR pg.nama_guru ILIKE (u.nama || '%')
    OR u.nama ILIKE (split_part(pg.nama_guru, ',', 1) || '%')
  );

UPDATE public.laporan_piket lp 
SET user_id = u.id 
FROM public.users u 
WHERE lp.user_id IS NULL
  AND (
    lp.guru_pelapor = u.nama
    OR lp.guru_pelapor ILIKE (u.nama || '%')
    OR u.nama ILIKE (split_part(lp.guru_pelapor, ',', 1) || '%')
  );

UPDATE public.data_guru dg 
SET user_id = u.id 
FROM public.users u 
WHERE dg.user_id IS NULL
  AND (
    dg.nip = u.username
    OR dg.nama_guru = u.nama
    OR dg.nama_guru ILIKE (u.nama || '%')
    OR u.nama ILIKE (split_part(dg.nama_guru, ',', 1) || '%')
  );

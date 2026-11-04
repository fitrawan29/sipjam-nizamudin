-- ==============================================================================
-- Migration: 20261104_ensure_guru_credentials.sql
-- Description: Pastikan setiap guru di data_guru memiliki akun di public.users.
--              Username: NIP jika ada, fallback ke nama_guru tanpa spasi (lowercase).
--              Password default: '12345' (bcrypt-hashed).
-- Ponytail: minimal — INSERT ... WHERE NOT EXISTS, satu pass.
-- ==============================================================================

-- Buat akun users untuk setiap guru yang belum punya (user_id IS NULL)
INSERT INTO public.users (id, username, password, nama, role, sekolah_id)
SELECT
    gen_random_uuid(),
    -- Username: NIP jika ada & valid, fallback ke nama lowercase tanpa spasi
    CASE
        WHEN dg.nip IS NOT NULL AND trim(dg.nip) <> '' AND trim(dg.nip) <> '-'
        THEN lower(trim(dg.nip))
        ELSE lower(regexp_replace(trim(dg.nama_guru), '\s+', '.', 'g'))
    END AS username,
    extensions.crypt('12345', extensions.gen_salt('bf')) AS password,
    dg.nama_guru AS nama,
    'Guru' AS role,
    dg.sekolah_id
FROM public.data_guru dg
WHERE dg.user_id IS NULL
  AND dg.status = 'Aktif'
  -- Skip jika username yang akan dibuat sudah dipakai orang lain
  AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE lower(trim(u.username)) = CASE
        WHEN dg.nip IS NOT NULL AND trim(dg.nip) <> '' AND trim(dg.nip) <> '-'
        THEN lower(trim(dg.nip))
        ELSE lower(regexp_replace(trim(dg.nama_guru), '\s+', '.', 'g'))
    END
  )
ON CONFLICT DO NOTHING;

-- Backfill: tautkan data_guru.user_id ke akun yang baru/sudah ada
UPDATE public.data_guru dg
SET user_id = u.id
FROM public.users u
WHERE dg.user_id IS NULL
  AND u.role = 'Guru'
  AND u.sekolah_id = dg.sekolah_id
  AND (
    -- Match by NIP = username
    (dg.nip IS NOT NULL AND trim(dg.nip) <> '' AND trim(dg.nip) <> '-'
     AND lower(trim(dg.nip)) = lower(trim(u.username)))
    OR
    -- Match by nama
    lower(regexp_replace(trim(dg.nama_guru), '\s+', ' ', 'g'))
    = lower(regexp_replace(trim(u.nama), '\s+', ' ', 'g'))
  );

-- Backfill username ke data_guru dari users (untuk konsistensi kolom username di data_guru)
UPDATE public.data_guru dg
SET username = u.username
FROM public.users u
WHERE dg.user_id = u.id
  AND (dg.username IS NULL OR trim(dg.username) = '');

-- Laporan: guru yang masih belum punya akun (duplikat username / edge case)
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.data_guru
    WHERE user_id IS NULL AND status = 'Aktif';

    IF v_count > 0 THEN
        RAISE NOTICE 'PERHATIAN: % guru aktif masih belum memiliki akun (kemungkinan konflik username). Periksa manual.', v_count;
    ELSE
        RAISE NOTICE 'OK: Semua guru aktif sudah memiliki akun login.';
    END IF;
END $$;

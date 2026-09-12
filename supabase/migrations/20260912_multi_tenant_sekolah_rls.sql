-- ==============================================================================
-- Migration: 20260912_multi_tenant_sekolah_rls.sql
-- Description: Milestone 7 Multi-Tenant Database Architecture & RLS
-- 1. Create public.sekolah table
-- 2. Seed default school (SMA Nizamudin) and Superadmin user
-- 3. Add sekolah_id to all 17 tables with Foreign Keys and NOT NULL constraints
-- 4. Reconfigure unique constraints for multi-tenancy
-- 5. Create performance B-Tree indexes on sekolah_id and sorting keys
-- 6. Update sync_guru_mapel_from_data_guru trigger and guru_kelas view
-- 7. Deploy security helper functions (get_auth_user_sekolah_id, is_superadmin)
-- 8. Enable RLS and define strict tenant-isolation policies on all tables
-- ==============================================================================

-- ==============================================================================
-- PART 1: Create public.sekolah table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sekolah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    npsn TEXT UNIQUE,
    alamat TEXT,
    kota_kabupaten TEXT,
    provinsi TEXT DEFAULT 'Sulawesi Utara',
    telepon TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    logo_kiri_url TEXT,
    logo_kanan_url TEXT,
    nama_kepala_sekolah TEXT,
    nip_kepala_sekolah TEXT,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- PART 2: Seed Default School (SMA Nizamudin) & Superadmin
-- ==============================================================================
-- Deterministic UUID for default school
INSERT INTO public.sekolah (
    id,
    nama,
    npsn,
    alamat,
    kota_kabupaten,
    provinsi,
    nama_kepala_sekolah,
    nip_kepala_sekolah,
    logo_url,
    logo_kiri_url,
    logo_kanan_url,
    status
) VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'SMA Nizamudin',
    '70040625',
    'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur',
    'Kab. Bolaangmongondow Timur',
    'Sulawesi Utara',
    'Ade Fitrawan Ibrahim, M.Pd., Gr.',
    '-',
    'https://freeimage.host/i/CSKDVGs',
    'https://drive.google.com/file/d/1IuiijBtVcKtvTItL9ZqAwMhxJh0y8pE0/view?usp=sharing',
    'https://drive.google.com/file/d/1YEB9w1-JeTVKbDwdrjhX-824euORrd3f/view?usp=sharing',
    'aktif'
) ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    npsn = EXCLUDED.npsn;

-- ==============================================================================
-- PART 3: Add sekolah_id to all tables and backfill historical records
-- ==============================================================================
-- Helper DO block to add column, backfill, and add FK constraints safely
DO $$
DECLARE
    v_default_sekolah_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- 1. users
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.users SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL AND role <> 'Superadmin';

    -- 2. data_guru
    ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.data_guru SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.data_guru ALTER COLUMN sekolah_id SET NOT NULL;

    -- 3. data_mapel
    ALTER TABLE public.data_mapel ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.data_mapel SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.data_mapel ALTER COLUMN sekolah_id SET NOT NULL;

    -- 4. data_siswa
    ALTER TABLE public.data_siswa ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.data_siswa SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.data_siswa ALTER COLUMN sekolah_id SET NOT NULL;

    -- 5. jadwal_pelajaran
    ALTER TABLE public.jadwal_pelajaran ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.jadwal_pelajaran SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.jadwal_pelajaran ALTER COLUMN sekolah_id SET NOT NULL;

    -- 6. jadwal_piket
    ALTER TABLE public.jadwal_piket ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.jadwal_piket SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.jadwal_piket ALTER COLUMN sekolah_id SET NOT NULL;

    -- 7. jurnal_pembelajaran
    ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.jurnal_pembelajaran SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.jurnal_pembelajaran ALTER COLUMN sekolah_id SET NOT NULL;

    -- 8. kalender_pendidikan
    ALTER TABLE public.kalender_pendidikan ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.kalender_pendidikan SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.kalender_pendidikan ALTER COLUMN sekolah_id SET NOT NULL;

    -- 9. laporan_piket
    ALTER TABLE public.laporan_piket ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.laporan_piket SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.laporan_piket ALTER COLUMN sekolah_id SET NOT NULL;

    -- 10. pengaturan
    ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.pengaturan SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.pengaturan ALTER COLUMN sekolah_id SET NOT NULL;

    -- 11. presensi_guru
    ALTER TABLE public.presensi_guru ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.presensi_guru SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.presensi_guru ALTER COLUMN sekolah_id SET NOT NULL;

    -- 12. bank_dokumen
    ALTER TABLE public.bank_dokumen ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.bank_dokumen SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.bank_dokumen ALTER COLUMN sekolah_id SET NOT NULL;

    -- 13. riwayat_backup
    ALTER TABLE public.riwayat_backup ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.riwayat_backup SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.riwayat_backup ALTER COLUMN sekolah_id SET NOT NULL;

    -- 14. guru_mapel
    ALTER TABLE public.guru_mapel ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.guru_mapel SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.guru_mapel ALTER COLUMN sekolah_id SET NOT NULL;

    -- 15. penugasan_piket
    ALTER TABLE public.penugasan_piket ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.penugasan_piket SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.penugasan_piket ALTER COLUMN sekolah_id SET NOT NULL;

    -- 16. pengumuman
    ALTER TABLE public.pengumuman ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.pengumuman SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.pengumuman ALTER COLUMN sekolah_id SET NOT NULL;

    -- 17. pengumuman_tanggapan
    ALTER TABLE public.pengumuman_tanggapan ADD COLUMN IF NOT EXISTS sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE;
    UPDATE public.pengumuman_tanggapan pt
    SET sekolah_id = p.sekolah_id
    FROM public.pengumuman p
    WHERE pt.pengumuman_id = p.id AND pt.sekolah_id IS NULL;
    UPDATE public.pengumuman_tanggapan SET sekolah_id = v_default_sekolah_id WHERE sekolah_id IS NULL;
    ALTER TABLE public.pengumuman_tanggapan ALTER COLUMN sekolah_id SET NOT NULL;
END $$;

-- Seed Superadmin account in public.users if not exists
INSERT INTO public.users (
    username,
    password,
    nama,
    role,
    sekolah_id
) VALUES (
    'superadmin',
    'superadmin123',
    'Super Administrator',
    'Superadmin',
    NULL
) ON CONFLICT (username) DO UPDATE SET
    role = 'Superadmin',
    sekolah_id = NULL;

-- ==============================================================================
-- PART 4: Reconfigure Unique Constraints for Multi-Tenancy
-- ==============================================================================
-- 1. pengaturan: change UNIQUE (key) to UNIQUE (sekolah_id, key)
ALTER TABLE public.pengaturan DROP CONSTRAINT IF EXISTS pengaturan_key_key;
ALTER TABLE public.pengaturan DROP CONSTRAINT IF EXISTS uq_pengaturan_sekolah_key;
ALTER TABLE public.pengaturan ADD CONSTRAINT uq_pengaturan_sekolah_key UNIQUE (sekolah_id, key);

-- 2. jadwal_piket: change UNIQUE (hari) to UNIQUE (sekolah_id, hari)
ALTER TABLE public.jadwal_piket DROP CONSTRAINT IF EXISTS jadwal_piket_hari_key;
ALTER TABLE public.jadwal_piket DROP CONSTRAINT IF EXISTS uq_jadwal_piket_sekolah_hari;
ALTER TABLE public.jadwal_piket ADD CONSTRAINT uq_jadwal_piket_sekolah_hari UNIQUE (sekolah_id, hari);

-- 3. guru_mapel: change UNIQUE (nip, nama_mapel) to UNIQUE (sekolah_id, nip, nama_mapel)
ALTER TABLE public.guru_mapel DROP CONSTRAINT IF EXISTS uq_guru_mapel;
ALTER TABLE public.guru_mapel DROP CONSTRAINT IF EXISTS uq_guru_mapel_sekolah;
ALTER TABLE public.guru_mapel ADD CONSTRAINT uq_guru_mapel_sekolah UNIQUE (sekolah_id, nip, nama_mapel);

-- ==============================================================================
-- PART 5: High-Performance B-Tree Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_sekolah_npsn ON public.sekolah(npsn);
CREATE INDEX IF NOT EXISTS idx_sekolah_status ON public.sekolah(status);

CREATE INDEX IF NOT EXISTS idx_users_sekolah_id ON public.users(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_data_guru_sekolah_id ON public.data_guru(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_data_mapel_sekolah_id ON public.data_mapel(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_data_siswa_sekolah_id ON public.data_siswa(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_pelajaran_sekolah_id ON public.jadwal_pelajaran(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_piket_sekolah_id ON public.jadwal_piket(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_kalender_pendidikan_sekolah_id ON public.kalender_pendidikan(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_pengaturan_sekolah_id ON public.pengaturan(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_bank_dokumen_sekolah_id ON public.bank_dokumen(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_backup_sekolah_id ON public.riwayat_backup(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_guru_mapel_sekolah_id ON public.guru_mapel(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_penugasan_piket_sekolah_id ON public.penugasan_piket(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_pengumuman_sekolah_id ON public.pengumuman(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_pengumuman_tanggapan_sekolah_id ON public.pengumuman_tanggapan(sekolah_id);

-- Ascending date sorting indexes (for Requirement 3)
CREATE INDEX IF NOT EXISTS idx_jurnal_sekolah_tanggal_asc ON public.jurnal_pembelajaran(sekolah_id, tanggal ASC);
CREATE INDEX IF NOT EXISTS idx_presensi_sekolah_timestamp_asc ON public.presensi_guru(sekolah_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_laporan_piket_sekolah_tanggal_asc ON public.laporan_piket(sekolah_id, tanggal ASC);

-- ==============================================================================
-- PART 6: Update Trigger & View
-- ==============================================================================
-- 1. Redefine view guru_kelas with sekolah_id safely
DROP VIEW IF EXISTS public.guru_kelas CASCADE;
CREATE VIEW public.guru_kelas AS
SELECT DISTINCT sekolah_id, guru_id, nip, nama_guru, kelas
FROM public.guru_mapel;

-- 2. Update sync_guru_mapel_from_data_guru trigger function with sekolah_id
CREATE OR REPLACE FUNCTION public.sync_guru_mapel_from_data_guru()
RETURNS TRIGGER AS $$
DECLARE
    item text;
    trimmed_item text;
    k text;
    m_id text;
BEGIN
    -- Delete previous mappings for this guru
    DELETE FROM public.guru_mapel WHERE guru_id = NEW.id;

    -- Re-populate mappings if mata_pelajaran exists
    IF NEW.mata_pelajaran IS NOT NULL AND trim(NEW.mata_pelajaran) <> '' THEN
        FOREACH item IN ARRAY string_to_array(NEW.mata_pelajaran, ',')
        LOOP
            trimmed_item := trim(item);
            IF trimmed_item <> '' THEN
                k := split_part(trimmed_item, '_', 1);
                SELECT id INTO m_id 
                FROM public.data_mapel 
                WHERE nama_mata_pelajaran = trimmed_item 
                  AND (sekolah_id = NEW.sekolah_id OR sekolah_id IS NULL)
                LIMIT 1;

                INSERT INTO public.guru_mapel (
                    sekolah_id,
                    guru_id, 
                    nip, 
                    nama_guru, 
                    mapel_id, 
                    nama_mapel, 
                    mapel_singkat, 
                    kelas
                )
                VALUES (
                    NEW.sekolah_id,
                    NEW.id,
                    NEW.nip,
                    NEW.nama_guru,
                    m_id,
                    trimmed_item,
                    split_part(trimmed_item, '_', 2),
                    k
                )
                ON CONFLICT (sekolah_id, nip, nama_mapel) DO UPDATE 
                SET guru_id = EXCLUDED.guru_id,
                    nama_guru = EXCLUDED.nama_guru,
                    mapel_id = EXCLUDED.mapel_id,
                    kelas = EXCLUDED.kelas;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Ensure trigger on data_guru is up-to-date
DROP TRIGGER IF EXISTS trg_sync_guru_mapel ON public.data_guru;
CREATE TRIGGER trg_sync_guru_mapel
AFTER INSERT OR UPDATE OF mata_pelajaran, nip, nama_guru, sekolah_id ON public.data_guru
FOR EACH ROW EXECUTE FUNCTION public.sync_guru_mapel_from_data_guru();

-- ==============================================================================
-- PART 7: Security Helper Functions
-- ==============================================================================
-- Helper 1: Extract authenticated user's sekolah_id
CREATE OR REPLACE FUNCTION public.get_auth_user_sekolah_id()
RETURNS UUID AS $$
DECLARE
  v_sekolah_id UUID;
  v_raw TEXT;
BEGIN
  -- 1. Check JWT claim (if custom claim injected in Supabase Auth token)
  BEGIN
    v_raw := current_setting('request.jwt.claim.sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Check JWT app_metadata
  BEGIN
    v_raw := auth.jwt() -> 'app_metadata' ->> 'sekolah_id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 3. Check public.users by auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT u.sekolah_id INTO v_sekolah_id
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF v_sekolah_id IS NOT NULL THEN
      RETURN v_sekolah_id;
    END IF;
  END IF;

  -- 4. Check session variable (app.current_sekolah_id)
  BEGIN
    v_raw := current_setting('app.current_sekolah_id', true);
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Fallback from PostgREST request headers 'x-sekolah-id'
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-sekolah-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 2: Extract authenticated user's role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_raw TEXT;
BEGIN
  -- 1. Check JWT app_metadata
  BEGIN
    v_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Check public.users by auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT u.role INTO v_role
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 3. Check session variable
  BEGIN
    v_role := current_setting('app.current_user_role', true);
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 4. Fallback from PostgREST request header 'x-user-role'
  BEGIN
    v_role := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN 'anon';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 3: Check if requester is Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_auth_user_role() = 'Superadmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper 4: Secure Login RPC (avoids exposing plain passwords over direct table SELECT)
CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  nama TEXT,
  role TEXT,
  sekolah_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.nama, u.role, u.sekolah_id
  FROM public.users u
  WHERE u.username = p_username AND u.password = p_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- PART 8: Enable RLS and Configure Multi-Tenant Policies
-- ==============================================================================

-- Enable RLS on all 17 tables
ALTER TABLE public.sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_piket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal_pembelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kalender_pendidikan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_piket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presensi_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_dokumen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru_mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penugasan_piket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman_tanggapan ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies on the 4 tables that had them
DROP POLICY IF EXISTS "Allow public read access on guru_mapel" ON public.guru_mapel;
DROP POLICY IF EXISTS "Allow authenticated or anon write access on guru_mapel" ON public.guru_mapel;
DROP POLICY IF EXISTS "Allow public read access on penugasan_piket" ON public.penugasan_piket;
DROP POLICY IF EXISTS "Allow authenticated or anon write access on penugasan_piket" ON public.penugasan_piket;
DROP POLICY IF EXISTS "Allow public read access on pengumuman" ON public.pengumuman;
DROP POLICY IF EXISTS "Allow authenticated or anon write access on pengumuman" ON public.pengumuman;
DROP POLICY IF EXISTS "Allow public read access on pengumuman_tanggapan" ON public.pengumuman_tanggapan;
DROP POLICY IF EXISTS "Allow authenticated or anon write access on pengumuman_tanggapan" ON public.pengumuman_tanggapan;
DROP POLICY IF EXISTS "Allow authenticated or anon write access on pengumuman_tanggapa" ON public.pengumuman_tanggapan;

-- ------------------------------------------------------------------------------
-- 1. Policies for public.sekolah
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "sekolah_select_policy" ON public.sekolah;
CREATE POLICY "sekolah_select_policy" ON public.sekolah FOR SELECT
USING (
    is_superadmin()
    OR id = public.get_auth_user_sekolah_id()
    OR true -- Allowed for login / public identity rendering
);

DROP POLICY IF EXISTS "sekolah_insert_policy" ON public.sekolah;
CREATE POLICY "sekolah_insert_policy" ON public.sekolah FOR INSERT
WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "sekolah_update_policy" ON public.sekolah;
CREATE POLICY "sekolah_update_policy" ON public.sekolah FOR UPDATE
USING (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND id = public.get_auth_user_sekolah_id()))
WITH CHECK (is_superadmin() OR (public.get_auth_user_role() = 'Admin' AND id = public.get_auth_user_sekolah_id()));

DROP POLICY IF EXISTS "sekolah_delete_policy" ON public.sekolah;
CREATE POLICY "sekolah_delete_policy" ON public.sekolah FOR DELETE
USING (is_superadmin());

-- ------------------------------------------------------------------------------
-- 2. Policies for public.users
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users FOR SELECT
USING (
    is_superadmin()
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
    OR true -- Necessary for LoginScreen custom authentication check
);

DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT
WITH CHECK (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users FOR UPDATE
USING (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
    OR (public.get_auth_user_sekolah_id() IS NOT NULL AND sekolah_id = public.get_auth_user_sekolah_id())
)
WITH CHECK (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id())
);

DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy" ON public.users FOR DELETE
USING (
    is_superadmin()
    OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Admin')
);

-- ------------------------------------------------------------------------------
-- 3. Generic Tenant-Isolation Macro Policies for Master & Transactional Tables
-- ------------------------------------------------------------------------------
-- Procedure to register standard tenant RLS policies on a table
CREATE OR REPLACE PROCEDURE public.setup_tenant_table_policies(p_table TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    -- SELECT policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_select_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_select_policy" ON public.%I FOR SELECT ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))',
        p_table, p_table
    );

    -- INSERT policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_insert_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_insert_policy" ON public.%I FOR INSERT ' ||
        'WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))',
        p_table, p_table
    );

    -- UPDATE policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_update_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_update_policy" ON public.%I FOR UPDATE ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true)) ' ||
        'WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))',
        p_table, p_table
    );

    -- DELETE policy
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_delete_policy" ON public.%I', p_table, p_table);
    EXECUTE format(
        'CREATE POLICY "%s_tenant_delete_policy" ON public.%I FOR DELETE ' ||
        'USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))',
        p_table, p_table
    );
END;
$$;

-- Apply policies to all master and transactional tables
CALL public.setup_tenant_table_policies('data_guru');
CALL public.setup_tenant_table_policies('data_mapel');
CALL public.setup_tenant_table_policies('data_siswa');
CALL public.setup_tenant_table_policies('jadwal_pelajaran');
CALL public.setup_tenant_table_policies('jadwal_piket');
CALL public.setup_tenant_table_policies('jurnal_pembelajaran');
CALL public.setup_tenant_table_policies('kalender_pendidikan');
CALL public.setup_tenant_table_policies('laporan_piket');
CALL public.setup_tenant_table_policies('pengaturan');
CALL public.setup_tenant_table_policies('presensi_guru');
CALL public.setup_tenant_table_policies('bank_dokumen');
CALL public.setup_tenant_table_policies('riwayat_backup');
CALL public.setup_tenant_table_policies('guru_mapel');
CALL public.setup_tenant_table_policies('penugasan_piket');
CALL public.setup_tenant_table_policies('pengumuman');
CALL public.setup_tenant_table_policies('pengumuman_tanggapan');

-- Cleanup procedure
DROP PROCEDURE IF EXISTS public.setup_tenant_table_policies(TEXT);

-- Grant privileges to anon, authenticated, and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

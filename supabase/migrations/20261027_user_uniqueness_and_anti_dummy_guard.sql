-- ==============================================================================
-- Migration: 20261027_user_uniqueness_and_anti_dummy_guard.sql
-- Description: Enforce user uniqueness and anti-dummy data integrity guards
--              (Ponytail approach: native DB indexes & constraints).
-- ==============================================================================

-- 1. CLEANUP & NORMALIZATION OF DEPRECATED / LEGACY NAMES
-- Ensure no uppercase "FITRA SURYAZANA MAMONTO" exists in users or data_guru
UPDATE public.users 
SET nama = 'Fitra Suryazana Mamonto' 
WHERE nama = 'FITRA SURYAZANA MAMONTO';

UPDATE public.data_guru 
SET nama_guru = 'Fitra Suryazana Mamonto' 
WHERE nama_guru = 'FITRA SURYAZANA MAMONTO';

-- Total removal of legacy "Drs. Ahmad Dahlan, M.Pd." from operational tables
DELETE FROM public.users WHERE nama ILIKE '%ahmad dahlan%';
DELETE FROM public.data_guru WHERE nama_guru ILIKE '%ahmad dahlan%';
DELETE FROM public.data_siswa WHERE nama_siswa ILIKE '%ahmad dahlan%';
DELETE FROM public.presensi_guru WHERE nama_guru ILIKE '%ahmad dahlan%' OR id = 'e1144f72-2ec4-43f2-aebb-10a59063a906';
DELETE FROM public.jurnal_pembelajaran WHERE nama_guru ILIKE '%ahmad dahlan%';

-- 2. UNIQUE INDEXES FOR USER & TEACHER UNIQUENESS (R3)
-- Prevent duplicate username (case-insensitive) across the system
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower 
ON public.users (lower(trim(username)));

-- Prevent duplicate user name within the same school/tenant (or system level for superadmin/dinas)
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_sekolah_nama_lower 
ON public.users (COALESCE(sekolah_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(regexp_replace(trim(nama), '\s+', ' ', 'g')));

-- Prevent duplicate teacher name within the same school
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_guru_sekolah_nama_lower 
ON public.data_guru (sekolah_id, lower(regexp_replace(trim(nama_guru), '\s+', ' ', 'g')));

-- Prevent duplicate teacher NIP within the same school (when NIP is set and not placeholder '-')
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_guru_sekolah_nip_lower 
ON public.data_guru (sekolah_id, lower(trim(nip))) 
WHERE nip IS NOT NULL AND trim(nip) <> '' AND trim(nip) <> '-';

-- 3. ANTI-DUMMY & FICTITIOUS DATA GUARD TRIGGER (R4)
-- Native database trigger to prevent accidental injection or leakage of dummy test accounts into production
CREATE OR REPLACE FUNCTION public.check_anti_dummy_guard()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_norm TEXT;
    v_id_col TEXT;
BEGIN
    IF TG_TABLE_NAME = 'users' THEN
        v_name := NEW.nama;
        v_id_col := NEW.username;
        IF v_id_col ~* 'ahmad[\s._-]*dahlan' OR v_id_col ~ '\yFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\y' THEN
            RAISE EXCEPTION 'Username dinonaktifkan / dilarang: %', v_id_col;
        END IF;
        IF regexp_replace(v_id_col, '[_\.\-\d]+', ' ', 'g') ~* '\y(test|tester|testing|dummy|fiktif|fake|percobaan|uji\s*coba|contoh|sample|foo|bar|asdf)\y'
           OR v_id_col ~* '(dummy|fiktif|fake|ujicoba|percobaan|testuser|dummyuser|usertest|testguru)' THEN
            RAISE EXCEPTION 'Username fiktif/dummy dilarang: %', v_id_col;
        END IF;
    ELSIF TG_TABLE_NAME = 'data_guru' THEN
        v_name := NEW.nama_guru;
        v_id_col := NEW.nip;
        IF v_id_col IS NOT NULL AND v_id_col <> '-' THEN
            IF v_id_col ~* 'ahmad[\s._-]*dahlan' OR v_id_col ~ '\yFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\y' THEN
                RAISE EXCEPTION 'NIP guru dinonaktifkan / dilarang: %', v_id_col;
            END IF;
            IF regexp_replace(v_id_col, '[_\.\-\d]+', ' ', 'g') ~* '\y(test|tester|testing|dummy|fiktif|fake|percobaan|uji\s*coba|contoh|sample|foo|bar|asdf)\y'
               OR v_id_col ~* '(dummy|fiktif|fake|ujicoba|percobaan|testuser|dummyuser|usertest|testguru)' THEN
                RAISE EXCEPTION 'NIP fiktif/dummy dilarang: %', v_id_col;
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'data_siswa' THEN
        v_name := NEW.nama_siswa;
    ELSIF TG_TABLE_NAME = 'jadwal_pelajaran' THEN
        v_name := NEW.nama_guru;
    END IF;

    -- Normalize multiple spaces in name
    v_norm := regexp_replace(trim(COALESCE(v_name, '')), '\s+', ' ', 'g');

    -- Disallow dummy patterns in operational tables
    IF regexp_replace(v_norm, '[_\.\-\d]+', ' ', 'g') ~* '\y(dummy automated test guru|test guru|guru test|dummy guru|guru dummy|akun dummy|dummy user|test|dummy|fiktif|fake|percobaan|uji\s*coba)\y' 
       OR v_norm ~* '(dummy|fiktif|fake|ujicoba|percobaan|testuser|dummyuser|usertest|testguru)' THEN
        RAISE EXCEPTION 'Data identitas dummy/fiktif dilarang di tabel operasional: %', v_name;
    END IF;

    -- Disallow legacy uppercase FITRA SURYAZANA MAMONTO (even with titles/prefixes/punctuation)
    IF v_norm ~ '\yFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\y' THEN
        RAISE EXCEPTION 'Format nama kapital dilarang. Harap gunakan format resmi Title Case: Fitra Suryazana Mamonto';
    END IF;

    -- Disallow deprecated Ahmad Dahlan (all separator/title variations)
    IF v_norm ~* 'ahmad[\s._-]*dahlan' THEN
        RAISE EXCEPTION 'Akun / nama % telah dinonaktifkan permanen dari sistem.', v_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach anti-dummy triggers conditionally
DROP TRIGGER IF EXISTS trg_anti_dummy_users ON public.users;
CREATE TRIGGER trg_anti_dummy_users
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.check_anti_dummy_guard();

DROP TRIGGER IF EXISTS trg_anti_dummy_data_guru ON public.data_guru;
CREATE TRIGGER trg_anti_dummy_data_guru
BEFORE INSERT OR UPDATE ON public.data_guru
FOR EACH ROW EXECUTE FUNCTION public.check_anti_dummy_guard();

DROP TRIGGER IF EXISTS trg_anti_dummy_data_siswa ON public.data_siswa;
CREATE TRIGGER trg_anti_dummy_data_siswa
BEFORE INSERT OR UPDATE ON public.data_siswa
FOR EACH ROW EXECUTE FUNCTION public.check_anti_dummy_guard();

DROP TRIGGER IF EXISTS trg_anti_dummy_jadwal_pelajaran ON public.jadwal_pelajaran;
CREATE TRIGGER trg_anti_dummy_jadwal_pelajaran
BEFORE INSERT OR UPDATE ON public.jadwal_pelajaran
FOR EACH ROW EXECUTE FUNCTION public.check_anti_dummy_guard();

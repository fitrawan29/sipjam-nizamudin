-- ==============================================================================
-- Migration: 20261102_validate_mapel_jadwal.sql
-- Description: Enforce schedule mapel validity (prohibit non-existent subjects
--              like "teknik informasi" / "teknologi informasi" and enforce
--              official subjects like "Informatika").
-- ==============================================================================

-- 1. CLEANUP OF ERRONEOUS SCHEDULE RECORDS
-- Ensure no invalid/fictitious subject records exist in jadwal_pelajaran
DELETE FROM public.jadwal_pelajaran
WHERE id = 'c0000000-0000-0000-0000-000000000001'
   OR lower(trim(COALESCE(mata_pelajaran, ''))) ~* '\y(teknik|teknologi)\s+informasi\y|\yteknik\s+informatika\y|\ytek\s*info\y|\ytik\y'
   OR lower(trim(COALESCE(mapel, ''))) ~* '\y(teknik|teknologi)\s+informasi\y|\yteknik\s+informatika\y|\ytek\s*info\y|\ytik\y';

-- 2. VALIDATION TRIGGER FOR JADWAL_PELAJARAN
CREATE OR REPLACE FUNCTION public.check_jadwal_mapel_validity()
RETURNS TRIGGER AS $$
BEGIN
    IF lower(trim(COALESCE(NEW.mata_pelajaran, ''))) ~* '\y(teknik|teknologi)\s+informasi\y|\yteknik\s+informatika\y|\ytek\s*info\y|\ytik\y'
       OR lower(trim(COALESCE(NEW.mapel, ''))) ~* '\y(teknik|teknologi)\s+informasi\y|\yteknik\s+informatika\y|\ytek\s*info\y|\ytik\y' THEN
        RAISE EXCEPTION 'Mata pelajaran tidak valid: %. Gunakan mata pelajaran resmi seperti Informatika.', NEW.mata_pelajaran;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_jadwal_mapel ON public.jadwal_pelajaran;
CREATE TRIGGER trg_validate_jadwal_mapel
BEFORE INSERT OR UPDATE ON public.jadwal_pelajaran
FOR EACH ROW EXECUTE FUNCTION public.check_jadwal_mapel_validity();

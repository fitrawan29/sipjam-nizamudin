-- Migration: 20261004_add_mode_presensi_siswa_to_sekolah.sql
-- Description: Add mode_presensi_siswa column to public.sekolah with default 'qr' and check constraint ('qr', 'manual')

-- 1. Add mode_presensi_siswa column with default 'qr'
ALTER TABLE public.sekolah 
  ADD COLUMN IF NOT EXISTS mode_presensi_siswa TEXT DEFAULT 'qr';

-- 2. Backfill existing rows if any are null
UPDATE public.sekolah 
  SET mode_presensi_siswa = 'qr' 
  WHERE mode_presensi_siswa IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE public.sekolah 
  ALTER COLUMN mode_presensi_siswa SET NOT NULL;

-- 4. Add check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'sekolah_mode_presensi_siswa_check'
  ) THEN
    ALTER TABLE public.sekolah 
      ADD CONSTRAINT sekolah_mode_presensi_siswa_check 
      CHECK (mode_presensi_siswa IN ('qr', 'manual'));
  END IF;
END $$;

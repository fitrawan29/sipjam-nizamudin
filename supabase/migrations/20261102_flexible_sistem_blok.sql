-- ==============================================================================
-- Migration: 20261102_flexible_sistem_blok.sql
-- Description: Expand public.sistem_blok with granular target scope options
--              (sekolah, angkatan, kelas, guru) and time range controls (is_full_day, jam_mulai, jam_selesai).
-- Backward Compatibility: All new columns default to full school ('sekolah') and full day (true).
-- ==============================================================================

-- 1. Add target scope columns to public.sistem_blok
ALTER TABLE public.sistem_blok
    ADD COLUMN IF NOT EXISTS tipe_target TEXT NOT NULL DEFAULT 'sekolah',
    ADD COLUMN IF NOT EXISTS target_angkatan TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS target_kelas TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS target_guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS target_guru_nama TEXT DEFAULT NULL;

-- 2. Add time range columns to public.sistem_blok
ALTER TABLE public.sistem_blok
    ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS jam_mulai TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS jam_selesai TEXT DEFAULT NULL;

-- 3. Add check constraint for tipe_target
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'sistem_blok_tipe_target_check'
    ) THEN
        ALTER TABLE public.sistem_blok
            ADD CONSTRAINT sistem_blok_tipe_target_check
            CHECK (tipe_target IN ('sekolah', 'angkatan', 'kelas', 'guru'));
    END IF;
END $$;

-- 4. Backfill existing records to ensure zero nulls in default columns
UPDATE public.sistem_blok
SET tipe_target = 'sekolah'
WHERE tipe_target IS NULL;

UPDATE public.sistem_blok
SET is_full_day = true
WHERE is_full_day IS NULL;

-- 5. Performance indexes for efficient targeted schedule evaluations
CREATE INDEX IF NOT EXISTS idx_sistem_blok_tipe_target ON public.sistem_blok(tipe_target);
CREATE INDEX IF NOT EXISTS idx_sistem_blok_target_angkatan ON public.sistem_blok(target_angkatan);
CREATE INDEX IF NOT EXISTS idx_sistem_blok_target_kelas ON public.sistem_blok(target_kelas);
CREATE INDEX IF NOT EXISTS idx_sistem_blok_target_guru_id ON public.sistem_blok(target_guru_id);
CREATE INDEX IF NOT EXISTS idx_sistem_blok_time_range ON public.sistem_blok(is_full_day, jam_mulai, jam_selesai);

-- 6. Instant PostgREST schema cache reload signal
NOTIFY pgrst, 'reload schema';

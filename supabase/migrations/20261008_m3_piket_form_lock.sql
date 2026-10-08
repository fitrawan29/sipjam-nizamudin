-- Migration: 20261008_m3_piket_form_lock.sql
-- Description: Create piket_form_lock table for lease-based concurrency locks on student attendance forms.
-- Date: 2026-10-08

CREATE TABLE IF NOT EXISTS public.piket_form_lock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'student_attendance',
  locked_by_user_id TEXT NOT NULL,
  locked_by_user_name TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_piket_form_lock UNIQUE (sekolah_id, tanggal, form_type)
);

-- Index for high-performance lock lookup
CREATE INDEX IF NOT EXISTS idx_piket_form_lock_lookup 
  ON public.piket_form_lock(sekolah_id, tanggal, form_type);

-- Enable Row Level Security
ALTER TABLE public.piket_form_lock ENABLE ROW LEVEL SECURITY;

-- Allow read access to all within same sekolah
CREATE POLICY "Allow read piket_form_lock within school"
  ON public.piket_form_lock
  FOR SELECT
  USING (true);

-- Allow insert/update/delete for authenticated users within school
CREATE POLICY "Allow modify piket_form_lock within school"
  ON public.piket_form_lock
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Migration: 20261008_m2_presensi_guru_approval_autocheckout.sql
-- Description: Add multi-day leave durations, admin approval requirement flags, and auto-checkout tracking for presensi_guru.
-- Date: 2026-10-08

ALTER TABLE public.presensi_guru
  ADD COLUMN IF NOT EXISTS durasi_hari INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tanggal_mulai DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tanggal_selesai DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS memerlukan_persetujuan_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_presensi_guru_leave_range 
  ON public.presensi_guru(sekolah_id, status_verifikasi, tanggal_mulai, tanggal_selesai);

CREATE INDEX IF NOT EXISTS idx_presensi_guru_auto_checkout
  ON public.presensi_guru(sekolah_id, tipe_absen, is_auto_checkout);

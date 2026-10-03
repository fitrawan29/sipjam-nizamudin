-- Migration: Add kktp, konten, and lokasi_kbm columns to jurnal_pembelajaran
-- Date: 2026-10-03
ALTER TABLE public.jurnal_pembelajaran 
  ADD COLUMN IF NOT EXISTS kktp TEXT,
  ADD COLUMN IF NOT EXISTS konten TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;

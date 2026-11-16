-- Migration: Menambahkan kolom detail_layanan (JSONB) pada tabel jurnal_bk untuk mendukung 11 jenis layanan BK dinamis
ALTER TABLE public.jurnal_bk ADD COLUMN IF NOT EXISTS detail_layanan JSONB DEFAULT '{}'::jsonb;
NOTIFY pgrst, 'reload schema';

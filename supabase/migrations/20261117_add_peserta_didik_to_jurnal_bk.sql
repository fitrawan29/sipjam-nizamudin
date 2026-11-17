-- Migration: Menambahkan kolom peserta_didik (JSONB) pada tabel jurnal_bk untuk mendukung multi-siswa pada layanan bimbingan kelompok/mediasi
ALTER TABLE public.jurnal_bk ADD COLUMN IF NOT EXISTS peserta_didik JSONB DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';

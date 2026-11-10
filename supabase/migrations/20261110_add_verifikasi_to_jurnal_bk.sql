-- Migration: Menambahkan kolom verifikasi Admin & Kepala Sekolah pada tabel jurnal_bk
-- agar Jurnal BK dapat muncul di Verifikasi Jurnal, dihitung dalam rekap/analitik, dan dilacak pada alur kerja Guru BK.

ALTER TABLE public.jurnal_bk
  ADD COLUMN IF NOT EXISTS status_verifikasi TEXT DEFAULT 'Menunggu',
  ADD COLUMN IF NOT EXISTS catatan_admin TEXT,
  ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT;

UPDATE public.jurnal_bk
SET status_verifikasi = 'Menunggu'
WHERE status_verifikasi IS NULL;

CREATE INDEX IF NOT EXISTS idx_jurnal_bk_tanggal_verifikasi
  ON public.jurnal_bk(sekolah_id, tanggal, status_verifikasi);

-- Refresh Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';

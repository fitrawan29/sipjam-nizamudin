-- Migration: Long-term Database Sustainability, Composite Indexes & Ephemeral Cleanup
-- Ensures SIPJAM remains fast and within Supabase storage/egress limits over years of usage.

-- 1. Composite indexes for frequent date & verification status queries
CREATE INDEX IF NOT EXISTS idx_laporan_piket_sekolah_tanggal
  ON public.laporan_piket(sekolah_id, tanggal);

CREATE INDEX IF NOT EXISTS idx_jurnal_sekolah_verif_tanggal
  ON public.jurnal_pembelajaran(sekolah_id, status_verifikasi, tanggal);

CREATE INDEX IF NOT EXISTS idx_presensi_guru_sekolah_verif_ts
  ON public.presensi_guru(sekolah_id, status_verifikasi, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sekolah_created
  ON public.chat_messages(sekolah_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pengumuman_sekolah_created
  ON public.pengumuman(sekolah_id, created_at DESC);

-- 2. Safe cleanup function for expired ephemeral lock rows
CREATE OR REPLACE FUNCTION public.cleanup_stale_ephemeral_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_locks INTEGER := 0;
BEGIN
  DELETE FROM public.piket_form_lock
  WHERE expires_at < (NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS deleted_locks = ROW_COUNT;

  RETURN deleted_locks;
END;
$$;

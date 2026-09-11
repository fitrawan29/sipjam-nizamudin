-- Migration: 20260912_jurnal_pembelajaran_8_kolom.sql
-- Description: Add 7 columns to public.jurnal_pembelajaran, backfill legacy data, and ensure kota_kabupaten setting.

-- ==============================================================================
-- 1. Add 7 columns to public.jurnal_pembelajaran for 8-column layout standard
-- ==============================================================================
ALTER TABLE public.jurnal_pembelajaran
  ADD COLUMN IF NOT EXISTS pertemuan_ke TEXT,
  ADD COLUMN IF NOT EXISTS jam_ke TEXT,
  ADD COLUMN IF NOT EXISTS tujuan_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS materi_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS kehadiran_murid TEXT,
  ADD COLUMN IF NOT EXISTS catatan_refleksi TEXT,
  ADD COLUMN IF NOT EXISTS foto_kegiatan TEXT;

-- ==============================================================================
-- 2. Indexes for high-performance query filtering
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_jurnal_pembelajaran_guru_tanggal ON public.jurnal_pembelajaran(nama_guru, tanggal);
CREATE INDEX IF NOT EXISTS idx_jurnal_pembelajaran_kelas_mapel ON public.jurnal_pembelajaran(kelas, mapel);

-- ==============================================================================
-- 3. Backfill historical records from legacy columns
-- ==============================================================================
UPDATE public.jurnal_pembelajaran
SET 
  materi_pembelajaran = COALESCE(materi_pembelajaran, materi),
  catatan_refleksi = COALESCE(catatan_refleksi, refleksi),
  foto_kegiatan = COALESCE(foto_kegiatan, link_bukti_foto)
WHERE materi_pembelajaran IS NULL OR catatan_refleksi IS NULL OR foto_kegiatan IS NULL;

-- ==============================================================================
-- 4. Ensure kota_kabupaten exists in public.pengaturan
-- ==============================================================================
INSERT INTO public.pengaturan (id, key, value)
VALUES (gen_random_uuid(), 'kota_kabupaten', 'Kab. Bolaangmongondow Timur')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 5. Table Privileges
-- ==============================================================================
GRANT ALL ON public.jurnal_pembelajaran TO anon, authenticated, service_role;
GRANT ALL ON public.pengaturan TO anon, authenticated, service_role;

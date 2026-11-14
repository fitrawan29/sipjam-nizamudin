-- ============================================================================
-- Migration: Lokasi KBM hanya boleh ditarik dari kelas yang SAMA
-- Date: 2026-11-14
-- Description:
--   1. Perbaiki trigger public.sync_jurnal_pembelajaran_lokasi(): lookup riwayat
--      lokasi_kbm guru wajib kelas yang sama (tanpa fallback lintas kelas).
--   2. Bersihkan baris yang lokasi_kbm-nya menyebut tingkat kelas berbeda dengan
--      kelas barisnya (hasil backfill lintas kelas sebelumnya): kosongkan
--      lokasi_kbm (dan lokasi bila salinan identik).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_jurnal_pembelajaran_lokasi()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_lokasi TEXT;
BEGIN
  IF NOT public.is_valid_lokasi_kbm_text(NEW.lokasi_kbm) AND public.is_valid_lokasi_kbm_text(NEW.lokasi) THEN
    NEW.lokasi_kbm := btrim(NEW.lokasi);
  END IF;

  -- Isi dari riwayat guru pada kelas yang SAMA saja
  IF NOT public.is_valid_lokasi_kbm_text(NEW.lokasi_kbm)
     AND COALESCE(btrim(NEW.kelas), '') <> ''
     AND btrim(NEW.kelas) <> '-' THEN
    SELECT btrim(h.lokasi_kbm)
    INTO v_prev_lokasi
    FROM public.jurnal_pembelajaran h
    WHERE (NEW.id IS NULL OR h.id <> NEW.id)
      AND public.is_valid_lokasi_kbm_text(h.lokasi_kbm)
      AND lower(btrim(COALESCE(h.kelas, ''))) = lower(btrim(COALESCE(NEW.kelas, '')))
      AND (
        (NEW.user_id IS NOT NULL AND h.user_id = NEW.user_id)
        OR (
          COALESCE(btrim(NEW.nama_guru), '') <> ''
          AND lower(split_part(btrim(COALESCE(h.nama_guru, '')), ',', 1)) = lower(split_part(btrim(COALESCE(NEW.nama_guru, '')), ',', 1))
        )
      )
    ORDER BY h.tanggal DESC NULLS LAST, h.timestamp DESC NULLS LAST
    LIMIT 1;

    IF v_prev_lokasi IS NOT NULL THEN
      NEW.lokasi_kbm := v_prev_lokasi;
    END IF;
  END IF;

  IF (NEW.lokasi_kbm IS NULL OR btrim(NEW.lokasi_kbm) = '') AND NEW.lokasi IS NOT NULL AND btrim(NEW.lokasi) <> '' THEN
    NEW.lokasi_kbm := NEW.lokasi;
  ELSIF (NEW.lokasi IS NULL OR btrim(NEW.lokasi) = '' OR btrim(NEW.lokasi) = '-') AND NEW.lokasi_kbm IS NOT NULL AND btrim(NEW.lokasi_kbm) <> '' THEN
    NEW.lokasi := NEW.lokasi_kbm;
  END IF;

  RETURN NEW;
END;
$$;

-- Bersihkan lokasi_kbm yang menyebut tingkat kelas (X / XI / XII) berbeda dengan
-- tingkat kolom `kelas` barisnya (hasil backfill lintas kelas, mis. kelas XII berisi
-- 'X merdeka'). Nilai tanpa tingkat kelas (mis. 'Ruang guru') tidak disentuh.
-- Trigger dinonaktifkan sementara agar tidak mengisi ulang nilai yang baru dikosongkan.
ALTER TABLE public.jurnal_pembelajaran DISABLE TRIGGER trg_sync_jurnal_pembelajaran_lokasi;

UPDATE public.jurnal_pembelajaran jp
SET
  lokasi = CASE WHEN btrim(COALESCE(jp.lokasi, '')) = btrim(jp.lokasi_kbm) THEN NULL ELSE jp.lokasi END,
  lokasi_kbm = NULL
WHERE public.is_valid_lokasi_kbm_text(jp.lokasi_kbm)
  AND substring(lower(jp.lokasi_kbm) from '\m(xii|xi|x)\M') IS NOT NULL
  AND substring(lower(btrim(COALESCE(jp.kelas, ''))) from '^(xii|xi|x)\M') IS NOT NULL
  AND substring(lower(jp.lokasi_kbm) from '\m(xii|xi|x)\M')
      <> substring(lower(btrim(COALESCE(jp.kelas, ''))) from '^(xii|xi|x)\M');

ALTER TABLE public.jurnal_pembelajaran ENABLE TRIGGER trg_sync_jurnal_pembelajaran_lokasi;

NOTIFY pgrst, 'reload schema';

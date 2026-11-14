-- ============================================================================
-- Migration: Enforce Strict Same-Class Matching for `lokasi_kbm` Trigger & Cleanup
-- Date: 2026-11-14
-- Description:
--   1. Clears `lokasi_kbm` (and matching copied `lokasi`) on rows where `lokasi_kbm`
--      explicitly references a different grade level than `kelas`, or where `kelas`
--      is empty/'-' and `lokasi_kbm` is non-GPS cross-class text.
--   2. Replaces `public.sync_jurnal_pembelajaran_lokasi()` so auto-fill from history
--      ONLY matches rows from the exact same teacher AND exact same `kelas`
--      (removing cross-class fallback).
-- ============================================================================

-- 1. Clean up any cross-class polluted `lokasi_kbm` rows
UPDATE public.jurnal_pembelajaran
SET
  lokasi = CASE
    WHEN lokasi IS NOT NULL AND btrim(lokasi) = btrim(lokasi_kbm) THEN NULL
    ELSE lokasi
  END,
  lokasi_kbm = NULL
WHERE public.is_valid_lokasi_kbm_text(lokasi_kbm)
  AND (
    (
      lower(btrim(COALESCE(kelas, ''))) ~ '^xii([^a-z0-9]|$)'
      AND lower(btrim(lokasi_kbm)) ~ '(^|[^a-z0-9])((x|10|xi|11)[[:space:]]*merdeka|kelas[[:space:]]+(x|10|xi|11))([^a-z0-9]|$)'
    )
    OR (
      lower(btrim(COALESCE(kelas, ''))) ~ '^xi([^a-z0-9]|$)'
      AND lower(btrim(lokasi_kbm)) ~ '(^|[^a-z0-9])((x|10|xii|12)[[:space:]]*merdeka|kelas[[:space:]]+(x|10|xii|12))([^a-z0-9]|$)'
    )
    OR (
      lower(btrim(COALESCE(kelas, ''))) ~ '^x([^a-z0-9]|$)'
      AND lower(btrim(lokasi_kbm)) ~ '(^|[^a-z0-9])((xi|11|xii|12)[[:space:]]*merdeka|kelas[[:space:]]+(xi|11|xii|12))([^a-z0-9]|$)'
    )
  );

-- 2. Replace trigger function: strict same-class lookup only (no cross-class fallback)
CREATE OR REPLACE FUNCTION public.sync_jurnal_pembelajaran_lokasi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev_lokasi TEXT;
BEGIN
  -- If lokasi_kbm is not valid, try copying from valid non-GPS lokasi first
  IF NOT public.is_valid_lokasi_kbm_text(NEW.lokasi_kbm) AND public.is_valid_lokasi_kbm_text(NEW.lokasi) THEN
    NEW.lokasi_kbm := btrim(NEW.lokasi);
  END IF;

  -- If lokasi_kbm is still empty/invalid on a KBM entry, look up ONLY from the same teacher & same kelas
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
    ORDER BY
      h.tanggal DESC NULLS LAST,
      h.timestamp DESC NULLS LAST
    LIMIT 1;

    IF v_prev_lokasi IS NOT NULL THEN
      NEW.lokasi_kbm := v_prev_lokasi;
    END IF;
  END IF;

  -- Keep legacy compatibility: sync between lokasi and lokasi_kbm
  IF (NEW.lokasi_kbm IS NULL OR btrim(NEW.lokasi_kbm) = '') AND NEW.lokasi IS NOT NULL AND btrim(NEW.lokasi) <> '' THEN
    NEW.lokasi_kbm := NEW.lokasi;
  ELSIF (NEW.lokasi IS NULL OR btrim(NEW.lokasi) = '' OR btrim(NEW.lokasi) = '-') AND NEW.lokasi_kbm IS NOT NULL AND btrim(NEW.lokasi_kbm) <> '' THEN
    NEW.lokasi := NEW.lokasi_kbm;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

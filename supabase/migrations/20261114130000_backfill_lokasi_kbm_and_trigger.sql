-- ============================================================================
-- Migration: Backfill Empty Tempat/Lokasi KBM from Teacher's Previous Entries
-- Date: 2026-11-14
-- Description:
--   1. Adds helper function `public.is_valid_lokasi_kbm_text(text)` to detect
--      meaningful room/location names vs NULL/'-'/'GPS:...'/'Lokasi tidak terdeteksi'.
--   2. Backfills historical rows in `public.jurnal_pembelajaran` where `lokasi_kbm`
--      is empty using the location previously filled by that same teacher
--      (prioritizing the same class first, then any class taught by that teacher).
--   3. Enhances `public.sync_jurnal_pembelajaran_lokasi()` trigger function so
--      future inserts/updates with empty `lokasi_kbm` automatically inherit
--      the teacher's previously filled `lokasi_kbm`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_lokasi_kbm_text(val TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t TEXT;
BEGIN
  IF val IS NULL THEN
    RETURN FALSE;
  END IF;
  t := btrim(val);
  IF t = '' OR t = '-' OR t = '--' THEN
    RETURN FALSE;
  END IF;
  IF t ~* '^lokasi\s+tidak\s+terdeteksi$' THEN
    RETURN FALSE;
  END IF;
  IF t ~* '^gps\s*:' THEN
    RETURN FALSE;
  END IF;
  IF t ~ '^-?[0-9]+(\.[0-9]+)?\s*,\s*-?[0-9]+(\.[0-9]+)?$' THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

-- 1. Copy valid non-GPS `lokasi` into `lokasi_kbm` if `lokasi_kbm` is empty/invalid
UPDATE public.jurnal_pembelajaran
SET lokasi_kbm = btrim(lokasi)
WHERE NOT public.is_valid_lokasi_kbm_text(lokasi_kbm)
  AND public.is_valid_lokasi_kbm_text(lokasi);

-- 2. Backfill empty/invalid `lokasi_kbm` on KBM journal rows from the same teacher's filled history
WITH resolved_lokasi AS (
  SELECT
    target.id AS target_id,
    COALESCE(
      -- Priority 1: Same teacher + same kelas
      (
        SELECT btrim(h.lokasi_kbm)
        FROM public.jurnal_pembelajaran h
        WHERE h.id <> target.id
          AND public.is_valid_lokasi_kbm_text(h.lokasi_kbm)
          AND lower(btrim(COALESCE(h.kelas, ''))) = lower(btrim(COALESCE(target.kelas, '')))
          AND (
            (target.user_id IS NOT NULL AND h.user_id = target.user_id)
            OR (
              COALESCE(btrim(target.nama_guru), '') <> ''
              AND lower(split_part(btrim(COALESCE(h.nama_guru, '')), ',', 1)) = lower(split_part(btrim(COALESCE(target.nama_guru, '')), ',', 1))
            )
          )
        ORDER BY h.tanggal DESC NULLS LAST, h.timestamp DESC NULLS LAST
        LIMIT 1
      ),
      -- Priority 2: Same teacher across any kelas
      (
        SELECT btrim(h.lokasi_kbm)
        FROM public.jurnal_pembelajaran h
        WHERE h.id <> target.id
          AND public.is_valid_lokasi_kbm_text(h.lokasi_kbm)
          AND (
            (target.user_id IS NOT NULL AND h.user_id = target.user_id)
            OR (
              COALESCE(btrim(target.nama_guru), '') <> ''
              AND lower(split_part(btrim(COALESCE(h.nama_guru, '')), ',', 1)) = lower(split_part(btrim(COALESCE(target.nama_guru, '')), ',', 1))
            )
          )
        ORDER BY h.tanggal DESC NULLS LAST, h.timestamp DESC NULLS LAST
        LIMIT 1
      )
    ) AS prev_lokasi
  FROM public.jurnal_pembelajaran target
  WHERE NOT public.is_valid_lokasi_kbm_text(target.lokasi_kbm)
    AND COALESCE(btrim(target.kelas), '') <> ''
    AND btrim(target.kelas) <> '-'
)
UPDATE public.jurnal_pembelajaran jp
SET
  lokasi_kbm = rl.prev_lokasi,
  lokasi = CASE
    WHEN NOT public.is_valid_lokasi_kbm_text(jp.lokasi) THEN rl.prev_lokasi
    ELSE jp.lokasi
  END
FROM resolved_lokasi rl
WHERE jp.id = rl.target_id
  AND rl.prev_lokasi IS NOT NULL;

-- 3. Enhance bidirectional sync trigger to auto-fill empty `lokasi_kbm` from teacher's history
CREATE OR REPLACE FUNCTION public.sync_jurnal_pembelajaran_lokasi()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_lokasi TEXT;
BEGIN
  -- If lokasi_kbm is not valid, try copying from valid non-GPS lokasi first
  IF NOT public.is_valid_lokasi_kbm_text(NEW.lokasi_kbm) AND public.is_valid_lokasi_kbm_text(NEW.lokasi) THEN
    NEW.lokasi_kbm := btrim(NEW.lokasi);
  END IF;

  -- If lokasi_kbm is still empty/invalid on a KBM entry, look up the teacher's previously filled lokasi_kbm
  IF NOT public.is_valid_lokasi_kbm_text(NEW.lokasi_kbm)
     AND COALESCE(btrim(NEW.kelas), '') <> ''
     AND btrim(NEW.kelas) <> '-' THEN
    SELECT btrim(h.lokasi_kbm)
    INTO v_prev_lokasi
    FROM public.jurnal_pembelajaran h
    WHERE (NEW.id IS NULL OR h.id <> NEW.id)
      AND public.is_valid_lokasi_kbm_text(h.lokasi_kbm)
      AND (
        (NEW.user_id IS NOT NULL AND h.user_id = NEW.user_id)
        OR (
          COALESCE(btrim(NEW.nama_guru), '') <> ''
          AND lower(split_part(btrim(COALESCE(h.nama_guru, '')), ',', 1)) = lower(split_part(btrim(COALESCE(NEW.nama_guru, '')), ',', 1))
        )
      )
    ORDER BY
      CASE WHEN lower(btrim(COALESCE(h.kelas, ''))) = lower(btrim(COALESCE(NEW.kelas, ''))) THEN 0 ELSE 1 END,
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

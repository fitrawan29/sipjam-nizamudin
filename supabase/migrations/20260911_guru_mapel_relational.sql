-- Migration: 20260911_guru_mapel_relational.sql
-- Description: Create guru_mapel relational table, indexes, RLS policies, seed data, trigger, and view.

-- ==============================================================================
-- 1. Create relational table: guru_mapel
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.guru_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE CASCADE,
    nip TEXT NOT NULL,
    nama_guru TEXT NOT NULL,
    mapel_id TEXT REFERENCES public.data_mapel(id) ON DELETE CASCADE,
    nama_mapel TEXT NOT NULL,
    mapel_singkat TEXT,
    kelas TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_guru_mapel UNIQUE (nip, nama_mapel)
);

-- ==============================================================================
-- 2. Indexes for high-performance dynamic queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_guru_mapel_nip ON public.guru_mapel(nip);
CREATE INDEX IF NOT EXISTS idx_guru_mapel_nama ON public.guru_mapel(nama_guru);
CREATE INDEX IF NOT EXISTS idx_guru_mapel_kelas ON public.guru_mapel(kelas);

-- ==============================================================================
-- 3. Row Level Security Policies
-- ==============================================================================
ALTER TABLE public.guru_mapel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on guru_mapel" ON public.guru_mapel;
CREATE POLICY "Allow public read access on guru_mapel"
    ON public.guru_mapel FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated or anon write access on guru_mapel" ON public.guru_mapel;
CREATE POLICY "Allow authenticated or anon write access on guru_mapel"
    ON public.guru_mapel FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant table privileges
GRANT ALL ON public.guru_mapel TO anon, authenticated, service_role;
GRANT SELECT ON public.guru_kelas TO anon, authenticated, service_role;

-- ==============================================================================
-- 4. Initial Seed Migration: Populate all 39 assignments from existing data
-- ==============================================================================
INSERT INTO public.guru_mapel (guru_id, nip, nama_guru, mapel_id, nama_mapel, mapel_singkat, kelas)
SELECT 
    g.id AS guru_id,
    g.nip,
    g.nama_guru,
    m.id AS mapel_id,
    m.nama_mata_pelajaran AS nama_mapel,
    split_part(m.nama_mata_pelajaran, '_', 2) AS mapel_singkat,
    m.kategori AS kelas
FROM public.data_guru g
CROSS JOIN LATERAL unnest(string_to_array(g.mata_pelajaran, ',')) AS raw_item
JOIN public.data_mapel m ON m.nama_mata_pelajaran = trim(raw_item)
WHERE g.mata_pelajaran IS NOT NULL AND trim(raw_item) <> ''
ON CONFLICT (nip, nama_mapel) DO NOTHING;

-- ==============================================================================
-- 5. Relational View: guru_kelas
-- ==============================================================================
CREATE OR REPLACE VIEW public.guru_kelas AS
SELECT DISTINCT guru_id, nip, nama_guru, kelas
FROM public.guru_mapel;

-- ==============================================================================
-- 6. Trigger for Auto-Sync from data_guru
-- (Ensures any Admin updates in AdminDataView keep guru_mapel 100% in sync)
-- ==============================================================================
CREATE OR REPLACE FUNCTION sync_guru_mapel_from_data_guru()
RETURNS TRIGGER AS $$
DECLARE
    item text;
    trimmed_item text;
    k text;
    m_id text;
BEGIN
    -- Remove old mappings for this guru
    DELETE FROM public.guru_mapel WHERE guru_id = NEW.id;

    -- Insert new mappings if mata_pelajaran exists
    IF NEW.mata_pelajaran IS NOT NULL AND trim(NEW.mata_pelajaran) <> '' THEN
        FOREACH item IN ARRAY string_to_array(NEW.mata_pelajaran, ',')
        LOOP
            trimmed_item := trim(item);
            IF trimmed_item <> '' THEN
                k := split_part(trimmed_item, '_', 1);
                SELECT id INTO m_id FROM public.data_mapel WHERE nama_mata_pelajaran = trimmed_item LIMIT 1;

                INSERT INTO public.guru_mapel (guru_id, nip, nama_guru, mapel_id, nama_mapel, mapel_singkat, kelas)
                VALUES (
                    NEW.id,
                    NEW.nip,
                    NEW.nama_guru,
                    m_id,
                    trimmed_item,
                    split_part(trimmed_item, '_', 2),
                    k
                )
                ON CONFLICT (nip, nama_mapel) DO UPDATE 
                SET guru_id = EXCLUDED.guru_id,
                    nama_guru = EXCLUDED.nama_guru,
                    mapel_id = EXCLUDED.mapel_id,
                    kelas = EXCLUDED.kelas;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_guru_mapel ON public.data_guru;
CREATE TRIGGER trg_sync_guru_mapel
AFTER INSERT OR UPDATE OF mata_pelajaran, nama_guru, nip ON public.data_guru
FOR EACH ROW
EXECUTE FUNCTION sync_guru_mapel_from_data_guru();

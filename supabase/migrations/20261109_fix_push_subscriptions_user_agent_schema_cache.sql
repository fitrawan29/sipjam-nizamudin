-- ============================================================================
-- SCRIPT REPARASI & RELOAD SCHEMA CACHE PUSH SUBSCRIPTIONS (user_agent & kolom terkait)
-- File: supabase/migrations/20261109_fix_push_subscriptions_user_agent_schema_cache.sql
--
-- MASALAH:
-- Error PostgREST PGRST204:
-- "Could not find the 'user_agent' column of 'push_subscriptions' in the schema cache"
-- Terjadi ketika tabel push_subscriptions belum memiliki kolom user_agent
-- (misalnya instance yang diinisialisasi dari template lama / SETUP_NEW_SCHOOL_TEMPLATE.sql)
-- atau PostgREST belum memuat ulang skema database ke memori cache PostgREST.
--
-- PANDUAN EKSEKUSI DI SUPABASE SQL EDITOR:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard/project/<project-ref>).
-- 2. Pada panel navigasi sebelah kiri, klik menu "SQL Editor".
-- 3. Klik tombol "+ New Query".
-- 4. Salin (copy) seluruh isi file script SQL ini dan tempel (paste) ke editor.
-- 5. Klik tombol "Run" (atau tekan Ctrl + Enter).
-- 6. Status akan menunjukkan "Success. No rows returned".
-- 7. Perintah NOTIFY pgrst, 'reload schema' di baris terakhir akan secara otomatis
--    merefresh PostgREST schema cache seketika tanpa downtime.
-- ============================================================================

-- 1. Pastikan kolom user_agent dan kolom pelengkap pada public.push_subscriptions tersedia (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
        -- Tambahkan kolom user_agent untuk menyimpan informasi perangkat/browser
        ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_agent TEXT;

        -- Tambahkan kolom identitas pengguna & metadata jika belum ada
        ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_nama TEXT;
        ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_role TEXT;
        ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
        ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

        -- Pastikan sekolah_id dapat bernilai NULL (agar mendukung akun Superadmin)
        ALTER TABLE public.push_subscriptions ALTER COLUMN sekolah_id DROP NOT NULL;
    END IF;
END $$;

-- 2. Pastikan endpoint memiliki constraint UNIQUE agar operasi upsert berhasil
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.push_subscriptions'::regclass
              AND contype = 'u'
        ) THEN
            BEGIN
                ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
            EXCEPTION WHEN OTHERS THEN
                -- Abaikan jika constraint dengan nama lain sudah mencakup endpoint
                NULL;
            END;
        END IF;
    END IF;
END $$;

-- 3. Pastikan index untuk performa query tersedia
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_sekolah ON public.push_subscriptions(sekolah_id);

-- 4. REFRESH SCHEMA CACHE POSTGREST SECARA INSTAN
-- Mengirimkan sinyal NOTIFY ke listener internal PostgREST Supabase
-- agar schema cache dimuat ulang segera tanpa restart instance.
NOTIFY pgrst, 'reload schema';

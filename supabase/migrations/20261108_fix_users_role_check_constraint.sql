-- ============================================================================
-- SCRIPT REPARASI DATABASE: HAPUS CONSTRAINT users_role_check
-- File: supabase/migrations/20261108_fix_users_role_check_constraint.sql
--
-- MASALAH:
-- Gagal Mengubah Role: new row for relation "users" violates check constraint "users_role_check"
--
-- PENYEBAB:
-- Tabel public.users memiliki check constraint lama (users_role_check) yang membatasi
-- nilai kolom role hanya pada ('Superadmin', 'Admin', 'Guru', 'Piket', 'Wali Kelas').
-- Ketika role akun diubah menjadi 'tata_usaha' atau membuat akun Tata Usaha, PostgreSQL
-- menolaknya karena nilai 'tata_usaha' belum terdaftar di constraint tersebut.
--
-- CARA MENJALANKAN DI SUPABASE DASHBOARD:
-- 1. Buka Supabase Dashboard proyek Anda (https://supabase.com/dashboard/project/<project-ref>).
-- 2. Pilih menu "SQL Editor" pada panel bilah sisi kiri.
-- 3. Klik tombol "+ New query".
-- 4. Salin seluruh teks perintah SQL di bawah ini dan tempel di editor.
-- 5. Klik tombol "Run" (atau tekan Ctrl + Enter).
-- 6. Notifikasi "Success. No rows returned" akan muncul menandakan constraint berhasil dihapus.
-- ============================================================================

-- 1. Hapus constraint users_role_check pada tabel public.users jika masih ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

-- 2. Lepaskan constraint check lain yang mengecek kolom role pada public.users jika ada
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) ILIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 3. Muat ulang PostgREST schema cache agar perubahan langsung aktif
NOTIFY pgrst, 'reload schema';

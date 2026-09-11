-- Migration: 20260912_standardize_riski_jadwal.sql
-- Description: Standardize teacher spelling from 'Rizki' to 'Riski' in jadwal_pelajaran to match users table and guru_mapel.

UPDATE public.jadwal_pelajaran
SET nama_guru = 'Riski'
WHERE nama_guru = 'Rizki';

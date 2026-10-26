-- 20261026_cleanup_test_guru_presensi.sql
-- Pembersihan data tiruan / uji coba 'Test Guru' pada presensi_guru dan tabel terkait

DELETE FROM public.presensi_guru 
WHERE nama_guru ILIKE '%test guru%' 
   OR nama_guru ILIKE '%dummy automated test guru%';

-- Pastikan tidak ada data uji coba tersisa di data_guru
DELETE FROM public.data_guru 
WHERE nama_guru ILIKE '%test guru%' 
   OR nama_guru ILIKE '%dummy automated test guru%';

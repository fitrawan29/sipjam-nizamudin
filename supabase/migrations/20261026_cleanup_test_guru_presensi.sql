-- 20261026_cleanup_test_guru_presensi.sql
-- Pembersihan data tiruan / uji coba 'Test Guru' pada presensi_guru dan tabel terkait

DELETE FROM public.presensi_guru 
WHERE nama_guru ILIKE '%test guru%' 
   OR nama_guru ILIKE '%guru test%'
   OR nama_guru ILIKE '%test%guru%'
   OR nama_guru ILIKE '%guru%test%'
   OR nama_guru ILIKE '%guru tester%'
   OR nama_guru ILIKE '%guru testing%'
   OR nama_guru ILIKE '%guru uji%'
   OR nama_guru ILIKE '%guru dummy%'
   OR nama_guru ILIKE '%dummy guru%'
   OR nama_guru ILIKE '%dummy automated test guru%';

-- Pastikan tidak ada data uji coba tersisa di data_guru
DELETE FROM public.data_guru 
WHERE nama_guru ILIKE '%test guru%' 
   OR nama_guru ILIKE '%guru test%'
   OR nama_guru ILIKE '%test%guru%'
   OR nama_guru ILIKE '%guru%test%'
   OR nama_guru ILIKE '%guru tester%'
   OR nama_guru ILIKE '%guru testing%'
   OR nama_guru ILIKE '%guru uji%'
   OR nama_guru ILIKE '%guru dummy%'
   OR nama_guru ILIKE '%dummy guru%'
   OR nama_guru ILIKE '%dummy automated test guru%';

-- Pembersihan data uji coba pada jurnal pembelajaran
DELETE FROM public.jurnal_pembelajaran 
WHERE nama_guru ILIKE '%test guru%' 
   OR nama_guru ILIKE '%guru test%'
   OR nama_guru ILIKE '%test%guru%'
   OR nama_guru ILIKE '%guru%test%'
   OR nama_guru ILIKE '%guru tester%'
   OR nama_guru ILIKE '%guru testing%'
   OR nama_guru ILIKE '%guru uji%'
   OR nama_guru ILIKE '%guru dummy%'
   OR nama_guru ILIKE '%dummy guru%'
   OR nama_guru ILIKE '%dummy automated test guru%';

-- Pembersihan data uji coba pada laporan piket
DELETE FROM public.laporan_piket 
WHERE guru_pelapor ILIKE '%test guru%' 
   OR guru_pelapor ILIKE '%guru test%'
   OR guru_pelapor ILIKE '%test%guru%'
   OR guru_pelapor ILIKE '%guru%test%'
   OR guru_pelapor ILIKE '%guru tester%'
   OR guru_pelapor ILIKE '%guru testing%'
   OR guru_pelapor ILIKE '%guru uji%'
   OR guru_pelapor ILIKE '%guru dummy%'
   OR guru_pelapor ILIKE '%dummy guru%'
   OR guru_pelapor ILIKE '%dummy automated test guru%';

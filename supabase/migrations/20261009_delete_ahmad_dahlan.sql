-- Hapus user dari database (users, data_guru, data_siswa)
DELETE FROM public.users WHERE nama ILIKE '%ahmad dahlan%' OR nama ILIKE '%ahmad zainudin%' OR nama ILIKE '%ahmad hidayat%';
DELETE FROM public.data_guru WHERE nama_guru ILIKE '%ahmad dahlan%' OR nama_guru ILIKE '%ahmad zainudin%' OR nama_guru ILIKE '%ahmad hidayat%';
DELETE FROM public.data_siswa WHERE nama_siswa ILIKE '%ahmad dahlan%' OR nama_siswa ILIKE '%ahmad zainudin%' OR nama_siswa ILIKE '%ahmad hidayat%';

/**
 * Mock Data & Test Fixtures for SIPJAM E2E Testing Suite
 */

export const MOCK_SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';

export const MOCK_TEACHERS = [
  {
    id: 'usr-001',
    nama: 'Ade Fitrawan Ibrahim',
    username: 'adefitrawan',
    role: 'Guru',
    sekolah_id: MOCK_SEKOLAH_ID,
    mata_pelajaran: 'Matematika',
    status: 'Aktif'
  },
  {
    id: 'usr-002',
    nama: 'Budi Santoso, S.Pd',
    username: 'budisantoso',
    role: 'Guru',
    sekolah_id: MOCK_SEKOLAH_ID,
    mata_pelajaran: 'Bahasa Indonesia',
    status: 'Aktif'
  },
  {
    id: 'usr-003',
    nama: 'Citra Dewi, M.Pd',
    username: 'citradewi',
    role: 'Guru',
    sekolah_id: MOCK_SEKOLAH_ID,
    mata_pelajaran: 'Bahasa Inggris',
    status: 'Aktif'
  },
  {
    id: 'usr-admin',
    nama: 'Admin Sekolah Nizamudin',
    username: 'admin',
    role: 'Admin',
    sekolah_id: MOCK_SEKOLAH_ID,
    status: 'Aktif'
  }
];

export const MOCK_PENGATURAN = {
  sekolah_id: MOCK_SEKOLAH_ID,
  jam_masuk_mulai: '06:30',
  jam_masuk_akhir: '07:30',
  jam_pulang_mulai: '14:00',
  jam_pulang_akhir: '22:00',
  jam_pulang_jumat: '11:30',
  aturan_kehadiran_guru: 'Semua_Hari',
  lat_sekolah: -5.147665,
  lng_sekolah: 119.432731,
  radius_meter: 150
};

export const MOCK_JADWAL = [
  {
    id: 'jdw-001',
    sekolah_id: MOCK_SEKOLAH_ID,
    hari: 'Senin',
    kelas: 'VII A',
    nama_guru: 'Ade Fitrawan Ibrahim',
    mata_pelajaran: 'Matematika',
    jam_mulai: '07:30',
    jam_selesai: '09:00'
  },
  {
    id: 'jdw-002',
    sekolah_id: MOCK_SEKOLAH_ID,
    hari: 'Senin',
    kelas: 'VII B',
    nama_guru: 'Ade Fitrawan Ibrahim',
    mata_pelajaran: 'Matematika',
    jam_mulai: '09:15',
    jam_selesai: '10:45'
  },
  {
    id: 'jdw-003',
    sekolah_id: MOCK_SEKOLAH_ID,
    hari: 'Selasa',
    kelas: 'VIII A',
    nama_guru: 'Budi Santoso, S.Pd',
    mata_pelajaran: 'Bahasa Indonesia',
    jam_mulai: '08:00',
    jam_selesai: '09:30'
  }
];

export const MOCK_SISWA = [
  { id: 'sis-001', nisn: '0012345671', nama_siswa: 'Ahmad Fauzan', kelas: 'VII A', status: 'Aktif', gender: 'Laki-laki', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'sis-002', nisn: '0012345672', nama_siswa: 'Aisyah Putri', kelas: 'VII A', status: 'Aktif', gender: 'Perempuan', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'sis-003', nisn: '0012345673', nama_siswa: 'Bayu Saputra', kelas: 'VII B', status: 'Aktif', gender: 'Laki-laki', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'sis-004', nisn: '0012345674', nama_siswa: 'Cindy Claudia', kelas: 'VII B', status: 'Lulus', gender: 'Perempuan', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'sis-005', nisn: '0012345675', nama_siswa: 'Dimas Ardiansyah', kelas: 'VIII A', status: 'Pindah', gender: 'Laki-laki', sekolah_id: MOCK_SEKOLAH_ID }
];

export const MOCK_WALI_KELAS = [
  { id: 'wk-001', kelas: 'VII A', nama_guru: 'Ade Fitrawan Ibrahim', tahun_ajaran: '2026/2027', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'wk-002', kelas: 'VII B', nama_guru: 'Budi Santoso, S.Pd', tahun_ajaran: '2026/2027', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'wk-003', kelas: 'VIII A', nama_guru: 'Citra Dewi, M.Pd', tahun_ajaran: '2026/2027', sekolah_id: MOCK_SEKOLAH_ID }
];

export const MOCK_MAPEL = [
  { id: 'mpl-001', nama_mata_pelajaran: 'Matematika', kategori: 'Muatan Umum', kelompok: 'A', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'mpl-002', nama_mata_pelajaran: 'Bahasa Indonesia', kategori: 'Muatan Umum', kelompok: 'A', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'mpl-003', nama_mata_pelajaran: 'Pendidikan Agama Islam', kategori: 'Pendidikan Karakter', kelompok: 'B', sekolah_id: MOCK_SEKOLAH_ID }
];

export const MOCK_KALENDER = [
  { id: 'kal-001', tanggal: '2026-08-17', tipe: 'Libur', keterangan: 'Hari Kemerdekaan RI', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'kal-002', tanggal_mulai: '2026-09-15', tanggal_selesai: '2026-09-20', tipe: 'Ujian', keterangan: 'Penilaian Tengah Semester', sekolah_id: MOCK_SEKOLAH_ID },
  { id: 'kal-003', tanggal: '2026-10-01', tipe: 'Kegiatan', keterangan: 'Upacara Kesaktian Pancasila', sekolah_id: MOCK_SEKOLAH_ID }
];

export function isOrangTuaRole(role?: string | null): boolean {
  const norm = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  return norm === 'orangtua' || norm === 'walimurid';
}

export function expandDateRange(startDate: string, endDate: string, maxDays = 30): string[] {
  if (!startDate) return [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${(endDate || startDate)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const effectiveEnd = end < start ? start : end;

  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= effectiveEnd && dates.length < maxDays) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function buildAbsensiRowsFromIzin(params: {
  sekolahId: string;
  siswaId: string;
  nisn: string;
  namaSiswa: string;
  kelas: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: 'Izin' | 'Sakit' | string;
  alasan: string;
  diubahOleh: string;
}) {
  const dates = expandDateRange(params.tanggalMulai, params.tanggalSelesai);
  return dates.map((tanggal) => ({
    sekolah_id: params.sekolahId,
    siswa_id: params.siswaId,
    nisn: params.nisn || '-',
    nama_siswa: params.namaSiswa,
    kelas: params.kelas,
    tanggal,
    status: params.jenis === 'Sakit' ? 'Sakit' : 'Izin',
    keterangan: `Izin Online Orang Tua: ${params.alasan}`,
    diubah_oleh: params.diubahOleh,
    sumber_perubahan: 'Izin Orang Tua',
  }));
}

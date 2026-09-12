'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr } from '@/lib/wita';
import { transformGoogleDriveUrl, getGoogleDriveThumbnailUrl } from '@/lib/imageUrl';
import { PrintHeader, PrintSignature, PrintOrientationToggle, formatPeriodHeader } from './PrintHeader';

export default function RekapJurnalView({ user }: { user: any }) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [bulan, setBulan] = useState(() => {
    return getWitaDateStr().substring(0, 7);
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  const [search, setSearch] = useState('');
  
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [jurnalData, setJurnalData] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const { data: siswa } = await supabase.from('data_siswa').select('kelas');
        if (siswa) {
          const uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas).filter(Boolean))) as string[];
          setKelasList(uniqueKelas);
        }

        const { data: mData } = await supabase.from('data_mapel').select('nama_mata_pelajaran');
        if (mData) {
          const uniqueMapel = Array.from(new Set(mData.map(m => m.nama_mata_pelajaran).filter(Boolean))) as string[];
          setMapelList(uniqueMapel);
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchMaster();
  }, []);

  // Auto-fetch on mount for current month
  useEffect(() => {
    tarikRekap();
  }, []);

  const tarikRekap = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .eq('nama_guru', user.nama)
        .order('tanggal', { ascending: false });

      if (startDate && endDate) {
        query = query.gte('tanggal', startDate).lte('tanggal', endDate);
      } else if (bulan) {
        const year = parseInt(bulan.split('-')[0], 10);
        const month = parseInt(bulan.split('-')[1], 10);
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte('tanggal', firstDay).lte('tanggal', lastDayStr);
      }

      if (kelas) query = query.eq('kelas', kelas);
      if (mapel) query = query.eq('mapel', mapel);

      const { data } = await query;
      setJurnalData(data || []);
    } catch (error) {
      console.error('Error loading jurnal rekap:', error);
    } finally {
      setLoading(false);
    }
  };

  function formatHariTanggal(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch (_) {}
    return dateStr;
  }

  function formatAbsensi(rawAbsensi?: string, detailAbsen?: string): string {
    if (!rawAbsensi && !detailAbsen) return 'Semua Hadir';
    if (rawAbsensi && typeof rawAbsensi === 'string' && rawAbsensi.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawAbsensi);
        const counts = { H: 0, S: 0, I: 0, A: 0 };
        Object.values(parsed).forEach((v: any) => {
          const code = String(v).trim().toUpperCase() as 'H' | 'S' | 'I' | 'A';
          if (counts[code] !== undefined) counts[code]++;
        });
        return `Hadir: ${counts.H}, Sakit: ${counts.S}, Izin: ${counts.I}, Alpa: ${counts.A}`;
      } catch (_) {}
    }
    if (rawAbsensi && rawAbsensi.includes('|')) {
      return rawAbsensi.replace(/\|/g, ' · ');
    }
    return detailAbsen || rawAbsensi || 'Semua Hadir';
  }

  const filteredJurnal = (jurnalData || []).filter(j => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (j.materi && j.materi.toLowerCase().includes(s)) ||
      (j.materi_pembelajaran && j.materi_pembelajaran.toLowerCase().includes(s)) ||
      (j.tujuan_pembelajaran && j.tujuan_pembelajaran.toLowerCase().includes(s)) ||
      (j.kegiatan && j.kegiatan.toLowerCase().includes(s)) ||
      (j.kelas && j.kelas.toLowerCase().includes(s)) ||
      (j.mapel && j.mapel.toLowerCase().includes(s)) ||
      (j.tanggal && j.tanggal.toLowerCase().includes(s)) ||
      (j.kehadiran_murid && j.kehadiran_murid.toLowerCase().includes(s)) ||
      (j.catatan_refleksi && j.catatan_refleksi.toLowerCase().includes(s))
    );
  });

  const totalJurnal = jurnalData?.length || 0;
  const totalDisetujui = jurnalData?.filter(j => j.status_verifikasi === 'Disetujui').length || 0;
  const totalMenunggu = jurnalData?.filter(j => !j.status_verifikasi || j.status_verifikasi === 'Menunggu').length || 0;
  const totalDitolak = jurnalData?.filter(j => j.status_verifikasi === 'Ditolak').length || 0;

  return (
    <section id="view-guru-rekap-jurnal" className="view-section fade-in">
        <div className="glass-card p-4">
            <PrintHeader />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 no-print">
              <i className="fa-solid fa-book-open text-indigo-500 dark:text-indigo-400 text-base"></i> Rekap Jurnal Pribadi
            </h2>

            {/* Summary Metric Cards */}
            {jurnalData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Total Jurnal</div>
                      <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalJurnal}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-green-800 dark:text-green-300">Disetujui</div>
                      <div className="text-xl font-black text-green-600 dark:text-green-400">{totalDisetujui}</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-yellow-800 dark:text-yellow-300">Menunggu</div>
                      <div className="text-xl font-black text-yellow-600 dark:text-yellow-400">{totalMenunggu}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-3 rounded-xl text-center">
                      <div className="text-xs font-bold text-red-800 dark:text-red-300">Ditolak</div>
                      <div className="text-xl font-black text-red-600 dark:text-red-400">{totalDitolak}</div>
                  </div>
              </div>
            )}

            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 space-y-3 no-print">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">PILIH BULAN</label>
                      <input
                        type="month"
                        value={bulan}
                        onChange={e => {
                          setBulan(e.target.value);
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">DARI TANGGAL (OPSIONAL)</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">SAMPAI TANGGAL (OPSIONAL)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">KELAS / ANGKATAN</label>
                      <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800">
                        <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">Semua Kelas</option>
                        {kelasList.map((k, i) => <option key={i} value={k} className="text-gray-900 dark:text-white dark:bg-gray-800">{k}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">MATA PELAJARAN</label>
                      <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800">
                        <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">Semua Mapel</option>
                        {mapelList.map((m, i) => <option key={i} value={m} className="text-gray-900 dark:text-white dark:bg-gray-800">{m}</option>)}
                      </select>
                    </div>
                </div>
                <button type="button" onClick={tarikRekap} disabled={loading} className="btn-click w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-search text-sm"></i>} Tampilkan Rekap
                </button>
            </div>

            {/* Search Filter Bar */}
            {jurnalData && jurnalData.length > 0 && (
              <div className="mb-4 no-print flex items-center gap-2">
                  <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        placeholder="Cari materi, kegiatan, kelas, atau mapel..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      />
                  </div>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="px-3 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold"
                    >
                      Reset
                    </button>
                  )}
              </div>
            )}
            
            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
                Rekapitulasi Jurnal Pembelajaran Guru
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
                <span>Guru: <strong>{user?.nama || '-'}</strong></span>
                <span><strong>{formatPeriodHeader(bulan, startDate, endDate)}</strong></span>
                {kelas && <span>Kelas: <strong>{kelas}</strong></span>}
                {mapel && <span>Mapel: <strong>{mapel}</strong></span>}
              </div>
            </div>

            {/* Print Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 no-print">
              <PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />
              {filteredJurnal && filteredJurnal.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Menampilkan {filteredJurnal.length} entri jurnal
                </div>
              )}
            </div>

            <div id="hasil-rekap-jurnal-guru" className="min-h-[150px]">
                {!jurnalData && !loading && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic col-span-full no-print">Silakan atur filter dan klik tampilkan.</div>
                )}
                {jurnalData && filteredJurnal.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic col-span-full no-print">
                    {search ? 'Tidak ada jurnal yang sesuai dengan kata kunci pencarian.' : 'Tidak ada jurnal ditemukan untuk filter tersebut.'}
                  </div>
                )}
                {jurnalData && filteredJurnal.length > 0 && (
                  <div className="overflow-x-auto w-full my-4 rounded-xl border border-gray-200 dark:border-gray-700 print:border-black print:overflow-visible">
                    <table className="w-full text-left text-xs border-collapse border border-gray-200 dark:border-gray-700 print:border-black print:text-[8pt]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-200 print:text-black print:border-black">
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Hari, tanggal bulan tahun</th>
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Kelas, pertemuan dan jam ke-</th>
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Tujuan pembelajaran</th>
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Materi pembelajaran</th>
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Kegiatan pembelajaran</th>
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Kehadiran murid</th>
                          <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Catatan refleksi</th>
                          <th className="p-0 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Foto kegiatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJurnal.map((j: any, index: number) => {
                          const fotoUrl = j.foto_kegiatan || j.link_bukti_foto;
                          const hasFoto = fotoUrl && fotoUrl !== '-' && fotoUrl.trim() !== '';

                          return (
                            <tr 
                              key={j.id || index}
                              className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent"
                            >
                              {/* 1. Hari, tanggal bulan tahun */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium align-top">
                                {formatHariTanggal(j.tanggal)}
                              </td>

                              {/* 2. Kelas, pertemuan dan jam ke- */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                <div className="font-bold text-gray-900 dark:text-white print:text-black">{j.kelas || '-'}</div>
                                <div className="text-[11px] print:text-[8pt] text-gray-600 dark:text-gray-300 print:text-black">
                                  {j.pertemuan_ke ? `Pertemuan ke-${j.pertemuan_ke}` : '-'}
                                </div>
                                <div className="text-[10px] print:text-[7pt] text-gray-500 dark:text-gray-400 print:text-black">
                                  {j.jam_ke ? `Jam ke-${j.jam_ke}` : '-'}
                                </div>
                                {j.mapel && j.mapel !== '-' && (
                                  <div className="text-[10px] print:text-[7pt] font-semibold text-blue-600 dark:text-blue-400 print:text-black mt-0.5">
                                    ({j.mapel})
                                  </div>
                                )}
                              </td>

                              {/* 3. Tujuan pembelajaran */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                {j.tujuan_pembelajaran || '-'}
                              </td>

                              {/* 4. Materi pembelajaran */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top font-medium whitespace-pre-wrap">
                                {j.materi_pembelajaran || j.materi || '-'}
                              </td>

                              {/* 5. Kegiatan pembelajaran */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                {j.kegiatan || '-'}
                              </td>

                              {/* 6. Kehadiran murid */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top">
                                {j.kehadiran_murid || formatAbsensi(j.absensi_siswa, j.detail_absen)}
                              </td>

                              {/* 7. Catatan refleksi */}
                              <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap italic">
                                {j.catatan_refleksi || j.refleksi || '-'}
                              </td>

                              {/* 8. Foto kegiatan */}
                              <td className="p-1 print:p-0 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                {hasFoto ? (
                                  <div className="flex flex-col items-center justify-center gap-1 print:block print:w-full print:h-full">
                                    <img
                                      src={getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)}
                                      alt="Foto Kegiatan"
                                      loading="eager"
                                      referrerPolicy="no-referrer"
                                      className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-[70px] print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src !== transformGoogleDriveUrl(fotoUrl)) {
                                          target.src = transformGoogleDriveUrl(fotoUrl);
                                        } else {
                                          target.style.display = 'none';
                                        }
                                      }}
                                    />
                                    <a
                                      href={fotoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-semibold no-print inline-flex items-center gap-0.5"
                                    >
                                      <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> Lihat
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-[10px] italic">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>

            <PrintSignature
              leftTitle="Mengetahui,"
              leftSubtitle="Guru Mata Pelajaran"
              leftName={user?.nama}
              leftNip={user?.nip}
            />

            {jurnalData && jurnalData.length > 0 && (
              <div id="btn-group-jurnal-guru" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 fade-in no-print">
                  <button type="button" onClick={() => {
                    if (!filteredJurnal || filteredJurnal.length === 0) return;
                    const headers = [
                      'Hari, tanggal bulan tahun',
                      'Kelas, pertemuan dan jam ke-',
                      'Tujuan pembelajaran',
                      'Materi pembelajaran',
                      'Kegiatan pembelajaran',
                      'Kehadiran murid',
                      'Catatan refleksi',
                      'Foto kegiatan',
                      'Status Verifikasi'
                    ];
                    const csvRows = [headers.map(h => `"${h}"`).join(',')];
                    filteredJurnal.forEach((j: any) => {
                      const col1 = formatHariTanggal(j.tanggal);
                      const col2 = `${j.kelas || '-'}${j.pertemuan_ke ? ` | Pertemuan: ${j.pertemuan_ke}` : ''}${j.jam_ke ? ` | Jam: ${j.jam_ke}` : ''}${j.mapel ? ` (${j.mapel})` : ''}`;
                      const col3 = j.tujuan_pembelajaran || '-';
                      const col4 = j.materi_pembelajaran || j.materi || '-';
                      const col5 = j.kegiatan || '-';
                      const col6 = j.kehadiran_murid || formatAbsensi(j.absensi_siswa, j.detail_absen);
                      const col7 = j.catatan_refleksi || j.refleksi || '-';
                      const col8 = j.foto_kegiatan || j.link_bukti_foto || '-';
                      const status = j.status_verifikasi || 'Menunggu';

                      csvRows.push([
                        `"${col1.replace(/"/g, '""')}"`,
                        `"${col2.replace(/"/g, '""')}"`,
                        `"${col3.replace(/"/g, '""')}"`,
                        `"${col4.replace(/"/g, '""')}"`,
                        `"${col5.replace(/"/g, '""')}"`,
                        `"${col6.replace(/"/g, '""')}"`,
                        `"${col7.replace(/"/g, '""')}"`,
                        `"${col8.replace(/"/g, '""')}"`,
                        `"${status.replace(/"/g, '""')}"`
                      ].join(','));
                    });
                    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Rekap_Jurnal_${user.nama}_${bulan}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }} className="btn-click w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                    <i className="fa-solid fa-file-excel text-sm"></i> Excel
                  </button>
                  <button type="button" onClick={() => window.print()} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                    <i className="fa-solid fa-print text-sm"></i> Cetak Dokumen
                  </button>
              </div>
            )}
        </div>
    </section>
  );
}


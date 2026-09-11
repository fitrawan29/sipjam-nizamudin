'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr } from '@/lib/wita';
import { PrintHeader, PrintSignature } from './PrintHeader';

export default function RekapJurnalView({ user }: { user: any }) {
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
      (j.kegiatan && j.kegiatan.toLowerCase().includes(s)) ||
      (j.kelas && j.kelas.toLowerCase().includes(s)) ||
      (j.mapel && j.mapel.toLowerCase().includes(s)) ||
      (j.tanggal && j.tanggal.toLowerCase().includes(s))
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-book-open text-indigo-500 dark:text-indigo-400 no-print text-base"></i> Rekap Jurnal Pribadi
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
            
            <div id="hasil-rekap-jurnal-guru" className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[150px]">
                {!jurnalData && !loading && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic col-span-full no-print">Silakan atur filter dan klik tampilkan.</div>
                )}
                {jurnalData && filteredJurnal.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic col-span-full no-print">
                    {search ? 'Tidak ada jurnal yang sesuai dengan kata kunci pencarian.' : 'Tidak ada jurnal ditemukan untuk filter tersebut.'}
                  </div>
                )}
                {filteredJurnal.map((j: any) => (
                  <div key={j.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-xs text-indigo-700 dark:text-indigo-400">{j.tanggal}</div>
                      <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          j.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          j.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{j.status_verifikasi || 'Menunggu'}</div>
                    </div>
                    <div className="text-[11px] text-gray-900 dark:text-white font-semibold">{j.kelas} - {j.mapel}</div>
                    <div className="text-[10px] text-gray-700 dark:text-gray-300">
                      <p><span className="font-semibold text-gray-900 dark:text-white">Materi:</span> {j.materi}</p>
                      <p><span className="font-semibold text-gray-900 dark:text-white">Kegiatan:</span> {j.kegiatan}</p>
                      {j.refleksi && <p><span className="font-semibold text-gray-900 dark:text-white">Refleksi:</span> {j.refleksi}</p>}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] font-bold text-gray-900 dark:text-white mb-1">Absensi Siswa:</p>
                      <p className="text-[10px] text-gray-700 dark:text-gray-300 font-medium">
                        {formatAbsensi(j.absensi_siswa, j.detail_absen)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            <PrintSignature />

            {jurnalData && jurnalData.length > 0 && (
              <div id="btn-group-jurnal-guru" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 fade-in no-print">
                  <button type="button" onClick={() => {
                    if (!filteredJurnal || filteredJurnal.length === 0) return;
                    const headers = ['Tanggal', 'Kelas', 'Mapel', 'Materi', 'Kegiatan', 'Absensi Siswa', 'Status'];
                    const csvRows = [headers.join(',')];
                    filteredJurnal.forEach((j: any) => {
                      const cleanAbsensi = formatAbsensi(j.absensi_siswa, j.detail_absen);
                      csvRows.push([
                        j.tanggal,
                        `"${j.kelas}"`,
                        `"${j.mapel}"`,
                        `"${(j.materi||'').replace(/"/g, '""')}"`,
                        `"${(j.kegiatan||'').replace(/"/g, '""')}"`,
                        `"${cleanAbsensi.replace(/"/g, '""')}"`,
                        j.status_verifikasi||'Menunggu'
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


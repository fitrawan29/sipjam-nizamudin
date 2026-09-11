'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RekapJurnalView({ user }: { user: any }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [jurnalData, setJurnalData] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const { data: siswa } = await supabase.from('data_siswa').select('kelas');
        if (siswa) {
          const uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas).filter(Boolean)));
          setKelasList(uniqueKelas as string[]);
        }

        const { data: mData } = await supabase.from('data_mapel').select('nama_mata_pelajaran');
        if (mData) {
          const uniqueMapel = Array.from(new Set(mData.map(m => m.nama_mata_pelajaran).filter(Boolean)));
          setMapelList(uniqueMapel as string[]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchMaster();
  }, []);

  const tarikRekap = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .eq('nama_guru', user.nama)
        .order('tanggal', { ascending: false });

      if (startDate) query = query.gte('tanggal', startDate);
      if (endDate) query = query.lte('tanggal', endDate);
      if (kelas) query = query.eq('kelas', kelas);
      if (mapel) query = query.eq('mapel', mapel);

      const { data } = await query;
      setJurnalData(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="view-guru-rekap-jurnal" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-book-open text-indigo-500 dark:text-indigo-400"></i> Rekap Jurnal Pribadi
            </h2>
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">DARI TANGGAL</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">SAMPAI TANGGAL</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800 dark:text-white" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">KELAS / ANGKATAN</label>
                      <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800 dark:text-white">
                        <option value="">Semua Kelas</option>
                        {kelasList.map((k, i) => <option key={i} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">MATA PELAJARAN</label>
                      <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800 dark:text-white">
                        <option value="">Semua Mapel</option>
                        {mapelList.map((m, i) => <option key={i} value={m}>{m}</option>)}
                      </select>
                    </div>
                </div>
                <button type="button" onClick={tarikRekap} disabled={loading} className="btn-click w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-search"></i>} Tampilkan Rekap
                </button>
            </div>
            
            <div id="hasil-rekap-jurnal-guru" className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[150px]">
                {!jurnalData && !loading && (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-[11px] italic col-span-full">Silakan atur filter dan klik tampilkan.</div>
                )}
                {jurnalData?.length === 0 && (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-[11px] italic col-span-full">Tidak ada jurnal ditemukan dengan filter tersebut.</div>
                )}
                {jurnalData?.map((j: any) => (
                  <div key={j.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-xs text-indigo-700 dark:text-indigo-400">{j.tanggal}</div>
                      <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          j.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          j.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{j.status_verifikasi || 'Menunggu'}</div>
                    </div>
                    <div className="text-[11px] text-gray-800 dark:text-gray-200 font-semibold">{j.kelas} - {j.mapel}</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400">
                      <p><span className="font-semibold text-gray-700 dark:text-gray-300">Materi:</span> {j.materi}</p>
                      <p><span className="font-semibold text-gray-700 dark:text-gray-300">Kegiatan:</span> {j.kegiatan}</p>
                      {j.refleksi && <p><span className="font-semibold text-gray-700 dark:text-gray-300">Refleksi:</span> {j.refleksi}</p>}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 mb-1">Absensi Siswa:</p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400">{j.absensi_siswa}</p>
                    </div>
                  </div>
                ))}
            </div>

            {jurnalData && jurnalData.length > 0 && (
              <div id="btn-group-jurnal-guru" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 fade-in">
                  <button type="button" onClick={() => {
                    if (!jurnalData || jurnalData.length === 0) return;
                    const headers = ['Tanggal', 'Kelas', 'Mapel', 'Materi', 'Kegiatan', 'Absensi', 'Status'];
                    const csvRows = [headers.join(',')];
                    jurnalData.forEach((j: any) => {
                      csvRows.push([j.tanggal, `"${j.kelas}"`, `"${j.mapel}"`, `"${(j.materi||'').replace(/"/g, '""')}"`, `"${(j.kegiatan||'').replace(/"/g, '""')}"`, `"${j.absensi_siswa||''}"`, j.status_verifikasi||'Menunggu'].join(','));
                    });
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Rekap_Jurnal_${user.nama}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }} className="btn-click w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                    <i className="fa-solid fa-file-excel"></i> Excel
                  </button>
                  <button type="button" onClick={() => window.print()} className="btn-click w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                    <i className="fa-solid fa-print"></i> Cetak Dokumen
                  </button>
              </div>
            )}
        </div>
    </section>
  );
}

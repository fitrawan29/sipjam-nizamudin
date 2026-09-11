'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RekapSiswaView({ user }: { user: any }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');

  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [rekapData, setRekapData] = useState<any[] | null>(null);

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
    if (!kelas) {
      alert("Pilih kelas terlebih dahulu.");
      return;
    }
    setLoading(true);

    try {
      // Fetch siswa for this class
      const { data: siswa } = await supabase
        .from('data_siswa')
        .select('*')
        .eq('kelas', kelas)
        .order('nama_siswa', { ascending: true });

      // Fetch jurnal for this class & mapel within date
      let query = supabase
        .from('jurnal_pembelajaran')
        .select('absensi_siswa, detail_absen, tanggal')
        .eq('kelas', kelas);

      if (mapel) query = query.eq('mapel', mapel);
      if (startDate) query = query.gte('tanggal', startDate);
      if (endDate) query = query.lte('tanggal', endDate);

      const { data: jurnal } = await query;

      // Process rekap
      const rekapMap: Record<string, any> = {};
      siswa?.forEach(s => {
        rekapMap[s.nama_siswa] = { ...s, sakit: 0, izin: 0, alpa: 0 };
      });

      // Parse jurnal absences (assuming detail_absen contains string like "Sakit: Andi, Izin: Budi")
      // Note: Since data structure may vary, we try our best to match student names in the absensi field.
      jurnal?.forEach(j => {
        const text = `${j.absensi_siswa || ''} ${j.detail_absen || ''}`.toLowerCase();
        siswa?.forEach(s => {
          const nama = s.nama_siswa.toLowerCase();
          if (text.includes(nama)) {
            // simple heuristic
            if (text.includes(`sakit:`) && text.substring(text.indexOf(`sakit:`)).includes(nama)) {
              rekapMap[s.nama_siswa].sakit++;
            } else if (text.includes(`izin:`) && text.substring(text.indexOf(`izin:`)).includes(nama)) {
              rekapMap[s.nama_siswa].izin++;
            } else if (text.includes(`alpa:`) && text.substring(text.indexOf(`alpa:`)).includes(nama)) {
              rekapMap[s.nama_siswa].alpa++;
            } else {
              // default fallback if name is found but no specific reason parsed
              rekapMap[s.nama_siswa].alpa++; 
            }
          }
        });
      });

      setRekapData(Object.values(rekapMap));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="view-rekap-siswa" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-users-viewfinder text-teal-500"></i> Rekap Absen Siswa
            </h2>
            <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">DARI TANGGAL</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">SAMPAI TANGGAL</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">KELAS <span className="text-red-500">*</span></label>
                      <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800">
                        <option value="" disabled>Pilih...</option>
                        {kelasList.map((k, i) => <option key={i} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">MATA PELAJARAN</label>
                      <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800">
                        <option value="">Semua Mapel</option>
                        {mapelList.map((m, i) => <option key={i} value={m}>{m}</option>)}
                      </select>
                    </div>
                </div>
                <button type="button" onClick={tarikRekap} disabled={loading} className="btn-click w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-search"></i>} Tampilkan Rekap
                </button>
            </div>
            
            {rekapData ? (
              <div id="hasil-rekap-siswa" className="flex-col gap-3 fade-in">
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl custom-scroll bg-white dark:bg-gray-800 shadow-sm">
                      <table className="w-full text-[10px] text-left text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <thead className="text-[9px] text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 border-b dark:border-gray-700">No</th>
                              <th className="px-3 py-2 border-b dark:border-gray-700">NISN</th>
                              <th className="px-3 py-2 border-b dark:border-gray-700">Nama Siswa</th>
                              <th className="px-3 py-2 border-b dark:border-gray-700 text-center text-yellow-600">Sakit</th>
                              <th className="px-3 py-2 border-b dark:border-gray-700 text-center text-orange-600">Izin</th>
                              <th className="px-3 py-2 border-b dark:border-gray-700 text-center text-red-600">Alpa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rekapData.map((s, i) => (
                              <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-3 py-2">{i + 1}</td>
                                <td className="px-3 py-2">{s.nisn}</td>
                                <td className="px-3 py-2 font-bold text-gray-800 dark:text-gray-200">{s.nama_siswa}</td>
                                <td className="px-3 py-2 text-center font-bold">{s.sakit > 0 ? s.sakit : '-'}</td>
                                <td className="px-3 py-2 text-center font-bold">{s.izin > 0 ? s.izin : '-'}</td>
                                <td className="px-3 py-2 text-center font-bold text-red-500">{s.alpa > 0 ? s.alpa : '-'}</td>
                              </tr>
                            ))}
                            {rekapData.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-4 italic">Tidak ada data siswa untuk kelas tersebut.</td>
                              </tr>
                            )}
                          </tbody>
                      </table>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <button type="button" onClick={() => {
                        if (!rekapData || rekapData.length === 0) return;
                        const headers = ['No', 'NISN', 'Nama Siswa', 'Sakit', 'Izin', 'Alpa'];
                        const csvRows = [headers.join(',')];
                        rekapData.forEach((r: any, i: number) => {
                          csvRows.push([i+1, r.nisn||'', `"${r.nama_siswa}"`, r.sakit||0, r.izin||0, r.alpa||0].join(','));
                        });
                        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Siswa_${kelas}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }} className="btn-click w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                        <i className="fa-solid fa-file-excel"></i> Excel
                      </button>
                      <button type="button" onClick={() => window.print()} className="btn-click w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                        <i className="fa-solid fa-print"></i> Cetak Dokumen
                      </button>
                  </div>
              </div>
            ) : (
              <div id="rekap-siswa-kosong" className="text-center py-10 text-gray-400 text-[11px] italic">Silakan atur filter dan klik tampilkan.</div>
            )}
        </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay } from '@/lib/wita';

export default function AnalitikView({ user }: { user: any }) {
  const [bulan, setBulan] = useState(() => {
    return getWitaDateStr().substring(0, 7);
  });
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[] | null>(null);
  const [stats, setStats] = useState({ hadir: 0, izin: 0, dinasLuar: 0, jurnal: 0 });

  useEffect(() => {
    if (bulan) loadAnalitik();
  }, []);

  const loadAnalitik = async () => {
    setLoading(true);
    try {
      const year = parseInt(bulan.split('-')[0], 10);
      const month = parseInt(bulan.split('-')[1], 10);
      const start = getWitaStartOfDay(`${year}-${String(month).padStart(2, '0')}-01`);
      const lastDay = new Date(year, month, 0).getDate();
      const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const end = getWitaEndOfDay(lastDayStr);

      const { data: presensi } = await supabase
        .from('presensi_guru')
        .select('nama_guru, jenis_presensi')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('tipe_absen', 'Datang')
        .eq('status_verifikasi', 'Disetujui');

      const { data: jurnal } = await supabase
        .from('jurnal_pembelajaran')
        .select('nama_guru')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('status_verifikasi', 'Disetujui');

      // Aggregate stats
      let h = 0, i = 0, d = 0, jCount = jurnal?.length || 0;
      
      const lMap: Record<string, { hadir: number, jurnal: number }> = {};
      
      presensi?.forEach(p => {
        const nama = p.nama_guru;
        if (!lMap[nama]) lMap[nama] = { hadir: 0, jurnal: 0 };
        
        if (p.jenis_presensi === 'Sekolah') {
          h++;
          lMap[nama].hadir++;
        }
        else if (p.jenis_presensi === 'Izin') i++;
        else if (p.jenis_presensi === 'Dinas Luar') d++;
      });

      jurnal?.forEach(j => {
        const nama = j.nama_guru;
        if (!lMap[nama]) lMap[nama] = { hadir: 0, jurnal: 0 };
        lMap[nama].jurnal++;
      });

      setStats({ hadir: h, izin: i, dinasLuar: d, jurnal: jCount });

      // Calculate score
      const lArr = Object.keys(lMap).map(nama => {
        const data = lMap[nama];
        const score = (data.hadir * 10) + (data.jurnal * 5); // Dummy score logic
        return { nama, ...data, score };
      }).sort((a,b) => b.score - a.score).slice(0, 10);

      setLeaderboard(lArr);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalPresensi = stats.hadir + stats.izin + stats.dinasLuar;
  const pSeko = totalPresensi ? Math.round((stats.hadir / totalPresensi) * 100) : 0;
  const pIzin = totalPresensi ? Math.round((stats.izin / totalPresensi) * 100) : 0;
  const pDinas = totalPresensi ? Math.round((stats.dinasLuar / totalPresensi) * 100) : 0;

  return (
    <section id="view-analitik" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-rose-500 dark:text-rose-400"></i> Dasbor Analitik
                </h2>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 p-3 rounded-2xl mb-4 flex gap-2">
                <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="flex-grow px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <button type="button" onClick={loadAnalitik} disabled={loading} className="btn-click bg-rose-600 hover:bg-rose-700 text-white px-4 rounded-xl text-xs font-bold shadow-md border border-rose-700 transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rotate-right"></i>}
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-4">Statistik Global (Bulan Ini)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/50 text-center">
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">{stats.hadir}</div>
                    <div className="text-[9px] font-bold text-green-800 dark:text-green-500 uppercase tracking-wide mt-1">Total Hadir</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center">
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.jurnal}</div>
                    <div className="text-[9px] font-bold text-blue-800 dark:text-blue-500 uppercase tracking-wide mt-1">Total Jurnal</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-bold text-gray-700 dark:text-gray-200">
                      <span>Hadir Sekolah</span>
                      <span>{pSeko}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pSeko}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-bold text-gray-700 dark:text-gray-200">
                      <span>Izin / Sakit</span>
                      <span>{pIzin}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${pIzin}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-bold text-gray-700 dark:text-gray-200">
                      <span>Dinas Luar</span>
                      <span>{pDinas}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pDinas}%` }}></div>
                    </div>
                  </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-medal text-yellow-500 dark:text-yellow-400"></i> Papan Peringkat (Top 10)
                </h3>
                <div id="leaderboard-list" className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[150px]">
                    {!leaderboard && !loading && (
                      <div className="text-center py-5 text-xs text-gray-500 italic dark:text-gray-400 col-span-full">Pilih bulan dan klik proses...</div>
                    )}
                    {leaderboard?.length === 0 && (
                      <div className="text-center py-5 text-xs text-gray-500 italic dark:text-gray-400 col-span-full">Belum ada data untuk bulan ini.</div>
                    )}
                    {leaderboard?.map((l: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2.5 rounded-xl shadow-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          i === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          i === 1 ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                          i === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{l.nama}</h4>
                          <div className="text-xs text-gray-600 dark:text-gray-300 flex gap-2 mt-0.5">
                            <span><i className="fa-solid fa-check text-green-500 dark:text-green-400"></i> {l.hadir} Hadir</span>
                            <span><i className="fa-solid fa-book text-blue-500 dark:text-blue-400"></i> {l.jurnal} Jurnal</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-rose-500 dark:text-rose-400">{l.score}</div>
                          <div className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Poin</div>
                        </div>
                      </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
  );
}

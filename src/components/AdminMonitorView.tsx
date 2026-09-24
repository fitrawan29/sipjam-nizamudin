'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay, formatTimestampWita } from '@/lib/wita';
import { getAllTeachersDisciplineWarnings, TeacherWarningSummary } from '@/lib/warningSystem';

export default function AdminMonitorView({ user }: { user: any }) {
  const [date, setDate] = useState(() => {
    return getWitaDateStr();
  });
  const [search, setSearch] = useState('');
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [warningsList, setWarningsList] = useState<TeacherWarningSummary[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    loadData();
    loadWarnings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('realtime-presensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, payload => {
        // Reload data to ensure correctness with filters
        loadData();
        loadWarnings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  const loadWarnings = async () => {
    setWarningsLoading(true);
    try {
      const targetMonth = date.substring(0, 7);
      const summaries = await getAllTeachersDisciplineWarnings(user?.sekolah_id, targetMonth);
      setWarningsList(summaries.filter(s => s.hasWarning));
    } catch (err) {
      console.error('Error loading discipline warnings:', err);
    } finally {
      setWarningsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch data where timestamp is within the selected date
      const startOfDay = getWitaStartOfDay(date);
      const endOfDay = getWitaEndOfDay(date);

      const { data, error } = await supabase
        .from('presensi_guru')
        .select('*')
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        setPresensiList(data);
      }
    } catch (error) {
      console.error('Monitor load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = presensiList.filter(p => 
    p.nama_guru?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="view-admin-monitor" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-clock text-orange-500 dark:text-orange-400"></i> Pantauan Harian
                </h2>
                <button type="button" onClick={loadData} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/50 p-3 rounded-2xl mb-4">
                <label className="block text-xs font-bold text-orange-900 dark:text-orange-300 mb-1.5">
                  <i className="fa-regular fa-calendar"></i> Pantau Tanggal
                </label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama guru..." className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" />
            </div>

            {/* Peringatan Kedisiplinan Guru (3x Pelanggaran) Card (F7) - Redesigned */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-300/50 dark:border-red-900/40 p-3 rounded-xl mb-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i>
                  <div>
                    <h3 className="text-xs font-bold text-red-900 dark:text-red-200 uppercase tracking-wide">
                      Peringatan Kedisiplinan
                    </h3>
                    <p className="text-[9px] text-red-700/80 dark:text-red-400 mt-0.5">
                      (Evaluasi bulan {date.substring(0, 7)})
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  warningsList.length > 0 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300' 
                    : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                }`}>
                  {warningsList.length} Guru
                </span>
              </div>

              {warningsLoading ? (
                <div className="text-center py-2 text-[10px] text-gray-500 italic">
                  <i className="fa-solid fa-spinner animate-spin mr-1.5"></i> Memeriksa data kedisiplinan...
                </div>
              ) : warningsList.length === 0 ? (
                <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg text-[10px] text-green-700 dark:text-green-400 flex items-center gap-1.5 font-medium">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>Tidak ada guru yang mencapai batas pelanggaran 3x.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {warningsList.map((tw) => (
                    <div key={tw.teacherName} className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-gray-900 dark:text-white flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-red-500/70"></i>
                          {tw.teacherName}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {tw.warnings.map((w, wIdx) => (
                          <div key={wIdx} className="text-[10px] flex justify-between items-center bg-red-50/50 dark:bg-red-900/10 p-1.5 rounded-md">
                            <span className="text-gray-800 dark:text-gray-300"><strong className="text-red-700 dark:text-red-400">[{w.category}]</strong> {w.message}</span>
                            <span className="text-[9px] text-gray-500 font-mono whitespace-nowrap">{w.dates.slice(-2).join(', ')}{w.dates.length > 2 ? '...' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div id="monitor-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                {loading && presensiList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">Memuat data...</div>
                ) : filteredList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">
                    Tidak ada data presensi pada tanggal {date}.
                  </div>
                ) : (
                  filteredList.map((p: any) => (
                    <div key={p.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                      {p.tipe_absen === 'Datang' ? (
                        <div className="absolute top-0 right-0 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-[9px] font-bold px-2 py-1 rounded-bl-lg">DATANG</div>
                      ) : (
                        <div className="absolute top-0 right-0 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[9px] font-bold px-2 py-1 rounded-bl-lg">PULANG</div>
                      )}
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white mt-2">{p.nama_guru}</h3>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{formatTimestampWita(p.timestamp)}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          p.status_verifikasi === 'Disetujui' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          p.status_verifikasi === 'Ditolak' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{p.status_verifikasi || 'Menunggu'}</span>
                      </div>
                      <div className="text-xs text-gray-700 dark:text-white/90">
                        <span className="font-semibold">Jenis:</span> {p.jenis_presensi}
                        {p.detail_izin && <span> ({p.detail_izin})</span>}
                      </div>
                      {p.lokasi && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          <i className="fa-solid fa-location-dot"></i> {p.lokasi}
                        </div>
                      )}
                    </div>
                  ))
                )}
            </div>
        </div>
    </section>
  );
}

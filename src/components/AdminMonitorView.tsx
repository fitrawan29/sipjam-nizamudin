'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay, formatTimestampWita } from '@/lib/wita';

export default function AdminMonitorView({ user }: { user: any }) {
  const [date, setDate] = useState(() => {
    return getWitaDateStr();
  });
  const [search, setSearch] = useState('');
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    loadData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('realtime-presensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, payload => {
        // Reload data to ensure correctness with filters
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

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
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-clock text-orange-500"></i> Pantauan Harian
                </h2>
                <button type="button" onClick={loadData} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/50 p-3 rounded-2xl mb-4">
                <label className="block text-[11px] font-bold text-orange-800 dark:text-orange-400 mb-1.5">
                  <i className="fa-regular fa-calendar"></i> Pantau Tanggal
                </label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama guru..." className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-white" />
            </div>
            <div id="monitor-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                {loading && presensiList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Memuat data...</div>
                ) : filteredList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">
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
                      <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 mt-2">{p.nama_guru}</h3>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-500 dark:text-gray-400">{formatTimestampWita(p.timestamp)}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${
                          p.status_verifikasi === 'Disetujui' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          p.status_verifikasi === 'Ditolak' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{p.status_verifikasi || 'Menunggu'}</span>
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">Jenis:</span> {p.jenis_presensi}
                        {p.detail_izin && <span> ({p.detail_izin})</span>}
                      </div>
                      {p.lokasi && (
                        <div className="text-[9px] text-gray-400 truncate">
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

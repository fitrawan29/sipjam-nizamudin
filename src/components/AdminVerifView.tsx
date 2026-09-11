'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaStartOfDay, getWitaEndOfDay, formatTimestampWita } from '@/lib/wita';

export default function AdminVerifView({ user }: { user: any }) {
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Presensi'|'Jurnal'>('Presensi');
  
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();

    const channelPresensi = supabase
      .channel('verif-presensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        if (activeTab === 'Presensi') loadData();
      })
      .subscribe();

    const channelJurnal = supabase
      .channel('verif-jurnal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelPresensi);
      supabase.removeChannel(channelJurnal);
    };
  }, [date, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      let query;
      if (activeTab === 'Presensi') {
        query = supabase.from('presensi_guru').select('*');
        if (date) {
          const startOfDay = getWitaStartOfDay(date);
          const endOfDay = getWitaEndOfDay(date);
          query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
        }
        query = query.order('timestamp', { ascending: false }).limit(100);
        
        const { data } = await query;
        if (data) setPresensiList(data);
      } else {
        query = supabase.from('jurnal_pembelajaran').select('*');
        if (date) {
          // Jurnal has a 'tanggal' column (YYYY-MM-DD)
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(100);
        
        const { data } = await query;
        if (data) setJurnalList(data);
      }
    } catch (error) {
      console.error('Verif load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyItem = async (id: number | string, status: string) => {
    const table = activeTab === 'Presensi' ? 'presensi_guru' : 'jurnal_pembelajaran';
    const { error } = await supabase
      .from(table)
      .update({ status_verifikasi: status })
      .eq('id', id);
    if (!error) {
      loadData();
    } else {
      alert("Gagal memverifikasi: " + error.message);
    }
  };

  const bulkVerifyCurrent = async () => {
    if (!confirm('Anda yakin menyetujui semua data yang tampil ini?')) return;
    const table = activeTab === 'Presensi' ? 'presensi_guru' : 'jurnal_pembelajaran';
    const list = activeTab === 'Presensi' ? filteredPresensi : filteredJurnal;
    const pendingIds = list.filter(item => item.status_verifikasi !== 'Disetujui').map(item => item.id);
    
    if (pendingIds.length === 0) return;

    for (let i = 0; i < pendingIds.length; i += 100) {
      const batchIds = pendingIds.slice(i, i + 100);
      await supabase
        .from(table)
        .update({ status_verifikasi: 'Disetujui' })
        .in('id', batchIds);
    }
    loadData();
  };

  const filteredPresensi = presensiList.filter(p => p.nama_guru?.toLowerCase().includes(search.toLowerCase()));
  const filteredJurnal = jurnalList.filter(j => j.nama_guru?.toLowerCase().includes(search.toLowerCase()));

  const displayList = activeTab === 'Presensi' ? filteredPresensi : filteredJurnal;

  return (
    <section id="view-admin-verif" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-check text-green-600 dark:text-green-400"></i> Verifikasi Data
                </h2>
                <button type="button" onClick={loadData} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <i className="fa-regular fa-calendar absolute left-3 top-3.5 text-gray-400 text-xs"></i>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 dark:text-white" />
                    </div>
                    <button type="button" onClick={() => setDate('')} className="btn-click px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-xl shrink-0 border border-gray-300 dark:border-gray-600">
                      Semua
                    </button>
                </div>
                <button type="button" onClick={bulkVerifyCurrent} className="btn-click w-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2.5 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex justify-center items-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition">
                  <i className="fa-solid fa-check-double"></i> Setujui Semua Tampil
                </button>
            </div>
            <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setActiveTab('Presensi')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm border border-gray-200 transition ${activeTab === 'Presensi' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                  Presensi
                </button>
                <button type="button" onClick={() => setActiveTab('Jurnal')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm border border-gray-200 transition ${activeTab === 'Jurnal' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                  Jurnal
                </button>
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama guru..." className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div id="verif-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                {loading && displayList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Memuat data...</div>
                ) : displayList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Tidak ada data untuk diverifikasi.</div>
                ) : displayList.map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100">{item.nama_guru}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{item.status_verifikasi || 'Menunggu'}</span>
                    </div>
                    {activeTab === 'Presensi' ? (
                      <div className="text-[10px] text-gray-600 dark:text-gray-300 space-y-1">
                        <p><span className="font-semibold">Waktu:</span> {formatTimestampWita(item.timestamp)}</p>
                        <p><span className="font-semibold">Tipe:</span> <span className="font-bold text-nizamudin-green dark:text-green-400">{item.tipe_absen}</span></p>
                        <p><span className="font-semibold">Jenis:</span> {item.jenis_presensi} {item.detail_izin && `(${item.detail_izin})`}</p>
                        {item.link_bukti && item.link_bukti !== '-' && (
                          <a href={item.link_bukti} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline mt-1 block">
                            <i className="fa-solid fa-link"></i> Bukti Lampiran
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-600 dark:text-gray-300 space-y-1">
                        <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                        <p><span className="font-semibold">Kelas/Mapel:</span> {item.kelas} - {item.mapel}</p>
                        <p><span className="font-semibold">Materi:</span> {item.materi}</p>
                        {item.link_bukti_foto && item.link_bukti_foto !== '-' && (
                          <a href={item.link_bukti_foto} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline mt-1 block">
                            <i className="fa-solid fa-link"></i> Bukti Lampiran
                          </a>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => verifyItem(item.id, 'Disetujui')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold py-1.5 rounded-lg transition">Setujui</button>
                      <button onClick={() => verifyItem(item.id, 'Ditolak')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold py-1.5 rounded-lg transition">Tolak</button>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-medium">{displayList.length} Data</span>
            </div>
        </div>
    </section>
  );
}

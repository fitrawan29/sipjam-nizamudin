'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HistoryView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'presensi'|'jurnal'>('presensi');
  const [search, setSearch] = useState('');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, page]);

  const loadData = async () => {
    if (!user?.nama) return;
    setLoading(true);
    setErrorMsg('');
    setDataList([]); // Clear previous to prevent stale data
    
    let query;
    if (activeTab === 'presensi') {
      query = supabase
        .from('presensi_guru')
        .select('*')
        .eq('nama_guru', user.nama)
        .order('timestamp', { ascending: false });
    } else {
      query = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .eq('nama_guru', user.nama)
        .order('timestamp', { ascending: false });
    }

    try {
      const { data, error } = await query;
      if (error) {
        console.error('History fetch error:', error);
        setErrorMsg(error.message);
      } else if (data) {
        setDataList(data);
      }
    } catch (err: any) {
      console.error('Network error:', err);
      setErrorMsg(err.message || 'Kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = dataList.filter(item => {
    if (activeTab === 'presensi') {
      return item.tipe_absen?.toLowerCase().includes(search.toLowerCase()) || 
             item.jenis_presensi?.toLowerCase().includes(search.toLowerCase());
    } else {
      return item.mapel?.toLowerCase().includes(search.toLowerCase()) ||
             item.kelas?.toLowerCase().includes(search.toLowerCase()) ||
             item.materi?.toLowerCase().includes(search.toLowerCase());
    }
  });

  const paginatedData = filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <section id="view-history" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-gray-500"></i> Riwayat Anda
                </h2>
                <button type="button" onClick={loadData} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700">
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            <div className="flex gap-2 mb-4">
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('presensi'); setPage(0); }} 
                  className={`btn-click flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${activeTab === 'presensi' ? 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border border-transparent'}`}
                >
                  Presensi
                </button>
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('jurnal'); setPage(0); }} 
                  className={`btn-click flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${activeTab === 'jurnal' ? 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border border-transparent'}`}
                >
                  Jurnal
                </button>
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
                <input 
                  type="text" 
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder={`Cari riwayat ${activeTab}...`} 
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-gray-200" 
                />
            </div>
            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-xs border border-red-200">
                    <i className="fa-solid fa-circle-exclamation mr-1"></i> Gagal memuat data: {errorMsg}
                </div>
            )}
            <div id="hist-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
              {loading && dataList.length === 0 ? (
                <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Memuat data...</div>
              ) : paginatedData.length === 0 ? (
                <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Belum ada riwayat.</div>
              ) : (
                paginatedData.map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                    {activeTab === 'presensi' ? (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100">{item.tipe_absen} - {item.jenis_presensi}</h3>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>{item.status_verifikasi || 'Menunggu'}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-300 space-y-1">
                          <p><span className="font-semibold">Waktu:</span> {new Date(item.timestamp).toLocaleString('id-ID')}</p>
                          {item.detail_izin && <p><span className="font-semibold">Keterangan:</span> {item.detail_izin}</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{item.mapel}</h3>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>{item.status_verifikasi || 'Menunggu'}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-300 space-y-1">
                          <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                          <p><span className="font-semibold">Kelas:</span> {item.kelas}</p>
                          <p className="truncate"><span className="font-semibold">Materi:</span> {item.materi}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-medium">
                  Menampilkan {paginatedData.length > 0 ? page * ITEMS_PER_PAGE + 1 : 0} - {Math.min((page + 1) * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} Data
                </span>
                <div className="flex gap-2">
                    <button 
                      type="button" 
                      disabled={page === 0}
                      onClick={() => setPage(Math.max(0, page - 1))}
                      className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300">
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button 
                      type="button" 
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300">
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </section>
  );
}

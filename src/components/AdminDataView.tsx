'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDataView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('Data_Siswa');
  const [search, setSearch] = useState('');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const ITEMS_PER_PAGE = 20;

  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
  ];

  const loadData = useCallback(async () => {
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;

    setLoading(true);
    setErrorMsg('');
    setDataList([]);
    setDebugInfo(`Memuat tabel "${tabObj.table}"...`);

    try {
      console.log(`[AdminDataView] Fetching from table: ${tabObj.table}`);

      const { data, error, status, statusText } = await supabase
        .from(tabObj.table)
        .select('*')
        .limit(2000);

      console.log(`[AdminDataView] Response status: ${status} ${statusText}`);
      console.log(`[AdminDataView] Error:`, error);
      console.log(`[AdminDataView] Data count:`, data?.length ?? 'null');

      if (error) {
        const errText = `Error ${status}: ${error.message} (code: ${error.code})`;
        console.error('[AdminDataView]', errText);
        setErrorMsg(errText);
        setDebugInfo(errText);
      } else if (data && data.length > 0) {
        setDataList(data);
        setDebugInfo(`Berhasil memuat ${data.length} baris dari "${tabObj.table}"`);
      } else if (data && data.length === 0) {
        setDebugInfo(`Tabel "${tabObj.table}" mengembalikan 0 baris (kosong).`);
      } else {
        // data is null/undefined — ini yang mencurigakan
        setDebugInfo(`Supabase mengembalikan data=null tanpa error. Kemungkinan masalah RLS atau koneksi.`);
        setErrorMsg('Data null tanpa error. Coba refresh halaman (Ctrl+Shift+R).');
        
        // FALLBACK: langsung fetch via REST API
        console.log('[AdminDataView] Trying fallback direct fetch...');
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (baseUrl && apiKey) {
            const res = await fetch(`${baseUrl}/rest/v1/${tabObj.table}?select=*&limit=2000`, {
              headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
              },
            });
            if (res.ok) {
              const fallbackData = await res.json();
              console.log(`[AdminDataView] Fallback success: ${fallbackData.length} rows`);
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                setDataList(fallbackData);
                setErrorMsg('');
                setDebugInfo(`Fallback berhasil: ${fallbackData.length} baris dari "${tabObj.table}"`);
              }
            } else {
              console.error('[AdminDataView] Fallback failed:', res.status, res.statusText);
            }
          }
        } catch (fallbackErr) {
          console.error('[AdminDataView] Fallback error:', fallbackErr);
        }
      }
    } catch (err: any) {
      console.error('[AdminDataView] Unexpected error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan');
      setDebugInfo(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadData();
    setPage(0);
  }, [loadData]);

  const filteredList = Array.isArray(dataList) ? dataList.filter(item => {
    if (!item) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (item.nama_siswa || '').toLowerCase().includes(term) ||
      (item.nama_guru || '').toLowerCase().includes(term) ||
      (item.nama_mata_pelajaran || '').toLowerCase().includes(term) ||
      (item.keterangan || '').toLowerCase().includes(term) ||
      (item.kelas || '').toLowerCase().includes(term) ||
      (item.mata_pelajaran || '').toLowerCase().includes(term) ||
      (item.nisn || '').toLowerCase().includes(term) ||
      (item.nip || '').toLowerCase().includes(term) ||
      (item.hari || '').toLowerCase().includes(term) ||
      (item.tanggal || '').toLowerCase().includes(term) ||
      (item.tipe || '').toLowerCase().includes(term)
    );
  }) : [];

  const paginatedList = filteredList.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil((filteredList.length || 0) / ITEMS_PER_PAGE);

  const renderCard = (item: any) => {
    if (!item) return null;
    if (activeTab === 'Data_Siswa') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-100">{item.nama_siswa || 'Tanpa Nama'}</h3>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <p><span className="font-semibold">NISN:</span> {item.nisn || '-'}</p>
            <p><span className="font-semibold">Kelas:</span> {item.kelas || '-'}</p>
            <p><span className="font-semibold">Gender:</span> {item.gender || '-'}</p>
          </div>
          <div className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.status || 'Aktif'}</div>
        </>
      );
    } else if (activeTab === 'Data_Guru') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-100">{item.nama_guru || 'Tanpa Nama'}</h3>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <p><span className="font-semibold">NIP:</span> {item.nip || '-'}</p>
            <p><span className="font-semibold">Mapel:</span> {item.mata_pelajaran || '-'}</p>
            <p><span className="font-semibold">Kontak:</span> {item.no_hp || '-'}</p>
          </div>
          <div className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.status || 'Aktif'}</div>
        </>
      );
    } else if (activeTab === 'Data_Mapel') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-100">{item.nama_mata_pelajaran || 'Tanpa Nama'}</h3>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <p><span className="font-semibold">Kategori:</span> {item.kategori || '-'}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Kalender_Pendidikan') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-100">{item.tanggal || '-'}</h3>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <p className="font-semibold text-blue-600 dark:text-blue-400">{item.keterangan || '-'}</p>
            <p><span className="font-semibold">Tipe:</span> {item.tipe || '-'}</p>
          </div>
        </>
      );
    } else if (activeTab === 'Jadwal_Pelajaran') {
      return (
        <>
          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-100">{item.hari || '-'} - {item.kelas || '-'}</h3>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <p><span className="font-semibold">Guru:</span> {item.nama_guru || '-'}</p>
            <p><span className="font-semibold">Mapel:</span> {item.mata_pelajaran || '-'}</p>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <section id="view-admin-data" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-database text-purple-500 dark:text-purple-400"></i> Master Data
            </h2>
            
            {/* TABS */}
            <div className="flex overflow-x-auto custom-scroll gap-2 mb-4 pb-1">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    type="button" 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`btn-click master-tab-btn px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border transition ${activeTab === tab.id ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' : 'border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            {/* ERROR MESSAGE */}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-xs border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                <i className="fa-solid fa-circle-exclamation mr-1"></i> {errorMsg}
              </div>
            )}

            {/* DEBUG INFO (small text at top) */}
            {debugInfo && !loading && (
              <div className="text-[9px] text-gray-400 dark:text-gray-500 mb-2 px-1">
                <i className="fa-solid fa-info-circle mr-1"></i>{debugInfo}
              </div>
            )}

            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/30 mb-4">
                <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase truncate">Impor Excel</span>
                    <div className="flex gap-1.5 shrink-0">
                        <button type="button" onClick={() => alert('Fitur unduh template Excel sedang dalam pengembangan')} className="btn-click bg-white dark:bg-gray-800 px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 shadow-sm border border-gray-300 dark:border-gray-600">Template</button>
                        <button type="button" onClick={() => alert('Fitur unggah Excel massal sedang dalam pengembangan')} className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-bold shadow-md"><i className="fa-solid fa-upload"></i> Unggah</button>
                    </div>
                </div>
            </div>

            {/* SEARCH AND REFRESH */}
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="relative flex-grow">
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Cari data..." className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={loadData} disabled={loading} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-700 disabled:opacity-50">
                      <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                    </button>
                    <button type="button" onClick={() => alert('Fitur tambah data manual sedang dalam pengembangan')} className="btn-click bg-nizamudin-green text-white px-3 h-8 rounded-xl text-[10px] font-bold shadow-md flex items-center gap-1 border border-nizamudin-light hover:brightness-110">
                      <i className="fa-solid fa-plus"></i> Baru
                    </button>
                </div>
            </div>

            {/* DATA GRID */}
            <div id="master-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px] content-start">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-purple-500 dark:text-purple-400"></i>
                    <span className="text-xs italic">Menarik data dari Supabase...</span>
                  </div>
                ) : paginatedList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">
                    {errorMsg ? 'Gagal memuat data. Lihat pesan error di atas.' : (!dataList || dataList.length === 0) ? 'Tabel ini kosong atau data belum dapat dimuat.' : 'Tidak ditemukan data yang cocok dengan pencarian.'}
                  </div>
                ) : (
                  paginatedList.map((item, idx) => (
                    <div key={item?.id || idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-sm relative hover:shadow-md transition">
                      {renderCard(item)}
                    </div>
                  ))
                )}
            </div>

            {/* PAGINATION */}
            {!loading && filteredList.length > 0 && (
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 font-medium">
                    Ditampilkan: {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, filteredList.length)} dari Total {filteredList.length} Data
                  </span>
                  <div className="flex gap-2">
                      <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300">
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300">
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                  </div>
              </div>
            )}
        </div>
    </section>
  );
}

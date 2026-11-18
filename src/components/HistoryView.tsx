'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatTimestampWita } from '@/lib/wita';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import { processPendingUploads } from '@/lib/presensiUploadPersistence';

export interface HistoryViewProps {
  user: any;
  initialTab?: 'presensi' | 'jurnal';
  onlyTab?: 'presensi' | 'jurnal';
  hideTabSwitch?: boolean;
  hideSectionWrapper?: boolean;
}

export default function HistoryView({
  user,
  initialTab = 'presensi',
  onlyTab,
  hideTabSwitch = false,
  hideSectionWrapper = false
}: HistoryViewProps) {
  const effectiveTab = onlyTab || initialTab;
  const [activeTab, setActiveTab] = useState<'presensi'|'jurnal'>(effectiveTab);

  useEffect(() => {
    if (onlyTab && onlyTab !== activeTab) {
      setActiveTab(onlyTab);
    }
  }, [onlyTab]);
  const [search, setSearch] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
    processPendingUploads().catch(() => {});

    const handlePresensiUpdated = () => {
      loadData();
    };

    window.addEventListener('sipjam:presensi_updated', handlePresensiUpdated);
    return () => {
      window.removeEventListener('sipjam:presensi_updated', handlePresensiUpdated);
    };
  }, [activeTab]);

  const loadData = async () => {
    if (!user?.nama) return;
    setLoading(true);
    setErrorMsg('');

    const cleanNama = user.nama.trim();
    const namaVariants = cleanNama !== user.nama ? [user.nama, cleanNama] : [cleanNama];
    
    let query;
    if (activeTab === 'presensi') {
      const base = supabase
        .from('presensi_guru')
        .select('*');
      query = (namaVariants.length > 1 ? base.in('nama_guru', namaVariants) : base.eq('nama_guru', cleanNama))
        .order('timestamp', { ascending: false });
    } else {
      const base = supabase
        .from('jurnal_pembelajaran')
        .select('*');
      query = (namaVariants.length > 1 ? base.in('nama_guru', namaVariants) : base.eq('nama_guru', cleanNama))
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
    if (activeTab === 'presensi' && filterBulan) {
      const ts = String(item.timestamp || item.tanggal || '');
      let matchMonth = false;
      if (ts.startsWith(filterBulan) || ts.includes(filterBulan)) {
        matchMonth = true;
      } else {
        const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const m = slashMatch[1].padStart(2, '0');
          const y = slashMatch[3];
          if (`${y}-${m}` === filterBulan) matchMonth = true;
        }
      }
      if (!matchMonth) return false;
    }

    if (activeTab === 'presensi') {
      return (item.tipe_absen || '').toLowerCase().includes(search.toLowerCase()) || 
             (item.jenis_presensi || '').toLowerCase().includes(search.toLowerCase()) ||
             (item.status_verifikasi || '').toLowerCase().includes(search.toLowerCase()) ||
             (item.detail_izin || '').toLowerCase().includes(search.toLowerCase()) ||
             (item.catatan_admin || '').toLowerCase().includes(search.toLowerCase());
    } else {
      const matFull = `${item.materi || ''} ${item.materi_pembelajaran || ''} ${item.konten || ''} ${item.kegiatan || ''} ${item.kegiatan_pembelajaran || ''}`.toLowerCase();
      return (item.mapel || '').toLowerCase().includes(search.toLowerCase()) ||
             (item.kelas || '').toLowerCase().includes(search.toLowerCase()) ||
             matFull.includes(search.toLowerCase()) ||
             (item.keterangan || '').toLowerCase().includes(search.toLowerCase()) ||
             (item.status_verifikasi || '').toLowerCase().includes(search.toLowerCase()) ||
             (item.catatan_admin || '').toLowerCase().includes(search.toLowerCase());
    }
  });

  const paginatedData = filteredData.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const groupedData = activeTab === 'presensi' ? filteredData.reduce((acc, item) => {
    const date = (item.timestamp || item.tanggal || '').split('T')[0];
    if (!acc[date]) acc[date] = { date, datang: null, pulang: null };
    if (item.tipe_absen === 'Presensi Datang') acc[date].datang = item;
    else acc[date].pulang = item;
    return acc;
  }, {} as Record<string, any>) : {};

  const sortedDates = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));
  const paginatedDates = sortedDates.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(Object.keys(groupedData).length / ITEMS_PER_PAGE);

  const Wrapper = hideSectionWrapper ? 'div' : 'section';
  const wrapperProps = hideSectionWrapper 
    ? { className: 'fade-in' } 
    : { id: 'view-history', className: 'view-section fade-in' };

  return (
    <Wrapper {...wrapperProps}>
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-blue-500 dark:text-blue-400"></i> Riwayat Anda
                </h2>
                <button type="button" onClick={loadData} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700">
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            {!hideTabSwitch && (
              <div className="flex gap-2 mb-4">
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('presensi'); setPage(0); setFilterBulan(''); setDataList([]); }} 
                  className={`btn-click flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${activeTab === 'presensi' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'}`}
                >
                  Presensi
                </button>
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('jurnal'); setPage(0); setFilterBulan(''); setDataList([]); }} 
                  className={`btn-click flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${activeTab === 'jurnal' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'}`}
                >
                  Jurnal
                </button>
              </div>
            )}
            <div className="relative mb-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 dark:text-white/70 text-xs"></i>
                  <input 
                    type="text" 
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setPage(0); }} 
                    placeholder={`Cari riwayat ${activeTab}...`} 
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 dark:placeholder-gray-400" 
                  />
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setPage(0); }}
                    className="px-3 py-2.5 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold shrink-0"
                  >
                    Reset
                  </button>
                )}
                {activeTab === 'presensi' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input 
                      type="month" 
                      value={filterBulan} 
                      onChange={e => { setFilterBulan(e.target.value); setPage(0); }} 
                      className="px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold cursor-pointer"
                      title="Filter Berdasarkan Bulan Presensi"
                    />
                    {filterBulan && (
                      <button
                        type="button"
                        onClick={() => { setFilterBulan(''); setPage(0); }}
                        className="px-2.5 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        title="Reset Filter Bulan"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                )}
            </div>
            {errorMsg && (
                <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 p-3 rounded-xl mb-4 text-xs">
                    <i className="fa-solid fa-circle-exclamation mr-1"></i> Gagal memuat data: {errorMsg}
                </div>
            )}
            <div id="hist-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px] content-start">
              {loading && dataList.length === 0 ? (
                <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400 text-xs italic">Memuat data...</div>
              ) : (activeTab === 'presensi' ? (
                Object.keys(groupedData).length === 0 ? (
                  <div className="col-span-full text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 my-2">
                    <i className="fa-solid fa-clock-rotate-left text-2xl text-gray-400 dark:text-gray-500 mb-2"></i>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Belum ada riwayat presensi.</p>
                  </div>
                ) : (
                  paginatedDates.map((date) => {
                    const item = groupedData[date];
                    const datang = item.datang;
                    const pulang = item.pulang;
                    return (
                      <div key={date} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">{date}</h3>
                        <div className="space-y-2">
                          <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Presensi Datang</p>
                            {datang ? (
                              <p className="text-[10px] text-gray-700 dark:text-gray-300">{formatTimestampWita(datang.timestamp)} - {datang.status_verifikasi}</p>
                            ) : (
                              <p className="text-[10px] text-red-600 dark:text-red-400 italic">Belum absen</p>
                            )}
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Presensi Pulang</p>
                            {pulang ? (
                              <p className="text-[10px] text-gray-700 dark:text-gray-300">{formatTimestampWita(pulang.timestamp)} - {pulang.status_verifikasi}</p>
                            ) : (
                              <p className="text-[10px] text-red-600 dark:text-red-400 italic">Belum absen</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : paginatedData.length === 0 ? (
                <div className="col-span-full text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 my-2">
                  <i className="fa-solid fa-clock-rotate-left text-2xl text-gray-400 dark:text-gray-500 mb-2"></i>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {search || filterBulan 
                      ? `Tidak ada riwayat ${activeTab} yang sesuai dengan filter ${filterBulan ? `bulan "${filterBulan}"` : ''}${search ? ` dan pencarian "${search}"` : ''}.` 
                      : `Belum ada riwayat ${activeTab}.`}
                  </p>
                  {(search || filterBulan) && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setFilterBulan(''); setPage(0); }}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                    </button>
                  )}
                </div>
              ) : (
                paginatedData.map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-2 hover:shadow-md transition">
                    {/* ...existing journal code... */}
                  </div>
                ))
              ))}
            </div>
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-600 dark:text-white/80 font-medium">
                  Menampilkan {paginatedData.length > 0 ? page * ITEMS_PER_PAGE + 1 : 0} - {Math.min((page + 1) * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} Data
                </span>
                <div className="flex gap-2">
                    <button 
                      type="button" 
                      disabled={page === 0}
                      onClick={() => setPage(Math.max(0, page - 1))}
                      className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white">
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button 
                      type="button" 
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white">
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
        </div>
    </Wrapper>
  );
}

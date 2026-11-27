'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatTimestampWita, getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay } from '@/lib/wita';
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
  const [filterBulan, setFilterBulan] = useState(() => getWitaDateStr().slice(0, 7));
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

    let rtTimer: NodeJS.Timeout | null = null;
    const scheduleRefresh = () => {
      if (rtTimer) clearTimeout(rtTimer);
      rtTimer = setTimeout(() => {
        loadData();
      }, 600);
    };

    const rtFilter = user?.sekolah_id ? { filter: `sekolah_id=eq.${user.sekolah_id}` } : {};
    const channel = supabase
      .channel(`realtime-history-${user?.id || user?.nama || 'anon'}-${activeTab}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru', ...rtFilter }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran', ...rtFilter }, scheduleRefresh)
      .subscribe();

    window.addEventListener('sipjam:presensi_updated', handlePresensiUpdated);
    return () => {
      if (rtTimer) clearTimeout(rtTimer);
      supabase.removeChannel(channel);
      window.removeEventListener('sipjam:presensi_updated', handlePresensiUpdated);
    };
  }, [activeTab, filterBulan]);

  const loadData = async () => {
    if (!user?.nama) return;
    setLoading(true);
    setErrorMsg('');

    const cleanNama = user.nama.trim();
    const namaVariants = cleanNama !== user.nama ? [user.nama, cleanNama] : [cleanNama];

    let monthStart = '';
    let monthEnd = '';
    if (filterBulan && /^\d{4}-\d{2}$/.test(filterBulan)) {
      const [yStr, mStr] = filterBulan.split('-');
      const lastDay = new Date(Number(yStr), Number(mStr), 0).getDate();
      monthStart = `${filterBulan}-01`;
      monthEnd = `${filterBulan}-${String(lastDay).padStart(2, '0')}`;
    }
    
    let query;
    if (activeTab === 'presensi') {
      let base = supabase
        .from('presensi_guru')
        .select('id, timestamp, tanggal, nama_guru, tipe_absen, jenis_presensi, status_verifikasi, detail_izin, catatan_admin, link_bukti, link_bukti_foto, link_dokumen, foto_url, tanggal_mulai, tanggal_selesai, durasi_hari');
      if (user?.sekolah_id) base = base.eq('sekolah_id', user.sekolah_id);
      if (monthStart && monthEnd) {
        base = base.gte('timestamp', getWitaStartOfDay(monthStart)).lte('timestamp', getWitaEndOfDay(monthEnd));
      }
      query = (namaVariants.length > 1 ? base.in('nama_guru', namaVariants) : base.eq('nama_guru', cleanNama))
        .order('timestamp', { ascending: false })
        .limit(150);
    } else {
      let base = supabase
        .from('jurnal_pembelajaran')
        .select('id, timestamp, tanggal, nama_guru, mapel, kelas, jam_ke, materi, materi_pembelajaran, konten, kegiatan, kegiatan_pembelajaran, keterangan, status_verifikasi, catatan_admin, link_bukti_foto, lokasi');
      if (user?.sekolah_id) base = base.eq('sekolah_id', user.sekolah_id);
      if (monthStart && monthEnd) {
        base = base.gte('tanggal', monthStart).lte('tanggal', monthEnd);
      }
      query = (namaVariants.length > 1 ? base.in('nama_guru', namaVariants) : base.eq('nama_guru', cleanNama))
        .order('timestamp', { ascending: false })
        .limit(150);
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
    const rawDate = String(item.tanggal || item.timestamp || item.tanggal_mulai || '').trim();
    const date = rawDate ? rawDate.split('T')[0].split(' ')[0] : 'Tanpa Tanggal';
    if (!acc[date]) acc[date] = { date, datang: null, pulang: null };
    const tipe = String(item.tipe_absen || '').trim();
    const pickBetter = (existing: any, candidate: any) =>
      !existing || (existing.status_verifikasi === 'Ditolak' && candidate.status_verifikasi !== 'Ditolak') ? candidate : existing;

    if (tipe === 'Datang' || tipe === 'Presensi Datang') {
      acc[date].datang = pickBetter(acc[date].datang, item);
    } else if (tipe === 'Pulang' || tipe === 'Presensi Pulang') {
      acc[date].pulang = pickBetter(acc[date].pulang, item);
    } else {
      acc[date].datang = pickBetter(acc[date].datang, item);
    }
    return acc;
  }, {} as Record<string, any>) : {};

  const sortedDates = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));
  const paginatedDates = sortedDates.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalCount = activeTab === 'presensi' ? sortedDates.length : filteredData.length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const renderPresensiSlot = (label: string, accentClass: string, item: any) => {
    const bukti = (item?.link_bukti && item.link_bukti !== '-')
      ? item.link_bukti
      : (item?.link_bukti_foto && item.link_bukti_foto !== '-')
      ? item.link_bukti_foto
      : (item?.link_dokumen && item.link_dokumen !== '-')
      ? item.link_dokumen
      : (item?.foto_url && item.foto_url !== '-')
      ? item.foto_url
      : '';

    const statusBadgeClass = !item ? '' :
      item.status_verifikasi === 'Disetujui' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' :
      (item.status_verifikasi === 'Pulang Cepat' || item.jenis_presensi === 'Pulang Cepat') ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' :
      (item.status_verifikasi === 'Ditolak' || item.status_verifikasi === 'Alpa' || item.jenis_presensi === 'Alpa') ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300' :
      'bg-amber-500/15 text-amber-800 dark:text-amber-300';

    return (
      <div className="p-2.5 neu-inset rounded-xl space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[10px] font-bold ${accentClass}`}>{label}</p>
          {item && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${statusBadgeClass}`}>
              {item.status_verifikasi || 'Menunggu'}
            </span>
          )}
        </div>
        {item ? (
          <div className="text-[10px] text-[#334155] dark:text-[#CBD5E1] space-y-1">
            <p className="font-num">
              {formatTimestampWita(item.timestamp)}
              {item.jenis_presensi ? ` • ${item.jenis_presensi}` : ''}
            </p>
            {item.detail_izin && (
              <p><span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Keterangan:</span> {item.detail_izin}</p>
            )}
            {item.catatan_admin && (
              <div className="p-1.5 rounded-lg bg-slate-500/10 text-[9px]">
                <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Catatan Admin: </span>
                <span className="italic">{item.catatan_admin}</span>
              </div>
            )}
            {item.link_bukti === 'pending:uploading' ? (
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg">
                <i className="fa-solid fa-cloud-arrow-up animate-pulse text-[9px]"></i>
                <span>Sedang mengunggah dokumen... (Swipe ke bawah / F5 untuk pembaruan)</span>
              </div>
            ) : item.link_bukti === 'gagal_upload' ? (
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-lg">
                <i className="fa-solid fa-circle-exclamation text-[9px]"></i>
                <span>Upload dokumen tertunda</span>
              </div>
            ) : bukti ? (
              <div className="pt-1.5 mt-1 border-t border-slate-300/60 dark:border-slate-700/60 flex items-center gap-2">
                <img
                  src={transformGoogleDriveUrl(bukti)}
                  alt="Bukti Presensi"
                  className="w-7 h-7 object-cover rounded-lg shadow-xs shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <a
                  href={bukti}
                  target="_blank"
                  rel="noreferrer"
                  className="neu-btn inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0F766E] dark:text-teal-300 px-2.5 py-1 rounded-lg transition"
                >
                  <i className="fa-solid fa-paperclip text-[9px]"></i> Lihat Bukti Presensi
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 italic">Belum absen</p>
        )}
      </div>
    );
  };

  const Wrapper = hideSectionWrapper ? 'div' : 'section';
  const wrapperProps = hideSectionWrapper 
    ? { className: 'fade-in' } 
    : { id: 'view-history', className: 'view-section fade-in' };

  return (
    <Wrapper {...wrapperProps}>
        <div className="glass-card p-4 sm:p-5 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-[#0F766E] dark:text-teal-400"></i> Riwayat Anda
                </h2>
                <button
                  type="button"
                  onClick={loadData}
                  aria-label="Muat Ulang Riwayat"
                  title="Muat Ulang Riwayat"
                  className="neu-btn btn-click w-11 h-11 rounded-2xl text-xs font-bold text-[#334155] dark:text-[#F1F5F9]"
                >
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            {!hideTabSwitch && (
              <div role="tablist" aria-label="Kategori Riwayat" className="flex gap-2 p-2 neu-inset rounded-2xl mb-4">
                <button 
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'presensi'}
                  onClick={() => { setActiveTab('presensi'); setPage(0); setFilterBulan(''); setDataList([]); }} 
                  className={`btn-click flex-1 min-h-[44px] text-xs font-bold py-2 rounded-xl transition-all ${activeTab === 'presensi' ? 'neu-btn neu-btn-primary text-white' : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'}`}
                >
                  Presensi
                </button>
                <button 
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'jurnal'}
                  onClick={() => { setActiveTab('jurnal'); setPage(0); setFilterBulan(''); setDataList([]); }} 
                  className={`btn-click flex-1 min-h-[44px] text-xs font-bold py-2 rounded-xl transition-all ${activeTab === 'jurnal' ? 'neu-btn neu-btn-primary text-white' : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'}`}
                >
                  Jurnal
                </button>
              </div>
            )}
            <div className="relative mb-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-[#475569] dark:text-[#94A3B8] text-xs"></i>
                  <input 
                    type="text" 
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setPage(0); }} 
                    placeholder={`Cari riwayat ${activeTab}...`}
                    aria-label={`Cari riwayat ${activeTab}`}
                    className="w-full pl-9 pr-4 py-2.5 min-h-[44px] text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]" 
                  />
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setPage(0); }}
                    className="neu-btn px-3.5 py-2 min-h-[44px] text-xs rounded-xl text-[#334155] dark:text-[#F1F5F9] font-semibold shrink-0"
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
                      aria-label="Filter Berdasarkan Bulan Presensi"
                      className="px-3 py-2 min-h-[44px] text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9] font-semibold cursor-pointer"
                      title="Filter Berdasarkan Bulan Presensi"
                    />
                    {filterBulan && (
                      <button
                        type="button"
                        onClick={() => { setFilterBulan(''); setPage(0); }}
                        aria-label="Reset Filter Bulan"
                        className="neu-btn w-11 h-11 text-xs rounded-xl text-[#334155] dark:text-[#F1F5F9] font-semibold transition"
                        title="Reset Filter Bulan"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                )}
            </div>
            {errorMsg && (
                <div className="neu-inset border border-rose-500/30 text-rose-700 dark:text-rose-300 p-3 rounded-xl mb-4 text-xs">
                    <i className="fa-solid fa-circle-exclamation mr-1"></i> Gagal memuat data: {errorMsg}
                </div>
            )}
            <div id="hist-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px] content-start">
              {loading && dataList.length === 0 ? (
                <div className="col-span-full text-center py-10 text-[#475569] dark:text-[#94A3B8] text-xs italic">Memuat data...</div>
              ) : (activeTab === 'presensi' ? (
                Object.keys(groupedData).length === 0 ? (
                  <div className="col-span-full text-center py-10 px-4 neu-inset rounded-2xl my-2">
                    <i className="fa-solid fa-clock-rotate-left text-2xl text-[#475569] dark:text-[#94A3B8] mb-2"></i>
                    <p className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">Belum ada riwayat presensi.</p>
                  </div>
                ) : (
                  paginatedDates.map((date) => {
                    const item = groupedData[date];
                    const datang = item.datang;
                    const pulang = item.pulang;
                    return (
                      <div key={date} className="neu-card-sm p-3.5 rounded-2xl flex flex-col justify-between gap-3 transition">
                        <h3 className="text-xs font-bold font-num text-[#0F172A] dark:text-[#F1F5F9] border-b border-slate-300/60 dark:border-slate-700/60 pb-2">{date}</h3>
                        <div className="space-y-2">
                          {renderPresensiSlot('Presensi Datang', 'text-[#0F766E] dark:text-teal-400', datang)}
                          {renderPresensiSlot('Presensi Pulang', 'text-[#D97706] dark:text-amber-400', pulang)}
                        </div>
                      </div>
                    );
                  })
                )
              ) : paginatedData.length === 0 ? (
                <div className="col-span-full text-center py-10 px-4 neu-inset rounded-2xl my-2">
                  <i className="fa-solid fa-clock-rotate-left text-2xl text-[#475569] dark:text-[#94A3B8] mb-2"></i>
                  <p className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                    {search || filterBulan 
                      ? `Tidak ada riwayat ${activeTab} yang sesuai dengan filter ${filterBulan ? `bulan "${filterBulan}"` : ''}${search ? ` dan pencarian "${search}"` : ''}.` 
                      : `Belum ada riwayat ${activeTab}.`}
                  </p>
                  {(search || filterBulan) && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setFilterBulan(''); setPage(0); }}
                      className="mt-2 text-xs text-[#0F766E] dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                    </button>
                  )}
                </div>
              ) : (
                paginatedData.map((item: any) => (
                  <div key={item.id} className="neu-card-sm p-3.5 rounded-2xl flex flex-col justify-between gap-2 transition">
                    <>
                      {/* Jurnal Content */}
                      <div className="space-y-1.5">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate pr-2">
                              {item.keterangan === 'Jurnal Kegiatan' || item.mapel === 'Jurnal Kegiatan'
                                ? 'Jurnal Kegiatan (Sistem Blok)'
                                : (item.mapel || '-')}
                            </h3>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                item.status_verifikasi === 'Disetujui' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' :
                                item.status_verifikasi === 'Ditolak' ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300' :
                                'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                              }`}>{item.status_verifikasi || 'Menunggu'}</span>
                          </div>
                          <div className="text-[10px] text-[#334155] dark:text-[#CBD5E1] space-y-1">
                            <p><span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Tanggal:</span> {item.tanggal}</p>
                            {item.keterangan === 'Jurnal Kegiatan' || item.mapel === 'Jurnal Kegiatan' ? (
                              <p><span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Jenis:</span> Jurnal Kegiatan</p>
                            ) : (
                              <p><span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Kelas:</span> {item.kelas}</p>
                            )}
                            {(() => {
                              const resolvedHistMateri = ((item.materi && item.materi !== '-') 
                                ? item.materi 
                                : ((item.materi_pembelajaran && item.materi_pembelajaran !== '-') 
                                  ? item.materi_pembelajaran 
                                  : ((item.konten && item.konten !== '-') 
                                    ? item.konten 
                                    : ((item.kegiatan && item.kegiatan !== '-') 
                                      ? item.kegiatan 
                                      : ((item.kegiatan_pembelajaran && item.kegiatan_pembelajaran !== '-') 
                                        ? item.kegiatan_pembelajaran 
                                        : '-')))));
                              return (
                                <p className="truncate">
                                  <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                                    {item.keterangan === 'Jurnal Kegiatan' || item.mapel === 'Jurnal Kegiatan' ? 'Kegiatan:' : 'Materi:'}
                                  </span> {resolvedHistMateri}
                                </p>
                              );
                            })()}
                          </div>
                          {item.catatan_admin && (
                            <div className="mt-1 p-2 neu-inset rounded-lg text-[9px]">
                              <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Catatan Admin: </span>
                              <span className="text-[#475569] dark:text-[#CBD5E1] italic">{item.catatan_admin}</span>
                            </div>
                          )}
                        </div>

                        {/* Jurnal Attachment Link ("Lihat Bukti") */}
                        {(() => {
                          const histPhoto = (item.link_bukti_foto && item.link_bukti_foto !== '-') 
                            ? item.link_bukti_foto 
                            : ((item.foto_kegiatan && item.foto_kegiatan !== '-') ? item.foto_kegiatan : null);
                          if (!histPhoto) return null;
                          return (
                            <div className="pt-2 mt-1 border-t border-slate-300/60 dark:border-slate-700/60 flex items-center gap-2">
                              <img 
                                src={transformGoogleDriveUrl(histPhoto)} 
                                alt="Bukti Foto" 
                                className="w-8 h-8 object-cover rounded-lg shrink-0"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                              <a 
                                href={histPhoto} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="neu-btn inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0F766E] dark:text-teal-300 px-3 py-1.5 min-h-[38px] rounded-xl transition"
                              >
                                <i className="fa-solid fa-image text-[9px]"></i> Lihat Bukti Foto
                              </a>
                            </div>
                          );
                        })()}
                    </>
                  </div>
                ))
              ))}
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2 mt-5 pt-4 border-t border-slate-300/60 dark:border-slate-700/60">
                <span className="text-[10px] font-num text-[#475569] dark:text-[#94A3B8] font-medium">
                  Menampilkan {totalCount > 0 ? page * ITEMS_PER_PAGE + 1 : 0} - {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} dari {totalCount} Data
                </span>
                <div className="flex gap-2">
                    <button 
                      type="button" 
                      disabled={page === 0}
                      aria-label="Halaman Sebelumnya"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      className="neu-btn btn-click w-11 h-11 flex items-center justify-center rounded-xl text-xs disabled:opacity-30 text-[#334155] dark:text-[#F1F5F9]">
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button 
                      type="button" 
                      disabled={page >= totalPages - 1}
                      aria-label="Halaman Berikutnya"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      className="neu-btn btn-click w-11 h-11 flex items-center justify-center rounded-xl text-xs disabled:opacity-30 text-[#334155] dark:text-[#F1F5F9]">
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </Wrapper>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { getWitaStartOfDay, getWitaEndOfDay, formatTimestampWita } from '@/lib/wita';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';

export default function AdminVerifView({ user }: { user: any }) {
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Presensi' | 'Jurnal' | 'Piket'>('Presensi');
  
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [piketList, setPiketList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

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

    const channelPiket = supabase
      .channel('verif-piket')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
        if (activeTab === 'Piket') loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelPresensi);
      supabase.removeChannel(channelJurnal);
      supabase.removeChannel(channelPiket);
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
        
        const { data, error } = await query;
        if (error) console.error('Error loading presensi:', error);
        if (data) setPresensiList(data);
      } else if (activeTab === 'Jurnal') {
        query = supabase.from('jurnal_pembelajaran').select('*');
        if (date) {
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(100);
        
        const { data, error } = await query;
        if (error) console.error('Error loading jurnal:', error);
        if (data) setJurnalList(data);
      } else if (activeTab === 'Piket') {
        query = supabase.from('laporan_piket').select('*');
        if (date) {
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(100);

        const { data, error } = await query;
        if (error) console.error('Error loading piket:', error);
        if (data) setPiketList(data);
      }
    } catch (error) {
      console.error('Verif load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveConfig = () => {
    switch (activeTab) {
      case 'Presensi':
        return { table: 'presensi_guru', label: 'Presensi' };
      case 'Jurnal':
        return { table: 'jurnal_pembelajaran', label: 'Jurnal' };
      case 'Piket':
        return { table: 'laporan_piket', label: 'Laporan Piket' };
    }
  };

  const verifyItem = async (id: number | string, status: 'Disetujui' | 'Ditolak') => {
    const { table, label } = getActiveConfig();
    setProcessingId(id);

    try {
      const { error } = await supabase
        .from(table)
        .update({ status_verifikasi: status })
        .eq('id', id);

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memverifikasi',
          text: error.message,
          confirmButtonColor: '#0B4619'
        });
      } else {
        // Optimistic update
        if (activeTab === 'Presensi') {
          setPresensiList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        } else if (activeTab === 'Jurnal') {
          setJurnalList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        } else {
          setPiketList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        }

        Swal.fire({
          icon: status === 'Disetujui' ? 'success' : 'info',
          title: `${label} ${status}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1800
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const bulkVerifyCurrent = async () => {
    const { table, label } = getActiveConfig();
    const pendingItems = displayList.filter(item => item.status_verifikasi !== 'Disetujui');

    if (pendingItems.length === 0) {
      return Swal.fire('Info', `Semua ${label} yang tampil sudah berstatus Disetujui.`, 'info');
    }

    const result = await Swal.fire({
      title: 'Setujui Semua Tampil?',
      text: `Anda akan menyetujui ${pendingItems.length} data ${label} sekaligus.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Setujui Semua',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const pendingIds = pendingItems.map(item => item.id);
      let hasError = false;

      for (let i = 0; i < pendingIds.length; i += 100) {
        const batchIds = pendingIds.slice(i, i + 100);
        const { error } = await supabase
          .from(table)
          .update({ status_verifikasi: 'Disetujui' })
          .in('id', batchIds);

        if (error) {
          hasError = true;
          Swal.fire('Gagal Sebagian', error.message, 'error');
          break;
        }
      }

      if (!hasError) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disetujui',
          text: `${pendingIds.length} data ${label} berhasil disetujui.`,
          confirmButtonColor: '#0B4619'
        });
        loadData();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal memproses persetujuan massal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPresensi = presensiList.filter(p => 
    p.nama_guru?.toLowerCase().includes(search.toLowerCase()) ||
    p.tipe_absen?.toLowerCase().includes(search.toLowerCase()) ||
    p.jenis_presensi?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredJurnal = jurnalList.filter(j => 
    j.nama_guru?.toLowerCase().includes(search.toLowerCase()) ||
    j.mapel?.toLowerCase().includes(search.toLowerCase()) ||
    j.kelas?.toLowerCase().includes(search.toLowerCase()) ||
    j.materi?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPiket = piketList.filter(p => 
    p.guru_pelapor?.toLowerCase().includes(search.toLowerCase()) ||
    p.catatan_apel?.toLowerCase().includes(search.toLowerCase())
  );

  const displayList = activeTab === 'Presensi' ? filteredPresensi : activeTab === 'Jurnal' ? filteredJurnal : filteredPiket;

  return (
    <section id="view-admin-verif" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-check text-green-600 dark:text-green-400"></i> Verifikasi Data
                </h2>
                <button type="button" onClick={loadData} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <i className="fa-regular fa-calendar absolute left-3 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <button type="button" onClick={() => setDate('')} className="btn-click px-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-bold rounded-xl shrink-0 border border-gray-300 dark:border-gray-600">
                      Semua
                    </button>
                </div>
                <button type="button" onClick={bulkVerifyCurrent} className="btn-click w-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 py-2.5 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex justify-center items-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition">
                  <i className="fa-solid fa-check-double"></i> Setujui Semua Tampil
                </button>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
                <button type="button" onClick={() => setActiveTab('Presensi')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${activeTab === 'Presensi' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                  Presensi
                </button>
                <button type="button" onClick={() => setActiveTab('Jurnal')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${activeTab === 'Jurnal' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                  Jurnal
                </button>
                <button type="button" onClick={() => setActiveTab('Piket')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${activeTab === 'Piket' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800' : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                  <i className="fa-solid fa-shield-halved mr-1.5"></i> Piket
                </button>
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
                <input 
                  type="text" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder={activeTab === 'Piket' ? 'Cari guru pelapor atau catatan apel...' : 'Cari nama guru...'} 
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" 
                />
            </div>
            <div id="verif-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                {loading && displayList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">Memuat data...</div>
                ) : displayList.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">Tidak ada data untuk diverifikasi.</div>
                ) : displayList.map((item: any) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                        {activeTab === 'Piket' ? item.guru_pelapor : item.nama_guru}
                      </h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{item.status_verifikasi || 'Menunggu'}</span>
                    </div>
                    {activeTab === 'Presensi' ? (
                      <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                        <p><span className="font-semibold">Waktu:</span> {formatTimestampWita(item.timestamp)}</p>
                        <p><span className="font-semibold">Tipe:</span> <span className="font-bold text-nizamudin-green dark:text-green-400">{item.tipe_absen}</span></p>
                        <p><span className="font-semibold">Jenis:</span> {item.jenis_presensi} {item.detail_izin && `(${item.detail_izin})`}</p>
                        {item.link_bukti && item.link_bukti !== '-' && (
                          <div className="mt-2 flex items-center gap-2">
                            <img 
                              src={transformGoogleDriveUrl(item.link_bukti)} 
                              alt="Bukti Presensi" 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <a href={item.link_bukti} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
                              <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Bukti Lampiran
                            </a>
                          </div>
                        )}
                      </div>
                    ) : activeTab === 'Jurnal' ? (
                      <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                        <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                        <p><span className="font-semibold">Kelas/Mapel:</span> {item.kelas} - {item.mapel}</p>
                        <p className="line-clamp-2"><span className="font-semibold">Materi:</span> {item.materi}</p>
                        {item.link_bukti_foto && item.link_bukti_foto !== '-' && (
                          <div className="mt-2 flex items-center gap-2">
                            <img 
                              src={transformGoogleDriveUrl(item.link_bukti_foto)} 
                              alt="Bukti Jurnal" 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <a href={item.link_bukti_foto} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
                              <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Bukti Lampiran
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                        <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                        <p><span className="font-semibold">Guru Pelapor:</span> {item.guru_pelapor}</p>
                        <p className="line-clamp-2"><span className="font-semibold">Catatan Apel:</span> {item.catatan_apel || '-'}</p>
                        {item.link_foto && item.link_foto !== '-' && (
                          <div className="mt-2 flex items-center gap-2">
                            <img 
                              src={transformGoogleDriveUrl(item.link_foto)} 
                              alt="Foto Piket" 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline text-xs block">
                              <i className="fa-solid fa-camera mr-1"></i> Foto Piket
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button 
                        disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
                        onClick={() => verifyItem(item.id, 'Disetujui')} 
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                          item.status_verifikasi === 'Disetujui'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                            : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                        }`}
                      >
                        {processingId === item.id ? (
                          <i className="fa-solid fa-spinner animate-spin"></i>
                        ) : (
                          <><i className="fa-solid fa-check"></i> Setujui</>
                        )}
                      </button>
                      <button 
                        disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
                        onClick={() => verifyItem(item.id, 'Ditolak')} 
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                          item.status_verifikasi === 'Ditolak'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
                            : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                        }`}
                      >
                        {processingId === item.id ? (
                          <i className="fa-solid fa-spinner animate-spin"></i>
                        ) : (
                          <><i className="fa-solid fa-xmark"></i> Tolak</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-600 dark:text-white/80 font-medium">{displayList.length} Data</span>
            </div>
        </div>
    </section>
  );
}

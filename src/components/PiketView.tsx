'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimestamp } from '@/lib/wita';

export default function PiketView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('beranda');
  const [jadwalPiket, setJadwalPiket] = useState<any[]>([]);
  const [laporanPiket, setLaporanPiket] = useState<any[]>([]);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [activeKelas, setActiveKelas] = useState<string>('');
  const [piketAbsensi, setPiketAbsensi] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);

  useEffect(() => {
    fetchDataPiket();

    const fetchStudents = async () => {
      const { data } = await supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });
      if (data) {
        setAllStudents(data);
        const uniqueKelas = [...new Set(data.map(s => s.kelas).filter(Boolean))];
        setKelasList(uniqueKelas as string[]);
        if (uniqueKelas.length > 0) setActiveKelas(uniqueKelas[0] as string);
        
        // Initialize default attendance
        const initialAbsensi: Record<string, string> = {};
        data.forEach(s => {
          initialAbsensi[s.nisn] = 'H';
        });
        setPiketAbsensi(initialAbsensi);
      }
    };
    fetchStudents();

    if (user?.role === 'Guru') {
      getGuruDailyState(user.nama).then(setDailyState).catch(console.error);
    }
  }, [user]);

  const fetchDataPiket = async () => {
    // Fetch Jadwal
    const { data: jadwal } = await supabase.from('jadwal_piket').select('*');
    if (jadwal) setJadwalPiket(jadwal);

    // Fetch Laporan
    const { data: laporan } = await supabase.from('laporan_piket').select('*').order('timestamp', { ascending: false }).limit(10);
    if (laporan) setLaporanPiket(laporan);
  };

  const handlePiketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let fileUrl = '';
    if (file) {
      try {
        fileUrl = await uploadToDrive(file, user.nama, 'Laporan_Piket', 'Piket');
      } catch (err: any) {
        setLoading(false);
        return Swal.fire('Gagal Upload', err.message, 'error');
      }
    }

    const newLaporan = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      tanggal: getWitaDateStr(),
      guru_pelapor: user.nama,
      rekap_absen_kelas: JSON.stringify(piketAbsensi),
      catatan_apel: catatan,
      link_foto: fileUrl,
      status_verifikasi: 'Menunggu',
      kehadiran_guru_piket: 'Hadir'
    };

    const { error } = await supabase.from('laporan_piket').insert([newLaporan]);

    if (error) {
      Swal.fire('Error', 'Gagal menyimpan laporan piket', 'error');
    } else {
      Swal.fire('Berhasil', 'Laporan piket berhasil disimpan!', 'success');
      setCatatan('');
      setFile(null);
      setActiveTab('beranda');
      fetchDataPiket(); // Refresh data
      if (user?.role === 'Guru') getGuruDailyState(user.nama).then(setDailyState).catch(console.error);
    }
    setLoading(false);
  };

  const isGuru = user?.role === 'Guru';
  const canReport = !isGuru || (dailyState && dailyState.isPiket && !dailyState.isLibur);

  return (
    <section id="view-piket" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-teal-600"></i> Modul Piket
                </h2>
                <button type="button" onClick={fetchDataPiket} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>

            {dailyState?.isLibur && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200">
                <i className="fa-solid fa-lock mr-2"></i> Akses Terkunci: {dailyState.lockedReason}
              </div>
            )}

            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
              <button 
                onClick={() => setActiveTab('beranda')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'beranda' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-600 border border-transparent dark:bg-gray-800 dark:text-gray-300'}`}
              >
                Beranda Piket
              </button>
              {canReport && (
                <button 
                  onClick={() => setActiveTab('lapor')} 
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'lapor' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-600 border border-transparent dark:bg-gray-800 dark:text-gray-300'}`}
                >
                  Isi Laporan
                </button>
              )}
            </div>

            {activeTab === 'beranda' && (
              <div id="piket-content-beranda" className="space-y-4 fade-in">
                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl">
                      <h3 className="text-xs font-bold text-teal-800 dark:text-teal-400 mb-3">
                        <i className="fa-regular fa-calendar-check mr-1"></i> Jadwal Piket Harian
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scroll pr-1">
                        {jadwalPiket.length === 0 ? (
                          <div className="text-center text-[10px] text-gray-500 py-2">Belum ada jadwal.</div>
                        ) : jadwalPiket.map(j => (
                          <div key={j.id} className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-teal-100 dark:border-teal-900">
                            <div className="font-bold text-teal-700 dark:text-teal-400 text-xs">{j.hari}</div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">{j.daftar_guru}</div>
                          </div>
                        ))}
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between items-center mb-3 px-1">
                          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300"><i className="fa-solid fa-list-check mr-1 text-gray-400"></i> Laporan Terbaru</h3>
                      </div>
                      <div className="space-y-3 min-h-[150px]">
                        {laporanPiket.length === 0 ? (
                          <div className="text-center text-[10px] text-gray-500 py-4">Belum ada laporan.</div>
                        ) : laporanPiket.map(l => (
                          <div key={l.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-bold text-xs text-gray-800 dark:text-gray-200">{l.guru_pelapor}</div>
                              <div className="text-[9px] text-gray-400">{l.tanggal}</div>
                            </div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2">{l.catatan_apel || "Tidak ada catatan."}</div>
                          </div>
                        ))}
                      </div>
                  </div>
              </div>
            )}

            {activeTab === 'lapor' && canReport && (
              <div id="piket-content-form" className="fade-in space-y-4">
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl mb-4 text-[10px] text-orange-800 font-medium leading-relaxed">
                      <i className="fa-solid fa-circle-info mr-1"></i> Silakan isi laporan karena Anda ditugaskan piket hari ini. Periksa seluruh kelas secara bergantian.
                  </div>
                  <form onSubmit={handlePiketSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Tanggal Piket</label>
                        <input type="date" required value={getWitaDateStr()} readOnly className="w-full px-3 py-2.5 text-sm rounded-xl input-premium bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                      </div>
                      
                      <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-900/50 rounded-xl p-3">
                        <label className="block text-[11px] font-bold text-teal-800 dark:text-teal-400 mb-2">
                          <i className="fa-solid fa-clipboard-check mr-1"></i> Rekap Absensi Sekolah
                        </label>
                        <div className="flex gap-2 overflow-x-auto custom-scroll pb-2 mb-2">
                          {kelasList.map(k => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setActiveKelas(k)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                                activeKelas === k 
                                ? 'bg-teal-600 text-white shadow-md' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                              }`}
                            >
                              Kelas {k}
                            </button>
                          ))}
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                          {allStudents.filter(s => s.kelas === activeKelas).map((siswa, idx) => (
                            <div key={siswa.nisn} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 w-4">{idx + 1}.</span>
                                <div>
                                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{siswa.nama_siswa}</div>
                                  <div className="text-[9px] text-gray-500">{siswa.nisn}</div>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {['H', 'S', 'I', 'A'].map(status => (
                                  <button 
                                    key={status}
                                    type="button"
                                    onClick={() => setPiketAbsensi(prev => ({...prev, [siswa.nisn]: status}))}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${
                                      piketAbsensi[siswa.nisn] === status 
                                      ? (status === 'H' ? 'bg-green-500 text-white shadow-sm' : 
                                         status === 'S' ? 'bg-blue-500 text-white shadow-sm' : 
                                         status === 'I' ? 'bg-orange-500 text-white shadow-sm' : 
                                         'bg-red-500 text-white shadow-sm') 
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Catatan Khusus</label>
                        <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none" placeholder="Deskripsikan kejadian saat piket..."></textarea>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Upload Foto Dokumentasi Piket <span className="text-red-500">(Wajib)</span></label>
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800" />
                      </div>
                      <div className="pt-2">
                        <button type="submit" disabled={loading} className="btn-click w-full bg-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-teal-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                          {loading ? 'Menyimpan...' : <><i className="fa-solid fa-paper-plane"></i> Kirim Laporan</>}
                        </button>
                      </div>
                  </form>
              </div>
            )}
        </div>
    </section>
  );
}

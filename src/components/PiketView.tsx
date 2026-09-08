'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function PiketView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('beranda');
  const [jadwalPiket, setJadwalPiket] = useState<any[]>([]);
  const [laporanPiket, setLaporanPiket] = useState<any[]>([]);

  useEffect(() => {
    fetchDataPiket();
  }, []);

  const fetchDataPiket = async () => {
    // Fetch Jadwal
    const { data: jadwal } = await supabase.from('jadwal_piket').select('*');
    if (jadwal) setJadwalPiket(jadwal);

    // Fetch Laporan
    const { data: laporan } = await supabase.from('laporan_piket').select('*').order('timestamp', { ascending: false }).limit(10);
    if (laporan) setLaporanPiket(laporan);
  };

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

            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
              <button 
                onClick={() => setActiveTab('beranda')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'beranda' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-600 border border-transparent dark:bg-gray-800 dark:text-gray-300'}`}
              >
                Beranda Piket
              </button>
              <button 
                onClick={() => setActiveTab('lapor')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'lapor' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-600 border border-transparent dark:bg-gray-800 dark:text-gray-300'}`}
              >
                Isi Laporan
              </button>
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

            {activeTab === 'lapor' && (
              <div id="piket-content-form" className="fade-in space-y-4">
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl mb-4 text-[10px] text-orange-800 font-medium leading-relaxed">
                      <i className="fa-solid fa-circle-info mr-1"></i> Silakan isi laporan jika Anda ditugaskan piket hari ini. Periksa seluruh kelas secara bergantian. Foto dokumentasi wajib dilampirkan.
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); Swal.fire('Info', 'Fitur simpan laporan sedang dikembangkan', 'info'); }} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Tanggal Piket</label>
                        <input type="date" required value={new Date().toISOString().split('T')[0]} readOnly className="w-full px-3 py-2.5 text-sm rounded-xl input-premium bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Catatan Khusus</label>
                        <textarea rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none" placeholder="Deskripsikan kejadian saat piket..."></textarea>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Upload Foto Dokumentasi Piket <span className="text-red-500">(Wajib)</span></label>
                        <input type="file" accept="image/*" required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800" />
                      </div>
                      <div className="pt-2">
                        <button type="submit" className="btn-click w-full bg-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-teal-900/20 text-sm flex items-center justify-center gap-2">
                          <i className="fa-solid fa-paper-plane"></i> Kirim Laporan
                        </button>
                      </div>
                  </form>
              </div>
            )}
        </div>
    </section>
  );
}

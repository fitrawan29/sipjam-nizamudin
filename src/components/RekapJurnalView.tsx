'use client';

import { useState } from 'react';

export default function RekapJurnalView({ user }: { user: any }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');

  return (
    <section id="view-guru-rekap-jurnal" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-book-open text-indigo-500"></i> Rekap Jurnal Pribadi
            </h2>
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">DARI TANGGAL</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">SAMPAI TANGGAL</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">KELAS / ANGKATAN</label>
                      <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800">
                        <option value="">Semua Kelas</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">MATA PELAJARAN</label>
                      <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800">
                        <option value="">Semua Mapel</option>
                      </select>
                    </div>
                </div>
                <button type="button" className="btn-click w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition">
                  <i className="fa-solid fa-search"></i> Tampilkan Rekap
                </button>
            </div>
            <div id="hasil-rekap-jurnal-guru" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[150px]">
                <div className="text-center py-10 text-gray-400 text-[11px] italic col-span-full">Silakan atur filter dan klik tampilkan.</div>
            </div>
            <div id="btn-group-jurnal-guru" className="hidden grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button type="button" className="btn-click w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                  <i className="fa-solid fa-file-excel"></i> Excel
                </button>
                <button type="button" className="btn-click w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                  <i className="fa-solid fa-print"></i> Cetak Dokumen
                </button>
            </div>
        </div>
    </section>
  );
}

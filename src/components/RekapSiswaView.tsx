'use client';

import { useState } from 'react';

export default function RekapSiswaView({ user }: { user: any }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');

  return (
    <section id="view-rekap-siswa" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-users-viewfinder text-teal-500"></i> Rekap Absen Siswa
            </h2>
            <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl mb-4 space-y-3">
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
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">KELAS <span className="text-red-500">*</span></label>
                      <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800">
                        <option value="" disabled>Pilih...</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">MATA PELAJARAN</label>
                      <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-800">
                        <option value="">Semua Mapel</option>
                      </select>
                    </div>
                </div>
                <button type="button" className="btn-click w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition">
                  <i className="fa-solid fa-search"></i> Tampilkan Rekap
                </button>
            </div>
            <div id="hasil-rekap-siswa" className="hidden flex-col gap-3">
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl custom-scroll bg-white dark:bg-gray-800 shadow-sm">
                    <table className="w-full text-[10px] text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-[9px] text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700" id="tabel-rekap-siswa-head"></thead>
                        <tbody id="tabel-rekap-siswa-body"></tbody>
                    </table>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <button type="button" className="btn-click w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                      <i className="fa-solid fa-file-excel"></i> Excel
                    </button>
                    <button type="button" className="btn-click w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                      <i className="fa-solid fa-print"></i> Cetak Dokumen
                    </button>
                </div>
            </div>
            <div id="rekap-siswa-kosong" className="text-center py-10 text-gray-400 text-[11px] italic">Silakan atur filter dan klik tampilkan.</div>
        </div>
    </section>
  );
}

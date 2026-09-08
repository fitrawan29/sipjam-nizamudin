'use client';

import { useState } from 'react';

export default function AdminRekapView({ user }: { user: any }) {
  const [bulan, setBulan] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <section id="view-admin-rekap" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-blue-500"></i> Rekapitulasi Akhir
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl mb-5">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-2">Pilih Bulan</label>
                <div className="flex gap-2">
                    <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="flex-grow px-3 py-2.5 rounded-xl input-premium text-sm bg-white dark:bg-gray-800 dark:text-white" />
                    <button type="button" className="btn-click bg-blue-600 text-white px-4 rounded-xl text-xs font-bold shadow-md border border-blue-700 hover:bg-blue-700">
                      <i className="fa-solid fa-download"></i>
                    </button>
                </div>
            </div>
            <details className="mb-5 text-sm group">
                <summary className="font-bold text-[11px] text-gray-500 cursor-pointer outline-none flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <i className="fa-solid fa-caret-right transition-transform group-open:rotate-90"></i> Filter Rentang Khusus
                </summary>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 mb-1">DARI</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 mb-1">SAMPAI</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>
                    <button type="button" className="btn-click w-full bg-gray-800 dark:bg-gray-600 text-white py-2 rounded-lg text-[11px] font-bold shadow-sm hover:bg-gray-900 transition">Tarik Data Custom</button>
                </div>
            </details>
            <div id="hasil-rekap" className="hidden space-y-5">
                <div>
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-user-check text-green-500"></i> Kehadiran Guru
                    </h3>
                    <div id="card-rekap-presensi" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 border-t dark:border-gray-800 pt-4">
                      <i className="fa-solid fa-book text-blue-500"></i> Total Jurnal Disetujui
                    </h3>
                    <div id="card-rekap-jurnal" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
                </div>
                <div className="pt-2 border-t dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <button type="button" className="btn-click w-full bg-green-600 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                      <i className="fa-solid fa-file-excel"></i> Excel
                    </button>
                    <button type="button" className="btn-click w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                      <i className="fa-solid fa-print"></i> Cetak PDF
                    </button>
                </div>
                <p className="text-center text-[9px] text-gray-400 mt-1">*Termasuk Detail Daftar Nama Siswa & Absensinya</p>
            </div>
            {/* Placeholder until results shown */}
            <div className="text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">
              Pilih bulan untuk menarik rekap.
            </div>
        </div>
    </section>
  );
}

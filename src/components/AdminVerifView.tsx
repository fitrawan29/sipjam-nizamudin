'use client';

import { useState } from 'react';

export default function AdminVerifView({ user }: { user: any }) {
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Presensi');

  return (
    <section id="view-admin-verif" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-check text-green-600"></i> Verifikasi Data
                </h2>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <i className="fa-regular fa-calendar absolute left-3 top-3.5 text-gray-400 text-xs"></i>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 dark:text-white" />
                    </div>
                    <button type="button" onClick={() => setDate('')} className="btn-click px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-xl shrink-0 border border-gray-300 dark:border-gray-600">
                      Semua
                    </button>
                </div>
                <button type="button" className="btn-click w-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2.5 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex justify-center items-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition">
                  <i className="fa-solid fa-check-double"></i> Setujui Semua Tampil
                </button>
            </div>
            <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setActiveTab('Presensi')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm border border-gray-200 transition ${activeTab === 'Presensi' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                  Presensi
                </button>
                <button type="button" onClick={() => setActiveTab('Jurnal')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm border border-gray-200 transition ${activeTab === 'Jurnal' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                  Jurnal
                </button>
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama guru..." className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-white" />
            </div>
            <div id="verif-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Tidak ada data untuk diverifikasi.</div>
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-medium">0 Data</span>
                <div className="flex gap-2">
                    <button type="button" className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300"><i className="fa-solid fa-chevron-left"></i></button>
                    <button type="button" className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300"><i className="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    </section>
  );
}

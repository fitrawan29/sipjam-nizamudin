'use client';

import { useState } from 'react';

export default function AdminMonitorView({ user }: { user: any }) {
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  return (
    <section id="view-admin-monitor" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-clock text-orange-500"></i> Pantauan Harian
                </h2>
                <button type="button" className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/50 p-3 rounded-2xl mb-4">
                <label className="block text-[11px] font-bold text-orange-800 dark:text-orange-400 mb-1.5">
                  <i className="fa-regular fa-calendar"></i> Pantau Tanggal
                </label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama guru..." className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-white" />
            </div>
            <div id="monitor-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Pilih tanggal untuk memantau kehadiran guru.</div>
            </div>
        </div>
    </section>
  );
}

'use client';

import { useState } from 'react';

export default function AnalitikView({ user }: { user: any }) {
  const [bulan, setBulan] = useState('');

  return (
    <section id="view-analitik" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-rose-500"></i> Dasbor Analitik
                </h2>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 p-3 rounded-2xl mb-4 flex gap-2">
                <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="flex-grow px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 dark:text-white" />
                <button type="button" className="btn-click bg-rose-600 hover:bg-rose-700 text-white px-4 rounded-xl text-xs font-bold shadow-md border border-rose-700 transition">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 mb-5 shadow-sm">
                <h3 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2">Tren Kehadiran & Jurnal</h3>
                <div className="relative h-48 w-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  {/* Canvas placeholder */}
                  <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">Chart Analytics (Segera Hadir)</span>
                </div>
            </div>
            <div>
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-medal text-yellow-500"></i> Papan Peringkat (Top 10)
                </h3>
                <div id="leaderboard-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 min-h-[150px]">
                    <div className="text-center py-5 text-[10px] text-gray-400 italic dark:text-gray-500 col-span-full">Pilih bulan dan klik proses...</div>
                </div>
            </div>
        </div>
    </section>
  );
}

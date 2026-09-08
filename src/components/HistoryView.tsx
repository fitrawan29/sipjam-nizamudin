'use client';

import { useState } from 'react';

export default function HistoryView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('presensi');
  const [search, setSearch] = useState('');

  return (
    <section id="view-history" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-list text-gray-500"></i> Riwayat Anda
                </h2>
                <button type="button" className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            <div className="flex gap-2 mb-4">
                <button 
                  type="button" 
                  onClick={() => setActiveTab('presensi')} 
                  className={`btn-click flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${activeTab === 'presensi' ? 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border border-transparent'}`}
                >
                  Presensi
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveTab('jurnal')} 
                  className={`btn-click flex-1 text-[11px] font-bold py-2 rounded-lg transition-all ${activeTab === 'jurnal' ? 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600' : 'bg-transparent text-gray-500 dark:text-gray-400 border border-transparent'}`}
                >
                  Jurnal
                </button>
            </div>
            <div className="relative mb-4">
                <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari riwayat..." 
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-gray-200" 
                />
            </div>
            <div id="hist-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
              <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Belum ada riwayat.</div>
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-medium">0 Data</span>
                <div className="flex gap-2">
                    <button type="button" className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300">
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button type="button" className="btn-click w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xs disabled:opacity-30 border border-gray-200 dark:border-gray-700 dark:text-gray-300">
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </section>
  );
}

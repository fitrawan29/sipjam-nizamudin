'use client';

import { useState } from 'react';

export default function AdminDataView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('Data_Siswa');
  const [search, setSearch] = useState('');

  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa' },
    { id: 'Data_Guru', label: 'Guru' },
    { id: 'Data_Mapel', label: 'Mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal' },
  ];

  return (
    <section id="view-admin-data" className="view-section fade-in">
        <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-database text-purple-500"></i> Master Data
            </h2>
            <div className="flex overflow-x-auto custom-scroll gap-2 mb-4 pb-1">
                {tabs.map(tab => (
                  <button 
                    key={tab.id}
                    type="button" 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`btn-click master-tab-btn px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border transition ${activeTab === tab.id ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' : 'border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/30 mb-4">
                <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase truncate">Impor Excel</span>
                    <div className="flex gap-1.5 shrink-0">
                        <button type="button" className="btn-click bg-white dark:bg-gray-800 px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 shadow-sm border border-gray-300 dark:border-gray-600">Template</button>
                        <button type="button" className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-bold shadow-md"><i className="fa-solid fa-upload"></i> Unggah</button>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="relative flex-grow">
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium dark:bg-gray-800 dark:text-white" />
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <button type="button" className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-700"><i className="fa-solid fa-rotate-right"></i></button>
                    <button type="button" className="btn-click bg-nizamudin-green text-white px-3 h-8 rounded-xl text-[10px] font-bold shadow-md flex items-center gap-1 border border-nizamudin-light hover:brightness-110"><i className="fa-solid fa-plus"></i> Baru</button>
                </div>
            </div>
            <div id="master-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Memuat data master...</div>
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

'use client';

import { useState, useEffect } from 'react';
import HomeView from './HomeView';
import GuruPresensi from './GuruPresensi';
import GuruJurnal from './GuruJurnal';
import PiketView from './PiketView';
// Import other views as we build them

export default function AppScreen({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [currentView, setCurrentView] = useState('view-home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const menuItems = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-guru-presensi', icon: 'fa-user-check', label: 'Presensi Guru' },
    { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Pembelajaran' },
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' },
  ];

  return (
    <div className="flex-col h-full w-full flex">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px]">
        <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={toggleSidebar} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">
                <i className="fa-solid fa-bars text-sm"></i>
            </button>
            <div className="text-sm md:text-base font-bold text-gray-800 dark:text-white cursor-pointer" onClick={() => setCurrentView('view-home')}>
              SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">Nizamudin</span>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-nizamudin-gold shadow-sm border border-gray-200 dark:border-gray-700">
                <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xs`}></i>
            </button>
            <button type="button" onClick={onLogout} className="btn-click bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800/50 flex items-center gap-1.5 shadow-sm">
                <i className="fa-solid fa-power-off text-xs"></i> <span className="hidden sm:inline">Keluar</span>
            </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={toggleSidebar}>
          <div className="w-72 max-w-[85%] bg-white dark:bg-gray-900 h-full shadow-2xl p-5 flex flex-col justify-between transform transition-transform" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-nizamudin-green rounded-lg flex items-center justify-center text-nizamudin-gold font-bold">
                        <i className="fa-solid fa-mosque"></i>
                    </div>
                    <span className="font-bold text-sm text-gray-800 dark:text-white">SIPJAM Menu</span>
                </div>
                <button type="button" onClick={toggleSidebar} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)] custom-scroll">
                {menuItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { setCurrentView(item.id); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                      currentView === item.id 
                        ? 'bg-green-50 text-nizamudin-green border border-green-200 dark:bg-green-900/20 dark:text-nizamudin-gold dark:border-green-800/50' 
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-5 text-center`}></i> {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto custom-scroll w-full relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 z-10 max-w-7xl mx-auto">
        {currentView === 'view-home' && <HomeView user={user} setView={setCurrentView} />}
        {currentView === 'view-guru-presensi' && <GuruPresensi user={user} />}
        {currentView === 'view-guru-jurnal' && <GuruJurnal user={user} />}
        {currentView === 'view-piket' && <PiketView user={user} />}
      </main>
    </div>
  );
}

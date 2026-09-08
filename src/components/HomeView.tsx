'use client';

export default function HomeView({ user, setView, menuItems = [] }: { user: any, setView: (view: string) => void, menuItems?: any[] }) {
  // Parse clock 
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Map icons to appropriate Tailwind colors for visual variety
  const getColorClasses = (index: number) => {
    const colors = [
      { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', hover: 'hover:bg-green-50 dark:hover:bg-green-900/20' },
      { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
      { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
      { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
      { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', hover: 'hover:bg-rose-50 dark:hover:bg-rose-900/20' },
      { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', hover: 'hover:bg-teal-50 dark:hover:bg-teal-900/20' },
      { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
      { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
    ];
    return colors[index % colors.length];
  };

  return (
    <section id="view-home" className="fade-in block space-y-4">
      <div className="bg-gradient-to-br from-[#0B4619] to-[#1a7031] rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-green-900/20 text-white relative overflow-hidden border border-green-700/50">
          <i className="fa-solid fa-mosque absolute -right-4 -bottom-4 text-7xl text-white opacity-5 rotate-[-15deg] pointer-events-none"></i>
          
          <div className="relative z-10 flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shrink-0">
                      <i className="fa-solid fa-user-tie text-lg sm:text-xl text-white"></i>
                  </div>
                  <div className="min-w-0">
                      <div className="flex items-center gap-2">
                          <h2 className="font-bold text-sm sm:text-base leading-tight truncate">{user.nama}</h2>
                          <span className="bg-nizamudin-gold/90 text-green-900 px-2 py-0.5 rounded-full font-bold text-[8px] sm:text-[9px] uppercase shadow-sm shrink-0">
                            {user.role}
                          </span>
                      </div>
                      <p className="text-[10px] text-green-100/80 font-mono mt-0.5 tracking-wider truncate flex items-center gap-1.5">
                          <span>{user.username}</span>
                          <span className="truncate font-sans font-medium">SMA NIZAMUDIN</span>
                      </p>
                  </div>
              </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/10">
              <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
                  <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Status</p>
                  <p className="text-[10px] sm:text-xs font-bold text-white truncate">Aktif</p>
              </div>
              <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
                  <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Tanggal</p>
                  <p className="text-[10px] sm:text-xs font-bold text-white truncate">{dateStr.split(',')[0]}</p>
              </div>
              <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
                  <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Jam</p>
                  <p className="text-xs sm:text-sm font-black text-nizamudin-gold font-mono tracking-tight leading-none pt-0.5">{timeStr}</p>
              </div>
          </div>
      </div>

      <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 px-1">Aktivitas Utama</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {menuItems.filter(item => item.id !== 'view-home').map((item, idx) => {
                const colors = getColorClasses(idx);
                return (
                  <button key={item.id} onClick={() => setView(item.id)} className={`glass-card p-4 text-center transition-colors ${colors.hover}`}>
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${colors.bg} ${colors.text}`}>
                      <i className={`fa-solid ${item.icon} text-xl`}></i>
                    </div>
                    <h4 className="font-bold text-[11px] sm:text-xs text-gray-800 dark:text-gray-200">{item.label}</h4>
                  </button>
                );
              })}
          </div>
      </div>
    </section>
  );
}

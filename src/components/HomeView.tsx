'use client';

import { useState, useEffect } from 'react';
import { getWitaDateLong, getWitaTimeStr } from '@/lib/wita';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';

export default function HomeView({ user, setView, menuItems = [] }: { user: any, setView: (view: string) => void, menuItems?: any[] }) {
  const dateStr = getWitaDateLong();
  const timeStr = getWitaTimeStr();
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);
  const [loadingState, setLoadingState] = useState(false);

  const isGuru = user?.role !== 'Admin';

  useEffect(() => {
    if (isGuru && user?.nama) {
      setLoadingState(true);
      getGuruDailyState(user.nama)
        .then(setDailyState)
        .catch(console.error)
        .finally(() => setLoadingState(false));
    }
  }, [isGuru, user?.nama]);

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

  // Build workflow steps for the tracker
  const getWorkflowSteps = () => {
    if (!dailyState) return [];

    const steps: { label: string; status: 'done' | 'active' | 'locked' | 'skipped'; detail: string; icon: string }[] = [];

    // Step 1: Presensi Datang
    if (dailyState.isLibur) {
      steps.push({ label: 'Hari Libur', status: 'skipped', detail: dailyState.keteranganLibur || 'Libur', icon: 'fa-calendar-xmark' });
      return steps;
    }

    if (dailyState.presensiDatang) {
      const jp = dailyState.presensiDatang.jenis_presensi;
      const ts = dailyState.presensiDatang.timestamp || '';
      const timeOnly = ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : '');
      steps.push({ label: 'Presensi Datang', status: 'done', detail: `${jp} · ${timeOnly} WITA`, icon: 'fa-right-to-bracket' });
    } else {
      steps.push({ label: 'Presensi Datang', status: 'active', detail: 'Belum presensi hari ini', icon: 'fa-right-to-bracket' });
      return steps; // Can't proceed further
    }

    // If Izin/Sakit — done, no more steps
    if (dailyState.isIzinSakit) {
      steps.push({ label: 'Izin/Sakit', status: 'skipped', detail: `Status: ${dailyState.presensiDatang.jenis_presensi}`, icon: 'fa-bed' });
      return steps;
    }

    // Step 2: Piket (if applicable)
    if (dailyState.isPiket) {
      if (dailyState.laporanPiket) {
        steps.push({ label: 'Laporan Piket', status: 'done', detail: 'Sudah diisi', icon: 'fa-shield-halved' });
      } else {
        steps.push({ label: 'Laporan Piket', status: 'active', detail: 'Belum mengisi laporan piket', icon: 'fa-shield-halved' });
      }
    }

    // Step 3: Jurnal
    if (dailyState.isDinasLuar || dailyState.jadwalKBM.length === 0) {
      // Jurnal Kegiatan
      if (dailyState.jurnalKegiatan) {
        steps.push({ label: 'Jurnal Kegiatan', status: 'done', detail: 'Sudah diisi', icon: 'fa-book-journal-whills' });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: 'Jurnal Kegiatan', status: canOpen ? 'active' : 'locked', detail: canOpen ? 'Belum mengisi jurnal kegiatan' : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills' });
      }
    } else {
      // Jurnal KBM
      const filled = dailyState.jurnalKBM.length;
      const total = dailyState.jadwalKBM.length;
      if (filled >= total) {
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: 'done', detail: 'Semua jurnal KBM sudah diisi', icon: 'fa-book-journal-whills' });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: canOpen ? 'active' : 'locked', detail: canOpen ? `Masih ada ${total - filled} jurnal yang belum diisi` : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills' });
      }
    }

    // Step 4: Presensi Pulang
    if (dailyState.presensiPulang) {
      const ts = dailyState.presensiPulang.timestamp || '';
      const timeOnly = ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : '');
      steps.push({ label: 'Presensi Pulang', status: 'done', detail: `Pulang · ${timeOnly} WITA`, icon: 'fa-right-from-bracket' });
    } else if (dailyState.canPresensiPulang) {
      steps.push({ label: 'Presensi Pulang', status: 'active', detail: 'Semua tugas selesai, silakan absen pulang', icon: 'fa-right-from-bracket' });
    } else {
      steps.push({ label: 'Presensi Pulang', status: 'locked', detail: 'Selesaikan semua tugas terlebih dahulu', icon: 'fa-right-from-bracket' });
    }

    return steps;
  };

  const steps = isGuru ? getWorkflowSteps() : [];

  // Determine next action message
  const getNextAction = () => {
    if (!dailyState) return null;
    if (dailyState.isLibur) return { text: `Hari ini libur: ${dailyState.keteranganLibur}`, color: 'text-blue-600 dark:text-blue-400' };
    if (dailyState.isIzinSakit) return { text: `Anda sedang ${dailyState.presensiDatang?.jenis_presensi}. Tidak perlu mengisi tugas lain.`, color: 'text-blue-600 dark:text-blue-400' };
    if (!dailyState.presensiDatang) return { text: 'Silakan lakukan Presensi Datang terlebih dahulu.', color: 'text-amber-600 dark:text-amber-400' };
    if (dailyState.isPiket && !dailyState.laporanPiket) return { text: 'Anda perlu mengisi Laporan Piket hari ini.', color: 'text-amber-600 dark:text-amber-400' };
    if (!dailyState.canOpenJurnal) return { text: 'Selesaikan Laporan Piket untuk membuka Jurnal.', color: 'text-amber-600 dark:text-amber-400' };
    if (dailyState.lockedReason && !dailyState.canPresensiPulang) return { text: dailyState.lockedReason, color: 'text-amber-600 dark:text-amber-400' };
    if (dailyState.canPresensiPulang && !dailyState.presensiPulang) return { text: 'Semua tugas selesai! Silakan lakukan Presensi Pulang.', color: 'text-green-600 dark:text-green-400' };
    if (dailyState.presensiPulang) return { text: 'Semua tugas hari ini sudah selesai. Terima kasih!', color: 'text-green-600 dark:text-green-400' };
    return null;
  };

  const nextAction = isGuru ? getNextAction() : null;

  return (
    <section id="view-home" className="fade-in block space-y-4">
      {/* Header Banner */}
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

      {/* Workflow Status Tracker - Only for Guru */}
      {isGuru && (
        <div className="glass-card p-4">
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-emerald-500"></i> Status Tugas Hari Ini
          </h3>

          {loadingState ? (
            <div className="flex items-center justify-center py-6 text-gray-400 dark:text-gray-500">
              <i className="fa-solid fa-circle-notch fa-spin text-lg mr-2"></i>
              <span className="text-xs">Memeriksa status...</span>
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-xs italic">
              Tidak ada data status hari ini.
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  {/* Vertical line connector */}
                  {idx < steps.length - 1 && (
                    <div className={`absolute left-[13px] top-[26px] w-0.5 h-[calc(100%-2px)] ${
                      step.status === 'done' ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                  
                  {/* Status icon */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs z-10 ${
                    step.status === 'done' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' :
                    step.status === 'active' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-300 dark:ring-amber-700' :
                    step.status === 'skipped' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                    'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  }`}>
                    {step.status === 'done' ? <i className="fa-solid fa-check" /> :
                     step.status === 'active' ? <i className={`fa-solid ${step.icon}`} /> :
                     step.status === 'skipped' ? <i className="fa-solid fa-minus" /> :
                     <i className="fa-solid fa-lock text-[9px]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-grow pb-4">
                    <p className={`text-[11px] font-bold ${
                      step.status === 'done' ? 'text-green-700 dark:text-green-400' :
                      step.status === 'active' ? 'text-amber-700 dark:text-amber-400' :
                      step.status === 'skipped' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-400 dark:text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${
                      step.status === 'done' ? 'text-green-600/70 dark:text-green-500/70' :
                      step.status === 'active' ? 'text-amber-600/70 dark:text-amber-400/70' :
                      step.status === 'skipped' ? 'text-blue-500/70 dark:text-blue-400/70' :
                      'text-gray-400 dark:text-gray-600'
                    }`}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next action message */}
          {nextAction && (
            <div className={`mt-1 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2 ${nextAction.color}`}>
              <i className="fa-solid fa-circle-info text-xs mt-0.5 shrink-0"></i>
              <p className="text-[11px] font-semibold leading-snug">{nextAction.text}</p>
            </div>
          )}
        </div>
      )}

      {/* Menu Grid */}
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

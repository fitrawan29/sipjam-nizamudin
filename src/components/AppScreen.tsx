'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import HomeView from './HomeView';
import GuruPresensi from './GuruPresensi';
import GuruJurnal from './GuruJurnal';
import PiketView from './PiketView';
import DokumenView from './DokumenView';
import HistoryView from './HistoryView';
import RekapJurnalView from './RekapJurnalView';
import RekapSiswaView from './RekapSiswaView';
import InformasiView from './InformasiView';
import AdminVerifView from './AdminVerifView';
import AdminRekapView from './AdminRekapView';
import AdminDataView from './AdminDataView';
import AdminBackupView from './AdminBackupView';
import AdminConfigView from './AdminConfigView';
import AnalitikView from './AnalitikView';
import SuperadminView from './SuperadminView';
import GradebookView from './GradebookView';
import ChatView from './ChatView';
import AccountSettingsModal from './AccountSettingsModal';
import PushNotificationPrompt from './PushNotificationPrompt';
import PWAInstallPrompt from './PWAInstallPrompt';
import { Pengumuman } from '@/types/database';
import { supabase } from '@/lib/supabaseClient';
import { getGuruDailyState } from '@/lib/workflow';
import { useTheme } from '@/context/ThemeContext';

export default function AppScreen({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view) return view;
    }
    if (user?.role === 'Superadmin') return 'view-superadmin-overview';
    return 'view-home';
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view) {
        setCurrentView(view);
      } else {
        setCurrentView(user?.role === 'Superadmin' ? 'view-superadmin-overview' : 'view-home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();

  const isAdmin = user?.role === 'Admin' || user?.role === 'admin' || user?.role === 'Superadmin' || user?.role === 'superadmin';
  const [isWaliKelas, setIsWaliKelas] = useState<boolean>(isAdmin);
  const [assignedKelas, setAssignedKelas] = useState<string | null>(null);

  // Broadcast notification bell states
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState<boolean>(false);
  const [allAnnouncements, setAllAnnouncements] = useState<Pengumuman[]>([]);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Pengumuman[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isAdmin) {
      setIsWaliKelas(true);
      return;
    }

    if (user?.wali_kelas) {
      setIsWaliKelas(true);
      setAssignedKelas(typeof user.wali_kelas === 'string' ? user.wali_kelas : (user.wali_kelas.kelas || null));
      return;
    }

    const checkWaliKelas = async () => {
      try {
        let query = supabase.from('wali_kelas').select('*');
        if (user?.sekolah_id) {
          query = query.eq('sekolah_id', user.sekolah_id);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const found = data.find(w => 
            (user?.id && w.guru_id === user.id) ||
            (user?.nama && w.nama_guru && w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()) ||
            (user?.username && w.nip && w.nip === user.username)
          );
          if (found) {
            setIsWaliKelas(true);
            setAssignedKelas(found.kelas);
            return;
          }
        }

        // Also check data_guru for wali_kelas field
        if (user?.id || user?.nama) {
          const cleanNama = (user?.nama || '').split(',')[0].trim();
          const { data: gData } = await supabase
            .from('data_guru')
            .select('*')
            .or(`user_id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},nama_guru.eq."${cleanNama}"`);
          if (gData && gData.length > 0) {
            const g = gData[0] as any;
            if (g.wali_kelas) {
              setIsWaliKelas(true);
              setAssignedKelas(typeof g.wali_kelas === 'string' ? g.wali_kelas : (g.wali_kelas.kelas || null));
              return;
            }
          }
        }
      } catch (err) {
        console.error('[AppScreen] Error verifying wali kelas:', err);
      }
    };

    checkWaliKelas();
  }, [user, isAdmin]);

  useEffect(() => {
    if (user?.sekolah_id) {
      const fetchSchool = async () => {
        try {
          const { data, error } = await supabase
            .from('sekolah')
            .select('*')
            .eq('id', user.sekolah_id)
            .single();

          if (data && !error) {
            setSchoolData(data);
          }
        } catch (err) {
          console.error('[AppScreen] Failed to fetch school profile:', err);
        }
      };
      fetchSchool();
    }
  }, [user?.sekolah_id]);

  const myUserId = String(user?.id || user?.username || user?.nama || 'user');

  const fetchBroadcasts = async () => {
    try {
      let annQuery = supabase
        .from('pengumuman')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (user?.sekolah_id) {
        annQuery = annQuery.eq('sekolah_id', user.sekolah_id);
      }
      const { data: annData } = await annQuery;
      if (!annData) return;

      // Filter by sasaran for teachers
      let filtered = annData as Pengumuman[];
      if (!isAdmin) {
        filtered = filtered.filter(a => {
          if (!a.sasaran || a.sasaran === 'Semua') return true;
          if (a.sasaran === 'Guru') return true;
          if (isWaliKelas && a.sasaran === 'Wali Kelas') return true;
          return false;
        });
      }

      // Query read records
      let readQuery = supabase.from('pengumuman_dibaca').select('pengumuman_id');
      if (user?.sekolah_id) {
        readQuery = readQuery.eq('sekolah_id', user.sekolah_id);
      }
      readQuery = readQuery.or(
        `user_id.eq."${myUserId}",user_id.eq."${user?.id || ''}",user_id.eq."${user?.nama || ''}",user_id.eq."${user?.username || ''}"`
      );
      const { data: readData } = await readQuery;

      const newReadMap: Record<string, boolean> = {};
      (readData || []).forEach(r => {
        newReadMap[r.pengumuman_id] = true;
      });

      const unreadList = filtered.filter(a => !newReadMap[a.id]);
      setReadMap(newReadMap);
      setAllAnnouncements(filtered);
      setUnreadAnnouncements(unreadList);
      setUnreadCount(unreadList.length);
    } catch (err) {
      console.error('[AppScreen] Error fetching broadcasts:', err);
    }
  };

  useEffect(() => {
    fetchBroadcasts();

    const channelName = `realtime-broadcasts-${user?.sekolah_id || 'global'}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => {
        fetchBroadcasts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman_dibaca' }, () => {
        fetchBroadcasts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.sekolah_id, myUserId, isAdmin, isWaliKelas]);

  const handleMarkAsRead = async (announcementId: string) => {
    try {
      const payload = {
        sekolah_id: user?.sekolah_id || '00000000-0000-0000-0000-000000000000',
        pengumuman_id: announcementId,
        user_id: myUserId,
        read_at: new Date().toISOString()
      };
      await supabase.from('pengumuman_dibaca').upsert([payload], { onConflict: 'sekolah_id,pengumuman_id,user_id' });
      setReadMap(prev => ({ ...prev, [announcementId]: true }));
      setUnreadAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[AppScreen] Error marking broadcast as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (unreadAnnouncements.length === 0) return;
      const inserts = unreadAnnouncements.map(a => ({
        sekolah_id: user?.sekolah_id || '00000000-0000-0000-0000-000000000000',
        pengumuman_id: a.id,
        user_id: myUserId,
        read_at: new Date().toISOString()
      }));
      await supabase.from('pengumuman_dibaca').upsert(inserts, { onConflict: 'sekolah_id,pengumuman_id,user_id' });
      const newMap = { ...readMap };
      unreadAnnouncements.forEach(a => {
        newMap[a.id] = true;
      });
      setReadMap(newMap);
      setUnreadAnnouncements([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('[AppScreen] Error marking all broadcasts as read:', err);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleNavigation = async (targetId: string) => {
    try {
      // Superadmin and Admin bypass all daily guru checks
      if (user?.role === 'Superadmin' || user?.role === 'Admin') {
        window.history.pushState(null, '', `?view=${targetId}`);
      setCurrentView(targetId);
      setSidebarOpen(false);
        return;
      }

      // Guru workflow checks
      const restrictedViews = ['view-guru-jurnal', 'view-piket', 'view-guru-presensi'];
      
      if (targetId === 'view-jurnal-kelas') {
        if (!isAdmin && !isWaliKelas) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Jurnal Kelas secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (restrictedViews.includes(targetId)) {
        Swal.fire({ title: 'Memeriksa Akses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const state = await getGuruDailyState(user.nama, user.username, user.id);
        Swal.close();

        if (state.isLibur) {
          Swal.fire('Akses Ditolak', state.lockedReason || 'Hari ini libur.', 'warning');
          return;
        }

        if (targetId === 'view-piket') {
          if (!state.presensiDatang) return Swal.fire('Akses Ditolak', 'Harap lakukan Presensi Datang terlebih dahulu.', 'warning');
          if (state.isIzinSakit) return Swal.fire('Akses Ditolak', state.lockedReason || '', 'info');
        }

        if (targetId === 'view-guru-jurnal') {
          if (!state.presensiDatang) return Swal.fire('Akses Ditolak', 'Harap lakukan Presensi Datang terlebih dahulu.', 'warning');
          if (state.isIzinSakit) return Swal.fire('Akses Ditolak', state.lockedReason || '', 'info');
          if (!state.canOpenJurnal) return Swal.fire('Akses Ditolak', state.lockedReason || 'Selesaikan tugas lain.', 'warning');
        }
        
        // If target is presensi, we let them open it so they can see the "locked" status for Pulang inside the component
      }

      window.history.pushState(null, '', `?view=${targetId}`);
      setCurrentView(targetId);
      setSidebarOpen(false);
    } catch (err) {
      Swal.close();
      Swal.fire('Error', 'Gagal memeriksa status harian. Periksa koneksi internet Anda.', 'error');
    }
  };

  const menuItemsSuperadmin = [
    { id: 'view-superadmin-overview', icon: 'fa-gauge-high', label: 'Ringkasan Platform' },
    { id: 'view-superadmin-sekolah', icon: 'fa-school', label: 'Kelola Sekolah' },
    { id: 'view-superadmin-admins', icon: 'fa-user-shield', label: 'Admin Sekolah' }
  ];

  const menuItemsGuru = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
    { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
    ...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : []),
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-history', icon: 'fa-clock-rotate-left', label: 'Riwayat' },
    { id: 'view-guru-rekap-jurnal', icon: 'fa-book-open', label: 'Rekap Jurnal' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }
  ];

  const menuItemsAdmin = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
    { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' },
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' },
    { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Akhir' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
    { id: 'view-admin-data', icon: 'fa-database', label: 'Master' },
    { id: 'view-admin-backup', icon: 'fa-hard-drive', label: 'Akses Data / Backup' },
    { id: 'view-admin-config', icon: 'fa-gears', label: 'Sistem' }
  ];

  let menuItems = menuItemsGuru;
  if (user?.role === 'Superadmin') {
    menuItems = menuItemsSuperadmin;
  } else if (user?.role === 'Admin') {
    menuItems = menuItemsAdmin;
  }

  const defaultHomeView = user?.role === 'Superadmin' ? 'view-superadmin-overview' : 'view-home';

  return (
    <div className="flex-col h-full w-full flex">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px] print:hidden no-print">
        <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={toggleSidebar} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
                <i className="fa-solid fa-bars text-sm"></i>
            </button>
            <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => handleNavigation(defaultHomeView)}>
              SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">
                {user?.role === 'Superadmin' ? 'Superadmin' : (schoolData?.nama || 'Sekolah')}
              </span>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Broadcast Bell with Shake Animation and Red Unread Count Badge */}
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(true)}
              className="btn-click relative w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
              title="Pengumuman Siaran"
            >
              <i
                className={`fa-solid fa-bell text-sm ${
                  unreadCount > 0 ? 'text-amber-500 animate-bell-shake' : 'text-gray-700 dark:text-gray-300'
                }`}
              ></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
              title="Pengaturan Akun & Profil"
            >
              <i className="fa-solid fa-user-gear text-sm"></i>
            </button>
            <button type="button" onClick={toggleTheme} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
                <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
            <button type="button" onClick={onLogout} className="btn-click bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800/50 flex items-center gap-1.5 shadow-sm">
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
                        <i className={`fa-solid ${user?.role === 'Superadmin' ? 'fa-crown' : 'fa-mosque'}`}></i>
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {user?.role === 'Superadmin' ? 'Portal Superadmin' : 'SIPJAM Menu'}
                    </span>
                </div>
                <button type="button" onClick={toggleSidebar} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)] custom-scroll">
                {menuItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                      currentView === item.id 
                        ? 'bg-green-50 text-nizamudin-green border border-green-200 dark:bg-green-900/20 dark:text-nizamudin-gold dark:border-green-800/50' 
                        : 'text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-5 text-center`}></i> {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800 border border-transparent transition-all"
                >
                  <i className="fa-solid fa-user-gear w-5 text-center text-blue-500"></i> Pengaturan Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto custom-scroll w-full relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 z-10 max-w-7xl mx-auto">
        <div key={currentView} className="page-transition">
          {user?.role === 'Superadmin' ? (
            <SuperadminView
              user={user}
              initialTab={
                currentView === 'view-superadmin-sekolah'
                  ? 'sekolah'
                  : currentView === 'view-superadmin-admins'
                  ? 'admins'
                  : 'overview'
              }
              onNavigateTab={(tab) => {
                if (tab === 'sekolah') {
                  window.history.pushState(null, '', '?view=view-superadmin-sekolah');
                  setCurrentView('view-superadmin-sekolah');
                } else if (tab === 'admins') {
                  window.history.pushState(null, '', '?view=view-superadmin-admins');
                  setCurrentView('view-superadmin-admins');
                } else {
                  window.history.pushState(null, '', '?view=view-superadmin-overview');
                  setCurrentView('view-superadmin-overview');
                }
              }}
            />
          ) : (
            <>
              {currentView === 'view-home' && (
                <HomeView 
                  user={user} 
                  setView={handleNavigation} 
                  menuItems={menuItems} 
                  onOpenAccountSettings={() => setIsAccountModalOpen(true)} 
                />
              )}
              {currentView === 'view-guru-presensi' && <GuruPresensi user={user} />}
              {currentView === 'view-guru-jurnal' && <GuruJurnal user={user} />}
              {currentView === 'view-piket' && <PiketView user={user} />}
              {currentView === 'view-dokumen' && <DokumenView user={user} />}
              {currentView === 'view-gradebook' && <GradebookView user={user} />}
              {currentView === 'view-chat' && <ChatView user={user} />}
              {currentView === 'view-informasi' && <InformasiView user={user} setView={handleNavigation} />}
              {currentView === 'view-history' && <HistoryView user={user} />}
              {currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} />}
              {currentView === 'view-jurnal-kelas' && (
                isAdmin || isWaliKelas ? (
                  <RekapJurnalView user={user} initialMode="kelas" assignedKelas={assignedKelas} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Jurnal Kelas</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => { window.history.pushState(null, '', '?view=' + defaultHomeView); setCurrentView(defaultHomeView); }}
                      className="btn-click bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition"
                    >
                      <i className="fa-solid fa-house text-xs"></i> Kembali ke Dashboard
                    </button>
                  </div>
                )
              )}
              {currentView === 'view-rekap-siswa' && <RekapSiswaView user={user} />}
              {currentView === 'view-admin-verif' && <AdminVerifView user={user} />}
              {currentView === 'view-admin-rekap' && <AdminRekapView user={user} />}
              {currentView === 'view-admin-data' && <AdminDataView user={user} />}
              {currentView === 'view-admin-backup' && <AdminBackupView user={user} />}
              {currentView === 'view-admin-config' && <AdminConfigView user={user} />}
              {currentView === 'view-analitik' && <AnalitikView user={user} />}
            </>
          )}
        </div>
      </main>

      {/* Push Notification Permission & Test Prompt */}
      <PushNotificationPrompt user={user} />

      {/* Native PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Broadcast Modal / Drawer */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-nizamudin-green to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-sm">
                  <i className="fa-solid fa-bullhorn"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Pengumuman & Siaran</h3>
                  <p className="text-[11px] text-emerald-100/90">
                    {unreadCount > 0 ? `${unreadCount} pengumuman belum dibaca` : 'Semua pengumuman sudah dibaca'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Action Bar */}
            {unreadCount > 0 && (
              <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Terdapat siaran baru dari sekolah
                </span>
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="btn-click text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <i className="fa-solid fa-check-double text-xs"></i> Tandai Semua Dibaca
                </button>
              </div>
            )}

            {/* Announcements List */}
            <div className="p-4 overflow-y-auto custom-scroll space-y-3 flex-1">
              {allAnnouncements.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <i className="fa-regular fa-bell-slash text-2xl mb-2 block text-slate-300 dark:text-slate-700"></i>
                  Belum ada pengumuman siaran yang diterbitkan.
                </div>
              ) : (
                allAnnouncements.map(ann => {
                  const isRead = !!readMap[ann.id];
                  return (
                    <div
                      key={ann.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isRead
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                          : 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ann.is_pinned && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1">
                              <i className="fa-solid fa-thumbtack text-[9px]"></i> Disematkan
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {ann.sasaran || 'Semua'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ann.created_at
                              ? new Date(ann.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : ''}
                          </span>
                        </div>

                        {!isRead && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500 text-white shadow-xs">
                            BARU
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold mt-2 leading-snug">{ann.judul}</h4>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-3">
                        {ann.konten}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          Oleh: <strong>{ann.penulis_nama || 'Admin'}</strong>
                        </span>

                        {!isRead ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(ann.id)}
                            className="btn-click text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1"
                          >
                            <i className="fa-solid fa-check"></i> Tandai Dibaca
                          </button>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <i className="fa-solid fa-check-double text-emerald-500"></i> Sudah Dibaca
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setBroadcastModalOpen(false);
                  handleNavigation('view-informasi');
                }}
                className="text-xs font-bold text-nizamudin-green dark:text-nizamudin-gold hover:underline flex items-center gap-1.5"
              >
                <i className="fa-solid fa-bullhorn text-xs"></i> Buka Menu Informasi Lengkap
              </button>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="btn-click px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal for Teachers and Staff (F14) */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
        onUserUpdated={(updatedUser) => {
          try {
            localStorage.setItem('sipjam_user', JSON.stringify(updatedUser));
          } catch (e) {
            console.warn('Failed to update localStorage:', e);
          }
          window.location.reload();
        }}
      />
    </div>
  );
}


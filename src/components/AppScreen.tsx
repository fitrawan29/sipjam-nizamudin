'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const HomeView = dynamic(() => import('./HomeView'));
const GuruPresensi = dynamic(() => import('./GuruPresensi'));
const GuruJurnal = dynamic(() => import('./GuruJurnal'));
const PiketView = dynamic(() => import('./PiketView'));
const DokumenView = dynamic(() => import('./DokumenView'));
const HistoryView = dynamic(() => import('./HistoryView'));
const RekapJurnalView = dynamic(() => import('./RekapJurnalView'));
const RekapSiswaView = dynamic(() => import('./RekapSiswaView'));
const InformasiView = dynamic(() => import('./InformasiView'));
const AdminVerifView = dynamic(() => import('./AdminVerifView'));
const AdminRekapView = dynamic(() => import('./AdminRekapView'));
const AdminDataView = dynamic(() => import('./AdminDataView'));
const AdminBackupView = dynamic(() => import('./AdminBackupView'));
const AdminConfigView = dynamic(() => import('./AdminConfigView'));
const AnalitikView = dynamic(() => import('./AnalitikView'));
const SuperadminView = dynamic(() => import('./SuperadminView'));
const DinasDashboard = dynamic(() => import('./DinasDashboard'));
// import GradebookView from './GradebookView';
const GradebookView = dynamic(() => import('./GradebookView'));
const SistemBlokView = dynamic(() => import('./SistemBlokView'));
const RaporView = dynamic(() => import('./RaporView'));
import ClayCard from './ClayCard';
import ClayButton from './ClayButton';
import AccountSettingsModal from './AccountSettingsModal';
import { renderUserAvatar } from '@/lib/avatars';
import PWAInstallPrompt from './PWAInstallPrompt';
import AIAssistant from '@/components/AIAssistant';
import { OnboardingTutorial, STORAGE_KEY_GURU, STORAGE_KEY_ADMIN } from '@/components/Onboarding';
import { TutorialModal } from '@/components/Tutorial';
import TeacherReminderManager from './TeacherReminderManager';
import {
  supabase,
  masterSupabase,
  getActiveTargetSchool,
  setActiveTargetSchool,
  clearActiveTargetSchool,
  onActiveTargetSchoolChange,
  isSchemaCacheOrMissingTableError,
  type SatelliteSchool
} from '@/lib/supabaseClient';
import { getGuruDailyState } from '@/lib/workflow';
import { useTheme } from '@/context/ThemeContext';
import { AppUser } from '@/types/user';
import { useSessionSync } from '@/hooks/useSessionSync';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { usePiket } from '@/hooks/usePiket';
import { useBroadcasts } from '@/hooks/useBroadcasts';
import { useKepalaSekolah } from '@/hooks/useKepalaSekolah';

declare module '@/components/AIAssistant' {
  interface AIAssistantProps {
    userRole?: string;
    userName?: string;
  }
}

export default function AppScreen({
  user: initialUser,
  onLogout,
  onUserUpdate
}: {
  user: AppUser;
  onLogout: () => void;
  onUserUpdate?: (user: AppUser) => void;
}) {
  // Re-validate session token against database: dbUser.session_token !== user.session_token
  // useSessionSync idle threshold: elapsed >= 30000, listeners: pointerdown, keydown, isNetworkError: Failed to fetch
  const { syncKey, currentUser, setCurrentUser } = useSessionSync(initialUser, onLogout, onUserUpdate);
  const baseUser = currentUser || initialUser;
  const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';
  const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';

  const [activeTargetSchool, setActiveTargetSchoolState] = useState<SatelliteSchool | null>(() => {
    return (isSuperadmin || isDinas) ? getActiveTargetSchool() : null;
  });
  const [satelliteSchools, setSatelliteSchools] = useState<SatelliteSchool[]>([]);

  // When Superadmin selects an active target satellite school, inject its school ID and name into effectiveUser
  const effectiveUser: AppUser = (isSuperadmin && activeTargetSchool) || (isDinas && activeTargetSchool)
    ? {
        ...baseUser,
        sekolah_id: activeTargetSchool.id,
        sekolah_nama: activeTargetSchool.nama
      }
    : baseUser;
  const user = effectiveUser;

  useEffect(() => {
    if (!isSuperadmin && !isDinas) return;

    const fetchSchoolsForSwitcher = async () => {
      try {
        const { data: regData, error: regErr } = await masterSupabase.from('sekolah_registry').select('*').order('nama');
        if (!regErr && regData && regData.length > 0) {
          setSatelliteSchools(regData as SatelliteSchool[]);
          return;
        } else if (regErr && isSchemaCacheOrMissingTableError(regErr)) {
          console.warn('[sekolah_registry] Schema cache / missing table detected in AppScreen switcher, falling back to public.sekolah:', regErr?.message || (regErr as any)?.error?.message || String(regErr));
        }
      } catch (_) {}

      try {
        const { data: schData } = await masterSupabase.from('sekolah').select('*').order('nama');
        if (schData && schData.length > 0) {
          setSatelliteSchools(schData.map((s: any) => ({
            id: s.id,
            nama: s.nama,
            npsn: s.npsn,
            kota_kabupaten: s.kota_kabupaten,
            provinsi: s.provinsi,
            vercel_url: s.vercel_url || s.website || null,
            supabase_url: s.supabase_url || null,
            supabase_anon_key: s.supabase_anon_key || null,
            status: s.status || 'aktif'
          })));
        }
      } catch (_) {}
    };

    fetchSchoolsForSwitcher();

    // Listen to changes in the registered schools list (added, edited, deleted)
    window.addEventListener('sipjam_satellite_schools_updated', fetchSchoolsForSwitcher);

    // Multi-tab and intra-tab synchronization for active target school switch
    const unsubscribe = onActiveTargetSchoolChange((sch) => {
      setActiveTargetSchoolState(sch);
    });

    const handleSatelliteErr = (e: any) => {
      const errSchool = e?.detail?.school;
      if (errSchool && isSuperadmin) {
        Swal.fire({
          icon: 'error',
          title: 'Akses Satelit Ditolak (401)',
          html: `Koneksi ke instance Supabase <b>${errSchool.nama}</b> ditolak (401 Unauthorized). Kredensial anon key mungkin tidak valid atau kedaluwarsa.`,
          confirmButtonColor: '#0B4619'
        });
      }
    };
    window.addEventListener('sipjam_satellite_error', handleSatelliteErr);

    return () => {
      window.removeEventListener('sipjam_satellite_schools_updated', fetchSchoolsForSwitcher);
      window.removeEventListener('sipjam_satellite_error', handleSatelliteErr);
      unsubscribe();
    };
  }, [isSuperadmin, isDinas]);

  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view) return view;
    }
    if (isSuperadmin) return 'view-superadmin-overview';
    if (isDinas) return 'view-dinas-overview';
    return 'view-home';
  });

  const [urlTab, setUrlTab] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab');
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const tab = params.get('tab');
      setUrlTab(tab);
      if (view) {
        setCurrentView(view);
      } else {
        setCurrentView(isSuperadmin ? 'view-superadmin-overview' : isDinas ? 'view-dinas-overview' : 'view-home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSuperadmin, isDinas]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isSuperadmin) {
      if (isAdmin) {
        if (localStorage.getItem(STORAGE_KEY_ADMIN) !== 'true') {
          setTourOpen(true);
        }
      } else {
        if (localStorage.getItem(STORAGE_KEY_GURU) !== 'true') {
          setTourOpen(true);
        }
      }
    }
  }, [isAdmin, isSuperadmin]);
  const [schoolData, setSchoolData] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();

  const { isWaliKelas, assignedKelas } = useWaliKelas(user, isAdmin, syncKey);
  const { isPiketHariIni } = usePiket(user, isAdmin, isSuperadmin, syncKey);
  const { isKepalaSekolah } = useKepalaSekolah(user, schoolData, syncKey);
  const {
    unreadCount,
    broadcastModalOpen,
    setBroadcastModalOpen,
    allAnnouncements,
    readMap,
    handleMarkAsRead,
    handleMarkAllAsRead,
  } = useBroadcasts(user, isAdmin, isWaliKelas, syncKey);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);

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
  }, [user?.sekolah_id, syncKey]);

  // Realtime subscription for school configuration and teacher data updates (R3)
  useEffect(() => {
    const schoolId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
    const channelName = `school-config-${schoolId}`;

    // Safely remove any pre-existing channel with this topic so callbacks can be registered cleanly
    const existing = supabase.getChannels().find(
      (ch: any) => ch.topic === `realtime:${channelName}` || ch.topic === channelName
    );
    if (existing) {
      try {
        (supabase as any).realtime?._remove?.(existing);
        existing.unsubscribe();
      } catch (_) {
        supabase.removeChannel(existing);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengaturan' }, () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: { sekolah_id: schoolId } }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_guru' }, () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam:guru_updated', { detail: { sekolah_id: schoolId } }));
        }
      })
      .on('broadcast', { event: 'config_updated' }, () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: { sekolah_id: schoolId } }));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: { sekolah_id: schoolId } }));
        }
      });

    let lastResume = 0;
    const handleResumeSync = () => {
      const now = Date.now();
      if (now - lastResume < 800) return;
      lastResume = now;
      if (typeof window !== 'undefined' && (!document || document.visibilityState === 'visible')) {
        window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: { sekolah_id: schoolId } }));
      }
    };

    window.addEventListener('focus', handleResumeSync);
    window.addEventListener('online', handleResumeSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    return () => {
      try {
        (supabase as any).realtime?._remove?.(channel);
        channel.unsubscribe();
      } catch (_) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleResumeSync);
      window.removeEventListener('online', handleResumeSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
    };
  }, [user?.sekolah_id, user?.id]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleNavigation = async (targetId: string) => {
    try {
      // Superadmin and Admin bypass all daily guru checks
      if (isSuperadmin || isAdmin) {
        window.history.pushState(null, '', `?view=${targetId}`);
        setCurrentView(targetId);
        setSidebarOpen(false);
        return;
      }

      // Dinas Pendidikan navigation guard: strictly read-only, block mutative admin views
      if (isDinas) {
        const blockedMutationViews = [
          'view-admin-data',
          'view-admin-config',
          'view-admin-backup',
          'view-sistem-blok',
          'view-admin-verif'
        ];
        const allowedDinasViews = [
          'view-dinas-overview',
          'view-admin-rekap',
          'view-rekap-guru',
          'view-rekap-siswa',
          'view-jurnal-kelas',
          'view-informasi'
        ];

        if (blockedMutationViews.includes(targetId) || !allowedDinasViews.includes(targetId)) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Akun Dinas Pendidikan hanya memiliki wewenang monitoring read-only pada wilayah binaan.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }

        window.history.pushState(null, '', `?view=${targetId}`);
        setCurrentView(targetId);
        setSidebarOpen(false);
        return;
      }

      // Guru workflow checks
      const restrictedViews = ['view-guru-jurnal', 'view-piket', 'view-guru-presensi'];
      
      if (targetId === 'view-jurnal-kelas') {
        if (!isAdmin && !isSuperadmin && !isWaliKelas && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Jurnal Kelas secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (targetId === 'view-sistem-blok') {
        if (!isAdmin && !isSuperadmin) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Manajemen Sistem Blok secara eksklusif hanya dapat diakses oleh Administrator.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (targetId === 'view-piket') {
        if (!isAdmin && !isSuperadmin && !isPiketHariIni) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (targetId === 'view-rekap-siswa') {
        if (!isAdmin && !isSuperadmin && !isWaliKelas && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Presensi Siswa secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (targetId === 'view-rapor') {
        if (!isAdmin && !isSuperadmin && !isWaliKelas && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Rapor secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (['view-admin-verif', 'view-admin-rekap', 'view-analitik'].includes(targetId)) {
        if (!isAdmin && !isSuperadmin && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Fitur monitoring administrasi hanya dapat diakses oleh Administrator dan Kepala Sekolah.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (['view-admin-config', 'view-admin-backup', 'view-admin-data'].includes(targetId)) {
        if (!isAdmin && !isSuperadmin) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Konfigurasi dan Manajemen Data secara eksklusif hanya dapat diakses oleh Administrator.',
            confirmButtonColor: '#0B4619'
          });
          return;
        }
      }

      if (restrictedViews.includes(targetId)) {
        Swal.fire({ title: 'Memeriksa Akses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
        Swal.close();

        if (state.isLibur) {
          Swal.fire('Akses Ditolak', state.lockedReason || 'Hari ini libur.', 'warning');
          return;
        }

        if (targetId === 'view-piket') {
          if (!state.isPiket) {
            Swal.fire({
              icon: 'warning',
              title: 'Akses Ditolak',
              text: 'Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.',
              confirmButtonColor: '#0B4619'
            });
            return;
          }
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
    } catch {
      Swal.close();
      Swal.fire('Error', 'Gagal memeriksa status harian. Periksa koneksi internet Anda.', 'error');
    }
  };

  const menuItemsSuperadmin = [
    { id: 'view-superadmin-overview', icon: 'fa-gauge-high', label: 'Ringkasan Platform' },
    { id: 'view-superadmin-jaringan', icon: 'fa-network-wired', label: 'Jaringan Sekolah' },
    { id: 'view-superadmin-dinas', icon: 'fa-building-columns', label: 'Akun Dinas Pendidikan' },
    ...(activeTargetSchool ? [
      { id: 'view-admin-data', icon: 'fa-database', label: `Master (${activeTargetSchool.nama})` },
      { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
      { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Presensi' },
      { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
      { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik Satelit' },
      { id: 'view-admin-config', icon: 'fa-gears', label: 'Sistem Satelit' },
    ] : [])
  ];

  const menuItemsGuru = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
    { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
    ...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : []),
    ...(isPiketHariIni ? [{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }] : []),
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    ...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : []),
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-history', icon: 'fa-clock-rotate-left', label: 'Riwayat' },
    { id: 'view-guru-rekap-jurnal', icon: 'fa-book-open', label: 'Rekap Jurnal' },
    ...(isWaliKelas ? [{ id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }] : [])
  ];

  const menuItemsKepalaSekolah = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
    { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Presensi' },
    { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
    { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' },
    ...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : []),
    { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
    { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
    ...(isPiketHariIni ? [{ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' }] : []),
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-history', icon: 'fa-clock-rotate-left', label: 'Riwayat' },
    { id: 'view-guru-rekap-jurnal', icon: 'fa-book-open', label: 'Rekap Jurnal' }
  ];

  const menuItemsAdmin = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
    { id: 'view-sistem-blok', icon: 'fa-layer-group', label: 'Sistem Blok' },
    { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' },
    { id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
    { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
    { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' },
    { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Akhir' },
    { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
    { id: 'view-admin-data', icon: 'fa-database', label: 'Master' },
    { id: 'view-admin-backup', icon: 'fa-hard-drive', label: 'Akses Data / Backup' },
    { id: 'view-admin-config', icon: 'fa-gears', label: 'Sistem' }
  ];

  const menuItemsDinas = [
    { id: 'view-dinas-overview', icon: 'fa-chart-pie', label: 'Dashboard Eksekutif' },
    ...(activeTargetSchool ? [
      { id: 'view-rekap-guru', icon: 'fa-clipboard-user', label: `Rekap Guru (${activeTargetSchool.nama})` },
      { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: `Presensi Siswa (${activeTargetSchool.nama})` },
      { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: `Jurnal Kelas (${activeTargetSchool.nama})` },
    ] : [])
  ];

  let menuItems = menuItemsGuru;
  if (isSuperadmin) {
    menuItems = menuItemsSuperadmin;
  } else if (isDinas) {
    menuItems = menuItemsDinas;
  } else if (isAdmin) {
    menuItems = menuItemsAdmin;
  } else if (isKepalaSekolah) {
    menuItems = menuItemsKepalaSekolah;
  }

  const defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : isDinas ? 'view-dinas-overview' : 'view-home';

  return (
    <div className="flex-col h-full w-full flex">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px] print:hidden no-print">
        <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" data-tour="hamburger-btn" onClick={toggleSidebar} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
                <i className="fa-solid fa-bars text-sm"></i>
            </button>
            <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => handleNavigation(defaultHomeView)}>
              SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">
                {isSuperadmin ? 'Superadmin' : isDinas ? 'Dinas Pendidikan' : (schoolData?.nama || 'Sekolah')}
              </span>
            </div>
            {(isSuperadmin || isDinas) && (
              <div className="hidden sm:flex items-center ml-2">
                <select
                  aria-label="Ganti Sekolah yang Dipantau"
                  value={activeTargetSchool?.id || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      clearActiveTargetSchool();
                      setActiveTargetSchoolState(null);
                    } else {
                      const sch = satelliteSchools.find(s => s.id === val);
                      if (sch) {
                        setActiveTargetSchool(sch);
                        setActiveTargetSchoolState(sch);
                      }
                    }
                  }}
                  className="text-[11px] font-semibold py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 cursor-pointer max-w-[170px] truncate"
                  title="Ganti Sekolah yang Dipantau"
                >
                  <option value="">{isDinas ? '🌐 Ringkasan Wilayah' : '🌐 Master Platform'}</option>
                  {(isDinas
                    ? satelliteSchools.filter(s => (s.kota_kabupaten || '').trim().toLowerCase() === (user?.kota_kabupaten || '').trim().toLowerCase())
                    : satelliteSchools
                  ).map(sch => (
                    <option key={sch.id} value={sch.id}>
                      🏫 {sch.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}
        </div>

        <div className="flex items-center gap-2">
            {/* Broadcast Bell with Shake Animation and Red Unread Count Badge */}
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(true)}
              className="clay-btn btn-click relative w-9 h-9 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
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
              className="clay-btn btn-click w-9 h-9 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-0.5"
              title="Pengaturan Akun & Profil"
            >
              {renderUserAvatar(currentUser?.avatar, 'w-7 h-7')}
            </button>
            <button type="button" onClick={toggleTheme} className="clay-btn btn-click w-9 h-9 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
                <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
            <ClayButton variant="rose" size="sm" onClick={onLogout} className="btn-click text-red-600 dark:text-white border border-red-200 dark:border-red-800/50 shadow-sm" icon={<i className="fa-solid fa-power-off text-xs"></i>}>
                <span className="hidden sm:inline">Keluar</span>
            </ClayButton>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={toggleSidebar}>
          <div className="w-72 max-w-[85%] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-full shadow-xl p-5 flex flex-col justify-between transform transition-transform" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-nizamudin-green rounded-lg flex items-center justify-center text-nizamudin-gold font-bold">
                        <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isDinas ? 'fa-building-columns' : 'fa-mosque'}`}></i>
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {isSuperadmin ? 'Portal Superadmin' : isDinas ? 'Dinas Pendidikan' : 'SIPJAM Menu'}
                    </span>
                </div>
                <button type="button" onClick={toggleSidebar} className="clay-btn w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white border border-gray-200 dark:border-gray-700 shadow-xs">
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* User Identity Card */}
              <ClayCard variant="mint" rounded="2xl" className="mb-3 p-3 bg-gradient-to-br from-emerald-50/90 to-green-50/40 dark:from-gray-800/90 dark:to-gray-800/40 border-2 border-white/90 dark:border-gray-700/60 shadow-[4px_4px_12px_rgba(180,210,190,0.35),inset_1px_1px_2px_rgba(255,255,255,0.9)] flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full bg-white dark:bg-gray-700 p-0.5 shadow-xs shrink-0 overflow-hidden border border-emerald-200 dark:border-gray-600 flex items-center justify-center">
                  {renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-10 h-10')}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" title="Aktif"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate" title={user?.nama || 'Pengguna SIPJAM'}>
                    {user?.nama || 'Pengguna SIPJAM'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isSuperadmin
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200/50'
                        : isDinas
                        ? 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-indigo-900/50 dark:text-indigo-300 border border-[#C4B5FD] dark:border-indigo-700/60'
                        : isAdmin
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/50'
                        : isKepalaSekolah
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200/50'
                        : isWaliKelas
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border border-teal-200/50'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/50'
                    }`}>
                      <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isDinas ? 'fa-building-columns' : isAdmin ? 'fa-user-shield' : isKepalaSekolah ? 'fa-user-tie' : isWaliKelas ? 'fa-chalkboard-user' : 'fa-chalkboard-user'} text-[8px]`}></i>
                      {isSuperadmin ? 'Superadmin' : isDinas ? 'Dinas Pendidikan' : isAdmin ? 'Administrator' : isKepalaSekolah ? 'Kepala Sekolah' : isWaliKelas ? 'Guru (Wali Kelas)' : 'Guru'}
                    </span>
                    {(user?.username || user?.nip) && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[85px]" title={user?.username || user?.nip}>
                        {user?.username || user?.nip}
                      </span>
                    )}
                    {isDinas && user?.kota_kabupaten && (
                      <div className="w-full text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold truncate mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-map-location-dot text-[9px] text-indigo-600 dark:text-indigo-400"></i>
                        <span>Wilayah: {user.kota_kabupaten}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ClayCard>

              {(isSuperadmin || isDinas) && (
                <div className="mb-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <i className="fa-solid fa-satellite-dish text-emerald-600"></i> {isDinas ? 'Sekolah Binaan:' : 'Sekolah yang Dipantau:'}
                  </div>
                  <select
                    aria-label="Ganti Sekolah yang Dipantau di Sidebar"
                    value={activeTargetSchool?.id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        clearActiveTargetSchool();
                        setActiveTargetSchoolState(null);
                      } else {
                        const sch = satelliteSchools.find(s => s.id === val);
                        if (sch) {
                          setActiveTargetSchool(sch);
                          setActiveTargetSchoolState(sch);
                        }
                      }
                    }}
                    className="w-full text-xs font-semibold py-1.5 px-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white cursor-pointer"
                  >
                    <option value="">{isDinas ? '🌐 Ringkasan Wilayah' : '🌐 Master Platform (Semua)'}</option>
                    {(isDinas
                      ? satelliteSchools.filter(s => (s.kota_kabupaten || '').trim().toLowerCase() === (user?.kota_kabupaten || '').trim().toLowerCase())
                      : satelliteSchools
                    ).map(sch => (
                      <option key={sch.id} value={sch.id}>
                        🏫 {sch.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-230px)] custom-scroll">
                {menuItems.map(item => (
                  <button 
                    key={item.id}
                    data-tour={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2.5 transition-all duration-200 select-none ${
                      currentView === item.id 
                        ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-950 dark:from-emerald-900/40 dark:to-green-900/30 dark:text-amber-300 border-2 border-white dark:border-emerald-700/50 shadow-[3px_3px_8px_rgba(180,210,190,0.5),inset_1px_1px_2px_rgba(255,255,255,0.9)] transform translate-x-1' 
                        : 'text-gray-700 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-800/80 hover:shadow-xs border-2 border-transparent'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-5 text-center`}></i> {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2.5 text-gray-700 hover:bg-white/80 dark:text-gray-200 dark:hover:bg-gray-800/80 border-2 border-transparent transition-all"
                >
                  <i className="fa-solid fa-user-gear w-5 text-center text-blue-500"></i> Pengaturan Akun
                </button>
                <button
                  type="button"
                  onClick={() => { setTutorialModalOpen(true); setSidebarOpen(false); }}
                  className="clay-btn w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/90 transition-all border-2 border-emerald-200/60 dark:border-emerald-800/60 mt-2 mb-1 shadow-xs cursor-pointer"
                  title="Buka panduan & tutorial lengkap seluruh menu"
                >
                  <i className="fa-solid fa-book-bookmark text-sm"></i>
                  <span>Panduan & Tutorial Lengkap</span>
                </button>
                {!isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => { setTourOpen(true); setSidebarOpen(false); }}
                    className="clay-btn w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-100/60 transition-all border-2 border-amber-200/70 dark:border-amber-800/40 mt-1 mb-2 shadow-xs cursor-pointer"
                    title="Buka kembali panduan tutorial interaktif"
                  >
                    <i className="fa-solid fa-graduation-cap text-sm"></i>
                    <span>Lihat Tutorial Lagi</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto custom-scroll w-full relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 z-10 max-w-7xl mx-auto">
        {/* Active Target School Banner for Dinas Drilldown */}
        {isDinas && activeTargetSchool && currentView !== 'view-dinas-overview' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 mb-4 flex items-center justify-between no-print shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <i className="fa-solid fa-eye text-indigo-600 dark:text-indigo-400"></i>
              <span>Memantau Sekolah: <b>{activeTargetSchool.nama}</b> ({activeTargetSchool.kota_kabupaten || user?.kota_kabupaten || 'Wilayah Binaan'}) &bull; Mode Peninjau (Read-Only)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearActiveTargetSchool();
                setActiveTargetSchoolState(null);
                handleNavigation('view-dinas-overview');
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1 shadow-xs"
            >
              <i className="fa-solid fa-arrow-left mr-1"></i> Kembali ke Dashboard
            </button>
          </div>
        )}

        <div key={`${currentView}-${syncKey}`} className="page-transition">
          {isSuperadmin && currentView.startsWith('view-superadmin-') ? (
            <SuperadminView
              user={user}
              initialTab={
                currentView === 'view-superadmin-dinas'
                  ? 'dinas'
                  : currentView === 'view-superadmin-jaringan' ? 'jaringan' : 'overview'
              }
              onNavigateTab={(tab) => {
                if (tab === 'jaringan') {
                  window.history.pushState(null, '', '?view=view-superadmin-jaringan');
                  setCurrentView('view-superadmin-jaringan');
                } else if (tab === 'dinas') {
                  window.history.pushState(null, '', '?view=view-superadmin-dinas');
                  setCurrentView('view-superadmin-dinas');
                } else {
                  window.history.pushState(null, '', '?view=view-superadmin-overview');
                  setCurrentView('view-superadmin-overview');
                }
              }}
            />
          ) : (
            <>
              {currentView === 'view-dinas-overview' && (
                <DinasDashboard
                  user={user}
                  onSelectSchool={(school) => {
                    setActiveTargetSchool(school);
                    setActiveTargetSchoolState(school);
                    handleNavigation('view-rekap-guru');
                  }}
                  onSelectTargetSchool={(school) => {
                    setActiveTargetSchool(school);
                    setActiveTargetSchoolState(school);
                    handleNavigation('view-rekap-guru');
                  }}
                  satelliteSchools={satelliteSchools}
                  setView={handleNavigation}
                />
              )}
              {currentView === 'view-home' && (
                <HomeView 
                  user={user} 
                  setView={handleNavigation} 
                  menuItems={menuItems} 
                  onOpenAccountSettings={() => setIsAccountModalOpen(true)} 
                />
              )}
              {currentView === 'view-guru-presensi' && <GuruPresensi user={user} initialTab={(urlTab as any) || 'live'} />}
              {currentView === 'view-guru-jurnal' && (
                <GuruJurnal
                  user={user}
                  initialTab={(urlTab as any) || 'input'}
                  assignedKelas={assignedKelas}
                  isKepalaSekolah={isKepalaSekolah}
                />
              )}
              {currentView === 'view-piket' && (
                isAdmin || isSuperadmin || isPiketHariIni ? (
                  <PiketView user={user} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Modul <strong>Piket</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang memiliki <strong>jadwal piket pada hari ini</strong>. Anda tidak bertugas piket hari ini.
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
              {currentView === 'view-dokumen' && <DokumenView user={user} />}
              {currentView === 'view-gradebook' && (
                <GradebookView
                  user={user}
                  initialTab={urlTab === 'rapor' ? 'rapor' : 'gradebook'}
                  assignedKelas={assignedKelas}
                  isKepalaSekolah={isKepalaSekolah}
                />
              )}
              {currentView === 'view-informasi' && <InformasiView user={user} setView={handleNavigation} />}
              {currentView === 'view-history' && <HistoryView user={user} />}
              {currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}
              {currentView === 'view-jurnal-kelas' && (
                isAdmin || isWaliKelas || isDinas ? (
                  <RekapJurnalView user={user} initialMode="kelas" assignedKelas={assignedKelas} isKepalaSekolah={isKepalaSekolah} isReadOnly={isDinas} />
                ) : isKepalaSekolah ? (
                  <RekapJurnalView user={user} initialMode="kelas" assignedKelas={assignedKelas} isKepalaSekolah={true} />
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
              {currentView === 'view-rekap-siswa' && (
                isAdmin || isSuperadmin || isWaliKelas || isDinas ? (
                  <RekapSiswaView user={user} assignedKelas={assignedKelas} isReadOnly={isDinas || (isKepalaSekolah && !isAdmin && !isSuperadmin)} initialTab={(urlTab as any) || undefined} />
                ) : isKepalaSekolah ? (
                  <RekapSiswaView user={user} assignedKelas={assignedKelas} isReadOnly={true} initialTab={(urlTab as any) || undefined} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Presensi Siswa</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-rapor' && (
                isAdmin || isSuperadmin || isWaliKelas ? (
                  <RaporView user={user} assignedKelas={assignedKelas} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Rapor</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-admin-verif' && (
                isAdmin || isSuperadmin || isKepalaSekolah ? (
                  <AdminVerifView user={user} isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin} initialTab={urlTab || undefined} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Verifikasi</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Kepala Sekolah. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-admin-rekap' && (
                isAdmin || isSuperadmin || isKepalaSekolah || isDinas ? (
                  <AdminRekapView
                    user={user}
                    isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin}
                    isReadOnly={isDinas}
                    targetSchool={activeTargetSchool}
                    initialTab={urlTab || 'tabel'}
                  />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Rekap Presensi</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Kepala Sekolah. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-rekap-guru' && (
                isAdmin || isSuperadmin || isKepalaSekolah || isDinas ? (
                  <AdminRekapView
                    user={user}
                    isKepalaSekolah={isKepalaSekolah && !isAdmin && !isSuperadmin}
                    isReadOnly={true}
                    targetSchool={activeTargetSchool}
                    initialTab="tabel"
                  />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Rekap Presensi Guru</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Kepala Sekolah. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-admin-data' && (
                isAdmin || isSuperadmin ? (
                  <AdminDataView user={user} initialTab={urlTab || undefined} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Data Master</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-admin-backup' && (
                isAdmin || isSuperadmin ? (
                  <AdminBackupView user={user} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Backup Data</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-admin-config' && (
                isAdmin || isSuperadmin ? (
                  <AdminConfigView
                    user={user}
                    initialTab={urlTab || undefined}
                    onUserUpdated={(updatedUser: any) => {
                      try {
                        localStorage.setItem('sipjam_user', JSON.stringify(updatedUser));
                      } catch (e) {
                        console.warn('Failed to update localStorage:', e);
                      }
                      setCurrentUser(updatedUser);
                      if (onUserUpdate) onUserUpdate(updatedUser);
                    }}
                  />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Pengaturan Sistem</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-sistem-blok' && (
                isAdmin || isSuperadmin ? (
                  <SistemBlokView user={user} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Manajemen Sistem Blok</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
              {currentView === 'view-analitik' && (
                isAdmin || isSuperadmin || isKepalaSekolah ? (
                  <AnalitikView user={user} />
                ) : (
                  <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Halaman <strong>Analitik</strong> hanya dapat diakses oleh Administrator dan Kepala Sekolah. Anda tidak memiliki hak akses untuk membuka halaman ini.
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
            </>
          )}
        </div>
      </main>

      {/* Native PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Broadcast Modal / Drawer */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <ClayCard rounded="3xl" className="bg-[#FAF7F2] dark:bg-slate-900 shadow-2xl border-2 border-white/90 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
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
                className="clay-btn clay-btn-secondary px-4 py-1.5 rounded-2xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </ClayCard>
        </div>
      )}

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
          setCurrentUser(updatedUser);
          if (onUserUpdate) onUserUpdate(updatedUser);
          setIsAccountModalOpen(false);
        }}
      />
      <AIAssistant
        currentView={currentView}
        userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
        userName={user?.nama || user?.name}
      />
      <OnboardingTutorial
        userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onComplete={() => setTourOpen(false)}
        onEnsureSidebarOpen={(open) => setSidebarOpen(open)}
      />
      <TutorialModal
        isOpen={tutorialModalOpen}
        onClose={() => setTutorialModalOpen(false)}
        onNavigate={handleNavigation}
        currentRole={user?.role}
      />
      <TeacherReminderManager
        user={user}
        onNavigate={handleNavigation}
      />
    </div>
  );
}


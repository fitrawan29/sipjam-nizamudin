'use client';

import React, { useState, useEffect, Fragment } from 'react';
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
const UjianSiswaView = dynamic(() => import('./UjianSiswaView'));
const BkJurnalView = dynamic(() => import('./BkJurnalView'));
const KolaborasiOrtuView = dynamic(() => import('./KolaborasiOrtuView'));
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
  resolveCanonicalRoute,
  resolveRoute,
  getConsolidatedMenuItems,
  evaluateTabRBAC,
  VIEW_ALIASES
} from '@/lib/navigation';
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
import { formatKepalaSekolahLabel } from '@/utils/textUtils';

declare module '@/components/AIAssistant' {
  interface AIAssistantProps {
    userRole?: string;
    userName?: string;
  }
}

const formatSchoolDisplayName = (name: string): string => {
  if (!name) return 'Sekolah';
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^sipjam\s*[-–—:]*\s*/i, '').trim();
  return stripped || trimmed;
};

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
  const isSiswa = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'siswa';
  const isOrangTua =
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'orangtua' ||
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'walimurid';
  const isTataUsaha =
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha' ||
    (baseUser?.mata_pelajaran || '').toLowerCase().includes('tata usaha');
  const isBk =
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'bk' ||
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'gurubk' ||
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'bimbingankonseling' ||
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'bimbingandankonseling' ||
    (baseUser?.mata_pelajaran || baseUser?.mataPelajaran || '').toLowerCase().includes('bimbingan konseling') ||
    (baseUser?.mata_pelajaran || baseUser?.mataPelajaran || '').toLowerCase().includes('bimbingan dan konseling') ||
    (baseUser?.mata_pelajaran || baseUser?.mataPelajaran || '').toLowerCase().trim() === 'bk';

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
          confirmButtonColor: '#0F766E'
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
      const rawView = params.get('view');
      const rawTab = params.get('tab');
      if (rawView) {
        if (rawView === 'view-pengaturan-akun') {
          return 'view-home';
        }
        const resolution = resolveCanonicalRoute(rawView, rawTab);
        if (resolution.isLegacyAlias) {
          const newParams = new URLSearchParams();
          newParams.set('view', resolution.canonicalView);
          if (resolution.defaultTab) {
            newParams.set('tab', resolution.defaultTab);
          }
          window.history.replaceState(null, '', `?${newParams.toString()}`);
        }
        return resolution.canonicalView;
      }
    }
    if (isSuperadmin) return 'view-superadmin-overview';
    if (isDinas) return 'view-dinas-overview';
    if (isSiswa) return 'view-ujian';
    if (isOrangTua) return 'view-kolaborasi';
    if (isTataUsaha) return 'view-home';
    if (isBk) return 'view-home';
    return 'view-home';
  });

  const [urlTab, setUrlTab] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const rawView = params.get('view');
      const rawTab = params.get('tab');
      if (rawView) {
        const resolution = resolveCanonicalRoute(rawView, rawTab);
        return resolution.defaultTab || rawTab;
      }
      return rawTab;
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const rawView = params.get('view');
      const rawTab = params.get('tab');
      if (rawView) {
        const resolution = resolveCanonicalRoute(rawView, rawTab);
        setUrlTab(resolution.defaultTab || null);
        setCurrentView(resolution.canonicalView);
        if (resolution.isLegacyAlias) {
          const newParams = new URLSearchParams();
          newParams.set('view', resolution.canonicalView);
          if (resolution.defaultTab) {
            newParams.set('tab', resolution.defaultTab);
          }
          window.history.replaceState(null, '', `?${newParams.toString()}`);
        }
      } else {
        setUrlTab(null);
        const defaultDinasPopView = isDinas ? 'view-dinas-overview' : 'view-home';
        const defaultSiswaPopView = isSiswa ? 'view-ujian' : 'view-home';
        const defaultOrtuPopView = isOrangTua ? 'view-kolaborasi' : defaultSiswaPopView;
        const defaultTuPopView = isTataUsaha ? 'view-home' : defaultDinasPopView;
        const defaultBkPopView = isBk ? 'view-home' : defaultTuPopView;
        setCurrentView(isSuperadmin ? 'view-superadmin-overview' : (isSiswa || isOrangTua ? defaultOrtuPopView : defaultBkPopView));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSuperadmin, isDinas, isSiswa, isOrangTua, isTataUsaha, isBk]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isSuperadmin && !isTataUsaha) {
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
  }, [isAdmin, isSuperadmin, isTataUsaha]);
  const [schoolData, setSchoolData] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const syncRaw = localStorage.getItem('sipjam_config_sync');
      if (syncRaw) {
        const parsed = JSON.parse(syncRaw);
        const name = parsed?.config?.kop_sekolah || parsed?.config?.NAMA_SEKOLAH;
        if (name) return { nama: formatSchoolDisplayName(name), id: parsed?.sekolah_id };
      }
      const userRaw = localStorage.getItem('sipjam_user');
      if (userRaw) {
        const parsedUser = JSON.parse(userRaw);
        if (parsedUser?.sekolah_nama) return { nama: formatSchoolDisplayName(parsedUser.sekolah_nama), id: parsedUser.sekolah_id };
      }
    } catch (_) {}
    return null;
  });
  const { theme, toggleTheme } = useTheme();

  const { isWaliKelas, assignedKelas } = useWaliKelas(user, isAdmin, syncKey);
  const { isPiketHariIni } = usePiket(user, isAdmin, isSuperadmin, syncKey);
  const { isKepalaSekolah, statusKepalaSekolah } = useKepalaSekolah(user, schoolData, syncKey);
  const {
    unreadCount,
    broadcastModalOpen,
    setBroadcastModalOpen,
    allAnnouncements,
    readMap,
    handleMarkAsRead,
    handleMarkAllAsRead,
  } = useBroadcasts(user, isAdmin, isWaliKelas, syncKey);

  useEffect(() => {
    if (!sidebarOpen && !broadcastModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (broadcastModalOpen) setBroadcastModalOpen(false);
        else if (sidebarOpen) setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen, broadcastModalOpen, setBroadcastModalOpen]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'view-pengaturan-akun';
    }
    return false;
  });
  const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('sipjam_ai_assistant_visible') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleAiVis = (e: any) => {
      const v = e?.detail?.visible;
      if (typeof v === 'boolean') {
        setShowAiAssistant(v);
      }
    };
    window.addEventListener('sipjam:ai_assistant_visibility', handleAiVis);
    return () => window.removeEventListener('sipjam:ai_assistant_visibility', handleAiVis);
  }, []);

  useEffect(() => {
    if (tourOpen && !showAiAssistant) {
      setShowAiAssistant(true);
      try {
        localStorage.setItem('sipjam_ai_assistant_visible', 'true');
      } catch {}
    }
  }, [tourOpen, showAiAssistant]);

  useEffect(() => {
    const schoolId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
    const fetchSchool = async () => {
      try {
        const [schoolRes, configRes] = await Promise.all([
          supabase
            .from('sekolah')
            .select('*')
            .eq('id', schoolId)
            .maybeSingle(),
          supabase
            .from('pengaturan')
            .select('key, value')
            .eq('sekolah_id', schoolId)
            .in('key', ['kop_sekolah', 'NAMA_SEKOLAH'])
        ]);

        let kopSekolah = '';
        if (configRes.data && configRes.data.length > 0) {
          const kopRow = configRes.data.find((r: any) => r.key === 'kop_sekolah') || configRes.data.find((r: any) => r.key === 'NAMA_SEKOLAH');
          if (kopRow?.value?.trim()) {
            kopSekolah = kopRow.value.trim();
          }
        }

        if (!kopSekolah && typeof window !== 'undefined') {
          try {
            const syncRaw = localStorage.getItem('sipjam_config_sync');
            if (syncRaw) {
              const parsed = JSON.parse(syncRaw);
              if (parsed?.config?.kop_sekolah) {
                kopSekolah = parsed.config.kop_sekolah.trim();
              }
            }
          } catch (_) {}
        }

        const baseSchool = schoolRes.data || {};
        const rawSchoolName = kopSekolah || baseSchool.nama || (user as any)?.sekolah_nama || 'SMA NIZAMUDIN';
        const formattedNama = formatSchoolDisplayName(rawSchoolName);

        setSchoolData((prev: any) => ({
          ...(prev || {}),
          ...baseSchool,
          id: schoolId,
          nama: formattedNama,
        }));
      } catch (err) {
        console.error('[AppScreen] Failed to fetch school profile:', err);
      }
    };
    fetchSchool();
  }, [user?.sekolah_id, syncKey]);

  // Realtime configuration sync listener so kop surat edits update header instantly
  useEffect(() => {
    const handleConfigSync = (e: any) => {
      const updatedConfig = e?.detail?.config;
      const newKopSekolah = updatedConfig?.kop_sekolah || updatedConfig?.NAMA_SEKOLAH;
      if (newKopSekolah) {
        setSchoolData((prev: any) => ({
          ...(prev || {}),
          nama: formatSchoolDisplayName(newKopSekolah),
        }));
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'sipjam_config_sync' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const name = parsed?.config?.kop_sekolah || parsed?.config?.NAMA_SEKOLAH;
          if (name) {
            setSchoolData((prev: any) => ({
              ...(prev || {}),
              nama: formatSchoolDisplayName(name),
            }));
          }
        } catch (_) {}
      }
    };

    window.addEventListener('sipjam:config_updated', handleConfigSync);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('sipjam:config_updated', handleConfigSync);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

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

    const rtFilter = schoolId ? { filter: `sekolah_id=eq.${schoolId}` } : {};
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengaturan', ...rtFilter }, () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: { sekolah_id: schoolId } }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_guru', ...rtFilter }, () => {
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

    let lastResume = Date.now();
    const handleResumeSync = (e?: Event) => {
      const now = Date.now();
      const isOnlineEvent = e?.type === 'online';
      // Only re-sync on genuine network reconnect or after meaningful idle (>= 30s)
      // Prevents rapid event thrashing and unwanted state churn when picking files or switching windows
      if (!isOnlineEvent && (now - lastResume < 30000)) return;
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

  const handleNavigation = async (targetId: string, targetTab?: string) => {
    try {
      if (targetId === 'view-pengaturan-akun') {
        setSidebarOpen(false);
        setIsAccountModalOpen(true);
        return;
      }

      // Superadmin and Admin bypass all daily guru checks
      if (isSuperadmin || isAdmin) {
        const resolution = resolveCanonicalRoute(targetId, targetTab);
        const nextView = resolution.canonicalView;
        const nextTab = resolution.defaultTab;
        const url = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;
        window.history.pushState(null, '', url);
        setCurrentView(nextView);
        setUrlTab(nextTab || null);
        setSidebarOpen(false);
        return;
      }

      // Orang Tua navigation guard: strictly restricted to Kolaborasi, Informasi, and Akun
      if (isOrangTua) {
        const allowedOrtuViews = ['view-kolaborasi', 'view-informasi', 'view-pengaturan-akun'];
        const resolution = resolveCanonicalRoute(targetId, targetTab);
        if (!allowedOrtuViews.includes(targetId) && !allowedOrtuViews.includes(resolution.canonicalView)) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akun Orang Tua hanya memiliki akses ke Ruang Kolaborasi, Informasi Sekolah, dan Pengaturan Akun.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }
        const nextView = resolution.canonicalView;
        const nextTab = resolution.defaultTab;
        const url = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;
        window.history.pushState(null, '', url);
        setCurrentView(nextView);
        setUrlTab(nextTab || null);
        setSidebarOpen(false);
        return;
      }

      // Tata Usaha navigation guard: strictly restricted to 6 dedicated modules
      if (isTataUsaha) {
        if (targetId === 'view-dokumen') {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }

        const rbacCheck = evaluateTabRBAC(targetId, targetTab || '', { role: user?.role, isWaliKelas });
        if (!rbacCheck.allowed) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: rbacCheck.reason || 'Akses Terblokir: Role Tata Usaha tidak memiliki izin akses ke modul ini.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }

        const resolution = resolveCanonicalRoute(targetId, targetTab);
        const nextView = resolution.canonicalView;
        const nextTab = resolution.defaultTab;
        const url = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;
        window.history.pushState(null, '', url);
        setCurrentView(nextView);
        setUrlTab(nextTab || null);
        setSidebarOpen(false);
        return;
      }

      // BK navigation guard: strictly restricted to 5 dedicated modules
      if (isBk) {
        const allowedBkViews = [
          'view-home',
          'view-guru-presensi',
          'view-jurnal-bk',
          'view-bk-jurnal',
          'view-kolaborasi',
          'view-informasi',
          'view-pengaturan-akun'
        ];
        const resolution = resolveCanonicalRoute(targetId, targetTab);
        if (!allowedBkViews.includes(targetId) && !allowedBkViews.includes(resolution.canonicalView)) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Role Guru BK tidak memiliki izin akses ke modul ini.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }

        const rbacCheck = evaluateTabRBAC(targetId, targetTab || '', {
          role: isBk ? 'bk' : user?.role,
          isWaliKelas,
          mata_pelajaran: user?.mata_pelajaran,
          isBk
        });
        if (!rbacCheck.allowed) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: rbacCheck.reason || 'Akses Terblokir: Role Guru BK tidak memiliki izin akses ke modul ini.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }

        const nextView = resolution.canonicalView;
        const nextTab = resolution.defaultTab;
        const url = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;
        window.history.pushState(null, '', url);
        setCurrentView(nextView);
        setUrlTab(nextTab || null);
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
          'view-admin-verif',
          'view-admin-pengguna',
          'view-pengguna'
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
            confirmButtonColor: '#0F766E'
          });
          return;
        }

        const resolution = resolveCanonicalRoute(targetId, targetTab);
        const nextView = resolution.canonicalView;
        const nextTab = resolution.defaultTab;
        const url = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;
        window.history.pushState(null, '', url);
        setCurrentView(nextView);
        setUrlTab(nextTab || null);
        setSidebarOpen(false);
        return;
      }

      // Jurnal BK confidentiality check
      if (targetId === 'view-jurnal-bk' || targetId === 'view-bk-jurnal') {
        if (!isBk && !isAdmin && !isSuperadmin && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Jurnal BK bersifat rahasia dan hanya dapat diakses oleh Guru BK, Administrator, dan Kepala Sekolah.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }
      }

      // Guru workflow checks
      const restrictedViews = ['view-guru-jurnal', 'view-piket', 'view-guru-presensi'];
      
      if (targetId === 'view-jurnal-kelas') {
        if (!isAdmin && !isSuperadmin && !isWaliKelas && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Jurnal Kelas secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
            confirmButtonColor: '#0F766E'
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
            confirmButtonColor: '#0F766E'
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
            confirmButtonColor: '#0F766E'
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
            confirmButtonColor: '#0F766E'
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
            confirmButtonColor: '#0F766E'
          });
          return;
        }
      }

      if (['view-admin-verif', 'view-admin-rekap', 'view-analitik'].includes(targetId)) {
        if (!isAdmin && !isSuperadmin && !isKepalaSekolah) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: `Akses Terblokir: Fitur monitoring administrasi hanya dapat diakses oleh Administrator dan ${formatKepalaSekolahLabel(statusKepalaSekolah)}.`,
            confirmButtonColor: '#0F766E'
          });
          return;
        }
      }

      if (['view-admin-config', 'view-admin-backup', 'view-admin-data', 'view-admin-pengguna', 'view-pengguna', 'view-admin-users'].includes(targetId)) {
        if (!isAdmin && !isSuperadmin) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Ditolak',
            text: 'Akses Terblokir: Halaman Konfigurasi dan Manajemen Data secara eksklusif hanya dapat diakses oleh Administrator.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }
      }

      // Defense-in-depth sub-tab RBAC check
      const rbacCheck = evaluateTabRBAC(targetId, targetTab || '', {
        role: isBk ? 'bk' : (isTataUsaha ? 'tata_usaha' : (isKepalaSekolah ? 'kepalasekolah' : user?.role)),
        isWaliKelas,
        is_kepala_sekolah: isKepalaSekolah,
        isKepalaSekolah,
        statusKepalaSekolah,
        mata_pelajaran: user?.mata_pelajaran,
        isBk
      });
      if (!rbacCheck.allowed) {
        Swal.fire({
          icon: 'warning',
          title: 'Akses Ditolak',
          text: rbacCheck.reason || 'Anda tidak memiliki hak akses untuk membuka sub-tab ini.',
          confirmButtonColor: '#0F766E'
        });
        return;
      }

      if (restrictedViews.includes(targetId)) {
        Swal.fire({ title: 'Memeriksa Akses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
        Swal.close();

        const isRekapTab = targetTab === 'rekap-pribadi' || targetTab === 'supervisi-kelas' || targetId === 'view-guru-rekap-jurnal';

        if (state.isLibur && targetId !== 'view-guru-presensi' && !isRekapTab) {
          Swal.fire('Akses Ditolak', state.lockedReason || 'Hari ini libur.', 'warning');
          return;
        }

        if (targetId === 'view-piket') {
          if (!state.isPiket) {
            Swal.fire({
              icon: 'warning',
              title: 'Akses Ditolak',
              text: 'Akses Terblokir: Modul Piket hanya dapat diakses oleh Guru yang bertugas piket pada hari ini.',
              confirmButtonColor: '#0F766E'
            });
            return;
          }
          if (!state.presensiDatang) return Swal.fire('Akses Ditolak', 'Harap lakukan Presensi Datang terlebih dahulu.', 'warning');
          if (state.isIzinSakit) return Swal.fire('Akses Ditolak', state.lockedReason || '', 'info');
        }

        if (targetId === 'view-guru-jurnal') {
          if (!isRekapTab) {
            if (!state.presensiDatang) return Swal.fire('Akses Ditolak', 'Harap lakukan Presensi Datang terlebih dahulu.', 'warning');
            if (state.isIzinSakit) return Swal.fire('Akses Ditolak', state.lockedReason || '', 'info');
            if (!state.canOpenJurnal) return Swal.fire('Akses Ditolak', state.lockedReason || 'Selesaikan tugas lain.', 'warning');
          }
        }
        
        // If target is presensi, we let them open it so they can see the "locked" status for Pulang inside the component
      }

      const resolution = resolveCanonicalRoute(targetId, targetTab);
      const nextView = resolution.canonicalView;
      const nextTab = resolution.defaultTab;
      const url = nextTab ? `?view=${nextView}&tab=${nextTab}` : `?view=${nextView}`;
      window.history.pushState(null, '', url);
      setCurrentView(nextView);
      setUrlTab(nextTab || null);
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
    { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' },
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

  // Active consolidated menus generated for Miller's Law ergonomics (7 ± 2 items per role)
  const consolidatedMenuItems = getConsolidatedMenuItems({
    role: isSuperadmin ? 'superadmin' : isDinas ? 'dinaspendidikan' : isAdmin ? 'admin' : (isKepalaSekolah ? 'kepalasekolah' : isSiswa ? 'siswa' : isOrangTua ? 'orang_tua' : isTataUsaha ? 'tata_usaha' : isBk ? 'bk' : 'guru'),
    isWaliKelas,
    isPiketHariIni,
    isKepalaSekolah,
    activeTargetSchool,
    isBk,
    mata_pelajaran: baseUser?.mata_pelajaran || baseUser?.mataPelajaran
  });

  // Role landing view resolution satisfying both dinas, siswa, and tata usaha RBAC contracts:
  // - Dinas Pendidikan contract: isDinas ? 'view-dinas-overview' : 'view-home'
  // - Siswa contract: isSiswa ? 'view-ujian' : 'view-home'
  // - Tata Usaha contract: isTataUsaha ? 'view-home' : defaultDinasHomeView
  const defaultDinasHomeView = isDinas ? 'view-dinas-overview' : 'view-home';
  const defaultSiswaHomeView = isSiswa ? 'view-ujian' : 'view-home';
  const defaultTuHomeView = isTataUsaha ? 'view-home' : defaultDinasHomeView;
  const defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : (isSiswa ? defaultSiswaHomeView : defaultTuHomeView);

  const renderAccessDenied = (message: React.ReactNode) => (
    <div className="neu-card p-6 sm:p-8 text-center max-w-lg mx-auto mt-10 rounded-3xl">
      <div className="neu-inset w-16 h-16 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <i className="fa-solid fa-lock"></i>
      </div>
      <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-2">Akses Terblokir</h2>
      <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
        {message}
      </p>
      <button
        type="button"
        onClick={() => { window.history.pushState(null, '', '?view=' + defaultHomeView); setCurrentView(defaultHomeView); }}
        className="clay-btn clay-btn-primary btn-click text-white text-xs font-bold px-5 py-2.5 min-h-[44px] rounded-2xl inline-flex items-center gap-2 transition"
      >
        <i className="fa-solid fa-house text-xs"></i> Kembali ke Dashboard
      </button>
    </div>
  );

  const activeMenuItem = consolidatedMenuItems.find((item) => item.id === currentView);
  const mobileBottomItems = consolidatedMenuItems.slice(0, 4);

  const renderSidebarInner = (isCollapsed = false, isMobileDrawer = false) => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`flex items-center pb-4 mb-3 border-b border-slate-300/60 dark:border-slate-700/60 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-[#0F766E] to-[#115E59] rounded-2xl flex items-center justify-center text-white border border-white/25 font-bold shrink-0">
            <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isDinas ? 'fa-building-columns' : 'fa-graduation-cap'}`}></i>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-sm text-[#0F172A] dark:text-[#F1F5F9] tracking-tight block truncate">
                {isSuperadmin ? 'Portal Superadmin' : isDinas ? 'Dinas Pendidikan' : 'SIPJAM'}
              </span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block truncate max-w-[140px]">
                {isDinas ? (user?.kota_kabupaten || 'Pengawas Wilayah') : (schoolData?.nama || 'Sekolah')}
              </span>
            </div>
          )}
        </div>
        {isMobileDrawer && (
          <button type="button" onClick={toggleSidebar} aria-label="Tutup Menu" title="Tutup Menu" className="clay-btn w-11 h-11 rounded-full flex items-center justify-center text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white shrink-0">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        )}
      </div>

      {/* User Identity Card */}
      {!isCollapsed ? (
        <ClayCard variant="mint" rounded="2xl" className="mb-3 p-3 flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full neu-inset p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
            {renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-10 h-10')}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-teal-500 border-2 border-[#E6ECF2] dark:border-[#1F242D]" title="Aktif"></span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] truncate" title={user?.nama || 'Pengguna SIPJAM'}>
              {user?.nama || 'Pengguna SIPJAM'}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isSuperadmin
                  ? 'neu-inset text-amber-800 dark:text-amber-300'
                  : isDinas
                  ? 'neu-inset text-sky-800 dark:text-sky-300'
                  : isAdmin
                  ? 'neu-inset text-blue-800 dark:text-blue-300'
                  : isTataUsaha
                  ? 'neu-inset text-teal-800 dark:text-teal-300'
                  : isOrangTua
                  ? 'neu-inset text-sky-800 dark:text-sky-300'
                  : isSiswa
                  ? 'neu-inset text-[#0F766E] dark:text-teal-300'
                  : isBk
                  ? 'neu-inset text-rose-800 dark:text-rose-300'
                  : isKepalaSekolah
                  ? 'neu-inset text-amber-900 dark:text-amber-300'
                  : isWaliKelas
                  ? 'neu-inset text-teal-800 dark:text-teal-300'
                  : 'neu-inset text-[#0F766E] dark:text-teal-300'
              }`}>
                <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isDinas ? 'fa-building-columns' : isAdmin ? 'fa-user-shield' : isTataUsaha ? 'fa-id-card-clip' : isOrangTua ? 'fa-people-roof' : isSiswa ? 'fa-user-graduate' : isBk ? 'fa-heart-pulse' : isKepalaSekolah ? 'fa-user-tie' : 'fa-chalkboard-user'} text-[9px]`}></i>
                {isSuperadmin ? 'Superadmin' : isDinas ? 'Dinas Pendidikan' : isAdmin ? 'Administrator' : isTataUsaha ? 'Tata Usaha' : isOrangTua ? 'Orang Tua' : isSiswa ? 'Siswa' : isBk ? 'Guru BK' : isKepalaSekolah ? formatKepalaSekolahLabel(statusKepalaSekolah) : isWaliKelas ? 'Guru (Wali Kelas)' : 'Guru'}
              </span>
              {(user?.username || user?.nip) && (
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-[85px]" title={user?.username || user?.nip}>
                  {user?.username || user?.nip}
                </span>
              )}
              {isDinas && user?.kota_kabupaten && (
                <div className="w-full text-[10px] text-sky-700 dark:text-sky-300 font-semibold truncate mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-map-location-dot text-[10px] text-[#0F766E] dark:text-teal-400"></i>
                  <span>Wilayah: {user.kota_kabupaten}</span>
                </div>
              )}
            </div>
          </div>
        </ClayCard>
      ) : (
        <div className="mb-3 flex justify-center">
          <div className="relative w-10 h-10 rounded-full neu-inset p-0.5 shrink-0 overflow-hidden flex items-center justify-center" title={user?.nama || 'Pengguna SIPJAM'}>
            {renderUserAvatar(currentUser?.avatar || user?.avatar, 'w-9 h-9')}
          </div>
        </div>
      )}

      {(isSuperadmin || isDinas) && !isCollapsed && (
        <div className="mb-3 p-2.5 rounded-2xl neu-inset">
          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i className="fa-solid fa-satellite-dish text-[#0F766E] dark:text-teal-400"></i> {isDinas ? 'Sekolah Binaan:' : 'Sekolah yang Dipantau:'}
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
            className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl neu-input cursor-pointer"
          >
            <option value="">{isDinas ? '🌐 Ringkasan Wilayah' : '🌐 Master Platform (Semua)'}</option>
            {(isDinas
              ? satelliteSchools.filter(s => {
                  const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
                  const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
                  return Boolean(userRegion && schoolRegion && userRegion === schoolRegion);
                })
              : satelliteSchools
            ).map(sch => (
              <option key={sch.id} value={sch.id}>
                🏫 {sch.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={`space-y-1.5 flex-1 min-h-0 overflow-y-auto py-1.5 custom-scroll ${isCollapsed ? 'px-1' : 'px-1'}`}>
        {consolidatedMenuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <React.Fragment key={item.id}>
              {/* AST preservation: data-tour={item.id} */}
              <button
                key={item.id}
                type="button"
                data-tour={(item as any).dataTour || item.id}
                onClick={() => handleNavigation(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full text-left ${isCollapsed ? 'px-2 justify-center' : 'px-3 justify-between'} py-2.5 min-h-[44px] text-xs font-bold rounded-2xl flex items-center gap-2.5 transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-teal-400 ${
                  isActive
                    ? 'neu-inset text-[#0F766E] dark:text-teal-300 ring-1 ring-[#0F766E]/35 dark:ring-teal-400/35'
                    : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : 'truncate'}`}>
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-[#0F766E] text-white dark:bg-teal-500 dark:text-slate-950'
                      : 'neu-card-sm text-slate-600 dark:text-slate-300'
                  }`}>
                    <i className={`fa-solid ${item.icon} text-xs`}></i>
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!isCollapsed && item.badge !== undefined && item.badge !== null && item.badge !== '' && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 neu-inset text-[#0F766E] dark:text-teal-300">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}

        <div className="pt-2 mt-2 border-t border-slate-300/50 dark:border-slate-700/50 space-y-1.5">
          {!isTataUsaha && !isBk && !isOrangTua && !isSiswa && (
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}
              title={isCollapsed ? 'Pengaturan Akun' : undefined}
              className={`w-full text-left ${isCollapsed ? 'px-2 justify-center' : 'px-3'} py-2.5 min-h-[44px] text-xs font-bold rounded-2xl flex items-center gap-2.5 text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-teal-400`}
            >
              <span className="w-7 h-7 rounded-xl neu-card-sm flex items-center justify-center text-sky-700 dark:text-sky-300 shrink-0">
                <i className="fa-solid fa-user-gear text-xs"></i>
              </span>
              {!isCollapsed && <span>Pengaturan Akun</span>}
            </button>
          )}
          {!isTataUsaha && (
            <button
              type="button"
              onClick={() => { setTutorialModalOpen(true); setSidebarOpen(false); }}
              className={`clay-btn clay-btn-mint w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} gap-2.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold`}
              title="Buka panduan & tutorial lengkap seluruh menu"
            >
              <span className="w-7 h-7 rounded-xl neu-inset flex items-center justify-center text-[#0F766E] dark:text-teal-300 shrink-0">
                <i className="fa-solid fa-book-bookmark text-xs"></i>
              </span>
              {!isCollapsed && <span className="truncate">Panduan & Tutorial</span>}
            </button>
          )}
          {!isSuperadmin && !isTataUsaha && (
            <button
              type="button"
              onClick={() => { setTourOpen(true); setSidebarOpen(false); }}
              className={`clay-btn clay-btn-amber w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} gap-2.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold`}
              title="Buka kembali panduan tutorial interaktif"
            >
              <span className="w-7 h-7 rounded-xl neu-inset flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                <i className="fa-solid fa-graduation-cap text-xs"></i>
              </span>
              {!isCollapsed && <span className="truncate">Lihat Tutorial Lagi</span>}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const nextVal = !showAiAssistant;
              setShowAiAssistant(nextVal);
              try {
                localStorage.setItem('sipjam_ai_assistant_visible', String(nextVal));
              } catch {}
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sipjam:ai_assistant_visibility', { detail: { visible: nextVal } }));
              }
            }}
            className={`clay-btn clay-btn-secondary w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} gap-2.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold`}
            title={showAiAssistant ? 'Sembunyikan tombol asisten AI di layar' : 'Tampilkan tombol asisten AI di layar'}
          >
            <span className="w-7 h-7 rounded-xl neu-inset flex items-center justify-center text-[#0F766E] dark:text-teal-300 shrink-0">
              <i className={`fa-solid ${showAiAssistant ? 'fa-eye-slash text-slate-500 dark:text-slate-400' : 'fa-robot'} text-xs`}></i>
            </span>
            {!isCollapsed && <span className="truncate">{showAiAssistant ? 'Sembunyikan Tombol AI' : 'Tampilkan Tombol AI'}</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-col h-full w-full flex">
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <aside
        aria-label="Navigasi Utama Desktop"
        className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-40 flex-col neu-shell-surface border-r p-4 transition-all duration-200 print:hidden no-print ${
          desktopSidebarCollapsed ? 'w-[78px]' : 'w-64'
        }`}
      >
        {renderSidebarInner(desktopSidebarCollapsed, false)}
      </aside>

      <header className={`neu-shell-surface px-3 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 shrink-0 z-30 fixed top-0 right-0 left-0 shadow-[0_2px_10px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.45)] border-b transition-all duration-200 print:hidden no-print ${
        desktopSidebarCollapsed ? 'lg:left-[78px]' : 'lg:left-64'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              data-tour="hamburger-btn"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setDesktopSidebarCollapsed((prev) => !prev);
                } else {
                  toggleSidebar();
                }
              }}
              aria-label="Buka atau Lipat Menu Navigasi"
              className="clay-btn btn-click w-10 h-11 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-[#0F172A] dark:text-[#F1F5F9] shrink-0"
            >
                <i className="fa-solid fa-bars text-sm"></i>
            </button>
            <button type="button" onClick={() => handleNavigation(defaultHomeView)} className="text-left min-w-0 truncate text-sm md:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-teal-400 rounded-lg px-1">
              <span className="lg:hidden">
                SIPJAM <span className="text-[#0F766E] dark:text-teal-400 font-black">
                  {isSuperadmin ? 'Superadmin' : isDinas ? 'Dinas Pendidikan' : (schoolData?.nama || 'Sekolah')}
                </span>
              </span>
              <span className="hidden lg:inline-flex items-center gap-2">
                <span className="text-[#0F766E] dark:text-teal-400 font-black">{activeMenuItem?.label || 'Dashboard'}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">&bull; {isSuperadmin ? 'Superadmin' : isDinas ? 'Dinas Pendidikan' : (schoolData?.nama || 'Sekolah')}</span>
              </span>
            </button>
            {(isSuperadmin || isDinas) && (
              <div className="hidden sm:flex items-center ml-2 shrink-0">
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
                  className="neu-input text-[11px] font-semibold py-1.5 px-2.5 rounded-xl cursor-pointer max-w-[180px] truncate"
                  title="Ganti Sekolah yang Dipantau"
                >
                  <option value="">{isDinas ? '🌐 Ringkasan Wilayah' : '🌐 Master Platform'}</option>
                  {(isDinas
                    ? satelliteSchools.filter(s => {
                        const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
                        const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
                        return Boolean(userRegion && schoolRegion && userRegion === schoolRegion);
                      })
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

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Broadcast Bell with Shake Animation and Unread Count Badge */}
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(true)}
              className="clay-btn btn-click relative w-10 h-11 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-[#0F172A] dark:text-[#F1F5F9]"
              title="Pengumuman Siaran"
              aria-label="Pengumuman Siaran"
            >
              <i
                className={`fa-solid fa-bell text-sm ${
                  unreadCount > 0 ? 'text-amber-600 dark:text-amber-400 animate-bell-shake' : 'text-slate-700 dark:text-slate-300'
                }`}
              ></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center font-num">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="clay-btn btn-click w-10 h-11 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center p-1"
              title="Pengaturan Akun & Profil"
              aria-label="Pengaturan Akun & Profil"
            >
              <span className="w-7 h-7 rounded-xl overflow-hidden flex items-center justify-center">
                {renderUserAvatar(currentUser?.avatar, 'w-7 h-7')}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              className="clay-btn btn-click w-10 h-11 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-[#0F172A] dark:text-[#F1F5F9]"
            >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-sun text-amber-400' : 'fa-moon text-slate-700'} text-sm`}></i>
            </button>
            <ClayButton variant="rose" size="sm" onClick={onLogout} aria-label="Keluar" className="btn-click min-h-[44px] sm:min-h-[40px]" icon={<i className="fa-solid fa-power-off text-xs"></i>}>
                <span className="hidden sm:inline">Keluar</span>
            </ClayButton>
        </div>
      </header>

      {/* Mobile Sidebar Drawer Overlay (< 1024px) */}
      {sidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi"
          className="lg:hidden fixed inset-0 bg-slate-900/45 dark:bg-black/65 z-50 transition-opacity animate-in fade-in duration-200"
          onClick={toggleSidebar}
        >
          <div className="w-80 max-w-[88%] neu-shell-surface border-r h-full shadow-[12px_0_28px_rgba(163,177,198,0.45)] dark:shadow-[12px_0_30px_rgba(0,0,0,0.72)] p-4 sm:p-5 flex flex-col justify-between transform transition-transform" onClick={e => e.stopPropagation()}>
            {renderSidebarInner(false, true)}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 neu-shell-surface border-t px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] dark:shadow-[0_-4px_18px_rgba(0,0,0,0.5)] print:hidden no-print"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {mobileBottomItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[50px] px-1 py-1 rounded-2xl transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#0F766E]/12 dark:bg-teal-400/15 text-[#0F766E] dark:text-teal-300 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 font-semibold'
                }`}
              >
                <i className={`fa-solid ${item.icon} text-sm`}></i>
                <span className="text-[10px] leading-tight truncate max-w-full">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[50px] px-1 py-1 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 font-semibold transition-colors cursor-pointer"
            aria-label="Menu Lengkap"
          >
            <i className="fa-solid fa-border-all text-sm"></i>
            <span className="text-[10px] leading-tight">Menu</span>
          </button>
        </div>
      </nav>

      <main className={`flex-grow overflow-y-auto custom-scroll w-full relative pt-20 pb-24 lg:pb-8 px-3 sm:px-6 lg:px-8 z-10 transition-all duration-200 ${
        desktopSidebarCollapsed ? 'lg:pl-[calc(78px+2rem)]' : 'lg:pl-[calc(16rem+2rem)]'
      }`}>
        <div className="max-w-[1440px] mx-auto">
        {/* Active Target School Banner for Dinas Drilldown */}
        {isDinas && activeTargetSchool && currentView !== 'view-dinas-overview' && (
          <div className="neu-card-sm rounded-2xl p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] min-w-0">
              <span className="neu-inset w-8 h-8 rounded-xl flex items-center justify-center text-[#0F766E] dark:text-teal-400 shrink-0">
                <i className="fa-solid fa-eye"></i>
              </span>
              <span className="min-w-0">Memantau Sekolah: <b>{activeTargetSchool.nama}</b> ({activeTargetSchool.kota_kabupaten || user?.kota_kabupaten || 'Wilayah Binaan'}) &bull; Mode Peninjau (Read-Only)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearActiveTargetSchool();
                setActiveTargetSchoolState(null);
                handleNavigation('view-dinas-overview');
              }}
              className="neu-btn neu-btn-primary px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
            >
              <i className="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
            </button>
          </div>
        )}

        <div key={currentView} className="page-transition">
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
              {currentView === 'view-ujian' && (
                <UjianSiswaView
                  user={user}
                  onNavigate={handleNavigation}
                />
              )}
              {currentView === 'view-home' && (
                <HomeView 
                  user={user} 
                  setView={handleNavigation} 
                  menuItems={consolidatedMenuItems} 
                  onOpenAccountSettings={() => setIsAccountModalOpen(true)} 
                  schoolName={schoolData?.nama}
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
              {(currentView === 'view-jurnal-bk' || currentView === 'view-bk-jurnal') && (
                isBk || isAdmin || isSuperadmin || isKepalaSekolah ? (
                  <BkJurnalView
                    user={user}
                    isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}
                    initialTab={(urlTab as any) || undefined}
                  />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Jurnal BK</strong> bersifat rahasia dan secara eksklusif hanya dapat diakses oleh Guru BK, Administrator, dan Kepala Sekolah. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-piket' && (
                isAdmin || isSuperadmin || isPiketHariIni ? (
                  <PiketView user={user} statusKepalaSekolah={statusKepalaSekolah} />
                ) : (
                  renderAccessDenied(<>Modul <strong>Piket</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang memiliki <strong>jadwal piket pada hari ini</strong>. Anda tidak bertugas piket hari ini.</>)
                )
              )}
              {currentView === 'view-dokumen' && (
                !isTataUsaha ? (
                  <DokumenView user={user} statusKepalaSekolah={statusKepalaSekolah} />
                ) : (
                  renderAccessDenied(<>Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.</>)
                )
              )}
              {currentView === 'view-gradebook' && (
                <GradebookView
                  user={user}
                  initialTab={urlTab === 'rapor' ? 'rapor' : 'gradebook'}
                  assignedKelas={assignedKelas}
                  isWaliKelas={isWaliKelas}
                  isKepalaSekolah={isKepalaSekolah}
                  statusKepalaSekolah={statusKepalaSekolah}
                />
              )}
              {currentView === 'view-informasi' && <InformasiView user={user} setView={handleNavigation} />}
              {currentView === 'view-kolaborasi' && <KolaborasiOrtuView user={user} />}
              {currentView === 'view-history' && <HistoryView user={user} />}
              {currentView === 'view-guru-rekap-jurnal' && <RekapJurnalView user={user} isKepalaSekolah={isKepalaSekolah} />}
              {currentView === 'view-jurnal-kelas' && (
                isAdmin || isWaliKelas || isDinas ? (
                  <RekapJurnalView user={user} initialMode="kelas" assignedKelas={assignedKelas} isKepalaSekolah={isKepalaSekolah} isReadOnly={isDinas} statusKepalaSekolah={statusKepalaSekolah} />
                ) : isKepalaSekolah ? (
                  <RekapJurnalView user={user} initialMode="kelas" assignedKelas={assignedKelas} isKepalaSekolah={true} statusKepalaSekolah={statusKepalaSekolah} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Jurnal Kelas</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-rekap-siswa' && (
                isAdmin || isSuperadmin || isWaliKelas || isDinas ? (
                  <RekapSiswaView user={user} assignedKelas={assignedKelas} isReadOnly={isDinas || (isKepalaSekolah && !isAdmin && !isSuperadmin)} initialTab={(urlTab as any) || undefined} statusKepalaSekolah={statusKepalaSekolah} />
                ) : isKepalaSekolah ? (
                  <RekapSiswaView user={user} assignedKelas={assignedKelas} isReadOnly={true} initialTab={(urlTab as any) || undefined} statusKepalaSekolah={statusKepalaSekolah} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Presensi Siswa</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-rapor' && (
                isTataUsaha ? (
                  <RaporView user={user} assignedKelas={assignedKelas} />
                ) : isAdmin || isSuperadmin || isWaliKelas || isKepalaSekolah ? (
                  /* AST preservation: isAdmin || isSuperadmin || isWaliKelas ? ( */
                  <RaporView user={user} assignedKelas={assignedKelas} statusKepalaSekolah={statusKepalaSekolah} isKepalaSekolah={isKepalaSekolah} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Rapor</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-admin-verif' && (
                isAdmin || isSuperadmin || isKepalaSekolah ? (
                  <AdminVerifView user={user} isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin} initialTab={urlTab || undefined} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Verifikasi</strong> secara eksklusif hanya dapat diakses oleh Administrator dan {formatKepalaSekolahLabel(statusKepalaSekolah)}. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
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
                    statusKepalaSekolah={statusKepalaSekolah}
                  />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Rekap Presensi</strong> secara eksklusif hanya dapat diakses oleh Administrator dan {formatKepalaSekolahLabel(statusKepalaSekolah)}. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
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
                    statusKepalaSekolah={statusKepalaSekolah}
                  />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Rekap Presensi Guru</strong> secara eksklusif hanya dapat diakses oleh Administrator dan {formatKepalaSekolahLabel(statusKepalaSekolah)}. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-admin-data' && (
                isAdmin || isSuperadmin ? (
                  <AdminDataView user={user} initialTab={urlTab || undefined} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Data Master</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-admin-backup' && (
                isAdmin || isSuperadmin ? (
                  <AdminBackupView user={user} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Backup Data</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
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
                  renderAccessDenied(<>Halaman <strong>Pengaturan Sistem</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-sistem-blok' && (
                isAdmin || isSuperadmin ? (
                  <SistemBlokView user={user} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Manajemen Sistem Blok</strong> secara eksklusif hanya dapat diakses oleh Administrator. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
              {currentView === 'view-analitik' && (
                isAdmin || isSuperadmin || isKepalaSekolah ? (
                  <AnalitikView user={user} />
                ) : (
                  renderAccessDenied(<>Halaman <strong>Analitik</strong> hanya dapat diakses oleh Administrator dan {formatKepalaSekolahLabel(statusKepalaSekolah)}. Anda tidak memiliki hak akses untuk membuka halaman ini.</>)
                )
              )}
            </>
          )}
        </div>
        </div>
      </main>

      {/* Native PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Broadcast Modal / Drawer */}
      {broadcastModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pengumuman dan Siaran"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 animate-in fade-in"
          onClick={() => setBroadcastModalOpen(false)}
        >
          <ClayCard rounded="3xl" className="w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#0F766E] to-[#115E59] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white text-sm shrink-0">
                  <i className="fa-solid fa-bullhorn"></i>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm leading-tight truncate">Pengumuman &amp; Siaran</h3>
                  <p className="text-[11px] text-teal-100/90">
                    {unreadCount > 0 ? `${unreadCount} pengumuman belum dibaca` : 'Semua pengumuman sudah dibaca'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                aria-label="Tutup pengumuman"
                title="Tutup pengumuman"
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-xs transition cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Action Bar */}
            {unreadCount > 0 && (
              <div className="px-5 py-2.5 bg-[#DDE4EE] dark:bg-[#181C24] border-b border-slate-300/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  Terdapat siaran baru dari sekolah
                </span>
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="btn-click text-[11px] font-bold text-[#0F766E] dark:text-teal-300 hover:underline flex items-center gap-1 min-h-[36px] px-2"
                >
                  <i className="fa-solid fa-check-double text-xs"></i> Tandai Semua Dibaca
                </button>
              </div>
            )}

            {/* Announcements List */}
            <div className="p-4 overflow-y-auto custom-scroll space-y-3 flex-1 bg-[#E6ECF2] dark:bg-[#1F242D]">
              {allAnnouncements.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <i className="fa-regular fa-bell-slash text-2xl mb-2 block text-slate-400 dark:text-slate-600"></i>
                  Belum ada pengumuman siaran yang diterbitkan.
                </div>
              ) : (
                allAnnouncements.map(ann => {
                  const isRead = !!readMap[ann.id];
                  return (
                    <div
                      key={ann.id}
                      className={`p-3.5 rounded-2xl transition-all ${
                        isRead
                          ? 'neu-inset text-slate-600 dark:text-slate-300'
                          : 'neu-card-sm ring-1 ring-[#0F766E]/35 dark:ring-teal-400/35 text-[#0F172A] dark:text-[#F1F5F9]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ann.is_pinned && (
                            <span className="neu-inset px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <i className="fa-solid fa-thumbtack text-[9px]"></i> Disematkan
                            </span>
                          )}
                          <span className="neu-inset px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                            {ann.sasaran || 'Semua'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
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
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600 text-white">
                            BARU
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold mt-2 leading-snug">{ann.judul}</h4>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-3">
                        {ann.konten}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-300/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          Oleh: <strong>{ann.penulis_nama || 'Admin'}</strong>
                        </span>

                        {!isRead ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(ann.id)}
                            className="btn-click text-[11px] font-bold text-[#0F766E] dark:text-teal-300 hover:underline flex items-center gap-1 min-h-[36px] px-2"
                          >
                            <i className="fa-solid fa-check"></i> Tandai Dibaca
                          </button>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <i className="fa-solid fa-check-double text-[#0F766E] dark:text-teal-400"></i> Sudah Dibaca
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#E6ECF2] dark:bg-[#1F242D] border-t border-slate-300/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setBroadcastModalOpen(false);
                  handleNavigation('view-informasi');
                }}
                className="text-xs font-bold text-[#0F766E] dark:text-teal-400 hover:underline flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <i className="fa-solid fa-bullhorn text-xs"></i> Buka Menu Informasi Lengkap
              </button>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="clay-btn clay-btn-secondary px-4 py-2 min-h-[44px] rounded-2xl text-xs font-bold"
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
        visible={showAiAssistant}
        onVisibilityChange={setShowAiAssistant}
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


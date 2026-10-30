/**
 * src/lib/navigation.ts - Canonical Route Resolution, Legacy Aliases & Role Menu Generators
 * Part of Milestone 3: Comprehensive Feature and Menu Consolidation
 */

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: string | number;
  badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
  dataTour?: string;
}

export interface RouteResolution {
  canonicalView: string;
  defaultTab?: string;
  isLegacyAlias: boolean;
}

export const VIEW_ALIASES: Record<string, { view: string; tab?: string }> = {
  // Klaster 1: Jurnal Mengajar
  'view-guru-rekap-jurnal': { view: 'view-guru-jurnal', tab: 'rekap-pribadi' },
  'view-jurnal-kelas':      { view: 'view-guru-jurnal', tab: 'supervisi-kelas' },
  // Klaster 2: Presensi Guru
  'view-history':           { view: 'view-guru-presensi', tab: 'riwayat' },
  // Klaster 3: Asesmen & Rapor
  'view-rapor':             { view: 'view-gradebook', tab: 'rapor' },
  // Klaster 4: Laporan & Analitik Kinerja
  'view-analitik':          { view: 'view-admin-rekap', tab: 'analitik' },
  'view-rekap-guru':        { view: 'view-admin-rekap', tab: 'tabel' },
  // Klaster 5: Master Data & Sistem
  'view-sistem-blok':       { view: 'view-admin-data', tab: 'blok' },
  'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' }
};

export const SPEC_VIEW_ALIASES = VIEW_ALIASES;

export const SIDEBAR_TOUR_ALIASES: Record<string, string> = {
  'view-guru-jurnal': 'view-guru-rekap-jurnal view-jurnal-kelas',
  'view-guru-presensi': 'view-history',
  'view-gradebook': 'view-rapor',
  'view-admin-rekap': 'view-analitik view-rekap-guru',
  'view-admin-data': 'view-sistem-blok',
  'view-admin-config': 'view-admin-backup'
};

export function resolveCanonicalRoute(rawView: string | null | undefined, rawTab?: string | null): RouteResolution {
  const trimmed = (rawView || '').trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return { canonicalView: 'view-home', isLegacyAlias: false };
  }
  const cleanView = trimmed;
  const alias = VIEW_ALIASES[cleanView];
  if (alias) {
    return {
      canonicalView: alias.view,
      defaultTab: (rawTab && rawTab.trim() !== '') ? rawTab.trim() : alias.tab,
      isLegacyAlias: true
    };
  }
  return {
    canonicalView: cleanView,
    defaultTab: (rawTab && rawTab.trim() !== '') ? rawTab.trim() : undefined,
    isLegacyAlias: false
  };
}

export const resolveRoute = resolveCanonicalRoute;

export function getConsolidatedMenuItems(params: {
  role: string;
  isWaliKelas?: boolean;
  isPiketHariIni?: boolean;
  isKepalaSekolah?: boolean;
  activeTargetSchool?: any;
}): MenuItem[] {
  const normRole = (params.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperadmin = normRole === 'superadmin';
  const isDinas = normRole === 'dinaspendidikan';
  const isAdmin = isSuperadmin || normRole === 'admin';
  const isKepsek = params.isKepalaSekolah || normRole === 'kepalasekolah';

  if (isSuperadmin) {
    if (params.activeTargetSchool) {
      return [
        { id: 'view-admin-data', icon: 'fa-database', label: 'Master Data & Kalender', dataTour: 'view-admin-data view-sistem-blok' },
        { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Pusat Verifikasi' },
        { id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik', dataTour: 'view-admin-rekap view-analitik' },
        { id: 'view-rekap-siswa', icon: 'fa-users', label: 'Kesiswaan & Presensi' },
        { id: 'view-admin-config', icon: 'fa-gear', label: 'Sistem & Pengaturan', dataTour: 'view-admin-config view-admin-backup' }
      ];
    }
    return [
      { id: 'view-superadmin-overview', icon: 'fa-globe', label: 'Ringkasan Platform' },
      { id: 'view-superadmin-jaringan', icon: 'fa-school', label: 'Jaringan Sekolah' },
      { id: 'view-superadmin-dinas', icon: 'fa-building-columns', label: 'Akun Dinas Pendidikan' }
    ];
  }

  if (isDinas) {
    if (params.activeTargetSchool) {
      return [
        { id: 'view-dinas-overview', icon: 'fa-globe', label: 'Dashboard Wilayah' },
        { id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan Terpadu Satelit', dataTour: 'view-admin-rekap view-rekap-guru' }
      ];
    }
    return [
      { id: 'view-dinas-overview', icon: 'fa-globe', label: 'Dashboard Wilayah' }
    ];
  }

  if (isKepsek) {
    return [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard Eksekutif' },
      { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Pusat Supervisi' },
      { id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik', dataTour: 'view-admin-rekap view-analitik' },
      { id: 'view-rekap-siswa', icon: 'fa-users', label: 'Monitoring Kesiswaan' },
      { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi Guru', dataTour: 'view-guru-presensi view-history' },
      { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Pembelajaran', dataTour: 'view-guru-jurnal view-guru-rekap-jurnal view-jurnal-kelas' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' }
    ];
  }

  if (isAdmin) {
    return [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard Operasional' },
      { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Pusat Verifikasi & Supervisi' },
      { id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' },
      { id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik Kinerja', dataTour: 'view-admin-rekap view-analitik' },
      { id: 'view-rekap-siswa', icon: 'fa-users', label: 'Presensi Siswa' },
      { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen & Rapor Sekolah', dataTour: 'view-gradebook view-rapor' },
      { id: 'view-admin-data', icon: 'fa-database', label: 'Master Data & Kalender', dataTour: 'view-admin-data view-sistem-blok' },
      { id: 'view-admin-config', icon: 'fa-gear', label: 'Pengaturan Sistem & Database', dataTour: 'view-admin-config view-admin-backup' }
    ];
  }

  if (normRole === 'siswa') {
    return [
      { id: 'view-ujian', icon: 'fa-file-lines', label: 'Ujian Siswa' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi & Pengumuman' }
    ];
  }

  // Guru (Reguler, Wali Kelas, Piket)
  const items: MenuItem[] = [
    { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi Guru', dataTour: 'view-guru-presensi view-history' },
    { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Pembelajaran', dataTour: 'view-guru-jurnal view-guru-rekap-jurnal view-jurnal-kelas' },
    { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
    { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen & Rapor', dataTour: 'view-gradebook view-rapor' },
    { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah' }
  ];

  if (params.isWaliKelas) {
    items.push({ id: 'view-rekap-siswa', icon: 'fa-users', label: 'Presensi Siswa' });
  }

  if (params.isPiketHariIni) {
    items.push({ id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' });
  }

  return items;
}

export function evaluateTabRBAC(
  viewId: string,
  tabId: string,
  user: { role?: string; isWaliKelas?: boolean }
): { allowed: boolean; fallbackTab?: string; reason?: string } {
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isAdmin = normRole === 'admin' || normRole === 'superadmin';
  const isWali = !!user?.isWaliKelas;
  const isSiswa = normRole === 'siswa';

  // Strict isolation for Siswa role: cannot access teacher/admin operational modules
  if (isSiswa && viewId !== 'view-ujian' && viewId !== 'view-informasi') {
    return { allowed: false, fallbackTab: 'view-ujian', reason: 'Role Siswa hanya memiliki akses ke modul Ujian dan Informasi.' };
  }

  // Cluster 1: Jurnal Mengajar
  if (viewId === 'view-guru-jurnal' && tabId === 'supervisi-kelas') {
    if (!isWali && !isAdmin) {
      return { allowed: false, fallbackTab: 'input', reason: 'Hanya Wali Kelas & Admin yang dapat mengakses supervisi kelas.' };
    }
  }

  // Cluster 3: Asesmen & Rapor
  if (viewId === 'view-gradebook' && tabId === 'rapor') {
    if (!isWali && !isAdmin) {
      return { allowed: false, fallbackTab: 'gradebook', reason: 'Halaman Rapor secara eksklusif hanya dapat diakses oleh Wali Kelas dan Administrator.' };
    }
  }

  // Cluster 5: Master Data & Sistem
  if (viewId === 'view-admin-data' && (tabId === 'blok' || tabId === 'sistem_blok')) {
    if (!isAdmin) {
      return { allowed: false, fallbackTab: 'Data_Siswa', reason: 'Hanya Admin yang dapat mengonfigurasi Sistem Blok.' };
    }
  }

  if (viewId === 'view-admin-config' && tabId === 'backup') {
    if (!isAdmin) {
      return { allowed: false, fallbackTab: 'profil', reason: 'Hanya Admin yang dapat mengakses Cadangan Data.' };
    }
  }

  return { allowed: true };
}

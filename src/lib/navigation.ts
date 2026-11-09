/**
 * src/lib/navigation.ts - Canonical Route Resolution, Legacy Aliases & Role Menu Generators
 * Part of Milestone 3: Comprehensive Feature and Menu Consolidation
 */

import { formatKepalaSekolahLabel } from '../utils/textUtils';

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: string | number;
  badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
  dataTour?: string;
  subItems?: MenuItem[];
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
  'view-jurnal-kegiatan':   { view: 'view-guru-jurnal', tab: 'input' },
  // Klaster 2: Presensi Guru & TU
  'view-history':           { view: 'view-guru-presensi', tab: 'riwayat' },
  'view-presensi-tu':       { view: 'view-guru-presensi' },
  // Klaster 3: Asesmen & Rapor
  'view-rapor':             { view: 'view-gradebook', tab: 'rapor' },
  'view-asesmen':           { view: 'view-gradebook', tab: 'gradebook' },
  // Klaster 4: Laporan & Analitik Kinerja
  'view-analitik':          { view: 'view-admin-rekap', tab: 'analitik' },
  'view-rekap-guru':        { view: 'view-admin-rekap', tab: 'tabel' },
  // Klaster 5: Master Data & Sistem
  'view-sistem-blok':       { view: 'view-admin-data', tab: 'blok' },
  'view-admin-pengguna':    { view: 'view-admin-data', tab: 'Pengguna' },
  'view-pengguna':          { view: 'view-admin-data', tab: 'Pengguna' },
  'view-admin-users':       { view: 'view-admin-data', tab: 'Pengguna' },
  'view-admin-kelas':       { view: 'view-admin-data', tab: 'Data_Kelas' },
  'view-kelas':             { view: 'view-admin-data', tab: 'Data_Kelas' },
  'view-data-siswa':        { view: 'view-admin-data', tab: 'Data_Siswa' },
  'view-siswa':             { view: 'view-admin-data', tab: 'Data_Siswa' },
  'view-data-guru':         { view: 'view-admin-data', tab: 'Data_Guru' },
  'view-guru':              { view: 'view-admin-data', tab: 'Data_Guru' },
  'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' },
  // Klaster Jurnal BK
  'view-jurnal-bk':         { view: 'view-jurnal-bk' },
  'view-bk-jurnal':         { view: 'view-jurnal-bk' }
};

export const SPEC_VIEW_ALIASES = VIEW_ALIASES;

export const SIDEBAR_TOUR_ALIASES: Record<string, string> = {
  'view-guru-jurnal': 'view-guru-rekap-jurnal view-jurnal-kelas view-jurnal-kegiatan',
  'view-guru-presensi': 'view-history view-presensi-tu',
  'view-gradebook': 'view-rapor view-asesmen',
  'view-admin-rekap': 'view-analitik view-rekap-guru',
  'view-admin-data': 'view-sistem-blok view-admin-pengguna view-pengguna view-admin-kelas view-kelas view-data-siswa view-data-guru',
  'view-admin-config': 'view-admin-backup',
  'view-jurnal-bk': 'view-bk-jurnal'
};

export function resolveCanonicalRoute(rawView: string | null | undefined, rawTab?: string | null): RouteResolution {
  const trimmed = (rawView || '').trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return { canonicalView: 'view-home', isLegacyAlias: false };
  }
  const cleanView = trimmed;
  const alias = VIEW_ALIASES[cleanView];
  let canonicalView = cleanView;
  let defaultTab = (rawTab && rawTab.trim() !== '') ? rawTab.trim() : undefined;
  let isLegacyAlias = false;

  if (alias) {
    canonicalView = alias.view;
    defaultTab = (rawTab && rawTab.trim() !== '') ? rawTab.trim() : alias.tab;
    isLegacyAlias = true;
  }

  // Requirement R2: Transparent redirection of legacy 'cetak' subtab to 'tabel'
  if (canonicalView === 'view-admin-rekap' && defaultTab === 'cetak') {
    defaultTab = 'tabel';
  }

  return {
    canonicalView,
    defaultTab,
    isLegacyAlias
  };
}

export const resolveRoute = resolveCanonicalRoute;

export function getConsolidatedMenuItems(params: {
  role: string;
  isWaliKelas?: boolean;
  isPiketHariIni?: boolean;
  isKepalaSekolah?: boolean;
  activeTargetSchool?: any;
  isBk?: boolean;
}): MenuItem[] {
  const normRole = (params.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperadmin = normRole === 'superadmin';
  const isDinas = normRole === 'dinaspendidikan';
  const isAdmin = isSuperadmin || normRole === 'admin';
  const isKepsek = params.isKepalaSekolah || normRole === 'kepalasekolah' || normRole === 'pltkepalasekolah' || normRole === 'plhkepalasekolah';

  if (isSuperadmin) {
    if (params.activeTargetSchool) {
      return [
        {
          id: 'view-admin-data',
          icon: 'fa-database',
          label: 'Master Data & Kalender',
          dataTour: 'view-admin-data view-sistem-blok view-admin-kelas'
        },
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
        { id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan Terpadu Satelit', dataTour: 'view-admin-rekap view-rekap-guru' },
        { id: 'view-rekap-siswa', icon: 'fa-user-graduate', label: 'Presensi Siswa' },
        { id: 'view-jurnal-kelas', icon: 'fa-book-open', label: 'Jurnal Kelas' }
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
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
      {
        id: 'view-admin-data',
        icon: 'fa-database',
        label: 'Master Data & Kalender',
        dataTour: 'view-admin-data view-sistem-blok view-admin-kelas'
      },
      { id: 'view-admin-config', icon: 'fa-gear', label: 'Pengaturan Sistem & Database', dataTour: 'view-admin-config view-admin-backup' }
    ];
  }

  if (normRole === 'siswa') {
    return [
      { id: 'view-ujian', icon: 'fa-file-lines', label: 'Ujian Siswa' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi & Pengumuman' }
    ];
  }

  if (normRole === 'tatausaha') {
    return [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard', dataTour: 'view-home' },
      { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi TU', dataTour: 'view-guru-presensi' },
      { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Kegiatan', dataTour: 'view-guru-jurnal' },
      { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen', dataTour: 'view-gradebook' },
      { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor', dataTour: 'view-rapor' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' },
      { id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }
    ];
  }

  const isBk = Boolean(params.isBk) || normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling';
  if (isBk) {
    return [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard', dataTour: 'view-home' },
      { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi BK', dataTour: 'view-guru-presensi' },
      { id: 'view-jurnal-bk', icon: 'fa-heart-pulse', label: 'Jurnal BK', dataTour: 'view-jurnal-bk' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' },
      { id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }
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
  user: {
    role?: string;
    isWaliKelas?: boolean;
    is_kepala_sekolah?: boolean;
    isKepalaSekolah?: boolean;
    status_kepala_sekolah?: string;
    statusKepalaSekolah?: string;
    mata_pelajaran?: string;
    mataPelajaran?: string;
    isBk?: boolean;
  }
): { allowed: boolean; fallbackTab?: string; reason?: string } {
  const rawRole = (user?.role || '').toLowerCase();
  const normRole = rawRole.replace(/[\s_-]+/g, '');
  const isAdmin = normRole === 'admin' || normRole === 'superadmin';
  const isKepalaSekolah = normRole === 'kepalasekolah' || rawRole === 'kepala sekolah' || normRole === 'pltkepalasekolah' || normRole === 'plhkepalasekolah' || user?.is_kepala_sekolah === true || user?.isKepalaSekolah === true;
  const isDinas = normRole === 'dinaspendidikan' || rawRole === 'dinas pendidikan';
  const isWali = !!user?.isWaliKelas;
  const isSiswa = normRole === 'siswa';
  const isTataUsaha = normRole === 'tatausaha';
  const normMapel = (user?.mata_pelajaran || user?.mataPelajaran || '').toLowerCase();
  const isBk = user?.isBk === true ||
    normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling' ||
    normMapel.includes('bimbingan konseling') || normMapel.includes('bimbingan dan konseling') || normMapel.trim() === 'bk';

  const resolved = resolveCanonicalRoute(viewId, tabId);
  const effectiveView = resolved.canonicalView;
  const effectiveTab = resolved.defaultTab || tabId;

  // Strict isolation for Jurnal BK: confidential counseling records
  if (
    viewId === 'view-jurnal-bk' ||
    effectiveView === 'view-jurnal-bk' ||
    viewId === 'view-bk-jurnal' ||
    effectiveView === 'view-bk-jurnal'
  ) {
    if (!isBk && !isAdmin && !isKepalaSekolah) {
      return {
        allowed: false,
        fallbackTab: 'view-home',
        reason: 'Jurnal BK bersifat rahasia dan hanya dapat diakses oleh Guru BK, Administrator, dan Kepala Sekolah.'
      };
    }
    return { allowed: true };
  }

  // Strict isolation for Role BK: strictly restricted to 5 dedicated modules
  if (isBk) {
    const allowedBkViews = [
      'view-home',
      'view-guru-presensi',
      'view-jurnal-bk',
      'view-bk-jurnal',
      'view-informasi',
      'view-pengaturan-akun'
    ];
    if (allowedBkViews.includes(effectiveView) || allowedBkViews.includes(viewId)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      fallbackTab: 'view-home',
      reason: 'Role Guru BK tidak memiliki izin akses ke modul ini.'
    };
  }

  // Strict isolation for Siswa role: cannot access teacher/admin operational modules
  if (isSiswa && viewId !== 'view-ujian' && viewId !== 'view-informasi') {
    return { allowed: false, fallbackTab: 'view-ujian', reason: 'Role Siswa hanya memiliki akses ke modul Ujian dan Informasi.' };
  }

  // Strict isolation for Tata Usaha: strictly cannot access Bank Dokumen / Persuratan
  if (isTataUsaha && viewId === 'view-dokumen') {
    return { allowed: false, fallbackTab: 'view-guru-presensi', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' };
  }

  // Cluster 1: Jurnal Mengajar
  if (viewId === 'view-guru-jurnal' && tabId === 'supervisi-kelas') {
    if (!isWali && !isAdmin && !isKepalaSekolah && !isDinas) {
      const ksLabel = formatKepalaSekolahLabel(user?.status_kepala_sekolah || user?.statusKepalaSekolah);
      return { allowed: false, fallbackTab: 'input', reason: `Hanya Wali Kelas, Admin & ${ksLabel} yang dapat mengakses supervisi kelas.` };
    }
  }

  // Cluster 3: Asesmen & Rapor
  if (viewId === 'view-gradebook' && tabId === 'rapor') {
    if (!isWali && !isAdmin && !isTataUsaha) {
      return { allowed: false, fallbackTab: 'gradebook', reason: 'Halaman Rapor secara eksklusif hanya dapat diakses oleh Wali Kelas, Administrator, dan Tata Usaha.' };
    }
  }

  // Cluster 5: Master Data & Sistem

  if (isTataUsaha) {
    const allowedTuViews = [
      'view-guru-presensi',
      'view-guru-jurnal',
      'view-gradebook',
      'view-rapor',
      'view-informasi',
      'view-home',
      'view-pengaturan-akun'
    ];
    if (allowedTuViews.includes(effectiveView) || allowedTuViews.includes(viewId)) {
      return { allowed: true };
    }
    return { allowed: false, fallbackTab: 'view-guru-presensi', reason: 'Role Tata Usaha tidak memiliki izin akses ke modul ini.' };
  }
  if (
    effectiveView === 'view-admin-data' ||
    viewId === 'view-admin-data' ||
    viewId === 'view-sistem-blok' ||
    viewId === 'view-admin-pengguna' ||
    viewId === 'view-pengguna' ||
    viewId === 'view-admin-users' ||
    viewId === 'view-admin-kelas' ||
    viewId === 'view-kelas' ||
    (effectiveView === 'view-admin-data' && (
      effectiveTab === 'Pengguna' ||
      effectiveTab === 'users' ||
      effectiveTab === 'pengguna' ||
      effectiveTab === 'Data_Kelas' ||
      effectiveTab === 'data_kelas' ||
      effectiveTab === 'Kelas' ||
      effectiveTab === 'kelas'
    ))
  ) {
    if (!isAdmin) {
      return { allowed: false, fallbackTab: 'view-home', reason: 'Seluruh data master hanya dapat diakses dan diubah oleh Administrator.' };
    }
  }

  if ((effectiveView === 'view-admin-config' && (effectiveTab === 'backup' || tabId === 'backup')) || viewId === 'view-admin-backup') {
    if (!isAdmin) {
      return { allowed: false, fallbackTab: 'profil', reason: 'Hanya Admin yang dapat mengakses Cadangan Data.' };
    }
  }

  return { allowed: true };
}

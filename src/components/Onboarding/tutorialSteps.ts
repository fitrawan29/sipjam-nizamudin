export interface TourStep {
  id: string;
  targetTourId: string; // matches data-tour attribute (e.g. "hamburger-btn", "view-guru-presensi", etc.)
  targetSubTabId?: string; // matches sub-tab data-tour or id (e.g. "live", "riwayat", "rapor", "analitik")
  title: string;
  description: string;
  role: 'guru' | 'admin';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  requiresSidebarOpen?: boolean;
  subTabs?: string[];
  activeSubTab?: string;
}

export const STORAGE_KEY_GURU = 'sipjam_onboarding_guru_done';
export const STORAGE_KEY_ADMIN = 'sipjam_onboarding_admin_done';

export const GURU_STEPS: TourStep[] = [
  {
    id: 'guru-step-1-hamburger',
    targetTourId: 'hamburger-btn',
    title: 'Menu Navigasi',
    description: 'Gunakan tombol ini untuk membuka menu navigasi utama aplikasi kapan saja.',
    role: 'guru',
    placement: 'bottom',
    requiresSidebarOpen: false,
  },
  {
    id: 'guru-step-2-presensi',
    targetTourId: 'view-guru-presensi',
    targetSubTabId: 'live',
    title: 'Presensi Datang & Pulang',
    description: 'Catat presensi harian mandiri (Hadir di Sekolah / Dinas Luar) dengan kamera 4:3, validasi radius GPS, serta fitur tunda pengingat (30-min snooze). Sub-tab "Riwayat" terpadu memudahkan pengecekan log kehadiran dan status pengajuan izin tanpa berpindah menu.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Presensi Hari Ini', 'Riwayat Kehadiran & Status Izin'],
    activeSubTab: 'Presensi Hari Ini',
  },
  {
    id: 'guru-step-3-jurnal',
    targetTourId: 'view-guru-jurnal',
    targetSubTabId: 'input',
    title: 'Jurnal Pembelajaran',
    description: 'Isi catatan KBM harian, materi pokok, dan kehadiran siswa per jam mengajar dengan sinkronisasi gerbang dan deteksi otomatis siswa bolos. Sub-tab "Riwayat & Rekap Saya" memungkinkan cetak format 10 kolom bulanan langsung di satu tempat.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Input Jurnal KBM', 'Riwayat & Rekap Saya', 'Supervisi Kelas Binaan*'],
    activeSubTab: 'Input Jurnal KBM',
  },
  {
    id: 'guru-step-4-piket',
    targetTourId: 'view-piket',
    targetSubTabId: 'scan',
    title: 'Modul Piket',
    description: 'Laporkan piket harian, buku tamu, dan presensi gerbang dengan perlindungan concurrency lock untuk mencegah duplikasi data.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Presensi QR Gerbang', 'Buku Tamu', 'Laporan Piket'],
    activeSubTab: 'Presensi QR Gerbang',
  },
  {
    id: 'guru-step-5-ai-assistant',
    targetTourId: 'ai-assistant-btn',
    title: 'Asisten AI SIPJAM',
    description: 'Butuh bantuan mengenai menu atau alur sistem? Klik tombol asisten ini kapan saja.',
    role: 'guru',
    placement: 'top',
    requiresSidebarOpen: false,
  },
  {
    id: 'guru-step-6-rapor',
    targetTourId: 'view-rapor',
    targetSubTabId: 'rapor',
    title: 'Rapor Kurikulum Merdeka',
    description: 'Terintegrasi dalam modul Asesmen & Rapor. Akses khusus Wali Kelas untuk melihat rekap nilai semester, capaian pembelajaran (CP), kehadiran, dan cetak rapor resmi ber-GPS pada sub-tab Rapor.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Buku Nilai Mapel', 'Rapor Kelas Binaan (Wali Kelas)'],
    activeSubTab: 'Rapor Kelas Binaan (Wali Kelas)',
  },
];

export const ADMIN_STEPS: TourStep[] = [
  {
    id: 'admin-step-1-verif',
    targetTourId: 'view-admin-verif',
    targetSubTabId: 'presensi',
    title: 'Menu Verifikasi',
    description: 'Pusat persetujuan harian satu pintu untuk validasi presensi, surat izin, jurnal guru, dan telaah perangkat pembelajaran.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Izin & Presensi Guru', 'Jurnal KBM Guru', 'Laporan Petugas Piket', 'Perangkat Pembelajaran'],
    activeSubTab: 'Izin & Presensi Guru',
  },
  {
    id: 'admin-step-2-sistem-blok',
    targetTourId: 'view-sistem-blok',
    targetSubTabId: 'sistem_blok',
    title: 'Menu Sistem Blok',
    description: 'Terkonsolidasi di Master Data (sub-tab Periode Sistem Blok). Atur periode kegiatan khusus (Ujian, PTS, jeda) di mana KBM reguler dialihkan ke Jurnal Kegiatan.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Siswa', 'Guru', 'Mapel', 'Kalender', 'Jadwal', 'Periode Sistem Blok', 'Wali Kelas'],
    activeSubTab: 'Periode Sistem Blok',
  },
  {
    id: 'admin-step-3-master-data',
    targetTourId: 'view-admin-data',
    targetSubTabId: 'Data_Siswa',
    title: 'Menu Master Data',
    description: 'Kelola database pokok: data siswa, kenaikan kelas, data guru, mapel, jadwal KBM, dan kalender pendidikan terpadu.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Siswa & Rombel', 'Guru & Akun', 'Mata Pelajaran', 'Kalender Pendidikan', 'Jadwal Pelajaran', 'Sistem Blok', 'Wali Kelas'],
    activeSubTab: 'Siswa & Rombel',
  },
  {
    id: 'admin-step-4-analitik',
    targetTourId: 'view-analitik',
    targetSubTabId: 'analitik',
    title: 'Menu Analitik',
    description: 'Terkonsolidasi di modul Laporan & Analitik Kinerja. Pantau performa kedisiplinan guru, tren kehadiran, dan kepatuhan jurnal secara visual serta tabel rekapitulasi.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi', 'Cetak Dokumen Resmi'],
    activeSubTab: 'Analitik & Leaderboard',
  },
  {
    id: 'admin-step-5-sistem',
    targetTourId: 'view-admin-config',
    targetSubTabId: 'umum',
    title: 'Menu Sistem (Konfigurasi)',
    description: 'Pengaturan parameter sekolah: tahun ajaran aktif, jam kerja, koordinat GPS, radius geofence, dan pencadangan database terintegrasi spreadsheet.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
    subTabs: ['Umum & Kalender', 'Jam Kerja & GPS', 'KOP & Pejabat', 'Kebijakan Guru', 'Pencadangan Database'],
    activeSubTab: 'Umum & Kalender',
  },
  {
    id: 'admin-step-6-ai-assistant',
    targetTourId: 'ai-assistant-btn',
    title: 'Asisten AI SIPJAM',
    description: 'Akses panduan instan offline untuk membantu operasional administrasi sekolah.',
    role: 'admin',
    placement: 'top',
    requiresSidebarOpen: false,
  },
];

/**
 * Normalize role string to handle capitalization and spacing variations
 */
export function normalizeRole(role?: unknown): 'superadmin' | 'admin' | 'guru' | 'unknown' {
  if (!role || typeof role !== 'string') return 'unknown';
  const clean = role.toLowerCase().replace(/[\s_-]+/g, '');
  if (clean === 'superadmin') return 'superadmin';
  if (clean === 'admin') return 'admin';
  if (clean === 'guru' || clean === 'teacher') return 'guru';
  return 'unknown';
}

/**
 * Returns the relevant tour steps for a given user role.
 * Superadmin is exempt and receives an empty list.
 */
export function getStepsForRole(role?: string | null): TourStep[] {
  const norm = normalizeRole(role);
  if (norm === 'guru') return [...GURU_STEPS];
  if (norm === 'admin') return [...ADMIN_STEPS];
  return [];
}

/**
 * Check if the onboarding tutorial is completed for a role from localStorage
 */
export function isTutorialCompleted(role?: string | null): boolean {
  if (typeof window === 'undefined') return true;
  const norm = normalizeRole(role);
  if (norm === 'superadmin' || norm === 'unknown') return true;
  const key = norm === 'admin' ? STORAGE_KEY_ADMIN : STORAGE_KEY_GURU;
  return localStorage.getItem(key) === 'true';
}

/**
 * Check whether tutorial should be automatically displayed for the user
 */
export function shouldShowTutorial(role?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const norm = normalizeRole(role);
  if (norm === 'superadmin' || norm === 'unknown') return false;
  return !isTutorialCompleted(role);
}

/**
 * Set the tutorial completion flag in localStorage
 */
export function setTutorialCompleted(role?: string | null): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeRole(role);
  if (norm === 'admin') {
    localStorage.setItem(STORAGE_KEY_ADMIN, 'true');
  } else if (norm === 'guru') {
    localStorage.setItem(STORAGE_KEY_GURU, 'true');
  }
}

/**
 * Reset tutorial state in localStorage (e.g. for "Lihat Tutorial Lagi")
 */
export function resetTutorial(role?: string | null): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeRole(role);
  if (norm === 'admin') {
    localStorage.removeItem(STORAGE_KEY_ADMIN);
  } else if (norm === 'guru') {
    localStorage.removeItem(STORAGE_KEY_GURU);
  }
}

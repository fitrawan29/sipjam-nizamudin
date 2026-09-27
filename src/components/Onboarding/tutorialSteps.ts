export interface TourStep {
  id: string;
  targetTourId: string; // matches data-tour attribute (e.g. "hamburger-btn", "view-guru-presensi", etc.)
  title: string;
  description: string;
  role: 'guru' | 'admin';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  requiresSidebarOpen?: boolean;
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
    title: 'Presensi Datang & Pulang',
    description: 'Catat presensi harian mandiri dengan foto swafoto dan validasi radius lokasi sekolah.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'guru-step-3-jurnal',
    targetTourId: 'view-guru-jurnal',
    title: 'Jurnal Pembelajaran',
    description: 'Isi catatan KBM harian, materi pokok, dan kehadiran siswa per jam mengajar.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'guru-step-4-piket',
    targetTourId: 'view-piket',
    title: 'Modul Piket',
    description: 'Laporkan piket harian, buku tamu, dan ketertiban sekolah bagi guru bertugas.',
    role: 'guru',
    placement: 'right',
    requiresSidebarOpen: true,
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
];

export const ADMIN_STEPS: TourStep[] = [
  {
    id: 'admin-step-1-verif',
    targetTourId: 'view-admin-verif',
    title: 'Menu Verifikasi',
    description: 'Pusat persetujuan harian untuk validasi presensi, surat izin, dan jurnal guru.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'admin-step-2-sistem-blok',
    targetTourId: 'view-sistem-blok',
    title: 'Menu Sistem Blok',
    description: 'Atur periode kegiatan khusus (Ujian, PTS, jeda) di mana KBM reguler dialihkan ke Jurnal Kegiatan.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'admin-step-3-master-data',
    targetTourId: 'view-admin-data',
    title: 'Menu Master Data',
    description: 'Kelola database pokok: data siswa, kenaikan kelas, data guru, mapel, dan jadwal KBM.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'admin-step-4-analitik',
    targetTourId: 'view-analitik',
    title: 'Menu Analitik',
    description: 'Pantau performa kedisiplinan guru, tren kehadiran, dan kepatuhan jurnal secara visual.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'admin-step-5-sistem',
    targetTourId: 'view-admin-config',
    title: 'Menu Sistem (Konfigurasi)',
    description: 'Pengaturan parameter sekolah: tahun ajaran aktif, jam kerja, koordinat GPS, dan radius.',
    role: 'admin',
    placement: 'right',
    requiresSidebarOpen: true,
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
export function normalizeRole(role?: string | null): 'superadmin' | 'admin' | 'guru' | 'unknown' {
  if (!role) return 'unknown';
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

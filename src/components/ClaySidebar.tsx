'use client';

import React, { useEffect } from 'react';
import { renderUserAvatar } from '@/lib/avatars';
import { AppUser } from '@/types/user';
import ClayCard from './ClayCard';
import { formatKepalaSekolahLabel } from '@/utils/textUtils';

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: string | number;
  badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
  dataTour?: string;
  subItems?: MenuItem[];
}

export interface ClaySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  currentView: string;
  currentTab?: string;
  onNavigate: (viewId: string) => void;
  menuItems: MenuItem[];
  isSuperadmin?: boolean;
  isDinas?: boolean;
  isAdmin?: boolean;
  isTataUsaha?: boolean;
  isKepalaSekolah?: boolean;
  statusKepalaSekolah?: string;
  isWaliKelas?: boolean;
  satelliteSchools?: any[];
  activeTargetSchool?: any;
  onTargetSchoolChange?: (schoolId: string) => void;
  onOpenAccountSettings?: () => void;
  onOpenTutorial?: () => void;
  onOpenInteractiveTour?: () => void;
  showAiAssistant?: boolean;
  onToggleAiAssistant?: () => void;
  schoolName?: string;
}

export const ClaySidebar: React.FC<ClaySidebarProps> = ({
  isOpen,
  onClose,
  user,
  currentView,
  currentTab,
  onNavigate,
  menuItems,
  isSuperadmin = false,
  isDinas = false,
  isAdmin = false,
  isTataUsaha = false,
  isKepalaSekolah = false,
  statusKepalaSekolah = 'Definitif',
  isWaliKelas = false,
  satelliteSchools = [],
  activeTargetSchool = null,
  onTargetSchoolChange,
  onOpenAccountSettings,
  onOpenTutorial,
  onOpenInteractiveTour,
  showAiAssistant,
  onToggleAiAssistant,
  schoolName = 'SIPJAM',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isTU = isTataUsaha || normRole === 'tatausaha';
  const isOrtu = normRole === 'orangtua' || normRole === 'walimurid';
  const isSiswa = normRole === 'siswa';
  const isBkRole =
    normRole === 'bk' ||
    normRole === 'gurubk' ||
    normRole === 'bimbingankonseling' ||
    normRole === 'bimbingandankonseling' ||
    (user?.mata_pelajaran || user?.mataPelajaran || '').toLowerCase().includes('bimbingan konseling') ||
    (user?.mata_pelajaran || user?.mataPelajaran || '').toLowerCase().includes('bimbingan dan konseling') ||
    (user?.mata_pelajaran || user?.mataPelajaran || '').toLowerCase().trim() === 'bk';

  const roleBadgeStyle = isSuperadmin
    ? 'neu-inset text-amber-800 dark:text-amber-300'
    : isDinas
    ? 'neu-inset text-sky-800 dark:text-sky-300'
    : isAdmin
    ? 'neu-inset text-blue-800 dark:text-blue-300'
    : isTU
    ? 'neu-inset text-teal-800 dark:text-teal-300'
    : isOrtu
    ? 'neu-inset text-sky-800 dark:text-sky-300'
    : isSiswa
    ? 'neu-inset text-[#0F766E] dark:text-teal-300'
    : isBkRole
    ? 'neu-inset text-rose-800 dark:text-rose-300'
    : isKepalaSekolah
    ? 'neu-inset text-amber-900 dark:text-amber-300'
    : isWaliKelas
    ? 'neu-inset text-teal-800 dark:text-teal-300'
    : 'neu-inset text-[#0F766E] dark:text-teal-300';

  const roleLabel = isSuperadmin
    ? 'Superadmin'
    : isDinas
    ? 'Dinas Pendidikan'
    : isAdmin
    ? 'Administrator'
    : isTU
    ? 'Tata Usaha'
    : isOrtu
    ? 'Orang Tua'
    : isSiswa
    ? 'Siswa'
    : isBkRole
    ? 'Guru BK'
    : isKepalaSekolah
    ? formatKepalaSekolahLabel(statusKepalaSekolah)
    : isWaliKelas
    ? 'Guru (Wali Kelas)'
    : 'Guru';

  const roleIcon = isSuperadmin
    ? 'fa-crown'
    : isDinas
    ? 'fa-building-columns'
    : isAdmin
    ? 'fa-user-shield'
    : isTU
    ? 'fa-id-card-clip'
    : isOrtu
    ? 'fa-people-roof'
    : isSiswa
    ? 'fa-user-graduate'
    : isBkRole
    ? 'fa-heart-pulse'
    : isKepalaSekolah
    ? 'fa-user-tie'
    : 'fa-chalkboard-user';

  const availableSchools = isDinas
    ? satelliteSchools.filter((s) => {
        const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
        const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
        return userRegion && schoolRegion && userRegion === schoolRegion;
      })
    : satelliteSchools;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu Navigasi"
      className="fixed inset-0 bg-slate-900/45 dark:bg-black/65 z-50 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-80 max-w-[88%] h-full bg-[#E6ECF2] dark:bg-[#1F242D] border-r border-white/55 dark:border-white/5 shadow-[12px_0_28px_rgba(163,177,198,0.55)] dark:shadow-[12px_0_30px_rgba(0,0,0,0.72)] p-4 sm:p-5 flex flex-col justify-between transform transition-transform duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 mb-3 border-b border-slate-300/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center text-white shadow-[3px_3px_8px_rgba(15,118,110,0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.6)] border border-white/25 font-bold shrink-0">
                <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isDinas ? 'fa-building-columns' : 'fa-graduation-cap'} text-sm`}></i>
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm text-[#0F172A] dark:text-[#F1F5F9] tracking-tight block truncate">
                  {isSuperadmin ? 'Portal Superadmin' : isDinas ? 'Dinas Pendidikan' : 'SIPJAM Menu'}
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-none mt-0.5 truncate max-w-[170px]">
                  {isDinas ? (user?.kota_kabupaten ? `Wilayah: ${user.kota_kabupaten}` : 'Pengawas Wilayah') : schoolName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="clay-btn w-11 h-11 rounded-full flex items-center justify-center text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white shrink-0"
              title="Tutup Menu"
              aria-label="Tutup Menu"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {/* User Identity Card with soft neumorphic aesthetic */}
          <ClayCard variant="mint" rounded="2xl" className="mb-3 p-3 flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full neu-inset p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
              {renderUserAvatar(user?.avatar, 'w-10 h-10')}
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-teal-500 border-2 border-[#E6ECF2] dark:border-[#1F242D]"
                title="Aktif"
              ></span>
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] truncate leading-tight"
                title={user?.nama || 'Pengguna SIPJAM'}
              >
                {user?.nama || 'Pengguna SIPJAM'}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${roleBadgeStyle}`}
                >
                  <i className={`fa-solid ${roleIcon} text-[8px]`}></i>
                  {roleLabel}
                </span>
                {(user?.username || user?.nip) && (
                  <span
                    className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-[85px]"
                    title={user?.username || user?.nip}
                  >
                    {user?.username || user?.nip}
                  </span>
                )}
              </div>
              {isDinas && user?.kota_kabupaten && (
                <div className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold truncate mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-map-location-dot text-[9px] text-[#0F766E] dark:text-teal-400"></i>
                  <span>Wilayah: {user.kota_kabupaten}</span>
                </div>
              )}
            </div>
          </ClayCard>

          {/* Superadmin & Dinas Multi-Tenant Selector */}
          {(isSuperadmin || isDinas) && onTargetSchoolChange && (
            <div className="mb-3 p-2.5 rounded-2xl neu-inset">
              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <i className="fa-solid fa-satellite-dish text-[#0F766E] dark:text-teal-400"></i> {isDinas ? 'Sekolah Binaan:' : 'Sekolah yang Dipantau:'}
              </div>
              <select
                aria-label="Ganti Sekolah yang Dipantau di Sidebar"
                value={activeTargetSchool?.id || ''}
                onChange={(e) => onTargetSchoolChange(e.target.value)}
                className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl neu-input cursor-pointer"
              >
                <option value="">{isDinas ? '🌐 Ringkasan Wilayah' : '🌐 Master Platform (Semua)'}</option>
                {availableSchools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    🏫 {sch.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Links with Neumorphism */}
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto px-2 py-2 custom-scroll">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <React.Fragment key={item.id}>
                  {/* AST preservation: data-tour={item.id} */}
                  <button
                    key={item.id}
                    data-tour={item.dataTour || item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'view-pengaturan-akun') {
                        onClose();
                        if (onOpenAccountSettings) onOpenAccountSettings();
                      } else {
                        onNavigate(item.id);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 min-h-[44px] text-xs font-bold rounded-2xl flex items-center justify-between gap-2.5 transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-teal-400 ${
                      isActive
                        ? 'neu-inset text-[#0F766E] dark:text-teal-300 ring-1 ring-[#0F766E]/35 dark:ring-teal-400/35'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#0F766E] text-white dark:bg-teal-500 dark:text-slate-950 shadow-xs'
                            : 'neu-card-sm text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <i className={`fa-solid ${item.icon} text-xs`}></i>
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && item.badge !== '' && (
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 neu-inset ${
                        item.badgeVariant === 'rose'
                          ? 'text-rose-700 dark:text-rose-300'
                          : item.badgeVariant === 'amber'
                          ? 'text-amber-700 dark:text-amber-300'
                          : item.badgeVariant === 'blue'
                          ? 'text-sky-700 dark:text-sky-300'
                          : 'text-[#0F766E] dark:text-teal-300'
                      }`}>
                        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>

                </React.Fragment>
              );
            })}


            {/* Quick Actions in Sidebar */}
            {!isTU && !isBkRole && !isOrtu && !isSiswa && onOpenAccountSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccountSettings();
                }}
                className="w-full text-left px-3.5 py-2.5 min-h-[44px] text-xs font-bold rounded-2xl flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-teal-400"
              >
                <div className="w-7 h-7 rounded-xl neu-card-sm flex items-center justify-center text-sky-700 dark:text-sky-300">
                  <i className="fa-solid fa-user-gear text-xs"></i>
                </div>
                <span>Pengaturan Akun</span>
              </button>
            )}

            {!isTU && onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTutorial();
                }}
                className="clay-btn clay-btn-mint w-full justify-start gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold mt-2 mb-1"
                title="Buka panduan & tutorial lengkap seluruh menu"
              >
                <div className="w-7 h-7 rounded-xl neu-inset flex items-center justify-center text-[#0F766E] dark:text-teal-300">
                  <i className="fa-solid fa-book-bookmark text-xs"></i>
                </div>
                <span>Panduan & Tutorial Lengkap</span>
              </button>
            )}

            {!isSuperadmin && !isTU && onOpenInteractiveTour && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInteractiveTour();
                }}
                className="clay-btn clay-btn-amber w-full justify-start gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold mt-1 mb-2"
                title="Buka kembali panduan tutorial interaktif"
              >
                <div className="w-7 h-7 rounded-xl neu-inset flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <i className="fa-solid fa-graduation-cap text-xs"></i>
                </div>
                <span>Lihat Tutorial Lagi</span>
              </button>
            )}

            {onToggleAiAssistant && (
              <button
                type="button"
                onClick={() => {
                  onToggleAiAssistant();
                }}
                className="clay-btn clay-btn-secondary w-full justify-start gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold mt-1 mb-1"
                title={showAiAssistant ? 'Sembunyikan tombol asisten AI di layar' : 'Tampilkan tombol asisten AI di layar'}
              >
                <div className="w-7 h-7 rounded-xl neu-inset flex items-center justify-center text-[#0F766E] dark:text-teal-300">
                  <i className={`fa-solid ${showAiAssistant ? 'fa-eye-slash' : 'fa-robot'} text-xs`}></i>
                </div>
                <span>{showAiAssistant ? 'Sembunyikan Tombol AI' : 'Tampilkan Tombol AI'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaySidebar;

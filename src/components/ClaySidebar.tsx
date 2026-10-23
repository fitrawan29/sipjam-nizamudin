'use client';

import React from 'react';
import { renderUserAvatar } from '@/lib/avatars';
import { AppUser } from '@/types/user';
import ClayCard from './ClayCard';

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
}

export interface ClaySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  currentView: string;
  onNavigate: (viewId: string) => void;
  menuItems: MenuItem[];
  isSuperadmin?: boolean;
  isDinas?: boolean;
  isAdmin?: boolean;
  isKepalaSekolah?: boolean;
  isWaliKelas?: boolean;
  satelliteSchools?: any[];
  activeTargetSchool?: any;
  onTargetSchoolChange?: (schoolId: string) => void;
  onOpenAccountSettings?: () => void;
  onOpenTutorial?: () => void;
  onOpenInteractiveTour?: () => void;
  schoolName?: string;
}

export const ClaySidebar: React.FC<ClaySidebarProps> = ({
  isOpen,
  onClose,
  user,
  currentView,
  onNavigate,
  menuItems,
  isSuperadmin = false,
  isDinas = false,
  isAdmin = false,
  isKepalaSekolah = false,
  isWaliKelas = false,
  satelliteSchools = [],
  activeTargetSchool = null,
  onTargetSchoolChange,
  onOpenAccountSettings,
  onOpenTutorial,
  onOpenInteractiveTour,
  schoolName = 'SIPJAM',
}) => {
  if (!isOpen) return null;

  const roleBadgeStyle = isSuperadmin
    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300/60'
    : isDinas
    ? 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-indigo-900/50 dark:text-indigo-300 border border-[#C4B5FD] dark:border-indigo-700/60'
    : isAdmin
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300/60'
    : isKepalaSekolah
    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300/60'
    : isWaliKelas
    ? 'bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-300 border border-teal-300/60'
    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300/60';

  const roleLabel = isSuperadmin
    ? 'Superadmin'
    : isDinas
    ? 'Dinas Pendidikan'
    : isAdmin
    ? 'Administrator'
    : isKepalaSekolah
    ? 'Kepala Sekolah'
    : isWaliKelas
    ? 'Guru (Wali Kelas)'
    : 'Guru';

  const roleIcon = isSuperadmin
    ? 'fa-crown'
    : isDinas
    ? 'fa-building-columns'
    : isAdmin
    ? 'fa-user-shield'
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
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-80 max-w-[88%] h-full bg-[#FAF7F2] dark:bg-[#1C1C20] border-r-2 border-white/80 dark:border-white/10 shadow-[12px_0_30px_rgba(180,160,140,0.35)] dark:shadow-[12px_0_30px_rgba(0,0,0,0.6)] p-5 flex flex-col justify-between transform transition-transform duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 mb-3 border-b-2 border-amber-900/5 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0B4619] to-[#156E2A] flex items-center justify-center text-amber-300 shadow-[2px_2px_6px_rgba(11,70,25,0.35),inset_1px_1px_2px_rgba(255,255,255,0.4)] border border-white/30 font-bold">
                <i className={`fa-solid ${isSuperadmin ? 'fa-crown' : isDinas ? 'fa-building-columns' : 'fa-mosque'} text-sm`}></i>
              </div>
              <div>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">
                  {isSuperadmin ? 'Portal Superadmin' : isDinas ? 'Dinas Pendidikan' : 'SIPJAM Menu'}
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none mt-0.5 truncate max-w-[170px]">
                  {isDinas ? (user?.kota_kabupaten ? `Wilayah: ${user.kota_kabupaten}` : 'Pengawas Wilayah') : schoolName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="clay-btn w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              title="Tutup Menu"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          {/* User Identity Card with soft clay aesthetic */}
          <ClayCard variant="mint" rounded="2xl" className="mb-3 p-3 flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full bg-white dark:bg-gray-700 p-0.5 shadow-xs shrink-0 overflow-hidden border-2 border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center">
              {renderUserAvatar(user?.avatar, 'w-10 h-10')}
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800"
                title="Aktif"
              ></span>
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate leading-tight"
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
                    className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[85px]"
                    title={user?.username || user?.nip}
                  >
                    {user?.username || user?.nip}
                  </span>
                )}
              </div>
              {isDinas && user?.kota_kabupaten && (
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold truncate mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-map-location-dot text-[9px] text-indigo-600 dark:text-indigo-400"></i>
                  <span>Wilayah: {user.kota_kabupaten}</span>
                </div>
              )}
            </div>
          </ClayCard>

          {/* Superadmin & Dinas Multi-Tenant Selector */}
          {(isSuperadmin || isDinas) && onTargetSchoolChange && (
            <div className="mb-3 p-2.5 rounded-2xl bg-amber-50/70 dark:bg-gray-800/60 border-2 border-amber-200/60 dark:border-amber-800/40 shadow-[inset_1px_1px_3px_rgba(200,180,150,0.2)]">
              <div className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <i className="fa-solid fa-satellite-dish text-emerald-600"></i> {isDinas ? 'Sekolah Binaan:' : 'Sekolah yang Dipantau:'}
              </div>
              <select
                aria-label="Ganti Sekolah yang Dipantau di Sidebar"
                value={activeTargetSchool?.id || ''}
                onChange={(e) => onTargetSchoolChange(e.target.value)}
                className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-gray-700 text-gray-900 dark:text-white cursor-pointer shadow-xs focus:outline-none"
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

          {/* Navigation Links with Claymorphism */}
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 custom-scroll">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  data-tour={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2.5 transition-all duration-200 select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-950 dark:from-emerald-900/40 dark:to-green-900/30 dark:text-amber-300 border-2 border-white dark:border-emerald-700/50 shadow-[3px_3px_8px_rgba(180,210,190,0.5),inset_1px_1px_2px_rgba(255,255,255,0.9)] transform translate-x-1'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xs border-2 border-transparent'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} text-xs`}></i>
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Quick Actions in Sidebar */}
            {onOpenAccountSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccountSettings();
                }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-2xl flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-800/80 border-2 border-transparent transition-all"
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <i className="fa-solid fa-user-gear text-xs"></i>
                </div>
                <span>Pengaturan Akun</span>
              </button>
            )}

            {onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTutorial();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/90 transition-all border-2 border-emerald-200/60 dark:border-emerald-800/60 mt-2 mb-1 shadow-xs cursor-pointer"
                title="Buka panduan & tutorial lengkap seluruh menu"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-200/70 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-800 dark:text-emerald-200">
                  <i className="fa-solid fa-book-bookmark text-xs"></i>
                </div>
                <span>Panduan & Tutorial Lengkap</span>
              </button>
            )}

            {!isSuperadmin && onOpenInteractiveTour && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInteractiveTour();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-100/60 transition-all border-2 border-amber-200/70 dark:border-amber-800/40 mt-1 mb-2 shadow-xs cursor-pointer"
                title="Buka kembali panduan tutorial interaktif"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-200/70 dark:bg-amber-900/40 flex items-center justify-center text-amber-800 dark:text-amber-300">
                  <i className="fa-solid fa-graduation-cap text-xs"></i>
                </div>
                <span>Lihat Tutorial Lagi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaySidebar;

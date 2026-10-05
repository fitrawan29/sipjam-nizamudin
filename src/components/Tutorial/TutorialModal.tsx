'use client';

import { useState, useMemo, useEffect } from 'react';
import { TUTORIAL_DATA, TutorialItem } from './tutorialData';

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
  currentRole?: string;
}

type RoleTab = 'semua' | 'guru' | 'admin' | 'superadmin';

export default function TutorialModal({
  isOpen,
  onClose,
  onNavigate,
  currentRole = 'guru'
}: TutorialModalProps) {
  // Normalize initial tab from user role
  const initialTab = useMemo<RoleTab>(() => {
    const r = (currentRole || '').toLowerCase().replace(/\s+/g, '');
    if (r.includes('superadmin')) return 'superadmin';
    if (r.includes('admin')) return 'admin';
    return 'guru';
  }, [currentRole]);

  const [activeTab, setActiveTab] = useState<RoleTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Reset tab when modal opens or currentRole changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredItems.forEach(item => {
      allExpanded[item.id] = true;
    });
    setExpandedItems(allExpanded);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  // Filter items based on activeTab and searchQuery
  const filteredItems = useMemo(() => {
    let items = TUTORIAL_DATA;

    if (activeTab !== 'semua') {
      items = items.filter(item => item.role === activeTab || item.role === 'all');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.steps.some(s => s.toLowerCase().includes(q)) ||
          item.keyTips.some(k => k.toLowerCase().includes(q)) ||
          (item.prerequisites && item.prerequisites.toLowerCase().includes(q))
        );
      });
    }

    return items;
  }, [activeTab, searchQuery]);

  if (!isOpen) return null;

  const handleOpenMenu = (viewId: string) => {
    onClose();
    onNavigate(viewId);
  };

  const getRoleBadge = (role: TutorialItem['role']) => {
    switch (role) {
      case 'superadmin':
        return {
          label: 'Superadmin',
          classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40',
          icon: 'fa-crown'
        };
      case 'admin':
        return {
          label: 'Admin',
          classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40',
          icon: 'fa-user-shield'
        };
      case 'guru':
        return {
          label: 'Guru',
          classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40',
          icon: 'fa-chalkboard-user'
        };
      default:
        return {
          label: 'Semua Role',
          classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
          icon: 'fa-users'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50/80 via-white to-green-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/60 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <i className="fa-solid fa-book-bookmark text-lg"></i>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Panduan & Tutorial Lengkap SIPJAM
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Panduan operasional seluruh menu & fitur untuk Guru, Admin, dan Superadmin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
              title="Tutup panduan (Esc)"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {/* Search Input */}
          <div className="mt-4 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari tutorial menu, langkah, fitur (cth: QR piket, sistem blok, nilai, guru inval)..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-1 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scroll">
              <button
                type="button"
                onClick={() => setActiveTab('semua')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'semua'
                    ? 'bg-gray-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-list-check text-[11px]"></i>
                Semua Menu ({TUTORIAL_DATA.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guru')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'guru'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/40'
                }`}
              >
                <i className="fa-solid fa-chalkboard-user text-[11px]"></i>
                Guru (11)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-800/40'
                }`}
              >
                <i className="fa-solid fa-user-shield text-[11px]"></i>
                Admin (14)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('superadmin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'superadmin'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/50 dark:border-purple-800/40'
                }`}
              >
                <i className="fa-solid fa-crown text-[11px]"></i>
                Superadmin (3)
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 px-1 py-0.5 font-medium transition-colors"
              >
                Buka Semua
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 px-1 py-0.5 font-medium transition-colors"
              >
                Tutup Semua
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - List of Tutorial Accordions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scroll bg-gray-50/50 dark:bg-gray-950/50">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center text-lg mb-3">
                <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                Tidak ada panduan ditemukan
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Kata kunci &quot;{searchQuery}&quot; tidak cocok dengan panduan di tab {activeTab}. Coba gunakan kata kunci lain atau pilih tab &quot;Semua Menu&quot;.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isExpanded = expandedItems[item.id] || (searchQuery.trim().length > 0);
              const badge = getRoleBadge(item.role);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                            {idx + 1}. {item.title}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.classes}`}>
                            <i className={`fa-solid ${badge.icon} text-[8px]`}></i>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {item.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenMenu(item.viewId);
                        }}
                        className="btn-click hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors"
                        title={`Buka menu ${item.title}`}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        <span>Buka</span>
                      </button>
                      <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform">
                        <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                      </span>
                    </div>
                  </div>

                  {/* Card Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-850/40 space-y-3.5 animate-in fade-in duration-150">
                      {/* Prerequisites if any */}
                      {item.prerequisites && (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                          <i className="fa-solid fa-circle-exclamation text-amber-500 mt-0.5 shrink-0"></i>
                          <div>
                            <span className="font-bold">Syarat Akses: </span>
                            {item.prerequisites}
                          </div>
                        </div>
                      )}

                      {/* Operational Steps */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                          <i className="fa-solid fa-list-ol text-emerald-600 dark:text-emerald-400"></i>
                          Langkah Operasional
                        </h5>
                        <ol className="space-y-1.5 pl-5 list-decimal text-xs text-gray-700 dark:text-gray-300 leading-relaxed marker:font-bold marker:text-emerald-600 dark:marker:text-emerald-400">
                          {item.steps.map((step, sIdx) => (
                            <li key={sIdx} className="pl-1">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Key Tips */}
                      {item.keyTips.length > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <i className="fa-solid fa-lightbulb text-amber-500"></i>
                            Tips & Catatan Kunci
                          </h5>
                          <ul className="space-y-1 text-xs text-emerald-900/90 dark:text-emerald-200/90 pl-4 list-disc">
                            {item.keyTips.map((tip, tIdx) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Bottom Direct Action Button */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenMenu(item.viewId)}
                          className="btn-click inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                          <span>Buka Menu {item.title}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 shrink-0 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-emerald-500"></i>
            <span>
              Menampilkan <span className="font-bold text-gray-900 dark:text-white">{filteredItems.length}</span> dari {TUTORIAL_DATA.length} menu
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

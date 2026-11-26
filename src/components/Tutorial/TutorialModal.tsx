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
          classes: 'neu-inset text-amber-800 dark:text-amber-300',
          icon: 'fa-crown'
        };
      case 'admin':
        return {
          label: 'Admin',
          classes: 'neu-inset text-sky-800 dark:text-sky-300',
          icon: 'fa-user-shield'
        };
      case 'guru':
        return {
          label: 'Guru',
          classes: 'neu-inset text-[#0F766E] dark:text-teal-300',
          icon: 'fa-chalkboard-user'
        };
      default:
        return {
          label: 'Semua Role',
          classes: 'neu-inset text-slate-700 dark:text-slate-300',
          icon: 'fa-users'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 dark:bg-black/65 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div 
        className="neu-card w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-300/60 dark:border-slate-700/60 bg-[#E6ECF2] dark:bg-[#1F242D] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center text-white shadow-sm">
                <i className="fa-solid fa-book-bookmark text-lg"></i>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  Panduan &amp; Tutorial Lengkap SIPJAM
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Panduan operasional seluruh menu &amp; fitur untuk Guru, Admin, dan Superadmin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="neu-btn w-9 h-9 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
              title="Tutup panduan (Esc)"
              aria-label="Tutup panduan"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          {/* Search Input */}
          <div className="mt-4 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs z-30"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari tutorial menu, langkah, fitur (cth: QR piket, sistem blok, nilai, guru inval)..."
              className="neu-input w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs cursor-pointer"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center justify-between gap-2 mt-3.5 pt-1 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 custom-scroll">
              <button
                type="button"
                onClick={() => setActiveTab('semua')}
                className={`neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'semua'
                    ? 'neu-tab-active text-[#0F766E] dark:text-teal-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <i className="fa-solid fa-list-check text-[11px]"></i>
                Semua Menu ({TUTORIAL_DATA.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guru')}
                className={`neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'guru'
                    ? 'neu-tab-active text-[#0F766E] dark:text-teal-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <i className="fa-solid fa-chalkboard-user text-[11px]"></i>
                Guru (11)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'admin'
                    ? 'neu-tab-active text-sky-700 dark:text-sky-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <i className="fa-solid fa-user-shield text-[11px]"></i>
                Admin (14)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('superadmin')}
                className={`neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'superadmin'
                    ? 'neu-tab-active text-amber-700 dark:text-amber-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <i className="fa-solid fa-crown text-[11px]"></i>
                Superadmin (3)
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-[#0F766E] dark:hover:text-teal-300 px-1.5 py-0.5 font-semibold transition-colors cursor-pointer"
              >
                Buka Semua
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-[#0F766E] dark:hover:text-teal-300 px-1.5 py-0.5 font-semibold transition-colors cursor-pointer"
              >
                Tutup Semua
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - List of Tutorial Accordions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scroll bg-[#E6ECF2] dark:bg-[#1F242D]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="neu-inset w-12 h-12 mx-auto rounded-full text-slate-500 flex items-center justify-center text-lg mb-3">
                <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                Tidak ada panduan ditemukan
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
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
                  className="neu-card-sm rounded-2xl overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-white/25 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className="neu-inset w-9 h-9 rounded-xl text-[#0F766E] dark:text-teal-400 flex items-center justify-center shrink-0">
                        <i className={`fa-solid ${item.icon} text-sm`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                            {idx + 1}. {item.title}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.classes}`}>
                            <i className={`fa-solid ${badge.icon} text-[8px]`}></i>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
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
                        className="neu-btn neu-btn-mint hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] rounded-xl text-xs font-bold"
                        title={`Buka menu ${item.title}`}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        <span>Buka</span>
                      </button>
                      <span className="neu-inset w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                      </span>
                    </div>
                  </div>

                  {/* Card Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 border-t border-slate-300/60 dark:border-slate-700/60 space-y-3.5 animate-in fade-in duration-150">
                      {/* Prerequisites if any */}
                      {item.prerequisites && (
                        <div className="neu-inset p-3 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                          <i className="fa-solid fa-circle-exclamation text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"></i>
                          <div>
                            <span className="font-bold">Syarat Akses: </span>
                            {item.prerequisites}
                          </div>
                        </div>
                      )}

                      {/* Operational Steps */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                          <i className="fa-solid fa-list-ol text-[#0F766E] dark:text-teal-400"></i>
                          Langkah Operasional
                        </h5>
                        <ol className="space-y-1.5 pl-5 list-decimal text-xs text-slate-700 dark:text-slate-300 leading-relaxed marker:font-bold marker:text-[#0F766E] dark:marker:text-teal-400">
                          {item.steps.map((step, sIdx) => (
                            <li key={sIdx} className="pl-1">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Key Tips */}
                      {item.keyTips.length > 0 && (
                        <div className="neu-inset p-3 rounded-xl space-y-1">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] dark:text-teal-300 flex items-center gap-1.5">
                            <i className="fa-solid fa-lightbulb text-amber-500"></i>
                            Tips &amp; Catatan Kunci
                          </h5>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200 pl-4 list-disc">
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
                          className="neu-btn neu-btn-primary inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold"
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
        <div className="p-3 sm:p-4 border-t border-slate-300/60 dark:border-slate-700/60 bg-[#E6ECF2] dark:bg-[#1F242D] flex items-center justify-between gap-3 shrink-0 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-[#0F766E] dark:text-teal-400"></i>
            <span>
              Menampilkan <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9] font-num">{filteredItems.length}</span> dari {TUTORIAL_DATA.length} menu
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neu-btn neu-btn-secondary px-4 py-1.5 min-h-[38px] rounded-xl font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

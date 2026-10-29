'use client';

import React, { useRef, useEffect } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: string | React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
  disabled?: boolean;
  dataTour?: string;
  'data-tour'?: string;
  tooltip?: string;
}

export type ClayTabsVariant = 'mint' | 'primary' | 'secondary';
export type ClayTabsSize = 'sm' | 'md' | 'lg';

export interface ClayTabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
  variant?: ClayTabsVariant;
  size?: ClayTabsSize;
  idPrefix?: string;
  panelIdPrefix?: string;
  borderBottom?: boolean;
}

/**
 * Helper untuk menghitung tab berikutnya berdasarkan navigasi keyboard (WAI-ARIA).
 * Mendukung ArrowRight, ArrowDown, ArrowLeft, ArrowUp, Home, End dengan melompati tab disabled.
 */
export function getNextTabId(items: TabItem[], currentId: string, key: string): string | null {
  const enabledItems = items.filter(item => !item.disabled);
  if (enabledItems.length <= 1) return null;

  const currentIndex = enabledItems.findIndex(item => item.id === currentId);
  if (currentIndex === -1) {
    return enabledItems[0]?.id || null;
  }

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return enabledItems[(currentIndex + 1) % enabledItems.length].id;
    case 'ArrowLeft':
    case 'ArrowUp':
      return enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length].id;
    case 'Home':
      return enabledItems[0].id;
    case 'End':
      return enabledItems[enabledItems.length - 1].id;
    default:
      return null;
  }
}

/**
 * Helper styling badge angka berdasarkan status aktif dan varian warna
 */
function getBadgeClasses(variant: 'mint' | 'amber' | 'rose' | 'blue' = 'mint', isActive: boolean): string {
  if (isActive) {
    switch (variant) {
      case 'amber':
        return 'bg-amber-500 text-white dark:bg-amber-400 dark:text-gray-950';
      case 'rose':
        return 'bg-rose-600 text-white dark:bg-rose-400 dark:text-gray-950';
      case 'blue':
        return 'bg-blue-600 text-white dark:bg-blue-400 dark:text-gray-950';
      case 'mint':
      default:
        return 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950';
    }
  }

  switch (variant) {
    case 'amber':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';
    case 'rose':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300';
    case 'blue':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300';
    case 'mint':
    default:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';
  }
}

/**
 * Reusable ClayTabs Component
 * Komponen sub-tab taktil claymorphism standar untuk konsolidasi antarmuka SIPJAM.
 */
export const ClayTabs: React.FC<ClayTabsProps> = ({
  items,
  activeTab,
  onTabChange,
  className = '',
  ariaLabel = 'Sub Navigasi Modul',
  variant = 'mint',
  size = 'md',
  idPrefix = 'tab-',
  panelIdPrefix = 'panel-',
  borderBottom = true,
}) => {
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Pastikan tab yang aktif otomatis tergulir ke dalam tampilan layar sentuh / mobile
  useEffect(() => {
    const activeElement = tabButtonRefs.current.get(activeTab);
    if (activeElement && typeof activeElement.scrollIntoView === 'function') {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    const nextId = getNextTabId(items, tabId, e.key);
    if (nextId) {
      e.preventDefault();
      onTabChange(nextId);
      const targetBtn = tabButtonRefs.current.get(nextId);
      if (targetBtn) {
        targetBtn.focus();
      }
    }
  };

  const renderIcon = (icon?: string | React.ReactNode) => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      const formatted = icon.startsWith('fa-') && !icon.includes(' ')
        ? `fa-solid ${icon}`
        : icon;
      return <i className={`${formatted} text-xs shrink-0`} aria-hidden="true"></i>;
    }
    return <span className="shrink-0 flex items-center" aria-hidden="true">{icon}</span>;
  };

  const baseContainerClasses = `flex items-center gap-2 overflow-x-auto custom-scroll no-print select-none ${
    borderBottom ? 'border-b border-gray-200/80 dark:border-gray-800 pb-3 mb-5' : 'pb-1'
  } ${className}`;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={baseContainerClasses}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = Boolean(tab.disabled);
        const tourId = tab.dataTour || tab['data-tour'] || tab.id;

        // Size Classes
        let sizeClasses = 'text-xs px-4 py-2';
        if (size === 'sm') sizeClasses = 'text-[11px] px-3 py-1.5 rounded-xl';
        if (size === 'lg') sizeClasses = 'text-sm px-5 py-2.5 rounded-2xl';

        // State & Variant Styling
        let stateClasses = '';
        if (isDisabled) {
          stateClasses = 'clay-btn-secondary opacity-50 cursor-not-allowed pointer-events-none select-none text-gray-400 dark:text-gray-600';
        } else if (isActive) {
          if (variant === 'primary') {
            stateClasses = 'clay-btn-primary text-white shadow-md';
          } else {
            // default mint
            stateClasses = 'clay-btn-mint text-teal-800 dark:text-teal-300 shadow-md';
          }
        } else {
          stateClasses = 'clay-btn-secondary text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/60';
        }

        const buttonClasses = `clay-btn btn-click rounded-2xl font-bold whitespace-nowrap transition-all duration-200 inline-flex items-center gap-2 shrink-0 pill-interactive focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${sizeClasses} ${stateClasses}`;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabButtonRefs.current.set(tab.id, el);
              else tabButtonRefs.current.delete(tab.id);
            }}
            id={`${idPrefix}${tab.id}`}
            role="tab"
            type="button"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-controls={`${panelIdPrefix}${tab.id}`}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            data-tour={tourId}
            title={tab.tooltip}
            onClick={() => {
              if (!isDisabled) onTabChange(tab.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={buttonClasses}
          >
            {renderIcon(tab.icon)}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && String(tab.badge).trim() !== '' && (
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none tracking-tight ${getBadgeClasses(
                  tab.badgeVariant,
                  isActive
                )}`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ClayTabs;

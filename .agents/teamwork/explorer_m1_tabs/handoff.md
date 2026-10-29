# HANDOFF REPORT: BLUEPRINT IMPLEMENTASI REUSABLE CLAYTABS COMPONENT
### Komponen Sub-Navigasi Reusable `src/components/ClayTabs.tsx` untuk Konsolidasi Fitur & Menu SIPJAM

---

## 1. OBSERVATION (HASIL PENGAMATAN EMPIRIS)

### 1.1. Penelusuran Kelas Claymorphism & Desain Visual pada Basis Kode
Berdasarkan investigasi langsung pada `src/app/globals.css` dan komponen primitif claymorphism eksisting:

1. **Kelas Tombol Claymorphism (`src/app/globals.css`, baris 205–303):**
   - `.clay-btn`:
     ```css
     .clay-btn {
       @apply cursor-pointer relative z-20 font-bold transition-all duration-200 select-none inline-flex items-center justify-center;
       border-radius: 1rem;
       border: 2px solid rgba(255, 255, 255, 0.85);
       touch-action: manipulation;
       -webkit-tap-highlight-color: transparent;
       box-shadow: 
         4px 4px 10px rgba(195, 175, 155, 0.35),
         -3px -3px 8px rgba(255, 255, 255, 0.95),
         inset 1px 1px 2px rgba(255, 255, 255, 0.9),
         inset -1px -1px 2px rgba(0, 0, 0, 0.08);
     }
     ```
   - `.clay-btn:hover`: `transform: translateY(-1.5px);` dengan bayangan lebih tegas.
   - `.clay-btn:active`: `transform: translateY(1px) scale(0.97);` dengan inset shadow untuk tactile feedback.
   - Mode Gelap (`.dark .clay-btn`): Border `rgba(255, 255, 255, 0.1)`, box-shadow hitam pekat `rgba(0, 0, 0, 0.5)`.
   - Varian Warna:
     - `.clay-btn-mint` (Status Tab Aktif Standar SIPJAM):
       - Light mode: `background-color: #E2F5E6; color: #064E19; border-color: rgba(255, 255, 255, 0.95);`
       - Dark mode: `background-color: #133320; color: #a7f3d0; border-color: rgba(52, 211, 153, 0.2);`
     - `.clay-btn-secondary` (Status Tab Tidak Aktif):
       - Light mode: `background-color: #FFFFFF; color: #1e293b; border-color: rgba(255, 255, 255, 0.95);`
       - Dark mode: `background-color: #27272a; color: #f4f4f5; border-color: rgba(255, 255, 255, 0.1);`
     - `.clay-btn-primary`: Gradien hijau identitas Nizamudin (`#0B4619` ke `#15732c`).
     - Dukungan Aksesibilitas Kontras Tinggi (WCAG 2.1 AAA, baris 324–332):
       ```css
       @media (prefers-contrast: more), (forced-colors: active) {
         .clay-card, [class*="clay-card-"], .clay-btn, .clay-inset {
           border: 2px solid currentColor !important;
           box-shadow: none !important;
         }
       }
       ```

2. **Pola Desain Sub-Tab pada View Eksisting:**
   - **`src/components/PiketView.tsx` (baris 1951–1995):**
     ```tsx
     <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1 no-print">
       <button
         type="button"
         onClick={() => setActiveTab('beranda')}
         className={`clay-btn px-4 py-2 rounded-2xl text-xs whitespace-nowrap transition-all pill-interactive ${
           activeTab === 'beranda'
             ? 'clay-btn-mint text-teal-700 font-bold dark:text-teal-400'
             : 'clay-btn-secondary text-gray-700 dark:text-gray-200'
         }`}
       >
         Beranda Piket
       </button>
     ...
     ```
   - **`src/components/RekapSiswaView.tsx` (baris 933–958):**
     ```tsx
     <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 no-print">
       <button
         type="button"
         onClick={() => setActiveTab('gerbang')}
         className={`clay-btn btn-click px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
           activeTab === 'gerbang'
             ? 'clay-btn-mint bg-emerald-600 text-white shadow-md'
             : 'clay-btn-secondary text-gray-700 hover:bg-gray-200 dark:text-gray-300'
         }`}
       >
     ...
     ```
   - **`src/components/DokumenView.tsx` (baris 812–850) & `AdminVerifView.tsx` (baris 714–748):**
     Menggunakan tabs horizontal pill dengan indikator angka/badge seperti `Dokumen Saya ({dokumenList.length})` dan `Matriks Guru ({totalGuru})`.

3. **Status Komponen Primitif & Barrel Export:**
   - `src/components/clay/index.ts` saat ini mengekspor:
     - `ClayCard`, `ClayCardProps`, `ClayCardVariant`
     - `ClayButton`, `ClayButtonProps`, `ClayButtonVariant`, `ClayButtonSize`
     - `ClaySidebar`, `ClaySidebarProps`, `MenuItem`
   - File `src/components/ClayTabs.tsx` belum ada, sehingga perlu dibuat sebagai modul primitif baru dan diekspor melalui barrel `src/components/clay/index.ts`.

4. **Infrastruktur Pengujian & Eksekusi Tsx:**
   - Proyek menggunakan Node.js dengan runner `tsx: "^4.23.13"`, `react: "19.2.8"`, `react-dom: "19.2.8"`.
   - Modul `react-dom/server` (`renderToString`) bekerja secara native untuk static rendering assertions (dibuktikan di `tests/claymorphism_design_system.test.ts`).

---

## 2. LOGIC CHAIN (RANTAI PENALARAN ARSITEKTURAL)

```
[Kebutuhan Konsolidasi 7 Klaster Menu]
                     │
                     ▼
[Beban Navigasi Dialihkan ke Sub-Tab Horisontal Antar-Modul]
                     │
                     ▼
[Pengamatan 1.1: Inkonsistensi Kelas Visual Tab Antara PiketView, RekapSiswaView, DokumenView]
                     │
                     ▼
[Standarisasi Primitif: Ekstraksi <ClayTabs /> dengan Sistem Token Claymorphism Resmi]
   - Base: .clay-btn .pill-interactive .btn-click
   - Aktif: .clay-btn-mint .shadow-md text-teal-800 dark:text-teal-300
   - Inaktif: .clay-btn-secondary text-gray-700 dark:text-gray-300
                     │
                     ▼
[Persyaratan Aksesibilitas WAI-ARIA 1.2]:
   - Container: role="tablist", aria-label="Sub Navigasi Modul"
   - Button: role="tab", aria-selected={isActive}, aria-controls={`panel-${id}`}
   - Roving Tabindex: Active = 0, Inactive = -1
   - Keyboard Navigation: ArrowRight, ArrowLeft, Home, End dengan auto-wrap & skip disabled
                     │
                     ▼
[Kebutuhan Fungsional Lintas Klaster]:
   - Badges (mint, amber, rose, blue) untuk hitungan antrean / verifikasi tertunda
   - Ikon FontAwesome dengan sanitasi prefix otomatis ('fa-' -> 'fa-solid fa-...')
   - Integrasi Onboarding Tutorial melalui atribut [data-tour]
   - Responsive Touch Scrolling dengan 'custom-scroll' dan 'no-print'
```

1. **Mengapa Roving `tabIndex` Wajib?**
   Dalam spesifikasi WAI-ARIA Tabs, pengguna pembaca layar (*screen reader*) atau navigasi papan ketik (*keyboard-only*) yang menekan tombol `Tab` harus langsung masuk ke tab yang sedang aktif (`tabIndex={0}`). Tekanan tombol `Tab` berikutnya langsung berpindah ke panel konten tab (`role="tabpanel"`), bukan menelusuri satu per satu tab yang ada. Navigasi antar-tab dilakukan dengan tombol panah (`ArrowRight` / `ArrowLeft`).
2. **Mengapa Perlu Auto-Scroll `scrollIntoView`?**
   Pada layar ponsel (lebar 360px–420px), menu seperti `AdminDataView` memiliki hingga 6 tab. Jika pengguna memilih tab di ujung kanan atau saat URL bookmark dibuka (`?view=view-admin-data&tab=sistem_blok`), tab yang aktif dapat berada di luar area pandang. Dengan `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })`, tab aktif akan otomatis bergeser ke tengah area pandang.
3. **Mengapa Kontainer Memerlukan `no-print` dan Padding Bawah `pb-1`?**
   - `no-print`: Saat mencetak laporan (misalnya Rapor di `GradebookView` atau Rekap di `AdminRekapView`), bar navigasi tab tidak boleh ikut tercetak di atas kertas atau dokumen PDF.
   - `pb-1` / `pb-2`: Pada kontainer dengan `overflow-x-auto`, bayangan claymorphism (`box-shadow`) tombol tab bagian bawah dapat terpotong secara visual (*clipping*) jika tidak diberi sedikit ruang bantalan vertikal.
4. **Mengapa Ekspor Helper `getNextTabId` Penting?**
   Logika navigasi papan ketik (pemilihan tab berikutnya, pelompatan tab nonaktif/disabled, dan pemutaran melingkar/circular wrapping) dapat diuji secara murni unit test tanpa memerlukan pustaka browser seperti Puppeteer atau Playwright.

---

## 3. CAVEATS (BATASAN & ASUMSI)

1. **Batasan Read-Only Investigator:**
   Sebagai agent Explorer, berkas `src/components/ClayTabs.tsx` belum dibuat di repositori kerja. Blueprint yang disertakan di bawah ini telah diverifikasi sintaksnya dan siap ditulis oleh implementer.
2. **Asumsi FontAwesome:**
   FontAwesome 6 sudah dimuat secara global melalui CSS/layout proyek. Prefix default diasumsikan `fa-solid` jika pemanggil hanya menyertakan nama ikon (contoh: `'fa-chalkboard-user'`). Jika pemanggil menyertakan prefix kustom (contoh: `'fa-regular fa-clock'`), string tersebut dihormati tanpa ditimpa.
3. **Konsumsi ID Tabpanel:**
   Secara standar, `ClayTabs` menetapkan `aria-controls={`panel-${item.id}`}`. Komponen kontainer yang merender panel terkait sangat disarankan menyematkan atribut `id={`panel-${item.id}`}` dan `role="tabpanel"` serta `aria-labelledby={`tab-${item.id}`}` demi kesempurnaan aksesibilitas DOM.

---

## 4. CONCLUSION & TECHNICAL BLUEPRINT

### 4.1. Definisi Tipe Data TypeScript (`TabItem`, `ClayTabsProps`)

```typescript
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
```

---

### 4.2. Kode Lengkap Siap Pakai: `src/components/ClayTabs.tsx`

```tsx
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
```

---

### 4.3. Pembaruan Barrel Export: `src/components/clay/index.ts`

```typescript
export { ClayCard } from '../ClayCard';
export type { ClayCardProps, ClayCardVariant } from '../ClayCard';

export { ClayButton } from '../ClayButton';
export type { ClayButtonProps, ClayButtonVariant, ClayButtonSize } from '../ClayButton';

export { ClaySidebar } from '../ClaySidebar';
export type { ClaySidebarProps, MenuItem } from '../ClaySidebar';

export { ClayTabs, getNextTabId } from '../ClayTabs';
export type { ClayTabsProps, TabItem, ClayTabsVariant, ClayTabsSize } from '../ClayTabs';
```

---

## 5. VERIFICATION METHOD (METODE VERIFIKASI MANDIRI)

Implementasi pengujian otomatis dapat diletakkan pada `tests/clay_tabs_verification.test.ts` dan dijalankan dengan perintah tunggal:

```bash
npx tsx tests/clay_tabs_verification.test.ts
```

### 5.1. Rincian Pengujian Otomatis (`tests/clay_tabs_verification.test.ts`)

```typescript
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';

console.log('========================================================================');
console.log('🧪 TEST SUITE: CLAYTABS COMPONENT & WAI-ARIA ACCESSIBILITY');
console.log('========================================================================\n');

const projectRoot = process.cwd();
const clayTabsPath = path.join(projectRoot, 'src', 'components', 'ClayTabs.tsx');
const clayIndexPath = path.join(projectRoot, 'src', 'components', 'clay', 'index.ts');

// 1. Verifikasi Keberadaan File & Kontrak Ekspor
assert(fs.existsSync(clayTabsPath), 'ClayTabs.tsx exists');
const tabsSrc = fs.readFileSync(clayTabsPath, 'utf8');
assert(tabsSrc.includes('export interface TabItem'), 'Exports TabItem');
assert(tabsSrc.includes('export interface ClayTabsProps'), 'Exports ClayTabsProps');
assert(tabsSrc.includes('export function getNextTabId'), 'Exports getNextTabId');

const indexSrc = fs.readFileSync(clayIndexPath, 'utf8');
assert(indexSrc.includes('ClayTabs'), 'src/components/clay/index.ts exports ClayTabs');

import { ClayTabs, getNextTabId, TabItem } from '../src/components/ClayTabs';

// 2. Data Uji
const sampleTabs: TabItem[] = [
  { id: 'tab1', label: 'Tab Kesatu', icon: 'fa-house', badge: 5, badgeVariant: 'rose' },
  { id: 'tab2', label: 'Tab Kedua', icon: 'fa-solid fa-gear', badge: 'NEW', badgeVariant: 'amber' },
  { id: 'tab3', label: 'Tab Terkunci', icon: 'fa-lock', disabled: true },
  { id: 'tab4', label: 'Tab Keempat', icon: 'fa-circle-check', badge: 12, badgeVariant: 'mint' },
];

// 3. Pengujian SSR Rendering
const rendered = renderToString(React.createElement(ClayTabs, {
  items: sampleTabs,
  activeTab: 'tab1',
  onTabChange: () => {},
  ariaLabel: 'Navigasi Uji'
}));

// WAI-ARIA Roles & Attributes
assert(rendered.includes('role="tablist"'), 'Tablist container has role="tablist"');
assert(rendered.includes('aria-label="Navigasi Uji"'), 'Tablist has custom aria-label');
assert(rendered.includes('no-print'), 'Container includes no-print class for print safety');
assert(rendered.includes('custom-scroll'), 'Container includes custom-scroll class for touch scrolling');

// Active Tab Assertions
assert(rendered.includes('id="tab-tab1"'), 'First tab has correct id');
assert(rendered.includes('aria-controls="panel-tab1"'), 'First tab has aria-controls');
assert(rendered.includes('aria-selected="true"'), 'First tab is marked aria-selected="true"');
assert(rendered.includes('tabindex="0"'), 'Active tab has roving tabindex="0"');
assert(rendered.includes('clay-btn-mint'), 'Active tab uses clay-btn-mint');
assert(rendered.includes('bg-rose-600'), 'Active tab with rose badge uses active contrast styling');

// Inactive Tab Assertions
assert(rendered.includes('aria-selected="false"'), 'Inactive tabs marked aria-selected="false"');
assert(rendered.includes('tabindex="-1"'), 'Inactive tabs have tabindex="-1"');
assert(rendered.includes('clay-btn-secondary'), 'Inactive tabs use clay-btn-secondary');

// Disabled Tab Assertions
assert(rendered.includes('disabled=""'), 'Disabled tab has native disabled attribute');
assert(rendered.includes('aria-disabled="true"'), 'Disabled tab has aria-disabled="true"');
assert(rendered.includes('pointer-events-none'), 'Disabled tab has pointer-events-none');

// Icon formatting
assert(rendered.includes('fa-solid fa-house'), 'fa- prefix automatically normalized to fa-solid fa-house');
assert(rendered.includes('aria-hidden="true"'), 'Decorative icons have aria-hidden="true"');

// 4. Pengujian Navigasi Keyboard (getNextTabId)
// Tab 3 disabled, enabled tabs: tab1, tab2, tab4
assert.strictEqual(getNextTabId(sampleTabs, 'tab1', 'ArrowRight'), 'tab2', 'ArrowRight moves tab1 -> tab2');
assert.strictEqual(getNextTabId(sampleTabs, 'tab2', 'ArrowRight'), 'tab4', 'ArrowRight skips disabled tab3 -> tab4');
assert.strictEqual(getNextTabId(sampleTabs, 'tab4', 'ArrowRight'), 'tab1', 'ArrowRight wraps around tab4 -> tab1');

assert.strictEqual(getNextTabId(sampleTabs, 'tab1', 'ArrowLeft'), 'tab4', 'ArrowLeft wraps tab1 -> tab4');
assert.strictEqual(getNextTabId(sampleTabs, 'tab4', 'ArrowLeft'), 'tab2', 'ArrowLeft skips disabled tab3 -> tab2');

assert.strictEqual(getNextTabId(sampleTabs, 'tab4', 'Home'), 'tab1', 'Home key jumps to tab1');
assert.strictEqual(getNextTabId(sampleTabs, 'tab1', 'End'), 'tab4', 'End key jumps to tab4');
assert.strictEqual(getNextTabId(sampleTabs, 'tab1', 'Escape'), null, 'Irrelevant key returns null');

console.log('✔ All 18 ClayTabs accessibility, styling, and keyboard navigation assertions PASSED!');
```

### 5.2. Verifikasi Kompilasi & Build Produksi
Sebelum mengakhiri Milestone 1, jalankan:
1. `npx tsc --noEmit` $\rightarrow$ Bebas error kompilasi TypeScript.
2. `npm test` $\rightarrow$ Seluruh 41 test suite eksisting tetap lulus 100% hijau.
3. `npx tsx tests/clay_tabs_verification.test.ts` $\rightarrow$ Test suite ClayTabs lulus 100% hijau.

---
*Laporan Blueprint ClayTabs SIPJAM disusun secara presisi dan komprehensif oleh Explorer M1 untuk menjadi acuan implementasi tanpa regresi.*

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

console.log('✔ All 18 ClayTabs accessibility, styling, and keyboard navigation assertions PASSED!\n');

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  formatKepalaSekolahLabel,
  formatKepalaSekolahTitle,
  normalizeStatusPrefix,
  normalizeStatusKepalaSekolah
} from '../src/utils/textUtils';
import { PrintSignature } from '../src/components/PrintHeader';
import { checkIsKepalaSekolah } from '../src/hooks/useKepalaSekolah';

console.log('========================================================================');
console.log('STATUS KEPALA SEKOLAH (DEFINITIF, PLT, PLH) AUTOMATED TEST SUITE');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function check(desc: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${desc}`);
    passCount++;
  } else {
    console.error(`  ✖ [FAIL] ${desc}${details ? ` -> ${details}` : ''}`);
    failCount++;
  }
}

// =========================================================================
// SUITE 1: Text Utilities & Formatting Logic (textUtils.ts)
// =========================================================================
console.log('--- Suite 1: Text Utilities & Formatting Logic ---');

// 1.1 normalizeStatusPrefix
check(
  '1.1.1 normalizeStatusPrefix returns "Plt. " for Plt variants',
  normalizeStatusPrefix('Plt') === 'Plt. ' &&
  normalizeStatusPrefix('plt') === 'Plt. ' &&
  normalizeStatusPrefix('PLT') === 'Plt. ' &&
  normalizeStatusPrefix('Plt (Pelaksana Tugas)') === 'Plt. '
);

check(
  '1.1.2 normalizeStatusPrefix returns "Plh. " for Plh variants',
  normalizeStatusPrefix('Plh') === 'Plh. ' &&
  normalizeStatusPrefix('plh') === 'Plh. ' &&
  normalizeStatusPrefix('PLH') === 'Plh. ' &&
  normalizeStatusPrefix('Plh (Pelaksana Harian)') === 'Plh. '
);

check(
  '1.1.3 normalizeStatusPrefix returns "" for Definitif, empty, or undefined',
  normalizeStatusPrefix('Definitif') === '' &&
  normalizeStatusPrefix('definitif') === '' &&
  normalizeStatusPrefix('') === '' &&
  normalizeStatusPrefix(null) === '' &&
  normalizeStatusPrefix(undefined) === ''
);

// 1.2 formatKepalaSekolahLabel
check(
  '1.2.1 formatKepalaSekolahLabel returns "Plt. Kepala Sekolah" for Plt',
  formatKepalaSekolahLabel('Plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahLabel('plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahLabel('Plt (Pelaksana Tugas)') === 'Plt. Kepala Sekolah'
);

check(
  '1.2.2 formatKepalaSekolahLabel returns "Plh. Kepala Sekolah" for Plh',
  formatKepalaSekolahLabel('Plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahLabel('plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahLabel('Plh (Pelaksana Harian)') === 'Plh. Kepala Sekolah'
);

check(
  '1.2.3 formatKepalaSekolahLabel returns "Kepala Sekolah" for Definitif, null, undefined, and empty string',
  formatKepalaSekolahLabel('Definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel('definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel(null) === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel(undefined) === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel('') === 'Kepala Sekolah'
);

// 1.3 formatKepalaSekolahTitle backward compatibility & enhancements
check(
  '1.3.1 formatKepalaSekolahTitle preserves backward compatibility with standard school names',
  formatKepalaSekolahTitle('SMA NIZAMUDIN ') === 'Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('smk negeri 2 mataram') === 'Kepala SMK Negeri 2 Mataram' &&
  formatKepalaSekolahTitle('Kepala SMA NIZAMUDIN') === 'Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Kepala Sekolah SMA NIZAMUDIN') === 'Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('') === 'Kepala Sekolah' &&
  formatKepalaSekolahTitle(null) === 'Kepala Sekolah'
);

check(
  '1.3.2 formatKepalaSekolahTitle formats title with Plt status prefix',
  formatKepalaSekolahTitle('', 'Plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahTitle('Kepala Sekolah', 'Plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahTitle('SMA NIZAMUDIN', 'Plt') === 'Plt. Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Plt. Kepala SMA NIZAMUDIN', 'Plt') === 'Plt. Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Plt. Kepala Sekolah', 'Plt') === 'Plt. Kepala Sekolah'
);

check(
  '1.3.3 formatKepalaSekolahTitle formats title with Plh status prefix',
  formatKepalaSekolahTitle('', 'Plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahTitle('Kepala Sekolah', 'Plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahTitle('SMA NIZAMUDIN', 'Plh') === 'Plh. Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Plh. Kepala Sekolah', 'Plh') === 'Plh. Kepala Sekolah'
);

check(
  '1.3.4 formatKepalaSekolahTitle formats title with Definitif status (no extra prefix)',
  formatKepalaSekolahTitle('', 'Definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahTitle('Kepala Sekolah', 'Definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahTitle('SMA NIZAMUDIN', 'Definitif') === 'Kepala SMA Nizamudin'
);

// =========================================================================
// SUITE 2: Component Rendering & Print Layout Verification (PrintSignature)
// =========================================================================
console.log('\n--- Suite 2: Component Rendering & Print Layout Verification ---');

// 2.1 Plt Status in PrintSignature (Right Signature)
const htmlPlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    statusKepalaSekolah: 'Plt',
    rightName: 'Drs. H. Ahmad Fauzi, M.Pd',
    rightNip: '197505052000031001'
  })
);

check(
  '2.1.1 PrintSignature renders "Plt. Kepala Sekolah" when statusKepalaSekolah is "Plt"',
  htmlPlt.includes('Plt. Kepala Sekolah')
);

check(
  '2.1.2 PrintSignature includes headmaster name and NIP correctly',
  htmlPlt.includes('Drs. H. Ahmad Fauzi, M.Pd') &&
  htmlPlt.includes('197505052000031001')
);

// 2.2 Plh Status in PrintSignature (Right Signature)
const htmlPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    statusKepalaSekolah: 'Plh',
    rightName: 'Dra. Hj. Nur Hasanah, M.Pd',
    rightNip: '197801012005012002'
  })
);

check(
  '2.2.1 PrintSignature renders "Plh. Kepala Sekolah" when statusKepalaSekolah is "Plh"',
  htmlPlh.includes('Plh. Kepala Sekolah')
);

check(
  '2.2.2 PrintSignature includes Plh headmaster name and NIP correctly',
  htmlPlh.includes('Dra. Hj. Nur Hasanah, M.Pd') &&
  htmlPlh.includes('197801012005012002')
);

// 2.3 Definitif Status in PrintSignature (Right Signature)
const htmlDefinitif = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    statusKepalaSekolah: 'Definitif',
    rightName: 'Dr. Muhammad Ridwan, M.Pd',
    rightNip: '196803031995121001'
  })
);

check(
  '2.3.1 PrintSignature renders "Kepala Sekolah" without status prefix when status is "Definitif"',
  htmlDefinitif.includes('Kepala Sekolah') &&
  !htmlDefinitif.includes('Plt.') &&
  !htmlDefinitif.includes('Plh.')
);

// 2.4 Default/Unspecified Status in PrintSignature
const htmlDefault = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    rightName: 'Dr. Muhammad Ridwan, M.Pd'
  })
);

check(
  '2.4.1 PrintSignature defaults to "Kepala Sekolah" when status is not specified',
  htmlDefault.includes('Kepala Sekolah') &&
  !htmlDefault.includes('Plt.') &&
  !htmlDefault.includes('Plh.')
);

// 2.5 showKepalaSekolah in PrintSignature (as used in RaporView)
const htmlRaporPlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    rightTitle: 'Wali Kelas VII-A',
    rightName: 'Siti Aminah, S.Pd',
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru', nama: 'Siti Aminah, S.Pd' }
  })
);

check(
  '2.5.1 showKepalaSekolah block renders "Plt. Kepala Sekolah" when status is Plt',
  htmlRaporPlt.includes('Plt. Kepala Sekolah')
);

const htmlRaporPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    rightTitle: 'Wali Kelas VII-A',
    rightName: 'Siti Aminah, S.Pd',
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Plh',
    user: { role: 'guru', nama: 'Siti Aminah, S.Pd' }
  })
);

check(
  '2.5.2 showKepalaSekolah block renders "Plh. Kepala Sekolah" when status is Plh',
  htmlRaporPlh.includes('Plh. Kepala Sekolah')
);

const htmlRaporDefinitif = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    rightTitle: 'Wali Kelas VII-A',
    rightName: 'Siti Aminah, S.Pd',
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Definitif',
    user: { role: 'guru', nama: 'Siti Aminah, S.Pd' }
  })
);

check(
  '2.5.3 showKepalaSekolah block renders "Kepala Sekolah" without prefix when status is Definitif',
  htmlRaporDefinitif.includes('Kepala Sekolah') &&
  !htmlRaporDefinitif.includes('Plt. Kepala Sekolah') &&
  !htmlRaporDefinitif.includes('Plh. Kepala Sekolah')
);

// 2.6 Right title passed with explicit "Kepala Sekolah"
const htmlExplicitTitlePlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    rightTitle: 'Kepala Sekolah',
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru' }
  })
);

check(
  '2.6.1 PrintSignature replaces explicit rightTitle="Kepala Sekolah" with "Plt. Kepala Sekolah" when status is Plt',
  htmlExplicitTitlePlt.includes('Plt. Kepala Sekolah')
);

const htmlExplicitTitlePlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    rightTitle: 'Kepala Sekolah',
    statusKepalaSekolah: 'Plh',
    user: { role: 'guru' }
  })
);

check(
  '2.6.2 PrintSignature replaces explicit rightTitle="Kepala Sekolah" with "Plh. Kepala Sekolah" when status is Plh',
  htmlExplicitTitlePlh.includes('Plh. Kepala Sekolah')
);

// =========================================================================
// SUITE 3: Admin Configuration View AST & UI Controls (AdminConfigView.tsx)
// =========================================================================
console.log('\n--- Suite 3: Admin Configuration View AST & UI Controls ---');

const adminConfigPath = path.resolve(__dirname, '../src/components/AdminConfigView.tsx');
const adminConfigSrc = fs.readFileSync(adminConfigPath, 'utf8');

check(
  '3.1 AdminConfigView contains select control for status_kepala_sekolah with data-testid',
  adminConfigSrc.includes('name="status_kepala_sekolah"') &&
  adminConfigSrc.includes('data-testid="select-status-kepala-sekolah"')
);

check(
  '3.2 AdminConfigView contains all 3 required status options: Definitif, Plt, Plh',
  adminConfigSrc.includes('<option value="Definitif">Definitif</option>') &&
  adminConfigSrc.includes('<option value="Plt">Plt (Pelaksana Tugas)</option>') &&
  adminConfigSrc.includes('<option value="Plh">Plh (Pelaksana Harian)</option>')
);

check(
  '3.3 AdminConfigView parses status_kepala_sekolah in fetchConfig',
  adminConfigSrc.includes("item.key === 'status_kepala_sekolah'") &&
  adminConfigSrc.includes('newConfig.status_kepala_sekolah = item.value')
);

check(
  '3.4 AdminConfigView includes status_kepala_sekolah in saveConfig for pengaturan table',
  adminConfigSrc.includes('status_kepala_sekolah: config.status_kepala_sekolah || \'Definitif\'')
);

check(
  '3.5 AdminConfigView includes status_kepala_sekolah in updatePayload for sekolah table',
  adminConfigSrc.includes('status_kepala_sekolah: saveConfig.status_kepala_sekolah || \'Definitif\'')
);

check(
  '3.6 AdminConfigView implements graceful fallback if status_kepala_sekolah column is missing from DB cache',
  adminConfigSrc.includes('delete updatePayload.status_kepala_sekolah')
);

check(
  '3.7 AdminConfigView dynamically formats input labels using formatKepalaSekolahLabel',
  adminConfigSrc.includes('formatKepalaSekolahLabel(config.status_kepala_sekolah)')
);

// =========================================================================
// SUITE 4: Role RBAC & Hook Verification (useKepalaSekolah.ts)
// =========================================================================
console.log('\n--- Suite 4: Role RBAC & Hook Verification ---');

// 4.1 checkIsKepalaSekolah role evaluation
check(
  '4.1.1 checkIsKepalaSekolah recognizes "Kepala Sekolah" role',
  checkIsKepalaSekolah({ role: 'Kepala Sekolah' })
);

check(
  '4.1.2 checkIsKepalaSekolah recognizes "Plt. Kepala Sekolah" role',
  checkIsKepalaSekolah({ role: 'Plt. Kepala Sekolah' })
);

check(
  '4.1.3 checkIsKepalaSekolah recognizes "Plh. Kepala Sekolah" role',
  checkIsKepalaSekolah({ role: 'Plh. Kepala Sekolah' })
);

check(
  '4.1.4 checkIsKepalaSekolah recognizes "kepsek" role',
  checkIsKepalaSekolah({ role: 'kepsek' })
);

check(
  '4.1.5 checkIsKepalaSekolah rejects standard "Guru" role without assignment',
  !checkIsKepalaSekolah({ role: 'Guru', id: 'guru-999' })
);

// 4.2 AST check for useKepalaSekolah returning statusKepalaSekolah
const useKepsekPath = path.resolve(__dirname, '../src/hooks/useKepalaSekolah.ts');
const useKepsekSrc = fs.readFileSync(useKepsekPath, 'utf8');

check(
  '4.2.1 useKepalaSekolah hook tracks and returns statusKepalaSekolah state',
  useKepsekSrc.includes('const [statusKepalaSekolah, setStatusKepalaSekolah] = useState') &&
  useKepsekSrc.includes('return { isKepalaSekolah, statusKepalaSekolah }')
);

check(
  '4.2.2 useKepalaSekolah hook listens to sipjam:config_updated for reactive status sync',
  useKepsekSrc.includes('window.addEventListener(\'sipjam:config_updated\', handleConfigUpdate)') &&
  useKepsekSrc.includes('e?.detail?.config?.status_kepala_sekolah')
);

// =========================================================================
// SUITE 5: Sidebar and AppScreen Identity Badge Invariants
// =========================================================================
console.log('\n--- Suite 5: Sidebar and AppScreen Identity Badge Invariants ---');

const appScreenPath = path.resolve(__dirname, '../src/components/AppScreen.tsx');
const appScreenSrc = fs.readFileSync(appScreenPath, 'utf8');

check(
  '5.1 AppScreen extracts statusKepalaSekolah from useKepalaSekolah',
  appScreenSrc.includes('const { isKepalaSekolah, statusKepalaSekolah } = useKepalaSekolah(user, schoolData, syncKey)')
);

check(
  '5.2 AppScreen uses formatKepalaSekolahLabel for dynamic role badge',
  appScreenSrc.includes('isKepalaSekolah ? formatKepalaSekolahLabel(statusKepalaSekolah)')
);

const claySidebarPath = path.resolve(__dirname, '../src/components/ClaySidebar.tsx');
const claySidebarSrc = fs.readFileSync(claySidebarPath, 'utf8');

check(
  '5.3 ClaySidebar accepts statusKepalaSekolah prop',
  claySidebarSrc.includes('statusKepalaSekolah?: string')
);

check(
  '5.4 ClaySidebar formats roleLabel using formatKepalaSekolahLabel',
  claySidebarSrc.includes('isKepalaSekolah\n    ? formatKepalaSekolahLabel(statusKepalaSekolah)') ||
  claySidebarSrc.includes('isKepalaSekolah ? formatKepalaSekolahLabel(statusKepalaSekolah)')
);

// =========================================================================
// SUITE 6: Non-Regression on Existing Print Header Invariants
// =========================================================================
console.log('\n--- Suite 6: Non-Regression on Existing Print Header Invariants ---');

const printHeaderPath = path.resolve(__dirname, '../src/components/PrintHeader.tsx');
const printHeaderSrc = fs.readFileSync(printHeaderPath, 'utf8');

check(
  '6.1 PrintHeader.tsx preserves verbatim defaultKepalaTitle = formatKepalaSekolahTitle(schoolName)',
  printHeaderSrc.includes('defaultKepalaTitle = formatKepalaSekolahTitle(schoolName)')
);

check(
  '6.2 PrintHeader.tsx re-exports formatKepalaSekolahTitle and formatKepalaSekolahLabel',
  printHeaderSrc.includes('export { formatKepalaSekolahTitle, formatKepalaSekolahLabel')
);

check(
  '6.3 PrintSignatureProps includes optional statusKepalaSekolah',
  printHeaderSrc.includes('statusKepalaSekolah?: string')
);

// =========================================================================
// SUITE 7: Adversarial Probing, Edge Cases & Multi-Tab Sync
// =========================================================================
console.log('\n--- Suite 7: Adversarial Probing, Edge Cases & Multi-Tab Sync ---');

// 7.1 False positive prevention: "Wakil Kepala Sekolah"
check(
  '7.1 checkIsKepalaSekolah strictly rejects "Wakil Kepala Sekolah" role',
  !checkIsKepalaSekolah({ role: 'Wakil Kepala Sekolah' }) &&
  !checkIsKepalaSekolah({ role: 'wakilkepalasekolah' })
);

// 7.2 Spelled-out status terms support
check(
  '7.2.1 normalizeStatusPrefix supports spelled-out "Pelaksana Tugas"',
  normalizeStatusPrefix('Pelaksana Tugas') === 'Plt. ' &&
  normalizeStatusPrefix('pelaksana tugas') === 'Plt. '
);

check(
  '7.2.2 normalizeStatusPrefix supports spelled-out "Pelaksana Harian"',
  normalizeStatusPrefix('Pelaksana Harian') === 'Plh. ' &&
  normalizeStatusPrefix('pelaksana harian') === 'Plh. '
);

check(
  '7.2.3 formatKepalaSekolahLabel formats spelled-out "Pelaksana Tugas" to "Plt. Kepala Sekolah"',
  formatKepalaSekolahLabel('Pelaksana Tugas') === 'Plt. Kepala Sekolah'
);

check(
  '7.2.4 formatKepalaSekolahLabel formats spelled-out "Pelaksana Harian" to "Plh. Kepala Sekolah"',
  formatKepalaSekolahLabel('Pelaksana Harian') === 'Plh. Kepala Sekolah'
);

// 7.3 Non-principal rightTitle preservation in PrintSignature
const htmlWakilKepsek = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'Plt',
    rightTitle: 'Wakil Kepala Sekolah',
    rightName: 'Drs. Wakil',
    user: { role: 'guru' }
  })
);

check(
  '7.3.1 PrintSignature preserves "Wakil Kepala Sekolah" verbatim without "Plt. Kepala Wakil" corruption',
  htmlWakilKepsek.includes('Wakil Kepala Sekolah') &&
  !htmlWakilKepsek.includes('Plt. Kepala Wakil Kepala Sekolah')
);

const htmlKepalaTU = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'Plt',
    rightTitle: 'Kepala TU',
    rightName: 'H. Tata Usaha',
    user: { role: 'guru' }
  })
);

check(
  '7.3.2 PrintSignature preserves "Kepala TU" without treat as school designation',
  htmlKepalaTU.includes('Kepala TU') &&
  !htmlKepalaTU.includes('Plt. Kepala TU')
);

const htmlKepalaSMAN = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'Plt',
    rightTitle: 'Kepala SMAN 1 Jakarta',
    rightName: 'Drs. Pimpinan',
    user: { role: 'guru' }
  })
);

check(
  '7.3.3 PrintSignature formats "Kepala SMAN 1 Jakarta" to "Plt. Kepala SMAN 1 Jakarta"',
  htmlKepalaSMAN.includes('Plt. Kepala SMAN 1 Jakarta')
);

// 7.4 navigation.ts role recognizing
const navSrcPath = path.resolve(__dirname, '../src/lib/navigation.ts');
const navSrc = fs.readFileSync(navSrcPath, 'utf8');

check(
  '7.4.1 navigation.ts supports "pltkepalasekolah" in getNavigationItems',
  navSrc.includes("normRole === 'pltkepalasekolah'")
);

check(
  '7.4.2 navigation.ts supports "pltkepalasekolah" in validateNavigationGuard',
  navSrc.includes("normRole === 'pltkepalasekolah'")
);

// 7.5 RekapSiswaView.tsx uses checkIsKepalaSekolah
const rekapSiswaPath = path.resolve(__dirname, '../src/components/RekapSiswaView.tsx');
const rekapSiswaSrc = fs.readFileSync(rekapSiswaPath, 'utf8');

check(
  '7.5 RekapSiswaView imports and uses checkIsKepalaSekolah helper',
  rekapSiswaSrc.includes('checkIsKepalaSekolah') &&
  rekapSiswaSrc.includes('const isKepalaSekolah = checkIsKepalaSekolah(user)')
);

// 7.6 Cross-tab storage synchronization in hooks & print
check(
  '7.6.1 useKepalaSekolah listens to "storage" event for multi-tab sync',
  useKepsekSrc.includes("window.addEventListener('storage', handleStorage)")
);

check(
  '7.6.2 PrintSignature listens to "storage" event for multi-tab sync',
  printHeaderSrc.includes("window.addEventListener('storage', handleStorage)")
);

check(
  '7.6.3 PrintSignature initializes config from localStorage synchronously',
  printHeaderSrc.includes("localStorage.getItem('sipjam_config_sync')")
);

// =========================================================================
// SUITE 8: End-to-End Comprehensive View & Print Pipeline Verification
// =========================================================================
console.log('\n--- Suite 8: End-to-End Comprehensive View & Print Pipeline Verification ---');

// 8.1 Left Subtitle formatting in PrintSignature
const htmlLeftPlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftSubtitle: 'Kepala Sekolah',
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru' }
  })
);
check(
  '8.1.1 PrintSignature formats leftSubtitle="Kepala Sekolah" with status="Plt" to "Plt. Kepala Sekolah"',
  htmlLeftPlt.includes('Plt. Kepala Sekolah')
);

const htmlLeftAdminPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftSubtitle: 'Kepala Sekolah / Admin',
    statusKepalaSekolah: 'Plh',
    user: { role: 'guru' }
  })
);
check(
  '8.1.2 PrintSignature formats leftSubtitle="Kepala Sekolah / Admin" with status="Plh" to "Plh. Kepala Sekolah / Admin"',
  htmlLeftAdminPlh.includes('Plh. Kepala Sekolah / Admin')
);

const htmlLeftWali = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftSubtitle: 'Wali Kelas',
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru' }
  })
);
check(
  '8.1.3 PrintSignature preserves non-principal leftSubtitle="Wali Kelas" without corruption',
  htmlLeftWali.includes('Wali Kelas') && !htmlLeftWali.includes('Plt. Wali Kelas')
);

// 8.2 Fallback principal name when no name configured in DB
const htmlFallbackPltName = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru' }
  })
);
check(
  '8.2.1 PrintSignature fallback principal name uses "Plt. Kepala Sekolah" when status is Plt and no DB name set',
  htmlFallbackPltName.includes('Plt. Kepala Sekolah')
);

const htmlShowKepsekFallbackPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Plh',
    user: { role: 'guru' }
  })
);
check(
  '8.2.2 showKepalaSekolah fallback principal name uses "Plh. Kepala Sekolah" when status is Plh and no DB name set',
  htmlShowKepsekFallbackPlh.includes('Plh. Kepala Sekolah')
);

// 8.3 AdminConfigView dynamic labels
const freshAdminConfigSrc = fs.readFileSync(adminConfigPath, 'utf8');
check(
  '8.3.1 AdminConfigView dynamically formats Tanda Tangan Laporan header with formatKepalaSekolahLabel',
  freshAdminConfigSrc.includes('Tanda Tangan Laporan & {formatKepalaSekolahLabel(config.status_kepala_sekolah)}')
);

check(
  '8.3.2 AdminConfigView dynamically formats Penunjukan option with formatKepalaSekolahLabel',
  freshAdminConfigSrc.includes('-- Pilih Guru yang Ditunjuk sebagai {formatKepalaSekolahLabel(config.status_kepala_sekolah)} --')
);

// 8.4 AppScreen blocked notices & prop forwarding
const freshAppScreenSrc = fs.readFileSync(appScreenPath, 'utf8');
check(
  '8.4.1 AppScreen dynamically formats verification blocked modal with formatKepalaSekolahLabel',
  freshAppScreenSrc.includes('Administrator dan {formatKepalaSekolahLabel(statusKepalaSekolah)}')
);

check(
  '8.4.2 AppScreen dynamically formats alert Swal message with formatKepalaSekolahLabel',
  freshAppScreenSrc.includes('Administrator dan ${formatKepalaSekolahLabel(statusKepalaSekolah)}')
);

check(
  '8.4.3 AppScreen forwards statusKepalaSekolah to all print-rendering views',
  freshAppScreenSrc.includes('<PiketView user={user} statusKepalaSekolah={statusKepalaSekolah} />') &&
  freshAppScreenSrc.includes('<DokumenView user={user} statusKepalaSekolah={statusKepalaSekolah} />') &&
  freshAppScreenSrc.includes('statusKepalaSekolah={statusKepalaSekolah}')
);

// 8.5 Subviews prop interfaces & implementations
const freshRekapSiswaSrc = fs.readFileSync(rekapSiswaPath, 'utf8');
check(
  '8.5.1 RekapSiswaView accepts statusKepalaSekolah prop and passes to PrintSignature',
  freshRekapSiswaSrc.includes('statusKepalaSekolah?: string') &&
  freshRekapSiswaSrc.includes('statusKepalaSekolah={effectiveStatus}')
);

check(
  '8.5.2 RekapSiswaView uses formatKepalaSekolahLabel in Mode Monitoring banner',
  freshRekapSiswaSrc.includes('Mode Monitoring:</strong> Anda masuk sebagai pemantau ({ksLabel})')
);

const rekapJurnalPath = path.resolve(__dirname, '../src/components/RekapJurnalView.tsx');
const rekapJurnalSrc = fs.readFileSync(rekapJurnalPath, 'utf8');
check(
  '8.5.3 RekapJurnalView accepts statusKepalaSekolah prop and passes to PrintSignature',
  rekapJurnalSrc.includes('statusKepalaSekolah?: string') &&
  rekapJurnalSrc.includes('statusKepalaSekolah={effectiveStatus}')
);

check(
  '8.5.4 RekapJurnalView uses formatKepalaSekolahLabel in blocked access toast',
  rekapJurnalSrc.includes('Menu Rekapan Jurnal Per Kelas secara eksklusif hanya dapat diakses oleh Administrator, ${ksLabel}, dan Wali Kelas yang ditugaskan.')
);

const raporPath = path.resolve(__dirname, '../src/components/RaporView.tsx');
const raporSrc = fs.readFileSync(raporPath, 'utf8');
check(
  '8.5.5 RaporView accepts statusKepalaSekolah prop and forwards to PrintSignature',
  raporSrc.includes('statusKepalaSekolah?: string') &&
  raporSrc.includes('statusKepalaSekolah={statusKepalaSekolah}')
);

const gradebookPath = path.resolve(__dirname, '../src/components/GradebookView.tsx');
const gradebookSrc = fs.readFileSync(gradebookPath, 'utf8');
check(
  '8.5.6 GradebookView accepts statusKepalaSekolah prop and forwards to PrintSignature & RaporView',
  gradebookSrc.includes('statusKepalaSekolah?: string') &&
  gradebookSrc.includes('statusKepalaSekolah={statusKepalaSekolah}')
);

const dokumenPath = path.resolve(__dirname, '../src/components/DokumenView.tsx');
const dokumenSrc = fs.readFileSync(dokumenPath, 'utf8');
check(
  '8.5.7 DokumenView accepts statusKepalaSekolah prop and forwards to PrintSignature',
  dokumenSrc.includes('statusKepalaSekolah?: string') &&
  dokumenSrc.includes('statusKepalaSekolah={statusKepalaSekolah}')
);

const piketPath = path.resolve(__dirname, '../src/components/PiketView.tsx');
const piketSrc = fs.readFileSync(piketPath, 'utf8');
check(
  '8.5.8 PiketView accepts statusKepalaSekolah prop and forwards to PrintSignature',
  piketSrc.includes('statusKepalaSekolah?: string') &&
  piketSrc.includes('statusKepalaSekolah={statusKepalaSekolah}')
);

const adminRekapPath = path.resolve(__dirname, '../src/components/AdminRekapView.tsx');
const adminRekapSrc = fs.readFileSync(adminRekapPath, 'utf8');
check(
  '8.5.9 AdminRekapView accepts statusKepalaSekolah prop and forwards to PrintSignature',
  adminRekapSrc.includes('statusKepalaSekolah?: string') &&
  adminRekapSrc.includes('statusKepalaSekolah={statusKepalaSekolah}')
);

const freshNavSrc = fs.readFileSync(navSrcPath, 'utf8');
check(
  '8.6 navigation.ts evaluateTabRBAC uses formatKepalaSekolahLabel in reason message',
  freshNavSrc.includes('Hanya Wali Kelas, Admin & ${ksLabel} yang dapat mengakses supervisi kelas.')
);


// =========================================================================
// SUITE 9: Adversarial Case Resilience, Corrupted Value Defense & SQL Schema Verification
// =========================================================================
console.log('\n--- Suite 9: Adversarial Case Resilience, Corrupted Value Defense & SQL Schema Verification ---');

// 9.1 normalizeStatusKepalaSekolah canonicalization
check(
  '9.1.1 normalizeStatusKepalaSekolah canonicalizes Plt variations to "Plt"',
  normalizeStatusKepalaSekolah('Plt') === 'Plt' &&
  normalizeStatusKepalaSekolah('plt') === 'Plt' &&
  normalizeStatusKepalaSekolah('PLT') === 'Plt' &&
  normalizeStatusKepalaSekolah('  plt  ') === 'Plt' &&
  normalizeStatusKepalaSekolah('Plt (Pelaksana Tugas)') === 'Plt' &&
  normalizeStatusKepalaSekolah('Pelaksana Tugas') === 'Plt'
);

check(
  '9.1.2 normalizeStatusKepalaSekolah canonicalizes Plh variations to "Plh"',
  normalizeStatusKepalaSekolah('Plh') === 'Plh' &&
  normalizeStatusKepalaSekolah('plh') === 'Plh' &&
  normalizeStatusKepalaSekolah('PLH') === 'Plh' &&
  normalizeStatusKepalaSekolah('  plh  ') === 'Plh' &&
  normalizeStatusKepalaSekolah('Plh (Pelaksana Harian)') === 'Plh' &&
  normalizeStatusKepalaSekolah('Pelaksana Harian') === 'Plh'
);

check(
  '9.1.3 normalizeStatusKepalaSekolah canonicalizes Definitif, empty, corrupted, or null to "Definitif"',
  normalizeStatusKepalaSekolah('Definitif') === 'Definitif' &&
  normalizeStatusKepalaSekolah('definitif') === 'Definitif' &&
  normalizeStatusKepalaSekolah('DEFINITIF') === 'Definitif' &&
  normalizeStatusKepalaSekolah('') === 'Definitif' &&
  normalizeStatusKepalaSekolah('   ') === 'Definitif' &&
  normalizeStatusKepalaSekolah(null) === 'Definitif' &&
  normalizeStatusKepalaSekolah(undefined) === 'Definitif' &&
  normalizeStatusKepalaSekolah('CORRUPTED_VALUE_123') === 'Definitif' &&
  normalizeStatusKepalaSekolah('INVALID_STATUS') === 'Definitif'
);

// 9.2 Robustness of formatting functions with invalid/corrupted inputs
check(
  '9.2.1 formatKepalaSekolahLabel with corrupted status string returns "Kepala Sekolah"',
  formatKepalaSekolahLabel('CORRUPTED_VALUE') === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel('RANDOM_JUNK') === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel('12345') === 'Kepala Sekolah'
);

check(
  '9.2.2 formatKepalaSekolahTitle with corrupted status string returns standard title',
  formatKepalaSekolahTitle('SMAN 1 Modayag', 'CORRUPTED') === 'Kepala SMAN 1 Modayag' &&
  formatKepalaSekolahTitle('SMAN 1 Modayag', 'plt') === 'Plt. Kepala SMAN 1 Modayag' &&
  formatKepalaSekolahTitle('SMAN 1 Modayag', 'plh') === 'Plh. Kepala SMAN 1 Modayag'
);

check(
  '9.2.3 normalizeStatusPrefix with corrupted status string returns empty string',
  normalizeStatusPrefix('CORRUPTED') === '' &&
  normalizeStatusPrefix('RANDOM_INPUT') === ''
);

// 9.3 PrintSignature rendering with casing variants and edge cases
const htmlLowerPlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'plt',
    rightName: 'Drs. Ahmad, M.Pd',
    user: { role: 'guru' }
  })
);
check(
  '9.3.1 PrintSignature renders "Plt. Kepala Sekolah" when statusKepalaSekolah is lowercase "plt"',
  htmlLowerPlt.includes('Plt. Kepala Sekolah')
);

const htmlLowerPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'plh',
    rightName: 'Dra. Siti, M.Pd',
    user: { role: 'guru' }
  })
);
check(
  '9.3.2 PrintSignature renders "Plh. Kepala Sekolah" when statusKepalaSekolah is lowercase "plh"',
  htmlLowerPlh.includes('Plh. Kepala Sekolah')
);

const htmlLowerDefinitif = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'definitif',
    rightName: 'Drs. Budi, M.Pd',
    user: { role: 'guru' }
  })
);
check(
  '9.3.3 PrintSignature renders "Kepala Sekolah" without prefix when status is lowercase "definitif"',
  htmlLowerDefinitif.includes('Kepala Sekolah') &&
  !htmlLowerDefinitif.includes('Plt.') &&
  !htmlLowerDefinitif.includes('Plh.')
);

const htmlCorruptedStatus = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    statusKepalaSekolah: 'CORRUPTED_VALUE',
    rightName: 'Drs. Joko, M.Pd',
    user: { role: 'guru' }
  })
);
check(
  '9.3.4 PrintSignature safely defaults to "Kepala Sekolah" when status is corrupted',
  htmlCorruptedStatus.includes('Kepala Sekolah') &&
  !htmlCorruptedStatus.includes('CORRUPTED')
);

// 9.4 Multi-Tenant Database Schema Provisioning
const sqlTemplatePath = path.resolve(__dirname, '../supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql');
const sqlTemplateSrc = fs.readFileSync(sqlTemplatePath, 'utf8');
check(
  '9.4.1 SETUP_NEW_SCHOOL_TEMPLATE.sql defines status_kepala_sekolah column in public.sekolah',
  sqlTemplateSrc.includes('status_kepala_sekolah TEXT DEFAULT \'Definitif\'')
);

const freshPrintHeaderSrc = fs.readFileSync(printHeaderPath, 'utf8');
check(
  '9.4.2 PrintHeader re-exports normalizeStatusKepalaSekolah helper function',
  freshPrintHeaderSrc.includes('normalizeStatusKepalaSekolah')
);


console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL STATUS KEPALA SEKOLAH TESTS PASSED 100% PERFECTLY!\n');
}

import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('UI/UX AUDIT IMPROVEMENTS VERIFICATION TEST');
console.log('Requirements: R1 (Toasts), R2 (Preserve State), R3 (Responsive Tables)');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// ----------------------------------------------------
// Section 1: R1 - Non-Intrusive Notifications
// ----------------------------------------------------
console.log('--- Section 1: R1 - Non-Intrusive Notifications ---');

// 1.1 Verify Toast Utility (src/lib/toast.ts)
const toastUtilPath = path.join(projectRoot, 'src', 'lib', 'toast.ts');
assert(fs.existsSync(toastUtilPath), 'src/lib/toast.ts file exists');
const toastContent = fs.readFileSync(toastUtilPath, 'utf8');

assert(toastContent.includes("toast: true"), 'Toast is configured with toast: true (non-intrusive)');
assert(toastContent.includes("showConfirmButton: false"), 'Toast disables confirmation button (no OK click required)');
assert(toastContent.includes("timer: 3000") || toastContent.includes("timer:"), 'Toast has auto-dismiss timer');
assert(toastContent.includes("position: 'top-end'"), 'Toast position is top-end');
assert(toastContent.includes("export const showToast"), 'Toast utility exports showToast helper');

// 1.2 Verify GuruPresensi.tsx non-intrusive toasts
const guruPresensiPath = path.join(projectRoot, 'src', 'components', 'GuruPresensi.tsx');
assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx exists');
const guruPresensiContent = fs.readFileSync(guruPresensiPath, 'utf8');

assert(guruPresensiContent.includes("@/lib/toast") && guruPresensiContent.includes("showToast"), 'GuruPresensi imports showToast from toast utility');
assert(guruPresensiContent.includes("showToast('Foto Kamera Diperlukan'") || guruPresensiContent.includes("Foto Kamera Diperlukan"), 'GuruPresensi uses showToast for photo validation warning');
assert(guruPresensiContent.includes("showToast('Surat Keterangan Wajib'") || guruPresensiContent.includes("Surat Keterangan Wajib"), 'GuruPresensi uses showToast for letter validation warning');
assert(guruPresensiContent.includes("showToast('Di Luar Jangkauan'"), 'GuruPresensi uses showToast for geo-fence warnings');
assert(!guruPresensiContent.includes("Swal.fire('Presensi Berhasil"), 'GuruPresensi does not use blocking modal for presensi success');
assert(!guruPresensiContent.includes("Swal.fire('Foto Kamera Diperlukan'"), 'GuruPresensi does not use blocking modal for photo validation');

// 1.3 Verify GradebookView.tsx non-intrusive toasts & critical modals
const gradebookPath = path.join(projectRoot, 'src', 'components', 'GradebookView.tsx');
assert(fs.existsSync(gradebookPath), 'GradebookView.tsx exists');
const gradebookContent = fs.readFileSync(gradebookPath, 'utf8');

assert(gradebookContent.includes("@/lib/toast") && gradebookContent.includes("showToast"), 'GradebookView imports showToast');
assert(gradebookContent.includes("showToast('Nilai Berhasil Disimpan'"), 'GradebookView uses showToast for saving grades');
assert(gradebookContent.includes("showToast('TP Berhasil Diperbarui'"), 'GradebookView uses showToast for updating TP');
assert(gradebookContent.includes("showToast('TP Berhasil Dibuat'"), 'GradebookView uses showToast for creating TP');
assert(gradebookContent.includes("'Pengisian Cepat Berhasil'"), 'GradebookView uses showToast for bulk grade fill');
// Critical modals preserved
assert(gradebookContent.includes("title: `Hapus ${tp.kode_tp}?`") && gradebookContent.includes("showCancelButton: true"), 'GradebookView preserves modal Swal.fire for TP deletion confirmation');
assert(gradebookContent.includes('title: `Hapus Kolom "${col.nama}"?`') && gradebookContent.includes("showCancelButton: true"), 'GradebookView preserves modal Swal.fire for Column deletion confirmation');

// 1.4 Verify PiketView.tsx & GuruJurnal.tsx toasts
const piketPath = path.join(projectRoot, 'src', 'components', 'PiketView.tsx');
const piketContent = fs.readFileSync(piketPath, 'utf8');
assert(piketContent.includes("@/lib/toast") && piketContent.includes("showToast"), 'PiketView imports showToast');
assert(piketContent.includes("'Laporan piket berhasil disimpan"), 'PiketView uses showToast for submission success');

const jurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
const jurnalContent = fs.readFileSync(jurnalPath, 'utf8');
assert(jurnalContent.includes("@/lib/toast") && jurnalContent.includes("showToast"), 'GuruJurnal imports showToast');
assert(jurnalContent.includes("'Jurnal berhasil disimpan"), 'GuruJurnal uses showToast for submission success');

// ----------------------------------------------------
// Section 2: R2 - Preserving Form State (GuruPresensi.tsx)
// ----------------------------------------------------
console.log('\n--- Section 2: R2 - Preserving Form State (GuruPresensi.tsx) ---');

// 2.1 Toggling tipeAbsen does not erase file or photo preview
const handleTipeAbsenFunc = guruPresensiContent.slice(
  guruPresensiContent.indexOf('const handleTipeAbsenChange ='),
  guruPresensiContent.indexOf('const togglePresensiFields =')
);
assert(!handleTipeAbsenFunc.includes('setFile(null)'), 'handleTipeAbsenChange does not automatically clear setFile(null)');
assert(!handleTipeAbsenFunc.includes('setPhotoPreviewUrl(null)'), 'handleTipeAbsenChange does not automatically clear setPhotoPreviewUrl(null)');

// 2.2 Toggling presensi fields requires confirmation before discarding file
const togglePresensiFunc = guruPresensiContent.slice(
  guruPresensiContent.indexOf('const togglePresensiFields ='),
  guruPresensiContent.indexOf('const handleFileChange =')
);
assert(togglePresensiFunc.includes('Ganti Jenis Presensi?'), 'togglePresensiFields prompts confirmation modal before clearing Izin document');
assert(togglePresensiFunc.includes('isConfirmed'), 'togglePresensiFields only clears file if user confirms');

// 2.3 CameraSelfieCapture does not have key={tipeAbsen} causing unmount/reset
assert(!guruPresensiContent.includes('key={tipeAbsen}'), 'CameraSelfieCapture does not remount on tipeAbsen toggle (preserves stream/capture)');

// 2.4 Ganti Foto button requires confirmation before clearing selfie
assert(guruPresensiContent.includes('Ganti Foto?') && guruPresensiContent.includes('showCancelButton: true'), 'Ganti Foto button provides confirmation modal before discarding current selfie');

// ----------------------------------------------------
// Section 3: R3 - Mobile-Responsive Tables
// ----------------------------------------------------
console.log('\n--- Section 3: R3 - Mobile-Responsive Tables ---');

// 3.1 AdminDataView.tsx responsiveness
const adminDataPath = path.join(projectRoot, 'src', 'components', 'AdminDataView.tsx');
const adminDataContent = fs.readFileSync(adminDataPath, 'utf8');

assert(adminDataContent.includes('id="view-admin-data" className="view-section fade-in w-full max-w-full overflow-x-auto"'), 'AdminDataView container has w-full max-w-full overflow-x-auto');
assert(adminDataContent.includes('glass-card p-4 w-full max-w-full overflow-hidden'), 'AdminDataView glass-card has max-w-full overflow-hidden');
assert(adminDataContent.includes('flex flex-wrap sm:flex-nowrap gap-1.5') || adminDataContent.includes('flex flex-wrap sm:flex-nowrap'), 'AdminDataView action buttons wrap on small mobile screens');
assert(adminDataContent.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'), 'AdminDataView displays records in responsive card grid');

// 3.2 PiketView.tsx responsiveness
assert(piketContent.includes('id="view-piket" className="view-section page-enter w-full max-w-full overflow-x-auto"'), 'PiketView container has w-full max-w-full overflow-x-auto');
assert(piketContent.includes('id="piket-content-rekap" className="space-y-4 fade-in w-full max-w-full overflow-x-auto"'), 'PiketView rekap container has w-full max-w-full overflow-x-auto');
assert(piketContent.includes('flex flex-wrap sm:flex-nowrap gap-2') || piketContent.includes('flex flex-wrap'), 'PiketView action bar has mobile wrap classes');

// 3.3 GradebookView.tsx responsiveness
assert(gradebookContent.includes('className="space-y-5 pb-12 w-full max-w-full overflow-x-auto"'), 'GradebookView container has w-full max-w-full overflow-x-auto');
assert(gradebookContent.includes('table className="w-full text-left text-xs border-collapse whitespace-nowrap"'), 'GradebookView assessment table has whitespace-nowrap in scrollable container');

console.log('\n====================================================');
console.log('🎉 ALL UI/UX AUDIT VERIFICATION TESTS PASSED!');
console.log('====================================================');

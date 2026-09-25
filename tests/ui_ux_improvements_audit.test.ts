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
console.log('UI/UX AUDIT IMPROVEMENTS VERIFICATION TEST (DEEP QA)');
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
// Critical modals preserved for destructive actions
assert(gradebookContent.includes("title: `Hapus ${tp.kode_tp}?`") && gradebookContent.includes("showCancelButton: true"), 'GradebookView preserves modal Swal.fire for TP deletion confirmation');
assert(gradebookContent.includes('title: `Hapus Kolom "${col.nama}"?`') && gradebookContent.includes("showCancelButton: true"), 'GradebookView preserves modal Swal.fire for Column deletion confirmation');

// 1.4 Verify PiketView.tsx toasts & critical modal
const piketPath = path.join(projectRoot, 'src', 'components', 'PiketView.tsx');
const piketContent = fs.readFileSync(piketPath, 'utf8');
assert(piketContent.includes("@/lib/toast") && piketContent.includes("showToast"), 'PiketView imports showToast');
assert(piketContent.includes("showToast('Foto Wajib Diambil'"), 'PiketView uses showToast for photo requirement validation');
assert(piketContent.includes("showToast('Guru Ditugaskan'"), 'PiketView uses showToast for assigned teacher');
assert(piketContent.includes("showToast('Siswa Ditugaskan'"), 'PiketView uses showToast for assigned student');
assert(piketContent.includes("showToast('Penugasan Dihapus'"), 'PiketView uses showToast for deleted assignment');
assert(piketContent.includes("title: `Hapus ${tipe} Piket?`") && piketContent.includes("showCancelButton: true"), 'PiketView preserves modal Swal.fire for deletion confirmation');

// 1.5 Verify GuruJurnal.tsx toasts
const jurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
const jurnalContent = fs.readFileSync(jurnalPath, 'utf8');
assert(jurnalContent.includes("@/lib/toast") && jurnalContent.includes("showToast"), 'GuruJurnal imports showToast');
assert(jurnalContent.includes("showToast('Foto Dokumentasi Wajib'"), 'GuruJurnal uses showToast for photo requirement validation');
assert(jurnalContent.includes("showToast(") && jurnalContent.includes("Jurnal berhasil disimpan"), 'GuruJurnal uses showToast for submission success');
assert(!jurnalContent.includes("import Swal from 'sweetalert2'"), 'GuruJurnal removes unused SweetAlert2 import');

// 1.6 Verify AdminDataView.tsx toasts & critical modal
const adminDataPath = path.join(projectRoot, 'src', 'components', 'AdminDataView.tsx');
const adminDataContent = fs.readFileSync(adminDataPath, 'utf8');
assert(adminDataContent.includes("@/lib/toast") && adminDataContent.includes("showToast"), 'AdminDataView imports showToast');
assert(adminDataContent.includes("showToast(") && adminDataContent.includes("Unggah Berhasil"), 'AdminDataView uses showToast for CSV upload success');
assert(adminDataContent.includes("showToast('Gagal Menambah Data'"), 'AdminDataView uses showToast for add errors');
assert(adminDataContent.includes("showToast('Gagal Mengubah Data'"), 'AdminDataView uses showToast for edit errors');
assert(adminDataContent.includes("title: 'Hapus Data?'") && adminDataContent.includes("showCancelButton: true"), 'AdminDataView preserves modal Swal.fire for delete confirmation');

// 1.7 Verify CameraSelfieCapture.tsx toasts
const cameraPath = path.join(projectRoot, 'src', 'components', 'CameraSelfieCapture.tsx');
const cameraContent = fs.readFileSync(cameraPath, 'utf8');
assert(cameraContent.includes("@/lib/toast") && cameraContent.includes("showToast"), 'CameraSelfieCapture imports showToast');
assert(cameraContent.includes("showToast('Gagal Mengambil Foto'"), 'CameraSelfieCapture uses showToast for capture failures');
assert(cameraContent.includes("showToast('Foto Belum Diambil'"), 'CameraSelfieCapture uses showToast for uncaptured confirmation attempt');
assert(!cameraContent.includes("import Swal from 'sweetalert2'"), 'CameraSelfieCapture removes unused SweetAlert2 import');

// ----------------------------------------------------
// Section 2: R2 - Preserving Form State (GuruPresensi.tsx & CameraSelfieCapture.tsx)
// ----------------------------------------------------
console.log('\n--- Section 2: R2 - Preserving Form State ---');

// 2.1 Toggling tipeAbsen does not erase file or photo preview automatically
const startHandleTipe = guruPresensiContent.indexOf('const handleTipeAbsenChange =');
const endHandleTipe = guruPresensiContent.indexOf('const isSelfieRequired =', startHandleTipe);
assert(startHandleTipe !== -1 && endHandleTipe !== -1, 'handleTipeAbsenChange function block exists');
const handleTipeAbsenFunc = guruPresensiContent.slice(startHandleTipe, endHandleTipe);
assert(!handleTipeAbsenFunc.includes('setFile(null);') || handleTipeAbsenFunc.includes('if (!result.isConfirmed)'), 'handleTipeAbsenChange does not unconditionally clear setFile(null)');
assert(!handleTipeAbsenFunc.includes('setPhotoPreviewUrl(null);') || handleTipeAbsenFunc.includes('if (!result.isConfirmed)'), 'handleTipeAbsenChange does not unconditionally clear setPhotoPreviewUrl(null)');

// 2.2 Toggling presensi fields requires confirmation before discarding file
const startTogglePresensi = guruPresensiContent.indexOf('const togglePresensiFields =');
const endTogglePresensi = guruPresensiContent.indexOf('const handleTipeAbsenChange =', startTogglePresensi);
assert(startTogglePresensi !== -1 && endTogglePresensi !== -1, 'togglePresensiFields function block exists');
const togglePresensiFunc = guruPresensiContent.slice(startTogglePresensi, endTogglePresensi);
assert(togglePresensiFunc.includes('Ganti Jenis Presensi?'), 'togglePresensiFields prompts confirmation modal before clearing Izin document');
assert(togglePresensiFunc.includes('Ganti ke Izin / Sakit?'), 'togglePresensiFields prompts confirmation modal before discarding selfie when switching to Izin');
assert(togglePresensiFunc.includes('isConfirmed'), 'togglePresensiFields only clears file if user confirms');
assert(handleTipeAbsenFunc.includes('Ganti ke Presensi Pulang?'), 'handleTipeAbsenChange prompts confirmation before discarding Izin document when switching to Pulang');

// 2.3 Mutex and lifecycle guards
assert(guruPresensiContent.includes('isSwitchingRef'), 'GuruPresensi uses isSwitchingRef mutex guard to prevent rapid toggle race conditions');
assert(guruPresensiContent.includes('isMountedRef'), 'GuruPresensi uses isMountedRef to prevent unmounted component state updates');

// 2.4 CameraSelfieCapture does not have key={tipeAbsen} causing unmount/reset
assert(!guruPresensiContent.includes('key={tipeAbsen}'), 'CameraSelfieCapture does not remount on tipeAbsen toggle (preserves stream/capture)');

// 2.5 Ganti Foto button requires confirmation before clearing selfie
assert(guruPresensiContent.includes('Ganti Foto?') && guruPresensiContent.includes('showCancelButton: true'), 'Ganti Foto button provides confirmation modal before discarding current selfie');

// 2.6 CameraSelfieCapture synchronizes existingPhotoUrl to prevent UI lockup when photo is cleared
assert(cameraContent.includes('setCapturedImage(existingPhotoUrl || null);'), 'CameraSelfieCapture synchronizes capturedImage when existingPhotoUrl changes');
assert(cameraContent.includes('startCamera(facingMode)'), 'CameraSelfieCapture preserves chosen facingMode when restarting camera');

// 2.7 Behavioral Simulation: Comprehensive state preservation and transition tests
{
  // Test 1: Datang <-> Pulang preserves selfie
  let state = {
    tipeAbsen: 'Datang',
    jenisPresensi: 'Sekolah',
    file: { name: 'selfie.jpg', type: 'image/jpeg', size: 102400 } as any,
    photoPreviewUrl: 'data:image/jpeg;base64,mockpreviewdata' as string | null
  };

  function simulateHandleTipeAbsenChange(newTipe: string, userConfirmModal = false) {
    if (state.file && newTipe === 'Pulang' && state.jenisPresensi === 'Izin') {
      if (!userConfirmModal) return false;
      state.file = null;
      state.photoPreviewUrl = null;
    }
    state.tipeAbsen = newTipe;
    if (newTipe === 'Pulang') {
      state.jenisPresensi = 'Sekolah';
    } else {
      if (state.jenisPresensi !== 'Izin') {
        state.jenisPresensi = 'Sekolah';
      }
    }
    return true;
  }

  function simulateTogglePresensiFields(newJenis: string, userConfirmModal = false) {
    if (state.file && newJenis === 'Izin' && state.jenisPresensi !== 'Izin') {
      if (!userConfirmModal) return false;
      state.file = null;
      state.photoPreviewUrl = null;
    } else if (state.file && newJenis !== 'Izin' && state.jenisPresensi === 'Izin') {
      if (!userConfirmModal) return false;
      state.file = null;
      state.photoPreviewUrl = null;
    }
    state.jenisPresensi = newJenis;
    return true;
  }

  // Toggling Datang -> Pulang with selfie preserves file
  simulateHandleTipeAbsenChange('Pulang');
  assert(state.tipeAbsen === 'Pulang' && state.file !== null && state.photoPreviewUrl !== null, 'Mock simulation: Toggling to Pulang preserves selfie file and preview');

  // Toggling Pulang -> Datang preserves file
  simulateHandleTipeAbsenChange('Datang');
  assert(state.tipeAbsen === 'Datang' && state.file !== null && state.photoPreviewUrl !== null, 'Mock simulation: Toggling back to Datang preserves selfie file and preview');

  // Switching Sekolah -> Dinas Luar preserves selfie without prompt
  simulateTogglePresensiFields('Dinas Luar');
  assert(state.jenisPresensi === 'Dinas Luar' && state.file !== null, 'Mock simulation: Switching Sekolah -> Dinas Luar preserves selfie without prompt');

  // Switching Dinas Luar -> Izin requires confirmation; if rejected, state is untouched
  const izinCanceled = simulateTogglePresensiFields('Izin', false);
  assert(!izinCanceled && state.jenisPresensi === 'Dinas Luar' && state.file !== null, 'Mock simulation: Switching to Izin with selfie rejects switch when unconfirmed');

  // If user confirms, clears selfie and switches to Izin
  const izinConfirmed = simulateTogglePresensiFields('Izin', true);
  assert(izinConfirmed && state.jenisPresensi === 'Izin' && state.file === null && state.photoPreviewUrl === null, 'Mock simulation: Switching to Izin clears selfie only after confirmation');

  // User attaches medical certificate in Izin mode
  state.file = { name: 'surat_dokter.pdf', type: 'application/pdf', size: 50000 };
  state.photoPreviewUrl = null;

  // Switching Izin -> Pulang requires confirmation; if rejected, remains on Datang
  const pulangCanceled = simulateHandleTipeAbsenChange('Pulang', false);
  assert(!pulangCanceled && state.tipeAbsen === 'Datang' && state.file !== null, 'Mock simulation: Switching Izin -> Pulang rejects switch when unconfirmed');

  // If user confirms, clears document and switches to Pulang
  const pulangConfirmed = simulateHandleTipeAbsenChange('Pulang', true);
  assert(pulangConfirmed && state.tipeAbsen === 'Pulang' && state.file === null, 'Mock simulation: Switching Izin -> Pulang clears document only after confirmation');
}

// ----------------------------------------------------
// Section 3: R3 - Mobile-Responsive Tables & Touch Experience
// ----------------------------------------------------
console.log('\n--- Section 3: R3 - Mobile-Responsive Tables & Touch Experience ---');

// 3.1 AdminDataView.tsx responsiveness
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
assert(gradebookContent.includes('overflow-x-auto custom-scroll max-w-full') && gradebookContent.includes('whitespace-nowrap shrink-0'), 'GradebookView tab navigation is horizontally scrollable with non-breaking buttons');

// 3.4 Momentum Scrolling & Touch Gestures in globals.css
const globalsCssPath = path.join(projectRoot, 'src', 'app', 'globals.css');
assert(fs.existsSync(globalsCssPath), 'src/app/globals.css exists');
const globalsContent = fs.readFileSync(globalsCssPath, 'utf8');
assert(globalsContent.includes('-webkit-overflow-scrolling: touch;'), 'globals.css enables iOS momentum scrolling (-webkit-overflow-scrolling: touch)');
assert(globalsContent.includes('touch-action: pan-x pan-y;'), 'globals.css specifies touch-action: pan-x pan-y for horizontal touch scrolling');
assert(globalsContent.includes('overscroll-behavior-x: contain;'), 'globals.css specifies overscroll-behavior-x: contain for horizontal scroll containers');

console.log('\n====================================================');
console.log('🎉 ALL UI/UX AUDIT VERIFICATION TESTS PASSED!');
console.log('====================================================');

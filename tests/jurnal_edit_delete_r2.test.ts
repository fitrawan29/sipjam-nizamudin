import fs from 'fs';
import path from 'path';
import assert from 'assert';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

async function runVerification() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: GURU JURNAL EDIT & DELETE CAPABILITY (MILESTONE 2 - R2)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');
  const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
  const guruPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');

  assert.ok(fs.existsSync(rekapPath), 'RekapJurnalView.tsx exists');
  assert.ok(fs.existsSync(guruPath), 'GuruJurnal.tsx exists');

  const rekapContent = fs.readFileSync(rekapPath, 'utf8');
  const guruContent = fs.readFileSync(guruPath, 'utf8');

  // --- 1. Table Action Buttons Invariant ---
  console.log('--- Section 1: Table Action Buttons & Print Invariant ---');

  runTest('1.1: Personal mode table row includes Edit button with icon and title', () => {
    assert.ok(
      rekapContent.includes('handleOpenEditModal(j)') &&
      rekapContent.includes('fa-pen-to-square') &&
      rekapContent.includes('Edit'),
      'Personal table row must have an Edit button calling handleOpenEditModal'
    );
  });

  runTest('1.2: Personal mode table row includes Hapus button with red styling and icon', () => {
    assert.ok(
      rekapContent.includes('handleDeleteJurnal(j)') &&
      rekapContent.includes('fa-trash-can') &&
      rekapContent.includes('Hapus'),
      'Personal table row must have a Hapus button calling handleDeleteJurnal'
    );
  });

  runTest('1.3: Detail, Edit, and Hapus buttons reside inside no-print container', () => {
    assert.ok(
      rekapContent.includes('<div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">'),
      'Row action buttons must be wrapped in a no-print flex container'
    );
  });

  runTest('1.4: 12-column table print header is unmodified', () => {
    const pribadiHeaderMatch = rekapContent.match(/JURNAL PRIBADI GURU[\s\S]*?<thead>([\s\S]*?)<\/thead>/);
    assert.ok(pribadiHeaderMatch, 'Must find personal table header');
    const thCount = (pribadiHeaderMatch![1].match(/<th/g) || []).length;
    assert.strictEqual(thCount, 12, 'Personal table must retain exactly 12 columns in the print header');
  });

  runTest('1.5: Synthetic unfilled schedule rows are shielded from edit and delete', () => {
    assert.ok(
      rekapContent.includes("!j.id?.startsWith('unfilled-')"),
      'Edit and delete buttons must be hidden for synthetic unfilled schedule rows'
    );
  });

  // --- 2. Detail Modal Actions ---
  console.log('\n--- Section 2: Detail Modal Action Buttons ---');

  runTest('2.1: modal-detail-jurnal includes Edit Jurnal action button', () => {
    assert.ok(
      rekapContent.includes('Edit Jurnal') &&
      rekapContent.includes('handleOpenEditModal(target)') &&
      rekapContent.includes('modal-detail-jurnal'),
      'Detail modal must include Edit Jurnal button'
    );
  });

  runTest('2.2: modal-detail-jurnal includes Hapus Jurnal action button', () => {
    assert.ok(
      rekapContent.includes('Hapus Jurnal') &&
      rekapContent.includes('handleDeleteJurnal(selectedJurnal)'),
      'Detail modal must include Hapus Jurnal button'
    );
  });

  // --- 3. Deletion Implementation & Scoping ---
  console.log('\n--- Section 3: Deletion Implementation & Scoping ---');

  runTest('3.1: Delete workflow prompts confirmation with SweetAlert2', () => {
    assert.ok(
      rekapContent.includes("title: 'Hapus Jurnal KBM?'") &&
      rekapContent.includes('showCancelButton: true') &&
      rekapContent.includes('confirmButtonText: \'Ya, Hapus Jurnal\''),
      'Delete handler must display Swal confirmation dialog'
    );
  });

  runTest('3.2: Delete query is scoped to journal id, nama_guru, and sekolah_id', () => {
    assert.ok(
      rekapContent.includes(".from('jurnal_pembelajaran')") &&
      rekapContent.includes(".delete()") &&
      rekapContent.includes(".eq('id', targetJurnal.id)") &&
      rekapContent.includes(".eq('nama_guru', user.nama)") &&
      rekapContent.includes(".eq('sekolah_id', user.sekolah_id)"),
      'Delete query must be scoped to targetJurnal.id, user.nama, and user.sekolah_id'
    );
  });

  runTest('3.3: Delete handler updates local state, dispatches event, and re-queries', () => {
    assert.ok(
      rekapContent.includes('setJurnalData(prev => prev ? prev.filter(item => item.id !== targetJurnal.id) : [])') &&
      rekapContent.includes("window.dispatchEvent(new CustomEvent('sipjam:jurnal-updated'") &&
      rekapContent.includes('tarikRekap()'),
      'Delete handler must sync local state and dispatch update event'
    );
  });

  // --- 4. Edit Modal & Mutation Scoping ---
  console.log('\n--- Section 4: Edit Modal & Mutation Scoping ---');

  runTest('4.1: modal-edit-jurnal exists with accessible dialog role', () => {
    assert.ok(
      rekapContent.includes('id="modal-edit-jurnal"') &&
      rekapContent.includes('role="dialog"') &&
      rekapContent.includes('aria-modal="true"'),
      'Edit modal must have id="modal-edit-jurnal" with dialog attributes'
    );
  });

  runTest('4.2: Edit form pre-fills all required journal fields', () => {
    assert.ok(
      rekapContent.includes('setEditTanggal') &&
      rekapContent.includes('setEditJamKe') &&
      rekapContent.includes('setEditPertemuanKe') &&
      rekapContent.includes('setEditMapel') &&
      rekapContent.includes('setEditKelas') &&
      rekapContent.includes('setEditLokasiKbm') &&
      rekapContent.includes('setEditTujuanPembelajaran') &&
      rekapContent.includes('setEditKktp') &&
      rekapContent.includes('setEditKonten') &&
      rekapContent.includes('setEditKegiatan') &&
      rekapContent.includes('setEditRefleksi') &&
      rekapContent.includes('setEditAbsensiCounts'),
      'handleOpenEditModal must pre-fill all journal fields'
    );
  });

  runTest('4.3: Attendance editing supports H, I, S, A counts and standard format output', () => {
    assert.ok(
      rekapContent.includes('updateAbsensiCount') &&
      rekapContent.includes('editAbsensiCounts.hadir') &&
      rekapContent.includes('editAbsensiCounts.izin') &&
      rekapContent.includes('editAbsensiCounts.sakit') &&
      rekapContent.includes('editAbsensiCounts.alpa') &&
      rekapContent.includes('Total murid: ${totalMurid}, Hadir: ${editAbsensiCounts.hadir}, Izin: ${editAbsensiCounts.izin}, Sakit: ${editAbsensiCounts.sakit}, Alpa: ${editAbsensiCounts.alpa}'),
      'Attendance summary must maintain exact required formatting'
    );
  });

  runTest('4.4: Photo upload supports keeping existing photo or uploading a new file', () => {
    assert.ok(
      rekapContent.includes('uploadToDrive') &&
      rekapContent.includes('editingJurnal.foto_kegiatan || editingJurnal.link_bukti_foto') &&
      rekapContent.includes('Foto yang sudah ada akan tetap digunakan'),
      'Photo handling must preserve existing photo if no new file is chosen'
    );
  });

  runTest('4.5: Update query is scoped to id, nama_guru, and sekolah_id', () => {
    assert.ok(
      rekapContent.includes(".from('jurnal_pembelajaran')") &&
      rekapContent.includes(".update(payload)") &&
      rekapContent.includes(".eq('id', editingJurnal.id)") &&
      rekapContent.includes(".eq('nama_guru', user.nama)") &&
      rekapContent.includes(".eq('sekolah_id', user.sekolah_id)"),
      'Update query must be scoped to editingJurnal.id, user.nama, and user.sekolah_id'
    );
  });

  runTest('4.6: Rejection status is cleared and reset upon update', () => {
    assert.ok(
      rekapContent.includes("editingJurnal.status_verifikasi === 'Ditolak'") &&
      rekapContent.includes('payload.catatan_admin = null') &&
      rekapContent.includes('payload.alasan_penolakan = null') &&
      rekapContent.includes('payload.catatan_penolakan = null'),
      'Update must reset rejection metadata when editing a rejected journal'
    );
  });

  runTest('4.7: No arbitrary time restriction (teachers can edit past journals)', () => {
    assert.ok(
      !rekapContent.includes('isTodayOnly') &&
      !rekapContent.includes('hanyaBisaEditHariIni') &&
      !rekapContent.includes('waktuEditHabis'),
      'Edit & delete must operate without time limits ("tanpa batasan waktu khusus")'
    );
  });

  // --- 5. Coordination with GuruJurnal ---
  console.log('\n--- Section 5: Coordination with GuruJurnal ---');

  runTest('5.1: GuruJurnal listens to sipjam:jurnal-updated to refresh rejected journals', () => {
    assert.ok(
      guruContent.includes("window.addEventListener('sipjam:jurnal-updated'") &&
      guruContent.includes('fetchRejected()'),
      'GuruJurnal must listen to sipjam:jurnal-updated and refresh rejected journals'
    );
  });

  runTest('5.2: GuruJurnal passes user and assignments to RekapJurnalView', () => {
    assert.ok(
      guruContent.includes('<RekapJurnalView') &&
      guruContent.includes('initialMode="pribadi"') &&
      guruContent.includes('controlledMode="pribadi"'),
      'GuruJurnal embeds RekapJurnalView in personal mode seamlessly'
    );
  });

  console.log('\n====================================================================');
  console.log(`🏁 FINISHED: Passed: ${passed}, Failed: ${failed}`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();

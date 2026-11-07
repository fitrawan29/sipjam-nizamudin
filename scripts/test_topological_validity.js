const fs = require('fs');

// All 33 tables
const schema = {
  // L0
  sekolah: { fks: [] },
  sekolah_registry: { fks: [] },
  pengaturan: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },

  // L1
  users: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  data_mapel: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  data_kelas: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  data_siswa: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  kalender_pendidikan: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  sistem_blok: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  syarat_perangkat_pembelajaran: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  jadwal_piket: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  piket_form_lock: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  pengumuman: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  riwayat_backup: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },

  // L2
  data_guru: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'user_id', ref: 'users' }] },
  jadwal_pelajaran: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'user_id', ref: 'users' }] },
  presensi_siswa: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'siswa_id', ref: 'data_siswa' }] },
  absensi: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  bank_dokumen: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }] },
  chat_messages: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'sender_id', ref: 'users' }, { col: 'receiver_id', ref: 'users' }] },
  push_subscriptions: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'user_id', ref: 'users' }] },
  pengumuman_dibaca: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'pengumuman_id', ref: 'pengumuman' }, { col: 'user_id', ref: 'users' }] },
  pengumuman_tanggapan: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'pengumuman_id', ref: 'pengumuman' }, { col: 'user_id', ref: 'users' }] },
  presensi_guru: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'user_id', ref: 'users' }] },
  jurnal_pembelajaran: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'user_id', ref: 'users' }] },
  laporan_piket: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'user_id', ref: 'users' }] },

  // L3
  guru_mapel: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'guru_id', ref: 'data_guru' }] },
  wali_kelas: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'guru_id', ref: 'data_guru' }] },
  penugasan_piket: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'guru_id', ref: 'data_guru' }] },

  // L4
  capaian_pembelajaran: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'guru_mapel_id', ref: 'guru_mapel' }] },
  tujuan_pembelajaran: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'cp_id', ref: 'capaian_pembelajaran' }, { col: 'guru_id', ref: 'data_guru' }] },

  // L5
  asesmen_kolom: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'tp_id', ref: 'tujuan_pembelajaran' }] },
  nilai_siswa: { fks: [{ col: 'sekolah_id', ref: 'sekolah' }, { col: 'tp_id', ref: 'tujuan_pembelajaran' }, { col: 'asesmen_id', ref: 'asesmen_kolom' }] }
};

// Proposed Level Organization:
const proposedLevels = [
  // Level 0: Independent Root Entities
  {
    level: 0,
    name: "Independent Root Tables",
    description: "Tabel induk akar multi-tenant dan konfigurasi tanpa dependensi pada entitas operasional.",
    tables: ['sekolah', 'sekolah_registry', 'pengaturan']
  },
  // Level 1: Core System & Primary Master Data
  {
    level: 1,
    name: "Core Master & Config Tables",
    description: "Tabel pengguna, kalender, kurikulum, dan master data dasar yang hanya bergantung pada Level 0 (sekolah).",
    tables: [
      'users',
      'data_mapel',
      'data_kelas',
      'data_siswa',
      'kalender_pendidikan',
      'sistem_blok',
      'syarat_perangkat_pembelajaran',
      'jadwal_piket',
      'piket_form_lock',
      'pengumuman',
      'riwayat_backup'
    ]
  },
  // Level 2: Extended Master & Activity Transactions
  {
    level: 2,
    name: "Extended Master & Activity Transactions",
    description: "Master guru, presensi harian, jurnal KBM, pesan, dan dokumen yang bergantung pada Level 0 dan Level 1.",
    tables: [
      'data_guru',
      'jadwal_pelajaran',
      'presensi_guru',
      'jurnal_pembelajaran',
      'laporan_piket',
      'presensi_siswa',
      'absensi',
      'bank_dokumen',
      'chat_messages',
      'push_subscriptions',
      'pengumuman_dibaca',
      'pengumuman_tanggapan'
    ]
  },
  // Level 3: Teacher Relational Assignments
  {
    level: 3,
    name: "Teacher Relational Assignments",
    description: "Penugasan guru mengajar, wali kelas, dan penugasan piket yang bergantung pada data_guru (Level 2).",
    tables: [
      'guru_mapel',
      'wali_kelas',
      'penugasan_piket'
    ]
  },
  // Level 4: Learning Objectives & Curriculum
  {
    level: 4,
    name: "Learning Objectives & Curriculum",
    description: "Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) yang bergantung pada penugasan guru_mapel dan data_guru.",
    tables: [
      'capaian_pembelajaran',
      'tujuan_pembelajaran'
    ]
  },
  // Level 5: Assessment Columns & Student Grades
  {
    level: 5,
    name: "Assessment Columns & Student Grades",
    description: "Entitas terdalam buku nilai (asesmen_kolom dan nilai_siswa) yang bergantung pada tujuan_pembelajaran.",
    tables: [
      'asesmen_kolom',
      'nilai_siswa'
    ]
  }
];

// Verify total count
let totalCount = 0;
const seenTables = new Set();
proposedLevels.forEach(lvl => {
  totalCount += lvl.tables.length;
  lvl.tables.forEach(t => {
    if (seenTables.has(t)) console.error('DUPLICATE TABLE:', t);
    seenTables.add(t);
  });
});

console.log('Total tables in proposed levels:', totalCount);
console.log('Matches 33?', totalCount === 33);

// Verify that for every table in level N, all its FK references are in level <= N
// (and if in level N, it appears before it in the list)
const tableToGlobalOrder = {};
let orderIndex = 0;
proposedLevels.forEach(lvl => {
  lvl.tables.forEach(t => {
    tableToGlobalOrder[t] = orderIndex++;
  });
});

let violations = 0;
for (const [table, info] of Object.entries(schema)) {
  const currentOrder = tableToGlobalOrder[table];
  for (const fk of info.fks) {
    const targetOrder = tableToGlobalOrder[fk.ref];
    if (targetOrder >= currentOrder) {
      console.error(`VIOLATION: ${table} (order ${currentOrder}) depends on ${fk.ref} (order ${targetOrder})!`);
      violations++;
    }
  }
}

if (violations === 0) {
  console.log('PERFECT! All 33 tables satisfy strict topological ordering without ANY violations!');
} else {
  console.log('Violations found:', violations);
}

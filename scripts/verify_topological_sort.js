const fs = require('fs');

// Define all 33 tables and their explicit & logical FK dependencies
const tablesData = {
  // Level 0 candidates: Root independent tables
  "sekolah": {
    purpose: "Master data identitas dan konfigurasi multi-tenant sekolah (NPSN, alamat, kontak, logo, status).",
    pk: "id",
    tenantCol: null,
    fks: []
  },
  "sekolah_registry": {
    purpose: "Portal induk jaringan multi-sekolah untuk registry satelit dan koneksi antar instansi.",
    pk: "id",
    tenantCol: null,
    fks: []
  },

  // Level 1 candidates: Dependent strictly on Level 0 (sekolah)
  "users": {
    purpose: "Autentikasi akun pengguna (Superadmin, Admin, Guru, Piket, Wali Kelas).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: true }
    ]
  },
  "pengaturan": {
    purpose: "Konfigurasi parameter operasional sistem, jam kerja, kop sekolah, tahun ajaran.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "data_mapel": {
    purpose: "Master data mata pelajaran kurikulum (nama, kategori, kelompok, urutan).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "data_kelas": {
    purpose: "Master data direktori kelas sekolah (nama kelas, tingkat, jurusan).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "data_siswa": {
    purpose: "Master data siswa (NISN, nama siswa, kelas, gender, status, kontak ortu, QR code).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "kalender_pendidikan": {
    purpose: "Jadwal kalender akademik sekolah (hari libur, kegiatan semester, rentang tanggal).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "sistem_blok": {
    purpose: "Pengaturan periode sistem blok pembelajaran per target angkatan/kelas/guru.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "syarat_perangkat_pembelajaran": {
    purpose: "Daftar kriteria dokumen perangkat ajar wajib/opsional (RPP/Modul, Silabus/ATP, dll).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "jadwal_piket": {
    purpose: "Jadwal petugas piket harian sekolah berdasarkan hari operasional.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "piket_form_lock": {
    purpose: "Kunci konkurensi (lease lock) untuk pengisian formulir piket dan presensi siswa harian.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "pengumuman": {
    purpose: "Papan pengumuman informasi sekolah untuk guru, staf, atau umum.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },
  "riwayat_backup": {
    purpose: "Log audit riwayat aktivitas pencadangan dan pemulihan data sistem.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
    ]
  },

  // Level 2 candidates: Dependent on users, data_siswa, syarat_perangkat, pengumuman
  "data_guru": {
    purpose: "Master data guru/pendidik (NIP, nama guru, mapel yang diampu, kontak, user_id).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "jadwal_pelajaran": {
    purpose: "Jadwal mata pelajaran mingguan per kelas, hari, jam mengajar, dan user guru.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "presensi_siswa": {
    purpose: "Log transaksi presensi kehadiran siswa via QR/Kiosk (datang & pulang).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "siswa_id", target: "data_siswa", nullable: true }
    ]
  },
  "absensi": {
    purpose: "Catatan rekap absensi harian siswa per kelas (Hadir, Izin, Sakit, Alpa).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
      // siswa_id is optional logical reference to data_siswa
    ]
  },
  "bank_dokumen": {
    purpose: "Penyimpanan berkas perangkat ajar guru (Modul Ajar, Prota, Promes, dll).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false }
      // syarat_id optionally references syarat_perangkat_pembelajaran
    ]
  },
  "chat_messages": {
    purpose: "Pesan komunikasi internal antar pengguna sistem.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "sender_id", target: "users", nullable: true },
      { col: "receiver_id", target: "users", nullable: true }
    ]
  },
  "push_subscriptions": {
    purpose: "Kredensial langganan Web Push Notification per pengguna.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "pengumuman_dibaca": {
    purpose: "Tracking status pembacaan pengumuman per pengguna.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "pengumuman_id", target: "pengumuman", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "pengumuman_tanggapan": {
    purpose: "Komentar/tanggapan pengguna terhadap pengumuman sekolah.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "pengumuman_id", target: "pengumuman", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "presensi_guru": {
    purpose: "Transaksi presensi harian guru (datang, pulang, izin, sakit, koordinat, bukti selfie).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "jurnal_pembelajaran": {
    purpose: "Jurnal pelaksanaan KBM di kelas (materi, kegiatan, absensi murid, foto bukti).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },
  "laporan_piket": {
    purpose: "Laporan harian guru piket (rekap absen kelas, catatan apel, catatan kejadian).",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "user_id", target: "users", nullable: true }
    ]
  },

  // Level 3 candidates: Dependent on data_guru (Level 2)
  "guru_mapel": {
    purpose: "Pemetaan relasi guru pengampu mata pelajaran dan kelas ajar.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "guru_id", target: "data_guru", nullable: true }
    ]
  },
  "wali_kelas": {
    purpose: "Penugasan guru sebagai wali kelas untuk tahun ajaran aktif.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "guru_id", target: "data_guru", nullable: true }
    ]
  },
  "penugasan_piket": {
    purpose: "Penugasan guru piket individual per hari dalam seminggu.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "guru_id", target: "data_guru", nullable: true }
    ]
  },

  // Level 4 candidates: Dependent on guru_mapel / data_guru (Kurikulum Merdeka CP / TP)
  "capaian_pembelajaran": {
    purpose: "Master Capaian Pembelajaran (CP) Kurikulum Merdeka per mapel, tingkat, semester.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "guru_mapel_id", target: "guru_mapel", nullable: true }
    ]
  },
  "tujuan_pembelajaran": {
    purpose: "Tujuan Pembelajaran (TP) breakdown dari Capaian Pembelajaran (CP) per guru & mapel.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "cp_id", target: "capaian_pembelajaran", nullable: true },
      { col: "guru_id", target: "data_guru", nullable: true }
    ]
  },

  // Level 5 candidates: Dependent on tujuan_pembelajaran (Asesmen Kolom & Nilai Siswa)
  "asesmen_kolom": {
    purpose: "Kolom penilaian asesmen (Diagnostik, Formatif, Sumatif) per Tujuan Pembelajaran.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "tp_id", target: "tujuan_pembelajaran", nullable: false }
    ]
  },
  "nilai_siswa": {
    purpose: "Nilai perolehan siswa untuk setiap asesmen kolom dan tujuan pembelajaran.",
    pk: "id",
    tenantCol: "sekolah_id",
    fks: [
      { col: "sekolah_id", target: "sekolah", nullable: false },
      { col: "tp_id", target: "tujuan_pembelajaran", nullable: false },
      { col: "asesmen_id", target: "asesmen_kolom", nullable: false }
    ]
  }
};

console.log('Total tables registered:', Object.keys(tablesData).length);

// Calculate topological levels
const levels = {};
const resolved = new Set();

// Level 0: tables with 0 dependencies
levels[0] = [];
for (const [table, info] of Object.entries(tablesData)) {
  if (info.fks.length === 0) {
    levels[0].push(table);
    resolved.add(table);
  }
}

// Compute levels 1 through 5
for (let lvl = 1; lvl <= 5; lvl++) {
  levels[lvl] = [];
  for (const [table, info] of Object.entries(tablesData)) {
    if (resolved.has(table)) continue;
    // Check if all FK targets are in resolved
    const allResolved = info.fks.every(fk => resolved.has(fk.target));
    if (allResolved) {
      levels[lvl].push(table);
    }
  }
  levels[lvl].forEach(t => resolved.add(t));
}

console.log('Topological Sort Results:');
for (let lvl = 0; lvl <= 5; lvl++) {
  console.log(`Level ${lvl} (${levels[lvl].length} tables):`, levels[lvl]);
}

const unallocated = Object.keys(tablesData).filter(t => !resolved.has(t));
console.log('Unallocated tables:', unallocated);

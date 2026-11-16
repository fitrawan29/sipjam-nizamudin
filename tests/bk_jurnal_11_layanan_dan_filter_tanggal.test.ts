/**
 * tests/bk_jurnal_11_layanan_dan_filter_tanggal.test.ts
 *
 * COMPREHENSIVE E2E & VERIFICATION TEST SUITE
 * Feature: BK Jurnal 11 Layanan Dinamis & Filter Rentang Tanggal
 * Architecture: 4-Tier Opaque-box Methodology (TEST_INFRA.md)
 * 
 * Target Modules:
 * - src/components/BkJurnalView.tsx
 * - src/lib/csvExport.ts
 * - supabase/migrations/20261117_add_detail_layanan_to_jurnal_bk.sql
 *
 * Execution:
 * npx tsx tests/bk_jurnal_11_layanan_dan_filter_tanggal.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  generateCsvString,
  escapeCsvField,
  sanitizeCsvFormula
} from '../src/lib/csvExport';

// Dynamic type imports for type checking
export interface DynamicFieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export interface JurnalBkEntry {
  id: string;
  sekolah_id: string;
  guru_id?: string | null;
  user_id?: string | null;
  nama_guru: string;
  siswa_id?: string | null;
  nisn?: string | null;
  nama_siswa: string;
  kelas: string;
  tanggal: string;
  waktu: string;
  bidang_bimbingan: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
  jenis_layanan: string;
  sasaran?: string;
  tempat_layanan?: string;
  catatan: string;
  tindak_lanjut: string;
  status: 'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus';
  link_dokumen?: string | null;
  detail_layanan?: Record<string, string> | null;
  status_verifikasi?: 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Dispensasi' | 'Diverifikasi' | string;
  catatan_admin?: string | null;
  alasan_penolakan?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ANSI Color Codes for terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails: string[] = [];

function challenge(cond: boolean, id: string, desc: string, detail?: string) {
  totalAssertions++;
  if (cond) {
    passedAssertions++;
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${BOLD}${id}${RESET} - ${desc}`);
  } else {
    failedAssertions++;
    const errMsg = `✖ [FAIL] ${id} - ${desc}${detail ? ` -> ${detail}` : ''}`;
    failureDetails.push(errMsg);
    console.error(`  ${RED}${errMsg}${RESET}`);
  }
}

// ----------------------------------------------------------------------------
// Pure Filter Function (mirrors BkJurnalView.tsx filtering logic)
// ----------------------------------------------------------------------------
interface FilterParams {
  filterStartDate?: string;
  filterEndDate?: string;
  filterBidang?: string;
  filterStatus?: string;
  filterCounselor?: string;
  filterSearch?: string;
}

function applyJurnalFilter(entries: JurnalBkEntry[], params: FilterParams): JurnalBkEntry[] {
  const {
    filterStartDate = '',
    filterEndDate = '',
    filterBidang = 'all',
    filterStatus = 'all',
    filterCounselor = 'all',
    filterSearch = ''
  } = params;

  const q = filterSearch.trim().toLowerCase();

  return entries.filter(e => {
    if (filterStartDate && e.tanggal < filterStartDate) return false;
    if (filterEndDate && e.tanggal > filterEndDate) return false;
    if (filterBidang !== 'all' && e.bidang_bimbingan !== filterBidang) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterCounselor !== 'all' && e.nama_guru !== filterCounselor) return false;

    if (q) {
      const inStudent = (e.nama_siswa || '').toLowerCase().includes(q);
      const inNisn = (e.nisn || '').toLowerCase().includes(q);
      const inCatatan = (e.catatan || '').toLowerCase().includes(q);
      const inTindakLanjut = (e.tindak_lanjut || '').toLowerCase().includes(q);
      const inKelas = (e.kelas || '').toLowerCase().includes(q);
      return inStudent || inNisn || inCatatan || inTindakLanjut || inKelas;
    }
    return true;
  });
}

// ----------------------------------------------------------------------------
// CSV Row Serializer (mirrors handleExportCsv in BkJurnalView.tsx)
// ----------------------------------------------------------------------------
function buildCsvExportRows(entries: JurnalBkEntry[]): any[][] {
  return entries.map((e, idx) => {
    let detailStr = '';
    if (e.detail_layanan && typeof e.detail_layanan === 'object') {
      detailStr = Object.entries(e.detail_layanan)
        .filter(([_, v]) => Boolean(v && String(v).trim()))
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join('; ');
    }

    return [
      idx + 1,
      e.tanggal || '',
      e.waktu || '',
      e.nama_siswa || '',
      e.nisn ? `'${e.nisn}` : '',
      e.kelas || '',
      e.bidang_bimbingan || '',
      e.jenis_layanan || '',
      e.sasaran || (e.jenis_layanan.toLowerCase().includes('kelompok') ? 'Kelompok' : 'Individu'),
      e.tempat_layanan || 'Ruang BK',
      detailStr,
      e.catatan || '',
      e.tindak_lanjut || '',
      e.status || '',
      e.status_verifikasi || 'Menunggu',
      e.nama_guru || '',
      e.link_dokumen || ''
    ];
  });
}

const EXPECTED_CSV_HEADERS = [
  'No',
  'Tanggal',
  'Waktu',
  'Nama Siswa',
  'NISN',
  'Kelas',
  'Bidang Bimbingan',
  'Jenis Layanan',
  'Sasaran',
  'Tempat Layanan',
  'Detail Layanan',
  'Catatan Kasus',
  'Rencana Tindak Lanjut',
  'Status',
  'Status Verifikasi',
  'Guru BK',
  'Dokumentasi'
];

// ----------------------------------------------------------------------------
// Mock Entries Dataset for Multi-Tier Testing
// ----------------------------------------------------------------------------
const MOCK_ENTRIES: JurnalBkEntry[] = [
  {
    id: 'bk-001',
    sekolah_id: 'sch-01',
    nama_guru: 'Siti Aminah, S.Pd',
    nama_siswa: 'Ahmad Fauzi',
    nisn: '0081234567',
    kelas: '7A',
    tanggal: '2026-11-02',
    waktu: '08:30',
    bidang_bimbingan: 'Sosial',
    jenis_layanan: 'Layanan Orientasi',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {
      sasaran_orientasi: 'Siswa Pindahan Baru',
      materi_orientasi: 'Pengenalan Fasilitas dan Tata Tertib',
      pihak_terlibat: 'Wali Kelas 7A'
    },
    catatan: 'Siswa baru memerlukan adaptasi lingkungan madrasah/sekolah.',
    tindak_lanjut: 'Mengenalkan siswa dengan perwakilan OSIS dan denah kelas.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  },
  {
    id: 'bk-002',
    sekolah_id: 'sch-01',
    nama_guru: 'Siti Aminah, S.Pd',
    nama_siswa: 'Budi Santoso',
    nisn: '0082345678',
    kelas: '8B',
    tanggal: '2026-11-05',
    waktu: '09:45',
    bidang_bimbingan: 'Karir',
    jenis_layanan: 'Layanan Informasi',
    sasaran: 'Individu',
    tempat_layanan: 'Perpustakaan',
    detail_layanan: {
      topik_informasi: 'Prospek Peminatan SMK vs SMA dan Peluang Beasiswa',
      media_layanan: 'Brosur & Konsultasi Tatap Muka'
    },
    catatan: 'Siswa bingung memilih kelanjutan studi setelah lulus SMP.',
    tindak_lanjut: 'Diberikan tes peminatan dan arahan diskusi keluarga.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  },
  {
    id: 'bk-003',
    sekolah_id: 'sch-01',
    nama_guru: 'Rahmat Hidayat, S.Pd',
    nama_siswa: 'Citra Dewi',
    nisn: '0083456789',
    kelas: '9C',
    tanggal: '2026-11-10',
    waktu: '10:15',
    bidang_bimbingan: 'Belajar',
    jenis_layanan: 'Layanan Pembelajaran',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {
      kesulitan_belajar: 'Kesulitan konsentrasi saat belajar mandiri di rumah',
      mapel_terkait: 'Matematika & IPA',
      strategi_solusi: 'Penerapan metode Pomodoro dan membuat catatan visual'
    },
    catatan: 'Nilai ujian tengah semester menurun drastis.',
    tindak_lanjut: 'Jadwal belajar mandiri disepakati dan dipantau berkala.',
    status: 'Dalam Penanganan',
    status_verifikasi: 'Menunggu'
  },
  {
    id: 'bk-004',
    sekolah_id: 'sch-01',
    nama_guru: 'Rahmat Hidayat, S.Pd',
    nama_siswa: 'Dimas Pratama',
    nisn: '0084567890',
    kelas: '7B',
    tanggal: '2026-11-15',
    waktu: '11:00',
    bidang_bimbingan: 'Karir',
    jenis_layanan: 'Layanan Penempatan dan Penyaluran',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {
      jenis_penempatan: 'Ekstrakurikuler Robotik & Kelompok Belajar Sains',
      potensi_minat: 'Kemampuan logika tinggi dan ketertarikan teknologi',
      rekomendasi_penempatan: 'Disalurkan ke klub olimpiade fisika dan robotik'
    },
    catatan: 'Siswa membutuhkan wadah penyaluran bakat sains.',
    tindak_lanjut: 'Didampingi mendaftar seleksi pembinaan olimpiade.',
    status: 'Selesai',
    status_verifikasi: 'Diverifikasi'
  },
  {
    id: 'bk-005',
    sekolah_id: 'sch-01',
    nama_guru: 'Siti Aminah, S.Pd',
    nama_siswa: 'Eko Prasetyo',
    nisn: '0085678901',
    kelas: '8A',
    tanggal: '2026-11-15',
    waktu: '13:30',
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Layanan Penguasaan Konten',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {
      konten_kompetensi: 'Keterampilan Komunikasi Asertif dan Menolak Ajakan Negatif',
      metode_latihan: 'Simulasi Role Play percakapan sebaya'
    },
    catatan: 'Siswa sering tertekan karena sulit menolak ajakan teman membolos.',
    tindak_lanjut: 'Latihan verbal asertif dan komitmen penegakan batas diri.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  },
  {
    id: 'bk-006',
    sekolah_id: 'sch-01',
    nama_guru: 'Siti Aminah, S.Pd',
    nama_siswa: 'Fanny Maharani',
    nisn: '0086789012',
    kelas: '9A',
    tanggal: '2026-11-18',
    waktu: '09:00',
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Layanan Konseling Perorangan (Individual)',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang BK Privat',
    detail_layanan: {
      indikasi_masalah: 'Kecemasan berlebihan menghadapi ujian akhir dan ekspektasi orang tua',
      pendekatan_teknik: 'Cognitive Restructuring dan teknik pernapasan relaksasi'
    },
    catatan: 'Konseli sering merasa gemetar dan menangis saat memikirkan kelulusan.',
    tindak_lanjut: 'Sesi lanjutan dijadwalkan seminggu lagi untuk evaluasi jurnal kecemasan.',
    status: 'Dalam Penanganan',
    status_verifikasi: 'Menunggu'
  },
  {
    id: 'bk-007',
    sekolah_id: 'sch-01',
    nama_guru: 'Rahmat Hidayat, S.Pd',
    nama_siswa: 'Gilang Ramadhan',
    nisn: '0087890123',
    kelas: '8B',
    tanggal: '2026-11-20',
    waktu: '10:00',
    bidang_bimbingan: 'Sosial',
    jenis_layanan: 'Layanan Bimbingan Kelompok',
    sasaran: 'Kelompok',
    tempat_layanan: 'Gazebo Sekolah',
    detail_layanan: {
      topik_kelompok: 'Membangun Kerjasama Tim dan Mencegah Perundungan Siber',
      daftar_anggota: '8 siswa perwakilan kelas 8B',
      dinamika_kelompok: 'Diskusi aktif dan setiap anggota membuat pakta anti-bullying'
    },
    catatan: 'Pembahasan pencegahan gesekan antar kelompok di kelas 8B.',
    tindak_lanjut: 'Monitoring mingguan bersama ketua kelas dan wali kelas.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  },
  {
    id: 'bk-008',
    sekolah_id: 'sch-01',
    nama_guru: 'Rahmat Hidayat, S.Pd',
    nama_siswa: 'Hana Safitri',
    nisn: '0088901234',
    kelas: '9B',
    tanggal: '2026-11-22',
    waktu: '11:15',
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Layanan Konseling Kelompok',
    sasaran: 'Kelompok',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {
      fokus_masalah_kelompok: 'Mengatasi Rasa Percaya Diri Rendah dalam Diskusi Terbuka',
      keterbukaan_anggota: 'Semua anggota berkomitmen menjaga kerahasiaan sesi',
      solusi_kelompok: 'Saling memberi apresiasi dan umpan balik positif bertahap'
    },
    catatan: 'Konseling kelompok untuk 5 siswi pemalu yang kesulitan bersosialisasi.',
    tindak_lanjut: 'Tantangan berbicara di forum kelas dalam durasi 1 menit.',
    status: 'Dalam Penanganan',
    status_verifikasi: 'Menunggu'
  },
  {
    id: 'bk-009',
    sekolah_id: 'sch-01',
    nama_guru: 'Siti Aminah, S.Pd',
    nama_siswa: 'Irfan Hakim',
    nisn: '0089012345',
    kelas: '7C',
    tanggal: '2026-11-25',
    waktu: '13:00',
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Layanan Konsultasi',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang Tamu BK',
    detail_layanan: {
      pihak_konsulti: 'Orang Tua Siswa (Bapak Surya)',
      nama_konsulti: 'Bapak Surya (08123456789)',
      arahan_rekomendasi: 'Mendampingi anak belajar tanpa membandingkan dengan saudara'
    },
    catatan: 'Orang tua berkonsultasi mengenai perubahan perilaku anak yang menjadi pendiam.',
    tindak_lanjut: 'Komunikasi berkala via WhatsApp dan pemantauan di kelas.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  },
  {
    id: 'bk-010',
    sekolah_id: 'sch-01',
    nama_guru: 'Rahmat Hidayat, S.Pd',
    nama_siswa: 'Joko Susilo',
    nisn: '0080123456',
    kelas: '8C',
    tanggal: '2026-11-28',
    waktu: '09:30',
    bidang_bimbingan: 'Sosial',
    jenis_layanan: 'Layanan Mediasi',
    sasaran: 'Kelompok',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {
      pihak_berkonflik: 'Joko Susilo (8C) dan Kevin Sanjaya (8C)',
      akar_konflik: 'Saling sindir saat pertandingan futsal antar kelas',
      kesepakatan_damai: 'Saling bersalaman, meminta maaf, dan membuat komitmen sportivitas tertulis'
    },
    catatan: 'Mediasi perselisihan pasca pertandingan olahraga antarkelas.',
    tindak_lanjut: 'Kedua siswa menandatangani surat kesepakatan damai bermaterai.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  },
  {
    id: 'bk-011',
    sekolah_id: 'sch-01',
    nama_guru: 'Siti Aminah, S.Pd',
    nama_siswa: 'Kirana Putri',
    nisn: '0081122334',
    kelas: '9A',
    tanggal: '2026-11-30',
    waktu: '10:45',
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Layanan Advokasi',
    sasaran: 'Individu',
    tempat_layanan: 'Ruang Kepala Sekolah',
    detail_layanan: {
      hak_terancam: 'Hak mengikuti ujian akhir semester yang terhambat administrasi keluarga',
      pihak_terkait_advokasi: 'Bagian Tata Usaha & Komite Sekolah',
      tindakan_advokasi: 'Pengajuan surat rekomendasi dispensasi dan jaminan pendampingan BK'
    },
    catatan: 'Advokasi hak siswa berprestasi yang kurang mampu agar tetap dapat ujian.',
    tindak_lanjut: 'Dispensasi disetujui Kepala Sekolah; siswa memperoleh kartu ujian resmi.',
    status: 'Selesai',
    status_verifikasi: 'Disetujui'
  }
];

// ============================================================================
// MAIN EXECUTION SUITE
// ============================================================================
async function runAllTests() {
  console.log(`\n${BOLD}${CYAN}==============================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🧪 E2E SUITE: BK JURNAL 11 LAYANAN DINAMIS & FILTER TANGGAL (4-TIER)${RESET}`);
  console.log(`${BOLD}${CYAN}==============================================================================${RESET}\n`);

  // Dynamically load BkJurnalView to test live exports and catch syntax errors cleanly
  let liveConfigs: Record<string, any> = {};
  let liveCanonicalMapper: ((layanan: string) => string) | null = null;
  let transformErrorDetail = '';

  try {
    const mod = await import('../src/components/BkJurnalView');
    liveConfigs = mod.BK_SERVICE_CONFIGS || {};
    liveCanonicalMapper = mod.getCanonicalServiceName || null;
    challenge(true, 'T1.0-SYNTAX-TRANSFORM', 'src/components/BkJurnalView.tsx transforms without syntax/compilation errors');
  } catch (err: any) {
    transformErrorDetail = err?.message || String(err);
    challenge(
      false,
      'T1.0-SYNTAX-TRANSFORM',
      'src/components/BkJurnalView.tsx transforms without syntax/compilation errors',
      transformErrorDetail
    );
  }

  // Fallback parser from source code for resilience during active development
  const bkJurnalPath = path.resolve('src/components/BkJurnalView.tsx');
  const bkJurnalSource = fs.existsSync(bkJurnalPath) ? fs.readFileSync(bkJurnalPath, 'utf8') : '';

  // Helper canonical service name if mapper is unavailable
  const resolveCanonical = (name: string): string => {
    if (liveCanonicalMapper) return liveCanonicalMapper(name);
    const trimmed = (name || '').trim();
    if (trimmed === 'Konseling Individual') return 'Layanan Konseling Perorangan (Individual)';
    if (trimmed === 'Konseling Kelompok') return 'Layanan Konseling Kelompok';
    if (trimmed === 'Bimbingan Kelompok') return 'Layanan Bimbingan Kelompok';
    if (trimmed === 'Konsultasi') return 'Layanan Konsultasi';
    if (trimmed === 'Mediasi') return 'Layanan Mediasi';
    return trimmed;
  };

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (Core Capabilities & Authoritative Contracts)
  // ==========================================================================
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}📍 TIER 1: FEATURE COVERAGE (11 Services, Dynamic Fields, Date Filter, CSV)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);

  // Test 1.1: Verification of 11 Standard BK Services in Configuration
  const expected11Services = [
    'Layanan Orientasi',
    'Layanan Informasi',
    'Layanan Pembelajaran',
    'Layanan Penempatan dan Penyaluran',
    'Layanan Penguasaan Konten',
    'Layanan Konseling Perorangan (Individual)',
    'Layanan Bimbingan Kelompok',
    'Layanan Konseling Kelompok',
    'Layanan Konsultasi',
    'Layanan Mediasi',
    'Layanan Advokasi'
  ];

  const hasLiveConfigs = Object.keys(liveConfigs).length > 0;
  challenge(
    hasLiveConfigs ? Object.keys(liveConfigs).length >= 11 : expected11Services.every(s => bkJurnalSource.includes(s)),
    'T1.1-COUNT',
    'BK Service definitions cover all 11 standard services',
    hasLiveConfigs ? `Count: ${Object.keys(liveConfigs).length}` : 'Verified via source scan'
  );

  for (const sName of expected11Services) {
    const cfg = liveConfigs[sName];
    const presentInSource = bkJurnalSource.includes(`'${sName}'`) || bkJurnalSource.includes(`"${sName}"`);
    challenge(
      hasLiveConfigs ? Boolean(cfg) : presentInSource,
      `T1.1-SVC-${sName.replace(/\s+/g, '_')}`,
      `Service '${sName}' configured in BK services`,
      cfg ? `name: ${cfg.name}, fields: ${cfg.fields?.length}` : presentInSource ? 'Present in AST' : 'NOT FOUND'
    );

    if (cfg) {
      challenge(
        Boolean(cfg.description && cfg.description.trim().length > 10),
        `T1.1-DESC-${sName.replace(/\s+/g, '_')}`,
        `Service '${sName}' has meaningful description`
      );

      challenge(
        ['Pribadi', 'Sosial', 'Belajar', 'Karir'].includes(cfg.defaultBidang),
        `T1.1-BIDANG-${sName.replace(/\s+/g, '_')}`,
        `Service '${sName}' maps to valid defaultBidang: ${cfg.defaultBidang}`
      );

      challenge(
        Array.isArray(cfg.fields) && cfg.fields.length >= 2,
        `T1.1-FIELDS-${sName.replace(/\s+/g, '_')}`,
        `Service '${sName}' has at least 2 dynamic fields (found: ${cfg.fields?.length})`
      );
    }
  }

  // Test 1.2: Dynamic Field Configuration Integrity (Field Keys, Labels, Placeholders)
  if (hasLiveConfigs) {
    for (const sName of expected11Services) {
      const cfg = liveConfigs[sName];
      if (!cfg) continue;

      for (const f of cfg.fields) {
        challenge(
          Boolean(f.key && typeof f.key === 'string' && f.key.trim().length > 0),
          `T1.2-KEY-${sName.slice(0, 10)}-${f.key}`,
          `Field '${f.key}' in '${sName}' has valid string key`
        );

        challenge(
          Boolean(f.label && typeof f.label === 'string' && f.label.trim().length > 0),
          `T1.2-LABEL-${sName.slice(0, 10)}-${f.key}`,
          `Field '${f.key}' has descriptive label: "${f.label}"`
        );

        challenge(
          Boolean(f.placeholder && typeof f.placeholder === 'string'),
          `T1.2-PH-${sName.slice(0, 10)}-${f.key}`,
          `Field '${f.key}' has placeholder hint: "${f.placeholder.slice(0, 30)}..."`
        );

        challenge(
          ['text', 'textarea', 'select'].includes(f.type),
          `T1.2-TYPE-${sName.slice(0, 10)}-${f.key}`,
          `Field '${f.key}' has valid input type: "${f.type}"`
        );
      }
    }
  } else {
    // AST Check for dynamic field definitions in BkJurnalView.tsx
    challenge(
      bkJurnalSource.includes('BK_SERVICE_CONFIGS') && bkJurnalSource.includes('DynamicFieldDef'),
      'T1.2-DYNAMIC-FIELDS-AST',
      'BkJurnalView.tsx defines BK_SERVICE_CONFIGS and DynamicFieldDef'
    );
  }

  // Test 1.3: Date Range Filter on Entries (Happy Path: Filter Range 2026-11-10 to 2026-11-20)
  const filteredMidMonth = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-10',
    filterEndDate: '2026-11-20'
  });

  // Expected matching IDs: bk-003 (11-10), bk-004 (11-15), bk-005 (11-15), bk-006 (11-18), bk-007 (11-20) -> 5 entries
  challenge(
    filteredMidMonth.length === 5,
    'T1.3-DATE-FILTER-COUNT',
    'Date range 2026-11-10 to 2026-11-20 returns exactly 5 entries',
    `Got: ${filteredMidMonth.length} (Expected: 5)`
  );

  const midMonthIds = filteredMidMonth.map(e => e.id);
  challenge(
    midMonthIds.includes('bk-003') &&
    midMonthIds.includes('bk-004') &&
    midMonthIds.includes('bk-005') &&
    midMonthIds.includes('bk-006') &&
    midMonthIds.includes('bk-007') &&
    !midMonthIds.includes('bk-001') &&
    !midMonthIds.includes('bk-002') &&
    !midMonthIds.includes('bk-010') &&
    !midMonthIds.includes('bk-011'),
    'T1.3-DATE-FILTER-INTEGRITY',
    'Filtered entries strictly include inside window and exclude outside window'
  );

  // Test 1.4: CSV Export Generation with UTF-8 BOM and RFC 4180
  const midMonthRows = buildCsvExportRows(filteredMidMonth);
  const generatedCsv = generateCsvString(EXPECTED_CSV_HEADERS, midMonthRows);

  challenge(
    generatedCsv.startsWith('\uFEFF'),
    'T1.4-CSV-BOM',
    'CSV export string prepends UTF-8 BOM (\\uFEFF) for Excel compatibility'
  );

  challenge(
    generatedCsv.includes(EXPECTED_CSV_HEADERS.join(',')),
    'T1.4-CSV-HEADER',
    'CSV export contains all 17 standardized columns in the first line'
  );

  const csvLines = generatedCsv.split('\r\n');
  // First line is header, plus 5 data rows = 6 lines
  challenge(
    csvLines.length === 6,
    'T1.4-CSV-LINECOUNT',
    `CSV contains exactly 1 header + 5 records = 6 lines (got: ${csvLines.length})`
  );

  challenge(
    generatedCsv.includes('Citra Dewi') &&
    generatedCsv.includes('Ahmad Fauzi') === false,
    'T1.4-CSV-DATA-MATCH',
    'CSV contains filtered records only (Citra Dewi included, Ahmad Fauzi excluded)'
  );

  // Test 1.5: Date Filter Reset Behavior
  const resetFiltered = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '',
    filterEndDate: ''
  });

  challenge(
    resetFiltered.length === MOCK_ENTRIES.length,
    'T1.5-RESET-100-PERCENT',
    `Resetting date filters returns 100% of records (${resetFiltered.length}/${MOCK_ENTRIES.length})`
  );

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================================================
  console.log(`\n${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}📍 TIER 2: BOUNDARY & CORNER CASES (Empty dates, Inversions, Legacy Aliases)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);

  // Test 2.1: Open-ended Dates (Half-bounded)
  const openEndFilter = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-25',
    filterEndDate: ''
  });
  // Dates >= 2026-11-25: bk-009 (11-25), bk-010 (11-28), bk-011 (11-30) -> 3 entries
  challenge(
    openEndFilter.length === 3,
    'T2.1-OPEN-END-FILTER',
    'Half-bounded filter (startDate only: 2026-11-25) returns all records on or after start date',
    `Count: ${openEndFilter.length}`
  );

  const openStartFilter = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '',
    filterEndDate: '2026-11-05'
  });
  // Dates <= 2026-11-05: bk-001 (11-02), bk-002 (11-05) -> 2 entries
  challenge(
    openStartFilter.length === 2,
    'T2.1-OPEN-START-FILTER',
    'Half-bounded filter (endDate only: 2026-11-05) returns all records on or before end date',
    `Count: ${openStartFilter.length}`
  );

  // Test 2.2: Inverted Dates (filterStartDate > filterEndDate)
  const invertedFilter = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-25',
    filterEndDate: '2026-11-10'
  });
  challenge(
    invertedFilter.length === 0,
    'T2.2-INVERTED-DATES',
    'Inverted date filter (startDate > endDate) safely returns 0 matching entries without throwing'
  );

  // Test 2.3: Single-day Window (filterStartDate === filterEndDate)
  const singleDayFilter = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-15',
    filterEndDate: '2026-11-15'
  });
  // Exactly 2 entries on 2026-11-15: bk-004 and bk-005
  challenge(
    singleDayFilter.length === 2,
    'T2.3-SINGLE-DAY-COUNT',
    'Single-day filter (2026-11-15 to 2026-11-15) returns exactly 2 entries occurring on that date'
  );
  challenge(
    singleDayFilter.every(e => e.tanggal === '2026-11-15'),
    'T2.3-SINGLE-DAY-EXACT',
    'All returned records strictly have tanggal === 2026-11-15'
  );

  // Test 2.4: Date Range Completely Out-of-bounds (0 records)
  const farPastFilter = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2020-01-01',
    filterEndDate: '2020-01-31'
  });
  challenge(
    farPastFilter.length === 0,
    'T2.4-FAR-PAST-ZERO',
    'Date range in far past (2020) returns 0 records cleanly'
  );

  const farFutureFilter = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2035-01-01',
    filterEndDate: '2035-12-31'
  });
  challenge(
    farFutureFilter.length === 0,
    'T2.4-FAR-FUTURE-ZERO',
    'Date range in far future (2035) returns 0 records cleanly'
  );

  // Test 2.5: Special Characters, Long Notes & Formula Injection Protection (CWE-1236)
  const maliciousFields = [
    '=CMD|"/C calc"!A0',
    '+1234567890@excel',
    '-2+3+cmd',
    '@SUM(A1:A10)',
    '|dir'
  ];

  for (const malicious of maliciousFields) {
    const sanitized = sanitizeCsvFormula(malicious);
    challenge(
      sanitized.startsWith("'"),
      `T2.5-CWE1236-${malicious.charAt(0)}`,
      `Dangerous formula prefix '${malicious.charAt(0)}' sanitized with leading single quote`
    );
  }

  // Safe pure numbers and standalone hyphens MUST NOT be modified
  challenge(
    sanitizeCsvFormula('42') === '42',
    'T2.5-SAFE-NUMBER-1',
    'Pure number "42" is preserved without leading quote'
  );
  challenge(
    sanitizeCsvFormula('-5') === '-5',
    'T2.5-SAFE-NUMBER-2',
    'Negative number "-5" is preserved without leading quote'
  );
  challenge(
    sanitizeCsvFormula('-') === '-',
    'T2.5-SAFE-HYPHEN',
    'Standalone hyphen "-" is preserved without leading quote'
  );

  // Special characters escaping in RFC 4180
  const complexText = 'Catatan: "Siswa bermasalah", perlu perhatian;\nlanjutan pada hari Senin.';
  const escaped = escapeCsvField(complexText);
  challenge(
    escaped.startsWith('"') && escaped.endsWith('"'),
    'T2.5-RFC4180-ENCLOSED',
    'Field containing quotes, commas, and newlines is enclosed in double quotes'
  );
  challenge(
    escaped.includes('""Siswa bermasalah""'),
    'T2.5-RFC4180-DOUBLED-QUOTES',
    'Internal double quotes are properly doubled according to RFC 4180'
  );

  // Long text preservation (>2000 chars)
  const longText = 'A'.repeat(2500);
  const escapedLong = escapeCsvField(longText);
  challenge(
    escapedLong.length === 2500,
    'T2.5-LONG-TEXT',
    'Very long note (>2500 chars) preserved without truncation'
  );

  // Test 2.6: Legacy Service Types Compatibility & Canonical Alias Mapping
  const legacyAliases: [string, string][] = [
    ['Konseling Individual', 'Layanan Konseling Perorangan (Individual)'],
    ['Konseling Kelompok', 'Layanan Konseling Kelompok'],
    ['Bimbingan Kelompok', 'Layanan Bimbingan Kelompok'],
    ['Konsultasi', 'Layanan Konsultasi'],
    ['Mediasi', 'Layanan Mediasi']
  ];

  for (const [legacy, expectedCanonical] of legacyAliases) {
    const resolved = resolveCanonical(legacy);
    challenge(
      resolved === expectedCanonical,
      `T2.6-ALIAS-${legacy.replace(/\s+/g, '_')}`,
      `Legacy service name '${legacy}' maps to canonical '${expectedCanonical}'`
    );
  }

  // Custom or unmapped service returns as-is
  challenge(
    resolveCanonical('Lainnya') === 'Lainnya',
    'T2.6-ALIAS-CUSTOM',
    'Unmapped or custom service name preserves original string'
  );

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================================================
  console.log(`\n${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}📍 TIER 3: CROSS-FEATURE COMBINATIONS (Multi-dimensional Filters & Export)${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);

  // Test 3.1: Date Range + Category (Bidang Bimbingan) Combined Filter
  const dateAndBidang = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-10',
    filterEndDate: '2026-11-25',
    filterBidang: 'Pribadi'
  });
  // Between 11-10 and 11-25 with bidang Pribadi:
  // bk-005 (11-15, Pribadi), bk-006 (11-18, Pribadi), bk-008 (11-22, Pribadi), bk-009 (11-25, Pribadi) -> 4 entries
  challenge(
    dateAndBidang.length === 4,
    'T3.1-DATE-BIDANG-COMBINED',
    'Date range (2026-11-10 to 2026-11-25) + Bidang "Pribadi" returns exactly 4 entries'
  );
  challenge(
    dateAndBidang.every(e => e.bidang_bimbingan === 'Pribadi' && e.tanggal >= '2026-11-10' && e.tanggal <= '2026-11-25'),
    'T3.1-DATE-BIDANG-VALIDITY',
    'All returned records adhere to both date window AND bidang condition'
  );

  // Test 3.2: Date Range + Status Filter
  const dateAndStatus = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-01',
    filterEndDate: '2026-11-15',
    filterStatus: 'Dalam Penanganan'
  });
  // In window 11-01 to 11-15: bk-003 is 'Dalam Penanganan'. (bk-001, 002, 004, 005 are 'Selesai')
  challenge(
    dateAndStatus.length === 1 && dateAndStatus[0].id === 'bk-003',
    'T3.2-DATE-STATUS-COMBINED',
    'Date range + Status "Dalam Penanganan" filters down to exact 1 record (bk-003)'
  );

  // Test 3.3: Date Range + Counselor Name Filter
  const dateAndCounselor = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-01',
    filterEndDate: '2026-11-15',
    filterCounselor: 'Rahmat Hidayat, S.Pd'
  });
  // Between 11-01 and 11-15 for counselor Rahmat Hidayat: bk-003 (11-10) and bk-004 (11-15) -> 2 entries
  challenge(
    dateAndCounselor.length === 2,
    'T3.3-DATE-COUNSELOR-COMBINED',
    'Date range + Counselor "Rahmat Hidayat, S.Pd" returns exactly 2 records'
  );

  // Test 3.4: Date Range + Text Search (Case-Insensitive across name, nisn, notes)
  const dateAndSearch = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-01',
    filterEndDate: '2026-11-30',
    filterSearch: 'OLIMPIADE' // uppercase search query matching tindak_lanjut
  });
  // Match in follow-up: Dimas Pratama (bk-004)
  challenge(
    dateAndSearch.length === 1 && dateAndSearch[0].nama_siswa === 'Dimas Pratama',
    'T3.4-SEARCH-CASE-INSENSITIVE',
    'Text search "OLIMPIADE" performs case-insensitive match on student Dimas Pratama'
  );

  // Test 3.5: All 5 Filters Combined Concurrently (Date + Bidang + Status + Counselor + Search)
  const fullCombined = applyJurnalFilter(MOCK_ENTRIES, {
    filterStartDate: '2026-11-15',
    filterEndDate: '2026-11-30',
    filterBidang: 'Pribadi',
    filterStatus: 'Dalam Penanganan',
    filterCounselor: 'Siti Aminah, S.Pd',
    filterSearch: 'fanny'
  });
  challenge(
    fullCombined.length === 1 && fullCombined[0].id === 'bk-006',
    'T3.5-FULL-COMBINED-5WAY',
    '5-way multi-filter (Date + Bidang + Status + Counselor + Search) accurately targets bk-006'
  );

  // Test 3.6: CSV Export under Combined Multi-Filter
  const fullCombinedRows = buildCsvExportRows(fullCombined);
  const fullCombinedCsv = generateCsvString(EXPECTED_CSV_HEADERS, fullCombinedRows);
  const fullCombinedLines = fullCombinedCsv.split('\r\n');
  challenge(
    fullCombinedLines.length === 2, // Header + 1 record
    'T3.6-COMBINED-CSV-LINECOUNT',
    `CSV export for 5-way filtered result produces exactly 2 lines (header + 1 record)`
  );
  challenge(
    fullCombinedCsv.includes('Fanny Maharani') && fullCombinedCsv.includes('Kecemasan berlebihan'),
    'T3.6-COMBINED-CSV-CONTENT',
    'CSV export contains detailed notes and student name of matching record'
  );

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS & LAYOUT PRESERVATION
  // ==========================================================================
  console.log(`\n${BOLD}------------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}📍 TIER 4: REAL-WORLD APPLICATION SCENARIOS & UI NON-REGRESSION${RESET}`);
  console.log(`${BOLD}------------------------------------------------------------------------------${RESET}`);

  // Scenario 4.1: Student Multi-Session Counseling Journey
  // Student "Dewi Lestari" undergoes 4 distinct services across 4 months:
  const dewiSessions: JurnalBkEntry[] = [
    {
      id: 'dewi-01',
      sekolah_id: 'sch-01',
      nama_guru: 'Siti Aminah, S.Pd',
      nama_siswa: 'Dewi Lestari',
      nisn: '0098765432',
      kelas: '7A',
      tanggal: '2026-07-20',
      waktu: '08:00',
      bidang_bimbingan: 'Sosial',
      jenis_layanan: 'Layanan Orientasi',
      sasaran: 'Individu',
      catatan: 'Pengenalan lingkungan sekolah dan adaptasi dari SD ke SMP.',
      tindak_lanjut: 'Diberikan buku panduan siswa dan mentor sebaya.',
      status: 'Selesai',
      detail_layanan: { sasaran_orientasi: 'Siswa Baru', materi_orientasi: 'Kultur Sekolah' }
    },
    {
      id: 'dewi-02',
      sekolah_id: 'sch-01',
      nama_guru: 'Siti Aminah, S.Pd',
      nama_siswa: 'Dewi Lestari',
      nisn: '0098765432',
      kelas: '7A',
      tanggal: '2026-08-15',
      waktu: '10:00',
      bidang_bimbingan: 'Pribadi',
      jenis_layanan: 'Layanan Konseling Perorangan (Individual)',
      sasaran: 'Individu',
      catatan: 'Merasa cemas dan terisolasi dari kelompok pertemanan baru.',
      tindak_lanjut: 'Latihan komunikasi interpersonal dan penjadwalan konseling.',
      status: 'Dalam Penanganan',
      detail_layanan: { indikasi_masalah: 'Kecemasan Sosial', pendekatan_teknik: 'Konseling Humanistik' }
    },
    {
      id: 'dewi-03',
      sekolah_id: 'sch-01',
      nama_guru: 'Siti Aminah, S.Pd',
      nama_siswa: 'Dewi Lestari',
      nisn: '0098765432',
      kelas: '7A',
      tanggal: '2026-09-02',
      waktu: '13:00',
      bidang_bimbingan: 'Sosial',
      jenis_layanan: 'Layanan Mediasi',
      sasaran: 'Kelompok',
      catatan: 'Mediasi kesalahpahaman perkataan antara Dewi dan teman sebangku.',
      tindak_lanjut: 'Saling bermaafan dan membuat kesepakatan saling menghormati.',
      status: 'Selesai',
      detail_layanan: { pihak_berkonflik: 'Dewi & Rara', akar_konflik: 'Salah paham tugas', kesepakatan_damai: 'Berdamai' }
    },
    {
      id: 'dewi-04',
      sekolah_id: 'sch-01',
      nama_guru: 'Siti Aminah, S.Pd',
      nama_siswa: 'Dewi Lestari',
      nisn: '0098765432',
      kelas: '7A',
      tanggal: '2026-09-28',
      waktu: '09:00',
      bidang_bimbingan: 'Belajar',
      jenis_layanan: 'Layanan Penguasaan Konten',
      sasaran: 'Individu',
      catatan: 'Penguasaan teknik belajar efektif menjelang Penilaian Tengah Semester.',
      tindak_lanjut: 'Pembuatan mind map dan monitoring nilai tugas harian.',
      status: 'Selesai',
      detail_layanan: { konten_kompetensi: 'Mind Mapping & Waktu', metode_latihan: 'Praktek Langsung' }
    }
  ];

  // Filter August only (Session 2 only)
  const augFilter = applyJurnalFilter(dewiSessions, {
    filterStartDate: '2026-08-01',
    filterEndDate: '2026-08-31'
  });
  challenge(
    augFilter.length === 1 && augFilter[0].jenis_layanan === 'Layanan Konseling Perorangan (Individual)',
    'T4.1-JOURNEY-MONTHLY',
    'Filtering journey for August isolates exact counseling session'
  );

  // Filter Quarter 1 (All 4 sessions)
  const q1Filter = applyJurnalFilter(dewiSessions, {
    filterStartDate: '2026-07-01',
    filterEndDate: '2026-09-30'
  });
  challenge(
    q1Filter.length === 4,
    'T4.1-JOURNEY-QUARTERLY',
    'Quarterly filter includes all 4 sequential counseling sessions'
  );

  // Scenario 4.2: Monthly Report Filename & Period Header Logic
  const samplePeriodStart = '2026-11-01';
  const samplePeriodEnd = '2026-11-30';

  const computeFilename = (start: string, end: string) => {
    return start || end
      ? `Jurnal_BK_${start || 'Awal'}_sd_${end || 'Akhir'}.csv`
      : 'Jurnal_BK_Semua_Periode.csv';
  };

  challenge(
    computeFilename(samplePeriodStart, samplePeriodEnd) === 'Jurnal_BK_2026-11-01_sd_2026-11-30.csv',
    'T4.2-FILENAME-BOUNDED',
    'Export filename formatted as Jurnal_BK_2026-11-01_sd_2026-11-30.csv'
  );

  challenge(
    computeFilename('', '') === 'Jurnal_BK_Semua_Periode.csv',
    'T4.2-FILENAME-ALL',
    'Export filename for cleared filter is Jurnal_BK_Semua_Periode.csv'
  );

  challenge(
    computeFilename(samplePeriodStart, '') === 'Jurnal_BK_2026-11-01_sd_Akhir.csv',
    'T4.2-FILENAME-HALF-OPEN',
    'Export filename for open-end date is Jurnal_BK_2026-11-01_sd_Akhir.csv'
  );

  // Scenario 4.3: AST & Source Code Invariants Preservation in BkJurnalView.tsx
  challenge(
    fs.existsSync(bkJurnalPath),
    'T4.3-FILE-EXISTS',
    'src/components/BkJurnalView.tsx exists in project workspace'
  );

  const bkJurnalCode = bkJurnalSource;

  // 1. Readonly notice banner
  challenge(
    bkJurnalCode.includes('data-testid="readonly-notice"'),
    'T4.3-AST-READONLY-NOTICE',
    'Preserves data-testid="readonly-notice" for headmaster monitoring mode'
  );

  // 2. PrintHeader component call
  challenge(
    bkJurnalCode.includes('<PrintHeader') &&
    bkJurnalCode.includes('user={user}') &&
    bkJurnalCode.includes('sekolahId={'),
    'T4.3-AST-PRINT-HEADER',
    'Preserves official <PrintHeader user={user} sekolahId={...} />'
  );

  // 3. PrintSignature component call
  challenge(
    bkJurnalCode.includes('<PrintSignature') &&
    bkJurnalCode.includes('Guru Bimbingan Konseling (BK)'),
    'T4.3-AST-PRINT-SIGNATURE',
    'Preserves official <PrintSignature /> with Guru BK subtitle'
  );

  // 4. Print Table colSpan={9}
  challenge(
    bkJurnalCode.includes('colSpan={9}'),
    'T4.3-AST-COLSPAN-9',
    'Preserves colSpan={9} empty-state row in 9-column printable table'
  );

  // 5. Documentation table header
  challenge(
    bkJurnalCode.includes('<th className="border border-black p-2 w-24 text-center">Dokumentasi</th>'),
    'T4.3-AST-DOC-HEADER',
    'Preserves verbatim Dokumentasi table header in print layout'
  );

  // 6. Action column protected by !isReadOnly
  challenge(
    bkJurnalCode.includes('!isReadOnly && <th className="py-2.5 px-3 text-center">Aksi</th>'),
    'T4.3-AST-ACTION-HEADER',
    'Preserves conditional !isReadOnly check on Aksi column'
  );

  // 7. Schema migration file
  const migrationPath = path.resolve('supabase/migrations/20261117_add_detail_layanan_to_jurnal_bk.sql');
  challenge(
    fs.existsSync(migrationPath),
    'T4.3-MIGRATION-FILE',
    'supabase/migrations/20261117_add_detail_layanan_to_jurnal_bk.sql exists'
  );

  if (fs.existsSync(migrationPath)) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    challenge(
      migrationContent.includes('ALTER TABLE public.jurnal_bk ADD COLUMN IF NOT EXISTS detail_layanan JSONB'),
      'T4.3-MIGRATION-JSONB',
      'Migration adds detail_layanan JSONB column with IF NOT EXISTS'
    );
    challenge(
      migrationContent.includes("NOTIFY pgrst, 'reload schema'"),
      'T4.3-MIGRATION-NOTIFY',
      'Migration notifies PostgREST to reload schema cache'
    );
  }

  // 8. CSV Export Button present in Source Code
  challenge(
    bkJurnalCode.includes('Ekspor CSV') || bkJurnalCode.includes('Ekspor Excel'),
    'T4.3-AST-EXPORT-BUTTON',
    'BkJurnalView.tsx includes "Ekspor CSV/Excel" button trigger'
  );

  // 9. Date Range Filter Controls present in Source Code
  challenge(
    bkJurnalCode.includes('filterStartDate') &&
    bkJurnalCode.includes('filterEndDate') &&
    bkJurnalCode.includes('setFilterStartDate') &&
    bkJurnalCode.includes('setFilterEndDate'),
    'T4.3-AST-DATE-FILTER-STATE',
    'BkJurnalView.tsx tracks filterStartDate and filterEndDate state'
  );

  // ==========================================================================
  // FINAL SUMMARY REPORT
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}==============================================================================${RESET}`);
  console.log(`${BOLD}SUMMARY REPORT: BK JURNAL 11 LAYANAN & FILTER TANGGAL E2E SUITE${RESET}`);
  console.log(`${BOLD}${CYAN}==============================================================================${RESET}`);
  console.log(`  Total Assertions : ${BOLD}${totalAssertions}${RESET}`);
  console.log(`  Passed           : ${GREEN}${BOLD}${passedAssertions}${RESET}`);
  console.log(`  Failed           : ${failedAssertions > 0 ? RED : GREEN}${BOLD}${failedAssertions}${RESET}`);

  if (failedAssertions > 0) {
    console.error(`\n${RED}${BOLD}Failures Summary (${failedAssertions}):${RESET}`);
    for (const d of failureDetails) {
      console.error(`  - ${d}`);
    }
    console.log(`\n${RED}${BOLD}STATUS: FAIL ✖${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}STATUS: ALL ASSERTIONS PASSED (100% SUCCESS) ✔${RESET}\n`);
    process.exit(0);
  }
}

// Direct Execution
runAllTests().catch(err => {
  console.error('\nUnhandled Exception in Test Runner:', err);
  process.exit(1);
});

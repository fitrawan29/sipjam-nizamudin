/**
 * @file csvExport.ts
 * @description Lightweight CSV export utility for Master Data tabs and other modules in SIPJAM.
 * Implements RFC 4180 compliant escaping and native browser Blob/URL download with zero external dependencies.
 */

export interface ExportMasterDataOptions {
  schoolId?: string;
  configuredTahunAjaran?: string;
  filenameOverride?: string;
}

export interface MasterDataExportDefinition {
  filename: string;
  headers: string[];
  extractRow: (item: any, options?: ExportMasterDataOptions) => any[];
}

/**
 * Escapes a single CSV field value according to RFC 4180.
 * Wraps values containing commas, quotes, semicolons, tabs, or newlines in double quotes,
 * and doubles any internal double quotes. Safely extracts scalar values from objects.
 */
export function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (Array.isArray(val)) {
    return escapeCsvField(val.map(v => (typeof v === 'object' && v !== null ? (v.nama_guru || v.nama || v.nama_kelas || v.name || JSON.stringify(v)) : String(v))).join('; '));
  }
  if (typeof val === 'object') {
    if (typeof val.nama_guru === 'string') return escapeCsvField(val.nama_guru);
    if (typeof val.nama_siswa === 'string') return escapeCsvField(val.nama_siswa);
    if (typeof val.nama_kelas === 'string') return escapeCsvField(val.nama_kelas);
    if (typeof val.nama === 'string') return escapeCsvField(val.nama);
    if (typeof val.name === 'string') return escapeCsvField(val.name);
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes(';') ||
    str.includes('\t')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 compliant CSV string with UTF-8 BOM prepended for Excel compatibility.
 */
export function generateCsvString(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map(row => row.map(escapeCsvField).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a native browser file download using Blob and URL.createObjectURL.
 * Safely no-ops in non-browser (Node.js/testing) environments.
 * Uses delayed URL revocation to protect against premature cancellation in mobile Safari/Firefox.
 */
export function triggerCsvDownload(filename: string, csvContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const cleanFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  const target = document.body || document.documentElement;
  if (target) {
    target.appendChild(a);
    a.click();
    target.removeChild(a);
  } else {
    a.click();
  }
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 1500);
  } else {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  }
}

/**
 * Normalizes tab identifiers to standard canonical keys.
 * Handles spaces, hyphens, case variations, and common aliases.
 */
export function normalizeMasterTabKey(tab?: string): string {
  if (!tab) return 'Data_Siswa';
  const clean = tab
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    clean === 'blok' ||
    clean === 'sistem_blok' ||
    clean === 'periode_blok' ||
    clean === 'periode_sistem_blok'
  ) return 'sistem_blok';

  if (
    clean === 'pengguna' ||
    clean === 'users' ||
    clean === 'user' ||
    clean === 'data_pengguna' ||
    clean === 'akun'
  ) return 'Pengguna';

  if (
    clean === 'data_kelas' ||
    clean === 'kelas' ||
    clean === 'classes' ||
    clean === 'class' ||
    clean === 'rombel'
  ) return 'Data_Kelas';

  if (
    clean === 'data_siswa' ||
    clean === 'siswa' ||
    clean === 'students' ||
    clean === 'student' ||
    clean === 'murid'
  ) return 'Data_Siswa';

  if (
    clean === 'data_guru' ||
    clean === 'guru' ||
    clean === 'teachers' ||
    clean === 'teacher' ||
    clean === 'pendidik'
  ) return 'Data_Guru';

  if (
    clean === 'data_mapel' ||
    clean === 'mapel' ||
    clean === 'mata_pelajaran' ||
    clean === 'subjects' ||
    clean === 'subject'
  ) return 'Data_Mapel';

  if (
    clean === 'kalender_pendidikan' ||
    clean === 'kalender' ||
    clean === 'calendar' ||
    clean === 'agenda'
  ) return 'Kalender_Pendidikan';

  if (
    clean === 'jadwal_pelajaran' ||
    clean === 'jadwal' ||
    clean === 'schedule' ||
    clean === 'jadwal_kbm'
  ) return 'Jadwal_Pelajaran';

  if (
    clean === 'wali_kelas' ||
    clean === 'wali' ||
    clean === 'homeroom' ||
    clean === 'wali_rombel'
  ) return 'Wali_Kelas';

  // Direct case-insensitive match against registered definition keys
  const directKey = Object.keys(MASTER_DATA_EXPORT_DEFINITIONS).find(
    k => k.toLowerCase() === clean || k.toLowerCase().replace(/_/g, '') === clean.replace(/_/g, '')
  );
  if (directKey) return directKey;

  return tab;
}

/**
 * Helper to resolve scalar teacher / person name from string or nested object.
 */
function resolvePersonName(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.nama_guru || val.nama || val.nama_wali || val.name || '';
  }
  return String(val);
}

/**
 * Helper to resolve scalar class name from string or nested object.
 */
function resolveClassName(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.nama_kelas || val.kelas || val.name || '';
  }
  return String(val);
}

/**
 * Registry of Master Data export configurations for all 9 tabs.
 */
export const MASTER_DATA_EXPORT_DEFINITIONS: Record<string, MasterDataExportDefinition> = {
  Data_Siswa: {
    filename: 'Data_Siswa.csv',
    headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'agama', 'status', 'no_hp_ortu'],
    extractRow: (item) => [
      item?.nisn || '',
      item?.nama_siswa || item?.nama || item?.name || '',
      resolveClassName(item?.kelas),
      item?.gender || item?.jenis_kelamin || '',
      item?.agama || '',
      item?.status || 'Aktif',
      item?.no_hp_ortu || item?.no_hp || item?.hp_ortu || item?.telepon || ''
    ]
  },
  Data_Kelas: {
    filename: 'Data_Kelas.csv',
    headers: ['nama_kelas', 'tingkat', 'jurusan', 'wali_kelas', 'total_siswa'],
    extractRow: (item) => [
      resolveClassName(item?.nama_kelas || item?.kelas || item?.name),
      item?.tingkat !== undefined && item?.tingkat !== null ? String(item.tingkat) : '',
      item?.jurusan || '',
      resolvePersonName(item?.wali_kelas) || item?.nama_wali_kelas || '',
      item?.totalSiswa !== undefined
        ? String(item.totalSiswa)
        : (item?.total_siswa !== undefined ? String(item.total_siswa) : '0')
    ]
  },
  Data_Mapel: {
    filename: 'Data_Mapel.csv',
    headers: ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'],
    extractRow: (item) => [
      item?.id || item?.kode_mapel || item?.kode || '',
      item?.nama_mata_pelajaran || item?.nama_mapel || item?.nama || '',
      item?.kategori || item?.kelompok || '',
      item?.kelompok || item?.kategori || ''
    ]
  },
  Data_Guru: {
    filename: 'Data_Guru.csv',
    headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
    extractRow: (item, options) => [
      item?.sekolah_id || options?.schoolId || '',
      item?.nip || '',
      resolvePersonName(item?.nama_guru || item?.nama),
      item?.mata_pelajaran || item?.mapel || '',
      item?.no_hp || item?.hp || item?.telepon || '',
      item?.status || 'Aktif',
      item?.email || ''
    ]
  },
  Jadwal_Pelajaran: {
    filename: 'Data_Jadwal_Pelajaran.csv',
    headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_mulai', 'jam_selesai'],
    extractRow: (item) => [
      item?.hari || '',
      resolvePersonName(item?.nama_guru || item?.guru || item?.nama),
      typeof item?.mata_pelajaran === 'object' && item?.mata_pelajaran !== null
        ? (item.mata_pelajaran.nama_mata_pelajaran || item.mata_pelajaran.nama_mapel || '')
        : (item?.mata_pelajaran || item?.mapel || item?.nama_mapel || ''),
      resolveClassName(item?.kelas),
      item?.jam_mulai !== undefined && item?.jam_mulai !== null ? String(item.jam_mulai) : '',
      item?.jam_selesai !== undefined && item?.jam_selesai !== null ? String(item.jam_selesai) : ''
    ]
  },
  Wali_Kelas: {
    filename: 'Data_Wali_Kelas.csv',
    headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran'],
    extractRow: (item, options) => [
      resolveClassName(item?.kelas),
      resolvePersonName(item?.nama_guru || item?.nama || item?.wali),
      typeof item?.nip === 'object' && item?.nip !== null ? (item.nip.nip || '') : (item?.nip || ''),
      item?.tahun_ajaran || options?.configuredTahunAjaran || '2024/2025'
    ]
  },
  Pengguna: {
    filename: 'Data_Pengguna.csv',
    headers: ['username', 'nama', 'role', 'nip', 'mata_pelajaran', 'status'],
    extractRow: (item) => [
      item?.username || '',
      resolvePersonName(item?.nama || item?.name || item?.nama_guru),
      item?.role || 'Guru',
      item?.nip || '',
      item?.mataPelajaran || item?.mata_pelajaran || '',
      item?.status || 'Aktif'
    ]
  },
  Kalender_Pendidikan: {
    filename: 'Data_Kalender_Pendidikan.csv',
    headers: ['tanggal', 'keterangan', 'tipe'],
    extractRow: (item) => {
      const rawDate = item?.tanggal || item?.tanggal_mulai || '';
      const dateStr = rawDate instanceof Date
        ? rawDate.toISOString().split('T')[0]
        : (String(rawDate).includes('T') ? String(rawDate).split('T')[0] : String(rawDate));
      return [
        dateStr,
        item?.keterangan || '',
        item?.tipe || ''
      ];
    }
  },
  sistem_blok: {
    filename: 'Data_Periode_Sistem_Blok.csv',
    headers: ['nama_kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'tipe_target', 'target_kelas', 'deskripsi'],
    extractRow: (item) => {
      const startRaw = item?.tanggal_mulai || item?.start_date || '';
      const endRaw = item?.tanggal_selesai || item?.end_date || '';
      const startStr = startRaw instanceof Date
        ? startRaw.toISOString().split('T')[0]
        : (String(startRaw).includes('T') ? String(startRaw).split('T')[0] : String(startRaw));
      const endStr = endRaw instanceof Date
        ? endRaw.toISOString().split('T')[0]
        : (String(endRaw).includes('T') ? String(endRaw).split('T')[0] : String(endRaw));
      return [
        item?.nama_kegiatan || item?.kegiatan || item?.nama || '',
        startStr,
        endStr,
        item?.tipe_target || 'sekolah',
        resolveClassName(item?.target_kelas),
        item?.deskripsi || item?.keterangan || ''
      ];
    }
  }
};

/**
 * Generates CSV string and filename for any of the 9 Master Data tabs.
 */
export function generateMasterDataCsv(
  tab: string,
  items: any[] = [],
  options?: ExportMasterDataOptions
): { filename: string; headers: string[]; csv: string; rowCount: number } {
  const normKey = normalizeMasterTabKey(tab);
  const def = MASTER_DATA_EXPORT_DEFINITIONS[normKey] || MASTER_DATA_EXPORT_DEFINITIONS.Data_Siswa;

  const validItems = Array.isArray(items) ? items : [];
  const rows = validItems.map(item => def.extractRow(item, options));
  const csv = generateCsvString(def.headers, rows);
  const filename = options?.filenameOverride || def.filename;

  return {
    filename,
    headers: def.headers,
    csv,
    rowCount: validItems.length
  };
}

/**
 * Generates and triggers download of Master Data CSV in browser.
 */
export function downloadMasterDataCsv(
  tab: string,
  items: any[] = [],
  options?: ExportMasterDataOptions
): { success: boolean; filename: string; rowCount: number; csv: string } {
  const result = generateMasterDataCsv(tab, items, options);
  triggerCsvDownload(result.filename, result.csv);
  return {
    success: true,
    filename: result.filename,
    rowCount: result.rowCount,
    csv: result.csv
  };
}

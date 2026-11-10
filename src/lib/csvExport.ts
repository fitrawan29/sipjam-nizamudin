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
 * Wraps values containing commas, quotes, semicolons, or newlines in double quotes,
 * and doubles any internal double quotes.
 */
export function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(';')) {
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes tab identifiers to standard canonical keys.
 */
export function normalizeMasterTabKey(tab?: string): string {
  if (!tab) return 'Data_Siswa';
  const clean = tab.trim().toLowerCase();
  if (clean === 'blok' || clean === 'sistem_blok' || clean === 'periode_blok') return 'sistem_blok';
  if (clean === 'pengguna' || clean === 'users' || clean === 'user') return 'Pengguna';
  if (clean === 'data_kelas' || clean === 'kelas' || clean === 'classes' || clean === 'class') return 'Data_Kelas';
  if (clean === 'data_siswa' || clean === 'siswa' || clean === 'students' || clean === 'student') return 'Data_Siswa';
  if (clean === 'data_guru' || clean === 'guru' || clean === 'teachers' || clean === 'teacher') return 'Data_Guru';
  if (clean === 'data_mapel' || clean === 'mapel' || clean === 'mata_pelajaran' || clean === 'subjects') return 'Data_Mapel';
  if (clean === 'kalender_pendidikan' || clean === 'kalender' || clean === 'calendar') return 'Kalender_Pendidikan';
  if (clean === 'jadwal_pelajaran' || clean === 'jadwal' || clean === 'schedule') return 'Jadwal_Pelajaran';
  if (clean === 'wali_kelas' || clean === 'wali' || clean === 'homeroom') return 'Wali_Kelas';
  return tab;
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
      item?.nama_siswa || '',
      item?.kelas || '',
      item?.gender || '',
      item?.agama || '',
      item?.status || 'Aktif',
      item?.no_hp_ortu || ''
    ]
  },
  Data_Kelas: {
    filename: 'Data_Kelas.csv',
    headers: ['nama_kelas', 'tingkat', 'jurusan', 'wali_kelas', 'total_siswa'],
    extractRow: (item) => [
      item?.nama_kelas || item?.name || '',
      item?.tingkat !== undefined && item?.tingkat !== null ? String(item.tingkat) : '',
      item?.jurusan || '',
      item?.wali_kelas || item?.nama_wali_kelas || '',
      item?.totalSiswa !== undefined ? String(item.totalSiswa) : (item?.total_siswa !== undefined ? String(item.total_siswa) : '0')
    ]
  },
  Data_Mapel: {
    filename: 'Data_Mapel.csv',
    headers: ['id', 'nama_mata_pelajaran', 'kategori', 'kelompok'],
    extractRow: (item) => [
      item?.id || item?.kode_mapel || '',
      item?.nama_mata_pelajaran || item?.nama_mapel || '',
      item?.kategori || '',
      item?.kelompok || ''
    ]
  },
  Data_Guru: {
    filename: 'Data_Guru.csv',
    headers: ['sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
    extractRow: (item, options) => [
      item?.sekolah_id || options?.schoolId || '',
      item?.nip || '',
      item?.nama_guru || '',
      item?.mata_pelajaran || '',
      item?.no_hp || '',
      item?.status || 'Aktif',
      item?.email || ''
    ]
  },
  Jadwal_Pelajaran: {
    filename: 'Data_Jadwal_Pelajaran.csv',
    headers: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_mulai', 'jam_selesai'],
    extractRow: (item) => [
      item?.hari || '',
      item?.nama_guru || '',
      item?.mata_pelajaran || item?.mapel || '',
      item?.kelas || '',
      item?.jam_mulai || '',
      item?.jam_selesai || ''
    ]
  },
  Wali_Kelas: {
    filename: 'Data_Wali_Kelas.csv',
    headers: ['kelas', 'nama_guru', 'nip', 'tahun_ajaran'],
    extractRow: (item, options) => [
      item?.kelas || '',
      item?.nama_guru || '',
      item?.nip || '',
      item?.tahun_ajaran || options?.configuredTahunAjaran || '2024/2025'
    ]
  },
  Pengguna: {
    filename: 'Data_Pengguna.csv',
    headers: ['username', 'nama', 'role', 'nip', 'mata_pelajaran', 'status'],
    extractRow: (item) => [
      item?.username || '',
      item?.nama || '',
      item?.role || '',
      item?.nip || '',
      item?.mataPelajaran || item?.mata_pelajaran || '',
      item?.status || 'Aktif'
    ]
  },
  Kalender_Pendidikan: {
    filename: 'Data_Kalender_Pendidikan.csv',
    headers: ['tanggal', 'keterangan', 'tipe'],
    extractRow: (item) => [
      item?.tanggal || item?.tanggal_mulai || '',
      item?.keterangan || '',
      item?.tipe || ''
    ]
  },
  sistem_blok: {
    filename: 'Data_Periode_Sistem_Blok.csv',
    headers: ['nama_kegiatan', 'tanggal_mulai', 'tanggal_selesai', 'tipe_target', 'target_kelas', 'deskripsi'],
    extractRow: (item) => [
      item?.nama_kegiatan || '',
      (item?.tanggal_mulai || '').includes('T') ? item.tanggal_mulai.split('T')[0] : (item?.tanggal_mulai || ''),
      (item?.tanggal_selesai || '').includes('T') ? item.tanggal_selesai.split('T')[0] : (item?.tanggal_selesai || ''),
      item?.tipe_target || 'sekolah',
      item?.target_kelas || '',
      item?.deskripsi || ''
    ]
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

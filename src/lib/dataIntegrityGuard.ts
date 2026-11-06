/**
 * Data Integrity & Realness Guard (Ponytail Approach)
 * Native validation to prevent duplicate users/teachers/students and prevent dummy/fictitious records.
 */

// Patterns indicating test, dummy, or fictitious data
const DUMMY_WORDS = /\b(test|tester|testing|dummy|fiktif|fake|percobaan|uji\s*coba|contoh|sample|foo|bar|asdf)\b/i;
const DUMMY_SUBSTRINGS = /(dummy|fiktif|fake|asdf|ujicoba|percobaan)/i;
const DUMMY_COMPOUNDS = /(^|[_.\-\d\s])(test|tester|testing|dummy)[a-z0-9_.-]*$|^[a-z0-9_.-]*(test|tester|testing|dummy)([_.\-\d\s]|$)/i;

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Shared storage cache helper for Master Data across components (sessionStorage with localStorage fallback)
 */
export function getStorageCache(tab: string, schoolId: string): any[] | null {
  try {
    const session = typeof window !== 'undefined' ? window.sessionStorage : (typeof globalThis !== 'undefined' ? (globalThis as any).sessionStorage : null);
    const local = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : null);
    const raw = session?.getItem(`sipjam_master_data_${schoolId}_${tab}`) ||
                local?.getItem(`sipjam_master_data_${schoolId}_${tab}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return null;
}

export function setStorageCache(tab: string, schoolId: string, rows: any[]) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    const session = typeof window !== 'undefined' ? window.sessionStorage : (typeof globalThis !== 'undefined' ? (globalThis as any).sessionStorage : null);
    const local = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : null);
    const json = JSON.stringify(rows);
    try { session?.setItem(`sipjam_master_data_${schoolId}_${tab}`, json); } catch (_) {}
    try { local?.setItem(`sipjam_master_data_${schoolId}_${tab}`, json); } catch (_) {}
  } catch (_) {}
}

/**
 * Retrieves the currently active academic year configured by Admin from local configuration cache.
 */
export function getActiveTahunAjaranSync(fallback: string = '2024/2025'): string {
  try {
    const local = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : null);
    if (local) {
      const syncRaw = local.getItem('sipjam_config_sync') || local.getItem('sipjam:config_sync');
      if (syncRaw) {
        const parsed = JSON.parse(syncRaw);
        if (parsed?.tahun_ajaran && typeof parsed.tahun_ajaran === 'string' && parsed.tahun_ajaran.trim()) {
          return parsed.tahun_ajaran.trim();
        }
        if (parsed?.config?.tahun_ajaran && typeof parsed.config.tahun_ajaran === 'string' && parsed.config.tahun_ajaran.trim()) {
          return parsed.config.tahun_ajaran.trim();
        }
      }
    }
  } catch (_) {}
  return fallback;
}

/**
 * Normalizes name strings:
 * - Strips zero-width characters (\u200B-\u200D\uFEFF)
 * - Normalizes Unicode diacritics / accents (e.g. é -> e)
 * - Collapses multiple spaces, tabs, and non-breaking spaces into a single space
 */
export function normalizeName(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a string contains dummy or test indicators.
 * Robust against compound identifiers (testuser, dummyaccount), separators (snake_case, kebab-case, dots), and appended numbers (dummy1, test123).
 */
export function isDummyOrTestString(value?: string | null): boolean {
  if (!value) return false;
  const raw = value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!raw) return false;
  // Replace underscores, hyphens, dots, and trailing digits with spaces to expose word boundaries
  const normalizedWords = raw.toLowerCase().replace(/[_.\-\d]+/g, ' ').trim();
  return (
    DUMMY_WORDS.test(raw) ||
    DUMMY_WORDS.test(normalizedWords) ||
    DUMMY_SUBSTRINGS.test(raw) ||
    DUMMY_COMPOUNDS.test(raw)
  );
}

/**
 * Checks if a name is one of the forbidden historical/deprecated names.
 * Catches uppercase variations of 'FITRA SURYAZANA MAMONTO' (even with titles/prefixes/punctuation)
 * and all permutations of 'Ahmad Dahlan' (case-insensitive, diacritics, and punctuation-tolerant).
 */
export function isForbiddenName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = normalizeName(name);
  if (!normalized) return false;

  // Catch uppercase variations of FITRA SURYAZANA MAMONTO with any separators/academic titles
  if (/\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(normalized)) {
    return true;
  }

  // Catch deprecated Ahmad Dahlan with any separators/punctuation/titles
  if (/ahmad[\s._-]*dahlan/i.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Derives default password for a teacher: username/NIP + '27'
 */
export function getDefaultTeacherPassword(usernameOrNip: string): string {
  const clean = (usernameOrNip || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

  const isPlaceholder = !clean ||
    /^[-_.\s0]+$/.test(clean) ||
    /^(null|undefined|none|na|n\/a|tidak\s*ada|-+)$/i.test(clean);

  if (isPlaceholder) {
    return 'guru27';
  }

  // If formatted NIP (spaces, dots, hyphens) with pure digits (8-25 digits)
  const digitsOnly = clean.replace(/[-.\s]/g, '');
  if (/^\d{8,25}$/.test(digitsOnly)) {
    return `${digitsOnly}27`;
  }

  return `${clean.replace(/\s+/g, '')}27`;
}

/**
 * Resolves canonical username from a teacher record (prefers NIP, fallback to clean name)
 */
export function resolveTeacherUsername(guru: { nip?: string | null; nama_guru?: string | null }): string {
  const rawNip = (guru?.nip || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

  // Check if NIP is a placeholder or invalid
  const isPlaceholder = !rawNip ||
    /^[-_.\s0]+$/.test(rawNip) ||
    /^(null|undefined|none|na|n\/a|tidak\s*ada|-+)$/i.test(rawNip);

  if (!isPlaceholder) {
    // If standard 8-25 digit NIP formatted with spaces, hyphens, or dots, normalize to digits
    const digitsOnly = rawNip.replace(/[-.\s]/g, '');
    if (/^\d{8,25}$/.test(digitsOnly)) {
      return digitsOnly;
    }
    // Otherwise strip internal whitespace and return clean string
    return rawNip.replace(/\s+/g, '');
  }

  const cleanNama = (guru?.nama_guru || '').trim();
  const fallback = cleanNama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return fallback || 'guru';
}

/**
 * Validates teacher (data_guru) creation or update
 */
export function validateTeacherData(
  nip: string,
  namaGuru: string,
  existingTeachers: Array<{ id?: string; nip?: string; nama_guru?: string }>,
  currentId?: string,
  mataPelajaran?: string
): ValidationResult {
  const cleanNama = normalizeName(namaGuru);
  const cleanNip = (nip || '').trim();

  if (!cleanNama) {
    return { valid: false, message: 'Nama guru wajib diisi!' };
  }

  // 1. Anti-Dummy Check
  if (isDummyOrTestString(cleanNama) || (cleanNip !== '-' && isDummyOrTestString(cleanNip))) {
    return {
      valid: false,
      message: 'Nama atau NIP guru terdeteksi sebagai data percobaan/dummy. Harap masukkan data riil.'
    };
  }

  // 2. Forbidden legacy names
  if (isForbiddenName(namaGuru) || (cleanNip !== '-' && isForbiddenName(cleanNip))) {
    return {
      valid: false,
      message: (/\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(cleanNama) || /\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(cleanNip))
        ? 'Gunakan format penulisan resmi Title Case: "Fitra Suryazana Mamonto".'
        : 'Nama atau NIP tersebut telah dinonaktifkan dari sistem.'
    };
  }

  // 3. Subject validation (if provided)
  if (mataPelajaran) {
    const rawMapel = mataPelajaran.trim();
    if (isDummyOrTestString(rawMapel)) {
      return {
        valid: false,
        message: `Mata pelajaran guru terdeteksi sebagai data percobaan/dummy ("${rawMapel}").`
      };
    }
    if (isInvalidMapel(rawMapel)) {
      return {
        valid: false,
        message: `Mata pelajaran "${rawMapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`
      };
    }
  }

  // 4. Uniqueness Check: Name
  const normCleanNama = cleanNama.toLowerCase();
  const duplicateName = existingTeachers.find(
    t => t.id !== currentId && normalizeName(t.nama_guru).toLowerCase() === normCleanNama
  );
  if (duplicateName) {
    return {
      valid: false,
      message: `Guru dengan nama "${cleanNama}" sudah terdaftar di sekolah ini!`
    };
  }

  // 5. Uniqueness Check: NIP (if provided and not '-')
  if (cleanNip && cleanNip !== '-') {
    const normCleanNip = cleanNip.toLowerCase();
    const duplicateNip = existingTeachers.find(
      t => t.id !== currentId && (t.nip || '').trim().toLowerCase() === normCleanNip
    );
    if (duplicateNip) {
      return {
        valid: false,
        message: `Guru dengan NIP/Username "${cleanNip}" sudah terdaftar!`
      };
    }
  }

  return { valid: true };
}

/**
 * Validates user account (users) creation or update
 */
export function validateUserData(
  username: string,
  nama: string,
  existingUsers: Array<{ id?: string; username?: string; nama?: string }>,
  currentId?: string
): ValidationResult {
  const cleanUsername = (username || '').trim();
  const cleanNama = normalizeName(nama);

  if (!cleanUsername || !cleanNama) {
    return { valid: false, message: 'Username dan Nama wajib diisi!' };
  }

  // 1. Anti-Dummy Check
  if (isDummyOrTestString(cleanUsername) || isDummyOrTestString(cleanNama)) {
    return {
      valid: false,
      message: 'Username atau Nama terdeteksi sebagai akun percobaan/dummy. Harap masukkan data riil.'
    };
  }

  // 2. Forbidden legacy names
  if (isForbiddenName(nama) || isForbiddenName(username)) {
    return {
      valid: false,
      message: /\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(cleanNama)
        ? 'Gunakan format penulisan resmi Title Case: "Fitra Suryazana Mamonto".'
        : 'Nama/Username tersebut telah dinonaktifkan dari sistem.'
    };
  }

  // 3. Uniqueness Check: Username
  const normCleanUsername = cleanUsername.toLowerCase();
  const duplicateUsername = existingUsers.find(
    u => u.id !== currentId && (u.username || '').trim().toLowerCase() === normCleanUsername
  );
  if (duplicateUsername) {
    return {
      valid: false,
      message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!`
    };
  }

  // 4. Uniqueness Check: Name
  const normCleanNama = cleanNama.toLowerCase();
  const duplicateNama = existingUsers.find(
    u => u.id !== currentId && normalizeName(u.nama).toLowerCase() === normCleanNama
  );
  if (duplicateNama) {
    return {
      valid: false,
      message: `Pengguna dengan nama "${cleanNama}" sudah terdaftar!`
    };
  }

  return { valid: true };
}

/**
 * Validates student (data_siswa) creation or update
 */
export function validateStudentData(
  namaSiswa: string,
  kelas: string,
  existingStudents: Array<{ id?: string; nama_siswa?: string; kelas?: string }>,
  currentId?: string
): ValidationResult {
  const cleanNama = normalizeName(namaSiswa);
  const cleanKelas = (kelas || '').trim();

  if (!cleanNama || !cleanKelas) {
    return { valid: false, message: 'Nama siswa dan Kelas wajib diisi!' };
  }

  // 1. Anti-Dummy Check
  if (isDummyOrTestString(cleanNama)) {
    return {
      valid: false,
      message: 'Nama siswa terdeteksi sebagai data percobaan/dummy. Harap masukkan nama siswa riil.'
    };
  }

  // 2. Forbidden legacy names
  if (isForbiddenName(namaSiswa)) {
    return { valid: false, message: 'Nama siswa tidak diperbolehkan!' };
  }

  // 3. Uniqueness Check: Same name in same class
  const normCleanNama = cleanNama.toLowerCase();
  const normCleanKelas = cleanKelas.toLowerCase();
  const duplicate = existingStudents.find(
    s =>
      s.id !== currentId &&
      (s.kelas || '').trim().toLowerCase() === normCleanKelas &&
      normalizeName(s.nama_siswa).toLowerCase() === normCleanNama
  );
  if (duplicate) {
    return {
      valid: false,
      message: `Siswa "${cleanNama}" sudah terdaftar di kelas ${cleanKelas}!`
    };
  }

  return { valid: true };
}

/**
 * Checks if a subject (mata_pelajaran) is an invalid, fictitious, or non-existent subject
 * such as "teknik informasi" or "teknologi informasi".
 * In Kurikulum Merdeka / SMA Nizamudin, only official valid subjects like "Informatika" are allowed.
 */
export function isInvalidMapel(mapel?: string | null): boolean {
  if (!mapel) return false;
  const clean = mapel
    .toLowerCase()
    .replace(/[-_./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return false;

  return (
    /\bteknik\s+informasi\b/i.test(clean) ||
    /\bteknologi\s+informasi\b/i.test(clean) ||
    /\bteknik\s+informatika\b/i.test(clean) ||
    /\btek\s*info\b/i.test(clean) ||
    /\bteknik\s+dan\s+informasi\b/i.test(clean) ||
    /\bteknologi\s+informasi\s+dan\s+komunikasi\b/i.test(clean) ||
    /\b(tik|t\s+i\s+k)\b/i.test(clean)
  );
}

/**
 * Normalizes or standardizes schedule subjects:
 * If an invalid variant like "teknik informasi" or "teknologi informasi" is passed,
 * normalizes it to the official valid subject "Informatika".
 * Preserves class prefixes if present (e.g. "X Merdeka_Teknik Informasi" -> "X Merdeka_Informatika").
 * Handles comma-separated lists of subjects gracefully.
 */
export function normalizeScheduleMapel(mapel?: string | null): string {
  if (!mapel) return '';
  const trimmed = mapel.trim();
  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map(part => normalizeScheduleMapel(part.trim()))
      .join(', ');
  }
  if (isInvalidMapel(trimmed)) {
    if (trimmed.includes('_')) {
      const prefix = trimmed.slice(0, trimmed.lastIndexOf('_'));
      return `${prefix}_Informatika`;
    }
    return 'Informatika';
  }
  return trimmed;
}

/**
 * Validates schedule data to ensure invalid subjects like "teknik informasi" cannot be entered.
 */
export function validateScheduleData(
  mataPelajaran?: string | null,
  namaGuru?: string | null,
  kelas?: string | null
): ValidationResult {
  const cleanMapel = (mataPelajaran || '').trim();
  if (!cleanMapel) {
    return { valid: false, message: 'Mata pelajaran wajib diisi!' };
  }
  if (isInvalidMapel(cleanMapel)) {
    return {
      valid: false,
      message: `Mata pelajaran "${cleanMapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`
    };
  }
  if (isDummyOrTestString(cleanMapel)) {
    return {
      valid: false,
      message: `Mata pelajaran "${cleanMapel}" terdeteksi sebagai data percobaan/dummy.`
    };
  }
  return { valid: true };
}

/**
 * Validates subject (data_mapel) creation or update
 */
export function validateMapelData(
  namaMapel?: string | null,
  existingMapels?: Array<{ id?: string; nama_mata_pelajaran?: string; nama_mapel?: string }>,
  currentId?: string
): ValidationResult {
  const cleanMapel = (namaMapel || '').trim();
  if (!cleanMapel) {
    return { valid: false, message: 'Nama mata pelajaran wajib diisi!' };
  }
  if (isInvalidMapel(cleanMapel)) {
    return {
      valid: false,
      message: `Mata pelajaran "${cleanMapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`
    };
  }
  if (isDummyOrTestString(cleanMapel)) {
    return {
      valid: false,
      message: `Mata pelajaran "${cleanMapel}" terdeteksi sebagai data percobaan/dummy.`
    };
  }
  if (existingMapels && existingMapels.length > 0) {
    const norm = cleanMapel.toLowerCase();
    const dup = existingMapels.find(m =>
      m.id !== currentId &&
      (m.nama_mata_pelajaran?.toLowerCase().trim() === norm || m.nama_mapel?.toLowerCase().trim() === norm)
    );
    if (dup) {
      return { valid: false, message: `Mata pelajaran "${cleanMapel}" sudah terdaftar!` };
    }
  }
  return { valid: true };
}

/**
 * Master Data Authorization Guard
 * Validates that only users with the 'Admin' or 'Superadmin' role can modify master data
 * (data siswa, data guru, data jadwal pembelajaran, data kelas, data mapel).
 */
export function validateMasterDataModificationRole(role?: string | null): ValidationResult {
  const norm = (role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (norm === 'admin' || norm === 'superadmin' || norm === 'servicerole') {
    return { valid: true };
  }
  return {
    valid: false,
    message: 'Akses ditolak: Seluruh data master hanya dapat diubah melalui aplikasi oleh Admin menggunakan panel manajemen admin.'
  };
}

export function isMasterDataModificationAllowed(role?: string | null): boolean {
  return validateMasterDataModificationRole(role).valid;
}

/**
 * Robust CSV line parser with quotes handling
 */
/**
 * Robust CSV line parser with quotes and customizable delimiter handling
 */
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  parts.push(cur.trim());
  return parts;
}

/**
 * Sanitizes and canonicalizes a UUID string:
 * - Strips zero-width characters (\u200B-\u200D\uFEFF)
 * - Strips outer quotes (single, double, or escaped quotes)
 * - Strips Windows GUID braces ({...}) and parentheses ((...))
 * - Trims whitespace and normalizes to lowercase
 */
export function sanitizeUuid(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .replace(/^[{(]+|[})]+$/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Splits CSV text into individual logical records, respecting quotes and multi-line fields (RFC 4180).
 * Preserves newlines inside quoted fields while properly splitting on CRLF, LF, or CR outside quotes.
 */
export function splitCsvRecords(text: string): string[] {
  const records: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        cur += c;
      }
    } else if (!inQuotes && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (cur.trim().length > 0) {
        records.push(cur);
      }
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim().length > 0) {
    records.push(cur);
  }
  return records;
}

/**
 * Detects PostgREST PGRST205 or PostgreSQL 42P01 missing table errors
 * without requiring external library imports.
 */
function isSchemaCacheError(err: any): boolean {
  if (!err) return false;
  const target = (typeof err === 'object' && err !== null && 'error' in err && err.error && typeof err.error === 'object')
    ? err.error
    : err;
  const code = String(target.code || target.status || err.code || err.status || '').trim().toUpperCase();
  const msg = String(target.message || target.error_description || err.message || '').toLowerCase();
  const details = String(target.details || err.details || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST200' ||
    code === 'PGRST204' ||
    msg.includes('pgrst205') ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    details.includes('does not exist')
  );
}

/**
 * Normalizes CSV header names across all 7 Master Data entities:
 * - data_kelas / kelas: nama_kelas, tingkat, jurusan, kelas, rombel
 * - data_siswa: nisn, nama_siswa, kelas, gender, status, no_hp_ortu
 * - data_guru: nip, nama_guru, mata_pelajaran, no_hp, status, email, sekolah_id
 * - data_mapel: id, nama_mata_pelajaran, kategori
 * - kalender_pendidikan: tanggal, keterangan, tipe
 * - jadwal_pelajaran: hari, nama_guru, mata_pelajaran, kelas
 * - wali_kelas: kelas, nama_guru, nip, tahun_ajaran
 */
export function normalizeCsvHeaders(rawHeaders: string[], tableName: string): string[] {
  const normTable = (tableName || '').toLowerCase().trim();
  const isKelas = normTable === 'data_kelas' || normTable === 'kelas';
  const isSiswa = normTable === 'data_siswa' || normTable === 'siswa';
  const isMapel = normTable === 'data_mapel' || normTable === 'mapel';
  const isGuru = normTable === 'data_guru' || normTable === 'guru';

  return rawHeaders.map(h => {
    const clean = h
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // 1. School ID aliases across all entities
    if (
      clean === 'id_sekolah' ||
      clean === 'school_id' ||
      clean === 'sekolahid' ||
      clean === 'schoolid' ||
      clean === 'idsekolah' ||
      clean === 'id_school' ||
      clean === 'idschool' ||
      clean === 'sekolah_uuid' ||
      clean === 'uuid_sekolah' ||
      clean === 'sekolahuuid' ||
      clean === 'uuidsekolah' ||
      clean === 'kode_sekolah' ||
      clean === 'kodesekolah'
    ) {
      return 'sekolah_id';
    }

    // 2. Class entity specific mappings
    if (isKelas) {
      if (
        clean === 'nama_kelas' ||
        clean === 'namakelas' ||
        clean === 'kelas' ||
        clean === 'rombel' ||
        clean === 'nama_rombel' ||
        clean === 'ruang_kelas' ||
        clean === 'nama'
      ) {
        return 'nama_kelas';
      }
      if (clean === 'tingkat' || clean === 'tingkat_kelas' || clean === 'tingkatkelas' || clean === 'grade' || clean === 'level') {
        return 'tingkat';
      }
      if (clean === 'jurusan' || clean === 'peminatan' || clean === 'program_keahlian' || clean === 'program' || clean === 'konsentrasi') {
        return 'jurusan';
      }
    }

    // 3. Name headers scoped by entity
    if (
      clean === 'nama' ||
      clean === 'nama_lengkap' ||
      clean === 'namalengkap' ||
      (isSiswa && (clean === 'siswa' || clean === 'nama_murid' || clean === 'namamurid' || clean === 'murid'))
    ) {
      if (isSiswa) return 'nama_siswa';
      if (isKelas) return 'nama_kelas';
      if (isMapel) return 'nama_mata_pelajaran';
      return 'nama_guru';
    }

    // 4. Student Phone / Parent Phone aliases
    if (
      clean === 'no_hp_orang_tua' ||
      clean === 'hp_ortu' ||
      clean === 'hp_orang_tua' ||
      clean === 'nohporangtua' ||
      clean === 'nohp_ortu' ||
      clean === 'telepon_ortu' ||
      clean === 'no_telepon_ortu' ||
      clean === 'wa_ortu' ||
      clean === 'nomor_ortu' ||
      (isSiswa && (
        clean === 'no_hp' ||
        clean === 'nohp' ||
        clean === 'hp' ||
        clean === 'telepon' ||
        clean === 'no_telepon' ||
        clean === 'nomor_hp' ||
        clean === 'no_wa' ||
        clean === 'wa' ||
        clean === 'whatsapp'
      ))
    ) {
      return 'no_hp_ortu';
    }

    // 5. Subject aliases
    if (
      clean === 'mata_pelajaran' ||
      clean === 'matapelajaran' ||
      clean === 'mapel' ||
      clean === 'nama_mapel' ||
      clean === 'namamapel' ||
      clean === 'nama_mata_pelajaran' ||
      clean === 'namamatapelajaran'
    ) {
      return isMapel ? 'nama_mata_pelajaran' : 'mata_pelajaran';
    }

    // 6. Teacher name aliases
    if (clean === 'guru' || clean === 'wali_kelas' || clean === 'walikelas' || clean === 'nama_wali_kelas') {
      return 'nama_guru';
    }

    // 7. Rombel in student, schedule, or homeroom teacher tables maps to 'kelas'
    if (clean === 'rombel') {
      return isKelas ? 'nama_kelas' : 'kelas';
    }

    // 8. Gender aliases
    if (clean === 'jenis_kelamin' || clean === 'jeniskelamin' || clean === 'jk' || clean === 'sex') {
      return 'gender';
    }

    // 9. Calendar / Event aliases
    if (clean === 'deskripsi' || clean === 'agenda' || clean === 'kegiatan' || clean === 'uraian' || clean === 'acara') {
      return 'keterangan';
    }
    if (clean === 'tgl' || clean === 'date') {
      return 'tanggal';
    }
    if (clean === 'jenis' || clean === 'type') {
      return 'tipe';
    }

    // 10. Academic year aliases
    if (clean === 'tahunajaran' || clean === 'tahun_akademik' || clean === 'ta') {
      return 'tahun_ajaran';
    }

    // 11. Category aliases
    if (clean === 'kelompok' || clean === 'kategori_mapel') {
      return 'kategori';
    }

    // 12. NISN / NIP aliases
    if (clean === 'nomor_induk_siswa_nasional' || clean === 'no_induk') {
      return 'nisn';
    }
    if (clean === 'nuptk' || clean === 'nomor_induk_pegawai') {
      return 'nip';
    }

    return clean;
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses and validates CSV content for master data import.
 * Explicitly validates that `sekolah_id` is present, non-null, and a valid UUID for `data_guru`.
 */
export function parseAndValidateMasterCsv(
  text: string,
  tableName: string,
  user?: any
): Record<string, any>[] {
  let lines = splitCsvRecords(text);
  if (lines.length > 0 && lines[0].toLowerCase().trim().startsWith('sep=')) {
    lines = lines.slice(1);
  }
  if (lines.length < 2) {
    throw new Error('File CSV kosong atau tidak memiliki baris data.');
  }

  // Auto-detect delimiter from header line (comma, semicolon, tab, or pipe)
  const headerClean = lines[0].replace(/[\u200B-\u200D\uFEFF]/g, '');
  const commaCount = (headerClean.match(/,/g) || []).length;
  const semicolonCount = (headerClean.match(/;/g) || []).length;
  const tabCount = (headerClean.match(/\t/g) || []).length;
  const pipeCount = (headerClean.match(/\|/g) || []).length;
  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount >= tabCount && semicolonCount >= pipeCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount && tabCount >= pipeCount) {
    delimiter = '\t';
  } else if (pipeCount > commaCount && pipeCount > semicolonCount && pipeCount > tabCount) {
    delimiter = '|';
  }

  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const headers = normalizeCsvHeaders(rawHeaders, tableName);

  const userRoleNorm = (user?.role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperuser = userRoleNorm === 'superadmin' || userRoleNorm === 'servicerole';

  const rows: Record<string, any>[] = [];
  const seenTeacherNames = new Set<string>();
  const seenTeacherNips = new Set<string>();
  const seenStudentKeys = new Set<string>();
  const seenNisns = new Set<string>();
  const seenClassNames = new Set<string>();

  const REQUIRED_HEADERS_BY_TABLE: Record<string, string[]> = {
    data_kelas: ['nama_kelas'],
    kelas: ['nama_kelas'],
    data_siswa: ['nama_siswa', 'kelas'],
    siswa: ['nama_siswa', 'kelas'],
    data_guru: ['nama_guru'],
    guru: ['nama_guru'],
    data_mapel: ['nama_mata_pelajaran'],
    mapel: ['nama_mata_pelajaran'],
    kalender_pendidikan: ['tanggal', 'keterangan'],
    jadwal_pelajaran: ['hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
    wali_kelas: ['kelas', 'nama_guru']
  };

  const reqHeaders = REQUIRED_HEADERS_BY_TABLE[tableName.toLowerCase().trim()];
  if (reqHeaders) {
    const missingHeaders = reqHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(
        `File CSV tidak memiliki kolom wajib "${missingHeaders.join(', ')}". Pastikan Anda mengunggah file template yang sesuai untuk tabel ini.`
      );
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i], delimiter);
    if (vals.length === 0 || vals.every(v => !v || v.trim() === '')) continue;

    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (vals[idx] !== undefined && h) {
        let cleanVal = String(vals[idx]).trim();
        if (cleanVal.startsWith("'")) {
          cleanVal = cleanVal.replace(/^'+|'+$/g, '').trim();
        }
        row[h] = cleanVal;
      }
    });

    // Ensure primary key exists & validate/sanitize UUID for UUID-keyed tables
    const isUuidKeyedTable =
      tableName === 'kalender_pendidikan' ||
      tableName === 'jadwal_pelajaran' ||
      tableName === 'data_siswa' ||
      tableName === 'wali_kelas' ||
      tableName === 'sistem_blok' ||
      tableName === 'data_kelas' ||
      tableName === 'kelas';

    const isMissingOrEmptyId =
      !row.id ||
      String(row.id).trim() === '' ||
      String(row.id).trim().toLowerCase() === 'null' ||
      String(row.id).trim().toLowerCase() === 'undefined';

    if (isMissingOrEmptyId) {
      row.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    } else if (tableName === 'data_guru') {
      const cleanId = sanitizeUuid(String(row.id));
      if (!UUID_REGEX.test(cleanId)) {
        throw new Error(`Baris ${i}: Format "id" ("${row.id}") tidak valid. Harus berupa format UUID.`);
      }
      row.id = cleanId;
    } else if (isUuidKeyedTable) {
      const cleanId = sanitizeUuid(String(row.id));
      if (!UUID_REGEX.test(cleanId)) {
        // If an id field is not a valid UUID format (e.g. legacy sample 'KP-01', 'JP-01'),
        // replace with valid UUID to completely prevent PostgreSQL Error 22P02
        row.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
      } else {
        row.id = cleanId;
      }
    }

    // Explicit validation & scoping for sekolah_id
    if (tableName === 'data_guru') {
      const rawSekolahId = (row.sekolah_id !== undefined && row.sekolah_id !== null) ? String(row.sekolah_id).trim() : '';
      if (!rawSekolahId || rawSekolahId.toLowerCase() === 'null' || rawSekolahId.toLowerCase() === 'undefined') {
        // Auto-inject sekolah_id from user session if not present in CSV (common for exported CSVs without this column)
        if (user?.sekolah_id) {
          row.sekolah_id = user.sekolah_id.toLowerCase();
        } else {
          throw new Error(`Baris ${i}: Kolom "sekolah_id" tidak ditemukan dalam CSV dan tidak dapat ditentukan dari sesi Anda. Tambahkan kolom "sekolah_id" pada file CSV.`);
        }
      } else {
        const cleanSekolahId = sanitizeUuid(rawSekolahId);
        if (!UUID_REGEX.test(cleanSekolahId)) {
          throw new Error(`Baris ${i}: Format "sekolah_id" ("${rawSekolahId}") tidak valid. Harus berupa format UUID (contoh: "a0000000-0000-0000-0000-000000000001").`);
        }
        if (user?.sekolah_id && !isSuperuser && cleanSekolahId !== user.sekolah_id.toLowerCase()) {
          throw new Error(`Baris ${i}: Kolom "sekolah_id" ("${rawSekolahId}") tidak sesuai dengan ID sekolah akun Anda ("${user.sekolah_id}"). Harap gunakan ID sekolah yang terdaftar.`);
        }
        row.sekolah_id = cleanSekolahId;
      }

      const cleanNamaGuru = normalizeName(row.nama_guru);
      if (!cleanNamaGuru || cleanNamaGuru.toLowerCase() === 'null' || cleanNamaGuru.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "nama_guru" wajib diisi dan tidak boleh kosong untuk data guru.`);
      }
      row.nama_guru = cleanNamaGuru;

      // Sanitize NIP from Excel apostrophe formatting
      if (row.nip !== undefined && row.nip !== null) {
        row.nip = String(row.nip)
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim()
          .replace(/^['"]+|['"]+$/g, '')
          .trim();
      }
    } else {
      const rawSekolahId = (row.sekolah_id !== undefined && row.sekolah_id !== null) ? String(row.sekolah_id).trim() : '';
      if (rawSekolahId && rawSekolahId.toLowerCase() !== 'null' && rawSekolahId.toLowerCase() !== 'undefined') {
        const cleanSekolahId = sanitizeUuid(rawSekolahId);
        if (!UUID_REGEX.test(cleanSekolahId)) {
          throw new Error(`Baris ${i}: Format "sekolah_id" ("${rawSekolahId}") tidak valid. Harus berupa format UUID.`);
        }
        if (user?.sekolah_id && !isSuperuser && cleanSekolahId !== user.sekolah_id.toLowerCase()) {
          throw new Error(`Baris ${i}: Kolom "sekolah_id" ("${rawSekolahId}") tidak sesuai dengan ID sekolah akun Anda ("${user.sekolah_id}"). Harap gunakan ID sekolah yang terdaftar.`);
        }
        row.sekolah_id = cleanSekolahId;
      } else {
        row.sekolah_id = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      }
    }

    // Apply default values if needed
    if ((tableName === 'data_siswa' || tableName === 'siswa') && !row.status) row.status = 'Aktif';
    if ((tableName === 'data_siswa' || tableName === 'siswa') && !row.qr_code) {
      const cleanNisn = row.nisn ? String(row.nisn).trim() : '';
      row.qr_code = (cleanNisn && cleanNisn !== '-') ? cleanNisn : String(row.id).slice(0, 8);
    }
    if (tableName === 'data_guru' && !row.status) row.status = 'Aktif';
    if (tableName === 'wali_kelas' && !row.tahun_ajaran) row.tahun_ajaran = getActiveTahunAjaranSync('2024/2025');

    // Entity-Specific Validation & Anti-Dummy Guards
    if (tableName === 'data_kelas' || tableName === 'kelas') {
      const rawNamaKelas = row.nama_kelas ? String(row.nama_kelas).trim() : '';
      if (!rawNamaKelas || rawNamaKelas.toLowerCase() === 'null' || rawNamaKelas.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "nama_kelas" wajib diisi dan tidak boleh kosong untuk data kelas.`);
      }

      if (isDummyOrTestString(rawNamaKelas)) {
        throw new Error(`Baris ${i}: Terdeteksi nama kelas dummy/percobaan ("${rawNamaKelas}"). Harap masukkan data kelas riil.`);
      }

      if (isForbiddenName(rawNamaKelas)) {
        throw new Error(`Baris ${i}: Nama kelas "${rawNamaKelas}" dilarang.`);
      }

      const cleanNamaKelas = rawNamaKelas.replace(/\s+/g, ' ');
      row.nama_kelas = cleanNamaKelas;

      const lowerClass = cleanNamaKelas.toLowerCase();
      if (seenClassNames.has(lowerClass)) {
        throw new Error(`Baris ${i}: Duplikat nama kelas "${cleanNamaKelas}" dalam file CSV.`);
      }
      seenClassNames.add(lowerClass);

      // Auto-derive tingkat if missing or empty
      if (!row.tingkat || String(row.tingkat).trim() === '' || String(row.tingkat).toLowerCase() === 'null') {
        if (/^10\b|^x\b/i.test(cleanNamaKelas)) {
          row.tingkat = '10';
        } else if (/^11\b|^xi\b/i.test(cleanNamaKelas)) {
          row.tingkat = '11';
        } else if (/^12\b|^xii\b/i.test(cleanNamaKelas)) {
          row.tingkat = '12';
        } else {
          row.tingkat = 'Lainnya';
        }
      } else {
        row.tingkat = String(row.tingkat).trim();
        if (isDummyOrTestString(row.tingkat)) {
          throw new Error(`Baris ${i}: Terdeteksi tingkat kelas dummy/percobaan ("${row.tingkat}").`);
        }
      }

      // Sanitize optional jurusan
      if (row.jurusan !== undefined && row.jurusan !== null) {
        const rawJurusan = String(row.jurusan).trim();
        if (rawJurusan && rawJurusan.toLowerCase() !== 'null' && rawJurusan.toLowerCase() !== 'undefined') {
          if (isDummyOrTestString(rawJurusan)) {
            throw new Error(`Baris ${i}: Terdeteksi jurusan kelas dummy/percobaan ("${rawJurusan}").`);
          }
          row.jurusan = rawJurusan;
        } else {
          row.jurusan = null;
        }
      } else {
        row.jurusan = null;
      }
    } else if (tableName === 'data_guru' || tableName === 'jadwal_pelajaran' || tableName === 'wali_kelas') {
      if (tableName === 'jadwal_pelajaran') {
        if (!row.hari || String(row.hari).trim() === '') {
          throw new Error(`Baris ${i}: Kolom "hari" wajib diisi dan tidak boleh kosong untuk jadwal pelajaran.`);
        }
        if (!row.nama_guru || String(row.nama_guru).trim() === '') {
          throw new Error(`Baris ${i}: Kolom "nama_guru" wajib diisi dan tidak boleh kosong untuk jadwal pelajaran.`);
        }
        if (!row.mata_pelajaran && !row.mapel) {
          throw new Error(`Baris ${i}: Kolom "mata_pelajaran" wajib diisi dan tidak boleh kosong untuk jadwal pelajaran.`);
        }
        if (!row.kelas || String(row.kelas).trim() === '') {
          throw new Error(`Baris ${i}: Kolom "kelas" wajib diisi dan tidak boleh kosong untuk jadwal pelajaran.`);
        }
      }
      if (tableName === 'wali_kelas') {
        if (!row.kelas || String(row.kelas).trim() === '') {
          throw new Error(`Baris ${i}: Kolom "kelas" wajib diisi dan tidak boleh kosong untuk wali kelas.`);
        }
        if (!row.nama_guru || String(row.nama_guru).trim() === '') {
          throw new Error(`Baris ${i}: Kolom "nama_guru" wajib diisi dan tidak boleh kosong untuk wali kelas.`);
        }
      }
      if (row.nama_guru) {
        if (/\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(row.nama_guru)) {
          row.nama_guru = 'Fitra Suryazana Mamonto';
        } else if (isForbiddenName(row.nama_guru)) {
          throw new Error(`Baris ${i}: Nama guru "${row.nama_guru}" dilarang atau dinonaktifkan.`);
        }
        if (isDummyOrTestString(row.nama_guru)) {
          throw new Error(`Baris ${i}: Terdeteksi data guru dummy/percobaan ("${row.nama_guru}").`);
        }
        row.nama_guru = normalizeName(row.nama_guru);
        if (tableName === 'data_guru') {
          const lowerName = row.nama_guru.toLowerCase();
          if (seenTeacherNames.has(lowerName)) {
            throw new Error(`Baris ${i}: Duplikat nama guru "${row.nama_guru}" dalam file CSV.`);
          }
          seenTeacherNames.add(lowerName);
        }
      }
      if (row.nip && row.nip !== '-') {
        if (isForbiddenName(row.nip)) {
          throw new Error(`Baris ${i}: NIP guru "${row.nip}" dilarang atau dinonaktifkan.`);
        }
        if (isDummyOrTestString(row.nip)) {
          throw new Error(`Baris ${i}: Terdeteksi NIP guru dummy/percobaan ("${row.nip}").`);
        }
        if (tableName === 'data_guru') {
          const lowerNip = String(row.nip).trim().toLowerCase();
          if (seenTeacherNips.has(lowerNip)) {
            throw new Error(`Baris ${i}: Duplikat NIP guru "${row.nip}" dalam file CSV.`);
          }
          seenTeacherNips.add(lowerNip);

          if (row.mata_pelajaran) {
            if (isDummyOrTestString(row.mata_pelajaran)) {
              throw new Error(`Baris ${i}: Terdeteksi mata pelajaran guru dummy/percobaan ("${row.mata_pelajaran}").`);
            }
            if (isInvalidMapel(row.mata_pelajaran)) {
              throw new Error(`Baris ${i}: Mata pelajaran guru "${row.mata_pelajaran}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`);
            }
          }
        }
      }
      if (tableName === 'jadwal_pelajaran') {
        const rawMapel = row.mata_pelajaran || row.mapel;
        if (rawMapel) {
          if (isDummyOrTestString(rawMapel)) {
            throw new Error(`Baris ${i}: Terdeteksi mata pelajaran dummy/percobaan ("${rawMapel}").`);
          }
          if (isInvalidMapel(rawMapel)) {
            throw new Error(`Baris ${i}: Mata pelajaran jadwal "${rawMapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`);
          }
        }
      }
    } else if (tableName === 'data_mapel' || tableName === 'mapel') {
      const rawMapel = row.nama_mata_pelajaran || row.nama_mapel;
      if (!rawMapel || String(rawMapel).trim() === '') {
        throw new Error(`Baris ${i}: Kolom "nama_mata_pelajaran" wajib diisi dan tidak boleh kosong untuk data mata pelajaran.`);
      }
      if (isDummyOrTestString(rawMapel)) {
        throw new Error(`Baris ${i}: Terdeteksi nama mata pelajaran dummy/percobaan ("${rawMapel}").`);
      }
      if (isInvalidMapel(rawMapel)) {
        throw new Error(`Baris ${i}: Mata pelajaran "${rawMapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`);
      }
    } else if (tableName === 'data_siswa' || tableName === 'siswa') {
      const rawNamaSiswa = row.nama_siswa ? String(row.nama_siswa).trim() : '';
      if (!rawNamaSiswa || rawNamaSiswa.toLowerCase() === 'null' || rawNamaSiswa.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "nama_siswa" wajib diisi dan tidak boleh kosong untuk data siswa.`);
      }
      const rawKelasSiswa = row.kelas ? String(row.kelas).trim() : '';
      if (!rawKelasSiswa || rawKelasSiswa.toLowerCase() === 'null' || rawKelasSiswa.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "kelas" wajib diisi dan tidak boleh kosong untuk data siswa.`);
      }
      if (isForbiddenName(rawNamaSiswa)) {
        throw new Error(`Baris ${i}: Nama siswa "${rawNamaSiswa}" dilarang.`);
      }
      if (isDummyOrTestString(rawNamaSiswa)) {
        throw new Error(`Baris ${i}: Terdeteksi data siswa dummy/percobaan ("${rawNamaSiswa}").`);
      }
      row.nama_siswa = normalizeName(rawNamaSiswa);
      const cleanKelasSiswa = rawKelasSiswa.replace(/\s+/g, ' ');
      row.kelas = cleanKelasSiswa;
      const studentKey = `${cleanKelasSiswa.toLowerCase()}_${row.nama_siswa.toLowerCase()}`;
      if (seenStudentKeys.has(studentKey)) {
        throw new Error(`Baris ${i}: Duplikat siswa "${row.nama_siswa}" di kelas ${row.kelas} dalam file CSV.`);
      }
      seenStudentKeys.add(studentKey);

      // Clean and sanitize NISN (strip Excel scientific notation e.g. 1.06436E+08, zero-width chars, quotes)
      if (row.nisn !== undefined && row.nisn !== null) {
        let cleanNisnVal = String(row.nisn).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/^['"]+|['"]+$/g, '').trim();
        if (/^\d+(\.\d+)?[eE]\+\d+$/.test(cleanNisnVal)) {
          cleanNisnVal = Number(cleanNisnVal).toFixed(0);
        }
        row.nisn = cleanNisnVal;
      }

      // Validate duplicate NISN within the CSV if provided
      const cleanNisn = row.nisn ? String(row.nisn).trim() : '';
      if (cleanNisn && cleanNisn !== '-') {
        if (seenNisns.has(cleanNisn)) {
          throw new Error(`Baris ${i}: Duplikat NISN "${cleanNisn}" dalam file CSV.`);
        }
        seenNisns.add(cleanNisn);
      }

      // Clean and sanitize no_hp_ortu (handle Excel scientific notation, missing leading zero, formatting, placeholders)
      if (row.no_hp_ortu !== undefined && row.no_hp_ortu !== null) {
        let hpClean = String(row.no_hp_ortu).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/^['"]+|['"]+$/g, '').trim();
        if (!hpClean || hpClean === '-' || hpClean.toLowerCase() === 'null' || hpClean.toLowerCase() === 'undefined') {
          row.no_hp_ortu = '';
        } else {
          if (/^\d+(\.\d+)?[eE]\+\d+$/.test(hpClean)) {
            hpClean = Number(hpClean).toFixed(0);
          }
          const digitsOnly = hpClean.replace(/[-.\s()]/g, '');
          if (/^8\d{8,12}$/.test(digitsOnly)) {
            hpClean = `0${digitsOnly}`;
          } else if (/^(08|628)\d{7,12}$/.test(digitsOnly)) {
            hpClean = digitsOnly;
          }
          row.no_hp_ortu = hpClean;
        }
      }

      // Standardize status and gender values for consistent filtering and display
      if (row.status) {
        const sNorm = String(row.status).trim();
        if (sNorm.toLowerCase() === 'aktif') row.status = 'Aktif';
        else if (sNorm.toLowerCase() === 'lulus') row.status = 'Lulus';
        else if (sNorm.toLowerCase() === 'keluar') row.status = 'Keluar';
        else if (sNorm.toLowerCase() === 'nonaktif') row.status = 'Nonaktif';
      }
      if (row.gender) {
        const gNorm = String(row.gender).trim().toLowerCase();
        if (gNorm === 'l' || gNorm === 'laki-laki' || gNorm === 'laki - laki' || gNorm === 'pria') {
          row.gender = 'Laki-laki';
        } else if (gNorm === 'p' || gNorm === 'perempuan' || gNorm === 'wanita') {
          row.gender = 'Perempuan';
        }
      }
    } else if (tableName === 'kalender_pendidikan') {
      const rawTanggal = row.tanggal ? String(row.tanggal).trim() : '';
      if (!rawTanggal || rawTanggal.toLowerCase() === 'null' || rawTanggal.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "tanggal" wajib diisi untuk kalender pendidikan.`);
      }
      const rawKet = row.keterangan ? String(row.keterangan).trim() : '';
      if (!rawKet || rawKet.toLowerCase() === 'null' || rawKet.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "keterangan" wajib diisi untuk kalender pendidikan.`);
      }
    }

    const ALLOWED_COLUMNS_BY_TABLE: Record<string, string[]> = {
      data_kelas: ['id', 'sekolah_id', 'nama_kelas', 'tingkat', 'jurusan'],
      kelas: ['id', 'sekolah_id', 'nama_kelas', 'tingkat', 'jurusan'],
      data_siswa: ['id', 'sekolah_id', 'nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu', 'qr_code'],
      siswa: ['id', 'sekolah_id', 'nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu', 'qr_code'],
      data_guru: ['id', 'sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'user_id', 'wajib_hadir_hanya_mengajar'],
      guru: ['id', 'sekolah_id', 'nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email', 'user_id', 'wajib_hadir_hanya_mengajar'],
      data_mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan', 'kode_mapel', 'nama_mapel'],
      mapel: ['id', 'sekolah_id', 'nama_mata_pelajaran', 'kategori', 'kelompok', 'urutan', 'kode_mapel', 'nama_mapel'],
      kalender_pendidikan: ['id', 'sekolah_id', 'tanggal', 'keterangan', 'tipe', 'tanggal_mulai', 'tanggal_selesai'],
      jadwal_pelajaran: ['id', 'sekolah_id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'jam_mulai', 'jam_selesai', 'mapel', 'user_id'],
      wali_kelas: ['id', 'sekolah_id', 'kelas', 'guru_id', 'nama_guru', 'nip', 'tahun_ajaran']
    };

    const allowedCols = ALLOWED_COLUMNS_BY_TABLE[tableName.toLowerCase().trim()];
    if (allowedCols) {
      const sanitizedRow: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        if (allowedCols.includes(key)) {
          sanitizedRow[key] = row[key];
        }
      }
      rows.push(sanitizedRow);
    } else {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    throw new Error('Tidak ada baris data valid yang ditemukan dalam CSV.');
  }

  return rows;
}

/**
 * Imports master data from CSV text with pre-insertion validation.
 * Guaranteed to catch missing sekolah_id for data_guru prior to database interaction.
 */
export async function importMasterDataFromCsv(
  supabase: any,
  csvText: string,
  tableName: string,
  user?: any
): Promise<{ count: number; rows: Record<string, any>[] }> {
  const rows = parseAndValidateMasterCsv(csvText, tableName, user);
  const normTable = (tableName || '').toLowerCase().trim();
  const isKelasTable = normTable === 'data_kelas' || normTable === 'kelas';
  const isSiswaTable = normTable === 'data_siswa' || normTable === 'siswa';
  const isGuruTable = normTable === 'data_guru' || normTable === 'guru';
  const isMapelTable = normTable === 'data_mapel' || normTable === 'mapel';
  const isWaliTable = normTable === 'wali_kelas';
  const isKalenderTable = normTable === 'kalender_pendidikan';
  const effectiveTableName = isKelasTable ? 'data_kelas' : tableName;

  // 1. IDEMPOTENT STUDENT RESOLUTION (data_siswa)
  // Match incoming students by (sekolah_id, nisn) or (sekolah_id, nama_siswa, kelas) to update existing rows instead of creating duplicates
  if (isSiswaTable && rows.length > 0) {
    const schoolId = user?.sekolah_id || rows[0]?.sekolah_id;
    try {
      const nisnSet = new Set<string>();
      rows.forEach(r => {
        const n = r.nisn ? String(r.nisn).trim() : '';
        if (n && n !== '-') {
          nisnSet.add(n);
          if (/^\d{9}$/.test(n)) {
            nisnSet.add(`0${n}`);
          } else if (/^0\d{9}$/.test(n)) {
            nisnSet.add(n.replace(/^0+/, ''));
          }
        }
      });
      const nisnList = Array.from(nisnSet);

      const nisnToIdMap = new Map<string, string>();
      const nameClassToIdMap = new Map<string, string>();

      // A. Query existing students with matching NISNs in chunks
      if (nisnList.length > 0) {
        const chunkSize = 100;
        for (let k = 0; k < nisnList.length; k += chunkSize) {
          const chunk = nisnList.slice(k, k + chunkSize);
          let studentQuery = supabase
            .from('data_siswa')
            .select('id, nisn, nama_siswa, kelas, sekolah_id');
          if (schoolId) {
            studentQuery = studentQuery.eq('sekolah_id', schoolId);
          }
          studentQuery = studentQuery.in('nisn', chunk);

          const { data: existingStudents, error: fetchErr } = await studentQuery;
          if (!fetchErr && existingStudents) {
            for (const s of existingStudents) {
              if (s.nisn) {
                const sNisn = String(s.nisn).trim().toLowerCase();
                nisnToIdMap.set(sNisn, s.id);
                if (/^\d{9}$/.test(sNisn)) {
                  nisnToIdMap.set(`0${sNisn}`, s.id);
                } else if (/^0\d{9}$/.test(sNisn)) {
                  nisnToIdMap.set(sNisn.replace(/^0+/, ''), s.id);
                }
              }
              if (s.nama_siswa && s.kelas) {
                const normName = normalizeName(s.nama_siswa).toLowerCase().replace(/\s+/g, ' ');
                const normClass = String(s.kelas).trim().toLowerCase().replace(/\s+/g, ' ');
                nameClassToIdMap.set(`${normName}_${normClass}`, s.id);
              }
            }
          }
        }
      }

      // B. Also resolve any students not yet matched by NISN by matching (nama_siswa, kelas)
      const unresolvedRows = rows.filter(r => {
        const cleanNisn = r.nisn ? String(r.nisn).trim().toLowerCase() : '';
        return !cleanNisn || cleanNisn === '-' || !nisnToIdMap.has(cleanNisn);
      });

      if (unresolvedRows.length > 0) {
        try {
          const studentTable = supabase?.from?.('data_siswa');
          if (typeof studentTable?.select === 'function') {
            let unresolvedQuery = studentTable.select('id, nama_siswa, kelas, sekolah_id');
            if (schoolId && typeof unresolvedQuery?.eq === 'function') {
              unresolvedQuery = unresolvedQuery.eq('sekolah_id', schoolId);
            }
            let res: any = null;
            if (typeof unresolvedQuery?.limit === 'function') {
              res = await unresolvedQuery.limit(2000);
            } else if (typeof unresolvedQuery?.then === 'function') {
              res = await unresolvedQuery;
            }
            if (res && !res.error && Array.isArray(res.data)) {
              for (const s of res.data) {
                if (s.nama_siswa && s.kelas) {
                  const normName = normalizeName(s.nama_siswa).toLowerCase().replace(/\s+/g, ' ');
                  const normClass = String(s.kelas).trim().toLowerCase().replace(/\s+/g, ' ');
                  nameClassToIdMap.set(`${normName}_${normClass}`, s.id);
                }
              }
            }
          }
        } catch (_) {}
      }

      // Map existing UUID to matching rows
      for (const row of rows) {
        const cleanNisn = row.nisn ? String(row.nisn).trim().toLowerCase() : '';
        const normName = normalizeName(row.nama_siswa).toLowerCase().replace(/\s+/g, ' ');
        const normClass = String(row.kelas || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const nameClassKey = `${normName}_${normClass}`;
        if (cleanNisn && cleanNisn !== '-' && nisnToIdMap.has(cleanNisn)) {
          row.id = nisnToIdMap.get(cleanNisn);
        } else if (cleanNisn && cleanNisn.length === 9 && nisnToIdMap.has(`0${cleanNisn}`)) {
          row.id = nisnToIdMap.get(`0${cleanNisn}`);
        } else if (cleanNisn && cleanNisn.startsWith('0') && nisnToIdMap.has(cleanNisn.replace(/^0+/, ''))) {
          row.id = nisnToIdMap.get(cleanNisn.replace(/^0+/, ''));
        } else if (nameClassToIdMap.has(nameClassKey)) {
          row.id = nameClassToIdMap.get(nameClassKey);
        }
      }
    } catch (nisnMatchErr) {
      console.warn('[dataIntegrityGuard] Warning resolving existing students idempotently:', nisnMatchErr);
    }
  }

  // 1B. IDEMPOTENT TEACHER RESOLUTION (data_guru)
  // Match incoming teachers by (sekolah_id, nip) or (sekolah_id, nama_guru) to update existing rows in-place
  if (isGuruTable && rows.length > 0) {
    const schoolId = user?.sekolah_id || rows[0]?.sekolah_id;
    try {
      const teacherTable = supabase?.from?.('data_guru');
      if (typeof teacherTable?.select === 'function') {
        let teacherQuery = teacherTable.select('id, nip, nama_guru, sekolah_id');
        if (schoolId && typeof teacherQuery?.eq === 'function') {
          teacherQuery = teacherQuery.eq('sekolah_id', schoolId);
        }
        const { data: existingTeachers, error: fetchErr } = await teacherQuery;
        if (!fetchErr && Array.isArray(existingTeachers) && existingTeachers.length > 0) {
          const nipToIdMap = new Map<string, string>();
          const nameToIdMap = new Map<string, string>();
          for (const t of existingTeachers) {
            if (t.nip && String(t.nip).trim() !== '-') {
              nipToIdMap.set(String(t.nip).trim().toLowerCase(), t.id);
            }
            if (t.nama_guru) {
              nameToIdMap.set(String(t.nama_guru).trim().toLowerCase(), t.id);
            }
          }
          for (const row of rows) {
            const cleanNip = row.nip ? String(row.nip).trim().toLowerCase() : '';
            const cleanName = row.nama_guru ? String(row.nama_guru).trim().toLowerCase() : '';
            if (cleanNip && cleanNip !== '-' && nipToIdMap.has(cleanNip)) {
              row.id = nipToIdMap.get(cleanNip);
            } else if (cleanName && nameToIdMap.has(cleanName)) {
              row.id = nameToIdMap.get(cleanName);
            }
          }
        }
      }
    } catch (tMatchErr) {
      console.warn('[dataIntegrityGuard] Warning resolving existing teachers by NIP/name:', tMatchErr);
    }
  }

  // 1C. IDEMPOTENT MAPEL RESOLUTION (data_mapel)
  // Match incoming subjects by (sekolah_id, nama_mata_pelajaran) to update existing rows in-place
  if (isMapelTable && rows.length > 0) {
    const schoolId = user?.sekolah_id || rows[0]?.sekolah_id;
    try {
      const mapelTable = supabase?.from?.('data_mapel');
      if (typeof mapelTable?.select === 'function') {
        let mapelQuery = mapelTable.select('id, nama_mata_pelajaran, sekolah_id');
        if (schoolId && typeof mapelQuery?.eq === 'function') {
          mapelQuery = mapelQuery.eq('sekolah_id', schoolId);
        }
        const { data: existingMapel, error: fetchErr } = await mapelQuery;
        if (!fetchErr && Array.isArray(existingMapel) && existingMapel.length > 0) {
          const nameToIdMap = new Map<string, string>();
          for (const m of existingMapel) {
            if (m.nama_mata_pelajaran) {
              nameToIdMap.set(String(m.nama_mata_pelajaran).trim().toLowerCase(), m.id);
            }
          }
          for (const row of rows) {
            const cleanName = row.nama_mata_pelajaran ? String(row.nama_mata_pelajaran).trim().toLowerCase() : '';
            if (cleanName && nameToIdMap.has(cleanName)) {
              row.id = nameToIdMap.get(cleanName);
            }
          }
        }
      }
    } catch (mMatchErr) {
      console.warn('[dataIntegrityGuard] Warning resolving existing subjects by name:', mMatchErr);
    }
  }

  // 1D. IDEMPOTENT WALI KELAS RESOLUTION (wali_kelas)
  // Match incoming homeroom teacher assignment by (sekolah_id, kelas)
  if (isWaliTable && rows.length > 0) {
    const schoolId = user?.sekolah_id || rows[0]?.sekolah_id;
    try {
      const waliTable = supabase?.from?.('wali_kelas');
      if (typeof waliTable?.select === 'function') {
        let waliQuery = waliTable.select('id, kelas, sekolah_id');
        if (schoolId && typeof waliQuery?.eq === 'function') {
          waliQuery = waliQuery.eq('sekolah_id', schoolId);
        }
        const { data: existingWali, error: fetchErr } = await waliQuery;
        if (!fetchErr && Array.isArray(existingWali) && existingWali.length > 0) {
          const classToIdMap = new Map<string, string>();
          for (const w of existingWali) {
            if (w.kelas) {
              classToIdMap.set(String(w.kelas).trim().toLowerCase(), w.id);
            }
          }
          for (const row of rows) {
            const cleanClass = row.kelas ? String(row.kelas).trim().toLowerCase() : '';
            if (cleanClass && classToIdMap.has(cleanClass)) {
              row.id = classToIdMap.get(cleanClass);
            }
          }
        }
      }
    } catch (wMatchErr) {
      console.warn('[dataIntegrityGuard] Warning resolving existing wali kelas:', wMatchErr);
    }
  }

  // 1E. IDEMPOTENT KALENDER RESOLUTION (kalender_pendidikan)
  // Match incoming calendar events by (sekolah_id, tanggal, keterangan)
  if (isKalenderTable && rows.length > 0) {
    const schoolId = user?.sekolah_id || rows[0]?.sekolah_id;
    try {
      const calTable = supabase?.from?.('kalender_pendidikan');
      if (typeof calTable?.select === 'function') {
        let calQuery = calTable.select('id, tanggal, keterangan, sekolah_id');
        if (schoolId && typeof calQuery?.eq === 'function') {
          calQuery = calQuery.eq('sekolah_id', schoolId);
        }
        const { data: existingCal, error: fetchErr } = await calQuery;
        if (!fetchErr && Array.isArray(existingCal) && existingCal.length > 0) {
          const calMap = new Map<string, string>();
          for (const c of existingCal) {
            if (c.tanggal) {
              const key = `${String(c.tanggal).trim().toLowerCase()}_${String(c.keterangan || '').trim().toLowerCase()}`;
              calMap.set(key, c.id);
            }
          }
          for (const row of rows) {
            const key = `${String(row.tanggal || '').trim().toLowerCase()}_${String(row.keterangan || '').trim().toLowerCase()}`;
            if (calMap.has(key)) {
              row.id = calMap.get(key);
            }
          }
        }
      }
    } catch (cMatchErr) {
      console.warn('[dataIntegrityGuard] Warning resolving existing calendar events:', cMatchErr);
    }
  }

  // 2. BATCH UPSERT WITH CONFLICT RESOLUTION AND DEFENSIVE FALLBACK
  const batchSize = 50;
  let isTableMissing = false;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const upsertOptions: any = { ignoreDuplicates: false };

    if (isKelasTable) {
      upsertOptions.onConflict = 'sekolah_id, nama_kelas';
    } else if (tableName === 'wali_kelas') {
      upsertOptions.onConflict = 'sekolah_id, kelas';
    } else {
      upsertOptions.onConflict = 'id';
    }

    const { error } = await supabase
      .from(effectiveTableName)
      .upsert(batch, upsertOptions);

    if (error) {
      // Check if data_kelas table is missing from schema cache (PGRST205 / 42P01)
      if (isKelasTable && isSchemaCacheError(error)) {
        isTableMissing = true;
        break;
      }

      // If onConflict on (sekolah_id, nama_kelas) fails due to constraint absence, retry on 'id'
      if (isKelasTable && (error.code === '42P10' || String(error.message).includes('conflict target') || String(error.message).includes('constraint'))) {
        const { error: idErr } = await supabase
          .from(effectiveTableName)
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
        if (idErr) {
          if (isSchemaCacheError(idErr)) {
            isTableMissing = true;
            break;
          }
          throw idErr;
        }
        continue;
      }

      if (error.code === '23503' || String(error.message).includes('sekolah_id_fkey') || String(error.message).includes('foreign key constraint')) {
        throw new Error('ID sekolah ("sekolah_id") dalam CSV tidak terdaftar di sistem sekolah. Pastikan menggunakan ID sekolah yang valid.');
      }
      if (error.code === '23502') {
        throw new Error(`Gagal menyimpan data: terdapat kolom wajib yang bernilai kosong (${error.message}).`);
      }
      if (error.code === '23505') {
        throw new Error(`Gagal menyimpan data: terdapat data duplikat yang melanggar batasan unik database (${error.message}).`);
      }
      if (error.code === '42501' || String(error.message).includes('row-level security')) {
        throw new Error('Akses ditolak oleh kebijakan keamanan data sekolah (RLS). Pastikan Anda hanya mengimpor data untuk sekolah Anda sendiri.');
      }
      throw error;
    }
  }

  // 3. GRACEFUL FALLBACK FOR data_kelas
  if (isTableMissing && isKelasTable) {
    console.warn('[dataIntegrityGuard] Table data_kelas unavailable (PGRST205/missing). Falling back to syncing classes in wali_kelas.');
    try {
      const schoolId = user?.sekolah_id || rows[0]?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const distinctClasses = Array.from(new Set(rows.map(r => r.nama_kelas).filter(Boolean)));
      for (const cls of distinctClasses) {
        try {
          const { data: existingWali } = await supabase
            .from('wali_kelas')
            .select('id, kelas')
            .eq('sekolah_id', schoolId)
            .eq('kelas', cls)
            .maybeSingle();

          if (!existingWali) {
            await supabase.from('wali_kelas').upsert({
              id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
              sekolah_id: schoolId,
              kelas: cls,
              nama_guru: '-',
              nip: '-',
              tahun_ajaran: getActiveTahunAjaranSync('2024/2025')
            }, { onConflict: 'sekolah_id, kelas' });
          }
        } catch (wErr) {
          console.warn('[dataIntegrityGuard] Fallback sync to wali_kelas warning for class:', cls, wErr);
        }
      }
    } catch (fallbackErr) {
      console.warn('[dataIntegrityGuard] Graceful fallback sync error:', fallbackErr);
    }
  }

  // 4. AUTO-SYNC TEACHER ACCOUNTS (data_guru)
  if (tableName === 'data_guru' && rows.length > 0) {
    try {
      for (const row of rows) {
        const targetUsername = resolveTeacherUsername(row);
        if (targetUsername) {
          const defaultPassword = getDefaultTeacherPassword(targetUsername);
          const userTable = supabase?.from?.('users');
          if (typeof userTable?.select === 'function') {
            const queryBuilder = userTable.select('id');
            const userQuery = typeof queryBuilder?.ilike === 'function'
              ? queryBuilder.ilike('username', targetUsername)
              : (typeof queryBuilder?.eq === 'function' ? queryBuilder.eq('username', targetUsername) : null);
            const { data: existingUser } = userQuery && typeof userQuery.maybeSingle === 'function'
              ? await userQuery.maybeSingle()
              : { data: null };

            if (!existingUser && typeof userTable?.insert === 'function') {
              await userTable.insert([{
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
                username: targetUsername,
                password: defaultPassword,
                nama: row.nama_guru,
                role: 'Guru',
                sekolah_id: row.sekolah_id || user?.sekolah_id
              }]);
            }
          }
        }
      }
    } catch (syncErr) {
      console.warn('[dataIntegrityGuard] Auto-sync users for imported data_guru warning:', syncErr);
    }
  }

  return { count: rows.length, rows };
}


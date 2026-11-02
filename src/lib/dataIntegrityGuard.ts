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

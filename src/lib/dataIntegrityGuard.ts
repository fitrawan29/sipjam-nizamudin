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

/**
 * Robust CSV line parser with quotes handling
 */
export function parseCsvLine(line: string): string[] {
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
    } else if (c === ',' && !inQuotes) {
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
 * Normalizes CSV header names
 */
export function normalizeCsvHeaders(rawHeaders: string[], tableName: string): string[] {
  return rawHeaders.map(h => {
    const clean = h.toLowerCase().replace(/[\s-]+/g, '_').replace(/^"|"$/g, '');
    if (clean === 'no_hp_orang_tua' || clean === 'hp_ortu') return 'no_hp_ortu';
    if (clean === 'nama') return tableName === 'data_siswa' ? 'nama_siswa' : 'nama_guru';
    if (clean === 'mata_pelajaran' && tableName === 'data_mapel') return 'nama_mata_pelajaran';
    if (clean === 'guru') return 'nama_guru';
    if (clean === 'id_sekolah' || clean === 'school_id') return 'sekolah_id';
    return clean;
  });
}

/**
 * Parses and validates CSV content for master data import.
 * Explicitly validates that `sekolah_id` is present and non-null for `data_guru`.
 */
export function parseAndValidateMasterCsv(
  text: string,
  tableName: string,
  user?: any
): Record<string, any>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('File CSV kosong atau tidak memiliki baris data.');
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = normalizeCsvHeaders(rawHeaders, tableName);

  const rows: Record<string, any>[] = [];
  const seenTeacherNames = new Set<string>();
  const seenTeacherNips = new Set<string>();
  const seenStudentKeys = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length === 0 || (vals.length === 1 && vals[0] === '')) continue;

    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (vals[idx] !== undefined && h) {
        row[h] = vals[idx];
      }
    });

    // Ensure primary key exists
    if (!row.id) {
      row.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    }

    // Explicit validation & scoping for sekolah_id
    if (tableName === 'data_guru') {
      const rawSekolahId = (row.sekolah_id !== undefined && row.sekolah_id !== null) ? String(row.sekolah_id).trim() : '';
      if (!rawSekolahId || rawSekolahId.toLowerCase() === 'null' || rawSekolahId.toLowerCase() === 'undefined') {
        throw new Error(`Baris ${i}: Kolom "sekolah_id" wajib diisi dan tidak boleh kosong untuk data guru.`);
      }
      row.sekolah_id = rawSekolahId;
    } else {
      const rawSekolahId = (row.sekolah_id !== undefined && row.sekolah_id !== null) ? String(row.sekolah_id).trim() : '';
      row.sekolah_id = rawSekolahId || user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
    }

    // Apply default values if needed
    if (tableName === 'data_siswa' && !row.status) row.status = 'Aktif';
    if (tableName === 'data_guru' && !row.status) row.status = 'Aktif';
    if (tableName === 'wali_kelas' && !row.tahun_ajaran) row.tahun_ajaran = '2024/2025';

    // Integrity & Anti-Dummy Guards for CSV
    if (tableName === 'data_guru' || tableName === 'jadwal_pelajaran' || tableName === 'wali_kelas') {
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
    } else if (tableName === 'data_mapel') {
      const rawMapel = row.nama_mata_pelajaran || row.nama_mapel;
      if (rawMapel) {
        if (isDummyOrTestString(rawMapel)) {
          throw new Error(`Baris ${i}: Terdeteksi nama mata pelajaran dummy/percobaan ("${rawMapel}").`);
        }
        if (isInvalidMapel(rawMapel)) {
          throw new Error(`Baris ${i}: Mata pelajaran "${rawMapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`);
        }
      }
    } else if (tableName === 'data_siswa') {
      if (row.nama_siswa) {
        if (isForbiddenName(row.nama_siswa)) {
          throw new Error(`Baris ${i}: Nama siswa "${row.nama_siswa}" dilarang.`);
        }
        if (isDummyOrTestString(row.nama_siswa)) {
          throw new Error(`Baris ${i}: Terdeteksi data siswa dummy/percobaan ("${row.nama_siswa}").`);
        }
        row.nama_siswa = normalizeName(row.nama_siswa);
        const studentKey = `${(row.kelas || '').trim().toLowerCase()}_${row.nama_siswa.toLowerCase()}`;
        if (seenStudentKeys.has(studentKey)) {
          throw new Error(`Baris ${i}: Duplikat siswa "${row.nama_siswa}" di kelas ${row.kelas} dalam file CSV.`);
        }
        seenStudentKeys.add(studentKey);
      }
    }

    rows.push(row);
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

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const upsertOptions: any = { ignoreDuplicates: false };
    if (tableName === 'wali_kelas') {
      upsertOptions.onConflict = 'sekolah_id, kelas';
    } else {
      upsertOptions.onConflict = 'id';
    }
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, upsertOptions);
    if (error) throw error;
  }

  return { count: rows.length, rows };
}


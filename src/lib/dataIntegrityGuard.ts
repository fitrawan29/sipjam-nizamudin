/**
 * Data Integrity & Realness Guard (Ponytail Approach)
 * Native validation to prevent duplicate users/teachers and prevent dummy/fictitious records.
 */

// Patterns indicating test, dummy, or fictitious data
const DUMMY_PATTERN = /\b(test|tester|testing|dummy|fiktif|fake|percobaan|uji\s*coba|contoh|sample|foo|bar|asdf)\b/i;

// Forbidden legacy identities
const FORBIDDEN_EXACT_NAMES = [
  'FITRA SURYAZANA MAMONTO', // Replaced with title-case 'Fitra Suryazana Mamonto'
];

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Checks if a string contains dummy or test indicators
 */
export function isDummyOrTestString(value?: string | null): boolean {
  if (!value) return false;
  return DUMMY_PATTERN.test(value.trim());
}

/**
 * Checks if a name is one of the forbidden historical/deprecated names
 */
export function isForbiddenName(name?: string | null): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (FORBIDDEN_EXACT_NAMES.includes(trimmed)) return true;
  if (/ahmad\s*dahlan/i.test(trimmed)) return true;
  return false;
}

/**
 * Validates teacher (data_guru) creation or update
 */
export function validateTeacherData(
  nip: string,
  namaGuru: string,
  existingTeachers: Array<{ id?: string; nip?: string; nama_guru?: string }>,
  currentId?: string
): ValidationResult {
  const cleanNama = (namaGuru || '').trim();
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
  if (isForbiddenName(cleanNama)) {
    return {
      valid: false,
      message: cleanNama === 'FITRA SURYAZANA MAMONTO'
        ? 'Gunakan format penulisan resmi Title Case: "Fitra Suryazana Mamonto".'
        : 'Nama tersebut telah dinonaktifkan dari sistem.'
    };
  }

  // 3. Uniqueness Check: Name
  const duplicateName = existingTeachers.find(
    t => t.id !== currentId && (t.nama_guru || '').trim().toLowerCase() === cleanNama.toLowerCase()
  );
  if (duplicateName) {
    return {
      valid: false,
      message: `Guru dengan nama "${cleanNama}" sudah terdaftar di sekolah ini!`
    };
  }

  // 4. Uniqueness Check: NIP (if provided and not '-')
  if (cleanNip && cleanNip !== '-') {
    const duplicateNip = existingTeachers.find(
      t => t.id !== currentId && (t.nip || '').trim().toLowerCase() === cleanNip.toLowerCase()
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
  const cleanNama = (nama || '').trim();

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
  if (isForbiddenName(cleanNama) || isForbiddenName(cleanUsername)) {
    return {
      valid: false,
      message: cleanNama === 'FITRA SURYAZANA MAMONTO'
        ? 'Gunakan format penulisan resmi Title Case: "Fitra Suryazana Mamonto".'
        : 'Nama/Username tersebut telah dinonaktifkan dari sistem.'
    };
  }

  // 3. Uniqueness Check: Username
  const duplicateUsername = existingUsers.find(
    u => u.id !== currentId && (u.username || '').trim().toLowerCase() === cleanUsername.toLowerCase()
  );
  if (duplicateUsername) {
    return {
      valid: false,
      message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!`
    };
  }

  // 4. Uniqueness Check: Name
  const duplicateNama = existingUsers.find(
    u => u.id !== currentId && (u.nama || '').trim().toLowerCase() === cleanNama.toLowerCase()
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
  const cleanNama = (namaSiswa || '').trim();
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
  if (isForbiddenName(cleanNama)) {
    return { valid: false, message: 'Nama siswa tidak diperbolehkan!' };
  }

  // 3. Uniqueness Check: Same name in same class
  const duplicate = existingStudents.find(
    s =>
      s.id !== currentId &&
      (s.kelas || '').trim().toLowerCase() === cleanKelas.toLowerCase() &&
      (s.nama_siswa || '').trim().toLowerCase() === cleanNama.toLowerCase()
  );
  if (duplicate) {
    return {
      valid: false,
      message: `Siswa "${cleanNama}" sudah terdaftar di kelas ${cleanKelas}!`
    };
  }

  return { valid: true };
}

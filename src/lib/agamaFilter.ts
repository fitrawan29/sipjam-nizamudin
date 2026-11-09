/**
 * @file agamaFilter.ts
 * @description Logic for filtering and isolating students by religious affiliation (status agama)
 * for Islamic Religious Education (Pendidikan Agama Islam / PAI) and Christian Religious Education
 * (Pendidikan Agama Kristen / PAK). General and other subjects remain unaffected.
 */

export type ReligiousAffiliation = 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Khonghucu' | 'Lainnya';

/**
 * Normalizes subject string for classification
 */
function normalizeSubject(mapelName?: string | null): string {
  if (!mapelName) return '';
  return String(mapelName)
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[\-_/\\()&]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Determines whether a subject name corresponds to Pendidikan Agama Islam (PAI)
 */
export function isPaiSubject(mapelName?: string | null): boolean {
  if (!mapelName) return false;
  const norm = normalizeSubject(mapelName);

  // Matches "pai", "paibp", or "pai" followed by class level digits (10, 11, 12) or Roman numerals (x, xi, xii)
  if (/\b(pai)(?:bp|[\d]+|[xvi]+)?\b/i.test(norm)) return true;

  // "agama islam" or "pendidikan agama islam" or subjects explicitly mentioning islam
  if (norm.includes('islam')) {
    return true;
  }

  return false;
}

/**
 * Determines whether a subject name corresponds to Pendidikan Agama Kristen (PAK)
 */
export function isPakSubject(mapelName?: string | null): boolean {
  if (!mapelName) return false;
  const norm = normalizeSubject(mapelName);

  // Matches "pak", "pakbp", or "pak" followed by class level digits (10, 11, 12) or Roman numerals (x, xi, xii)
  if (/\b(pak)(?:bp|[\d]+|[xvi]+)?\b/i.test(norm)) return true;

  // "agama kristen", "pendidikan agama kristen", or Christian / Catholic religion studies
  if (norm.includes('kristen') || norm.includes('protestan') || norm.includes('katolik')) {
    return true;
  }

  return false;
}

/**
 * Returns required religion for a given subject ('Islam' for PAI, 'Kristen' for PAK, or null for general subjects)
 */
export function getRequiredReligionForSubject(mapelName?: string | null): 'Islam' | 'Kristen' | null {
  if (isPaiSubject(mapelName)) return 'Islam';
  if (isPakSubject(mapelName)) return 'Kristen';
  return null;
}

/**
 * Determines whether a student has an Islamic religious status
 */
export function isIslamStudent(
  student?: { agama?: string | null; status_agama?: string | null; religion?: string | null } | string | null
): boolean {
  if (!student) return false;
  const rawAgama = typeof student === 'string'
    ? student
    : (student.agama || student.status_agama || student.religion || (student as any).Agama || (student as any).Religion);
  if (!rawAgama) return false;
  const clean = String(rawAgama).trim().toLowerCase();
  return (
    clean === 'islam' ||
    clean.startsWith('islam') ||
    clean.includes('islam') ||
    clean === 'muslim' ||
    clean.includes('muslim') ||
    clean === 'moslem' ||
    clean.includes('moslem')
  );
}

/**
 * Determines whether a student has a Christian (or Catholic) religious status
 */
export function isKristenStudent(
  student?: { agama?: string | null; status_agama?: string | null; religion?: string | null } | string | null
): boolean {
  if (!student) return false;
  const rawAgama = typeof student === 'string'
    ? student
    : (student.agama || student.status_agama || student.religion || (student as any).Agama || (student as any).Religion);
  if (!rawAgama) return false;
  const clean = String(rawAgama).trim().toLowerCase();
  return (
    clean === 'kristen' ||
    clean.includes('kristen') ||
    clean.includes('protestan') ||
    clean.includes('katolik') ||
    clean.includes('christian') ||
    clean.includes('catholic')
  );
}

/**
 * Checks if a student is eligible for a specific subject based on their religious status.
 * - PAI: Only students with religion Islam are eligible.
 * - PAK: Only students with religion Kristen are eligible.
 * - General/Other subjects: All students are eligible.
 */
export function isStudentEligibleForSubject(
  student?: { agama?: string | null; status_agama?: string | null; religion?: string | null } | string | null,
  mapelName?: string | null
): boolean {
  if (!mapelName || !mapelName.trim()) return true;

  if (isPaiSubject(mapelName)) {
    return isIslamStudent(student);
  }

  if (isPakSubject(mapelName)) {
    return isKristenStudent(student);
  }

  return true;
}

/**
 * Filters a list of students for a given class and subject.
 * - For PAI (Pendidikan Agama Islam): strictly keeps only Islam students.
 * - For PAK (Pendidikan Agama Kristen): strictly keeps only Kristen students.
 * - For general subjects: returns all students without modification.
 */
export function filterStudentsBySubject<T extends { agama?: string | null; status_agama?: string | null; religion?: string | null }>(
  students: T[],
  mapelName?: string | null
): T[] {
  if (!Array.isArray(students)) return [];
  if (!mapelName || !mapelName.trim()) return students;

  if (isPaiSubject(mapelName)) {
    return students.filter(s => isIslamStudent(s));
  }

  if (isPakSubject(mapelName)) {
    return students.filter(s => isKristenStudent(s));
  }

  return students;
}

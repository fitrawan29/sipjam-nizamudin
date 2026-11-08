/**
 * Text formatting utility functions for SIPJAM application.
 */

// Standard Indonesian educational institution acronyms to preserve in uppercase
export const EDUCATIONAL_ACRONYMS = new Set([
  'SMA',
  'SMK',
  'SMP',
  'SD',
  'MA',
  'MTS',
  'MI',
  'SLB',
  'SMAN',
  'SMKN',
  'SMPN',
  'SDN',
  'MAN',
  'MTN',
  'MIN',
  'TK',
  'PAUD'
]);

/**
 * Capitalizes each word in a string while preserving specific educational acronyms.
 * 
 * Example:
 * - "sma nizamudin" -> "SMA Nizamudin"
 * - "SMK NEGERI 1 JAKARTA" -> "SMK Negeri 1 Jakarta"
 * - "sman 5 surabaya" -> "SMAN 5 Surabaya"
 */
export function capitalizeEachWord(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const words = trimmed.split(' ');
  const formattedWords = words.map(word => {
    // Preserve parentheses or punctuation around words if any
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (EDUCATIONAL_ACRONYMS.has(cleanWord)) {
      // Return acronym matching the punctuation pattern if applicable
      return word.replace(/[a-zA-Z0-9]+/g, cleanWord);
    }

    // Roman numerals check (I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII)
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i.test(cleanWord)) {
      return word.replace(/[a-zA-Z0-9]+/g, cleanWord);
    }

    // Standard title case: First letter uppercase, rest lowercase
    return word.replace(/[a-zA-Z0-9]+/g, match => {
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });
  });

  return formattedWords.join(' ');
}

/**
 * Normalizes appointment status prefix.
 * Returns 'Plt. ' for Plt, 'Plh. ' for Plh, and '' for Definitif or empty/null.
 */
export function normalizeStatusPrefix(status?: string | null): string {
  if (!status || typeof status !== 'string') return '';
  const clean = status.trim().toUpperCase();
  if (clean === 'PLT' || clean.startsWith('PLT')) return 'Plt. ';
  if (clean === 'PLH' || clean.startsWith('PLH')) return 'Plh. ';
  return '';
}

/**
 * Formats a Kepala Sekolah label based on appointment status (Definitif, Plt, Plh).
 * 
 * Rules:
 * - If status is Plt (case-insensitive) -> "Plt. Kepala Sekolah"
 * - If status is Plh (case-insensitive) -> "Plh. Kepala Sekolah"
 * - Otherwise (Definitif, null, undefined, empty) -> "Kepala Sekolah"
 * 
 * Examples:
 * - "Plt" -> "Plt. Kepala Sekolah"
 * - "Plh" -> "Plh. Kepala Sekolah"
 * - "Definitif" -> "Kepala Sekolah"
 * - "" / null -> "Kepala Sekolah"
 */
export function formatKepalaSekolahLabel(status?: string | null): string {
  const prefix = normalizeStatusPrefix(status);
  return prefix ? `${prefix}Kepala Sekolah` : 'Kepala Sekolah';
}

/**
 * Formats a school name into a standardized "Kepala [Nama Sekolah]" designation,
 * with optional appointment status (Definitif, Plt, Plh).
 * 
 * Rules:
 * 1. Trims whitespace and normalizes spaces.
 * 2. If empty or missing, returns "[Prefix]Kepala Sekolah".
 * 3. Strips existing leading "Plt.", "Plh.", "Kepala ", or "Kepala Sekolah " if present to avoid duplication.
 * 4. Converts school name to Capitalize Each Word while preserving Indonesian educational acronyms (SMA, SMK, SMP, SD, MA, MTS, MI, SLB, SMAN, SMKN, SMPN, SDN, MAN).
 * 5. Prepends "[Prefix]Kepala ".
 * 
 * Examples:
 * - "SMA NIZAMUDIN " -> "Kepala SMA Nizamudin"
 * - "smk negeri 2 mataram" -> "Kepala SMK Negeri 2 Mataram"
 * - "Kepala SMA NIZAMUDIN" -> "Kepala SMA Nizamudin"
 * - "" -> "Kepala Sekolah"
 * - ("", "Plt") -> "Plt. Kepala Sekolah"
 * - ("SMA NIZAMUDIN", "Plt") -> "Plt. Kepala SMA Nizamudin"
 * - ("Kepala Sekolah", "Plh") -> "Plh. Kepala Sekolah"
 */
export function formatKepalaSekolahTitle(schoolName?: string | null, status?: string | null): string {
  const prefix = normalizeStatusPrefix(status);

  if (!schoolName || typeof schoolName !== 'string') {
    return prefix ? `${prefix}Kepala Sekolah` : 'Kepala Sekolah';
  }

  let clean = schoolName.trim().replace(/\s+/g, ' ');
  if (!clean) {
    return prefix ? `${prefix}Kepala Sekolah` : 'Kepala Sekolah';
  }

  // Strip existing Plt. / Plh. prefixes to avoid duplication
  clean = clean.replace(/^(plt|plh)\.?\s*/i, '').trim();

  // Remove leading "Kepala Sekolah" or "Kepala" if already present
  if (/^kepala\s+sekolah(\s+|$)/i.test(clean)) {
    clean = clean.replace(/^kepala\s+sekolah\s*/i, '').trim();
  } else if (/^kepala(\s+|$)/i.test(clean)) {
    clean = clean.replace(/^kepala\s*/i, '').trim();
  }

  // If after stripping it's empty, fallback to "[Prefix]Kepala Sekolah"
  if (!clean) {
    return prefix ? `${prefix}Kepala Sekolah` : 'Kepala Sekolah';
  }

  const formattedSchool = capitalizeEachWord(clean);
  return `${prefix}Kepala ${formattedSchool}`;
}


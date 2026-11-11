/**
 * Utility Timezone WITA (Waktu Indonesia Tengah / GMT+8 / Asia/Makassar)
 * Semua fungsi tanggal dan waktu dalam aplikasi SIPJAM harus menggunakan utility ini
 * agar konsisten menggunakan zona waktu WITA, bukan UTC atau zona lokal perangkat.
 */

const WITA_TIMEZONE = 'Asia/Makassar';

/**
 * Mendapatkan objek Date yang sudah dinormalisasi ke waktu WITA
 */
export function getWitaNow(): Date {
  return new Date();
}

/**
 * Mendapatkan string tanggal WITA dalam format YYYY-MM-DD
 * Contoh: "2026-09-10"
 */
export function getWitaDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: WITA_TIMEZONE }).format(date);
}

/**
 * Mendapatkan string tanggal WITA dalam format panjang Indonesia
 * Contoh: "Rabu, 10 September 2026"
 */
export function getWitaDateLong(date: Date = new Date()): string {
  return date.toLocaleDateString('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Mendapatkan string waktu WITA dalam format HH:MM
 * Contoh: "14:30"
 */
export function getWitaTimeStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hh = (parts.find(p => p.type === 'hour')?.value || '00').replace('24', '00').padStart(2, '0');
  const mm = (parts.find(p => p.type === 'minute')?.value || '00').padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Mendapatkan string waktu WITA dalam format HH:mm:ss
 * Contoh: "14:30:05"
 */
export function getWitaTimeWithSecondsStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hh = (parts.find(p => p.type === 'hour')?.value || '00').replace('24', '00').padStart(2, '0');
  const mm = (parts.find(p => p.type === 'minute')?.value || '00').padStart(2, '0');
  const ss = (parts.find(p => p.type === 'second')?.value || '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Mengekstrak tanggal WITA (YYYY-MM-DD) dari berbagai format timestamp database.
 * Mendukung ISO dengan Z/+00/+08:00, "YYYY-MM-DD HH:mm:ss", dan "M/D/YYYY H:mm:ss".
 */
export function extractWitaDateStr(rawTs: string | Date | null | undefined): string | null {
  if (!rawTs) return null;
  if (rawTs instanceof Date) {
    return isNaN(rawTs.getTime()) ? null : getWitaDateStr(rawTs);
  }
  const str = String(rawTs).trim();
  if (!str || str === '-') return null;

  // Jika memiliki indikator zona waktu eksplisit (Z, +00, +08:00, dll), konversi ke tanggal WITA
  if (str.endsWith('Z') || /[+-]\d{2}(?::?\d{2})?$/.test(str)) {
    const normalizedIso = str
      .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
      .replace(/([+-]\d{2})$/, '$1:00');
    const d = new Date(normalizedIso);
    if (!isNaN(d.getTime())) {
      return getWitaDateStr(d);
    }
  }

  // Format YYYY-MM-DD...
  const ymdMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymdMatch) return ymdMatch[1];

  // Format M/D/YYYY...
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Mendapatkan nama hari dalam bahasa Indonesia sesuai zona WITA
 * Contoh: "Rabu"
 */
export function getWitaDayName(date: Date = new Date()): string {
  return date.toLocaleDateString('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
  });
}

/**
 * Mendapatkan ISO timestamp yang sudah di-tag offset WITA (+08:00)
 * Format: "2026-09-10T14:30:00+08:00"
 */
export function getWitaTimestamp(date: Date = new Date()): string {
  // Buat representasi WITA dari date
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  const hh = get('hour').replace('24', '00').padStart(2, '0');
  return `${get('year')}-${get('month')}-${get('day')}T${hh}:${get('minute')}:${get('second')}+08:00`;
}

/**
 * Mendapatkan awal hari WITA (00:00:00) dalam format timestamp WITA (+08:00)
 * Berguna untuk query range pada Supabase (menghindari bug komparasi leksikal)
 */
export function getWitaStartOfDay(dateStr?: string): string {
  const d = dateStr || getWitaDateStr();
  return `${d}T00:00:00+08:00`;
}

/**
 * Mendapatkan akhir hari WITA (23:59:59) dalam format timestamp WITA (+08:00)
 * Berguna untuk query range pada Supabase
 */
export function getWitaEndOfDay(dateStr?: string): string {
  const d = dateStr || getWitaDateStr();
  return `${d}T23:59:59+08:00`;
}

/**
 * Format timestamp dari database ke tampilan Indonesia dengan timezone WITA
 * Contoh: "10/9/2026 14.30.00"
 */
export function formatTimestampWita(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp; // Jika parsing gagal, kembalikan string asli
  return date.toLocaleString('id-ID', { timeZone: WITA_TIMEZONE });
}

/**
 * Format tanggal dari database ke tampilan Indonesia dengan timezone WITA
 * Contoh: "10 September 2026"
 */
export function formatDateWita(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+08:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('id-ID', {
    timeZone: WITA_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Normalizes and formats attendance time string into HH:mm (WITA).
 * Returns null if raw time is missing, '-', or an auto/system placeholder.
 * Handles diverse inputs like "06:30:15", "6:30", "06.45", "02:30 PM", "2026-11-03 07:15:00", etc.
 */
export function formatPresensiTime(rawTime: string | null | undefined | Date): string | null {
  if (!rawTime) return null;
  if (rawTime instanceof Date) {
    return isNaN(rawTime.getTime()) ? null : getWitaTimeStr(rawTime);
  }
  const str = String(rawTime).trim();
  if (
    !str ||
    str === '-' ||
    str.toLowerCase().includes('auto') ||
    str.toLowerCase().includes('sistem') ||
    str.toLowerCase().includes('null') ||
    str.toLowerCase().includes('undefined')
  ) {
    return null;
  }

  // Handle ISO datetime strings with timezone offset or UTC 'Z' (e.g. "2026-11-03T06:15:00.000Z", "2026-11-03 22:30:00+00")
  if (str.endsWith('Z') || /[+-]\d{2}(?::?\d{2})?$/.test(str)) {
    const normalizedIso = str
      .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
      .replace(/([+-]\d{2})$/, '$1:00');
    const d = new Date(normalizedIso);
    if (!isNaN(d.getTime())) {
      return getWitaTimeStr(d);
    }
  }

  // Check for 12-hour AM / PM indicators
  const ampmMatch = str.match(/\b(am|pm)\b/i);
  const isPM = ampmMatch ? ampmMatch[1].toLowerCase() === 'pm' : false;
  const isAM = ampmMatch ? ampmMatch[1].toLowerCase() === 'am' : false;

  // Match time with colon or dot separator, e.g. "06:45", "6:45", "06.45", "14:05:30", "2026-11-03 07:15:00"
  const match = str.match(/(?:^|\s|T)?(\d{1,2})[:.](\d{2})/);
  if (match) {
    let hh = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);

    if (isNaN(hh) || isNaN(mm) || mm < 0 || mm > 59) {
      return null;
    }

    if (isPM) {
      if (hh < 12) hh += 12;
      else if (hh > 12) return null;
    } else if (isAM) {
      if (hh === 12) hh = 0;
      else if (hh > 12) return null;
    }

    if (hh < 0 || hh > 23) {
      return null;
    }

    const hhStr = String(hh).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    return `${hhStr}:${mmStr}`;
  }

  return null;
}

/**
 * Konversi string waktu "HH:mm" atau "HH.mm" ke menit sejak tengah malam (0 - 1439).
 * Menggunakan formatPresensiTime untuk normalisasi string terlebih dahulu.
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const normalized = formatPresensiTime(str) || str;
  const match = normalized.match(/(?:^|\s|T)?(\d{1,2})[:.](\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }
  const [h, m] = str.replace(/\./g, ':').split(':').map(Number);
  return (!isNaN(h) ? h : 0) * 60 + (!isNaN(m) ? m : 0);
}



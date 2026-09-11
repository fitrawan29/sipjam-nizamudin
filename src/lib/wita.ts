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
  return date.toLocaleTimeString('id-ID', {
    timeZone: WITA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
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
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+08:00`;
}

/**
 * Mendapatkan awal hari WITA (00:00:00) dalam ISO string UTC
 * Berguna untuk query range pada Supabase
 */
export function getWitaStartOfDay(dateStr?: string): string {
  const d = dateStr || getWitaDateStr();
  // WITA 00:00:00 = UTC 16:00:00 hari sebelumnya (karena +8)
  const utcDate = new Date(`${d}T00:00:00+08:00`);
  return utcDate.toISOString();
}

/**
 * Mendapatkan akhir hari WITA (23:59:59.999) dalam ISO string UTC
 * Berguna untuk query range pada Supabase
 */
export function getWitaEndOfDay(dateStr?: string): string {
  const d = dateStr || getWitaDateStr();
  // WITA 23:59:59.999 = UTC 15:59:59.999 hari berikutnya
  const utcDate = new Date(`${d}T23:59:59.999+08:00`);
  return utcDate.toISOString();
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

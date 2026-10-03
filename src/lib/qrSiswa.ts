/**
 * Utility functions for Student QR Code generation, scanning resolution,
 * and attendance (presensi) recording in SIPJAM.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface QrOptions {
  size?: number;
  margin?: number;
  fgColor?: string;
  bgColor?: string;
}

export interface StudentReference {
  id: string;
  nisn?: string | null;
  nama_siswa: string;
  kelas: string;
  sekolah_id: string;
  qr_code?: string | null;
  gender?: string | null;
  status?: string | null;
}

export interface RecordPresensiParams {
  siswa: StudentReference;
  status: 'datang' | 'pulang';
  sekolahId?: string | null;
  tanggal?: string; // YYYY-MM-DD
  jam?: string;     // HH:mm:ss
  deviceId?: string;
}

export interface RecordPresensiResult {
  success: boolean;
  alreadyExists?: boolean;
  data?: any;
  message: string;
  error?: any;
}

// ============================================================================
// 1. PURE TYPESCRIPT QR CODE GENERATOR (ZERO EXTERNAL DEPENDENCY)
// ============================================================================

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
let gfX = 1;
for (let i = 0; i < 255; i++) {
  GF_EXP[i] = gfX;
  GF_EXP[i + 255] = gfX;
  GF_LOG[gfX] = i;
  gfX = (gfX << 1) ^ (gfX & 128 ? 0x11d : 0);
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, degree: number): Uint8Array {
  const gen = rsGeneratorPoly(degree);
  const res = new Uint8Array(degree);
  for (let i = 0; i < data.length; i++) {
    const lead = data[i] ^ res[0];
    for (let j = 0; j < degree - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(lead, gen[degree - 1 - j]);
    }
    res[degree - 1] = gfMul(lead, gen[0]);
  }
  return res;
}

interface QrVersionSpec {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  ecCodewords: number;
  alignCoords: number[];
}

const QR_SPECS_L: QrVersionSpec[] = [
  { version: 1, totalCodewords: 26, dataCodewords: 19, ecCodewords: 7, alignCoords: [] },
  { version: 2, totalCodewords: 44, dataCodewords: 34, ecCodewords: 10, alignCoords: [6, 18] },
  { version: 3, totalCodewords: 70, dataCodewords: 55, ecCodewords: 15, alignCoords: [6, 22] },
  { version: 4, totalCodewords: 100, dataCodewords: 80, ecCodewords: 20, alignCoords: [6, 26] },
];

function encodeQrData(text: string): { spec: QrVersionSpec; codewords: Uint8Array } {
  const utf8 = new TextEncoder().encode(text);
  const bitLength = 4 + 8 + utf8.length * 8;
  const byteLength = Math.ceil(bitLength / 8);

  const spec = QR_SPECS_L.find(s => s.dataCodewords >= byteLength);
  if (!spec) {
    throw new Error(`Data too large for QR generator (${text.length} chars). Maximum is 78 bytes.`);
  }

  const data = new Uint8Array(spec.dataCodewords);
  let bitIdx = 0;
  function writeBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      const bit = (val >> i) & 1;
      const bytePos = Math.floor(bitIdx / 8);
      const bitPos = 7 - (bitIdx % 8);
      if (bit) data[bytePos] |= 1 << bitPos;
      bitIdx++;
    }
  }

  // Byte mode 0100
  writeBits(0b0100, 4);
  // Length 8 bits
  writeBits(utf8.length, 8);
  // Data
  for (let i = 0; i < utf8.length; i++) {
    writeBits(utf8[i], 8);
  }
  // Terminator
  const terminatorBits = Math.min(4, spec.dataCodewords * 8 - bitIdx);
  writeBits(0, terminatorBits);
  // Align
  while (bitIdx % 8 !== 0) {
    writeBits(0, 1);
  }
  // Pad bytes
  let padToggle = false;
  while (bitIdx < spec.dataCodewords * 8) {
    writeBits(padToggle ? 0x11 : 0xec, 8);
    padToggle = !padToggle;
  }

  // EC codewords
  const ec = rsComputeRemainder(data, spec.ecCodewords);

  const allCodewords = new Uint8Array(spec.totalCodewords);
  allCodewords.set(data, 0);
  allCodewords.set(ec, spec.dataCodewords);

  return { spec, codewords: allCodewords };
}

export function generateQrMatrix(text: string): boolean[][] {
  const { spec, codewords } = encodeQrData(text);
  const size = spec.version * 4 + 17;

  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns
  function addFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isDark = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setFunction(nr, nc, isDark);
          } else {
            setFunction(nr, nc, false);
          }
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment patterns
  if (spec.alignCoords.length > 0) {
    for (const rCenter of spec.alignCoords) {
      for (const cCenter of spec.alignCoords) {
        if (
          (rCenter < 9 && cCenter < 9) ||
          (rCenter < 9 && cCenter > size - 10) ||
          (rCenter > size - 10 && cCenter < 9)
        ) {
          continue;
        }
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isDark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
            setFunction(rCenter + r, cCenter + c, isDark);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunction(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunction(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setFunction(size - 8, 8, true);

  // 5. Reserve format info
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i <= 7; i++) {
    isFunction[size - 1 - i][8] = true;
    isFunction[8][size - 1 - i] = true;
  }

  // 6. Data bits placement with Mask 0
  let bitPos = 0;
  const totalDataBits = codewords.length * 8;
  let right = size - 1;
  let goingUp = true;

  while (right > 0) {
    if (right === 6) right--;

    const rows = goingUp
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = right - cOffset;
        if (!isFunction[r][c]) {
          let bit = false;
          if (bitPos < totalDataBits) {
            const byteIdx = Math.floor(bitPos / 8);
            const bitOffset = 7 - (bitPos % 8);
            bit = ((codewords[byteIdx] >> bitOffset) & 1) === 1;
            bitPos++;
          }
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !bit : bit;
        }
      }
    }
    right -= 2;
    goingUp = !goingUp;
  }

  // 7. Format Information (Level L, Mask 0: 0x77c4)
  const formatBits = 0x77c4;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> i) & 1) === 1;
    if (i < 6) {
      matrix[8][i] = bit;
    } else if (i === 6) {
      matrix[8][7] = bit;
    } else if (i === 7) {
      matrix[8][8] = bit;
    } else if (i === 8) {
      matrix[7][8] = bit;
    } else {
      matrix[14 - i][8] = bit;
    }

    if (i < 8) {
      matrix[size - 1 - i][8] = bit;
    } else {
      matrix[8][size - 15 + i] = bit;
    }
  }

  return matrix.map(row => row.map(cell => cell === true));
}

/**
 * Generates an SVG string containing the QR code for a given text identifier.
 */
export function generateStudentQrSvg(text: string, options: QrOptions = {}): string {
  const matrix = generateQrMatrix(text);
  const moduleCount = matrix.length;
  const margin = options.margin ?? 3;
  const totalModules = moduleCount + margin * 2;
  const size = options.size ?? 220;
  const fgColor = options.fgColor ?? '#0B4619'; // SIPJAM emerald green
  const bgColor = options.bgColor ?? '#FFFFFF';

  let pathD = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        pathD += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <path d="${pathD.trim()}" fill="${fgColor}"/>
</svg>`;
}

/**
 * Generates a data URL for embedding the QR code SVG directly in <img src="..." />.
 */
export function generateStudentQrDataUrl(text: string, options: QrOptions = {}): string {
  const svg = generateStudentQrSvg(text, options);
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
  }
  // Node.js fallback
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// ============================================================================
// 2. IDENTIFIER & LOOKUP RESOLUTION
// ============================================================================

/**
 * Extracts or computes the primary QR code string identifier for a student.
 */
export function getStudentQrIdentifier(siswa: { id: string; nisn?: string | null; qr_code?: string | null }): string {
  return (siswa.qr_code && siswa.qr_code.trim()) || (siswa.nisn && siswa.nisn.trim()) || siswa.id;
}

/**
 * Resolves a student from scanned barcode/QR text.
 * Matches sequentially against qr_code, nisn, and id, respecting multi-tenant sekolah_id.
 */
export async function resolveStudentByCode(
  supabaseClient: SupabaseClient | any,
  scannedCode: string,
  sekolahId?: string | null
): Promise<{ data: StudentReference | null; error: any | null }> {
  const cleanCode = (scannedCode || '').trim();
  if (!cleanCode) {
    return { data: null, error: new Error('Kode scan kosong.') };
  }

  try {
    // 1. Check exact match on qr_code
    let queryQr = supabaseClient
      .from('data_siswa')
      .select('*')
      .eq('qr_code', cleanCode);
    if (sekolahId) queryQr = queryQr.eq('sekolah_id', sekolahId);
    const { data: byQr, error: errQr } = await queryQr.maybeSingle();

    if (byQr) {
      return { data: byQr as StudentReference, error: null };
    }

    // 2. Check exact match on nisn
    let queryNisn = supabaseClient
      .from('data_siswa')
      .select('*')
      .eq('nisn', cleanCode);
    if (sekolahId) queryNisn = queryNisn.eq('sekolah_id', sekolahId);
    const { data: byNisn } = await queryNisn.maybeSingle();

    if (byNisn) {
      return { data: byNisn as StudentReference, error: null };
    }

    // 3. Check if cleanCode is UUID, then match on id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);
    if (isUuid) {
      let queryId = supabaseClient
        .from('data_siswa')
        .select('*')
        .eq('id', cleanCode);
      if (sekolahId) queryId = queryId.eq('sekolah_id', sekolahId);
      const { data: byId } = await queryId.maybeSingle();

      if (byId) {
        return { data: byId as StudentReference, error: null };
      }
    }

    // 4. Case-insensitive / trimmed fallback on nisn (sanitizing SQL wildcards % and _)
    const sanitizedNisn = cleanCode.replace(/[%_\\]/g, '').trim();
    if (sanitizedNisn) {
      let queryIl = supabaseClient
        .from('data_siswa')
        .select('*')
        .ilike('nisn', sanitizedNisn);
      if (sekolahId) queryIl = queryIl.eq('sekolah_id', sekolahId);
      const { data: byIl } = await queryIl.maybeSingle();

      if (byIl) {
        return { data: byIl as StudentReference, error: null };
      }
    }

    return {
      data: null,
      error: new Error(`Siswa dengan kode "${cleanCode}" tidak ditemukan.`)
    };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// ============================================================================
// 3. PRESENSI RECORDING & UPSERT
// ============================================================================

/**
 * Returns current date string formatted as YYYY-MM-DD in local time.
 */
export function getLocalTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time string formatted as HH:mm:ss in local time.
 */
export function getLocalCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Records or upserts student attendance into presensi_siswa.
 * Accurately prevents duplicate entries for the same status on the same day.
 */
export async function recordPresensiSiswa(
  supabaseClient: SupabaseClient | any,
  params: RecordPresensiParams
): Promise<RecordPresensiResult> {
  const { siswa, status } = params;
  const sekolahId = params.sekolahId || siswa.sekolah_id;
  const tanggal = params.tanggal || getLocalTodayDate();
  const jam = params.jam || getLocalCurrentTime();
  const deviceId = params.deviceId || 'kiosk-default';

  if (!sekolahId) {
    return {
      success: false,
      message: 'ID Sekolah tidak ditemukan pada data siswa.',
      error: new Error('Missing sekolah_id')
    };
  }

  try {
    // 1. Check existing record for today
    const { data: existing, error: errCheck } = await supabaseClient
      .from('presensi_siswa')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)
      .eq('siswa_id', siswa.id)
      .eq('status', status)
      .maybeSingle();

    if (existing) {
      const jamDisplay = existing.jam ? existing.jam.slice(0, 5) : jam.slice(0, 5);
      return {
        success: false,
        alreadyExists: true,
        data: existing,
        message: `${siswa.nama_siswa} (${siswa.kelas}) sudah tercatat presensi ${status} hari ini pada pk. ${jamDisplay}.`
      };
    }

    // 2. Insert new attendance record
    const payload = {
      sekolah_id: sekolahId,
      siswa_id: siswa.id,
      nisn: siswa.nisn || null,
      nama_siswa: siswa.nama_siswa,
      kelas: siswa.kelas,
      tanggal,
      status,
      jam,
      timestamp: new Date().toISOString(),
      device_id: deviceId
    };

    const { data: inserted, error: insertError } = await supabaseClient
      .from('presensi_siswa')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      // Handle race condition unique violation (Postgres error 23505)
      if (insertError.code === '23505') {
        return {
          success: false,
          alreadyExists: true,
          message: `${siswa.nama_siswa} sudah tercatat presensi ${status} hari ini.`,
          error: insertError
        };
      }
      return {
        success: false,
        message: `Gagal mencatat presensi: ${insertError.message}`,
        error: insertError
      };
    }

    return {
      success: true,
      alreadyExists: false,
      data: inserted,
      message: `Presensi ${status} berhasil: ${siswa.nama_siswa} (${siswa.kelas}) - pk. ${jam.slice(0, 5)}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan sistem saat mencatat presensi.',
      error: err
    };
  }
}

/**
 * Ensures the student has an assigned `qr_code` value in `data_siswa`.
 */
export async function ensureStudentQrCode(
  supabaseClient: SupabaseClient | any,
  siswaId: string,
  customCode?: string
): Promise<{ qr_code: string; error?: any }> {
  try {
    const { data: current } = await supabaseClient
      .from('data_siswa')
      .select('id, nisn, qr_code')
      .eq('id', siswaId)
      .single();

    if (current?.qr_code) {
      return { qr_code: current.qr_code };
    }

    const codeToSet = customCode || current?.nisn || current?.id || siswaId;
    const { error: updateErr } = await supabaseClient
      .from('data_siswa')
      .update({ qr_code: codeToSet })
      .eq('id', siswaId);

    if (updateErr) {
      return { qr_code: codeToSet, error: updateErr };
    }

    return { qr_code: codeToSet };
  } catch (err: any) {
    return { qr_code: siswaId, error: err };
  }
}

// ============================================================================
// 4. REPORTING & SYNC HELPERS
// ============================================================================

/**
 * Fetches today's attendance summary (counts of datang, pulang, and total students).
 */
export async function getTodayPresensiSummary(
  supabaseClient: SupabaseClient | any,
  sekolahId: string,
  tanggal?: string
): Promise<{ totalDatang: number; totalPulang: number; totalUnik: number }> {
  const tgl = tanggal || getLocalTodayDate();
  try {
    const { data, error } = await supabaseClient
      .from('presensi_siswa')
      .select('siswa_id, status')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tgl);

    if (error || !data) {
      return { totalDatang: 0, totalPulang: 0, totalUnik: 0 };
    }

    let datang = 0;
    let pulang = 0;
    const uniqueIds = new Set<string>();

    for (const row of data) {
      if (row.status === 'datang') datang++;
      if (row.status === 'pulang') pulang++;
      if (row.siswa_id) uniqueIds.add(row.siswa_id);
    }

    return { totalDatang: datang, totalPulang: pulang, totalUnik: uniqueIds.size };
  } catch {
    return { totalDatang: 0, totalPulang: 0, totalUnik: 0 };
  }
}

/**
 * Fetches attendance list for a specific class on a date (useful for Wali Kelas & Guru Mapel).
 */
export async function getPresensiSiswaByKelas(
  supabaseClient: SupabaseClient | any,
  sekolahId: string,
  kelas: string,
  tanggal?: string,
  status?: 'datang' | 'pulang'
): Promise<any[]> {
  const tgl = tanggal || getLocalTodayDate();
  try {
    let query = supabaseClient
      .from('presensi_siswa')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('kelas', kelas)
      .eq('tanggal', tgl)
      .order('jam', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Fetches recent attendance events today for live feed stream display.
 */
export async function getRecentPresensiSiswa(
  supabaseClient: SupabaseClient | any,
  sekolahId: string,
  tanggal?: string,
  limit = 50
): Promise<any[]> {
  const tgl = tanggal || getLocalTodayDate();
  try {
    const { data, error } = await supabaseClient
      .from('presensi_siswa')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tgl)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

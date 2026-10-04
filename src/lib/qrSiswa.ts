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

// ============================================================================
// 5. STUDENT IDENTITY & QR CARD GENERATOR (HTML5 CANVAS & PNG DOWNLOAD)
// ============================================================================

export interface GenerateStudentCardParams {
  student: {
    id: string;
    nama_siswa?: string | null;
    nisn?: string | null;
    kelas?: string | null;
    gender?: string | null;
    status?: string | null;
    qr_code?: string | null;
    [key: string]: any;
  };
  schoolName?: string;
  qrIdentifier?: string;
}

export interface PrintStudentCardParams {
  student: any;
  schoolName?: string;
  qrSvg?: string;
  qrIdentifier?: string;
}

/**
 * Helper to safely draw rounded rectangles across browser canvas engines.
 */
function drawCanvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates an official portrait student digital attendance card (600 x 960 px)
 * on an HTML5 Canvas element with emerald & gold themes, school branding,
 * sharp QR matrix, student metadata box, and instructions footer.
 */
export function generateStudentCardCanvas({
  student,
  schoolName = 'SIPJAM',
  qrIdentifier,
}: GenerateStudentCardParams): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    // Graceful fallback for non-browser/Node.js testing environments
    return {
      width: 600,
      height: 960,
      toDataURL: (_type = 'image/png') =>
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Base card background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 600, 960);

  // Card outer border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  drawCanvasRoundRect(ctx, 2, 2, 596, 956, 20);
  ctx.stroke();

  // 2. Header: Gradient emerald theme (#0B4619 to #166534)
  const headerGrad = ctx.createLinearGradient(0, 0, 600, 175);
  headerGrad.addColorStop(0, '#0B4619');
  headerGrad.addColorStop(1, '#166534');
  ctx.fillStyle = headerGrad;

  ctx.beginPath();
  ctx.moveTo(2, 20);
  ctx.quadraticCurveTo(2, 2, 20, 2);
  ctx.lineTo(580, 2);
  ctx.quadraticCurveTo(598, 2, 598, 20);
  ctx.lineTo(598, 175);
  ctx.lineTo(2, 175);
  ctx.closePath();
  ctx.fill();

  // Gold accent line (#EAB308)
  ctx.fillStyle = '#EAB308';
  ctx.fillRect(2, 175, 596, 4);

  // Header Typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title: "KARTU PRESENSI DIGITAL"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('KARTU PRESENSI DIGITAL', 300, 48);

  // School Name (Gold / Yellow Accent)
  const displaySchool = (schoolName || 'SIPJAM').trim().toUpperCase();
  ctx.fillStyle = '#FEF08A';
  if (displaySchool.length > 32) {
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  } else if (displaySchool.length > 22) {
    ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
  } else {
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  }
  ctx.fillText(displaySchool, 300, 90);

  // Subtitle: "Sistem Informasi Presensi Siswa"
  ctx.fillStyle = '#BBF7D0';
  ctx.font = '500 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('Sistem Informasi Presensi Siswa', 300, 130);

  // 3. QR Container: Rounded white box (270x270 px) with drop shadow
  const qrBoxX = 165;
  const qrBoxY = 205;
  const qrBoxSize = 270;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#FFFFFF';
  drawCanvasRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  drawCanvasRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.stroke();

  // 4. Sharp QR Matrix in #0B4619 color (220x220 px)
  const idStr = qrIdentifier || getStudentQrIdentifier(student);
  const matrix = generateQrMatrix(idStr);
  const qrSize = 210;
  const moduleCount = matrix.length;
  const moduleSize = qrSize / moduleCount;
  const qrX = qrBoxX + (qrBoxSize - qrSize) / 2;
  const qrY = qrBoxY + 16;

  ctx.fillStyle = '#0B4619';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          qrX + c * moduleSize,
          qrY + r * moduleSize,
          moduleSize + 0.5,
          moduleSize + 0.5
        );
      }
    }
  }

  // Monospace Badge: ID: ${qrIdentifier}
  const badgeY = qrY + qrSize + 16;
  const badgeWidth = Math.min(240, Math.max(160, idStr.length * 9 + 40));
  const badgeX = 300 - badgeWidth / 2;

  ctx.fillStyle = '#F1F5F9';
  drawCanvasRoundRect(ctx, badgeX, badgeY - 11, badgeWidth, 22, 6);
  ctx.fill();

  ctx.fillStyle = '#0B4619';
  ctx.font = 'bold 12px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ID: ${idStr}`, 300, badgeY);

  // 5. Student Identity Box
  const infoBoxX = 45;
  const infoBoxY = 500;
  const infoBoxWidth = 510;
  const infoBoxHeight = 315;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#FFFFFF';
  drawCanvasRoundRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 16);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  drawCanvasRoundRect(ctx, infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 16);
  ctx.stroke();

  // Full Name (student.nama_siswa)
  const namaSiswa = (student.nama_siswa || 'Siswa').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0F172A';
  if (namaSiswa.length > 28) {
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
  } else if (namaSiswa.length > 20) {
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  } else {
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  }
  ctx.fillText(namaSiswa, 300, infoBoxY + 36);

  // Status Badge: "SISWA AKTIF"
  const rawStatus = (student.status || 'Aktif').trim();
  const statusLabel = rawStatus.toUpperCase().includes('AKTIF') ? 'SISWA AKTIF' : rawStatus.toUpperCase();
  const statusPillWidth = 110;
  ctx.fillStyle = '#DCFCE7';
  drawCanvasRoundRect(ctx, 300 - statusPillWidth / 2, infoBoxY + 58, statusPillWidth, 22, 11);
  ctx.fill();

  ctx.strokeStyle = '#86EFAC';
  ctx.lineWidth = 1;
  drawCanvasRoundRect(ctx, 300 - statusPillWidth / 2, infoBoxY + 58, statusPillWidth, 22, 11);
  ctx.stroke();

  ctx.fillStyle = '#166534';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(statusLabel, 300, infoBoxY + 69);

  // Horizontal divider
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(infoBoxX + 25, infoBoxY + 95);
  ctx.lineTo(infoBoxX + infoBoxWidth - 25, infoBoxY + 95);
  ctx.stroke();

  // Identity Rows: NISN, Kelas, Sekolah, Gender
  const identityRows = [
    { label: 'NISN', value: student.nisn || '-', isMono: true },
    { label: 'Kelas', value: student.kelas || '-', isMono: false },
    { label: 'Sekolah', value: schoolName || 'SIPJAM', isMono: false },
    { label: 'Gender', value: student.gender || '-', isMono: false },
  ];

  let currentY = infoBoxY + 126;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const item of identityRows) {
    ctx.font = '500 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(item.label, infoBoxX + 35, currentY);

    ctx.fillText(':', infoBoxX + 130, currentY);

    if (item.isMono) {
      ctx.font = 'bold 16px "Courier New", Courier, monospace';
    } else {
      ctx.font = '600 15px system-ui, -apple-system, sans-serif';
    }
    ctx.fillStyle = '#0F172A';

    let displayVal = item.value;
    if (displayVal.length > 32) {
      displayVal = displayVal.substring(0, 30) + '...';
    }
    ctx.fillText(displayVal, infoBoxX + 145, currentY);

    currentY += 40;
  }

  // 6. Footer: instructions and branding
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Instructions
  ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Tunjukkan kartu ini pada scanner saat presensi datang & pulang', 300, 858);

  // Branding: "SIPJAM • Dokumen Resmi Presensi"
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#0B4619';
  ctx.fillText('SIPJAM • Dokumen Resmi Presensi', 300, 890);

  // Bottom emerald accent bar
  const bottomGrad = ctx.createLinearGradient(0, 946, 600, 958);
  bottomGrad.addColorStop(0, '#0B4619');
  bottomGrad.addColorStop(1, '#166534');
  ctx.fillStyle = bottomGrad;
  ctx.beginPath();
  ctx.moveTo(2, 946);
  ctx.lineTo(598, 946);
  ctx.lineTo(598, 940);
  ctx.quadraticCurveTo(598, 958, 580, 958);
  ctx.lineTo(20, 958);
  ctx.quadraticCurveTo(2, 958, 2, 940);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

/**
 * Generates and downloads student card as PNG image file.
 * Filename format: Kartu_Presensi_${student.nama_siswa || 'Siswa'}_${student.nisn || student.id}.png
 */
export function downloadStudentCardPng({
  student,
  schoolName = 'SIPJAM',
  qrIdentifier,
}: GenerateStudentCardParams): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = generateStudentCardCanvas({ student, schoolName, qrIdentifier });
    const dataUrl = canvas.toDataURL('image/png');

    const rawName = student?.nama_siswa || 'Siswa';
    const rawId = student?.nisn || student?.id || 'ID';
    const safeName = rawName.replace(/[/\\?%*:|"<>]/g, '').trim().replace(/\s+/g, '_');
    const safeId = String(rawId).replace(/[/\\?%*:|"<>]/g, '').trim();
    const fileName = `Kartu_Presensi_${safeName}_${safeId}.png`;

    const downloadLink = document.createElement('a');
    downloadLink.download = fileName;
    downloadLink.href = dataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return true;
  } catch (err) {
    console.error('[qrSiswa] downloadStudentCardPng error:', err);
    return false;
  }
}

/**
 * Enhanced single student card print popup with school name and formatted print layout.
 */
export function printStudentQrCardWithSchool({
  student,
  schoolName = 'SIPJAM',
  qrSvg,
  qrIdentifier,
}: PrintStudentCardParams): void {
  if (typeof window === 'undefined') return;

  const identifier = qrIdentifier || getStudentQrIdentifier(student);
  const svg = qrSvg || generateStudentQrSvg(identifier, { size: 180, fgColor: '#0B4619' });
  const printWindow = window.open('', '_blank', 'width=700,height=800');
  if (!printWindow) return;

  const escapeHtml = (str: string) => {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Kartu Presensi Siswa - ${escapeHtml(student?.nama_siswa || 'Siswa')}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; padding: 20px; }
        .card { width: 360px; background: white; border: 2px solid #0B4619; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0B4619 0%, #166534 100%); color: white; padding: 18px 16px 14px; text-align: center; border-bottom: 3px solid #EAB308; }
        .school { font-size: 15px; font-weight: 800; color: #FEF08A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .title { font-size: 13px; font-weight: 800; letter-spacing: 1px; }
        .sub { font-size: 10px; color: #BBF7D0; margin-top: 2px; }
        .body { padding: 18px 20px; text-align: center; }
        .qr-box { background: #ffffff; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 12px; display: inline-block; margin: 0 auto 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .qr-box svg { display: block; margin: 0 auto; }
        .id-badge { font-family: monospace; font-size: 11px; font-weight: 700; color: #0B4619; background: #ECFDF5; padding: 3px 10px; border-radius: 6px; display: inline-block; margin-top: 6px; }
        .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; text-align: left; margin-top: 10px; }
        .name { font-size: 15px; font-weight: 800; color: #0F172A; text-align: center; margin-bottom: 4px; }
        .status-badge { text-align: center; margin-bottom: 10px; }
        .status-pill { font-size: 10px; font-weight: 700; color: #166534; background: #DCFCE7; padding: 2px 8px; border-radius: 9999px; display: inline-block; }
        .info-row { display: flex; font-size: 12px; margin-bottom: 4px; }
        .info-label { width: 90px; color: #64748B; }
        .info-colon { margin-right: 6px; color: #64748B; }
        .info-val { font-weight: 600; color: #0F172A; flex: 1; word-break: break-word; }
        .footer { padding: 10px 16px 14px; text-align: center; border-top: 1px dashed #CBD5E1; font-size: 10px; color: #64748B; background: #FAFAFA; }
        .footer-brand { font-weight: 700; color: #0B4619; margin-top: 2px; }
        @media print {
          body { background: white; padding: 0; min-height: auto; }
          .card { box-shadow: none; border: 1.5px solid #0B4619; page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="school">${escapeHtml(schoolName)}</div>
          <div class="title">KARTU PRESENSI DIGITAL</div>
          <div class="sub">Sistem Informasi Presensi Siswa</div>
        </div>
        <div class="body">
          <div class="qr-box">
            ${svg}
            <div class="id-badge">ID: ${escapeHtml(identifier)}</div>
          </div>
          <div class="info-box">
            <div class="name">${escapeHtml(student?.nama_siswa || '-')}</div>
            <div class="status-badge">
              <span class="status-pill">${escapeHtml(student?.status ? student.status.toUpperCase() : 'SISWA AKTIF')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">NISN</span><span class="info-colon">:</span><span class="info-val" style="font-family: monospace;">${escapeHtml(student?.nisn || '-')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Kelas</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(student?.kelas || '-')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sekolah</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(schoolName)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gender</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(student?.gender || '-')}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <div>Tunjukkan kartu ini pada scanner saat presensi datang &amp; pulang</div>
          <div class="footer-brand">SIPJAM &bull; Dokumen Resmi Presensi</div>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

import { SupabaseClient } from '@supabase/supabase-js';
import { getWitaTimeStr, getWitaDayName, formatPresensiTime } from '@/lib/wita';
import { isStudentEligibleForSubject } from '@/lib/agamaFilter';

export type IntervensiPhase = 'pagi' | 'kbm' | 'pulang' | 'malam_tutup';

export interface WaliIntervensiCheck {
  allowed: boolean;
  phase: IntervensiPhase;
  label: string;
  pesan: string;
}

export interface JadwalIntervensiWali {
  batasPagi: string;
  jamPulangMulai: string;
  jamPulangPiketAkhir?: string;
  jamBatasMalam: string;
}

/**
 * Normalizes time string to HH:mm, leveraging formatPresensiTime for rich format support.
 */
function normalizeTime(t: string): string {
  const formatted = formatPresensiTime(t);
  if (formatted) return formatted;
  const parts = (t || '').replace(/\./g, ':').split(':');
  const hh = (parts[0] || '0').padStart(2, '0');
  const mm = (parts[1] || '0').padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Adds minutes to a 'HH:mm' time string and returns formatted 'HH:mm'.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  try {
    if (typeof minutesToAdd !== 'number' || isNaN(minutesToAdd)) return timeStr;
    const formatted = formatPresensiTime(timeStr);
    const parts = (formatted || timeStr || '00:00').replace(/\./g, ':').split(':');
    const hh = parseInt(parts[0] || '0', 10);
    const mm = parseInt(parts[1] || '0', 10);
    const totalMinutes = hh * 60 + mm + minutesToAdd;
    const positiveMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const newHh = Math.floor(positiveMinutes / 60);
    const newMm = positiveMinutes % 60;
    return `${String(newHh).padStart(2, '0')}:${String(newMm).padStart(2, '0')}`;
  } catch {
    return timeStr;
  }
}

/**
 * Normalizes and compares whether currentTime is within or at the cutoff time (used by Guru Piket pagi).
 * Returns true if intervention is permitted (currentTime <= cutoffTime).
 */
export function isIntervensiAllowed(
  cutoffTime: string = '08:00',
  currentTimeStr?: string
): boolean {
  try {
    const rawCurrent = (currentTimeStr || getWitaTimeStr() || '00:00').trim();
    const rawCutoff = (cutoffTime || '08:00').trim();

    const currentNorm = normalizeTime(rawCurrent);
    const cutoffNorm = normalizeTime(rawCutoff);

    return currentNorm <= cutoffNorm;
  } catch {
    return false;
  }
}

/**
 * Checks whether Guru Piket is permitted to record student pulang attendance.
 * Rule: Guru Piket has access from jamPulangMulai up to 60 minutes after (jamPulangPiketAkhir).
 */
export function isPiketPulangAllowed(
  jamPulangMulai: string = '11:00',
  currentTimeStr?: string
): { allowed: boolean; pesan: string; batasAkhir: string } {
  try {
    const rawCurrent = (currentTimeStr || getWitaTimeStr() || '00:00').trim();
    const current = normalizeTime(rawCurrent);
    const pulangStart = normalizeTime(jamPulangMulai || '11:00');
    const pulangEnd = normalizeTime(addMinutesToTime(pulangStart, 60));

    if (current < pulangStart) {
      return {
        allowed: false,
        batasAkhir: pulangEnd,
        pesan: `Presensi pulang siswa baru dapat diinput mulai jam pulang guru (pk. ${pulangStart} WITA).`
      };
    }

    if (current <= pulangEnd) {
      return {
        allowed: true,
        batasAkhir: pulangEnd,
        pesan: `Hak akses Guru Piket aktif untuk presensi pulang siswa (s.d. pk. ${pulangEnd} WITA, alokasi 1 jam).`
      };
    }

    return {
      allowed: false,
      batasAkhir: pulangEnd,
      pesan: `Akses presensi pulang Guru Piket telah berakhir (hanya aktif hingga 1 jam setelah jam pulang guru pk. ${pulangEnd} WITA).`
    };
  } catch {
    return {
      allowed: false,
      batasAkhir: '12:00',
      pesan: 'Status presensi pulang tidak dapat diproses.'
    };
  }
}

function isTimeStringVal(val: any): boolean {
  return typeof val === 'string' && /\d{1,2}[:.]\d{1,2}/.test(val);
}

/**
 * Normalizes class strings by removing 'Kelas ' prefix, stripping punctuation (spaces, dashes, dots, underscores),
 * and lowercasing for robust comparison.
 */
export function normalizeClassKey(val: any): string {
  if (!val) return '';
  const raw = typeof val === 'string' ? val : (val.kelas || val.nama_kelas || val.kelas_binaan || '');
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/^kelas\s+/i, '')
    .replace(/[\s_\-.]+/g, '');
}

/**
 * Standardizes Indonesian grade notations (e.g., 'viia' -> '7a', 'xmerdekaa' -> '10merdekaa').
 */
export function canonicalizeGradeNotation(s: string): string {
  return s
    .replace(/^xii(?=[a-z0-9]|$)/i, '12')
    .replace(/^xi(?=[a-z0-9]|$)/i, '11')
    .replace(/^x(?=[a-z0-9]|$)/i, '10')
    .replace(/^ix(?=[a-z0-9]|$)/i, '9')
    .replace(/^viii(?=[a-z0-9]|$)/i, '8')
    .replace(/^vii(?=[a-z0-9]|$)/i, '7');
}

export function toCanonicalClass(val: any): string {
  return canonicalizeGradeNotation(normalizeClassKey(val));
}

export function extractAssignedClasses(user: any): string[] {
  const result: string[] = [];
  if (!user) return result;

  const add = (val: any) => {
    if (!val) return;
    if (typeof val === 'string') {
      val.split(/[,;/]+/).forEach(v => {
        const t = v.trim();
        if (t) result.push(t);
      });
    } else if (Array.isArray(val)) {
      val.forEach(item => add(item));
    } else if (typeof val === 'object') {
      if (val.kelas) add(val.kelas);
      if (val.nama_kelas) add(val.nama_kelas);
      if (val.kelas_binaan) add(val.kelas_binaan);
    }
  };

  add(user.assignedKelas);
  add(user.assigned_kelas);
  add(user.kelas_binaan);
  add(user.penugasan?.kelas_binaan);
  add(user.penugasan?.kelas);
  add(user.wali_kelas);

  return result;
}

/**
 * Checks student attendance intervention permission specifically for Wali Kelas.
 * Window 1 (Pagi): currentTime <= batasPagi (default 12:00 WITA)
 * Window 2 (Pulang): jamPulangMulai s.d. 60 menit setelah jam pulang (selaras Guru Piket)
 * Evening access (22:00 WITA) is eliminated; locked after 60-minute window ends.
 *
 * R1 & R2: Homeroom teachers (Wali Kelas) retain full permission to intervene in student
 * attendance for their assigned class even if their own teacher attendance status on that day
 * is Dinas Luar, Izin, Sakit, Cuti, or any other non-present status.
 */
export function isWaliKelasIntervensiAllowed(
  batasPagi: string = '12:00',
  jamPulangMulai: string = '11:00',
  jamBatasMalam?: string | { status?: string; jenis_presensi?: string; detail_izin?: string; tipe_absen?: string } | null,
  currentTimeStr?: string | { status?: string; jenis_presensi?: string; detail_izin?: string; tipe_absen?: string } | null,
  teacherStatusOrPresensi?: string | { status?: string; jenis_presensi?: string; detail_izin?: string; tipe_absen?: string } | null
): WaliIntervensiCheck {
  try {
    let effectiveCurrentTime: string | undefined = undefined;

    if (typeof currentTimeStr === 'string' && isTimeStringVal(currentTimeStr)) {
      effectiveCurrentTime = currentTimeStr;
    }

    const rawCurrent = (effectiveCurrentTime || getWitaTimeStr() || '00:00').trim();
    const current = normalizeTime(rawCurrent);
    const pagi = normalizeTime(batasPagi || '12:00');
    const pulangStart = normalizeTime(jamPulangMulai || '11:00');
    const pulangEnd = normalizeTime(addMinutesToTime(pulangStart, 60));

    // 1. Jendela Pulang (jamPulangMulai s.d. jamPulangMulai + 60m)
    // Selaras dengan Guru Piket: aktif tepat 1 jam (60 menit)
    if (current >= pulangStart && current <= pulangEnd) {
      return {
        allowed: true,
        phase: 'pulang',
        label: `Presensi Pulang Siswa (s.d. pk. ${pulangEnd})`,
        pesan: `Alokasi presensi pulang aktif selaras Guru Piket & Wali Kelas hingga pukul ${pulangEnd} WITA (60 menit pasca jam pulang).`
      };
    }

    // 2. Jika sudah melewati batas 1 jam kepulangan (current > pulangEnd)
    // Akses malam 22:00 dihapus sehingga intervensi terkunci penuh
    if (current > pulangEnd) {
      return {
        allowed: false,
        phase: 'malam_tutup',
        label: `Terkunci (Lewat pk. ${pulangEnd})`,
        pesan: `Batas waktu penyesuaian presensi siswa untuk hari ini telah berakhir (hanya aktif hingga 1 jam setelah jam pulang pk. ${pulangEnd} WITA).`
      };
    }

    // 3. Jendela Pagi (s.d. 12:00 WITA dan sebelum jam pulang mulai)
    if (current <= pagi && current < pulangStart) {
      return {
        allowed: true,
        phase: 'pagi',
        label: `Buka Pagi (s.d. pk. ${pagi})`,
        pesan: `Presensi siswa dibuka sebelum & selama KBM pagi (s.d. pk. ${pagi} WITA).`
      };
    }

    // 4. Jendela KBM (antara batas pagi 12:00 dan jam pulang mulai, jika jam pulang > 12:00)
    return {
      allowed: false,
      phase: 'kbm',
      label: `Terkunci KBM (Buka pk. ${pulangStart})`,
      pesan: `KBM sedang berlangsung dan presensi dikelola oleh Guru Mapel. Wali Kelas dapat menginput presensi pulang mulai pk. ${pulangStart} s.d. ${pulangEnd} WITA.`
    };
  } catch {
    return {
      allowed: false,
      phase: 'malam_tutup',
      label: 'Terkunci',
      pesan: 'Status intervensi tidak dapat diproses.'
    };
  }
}

export interface WaliKelasIntervensiAuthCheck {
  allowed: boolean;
  isWaliKelas: boolean;
  reason: string;
  teacherStatus?: string;
}

/**
 * Validates authorization for homeroom teacher (Wali Kelas) student attendance intervention.
 * 
 * Rules:
 * 1. Admin & Superadmin are globally authorized for all classes.
 * 2. User must be authenticated and verified as the homeroom teacher of the target class.
 *    Non-homeroom users are strictly denied from intervening in student attendance.
 * 3. Verified homeroom teachers are explicitly permitted to intervene in their assigned class
 *    even when their own attendance status is Dinas Luar, Izin, Sakit, Cuti, or any non-present status.
 */
export function canWaliKelasIntervene(
  user: {
    id?: string;
    nama?: string;
    username?: string;
    nip?: string;
    role?: string;
    wali_kelas?: any;
    penugasan?: any;
    kelas_binaan?: string;
    assignedKelas?: string;
    assigned_kelas?: string;
    [key: string]: any;
  } | null | undefined,
  targetClass: string | { kelas?: string; nama_kelas?: string } | null | undefined,
  teacherStatusOrPresensi?: string | { status?: string; jenis_presensi?: string; detail_izin?: string; tipe_absen?: string } | null,
  waliKelasList?: Array<{ kelas: string; guru_id?: string; nama_guru?: string; nip?: string }> | null
): WaliKelasIntervensiAuthCheck {
  if (!user) {
    return {
      allowed: false,
      isWaliKelas: false,
      reason: 'Pengguna belum terotentikasi.'
    };
  }

  const role = (user.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isAdmin = role === 'admin' || role === 'superadmin';

  if (isAdmin) {
    return {
      allowed: true,
      isWaliKelas: true,
      reason: 'Administrator memiliki wewenang intervensi presensi seluruh kelas.'
    };
  }

  const targetCanon = toCanonicalClass(targetClass);
  if (!targetCanon) {
    return {
      allowed: false,
      isWaliKelas: false,
      reason: 'Akses ditolak: Kelas sasaran tidak valid.'
    };
  }

  const assignedClasses = extractAssignedClasses(user);
  const isDirectlyAssigned = assignedClasses.some(c => toCanonicalClass(c) === targetCanon);

  const isAssignedInList = Boolean(
    waliKelasList &&
    waliKelasList.some(w => {
      if (toCanonicalClass(w.kelas) !== targetCanon) return false;
      const matchId = Boolean(user.id && w.guru_id && w.guru_id === user.id);
      const matchName = Boolean(user.nama && w.nama_guru && w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim());
      const matchNip = Boolean((user.username || user.nip) && w.nip && (w.nip === user.username || w.nip === user.nip));
      return matchId || matchName || matchNip;
    })
  );

  const isMatched = isDirectlyAssigned || isAssignedInList;

  if (!isMatched) {
    return {
      allowed: false,
      isWaliKelas: false,
      reason: 'Akses ditolak: Pengguna bukan wali kelas dari kelas binaan terkait.'
    };
  }

  // Teacher is verified as homeroom teacher of target class.
  const rawStatus = typeof teacherStatusOrPresensi === 'string'
    ? teacherStatusOrPresensi
    : (teacherStatusOrPresensi?.jenis_presensi || teacherStatusOrPresensi?.status || teacherStatusOrPresensi?.detail_izin || 'Hadir');

  return {
    allowed: true,
    isWaliKelas: true,
    teacherStatus: rawStatus || 'Hadir',
    reason: `Wali kelas terverifikasi berwenang melakukan intervensi presensi siswa kelas binaan (status presensi guru: ${rawStatus || 'Aktif'}).`
  };
}

export const isWaliKelasIntervensiAuthorized = canWaliKelasIntervene;
export const validateWaliKelasIntervensi = canWaliKelasIntervene;

/**
 * Fetches the school-specific student attendance intervention cutoff time (default: '08:00').
 */
export async function fetchBatasIntervensiSiswa(
  supabaseClient: SupabaseClient | any,
  sekolahId?: string | null
): Promise<string> {
  try {
    let q = supabaseClient
      .from('pengaturan')
      .select('value')
      .eq('key', 'jam_batas_intervensi_siswa');

    if (sekolahId) {
      q = q.eq('sekolah_id', sekolahId);
    }

    const { data } = await q.maybeSingle();
    return data?.value || '08:00';
  } catch {
    return '08:00';
  }
}

/**
 * Fetches the complete schedule configuration for Wali Kelas intervention windows.
 */
export async function fetchJadwalIntervensiWali(
  supabaseClient: SupabaseClient | any,
  sekolahId?: string | null
): Promise<JadwalIntervensiWali> {
  try {
    let q = supabaseClient
      .from('pengaturan')
      .select('key, value')
      .in('key', ['jam_batas_intervensi_siswa', 'jam_pulang_mulai', 'jam_pulang_jumat', 'jam_pulang_akhir']);

    if (sekolahId) {
      q = q.eq('sekolah_id', sekolahId);
    }

    const { data } = await q;
    const configMap: Record<string, string> = {};
    if (data) {
      data.forEach((item: any) => {
        if (item.key && item.value) configMap[item.key] = item.value;
      });
    }

    const isJumat = getWitaDayName() === 'Jumat';
    const effectivePulang = isJumat
      ? (configMap.jam_pulang_jumat || configMap.jam_pulang_mulai || '11:00')
      : (configMap.jam_pulang_mulai || '11:00');

    const pulangAkhir60m = addMinutesToTime(effectivePulang, 60);

    return {
      batasPagi: '12:00', // Wali Kelas batas pagi diperpanjang hingga pk. 12:00 WITA
      jamPulangMulai: effectivePulang,
      jamPulangPiketAkhir: pulangAkhir60m,
      jamBatasMalam: pulangAkhir60m // Ditutup 1 jam pasca jam pulang (akses malam 22:00 dinonaktifkan)
    };
  } catch {
    return {
      batasPagi: '12:00',
      jamPulangMulai: '11:00',
      jamPulangPiketAkhir: '12:00',
      jamBatasMalam: '12:00'
    };
  }
}

/**
 * Extracts the maximum numeric teaching hour (jam_ke) from string or number.
 * e.g. "Jam 5" -> 5, "3-4" -> 4, 3 -> 3.
 */
export function extractMaxJamKe(jamKeValue: any): number {
  if (typeof jamKeValue === 'number') return isNaN(jamKeValue) ? 0 : jamKeValue;
  if (!jamKeValue) return 0;
  if (typeof jamKeValue === 'object' && jamKeValue !== null) {
    if ('jam_ke' in jamKeValue) return extractMaxJamKe(jamKeValue.jam_ke);
    if ('jam' in jamKeValue) return extractMaxJamKe(jamKeValue.jam);
    if ('value' in jamKeValue) return extractMaxJamKe(jamKeValue.value);
  }
  const str = String(jamKeValue);
  const matches = str.match(/\d+/g);
  if (matches && matches.length > 0) {
    const numbers = matches.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (numbers.length > 0) return Math.max(...numbers);
  }

  // Roman numeral support (e.g. "Jam ke-IV", "Jam ke-VII", "Jam IX", "X", "Jam III - IV")
  const romanMap: Record<string, number> = {
    'xii': 12, 'xi': 11, 'x': 10, 'ix': 9,
    'viii': 8, 'vii': 7, 'vi': 6, 'v': 5, 'iv': 4,
    'iii': 3, 'ii': 2, 'i': 1
  };
  const words = str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const romanNumbers = words
    .map(w => romanMap[w])
    .filter((n): n is number => n !== undefined);
  if (romanNumbers.length > 0) {
    return Math.max(...romanNumbers);
  }
  return 0;
}

function hasAttendanceData(journal: any): boolean {
  if (!journal) return false;
  if (journal.absensi_siswa) {
    if (typeof journal.absensi_siswa === 'object' && journal.absensi_siswa !== null) {
      if (Object.keys(journal.absensi_siswa).length > 0) return true;
    } else if (typeof journal.absensi_siswa === 'string') {
      const trimmed = journal.absensi_siswa.trim();
      const stripped = trimmed.replace(/\s+/g, '');
      if (stripped !== '' && stripped !== '{}' && stripped !== 'null' && stripped !== 'undefined') {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'object' && parsed !== null) {
            if (Object.keys(parsed).length > 0) return true;
          } else {
            return true;
          }
        } catch {
          return true;
        }
      }
    }
  }
  if (journal.kehadiran_murid && String(journal.kehadiran_murid).trim() !== '') return true;
  if (journal.detail_absen && String(journal.detail_absen).trim() !== '') return true;
  return false;
}

/**
 * Finds the KBM teaching journal with the latest teaching hour (jam_ke) for that day,
 * prioritizing journals with recorded student attendance data.
 * If an optional student is provided, candidate journals are filtered to those the student is eligible for.
 */
export function findLastKbmJournal(journals: any[], student?: any): any {
  if (!journals || journals.length === 0) return null;
  let candidateJournals = journals;
  if (student && typeof student === 'object') {
    candidateJournals = journals.filter(j => !j?.mapel || isStudentEligibleForSubject(student, j.mapel));
  }
  const validJournals = candidateJournals.filter(j => j && typeof j === 'object');
  if (validJournals.length === 0) return null;
  const withAttendance = validJournals.filter(hasAttendanceData);
  const candidates = withAttendance.length > 0 ? withAttendance : validJournals;
  const sorted = candidates.slice().sort((a, b) => {
    const jamA = extractMaxJamKe(a?.jam_ke);
    const jamB = extractMaxJamKe(b?.jam_ke);
    if (jamB !== jamA) return jamB - jamA;
    const timeA = String(a?.timestamp || a?.created_at || '');
    const timeB = String(b?.timestamp || b?.created_at || '');
    return timeB.localeCompare(timeA);
  });
  return sorted[0] || null;
}

export interface DailyAttendanceResolved {
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '';
  isFallback: boolean;
  source: string;
  keterangan?: string;
}

/**
 * Resolves daily attendance for a student:
 * - If Wali Kelas already recorded attendance, that record is canonical.
 * - Canonical excused statuses (Sakit / Izin) from Wali Kelas are preserved and never overridden as Bolos.
 * - If Wali Kelas has not recorded attendance, dynamically falls back to the last KBM session's attendance.
 * - Aturan Bolos: Hadir di awal (datang pagi / gerbang / kelas pagi) namun Alfa di sesi KBM jam terakhir -> Otomatis Bolos (B).
 */
export function resolveDailyStudentAttendance(
  student: {
    id?: string;
    nisn?: string;
    nama_siswa: string;
    agama?: string | null;
    status_agama?: string | null;
    religion?: string | null;
  },
  classAbsensiRecord: { status?: string; keterangan?: string | null } | null | undefined,
  hasMorningPresence: boolean,
  lastKbmJournal?: any | null
): DailyAttendanceResolved {
  // If the provided lastKbmJournal is for a religion-specific subject (PAI or PAK)
  // and the student is not eligible for that subject, do NOT inherit attendance from it.
  let activeJournal = lastKbmJournal;
  if (activeJournal?.mapel && !isStudentEligibleForSubject(student, activeJournal.mapel)) {
    activeJournal = null;
  }

  const normStatus = (st: string | null | undefined): 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '' => {
    if (!st) return '';
    const s = st.trim().toLowerCase();
    if (s === 'hadir' || s === 'h') return 'Hadir';
    if (s === 'sakit' || s === 's') return 'Sakit';
    if (s === 'izin' || s === 'i') return 'Izin';
    if (s === 'alpa' || s === 'alfa' || s === 'alpha' || s === 'a') return 'Alpa';
    if (s === 'bolos' || s === 'b') return 'Bolos';
    return '';
  };

  const mapCode = (rawCode: any): 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '' => {
    if (!rawCode) return '';
    const extracted = (typeof rawCode === 'object' && rawCode !== null)
      ? (rawCode.status || rawCode.s || rawCode.code || '')
      : rawCode;
    const code = String(extracted).trim().toUpperCase();
    if (code === 'A' || code === 'ALFA' || code === 'ALPA' || code === 'ALPHA') return 'Alpa';
    if (code === 'B' || code === 'BOLOS') return 'Bolos';
    if (code === 'S' || code === 'SAKIT') return 'Sakit';
    if (code === 'I' || code === 'IZIN') return 'Izin';
    if (code === 'H' || code === 'HADIR') return 'Hadir';
    return '';
  };

  // 1. Extract status from last KBM journal if available
  let lastKbmStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '' = '';
  if (activeJournal) {
    let absensiJson: Record<string, any> | null = null;
    if (activeJournal.absensi_siswa) {
      if (typeof activeJournal.absensi_siswa === 'object') {
        absensiJson = activeJournal.absensi_siswa;
      } else if (typeof activeJournal.absensi_siswa === 'string' && activeJournal.absensi_siswa.trim().startsWith('{')) {
        try {
          absensiJson = JSON.parse(activeJournal.absensi_siswa);
        } catch (_) {}
      }
    }

    const combinedText = `${activeJournal.kehadiran_murid || ''} ${typeof activeJournal.absensi_siswa === 'string' ? activeJournal.absensi_siswa : ''} ${activeJournal.detail_absen || ''}`.toLowerCase();
    const isSemuaHadir = /semua\s*hadir|hadir\s*semua|semua\s*siswa\s*hadir/i.test(combinedText);

    if (absensiJson && Object.keys(absensiJson).length > 0) {
      let val = (student.nisn !== undefined && student.nisn !== null && absensiJson[student.nisn] !== undefined)
        ? absensiJson[student.nisn]
        : (student.nama_siswa && absensiJson[student.nama_siswa] !== undefined)
          ? absensiJson[student.nama_siswa]
          : (student.id && absensiJson[student.id] !== undefined)
            ? absensiJson[student.id]
            : undefined;

      // Whitespace-insensitive lookup for NISN
      if (val === undefined && student.nisn !== undefined && student.nisn !== null) {
        const cleanNisn = String(student.nisn).trim();
        const foundNisnKey = Object.keys(absensiJson).find(k => k.trim() === cleanNisn);
        if (foundNisnKey) val = absensiJson[foundNisnKey];
      }

      // Case-insensitive lookup for nama_siswa if not directly found
      if (val === undefined && student.nama_siswa) {
        const lowerName = String(student.nama_siswa).trim().toLowerCase();
        const foundKey = Object.keys(absensiJson).find(k => k.trim().toLowerCase() === lowerName);
        if (foundKey) val = absensiJson[foundKey];
      }

      if (val !== undefined) {
        lastKbmStatus = mapCode(val);
      }
    }

    // If not found in absensiJson, check detail_absen / kehadiran_murid
    if (!lastKbmStatus && (activeJournal.detail_absen || activeJournal.kehadiran_murid)) {
      const detail = `${activeJournal.detail_absen || ''} ${activeJournal.kehadiran_murid || ''}`;
      const identifiers = [
        student.nama_siswa ? String(student.nama_siswa).trim() : '',
        (student.nisn !== undefined && student.nisn !== null) ? String(student.nisn).trim() : ''
      ].filter(Boolean) as string[];

      for (const idStr of identifiers) {
        if (lastKbmStatus) break;
        const escaped = idStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Pattern 1: Postfix status (e.g. "Nama (Alfa)", "Nama (A)", "Nama - Alfa", "Nama - A", "Nama: Alfa", "Nama: A", "Nama = Sakit")
        const postfixRegex = new RegExp(`(?:^|\\b)${escaped}\\b\\s*(?:[-:=—–]|\\(|\\b)\\s*([a-zA-Z]+)\\)?`, 'i');
        const match = detail.match(postfixRegex);
        if (match && match[1]) {
          const parsed = mapCode(match[1]);
          if (parsed) {
            lastKbmStatus = parsed;
            break;
          }
        }

        // Pattern 2: Prefix status within lines/clauses (e.g. "Alpa: Nama", "Alfa: Nama", "Sakit: Nama", "Izin: Nama", "Bolos: Nama")
        const linesOrClauses = detail.split(/[\r\n;]+/).map(s => s.trim()).filter(Boolean);
        const lowerId = idStr.toLowerCase();
        for (const segment of linesOrClauses) {
          const segLower = segment.toLowerCase();
          if (segLower.includes(lowerId)) {
            const idxId = segLower.indexOf(lowerId);
            const idxSakit = segLower.lastIndexOf('sakit', idxId);
            const idxIzin = segLower.lastIndexOf('izin', idxId);
            const idxAlpa = Math.max(
              segLower.lastIndexOf('alpa', idxId),
              segLower.lastIndexOf('alfa', idxId),
              segLower.lastIndexOf('alpha', idxId)
            );
            const idxBolos = segLower.lastIndexOf('bolos', idxId);
            const idxHadir = segLower.lastIndexOf('hadir', idxId);

            const maxIdx = Math.max(idxSakit, idxIzin, idxAlpa, idxBolos, idxHadir);
            if (maxIdx !== -1) {
              if (maxIdx === idxBolos) lastKbmStatus = 'Bolos';
              else if (maxIdx === idxAlpa) lastKbmStatus = 'Alpa';
              else if (maxIdx === idxSakit) lastKbmStatus = 'Sakit';
              else if (maxIdx === idxIzin) lastKbmStatus = 'Izin';
              else if (maxIdx === idxHadir) lastKbmStatus = 'Hadir';
              break;
            }
          }
        }

        // Pattern 3: Fallback full text prefix search if not matched in segmented clauses
        if (!lastKbmStatus) {
          const detailLower = detail.toLowerCase();
          if (detailLower.includes(lowerId)) {
            const idxId = detailLower.indexOf(lowerId);
            const idxSakit = detailLower.lastIndexOf('sakit', idxId);
            const idxIzin = detailLower.lastIndexOf('izin', idxId);
            const idxAlpa = Math.max(
              detailLower.lastIndexOf('alpa', idxId),
              detailLower.lastIndexOf('alfa', idxId),
              detailLower.lastIndexOf('alpha', idxId)
            );
            const idxBolos = detailLower.lastIndexOf('bolos', idxId);
            const idxHadir = detailLower.lastIndexOf('hadir', idxId);

            const maxIdx = Math.max(idxSakit, idxIzin, idxAlpa, idxBolos, idxHadir);
            if (maxIdx !== -1) {
              if (maxIdx === idxBolos) lastKbmStatus = 'Bolos';
              else if (maxIdx === idxAlpa) lastKbmStatus = 'Alpa';
              else if (maxIdx === idxSakit) lastKbmStatus = 'Sakit';
              else if (maxIdx === idxIzin) lastKbmStatus = 'Izin';
              else if (maxIdx === idxHadir) lastKbmStatus = 'Hadir';
            }
          }
        }
      }
    }

    // Default to Hadir if "semua hadir" or if absensiJson was an absentee-only list
    if (!lastKbmStatus) {
      if (isSemuaHadir) {
        lastKbmStatus = 'Hadir';
      } else if (absensiJson && Object.keys(absensiJson).length > 0) {
        const jsonValues = Object.values(absensiJson).map(v => {
          if (typeof v === 'object' && v !== null) {
            return String((v as any).status || (v as any).s || (v as any).code || '').trim().toUpperCase();
          }
          return String(v).trim().toUpperCase();
        });
        const hasExplicitHadir = jsonValues.some(v => v === 'H' || v === 'HADIR');
        if (!hasExplicitHadir) {
          lastKbmStatus = 'Hadir';
        }
      }
    }
  }

  // 2. Canonical status from Wali Kelas
  const recordedStatus = normStatus(classAbsensiRecord?.status);

  // 3. Excused statuses (Sakit / Izin) recorded by Wali Kelas must NEVER be overwritten as Bolos
  if (recordedStatus === 'Sakit' || recordedStatus === 'Izin') {
    return {
      status: recordedStatus,
      isFallback: false,
      source: 'Wali Kelas',
      keterangan: classAbsensiRecord?.keterangan || undefined
    };
  }

  // 4. Pre-existing canonical Bolos is preserved
  if (recordedStatus === 'Bolos') {
    return {
      status: 'Bolos',
      isFallback: false,
      source: 'Wali Kelas',
      keterangan: classAbsensiRecord?.keterangan || undefined
    };
  }

  // 5. Aturan Bolos: Hadir di awal (datang pagi gerbang / kelas pagi) namun Alfa pada sesi KBM jam terakhir
  const isMorningHadir = recordedStatus === 'Hadir' || (!recordedStatus && hasMorningPresence);

  if (isMorningHadir && (lastKbmStatus === 'Alpa' || lastKbmStatus === 'Bolos')) {
    return {
      status: 'Bolos',
      isFallback: !recordedStatus,
      source: recordedStatus ? 'Wali Kelas & KBM Terakhir (Preservasi Bolos)' : 'Fallback KBM Terakhir (Otomatis Bolos)',
      keterangan: classAbsensiRecord?.keterangan || (activeJournal ? `Terdeteksi Bolos: Hadir pagi, Alfa pada KBM Jam ${activeJournal.jam_ke || '-'}` : 'Terdeteksi Bolos')
    };
  }

  // 6. If class absensi record exists from Wali Kelas (e.g. Hadir or Alpa), preserve it
  if (recordedStatus) {
    return {
      status: recordedStatus,
      isFallback: false,
      source: 'Wali Kelas',
      keterangan: classAbsensiRecord?.keterangan || undefined
    };
  }

  // 7. Fallback dinamis ke Jurnal KBM Jam Terakhir jika Wali Kelas belum mengisi / tidak ada
  if (lastKbmStatus) {
    return {
      status: lastKbmStatus,
      isFallback: true,
      source: `Fallback Jurnal KBM (Jam ${activeJournal?.jam_ke || '-'})`,
      keterangan: `Otomatis diwarisi dari Jurnal KBM Jam ${activeJournal?.jam_ke || '-'}`
    };
  }

  // 8. Fallback gerbang pagi jika hanya ada presensi gerbang
  if (hasMorningPresence) {
    return {
      status: 'Hadir',
      isFallback: true,
      source: 'Presensi Gerbang',
      keterangan: 'Tercatat Hadir Datang di Pos Gerbang'
    };
  }

  return {
    status: '',
    isFallback: false,
    source: 'Belum Ada Data'
  };
}

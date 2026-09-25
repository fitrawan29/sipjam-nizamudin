import { supabase } from '@/lib/supabaseClient';
import { 
  getWitaDateStr, 
  getWitaDayName, 
  getWitaTimeStr 
} from '@/lib/wita';

export interface DisciplineWarning {
  category: 'Presensi' | 'Jurnal' | 'Piket';
  type: 'berturut-turut' | 'akumulasi';
  count: number;
  dates: string[];
  message: string;
}

export interface TeacherWarningSummary {
  teacherId?: string;
  teacherName: string;
  hasWarning: boolean;
  warnings: DisciplineWarning[];
  stats?: {
    presensi: { filled: number; required: number };
    jurnal: { filled: number; required: number };
    piket: { filled: number; required: number };
  };
}

/**
 * Calculates the longest consecutive streak of true values in an array.
 */
export function calculateStreak(history: boolean[]): number {
  let maxConsecutive = 0;
  let current = 0;
  for (const item of history) {
    if (item) {
      current++;
      if (current > maxConsecutive) maxConsecutive = current;
    } else {
      current = 0;
    }
  }
  return maxConsecutive;
}

/**
 * Builds the evaluation date window for the current month up to today in WITA timezone.
 * Properly excludes Sundays, Saturdays (for 5-day school weeks), and calendar holidays.
 */
export function buildEvaluationDates(
  todayStr: string = getWitaDateStr(),
  _lookbackDays: number = 30, // Kept for backwards compatibility but not used
  hariSekolah: string = '6',
  holidaySet: Set<string> = new Set()
): { dateStr: string; dayName: string }[] {
  const evaluationDates: { dateStr: string; dayName: string }[] = [];
  // Anchor at noon WITA (+08:00) so adding/subtracting days never crosses midnight
  const dateObj = new Date(todayStr + 'T12:00:00+08:00');
  
  // Calculate how many days have passed in the current month
  const currentDayOfMonth = parseInt(todayStr.split('-')[2], 10);

  for (let i = currentDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(dateObj.getTime() - i * 86400000);
    const dateStr = getWitaDateStr(d);
    
    // Only include dates from the current month (safety check)
    if (dateStr.substring(0, 7) !== todayStr.substring(0, 7)) continue;
    
    const dayName = getWitaDayName(d);

    // Exclude Sundays in WITA
    if (dayName === 'Minggu') continue;

    // Exclude Saturdays if 5-day school week
    if (hariSekolah === '5' && dayName === 'Sabtu') continue;

    // Exclude calendar holidays
    if (holidaySet.has(dateStr)) continue;

    evaluationDates.push({ dateStr, dayName });
  }
  return evaluationDates;
}

/**
 * Evaluates discipline warnings for a single teacher across Presensi, Jurnal, and Piket.
 * Checks for 3x consecutive or 3x accumulated violations.
 */
export async function getTeacherDisciplineWarnings(
  teacherName: string,
  sekolahId?: string,
  targetMonth?: string
): Promise<TeacherWarningSummary> {
  const normName = (teacherName || '').trim();
  const normLower = normName.toLowerCase();

  // 1. Fetch teacher info from data_guru
  let guruQuery = supabase.from('data_guru').select('*').ilike('nama_guru', `%${normName.split(',')[0].trim()}%`);
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: guruData } = await guruQuery.maybeSingle();
  const teacherId = guruData?.id;
  const isExemptNonTeaching = Boolean(guruData?.wajib_hadir_hanya_mengajar);
  const resolvedSekolahId = sekolahId || guruData?.sekolah_id;

  // 2. Fetch school settings (hari_sekolah, aturan_kehadiran_guru)
  let configQuery = supabase.from('pengaturan').select('*');
  if (resolvedSekolahId) {
    configQuery = configQuery.eq('sekolah_id', resolvedSekolahId);
  }
  const { data: configs } = await configQuery;
  const configMap = new Map((configs || []).map(c => [c.key, c.value]));
  const hariSekolah = configMap.get('hari_sekolah') || '6'; // '5' or '6'
  const aturanKehadiran = configMap.get('aturan_kehadiran_guru') || 'Semua_Hari';

  // 3. Fetch calendar holidays from kalender_pendidikan
  let calQuery = supabase.from('kalender_pendidikan').select('tanggal, tipe, keterangan');
  if (resolvedSekolahId) {
    calQuery = calQuery.eq('sekolah_id', resolvedSekolahId);
  }
  const { data: holidaysData } = await calQuery;
  const holidaySet = new Set((holidaysData || []).map(h => h.tanggal));

  // 4. Fetch schedule (jadwal_pelajaran) for this teacher
  let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
  if (resolvedSekolahId) {
    jadwalQuery = jadwalQuery.eq('sekolah_id', resolvedSekolahId);
  }
  const { data: jadwalData } = await jadwalQuery;
  const teacherJadwal = (jadwalData || []).filter(j => {
    const sName = (j.nama_guru || '').toLowerCase().trim();
    return sName === normLower || normLower.includes(sName) || sName.includes(normLower);
  });

  // 5. Fetch piket schedule (penugasan_piket & jadwal_piket)
  let penugasanQuery = supabase.from('penugasan_piket').select('*').eq('tipe_petugas', 'Guru');
  if (resolvedSekolahId) {
    penugasanQuery = penugasanQuery.eq('sekolah_id', resolvedSekolahId);
  }
  const { data: penugasanData } = await penugasanQuery;
  const isAssignedPenugasan = (day: string) => (penugasanData || []).some(p => {
    if (p.hari !== day) return false;
    const gName = (p.guru_nama || '').toLowerCase().trim();
    if (gName === normLower || normLower.includes(gName) || gName.includes(normLower)) return true;
    if (Array.isArray(p.daftar_guru)) {
      return p.daftar_guru.some((dg: any) => {
        const dName = (typeof dg === 'string' ? dg : dg.nama || dg.nama_guru || '').toLowerCase().trim();
        return dName === normLower || normLower.includes(dName) || dName.includes(normLower);
      });
    }
    return false;
  });

  let legacyPiketQuery = supabase.from('jadwal_piket').select('*');
  if (resolvedSekolahId) {
    legacyPiketQuery = legacyPiketQuery.eq('sekolah_id', resolvedSekolahId);
  }
  const { data: legacyPiketData } = await legacyPiketQuery;
  const isAssignedLegacy = (day: string) => (legacyPiketData || []).some(lp => {
    if (lp.hari !== day) return false;
    const lName = (lp.nama_guru || '').toLowerCase().trim();
    return lName === normLower || normLower.includes(lName) || lName.includes(normLower);
  });

  const isTeacherPiketOnDay = (day: string) => isAssignedPenugasan(day) || isAssignedLegacy(day);

  // 6. Build evaluation window
  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;
  let maxDate = currentWitaStr + 'T23:59:59+08:00';

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    maxDate = todayStr + 'T23:59:59+08:00';
  }

  const evaluationDates = buildEvaluationDates(todayStr, 30, hariSekolah, holidaySet);

  // 7. Query records for this teacher in the evaluation window
  const minDate = evaluationDates.length > 0 ? evaluationDates[0].dateStr : todayStr;
  const minTimestamp = minDate + 'T00:00:00+08:00';

  const [presensiRes, jurnalRes, piketRes] = await Promise.all([
    supabase
      .from('presensi_guru')
      .select('*')
      .ilike('nama_guru', `%${normName.split(',')[0].trim()}%`)
      .gte('timestamp', minTimestamp)
      .lte('timestamp', maxDate),
    supabase
      .from('jurnal_pembelajaran')
      .select('*')
      .ilike('nama_guru', `%${normName.split(',')[0].trim()}%`)
      .gte('tanggal', minDate)
      .lte('tanggal', todayStr),
    supabase
      .from('laporan_piket')
      .select('*')
      .or(`guru_pelapor.ilike.%${normName.split(',')[0].trim()}%,kehadiran_guru_piket.ilike.%${normName.split(',')[0].trim()}%`)
      .gte('tanggal', minDate)
      .lte('tanggal', todayStr)
  ]);

  const presensiRecords = presensiRes.data || [];
  const jurnalRecords = jurnalRes.data || [];
  const piketRecords = piketRes.data || [];

  const warnings: DisciplineWarning[] = [];

  // Initialize stats for the dashboard
  const monthlyStats = {
    presensi: { filled: 0, required: 0 },
    jurnal: { filled: 0, required: 0 },
    piket: { filled: 0, required: 0 },
  };

  // =========================================================================
  // CATEGORY 1: PRESENSI WARNING EVALUATION
  // =========================================================================
  const presensiOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    // Check if teacher had obligation on this day (F6-B4, F7-B4)
    const hasTeachingClass = teacherJadwal.some(j => j.hari === dayName);
    const isPiketDay = isTeacherPiketOnDay(dayName);

    if (aturanKehadiran === 'Hari_Mengajar_Saja' || isExemptNonTeaching) {
      if (!hasTeachingClass && !isPiketDay) {
        continue; // Exempt today
      }
    }

    // Check attendance records on this date
    const dayPresensi = presensiRecords.filter(p => {
      const ts = p.timestamp || '';
      return ts.startsWith(dateStr) && p.tipe_absen === 'Datang';
    });

    let isAbsent = false;

    if (dayPresensi.length === 0) {
      // No attendance submitted
      isAbsent = true;
    } else {
      // Check if approved leave exists
      const hasApprovedLeave = dayPresensi.some(
        p => ['Sakit', 'Izin', 'Dinas Luar'].includes(p.jenis_presensi) && p.status_verifikasi === 'Disetujui'
      );
      if (hasApprovedLeave) {
        isAbsent = false;
      } else {
        const hasValidPresence = dayPresensi.some(
          p => p.status_verifikasi !== 'Ditolak' && p.status_verifikasi !== 'Alpa' && p.jenis_presensi !== 'Alpa'
        );
        if (!hasValidPresence) {
          isAbsent = true;
        }
      }
    }

    monthlyStats.presensi.required++;
    if (!isAbsent) monthlyStats.presensi.filled++;
    presensiOperationalDays.push({ dateStr, isViolation: isAbsent });
  }

  // Calculate streaks and total violations for Presensi
  const presensiHistory = presensiOperationalDays.map(d => d.isViolation);
  const presensiViolationDates = presensiOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

  // Consecutive streak detection
  let currentStreak = 0;
  let maxStreak = 0;
  let streakDates: string[] = [];
  let tempStreakDates: string[] = [];

  for (const item of presensiOperationalDays) {
    if (item.isViolation) {
      currentStreak++;
      tempStreakDates.push(item.dateStr);
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        streakDates = [...tempStreakDates];
      }
    } else {
      currentStreak = 0;
      tempStreakDates = [];
    }
  }

  if (maxStreak >= 3) {
    warnings.push({
      category: 'Presensi',
      type: 'berturut-turut',
      count: maxStreak,
      dates: streakDates,
      message: `Tidak absen ${maxStreak}x berturut-turut`
    });
  }

  if (presensiViolationDates.length >= 3) {
    // If we already added a consecutive warning of the same count, still include accumulated if count differs or as additional violation
    warnings.push({
      category: 'Presensi',
      type: 'akumulasi',
      count: presensiViolationDates.length,
      dates: presensiViolationDates,
      message: `Akumulasi tidak absen ${presensiViolationDates.length}x`
    });
  }

  // =========================================================================
  // CATEGORY 2: JURNAL PEMBELAJARAN WARNING EVALUATION
  // =========================================================================
  const jurnalOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const scheduledOnDay = teacherJadwal.filter(j => j.hari === dayName);
    if (scheduledOnDay.length === 0) continue; // No classes on this day

    // Check journals submitted for this date
    const dayJournals = jurnalRecords.filter(
      j => j.tanggal === dateStr && j.status_verifikasi !== 'Ditolak'
    );

    // If teacher submitted fewer journals than required scheduled classes
    const isMissingJournal = dayJournals.length < scheduledOnDay.length;
    monthlyStats.jurnal.required += scheduledOnDay.length;
    monthlyStats.jurnal.filled += Math.min(dayJournals.length, scheduledOnDay.length);
    jurnalOperationalDays.push({ dateStr, isViolation: isMissingJournal });
  }

  const jurnalViolationDates = jurnalOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

  let jStreak = 0;
  let maxJStreak = 0;
  let jStreakDates: string[] = [];
  let tempJStreakDates: string[] = [];

  for (const item of jurnalOperationalDays) {
    if (item.isViolation) {
      jStreak++;
      tempJStreakDates.push(item.dateStr);
      if (jStreak > maxJStreak) {
        maxJStreak = jStreak;
        jStreakDates = [...tempJStreakDates];
      }
    } else {
      jStreak = 0;
      tempJStreakDates = [];
    }
  }

  if (maxJStreak >= 3) {
    warnings.push({
      category: 'Jurnal',
      type: 'berturut-turut',
      count: maxJStreak,
      dates: jStreakDates,
      message: `Tidak isi jurnal ${maxJStreak}x berturut-turut`
    });
  }

  if (jurnalViolationDates.length >= 3) {
    warnings.push({
      category: 'Jurnal',
      type: 'akumulasi',
      count: jurnalViolationDates.length,
      dates: jurnalViolationDates,
      message: `Akumulasi tidak isi jurnal ${jurnalViolationDates.length}x`
    });
  }

  // =========================================================================
  // CATEGORY 3: LAPORAN PIKET WARNING EVALUATION
  // =========================================================================
  const piketOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const isAssigned = isTeacherPiketOnDay(dayName);
    if (!isAssigned) continue; // Not on piket duty on this day

    // Check piket report submitted for this date
    const dayReports = piketRecords.filter(
      p => p.tanggal === dateStr && p.status_verifikasi !== 'Ditolak'
    );

    const isMissingPiket = dayReports.length === 0;
    monthlyStats.piket.required++;
    if (!isMissingPiket) monthlyStats.piket.filled++;
    piketOperationalDays.push({ dateStr, isViolation: isMissingPiket });
  }

  const piketViolationDates = piketOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

  let pStreak = 0;
  let maxPStreak = 0;
  let pStreakDates: string[] = [];
  let tempPStreakDates: string[] = [];

  for (const item of piketOperationalDays) {
    if (item.isViolation) {
      pStreak++;
      tempPStreakDates.push(item.dateStr);
      if (pStreak > maxPStreak) {
        maxPStreak = pStreak;
        pStreakDates = [...tempPStreakDates];
      }
    } else {
      pStreak = 0;
      tempPStreakDates = [];
    }
  }

  if (maxPStreak >= 3) {
    warnings.push({
      category: 'Piket',
      type: 'berturut-turut',
      count: maxPStreak,
      dates: pStreakDates,
      message: `Tidak lapor piket ${maxPStreak}x berturut-turut`
    });
  }

  if (piketViolationDates.length >= 3) {
    warnings.push({
      category: 'Piket',
      type: 'akumulasi',
      count: piketViolationDates.length,
      dates: piketViolationDates,
      message: `Akumulasi tidak lapor piket ${piketViolationDates.length}x`
    });
  }

  return {
    teacherId,
    teacherName: normName,
    hasWarning: warnings.length > 0,
    warnings,
    stats: monthlyStats
  };
}

/**
 * Evaluates discipline warnings for all teachers in the school.
 * Useful for Admin Monitor and Pantauan views.
 */
export async function getAllTeachersDisciplineWarnings(
  sekolahId?: string,
  targetMonth?: string
): Promise<TeacherWarningSummary[]> {
  let guruQuery = supabase.from('data_guru').select('id, nama_guru, sekolah_id').order('nama_guru');
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: teachers, error } = await guruQuery;
  if (error || !teachers) {
    console.error('[warningSystem] Error fetching teachers:', error?.message);
    return [];
  }

  const summaries: TeacherWarningSummary[] = [];
  for (const teacher of teachers) {
    if (!teacher.nama_guru) continue;
    try {
      const summary = await getTeacherDisciplineWarnings(teacher.nama_guru, teacher.sekolah_id || sekolahId, targetMonth);
      summaries.push(summary);
    } catch (err: any) {
      console.error(`[warningSystem] Error evaluating warnings for ${teacher.nama_guru}:`, err.message);
    }
  }

  return summaries;
}

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

export function buildEvaluationDates(
  todayStr: string = getWitaDateStr(),
  _lookbackDays: number = 30,
  hariSekolah: string = '6',
  holidaySet: Set<string> = new Set()
): { dateStr: string; dayName: string }[] {
  const evaluationDates: { dateStr: string; dayName: string }[] = [];
  const dateObj = new Date(todayStr + 'T12:00:00+08:00');
  const currentDayOfMonth = parseInt(todayStr.split('-')[2], 10);

  for (let i = currentDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(dateObj.getTime() - i * 86400000);
    const dateStr = getWitaDateStr(d);
    
    if (dateStr.substring(0, 7) !== todayStr.substring(0, 7)) continue;
    
    const dayName = getWitaDayName(d);
    if (dayName === 'Minggu') continue;
    if (hariSekolah === '5' && dayName === 'Sabtu') continue;
    if (holidaySet.has(dateStr)) continue;

    evaluationDates.push({ dateStr, dayName });
  }
  return evaluationDates;
}

export function evaluateTeacherWarningsSync(
  teacherId: string | undefined,
  teacherName: string,
  isExemptNonTeaching: boolean,
  resolvedSekolahId: string | undefined,
  configs: any[],
  holidaysData: any[],
  jadwalData: any[],
  penugasanData: any[],
  legacyPiketData: any[],
  presensiRecords: any[],
  jurnalRecords: any[],
  piketRecords: any[],
  targetMonth?: string
): TeacherWarningSummary {
  const normName = (teacherName || '').trim();
  const normLower = normName.toLowerCase();

  const configMap = new Map((configs || []).map(c => [c.key, c.value]));
  const hariSekolah = configMap.get('hari_sekolah') || '6';
  const aturanKehadiran = configMap.get('aturan_kehadiran_guru') || 'Semua_Hari';

  const holidaySet = new Set((holidaysData || []).map(h => h.tanggal));

  const teacherJadwal = (jadwalData || []).filter(j => {
    const sName = (j.nama_guru || '').toLowerCase().trim();
    return sName === normLower || normLower.includes(sName) || sName.includes(normLower);
  });

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

  const isAssignedLegacy = (day: string) => (legacyPiketData || []).some(lp => {
    if (lp.hari !== day) return false;
    const lName = (lp.nama_guru || '').toLowerCase().trim();
    return lName === normLower || normLower.includes(lName) || lName.includes(normLower);
  });

  const isTeacherPiketOnDay = (day: string) => isAssignedPenugasan(day) || isAssignedLegacy(day);

  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  }

  const evaluationDates = buildEvaluationDates(todayStr, 30, hariSekolah, holidaySet);

  const warnings: DisciplineWarning[] = [];
  const monthlyStats = {
    presensi: { filled: 0, required: 0 },
    jurnal: { filled: 0, required: 0 },
    piket: { filled: 0, required: 0 },
  };

  const presensiOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const hasTeachingClass = teacherJadwal.some(j => j.hari === dayName);
    const isPiketDay = isTeacherPiketOnDay(dayName);

    if (aturanKehadiran === 'Hari_Mengajar_Saja' || isExemptNonTeaching) {
      if (!hasTeachingClass && !isPiketDay) {
        continue;
      }
    }

    const dayPresensi = presensiRecords.filter(p => {
      const ts = p.timestamp || '';
      return ts.startsWith(dateStr) && p.tipe_absen === 'Datang';
    });

    let isAbsent = false;

    if (dayPresensi.length === 0) {
      isAbsent = true;
    } else {
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

  const presensiViolationDates = presensiOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

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
    warnings.push({
      category: 'Presensi',
      type: 'akumulasi',
      count: presensiViolationDates.length,
      dates: presensiViolationDates,
      message: `Akumulasi tidak absen ${presensiViolationDates.length}x`
    });
  }

  const jurnalOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const scheduledOnDay = teacherJadwal.filter(j => j.hari === dayName);
    if (scheduledOnDay.length === 0) continue;

    const dayJournals = jurnalRecords.filter(
      j => j.tanggal === dateStr && j.status_verifikasi !== 'Ditolak'
    );

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

  const piketOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const isAssigned = isTeacherPiketOnDay(dayName);
    if (!isAssigned) continue;

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

export async function getTeacherDisciplineWarnings(
  teacherName: string,
  sekolahId?: string,
  targetMonth?: string
): Promise<TeacherWarningSummary> {
  const normName = (teacherName || '').trim();
  const normLower = normName.toLowerCase();

  let guruQuery = supabase.from('data_guru').select('*').ilike('nama_guru', `%${normName.split(',')[0].trim()}%`);
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: guruData } = await guruQuery.maybeSingle();
  const teacherId = guruData?.id;
  const isExemptNonTeaching = Boolean(guruData?.wajib_hadir_hanya_mengajar);
  const resolvedSekolahId = sekolahId || guruData?.sekolah_id;

  let configQuery = supabase.from('pengaturan').select('*');
  let calQuery = supabase.from('kalender_pendidikan').select('tanggal, tipe, keterangan');
  let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
  let penugasanQuery = supabase.from('penugasan_piket').select('*').eq('tipe_petugas', 'Guru');
  let legacyPiketQuery = supabase.from('jadwal_piket').select('*');

  if (resolvedSekolahId) {
    configQuery = configQuery.eq('sekolah_id', resolvedSekolahId);
    calQuery = calQuery.eq('sekolah_id', resolvedSekolahId);
    jadwalQuery = jadwalQuery.eq('sekolah_id', resolvedSekolahId);
    penugasanQuery = penugasanQuery.eq('sekolah_id', resolvedSekolahId);
    legacyPiketQuery = legacyPiketQuery.eq('sekolah_id', resolvedSekolahId);
  }

  const [
    { data: configs },
    { data: holidaysData },
    { data: jadwalData },
    { data: penugasanData },
    { data: legacyPiketData }
  ] = await Promise.all([
    configQuery, calQuery, jadwalQuery, penugasanQuery, legacyPiketQuery
  ]);

  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;
  let maxDate = currentWitaStr + 'T23:59:59+08:00';

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    maxDate = todayStr + 'T23:59:59+08:00';
  }

  const evaluationDates = buildEvaluationDates(todayStr, 30, '6', new Set());
  const minDate = evaluationDates.length > 0 ? evaluationDates[0].dateStr : todayStr;
  const minTimestamp = minDate + 'T00:00:00+08:00';

  let presensiQuery = supabase.from('presensi_guru').select('*').ilike('nama_guru', `%${normName.split(',')[0].trim()}%`).gte('timestamp', minTimestamp).lte('timestamp', maxDate);
  let jurnalQuery = supabase.from('jurnal_pembelajaran').select('*').ilike('nama_guru', `%${normName.split(',')[0].trim()}%`).gte('tanggal', minDate).lte('tanggal', todayStr);
  let piketQuery = supabase.from('laporan_piket').select('*').or(`guru_pelapor.ilike.%${normName.split(',')[0].trim()}%,kehadiran_guru_piket.ilike.%${normName.split(',')[0].trim()}%`).gte('tanggal', minDate).lte('tanggal', todayStr);

  const [
    { data: presensiRes },
    { data: jurnalRes },
    { data: piketRes }
  ] = await Promise.all([
    presensiQuery, jurnalQuery, piketQuery
  ]);

  return evaluateTeacherWarningsSync(
    teacherId,
    normName,
    isExemptNonTeaching,
    resolvedSekolahId,
    configs || [],
    holidaysData || [],
    jadwalData || [],
    penugasanData || [],
    legacyPiketData || [],
    presensiRes || [],
    jurnalRes || [],
    piketRes || [],
    targetMonth
  );
}

export async function getAllTeachersDisciplineWarnings(
  sekolahId?: string,
  targetMonth?: string
): Promise<TeacherWarningSummary[]> {
  let guruQuery = supabase.from('data_guru').select('id, nama_guru, sekolah_id, wajib_hadir_hanya_mengajar').order('nama_guru');
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: teachers, error } = await guruQuery;
  if (error || !teachers) {
    console.error('[warningSystem] Error fetching teachers:', error?.message);
    return [];
  }

  if (teachers.length === 0) return [];

  let configQuery = supabase.from('pengaturan').select('*');
  let calQuery = supabase.from('kalender_pendidikan').select('tanggal, tipe, keterangan, sekolah_id');
  let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
  let penugasanQuery = supabase.from('penugasan_piket').select('*').eq('tipe_petugas', 'Guru');
  let legacyPiketQuery = supabase.from('jadwal_piket').select('*');

  if (sekolahId) {
    configQuery = configQuery.eq('sekolah_id', sekolahId);
    calQuery = calQuery.eq('sekolah_id', sekolahId);
    jadwalQuery = jadwalQuery.eq('sekolah_id', sekolahId);
    penugasanQuery = penugasanQuery.eq('sekolah_id', sekolahId);
    legacyPiketQuery = legacyPiketQuery.eq('sekolah_id', sekolahId);
  }

  const [
    { data: configs },
    { data: holidaysData },
    { data: jadwalData },
    { data: penugasanData },
    { data: legacyPiketData }
  ] = await Promise.all([
    configQuery, calQuery, jadwalQuery, penugasanQuery, legacyPiketQuery
  ]);

  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;
  let maxDate = currentWitaStr + 'T23:59:59+08:00';

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    maxDate = todayStr + 'T23:59:59+08:00';
  }

  const yearMonth = todayStr.substring(0, 7);
  const minDate = `${yearMonth}-01`;
  const minTimestamp = minDate + 'T00:00:00+08:00';

  let presensiQuery = supabase.from('presensi_guru').select('*').gte('timestamp', minTimestamp).lte('timestamp', maxDate);
  let jurnalQuery = supabase.from('jurnal_pembelajaran').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);
  let piketQuery = supabase.from('laporan_piket').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);

  if (sekolahId) {
    presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
    jurnalQuery = jurnalQuery.eq('sekolah_id', sekolahId);
    piketQuery = piketQuery.eq('sekolah_id', sekolahId);
  }

  const [
    { data: presensiRes },
    { data: jurnalRes },
    { data: piketRes }
  ] = await Promise.all([
    presensiQuery, jurnalQuery, piketQuery
  ]);

  const presensiData = presensiRes || [];
  const jurnalData = jurnalRes || [];
  const piketData = piketRes || [];

  const summaries: TeacherWarningSummary[] = [];

  for (const teacher of teachers) {
    if (!teacher.nama_guru) continue;
    try {
      const resolvedSekolahId = teacher.sekolah_id || sekolahId;
      const isExemptNonTeaching = Boolean(teacher.wajib_hadir_hanya_mengajar);
      
      const teacherNameSplit = teacher.nama_guru.split(',')[0].trim().toLowerCase();

      const tConfigs = (configs || []).filter(c => c.sekolah_id === resolvedSekolahId || !c.sekolah_id);
      const tHolidays = (holidaysData || []).filter(h => h.sekolah_id === resolvedSekolahId || !h.sekolah_id);
      const tJadwal = (jadwalData || []).filter(j => j.sekolah_id === resolvedSekolahId || !j.sekolah_id);
      const tPenugasan = (penugasanData || []).filter(p => p.sekolah_id === resolvedSekolahId || !p.sekolah_id);
      const tLegacyPiket = (legacyPiketData || []).filter(p => p.sekolah_id === resolvedSekolahId || !p.sekolah_id);

      const tPresensi = presensiData.filter(p => {
        const pName = (p.nama_guru || '').toLowerCase();
        return pName.includes(teacherNameSplit) && (p.sekolah_id === resolvedSekolahId || !p.sekolah_id);
      });
      
      const tJurnal = jurnalData.filter(j => {
        const jName = (j.nama_guru || '').toLowerCase();
        return jName.includes(teacherNameSplit) && (j.sekolah_id === resolvedSekolahId || !j.sekolah_id);
      });

      const tPiket = piketData.filter(p => {
        const pelapor = (p.guru_pelapor || '').toLowerCase();
        const kehadiran = (p.kehadiran_guru_piket || '').toLowerCase();
        return (pelapor.includes(teacherNameSplit) || kehadiran.includes(teacherNameSplit)) && (p.sekolah_id === resolvedSekolahId || !p.sekolah_id);
      });

      const summary = evaluateTeacherWarningsSync(
        teacher.id,
        teacher.nama_guru,
        isExemptNonTeaching,
        resolvedSekolahId,
        tConfigs,
        tHolidays,
        tJadwal,
        tPenugasan,
        tLegacyPiket,
        tPresensi,
        tJurnal,
        tPiket,
        targetMonth
      );
      summaries.push(summary);
    } catch (err: any) {
      console.error(`[warningSystem] Error evaluating warnings for ${teacher.nama_guru}:`, err.message);
    }
  }

  return summaries;
}
